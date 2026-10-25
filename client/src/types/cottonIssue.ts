export type CottonIssueCategory = "disease" | "pest" | "crop_disorder";

export type CottonIssue = {
  id: string;
  name: string;
  scientificName: string | null;
  category: CottonIssueCategory;
  severity: {
    level: "unverified";
    explanation: string;
  };
  commonSymptoms: string[];
  identificationTips: string[];
  favorableConditions: string;
  cropStagesAffected: string[];
  prevention: string[];
  integratedManagement: string[];
  monitoringGuidance: string[];
  regionRelevance: {
    region: string;
    status: "verified" | "unverified";
    note: string;
  };
  referenceSources: {
    title: string;
    url: string;
    notes: string;
  }[];
  lastReviewed: string;
};

export type CottonIssueCounts = {
  all: number;
  disease: number;
  pest: number;
  crop_disorder: number;
};

export type CottonIssuesResponse = {
  issues: CottonIssue[];
  total: number;
  counts: CottonIssueCounts;
};
