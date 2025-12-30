"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLectureById = exports.getLectures = void 0;
const lecture_1 = require("../../models/shema/lecture");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const mongoose_1 = __importDefault(require("mongoose"));
// Helper function to validate ObjectId
const isValidObjectId = (id) => {
    return mongoose_1.default.Types.ObjectId.isValid(id);
};
const getLectures = async (req, res) => {
    if (!req.user) {
        throw new Errors_1.UnauthorizedError("Not authorized to access this route");
    }
    const { level, department } = req.query;
    // Build query object dynamically
    const query = {};
    if (level) {
        if (!isValidObjectId(level)) {
            throw new BadRequest_1.BadRequest("Invalid level ID format");
        }
        query.level = level;
    }
    if (department) {
        if (!isValidObjectId(department)) {
            throw new BadRequest_1.BadRequest("Invalid department ID format");
        }
        query.department = department;
    }
    const lectures = await lecture_1.LectureModel.find(query)
        .populate("level", "name") // Populate level with name field
        .populate("department", "name"); // Populate department with name field
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
    // Validate lecture ID
    if (!isValidObjectId(id)) {
        throw new BadRequest_1.BadRequest("Invalid lecture ID format");
    }
    // Build query
    const query = { _id: id };
    if (level) {
        if (!isValidObjectId(level)) {
            throw new BadRequest_1.BadRequest("Invalid level ID format");
        }
        query.level = level;
    }
    if (department) {
        if (!isValidObjectId(department)) {
            throw new BadRequest_1.BadRequest("Invalid department ID format");
        }
        query.department = department;
    }
    const lecture = await lecture_1.LectureModel.findOne(query)
        .populate("level")
        .populate("department");
    if (!lecture) {
        throw new Errors_1.NotFound("No lecture found");
    }
    (0, response_1.SuccessResponse)(res, lecture);
};
exports.getLectureById = getLectureById;
