// controllers/role/role.controller.ts
import { Request, Response } from "express";
import { RoleModel } from "../../models/shema/permission";
import { MODULES, ACTIONS, ModuleType, ActionType, IPermission } from "../../types/constant";
import { NotFound, UnauthorizedError } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import mongoose from "mongoose";
import { BadRequest } from "../../Errors/BadRequest";

const isValidObjectId = (id: string): boolean => {
    return mongoose.Types.ObjectId.isValid(id);
};

// ----------------------------------------------------------
// GET AVAILABLE PERMISSIONS
// ----------------------------------------------------------
export const getAvailablePermissions = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    SuccessResponse(res, {
        modules: MODULES,
        actions: ACTIONS
    });
};

// ----------------------------------------------------------
// CREATE ROLE
// ----------------------------------------------------------
export const createRole = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { name, description, permissions } = req.body;

    if (!name) {
        throw new BadRequest("Role name is required");
    }

    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
        throw new BadRequest("Permissions array is required");
    }

    const existingRole = await RoleModel.findOne({ name: name.trim() });
    if (existingRole) {
        throw new BadRequest("Role with this name already exists");
    }

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
// GET ALL ROLES
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
// GET ROLE BY ID OR NAME
// ----------------------------------------------------------
export const getRoleById = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { id } = req.params;

    if (!id) {
        throw new BadRequest("Role ID or name is required");
    }

    let role;

    if (isValidObjectId(id)) {
        role = await RoleModel.findById(id);
    } else {
        role = await RoleModel.findOne({ name: id });
    }

    if (!role) {
        throw new NotFound("Role not found");
    }

    SuccessResponse(res, { role });
};

// ----------------------------------------------------------
// GET ROLE BY NAME
// ----------------------------------------------------------
export const getRoleByName = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { name } = req.params;

    if (!name) {
        throw new BadRequest("Role name is required");
    }

    const role = await RoleModel.findOne({ name: name });

    if (!role) {
        throw new NotFound("Role not found");
    }

    SuccessResponse(res, { role });
};

// ----------------------------------------------------------
// UPDATE ROLE
// ----------------------------------------------------------
export const updateRole = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { id } = req.params;
    const { name, description, permissions, isActive } = req.body;

    if (!id) {
        throw new BadRequest("Role ID or name is required");
    }

    let role;

    if (isValidObjectId(id)) {
        role = await RoleModel.findById(id);
    } else {
        role = await RoleModel.findOne({ name: id });
    }

    if (!role) {
        throw new NotFound("Role not found");
    }

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
// DELETE ROLE
// ----------------------------------------------------------
export const deleteRole = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { id } = req.params;

    if (!id) {
        throw new BadRequest("Role ID or name is required");
    }

    let role;

    if (isValidObjectId(id)) {
        role = await RoleModel.findByIdAndDelete(id);
    } else {
        role = await RoleModel.findOneAndDelete({ name: id });
    }

    if (!role) {
        throw new NotFound("Role not found");
    }

    SuccessResponse(res, {
        message: "Role deleted successfully",
        deletedRole: role.name
    });
};

// ----------------------------------------------------------
// ADD MODULE PERMISSION
// ----------------------------------------------------------
export const addModulePermission = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { id } = req.params;
    const { module, actions } = req.body;

    if (!id) {
        throw new BadRequest("Role ID or name is required");
    }

    if (!module || !actions || !Array.isArray(actions)) {
        throw new BadRequest("Module and actions array are required");
    }

    if (!MODULES.includes(module as ModuleType)) {
        throw new BadRequest(`Invalid module. Available: ${MODULES.join(", ")}`);
    }

    const validActions = actions.filter((a: string) => ACTIONS.includes(a as ActionType)) as ActionType[];
    if (validActions.length === 0) {
        throw new BadRequest(`Invalid actions. Available: ${ACTIONS.join(", ")}`);
    }

    let role;

    if (isValidObjectId(id)) {
        role = await RoleModel.findById(id);
    } else {
        role = await RoleModel.findOne({ name: id });
    }

    if (!role) {
        throw new NotFound("Role not found");
    }

    const existingIndex = role.permissions.findIndex((p: IPermission) => p.module === module);

    if (existingIndex > -1) {
        role.permissions[existingIndex].actions = validActions;
    } else {
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
// REMOVE MODULE PERMISSION
// ----------------------------------------------------------
export const removeModulePermission = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { id, module } = req.params;

    if (!id) {
        throw new BadRequest("Role ID or name is required");
    }

    if (!module) {
        throw new BadRequest("Module is required");
    }

    let role;

    if (isValidObjectId(id)) {
        role = await RoleModel.findById(id);
    } else {
        role = await RoleModel.findOne({ name: id });
    }

    if (!role) {
        throw new NotFound("Role not found");
    }

    const moduleIndex = role.permissions.findIndex((p: IPermission) => p.module === module);

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
// TOGGLE ROLE STATUS
// ----------------------------------------------------------
export const toggleRoleStatus = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { id } = req.params;

    if (!id) {
        throw new BadRequest("Role ID or name is required");
    }

    let role;

    if (isValidObjectId(id)) {
        role = await RoleModel.findById(id);
    } else {
        role = await RoleModel.findOne({ name: id });
    }

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
// SEARCH ROLES
// ----------------------------------------------------------
export const searchRoles = async (req: Request, res: Response) => {
    if (!req.user) throw new UnauthorizedError("Authentication required");

    const { q } = req.query;

    if (!q) {
        throw new BadRequest("Search query is required");
    }

    const roles = await RoleModel.find({
        $or: [
            { name: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } }
        ]
    }).sort({ createdAt: -1 });

    if (roles.length === 0) {
        throw new NotFound("No roles found");
    }

    SuccessResponse(res, { roles });
};

// ----------------------------------------------------------
// HELPER: Validate Permissions
// ----------------------------------------------------------
const validatePermissions = (permissions: any[]): IPermission[] => {
    return permissions.map((perm: any) => {
        if (!perm.module || !perm.actions || !Array.isArray(perm.actions)) {
            throw new BadRequest("Each permission must have module and actions array");
        }

        if (!MODULES.includes(perm.module as ModuleType)) {
            throw new BadRequest(`Invalid module: ${perm.module}. Available: ${MODULES.join(", ")}`);
        }

        const validActions = perm.actions.filter((a: string) => ACTIONS.includes(a as ActionType));
        if (validActions.length === 0) {
            throw new BadRequest(`Invalid actions for ${perm.module}. Available: ${ACTIONS.join(", ")}`);
        }

        return {
            module: perm.module as ModuleType,
            actions: validActions as ActionType[]
        };
    });
};
