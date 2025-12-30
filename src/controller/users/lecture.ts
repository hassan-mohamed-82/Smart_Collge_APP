import { LectureModel } from "../../models/shema/lecture";
import {  NotFound, UnauthorizedError } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { Request, Response } from "express";
import { BadRequest } from "../../Errors/BadRequest";

export const getLectures = async (req: Request, res: Response) => {
    if (!req.user) {
        throw new UnauthorizedError("Not authorized to access this route");
    }

    const { level, department } = req.query;

    // Build query object dynamically
    const query: Record<string, any> = {};
    
    if (level) {
        query.level = Number(level); // Convert string to number
    }
    if (department) {
        query.department = department;
    }

    const lectures = await LectureModel.find(query);
    
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

    // Build query
    const query: Record<string, any> = { _id: id };
    
    if (level) {
        query.level = Number(level);
    }
    if (department) {
        query.department = department;
    }

    // Use findOne instead of findById for multiple conditions
    const lecture = await LectureModel.findOne(query);

    if (!lecture) {
        throw new NotFound("No lecture found");
    }

    SuccessResponse(res, lecture);
};
