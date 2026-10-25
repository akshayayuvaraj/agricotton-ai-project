import mongoose from "mongoose";
import { cottonIssues } from "./cottonIssues.js";
import { memoryDb } from "./store.js";
import { CottonIssueModel } from "../models/CottonIssue.js";

export const seedCottonIssues = async () => {
  memoryDb.cottonIssues.splice(
    0,
    memoryDb.cottonIssues.length,
    ...cottonIssues.map((issue) => structuredClone(issue)),
  );

  if (mongoose.connection.readyState === 1) {
    await CottonIssueModel.bulkWrite(
      cottonIssues.map((issue) => ({
        updateOne: {
          filter: { id: issue.id },
          update: { $set: issue },
          upsert: true,
        },
      })),
      { ordered: true },
    );
  }

  return cottonIssues.length;
};
