import { useEffect, useMemo, useState } from "react";
import { MapEditor } from "./MapEditor";
import { api, apiErrorMessage } from "../lib/api";
import {
  polygonArea,
  splitFieldIntoGridZones,
  toGeoPolygon,
  validateZonePartition,
} from "../lib/geometry";
import { parseFarmList } from "../lib/farms";
import type { Farm, Field, Zone } from "../types";
import type { GeoPolygon } from "../lib/geometry";

type WorkspaceMode = "field" | "zone";
type GridPreview = { name: string; color: string; polygon: GeoPolygon }[];

const parseRecordList = <T extends { id: string }>(
  responseData: unknown,
  key: string,
): T[] => {
  let records: unknown;
  if (Array.isArray(responseData)) {
    records = responseData;
  } else if (responseData && typeof responseData === "object") {
    const response = responseData as Record<string, unknown>;
    if (Array.isArray(response[key])) {
      records = response[key];
    } else if (Array.isArray(response.data)) {
      records = response.data;
    } else if (response.data && typeof response.data === "object") {
      const nested = response.data as Record<string, unknown>;
      if (Array.isArray(nested[key])) records = nested[key];
    }
  }

  if (!Array.isArray(records)) {
    throw new Error(`The ${key} API returned an unsupported response.`);
  }
  return records.map((record, index) => {
    if (!record || typeof record !== "object") {
      throw new Error(
        `The ${key} API returned an invalid record at position ${index + 1}.`,
      );
    }
    const value = record as Record<string, unknown>;
    const id = value.id ?? value._id;
    if (typeof id !== "string" || !id.trim()) {
      throw new Error(
        `The ${key} API returned a record without an ID at position ${index + 1}.`,
      );
    }
    return { ...value, id } as T;
  });
};

const isUnauthorized = (error: unknown) =>
  Boolean(
    error &&
      typeof error === "object" &&
      "response" in error &&
      error.response &&
      typeof error.response === "object" &&
      "status" in error.response &&
      error.response.status === 401,
  );

const recordLoadError = (error: unknown, fallback: string) =>
  isUnauthorized(error)
    ? "Your session has expired or you are signed out. Sign in to load your saved farms and fields."
    : apiErrorMessage(error, fallback);

const colors = [
  "#4AA85A",
  "#D97706",
  "#2563EB",
  "#9333EA",
  "#DB2777",
  "#0D9488",
  "#DC2626",
  "#4F46E5",
];

const toMapPoints = (polygon?: GeoPolygon): [number, number][] => {
  const ring = polygon?.coordinates[0] ?? [];
  const openRing =
    ring.length > 1 &&
    ring[0][0] === ring[ring.length - 1][0] &&
    ring[0][1] === ring[ring.length - 1][1]
      ? ring.slice(0, -1)
      : ring;
  return openRing.map(([lng, lat]) => [lat, lng]);
};

const MapActions = ({
  mode,
  drawing,
  points,
  canEdit,
  onStart,
  onFinish,
  onUndo,
  onCancel,
  onClear,
}: {
  mode: WorkspaceMode;
  drawing: boolean;
  points: [number, number][];
  canEdit: boolean;
  onStart: () => void;
  onFinish: () => void;
  onUndo: () => void;
  onCancel: () => void;
  onClear: () => void;
}) => (
  <div className="flex flex-wrap gap-2">
    <button
      type="button"
      className="btn btn-secondary"
      onClick={onStart}
      disabled={!canEdit}
    >
      {mode === "field" ? "Draw Field Boundary" : "Draw Zone"}
    </button>
    <button
      type="button"
      className="btn btn-secondary"
      onClick={onFinish}
      disabled={!drawing}
    >
      Finish Drawing
    </button>
    <button
      type="button"
      className="btn btn-secondary"
      onClick={onUndo}
      disabled={points.length === 0}
    >
      Undo Vertex
    </button>
    <button
      type="button"
      className="btn btn-secondary"
      onClick={onCancel}
      disabled={points.length === 0 && !drawing}
    >
      Cancel Drawing
    </button>
    <button
      type="button"
      className="btn btn-secondary"
      onClick={onClear}
      disabled={points.length === 0}
    >
      Clear
    </button>
  </div>
);

