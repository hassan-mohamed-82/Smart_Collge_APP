// routes/admin.routes.ts
import { Router } from "express";
import {
    getAdmins,
    getAdminById,
    updateAdmin,
    deleteAdmin,
    createAdmin,

} from "../../controller/admin/admin";
import { authenticate } from "../../middlewares/authenticated";
import { checkPermission } from "../../middlewares/checkpermission";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();


// Admin CRUD
router.get("/", authenticate, checkPermission("users", "read"), catchAsync(getAdmins));
router.get("/:id", authenticate, checkPermission("users", "read"), catchAsync(getAdminById));
router.post("/", authenticate, checkPermission("users", "create"), catchAsync(createAdmin));
router.put("/:id", authenticate, checkPermission("users", "update"), catchAsync(updateAdmin));
router.delete("/:id", authenticate, checkPermission("users", "delete"), catchAsync(deleteAdmin));

export default router;