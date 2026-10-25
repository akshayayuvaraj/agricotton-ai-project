import * as turf from "@turf/turf";

export type GeoPolygon = {
  type: "Polygon";
  coordinates: number[][][];
};

export const isValidGeoJsonPolygon = (
  geometry: unknown,
): geometry is GeoPolygon => {
  if (
    !geometry ||
    typeof geometry !== "object" ||
    !("type" in geometry) ||
    geometry.type !== "Polygon" ||
    !("coordinates" in geometry)
  ) {
    return false;
  }

  const coords = geometry.coordinates;
  if (
    !Array.isArray(coords) ||
    coords.length < 1 ||
    coords.some((ring) => !Array.isArray(ring) || ring.length < 4)
  ) {
    return false;
  }

  for (const ring of coords) {
    for (const coordinate of ring) {
      if (
        !Array.isArray(coordinate) ||
        coordinate.length < 2 ||
        typeof coordinate[0] !== "number" ||
        typeof coordinate[1] !== "number" ||
        !Number.isFinite(coordinate[0]) ||
        !Number.isFinite(coordinate[1]) ||
        coordinate[0] < -180 ||
        coordinate[0] > 180 ||
        coordinate[1] < -90 ||
        coordinate[1] > 90
      ) {
        return false;
      }
    }
  }

  return true;
};

export const calculatePolygonArea = (
  polygon: GeoPolygon,
): { hectares: number; acres: number } => {
  if (!isValidGeoJsonPolygon(polygon)) {
    return { hectares: 0, acres: 0 };
  }

  const areaSqMeters = turf.area(polygon);
  return {
    hectares: areaSqMeters / 10000,
    acres: areaSqMeters / 4046.856,
  };
};

export const normalizePolygon = (polygon: GeoPolygon): GeoPolygon => {
  if (!isValidGeoJsonPolygon(polygon)) {
    throw new Error("Invalid polygon geometry");
  }

  const coordinates = polygon.coordinates.map((sourceRing) => {
    const ring = sourceRing.map((coordinate) => [...coordinate]);
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      ring.push([...first]);
    }
    return ring;
  });

  return {
    type: "Polygon",
    coordinates,
  };
};

export const validatePolygonGeometry = (polygon: unknown): GeoPolygon => {
  if (!isValidGeoJsonPolygon(polygon)) {
    throw new Error(
      "Field boundary must be a valid GeoJSON polygon with at least 4 coordinates.",
    );
  }

  const geometry = normalizePolygon(polygon);
  if (
    turf.kinks(geometry).features.length > 0 ||
    !turf.booleanValid(geometry)
  ) {
    throw new Error("Polygon geometry is invalid or self-intersecting.");
  }

  const area = calculatePolygonArea(geometry);
  if (area.hectares <= 0.0001) {
    throw new Error("Polygon area must be greater than zero.");
  }

  return geometry;
};

export const validateZoneInsideField = (
  zone: GeoPolygon,
  boundary: GeoPolygon,
) => {
  const zoneFeature = turf.feature(zone);
  const fieldFeature = turf.feature(boundary);
  const intersection = turf.intersect(
    turf.featureCollection([zoneFeature, fieldFeature]),
  );

  const zoneArea = turf.area(zoneFeature);
  if (
    !intersection ||
    zoneArea - turf.area(intersection) > Math.max(1, zoneArea * 1e-9)
  ) {
    throw new Error(
      "Zone boundary must be entirely inside the selected field.",
    );
  }

  return zoneFeature;
};

export const zonesOverlap = (first: GeoPolygon, second: GeoPolygon) => {
  const intersection = turf.intersect(
    turf.featureCollection([turf.feature(first), turf.feature(second)]),
  );
  return intersection !== null && turf.area(intersection) > 1;
};
