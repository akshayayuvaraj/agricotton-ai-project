import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polygon,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { divIcon } from "leaflet";
import { LocateFixed, MapPin } from "lucide-react";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import { getCurrentLocation, type CurrentLocation } from "../lib/geolocation";

const currentLocationIcon = divIcon({
  className: "current-location-marker",
  html: '<span style="display:block;width:20px;height:20px;background:#2563eb;border:3px solid #fff;border-radius:50%;box-shadow:0 1px 6px #0f172a99"></span>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -13],
});

type MapEditorProps = {
  points: [number, number][];
  onChange: (points: [number, number][]) => void;
  height?: string;
  editable?: boolean;
  color?: string;
  referencePoints?: [number, number][];
  drawingActive?: boolean;
  onCurrentLocation?: (location: CurrentLocation) => void;
  initialCenter?: [number, number];
  overlays?: {
    id: string;
    name: string;
    color: string;
    points: [number, number][];
    selected?: boolean;
  }[];
};

const DrawHandler = ({
  onAdd,
  drawingActive,
}: {
  onAdd: (point: [number, number]) => void;
  drawingActive: boolean;
}) => {
  useMapEvents({
    click: (event) => {
      if (drawingActive) onAdd([event.latlng.lat, event.latlng.lng]);
    },
  });

  return null;
};

const MapViewport = ({
  points,
  overlayPoints,
  initialCenter,
}: {
  points: [number, number][];
  overlayPoints: [number, number][];
  initialCenter?: [number, number];
}) => {
  const map = useMap();

  useEffect(() => {
    if (points.length >= 2) {
      const bounds = points.map(([lat, lng]) => [lat, lng] as LatLngExpression) as LatLngBoundsExpression;
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
    } else if (points.length === 1) {
      map.setView(points[0], 16);
    } else if (overlayPoints.length > 0) {
      const bounds = overlayPoints.map(
        ([lat, lng]) => [lat, lng] as LatLngExpression,
      ) as LatLngBoundsExpression;
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
    } else if (initialCenter) {
      map.setView(initialCenter, 12);
    }
  }, [map, points, overlayPoints, initialCenter]);

  return null;
};

const MapSizeObserver = () => {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
};

