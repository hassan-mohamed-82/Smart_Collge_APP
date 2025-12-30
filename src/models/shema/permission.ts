// models/schema/role.schema.ts (الملف الجديد - خليه هو بس)
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

const PermissionSchema = new Schema<IPermission>({
    module: {
        type: String,
        enum: MODULES,
        required: true
    },
    actions: [{
        type: String,
        enum: ACTIONS
    }]
}, { _id: false });

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

// ✅ تأكد إن الموديل مش موجود قبل ما تعمله
export const RoleModel = mongoose.models.Role || mongoose.model<IRoleDocument>("Role", RoleSchema);
