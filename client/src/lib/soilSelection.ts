import type { SoilSample } from "../types";

/**
 * Which real, saved soil sample applies to a selected management zone.
 *
 * - "zone":  a sample recorded for exactly this zone.
 * - "field": no zone sample exists, so the newest whole-field sample (one saved
 *            without a zone) is offered. It is NOT zone-specific and the UI must
 *            say so.
 * - "none":  nothing recorded. Nothing is estimated or invented.
 */
export type ZoneSoil =
  | { kind: "zone"; sample: SoilSample }
  | { kind: "field"; sample: SoilSample }
  | { kind: "none" };

const newestFirst = (a: SoilSample, b: SoilSample) =>
  b.samplingDate.localeCompare(a.samplingDate);

export const pickSoilForZone = (
  samples: SoilSample[],
  fieldId: string,
  zoneId: string,
): ZoneSoil => {
  if (!fieldId || !zoneId) return { kind: "none" };
  const inField = samples.filter((sample) => sample.fieldId === fieldId);
  const zoneSample = inField
    .filter((sample) => sample.zoneId === zoneId)
    .sort(newestFirst)[0];
  if (zoneSample) return { kind: "zone", sample: zoneSample };
  const fieldSample = inField
    .filter((sample) => !sample.zoneId)
    .sort(newestFirst)[0];
  if (fieldSample) return { kind: "field", sample: fieldSample };
  return { kind: "none" };
};

export const SOIL_MEASUREMENTS: {
  key: "ph" | "electricalConductivity" | "organicCarbon" | "nitrogen" | "phosphorus" | "potassium";
  label: string;
  unit: string;
}[] = [
  { key: "ph", label: "pH", unit: "" },
  { key: "electricalConductivity", label: "Electrical conductivity", unit: "(lab unit)" },
  { key: "organicCarbon", label: "Organic carbon", unit: "%" },
  { key: "nitrogen", label: "Nitrogen", unit: "mg/kg" },
  { key: "phosphorus", label: "Phosphorus", unit: "mg/kg" },
  { key: "potassium", label: "Potassium", unit: "mg/kg" },
];
