"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const Admin_1 = require("../../models/shema/auth/Admin");
const permission_1 = require("../../models/shema/permission");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const login = async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        throw new BadRequest_1.BadRequest("Email and password are required");
    }
    const admin = await Admin_1.AdminModel.findOne({ email });
    if (!admin) {
        throw new Errors_1.NotFound("Admin not found");
    }
    const isMatch = await bcrypt_1.default.compare(password, admin.hashedPassword);
    if (!isMatch) {
        throw new BadRequest_1.BadRequest("Invalid credentials");
    }
    let permissions = [];
    let roleName = null;
    let roleData = null;
    if (admin.roles === "SuperAdmin") {
        roleName = "SuperAdmin";
        permissions = "all";
    }
    else if (admin.role) {
        const role = await permission_1.RoleModel.findById(admin.role);
        if (role) {
            roleData = {
                _id: role._id,
                name: role.name,
                permissions: role.permissions,
                isActive: role.isActive
            };
            roleName = role.name;
            permissions = role.permissions || [];
        }
    }
    const token = jsonwebtoken_1.default.sign({
        id: admin._id,
        name: admin.name,
        email: admin.email,
        roleId: admin.role || null,
        roles: admin.roles,
        userType: "Admin"
    }, process.env.JWT_SECRET, { expiresIn: "7d" });
    admin.isOnline = true;
    admin.lastSeen = new Date();
    await admin.save();
    return (0, response_1.SuccessResponse)(res, {
        message: "Login successful",
        token,
        admin: {
            id: admin._id,
            name: admin.name,
            email: admin.email,
            imagePath: admin.imagePath,
            roles: admin.roles,
            role: roleData,
            permissions: permissions
        }
    });
};
exports.login = login;
