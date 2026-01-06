// controllers/user/user.controller.ts
import { Request, Response } from "express";
import { EmailVerificationModel } from "../../models/shema/auth/emailVerifications";
import { GraduatedModel, UserModel } from "../../models/shema/auth/User";
import { LevelModel } from "../../models/shema/level";
import { DepartmentModel } from "../../models/shema/department";
import cloudinary from "../../config/cloudinary";
import fs from "fs";
import bcrypt from "bcrypt";
import { SuccessResponse } from "../../utils/response";
import { randomInt } from "crypto";
import {
    ForbiddenError,
    NotFound,
    UnauthorizedError,
    UniqueConstrainError,
} from "../../Errors";
import { generateToken } from "../../utils/auth";
import { sendEmail } from "../../utils/sendEmails";
import { BadRequest } from "../../Errors/BadRequest";
import mongoose from "mongoose";
import { AuthenticatedRequest } from "../../types/custom";
import { saveBase64Image } from "../../utils/handleImages";

const isValidObjectId = (id: string): boolean => {
    return mongoose.Types.ObjectId.isValid(id);
};

// ✅ Login
export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!password) throw new UnauthorizedError("Password is required");

    const user = await UserModel.findOne({ email })
        .populate("level", "level_number name isActive")
        .populate("department", "name isActive");

    if (!user || !user.password) throw new UnauthorizedError("Invalid email or password");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedError("Invalid email or password");

    if (!user.isVerified) throw new ForbiddenError("Verify your email first");

    const token = generateToken(user, "user");

    // Update online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    // تجهيز بيانات المستخدم حسب الدور
    const userData: any = {
        id: user._id,
        name: user.name,
        email: user.email,
        BaseImage64: user.BaseImage64,
        role: user.role,
        isVerified: user.isVerified,
    };

    if (user.role === "Student") {
        userData.level = user.level;
        userData.department = user.department;
    }

    // لو خريج جيب بياناته
    if (user.role === "Graduated") {
        const graduated = await GraduatedModel.findOne({ user: user._id });
        if (graduated) {
            userData.graduatedData = graduated;
        }
    }

    SuccessResponse(res, {
        message: "Login Successful",
        token,
        user: userData,
    }, 200);
};

// ✅ Get FCM Token
export const getFcmToken = async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedError("User not found");

    const user = await UserModel.findById(userId);
    if (!user) throw new NotFound("User not found");

    user.fcmtoken = req.body.token;
    await user.save();

    SuccessResponse(res, { message: "FCM token updated successfully" }, 200);
};

// ✅ Send Reset Code
export const sendResetCode = async (req: Request, res: Response) => {
    const { email } = req.body;
    const user = await UserModel.findOne({ email });

    if (!user) throw new NotFound("User not found");

    const code = randomInt(100000, 999999).toString();
    await EmailVerificationModel.deleteMany({ userId: user._id });

    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await EmailVerificationModel.create({ userId: user._id, verificationCode: code, expiresAt });

    await sendEmail(
        email,
        "Reset Password Code",
        `Hello ${user.name || "User"},
Your password reset code is: ${code}`
    );

    SuccessResponse(res, { message: "Reset code sent to your email" }, 200);
};

// ✅ Verify Reset Code
export const verifyResetCode = async (req: Request, res: Response) => {
    const { email, code } = req.body;

    const user = await UserModel.findOne({ email });
    if (!user) throw new NotFound("User not found");

    const record = await EmailVerificationModel.findOne({ userId: user._id });
    if (!record) throw new BadRequest("No reset code found");

    if (record.verificationCode !== code) throw new BadRequest("Invalid code");
    if (record.expiresAt < new Date()) throw new BadRequest("Code expired");

    SuccessResponse(res, { message: "Reset code verified successfully" }, 200);
};

// ✅ Reset Password
export const resetPassword = async (req: Request, res: Response) => {
    const { email, newPassword } = req.body;

    const user = await UserModel.findOne({ email })
        .populate("level", "level_number name")
        .populate("department", "name");

    if (!user) throw new NotFound("User not found");

    const record = await EmailVerificationModel.findOne({ userId: user._id });
    if (!record) throw new BadRequest("No reset code found");

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    await EmailVerificationModel.deleteOne({ userId: user._id });

    const token = generateToken(user, "user");

    SuccessResponse(res, {
        message: "Password reset successfully",
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            level: user.level,
            department: user.department,
        },
    }, 200);
};

