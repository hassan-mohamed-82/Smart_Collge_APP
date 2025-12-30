import { Request, Response } from "express";
import mongoose from "mongoose";
import { LectureModel } from "../../models/shema/lecture";
import {
  saveBase64Image,
  uploadFileToCloudinary, // Add this utility for cleanup
} from "../../utils/handleImages";
import {  NotFound, UnauthorizedError } from "../../Errors";

import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";

// Helper function to validate ObjectId
const isValidObjectId = (id: string): boolean => {
  return mongoose.Types.ObjectId.isValid(id);
};

// ----------------------------------------------------------
// CREATE LECTURE
// ----------------------------------------------------------
export const createLecture = async (req: Request, res: Response) => {
  const { sub_name, level, department, num_of_week, title, iconBase64 } = req.body;

  // Validate required fields
  if (!sub_name || !title || !num_of_week) {
    throw new BadRequest("Required fields are missing: sub_name, title, num_of_week");
  }

  // Validate level and department are valid ObjectIds
  if (level && !isValidObjectId(level)) {
    throw new BadRequest("Invalid level ID format");
  }

  if (department && !isValidObjectId(department)) {
    throw new BadRequest("Invalid department ID format");
  }

  // Validate num_of_week
  const weekNum = Number(num_of_week);
  if (isNaN(weekNum) || weekNum < 1 || weekNum > 20) {
    throw new BadRequest("num_of_week must be a number between 1 and 20");
  }

  let iconUrl: string | undefined;

  // Handle base64 image upload
  if (iconBase64) {
    if (!iconBase64.startsWith("data:image")) {
      throw new BadRequest("Invalid image format. Must be a base64 image string");
    }
    
    try {
      iconUrl = await saveBase64Image(
        iconBase64,
        "damanhour/lectures/icons",
        `lecture_${Date.now()}`
      );
    } catch (error) {
      throw new BadRequest("Failed to upload icon image");
    }
  }

  const lecture = await LectureModel.create({
    sub_name: sub_name.trim(),
    level,
    department,
    num_of_week: weekNum,
    title: title.trim(),
    icon: iconUrl,
  });

  // Populate level and department for response
  await lecture.populate(["level", "department"]);

  return SuccessResponse(res, lecture, 201);
};

// ----------------------------------------------------------
// UPLOAD LECTURE PDF
// ----------------------------------------------------------
export const uploadLecturePDF = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || !isValidObjectId(id)) {
    throw new BadRequest("Valid lecture ID is required");
  }

  const lecture = await LectureModel.findById(id);
  if (!lecture) {
    throw new NotFound("Lecture not found");
  }

  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    throw new BadRequest("No PDF files uploaded");
  }

  // Validate file types
  const invalidFiles = files.filter(
    (file) => file.mimetype !== "application/pdf"
  );

  if (invalidFiles.length > 0) {
    throw new BadRequest("Only PDF files are allowed");
  }

  const uploadedPDFs: Array<{ name: string; url: string; uploadDate: Date }> = [];

  for (const file of files) {
    try {
      const pdfUrl = await uploadFileToCloudinary(
        file.path,
        "damanhour/lectures/pdfs",
        "auto"
      );

      uploadedPDFs.push({
        name: file.originalname,
        url: pdfUrl,
        uploadDate: new Date(),
      });
    } catch (error) {
      // Continue with other files if one fails
      console.error(`Failed to upload ${file.originalname}:`, error);
    }
  }

  if (uploadedPDFs.length === 0) {
    throw new BadRequest("Failed to upload any PDF files");
  }

  // Push all uploaded PDFs
  lecture.pdfs.push(...uploadedPDFs);
  await lecture.save();

  return SuccessResponse(res, {
    message: `${uploadedPDFs.length} PDF(s) uploaded successfully`,
    lecture,
  });
};

