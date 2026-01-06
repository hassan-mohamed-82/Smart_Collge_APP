import Joi from "joi";

export const createTemplateSchema = Joi.object({
    title: Joi.string().required(),
    content: Joi.string().required(),
    category: Joi.string().valid('Training', 'Diploma', 'Masters','Doctorate').required(),
    startdate: Joi.date().default(Date.now).required(),
    enddate: Joi.date(),
    companyname: Joi.string(),
    Image: Joi.string(),
    location: Joi.string().required(),
    IsActive: Joi.boolean().default(true)
    
})

export const updateTemplateSchema = Joi.object({
    title: Joi.string(),
    content: Joi.string(),
    category: Joi.string().valid('Training', 'Diploma', ' Masters','Doctorate'),
    startdate: Joi.date(),
    enddate: Joi.date(),
    location: Joi.string(),
    IsActive: Joi.boolean(),
    Image: Joi.string(),
    companyname: Joi.string(),
})