import { useEffect, useState } from "react";
import { Navigate, Outlet, Route, Routes, useNavigate } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Droplets,
  Leaf,
  MapPinned,
  Sprout,
  Tractor,
} from "lucide-react";
import { Layout } from "./components/Layout";
import { CottonIssueGuide } from "./components/CottonIssueGuide";
import { MapEditor } from "./components/MapEditor";
import { MappingWorkspace } from "./components/MappingWorkspace";
import {
  buildCottonCalendar,
  cottonCalendarTemplates,
  isValidCalendarDate,
  type CalendarTask,
} from "./lib/cottonCalendar";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { api, apiErrorMessage } from "./lib/api";
import { parseFarmList } from "./lib/farms";
import {
  polygonArea,
  splitFieldIntoGridZones,
  toGeoPolygon,
  validateZonePartition,
} from "./lib/geometry";
import type {
  DashboardSummary,
  Farm,
  FertilizerPlan,
  Field,
  SoilSample,
  Zone,
} from "./types";

const cardClass = "card p-5";
const zoneColors = [
  "#4AA85A",
  "#D97706",
  "#2563EB",
  "#9333EA",
  "#DB2777",
  "#0D9488",
  "#DC2626",
  "#4F46E5",
];

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-lg font-medium text-slate-700">
        Loading your farm workspace…
      </div>
    );
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />;
};

const LandingPage = () => (
  <div className="min-h-screen bg-gradient-to-br from-field-50 via-white to-soil-50">
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-field-600 text-white shadow-soft">
          <Leaf className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.15em] text-field-700">
            AgriCotton AI
          </p>
          <h1 className="text-xl font-bold text-slate-800">
            Map Your Field. Understand Your Soil.
          </h1>
        </div>
      </div>
      <div className="flex gap-3">
        <a href="/login" className="btn btn-secondary">
          Login
        </a>
        <a href="/register" className="btn btn-primary">
          Get Started
        </a>
      </div>
    </header>

    <main className="mx-auto grid max-w-6xl gap-8 px-6 pb-16 pt-10 lg:grid-cols-[1.2fr_0.8fr]">
      <section>
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-field-200 bg-field-50 px-3 py-1 text-sm font-medium text-field-700">
          <CheckCircle2 className="h-4 w-4" />
          Smart cotton farming and precision agriculture
        </div>
        <h2 className="max-w-xl text-5xl font-black tracking-tight text-slate-900">
          Grow better cotton with zone-wise field intelligence.
        </h2>
        <p className="mt-5 max-w-xl text-lg text-slate-600">
          AgriCotton AI helps farmers map field boundaries, monitor soil health,
          create fertilizer plans, and manage every cotton zone with confidence.
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <a href="/register" className="btn btn-primary px-6 py-3 text-base">
            Register Now
          </a>
          <a href="/login" className="btn btn-secondary px-6 py-3 text-base">
            Sign In
          </a>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            { label: "Mapped fields", value: "146+" },
            { label: "Soil samples", value: "1.2k" },
            { label: "Growth improvement", value: "18%" },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft"
            >
              <p className="text-3xl font-black text-field-700">{stat.value}</p>
              <p className="mt-1 text-sm text-slate-600">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-[32px] border border-field-200 bg-white p-6 shadow-soft">
        <div className="grid gap-4">
          {[
            {
              icon: MapPinned,
              title: "Field mapping",
              description:
                "Map and validate your field boundaries with GeoJSON and area calculations.",
            },
            {
              icon: Droplets,
              title: "Soil health",
              description:
                "Track pH, NPK, and crop recommendation data for each management zone.",
            },
            {
              icon: Tractor,
              title: "Fertilizer planning",
              description:
                "Plan nutrient applications using zone-specific guidance.",
            },
          ].map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-field-100 text-field-700">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  </div>
);

const InputField = ({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  min?: string;
  step?: string;
}) => (
  <label className="block text-sm font-medium text-slate-700">
    <span className="mb-1 block">{label}</span>
    <input
      className="input"
      type={type}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      required={required}
      min={min}
      step={step}
    />
  </label>
);

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("demo@agricotton.ai");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setError("");
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err, "Unable to login."));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-field-600 text-white">
            <Leaf className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-field-700">
              AgriCotton AI
            </p>
            <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <InputField
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            placeholder="farmer@agri.com"
          />
          <InputField
            label="Password"
            value={password}
            onChange={setPassword}
            type="password"
            placeholder="••••••••"
          />
          {error ? (
            <p className="text-sm font-medium text-rose-600">{error}</p>
          ) : null}
          <button className="btn btn-primary w-full" type="submit">
            Login
          </button>
        </form>

        <p className="mt-5 text-sm text-slate-600">
          Need an account?{" "}
          <a className="font-semibold text-field-700" href="/register">
            Register
          </a>
        </p>
      </div>
    </div>
  );
};

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setError("");
      await register(name, email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(apiErrorMessage(err, "Unable to create account."));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-field-600 text-white">
            <Leaf className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.15em] text-field-700">
              AgriCotton AI
            </p>
            <h1 className="text-2xl font-bold text-slate-900">
              Create account
            </h1>
          </div>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <InputField
            label="Full name"
            value={name}
            onChange={setName}
            placeholder="Asha Kumar"
          />
          <InputField
            label="Email"
            value={email}
            onChange={setEmail}
            type="email"
            placeholder="farmer@agri.com"
          />
          <InputField
            label="Password"
            value={password}
            onChange={setPassword}
            type="password"
            placeholder="At least 6 characters"
          />
          {error ? (
            <p className="text-sm font-medium text-rose-600">{error}</p>
          ) : null}
          <button className="btn btn-primary w-full" type="submit">
            Register
          </button>
        </form>
        <p className="mt-5 text-sm text-slate-600">
          Already registered?{" "}
          <a className="font-semibold text-field-700" href="/login">
            Login
          </a>
        </p>
      </div>
    </div>
  );
};

