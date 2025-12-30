// middlewares/checkpermission.ts
import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../Errors/unauthorizedError";
import { ActionType, ModuleType, IPermission } from "../types/constant";
import { RoleModel } from "../models/shema/permission";

export const checkPermission = (module: ModuleType, action: ActionType) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                throw new UnauthorizedError("Authentication required");
            }

            const user = req.user as any;

            // Super Admin has all permissions
            if (user.isSuperAdmin === true) {
                return next();
            }

            // Check if user has role
            if (!user.role) {
                throw new UnauthorizedError("No role assigned to user");
            }

            // Get role with permissions
            const role = await RoleModel.findById(user.role);

            if (!role) {
                throw new UnauthorizedError("Role not found");
            }

            if (!role.isActive) {
                throw new UnauthorizedError("Role is deactivated");
            }

            // Find module permission
            const modulePermission = role.permissions.find(
                (p: IPermission) => p.module === module
            );

            if (!modulePermission) {
                throw new UnauthorizedError(`No access to ${module}`);
            }

            // Check if user has the required action
            const hasPermission =
                modulePermission.actions.includes("manage") ||
                modulePermission.actions.includes(action);

            if (!hasPermission) {
                throw new UnauthorizedError(`Cannot ${action} ${module}`);
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};

// Check multiple permissions (any of them)
export const checkAnyPermission = (permissions: { module: ModuleType; action: ActionType }[]) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                throw new UnauthorizedError("Authentication required");
            }

            const user = req.user as any;

            if (user.isSuperAdmin === true) {
                return next();
            }

            if (!user.role) {
                throw new UnauthorizedError("No role assigned to user");
            }

            const role = await RoleModel.findById(user.role);

            if (!role || !role.isActive) {
                throw new UnauthorizedError("Invalid or inactive role");
            }

            const hasAnyPermission = permissions.some(({ module, action }) => {
                const modulePermission = role.permissions.find(
                    (p: IPermission) => p.module === module
                );
                if (!modulePermission) return false;
                return modulePermission.actions.includes("manage") || modulePermission.actions.includes(action);
            });

            if (!hasAnyPermission) {
                throw new UnauthorizedError("Insufficient permissions");
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};
