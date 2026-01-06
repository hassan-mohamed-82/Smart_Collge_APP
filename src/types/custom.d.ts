// types/custom.ts
import { Request } from "express";
import mongoose from "mongoose";

export interface AppUser {
    _id?: mongoose.Types.ObjectId;
    id?: string;
    name?: string;
    email?: string;
    imagePath?: string;
    BaseImage64?: string;

    // نوع المستخدم
    role?: "SuperAdmin" | "Admin" | "Student" | "Graduated";
    
    // للأدمن - ObjectId للـ Role permissions
    roleId?: string;
    
    // للأدمن - نوع الأدمن
    roles?: "SuperAdmin" | "Admin";

    // للطالب - ObjectId references
    level?: mongoose.Types.ObjectId | string | any;
    department?: mongoose.Types.ObjectId | string | any;

    // للخريج
    cv?: string;
    employment_status?: "Employed" | "Job Seeker" | "Freelancer" | "Postgraduate Studies";
    job_title?: string;
    company_location?: string;
    company_email?: string;
    company_link?: string;
    company_phone?: string;
    about_company?: string;

    // حالة الاتصال
    isOnline?: boolean;
    lastSeen?: Date;
    
    // نوع اليوزر (Admin أو User)
    userType?: "Admin" | "User";
}

export interface AuthenticatedRequest extends Request {
    user?: AppUser;
}

declare global {
    namespace Express {
        interface Request {
            user?: AppUser;
        }
    }
}
