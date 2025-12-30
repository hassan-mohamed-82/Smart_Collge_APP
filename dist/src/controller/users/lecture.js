"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLectureById = exports.getLectures = void 0;
const lecture_1 = require("../../models/shema/lecture");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const getLectures = async (req, res) => {
    if (!req.user) {
        throw new Errors_1.UnauthorizedError("Not authorized to access this route");
    }
    const { level, department } = req.query;
    // Build query object dynamically
    const query = {};
    if (level) {
        query.level = Number(level); // Convert string to number
    }
    if (department) {
        query.department = department;
    }
    const lectures = await lecture_1.LectureModel.find(query);
    if (lectures.length === 0) {
        throw new Errors_1.NotFound("No lectures found");
    }
    (0, response_1.SuccessResponse)(res, lectures);
};
exports.getLectures = getLectures;
const getLectureById = async (req, res) => {
    if (!req.user) {
        throw new Errors_1.UnauthorizedError("Not authorized to access this route");
    }
    const { id } = req.params;
    const { level, department } = req.query;
    if (!id) {
        throw new BadRequest_1.BadRequest("Id is required");
    }
    // Build query
    const query = { _id: id };
    if (level) {
        query.level = Number(level);
    }
    if (department) {
        query.department = department;
    }
    // Use findOne instead of findById for multiple conditions
    const lecture = await lecture_1.LectureModel.findOne(query);
    if (!lecture) {
        throw new Errors_1.NotFound("No lecture found");
    }
    (0, response_1.SuccessResponse)(res, lecture);
};
exports.getLectureById = getLectureById;
