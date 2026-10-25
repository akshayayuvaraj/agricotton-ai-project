export type CottonIssueCategory = "disease" | "pest" | "crop_disorder";
export type CottonIssueSeverity = "unverified";

export type CottonIssue = {
  id: string;
  name: string;
  scientificName: string | null;
  category: CottonIssueCategory;
  severity: {
    level: CottonIssueSeverity;
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