// ----------------------------------------------------------
// UPLOAD LECTURE VIDEO
// ----------------------------------------------------------
export const uploadLectureVideo = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || !isValidObjectId(id)) {
    throw new BadRequest("Valid lecture ID is required");
  }

  const lecture = await LectureModel.findById(id);
  if (!lecture) {
    throw new NotFound("Lecture not found");
  }

  if (!req.file) {
    throw new BadRequest("No video file uploaded");
  }

  // Validate video file type
  const allowedVideoTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
  if (!allowedVideoTypes.includes(req.file.mimetype)) {
    throw new BadRequest("Invalid video format. Allowed: mp4, webm, ogg, mov");
  }

  try {
    const videoUrl = await uploadFileToCloudinary(
      req.file.path,
      "damanhour/lectures/videos",
      "video"
    );

    // Get quality from request body or default to 720p
    const quality = req.body.quality || "720p";
    const validQualities = ["360p", "480p", "720p", "1080p", "4K"];
    
    if (!validQualities.includes(quality)) {
      throw new BadRequest(`Invalid quality. Allowed: ${validQualities.join(", ")}`);
    }

    lecture.video = {
      name: req.file.originalname,
      url: videoUrl,
      duration: req.body.duration ? Number(req.body.duration) : 0,
      quality: quality as "360p" | "480p" | "720p" | "1080p" | "4K",
      uploadDate: new Date(),
    };

    await lecture.save();

    return SuccessResponse(res, {
      message: "Video uploaded successfully",
      lecture,
    });
  } catch (error) {
    throw new BadRequest("Failed to upload video");
  }
};

// ----------------------------------------------------------
// GET ALL LECTURES (with filtering & pagination)
// ----------------------------------------------------------
export const getLectures = async (req: Request, res: Response) => {
  const {
    level,
    department,
    page = "1",
    limit = "10",
    search,
  } = req.query;

  // Build query object
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

  // Search by title or sub_name
  if (search) {
    query.$or = [
      { title: { $regex: search, $options: "i" } },
      { sub_name: { $regex: search, $options: "i" } },
    ];
  }

  // Pagination
  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const limitNum = Math.min(50, Math.max(1, parseInt(limit as string, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const [lectures, total] = await Promise.all([
    LectureModel.find(query)
      .populate("level", "name") // Populate with specific fields
      .populate("department", "name")
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 }),
    LectureModel.countDocuments(query),
  ]);

  return SuccessResponse(res, {
    lectures,
    pagination: {
      currentPage: pageNum,
      totalPages: Math.ceil(total / limitNum),
      totalItems: total,
      itemsPerPage: limitNum,
      hasNextPage: pageNum * limitNum < total,
      hasPrevPage: pageNum > 1,
    },
  });
};

// ----------------------------------------------------------
// GET LECTURE BY ID
// ----------------------------------------------------------
export const getLectureById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || !isValidObjectId(id)) {
    throw new BadRequest("Valid lecture ID is required");
  }

  const lecture = await LectureModel.findById(id)
    .populate("level")
    .populate("department");

  if (!lecture) {
    throw new NotFound("Lecture not found");
  }

  return SuccessResponse(res, lecture);
};

