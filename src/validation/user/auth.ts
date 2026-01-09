import Joi from "joi";

// ✅ Schema للـ Graduated Data
const graduatedDataSchema = Joi.object({
  cv: Joi.string().optional(),
  employment_status: Joi.string()
    .valid("Employed", "Job Seeker", "Freelancer", "Postgraduate Studies")
    .optional(),
  job_title: Joi.string().optional(),
  company_location: Joi.string().optional(),
  company_email: Joi.string().email().optional(), // ✅ أضفت email validation
  company_link: Joi.string().uri().optional(),    // ✅ أضفت uri validation
  company_phone: Joi.string().optional(),
  about_company: Joi.string().optional(),
});

// ✅ Signup Schema
export const signupSchema = Joi.object({
  name: Joi.string().min(3).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("Student", "Graduated").required(), // ✅ أضفت valid و required
  
  // ✅ level مطلوب للـ Student فقط
  level: Joi.when("role", {
    is: "Student",
    then: Joi.string().hex().length(24).required(), // ObjectId
    otherwise: Joi.forbidden(),
  }),
  
  // ✅ department مطلوب للـ Student فقط
  department: Joi.when("role", {
    is: "Student",
    then: Joi.string().hex().length(24).required(), // ObjectId
    otherwise: Joi.forbidden(),
  }),
  
  // ✅ الصورة - تقبل base64 أو URL
  imageBase64: Joi.string().optional(),
  
  // ✅ graduatedData مطلوب للـ Graduated فقط
  graduatedData: Joi.when("role", {
    is: "Graduated",
    then: graduatedDataSchema.optional(),
    otherwise: Joi.forbidden(),
  }),
});

// ✅ Login Schema
export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

// ✅ Verify Email Schema
export const verifyEmailSchema = Joi.object({
  userId: Joi.string().hex().length(24).required(), // ✅ ObjectId validation
  code: Joi.string().length(6).required(), // ✅ أضفت length للكود
});

// ✅ Send Reset Code Schema
export const sendResetCodeSchema = Joi.object({
  email: Joi.string().email().required(),
});

// ✅ Check Reset Code Schema
export const checkResetCodeSchema = Joi.object({
  email: Joi.string().email().required(), // ✅ أضفت email validation
  code: Joi.string().length(6).required(),
});

// ✅ Reset Password Schema
export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(), // ✅ أضفت email validation
  code: Joi.string().length(6).required(),
  newPassword: Joi.string().min(6).max(30).required(),
});

// ✅ Google Validate Schema
export const googlevalidateSchema = Joi.object({
  token: Joi.string().required(),
  role: Joi.string().valid("Student", "Graduated").required(),
  
  // ✅ أضفت الحقول المطلوبة حسب الـ role
  level: Joi.when("role", {
    is: "Student",
    then: Joi.string().hex().length(24).required(),
    otherwise: Joi.forbidden(),
  }),
  
  department: Joi.when("role", {
    is: "Student",
    then: Joi.string().hex().length(24).required(),
    otherwise: Joi.forbidden(),
  }),
  
  graduatedData: Joi.when("role", {
    is: "Graduated",
    then: graduatedDataSchema.optional(),
    otherwise: Joi.forbidden(),
  }),
});

// ✅ Update Profile Schema (إضافي)
export const updateProfileSchema = Joi.object({
  name: Joi.string().min(3).max(50).optional(),
  imageBase64: Joi.string().optional(),
  fcmtoken: Joi.string().optional(),
  graduatedData: graduatedDataSchema.optional(),
});
