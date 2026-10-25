import type { Response } from "express";
import { randomUUID } from "crypto";
import { memoryDb } from "../data/store.js";
import type { AuthenticatedRequest } from "../middleware/auth.js";
import { mongoIsReady, removeDomainRecord, saveDomainRecord } from "../data/mongoStore.js";

export const listFarms = (req: AuthenticatedRequest, res: Response) => {
  const farms = memoryDb.farms.filter((farm) => farm.userId === req.user?.id);
  return res.json({ farms });
};

export const createFarm = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const {
    name,
    state,
    district,
    locality,
    coordinates,
    soilType,
    irrigation,
    notes,
  } = req.body;

  if (!name || !state || !district || !locality) {
    return res
      .status(400)
      .json({
        message: "Farm name, state, district, and locality are required.",
      });
  }

  const farm = {
    id: randomUUID(),
    userId: userId ?? "",
    name: String(name),
    state: String(state),
    district: String(district),
    locality: String(locality),
    coordinates: coordinates
      ? { lat: Number(coordinates.lat), lng: Number(coordinates.lng) }
      : undefined,
    soilType: soilType ? String(soilType) : undefined,
    irrigation: irrigation ? String(irrigation) : undefined,
    notes: notes ? String(notes) : undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    if (mongoIsReady()) await saveDomainRecord("farms", farm);
    memoryDb.farms.push(farm);
  } catch (error) {
    console.error("Unable to persist farm.", error);
    return res.status(500).json({ message: "Unable to save farm right now." });
  }
  return res.status(201).json({ farm });
};

export const updateFarm = async (req: AuthenticatedRequest, res: Response) => {
  const farm = memoryDb.farms.find(
    (entry) => entry.id === req.params.id && entry.userId === req.user?.id,
  );
  if (!farm) {
    return res.status(404).json({ message: "Farm not found." });
  }

  const {
    name,
    state,
    district,
    locality,
    coordinates,
    soilType,
    irrigation,
    notes,
  } = req.body;
  const updatedFarm = {
    ...farm,
    ...(name !== undefined ? { name } : {}),
    ...(state !== undefined ? { state } : {}),
    ...(district !== undefined ? { district } : {}),
    ...(locality !== undefined ? { locality } : {}),
    ...(coordinates !== undefined ? { coordinates } : {}),
    ...(soilType !== undefined ? { soilType } : {}),
    ...(irrigation !== undefined ? { irrigation } : {}),
    ...(notes !== undefined ? { notes } : {}),
    updatedAt: new Date().toISOString(),
  };
  try {
    if (mongoIsReady()) await saveDomainRecord("farms", updatedFarm);
    Object.assign(farm, updatedFarm);
    return res.json({ farm });
  } catch (error) {
    console.error("Unable to update farm.", error);
    return res.status(500).json({ message: "Unable to update farm right now." });
  }
};

export const deleteFarm = async (req: AuthenticatedRequest, res: Response) => {
  const index = memoryDb.farms.findIndex(
    (farm) => farm.id === req.params.id && farm.userId === req.user?.id,
  );
  if (index === -1) {
    return res.status(404).json({ message: "Farm not found." });
  }

  try {
    if (mongoIsReady()) await removeDomainRecord("farms", String(req.params.id));
    memoryDb.farms.splice(index, 1);
  } catch (error) {
    console.error("Unable to delete farm.", error);
    return res.status(500).json({ message: "Unable to delete farm right now." });
  }
  return res.json({ message: "Farm deleted successfully." });
};