const StatCard = ({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) => (
  <div className={cardClass}>
    <p className="text-sm text-slate-500">{title}</p>
    <p className="mt-4 text-3xl font-black text-slate-900">{value}</p>
    <p className="mt-1 text-xs text-slate-500">{hint}</p>
  </div>
);

const DashboardPage = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);

  useEffect(() => {
    void api
      .get("/dashboard")
      .then((response) => setSummary(response.data))
      .catch(() =>
        setSummary({
          farms: 0,
          fields: 0,
          mappedArea: 0,
          managementZones: 0,
          soilSamples: 0,
          upcomingCropActivities: [],
          recentFertilizerPlans: [],
          recentFieldActivity: [],
          quickActions: [],
        }),
      );
  }, []);

  if (!summary) {
    return <div className="text-slate-500">Loading dashboard…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.15em] text-field-700">
            Overview
          </p>
          <h2 className="text-3xl font-black text-slate-900">Dashboard</h2>
        </div>
        <div className="rounded-full border border-field-200 bg-field-50 px-3 py-1 text-sm font-medium text-field-700">
          Demo data in view
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Total farms"
          value={String(summary.farms)}
          hint="Active farm locations"
        />
        <StatCard
          title="Total fields"
          value={String(summary.fields)}
          hint="Mapped field blocks"
        />
        <StatCard
          title="Mapped area"
          value={`${summary.mappedArea.toFixed(1)} ha`}
          hint="Across all fields"
        />
        <StatCard
          title="Zones"
          value={String(summary.managementZones)}
          hint="Management zones"
        />
        <StatCard
          title="Soil samples"
          value={String(summary.soilSamples)}
          hint="Recorded samples"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="card p-5">
          <h3 className="text-xl font-bold text-slate-900">
            Upcoming crop activities
          </h3>
          <div className="mt-4 space-y-3">
            {summary.upcomingCropActivities.length > 0 ? (
              summary.upcomingCropActivities.map((activity) => (
                <div
                  key={`${activity.title}-${activity.date}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div>
                    <p className="font-semibold text-slate-800">
                      {activity.title}
                    </p>
                    <p className="text-sm text-slate-500">{activity.zone}</p>
                  </div>
                  <span className="rounded-full bg-field-100 px-2.5 py-1 text-xs font-semibold text-field-700">
                    {activity.date}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No activities scheduled yet.
              </p>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-xl font-bold text-slate-900">Quick actions</h3>
          <div className="mt-4 space-y-2">
            {summary.quickActions.length > 0 ? (
              summary.quickActions.map((action) => (
                <a
                  key={action.label}
                  href={action.target.startsWith("/") ? action.target : "#"}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  {action.label}
                  <ArrowRight className="h-4 w-4" />
                </a>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No quick actions available yet.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-5">
          <h3 className="text-xl font-bold text-slate-900">
            Recent fertilizer plans
          </h3>
          <div className="mt-4 space-y-3">
            {summary.recentFertilizerPlans.length > 0 ? (
              summary.recentFertilizerPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-slate-800">
                      {plan.planName}
                    </p>
                    <span className="text-xs text-slate-500">
                      {plan.applicationDate}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    N {plan.nitrogen} · P {plan.phosphorus} · K {plan.potassium}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">
                No fertilizer plans recorded.
              </p>
            )}
          </div>
        </div>

        <div className="card p-5">
          <h3 className="text-xl font-bold text-slate-900">
            Recent field activity
          </h3>
          <div className="mt-4 space-y-3">
            {summary.recentFieldActivity.length > 0 ? (
              summary.recentFieldActivity.map((entry) => (
                <div
                  key={entry.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3"
                >
                  <p className="font-semibold text-slate-800">{entry.title}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {entry.description}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-500">No recent activity yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const FarmsPage = () => {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [farmError, setFarmError] = useState("");
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [form, setForm] = useState({
    name: "",
    state: "Tamil Nadu",
    district: "",
    locality: "",
    soilType: "",
    irrigation: "",
    notes: "",
  });

  const loadFarms = async () => {
    setLoadingFarms(true);
    setFarmError("");
    try {
      const response = await api.get("/farms");
      setFarms(parseFarmList(response.data));
    } catch (error) {
      setFarmError(apiErrorMessage(error, "Unable to load farms."));
    } finally {
      setLoadingFarms(false);
    }
  };

  useEffect(() => {
    void loadFarms();
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setFormError("");
      setFormSuccess("");
      await api.post("/farms", form);
      setForm({
        name: "",
        state: "Tamil Nadu",
        district: "",
        locality: "",
        soilType: "",
        irrigation: "",
        notes: "",
      });
      setFormSuccess("Farm saved. It is now available in Field Mapping.");
      await loadFarms();
    } catch (error) {
      setFormError(apiErrorMessage(error, "Unable to save farm."));
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={submit} className="card p-5">
        <h2 className="text-2xl font-bold text-slate-900">Add farm</h2>
        <div className="mt-4 grid gap-4">
          <InputField
            label="Farm name"
            value={form.name}
            onChange={(value) => setForm({ ...form, name: value })}
            placeholder="Green Valley Farm"
            required
          />
          <InputField
            label="State"
            value={form.state}
            onChange={(value) => setForm({ ...form, state: value })}
            placeholder="Tamil Nadu"
            required
          />
          <InputField
            label="District"
            value={form.district}
            onChange={(value) => setForm({ ...form, district: value })}
            placeholder="Coimbatore"
            required
          />
          <InputField
            label="Village or locality"
            value={form.locality}
            onChange={(value) => setForm({ ...form, locality: value })}
            placeholder="Pattanam"
            required
          />
          <InputField
            label="Soil type"
            value={form.soilType}
            onChange={(value) => setForm({ ...form, soilType: value })}
            placeholder="Loamy black soil"
          />
          <InputField
            label="Irrigation"
            value={form.irrigation}
            onChange={(value) => setForm({ ...form, irrigation: value })}
            placeholder="Drip irrigation"
          />
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1 block">Notes</span>
            <textarea
              className="input min-h-[100px]"
              value={form.notes}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
              placeholder="Farm notes"
            />
          </label>
          {formError && (
            <p role="alert" className="text-sm text-rose-700">
              {formError}
            </p>
          )}
          {formSuccess && (
            <p role="status" className="text-sm text-field-700">
              {formSuccess}
            </p>
          )}
          <button className="btn btn-primary" type="submit">
            Save farm
          </button>
        </div>
      </form>

      <div className="card p-5">
        <h2 className="text-2xl font-bold text-slate-900">My farms</h2>
        <div className="mt-4 grid gap-4">
          {loadingFarms ? (
            <p role="status" className="text-sm text-slate-500">
              Loading farms…
            </p>
          ) : farmError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              <p role="alert">{farmError}</p>
              <button
                className="btn btn-secondary mt-3"
                type="button"
                onClick={() => void loadFarms()}
              >
                Retry
              </button>
            </div>
          ) : farms.length > 0 ? (
            farms.map((farm) => (
              <div
                key={farm.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-800">
                    {farm.name}
                  </h3>
                  <span className="rounded-full bg-field-100 px-2 py-1 text-xs font-bold text-field-700">
                    {farm.state}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {farm.district}, {farm.locality}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Soil: {farm.soilType ?? "Not entered"} · Irrigation:{" "}
                  {farm.irrigation ?? "Not entered"}
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              No farms yet. Add your first farm to begin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FieldMappingPage = () => {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [loadingFarms, setLoadingFarms] = useState(true);
  const [farmsError, setFarmsError] = useState("");
  const [fields, setFields] = useState<Field[]>([]);
  const [editingFieldId, setEditingFieldId] = useState("");
  const [form, setForm] = useState({
    farmId: "",
    name: "",
    cropName: "Cotton",
    season: "Kharif",
    sowingDate: "",
    notes: "",
    irrigationMethod: "Drip",
  });
  const [boundary, setBoundary] = useState<[number, number][]>([]);
  const [drawingActive, setDrawingActive] = useState(false);
  const [boundaryReady, setBoundaryReady] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadFarms = async () => {
    setLoadingFarms(true);
    setFarmsError("");
    try {
      const response = await api.get("/farms");
      setFarms(parseFarmList(response.data));
    } catch (error) {
      setFarmsError(apiErrorMessage(error, "Unable to load farms."));
    } finally {
      setLoadingFarms(false);
    }
  };

  const loadFields = async () => {
    try {
      const response = await api.get("/fields");
      setFields(response.data.fields ?? []);
    } catch (error) {
      setError(apiErrorMessage(error, "Unable to load fields."));
    }
  };

  useEffect(() => {
    void loadFarms();
    void loadFields();
  }, []);

  const finishBoundary = () => {
    try {
      toGeoPolygon(boundary);
      setDrawingActive(false);
      setBoundaryReady(true);
      setError("");
    } catch (finishError) {
      setBoundaryReady(false);
      setError(apiErrorMessage(finishError, "The boundary is invalid."));
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setError("");
      setSuccess("");
      if (!boundaryReady || drawingActive) {
        throw new Error(
          "Finish and validate the field boundary before saving.",
        );
      }
      const payload = {
        farmId: form.farmId,
        name: form.name.trim(),
        cropName: form.cropName.trim(),
        season: form.season.trim(),
        ...(form.sowingDate ? { sowingDate: form.sowingDate } : {}),
        notes: form.notes,
        irrigationMethod: form.irrigationMethod,
        boundary: toGeoPolygon(boundary),
      };

      if (editingFieldId) {
        await api.patch(`/fields/${editingFieldId}`, payload);
      } else {
        await api.post("/fields", payload);
      }
      setBoundary([]);
      setDrawingActive(false);
      setBoundaryReady(false);
      setForm({
        farmId: "",
        name: "",
        cropName: "Cotton",
        season: "Kharif",
        sowingDate: "",
        notes: "",
        irrigationMethod: "Drip",
      });
      setEditingFieldId("");
      setSuccess("Field boundary saved.");
      await Promise.all([loadFarms(), loadFields()]);
    } catch (submitError) {
      setError(apiErrorMessage(submitError, "Unable to save the field."));
    }
  };

  const editField = (field: Field) => {
    setEditingFieldId(field.id);
    setForm({
      farmId: field.farmId,
      name: field.name,
      cropName: field.cropName,
      season: field.season,
      sowingDate: field.sowingDate ?? "",
      notes: field.notes ?? "",
      irrigationMethod: field.irrigationMethod ?? "",
    });
    const coordinates = field.boundary.coordinates[0] ?? [];
    const ring =
      coordinates.length > 1 &&
      coordinates[0][0] === coordinates[coordinates.length - 1][0] &&
      coordinates[0][1] === coordinates[coordinates.length - 1][1]
        ? coordinates.slice(0, -1)
        : coordinates;
    setBoundary(ring.map(([lng, lat]) => [lat, lng]));
    setDrawingActive(false);
    setBoundaryReady(true);
    setError("");
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <form id="field-mapping-form" onSubmit={submit} className="card p-5">
          <h2 className="text-2xl font-bold text-slate-900">
            Map field boundary
          </h2>
          <div className="mt-4 grid gap-4">
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-1 block">Associated farm</span>
              <select
                required
                disabled={
                  loadingFarms || farmsError !== "" || farms.length === 0
                }
                className="input disabled:cursor-not-allowed disabled:bg-slate-100"
                value={form.farmId}
                onChange={(event) =>
                  setForm({ ...form, farmId: event.target.value })
                }
              >
                <option value="">
                  {loadingFarms
                    ? "Loading farms…"
                    : farmsError
                      ? "Farm list unavailable"
                      : farms.length === 0
                        ? "No farms found"
                        : "Select farm"}
                </option>
                {farms.map((farm) => (
                  <option key={farm.id} value={farm.id}>
                    {farm.name}
                  </option>
                ))}
              </select>
            </label>
            {farmsError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
                <p role="alert">{farmsError}</p>
                <button
                  className="btn btn-secondary mt-2"
                  type="button"
                  onClick={() => void loadFarms()}
                >
                  Retry loading farms
                </button>
              </div>
            ) : !loadingFarms && farms.length === 0 ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p>
                  No farms found for your account.{" "}
                  <a className="font-semibold underline" href="/farms">
                    Create a farm in My Farms
                  </a>
                  , then retry.
                </p>
                <button
                  className="btn btn-secondary mt-2"
                  type="button"
                  onClick={() => void loadFarms()}
                >
                  Refresh farms
                </button>
              </div>
            ) : null}
            <InputField
              label="Field name"
              value={form.name}
              onChange={(value) => setForm({ ...form, name: value })}
              placeholder="North Cotton Block"
              required
            />
            <InputField
              label="Crop name"
              value={form.cropName}
              onChange={(value) => setForm({ ...form, cropName: value })}
              placeholder="Cotton"
              required
            />
            <InputField
              label="Season"
              value={form.season}
              onChange={(value) => setForm({ ...form, season: value })}
              placeholder="Kharif"
              required
            />
            <InputField
              label="Sowing date"
              value={form.sowingDate}
              onChange={(value) => setForm({ ...form, sowingDate: value })}
              type="date"
            />
            <InputField
              label="Irrigation method"
              value={form.irrigationMethod}
              onChange={(value) =>
                setForm({ ...form, irrigationMethod: value })
              }
              placeholder="Drip"
            />
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-1 block">Notes</span>
              <textarea
                className="input min-h-[90px]"
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
                placeholder="Field notes"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-rose-700">
                {error}
              </p>
            )}
            {success && (
              <p role="status" className="text-sm text-field-700">
                {success}
              </p>
            )}
            {editingFieldId && (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  setEditingFieldId("");
                  setBoundary([]);
                  setForm({
                    farmId: "",
                    name: "",
                    cropName: "Cotton",
                    season: "Kharif",
                    sowingDate: "",
                    notes: "",
                    irrigationMethod: "Drip",
                  });
                }}
              >
                Cancel editing
              </button>
            )}
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!boundaryReady || drawingActive}
            >
              {editingFieldId ? "Update field boundary" : "Save field boundary"}
            </button>
          </div>
        </form>

        <div className="card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-900">Map editor</h2>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                if (!editingFieldId) {
                  setBoundary([]);
                  setBoundaryReady(false);
                }
                setDrawingActive(true);
                setError("");
                setSuccess("");
              }}
            >
              Draw Boundary
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={finishBoundary}
            >
              Finish Drawing
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                setBoundary((vertices) => vertices.slice(0, -1));
                setBoundaryReady(false);
              }}
            >
              Undo Last Vertex
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                setDrawingActive(false);
                setBoundaryReady(false);
              }}
            >
              Edit Boundary
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                if (editingFieldId) {
                  const saved = fields.find(
                    (field) => field.id === editingFieldId,
                  );
                  if (saved) editField(saved);
                } else {
                  setBoundary([]);
                  setBoundaryReady(false);
                  setDrawingActive(false);
                }
                setError("");
              }}
            >
              Cancel Drawing
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              onClick={() => {
                setBoundary([]);
                setBoundaryReady(false);
                setDrawingActive(false);
              }}
            >
              Clear Boundary
            </button>
          </div>
          <div className="mt-4">
            <MapEditor
              points={boundary}
              onChange={(vertices) => {
                setBoundary(vertices);
                setBoundaryReady(false);
              }}
              drawingActive={drawingActive}
              onCurrentLocation={(location) => {
                const start: [number, number] = [
                  location.latitude,
                  location.longitude,
                ];
                setBoundary((vertices) => [...vertices, start]);
                setBoundaryReady(false);
                setDrawingActive(true);
              }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <span>
              {drawingActive
                ? "Drawing: active"
                : boundaryReady
                  ? "Boundary: validated"
                  : "Drawing: inactive"}
            </span>
            {boundaryReady && boundary.length >= 3 ? (
              <span className="font-semibold text-field-700">
                Area: {polygonArea(toGeoPolygon(boundary)).hectares.toFixed(2)}{" "}
                ha · {polygonArea(toGeoPolygon(boundary)).acres.toFixed(2)}{" "}
                acres
              </span>
            ) : null}
            <button
              className="btn btn-primary"
              type="submit"
              form="field-mapping-form"
              disabled={!boundaryReady || drawingActive}
            >
              Save Boundary
            </button>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            Click the map to draw the boundary. GeoJSON positions are stored in
            [longitude, latitude] order and validated before saving.
          </p>
        </div>
      </div>

      <div className="card p-5">
        <h2 className="text-2xl font-bold text-slate-900">Saved fields</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {fields.length > 0 ? (
            fields.map((field) => (
              <button
                key={field.id}
                type="button"
                onClick={() => editField(field)}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left hover:border-field-400"
              >
                <p className="text-lg font-semibold text-slate-800">
                  {field.name}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {field.cropName} · {field.season} · {field.areaHectares} ha
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Boundary area: {field.areaAcres.toFixed(2)} acres · Select to
                  edit
                </p>
              </button>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              No mapped fields yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FieldZonesPage = () => {
  const [fields, setFields] = useState<Field[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedField, setSelectedField] = useState("");
  const [mode, setMode] = useState<"manual" | "automatic">("manual");
  const [form, setForm] = useState({
    name: "",
    notes: "",
    color: "#4AA85A",
    splitCount: "2",
  });
  const [boundary, setBoundary] = useState<[number, number][]>([]);
  const [fieldBoundary, setFieldBoundary] = useState<[number, number][]>([]);
  const [drawingActive, setDrawingActive] = useState(false);
  const [boundaryReady, setBoundaryReady] = useState(false);
  const [editingZoneId, setEditingZoneId] = useState("");
  const [generated, setGenerated] = useState<
    { name: string; color: string; polygon: ReturnType<typeof toGeoPolygon> }[]
  >([]);
  const [validation, setValidation] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [fieldRes, zoneRes] = await Promise.all([
        api.get("/fields"),
        api.get("/zones"),
      ]);
      setFields(fieldRes.data.fields ?? []);
      setZones(zoneRes.data.zones ?? []);
    } catch (loadError) {
      setError(apiErrorMessage(loadError, "Unable to load field zones."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const field = fields.find((entry) => entry.id === selectedField);
    if (!field) {
      setFieldBoundary([]);
      setBoundary([]);
      return;
    }

    const coordinates = field.boundary.coordinates[0] ?? [];
    const openRing =
      coordinates.length > 1 &&
      coordinates[0][0] === coordinates[coordinates.length - 1][0] &&
      coordinates[0][1] === coordinates[coordinates.length - 1][1]
        ? coordinates.slice(0, -1)
        : coordinates;
    setFieldBoundary(openRing.map(([lng, lat]) => [lat, lng]));
    setBoundary([]);
    setBoundaryReady(false);
    setDrawingActive(false);
    setEditingZoneId("");
    setGenerated([]);
    setValidation("");
  }, [fields, selectedField]);

  const selectedFieldRecord = fields.find(
    (field) => field.id === selectedField,
  );
  const selectedZones = zones.filter((zone) => zone.fieldId === selectedField);

  const finishManualZone = () => {
    try {
      if (!selectedFieldRecord)
        throw new Error("Select a field before drawing a zone.");
      const polygon = toGeoPolygon(boundary);
      const existingPolygons = selectedZones
        .filter((zone) => zone.id !== editingZoneId)
        .map((zone) => zone.polygon);
      const partition = validateZonePartition(
        selectedFieldRecord!.boundary,
        [...existingPolygons, polygon],
        false,
      );
      const area = partition.areas[partition.areas.length - 1];
      setBoundaryReady(true);
      setDrawingActive(false);
      setValidation(
        `Valid and contained. Zone area: ${area.hectares.toFixed(2)} ha / ${area.acres.toFixed(2)} acres. Manual zones do not require complete field coverage.`,
      );
      setError("");
    } catch (finishError) {
      setBoundaryReady(false);
      setError(apiErrorMessage(finishError, "The zone boundary is invalid."));
    }
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedFieldRecord) {
      setError("Select a field before saving a zone.");
      return;
    }
    try {
      setError("");
      setSuccess("");
      if (!boundaryReady || drawingActive) {
        throw new Error("Finish and validate the zone polygon before saving.");
      }
      const payload = {
        fieldId: selectedField,
        name: form.name.trim(),
        notes: form.notes,
        color: form.color,
        polygon: toGeoPolygon(boundary),
      };
      if (editingZoneId) await api.patch(`/zones/${editingZoneId}`, payload);
      else await api.post("/zones", payload);
      setForm({ ...form, name: "", notes: "" });
      setBoundary([]);
      setBoundaryReady(false);
      setDrawingActive(false);
      setEditingZoneId("");
      setSuccess("Management zone saved.");
      await load();
    } catch (submitError) {
      setError(apiErrorMessage(submitError, "Unable to save the zone."));
    }
  };

  const autoSplit = () => {
    const field = selectedFieldRecord;
    const count = Number(form.splitCount);
    if (!field || !Number.isInteger(count) || count < 2 || count > 20) {
      setError("Select a field and choose between 2 and 20 automatic zones.");
      return;
    }
    if (selectedZones.length > 0) {
      setError(
        "Automatic whole-field splitting requires a field with no existing zones. Existing zones were preserved.",
      );
      return;
    }
    try {
      setError("");
      setSuccess("");
      const partition = splitFieldIntoGridZones(field, count);
      const candidates = partition.polygons.map((polygon, index) => ({
        name: `${field.name} - Zone ${index + 1}`,
        color: zoneColors[index % zoneColors.length],
        polygon,
      }));
      setGenerated(candidates);
      setValidation(
        `${candidates.length} connected grid zones previewed and validated. Area ${partition.totalAreaHectares.toFixed(2)} ha; coverage difference ${partition.coverageDifferenceHectares.toFixed(4)} ha. Tolerance is 0.5% of field area (minimum 0.0001 ha).`,
      );
    } catch (splitError) {
      setError(
        apiErrorMessage(splitError, "Unable to split the field into zones."),
      );
      setGenerated([]);
    }
  };

  const saveGenerated = async () => {
    if (!selectedFieldRecord || generated.length < 2) {
      setError("Generate and validate a preview before saving.");
      return;
    }
    try {
      const partition = validateZonePartition(
        selectedFieldRecord.boundary,
        generated.map((entry) => entry.polygon),
      );
      await api.post("/zones/batch", {
        fieldId: selectedField,
        zones: generated,
      });
      setGenerated([]);
      setSuccess("Generated zones saved.");
      setValidation(
        `Saved ${partition.polygons.length} grid zones (${partition.totalAreaHectares.toFixed(2)} ha total).`,
      );
      await load();
    } catch (saveError) {
      setError(apiErrorMessage(saveError, "Unable to save generated zones."));
    }
  };

  const editZone = (zone: Zone) => {
    const ring = zone.polygon.coordinates[0] ?? [];
    const openRing =
      ring.length > 1 &&
      ring[0][0] === ring[ring.length - 1][0] &&
      ring[0][1] === ring[ring.length - 1][1]
        ? ring.slice(0, -1)
        : ring;
    setEditingZoneId(zone.id);
    setMode("manual");
    setForm({
      ...form,
      name: zone.name,
      color: zone.color,
      notes: zone.notes ?? "",
    });
    setBoundary(openRing.map(([lng, lat]) => [lat, lng]));
    setBoundaryReady(true);
    setDrawingActive(false);
    setValidation(
      "Editing saved zone. Drag vertices, then finish validation before saving.",
    );
    setError("");
  };

  const deleteZone = async (zone: Zone) => {
    if (!window.confirm(`Delete ${zone.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/zones/${zone.id}`);
      setZones((current) => current.filter((entry) => entry.id !== zone.id));
      if (editingZoneId === zone.id) {
        setEditingZoneId("");
        setBoundary([]);
        setBoundaryReady(false);
      }
      setSuccess(`${zone.name} deleted.`);
    } catch (deleteError) {
      setError(apiErrorMessage(deleteError, "Unable to delete zone."));
    }
  };

  const zoneOverlays = [
    ...selectedZones.map((zone) => {
      const ring = zone.polygon.coordinates[0] ?? [];
      const openRing =
        ring.length > 1 &&
        ring[0][0] === ring[ring.length - 1][0] &&
        ring[0][1] === ring[ring.length - 1][1]
          ? ring.slice(0, -1)
          : ring;
      return {
        id: zone.id,
        name: zone.name,
        color: zone.color,
        selected: zone.id === editingZoneId,
        points: openRing.map(([lng, lat]) => [lat, lng] as [number, number]),
      };
    }),
    ...generated.map((zone, index) => ({
      id: `generated-${index}`,
      name: zone.name,
      color: zone.color,
      selected: false,
      points: zone.polygon.coordinates[0]
        .slice(0, -1)
        .map(([lng, lat]) => [lat, lng] as [number, number]),
    })),
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={submit} className="card p-5">
        <h2 className="text-2xl font-bold text-slate-900">
          Create management zone
        </h2>
        <div className="mt-4 grid gap-4">
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1 block">Select field</span>
            <select
              required
              className="input"
              value={selectedField}
              onChange={(event) => setSelectedField(event.target.value)}
            >
              <option value="">Choose field</option>
              {fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              className={
                mode === "manual" ? "btn btn-primary" : "btn btn-secondary"
              }
              type="button"
              onClick={() => {
                setMode("manual");
                setGenerated([]);
              }}
            >
              Manual Mode
            </button>
            <button
              className={
                mode === "automatic" ? "btn btn-primary" : "btn btn-secondary"
              }
              type="button"
              onClick={() => {
                setMode("automatic");
                setDrawingActive(false);
              }}
            >
              Automatic Grid Mode
            </button>
          </div>
          {mode === "manual" && (
            <InputField
              label="Zone name"
              value={form.name}
              onChange={(value) => setForm({ ...form, name: value })}
              placeholder="Zone A - West Section"
              required
            />
          )}
          {mode === "manual" && (
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-1 block">Zone color</span>
              <input
                type="color"
                className="h-12 w-full rounded-xl border border-slate-200 bg-white p-1"
                value={form.color}
                onChange={(event) =>
                  setForm({ ...form, color: event.target.value })
                }
              />
            </label>
          )}
          {mode === "manual" && (
            <label className="block text-sm font-medium text-slate-700">
              <span className="mb-1 block">Zone notes</span>
              <textarea
                className="input min-h-[90px]"
                value={form.notes}
                onChange={(event) =>
                  setForm({ ...form, notes: event.target.value })
                }
                placeholder="Water stress patterns, nutrient demand, etc."
              />
            </label>
          )}
          {mode === "manual" ? (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (!editingZoneId) {
                    setBoundary([]);
                    setBoundaryReady(false);
                  }
                  setDrawingActive(true);
                  setError("");
                }}
              >
                Create Zone
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={finishManualZone}
              >
                Finish Zone
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setBoundary((vertices) => vertices.slice(0, -1));
                  setBoundaryReady(false);
                }}
              >
                Undo Vertex
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setBoundary([]);
                  setBoundaryReady(false);
                  setDrawingActive(false);
                  setEditingZoneId("");
                  setValidation("");
                }}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <label className="label" htmlFor="auto-split-count">
                Number of Zones (2–20)
              </label>
              <div className="flex gap-2">
                <input
                  id="auto-split-count"
                  className="input"
                  type="number"
                  min="2"
                  max="20"
                  step="1"
                  value={form.splitCount}
                  onChange={(event) =>
                    setForm({ ...form, splitCount: event.target.value })
                  }
                />
                <button
                  className="btn btn-secondary whitespace-nowrap"
                  type="button"
                  onClick={autoSplit}
                >
                  Generate Zones
                </button>
              </div>
            </div>
          )}
          <p className="text-xs text-slate-600">
            {mode === "automatic"
              ? "Method: longitude-aligned grid strips clipped to the field. Voronoi splitting is not implemented. Generated zones are only saved after validation and confirmation."
              : "Click Create Zone, draw inside the selected field, then finish and save. Manual zones may leave part of the field uncovered."}
          </p>
          {validation && (
            <p role="status" className="text-sm text-field-700">
              {validation}
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="text-sm text-field-700">
              {success}
            </p>
          )}
          {mode === "manual" ? (
            <button
              className="btn btn-primary"
              type="submit"
              disabled={!boundaryReady || drawingActive}
            >
              {editingZoneId ? "Save Zone Changes" : "Save Zone"}
            </button>
          ) : generated.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <button
                className="btn btn-primary"
                type="button"
                onClick={() => void saveGenerated()}
              >
                Save Generated Zones
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => setGenerated([])}
              >
                Cancel Preview
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={autoSplit}
              >
                Regenerate
              </button>
            </div>
          ) : null}
        </div>
      </form>

      <div className="card p-5">
        <h2 className="text-2xl font-bold text-slate-900">Zone map</h2>
        <div className="mt-4">
          <MapEditor
            points={boundary}
            onChange={(vertices) => {
              setBoundary(vertices);
              setBoundaryReady(false);
            }}
            referencePoints={fieldBoundary}
            color={form.color}
            drawingActive={drawingActive}
            overlays={zoneOverlays}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          <span className="rounded bg-slate-100 px-2 py-1">
            Dashed outline: selected field
          </span>
          {zoneOverlays.map((zone) => (
            <span
              key={zone.id}
              className="rounded px-2 py-1 text-white"
              style={{ backgroundColor: zone.color }}
            >
              {zone.name}
              {zone.selected ? " · selected" : ""}
            </span>
          ))}
        </div>
      </div>

      <div className="card p-5 xl:col-span-2">
        <h2 className="text-2xl font-bold text-slate-900">Saved zones</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {loading ? (
            <p role="status">Loading fields and zones…</p>
          ) : selectedZones.length > 0 ? (
            selectedZones.map((zone) => (
              <div
                key={zone.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="text-lg font-semibold text-slate-800">
                    {zone.name}
                  </p>
                  <span
                    className="h-4 w-4 rounded-full border border-slate-300"
                    style={{ backgroundColor: zone.color }}
                  />
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {zone.areaHectares.toFixed(2)} ha ·{" "}
                  {zone.areaAcres.toFixed(2)} acres
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Zone boundaries are geometry only; soil results require a
                  measured soil sample.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => editZone(zone)}
                  >
                    Edit Zone
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => void deleteZone(zone)}
                  >
                    Delete Zone
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              No zones created yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SoilHealthPage = () => {
  const [fields, setFields] = useState<Field[]>([]);
  const [samples, setSamples] = useState<SoilSample[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [form, setForm] = useState({
    fieldId: "",
    zoneId: "",
    samplingDate: new Date().toISOString().slice(0, 10),
    ph: "",
    electricalConductivity: "",
    organicCarbon: "",
    nitrogen: "",
    phosphorus: "",
    potassium: "",
    notes: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = async () => {
    const [fieldRes, soilRes, zoneRes] = await Promise.all([
      api.get("/fields"),
      api.get("/soil"),
      api.get("/zones"),
    ]);
    setFields(fieldRes.data.fields ?? []);
    setSamples(soilRes.data.soilSamples ?? []);
    setZones(zoneRes.data.zones ?? []);
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setError("");
      setSuccess("");
      const optionalValue = (value: string) =>
        value.trim() === "" ? undefined : Number(value);
      const payload = {
        fieldId: form.fieldId,
        ...(form.zoneId ? { zoneId: form.zoneId } : {}),
        samplingDate: form.samplingDate,
        ...(optionalValue(form.ph) === undefined
          ? {}
          : { ph: optionalValue(form.ph) }),
        ...(optionalValue(form.electricalConductivity) === undefined
          ? {}
          : { electricalConductivity: optionalValue(form.electricalConductivity) }),
        ...(optionalValue(form.organicCarbon) === undefined
          ? {}
          : { organicCarbon: optionalValue(form.organicCarbon) }),
        ...(optionalValue(form.nitrogen) === undefined
          ? {}
          : { nitrogen: optionalValue(form.nitrogen) }),
        ...(optionalValue(form.phosphorus) === undefined
          ? {}
          : { phosphorus: optionalValue(form.phosphorus) }),
        ...(optionalValue(form.potassium) === undefined
          ? {}
          : { potassium: optionalValue(form.potassium) }),
        ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      };
      await api.post("/soil", payload);
      setForm({
        ...form,
        fieldId: "",
        zoneId: "",
        ph: "",
        electricalConductivity: "",
        organicCarbon: "",
        nitrogen: "",
        phosphorus: "",
        potassium: "",
        notes: "",
      });
      setSuccess("Soil sample recorded.");
      await load();
    } catch (submitError) {
      setError(apiErrorMessage(submitError, "Unable to record soil sample."));
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={submit} className="card p-5">
        <h2 className="text-2xl font-bold text-slate-900">Enter soil data</h2>
        <div className="mt-4 grid gap-4">
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1 block">Field</span>
            <select
              required
              className="input"
              value={form.fieldId}
              onChange={(event) =>
                setForm({ ...form, fieldId: event.target.value, zoneId: "" })
              }
            >
              <option value="">Select field</option>
              {fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1 block">Zone (optional)</span>
            <select
              className="input"
              value={form.zoneId}
              onChange={(event) =>
                setForm({ ...form, zoneId: event.target.value })
              }
            >
              <option value="">Whole field / not zone-specific</option>
              {zones
                .filter((zone) => zone.fieldId === form.fieldId)
                .map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
            </select>
          </label>
          <InputField
            label="Sample date"
            value={form.samplingDate}
            onChange={(value) => setForm({ ...form, samplingDate: value })}
            type="date"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <InputField
              label="pH (unitless)"
              value={form.ph}
              onChange={(value) => setForm({ ...form, ph: value })}
              type="number"
              min="0"
              step="0.1"
              placeholder="0–14"
            />
            <InputField
              label="Electrical conductivity (unit not specified by lab)"
              value={form.electricalConductivity}
              onChange={(value) =>
                setForm({ ...form, electricalConductivity: value })
              }
              type="number"
              min="0"
              step="any"
              placeholder="Enter the lab result and its unit in notes"
            />
            <InputField
              label="Organic carbon (%)"
              value={form.organicCarbon}
              onChange={(value) => setForm({ ...form, organicCarbon: value })}
              type="number"
              min="0"
              step="0.01"
              placeholder="For example 0.74"
            />
            <InputField
              label="Nitrogen (mg/kg)"
              value={form.nitrogen}
              onChange={(value) => setForm({ ...form, nitrogen: value })}
              type="number"
              min="0"
              step="any"
              placeholder="Optional"
            />
            <InputField
              label="Phosphorus (mg/kg)"
              value={form.phosphorus}
              onChange={(value) => setForm({ ...form, phosphorus: value })}
              type="number"
              min="0"
              step="any"
              placeholder="Optional"
            />
            <InputField
              label="Potassium (mg/kg)"
              value={form.potassium}
              onChange={(value) => setForm({ ...form, potassium: value })}
              type="number"
              min="0"
              step="any"
              placeholder="Optional"
            />
          </div>
          <p className="text-xs text-slate-500">
            Leave untested parameters empty; empty values are omitted and never
            stored as zero.
          </p>
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1 block">Notes</span>
            <textarea
              className="input min-h-[90px]"
              value={form.notes}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
              placeholder="Soil conditions and recommendations"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-rose-700">
              {error}
            </p>
          )}
          {success && (
            <p role="status" className="text-sm text-field-700">
              {success}
            </p>
          )}
          <button className="btn btn-primary" type="submit">
            Record soil sample
          </button>
        </div>
      </form>

      <div className="card p-5">
        <h2 className="text-2xl font-bold text-slate-900">
          Recent soil samples
        </h2>
        <div className="mt-4 space-y-3">
          {samples.length > 0 ? (
            samples.map((sample) => (
              <div
                key={sample.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800">
                    Sample {sample.samplingDate}
                  </p>
                  <span className="rounded-full bg-field-100 px-2 py-1 text-xs font-semibold text-field-700">
                    pH {sample.ph ?? "—"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  N {sample.nitrogen ?? "—"} · P {sample.phosphorus ?? "—"} · K{" "}
                  {sample.potassium ?? "—"} mg/kg
                </p>
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              No samples have been logged.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FertilizerPlannerPage = () => {
  const [fields, setFields] = useState<Field[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [plans, setPlans] = useState<FertilizerPlan[]>([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    fieldId: "",
    zoneId: "",
    planName: "Zone nutrient plan",
    nitrogen: "",
    phosphorus: "",
    potassium: "",
    applicationDate: "",
    notes: "",
  });

  const load = async () => {
    try {
      const [fieldRes, zoneRes, planRes] = await Promise.all([
        api.get("/fields"),
        api.get("/zones"),
        api.get("/fertilizer"),
      ]);
      setFields(Array.isArray(fieldRes.data?.fields) ? fieldRes.data.fields : []);
      setZones(Array.isArray(zoneRes.data?.zones) ? zoneRes.data.zones : []);
      setPlans(Array.isArray(planRes.data?.plans) ? planRes.data.plans : []);
      setError("");
    } catch (loadError) {
      setError(apiErrorMessage(loadError, "Unable to load fertilizer planner data."));
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");
    try {
      const selectedZone = zones.find(
        (zone) => zone.id === form.zoneId && zone.fieldId === form.fieldId,
      );
      if (!selectedZone) {
        throw new Error("Select a management zone for the chosen field.");
      }
      const rateInputs = [form.nitrogen, form.phosphorus, form.potassium];
      const rates = rateInputs.map(Number);
      if (
        rateInputs.some((value) => !value.trim()) ||
        rates.some((value) => !Number.isFinite(value) || value < 0)
      ) {
        throw new Error("Enter a valid non-negative nutrient rate for N, P, and K.");
      }
      if (!form.applicationDate || !form.planName.trim()) {
        throw new Error("Plan name and application date are required.");
      }
      await api.post("/fertilizer", {
        fieldId: form.fieldId,
        zoneId: selectedZone.id,
        planName: form.planName.trim(),
        nitrogen: rates[0],
        phosphorus: rates[1],
        potassium: rates[2],
        applicationDate: form.applicationDate,
        notes: form.notes,
      });
      setSuccess("Zone nutrient quantities saved.");
      setForm({
        fieldId: "",
        zoneId: "",
        planName: "Zone nutrient plan",
        nitrogen: "",
        phosphorus: "",
        potassium: "",
        applicationDate: "",
        notes: "",
      });
      await load();
    } catch (submitError) {
      setError(apiErrorMessage(submitError, "Unable to save the zone plan."));
    }
  };
  const selectedZone = zones.find(
    (zone) => zone.id === form.zoneId && zone.fieldId === form.fieldId,
  );
  const rates = [form.nitrogen, form.phosphorus, form.potassium].map(Number);
  const selectedArea = selectedZone?.areaHectares ?? 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <form onSubmit={submit} className="card p-5">
        <h2 className="text-2xl font-bold text-slate-900">
          Fertilizer planner
        </h2>
        <div className="mt-4 grid gap-4">
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1 block">Field</span>
            <select
              className="input"
              value={form.fieldId}
              onChange={(event) =>
                setForm({ ...form, fieldId: event.target.value, zoneId: "" })
              }
            >
              <option value="">Select field</option>
              {fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1 block">Management zone and measured area</span>
            <select
              className="input"
              value={form.zoneId}
              onChange={(event) =>
                setForm({ ...form, zoneId: event.target.value })
              }
              required
              disabled={!form.fieldId}
            >
              <option value="">Select a zone</option>
              {zones
                .filter((zone) => zone.fieldId === form.fieldId)
                .map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name} · {zone.areaHectares.toFixed(2)} ha
                  </option>
                ))}
            </select>
          </label>
          <InputField
            label="Plan name"
            value={form.planName}
            onChange={(value) => setForm({ ...form, planName: value })}
            placeholder="Balanced NPK plan"
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <InputField
              label="Nitrogen rate (kg nutrient/ha)"
              value={form.nitrogen}
              onChange={(value) => setForm({ ...form, nitrogen: value })}
              placeholder="Enter locally advised rate"
              type="number"
              min="0"
              step="any"
            />
            <InputField
              label="Phosphorus rate (kg nutrient/ha)"
              value={form.phosphorus}
              onChange={(value) => setForm({ ...form, phosphorus: value })}
              placeholder="Enter locally advised rate"
              type="number"
              min="0"
              step="any"
            />
            <InputField
              label="Potassium rate (kg nutrient/ha)"
              value={form.potassium}
              onChange={(value) => setForm({ ...form, potassium: value })}
              placeholder="Enter locally advised rate"
              type="number"
              min="0"
              step="any"
            />
          </div>
          {selectedZone && (
            <div className="rounded-xl border border-field-200 bg-field-50 p-3 text-sm text-slate-700">
              <p className="font-semibold">
                Estimated nutrient quantities for {selectedZone.name} ({selectedArea.toFixed(2)} ha)
              </p>
              <p className="mt-1">
                N {Number.isFinite(rates[0]) ? (rates[0] * selectedArea).toFixed(2) : "—"} kg · P {Number.isFinite(rates[1]) ? (rates[1] * selectedArea).toFixed(2) : "—"} kg · K {Number.isFinite(rates[2]) ? (rates[2] * selectedArea).toFixed(2) : "—"} kg
              </p>
              <p className="mt-1 text-xs">
                Nutrient quantities only, not commercial fertilizer-product quantities. Rates are user inputs, not recommendations. Confirm a soil-test-based rate and product with a local agricultural expert.
              </p>
            </div>
          )}
          {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
          {success && <p role="status" className="text-sm text-field-700">{success}</p>}
          <InputField
            label="Application date"
            value={form.applicationDate}
            onChange={(value) => setForm({ ...form, applicationDate: value })}
            type="date"
            required
          />
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-1 block">Notes</span>
            <textarea
              className="input min-h-[90px]"
              value={form.notes}
              onChange={(event) =>
                setForm({ ...form, notes: event.target.value })
              }
              placeholder="Application notes and recommendations"
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Save plan
          </button>
        </div>
      </form>

      <div className="card p-5">
        <h2 className="text-2xl font-bold text-slate-900">Saved plans</h2>
        <div className="mt-4 space-y-3">
          {plans.length > 0 ? (
            plans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-slate-800">
                    {plan.planName}
                  </p>
                  <span className="text-xs text-slate-500">
                    {plan.applicationDate}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  N {plan.nitrogen} kg · P {plan.phosphorus} kg · K {plan.potassium} kg
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Zone: {zones.find((zone) => zone.id === plan.zoneId)?.name ?? "No zone name available"}
                </p>
                {plan.notes ? (
                  <p className="mt-1 text-xs text-slate-500">{plan.notes}</p>
                ) : null}
              </div>
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
              No plans saved yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const SowingCalendarPage = () => {
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldId, setFieldId] = useState("");
  const [sowingDate, setSowingDate] = useState("");
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loadingFields, setLoadingFields] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    api
      .get("/fields")
      .then((response) => setFields(response.data.fields ?? []))
      .catch((loadError: unknown) =>
        setError(apiErrorMessage(loadError, "Unable to load saved fields.")),
      )
      .finally(() => setLoadingFields(false));
  }, []);

  useEffect(() => {
    if (!fieldId) {
      setSowingDate("");
      setTasks([]);
      return;
    }
    const selected = fields.find((field) => field.id === fieldId);
    setLoadingPlan(true);
    setError("");
    api
      .get("/calendars", { params: { fieldId } })
      .then((response) => {
        const plan = response.data.plan;
        const date = plan?.sowingDate ?? selected?.sowingDate ?? "";
        setSowingDate(date);
        setTasks(
          date
            ? buildCottonCalendar(date, plan?.tasks ?? [])
            : [],
        );
      })
      .catch((loadError: unknown) =>
        setError(apiErrorMessage(loadError, "Unable to load this field's calendar.")),
      )
      .finally(() => setLoadingPlan(false));
  }, [fieldId, fields]);

  const updateSowingDate = (date: string) => {
    setSowingDate(date);
    setError("");
    setSuccess("");
    if (!date) {
      setTasks([]);
      return;
    }
    if (!isValidCalendarDate(date)) return;
    try {
      setTasks(buildCottonCalendar(date, tasks));
    } catch (calendarError) {
      setError(apiErrorMessage(calendarError, "Unable to recalculate calendar dates."));
    }
  };

  const updateTask = (
    id: string,
    update: Partial<Pick<CalendarTask, "dasStart" | "dasEnd" | "completed">>,
  ) => {
    if (!isValidCalendarDate(sowingDate)) return;
    try {
      const updatedTasks = tasks.map((task) =>
        task.id === id ? { ...task, ...update } : task,
      );
      setTasks(buildCottonCalendar(sowingDate, updatedTasks));
      setError("");
    } catch (calendarError) {
      setError(apiErrorMessage(calendarError, "Invalid task date range."));
    }
  };

  const savePlan = async () => {
    setError("");
    setSuccess("");
    if (!fieldId || !isValidCalendarDate(sowingDate)) {
      setError("Choose a saved field and enter a valid sowing date first.");
      return;
    }
    try {
      setSaving(true);
      const response = await api.put("/calendars", {
        fieldId,
        sowingDate,
        tasks,
      });
      if (!response.data.plan?.id || response.data.plan.fieldId !== fieldId) {
        throw new Error("The server did not confirm the saved calendar.");
      }
      setTasks(buildCottonCalendar(sowingDate, response.data.plan.tasks));
      setSuccess("Calendar saved for this field.");
    } catch (saveError) {
      setError(apiErrorMessage(saveError, "Unable to save this calendar."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <header>
        <h2 className="text-3xl font-black text-slate-900">Cotton crop calendar</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Dates are configurable planning estimates, not validated Tamil Nadu
          crop recommendations. Timing varies by cultivar, weather, irrigation
          and local conditions. Confirm operations with local agricultural
          experts.
        </p>
      </header>
      <section className="card grid gap-4 p-5 md:grid-cols-2">
        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-1 block">Field</span>
          <select
            className="input"
            value={fieldId}
            onChange={(event) => {
              setFieldId(event.target.value);
              setError("");
              setSuccess("");
            }}
            disabled={loadingFields}
          >
            <option value="">
              {loadingFields
                ? "Loading saved fields…"
                : fields.length
                  ? "Select a saved field"
                  : "No saved fields"}
            </option>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>{field.name}</option>
            ))}
          </select>
        </label>
        <label className="block text-sm font-medium text-slate-700">
          <span className="mb-1 block">Actual or planned sowing date</span>
          <input
            type="date"
            className="input"
            value={sowingDate}
            onChange={(event) => updateSowingDate(event.target.value)}
            disabled={!fieldId}
          />
        </label>
        <div className="md:col-span-2">
          <button
            className="btn btn-primary"
            type="button"
            disabled={saving || loadingPlan || !isValidCalendarDate(sowingDate)}
            onClick={() => void savePlan()}
          >
            {saving ? "Saving…" : "Save calendar for selected field"}
          </button>
        </div>
      </section>
      {error && <p className="card p-4 text-sm text-rose-700" role="alert">{error}</p>}
      {success && <p className="card p-4 text-sm text-field-700" role="status">{success}</p>}
      {loadingPlan ? (
        <p className="card p-5 text-sm text-slate-600" role="status">Loading saved calendar…</p>
      ) : !fieldId ? (
        <p className="card p-5 text-sm text-slate-600">
          {fields.length ? "Select a field to build or load its calendar." : "Save a field before creating a calendar."}
        </p>
      ) : !sowingDate || tasks.length === 0 ? (
        <p className="card p-5 text-sm text-slate-600">
          Enter the field's sowing date to generate an estimated crop calendar.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              {tasks.length} estimated activities · {cottonCalendarTemplates.length} planning templates
            </p>
            <p className="text-xs text-slate-500">Dates recalculate when sowing date or DAS offsets change.</p>
          </div>
          <div className="space-y-3">
            {tasks.map((task) => (
              <article key={task.id} className="card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 accent-field-600"
                      aria-label={`Mark ${task.title} complete`}
                      checked={task.completed}
                      onChange={(event) => updateTask(task.id, { completed: event.target.checked })}
                    />
                    <div>
                      <h3 className={`font-semibold ${task.completed ? "text-slate-400 line-through" : "text-slate-800"}`}>
                        {task.title}
                      </h3>
                      <p className="text-sm font-medium text-field-700">{task.stage}</p>
                      <p className="mt-1 max-w-3xl text-sm text-slate-600">{task.description}</p>
                    </div>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-semibold text-slate-800">
                      {task.startDate === task.endDate
                        ? task.startDate
                        : `${task.startDate} – ${task.endDate}`}
                    </p>
                    <p className="text-xs text-slate-500">
                      {task.dasStart === task.dasEnd
                        ? `DAS ${task.dasStart}`
                        : `DAS ${task.dasStart}–${task.dasEnd}`}
                    </p>
                  </div>
                </div>
                <details className="mt-3 text-sm">
                  <summary className="cursor-pointer font-medium text-slate-600">Edit estimated DAS range</summary>
                  <div className="mt-3 grid max-w-sm grid-cols-2 gap-3">
                    <label className="text-xs text-slate-600">
                      Start DAS
                      <input
                        className="input mt-1"
                        type="number"
                        value={task.dasStart}
                        onChange={(event) => updateTask(task.id, { dasStart: Number(event.target.value) })}
                      />
                    </label>
                    <label className="text-xs text-slate-600">
                      End DAS
                      <input
                        className="input mt-1"
                        type="number"
                        value={task.dasEnd}
                        onChange={(event) => updateTask(task.id, { dasEnd: Number(event.target.value) })}
                      />
                    </label>
                  </div>
                </details>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const CottonVarietiesPage = () => {
  const varieties = [
    {
      name: "RCH 659",
      type: "High yield, drought-tolerant",
      notes: "Suitable for irrigated and semi-irrigated zones.",
    },
    {
      name: "BG II Cotton",
      type: "Bollworm resistant",
      notes: "Options with better pest tolerance and fibre quality.",
    },
    {
      name: "Suraj",
      type: "Early maturity variety",
      notes: "Good fit for low rainfall and short-duration cotton windows.",
    },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {varieties.map((variety) => (
        <div key={variety.name} className="card p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-field-100 text-field-700">
            <Sprout className="h-5 w-5" />
          </div>
          <h3 className="mt-4 text-xl font-bold text-slate-900">
            {variety.name}
          </h3>
          <p className="mt-2 text-sm font-medium text-field-700">
            {variety.type}
          </p>
          <p className="mt-2 text-sm text-slate-600">{variety.notes}</p>
        </div>
      ))}
    </div>
  );
};

const PestDiseaseGuidePage = () => <CottonIssueGuide />;

const ReportsPage = () => {
  const reportCards = [
    {
      title: "Field area summary",
      value: "34.8 ha",
      description: "Mapped cultivated area across all active farms.",
    },
    {
      title: "Soil health score",
      value: "82 / 100",
      description:
        "Balanced pH and nutrient profile across recent sample points.",
    },
    {
      title: "Recommended fertilizer schedule",
      value: "3 split applications",
      description: "Based on zone-level nutrient response and crop stage.",
    },
  ];

  return (
    <div className="grid gap-5 md:grid-cols-3">
      {reportCards.map((card) => (
        <div key={card.title} className="card p-5">
          <p className="text-sm text-slate-500">{card.title}</p>
          <p className="mt-4 text-3xl font-black text-slate-900">
            {card.value}
          </p>
          <p className="mt-2 text-sm text-slate-600">{card.description}</p>
        </div>
      ))}
    </div>
  );
};

const ProfilePage = () => {
  const { user } = useAuth();

  return (
    <div className="card p-5">
      <h2 className="text-2xl font-bold text-slate-900">
        Profile and Settings
      </h2>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Name</p>
          <p className="mt-2 text-lg font-semibold text-slate-800">
            {user?.name}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Email</p>
          <p className="mt-2 text-lg font-semibold text-slate-800">
            {user?.email}
          </p>
        </div>
      </div>
    </div>
  );
};

const SettingsPage = () => (
  <div className="card p-5">
    <h2 className="text-2xl font-bold text-slate-900">Farm settings</h2>
    <div className="mt-5 space-y-3">
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <span>Field area precision</span>
        <span className="font-semibold text-field-700">2 decimal places</span>
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <span>Geocoding provider</span>
        <span className="font-semibold text-field-700">
          Optional configuration
        </span>
      </div>
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <span>Notification reminders</span>
        <span className="font-semibold text-field-700">Enabled</span>
      </div>
    </div>
  </div>
);

const App = () => (
  <AuthProvider>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/farms" element={<FarmsPage />} />
          <Route path="/field-mapping" element={<MappingWorkspace />} />
          <Route
            path="/field-zones"
            element={<Navigate to="/field-mapping" replace />}
          />
          <Route path="/soil-health" element={<SoilHealthPage />} />
          <Route
            path="/fertilizer-planner"
            element={<FertilizerPlannerPage />}
          />
          <Route path="/sowing-calendar" element={<SowingCalendarPage />} />
          <Route path="/cotton-varieties" element={<CottonVarietiesPage />} />
          <Route
            path="/pest-disease-guide"
            element={<PestDiseaseGuidePage />}
          />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </AuthProvider>
);

export default App;
