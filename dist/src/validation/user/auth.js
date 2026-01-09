"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProfileSchema = exports.googlevalidateSchema = exports.resetPasswordSchema = exports.checkResetCodeSchema = exports.sendResetCodeSchema = exports.verifyEmailSchema = exports.loginSchema = exports.signupSchema = void 0;
const joi_1 = __importDefault(require("joi"));
// ✅ Schema للـ Graduated Data
const graduatedDataSchema = joi_1.default.object({
    cv: joi_1.default.string().optional(),
    employment_status: joi_1.default.string()
        .valid("Employed", "Job Seeker", "Freelancer", "Postgraduate Studies")
        .optional(),
    job_title: joi_1.default.string().optional(),
    company_location: joi_1.default.string().optional(),
    company_email: joi_1.default.string().email().optional(), // ✅ أضفت email validation
    company_link: joi_1.default.string().uri().optional(), // ✅ أضفت uri validation
    company_phone: joi_1.default.string().optional(),
    about_company: joi_1.default.string().optional(),
});
// ✅ Signup Schema
exports.signupSchema = joi_1.default.object({
    name: joi_1.default.string().min(3).max(50).required(),
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).required(),
    role: joi_1.default.string().valid("Student", "Graduated").required(), // ✅ أضفت valid و required
    // ✅ level مطلوب للـ Student فقط
    level: joi_1.default.when("role", {
        is: "Student",
        then: joi_1.default.string().hex().length(24).required(), // ObjectId
        otherwise: joi_1.default.forbidden(),
    }),
    // ✅ department مطلوب للـ Student فقط
    department: joi_1.default.when("role", {
        is: "Student",
        then: joi_1.default.string().hex().length(24).required(), // ObjectId
        otherwise: joi_1.default.forbidden(),
    }),
    // ✅ الصورة - تقبل base64 أو URL
    imageBase64: joi_1.default.string().optional(),
    // ✅ graduatedData مطلوب للـ Graduated فقط
    graduatedData: joi_1.default.when("role", {
        is: "Graduated",
        then: graduatedDataSchema.optional(),
        otherwise: joi_1.default.forbidden(),
    }),
});
// ✅ Login Schema
exports.loginSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
    password: joi_1.default.string().min(6).required(),
});
// ✅ Verify Email Schema
exports.verifyEmailSchema = joi_1.default.object({
    userId: joi_1.default.string().hex().length(24).required(), // ✅ ObjectId validation
    code: joi_1.default.string().length(6).required(), // ✅ أضفت length للكود
});
// ✅ Send Reset Code Schema
exports.sendResetCodeSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(),
});
// ✅ Check Reset Code Schema
exports.checkResetCodeSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(), // ✅ أضفت email validation
    code: joi_1.default.string().length(6).required(),
});
// ✅ Reset Password Schema
exports.resetPasswordSchema = joi_1.default.object({
    email: joi_1.default.string().email().required(), // ✅ أضفت email validation
    code: joi_1.default.string().length(6).required(),
    newPassword: joi_1.default.string().min(6).max(30).required(),
});
// ✅ Google Validate Schema
exports.googlevalidateSchema = joi_1.default.object({
    token: joi_1.default.string().required(),
    role: joi_1.default.string().valid("Student", "Graduated").required(),
    // ✅ أضفت الحقول المطلوبة حسب الـ role
    level: joi_1.default.when("role", {
        is: "Student",
        then: joi_1.default.string().hex().length(24).required(),
        otherwise: joi_1.default.forbidden(),
    }),
    department: joi_1.default.when("role", {
        is: "Student",
        then: joi_1.default.string().hex().length(24).required(),
        otherwise: joi_1.default.forbidden(),
    }),
    graduatedData: joi_1.default.when("role", {
        is: "Graduated",
        then: graduatedDataSchema.optional(),
        otherwise: joi_1.default.forbidden(),
    }),
});
// ✅ Update Profile Schema (إضافي)
exports.updateProfileSchema = joi_1.default.object({
    name: joi_1.default.string().min(3).max(50).optional(),
    imageBase64: joi_1.default.string().optional(),
    fcmtoken: joi_1.default.string().optional(),
    graduatedData: graduatedDataSchema.optional(),
});
