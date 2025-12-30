// types/permission.types.ts

// الموديولات المتاحة في النظام
export const MODULES = [
    "lectures",
    "news",
    "templates",
    "exams",
    "questions",
    "attempts",
    "users",
    "departments",
    "levels",
    "notifications",
    "chats",
    "rooms",
    "roles"
] as const;

// الأكشنز المتاحة
export const ACTIONS = [
    "create",
    "read",
    "update",
    "delete",
    "manage"
] as const;

// Types
export type ModuleType = typeof MODULES[number];
export type ActionType = typeof ACTIONS[number];

// Permission Interface
export interface IPermission {
    module: ModuleType;
    actions: ActionType[];
}

// Role Interface
export interface IRole {
    _id?: string;
    name: string;
    description?: string;
    permissions: IPermission[];
    isActive: boolean;
    createdAt?: Date;
    updatedAt?: Date;
}
