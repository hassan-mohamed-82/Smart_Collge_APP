// middlewares/authorizeRoles.ts
import { NextFunction, Response, RequestHandler, Request } from "express";
import { UnauthorizedError } from "../Errors/unauthorizedError";

type AllowedRole = "SuperAdmin" | "Admin" | "Student" | "Graduated";

/**
 * التحقق من نوع اليوزر
 * 
 * استخدام:
 * authorizeRoles("SuperAdmin", "Admin")
 * authorizeRoles("Student")
 * authorizeRoles("Student", "Graduated")
 */
export const authorizeRoles = (...allowedRoles: AllowedRole[]): RequestHandler => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                return next(new UnauthorizedError("User not authenticated"));
            }

            // حدد نوع اليوزر
            let userRole: AllowedRole | undefined;

            if (req.user.userType === "Admin") {
                userRole = req.user.roles; // "SuperAdmin" | "Admin"
            } else {
                userRole = req.user.role; // "Student" | "Graduated"
            }

            // شيك لو مسموحله
            if (!userRole || !allowedRoles.includes(userRole)) {
                return next(new UnauthorizedError("Access denied"));
            }

            next();
        } catch (err) {
            next(err);
        }
    };
};
