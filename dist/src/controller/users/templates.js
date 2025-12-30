"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchTemplates = exports.getTemplateById = exports.getTemplates = void 0;
const templates_1 = require("../../models/shema/templates");
const Errors_1 = require("../../Errors");
const Errors_2 = require("../../Errors");
const response_1 = require("../../utils/response");
const BadRequest_1 = require("../../Errors/BadRequest");
const getTemplates = async (req, res) => {
    if (!req.user)
        throw new Errors_2.UnauthorizedError("Authentication required");
    const templates = await templates_1.TemplateModel.find();
    return (0, response_1.SuccessResponse)(res, { templates });
};
exports.getTemplates = getTemplates;
const getTemplateById = async (req, res) => {
    if (!req.user)
        throw new Errors_2.UnauthorizedError("Authentication required");
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Template Id is required");
    const template = await templates_1.TemplateModel.findById(id);
    if (!template)
        throw new Errors_1.NotFound("Template not found");
    return (0, response_1.SuccessResponse)(res, { template });
};
exports.getTemplateById = getTemplateById;
const searchTemplates = async (req, res) => {
    if (!req.user)
        throw new Errors_2.UnauthorizedError("Authentication required");
    const { q, category } = req.query;
    if (!q)
        throw new BadRequest_1.BadRequest("Please enter a search term");
    // Build query
    const query = {
        $or: [
            { title: { $regex: q, $options: "i" } },
            { content: { $regex: q, $options: "i" } },
            { companyname: { $regex: q, $options: "i" } },
            { location: { $regex: q, $options: "i" } }
        ]
    };
    // Filter by category if provided
    if (category) {
        query.category = category;
    }
    const templates = await templates_1.TemplateModel.find(query);
    if (templates.length === 0) {
        throw new Errors_1.NotFound("No templates found");
    }
    return (0, response_1.SuccessResponse)(res, { templates });
};
exports.searchTemplates = searchTemplates;
