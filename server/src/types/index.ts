export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  updatedAt: string;
};

export type Farm = {
  id: string;
  userId: string;
  name: string;
  state: string;
  district: string;
  locality: string;
  coordinates?: { lat: number; lng: number };
  soilType?: string;
  irrigation?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Field = {
  id: string;
  userId: string;
  farmId: string;
  name: string;
  cropName: string;
  season: string;
  sowingDate?: string;
  boundary: {
    type: "Polygon";
    coordinates: number[][][];
  };
  areaHectares: number;
  areaAcres: number;
  irrigationMethod?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type FieldZone = {
  id: string;
  userId: string;
  fieldId: string;
  name: string;
  color: string;
  polygon: {
    type: "Polygon";
    coordinates: number[][][];
  };
  areaHectares: number;
  areaAcres: number;
  notes?: string;
  soilSampleIds: string[];
  fertilizerPlanIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type SoilSample = {
  id: string;
  userId: string;
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
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type FertilizerPlan = {
  id: string;
  userId: string;
  fieldId: string;
  zoneId?: string;
  planName: string;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  applicationDate: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type Activity = {
  id: string;
  userId: string;
  type: string;
  title: string;
  description: string;
  createdAt: string;
};
