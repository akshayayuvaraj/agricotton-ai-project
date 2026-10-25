export type User = {
  id: string;
  name: string;
  email: string;
};

export type Farm = {
  id: string;
  name: string;
  state: string;
  district: string;
  locality: string;
  notes?: string;
  soilType?: string;
  irrigation?: string;
  coordinates?: { lat: number; lng: number };
};

export type Field = {
  id: string;
  farmId: string;
  name: string;
  cropName: string;
  season: string;
  sowingDate?: string;
  boundary: { type: "Polygon"; coordinates: number[][][] };
  areaHectares: number;
  areaAcres: number;
  irrigationMethod?: string;
  notes?: string;
};

export type Zone = {
  id: string;
  fieldId: string;
  name: string;
  color: string;
  polygon: { type: "Polygon"; coordinates: number[][][] };
  areaHectares: number;
  areaAcres: number;
  notes?: string;
};

export type SoilSample = {
  id: string;
  fieldId: string;
  zoneId?: string;
  samplingDate: string;
  ph?: number;
  electricalConductivity?: number;
  organicCarbon?: number;
  nitrogen?: number;
  phosphorus?: number;
  potassium?: number;
  recommendations?: string[];
};

export type FertilizerPlan = {
  id: string;
  fieldId: string;
  zoneId?: string;
  planName: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  applicationDate: string;
  notes?: string;
};

export type DashboardSummary = {
  farms: number;
  fields: number;
  mappedArea: number;
  managementZones: number;
  soilSamples: number;
  upcomingCropActivities: { title: string; date: string; zone: string }[];
  recentFertilizerPlans: FertilizerPlan[];
  recentFieldActivity: {
    id: string;
    title: string;
    description: string;
    createdAt: string;
  }[];
  quickActions: { label: string; target: string }[];
};
