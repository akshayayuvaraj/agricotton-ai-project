import * as turf from "@turf/turf";
import type { Field } from "../types";

export type GeoPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

export type ZonePartition = {
  polygons: GeoPolygon[];
  areas: { hectares: number; acres: number }[];
  totalAreaHectares: number;
  coverageDifferenceHectares: number;
};

export const validateGeoPolygon = (polygon: GeoPolygon): GeoPolygon => {
  if (polygon.coordinates.length === 0) {
    throw new Error("Polygon needs an outer boundary ring.");
  }
  const coordinates = polygon.coordinates.map((sourceRing) => {
    if (sourceRing.length < 3) {
      throw new Error("A polygon ring needs at least three vertices.");
    }
    const ring = sourceRing.map(([lng, lat]) => [lng, lat]);
    for (const [longitude, latitude] of ring) {
      if (
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude) ||
        longitude < -180 ||
        longitude > 180 ||
        latitude < -90 ||
        latitude > 90
      ) {
        throw new Error(
          "Polygon coordinates must be valid [longitude, latitude] values.",
        );
      }
    }
    for (let index = 1; index < ring.length; index += 1) {
      if (
        ring[index][0] === ring[index - 1][0] &&
        ring[index][1] === ring[index - 1][1]
      ) {
        throw new Error(
          "Polygon has duplicate consecutive vertices. Move or remove the duplicate point.",
        );
      }
    }
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first && last && (first[0] !== last[0] || first[1] !== last[1]))
      ring.push([...first]);
    return ring;
  });
  const normalized = { type: "Polygon" as const, coordinates };
  const outerRing = normalized.coordinates[0];
  const distinct = new Set(
    outerRing.slice(0, -1).map(([lng, lat]) => `${lng},${lat}`),
  );
  if (distinct.size < 3)
    throw new Error("A polygon needs at least three distinct vertices.");
  const feature = turf.feature(normalized);
  if (turf.kinks(feature).features.length > 0) {
    throw new Error(
      "Polygon self-intersects or is otherwise invalid. Adjust the vertices and retry.",
    );
  }
  if (turf.area(feature) <= 1)
    throw new Error("Polygon area must be greater than zero.");
  return normalized;
};

export const polygonArea = (polygon: GeoPolygon) => {
  const areaM2 = turf.area(polygon);
  return { hectares: areaM2 / 10_000, acres: areaM2 / 4046.856 };
};

export const toGeoPolygon = (points: [number, number][]): GeoPolygon => {
  if (points.length < 3) {
    throw new Error("Add at least three boundary vertices before saving.");
  }

  const ring = points.map(([lat, lng]) => [lng, lat]);
  return validateGeoPolygon({ type: "Polygon", coordinates: [ring] });
};

const areaToleranceHectares = (fieldAreaHectares: number) =>
  Math.max(0.0001, fieldAreaHectares * 0.005);

export const validateZonePartition = (
  boundary: GeoPolygon,
  zones: GeoPolygon[],
  requireCompleteCoverage = true,
): ZonePartition => {
  const validatedBoundary = validateGeoPolygon(boundary);
  const validatedZones = zones.map(validateGeoPolygon);
  if (validatedZones.length === 0)
    throw new Error("No valid zones were generated.");
  const field = turf.feature(validatedBoundary);
  for (const [index, zone] of validatedZones.entries()) {
    const zoneFeature = turf.feature(zone);
    const intersection = turf.intersect(zoneFeature, field);
    const zoneArea = turf.area(zoneFeature);
    if (
      !intersection ||
      zoneArea - turf.area(intersection) > Math.max(1, zoneArea * 1e-9)
    ) {
      throw new Error(`Zone ${index + 1} extends outside the selected field.`);
    }
  }

  for (
    let firstIndex = 0;
    firstIndex < validatedZones.length;
    firstIndex += 1
  ) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < validatedZones.length;
      secondIndex += 1
    ) {
      const overlap = turf.intersect(
        turf.feature(validatedZones[firstIndex]),
        turf.feature(validatedZones[secondIndex]),
      );
      if (overlap && turf.area(overlap) > 1) {
        throw new Error(
          `Zones ${firstIndex + 1} and ${secondIndex + 1} overlap.`,
        );
      }
    }
  }

  const fieldAreaHectares = turf.area(field) / 10_000;
  const zonesAreaHectares = validatedZones.reduce(
    (sum, zone) => sum + turf.area(zone) / 10_000,
    0,
  );
  const coverageDifferenceHectares = Math.abs(
    fieldAreaHectares - zonesAreaHectares,
  );
  if (
    requireCompleteCoverage &&
    coverageDifferenceHectares > areaToleranceHectares(fieldAreaHectares)
  ) {
    throw new Error(
      `Generated zones leave an uncovered or excess area of ${coverageDifferenceHectares.toFixed(4)} ha. Coverage tolerance is ${areaToleranceHectares(fieldAreaHectares).toFixed(4)} ha (0.5% of field area, minimum 0.0001 ha).`,
    );
  }

  return {
    polygons: validatedZones,
    areas: validatedZones.map(polygonArea),
    totalAreaHectares: zonesAreaHectares,
    coverageDifferenceHectares,
  };
};

