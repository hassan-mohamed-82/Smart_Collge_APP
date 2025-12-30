import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";
import { getLectureById,getLectures ,searchLectures } from "../../controller/users/lecture";

const router = Router();

router
    .get('/',authenticated, catchAsync(getLectures))
    .get("/search", authenticated, catchAsync(searchLectures))
    .get('/:id',authenticated ,catchAsync(getLectureById))
export default router;