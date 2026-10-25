import { z } from "zod";

const uuid = z.string().uuid("Must be a valid record ID.");
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date in YYYY-MM-DD format.")
  .refine((value) => {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(parsed.valueOf()) &&
      parsed.toISOString().slice(0, 10) === value
    );
  }, "Use a valid calendar date.");

const coordinate = z.tuple([
  z
    .number()
    .finite()
    .min(-180, "Longitude must be between -180 and 180.")
    .max(180, "Longitude must be between -180 and 180."),
  z
    .number()
    .finite()
    .min(-90, "Latitude must be between -90 and 90.")
    .max(90, "Latitude must be between -90 and 90."),
]);

export const fieldCreateSchema = z.object({
  farmId: uuid,
  name: z.string().trim().min(1, "Field name is required."),
  cropName: z.string().trim().min(1, "Crop name is required."),
  season: z.string().trim().min(1, "Season is required."),
  sowingDate: isoDate.optional(),
  boundary: z.object({
    type: z.literal("Polygon"),
    coordinates: z
      .array(
        z
          .array(coordinate)
          .min(4, "Polygon rings require at least four coordinates."),
      )
      .min(1),
  }),
  irrigationMethod: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const optionalSoilValue = (minimum: number, maximum?: number) =>
  z
    .number()
    .finite()
    .min(minimum)
    .refine(
      (value) => maximum === undefined || value <= maximum,
      maximum === undefined
        ? "Invalid soil value."
        : `Value must be no greater than ${maximum}.`,
    )
    .optional();

export const soilCreateSchema = z.object({
  fieldId: uuid,
  zoneId: uuid.optional(),
  samplingDate: isoDate,
  ph: optionalSoilValue(0, 14),
  electricalConductivity: optionalSoilValue(0),
  organicCarbon: optionalSoilValue(0),
  nitrogen: optionalSoilValue(0),
  phosphorus: optionalSoilValue(0),
  potassium: optionalSoilValue(0),
  recommendations: z.array(z.string().trim().min(1)).optional(),
  notes: z.string().trim().optional(),
});
