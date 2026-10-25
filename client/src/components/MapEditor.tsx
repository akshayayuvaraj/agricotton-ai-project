import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { DomEvent, divIcon } from "leaflet";
import { LocateFixed, MapPin } from "lucide-react";
import type { LatLngBoundsExpression, LatLngExpression } from "leaflet";
import {
  getCurrentLocation,
  LOW_ACCURACY_METRES,
  type CurrentLocation,
} from "../lib/geolocation";

const currentLocationIcon = divIcon({
  className: "current-location-marker",
  html: '<span style="display:block;width:20px;height:20px;background:#2563eb;border:3px solid #fff;border-radius:50%;box-shadow:0 1px 6px #0f172a99"></span>',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  popupAnchor: [0, -13],
});

// Vertex handles are CSS-drawn divIcons. Leaflet's default image marker needs
// its PNG paths resolved at runtime, which bundlers like Vite break in
// production builds, so we do not rely on it.
const vertexIcon = (color: string, first: boolean) =>
  divIcon({
    className: "vertex-marker",
    html: `<span style="display:block;width:${first ? 18 : 14}px;height:${first ? 18 : 14}px;background:${color};border:3px solid #fff;border-radius:50%;box-shadow:0 1px 4px #0f172a99"></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  });

type Overlay = {
  id: string;
  name: string;
  color: string;
  points: [number, number][];
  selected?: boolean;
};

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
  overlays?: Overlay[];
  /** Called when a saved overlay (field or zone) is clicked on the map. */
  onOverlayClick?: (id: string) => void;
  /**
   * The map re-frames its content only when this value changes (for example
   * when a different field is selected or records finish loading). It never
   * re-frames because of vertex edits or unrelated re-renders, so panning,
   * zooming, drawing and "My Current Location" are not undone.
   */
  fitKey?: string;
};

const DrawHandler = ({
  onAdd,
  drawingActive,
}: {
  onAdd: (point: [number, number]) => void;
  drawingActive: boolean;
}) => {
  const map = useMap();
  useMapEvents({
    click: (event) => {
      if (drawingActive) onAdd([event.latlng.lat, event.latlng.lng]);
    },
  });
  // An open popup would intercept the first drawing clicks.
  useEffect(() => {
    if (drawingActive) map.closePopup();
  }, [map, drawingActive]);

  return null;
};

const toBounds = (points: [number, number][]) =>
  points.map(([lat, lng]) => [lat, lng] as LatLngExpression) as LatLngBoundsExpression;

const MapViewport = ({
  points,
  overlayPoints,
  initialCenter,
  fitKey,
}: {
  points: [number, number][];
  overlayPoints: [number, number][];
  initialCenter?: [number, number];
  fitKey: string;
}) => {
  const map = useMap();
  // Always read the latest geometry, but only re-frame when fitKey changes.
  const latest = useRef({ points, overlayPoints, initialCenter });
  latest.current = { points, overlayPoints, initialCenter };

  useEffect(() => {
    const { points: p, overlayPoints: o, initialCenter: c } = latest.current;
    if (p.length >= 2) {
      map.fitBounds(toBounds(p), { padding: [24, 24], maxZoom: 16 });
    } else if (p.length === 1) {
      map.setView(p[0], 16);
    } else if (o.length > 0) {
      map.fitBounds(toBounds(o), { padding: [24, 24], maxZoom: 16 });
    } else if (c) {
      map.setView(c, 12);
    }
  }, [map, fitKey]);

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
  const controlRef = useRef<HTMLDivElement>(null);
  const [location, setLocation] = useState<CurrentLocation | null>(null);
  const [locationError, setLocationError] = useState("");
  const [locating, setLocating] = useState(false);

  // Leaflet's CSS gives .leaflet-top/.leaflet-bottom `pointer-events: none`;
  // only `.leaflet-control` children receive clicks. Also stop clicks and
  // scrolls on the buttons from reaching the map (they would add vertices).
  useEffect(() => {
    const element = controlRef.current;
    if (!element) return;
    DomEvent.disableClickPropagation(element);
    DomEvent.disableScrollPropagation(element);
  }, []);

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
    map.fitBounds(toBounds(points), { padding: [24, 24], maxZoom: 16 });
  };

  const lowAccuracy = location ? location.accuracy > LOW_ACCURACY_METRES : false;

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
                    Start drawing the boundary here
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
      <div className="leaflet-top leaflet-right">
        <div
          ref={controlRef}
          className="leaflet-control pointer-events-none flex flex-col items-end gap-2"
        >
          <button
            type="button"
            disabled={locating}
            className="pointer-events-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow disabled:opacity-60"
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
              className="pointer-events-auto flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow"
              onClick={fitBoundary}
            >
              <MapPin className="h-4 w-4" /> Fit boundary
            </button>
          )}
          {locationError && (
            <p
              role="alert"
              className="pointer-events-none max-w-64 rounded-lg bg-white p-2 text-xs text-rose-700 shadow"
            >
              {locationError}
            </p>
          )}
          {location && (
            <p
              role="status"
              className="pointer-events-none max-w-64 rounded-lg bg-white p-2 text-xs text-slate-700 shadow"
            >
              Browser location accuracy: ±{Math.round(location.accuracy)} m.
              {lowAccuracy
                ? " This is a coarse fix (likely Wi-Fi or network based, not GPS). Zoom in and trace the real field edges; do not trust the marker as the field position."
                : " GPS only centres the map; draw the field boundary yourself."}
            </p>
          )}
        </div>
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
  onOverlayClick,
  fitKey = "initial",
}: MapEditorProps) => {
  const displayPoints = points.length > 0 ? points : referencePoints;
  // MapContainer only reads centre/zoom on first render; MapViewport handles
  // every later change, so capture the initial view once.
  const [initialView] = useState<{ center: [number, number]; zoom: number }>(
    () => ({
      center: displayPoints[0] ?? initialCenter ?? [20, 0],
      zoom: displayPoints.length > 0 ? 15 : 3,
    }),
  );
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
  const overlaysClickable = Boolean(onOverlayClick) && !drawingActive;

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft"
      style={{ height }}
    >
      <MapContainer
        center={initialView.center}
        zoom={initialView.zoom}
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
          fitKey={fitKey}
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
            interactive={false}
            pathOptions={{
              color: "#64748b",
              weight: 2,
              dashArray: "6 6",
              fillOpacity: 0.03,
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
              eventHandlers={
                overlaysClickable
                  ? { click: () => onOverlayClick?.(overlay.id) }
                  : undefined
              }
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
        {closedPolygon.length > 0 && (
          <Polygon
            positions={closedPolygon}
            interactive={false}
            pathOptions={{
              color,
              weight: 2,
              fillOpacity: 0.25,
              dashArray: drawingActive ? "6 4" : undefined,
            }}
          />
        )}
        {points.length === 2 && (
          <Polyline
            positions={polygonPositions}
            interactive={false}
            pathOptions={{ color, weight: 2, dashArray: "6 4" }}
          />
        )}
        {points.map(([lat, lng], index) => (
          <Marker
            key={`vertex-${index}`}
            position={[lat, lng]}
            icon={vertexIcon(color, index === 0)}
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
