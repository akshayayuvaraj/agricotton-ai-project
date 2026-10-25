import mongoose, { Schema } from "mongoose";
import type { CottonIssue } from "../types/cottonIssue.js";

const CottonIssueSchema = new Schema<CottonIssue>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    scientificName: { type: String, default: null },
    category: {
      type: String,
      enum: ["disease", "pest", "crop_disorder"],
      required: true,
      index: true,
    },
    severity: {
      level: { type: String, enum: ["unverified"], required: true },
      explanation: { type: String, required: true },
    },
    commonSymptoms: { type: [String], required: true },
    identificationTips: { type: [String], required: true },
    favorableConditions: { type: String, required: true },
    cropStagesAffected: { type: [String], required: true },
    prevention: { type: [String], required: true },
    integratedManagement: { type: [String], required: true },
    monitoringGuidance: { type: [String], required: true },
    regionRelevance: {
      region: { type: String, required: true },
      status: { type: String, enum: ["verified", "unverified"], required: true },
      note: { type: String, required: true },
    },
    referenceSources: [
      {
        title: { type: String, required: true },
        url: { type: String, required: true },
        notes: { type: String, required: true },
      },
    ],
    lastReviewed: { type: String, required: true },
  },
  { versionKey: false },
);

export const CottonIssueModel =
  mongoose.models.CottonIssue ??
  mongoose.model<CottonIssue>("CottonIssue", CottonIssueSchema);
