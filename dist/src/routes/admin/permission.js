"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/role.routes.ts
const express_1 = require("express");
const permission_1 = require("../../controller/admin/permission");
const authenticated_1 = require("../../middlewares/authenticated");
const checkpermission_1 = require("../../middlewares/checkpermission");
const catchAsync_1 = require("../../utils/catchAsync");
const router = (0, express_1.Router)();
// Get available modules and actions
router.get("/permissions", authenticated_1.authenticated, (0, catchAsync_1.catchAsync)(permission_1.getAvailablePermissions));
// Get all roles
router.get("/", authenticated_1.authenticated, (0, checkpermission_1.checkPermission)("roles", "read"), (0, catchAsync_1.catchAsync)(permission_1.getRoles));
// Get role by ID
router.get("/:id", authenticated_1.authenticated, (0, checkpermission_1.checkPermission)("roles", "read"), (0, catchAsync_1.catchAsync)(permission_1.getRoleById));
// Create new role
router.post("/", authenticated_1.authenticated, (0, checkpermission_1.checkPermission)("roles", "create"), (0, catchAsync_1.catchAsync)(permission_1.createRole));
// Update role
router.put("/:id", authenticated_1.authenticated, (0, checkpermission_1.checkPermission)("roles", "update"), (0, catchAsync_1.catchAsync)(permission_1.updateRole));
// Delete role
router.delete("/:id", authenticated_1.authenticated, (0, checkpermission_1.checkPermission)("roles", "delete"), (0, catchAsync_1.catchAsync)(permission_1.deleteRole));
// Add/Update module permission
router.patch("/:id/permissions", authenticated_1.authenticated, (0, checkpermission_1.checkPermission)("roles", "update"), (0, catchAsync_1.catchAsync)(permission_1.addModulePermission));
// Remove module permission
router.delete("/:id/permissions/:module", authenticated_1.authenticated, (0, checkpermission_1.checkPermission)("roles", "update"), (0, catchAsync_1.catchAsync)(permission_1.removeModulePermission));
// Toggle role status (activate/deactivate)
router.patch("/:id/toggle-status", authenticated_1.authenticated, (0, checkpermission_1.checkPermission)("roles", "update"), (0, catchAsync_1.catchAsync)(permission_1.toggleRoleStatus));
exports.default = router;
