"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = exports.authenticated = void 0;
const unauthorizedError_1 = require("../Errors/unauthorizedError");
const User_1 = require("../models/shema/auth/User");
const Admin_1 = require("../models/shema/auth/Admin");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Helper function to convert null to undefined
const nullToUndefined = (value) => {
    return value === null ? undefined : value;
};
const authenticated = async (req, _res, next) => {
    try {
        // 1. Check Authorization Header
        const authHeader = req.headers["authorization"];
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return next(new unauthorizedError_1.UnauthorizedError("No token provided"));
        }
        // 2. Verify Token
        const token = authHeader.split(" ")[1];
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        }
        catch {
            return next(new unauthorizedError_1.UnauthorizedError("Invalid or expired token"));
        }
        if (!decoded?.id) {
            return next(new unauthorizedError_1.UnauthorizedError("Invalid token payload"));
        }
        // 3. Try to find Admin first
        const admin = await Admin_1.AdminModel.findById(decoded.id).populate("role");
        if (admin) {
            const roleId = admin.role?._id?.toString();
            req.user = {
                _id: admin._id,
                id: admin._id.toString(),
                name: nullToUndefined(admin.name),
                email: nullToUndefined(admin.email),
                imagePath: nullToUndefined(admin.imagePath),
                roles: admin.roles,
                roleId: nullToUndefined(roleId),
                isOnline: nullToUndefined(admin.isOnline),
                lastSeen: nullToUndefined(admin.lastSeen),
                userType: "Admin"
            };
            return next();
        }
        // 4. Try to find User
        const user = await User_1.UserModel.findById(decoded.id)
            .populate("level", "level_number name isActive")
            .populate("department", "name isActive");
        if (user) {
            req.user = {
                _id: user._id,
                id: user._id.toString(),
                name: nullToUndefined(user.name),
                email: nullToUndefined(user.email),
                BaseImage64: nullToUndefined(user.BaseImage64),
                role: user.role,
                level: nullToUndefined(user.level),
                department: nullToUndefined(user.department),
                isOnline: nullToUndefined(user.isOnline),
                lastSeen: nullToUndefined(user.lastSeen),
                userType: "User"
            };
            // 5. If Graduated, get graduated data
            if (user.role === "Graduated") {
                const graduated = await User_1.GraduatedModel.findOne({ user: user._id });
                if (graduated && req.user) {
                    req.user.cv = nullToUndefined(graduated.cv);
                    req.user.employment_status = graduated.employment_status;
                    req.user.job_title = nullToUndefined(graduated.job_title);
                    req.user.company_location = nullToUndefined(graduated.company_location);
                    req.user.company_email = nullToUndefined(graduated.company_email);
                    req.user.company_link = nullToUndefined(graduated.company_link);
                    req.user.company_phone = nullToUndefined(graduated.company_phone);
                    req.user.about_company = nullToUndefined(graduated.about_company);
                }
            }
            return next();
        }
        // 6. User not found
        return next(new unauthorizedError_1.UnauthorizedError("User not found"));
    }
    catch {
        return next(new unauthorizedError_1.UnauthorizedError("Authentication failed"));
    }
};
exports.authenticated = authenticated;
exports.authenticate = exports.authenticated;
