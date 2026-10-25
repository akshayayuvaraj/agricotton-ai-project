import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { calculatePolygonArea, validatePolygonGeometry } from '../utils/geo.js';
import type { Activity, Farm, FertilizerPlan, Field, FieldZone, SoilSample, User } from '../types/index.js';
import type { CottonIssue } from '../types/cottonIssue.js';
import type { CalendarPlan } from '../types/calendar.js';
import { hydrateDomainStore, persistDemoDomainData } from './mongoStore.js';

const users: User[] = [];
const farms: Farm[] = [];
const fields: Field[] = [];
const zones: FieldZone[] = [];
const soilSamples: SoilSample[] = [];
const fertilizerPlans: FertilizerPlan[] = [];
const activities: Activity[] = [];
const cottonIssues: CottonIssue[] = [];
const calendarPlans: CalendarPlan[] = [];

const boundary = {
  type: 'Polygon',
  coordinates: [
    [
      [78.124, 11.123],
      [78.127, 11.123],
      [78.127, 11.126],
      [78.124, 11.126],
      [78.124, 11.123],
    ],
  ],
} as const;

const zonePolygon = {
  type: 'Polygon',
  coordinates: [
    [
      [78.1243, 11.1234],
      [78.1259, 11.1234],
      [78.1259, 11.1251],
      [78.1243, 11.1251],
      [78.1243, 11.1234],
    ],
  ],
} as const;

export const registerDemoData = async () => {
  if (users.length > 0) {
    return;
  }

  const passwordHash = await bcrypt.hash('demo1234', 10);
  const userId = randomUUID();

  const demoUser: User = {
    id: userId,
    name: 'Demo Farmer',
    email: 'demo@agricotton.ai',
    passwordHash,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  users.push(demoUser);

  const farmId = randomUUID();
  const farm: Farm = {
    id: farmId,
    userId,
    name: 'Green Valley Farm',
    state: 'Tamil Nadu',
    district: 'Coimbatore',
    locality: 'Pattanam',
    coordinates: { lat: 11.1249, lng: 78.1257 },
    soilType: 'Loamy black soil',
    irrigation: 'Drip irrigation',
    notes: 'Cotton and maize rotation field cluster.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  farms.push(farm);

  const fieldId = randomUUID();
  const validatedBoundary = validatePolygonGeometry(boundary);
  const fieldArea = calculatePolygonArea(validatedBoundary);

  const field: Field = {
    id: fieldId,
    userId,
    farmId,
    name: 'North Cotton Block',
    cropName: 'Cotton',
    season: 'Kharif',
    sowingDate: '2026-06-14',
    boundary: validatedBoundary,
    areaHectares: Number(fieldArea.hectares.toFixed(2)),
    areaAcres: Number(fieldArea.acres.toFixed(2)),
    irrigationMethod: 'Drip',
    notes: 'High organic matter, moderate salinity in lower section.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  fields.push(field);

  const zoneId = randomUUID();
  const zoneGeometry = validatePolygonGeometry(zonePolygon);
  const zoneArea = calculatePolygonArea(zoneGeometry);
  const zone: FieldZone = {
    id: zoneId,
    userId,
    fieldId,
    name: 'Zone A - West Section',
    color: '#4AA85A',
    polygon: zoneGeometry,
    areaHectares: Number(zoneArea.hectares.toFixed(2)),
    areaAcres: Number(zoneArea.acres.toFixed(2)),
    notes: 'Fast drainage, nutrient-demanding corridor.',
    soilSampleIds: [],
    fertilizerPlanIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  zones.push(zone);

  const soilSample: SoilSample = {
    id: randomUUID(),
    userId,
    fieldId,
    zoneId,
    samplingDate: '2026-06-18',
    ph: 6.8,
    organicCarbon: 0.74,
    nitrogen: 142,
    phosphorus: 24,
    potassium: 240,
    recommendations: ['Apply 20 kg N/acre split dose', 'Mulch between rows after flowering'],
    notes: 'Soil profile is healthy but K is slightly low.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  soilSamples.push(soilSample);
  zone.soilSampleIds.push(soilSample.id);

  const fertilizerPlan: FertilizerPlan = {
    id: randomUUID(),
    userId,
    fieldId,
    zoneId,
    planName: 'Balanced NPK top dressing',
    nitrogen: 45,
    phosphorus: 20,
    potassium: 30,
    applicationDate: '2026-07-05',
    notes: 'Use foliar micronutrient spray in second split',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  fertilizerPlans.push(fertilizerPlan);
  zone.fertilizerPlanIds.push(fertilizerPlan.id);

  activities.push(
    {
      id: randomUUID(),
      userId,
      type: 'field-map',
      title: 'Field mapped',
      description: 'North Cotton Block boundary saved successfully.',
      createdAt: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      userId,
      type: 'soil-test',
      title: 'Soil sample logged',
      description: 'Zone A soil sample uploaded with nutrient summary.',
      createdAt: new Date().toISOString(),
    },
  );
  await persistDemoDomainData(memoryDb);
};

export const memoryDb = {
  users,
  farms,
  fields,
  zones,
  soilSamples,
  fertilizerPlans,
  activities,
  cottonIssues,
  calendarPlans,
};

export const updateTimestamp = (value: { updatedAt: string }) => {
  value.updatedAt = new Date().toISOString();
};

export const hydratePersistentData = () => hydrateDomainStore(memoryDb);
