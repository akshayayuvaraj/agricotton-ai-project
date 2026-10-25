import { describe, expect, it } from "vitest";
import {
  polygonArea,
  splitFieldIntoGridZones,
  toGeoPolygon,
  validateGeoPolygon,
  validateZonePartition,
} from "./geometry";
import type { Field } from "../types";

const field: Field = {
  id: "field-1",
  farmId: "farm-1",
  name: "Test field",
  cropName: "Cotton",
  season: "Kharif",
  boundary: {
    type: "Polygon",
    coordinates: [
      [
        [78.124, 11.123],
        [78.127, 11.123],
        [78.127, 11.126],
        [78.124, 11.126],
        [78.124, 11.123],
      ],
    ],
  },
  areaHectares: 0,
  areaAcres: 0,
};

describe("field geometry helpers", () => {
  it("closes an open Leaflet vertex list as GeoJSON longitude/latitude coordinates", () => {
    const source: [number, number][] = [
      [11.1, 78.1],
      [11.2, 78.1],
      [11.2, 78.2],
    ];
    const polygon = toGeoPolygon(source);

    expect(polygon.coordinates[0]).toEqual([
      [78.1, 11.1],
      [78.1, 11.2],
      [78.2, 11.2],
      [78.1, 11.1],
    ]);
    expect(source).toHaveLength(3);
  });

  it("rejects polygon coordinates outside longitude and latitude ranges", () => {
    expect(() =>
      toGeoPolygon([
        [11, 181],
        [11.1, 181],
        [11.1, 181.1],
      ]),
    ).toThrow(/valid \[longitude, latitude\]/);
  });

  it("automatically divides a field into valid polygon features", () => {
    const partition = splitFieldIntoGridZones(field, 2);
    expect(partition.polygons).toHaveLength(2);
    partition.polygons.forEach((zone) => {
      expect(zone.type).toBe("Polygon");
      expect(zone.coordinates[0].length).toBeGreaterThanOrEqual(4);
    });
    expect(partition.coverageDifferenceHectares).toBeLessThan(0.0001);
    expect(partition.totalAreaHectares).toBeCloseTo(fieldArea(), 1);
  });

  it("splits a valid concave boundary into the requested connected zones", () => {
    const concaveField: Field = {
      ...field,
      boundary: {
        type: "Polygon",
        coordinates: [
          [
            [78.124, 11.123],
            [78.127, 11.123],
            [78.127, 11.124],
            [78.125, 11.124],
            [78.125, 11.126],
            [78.127, 11.126],
            [78.127, 11.127],
            [78.124, 11.127],
            [78.124, 11.123],
          ],
        ],
      },
    };

    const partition = splitFieldIntoGridZones(concaveField, 1, 2);
    expect(partition.polygons).toHaveLength(2);
    expect(partition.coverageDifferenceHectares).toBeLessThan(0.0001);
    partition.polygons.forEach((polygon) => {
      expect(validateGeoPolygon(polygon)).toEqual(polygon);
    });
  });

  it("generates the requested grid zone count up to twenty and rejects invalid counts", () => {
    const partition = splitFieldIntoGridZones(field, 20);
    expect(partition.polygons).toHaveLength(20);
    expect(partition.areas).toHaveLength(20);
    expect(partition.totalAreaHectares).toBeCloseTo(fieldArea(), 1);
    expect(() => splitFieldIntoGridZones(field, 21)).toThrow(
      /between 2 and 20/,
    );
    expect(splitFieldIntoGridZones(field, 2, 3).polygons).toHaveLength(6);
    expect(() => splitFieldIntoGridZones(field, 5, 5)).toThrow(
      /between 2 and 20/,
    );
  });

  it("rejects self-intersections, duplicate adjacent vertices, and zero-area polygons", () => {
    expect(() =>
      validateGeoPolygon({
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 1],
            [1, 0],
            [0, 1],
            [0, 0],
          ],
        ],
      }),
    ).toThrow(/self-intersects/);
    expect(() =>
      validateGeoPolygon({
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 0],
            [0, 1],
            [0, 0],
          ],
        ],
      }),
    ).toThrow(/duplicate consecutive/);
    expect(() =>
      validateGeoPolygon({
        type: "Polygon",
        coordinates: [
          [
            [78, 11],
            [78.001, 11],
            [78.002, 11],
            [78, 11],
          ],
        ],
      }),
    ).toThrow(/greater than zero/);
  });

  it("calculates area in hectares and acres", () => {
    const area = polygonArea(field.boundary);
    expect(area.hectares).toBeGreaterThan(0);
    expect(area.acres).toBeCloseTo(area.hectares * 2.47105, 2);
  });

  it("detects zone partition gaps and zone overlaps", () => {
    const split = splitFieldIntoGridZones(field, 2).polygons;
    expect(() =>
      validateZonePartition(field.boundary, split.slice(0, 1)),
    ).toThrow(/uncovered or excess area/);
    expect(() =>
      validateZonePartition(field.boundary, [split[0], split[0]]),
    ).toThrow(/overlap/);
    expect(
      validateZonePartition(field.boundary, split.slice(0, 1), false).polygons,
    ).toHaveLength(1);
  });
});

const fieldArea = () => polygonArea(field.boundary).hectares;