// ----------------------------------------------------------
// UPDATE LECTURE
// ----------------------------------------------------------
export const updateLecture = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || !isValidObjectId(id)) {
    throw new BadRequest("Valid lecture ID is required");
  }

  // Fields that can be updated
  const allowedUpdates = [
    "sub_name",
    "level",
    "department",
    "num_of_week",
    "title",
    "iconBase64",
  ];

  const updates = req.body;

  // Filter out fields that shouldn't be updated directly
  const filteredUpdates: Record<string, any> = {};

  for (const key of Object.keys(updates)) {
    if (allowedUpdates.includes(key) && key !== "iconBase64") {
      filteredUpdates[key] = updates[key];
    }
  }

  // Validate level and department if provided
  if (filteredUpdates.level && !isValidObjectId(filteredUpdates.level)) {
    throw new BadRequest("Invalid level ID format");
  }

  if (filteredUpdates.department && !isValidObjectId(filteredUpdates.department)) {
    throw new BadRequest("Invalid department ID format");
  }

  // Validate num_of_week if provided
  if (filteredUpdates.num_of_week !== undefined) {
    const weekNum = Number(filteredUpdates.num_of_week);
    if (isNaN(weekNum) || weekNum < 1 || weekNum > 20) {
      throw new BadRequest("num_of_week must be a number between 1 and 20");
    }
    filteredUpdates.num_of_week = weekNum;
  }

  // Handle icon update
  if (updates.iconBase64) {
    if (!updates.iconBase64.startsWith("data:image")) {
      throw new BadRequest("Invalid image format");
    }

    try {
      filteredUpdates.icon = await saveBase64Image(
        updates.iconBase64,
        "damanhour/lectures/icons",
        `lecture_${Date.now()}`
      );
    } catch (error) {
      throw new BadRequest("Failed to upload icon image");
    }
  }

  const lecture = await LectureModel.findByIdAndUpdate(
    id,
    { $set: filteredUpdates },
    { new: true, runValidators: true }
  ).populate(["level", "department"]);

  if (!lecture) {
    throw new NotFound("Lecture not found");
  }

  return SuccessResponse(res, {
    message: "Lecture updated successfully",
    lecture,
  });
};

// ----------------------------------------------------------
// DELETE LECTURE
// ----------------------------------------------------------
export const deleteLecture = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || !isValidObjectId(id)) {
    throw new BadRequest("Valid lecture ID is required");
  }

  const lecture = await LectureModel.findById(id);

  if (!lecture) {
    throw new NotFound("Lecture not found");
  }

  // Optional: Delete associated files from Cloudinary
  // try {
  //   if (lecture.icon) await deleteFromCloudinary(lecture.icon);
  //   if (lecture.video?.url) await deleteFromCloudinary(lecture.video.url);
  //   for (const pdf of lecture.pdfs) {
  //     await deleteFromCloudinary(pdf.url);
  //   }
  // } catch (error) {
  //   console.error("Error deleting files from Cloudinary:", error);
  // }

  await LectureModel.findByIdAndDelete(id);

  return SuccessResponse(res, {
    message: "Lecture deleted successfully",
    deletedId: id,
  });
};

// ----------------------------------------------------------
// DELETE SPECIFIC PDF FROM LECTURE
// ----------------------------------------------------------
export const deleteLecturePDF = async (req: Request, res: Response) => {
  const { id, pdfId } = req.params;

  if (!id || !isValidObjectId(id)) {
    throw new BadRequest("Valid lecture ID is required");
  }

  if (!pdfId || !isValidObjectId(pdfId)) {
    throw new BadRequest("Valid PDF ID is required");
  }

  const lecture = await LectureModel.findById(id);

  if (!lecture) {
    throw new NotFound("Lecture not found");
  }

  const pdfIndex = lecture.pdfs.findIndex(
    (pdf: any) => pdf._id.toString() === pdfId
  );

  if (pdfIndex === -1) {
    throw new NotFound("PDF not found in this lecture");
  }

  // Remove PDF from array
  lecture.pdfs.splice(pdfIndex, 1);
  await lecture.save();

  return SuccessResponse(res, {
    message: "PDF deleted successfully",
    lecture,
  });
};

// ----------------------------------------------------------
// DELETE VIDEO FROM LECTURE
// ----------------------------------------------------------
export const deleteLectureVideo = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || !isValidObjectId(id)) {
    throw new BadRequest("Valid lecture ID is required");
  }

  const lecture = await LectureModel.findById(id);

  if (!lecture) {
    throw new NotFound("Lecture not found");
  }

  if (!lecture.video?.url) {
    throw new NotFound("No video found for this lecture");
  }

  // Reset video to default values
  lecture.video = {
    name: null,
    url: null,
    duration: 0,
    quality: "720p",
    uploadDate: new Date(),
  };

  await lecture.save();

  return SuccessResponse(res, {
    message: "Video deleted successfully",
    lecture,
  });
};
