// models/shema/auth/Admin.ts
import mongoose, { Schema } from "mongoose";

const adminSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    hashedPassword: { type: String, required: true },
    imagePath: { type: String },
    
    // ✅ استخدم ObjectId للـ role
    role: { type: mongoose.SchemaTypes.ObjectId, ref: "Role", default: null },
    
    // ✅ أضف ده للـ SuperAdmin
    roles:{type:String,enum:["Admin","SuperAdmin"]}    ,
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    fcmtoken: { type: String, default: null },
  },
  { timestamps: true }
);

export const AdminModel = mongoose.model("Admin", adminSchema);
