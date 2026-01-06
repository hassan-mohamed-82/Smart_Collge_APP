"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/admin.routes.ts
const express_1 = require("express");
const admin_1 = require("../../controller/admin/admin");
const authenticated_1 = require("../../middlewares/authenticated");
const checkpermission_1 = require("../../middlewares/checkpermission");
const catchAsync_1 = require("../../utils/catchAsync");
const router = (0, express_1.Router)();
// Admin CRUD
router.get("/", authenticated_1.authenticate, (0, checkpermission_1.checkPermission)("users", "read"), (0, catchAsync_1.catchAsync)(admin_1.getAdmins));
router.get("/:id", authenticated_1.authenticate, (0, checkpermission_1.checkPermission)("users", "read"), (0, catchAsync_1.catchAsync)(admin_1.getAdminById));
router.post("/", authenticated_1.authenticate, (0, checkpermission_1.checkPermission)("users", "create"), (0, catchAsync_1.catchAsync)(admin_1.createAdmin));
router.put("/:id", authenticated_1.authenticate, (0, checkpermission_1.checkPermission)("users", "update"), (0, catchAsync_1.catchAsync)(admin_1.updateAdmin));
router.delete("/:id", authenticated_1.authenticate, (0, checkpermission_1.checkPermission)("users", "delete"), (0, catchAsync_1.catchAsync)(admin_1.deleteAdmin));
exports.default = router;
