"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLectureById = exports.getLectures = void 0;
const lecture_1 = require("../../models/shema/lecture");
const BadRequest_1 = require("../../Errors/BadRequest");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const Errors_2 = require("../../Errors");
const getLectures = async (req, res) => {
    const level = req.query.level;
    const department = req.query.department;
    if (!req.user)
        throw new Errors_2.UnauthorizedError("Not authorized to access this route");
    const UserId = req.user.id;
    const lectures = await lecture_1.LectureModel.find({ level, department });
    if (!lectures)
        throw new Errors_1.NotFound("No lectures found");
    (0, response_1.SuccessResponse)(res, lectures);
};
exports.getLectures = getLectures;
const getLectureById = async (req, res) => {
    const level = req.query.level;
    const department = req.query.department;
    if (!req.user)
        throw new Errors_2.UnauthorizedError("Not authorized to access this route");
    const id = req.params.id;
    if (!id)
        throw new BadRequest_1.BadRequest("Id is required");
    const lecture = await lecture_1.LectureModel.findById({ _id: id, level, department });
    if (!lecture)
        throw new Errors_1.NotFound("No lecture found");
    (0, response_1.SuccessResponse)(res, lecture);
};
exports.getLectureById = getLectureById;
