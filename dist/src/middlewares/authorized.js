"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeRoles = void 0;
const unauthorizedError_1 = require("../Errors/unauthorizedError");
/**
 * التحقق من نوع اليوزر
 *
 * استخدام:
 * authorizeRoles("SuperAdmin", "Admin")
 * authorizeRoles("Student")
 * authorizeRoles("Student", "Graduated")
 */
const authorizeRoles = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return next(new unauthorizedError_1.UnauthorizedError("User not authenticated"));
            }
            // حدد نوع اليوزر
            let userRole;
            if (req.user.userType === "Admin") {
                userRole = req.user.roles; // "SuperAdmin" | "Admin"
            }
            else {
                userRole = req.user.role; // "Student" | "Graduated"
            }
            // شيك لو مسموحله
            if (!userRole || !allowedRoles.includes(userRole)) {
                return next(new unauthorizedError_1.UnauthorizedError("Access denied"));
            }
            next();
        }
        catch (err) {
            next(err);
        }
    };
};
exports.authorizeRoles = authorizeRoles;
