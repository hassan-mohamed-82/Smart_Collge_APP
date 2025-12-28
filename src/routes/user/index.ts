import { Router } from "express";
import AuthRoute from "./auth/index";
import NotificationRouter from './notification';
import NewsRouter from './News';
import StaticsRouter from "./Statics"
import templatesRouter from "./templates"
import  ExamRouter  from "./Exam";
import lectureRouter from "./lecture"
import chatrouter from "./chat"
import DepartmrntRouter from './department'
import LevelRouter from './level'

const route = Router();
route.use("/auth", AuthRoute);
route.use("/notification", NotificationRouter);
route.use("/news", NewsRouter);
route.use("/statics", StaticsRouter);
route.use("/templates", templatesRouter);
route.use("/exam",ExamRouter)
route.use("/lecture",lectureRouter)
route.use("/chat",chatrouter)
route.use("/department",DepartmrntRouter)
route.use("/level",LevelRouter)
export default route;