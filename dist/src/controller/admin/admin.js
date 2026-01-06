"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAdmin = exports.updateAdmin = exports.getAdminById = exports.getAdmins = exports.createAdmin = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const mongoose_1 = __importDefault(require("mongoose"));
const Admin_1 = require("../../models/shema/auth/Admin");
const permission_1 = require("../../models/shema/permission");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const BadRequest_1 = require("../../Errors/BadRequest");
const isValidObjectId = (id) => {
    return mongoose_1.default.Types.ObjectId.isValid(id);
};
// ✅ Create Admin
const createAdmin = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { name, email, password, role, roles } = req.body;
    if (!name || !email || !password) {
        throw new BadRequest_1.BadRequest("Name, email and password are required");
    }
    const existing = await Admin_1.AdminModel.findOne({ email });
    if (existing)
        throw new BadRequest_1.BadRequest("Email already exists");
    // Validate role if provided
    let roleId = null;
    if (role) {
        if (isValidObjectId(role)) {
            const roleDoc = await permission_1.RoleModel.findById(role);
            if (!roleDoc)
                throw new Errors_1.NotFound("Role not found");
            roleId = role;
        }
        else {
            const roleDoc = await permission_1.RoleModel.findOne({ name: role });
            if (!roleDoc)
                throw new Errors_1.NotFound("Role not found");
            roleId = roleDoc._id;
        }
    }
    const hashedPassword = await bcrypt_1.default.hash(password, 10);
    const admin = await Admin_1.AdminModel.create({
        name,
        email,
        hashedPassword,
        role: roleId,
        roles: roles || "Admin"
    });
    await admin.populate("role", "name permissions");
    (0, response_1.SuccessResponse)(res, {
        message: "Admin created successfully",
        admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            roles: admin.roles,
            role: admin.role
        }
    }, 201);
};
exports.createAdmin = createAdmin;
// ✅ Get All Admins
const getAdmins = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const admins = await Admin_1.AdminModel.find()
        .select("-hashedPassword")
        .populate("role", "name permissions isActive")
        .sort({ createdAt: -1 });
    return (0, response_1.SuccessResponse)(res, {
        message: "Admins fetched successfully",
        count: admins.length,
        admins
    });
};
exports.getAdmins = getAdmins;
// ✅ Get Admin By ID
const getAdminById = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { id } = req.params;
    if (!id || !isValidObjectId(id)) {
        throw new BadRequest_1.BadRequest("Valid admin ID is required");
    }
    const admin = await Admin_1.AdminModel.findById(id)
        .select("-hashedPassword")
        .populate("role", "name permissions isActive");
    if (!admin)
        throw new Errors_1.NotFound("Admin not found");
    return (0, response_1.SuccessResponse)(res, {
        message: "Admin fetched successfully",
        admin
    });
};
exports.getAdminById = getAdminById;
// ✅ Update Admin
const updateAdmin = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { id } = req.params;
    const { name, email, password, role, roles } = req.body;
    if (!id || !isValidObjectId(id)) {
        throw new BadRequest_1.BadRequest("Valid admin ID is required");
    }
    const admin = await Admin_1.AdminModel.findById(id);
    if (!admin)
        throw new Errors_1.NotFound("Admin not found");
    // Check email uniqueness
    if (email && email !== admin.email) {
        const exists = await Admin_1.AdminModel.findOne({ email });
        if (exists)
            throw new BadRequest_1.BadRequest("Email already in use");
        admin.email = email;
    }
    // Update password
    if (password) {
        admin.hashedPassword = await bcrypt_1.default.hash(password, 10);
    }
    // Update name
    if (name)
        admin.name = name;
    // Update roles (Admin/SuperAdmin)
    if (roles) {
        if (!["Admin", "SuperAdmin"].includes(roles)) {
            throw new BadRequest_1.BadRequest("roles must be 'Admin' or 'SuperAdmin'");
        }
        admin.roles = roles;
    }
    // Update role (permissions)
    if (role) {
        if (isValidObjectId(role)) {
            const roleDoc = await permission_1.RoleModel.findById(role);
            if (!roleDoc)
                throw new Errors_1.NotFound("Role not found");
            admin.role = role;
        }
        else {
            const roleDoc = await permission_1.RoleModel.findOne({ name: role });
            if (!roleDoc)
                throw new Errors_1.NotFound("Role not found");
            admin.role = roleDoc._id;
        }
    }
    await admin.save();
    await admin.populate("role", "name permissions");
    return (0, response_1.SuccessResponse)(res, {
        message: "Admin updated successfully",
        admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            roles: admin.roles,
            role: admin.role
        }
    });
};
exports.updateAdmin = updateAdmin;
// ✅ Delete Admin
const deleteAdmin = async (req, res) => {
    if (!req.user)
        throw new Errors_1.UnauthorizedError("Authentication required");
    const { id } = req.params;
    if (!id || !isValidObjectId(id)) {
        throw new BadRequest_1.BadRequest("Valid admin ID is required");
    }
    const admin = await Admin_1.AdminModel.findByIdAndDelete(id);
    if (!admin)
        throw new Errors_1.NotFound("Admin not found");
    return (0, response_1.SuccessResponse)(res, {
        message: "Admin deleted successfully",
        deletedAdmin: admin.name
    });
};
exports.deleteAdmin = deleteAdmin;
