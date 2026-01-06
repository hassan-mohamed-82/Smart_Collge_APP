import mongoose, { Schema } from 'mongoose';
import { title } from 'process';

export const TemplateSchema = new Schema({

    title: { type: String, required: true },
    content: { type: String, required: true },
    category: { type: String, enum: ['Training', 'Diploma', 'Masters','Doctorate'], required: true },
    startdate: { type: Date, default: Date.now },
    enddate: { type: Date },
    Image: { type: String },
    location: { type: String },
    companyname: { type: String },
    IsActive: { type: Boolean, default: true },




});

export const TemplateModel = mongoose.model('Template', TemplateSchema);