// controllers/role/role.controller.ts
import { Request, Response } from "express";
import { RoleModel } from "../../models/shema/permission";
import { MODULES, ACTIONS, ModuleType, ActionType } from "../../types/constant";
import {   NotFound, UnauthorizedError } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import mongoose from "mongoose";
import { BadRequest } from "../../Errors/BadRequest";

const isValidObjectId = (id: string): boolean => {
    return mongoose.Types.ObjectId.isValid(id);
};

// ----------------------------------------------------------
// GET AVAILABLE PERMISSIONS - جلب الموديولات والأكشنز المتاحة
// ----------------------------------------------------------
export const getAvailablePermissions = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    SuccessResponse(res, {
        modules: MODULES,
        actions: ACTIONS
    });
};

// ----------------------------------------------------------
// CREATE ROLE - إنشاء Role جديد
// ----------------------------------------------------------
export const createRole = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { name, description, permissions } = req.body;

    // Validation
    if (!name) {
        throw new BadRequest("Role name is required");
    }

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
        throw new BadRequest("Permissions array is required");
    }

    // Check if role already exists
    const existingRole = await RoleModel.findOne({ name: name.trim() });
    if (existingRole) {
        throw new BadRequest("Role with this name already exists");
    }

    // Validate permissions structure
    const validatedPermissions = validatePermissions(permissions);

    const role = await RoleModel.create({
        name: name.trim(),
        description: description?.trim(),
        permissions: validatedPermissions
    });

    SuccessResponse(res, {
        message: "Role created successfully",
        role
    }, 201);
};

// ----------------------------------------------------------
// GET ALL ROLES - جلب كل الـ Roles
// ----------------------------------------------------------
export const getRoles = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { isActive } = req.query;

    const query: Record<string, any> = {};

    if (isActive !== undefined) {
        query.isActive = isActive === "true";
    }

    const roles = await RoleModel.find(query).sort({ createdAt: -1 });

    SuccessResponse(res, { roles });
};

// ----------------------------------------------------------
// GET ROLE BY ID - جلب Role بالـ ID
// ----------------------------------------------------------
export const getRoleById = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
        throw new BadRequest("Valid role ID is required");
    }

    const role = await RoleModel.findById(id);

    if (!role) {
        throw new NotFound("Role not found");
    }

    SuccessResponse(res, { role });
};

// ----------------------------------------------------------
// UPDATE ROLE - تحديث Role
// ----------------------------------------------------------
export const updateRole = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { id } = req.params;
    const { name, description, permissions, isActive } = req.body;

    if (!id || !isValidObjectId(id)) {
        throw new BadRequest("Valid role ID is required");
    }

    const role = await RoleModel.findById(id);

    if (!role) {
        throw new NotFound("Role not found");
    }

    // Check if new name already exists (if name is being changed)
    if (name && name.trim() !== role.name) {
        const existingRole = await RoleModel.findOne({ name: name.trim() });
        if (existingRole) {
            throw new BadRequest("Role with this name already exists");
        }
        role.name = name.trim();
    }

    if (description !== undefined) {
        role.description = description?.trim();
    }

    if (permissions && Array.isArray(permissions)) {
        role.permissions = validatePermissions(permissions);
    }

    if (isActive !== undefined) {
        role.isActive = isActive;
    }

    await role.save();

    SuccessResponse(res, {
        message: "Role updated successfully",
        role
    });
};

// ----------------------------------------------------------
// DELETE ROLE - حذف Role
// ----------------------------------------------------------
export const deleteRole = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
        throw new BadRequest("Valid role ID is required");
    }

    const role = await RoleModel.findByIdAndDelete(id);

    if (!role) {
        throw new NotFound("Role not found");
    }

    SuccessResponse(res, {
        message: "Role deleted successfully",
        deletedRole: role.name
    });
};

// ----------------------------------------------------------
// ADD MODULE PERMISSION - إضافة صلاحية لـ module معين
// ----------------------------------------------------------
export const addModulePermission = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { id } = req.params;
    const { module, actions } = req.body;

    if (!id || !isValidObjectId(id)) {
        throw new BadRequest("Valid role ID is required");
    }

    if (!module || !actions || !Array.isArray(actions)) {
        throw new BadRequest("Module and actions array are required");
    }

    // Validate module
    if (!MODULES.includes(module as any)) {
        throw new BadRequest(`Invalid module. Available: ${MODULES.join(", ")}`);
    }

    // Validate actions
    const validActions = actions.filter(a => ACTIONS.includes(a as any)) as ActionType[];
    if (validActions.length === 0) {
        throw new BadRequest(`Invalid actions. Available: ${ACTIONS.join(", ")}`);
    }

    const role = await RoleModel.findById(id);

    if (!role) {
        throw new NotFound("Role not found");
    }

    // Check if module already exists
    const existingIndex = role.permissions.findIndex(p => p.module === module);

    if (existingIndex > -1) {
        // Update existing module actions
        role.permissions[existingIndex].actions = validActions;
    } else {
        // Add new module permission
        role.permissions.push({
            module: module as ModuleType,
            actions: validActions
        });
    }

    await role.save();

    SuccessResponse(res, {
        message: "Module permission updated successfully",
        role
    });
};

// ----------------------------------------------------------
// REMOVE MODULE PERMISSION - حذف صلاحية module معين
// ----------------------------------------------------------
export const removeModulePermission = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { id, module } = req.params;

    if (!id || !isValidObjectId(id)) {
        throw new BadRequest("Valid role ID is required");
    }

    if (!module) {
        throw new BadRequest("Module is required");
    }

    const role = await RoleModel.findById(id);

    if (!role) {
        throw new NotFound("Role not found");
    }

    const moduleIndex = role.permissions.findIndex(p => p.module === module);

    if (moduleIndex === -1) {
        throw new NotFound("Module permission not found in this role");
    }

    role.permissions.splice(moduleIndex, 1);
    await role.save();

    SuccessResponse(res, {
        message: "Module permission removed successfully",
        role
    });
};

// ----------------------------------------------------------
// TOGGLE ROLE STATUS - تفعيل/تعطيل Role
// ----------------------------------------------------------
export const toggleRoleStatus = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { id } = req.params;

    if (!id || !isValidObjectId(id)) {
        throw new BadRequest("Valid role ID is required");
    }

    const role = await RoleModel.findById(id);

    if (!role) {
        throw new NotFound("Role not found");
    }

    role.isActive = !role.isActive;
    await role.save();

    SuccessResponse(res, {
        message: `Role ${role.isActive ? "activated" : "deactivated"} successfully`,
        role
    });
};

// ----------------------------------------------------------
// HELPER: Validate Permissions
// ----------------------------------------------------------
const validatePermissions = (permissions: any[]): { module: ModuleType; actions: ActionType[] }[] => {
    return permissions.map(perm => {
        if (!perm.module || !perm.actions || !Array.isArray(perm.actions)) {
            throw new BadRequest("Each permission must have module and actions array");
        }

        if (!MODULES.includes(perm.module as any)) {
            throw new BadRequest(`Invalid module: ${perm.module}. Available: ${MODULES.join(", ")}`);
        }

        const validActions = perm.actions.filter((a: string) => ACTIONS.includes(a as any));
        if (validActions.length === 0) {
            throw new BadRequest(`Invalid actions for ${perm.module}. Available: ${ACTIONS.join(", ")}`);
        }

        return {
            module: perm.module as ModuleType,
            actions: validActions as ActionType[]
        };
    });
};
