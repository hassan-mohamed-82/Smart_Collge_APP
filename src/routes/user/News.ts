import { Router } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { authenticated } from "../../middlewares/authenticated";
import { getNewsById,getallNews,searchNews } from "../../controller/users/News";

const router = Router();

router
    .get('/',authenticated, catchAsync(getallNews))
    .get("/search", authenticated,catchAsync(searchNews))
    .get('/:id',authenticated ,catchAsync(getNewsById))


export default router;