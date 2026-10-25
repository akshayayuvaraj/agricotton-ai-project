import type { Response } from "express";
import { randomUUID } from "crypto";
import { memoryDb, updateTimestamp } from "../data/store.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { calculatePolygonArea, validatePolygonGeometry } from "../utils/geo.js";
import { fieldCreateSchema } from "../validation/fieldSoil.js";
import { mongoIsReady, removeDomainRecord, saveDomainRecord } from "../data/mongoStore.js";

export const listFields = (req: AuthenticatedRequest, res: Response) => {
  const fields = memoryDb.fields.filter(
    (field) => field.userId === req.user?.id,
  );
  return res.json({ fields });
};

export const createField = async (req: AuthenticatedRequest, res: Response) => {
  const parsed = fieldCreateSchema.safeParse(req.body);
  if (!parsed.success) {
    const errors = parsed.error.issues.map(({ path, message }) => ({
      field: path.join("."),
      message:
        message === "Required" ? `${path.join(".")} is required.` : message,
    }));
    return res.status(400).json({
      message: errors[0]?.message ?? "Field request is invalid.",
      errors,
    });
  }

  const {
    farmId,
    name,
    cropName,
    season,
    sowingDate,
    boundary,
    irrigationMethod,
    notes,
  } = parsed.data;
  const userId = req.user?.id;

  const farmExists = memoryDb.farms.some(
    (farm) => farm.id === farmId && farm.userId === userId,
  );
  if (!farmExists) {
    return res
      .status(404)
      .json({
        message: "Selected farm was not found for the authenticated user.",
      });
  }

  try {
    const polygon = validatePolygonGeometry(boundary);
    const area = calculatePolygonArea(polygon);

    const field = {
      id: randomUUID(),
      userId: userId ?? "",
      farmId: String(farmId),
      name: String(name),
      cropName,
      season,
      sowingDate,
      boundary: polygon,
      areaHectares: Number(area.hectares.toFixed(2)),
      areaAcres: Number(area.acres.toFixed(2)),
      irrigationMethod,
      notes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const activity = {
      id: randomUUID(),
      userId: userId ?? "",
      type: "field-created",
      title: "Field created",
      description: `${field.name} was mapped and saved.`,
      createdAt: new Date().toISOString(),
    };
    if (mongoIsReady()) {
      await saveDomainRecord("fields", field);
      await saveDomainRecord("activities", activity);
    }
    memoryDb.fields.push(field);
    memoryDb.activities.push(activity);

    return res.status(201).json({ field });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid field geometry.";
    if (mongoIsReady() && !message.includes("Polygon")) {
      console.error("Unable to persist field.", error);
      return res.status(500).json({ message: "Unable to save the field right now." });
    }
    return res.status(400).json({ message });
  }
};

export const updateField = async (req: AuthenticatedRequest, res: Response) => {
  const field = memoryDb.fields.find(
    (entry) => entry.id === req.params.id && entry.userId === req.user?.id,
  );
  if (!field) {
    return res.status(404).json({ message: "Field not found." });
  }

  try {
    const updatedField = { ...field };
    const {
      farmId,
      name,
      cropName,
      season,
      sowingDate,
      boundary,
      irrigationMethod,
      notes,
    } = req.body;
    if (
      farmId &&
      !memoryDb.farms.some(
        (farm) => farm.id === farmId && farm.userId === req.user?.id,
      )
    ) {
      return res
        .status(404)
        .json({
          message: "Selected farm was not found for the authenticated user.",
        });
    }
    if (boundary) {
      updatedField.boundary = validatePolygonGeometry(boundary);
      const area = calculatePolygonArea(updatedField.boundary);
      updatedField.areaHectares = Number(area.hectares.toFixed(2));
      updatedField.areaAcres = Number(area.acres.toFixed(2));
    }

    Object.assign(updatedField, {
      ...(farmId !== undefined ? { farmId } : {}),
      ...(name !== undefined ? { name } : {}),
      ...(cropName !== undefined ? { cropName } : {}),
      ...(season !== undefined ? { season } : {}),
      ...(sowingDate !== undefined
        ? { sowingDate: sowingDate || undefined }
        : {}),
      ...(irrigationMethod !== undefined ? { irrigationMethod } : {}),
      ...(notes !== undefined ? { notes } : {}),
      updatedAt: new Date().toISOString(),
    });
    if (mongoIsReady()) await saveDomainRecord("fields", updatedField);
    Object.assign(field, updatedField);
    return res.json({ field });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid field geometry.";
    if (mongoIsReady() && !message.includes("Polygon")) {
      console.error("Unable to persist field update.", error);
      return res.status(500).json({ message: "Unable to update the field right now." });
    }
    return res.status(400).json({ message });
  }
};

export const deleteField = async (req: AuthenticatedRequest, res: Response) => {
  const index = memoryDb.fields.findIndex(
    (field) => field.id === req.params.id && field.userId === req.user?.id,
  );
  if (index === -1) {
    return res.status(404).json({ message: "Field not found." });
  }

  try {
    if (mongoIsReady()) await removeDomainRecord("fields", String(req.params.id));
    memoryDb.fields.splice(index, 1);
  } catch (error) {
    console.error("Unable to delete field.", error);
    return res.status(500).json({ message: "Unable to delete the field right now." });
  }
  return res.json({ message: "Field deleted successfully." });
};
