import { describe, expect, it } from "vitest";
import { pickSoilForZone } from "./soilSelection";
import type { SoilSample } from "../types";

const sample = (over: Partial<SoilSample>): SoilSample => ({
  id: Math.random().toString(),
  fieldId: "f1",
  samplingDate: "2026-01-01",
  ...over,
});

describe("pickSoilForZone", () => {
  it("returns none when nothing is recorded, without inventing data", () => {
    expect(pickSoilForZone([], "f1", "z1")).toEqual({ kind: "none" });
    expect(pickSoilForZone([sample({ fieldId: "other", zoneId: "z1" })], "f1", "z1")).toEqual({ kind: "none" });
    expect(pickSoilForZone([sample({})], "f1", "")).toEqual({ kind: "none" });
  });

  it("prefers the newest sample recorded for the zone", () => {
    const old = sample({ zoneId: "z1", samplingDate: "2026-01-01", ph: 6 });
    const recent = sample({ zoneId: "z1", samplingDate: "2026-06-01", ph: 7 });
    const result = pickSoilForZone([old, recent], "f1", "z1");
    expect(result).toEqual({ kind: "zone", sample: recent });
  });

  it("does not use another zone's sample", () => {
    expect(pickSoilForZone([sample({ zoneId: "z2" })], "f1", "z1")).toEqual({ kind: "none" });
  });

  it("falls back to a whole-field sample and flags it as such", () => {
    const wholeField = sample({ ph: 6.5 });
    expect(pickSoilForZone([wholeField, sample({ zoneId: "z2" })], "f1", "z1")).toEqual({
      kind: "field",
      sample: wholeField,
    });
  });
});
