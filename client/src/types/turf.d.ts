declare module "@turf/turf" {
  export type PolygonGeometry = {
    type: "Polygon";
    coordinates: number[][][];
  };

  export type MultiPolygonGeometry = {
    type: "MultiPolygon";
    coordinates: number[][][][];
  };

  export type PolygonFeature = {
    type: "Feature";
    properties: Record<string, unknown>;
    geometry: PolygonGeometry | MultiPolygonGeometry;
  };

  export function area(value: PolygonGeometry | PolygonFeature): number;
  export function feature(geometry: PolygonGeometry): PolygonFeature;
  export function bbox(value: PolygonFeature): [number, number, number, number];
  export function polygon(coordinates: number[][][]): PolygonFeature;
  export function intersect(
    first: PolygonFeature,
    second: PolygonFeature,
  ): PolygonFeature | null;
  export function booleanWithin(
    first: PolygonFeature,
    second: PolygonFeature,
  ): boolean;
  export function kinks(value: PolygonGeometry | PolygonFeature): {
    features: unknown[];
  };
}
