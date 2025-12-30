"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteLectureVideo = exports.deleteLecturePDF = exports.deleteLecture = exports.updateLecture = exports.getLectureById = exports.getLectures = exports.uploadLectureVideo = exports.uploadLecturePDF = exports.createLecture = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const lecture_1 = require("../../models/shema/lecture");
const handleImages_1 = require("../../utils/handleImages");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
// Helper function to validate ObjectId
const isValidObjectId = (id) => {
    return mongoose_1.default.Types.ObjectId.isValid(id);
};
// ----------------------------------------------------------
// CREATE LECTURE
// ----------------------------------------------------------
const createLecture = async (req, res) => {
    const { sub_name, level, department, num_of_week, title, iconBase64 } = req.body;
    // Validate required fields
    if (!sub_name || !title || !num_of_week) {
        throw new BadRequest_1.BadRequest("Required fields are missing: sub_name, title, num_of_week");
    }
    // Validate level and department are valid ObjectIds
    if (level && !isValidObjectId(level)) {
        throw new BadRequest_1.BadRequest("Invalid level ID format");
    }
    if (department && !isValidObjectId(department)) {
        throw new BadRequest_1.BadRequest("Invalid department ID format");
    }
    // Validate num_of_week
    const weekNum = Number(num_of_week);
    if (isNaN(weekNum) || weekNum < 1 || weekNum > 20) {
        throw new BadRequest_1.BadRequest("num_of_week must be a number between 1 and 20");
    }
    let iconUrl;
    // Handle base64 image upload
    if (iconBase64) {
        if (!iconBase64.startsWith("data:image")) {
            throw new BadRequest_1.BadRequest("Invalid image format. Must be a base64 image string");
        }
        try {
            iconUrl = await (0, handleImages_1.saveBase64Image)(iconBase64, "damanhour/lectures/icons", `lecture_${Date.now()}`);
        }
        catch (error) {
            throw new BadRequest_1.BadRequest("Failed to upload icon image");
        }
    }
    const lecture = await lecture_1.LectureModel.create({
        sub_name: sub_name.trim(),
        level,
        department,
        num_of_week: weekNum,
        title: title.trim(),
        icon: iconUrl,
    });
    // Populate level and department for response
    await lecture.populate(["level", "department"]);
    return (0, response_1.SuccessResponse)(res, lecture, 201);
};
exports.createLecture = createLecture;
// ----------------------------------------------------------
// UPLOAD LECTURE PDF
// ----------------------------------------------------------
const uploadLecturePDF = async (req, res) => {
    const { id } = req.params;
    if (!id || !isValidObjectId(id)) {
        throw new BadRequest_1.BadRequest("Valid lecture ID is required");
    }
    const lecture = await lecture_1.LectureModel.findById(id);
    if (!lecture) {
        throw new Errors_1.NotFound("Lecture not found");
    }
    const files = req.files;
    if (!files || files.length === 0) {
        throw new BadRequest_1.BadRequest("No PDF files uploaded");
    }
    // Validate file types
    const invalidFiles = files.filter((file) => file.mimetype !== "application/pdf");
    if (invalidFiles.length > 0) {
        throw new BadRequest_1.BadRequest("Only PDF files are allowed");
    }
    const uploadedPDFs = [];
    for (const file of files) {
        try {
            const pdfUrl = await (0, handleImages_1.uploadFileToCloudinary)(file.path, "damanhour/lectures/pdfs", "auto");
            uploadedPDFs.push({
                name: file.originalname,
                url: pdfUrl,
                uploadDate: new Date(),
            });
        }
        catch (error) {
            // Continue with other files if one fails
            console.error(`Failed to upload ${file.originalname}:`, error);
        }
    }
    if (uploadedPDFs.length === 0) {
        throw new BadRequest_1.BadRequest("Failed to upload any PDF files");
    }
    // Push all uploaded PDFs
    lecture.pdfs.push(...uploadedPDFs);
    await lecture.save();
    return (0, response_1.SuccessResponse)(res, {
        message: `${uploadedPDFs.length} PDF(s) uploaded successfully`,
        lecture,
    });
};
exports.uploadLecturePDF = uploadLecturePDF;
// ----------------------------------------------------------
// UPLOAD LECTURE VIDEO
// ----------------------------------------------------------
const uploadLectureVideo = async (req, res) => {
    const { id } = req.params;
    if (!id || !isValidObjectId(id)) {
        throw new BadRequest_1.BadRequest("Valid lecture ID is required");
    }
    const lecture = await lecture_1.LectureModel.findById(id);
    if (!lecture) {
        throw new Errors_1.NotFound("Lecture not found");
    }
    if (!req.file) {
        throw new BadRequest_1.BadRequest("No video file uploaded");
    }
    // Validate video file type
    const allowedVideoTypes = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    if (!allowedVideoTypes.includes(req.file.mimetype)) {
        throw new BadRequest_1.BadRequest("Invalid video format. Allowed: mp4, webm, ogg, mov");
    }
    try {
        const videoUrl = await (0, handleImages_1.uploadFileToCloudinary)(req.file.path, "damanhour/lectures/videos", "video");
        // Get quality from request body or default to 720p
        const quality = req.body.quality || "720p";
        const validQualities = ["360p", "480p", "720p", "1080p", "4K"];
        if (!validQualities.includes(quality)) {
            throw new BadRequest_1.BadRequest(`Invalid quality. Allowed: ${validQualities.join(", ")}`);
        }
        lecture.video = {
            name: req.file.originalname,
            url: videoUrl,
            duration: req.body.duration ? Number(req.body.duration) : 0,
            quality: quality,
            uploadDate: new Date(),
        };
        await lecture.save();
        return (0, response_1.SuccessResponse)(res, {
            message: "Video uploaded successfully",
            lecture,
        });
    }
    catch (error) {
        throw new BadRequest_1.BadRequest("Failed to upload video");
    }
};
exports.uploadLectureVideo = uploadLectureVideo;
// ----------------------------------------------------------
// GET ALL LECTURES (with filtering & pagination)
// ----------------------------------------------------------
const getLectures = async (req, res) => {
    const { level, department, page = "1", limit = "10", search, } = req.query;
    // Build query object
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
    // Search by title or sub_name
    if (search) {
        query.$or = [
            { title: { $regex: search, $options: "i" } },
            { sub_name: { $regex: search, $options: "i" } },
        ];
    }
    // Pagination
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;
    const [lectures, total] = await Promise.all([
        lecture_1.LectureModel.find(query)
            .populate("level", "name") // Populate with specific fields
            .populate("department", "name")
            .skip(skip)
            .limit(limitNum)
            .sort({ createdAt: -1 }),
        lecture_1.LectureModel.countDocuments(query),
    ]);
    return (0, response_1.SuccessResponse)(res, {
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
exports.getLectures = getLectures;
// ----------------------------------------------------------
// GET LECTURE BY ID
// ----------------------------------------------------------
const getLectureById = async (req, res) => {
    const { id } = req.params;
    if (!id || !isValidObjectId(id)) {
        throw new BadRequest_1.BadRequest("Valid lecture ID is required");
    }
    const lecture = await lecture_1.LectureModel.findById(id)
        .populate("level")
        .populate("department");
    if (!lecture) {
        throw new Errors_1.NotFound("Lecture not found");
    }
    return (0, response_1.SuccessResponse)(res, lecture);
};
exports.getLectureById = getLectureById;
// ----------------------------------------------------------
// UPDATE LECTURE
// ----------------------------------------------------------
const updateLecture = async (req, res) => {
    const { id } = req.params;
    if (!id || !isValidObjectId(id)) {
        throw new BadRequest_1.BadRequest("Valid lecture ID is required");
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
    const filteredUpdates = {};
    for (const key of Object.keys(updates)) {
        if (allowedUpdates.includes(key) && key !== "iconBase64") {
            filteredUpdates[key] = updates[key];
        }
    }
    // Validate level and department if provided
    if (filteredUpdates.level && !isValidObjectId(filteredUpdates.level)) {
        throw new BadRequest_1.BadRequest("Invalid level ID format");
    }
    if (filteredUpdates.department && !isValidObjectId(filteredUpdates.department)) {
        throw new BadRequest_1.BadRequest("Invalid department ID format");
    }
    // Validate num_of_week if provided
    if (filteredUpdates.num_of_week !== undefined) {
        const weekNum = Number(filteredUpdates.num_of_week);
        if (isNaN(weekNum) || weekNum < 1 || weekNum > 20) {
            throw new BadRequest_1.BadRequest("num_of_week must be a number between 1 and 20");
        }
        filteredUpdates.num_of_week = weekNum;
    }
    // Handle icon update
    if (updates.iconBase64) {
        if (!updates.iconBase64.startsWith("data:image")) {
            throw new BadRequest_1.BadRequest("Invalid image format");
        }
        try {
            filteredUpdates.icon = await (0, handleImages_1.saveBase64Image)(updates.iconBase64, "damanhour/lectures/icons", `lecture_${Date.now()}`);
        }
        catch (error) {
            throw new BadRequest_1.BadRequest("Failed to upload icon image");
        }
    }
    const lecture = await lecture_1.LectureModel.findByIdAndUpdate(id, { $set: filteredUpdates }, { new: true, runValidators: true }).populate(["level", "department"]);
    if (!lecture) {
        throw new Errors_1.NotFound("Lecture not found");
    }
    return (0, response_1.SuccessResponse)(res, {
        message: "Lecture updated successfully",
        lecture,
    });
};
exports.updateLecture = updateLecture;
// ----------------------------------------------------------
// DELETE LECTURE
// ----------------------------------------------------------
const deleteLecture = async (req, res) => {
    const { id } = req.params;
    if (!id || !isValidObjectId(id)) {
        throw new BadRequest_1.BadRequest("Valid lecture ID is required");
    }
    const lecture = await lecture_1.LectureModel.findById(id);
    if (!lecture) {
        throw new Errors_1.NotFound("Lecture not found");
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
    await lecture_1.LectureModel.findByIdAndDelete(id);
    return (0, response_1.SuccessResponse)(res, {
        message: "Lecture deleted successfully",
        deletedId: id,
    });
};
exports.deleteLecture = deleteLecture;
// ----------------------------------------------------------
// DELETE SPECIFIC PDF FROM LECTURE
// ----------------------------------------------------------
const deleteLecturePDF = async (req, res) => {
    const { id, pdfId } = req.params;
    if (!id || !isValidObjectId(id)) {
        throw new BadRequest_1.BadRequest("Valid lecture ID is required");
    }
    if (!pdfId || !isValidObjectId(pdfId)) {
        throw new BadRequest_1.BadRequest("Valid PDF ID is required");
    }
    const lecture = await lecture_1.LectureModel.findById(id);
    if (!lecture) {
        throw new Errors_1.NotFound("Lecture not found");
    }
    const pdfIndex = lecture.pdfs.findIndex((pdf) => pdf._id.toString() === pdfId);
    if (pdfIndex === -1) {
        throw new Errors_1.NotFound("PDF not found in this lecture");
    }
    // Remove PDF from array
    lecture.pdfs.splice(pdfIndex, 1);
    await lecture.save();
    return (0, response_1.SuccessResponse)(res, {
        message: "PDF deleted successfully",
        lecture,
    });
};
exports.deleteLecturePDF = deleteLecturePDF;
// ----------------------------------------------------------
// DELETE VIDEO FROM LECTURE
// ----------------------------------------------------------
const deleteLectureVideo = async (req, res) => {
    const { id } = req.params;
    if (!id || !isValidObjectId(id)) {
        throw new BadRequest_1.BadRequest("Valid lecture ID is required");
    }
    const lecture = await lecture_1.LectureModel.findById(id);
    if (!lecture) {
        throw new Errors_1.NotFound("Lecture not found");
    }
    if (!lecture.video?.url) {
        throw new Errors_1.NotFound("No video found for this lecture");
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
    return (0, response_1.SuccessResponse)(res, {
        message: "Video deleted successfully",
        lecture,
    });
};
exports.deleteLectureVideo = deleteLectureVideo;
