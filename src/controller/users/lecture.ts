import { LectureModel } from "../../models/shema/lecture";
import { NotFound, UnauthorizedError } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { Request, Response } from "express";
import { BadRequest } from "../../Errors/BadRequest";
import mongoose from "mongoose";

// Helper function to validate ObjectId
const isValidObjectId = (id: string): boolean => {
    return mongoose.Types.ObjectId.isValid(id);
};

export const getLectures = async (req: Request, res: Response) => {
    if (!req.user) {
        throw new UnauthorizedError("Not authorized to access this route");
    }

    const { level, department } = req.query;

    // Build query object dynamically
    const query: Record<string, any> = {};

    if (level) {
        if (!isValidObjectId(level as string)) {
            throw new BadRequest("Invalid level ID format");
        }
        query.level = level;
    }

    if (department) {
        if (!isValidObjectId(department as string)) {
            throw new BadRequest("Invalid department ID format");
        }
        query.department = department;
    }

    const lectures = await LectureModel.find(query)
        .populate("level", "name")      // Populate level with name field
        .populate("department", "name"); // Populate department with name field

    if (lectures.length === 0) {
        throw new NotFound("No lectures found");
    }

    SuccessResponse(res, lectures);
};

export const getLectureById = async (req: Request, res: Response) => {
    if (!req.user) {
        throw new UnauthorizedError("Not authorized to access this route");
    }

    const { id } = req.params;
    const { level, department } = req.query;

    if (!id) {
        throw new BadRequest("Id is required");
    }

    // Validate lecture ID
    if (!isValidObjectId(id)) {
        throw new BadRequest("Invalid lecture ID format");
    }

    // Build query
    const query: Record<string, any> = { _id: id };

    if (level) {
        if (!isValidObjectId(level as string)) {
            throw new BadRequest("Invalid level ID format");
        }
        query.level = level;
    }

    if (department) {
        if (!isValidObjectId(department as string)) {
            throw new BadRequest("Invalid department ID format");
        }
        query.department = department;
    }

    const lecture = await LectureModel.findOne(query)
        .populate("level")
        .populate("department");

    if (!lecture) {
        throw new NotFound("No lecture found");
    }

    SuccessResponse(res, lecture);
};


export const searchLectures = async (req: Request, res: Response) => {
    if (!req.user) {
        throw new UnauthorizedError("Not authorized to access this route");
    }

    const { q } = req.query;

    if (!q) {
        throw new NotFound("Please enter a search term");
    }

    const lectures = await LectureModel.find({
        $or: [
            { sub_name: { $regex: q, $options: "i" } },
            { title: { $regex: q, $options: "i" } }
        ]
    })
    .populate("level", "name")
    .populate("department", "name");

    if (lectures.length === 0) {
        throw new NotFound("No lectures found");
    }

    SuccessResponse(res, lectures);
};