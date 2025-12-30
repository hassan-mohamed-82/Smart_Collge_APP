// routes/role.routes.ts
import { Router } from "express";
import {
    getAvailablePermissions,
    createRole,
    getRoles,
    getRoleById,
    updateRole,
    deleteRole,
    addModulePermission,
    removeModulePermission,
    toggleRoleStatus
} from "../../controller/admin/permission";
import { authenticated } from "../../middlewares/authenticated";
import { checkPermission } from "../../middlewares/checkpermission";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

// Get available modules and actions
router.get(
    "/permissions",
    authenticated,
    catchAsync(getAvailablePermissions)
);

// Get all roles
router.get(
    "/",
    authenticated,
    checkPermission("roles", "read"),
    catchAsync(getRoles)
);

// Get role by ID
router.get(
    "/:id",
    authenticated,
    checkPermission("roles", "read"),
    catchAsync(getRoleById)
);

// Create new role
router.post(
    "/",
    authenticated,
    checkPermission("roles", "create"),
    catchAsync(createRole)
);

// Update role
router.put(
    "/:id",
    authenticated,
    checkPermission("roles", "update"),
    catchAsync(updateRole)
);

// Delete role
router.delete(
    "/:id",
    authenticated,
    checkPermission("roles", "delete"),
    catchAsync(deleteRole)
);

// Add/Update module permission
router.patch(
    "/:id/permissions",
    authenticated,
    checkPermission("roles", "update"),
    catchAsync(addModulePermission)
);

// Remove module permission
router.delete(
    "/:id/permissions/:module",
    authenticated,
    checkPermission("roles", "update"),
    catchAsync(removeModulePermission)
);

// Toggle role status (activate/deactivate)
router.patch(
    "/:id/toggle-status",
    authenticated,
    checkPermission("roles", "update"),
    catchAsync(toggleRoleStatus)
);

export default router;
