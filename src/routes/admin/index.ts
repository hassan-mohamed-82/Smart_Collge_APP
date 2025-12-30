import { Router } from "express";
import authRouter from "./auth";
import { authenticated } from "../../middlewares/authenticated";
import { authorizeRoles } from "../../middlewares/authorized";
import notificationRouter from "./notification"
import rolesRouter from"./permission";
import adminRouter from "./admin";
import NewsRouter from "./News";
import TempletsRouter from "./templates"
import ExamRouter from './Exam'
import AttemptRouter from './Attempt'
import chatRouter from './chat'
import lectureRouter from './lecture'
import DepartmrntRouter from './department'
import LevelRouter from './level'
export const route = Router();

route.use("/auth", authRouter);
route.use(authenticated, authorizeRoles("Admin","SuperAdmin"));
route.use("/notification",notificationRouter);
route.use("/news", NewsRouter);
route.use("/roles", rolesRouter);
route.use("/admins", adminRouter);
route.use("/templates", TempletsRouter);
route.use("/exam",ExamRouter);
route.use("/attempt",AttemptRouter)
route.use("/chat",chatRouter)
route.use("/lecture",lectureRouter)
route.use("/department",DepartmrntRouter)
route.use("/level",LevelRouter)
export default route;