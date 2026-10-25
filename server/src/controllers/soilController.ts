import type { Response } from "express";
import { randomUUID } from "crypto";
import { memoryDb } from "../data/store.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { soilCreateSchema } from "../validation/fieldSoil.js";
import { mongoIsReady, removeDomainRecord, saveDomainRecord } from "../data/mongoStore.js";

export const listSoilSamples = (req: AuthenticatedRequest, res: Response) => {
  const soilSamples = memoryDb.soilSamples.filter(
    (sample) => sample.userId === req.user?.id,
  );
  return res.json({ soilSamples });
};

export const createSoilSample = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = soilCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map(({ path, message }) => ({
      field: path.join("."),
      message:
        message === "Required" ? `${path.join(".")} is required.` : message,
    }));
    return res.status(400).json({
      message: errors[0]?.message ?? "Soil sample request is invalid.",
      errors,
    });
  }

  const {
    fieldId,
    zoneId,
    samplingDate,
    ph,
    electricalConductivity,
    organicCarbon,
    nitrogen,
    phosphorus,
    potassium,
    recommendations,
    notes,
  } = parsed.data;
  const field = memoryDb.fields.find(
    (entry) => entry.id === fieldId && entry.userId === req.user?.id,
  );
  if (!field) {
    return res
      .status(404)
      .json({
        message: "Selected field was not found for the authenticated user.",
      });
  }

  if (zoneId) {
    const zone = memoryDb.zones.find(
      (entry) =>
        entry.id === zoneId &&
        entry.userId === req.user?.id &&
        entry.fieldId === fieldId,
    );
    if (!zone) {
      return res
        .status(404)
        .json({
          message: "Selected zone was not found in the selected field.",
        });
    }
  }

  const sample = {
    id: randomUUID(),
    userId: req.user!.id,
    fieldId,
    zoneId,
    samplingDate,
    ph,
    electricalConductivity,
    organicCarbon,
    nitrogen,
    phosphorus,
    potassium,
    recommendations,
    notes,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    if (mongoIsReady()) await saveDomainRecord("soilSamples", sample);
    memoryDb.soilSamples.push(sample);
  } catch (error) {
    console.error("Unable to persist soil sample.", error);
    return res.status(500).json({ message: "Unable to save the soil sample right now." });
  }
  return res.status(201).json({ soilSample: sample });
};

export const deleteSoilSample = async (req: AuthenticatedRequest, res: Response) => {
  const index = memoryDb.soilSamples.findIndex(
    (sample) => sample.id === req.params.id && sample.userId === req.user?.id,
  );
  if (index === -1) {
    return res.status(404).json({ message: "Soil sample not found." });
  }

  try {
    if (mongoIsReady()) await removeDomainRecord("soilSamples", String(req.params.id));
    memoryDb.soilSamples.splice(index, 1);
  } catch (error) {
    console.error("Unable to delete soil sample.", error);
    return res.status(500).json({ message: "Unable to delete the soil sample right now." });
  }
  return res.json({ message: "Soil sample removed." });
};
