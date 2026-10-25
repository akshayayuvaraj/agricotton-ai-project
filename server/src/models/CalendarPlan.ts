import mongoose, { Schema } from "mongoose";
import type { CalendarPlan } from "../types/calendar.js";

const CalendarPlanSchema = new Schema<CalendarPlan>(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    fieldId: { type: String, required: true, index: true },
    sowingDate: { type: String, required: true },
    tasks: [
      {
        id: { type: String, required: true },
        title: { type: String, required: true },
        stage: { type: String, required: true },
        description: { type: String, required: true },
        dasStart: { type: Number, required: true },
        dasEnd: { type: Number, required: true },
        startDate: { type: String, required: true },
        endDate: { type: String, required: true },
        completed: { type: Boolean, required: true },
      },
    ],
    createdAt: { type: String, required: true },
    updatedAt: { type: String, required: true },
  },
  { versionKey: false },
);

CalendarPlanSchema.index({ userId: 1, fieldId: 1 }, { unique: true });

export const CalendarPlanModel =
  mongoose.models.CalendarPlan ??
  mongoose.model<CalendarPlan>("CalendarPlan", CalendarPlanSchema);
