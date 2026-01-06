// models/schema/role.schema.ts
import mongoose, { Schema, Document } from "mongoose";
import { MODULES, ACTIONS, IPermission } from "../../types/constant";

export interface IRoleDocument extends Document {
    name: string;
    description?: string;
    permissions: IPermission[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

// 1. Action Schema (Sub-document)
// شيلنا الـ id اليدوي، وشيلنا { _id: false } عشان مونجو يعمل ID تلقائي
const ActionItemSchema = new Schema({
    name: {
        type: String,
        enum: ACTIONS,
        required: true
    }
});

// 2. Permission Schema (Sub-document)
const PermissionSchema = new Schema<IPermission>({
    module: {
        type: String,
        enum: MODULES,
        required: true
    },
    // هنا الـ actions عبارة عن مصفوفة من الكائنات (التي تحتوي على name و _id تلقائي)
    actions: [ActionItemSchema] 
}, { _id: false });

// 3. Role Schema (Main Document)
const RoleSchema = new Schema<IRoleDocument>({
    name: {
        type: String,
        required: [true, "Role name is required"],
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    permissions: [PermissionSchema],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export const RoleModel = mongoose.models.Role || mongoose.model<IRoleDocument>("Role", RoleSchema);