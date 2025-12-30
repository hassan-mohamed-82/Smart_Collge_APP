"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleRoleStatus = exports.removeModulePermission = exports.addModulePermission = exports.deleteRole = exports.updateRole = exports.getRoleById = exports.getRoles = exports.createRole = exports.getAvailablePermissions = void 0;
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
// GET AVAILABLE PERMISSIONS - جلب الموديولات والأكشنز المتاحة
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
// CREATE ROLE - إنشاء Role جديد
// ----------------------------------------------------------
const createRole = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { name, description, permissions } = req.body;
    // Validation
    if (!name) {
        throw new BadRequest_1.BadRequest("Role name is required");
    }
    if (!permissions || !Array.isArray(permissions) || permissions.length === 0) {
        throw new BadRequest_1.BadRequest("Permissions array is required");
    }
    // Check if role already exists
    const existingRole = await permission_1.RoleModel.findOne({ name: name.trim() });
    if (existingRole) {
        throw new BadRequest_1.BadRequest("Role with this name already exists");
    }
    // Validate permissions structure
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
// GET ALL ROLES - جلب كل الـ Roles
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
// GET ROLE BY ID - جلب Role بالـ ID
// ----------------------------------------------------------
const getRoleById = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { id } = req.params;
    if (!id || !isValidObjectId(id)) {
        throw new BadRequest_1.BadRequest("Valid role ID is required");
    }
    const role = await permission_1.RoleModel.findById(id);
    if (!role) {
        throw new Errors_1.NotFound("Role not found");
    }
    (0, response_1.SuccessResponse)(res, { role });
};
exports.getRoleById = getRoleById;
// ----------------------------------------------------------
// UPDATE ROLE - تحديث Role
// ----------------------------------------------------------
const updateRole = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { id } = req.params;
    const { name, description, permissions, isActive } = req.body;
    if (!id || !isValidObjectId(id)) {
        throw new BadRequest_1.BadRequest("Valid role ID is required");
    }
    const role = await permission_1.RoleModel.findById(id);
    if (!role) {
        throw new Errors_1.NotFound("Role not found");
    }
    // Check if new name already exists (if name is being changed)
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
// DELETE ROLE - حذف Role
// ----------------------------------------------------------
const deleteRole = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { id } = req.params;
    if (!id || !isValidObjectId(id)) {
        throw new BadRequest_1.BadRequest("Valid role ID is required");
    }
    const role = await permission_1.RoleModel.findByIdAndDelete(id);
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
// ADD MODULE PERMISSION - إضافة صلاحية لـ module معين
// ----------------------------------------------------------
const addModulePermission = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { id } = req.params;
    const { module, actions } = req.body;
    if (!id || !isValidObjectId(id)) {
        throw new BadRequest_1.BadRequest("Valid role ID is required");
    }
    if (!module || !actions || !Array.isArray(actions)) {
        throw new BadRequest_1.BadRequest("Module and actions array are required");
    }
    // Validate module
    if (!constant_1.MODULES.includes(module)) {
        throw new BadRequest_1.BadRequest(`Invalid module. Available: ${constant_1.MODULES.join(", ")}`);
    }
    // Validate actions
    const validActions = actions.filter(a => constant_1.ACTIONS.includes(a));
    if (validActions.length === 0) {
        throw new BadRequest_1.BadRequest(`Invalid actions. Available: ${constant_1.ACTIONS.join(", ")}`);
    }
    const role = await permission_1.RoleModel.findById(id);
    if (!role) {
        throw new Errors_1.NotFound("Role not found");
    }
    // Check if module already exists
    const existingIndex = role.permissions.findIndex(p => p.module === module);
    if (existingIndex > -1) {
        // Update existing module actions
        role.permissions[existingIndex].actions = validActions;
    }
    else {
        // Add new module permission
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
// REMOVE MODULE PERMISSION - حذف صلاحية module معين
// ----------------------------------------------------------
const removeModulePermission = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { id, module } = req.params;
    if (!id || !isValidObjectId(id)) {
        throw new BadRequest_1.BadRequest("Valid role ID is required");
    }
    if (!module) {
        throw new BadRequest_1.BadRequest("Module is required");
    }
    const role = await permission_1.RoleModel.findById(id);
    if (!role) {
        throw new Errors_1.NotFound("Role not found");
    }
    const moduleIndex = role.permissions.findIndex(p => p.module === module);
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
// TOGGLE ROLE STATUS - تفعيل/تعطيل Role
// ----------------------------------------------------------
const toggleRoleStatus = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { id } = req.params;
    if (!id || !isValidObjectId(id)) {
        throw new BadRequest_1.BadRequest("Valid role ID is required");
    }
    const role = await permission_1.RoleModel.findById(id);
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
// HELPER: Validate Permissions
// ----------------------------------------------------------
const validatePermissions = (permissions) => {
    return permissions.map(perm => {
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
