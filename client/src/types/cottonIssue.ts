export type CottonIssueCategory = "disease" | "pest" | "crop_disorder";
export type CottonIssueSeverityLevel = "low" | "moderate" | "high" | "not_established";
export type EvidenceStatus =
  "verified" | "partially_verified" | "unverified" | "not_applicable";

export type CottonIssueVerification = {
  status: EvidenceStatus;
  sourceIds: string[];
  note: string;
};

export type CottonIssue = {
  id: string;
  name: string;
  scientificName: string | null;
  causalOrganisms: string[];
  category: CottonIssueCategory;
  severity: {
    level: CottonIssueSeverityLevel;
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
    status:
      | "documented_in_tamil_nadu"
      | "not_documented_in_reviewed_sources"
      | "not_yet_verified";
    note: string;
  };
  referenceSources: {
    id: string;
    title: string;
    publisher: string;
    url: string;
    accessedAt: string;
    notes: string;
  }[];
  verification: {
    scientificName: CottonIssueVerification;
    commonSymptoms: CottonIssueVerification;
    identificationTips: CottonIssueVerification;
    severity: CottonIssueVerification;
    tamilNaduOccurrence: CottonIssueVerification;
    cropStagesAffected: CottonIssueVerification;
    favorableConditions: CottonIssueVerification;
    prevention: CottonIssueVerification;
    integratedManagement: CottonIssueVerification;
    monitoringGuidance: CottonIssueVerification;
    causalOrganisms: CottonIssueVerification;
  };
  diagnosticNotes: string[];
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