// ✅ Complete Profile (Graduated)
export const completeProfile = async (req: Request, res: Response) => {
    const { userId, role, graduatedData } = req.body;

    if (!role || !["Student", "Graduated"].includes(role)) {
        throw new BadRequest("Invalid role provided");
    }

    const user = await UserModel.findById(userId);
    if (!user) throw new NotFound("User not found");

    user.role = role;
    await user.save();

    if (role === "Graduated" && graduatedData) {
        let graduated = await GraduatedModel.findOne({ user: user._id });
        if (!graduated) {
            graduated = await GraduatedModel.create({ user: user._id, ...graduatedData });
        } else {
            Object.assign(graduated, graduatedData);
            await graduated.save();
        }
    }

    SuccessResponse(res, { message: "Profile completed successfully" });
};

// ✅ Complete Profile (Student)
export const completeProfileStudent = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError("User not found");

    const { department, level } = req.body;

    if (!department) throw new BadRequest("department not provided");
    if (!level) throw new BadRequest("level not provided");

    // Validate department ObjectId
    if (!isValidObjectId(department)) {
        throw new BadRequest("Invalid department ID");
    }

    // Validate level ObjectId
    if (!isValidObjectId(level)) {
        throw new BadRequest("Invalid level ID");
    }

    // Check if department exists
    const departmentDoc = await DepartmentModel.findById(department);
    if (!departmentDoc) throw new NotFound("Department not found");

    // Check if level exists
    const levelDoc = await LevelModel.findById(level);
    if (!levelDoc) throw new NotFound("Level not found");

    const user = await UserModel.findById(req.user.id);
    if (!user) throw new NotFound("User not found");

    if (user.role !== "Student") throw new BadRequest("Only students can complete student profile");
    if (!user.isNew) throw new BadRequest("Profile already completed");

    user.department = department;
    user.level = level;
    user.isNew = false;
    await user.save();

    // Populate for response
    await user.populate("level", "level_number name");
    await user.populate("department", "name");

    SuccessResponse(res, {
        message: "Profile completed successfully",
        user: {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            level: user.level,
            department: user.department,
        },
    });
};

// ✅ Get Profile
export const getProfile = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Unauthorized");

    const user = await UserModel.findById(req.user.id)
        .select("-password")
        .populate("level", "level_number name isActive")
        .populate("department", "name isActive");

    if (!user) throw new NotFound("User not found");

    // 🎓 لو المستخدم خريج
    if (user.role === "Graduated") {
        const graduated = await GraduatedModel.findOne({ user: user._id }).lean();

        const mergedProfile = {
            ...user.toObject(),
            graduatedData: graduated || null,
        };

        return SuccessResponse(res, { user: mergedProfile }, 200);
    }

    // 👨‍🎓 لو Student فقط
    return SuccessResponse(res, { user }, 200);
};

// ✅ Delete Profile
export const deleteProfile = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Unauthorized");

    const user = await UserModel.findById(req.user.id);
    if (!user) throw new NotFound("User not found");

    if (user.role === "Graduated") {
        await GraduatedModel.findOneAndDelete({ user: user._id });
    }

    await user.deleteOne();
    SuccessResponse(res, { message: "User deleted successfully" }, 200);
};

