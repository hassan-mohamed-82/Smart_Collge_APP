// controllers/admin/admin.controller.ts
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { AdminModel } from "../../models/shema/auth/Admin";
import { RoleModel } from "../../models/shema/permission";
import { SuccessResponse } from "../../utils/response";
import { NotFound, UnauthorizedError } from "../../Errors";
import { BadRequest } from "../../Errors/BadRequest";

const isValidObjectId = (id: string): boolean => {
    return mongoose.Types.ObjectId.isValid(id);
};

// ✅ Create Admin
export const createAdmin = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { name, email, password, role, roles } = req.body;

    if (!name || !email || !password) {
        throw new BadRequest("Name, email and password are required");
    }

    const existing = await AdminModel.findOne({ email });
    if (existing) throw new BadRequest("Email already exists");

    // Validate role if provided
    let roleId = null;
    if (role) {
        if (isValidObjectId(role)) {
            const roleDoc = await RoleModel.findById(role);
            if (!roleDoc) throw new NotFound("Role not found");
            roleId = role;
        } else {
            const roleDoc = await RoleModel.findOne({ name: role });
            if (!roleDoc) throw new NotFound("Role not found");
            roleId = roleDoc._id;
        }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await AdminModel.create({
        name,
        email,
        hashedPassword,
        role: roleId,
        roles: roles || "Admin"
    });

    await admin.populate("role", "name permissions");

    SuccessResponse(res, {
        message: "Admin created successfully",
        admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            roles: admin.roles,
            role: admin.role
        }
    }, 201);
};

// ✅ Get All Admins
export const getAdmins = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const admins = await AdminModel.find()
        .select("-hashedPassword")
        .populate("role", "name permissions isActive")
        .sort({ createdAt: -1 });

    return SuccessResponse(res, {
        message: "Admins fetched successfully",
        count: admins.length,
        admins
    });
};

// ✅ Get Admin By ID
export const getAdminById = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
        throw new BadRequest("Valid admin ID is required");
    }

    const admin = await AdminModel.findById(id)
        .select("-hashedPassword")
        .populate("role", "name permissions isActive");

    if (!admin) throw new NotFound("Admin not found");

    return SuccessResponse(res, {
        message: "Admin fetched successfully",
        admin
    });
};

// ✅ Update Admin
export const updateAdmin = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { id } = req.params;
    const { name, email, password, role, roles } = req.body;

    if (!id || !isValidObjectId(id)) {
        throw new BadRequest("Valid admin ID is required");
    }

    const admin = await AdminModel.findById(id);
    if (!admin) throw new NotFound("Admin not found");

    // Check email uniqueness
    if (email && email !== admin.email) {
        const exists = await AdminModel.findOne({ email });
        if (exists) throw new BadRequest("Email already in use");
        admin.email = email;
    }

    // Update password
    if (password) {
        admin.hashedPassword = await bcrypt.hash(password, 10);
    }

    // Update name
    if (name) admin.name = name;

    // Update roles (Admin/SuperAdmin)
    if (roles) {
        if (!["Admin", "SuperAdmin"].includes(roles)) {
            throw new BadRequest("roles must be 'Admin' or 'SuperAdmin'");
        }
        admin.roles = roles;
    }

    // Update role (permissions)
    if (role) {
        if (isValidObjectId(role)) {
            const roleDoc = await RoleModel.findById(role);
            if (!roleDoc) throw new NotFound("Role not found");
            admin.role = role;
        } else {
            const roleDoc = await RoleModel.findOne({ name: role });
            if (!roleDoc) throw new NotFound("Role not found");
            admin.role = roleDoc._id;
        }
    }

    await admin.save();
    await admin.populate("role", "name permissions");

    return SuccessResponse(res, {
        message: "Admin updated successfully",
        admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            roles: admin.roles,
            role: admin.role
        }
    });
};

// ✅ Delete Admin
export const deleteAdmin = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
        throw new BadRequest("Valid admin ID is required");
    }

    const admin = await AdminModel.findByIdAndDelete(id);
    if (!admin) throw new NotFound("Admin not found");

    return SuccessResponse(res, {
        message: "Admin deleted successfully",
        deletedAdmin: admin.name
    });
};
