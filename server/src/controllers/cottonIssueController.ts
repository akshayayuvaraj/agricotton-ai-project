import type { Request, Response } from "express";
import mongoose from "mongoose";
import { cottonIssueCounts } from "../data/cottonIssues.js";
import { memoryDb } from "../data/store.js";
import { CottonIssueModel } from "../models/CottonIssue.js";
import type {
  CottonIssue,
  CottonIssueCategory,
} from "../types/cottonIssue.js";

const categories: CottonIssueCategory[] = [
  "disease",
  "pest",
  "crop_disorder",
];
const severityLevels = ["unverified"];

const readCatalog = async (): Promise<CottonIssue[]> => {
  if (mongoose.connection.readyState === 1) {
    return CottonIssueModel.find({}).sort({ id: 1 }).lean<CottonIssue[]>();
  }
  return memoryDb.cottonIssues;
};

const includesSearchText = (issue: CottonIssue, search: string) => {
  const text = [
    issue.name,
    issue.scientificName ?? "",
    ...issue.commonSymptoms,
    ...issue.identificationTips,
  ]
    .join(" ")
    .toLocaleLowerCase();
  return text.includes(search.toLocaleLowerCase());
};

export const listCottonIssues = async (req: Request, res: Response) => {
  const category =
    typeof req.query.category === "string" ? req.query.category : undefined;
  const severity =
    typeof req.query.severity === "string" ? req.query.severity : undefined;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";

  if (category && category !== "all" && !categories.includes(category as CottonIssueCategory)) {
    return res.status(400).json({ message: "Invalid cotton issue category." });
  }
  if (severity && severity !== "all" && !severityLevels.includes(severity)) {
    return res.status(400).json({ message: "Invalid severity filter." });
  }

  const catalog = await readCatalog();
  const issues = catalog.filter(
    (issue) =>
      (!category || category === "all" || issue.category === category) &&
      (!severity || severity === "all" || issue.severity.level === severity) &&
      (!search || includesSearchText(issue, search)),
  );

  return res.json({
    issues,
    total: issues.length,
    counts: cottonIssueCounts(catalog),
  });
};

export const getCottonIssue = async (req: Request, res: Response) => {
  const issue =
    mongoose.connection.readyState === 1
      ? await CottonIssueModel.findOne({ id: req.params.id }).lean<CottonIssue | null>()
      : memoryDb.cottonIssues.find((entry) => entry.id === req.params.id);

  if (!issue) {
    return res.status(404).json({ message: "Cotton issue not found." });
  }
  return res.json({ issue });
};
