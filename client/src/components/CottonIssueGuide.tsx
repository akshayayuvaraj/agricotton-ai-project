import { useEffect, useState } from "react";
import { Search, ShieldAlert, X } from "lucide-react";
import { api, apiErrorMessage } from "../lib/api";
import type {
  CottonIssue,
  CottonIssueCategory,
  CottonIssueSeverityLevel,
  CottonIssueVerification,
  CottonIssuesResponse,
} from "../types/cottonIssue";

type CategoryFilter = "all" | CottonIssueCategory;

const categoryLabels: Record<CottonIssueCategory, string> = {
  disease: "Disease",
  pest: "Pest",
  crop_disorder: "Crop disorder",
};

const categoryFilters: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "disease", label: "Diseases" },
  { value: "pest", label: "Pests" },
  { value: "crop_disorder", label: "Crop Disorders" },
];

const verificationLabels = {
  verified: "Verified",
  partially_verified: "Partially verified",
  unverified: "Needs verification",
  not_applicable: "Not applicable",
} as const;

const severityConfig: Record<CottonIssueSeverityLevel, {
  label: string;
  badge: string;
}> = {
  low: {
    label: "Low",
    badge: "rounded-full bg-green-100 border border-green-200 px-2 py-1 text-xs font-bold text-green-800",
  },
  moderate: {
    label: "Moderate",
    badge: "rounded-full bg-amber-100 border border-amber-200 px-2 py-1 text-xs font-bold text-amber-800",
  },
  high: {
    label: "High",
    badge: "rounded-full bg-rose-100 border border-rose-200 px-2 py-1 text-xs font-bold text-rose-800",
  },
  not_established: {
    label: "Not established",
    badge: "rounded-full bg-slate-100 border border-slate-200 px-2 py-1 text-xs font-bold text-slate-800",
  },
};

const EvidenceNote = ({
  verification,
  issue,
}: {
  verification: CottonIssueVerification;
  issue: CottonIssue;
}) => {
  const citedSources = issue.referenceSources.filter((source) =>
    verification.sourceIds.includes(source.id),
  );

  return (
    <div className="mt-2 text-xs text-slate-500">
      <span className="font-semibold text-slate-700">
        {verificationLabels[verification.status]}.
      </span>{" "}
      {verification.note}
      {citedSources.length ? (
        <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          {citedSources.map((source) => (
            <a
              key={source.id}
              className="font-medium text-field-700 underline"
              href={source.url}
              target="_blank"
              rel="noreferrer"
            >
              Source: {source.title}
            </a>
          ))}
        </span>
      ) : null}
    </div>
  );
};

const ClaimSection = ({
  title,
  value,
  verification,
  issue,
  missingMessage,
}: {
  title: string;
  value: string | string[];
  verification: CottonIssueVerification;
  issue: CottonIssue;
  missingMessage: string;
}) => {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return (
    <section>
      <h4 className="font-semibold text-slate-800">{title}</h4>
      {values.length ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
          {values.map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-slate-600">{missingMessage}</p>
      )}
      <EvidenceNote verification={verification} issue={issue} />
    </section>
  );
};

const regionStatusLabels = {
  documented_in_tamil_nadu: "Documented in Tamil Nadu guidance",
  not_documented_in_reviewed_sources: "Not documented in reviewed sources",
  not_yet_verified: "Not yet verified",
} as const;

