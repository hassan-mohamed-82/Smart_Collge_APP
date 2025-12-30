"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkPermission = void 0;
const unauthorizedError_1 = require("../Errors/unauthorizedError");
const permission_1 = require("../models/shema/permission");
const checkPermission = (module, action) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                throw new unauthorizedError_1.UnauthorizedError("Authentication required");
            }
            const user = req.user;
            if (user.isSuperAdmin) {
                return next();
            }
            const role = await permission_1.RoleModel.findById(user.role);
            if (!role || !role.isActive) {
                throw new unauthorizedError_1.UnauthorizedError("You don't have permission");
            }
            // ✅ أضف الـ type هنا
            const modulePermission = role.permissions.find((p) => p.module === module);
            if (!modulePermission) {
                throw new unauthorizedError_1.UnauthorizedError(`No access to ${module}`);
            }
            const hasPermission = modulePermission.actions.includes("manage") ||
                modulePermission.actions.includes(action);
            if (!hasPermission) {
                throw new unauthorizedError_1.UnauthorizedError(`Cannot ${action} ${module}`);
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.checkPermission = checkPermission;