export const MappingWorkspace = () => {
  const [mode, setMode] = useState<WorkspaceMode>("field");
  const [farms, setFarms] = useState<Farm[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState("");
  const [editingFieldId, setEditingFieldId] = useState("");
  const [editingZoneId, setEditingZoneId] = useState("");
  const [fieldForm, setFieldForm] = useState({
    farmId: "",
    name: "",
    cropName: "Cotton",
    season: "Kharif",
    sowingDate: "",
    irrigationMethod: "",
    notes: "",
  });
  const [zoneForm, setZoneForm] = useState({
    name: "",
    color: colors[0],
    notes: "",
    rows: "1",
    columns: "2",
  });
  const [points, setPoints] = useState<[number, number][]>([]);
  const [drawing, setDrawing] = useState(false);
  const [validated, setValidated] = useState(false);
  const [preview, setPreview] = useState<GridPreview>([]);
  const [loading, setLoading] = useState(true);
  const [authRequired, setAuthRequired] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedZoneId, setSelectedZoneId] = useState("");
  const [loadVersion, setLoadVersion] = useState(0);
  const [persistence, setPersistence] = useState<"mongodb" | "memory" | "">("");

  const loadRecords = async () => {
    setLoading(true);
    setError("");
    setAuthRequired(false);
    const failures: string[] = [];
    try {
      const [farmResult, fieldResult, zoneResult] = await Promise.allSettled([
        api.get("/farms"),
        api.get("/fields"),
        api.get("/zones"),
      ]);

      if (farmResult.status === "fulfilled") {
        try {
          const loadedFarms = parseFarmList(farmResult.value.data);
          setFarms(loadedFarms);
          setFieldForm((form) => ({
            ...form,
            farmId:
              form.farmId || (loadedFarms.length === 1 ? loadedFarms[0].id : ""),
          }));
        } catch (farmError) {
          failures.push(recordLoadError(farmError, "Unable to read saved farms."));
        }
      } else {
        failures.push(recordLoadError(farmResult.reason, "Unable to load saved farms."));
      }

      if (fieldResult.status === "fulfilled") {
        try {
          const loadedFields = parseRecordList<Field>(
            fieldResult.value.data,
            "fields",
          );
          setFields(loadedFields);
          if (
            selectedFieldId &&
            !loadedFields.some((field) => field.id === selectedFieldId)
          ) {
            setSelectedFieldId("");
          }
        } catch (fieldError) {
          failures.push(recordLoadError(fieldError, "Unable to read saved fields."));
        }
      } else {
        failures.push(recordLoadError(fieldResult.reason, "Unable to load saved fields."));
      }

      if (zoneResult.status === "fulfilled") {
        try {
          setZones(parseRecordList<Zone>(zoneResult.value.data, "zones"));
        } catch (zoneError) {
          failures.push(recordLoadError(zoneError, "Unable to read saved zones."));
        }
      } else {
        failures.push(recordLoadError(zoneResult.reason, "Unable to load saved zones."));
      }
      setAuthRequired(
        [farmResult, fieldResult, zoneResult].some(
          (result) => result.status === "rejected" && isUnauthorized(result.reason),
        ),
      );
      if (failures.length) setError(failures.join(" "));
    } finally {
      setLoading(false);
      setLoadVersion((version) => version + 1);
    }
  };

  useEffect(() => {
    void loadRecords();
    // Tell the user honestly whether saves are durable.
    api
      .get("/health")
      .then((response) => {
        const mode = response?.data?.persistence;
        if (mode === "mongodb" || mode === "memory") setPersistence(mode);
      })
      .catch(() => undefined);
  }, []);

  const selectedField = fields.find((field) => field.id === selectedFieldId);
  const selectedFarm = farms.find(
    (farm) => farm.id === (mode === "field" ? fieldForm.farmId : selectedField?.farmId),
  );
  const selectedZones = useMemo(
    () => zones.filter((zone) => zone.fieldId === selectedFieldId),
    [zones, selectedFieldId],
  );
  const selectedFieldPoints = useMemo(
    () => toMapPoints(selectedField?.boundary),
    [selectedField],
  );
  const overlays = useMemo(() => {
    if (mode === "field") {
      return fields
        .filter((field) => field.id !== editingFieldId)
        .map((field) => ({
          id: field.id,
          name: field.name,
          color: "#358645",
          points: toMapPoints(field.boundary),
        }));
    }
    return [
      ...selectedZones
        .filter((zone) => zone.id !== editingZoneId)
        .map((zone) => ({
          id: zone.id,
          name: zone.name,
          color: zone.color,
          points: toMapPoints(zone.polygon),
          selected: zone.id === selectedZoneId,
        })),
      ...preview.map((zone, index) => ({
        id: `preview-${index}`,
        name: zone.name,
        color: zone.color,
        points: toMapPoints(zone.polygon),
      })),
    ];
  }, [
    mode,
    fields,
    editingFieldId,
    selectedZones,
    editingZoneId,
    selectedZoneId,
    preview,
  ]);

  const selectField = (fieldId: string) => {
    setSelectedFieldId(fieldId);
    setSelectedZoneId("");
    setPoints([]);
    setDrawing(false);
    setValidated(false);
    setEditingZoneId("");
    setPreview([]);
    setNotice("");
    setError("");
  };

  const beginDrawing = () => {
    if (mode === "zone" && !selectedField) {
      setError("Choose a saved field before drawing a management zone.");
      return;
    }
    setPoints([]);
    setValidated(false);
    setDrawing(true);
    setError("");
    setSuccess("");
    setNotice("Click map vertices, then finish and validate the polygon.");
  };

  const finishDrawing = () => {
    try {
      const polygon = toGeoPolygon(points);
      if (mode === "zone") {
        if (!selectedField) throw new Error("Choose a saved field first.");
        validateZonePartition(
          selectedField.boundary,
          [
            ...selectedZones
              .filter((zone) => zone.id !== editingZoneId)
              .map((zone) => zone.polygon),
            polygon,
          ],
          false,
        );
        const area = polygonArea(polygon);
        setNotice(
          `Valid zone within selected field: ${area.hectares.toFixed(2)} ha / ${area.acres.toFixed(2)} acres.`,
        );
      } else {
        const area = polygonArea(polygon);
        setNotice(
          `Boundary validated: ${area.hectares.toFixed(2)} ha / ${area.acres.toFixed(2)} acres.`,
        );
      }
      setValidated(true);
      setDrawing(false);
      setError("");
    } catch (finishError) {
      setValidated(false);
      setError(apiErrorMessage(finishError, "The polygon is invalid."));
    }
  };

  const saveField = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (!farms.some((farm) => farm.id === fieldForm.farmId)) {
        throw new Error("Select a saved farm before saving the field boundary.");
      }
      if (!fieldForm.name.trim()) {
        throw new Error("Enter a field name before saving.");
      }
      if (!fieldForm.cropName.trim() || !fieldForm.season.trim()) {
        throw new Error("Enter both the crop and season before saving.");
      }
      if (!validated || drawing) {
        throw new Error("Finish and validate the field boundary before saving.");
      }
      const payload = {
        ...fieldForm,
        name: fieldForm.name.trim(),
        cropName: fieldForm.cropName.trim(),
        season: fieldForm.season.trim(),
        ...(fieldForm.sowingDate ? {} : { sowingDate: undefined }),
        boundary: toGeoPolygon(points),
      };
      const response = editingFieldId
        ? await api.patch(`/fields/${editingFieldId}`, payload)
        : await api.post("/fields", payload);
      const savedField = response.data.field as Field | undefined;
      if (!savedField?.id) {
        throw new Error("The server did not confirm the saved field.");
      }
      setFields((current) => {
        const updated = current.filter((field) => field.id !== savedField.id);
        return [...updated, savedField];
      });
      setSelectedFieldId(savedField.id);
      setPoints(toMapPoints(savedField.boundary));
      setEditingFieldId(savedField.id);
      setSuccess(
        editingFieldId
          ? "Field boundary updated successfully."
          : "Field boundary saved successfully.",
      );
      await loadRecords();
    } catch (saveError) {
      setError(apiErrorMessage(saveError, "Unable to save the field boundary."));
    } finally {
      setSaving(false);
    }
  };

  const editField = (field: Field) => {
    selectField(field.id);
    setMode("field");
    setEditingFieldId(field.id);
    setFieldForm({
      farmId: field.farmId,
      name: field.name,
      cropName: field.cropName,
      season: field.season,
      sowingDate: field.sowingDate ?? "",
      irrigationMethod: field.irrigationMethod ?? "",
      notes: field.notes ?? "",
    });
    setPoints(toMapPoints(field.boundary));
    setValidated(true);
    setNotice("Editing saved field. Drag vertices or draw a replacement boundary.");
  };

  const saveZone = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      if (!selectedField) throw new Error("Choose a field before saving a zone.");
      if (!validated || drawing) {
        throw new Error("Finish and validate the zone before saving.");
      }
      const payload = {
        fieldId: selectedField.id,
        name: zoneForm.name.trim(),
        color: zoneForm.color,
        notes: zoneForm.notes.trim(),
        polygon: toGeoPolygon(points),
      };
      const response = editingZoneId
        ? await api.patch(`/zones/${editingZoneId}`, payload)
        : await api.post("/zones", payload);
      if (!response.data.zone?.id) {
        throw new Error("The server did not confirm the saved zone.");
      }
      setSuccess(editingZoneId ? "Zone updated successfully." : "Zone saved successfully.");
      setPoints([]);
      setValidated(false);
      setDrawing(false);
      setEditingZoneId("");
      setZoneForm((form) => ({ ...form, name: "", notes: "" }));
      await loadRecords();
    } catch (saveError) {
      setError(apiErrorMessage(saveError, "Unable to save the management zone."));
    } finally {
      setSaving(false);
    }
  };

  const editZone = (zone: Zone) => {
    setMode("zone");
    setSelectedZoneId(zone.id);
    setEditingZoneId(zone.id);
    setZoneForm({
      name: zone.name,
      color: zone.color,
      notes: zone.notes ?? "",
      rows: zoneForm.rows,
      columns: zoneForm.columns,
    });
    setPoints(toMapPoints(zone.polygon));
    setValidated(true);
    setDrawing(false);
    setNotice("Editing saved zone. Drag its vertices, validate, and save changes.");
    setError("");
  };

  const generateGrid = () => {
    if (!selectedField) {
      setError("Choose a saved field before generating zones.");
      return;
    }
    if (selectedZones.length > 0) {
      setError(
        "This field already has saved zones. They will not be overwritten; add zones manually or choose a field without zones for a full grid.",
      );
      return;
    }
    try {
      const rows = Number(zoneForm.rows);
      const columns = Number(zoneForm.columns);
      const partition = splitFieldIntoGridZones(selectedField, rows, columns);
      setPreview(
        partition.polygons.map((polygon, index) => ({
          name: `${selectedField.name} - Zone ${index + 1}`,
          color: colors[index % colors.length],
          polygon,
        })),
      );
      setNotice(
        `Previewed ${partition.polygons.length} clipped zones (${partition.totalAreaHectares.toFixed(2)} ha total); coverage difference ${partition.coverageDifferenceHectares.toFixed(4)} ha.`,
      );
      setError("");
    } catch (splitError) {
      setPreview([]);
      setError(apiErrorMessage(splitError, "Unable to generate a valid grid."));
    }
  };

  const saveGrid = async () => {
    if (!selectedField || preview.length < 2) {
      setError("Generate and validate a grid preview before saving.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      validateZonePartition(
        selectedField.boundary,
        preview.map((zone) => zone.polygon),
      );
      const response = await api.post("/zones/batch", {
        fieldId: selectedField.id,
        zones: preview,
      });
      if (!Array.isArray(response.data.zones) || response.data.zones.length !== preview.length) {
        throw new Error("The server did not confirm every generated zone.");
      }
      setSuccess(`${response.data.zones.length} management zones saved.`);
      setPreview([]);
      await loadRecords();
    } catch (saveError) {
      setError(apiErrorMessage(saveError, "Unable to save generated zones."));
    } finally {
      setSaving(false);
    }
  };

  const handleOverlayClick = (id: string) => {
    if (mode === "zone") {
      const zone = selectedZones.find((entry) => entry.id === id);
      if (!zone) return;
      setSelectedZoneId(zone.id);
      setNotice(
        `Selected ${zone.name}. Choose Edit on its card to rename it or change its shape.`,
      );
      return;
    }
    const field = fields.find((entry) => entry.id === id);
    if (field) editField(field);
  };

  const startDrawingAtCurrentLocation = () => {
    if (mode === "zone") return;
    if (!fieldForm.farmId) {
      setError("Select a saved farm first, then start drawing the boundary.");
      return;
    }
    setPoints([]);
    setValidated(false);
    setEditingFieldId("");
    setDrawing(true);
    setError("");
    setSuccess("");
    setNotice(
      "Drawing started. Click the map to trace the real field edges around your location; the GPS marker is not part of the boundary.",
    );
  };

  const deleteZone = async (zone: Zone) => {
    if (!window.confirm(`Delete ${zone.name}? This cannot be undone.`)) return;
    setError("");
    try {
      await api.delete(`/zones/${zone.id}`);
      setZones((current) => current.filter((entry) => entry.id !== zone.id));
      setSelectedZoneId((current) => (current === zone.id ? "" : current));
      setSuccess(`${zone.name} deleted.`);
    } catch (deleteError) {
      setError(apiErrorMessage(deleteError, "Unable to delete the zone."));
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm uppercase tracking-[0.15em] text-field-700">
          Field management
        </p>
        <h2 className="mt-1 text-3xl font-black text-slate-900">
          Mapping workspace
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Use one map for field boundaries and management zones. Map geometry
          does not identify soil variability.
        </p>
      </header>
      {persistence === "memory" ? (
        <p
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          The server is not connected to MongoDB, so saved fields and zones are
          kept in server memory only and will be lost when the server
          restarts. Start MongoDB (or set MONGODB_URI) for durable storage.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2" role="group" aria-label="Mapping mode">
        <button
          type="button"
          className={mode === "field" ? "btn btn-primary" : "btn btn-secondary"}
          aria-pressed={mode === "field"}
          onClick={() => {
            setMode("field");
            setPoints(selectedField ? toMapPoints(selectedField.boundary) : []);
            setEditingFieldId("");
            setEditingZoneId("");
            setValidated(false);
            setDrawing(false);
            setPreview([]);
            setError("");
            setNotice("Field boundary mode selected. Draw or edit a field boundary.");
          }}
        >
          Field Boundary mode
        </button>
        <button
          type="button"
          className={mode === "zone" ? "btn btn-primary" : "btn btn-secondary"}
          aria-pressed={mode === "zone"}
          onClick={() => {
            setMode("zone");
            setPoints([]);
            setEditingFieldId("");
            setEditingZoneId("");
            setValidated(false);
            setDrawing(false);
            setPreview([]);
            setError("");
            setNotice("Management zone mode selected. Choose a saved field to continue.");
          }}
        >
          Management Zone mode
        </button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <form
          className="card space-y-4 p-5"
          onSubmit={mode === "field" ? saveField : saveZone}
          onInvalidCapture={(event) => {
            event.preventDefault();
            const control = event.target as
              | HTMLInputElement
              | HTMLSelectElement;
            const messages: Record<string, string> = {
              farmId: "Select a saved farm before saving the field boundary.",
              fieldId: "Select a saved field before creating a zone.",
              name: mode === "field"
                ? "Enter a field name before saving."
                : "Enter a zone name before saving.",
              cropName: "Enter the crop before saving the field boundary.",
              season: "Enter the season before saving the field boundary.",
            };
            setError(
              messages[control.name] ??
                control.validationMessage ??
                "Complete the required fields before saving.",
            );
          }}
        >
          <h3 className="text-xl font-bold text-slate-900">
            {mode === "field"
              ? editingFieldId
                ? "Edit field boundary"
                : "Save field boundary"
              : editingZoneId
                ? "Edit management zone"
                : "Create management zone"}
          </h3>
          {mode === "field" ? (
            <>
              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-1 block">Associated farm</span>
                <select
                  className="input"
                  name="farmId"
                  value={fieldForm.farmId}
                  onChange={(event) =>
                    setFieldForm({ ...fieldForm, farmId: event.target.value })
                  }
                  required
                >
                  <option value="">
                    {loading
                      ? "Loading saved farms…"
                      : farms.length
                        ? "Select a saved farm"
                        : "No saved farms available"}
                  </option>
                  {farms.map((farm) => (
                    <option key={farm.id} value={farm.id}>
                      {farm.name} · {farm.district}
                    </option>
                  ))}
                </select>
              </label>
              {!loading && farms.length === 0 && !authRequired ? (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  {error
                    ? "Saved farms could not be loaded. See the error below, then use Refresh."
                    : "Boundaries are saved against a farm. "}
                  {!error && (
                    <a className="font-semibold underline" href="/farms">
                      Add a farm first
                    </a>
                  )}
                </p>
              ) : null}
              {authRequired ? (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  Sign in to see farms and fields saved to your account.{" "}
                  <a className="font-semibold underline" href="/login">
                    Sign in
                  </a>
                </p>
              ) : null}
              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-1 block">Saved fields</span>
                <select
                  className="input"
                  name="fieldId"
                  value={selectedFieldId}
                  onChange={(event) => {
                    const field = fields.find((entry) => entry.id === event.target.value);
                    if (field) editField(field);
                    else {
                      selectField("");
                      setPoints([]);
                      setEditingFieldId("");
                      setFieldForm((form) => ({
                        ...form,
                        name: "",
                        sowingDate: "",
                        irrigationMethod: "",
                        notes: "",
                      }));
                    }
                  }}
                >
                  <option value="">Create new field or select an existing field</option>
                  {fields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-1 block">Field name</span>
                <input
                  className="input"
                  name="name"
                  value={fieldForm.name}
                  onChange={(event) => setFieldForm({ ...fieldForm, name: event.target.value })}
                  required
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  <span className="mb-1 block">Crop</span>
                  <input
                    className="input"
                    name="cropName"
                    value={fieldForm.cropName}
                    onChange={(event) => setFieldForm({ ...fieldForm, cropName: event.target.value })}
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  <span className="mb-1 block">Season</span>
                  <input
                    className="input"
                    name="season"
                    value={fieldForm.season}
                    onChange={(event) => setFieldForm({ ...fieldForm, season: event.target.value })}
                    required
                  />
                </label>
              </div>
              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-1 block">Sowing date</span>
                <input
                  className="input"
                  type="date"
                  value={fieldForm.sowingDate}
                  onChange={(event) => setFieldForm({ ...fieldForm, sowingDate: event.target.value })}
                />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-1 block">Irrigation method</span>
                <input
                  className="input"
                  value={fieldForm.irrigationMethod}
                  onChange={(event) => setFieldForm({ ...fieldForm, irrigationMethod: event.target.value })}
                />
              </label>
            </>
          ) : (
            <>
              <label className="block text-sm font-medium text-slate-700">
                <span className="mb-1 block">Choose field</span>
                <select
                  className="input"
                  value={selectedFieldId}
                  onChange={(event) => selectField(event.target.value)}
                  required
                >
                  <option value="">
                    {loading
                      ? "Loading saved fields…"
                      : error
                        ? "Saved fields could not be loaded"
                        : fields.length
                          ? "Select a saved field"
                          : "No saved fields available"}
                  </option>
                  {fields.map((field) => (
                    <option key={field.id} value={field.id}>{field.name}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void loadRecords()}
                disabled={loading}
              >
                {loading ? "Loading fields…" : "Reload saved fields"}
              </button>
              {authRequired ? (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  Sign in to see fields saved to your account.{" "}
                  <a className="font-semibold underline" href="/login">
                    Sign in
                  </a>
                </p>
              ) : null}
              {fields.length === 0 && !loading && !error ? (
                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                  Save a field boundary before creating management zones.
                </p>
              ) : null}
              {selectedField && selectedFieldPoints.length < 3 ? (
                <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
                  This field has no valid boundary. Edit and save its boundary first.
                </p>
              ) : null}
              {mode === "zone" && (
                <>
                  <label className="block text-sm font-medium text-slate-700">
                    <span className="mb-1 block">Zone name</span>
                    <input
                      className="input"
                      name="name"
                      value={zoneForm.name}
                      onChange={(event) => setZoneForm({ ...zoneForm, name: event.target.value })}
                      required={!preview.length}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    <span className="mb-1 block">Zone color</span>
                    <input
                      type="color"
                      className="h-11 w-full rounded-xl border border-slate-200"
                      value={zoneForm.color}
                      onChange={(event) => setZoneForm({ ...zoneForm, color: event.target.value })}
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    <span className="mb-1 block">Notes</span>
                    <textarea
                      className="input"
                      value={zoneForm.notes}
                      onChange={(event) => setZoneForm({ ...zoneForm, notes: event.target.value })}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-sm font-medium text-slate-700">
                      <span className="mb-1 block">Grid rows (1–20)</span>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        max="20"
                        step="1"
                        value={zoneForm.rows}
                        onChange={(event) => setZoneForm({ ...zoneForm, rows: event.target.value })}
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      <span className="mb-1 block">Grid columns (1–20)</span>
                      <input
                        className="input"
                        type="number"
                        min="1"
                        max="20"
                        step="1"
                        value={zoneForm.columns}
                        onChange={(event) => setZoneForm({ ...zoneForm, columns: event.target.value })}
                      />
                    </label>
                  </div>
                </>
              )}
            </>
          )}
          <MapActions
            mode={mode}
            drawing={drawing}
            points={points}
            canEdit={mode === "field" ? Boolean(fieldForm.farmId) : Boolean(selectedField && selectedFieldPoints.length >= 3)}
            onStart={beginDrawing}
            onFinish={finishDrawing}
            onUndo={() => {
              setPoints((current) => current.slice(0, -1));
              setValidated(false);
            }}
            onCancel={() => {
              if (mode === "field" && editingFieldId) {
                const original = fields.find((field) => field.id === editingFieldId);
                if (original) setPoints(toMapPoints(original.boundary));
              } else setPoints([]);
              setDrawing(false);
              setValidated(false);
            }}
            onClear={() => {
              setPoints([]);
              setValidated(false);
              setDrawing(false);
            }}
          />
          {!(mode === "field"
            ? Boolean(fieldForm.farmId)
            : Boolean(selectedField && selectedFieldPoints.length >= 3)) && (
            <p className="text-xs text-slate-500">
              {mode === "field"
                ? "Select a saved farm to enable drawing."
                : "Select a saved field with a valid boundary to enable drawing."}
            </p>
          )}
          {mode === "zone" && (
            <div className="flex flex-wrap gap-2">
              <button className="btn btn-secondary" type="button" onClick={generateGrid}>
                Preview grid zones
              </button>
              {preview.length > 0 && (
                <>
                  <button className="btn btn-primary" type="button" disabled={saving} onClick={() => void saveGrid()}>
                    Save previewed zones
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={() => setPreview([])}>
                    Cancel preview
                  </button>
                </>
              )}
            </div>
          )}
          {notice && <p role="status" className="text-sm text-field-700">{notice}</p>}
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          {success && <p role="status" className="text-sm text-field-700">{success}</p>}
          <button
            className="btn btn-primary w-full"
            type="submit"
            disabled={saving || (mode === "zone" && preview.length > 0)}
          >
            {saving ? "Saving…" : mode === "field" ? (editingFieldId ? "Update Field Boundary" : "Save Field Boundary") : (editingZoneId ? "Save Zone Changes" : "Save Zone")}
          </button>
          <p className="text-xs text-slate-500">
            GeoJSON coordinates are saved in [longitude, latitude] order. Zone
            areas are geometry estimates, not measured soil zones.
          </p>
        </form>

        <section className="card p-4 sm:p-5">
          <h3 className="text-xl font-bold text-slate-900">
            {mode === "field" ? "Field boundary map" : "Management zones map"}
          </h3>
          <div className="mt-3">
            <MapEditor
              points={points}
              onChange={(nextPoints) => {
                setPoints(nextPoints);
                setValidated(false);
              }}
              referencePoints={mode === "zone" ? selectedFieldPoints : []}
              color={mode === "field" ? "#358645" : zoneForm.color}
              drawingActive={drawing}
              overlays={overlays}
              onOverlayClick={handleOverlayClick}
              onCurrentLocation={
                mode === "field" ? startDrawingAtCurrentLocation : undefined
              }
              fitKey={`${mode}|${selectedFieldId}|${editingFieldId}|${editingZoneId}|${
                mode === "field" ? fieldForm.farmId : ""
              }|${loadVersion}`}
              initialCenter={
                selectedFarm?.coordinates
                  ? [selectedFarm.coordinates.lat, selectedFarm.coordinates.lng]
                  : undefined
              }
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            {mode === "zone" && selectedField && (
              <span className="rounded bg-slate-100 px-2 py-1">
                Dashed outline: {selectedField.name}
              </span>
            )}
            {overlays.map((overlay) => (
              <span
                key={overlay.id}
                className="rounded px-2 py-1 text-white"
                style={{ backgroundColor: overlay.color }}
              >
                {overlay.name}
              </span>
            ))}
          </div>
        </section>
      </div>

      <section className="card p-5">
        <h3 className="text-xl font-bold text-slate-900">
          {mode === "field" ? "Saved fields" : "Saved zones"}
        </h3>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500" role="status">Loading saved mapping data…</p>
        ) : mode === "field" ? (
          fields.length ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {fields.map((field) => (
                <button
                  key={field.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-field-500"
                  type="button"
                  onClick={() => editField(field)}
                >
                  <span className="font-semibold text-slate-800">{field.name}</span>
                  <span className="mt-1 block text-sm text-slate-600">{field.areaHectares.toFixed(2)} ha · {field.cropName} · Edit</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              {authRequired ? (
                <>
                  Sign in to load saved fields.{" "}
                  <a className="font-semibold underline" href="/login">
                    Sign in
                  </a>
                </>
              ) : error ? (
                "Saved fields could not be loaded. Check the error above and retry."
              ) : (
                "No saved fields yet. Draw and save a valid field boundary."
              )}
            </p>
          )
        ) : selectedField ? (
          selectedZones.length ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {selectedZones.map((zone) => (
                <article
                  key={zone.id}
                  aria-current={zone.id === selectedZoneId ? "true" : undefined}
                  className={`cursor-pointer rounded-xl border bg-slate-50 p-4 ${
                    zone.id === selectedZoneId
                      ? "border-field-600 ring-2 ring-field-500"
                      : "border-slate-200"
                  }`}
                  onClick={() => setSelectedZoneId(zone.id)}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: zone.color }} />
                    <strong>{zone.name}</strong>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{zone.areaHectares.toFixed(2)} ha · {zone.areaAcres.toFixed(2)} acres</p>
                  <div className="mt-3 flex gap-2">
                    <button className="btn btn-secondary" type="button" onClick={(event) => { event.stopPropagation(); editZone(zone); }}>Edit</button>
                    <button className="btn btn-secondary" type="button" onClick={(event) => { event.stopPropagation(); void deleteZone(zone); }}>Delete</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No saved zones for this field.</p>
          )
        ) : (
          <p className="mt-3 text-sm text-slate-500">Choose a saved field to view its zones.</p>
        )}
      </section>
      <button
        type="button"
        className="btn btn-secondary"
        onClick={() => void loadRecords()}
        disabled={loading}
      >
        Refresh saved fields and zones
      </button>
    </div>
  );
};
