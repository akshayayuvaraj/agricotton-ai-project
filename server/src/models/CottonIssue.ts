import mongoose, { Schema } from "mongoose";
import type {
  CottonIssue,
  CottonIssueVerificationFields,
} from "../types/cottonIssue.js";

const verificationFieldSchema = {
  status: {
    type: String,
    enum: ["verified", "partially_verified", "unverified", "not_applicable"],
    required: true,
  },
  sourceIds: { type: [String], required: true },
  note: { type: String, required: true },
};

const CottonIssueSchema = new Schema<CottonIssue>(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, index: true },
    scientificName: { type: String, default: null },
    causalOrganisms: { type: [String], required: true },
    category: {
      type: String,
      enum: ["disease", "pest", "crop_disorder"],
      required: true,
      index: true,
    },
    severity: {
      level: {
        type: String,
        enum: ["low", "moderate", "high", "not_established"],
        required: true,
      },
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
      status: {
        type: String,
        enum: [
          "documented_in_tamil_nadu",
          "not_documented_in_reviewed_sources",
          "not_yet_verified",
        ],
        required: true,
      },
      note: { type: String, required: true },
    },
    referenceSources: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
        publisher: { type: String, required: true },
        url: { type: String, required: true },
        accessedAt: { type: String, required: true },
        notes: { type: String, required: true },
      },
    ],
    verification: {
      scientificName: verificationFieldSchema,
      commonSymptoms: verificationFieldSchema,
      identificationTips: verificationFieldSchema,
      severity: verificationFieldSchema,
      tamilNaduOccurrence: verificationFieldSchema,
      cropStagesAffected: verificationFieldSchema,
      favorableConditions: verificationFieldSchema,
      prevention: verificationFieldSchema,
      integratedManagement: verificationFieldSchema,
      monitoringGuidance: verificationFieldSchema,
      causalOrganisms: verificationFieldSchema,
    } satisfies Record<
      keyof CottonIssueVerificationFields,
      typeof verificationFieldSchema
    >,
    diagnosticNotes: { type: [String], required: true },
    lastReviewed: { type: String, required: true },
  },
  { versionKey: false },
);

export const CottonIssueModel =
  mongoose.models.CottonIssue ??
  mongoose.model<CottonIssue>("CottonIssue", CottonIssueSchema);
