"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkAnyPermission = exports.checkPermission = void 0;
const unauthorizedError_1 = require("../Errors/unauthorizedError");
const permission_1 = require("../models/shema/permission");
const checkPermission = (module, action) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                throw new unauthorizedError_1.UnauthorizedError("Authentication required");
            }
            const user = req.user;
            // Super Admin has all permissions
            if (user.isSuperAdmin === true) {
                return next();
            }
            // Check if user has role
            if (!user.role) {
                throw new unauthorizedError_1.UnauthorizedError("No role assigned to user");
            }
            // Get role with permissions
            const role = await permission_1.RoleModel.findById(user.role);
            if (!role) {
                throw new unauthorizedError_1.UnauthorizedError("Role not found");
            }
            if (!role.isActive) {
                throw new unauthorizedError_1.UnauthorizedError("Role is deactivated");
            }
            // Find module permission
            const modulePermission = role.permissions.find((p) => p.module === module);
            if (!modulePermission) {
                throw new unauthorizedError_1.UnauthorizedError(`No access to ${module}`);
            }
            // Check if user has the required action
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
// Check multiple permissions (any of them)
const checkAnyPermission = (permissions) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                throw new unauthorizedError_1.UnauthorizedError("Authentication required");
            }
            const user = req.user;
            if (user.isSuperAdmin === true) {
                return next();
            }
            if (!user.role) {
                throw new unauthorizedError_1.UnauthorizedError("No role assigned to user");
            }
            const role = await permission_1.RoleModel.findById(user.role);
            if (!role || !role.isActive) {
                throw new unauthorizedError_1.UnauthorizedError("Invalid or inactive role");
            }
            const hasAnyPermission = permissions.some(({ module, action }) => {
                const modulePermission = role.permissions.find((p) => p.module === module);
                if (!modulePermission)
                    return false;
                return modulePermission.actions.includes("manage") || modulePermission.actions.includes(action);
            });
            if (!hasAnyPermission) {
                throw new unauthorizedError_1.UnauthorizedError("Insufficient permissions");
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.checkAnyPermission = checkAnyPermission;
