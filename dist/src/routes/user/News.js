"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const catchAsync_1 = require("../../utils/catchAsync");
const authenticated_1 = require("../../middlewares/authenticated");
const News_1 = require("../../controller/users/News");
const router = (0, express_1.Router)();
router
    .get('/', authenticated_1.authenticated, (0, catchAsync_1.catchAsync)(News_1.getallNews))
    .get("/search", authenticated_1.authenticated, (0, catchAsync_1.catchAsync)(News_1.searchNews))
    .get('/:id', authenticated_1.authenticated, (0, catchAsync_1.catchAsync)(News_1.getNewsById));
exports.default = router;