// ✅ Signup
export const signup = async (req: Request, res: Response) => {
    const { name, email, password, role, BaseImage64, level, department } = req.body;

    // بيانات الخريج
    const {
        employment_status,
        job_title,
        company_email,
        company_phone,
        company_link,
        company_location,
        about_company,
    } = req.body;

    // تحقق من وجود المستخدم
    const existing = await UserModel.findOne({ email });
    if (existing) throw new UniqueConstrainError("Email", "User already signed up with this email");

    // Validate level and department for Student
    if (role === "Student") {
        if (!level) throw new BadRequest("Level is required for students");
        if (!department) throw new BadRequest("Department is required for students");

        if (!isValidObjectId(level)) {
            throw new BadRequest("Invalid level ID");
        }
        if (!isValidObjectId(department)) {
            throw new BadRequest("Invalid department ID");
        }

        const levelDoc = await LevelModel.findById(level);
        if (!levelDoc) throw new NotFound("Level not found");
        if (!levelDoc.isActive) throw new BadRequest("Level is not active");

        const departmentDoc = await DepartmentModel.findById(department);
        if (!departmentDoc) throw new NotFound("Department not found");
        if (!departmentDoc.isActive) throw new BadRequest("Department is not active");
    }

    // تشفير الباسورد
    const hashedPassword = await bcrypt.hash(password, 10);

    // رفع الصورة الشخصية
    let imageUrl = "";
    if (BaseImage64) {
        const imageData = BaseImage64.startsWith("data:")
            ? BaseImage64
            : `data:image/png;base64,${BaseImage64}`;
        imageUrl = await saveBase64Image(
            imageData,
            "graduates/users",
            new mongoose.Types.ObjectId().toString()
        );
    }

    // إعداد بيانات المستخدم
    const userData: any = {
        name,
        email,
        password: hashedPassword,
        role,
        BaseImage64: imageUrl || null,
        isVerified: false,
        isNew: role === "Student" ? false : true,
    };

    if (role === "Student") {
        userData.level = level;
        userData.department = department;
        userData.isNew = false;
    }

    const newUser = new UserModel(userData);
    await newUser.save();

    // 🎓 لو المستخدم خريج
    if (role === "Graduated") {
        let cvUrl = "";

        if (req.file) {
            try {
                const result = await cloudinary.uploader.upload(req.file.path, {
                    folder: "graduates/cv",
                    resource_type: "raw",
                });
                cvUrl = result.secure_url;
                fs.unlinkSync(req.file.path);
            } catch (err) {
                console.error("Error uploading CV:", err);
            }
        }

        await GraduatedModel.create({
            user: newUser._id,
            cv: cvUrl || null,
            employment_status,
            job_title,
            company_email,
            company_phone,
            company_link,
            company_location,
            about_company,
        });
    }

    // إرسال كود التفعيل
    const code = randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

    await new EmailVerificationModel({
        userId: newUser._id,
        verificationCode: code,
        expiresAt,
    }).save();

    await sendEmail(
        email,
        "Verify Your Email",
        `Hello ${name},
Your verification code is: ${code}
(This code is valid for 2 hours only)`
    );

    SuccessResponse(res, {
        message: "Signup successful, check your email for code",
        userId: newUser._id,
    }, 201);
};

// ✅ Verify Email
export const verifyEmail = async (req: Request, res: Response) => {
    const { userId, code } = req.body;

    if (!userId || !code) throw new BadRequest("userId and code are required");

    const record = await EmailVerificationModel.findOne({ userId });
    if (!record) throw new BadRequest("No verification record found");
    if (record.verificationCode !== code) throw new BadRequest("Invalid verification code");
    if (record.expiresAt < new Date()) throw new BadRequest("Verification code expired");

    const user = await UserModel.findByIdAndUpdate(userId, { isVerified: true }, { new: true })
        .populate("level", "level_number name")
        .populate("department", "name");

    if (!user) throw new NotFound("User not found");

    await EmailVerificationModel.deleteOne({ userId });

    const token = generateToken(user, "user");

    // Get graduated data if applicable
    let graduatedData = null;
    if (user.role === "Graduated") {
        graduatedData = await GraduatedModel.findOne({ user: user._id });
    }

    SuccessResponse(res, {
        message: "Email verified successfully",
        token,
        user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            level: user.level,
            department: user.department,
            graduatedData: graduatedData,
        },
    }, 200);
};

// ✅ Update Profile Image
export const updateProfileImage = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError("User not found");

    const { BaseImage64 } = req.body;
    if (!BaseImage64) throw new BadRequest("Image not provided");

    const user = await UserModel.findById(req.user.id);
    if (!user) throw new NotFound("User not found");

    const imageData = BaseImage64.startsWith("data:")
        ? BaseImage64
        : `data:image/png;base64,${BaseImage64}`;
    const imageUrl = await saveBase64Image(imageData, "graduates/profile_images", user._id.toString());

    user.BaseImage64 = imageUrl;
    await user.save();

    SuccessResponse(res, { message: "Profile image updated successfully", imageUrl }, 200);
};