const MapControls = ({
  points,
  onCurrentLocation,
}: {
  points: [number, number][];
  onCurrentLocation?: (location: CurrentLocation) => void;
}) => {
  const map = useMap();
  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [locationError, setLocationError] = useState("");
  const [locating, setLocating] = useState(false);

  const locate = async () => {
    setLocating(true);
    setLocationError("");
    setLocation(null);
    try {
      const geolocation =
        typeof navigator === "undefined" ? undefined : navigator.geolocation;
      const result = await getCurrentLocation(geolocation);
      setLocation(result);
      map.setView([result.latitude, result.longitude], 17);
    } catch (error) {
      setLocationError(
        error instanceof Error
          ? error.message
          : "Unable to determine your location.",
      );
    } finally {
      setLocating(false);
    }
  };

  const fitBoundary = () => {
    if (points.length === 0) return;
    const bounds = points.map(
      ([lat, lng]) => [lat, lng] as LatLngExpression,
    ) as LatLngBoundsExpression;
    map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 });
  };

  return (
    <>
      {location && (
        <>
          <Marker
            position={[location.latitude, location.longitude]}
            icon={currentLocationIcon}
          >
            <Popup>
              <div className="space-y-1 text-xs">
                <strong>Your Current Location</strong>
                <div>Latitude: {location.latitude.toFixed(6)}</div>
                <div>Longitude: {location.longitude.toFixed(6)}</div>
                <div>Accuracy: ±{Math.round(location.accuracy)} m</div>
                <div>This is not soil data or a field boundary.</div>
                {onCurrentLocation && (
                  <button
                    className="mt-2 block font-semibold text-field-700"
                    type="button"
                    onClick={() => onCurrentLocation(location)}
                  >
                    Use as boundary starting point
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
          <Circle
            center={[location.latitude, location.longitude]}
            radius={location.accuracy}
            pathOptions={{ color: "#2563eb", fillOpacity: 0.08 }}
          />
        </>
      )}
      <div className="leaflet-top leaflet-right z-[1000] mr-3 mt-3 flex flex-col gap-2">
        <button
          type="button"
          disabled={locating}
          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow disabled:opacity-60"
          onClick={() => void locate()}
          title="GPS locates the map only; it does not draw a field boundary"
        >
          <LocateFixed className="h-4 w-4" />
          {locating
            ? "Locating…"
            : location
              ? "Retry current location"
              : "My Current Location"}
        </button>
        {points.length > 0 && (
          <button
            type="button"
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow"
            onClick={fitBoundary}
          >
            <MapPin className="h-4 w-4" /> Fit boundary
          </button>
        )}
        {locationError && (
          <p
            role="alert"
            className="max-w-64 rounded-lg bg-white p-2 text-xs text-rose-700 shadow"
          >
            {locationError}
          </p>
        )}
        {location && (
          <p
            role="status"
            className="max-w-64 rounded-lg bg-white p-2 text-xs text-slate-700 shadow"
          >
            Browser location accuracy: ±{Math.round(location.accuracy)} m.
          </p>
        )}
      </div>
    </>
  );
};

export const MapEditor = ({
  points,
  onChange,
  height = "420px",
  editable = true,
  color = "#2d8b57",
  referencePoints = [],
  drawingActive = false,
  onCurrentLocation,
  initialCenter,
  overlays = [],
}: MapEditorProps) => {
  const displayPoints = points.length > 0 ? points : referencePoints;
  const mapCenter = useMemo(
    () => displayPoints[0] ?? initialCenter ?? [20, 0],
    [displayPoints, initialCenter],
  );
  const mapZoom = displayPoints.length > 0 ? 15 : 3;
  const overlayPoints = useMemo(
    () => overlays.flatMap((overlay) => overlay.points),
    [overlays],
  );
  const polygonPositions = useMemo(
    () => points.map(([lat, lng]) => [lat, lng] as LatLngExpression),
    [points],
  );
  const closedPolygon = useMemo(
    () =>
      points.length >= 3 ? [...polygonPositions, polygonPositions[0]] : [],
    [points, polygonPositions],
  );
  const referencePositions = useMemo(
    () => referencePoints.map(([lat, lng]) => [lat, lng] as LatLngExpression),
    [referencePoints],
  );
  const closedReference = useMemo(
    () =>
      referencePositions.length >= 3
        ? [...referencePositions, referencePositions[0]]
        : [],
    [referencePositions],
  );

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft"
      style={{ height }}
    >
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapSizeObserver />
        <MapViewport
          points={displayPoints}
          overlayPoints={overlayPoints}
          initialCenter={initialCenter}
        />
        <DrawHandler
          onAdd={(point) => onChange([...points, point])}
          drawingActive={editable && drawingActive}
        />
        {editable && (
          <MapControls
            points={displayPoints}
            onCurrentLocation={onCurrentLocation}
          />
        )}
        {closedReference.length > 0 && (
          <Polygon
            positions={closedReference}
            pathOptions={{
              color: "#64748b",
              weight: 2,
              dashArray: "6 6",
              fillOpacity: 0.03,
            }}
          />
        )}
        {closedPolygon.length > 0 && (
          <Polygon
            positions={closedPolygon}
            pathOptions={{
              color,
              weight: 2,
              fillOpacity: 0.25,
              dashArray: drawingActive ? "6 4" : undefined,
            }}
          />
        )}
        {overlays.map((overlay) => {
          const positions = overlay.points.map(
            ([lat, lng]) => [lat, lng] as LatLngExpression,
          );
          if (positions.length < 3) return null;
          return (
            <Polygon
              key={overlay.id}
              positions={[...positions, positions[0]]}
              pathOptions={{
                color: overlay.color,
                weight: overlay.selected ? 4 : 2,
                fillOpacity: overlay.selected ? 0.38 : 0.2,
              }}
            >
              <Popup>
                <strong>{overlay.name}</strong>
              </Popup>
            </Polygon>
          );
        })}
        {points.map(([lat, lng], index) => (
          <Marker
            key={`vertex-${index}`}
            position={[lat, lng]}
            draggable={editable && !drawingActive}
            eventHandlers={{
              dragend: (event) => {
                const { lat: nextLat, lng: nextLng } = event.target.getLatLng();
                onChange(
                  points.map((point, pointIndex) =>
                    pointIndex === index ? [nextLat, nextLng] : point,
                  ),
                );
              },
            }}
          >
            <Popup>
              <div className="space-y-2">
                <span>Vertex {index + 1}</span>
                {editable && !drawingActive && (
                  <button
                    className="block text-rose-700"
                    type="button"
                    onClick={() =>
                      onChange(
                        points.filter((_, pointIndex) => pointIndex !== index),
                      )
                    }
                  >
                    Remove vertex
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {editable && (
        <p className="absolute bottom-3 left-3 z-[1000] rounded-lg bg-white/95 px-3 py-2 text-xs text-slate-700 shadow">
          {drawingActive
            ? "Drawing active: click to add vertices."
            : "Drawing is inactive. Activate Draw Boundary to add vertices."}
        </p>
      )}
    </div>
  );
};
