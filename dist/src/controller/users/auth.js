"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUsers = exports.deleteUser = exports.getUserById = exports.getAllUsers = exports.logout = exports.updateProfile = exports.updateProfileImage = exports.verifyEmail = exports.signup = exports.deleteProfile = exports.getProfile = exports.completeProfileStudent = exports.completeProfile = exports.resetPassword = exports.verifyResetCode = exports.sendResetCode = exports.getFcmToken = exports.login = void 0;
const emailVerifications_1 = require("../../models/shema/auth/emailVerifications");
const User_1 = require("../../models/shema/auth/User");
const level_1 = require("../../models/shema/level");
const department_1 = require("../../models/shema/department");
const cloudinary_1 = __importDefault(require("../../config/cloudinary"));
const fs_1 = __importDefault(require("fs"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const response_1 = require("../../utils/response");
const crypto_1 = require("crypto");
const Errors_1 = require("../../Errors");
const auth_1 = require("../../utils/auth");
const sendEmails_1 = require("../../utils/sendEmails");
const BadRequest_1 = require("../../Errors/BadRequest");
const mongoose_1 = __importDefault(require("mongoose"));
const handleImages_1 = require("../../utils/handleImages");
const isValidObjectId = (id) => {
    return mongoose_1.default.Types.ObjectId.isValid(id);
};
// ✅ Login
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!password)
        throw new Errors_1.UnauthorizedError("Password is required");
    const user = await User_1.UserModel.findOne({ email })
        .populate("level", "level_number name isActive")
        .populate("department", "name isActive");
    if (!user || !user.password)
        throw new Errors_1.UnauthorizedError("Invalid email or password");
    const isMatch = await bcrypt_1.default.compare(password, user.password);
    if (!isMatch)
        throw new Errors_1.UnauthorizedError("Invalid email or password");
    if (!user.isVerified)
        throw new Errors_1.ForbiddenError("Verify your email first");
    const token = (0, auth_1.generateToken)(user, "user");
    // Update online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();
    // تجهيز بيانات المستخدم حسب الدور
    const userData = {
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
        const graduated = await User_1.GraduatedModel.findOne({ user: user._id });
        if (graduated) {
            userData.graduatedData = graduated;
        }
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Login Successful",
        token,
        user: userData,
    }, 200);
};
exports.login = login;
// ✅ Get FCM Token
const getFcmToken = async (req, res) => {
    const userId = req.user?.id;
    if (!userId)
        throw new Errors_1.UnauthorizedError("User not found");
    const user = await User_1.UserModel.findById(userId);
    if (!user)
        throw new Errors_1.NotFound("User not found");
    user.fcmtoken = req.body.token;
    await user.save();
    (0, response_1.SuccessResponse)(res, { message: "FCM token updated successfully" }, 200);
};
exports.getFcmToken = getFcmToken;
// ✅ Send Reset Code
const sendResetCode = async (req, res) => {
    const { email } = req.body;
    const user = await User_1.UserModel.findOne({ email });
    if (!user)
        throw new Errors_1.NotFound("User not found");
    const code = (0, crypto_1.randomInt)(100000, 999999).toString();
    await emailVerifications_1.EmailVerificationModel.deleteMany({ userId: user._id });
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await emailVerifications_1.EmailVerificationModel.create({ userId: user._id, verificationCode: code, expiresAt });
    await (0, sendEmails_1.sendEmail)(email, "Reset Password Code", `Hello ${user.name || "User"},
Your password reset code is: ${code}`);
    (0, response_1.SuccessResponse)(res, { message: "Reset code sent to your email" }, 200);
};
exports.sendResetCode = sendResetCode;
// ✅ Verify Reset Code
const verifyResetCode = async (req, res) => {
    const { email, code } = req.body;
    const user = await User_1.UserModel.findOne({ email });
    if (!user)
        throw new Errors_1.NotFound("User not found");
    const record = await emailVerifications_1.EmailVerificationModel.findOne({ userId: user._id });
    if (!record)
        throw new BadRequest_1.BadRequest("No reset code found");
    if (record.verificationCode !== code)
        throw new BadRequest_1.BadRequest("Invalid code");
    if (record.expiresAt < new Date())
        throw new BadRequest_1.BadRequest("Code expired");
    (0, response_1.SuccessResponse)(res, { message: "Reset code verified successfully" }, 200);
};
exports.verifyResetCode = verifyResetCode;
// ✅ Reset Password
const resetPassword = async (req, res) => {
    const { email, newPassword } = req.body;
    const user = await User_1.UserModel.findOne({ email })
        .populate("level", "level_number name")
        .populate("department", "name");
    if (!user)
        throw new Errors_1.NotFound("User not found");
    const record = await emailVerifications_1.EmailVerificationModel.findOne({ userId: user._id });
    if (!record)
        throw new BadRequest_1.BadRequest("No reset code found");
    user.password = await bcrypt_1.default.hash(newPassword, 10);
    await user.save();
    await emailVerifications_1.EmailVerificationModel.deleteOne({ userId: user._id });
    const token = (0, auth_1.generateToken)(user, "user");
    (0, response_1.SuccessResponse)(res, {
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
exports.resetPassword = resetPassword;
// ✅ Complete Profile (Graduated)
const completeProfile = async (req, res) => {
    const { userId, role, graduatedData } = req.body;
    if (!role || !["Student", "Graduated"].includes(role)) {
        throw new BadRequest_1.BadRequest("Invalid role provided");
    }
    const user = await User_1.UserModel.findById(userId);
    if (!user)
        throw new Errors_1.NotFound("User not found");
    user.role = role;
    await user.save();
    if (role === "Graduated" && graduatedData) {
        let graduated = await User_1.GraduatedModel.findOne({ user: user._id });
        if (!graduated) {
            graduated = await User_1.GraduatedModel.create({ user: user._id, ...graduatedData });
        }
        else {
            Object.assign(graduated, graduatedData);
            await graduated.save();
        }
    }
    (0, response_1.SuccessResponse)(res, { message: "Profile completed successfully" });
};
exports.completeProfile = completeProfile;
// ✅ Complete Profile (Student)
const completeProfileStudent = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("User not found");
    const { department, level } = req.body;
    if (!department)
        throw new BadRequest_1.BadRequest("department not provided");
    if (!level)
        throw new BadRequest_1.BadRequest("level not provided");
    // Validate department ObjectId
    if (!isValidObjectId(department)) {
        throw new BadRequest_1.BadRequest("Invalid department ID");
    }
    // Validate level ObjectId
    if (!isValidObjectId(level)) {
        throw new BadRequest_1.BadRequest("Invalid level ID");
    }
    // Check if department exists
    const departmentDoc = await department_1.DepartmentModel.findById(department);
    if (!departmentDoc)
        throw new Errors_1.NotFound("Department not found");
    // Check if level exists
    const levelDoc = await level_1.LevelModel.findById(level);
    if (!levelDoc)
        throw new Errors_1.NotFound("Level not found");
    const user = await User_1.UserModel.findById(req.user.id);
    if (!user)
        throw new Errors_1.NotFound("User not found");
    if (user.role !== "Student")
        throw new BadRequest_1.BadRequest("Only students can complete student profile");
    if (!user.isNew)
        throw new BadRequest_1.BadRequest("Profile already completed");
    user.department = department;
    user.level = level;
    user.isNew = false;
    await user.save();
    // Populate for response
    await user.populate("level", "level_number name");
    await user.populate("department", "name");
    (0, response_1.SuccessResponse)(res, {
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
exports.completeProfileStudent = completeProfileStudent;
// ✅ Get Profile
const getProfile = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Unauthorized");
    const user = await User_1.UserModel.findById(req.user.id)
        .select("-password")
        .populate("level", "level_number name isActive")
        .populate("department", "name isActive");
    if (!user)
        throw new Errors_1.NotFound("User not found");
    // 🎓 لو المستخدم خريج
    if (user.role === "Graduated") {
        const graduated = await User_1.GraduatedModel.findOne({ user: user._id }).lean();
        const mergedProfile = {
            ...user.toObject(),
            graduatedData: graduated || null,
        };
        return (0, response_1.SuccessResponse)(res, { user: mergedProfile }, 200);
    }
    // 👨‍🎓 لو Student فقط
    return (0, response_1.SuccessResponse)(res, { user }, 200);
};
exports.getProfile = getProfile;
// ✅ Delete Profile
const deleteProfile = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Unauthorized");
    const user = await User_1.UserModel.findById(req.user.id);
    if (!user)
        throw new Errors_1.NotFound("User not found");
    if (user.role === "Graduated") {
        await User_1.GraduatedModel.findOneAndDelete({ user: user._id });
    }
    await user.deleteOne();
    (0, response_1.SuccessResponse)(res, { message: "User deleted successfully" }, 200);
};
exports.deleteProfile = deleteProfile;
// ✅ Signup
const signup = async (req, res) => {
    const { name, email, password, role, BaseImage64, level, department } = req.body;
    // بيانات الخريج
    const { employment_status, job_title, company_email, company_phone, company_link, company_location, about_company, } = req.body;
    // تحقق من وجود المستخدم
    const existing = await User_1.UserModel.findOne({ email });
    if (existing)
        throw new Errors_1.UniqueConstrainError("Email", "User already signed up with this email");
    // Validate level and department for Student
    if (role === "Student") {
        if (!level)
            throw new BadRequest_1.BadRequest("Level is required for students");
        if (!department)
            throw new BadRequest_1.BadRequest("Department is required for students");
        if (!isValidObjectId(level)) {
            throw new BadRequest_1.BadRequest("Invalid level ID");
        }
        if (!isValidObjectId(department)) {
            throw new BadRequest_1.BadRequest("Invalid department ID");
        }
        const levelDoc = await level_1.LevelModel.findById(level);
        if (!levelDoc)
            throw new Errors_1.NotFound("Level not found");
        if (!levelDoc.isActive)
            throw new BadRequest_1.BadRequest("Level is not active");
        const departmentDoc = await department_1.DepartmentModel.findById(department);
        if (!departmentDoc)
            throw new Errors_1.NotFound("Department not found");
        if (!departmentDoc.isActive)
            throw new BadRequest_1.BadRequest("Department is not active");
    }
    // تشفير الباسورد
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    // رفع الصورة الشخصية
    let imageUrl = "";
    if (BaseImage64) {
        const imageData = BaseImage64.startsWith("data:")
            ? BaseImage64
            : `data:image/png;base64,${BaseImage64}`;
        imageUrl = await (0, handleImages_1.saveBase64Image)(imageData, "graduates/users", new mongoose_1.default.Types.ObjectId().toString());
    }
    // إعداد بيانات المستخدم
    const userData = {
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
    const newUser = new User_1.UserModel(userData);
    await newUser.save();
    // 🎓 لو المستخدم خريج
    if (role === "Graduated") {
        let cvUrl = "";
        if (req.file) {
            try {
                const result = await cloudinary_1.default.uploader.upload(req.file.path, {
                    folder: "graduates/cv",
                    resource_type: "raw",
                });
                cvUrl = result.secure_url;
                fs_1.default.unlinkSync(req.file.path);
            }
            catch (err) {
                console.error("Error uploading CV:", err);
            }
        }
        await User_1.GraduatedModel.create({
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
    const code = (0, crypto_1.randomInt)(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await new emailVerifications_1.EmailVerificationModel({
        userId: newUser._id,
        verificationCode: code,
        expiresAt,
    }).save();
    await (0, sendEmails_1.sendEmail)(email, "Verify Your Email", `Hello ${name},
Your verification code is: ${code}
(This code is valid for 2 hours only)`);
    (0, response_1.SuccessResponse)(res, {
        message: "Signup successful, check your email for code",
        userId: newUser._id,
    }, 201);
};
exports.signup = signup;
// ✅ Verify Email
const verifyEmail = async (req, res) => {
    const { userId, code } = req.body;
    if (!userId || !code)
        throw new BadRequest_1.BadRequest("userId and code are required");
    const record = await emailVerifications_1.EmailVerificationModel.findOne({ userId });
    if (!record)
        throw new BadRequest_1.BadRequest("No verification record found");
    if (record.verificationCode !== code)
        throw new BadRequest_1.BadRequest("Invalid verification code");
    if (record.expiresAt < new Date())
        throw new BadRequest_1.BadRequest("Verification code expired");
    const user = await User_1.UserModel.findByIdAndUpdate(userId, { isVerified: true }, { new: true })
        .populate("level", "level_number name")
        .populate("department", "name");
    if (!user)
        throw new Errors_1.NotFound("User not found");
    await emailVerifications_1.EmailVerificationModel.deleteOne({ userId });
    const token = (0, auth_1.generateToken)(user, "user");
    // Get graduated data if applicable
    let graduatedData = null;
    if (user.role === "Graduated") {
        graduatedData = await User_1.GraduatedModel.findOne({ user: user._id });
    }
    (0, response_1.SuccessResponse)(res, {
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
exports.verifyEmail = verifyEmail;
// ✅ Update Profile Image
const updateProfileImage = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("User not found");
    const { BaseImage64 } = req.body;
    if (!BaseImage64)
        throw new BadRequest_1.BadRequest("Image not provided");
    const user = await User_1.UserModel.findById(req.user.id);
    if (!user)
        throw new Errors_1.NotFound("User not found");
    const imageData = BaseImage64.startsWith("data:")
        ? BaseImage64
        : `data:image/png;base64,${BaseImage64}`;
    const imageUrl = await (0, handleImages_1.saveBase64Image)(imageData, "graduates/profile_images", user._id.toString());
    user.BaseImage64 = imageUrl;
    await user.save();
    (0, response_1.SuccessResponse)(res, { message: "Profile image updated successfully", imageUrl }, 200);
};
exports.updateProfileImage = updateProfileImage;
// ✅ Update Profile
const updateProfile = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Unauthorized");
    const { name, email, department, level, graduatedData } = req.body;
    const file = req.file;
    const user = await User_1.UserModel.findById(req.user.id);
    if (!user)
        throw new Errors_1.NotFound("User not found");
    // تعديل بيانات المستخدم
    if (name)
        user.name = name;
    if (email && email !== user.email) {
        const existingUser = await User_1.UserModel.findOne({ email });
        if (existingUser)
            throw new BadRequest_1.BadRequest("Email already in use");
        user.email = email;
    }
    // 👨‍🎓 لو طالب
    if (user.role === "Student") {
        if (department) {
            if (!isValidObjectId(department)) {
                throw new BadRequest_1.BadRequest("Invalid department ID");
            }
            const departmentDoc = await department_1.DepartmentModel.findById(department);
            if (!departmentDoc)
                throw new Errors_1.NotFound("Department not found");
            user.department = department;
        }
        if (level) {
            if (!isValidObjectId(level)) {
                throw new BadRequest_1.BadRequest("Invalid level ID");
            }
            const levelDoc = await level_1.LevelModel.findById(level);
            if (!levelDoc)
                throw new Errors_1.NotFound("Level not found");
            user.level = level;
        }
    }
    // 🎓 لو خريج
    if (user.role === "Graduated") {
        let graduated = await User_1.GraduatedModel.findOne({ user: user._id });
        if (!graduated) {
            graduated = new User_1.GraduatedModel({ user: user._id });
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
                    graduated[field] = graduatedData[field];
                }
            }
        }
        // لو فيه ملف CV مرفوع
        if (file) {
            try {
                const uploadResult = await cloudinary_1.default.uploader.upload(file.path, {
                    folder: "graduates/cv",
                    resource_type: "raw",
                });
                graduated.cv = uploadResult.secure_url;
                fs_1.default.unlinkSync(file.path);
            }
            catch (error) {
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
    const responseUser = {
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
        responseUser.graduatedData = await User_1.GraduatedModel.findOne({ user: user._id });
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Profile updated successfully",
        user: responseUser,
    });
};
exports.updateProfile = updateProfile;
// ✅ Logout
const logout = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Unauthorized");
    const user = await User_1.UserModel.findById(req.user.id);
    if (!user)
        throw new Errors_1.NotFound("User not found");
    user.isOnline = false;
    user.lastSeen = new Date();
    user.fcmtoken = undefined;
    await user.save();
    (0, response_1.SuccessResponse)(res, { message: "Logout successful" }, 200);
};
exports.logout = logout;
// ✅ Get All Users (Admin)
const getAllUsers = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Unauthorized");
    const { role, level, department, page = "1", limit = "10" } = req.query;
    const query = {};
    if (role)
        query.role = role;
    if (level && isValidObjectId(level))
        query.level = level;
    if (department && isValidObjectId(department))
        query.department = department;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;
    const [users, total] = await Promise.all([
        User_1.UserModel.find(query)
            .select("-password")
            .populate("level", "level_number name")
            .populate("department", "name")
            .skip(skip)
            .limit(limitNum)
            .sort({ createdAt: -1 }),
        User_1.UserModel.countDocuments(query)
    ]);
    (0, response_1.SuccessResponse)(res, {
        users,
        pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(total / limitNum),
            totalUsers: total,
            usersPerPage: limitNum,
        }
    });
};
exports.getAllUsers = getAllUsers;
// ✅ Get User By ID (Admin)
const getUserById = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Unauthorized");
    const { id } = req.params;
    if (!id || !isValidObjectId(id)) {
        throw new BadRequest_1.BadRequest("Valid user ID is required");
    }
    const user = await User_1.UserModel.findById(id)
        .select("-password")
        .populate("level", "level_number name")
        .populate("department", "name");
    if (!user)
        throw new Errors_1.NotFound("User not found");
    let graduatedData = null;
    if (user.role === "Graduated") {
        graduatedData = await User_1.GraduatedModel.findOne({ user: user._id });
    }
    (0, response_1.SuccessResponse)(res, {
        user: {
            ...user.toObject(),
            graduatedData
        }
    });
};
exports.getUserById = getUserById;
// ✅ Delete User (Admin)
const deleteUser = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Unauthorized");
    const { id } = req.params;
    if (!id || !isValidObjectId(id)) {
        throw new BadRequest_1.BadRequest("Valid user ID is required");
    }
    const user = await User_1.UserModel.findById(id);
    if (!user)
        throw new Errors_1.NotFound("User not found");
    if (user.role === "Graduated") {
        await User_1.GraduatedModel.findOneAndDelete({ user: user._id });
    }
    await user.deleteOne();
    (0, response_1.SuccessResponse)(res, { message: "User deleted successfully" });
};
exports.deleteUser = deleteUser;
// ✅ Search Users
const searchUsers = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Unauthorized");
    const { q } = req.query;
    if (!q)
        throw new BadRequest_1.BadRequest("Search query is required");
    const users = await User_1.UserModel.find({
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
        throw new Errors_1.NotFound("No users found");
    }
    (0, response_1.SuccessResponse)(res, { users });
};
exports.searchUsers = searchUsers;
