import type { Response } from 'express';
import { randomUUID } from 'crypto';
import { memoryDb } from '../data/store.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';
import { mongoIsReady, removeDomainRecord, saveDomainRecord } from '../data/mongoStore.js';

export const listFertilizerPlans = (req: AuthenticatedRequest, res: Response) => {
  const plans = memoryDb.fertilizerPlans.filter((plan) => plan.userId === req.user?.id);
  return res.json({ plans });
};

export const createFertilizerPlan = async (req: AuthenticatedRequest, res: Response) => {
  const { fieldId, zoneId, planName, nitrogen, phosphorus, potassium, applicationDate, notes } = req.body;
  if (!fieldId || !planName || !applicationDate || !zoneId) {
    return res.status(400).json({ message: 'Field, zone, plan name, and application date are required.' });
  }
  const nutrientValues = [nitrogen, phosphorus, potassium].map(Number);
  if (nutrientValues.some((value) => !Number.isFinite(value) || value < 0)) {
    return res.status(400).json({ message: 'Nutrient quantities must be finite, non-negative numbers.' });
  }
  const field = memoryDb.fields.find(
    (entry) => entry.id === fieldId && entry.userId === req.user?.id,
  );
  if (!field) {
    return res.status(404).json({ message: 'Field not found for the authenticated user.' });
  }
  const zone = memoryDb.zones.find(
    (entry) =>
      entry.id === zoneId &&
      entry.fieldId === fieldId &&
      entry.userId === req.user?.id,
  );
  if (!zone) {
    return res.status(404).json({ message: 'Zone not found in the selected field.' });
  }

  const zoneAreaHectares = zone.areaHectares;
  const plan = {
    id: randomUUID(),
    userId: req.user?.id ?? '',
    fieldId: String(fieldId),
    zoneId: zoneId ? String(zoneId) : undefined,
    planName: String(planName),
    nitrogen: Number((nutrientValues[0] * zoneAreaHectares).toFixed(3)),
    phosphorus: Number((nutrientValues[1] * zoneAreaHectares).toFixed(3)),
    potassium: Number((nutrientValues[2] * zoneAreaHectares).toFixed(3)),
    applicationDate: String(applicationDate),
    notes: [
      `Calculated for zone area ${zoneAreaHectares.toFixed(4)} ha.`,
      `User-entered rates (kg nutrient/ha): N ${nutrientValues[0]}, P ${nutrientValues[1]}, K ${nutrientValues[2]}.`,
      notes ? String(notes) : '',
    ].filter(Boolean).join(' '),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    if (mongoIsReady()) await saveDomainRecord("fertilizerPlans", plan);
    memoryDb.fertilizerPlans.push(plan);
  } catch (error) {
    console.error("Unable to persist fertilizer plan.", error);
    return res.status(500).json({ message: "Unable to save the fertilizer plan right now." });
  }
  return res.status(201).json({ plan });
};

export const deleteFertilizerPlan = async (req: AuthenticatedRequest, res: Response) => {
  const index = memoryDb.fertilizerPlans.findIndex((plan) => plan.id === req.params.id && plan.userId === req.user?.id);
  if (index === -1) {
    return res.status(404).json({ message: 'Fertilizer plan not found.' });
  }

  try {
    if (mongoIsReady()) await removeDomainRecord("fertilizerPlans", String(req.params.id));
    memoryDb.fertilizerPlans.splice(index, 1);
  } catch (error) {
    console.error("Unable to delete fertilizer plan.", error);
    return res.status(500).json({ message: "Unable to delete the fertilizer plan right now." });
  }
  return res.json({ message: 'Fertilizer plan removed.' });
};
