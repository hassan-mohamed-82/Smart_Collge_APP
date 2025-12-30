"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const catchAsync_1 = require("../../utils/catchAsync");
const authenticated_1 = require("../../middlewares/authenticated");
const lecture_1 = require("../../controller/users/lecture");
const router = (0, express_1.Router)();
router
    .get('/', authenticated_1.authenticated, (0, catchAsync_1.catchAsync)(lecture_1.getLectures))
    .get("/search", authenticated_1.authenticated, (0, catchAsync_1.catchAsync)(lecture_1.searchLectures))
    .get('/:id', authenticated_1.authenticated, (0, catchAsync_1.catchAsync)(lecture_1.getLectureById));
exports.default = router;