// ✅ Update Profile
export const updateProfile = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Unauthorized");

    const { name, email, department, level, graduatedData } = req.body;
    const file = req.file;

    const user = await UserModel.findById(req.user.id);
    if (!user) throw new NotFound("User not found");

    // تعديل بيانات المستخدم
    if (name) user.name = name;

    if (email && email !== user.email) {
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) throw new BadRequest("Email already in use");
        user.email = email;
    }

    // 👨‍🎓 لو طالب
    if (user.role === "Student") {
        if (department) {
            if (!isValidObjectId(department)) {
                throw new BadRequest("Invalid department ID");
            }
            const departmentDoc = await DepartmentModel.findById(department);
            if (!departmentDoc) throw new NotFound("Department not found");
            user.department = department;
        }

        if (level) {
            if (!isValidObjectId(level)) {
                throw new BadRequest("Invalid level ID");
            }
            const levelDoc = await LevelModel.findById(level);
            if (!levelDoc) throw new NotFound("Level not found");
            user.level = level;
        }
    }

    // 🎓 لو خريج
    if (user.role === "Graduated") {
        let graduated = await GraduatedModel.findOne({ user: user._id });
        if (!graduated) {
            graduated = new GraduatedModel({ user: user._id });
        }

        if (graduatedData && typeof graduatedData === "object") {
            const allowedFields = [
                "employment_status",
                "job_title",
                "company_email",
                "company_phone",
                "company_link",
                "company_location",
                "about_company"
            ];

            for (const field of allowedFields) {
                if (graduatedData[field] !== undefined) {
                    (graduated as any)[field] = graduatedData[field];
                }
            }
        }

        // لو فيه ملف CV مرفوع
        if (file) {
            try {
                const uploadResult = await cloudinary.uploader.upload(file.path, {
                    folder: "graduates/cv",
                    resource_type: "raw",
                });
                graduated.cv = uploadResult.secure_url;
                fs.unlinkSync(file.path);
            } catch (error) {
                console.error("Error uploading CV:", error);
            }
        }

        await graduated.save();
    }

    await user.save();

    // Populate for response
    await user.populate("level", "level_number name");
    await user.populate("department", "name");

    // تجهيز الاستجابة
    const responseUser: any = {
        _id: user._id,
        name: user.name,
        email: user.email,
        BaseImage64: user.BaseImage64,
        role: user.role,
    };

    if (user.role === "Student") {
        responseUser.department = user.department;
        responseUser.level = user.level;
    }

    if (user.role === "Graduated") {
        responseUser.graduatedData = await GraduatedModel.findOne({ user: user._id });
    }

    SuccessResponse(res, {
        message: "Profile updated successfully",
        user: responseUser,
    });
};

// ✅ Logout
export const logout = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Unauthorized");

    const user = await UserModel.findById(req.user.id);
    if (!user) throw new NotFound("User not found");

    user.isOnline = false;
    user.lastSeen = new Date();
    user.fcmtoken = undefined;
    await user.save();

    SuccessResponse(res, { message: "Logout successful" }, 200);
};

// ✅ Get All Users (Admin)
export const getAllUsers = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Unauthorized");

    const { role, level, department, page = "1", limit = "10" } = req.query;

    const query: any = {};

    if (role) query.role = role;
    if (level && isValidObjectId(level as string)) query.level = level;
    if (department && isValidObjectId(department as string)) query.department = department;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
        UserModel.find(query)
            .select("-password")
            .populate("level", "level_number name")
            .populate("department", "name")
            .skip(skip)
            .limit(limitNum)
            .sort({ createdAt: -1 }),
        UserModel.countDocuments(query)
    ]);

    SuccessResponse(res, {
        users,
        pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum),
            totalUsers: total,
            usersPerPage: limitNum,
        }
    });
};

// ✅ Get User By ID (Admin)
export const getUserById = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Unauthorized");

    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
        throw new BadRequest("Valid user ID is required");
    }

    const user = await UserModel.findById(id)
        .select("-password")
        .populate("level", "level_number name")
        .populate("department", "name");

    if (!user) throw new NotFound("User not found");

    let graduatedData = null;
    if (user.role === "Graduated") {
        graduatedData = await GraduatedModel.findOne({ user: user._id });
    }

    SuccessResponse(res, {
        user: {
            ...user.toObject(),
            graduatedData
        }
    });
};

// ✅ Delete User (Admin)
export const deleteUser = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Unauthorized");

    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
        throw new BadRequest("Valid user ID is required");
    }

    const user = await UserModel.findById(id);
    if (!user) throw new NotFound("User not found");

    if (user.role === "Graduated") {
        await GraduatedModel.findOneAndDelete({ user: user._id });
    }

    await user.deleteOne();

    SuccessResponse(res, { message: "User deleted successfully" });
};

// ✅ Search Users
export const searchUsers = async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Unauthorized");

    const { q } = req.query;

    if (!q) throw new BadRequest("Search query is required");

    const users = await UserModel.find({
        $or: [
            { name: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } }
        ]
    })
        .select("-password")
        .populate("level", "level_number name")
        .populate("department", "name")
        .limit(20);

    if (users.length === 0) {
        throw new NotFound("No users found");
    }

    SuccessResponse(res, { users });
};
