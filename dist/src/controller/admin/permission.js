"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRoles = exports.toggleRoleStatus = exports.removeModulePermission = exports.addModulePermission = exports.deleteRole = exports.updateRole = exports.getRoleByName = exports.getRoleById = exports.getRoles = exports.createRole = exports.getAvailablePermissions = void 0;
const permission_1 = require("../../models/shema/permission");
const constant_1 = require("../../types/constant");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const mongoose_1 = __importDefault(require("mongoose"));
const BadRequest_1 = require("../../Errors/BadRequest");
const isValidObjectId = (id) => {
    return mongoose_1.default.Types.ObjectId.isValid(id);
};
// ----------------------------------------------------------
// GET AVAILABLE PERMISSIONS
// ----------------------------------------------------------
const getAvailablePermissions = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    (0, response_1.SuccessResponse)(res, {
        modules: constant_1.MODULES,
        actions: constant_1.ACTIONS
    });
};
exports.getAvailablePermissions = getAvailablePermissions;
// ----------------------------------------------------------
// CREATE ROLE
// ----------------------------------------------------------
const createRole = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { name, description, permissions } = req.body;
    if (!name) {
        throw new BadRequest_1.BadRequest("Role name is required");
    }
    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
        throw new BadRequest_1.BadRequest("Permissions array is required");
    }
    const existingRole = await permission_1.RoleModel.findOne({ name: name.trim() });
    if (existingRole) {
        throw new BadRequest_1.BadRequest("Role with this name already exists");
    }
    const validatedPermissions = validatePermissions(permissions);
    const role = await permission_1.RoleModel.create({
        name: name.trim(),
        description: description?.trim(),
        permissions: validatedPermissions
    });
    (0, response_1.SuccessResponse)(res, {
        message: "Role created successfully",
        role
    }, 201);
};
exports.createRole = createRole;
// ----------------------------------------------------------
// GET ALL ROLES
// ----------------------------------------------------------
const getRoles = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { isActive } = req.query;
    const query = {};
    if (isActive !== undefined) {
        query.isActive = isActive === "true";
    }
    const roles = await permission_1.RoleModel.find(query).sort({ createdAt: -1 });
    (0, response_1.SuccessResponse)(res, { roles });
};
exports.getRoles = getRoles;
// ----------------------------------------------------------
// GET ROLE BY ID OR NAME
// ----------------------------------------------------------
const getRoleById = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Role ID or name is required");
    }
    let role;
    if (isValidObjectId(id)) {
        role = await permission_1.RoleModel.findById(id);
    }
    else {
        role = await permission_1.RoleModel.findOne({ name: id });
    }
    if (!role) {
        throw new Errors_1.NotFound("Role not found");
    }
    (0, response_1.SuccessResponse)(res, { role });
};
exports.getRoleById = getRoleById;
// ----------------------------------------------------------
// GET ROLE BY NAME
// ----------------------------------------------------------
const getRoleByName = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { name } = req.params;
    if (!name) {
        throw new BadRequest_1.BadRequest("Role name is required");
    }
    const role = await permission_1.RoleModel.findOne({ name: name });
    if (!role) {
        throw new Errors_1.NotFound("Role not found");
    }
    (0, response_1.SuccessResponse)(res, { role });
};
exports.getRoleByName = getRoleByName;
// ----------------------------------------------------------
// UPDATE ROLE
// ----------------------------------------------------------
const updateRole = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { id } = req.params;
    const { name, description, permissions, isActive } = req.body;
    if (!id) {
        throw new BadRequest_1.BadRequest("Role ID or name is required");
    }
    let role;
    if (isValidObjectId(id)) {
        role = await permission_1.RoleModel.findById(id);
    }
    else {
        role = await permission_1.RoleModel.findOne({ name: id });
    }
    if (!role) {
        throw new Errors_1.NotFound("Role not found");
    }
    if (name && name.trim() !== role.name) {
        const existingRole = await permission_1.RoleModel.findOne({ name: name.trim() });
        if (existingRole) {
            throw new BadRequest_1.BadRequest("Role with this name already exists");
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
    (0, response_1.SuccessResponse)(res, {
        message: "Role updated successfully",
        role
    });
};
exports.updateRole = updateRole;
// ----------------------------------------------------------
// DELETE ROLE
// ----------------------------------------------------------
const deleteRole = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Role ID or name is required");
    }
    let role;
    if (isValidObjectId(id)) {
        role = await permission_1.RoleModel.findByIdAndDelete(id);
    }
    else {
        role = await permission_1.RoleModel.findOneAndDelete({ name: id });
    }
    if (!role) {
        throw new Errors_1.NotFound("Role not found");
    }
    (0, response_1.SuccessResponse)(res, {
        message: "Role deleted successfully",
        deletedRole: role.name
    });
};
exports.deleteRole = deleteRole;
// ----------------------------------------------------------
// ADD MODULE PERMISSION
// ----------------------------------------------------------
const addModulePermission = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { id } = req.params;
    const { module, actions } = req.body;
    if (!id) {
        throw new BadRequest_1.BadRequest("Role ID or name is required");
    }
    if (!module || !actions || !Array.isArray(actions)) {
        throw new BadRequest_1.BadRequest("Module and actions array are required");
    }
    if (!constant_1.MODULES.includes(module)) {
        throw new BadRequest_1.BadRequest(`Invalid module. Available: ${constant_1.MODULES.join(", ")}`);
    }
    const validActions = actions.filter((a) => constant_1.ACTIONS.includes(a));
    if (validActions.length === 0) {
        throw new BadRequest_1.BadRequest(`Invalid actions. Available: ${constant_1.ACTIONS.join(", ")}`);
    }
    let role;
    if (isValidObjectId(id)) {
        role = await permission_1.RoleModel.findById(id);
    }
    else {
        role = await permission_1.RoleModel.findOne({ name: id });
    }
    if (!role) {
        throw new Errors_1.NotFound("Role not found");
    }
    const existingIndex = role.permissions.findIndex((p) => p.module === module);
    if (existingIndex > -1) {
        role.permissions[existingIndex].actions = validActions;
    }
    else {
        role.permissions.push({
            module: module,
            actions: validActions
        });
    }
    await role.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Module permission updated successfully",
        role
    });
};
exports.addModulePermission = addModulePermission;
// ----------------------------------------------------------
// REMOVE MODULE PERMISSION
// ----------------------------------------------------------
const removeModulePermission = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { id, module } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Role ID or name is required");
    }
    if (!module) {
        throw new BadRequest_1.BadRequest("Module is required");
    }
    let role;
    if (isValidObjectId(id)) {
        role = await permission_1.RoleModel.findById(id);
    }
    else {
        role = await permission_1.RoleModel.findOne({ name: id });
    }
    if (!role) {
        throw new Errors_1.NotFound("Role not found");
    }
    const moduleIndex = role.permissions.findIndex((p) => p.module === module);
    if (moduleIndex === -1) {
        throw new Errors_1.NotFound("Module permission not found in this role");
    }
    role.permissions.splice(moduleIndex, 1);
    await role.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Module permission removed successfully",
        role
    });
};
exports.removeModulePermission = removeModulePermission;
// ----------------------------------------------------------
// TOGGLE ROLE STATUS
// ----------------------------------------------------------
const toggleRoleStatus = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { id } = req.params;
    if (!id) {
        throw new BadRequest_1.BadRequest("Role ID or name is required");
    }
    let role;
    if (isValidObjectId(id)) {
        role = await permission_1.RoleModel.findById(id);
    }
    else {
        role = await permission_1.RoleModel.findOne({ name: id });
    }
    if (!role) {
        throw new Errors_1.NotFound("Role not found");
    }
    role.isActive = !role.isActive;
    await role.save();
    (0, response_1.SuccessResponse)(res, {
        message: `Role ${role.isActive ? "activated" : "deactivated"} successfully`,
        role
    });
};
exports.toggleRoleStatus = toggleRoleStatus;
// ----------------------------------------------------------
// SEARCH ROLES
// ----------------------------------------------------------
const searchRoles = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { q } = req.query;
    if (!q) {
        throw new BadRequest_1.BadRequest("Search query is required");
    }
    const roles = await permission_1.RoleModel.find({
        $or: [
            { name: { $regex: q, $options: "i" } },
            { description: { $regex: q, $options: "i" } }
        ]
    }).sort({ createdAt: -1 });
    if (roles.length === 0) {
        throw new Errors_1.NotFound("No roles found");
    }
    (0, response_1.SuccessResponse)(res, { roles });
};
exports.searchRoles = searchRoles;
// ----------------------------------------------------------
// HELPER: Validate Permissions
// ----------------------------------------------------------
const validatePermissions = (permissions) => {
    return permissions.map((perm) => {
        if (!perm.module || !perm.actions || !Array.isArray(perm.actions)) {
            throw new BadRequest_1.BadRequest("Each permission must have module and actions array");
        }
        if (!constant_1.MODULES.includes(perm.module)) {
            throw new BadRequest_1.BadRequest(`Invalid module: ${perm.module}. Available: ${constant_1.MODULES.join(", ")}`);
        }
        const validActions = perm.actions.filter((a) => constant_1.ACTIONS.includes(a));
        if (validActions.length === 0) {
            throw new BadRequest_1.BadRequest(`Invalid actions for ${perm.module}. Available: ${constant_1.ACTIONS.join(", ")}`);
        }
        return {
            module: perm.module,
            actions: validActions
        };
    });
};
