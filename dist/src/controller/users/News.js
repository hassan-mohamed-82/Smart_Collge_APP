"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchNews = exports.getNewsById = exports.getallNews = void 0;
const News_1 = require("../../models/shema/News");
const BadRequest_1 = require("../../Errors/BadRequest");
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const Errors_2 = require("../../Errors");
const getallNews = async (req, res) => {
    if (!req.user)
        throw new Errors_2.UnauthorizedError("Not authorized to access this route");
    const news = await News_1.NewsModel.find();
    if (!news)
        throw new Errors_1.NotFound("No news found");
    (0, response_1.SuccessResponse)(res, news);
};
exports.getallNews = getallNews;
const getNewsById = async (req, res) => {
    if (!req.user)
        throw new Errors_2.UnauthorizedError("Not authorized to access this route");
    const id = req.params.id;
    if (!id)
        throw new BadRequest_1.BadRequest("Id is required");
    const news = await News_1.NewsModel.findById(id);
    if (!news)
        throw new Errors_1.NotFound("No news found");
    (0, response_1.SuccessResponse)(res, news);
};
exports.getNewsById = getNewsById;
const searchNews = async (req, res) => {
    if (!req.user)
        throw new Errors_2.UnauthorizedError("Not authorized to access this route");
    const { q } = req.query;
    if (!q)
        throw new BadRequest_1.BadRequest("Please enter a search term");
    const news = await News_1.NewsModel.find({
        $or: [
            { title: { $regex: q, $options: "i" } },
            { content: { $regex: q, $options: "i" } }
        ]
    });
    if (news.length === 0)
        throw new Errors_1.NotFound("No news found");
    (0, response_1.SuccessResponse)(res, news);
};
exports.searchNews = searchNews;
