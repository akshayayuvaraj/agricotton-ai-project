import type { Response } from 'express';
import { memoryDb } from '../data/store.js';
import type { AuthenticatedRequest } from '../middleware/auth.js';

export const getDashboardSummary = (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const farms = memoryDb.farms.filter((farm) => farm.userId === userId);
  const fields = memoryDb.fields.filter((field) => field.userId === userId);
  const zones = memoryDb.zones.filter((zone) => zone.userId === userId);
  const soilSamples = memoryDb.soilSamples.filter((sample) => sample.userId === userId);
  const activities = memoryDb.activities.filter((activity) => activity.userId === userId).slice(0, 5);
  const plans = memoryDb.fertilizerPlans.filter((plan) => plan.userId === userId).slice(0, 5);

  const mappedArea = fields.reduce((sum, field) => sum + field.areaHectares, 0);

  res.json({
    farms: farms.length,
    fields: fields.length,
    mappedArea: Number(mappedArea.toFixed(2)),
    managementZones: zones.length,
    soilSamples: soilSamples.length,
    upcomingCropActivities: [
      { title: 'Fertilizer top-dress', date: '2026-07-05', zone: 'Zone A - West Section' },
      { title: 'Pest scouting', date: '2026-07-12', zone: 'North Cotton Block' },
      { title: 'Irrigation check', date: '2026-07-18', zone: 'South irrigation lane' },
    ],
    recentFertilizerPlans: plans,
    recentFieldActivity: activities,
    quickActions: [
      { label: 'Add farm', target: '/farms' },
      { label: 'Map field', target: '/field-mapping' },
      { label: 'Enter soil data', target: '/soil-health' },
      { label: 'Plan fertilizer', target: '/fertilizer-planner' },
    ],
  });
};
