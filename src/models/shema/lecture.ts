import mongoose, { Schema, Document, Types } from "mongoose";

// TypeScript Interfaces
export interface IPDF {
  name: string;
  url: string;
  uploadDate?: Date;
}

export interface IVideo {
  name: string | null;
  url: string | null;
  duration: number;
  quality: '360p' | '480p' | '720p' | '1080p' | '4K';
  uploadDate?: Date;
}

export interface ILecture extends Document {
  sub_name: string;
  level: Types.ObjectId;
  department: Types.ObjectId;
  icon?: string;
  num_of_week: number;
  title: string;
  pdfs: IPDF[];
  video: IVideo;
  createdAt: Date;
  updatedAt: Date;
}

const LectureSchema = new Schema<ILecture>(
  {
    sub_name: {
      type: String,
      required: [true, "Subject name is required"],
      trim: true,
    },

    level: {
      type: Schema.Types.ObjectId,
      ref: "Level", // Capital L for consistency
      required: [true, "Level is required"],
    },

    department: {
      type: Schema.Types.ObjectId,
      ref: "Department", // Capital D for consistency
      required: [true, "Department is required"],
    },

    icon: {
      type: String,
      default: null,
    },

    num_of_week: {
      type: Number,
      required: [true, "Week number is required"],
      min: [1, "Week number must be at least 1"],
      max: [20, "Week number cannot exceed 20"],
    },

    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
    },

    pdfs: [
      {
        name: {
          type: String,
          required: true,
        },
        url: {
          type: String,
          required: true,
        },
        uploadDate: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    video: {
      name: {
        type: String,
        default: null,
      },
      url: {
        type: String,
        default: null,
      },
      duration: {
        type: Number,
        default: 0,
      },
      quality: {
        type: String,
        enum: ["360p", "480p", "720p", "1080p", "4K"],
        default: "720p",
      },
      uploadDate: {
        type: Date,
        default: Date.now,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Add indexes for faster queries
LectureSchema.index({ level: 1, department: 1 });
LectureSchema.index({ sub_name: 1 });

export const LectureModel = mongoose.model<ILecture>("Lecture", LectureSchema);
