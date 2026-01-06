// middlewares/authenticated.ts
import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../Errors/unauthorizedError";
import { UserModel, GraduatedModel } from "../models/shema/auth/User";
import { AdminModel } from "../models/shema/auth/Admin";
import jwt from "jsonwebtoken";

interface JwtPayload {
    id: string;
}

// Helper function to convert null to undefined
const nullToUndefined = <T>(value: T | null | undefined): T | undefined => {
    return value === null ? undefined : value;
};

export const authenticated = async (req: Request, _res: Response, next: NextFunction) => {
    try {
        // 1. Check Authorization Header
        const authHeader = req.headers["authorization"];
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(new UnauthorizedError("No token provided"));
        }

        // 2. Verify Token
        const token = authHeader.split(" ")[1];
        let decoded: JwtPayload;

        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
        } catch {
            return next(new UnauthorizedError("Invalid or expired token"));
        }

        if (!decoded?.id) {
            return next(new UnauthorizedError("Invalid token payload"));
        }

        // 3. Try to find Admin first
        const admin = await AdminModel.findById(decoded.id).populate("role");

        if (admin) {
            const roleId = (admin.role as any)?._id?.toString();

            req.user = {
                _id: admin._id,
                id: admin._id.toString(),
                name: nullToUndefined(admin.name),
                email: nullToUndefined(admin.email),
                imagePath: nullToUndefined(admin.imagePath),
                roles: admin.roles as "SuperAdmin" | "Admin" | undefined,
                roleId: nullToUndefined(roleId),
                isOnline: nullToUndefined(admin.isOnline),
                lastSeen: nullToUndefined(admin.lastSeen),
                userType: "Admin"
            };
            return next();
        }

        // 4. Try to find User
        const user = await UserModel.findById(decoded.id)
            .populate("level", "level_number name isActive")
            .populate("department", "name isActive");

        if (user) {
            req.user = {
                _id: user._id,
                id: user._id.toString(),
                name: nullToUndefined(user.name),
                email: nullToUndefined(user.email),
                BaseImage64: nullToUndefined(user.BaseImage64),
                role: user.role as "Student" | "Graduated" | undefined,
                level: nullToUndefined(user.level),
                department: nullToUndefined(user.department),
                isOnline: nullToUndefined(user.isOnline),
                lastSeen: nullToUndefined(user.lastSeen),
                userType: "User"
            };

            // 5. If Graduated, get graduated data
            if (user.role === "Graduated") {
                const graduated = await GraduatedModel.findOne({ user: user._id });
                if (graduated && req.user) {
                    req.user.cv = nullToUndefined(graduated.cv);
                    req.user.employment_status = graduated.employment_status as any;
                    req.user.job_title = nullToUndefined(graduated.job_title);
                    req.user.company_location = nullToUndefined(graduated.company_location);
                    req.user.company_email = nullToUndefined(graduated.company_email);
                    req.user.company_link = nullToUndefined(graduated.company_link);
                    req.user.company_phone = nullToUndefined(graduated.company_phone);
                    req.user.about_company = nullToUndefined(graduated.about_company);
                }
            }
            return next();
        }

        // 6. User not found
        return next(new UnauthorizedError("User not found"));

    } catch {
        return next(new UnauthorizedError("Authentication failed"));
    }
};

export const authenticate = authenticated;
