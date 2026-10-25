import { fireEvent, render, screen } from "@testing-library/react";
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
    level: "unverified",
    explanation: "Rating not verified.",
  },
  commonSymptoms: ["Symptoms not verified."],
  identificationTips: ["Identification details not verified."],
  favorableConditions: "Not verified.",
  cropStagesAffected: ["Not verified."],
  prevention: ["Confirm with a local expert."],
  integratedManagement: ["Confirm with a local expert."],
  monitoringGuidance: ["Scout and seek local advice."],
  regionRelevance: {
    region: "Tamil Nadu, India",
    status: "unverified",
    note: "Local occurrence not verified.",
  },
  referenceSources: [
    {
      title: "TNAU cotton guide",
      url: "https://agritech.tnau.ac.in/",
      notes: "Reference.",
    },
  ],
  lastReviewed: "2026-10-24",
  ...overrides,
});

const records: CottonIssue[] = [
  createIssue("pink-bollworm", "Pink bollworm", "pest", {
    scientificName: "Pectinophora gossypiella",
    commonSymptoms: ["Rosetted flowers and damaged bolls."],
  }),
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
  vi.spyOn(api, "get").mockImplementation(
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
    fireEvent.change(screen.getByLabelText("Search cotton diseases and pests"), {
      target: { value: "Helicoverpa" },
    });
    fireEvent.change(screen.getByLabelText("Filter by severity"), {
      target: { value: "unverified" },
    });

    expect(
      await screen.findByRole("heading", { name: "American bollworm" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Pink bollworm" }),
    ).not.toBeInTheDocument();

    const lastRequest = getSpy.mock.calls.at(-1);
    expect(lastRequest?.[1]?.params).toEqual({
      category: "pest",
      severity: "unverified",
      search: "Helicoverpa",
    });
  });

  it("searches symptom text and opens a full details view", async () => {
    installCatalogResponse();
    render(<CottonIssueGuide />);

    fireEvent.change(screen.getByLabelText("Search cotton diseases and pests"), {
      target: { value: "rosetted flowers" },
    });
    expect(
      await screen.findByRole("heading", { name: "Pink bollworm" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View full details" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Monitoring guidance")).toBeInTheDocument();
    expect(screen.getByText("References")).toBeInTheDocument();
    expect(screen.getByText("Last reviewed: 2026-10-24. Confirm diagnosis and treatment decisions with a local agricultural expert.")).toBeInTheDocument();
  });

  it("shows an empty state and lets the user retry a failed request", async () => {
    vi.spyOn(api, "get")
      .mockResolvedValueOnce({
        data: { issues: [], total: 0, counts },
      } as never)
      .mockRejectedValueOnce(new Error("Catalog unavailable"))
      .mockImplementation(
        async (_url: string, _config?: AxiosRequestConfig) =>
          ({
            data: { issues: records, total: records.length, counts },
          }) as never,
      );

    const { rerender } = render(<CottonIssueGuide />);
    expect(
      await screen.findByText(
        "No records match these search and filter choices.",
      ),
    ).toBeInTheDocument();

    rerender(<CottonIssueGuide />);
    fireEvent.change(screen.getByLabelText("Search cotton diseases and pests"), {
      target: { value: "offline" },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Catalog unavailable",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(
      await screen.findByRole("heading", { name: "Pink bollworm" }),
    ).toBeInTheDocument();
  });
});