const IssueDetails = ({
  issue,
  onClose,
}: {
  issue: CottonIssue;
  onClose: () => void;
}) => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="cotton-issue-detail-title"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-field-700">
              {categoryLabels[issue.category]}
            </p>
            <h3
              id="cotton-issue-detail-title"
              className="mt-1 text-2xl font-bold text-slate-900"
            >
              {issue.name}
            </h3>
            <p className="mt-1 text-sm italic text-slate-500">
              {issue.scientificName ? (
                <i>{issue.scientificName}</i>
              ) : (
                "No scientific name established in reviewed sources."
              )}
            </p>
            <EvidenceNote
              verification={issue.verification.scientificName}
              issue={issue}
            />
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            onClick={onClose}
            aria-label="Close details"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          <section className="rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="font-semibold text-slate-800">Severity</h4>
                <p className="mt-1 text-sm text-slate-600">
                  {issue.severity.explanation}
                </p>
              </div>
              <span
                className={severityConfig[issue.severity.level].badge}
                title={issue.severity.explanation}
              >
                {severityConfig[issue.severity.level].label}
              </span>
            </div>
            <EvidenceNote
              verification={issue.verification.severity}
              issue={issue}
            />
          </section>
          <ClaimSection
            title="Common symptoms"
            value={issue.commonSymptoms}
            verification={issue.verification.commonSymptoms}
            issue={issue}
            missingMessage="Symptoms still need verification; no supported description is available in the reviewed sources."
          />
          <ClaimSection
            title="Identification tips"
            value={issue.identificationTips}
            verification={issue.verification.identificationTips}
            issue={issue}
            missingMessage="Identification clues need expert review."
          />
          <ClaimSection
            title="Favorable conditions"
            value={issue.favorableConditions}
            verification={issue.verification.favorableConditions}
            issue={issue}
            missingMessage="No contributing conditions are established in the reviewed sources."
          />
          <ClaimSection
            title="Crop stages affected"
            value={issue.cropStagesAffected}
            verification={issue.verification.cropStagesAffected}
            issue={issue}
            missingMessage="Affected growth stages have not been established in the reviewed sources."
          />
          <ClaimSection
            title="Prevention"
            value={issue.prevention}
            verification={issue.verification.prevention}
            issue={issue}
            missingMessage="No prevention information is available."
          />
          <ClaimSection
            title="Integrated management"
            value={issue.integratedManagement}
            verification={issue.verification.integratedManagement}
            issue={issue}
            missingMessage="No issue-specific integrated-management information is available."
          />
          <ClaimSection
            title="Monitoring guidance"
            value={issue.monitoringGuidance}
            verification={issue.verification.monitoringGuidance}
            issue={issue}
            missingMessage="No issue-specific monitoring guidance is available."
          />
          {issue.causalOrganisms.length ? (
            <ClaimSection
              title="Reported causal organisms"
              value={issue.causalOrganisms}
              verification={issue.verification.causalOrganisms}
              issue={issue}
              missingMessage="No causal organisms are established."
            />
          ) : null}
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <h4 className="font-semibold text-slate-800">
              Regional relevance: {issue.regionRelevance.region}
            </h4>
            <p className="mt-1 text-sm text-slate-600">
              {regionStatusLabels[issue.regionRelevance.status]}.{" "}
              {issue.regionRelevance.note}
            </p>
            <EvidenceNote
              verification={issue.verification.tamilNaduOccurrence}
              issue={issue}
            />
          </section>
          {issue.diagnosticNotes.length ? (
            <section>
              <h4 className="font-semibold text-slate-800">
                Diagnostic limitations
              </h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-600">
                {issue.diagnosticNotes.map((note, index) => (
                  <li key={`diagnostic-note-${index}`}>{note}</li>
                ))}
              </ul>
            </section>
          ) : null}
          <section>
            <h4 className="font-semibold text-slate-800">References</h4>
            <ul className="mt-2 space-y-2 text-sm">
              {issue.referenceSources.map((source) => (
                <li key={source.url}>
                  <a
                    className="font-medium text-field-700 underline"
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {source.title}
                  </a>
                  <p className="text-slate-600">
                    {source.publisher} · Accessed {source.accessedAt}.{" "}
                    {source.notes}
                  </p>
                </li>
              ))}
            </ul>
          </section>
          <p className="text-xs text-slate-500">
            Last reviewed: {issue.lastReviewed}. Confirm diagnosis and treatment
            decisions with a local agricultural expert.
          </p>
        </div>
      </section>
    </div>
  );
};

