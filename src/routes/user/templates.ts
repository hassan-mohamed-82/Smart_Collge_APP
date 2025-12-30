import { Router } from 'express';
import {  getTemplates, getTemplateById,searchTemplates  } from '../../controller/users/templates';
import { catchAsync } from '../../utils/catchAsync';
import { authenticated } from '../../middlewares/authenticated';

const router = Router();

router.get('/', authenticated ,catchAsync( getTemplates));
router.get("/search", authenticated,catchAsync(searchTemplates))
router.get('/:id',authenticated,catchAsync(getTemplateById));
export default router;