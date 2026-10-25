import type { Response } from "express";
import { randomUUID } from "crypto";
import { memoryDb } from "../data/store.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import {
  calculatePolygonArea,
  type GeoPolygon,
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

  // Phase 1: validate geometry. Anything thrown here is the caller's fault.
  let zone;
  try {
    const zonePolygon = validatePolygonGeometry(polygon);
    validateZoneInsideField(zonePolygon, field.boundary);
    if (
      memoryDb.zones.some(
        (existing) =>
          existing.fieldId === fieldId &&
          zonesOverlap(existing.polygon, zonePolygon),
      )
    ) {
      return res
        .status(400)
        .json({ message: "Zone overlaps an existing zone in this field." });
    }
    const area = calculatePolygonArea(zonePolygon);
    zone = {
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
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid zone geometry.";
    return res.status(400).json({ message });
  }

  // Phase 2: persist. A failure here is a server/database problem (500), never
  // reported as success and never mistaken for a validation error.
  try {
    if (mongoIsReady()) await saveDomainRecord("zones", zone);
    memoryDb.zones.push(zone);
    return res.status(201).json({ zone });
  } catch (error) {
    console.error("Unable to persist management zone.", error);
    return res.status(500).json({ message: "Unable to save the zone right now." });
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

  let createdZones;
  try {
    const names = new Set<string>();
    createdZones = requestedZones.map(
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
      (sum: number, zone: { polygon: GeoPolygon }) =>
        sum + calculatePolygonArea(zone.polygon).hectares,
      0,
    );
    const difference = Math.abs(fieldArea - totalArea);
    const tolerance = Math.max(0.0001, fieldArea * 0.005);
    if (difference > tolerance) {
      throw new Error(
        `Generated zones differ from field coverage by ${difference.toFixed(4)} ha; allowed tolerance is ${tolerance.toFixed(4)} ha.`,
      );
    }
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Generated zone geometry is invalid.";
    return res.status(400).json({ message });
  }

  try {
    if (mongoIsReady()) {
      await insertDomainRecords("zones", createdZones);
    }
    memoryDb.zones.push(...createdZones);
    return res.status(201).json({ zones: createdZones });
  } catch (error) {
    console.error("Unable to persist generated management zones.", error);
    return res
      .status(500)
      .json({ message: "Unable to save generated zones right now." });
  }
};

export const updateZone = async (req: AuthenticatedRequest, res: Response) => {
  const zone = memoryDb.zones.find(
    (entry) => entry.id === req.params.id && entry.userId === req.user?.id,
  );
  if (!zone) {
    return res.status(404).json({ message: "Zone not found." });
  }

  const { name, color, polygon: requestedPolygon, notes } = req.body;
  if (
    name !== undefined &&
    (typeof name !== "string" || name.trim().length === 0)
  ) {
    return res.status(400).json({ message: "Zone name cannot be empty." });
  }

  // Build the complete updated record first. Nothing in memory changes until
  // the database write (when configured) has succeeded.
  let updatedZone;
  try {
    let polygon = zone.polygon;
    let areaHectares = zone.areaHectares;
    let areaAcres = zone.areaAcres;
    if (requestedPolygon) {
      polygon = validatePolygonGeometry(requestedPolygon);
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
      const area = calculatePolygonArea(polygon);
      areaHectares = Number(area.hectares.toFixed(2));
      areaAcres = Number(area.acres.toFixed(2));
    }
    updatedZone = {
      ...zone,
      polygon,
      areaHectares,
      areaAcres,
      ...(name !== undefined ? { name: name.trim() } : {}),
      ...(color !== undefined ? { color } : {}),
      ...(notes !== undefined ? { notes } : {}),
      updatedAt: new Date().toISOString(),
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid zone geometry.";
    return res.status(400).json({ message });
  }

  try {
    if (mongoIsReady()) await saveDomainRecord("zones", updatedZone);
    Object.assign(zone, updatedZone);
    return res.json({ zone });
  } catch (error) {
    console.error("Unable to persist management zone update.", error);
    return res
      .status(500)
      .json({ message: "Unable to update the zone right now." });
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
