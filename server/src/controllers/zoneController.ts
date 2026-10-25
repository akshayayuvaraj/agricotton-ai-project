import type { Response } from "express";
import { randomUUID } from "crypto";
import { memoryDb } from "../data/store.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import {
  calculatePolygonArea,
  validatePolygonGeometry,
  validateZoneInsideField,
  zonesOverlap,
} from "../utils/geo.js";
import {
  insertDomainRecords,
  mongoIsReady,
  removeDomainRecord,
  saveDomainRecord,
} from "../data/mongoStore.js";

export const listZones = (req: AuthenticatedRequest, res: Response) => {
  const zones = memoryDb.zones.filter((zone) => zone.userId === req.user?.id);
  return res.json({ zones });
};

export const getFieldZones = (req: AuthenticatedRequest, res: Response) => {
  const fieldId = req.params.fieldId;
  const zones = memoryDb.zones.filter(
    (zone) => zone.userId === req.user?.id && zone.fieldId === fieldId,
  );
  return res.json({ zones });
};

export const createZone = async (req: AuthenticatedRequest, res: Response) => {
  const { fieldId, name, polygon, notes, color } = req.body;
  const userId = req.user?.id;

  if (!fieldId || !name || !polygon) {
    return res
      .status(400)
      .json({ message: "Field, name, and polygon are required." });
  }

  const field = memoryDb.fields.find(
    (entry) => entry.id === fieldId && entry.userId === userId,
  );
  if (!field) {
    return res.status(404).json({ message: "Field not found." });
  }

  try {
    const zonePolygon = validatePolygonGeometry(polygon);
    validateZoneInsideField(zonePolygon, field.boundary);
    if (
      memoryDb.zones.some(
        (zone) =>
          zone.fieldId === fieldId && zonesOverlap(zone.polygon, zonePolygon),
      )
    ) {
      return res
        .status(400)
        .json({ message: "Zone overlaps an existing zone in this field." });
    }
    const area = calculatePolygonArea(zonePolygon);

    const zone = {
      id: randomUUID(),
      userId: userId ?? "",
      fieldId: String(fieldId),
      name: String(name),
      color: color ? String(color) : "#4AA85A",
      polygon: zonePolygon,
      areaHectares: Number(area.hectares.toFixed(2)),
      areaAcres: Number(area.acres.toFixed(2)),
      notes: notes ? String(notes) : undefined,
      soilSampleIds: [],
      fertilizerPlanIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (mongoIsReady()) await saveDomainRecord("zones", zone);
    memoryDb.zones.push(zone);
    return res.status(201).json({ zone });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid zone geometry.";
    if (mongoIsReady() && !/polygon|zone overlaps|field/i.test(message)) {
      console.error("Unable to persist management zone.", error);
      return res.status(500).json({ message: "Unable to save the zone right now." });
    }
    return res.status(400).json({ message });
  }
};

export const createZonesBatch = async (req: AuthenticatedRequest, res: Response) => {
  const { fieldId, zones: requestedZones } = req.body;
  const userId = req.user?.id;
  if (
    typeof fieldId !== "string" ||
    !Array.isArray(requestedZones) ||
    requestedZones.length < 2 ||
    requestedZones.length > 20
  ) {
    return res.status(400).json({
      message: "Provide a field ID and between 2 and 20 generated zones.",
    });
  }

  const field = memoryDb.fields.find(
    (entry) => entry.id === fieldId && entry.userId === userId,
  );
  if (!field) {
    return res
      .status(404)
      .json({ message: "Field not found for the authenticated user." });
  }
  if (memoryDb.zones.some((zone) => zone.fieldId === fieldId)) {
    return res.status(409).json({
      message:
        "Generated whole-field splits require a field without existing zones. Existing zones were not changed.",
    });
  }

  try {
    const names = new Set<string>();
    const createdZones = requestedZones.map(
      (requested: Record<string, unknown>) => {
        if (
          typeof requested.name !== "string" ||
          !requested.name.trim() ||
          typeof requested.color !== "string" ||
          typeof requested.polygon !== "object" ||
          !requested.polygon
        ) {
          throw new Error(
            "Every generated zone needs a name, color, and polygon.",
          );
        }
        const name = requested.name.trim();
        if (names.has(name))
          throw new Error("Generated zone names must be unique.");
        names.add(name);

        const polygon = validatePolygonGeometry(requested.polygon);
        validateZoneInsideField(polygon, field.boundary);
        const area = calculatePolygonArea(polygon);
        return {
          id: randomUUID(),
          userId: userId!,
          fieldId,
          name,
          color: requested.color,
          polygon,
          areaHectares: Number(area.hectares.toFixed(2)),
          areaAcres: Number(area.acres.toFixed(2)),
          notes:
            typeof requested.notes === "string" ? requested.notes : undefined,
          soilSampleIds: [],
          fertilizerPlanIds: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      },
    );

    for (let first = 0; first < createdZones.length; first += 1) {
      for (let second = first + 1; second < createdZones.length; second += 1) {
        if (
          zonesOverlap(
            createdZones[first].polygon,
            createdZones[second].polygon,
          )
        ) {
          throw new Error(
            `Generated zones ${first + 1} and ${second + 1} overlap.`,
          );
        }
      }
    }
    const fieldArea = calculatePolygonArea(field.boundary).hectares;
    const totalArea = createdZones.reduce(
      (sum, zone) => sum + calculatePolygonArea(zone.polygon).hectares,
      0,
    );
    const difference = Math.abs(fieldArea - totalArea);
    const tolerance = Math.max(0.0001, fieldArea * 0.005);
    if (difference > tolerance) {
      throw new Error(
        `Generated zones differ from field coverage by ${difference.toFixed(4)} ha; allowed tolerance is ${tolerance.toFixed(4)} ha.`,
      );
    }

    if (mongoIsReady()) {
      await insertDomainRecords("zones", createdZones);
    }
    memoryDb.zones.push(...createdZones);
    return res.status(201).json({ zones: createdZones });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Generated zone geometry is invalid.";
    if (mongoIsReady() && !/polygon|zone|coverage|overlap|field|generated/i.test(message)) {
      console.error("Unable to persist generated management zones.", error);
      return res.status(500).json({ message: "Unable to save generated zones right now." });
    }
    return res.status(400).json({ message });
  }
};

export const updateZone = async (req: AuthenticatedRequest, res: Response) => {
  const zone = memoryDb.zones.find(
    (entry) => entry.id === req.params.id && entry.userId === req.user?.id,
  );
  if (!zone) {
    return res.status(404).json({ message: "Zone not found." });
  }

  try {
    const { name, color, polygon: requestedPolygon, notes } = req.body;
    if (requestedPolygon) {
      const polygon = validatePolygonGeometry(requestedPolygon);
      const field = memoryDb.fields.find(
        (entry) => entry.id === zone.fieldId && entry.userId === req.user?.id,
      );
      if (!field) {
        return res
          .status(404)
          .json({ message: "Field for this zone was not found." });
      }
      validateZoneInsideField(polygon, field.boundary);
      if (
        memoryDb.zones.some(
          (other) =>
            other.id !== zone.id &&
            other.fieldId === zone.fieldId &&
            zonesOverlap(other.polygon, polygon),
        )
      ) {
        return res
          .status(400)
          .json({ message: "Zone overlaps an existing zone in this field." });
      }
      zone.polygon = polygon;
      const area = calculatePolygonArea(polygon);
      zone.areaHectares = Number(area.hectares.toFixed(2));
      zone.areaAcres = Number(area.acres.toFixed(2));
    }

    const updatedZone = {
      ...zone,
      ...(name !== undefined ? { name } : {}),
      ...(color !== undefined ? { color } : {}),
      ...(notes !== undefined ? { notes } : {}),
      updatedAt: new Date().toISOString(),
    };
    if (mongoIsReady()) await saveDomainRecord("zones", updatedZone);
    Object.assign(zone, updatedZone);
    return res.json({ zone });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid zone geometry.";
    if (mongoIsReady() && !/polygon|zone overlaps|field/i.test(message)) {
      console.error("Unable to persist management zone update.", error);
      return res.status(500).json({ message: "Unable to update the zone right now." });
    }
    return res.status(400).json({ message });
  }
};

export const deleteZone = async (req: AuthenticatedRequest, res: Response) => {
  const index = memoryDb.zones.findIndex(
    (zone) => zone.id === req.params.id && zone.userId === req.user?.id,
  );
  if (index === -1) {
    return res.status(404).json({ message: "Zone not found." });
  }

  try {
    if (mongoIsReady()) await removeDomainRecord("zones", String(req.params.id));
    memoryDb.zones.splice(index, 1);
  } catch (error) {
    console.error("Unable to delete management zone.", error);
    return res.status(500).json({ message: "Unable to delete the zone right now." });
  }
  return res.json({ message: "Zone deleted successfully." });
};
