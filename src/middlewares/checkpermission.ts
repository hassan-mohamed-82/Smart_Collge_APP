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

            if (user.isSuperAdmin) {
                return next();
            }

            const role = await RoleModel.findById(user.role);

            if (!role || !role.isActive) {
                throw new UnauthorizedError("You don't have permission");
            }

            // ✅ أضف الـ type هنا
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
