"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTemplateSchema = exports.createTemplateSchema = void 0;
const joi_1 = __importDefault(require("joi"));
exports.createTemplateSchema = joi_1.default.object({
    title: joi_1.default.string().required(),
    content: joi_1.default.string().required(),
    category: joi_1.default.string().valid('Training', 'Diploma', 'Masters', 'Doctorate').required(),
    startdate: joi_1.default.date().default(Date.now).required(),
    enddate: joi_1.default.date(),
    companyname: joi_1.default.string(),
    Image: joi_1.default.string(),
    location: joi_1.default.string().required(),
    IsActive: joi_1.default.boolean().default(true)
});
exports.updateTemplateSchema = joi_1.default.object({
    title: joi_1.default.string(),
    content: joi_1.default.string(),
    category: joi_1.default.string().valid('Training', 'Diploma', ' Masters', 'Doctorate'),
    startdate: joi_1.default.date(),
    enddate: joi_1.default.date(),
    location: joi_1.default.string(),
    IsActive: joi_1.default.boolean(),
    Image: joi_1.default.string(),
    companyname: joi_1.default.string(),
});
