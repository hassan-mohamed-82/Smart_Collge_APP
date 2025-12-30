// models/schema/permission.ts
import mongoose, { Schema } from "mongoose";
import { MODULES, ACTIONS, IRole } from "../../types/constant";

const PermissionSchema = new Schema({
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

const RoleSchema = new Schema<IRole>({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String
    },
    permissions: [PermissionSchema],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

export const RoleModel = mongoose.model<IRole>("Role", RoleSchema);
