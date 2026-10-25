import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { AxiosRequestConfig } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CottonIssueGuide } from "./CottonIssueGuide";
import { api } from "../lib/api";
import type {
  CottonIssue,
  CottonIssueCounts,
  CottonIssueCategory,
} from "../types/cottonIssue";

const counts: CottonIssueCounts = {
  all: 6,
  disease: 2,
  pest: 3,
  crop_disorder: 1,
};

const notEstablishedExplanation =
  "No formal comparable severity rating was established in the reviewed sources for this issue.";

const createIssue = (
  id: string,
  name: string,
  category: CottonIssueCategory,
  overrides: Partial<CottonIssue> = {},
): CottonIssue => ({
  id,
  name,
  scientificName: null,
  category,
  severity: {
    level: "not_established",
    explanation: notEstablishedExplanation,
  },
  commonSymptoms: [],
  identificationTips: [],
  favorableConditions: "",
  cropStagesAffected: [],
  prevention: ["Confirm with a local expert."],
  integratedManagement: ["Confirm with a local expert."],
  monitoringGuidance: ["Scout and seek local advice."],
  regionRelevance: {
    region: "Tamil Nadu, India",
    status: "not_yet_verified",
    note: "Occurrence still needs verification.",
  },
  referenceSources: [
    {
      id: "tnau-cotton-guide",
      title: "TNAU cotton guide",
      publisher: "Tamil Nadu Agricultural University",
      url: "https://agritech.tnau.ac.in/",
      accessedAt: "2026-10-25",
      notes: "Reference.",
    },
  ],
  causalOrganisms: [],
  diagnosticNotes: ["Educational content, not a confirmed diagnosis."],
  verification: {
    scientificName: {
      status: "unverified",
      sourceIds: [],
      note: "Name needs verification.",
    },
    commonSymptoms: {
      status: "unverified",
      sourceIds: [],
      note: "Symptoms need verification.",
    },
    identificationTips: {
      status: "unverified",
      sourceIds: [],
      note: "Identification needs verification.",
    },
    severity: {
      status: "unverified",
      sourceIds: [],
      note: "Severity is not established.",
    },
    tamilNaduOccurrence: {
      status: "unverified",
      sourceIds: [],
      note: "Occurrence needs verification.",
    },
    cropStagesAffected: {
      status: "unverified",
      sourceIds: [],
      note: "Stages need verification.",
    },
    favorableConditions: {
      status: "unverified",
      sourceIds: [],
      note: "Conditions need verification.",
    },
    prevention: {
      status: "unverified",
      sourceIds: [],
      note: "General precaution only.",
    },
    integratedManagement: {
      status: "unverified",
      sourceIds: [],
      note: "General precaution only.",
    },
    monitoringGuidance: {
      status: "unverified",
      sourceIds: [],
      note: "General precaution only.",
    },
    causalOrganisms: {
      status: "unverified",
      sourceIds: [],
      note: "Causal organisms need verification.",
    },
  },
  lastReviewed: "2026-10-24",
  ...overrides,
});

const pinkBollworm = createIssue(
  "pink-bollworm",
  "Pink bollworm",
  "pest",
  {
    scientificName: "Pectinophora gossypiella",
    commonSymptoms: ["Rosetted flowers and damaged bolls."],
  },
);

pinkBollworm.verification.scientificName = {
  status: "verified",
  sourceIds: ["tnau-cotton-guide"],
  note: "Name supported by the cited source.",
};

pinkBollworm.verification.commonSymptoms = {
  status: "verified",
  sourceIds: ["tnau-cotton-guide"],
  note: "Symptoms supported by the cited source.",
};

const records: CottonIssue[] = [
  pinkBollworm,
  createIssue("american-bollworm", "American bollworm", "pest", {
    scientificName: "Helicoverpa armigera",
    commonSymptoms: ["Circular boreholes and frass on bolls."],
  }),
  createIssue("grey-mildew", "Grey mildew", "disease"),
  createIssue("leaf-rust", "Leaf rust", "disease"),
  createIssue("mealybugs", "Mealybugs", "pest"),
  createIssue("leaf-reddening", "Leaf reddening", "crop_disorder"),
];

const installCatalogResponse = () =>
  vi
    .spyOn(api, "get")
    .mockImplementation(
      async (_url: string, config?: AxiosRequestConfig) => {
        const params = (config?.params ?? {}) as Record<string, string>;
        const search = (params.search ?? "").toLocaleLowerCase();

        const filteredIssues = records.filter((issue) => {
          const categoryMatch =
            !params.category ||
            params.category === "all" ||
            issue.category === params.category;

          const severityMatch =
            !params.severity ||
            params.severity === "all" ||
            issue.severity.level === params.severity;

          const searchableText = [
            issue.name,
            issue.scientificName ?? "",
            ...issue.commonSymptoms,
          ]
            .join(" ")
            .toLocaleLowerCase();

          return (
            categoryMatch &&
            severityMatch &&
            (!search || searchableText.includes(search))
          );
        });

        return {
          data: {
            issues: filteredIssues,
            total: filteredIssues.length,
            counts,
          },
        } as never;
      },
    );

