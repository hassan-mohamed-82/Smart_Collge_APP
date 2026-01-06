// controllers/auth/login.ts
import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AdminModel } from "../../models/shema/auth/Admin";
import { RoleModel } from "../../models/shema/permission";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new BadRequest("Email and password are required");
    }

    const admin = await AdminModel.findOne({ email });

    if (!admin) {
        throw new NotFound("Admin not found");
    }

    const isMatch = await bcrypt.compare(password, admin.hashedPassword);
    if (!isMatch) {
        throw new BadRequest("Invalid credentials");
    }

    let permissions: any = [];
    let roleName: string | null = null;
    let roleData: any = null;

    if (admin.roles === "SuperAdmin") {
        roleName = "SuperAdmin";
        permissions = "all";
    } else if (admin.role) {
        const role = await RoleModel.findById(admin.role);
        if (role) {
            roleData = {
                _id: role._id,
                name: role.name,
                permissions: role.permissions,
                isActive: role.isActive
            };
            roleName = role.name;
            permissions = role.permissions || [];
        }
    }

    const token = jwt.sign(
        {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            roleId: admin.role || null,
            roles: admin.roles,
            userType: "Admin"
        },
        process.env.JWT_SECRET as string,
        { expiresIn: "7d" }
    );

    admin.isOnline = true;
    admin.lastSeen = new Date();
    await admin.save();

    return SuccessResponse(res, {
        message: "Login successful",
        token,
        admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            imagePath: admin.imagePath,
            roles: admin.roles,
            role: roleData,
            permissions: permissions
        }
    });
};