export const splitFieldIntoGridZones = (
  field: Field,
  rows: number,
  columns = 1,
): ZonePartition => {
  const count = rows * columns;
  if (
    !Number.isInteger(rows) ||
    !Number.isInteger(columns) ||
    rows < 1 ||
    columns < 1 ||
    count < 2 ||
    count > 20
  ) {
    throw new Error("Choose rows and columns that create between 2 and 20 zones.");
  }
  const boundary = validateGeoPolygon(field.boundary);
  const fieldFeature = turf.feature(boundary);
  const [minLng, minLat, maxLng, maxLat] = turf.bbox(fieldFeature);
  const partitionGrid = (gridRows: number, gridColumns: number) => {
    const result: GeoPolygon[] = [];

    for (let row = 0; row < gridRows; row += 1) {
      const bottom = minLat + ((maxLat - minLat) * row) / gridRows;
      const top =
        row === gridRows - 1
          ? maxLat
          : minLat + ((maxLat - minLat) * (row + 1)) / gridRows;
      for (let column = 0; column < gridColumns; column += 1) {
        const left = minLng + ((maxLng - minLng) * column) / gridColumns;
        const right =
          column === gridColumns - 1
            ? maxLng
            : minLng + ((maxLng - minLng) * (column + 1)) / gridColumns;
        const cell = turf.polygon([
          [
            [left, bottom],
            [right, bottom],
            [right, top],
            [left, top],
            [left, bottom],
          ],
        ]);
        const clipped = turf.intersect(fieldFeature, cell);
        if (!clipped) continue;
        if (clipped.geometry.type === "MultiPolygon") {
          throw new Error(
            `Grid cell (${row + 1}, ${column + 1}) splits into disconnected pieces.`,
          );
        }
        const cleaned: GeoPolygon = {
          type: "Polygon",
          coordinates: clipped.geometry.coordinates.map((sourceRing) => {
            const ring = sourceRing.map((coordinate) => [...coordinate]);
            let changed = true;
            while (changed && ring.length > 4) {
              changed = false;
              for (let index = 1; index < ring.length - 1; index += 1) {
                const previous = ring[index - 1];
                const current = ring[index];
                const next = ring[index + 1];
                const cross =
                  (current[0] - previous[0]) * (next[1] - current[1]) -
                  (current[1] - previous[1]) * (next[0] - current[0]);
                if (
                  (current[0] === previous[0] && current[1] === previous[1]) ||
                  cross === 0
                ) {
                  ring.splice(index, 1);
                  changed = true;
                  break;
                }
              }
            }
            const first = ring[0];
            const last = ring[ring.length - 1];
            if (first && last && (first[0] !== last[0] || first[1] !== last[1])) {
              ring.push([...first]);
            }
            return ring;
          }),
        };
        result.push(validateGeoPolygon(cleaned));
      }
    }

    if (result.length !== count) {
      throw new Error(
        `Grid produced ${result.length} usable zones instead of the requested ${count}. The boundary may be too small or narrow for this split.`,
      );
    }
    return validateZonePartition(boundary, result);
  };

  try {
    return partitionGrid(rows, columns);
  } catch (firstError) {
    if (rows === columns) throw firstError;
    try {
      return partitionGrid(columns, rows);
    } catch (transposedError) {
      const firstMessage =
        firstError instanceof Error ? firstError.message : "Invalid grid geometry.";
      const secondMessage =
        transposedError instanceof Error
          ? transposedError.message
          : "Invalid transposed grid geometry.";
      throw new Error(
        `Unable to split this boundary into ${count} connected zones. ${firstMessage} ${secondMessage}`,
      );
    }
  }
};
