import { LectureModel } from "../../models/shema/lecture";
import { saveBase64Image } from "../../utils/handleImages";
import { BadRequest } from "../../Errors/BadRequest";
import { SuccessResponse } from "../../utils/response";
import { NotFound } from "../../Errors";
import { UnauthorizedError } from "../../Errors";
import { Request, Response } from "express";

export const getLectures = async (req: Request, res: Response) => {
    const level = req.query.level;
    const department = req.query.department;
 if(!req.user)
 throw new UnauthorizedError("Not authorized to access this route")
 const UserId = req.user.id;
    const lectures = await LectureModel.find({level,department});
    if(!lectures)
    throw new NotFound("No lectures found")
SuccessResponse(res,lectures)
}


export const getLectureById = async (req: Request, res: Response) => {
    const level = req.query.level;
    const department = req.query.department;
    if(!req.user)
    throw new UnauthorizedError("Not authorized to access this route")
    const id = req.params.id;
    if(!id)
    throw new BadRequest("Id is required")
    const lecture = await LectureModel.findById({_id:id,level,department});
    if(!lecture)
    throw new NotFound("No lecture found")
SuccessResponse(res,lecture)
}