export const CottonIssueGuide = () => {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [severity, setSeverity] = useState("all");
  const [search, setSearch] = useState("");
  const [data, setData] = useState<CottonIssuesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIssue, setSelectedIssue] = useState<CottonIssue | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api
      .get<CottonIssuesResponse>("/cotton-issues", {
        params: { category, severity, search: search.trim() },
        signal: controller.signal,
      })
      .then((response) => setData(response.data))
      .catch((requestError: unknown) => {
        if (!controller.signal.aborted) {
          setError(
            apiErrorMessage(requestError, "Unable to load the cotton library."),
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [category, severity, search, reloadKey]);

  const counts = data?.counts;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.15em] text-field-700">
          Cotton crop protection
        </p>
        <h2 className="mt-1 text-3xl font-black text-slate-900">
          Diseases and pests
        </h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Search a regional reference library. Symptoms and actions are not a
          diagnosis; confirm locally before taking treatment decisions.
        </p>
      </header>

      {counts ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Total records", value: counts.all },
            { title: "Diseases", value: counts.disease },
            { title: "Pests", value: counts.pest },
            { title: "Crop disorders", value: counts.crop_disorder },
          ].map((count) => (
            <div className="card p-4" key={count.title}>
              <p className="text-sm text-slate-500">{count.title}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {count.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      <section
        className="card space-y-4 p-4 sm:p-5"
        aria-label="Library filters"
      >
        <label className="relative block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, symptoms, or scientific name"
            aria-label="Search cotton diseases and pests"
          />
        </label>

        <div className="flex flex-wrap items-center gap-2">
          {categoryFilters.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={category === filter.value}
              onClick={() => setCategory(filter.value)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                category === filter.value
                  ? "border-field-700 bg-field-700 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {filter.label}
            </button>
          ))}
          <label className="ml-auto flex items-center gap-2 text-sm font-medium text-slate-700">
            Severity
            <select
              className="input min-w-40"
              value={severity}
              onChange={(event) => setSeverity(event.target.value)}
              aria-label="Filter by severity"
            >
              <option value="all">All ratings</option>
              <option value="low">Low</option>
              <option value="moderate">Moderate</option>
              <option value="high">High</option>
              <option value="not_established">Not established</option>
            </select>
          </label>
        </div>
      </section>

      {loading ? (
        <p className="card p-5 text-sm text-slate-600" role="status">
          Loading cotton disease and pest library…
        </p>
      ) : error ? (
        <div className="card p-5" role="alert">
          <p className="font-semibold text-rose-700">{error}</p>
          <button
            type="button"
            className="btn btn-secondary mt-3"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Retry
          </button>
        </div>
      ) : data && data.issues.length === 0 ? (
        <p className="card p-5 text-sm text-slate-600" role="status">
          No cotton issues match your search and filters. Try adjusting the
          search term or clearing the category and severity filters.
        </p>
      ) : (
        <>
          <p className="text-sm text-slate-500" aria-live="polite">
            Showing {data?.total ?? 0} matching records. All records are loaded
            without pagination.
          </p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {data?.issues.map((issue) => (
              <article className="card flex flex-col p-5" key={issue.id}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-field-50 px-2.5 py-1 text-xs font-semibold text-field-800">
                      {categoryLabels[issue.category]}
                    </span>
                    <h3 className="mt-3 text-lg font-bold text-slate-900">
                      {issue.name}
                    </h3>
                    <p className="mt-1 text-sm italic text-slate-500">
                      {issue.scientificName ? (
                        <i>{issue.scientificName}</i>
                      ) : (
                        "Scientific name not established"
                      )}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {
                        verificationLabels[
                          issue.verification.scientificName.status
                        ]
                      }{" "}
                      scientific name
                    </p>
                  </div>
                <span
                  className={`shrink-0 ${severityConfig[issue.severity.level].badge}`}
                  title={issue.severity.explanation}
                >
                  {severityConfig[issue.severity.level].label}
                </span>
                </div>
                <p className="mt-4 line-clamp-3 text-sm text-slate-600">
                  {issue.commonSymptoms.length
                    ? issue.commonSymptoms.join(" ")
                    : "Symptoms need verification in reliable issue-specific sources."}
                </p>
                <p className="mt-3 text-xs text-slate-500">
                  Regional status:{" "}
                  {regionStatusLabels[issue.regionRelevance.status]}
                </p>
                <button
                  type="button"
                  className="btn btn-secondary mt-5 w-full"
                  onClick={() => setSelectedIssue(issue)}
                >
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  View full details
                </button>
              </article>
            ))}
          </div>
        </>
      )}

      {selectedIssue ? (
        <IssueDetails
          issue={selectedIssue}
          onClose={() => setSelectedIssue(null)}
        />
      ) : null}
    </div>
  );
};