const findDetailButtons = () =>
  screen.findAllByRole("button", {
    name: /view full details/i,
  });

const openFirstDetailsDialog = async () => {
  const buttons = await findDetailButtons();

  expect(buttons.length).toBeGreaterThan(0);
  fireEvent.click(buttons[0]);

  return screen.findByRole("dialog");
};

describe("CottonIssueGuide", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows all returned records and the total and category counts", async () => {
    installCatalogResponse();
    render(<CottonIssueGuide />);

    expect(
      await screen.findByText(
        "Showing 6 matching records. All records are loaded without pagination.",
      ),
    ).toBeInTheDocument();

    for (const name of [
      "Pink bollworm",
      "American bollworm",
      "Grey mildew",
      "Leaf rust",
      "Mealybugs",
      "Leaf reddening",
    ]) {
      expect(screen.getByRole("heading", { name })).toBeInTheDocument();
    }

    expect(screen.getByText("Total records")).toBeInTheDocument();
    expect(screen.getByText("Crop disorders")).toBeInTheDocument();
  });

  it("combines category, symptom/scientific-name search and severity filters", async () => {
    const getSpy = installCatalogResponse();
    render(<CottonIssueGuide />);

    fireEvent.click(screen.getByRole("button", { name: "Pests" }));

    fireEvent.change(
      screen.getByLabelText("Search cotton diseases and pests"),
      { target: { value: "Helicoverpa" } },
    );

    fireEvent.change(screen.getByLabelText("Filter by severity"), {
      target: { value: "not_established" },
    });

    expect(
      await screen.findByRole("heading", { name: "American bollworm" }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("heading", { name: "Pink bollworm" }),
    ).not.toBeInTheDocument();

    await waitFor(() => {
      const lastRequest = getSpy.mock.calls.at(-1);

      expect(lastRequest?.[1]?.params).toEqual({
        category: "pest",
        severity: "not_established",
        search: "Helicoverpa",
      });
    });
  });

  it("applies each severity label filter without crashing", async () => {
    const lowSeverityIssue = createIssue(
      "low-severity-test",
      "Low severity test issue",
      "disease",
      {
        severity: {
          level: "low",
          explanation: "Cited sources rate this issue as low severity.",
        },
      },
    );

    const severityRecords = [...records, lowSeverityIssue];

    vi.spyOn(api, "get").mockImplementation(
      async (_url: string, config?: AxiosRequestConfig) => {
        const params = (config?.params ?? {}) as Record<string, string>;

        const filtered = severityRecords.filter((issue) => {
          const categoryMatch =
            !params.category ||
            params.category === "all" ||
            issue.category === params.category;

          const severityMatch =
            !params.severity ||
            params.severity === "all" ||
            issue.severity.level === params.severity;

          return categoryMatch && severityMatch;
        });

        return {
          data: {
            issues: filtered,
            total: filtered.length,
            counts,
          },
        } as never;
      },
    );

    render(<CottonIssueGuide />);

    expect(
      await screen.findByRole("heading", {
        name: "Low severity test issue",
      }),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter by severity"), {
      target: { value: "low" },
    });

    expect(
      await screen.findByRole("heading", {
        name: "Low severity test issue",
      }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", { name: "Pink bollworm" }),
      ).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Filter by severity"), {
      target: { value: "moderate" },
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          name: "Low severity test issue",
        }),
      ).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Filter by severity"), {
      target: { value: "high" },
    });

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          name: "Low severity test issue",
        }),
      ).not.toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Filter by severity"), {
      target: { value: "not_established" },
    });

    expect(
      await screen.findByRole("heading", { name: "Pink bollworm" }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.queryByRole("heading", {
          name: "Low severity test issue",
        }),
      ).not.toBeInTheDocument();
    });
  });

  it("renders the actual severity badge and explanation in the card and dialog", async () => {
    installCatalogResponse();
    render(<CottonIssueGuide />);

    expect(
      await screen.findAllByText("Not established"),
    ).not.toHaveLength(0);

    await openFirstDetailsDialog();

    

    // The explanation can be rendered in more than one place.
    expect(
      screen.getAllByText(notEstablishedExplanation).length,
    ).toBeGreaterThan(0);

    expect(
      screen.getAllByText("Not established").length,
    ).toBeGreaterThan(0);
  });

  it("searches symptom text and opens a full details view", async () => {
    installCatalogResponse();
    render(<CottonIssueGuide />);

    fireEvent.change(
      screen.getByLabelText("Search cotton diseases and pests"),
      { target: { value: "rosetted flowers" } },
    );

    expect(
      await screen.findByRole("heading", { name: "Pink bollworm" }),
    ).toBeInTheDocument();

    const detailButton = await screen.findByRole("button", {
      name: /view full details/i,
    });

    fireEvent.click(detailButton);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Monitoring guidance")).toBeInTheDocument();
    expect(screen.getByText("References")).toBeInTheDocument();

    expect(
      screen
        .getAllByRole("link", { name: "Source: TNAU cotton guide" })
        .every(
          (link) =>
            link.getAttribute("href") === "https://agritech.tnau.ac.in/",
        ),
    ).toBe(true);

    expect(
      screen.getByText("Symptoms supported by the cited source."),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "No contributing conditions are established in the reviewed sources.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Last reviewed: 2026-10-24. Confirm diagnosis and treatment decisions with a local agricultural expert.",
      ),
    ).toBeInTheDocument();
  });

  it("shows missing scientific name and empty symptoms without crashing", async () => {
    const noNameIssue = createIssue(
      "no-name-test",
      "No-name issue",
      "disease",
      { scientificName: null, commonSymptoms: [] },
    );

    vi.spyOn(api, "get").mockResolvedValueOnce({
      data: {
        issues: [noNameIssue],
        total: 1,
        counts,
      },
    } as never);

    render(<CottonIssueGuide />);

    expect(
      await screen.findByRole("heading", { name: "No-name issue" }),
    ).toBeInTheDocument();

    expect(
      screen.getByText("Scientific name not established"),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Symptoms need verification in reliable issue-specific sources.",
      ),
    ).toBeInTheDocument();

    await openFirstDetailsDialog();

    expect(
      screen.getByText(
        "No scientific name established in reviewed sources.",
      ),
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        "Symptoms still need verification; no supported description is available in the reviewed sources.",
      ),
    ).toBeInTheDocument();
  });

  it("renders without source reference links when none are supplied", async () => {
    const noSourcesIssue = createIssue(
      "no-source-test",
      "No-source issue",
      "disease",
      { referenceSources: [] },
    );

    vi.spyOn(api, "get").mockResolvedValueOnce({
      data: {
        issues: [noSourcesIssue],
        total: 1,
        counts,
      },
    } as never);

    render(<CottonIssueGuide />);

    expect(
      await screen.findByRole("heading", { name: "No-source issue" }),
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("link", {
        name: "Source: TNAU cotton guide",
      }),
    ).not.toBeInTheDocument();
  });

  it("shows a loading state before data resolves", async () => {
    let resolveData: ((value: unknown) => void) | undefined;

    vi.spyOn(api, "get").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveData = (value: unknown) =>
            resolve({ data: value } as never);
        }),
    );

    render(<CottonIssueGuide />);

    expect(
      screen.getByText(/Loading cotton disease and pest library/i),
    ).toBeInTheDocument();

    expect(resolveData).toBeDefined();

    resolveData!({
      issues: records,
      total: records.length,
      counts,
    });

    expect(
      await screen.findByRole("heading", { name: "Pink bollworm" }),
    ).toBeInTheDocument();
  });

  it("shows an error state on API failure and recovers on retry", async () => {
    vi.spyOn(api, "get")
      .mockRejectedValueOnce(new Error("Catalog unavailable"))
      .mockResolvedValueOnce({
        data: {
          issues: records,
          total: records.length,
          counts,
        },
      } as never);

    render(<CottonIssueGuide />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Catalog unavailable",
    );

    fireEvent.click(screen.getByRole("button", { name: "Retry" }));

    expect(
      await screen.findByRole("heading", { name: "Pink bollworm" }),
    ).toBeInTheDocument();
  });

  it("shows a concise empty state when nothing matches", async () => {
    vi.spyOn(api, "get").mockResolvedValueOnce({
      data: {
        issues: [],
        total: 0,
        counts,
      },
    } as never);

    render(<CottonIssueGuide />);

    expect(
      await screen.findByText(
        /No cotton issues match your search and filters/i,
      ),
    ).toBeInTheDocument();
  });

  it("closes the details dialog with Escape and with a backdrop click", async () => {
    installCatalogResponse();
    render(<CottonIssueGuide />);

    await openFirstDetailsDialog();

    fireEvent.keyDown(window, { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    await openFirstDetailsDialog();

    const dialog = screen.getByRole("dialog");
    const backdrop = dialog.parentElement as HTMLElement;

    fireEvent.click(backdrop);

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});