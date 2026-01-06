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

            // SuperAdmin يعدي دايمًا
            if (req.user.roles === "SuperAdmin") {
                return next();
            }

            // لازم يكون أدمن
            if (req.user.userType !== "Admin") {
                throw new UnauthorizedError("Admin access required");
            }

            // لازم يكون عنده roleId
            if (!req.user.roleId) {
                throw new UnauthorizedError("No role assigned to user");
            }

            const role = await RoleModel.findById(req.user.roleId);

            if (!role) {
                throw new UnauthorizedError("Role not found");
            }

            if (!role.isActive) {
                throw new UnauthorizedError("Role is deactivated");
            }

            const modulePermission = role.permissions.find(
                (p: IPermission) => p.module === module
            );

            if (!modulePermission) {
                throw new UnauthorizedError(`No access to ${module}`);
            }

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

export const checkAnyPermission = (
    permissions: { module: ModuleType; action: ActionType }[]
) => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                throw new UnauthorizedError("Authentication required");
            }

            if (req.user.roles === "SuperAdmin") {
                return next();
            }

            if (req.user.userType !== "Admin" || !req.user.roleId) {
                throw new UnauthorizedError("No role assigned to user");
            }

            const role = await RoleModel.findById(req.user.roleId);

            if (!role || !role.isActive) {
                throw new UnauthorizedError("Invalid or inactive role");
            }

            const hasAnyPermission = permissions.some(({ module, action }) => {
                const modulePermission = role.permissions.find(
                    (p: IPermission) => p.module === module
                );
                if (!modulePermission) return false;
                return (
                    modulePermission.actions.includes("manage") ||
                    modulePermission.actions.includes(action)
                );
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
