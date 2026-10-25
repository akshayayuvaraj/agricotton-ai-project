import { randomUUID } from "crypto";
import type { Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";
import { memoryDb } from "../data/store.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { CalendarPlanModel } from "../models/CalendarPlan.js";
import type { CalendarPlan } from "../types/calendar.js";

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, "Use a valid calendar date.");

const taskSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  stage: z.string().min(1),
  description: z.string(),
  dasStart: z.number().int(),
  dasEnd: z.number().int(),
  startDate: dateSchema,
  endDate: dateSchema,
  completed: z.boolean(),
}).refine((task) => task.dasStart <= task.dasEnd, "Task DAS start must not exceed its end.");

const planSchema = z.object({
  fieldId: z.string().uuid(),
  sowingDate: dateSchema,
  tasks: z.array(taskSchema).min(1).max(50),
});

const dateAtDas = (sowingDate: string, das: number) => {
  const date = new Date(`${sowingDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + das);
  return date.toISOString().slice(0, 10);
};

export const getCalendarPlan = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user!.id;
  const fieldId = req.query.fieldId;
  if (typeof fieldId !== "string" || !fieldId) {
    return res.status(400).json({ message: "A fieldId is required." });
  }
  if (!memoryDb.fields.some((field) => field.id === fieldId && field.userId === userId)) {
    return res.status(404).json({ message: "Field not found for the authenticated user." });
  }

  const plan =
    mongoose.connection.readyState === 1
      ? await CalendarPlanModel.findOne({ userId, fieldId }).lean<CalendarPlan | null>()
      : memoryDb.calendarPlans.find((entry) => entry.userId === userId && entry.fieldId === fieldId) ?? null;
  return res.json({ plan });
};

export const saveCalendarPlan = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = planSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Calendar plan is invalid.",
      errors: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
  const userId = req.user!.id;
  const { fieldId, sowingDate, tasks } = parsed.data;
  if (new Set(tasks.map((task) => task.id)).size !== tasks.length) {
    return res.status(400).json({ message: "Calendar task IDs must be unique." });
  }
  const datesMatchDas = tasks.every(
    (task) =>
      task.startDate === dateAtDas(sowingDate, task.dasStart) &&
      task.endDate === dateAtDas(sowingDate, task.dasEnd),
  );
  if (!datesMatchDas) {
    return res.status(400).json({
      message: "Calendar dates must match the sowing date and task DAS ranges.",
    });
  }
  const field = memoryDb.fields.find((entry) => entry.id === fieldId && entry.userId === userId);
  if (!field) {
    return res.status(404).json({ message: "Field not found for the authenticated user." });
  }

  const now = new Date().toISOString();
  const existing =
    mongoose.connection.readyState === 1
      ? await CalendarPlanModel.findOne({ userId, fieldId }).lean<CalendarPlan | null>()
      : memoryDb.calendarPlans.find((entry) => entry.userId === userId && entry.fieldId === fieldId);
  const plan: CalendarPlan = {
    id: existing?.id ?? randomUUID(),
    userId,
    fieldId,
    sowingDate,
    tasks,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  if (mongoose.connection.readyState === 1) {
    await CalendarPlanModel.findOneAndUpdate(
      { userId, fieldId },
      { $set: plan },
      { upsert: true, new: true, runValidators: true },
    );
  } else if (existing) {
    Object.assign(existing, plan);
  } else {
    memoryDb.calendarPlans.push(plan);
  }
  return res.json({ plan });
};
