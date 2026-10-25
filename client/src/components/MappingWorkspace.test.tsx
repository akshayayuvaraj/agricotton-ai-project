import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../lib/api";
import { MappingWorkspace } from "./MappingWorkspace";

vi.mock("./MapEditor", () => ({
  MapEditor: ({
    onChange,
    drawingActive,
    points,
    referencePoints = [],
  }: {
    onChange: (points: [number, number][]) => void;
    drawingActive: boolean;
    points: [number, number][];
    referencePoints?: [number, number][];
  }) => (
    <div>
      <p data-testid="vertex-count">Current vertices: {points.length}</p>
      <p data-testid="field-boundary-points">{referencePoints.length}</p>
      <button
        type="button"
        disabled={!drawingActive}
        onClick={() =>
          onChange([
            [11.123, 78.124],
            [11.123, 78.127],
            [11.126, 78.127],
            [11.126, 78.124],
          ])
        }
      >
        Add test polygon vertices
      </button>
    </div>
  ),
}));

const farmId = "f909a3d9-69f1-414a-a5c3-b52e30159130";
const fieldId = "3d73d03a-448e-4786-9a7d-0c3851f49298";
const field = {
  id: fieldId,
  farmId,
  name: "North field",
  cropName: "Cotton",
  season: "Kharif",
  boundary: {
    type: "Polygon" as const,
    coordinates: [
      [
        [78.124, 11.123],
        [78.127, 11.123],
        [78.127, 11.126],
        [78.124, 11.126],
        [78.124, 11.123],
      ],
    ],
  },
  areaHectares: 0.1,
  areaAcres: 0.25,
};

describe("MappingWorkspace", () => {
  afterEach(() => vi.restoreAllMocks());

  it("saves a drawn field using the backend response and reloads it into the zone selector", async () => {
    let savedFields: typeof field[] = [];
    const get = vi.spyOn(api, "get").mockImplementation(async (url) => {
      if (url === "/farms") {
        return { data: { farms: [{ id: farmId, name: "Test farm", district: "Coimbatore" }] } } as never;
      }
      if (url === "/fields") return { data: { fields: savedFields } } as never;
      if (url === "/zones") return { data: { zones: [] } } as never;
      throw new Error(`Unexpected GET ${url}`);
    });
    const post = vi.spyOn(api, "post").mockImplementation(async (url, payload) => {
      if (url !== "/fields") throw new Error(`Unexpected POST ${url}`);
      const stored = { ...field, ...(payload as object) };
      savedFields = [stored];
      return { data: { field: stored } } as never;
    });

    render(<MappingWorkspace />);
    await screen.findByRole("option", { name: /Test farm/ });
    fireEvent.change(screen.getByLabelText("Associated farm"), {
      target: { value: farmId },
    });
    fireEvent.change(screen.getByLabelText("Field name"), {
      target: { value: "North field" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Draw Field Boundary" }));
    fireEvent.click(screen.getByRole("button", { name: "Add test polygon vertices" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish Drawing" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Field Boundary" }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        "/fields",
        expect.objectContaining({
          farmId,
          name: "North field",
          cropName: "Cotton",
          season: "Kharif",
          boundary: {
            type: "Polygon",
            coordinates: [
              [
                [78.124, 11.123],
                [78.127, 11.123],
                [78.127, 11.126],
                [78.124, 11.126],
                [78.124, 11.123],
              ],
            ],
          },
        }),
      ),
    );
    expect(await screen.findByText("Field boundary saved successfully.")).toBeInTheDocument();
    await waitFor(() => expect(get).toHaveBeenCalledWith("/fields"));

    fireEvent.click(screen.getByRole("button", { name: "Management Zone mode" }));
    expect(
      await screen.findByRole("option", { name: "North field" }),
    ).toBeInTheDocument();
  });

  it("explains that an unfinished boundary cannot be saved", async () => {
    vi.spyOn(api, "get").mockImplementation(async (url) => {
      if (url === "/farms") {
        return { data: { farms: [{ id: farmId, name: "Test farm", district: "Coimbatore" }] } } as never;
      }
      if (url === "/fields") return { data: { fields: [] } } as never;
      if (url === "/zones") return { data: { zones: [] } } as never;
      throw new Error(`Unexpected GET ${url}`);
    });
    const post = vi.spyOn(api, "post");

    render(<MappingWorkspace />);
    await screen.findByRole("option", { name: /Test farm/ });
    fireEvent.change(screen.getByLabelText("Associated farm"), {
      target: { value: farmId },
    });
    fireEvent.change(screen.getByLabelText("Field name"), {
      target: { value: "Unsaved field" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Draw Field Boundary" }));
    fireEvent.click(screen.getByRole("button", { name: "Add test polygon vertices" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Field Boundary" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Finish and validate the field boundary before saving.",
    );
    expect(screen.getByTestId("vertex-count")).toHaveTextContent("4");
    expect(post).not.toHaveBeenCalled();
  });

  it("shows a failed save response without clearing the drawn polygon", async () => {
    vi.spyOn(api, "get").mockImplementation(async (url) => {
      if (url === "/farms") {
        return { data: { farms: [{ id: farmId, name: "Test farm", district: "Coimbatore" }] } } as never;
      }
      if (url === "/fields") return { data: { fields: [] } } as never;
      if (url === "/zones") return { data: { zones: [] } } as never;
      throw new Error(`Unexpected GET ${url}`);
    });
    const post = vi.spyOn(api, "post").mockRejectedValue(new Error("Network offline"));

    render(<MappingWorkspace />);
    await screen.findByRole("option", { name: /Test farm/ });
    fireEvent.change(screen.getByLabelText("Associated farm"), {
      target: { value: farmId },
    });
    fireEvent.change(screen.getByLabelText("Field name"), {
      target: { value: "Unsaved field" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Draw Field Boundary" }));
    fireEvent.click(screen.getByRole("button", { name: "Add test polygon vertices" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish Drawing" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Field Boundary" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Network offline");
    expect(screen.getByTestId("vertex-count")).toHaveTextContent("4");
    expect(post).toHaveBeenCalledTimes(1);
  });

  it("switches from management zone mode back to field boundary mode", async () => {
    vi.spyOn(api, "get").mockImplementation(async (url) => {
      if (url === "/farms") {
        return { data: { farms: [{ id: farmId, name: "Test farm", district: "Coimbatore" }] } } as never;
      }
      if (url === "/fields") return { data: { fields: [field] } } as never;
      if (url === "/zones") return { data: { zones: [] } } as never;
      throw new Error(`Unexpected GET ${url}`);
    });

    render(<MappingWorkspace />);
    await screen.findByRole("option", { name: /Test farm/ });
    fireEvent.click(screen.getByRole("button", { name: "Management Zone mode" }));
    expect(await screen.findByText("Create management zone")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Field Boundary mode" }));
    expect(await screen.findByText("Save field boundary")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Field Boundary mode" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Field boundary mode selected");
  });

  it("shows an inline validation message when the required farm is not selected", async () => {
    vi.spyOn(api, "get").mockImplementation(async (url) => {
      if (url === "/farms") {
        return { data: { farms: [{ id: farmId, name: "Test farm", district: "Coimbatore" }] } } as never;
      }
      if (url === "/fields") return { data: { fields: [] } } as never;
      if (url === "/zones") return { data: { zones: [] } } as never;
      throw new Error(`Unexpected GET ${url}`);
    });

    render(<MappingWorkspace />);
    const farmSelect = await screen.findByLabelText("Associated farm");
    fireEvent.change(farmSelect, { target: { value: "" } });
    fireEvent.invalid(farmSelect);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Select a saved farm before saving the field boundary.",
    );
  });

  it("sends zone metadata and the drawn polygon to the existing zone API", async () => {
    const zone = {
      id: "6c605a90-749d-4557-b625-e6f9e4cf5357",
      fieldId,
      name: "North test zone",
      color: "#D97706",
      notes: "Test notes",
      polygon: field.boundary,
      areaHectares: 0.1,
      areaAcres: 0.25,
    };
    vi.spyOn(api, "get").mockImplementation(async (url) => {
      if (url === "/farms") {
        return { data: { farms: [{ id: farmId, name: "Test farm", district: "Coimbatore" }] } } as never;
      }
      if (url === "/fields") return { data: { fields: [field] } } as never;
      if (url === "/zones") return { data: { zones: [] } } as never;
      throw new Error(`Unexpected GET ${url}`);
    });
    const post = vi.spyOn(api, "post").mockImplementation(async (url, payload) => {
      if (url !== "/zones") throw new Error(`Unexpected POST ${url}`);
      return { data: { zone: { ...zone, ...(payload as object) } } } as never;
    });

    render(<MappingWorkspace />);
    await screen.findByRole("option", { name: /Test farm/ });
    fireEvent.click(screen.getByRole("button", { name: "Management Zone mode" }));
    fireEvent.change(screen.getByLabelText("Choose field"), {
      target: { value: fieldId },
    });
    fireEvent.change(screen.getByLabelText("Zone name"), {
      target: { value: zone.name },
    });
    fireEvent.change(screen.getByLabelText("Zone color"), {
      target: { value: zone.color },
    });
    fireEvent.change(screen.getByLabelText("Notes"), {
      target: { value: zone.notes },
    });
    fireEvent.click(screen.getByRole("button", { name: "Draw Zone" }));
    fireEvent.click(screen.getByRole("button", { name: "Add test polygon vertices" }));
    fireEvent.click(screen.getByRole("button", { name: "Finish Drawing" }));
    fireEvent.click(screen.getByRole("button", { name: "Save Zone" }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith("/zones", {
        fieldId,
        name: zone.name,
        color: zone.color.toLowerCase(),
        notes: zone.notes,
        polygon: field.boundary,
      }),
    );
    expect(await screen.findByText("Zone saved successfully.")).toBeInTheDocument();
  });

  it("saves the requested automatic split through the batch zones endpoint", async () => {
    vi.spyOn(api, "get").mockImplementation(async (url) => {
      if (url === "/farms") {
        return { data: { farms: [{ id: farmId, name: "Test farm", district: "Coimbatore" }] } } as never;
      }
      if (url === "/fields") return { data: { fields: [field] } } as never;
      if (url === "/zones") return { data: { zones: [] } } as never;
      throw new Error(`Unexpected GET ${url}`);
    });
    const post = vi.spyOn(api, "post").mockImplementation(async (url, payload) => {
      if (url !== "/zones/batch") throw new Error(`Unexpected POST ${url}`);
      return { data: { zones: (payload as { zones: unknown[] }).zones } } as never;
    });

    render(<MappingWorkspace />);
    await screen.findByRole("option", { name: /Test farm/ });
    fireEvent.click(screen.getByRole("button", { name: "Management Zone mode" }));
    fireEvent.change(screen.getByLabelText("Choose field"), {
      target: { value: fieldId },
    });
    fireEvent.click(screen.getByRole("button", { name: "Preview grid zones" }));
    fireEvent.click(screen.getByRole("button", { name: "Save previewed zones" }));

    await waitFor(() =>
      expect(post).toHaveBeenCalledWith(
        "/zones/batch",
        expect.objectContaining({
          fieldId,
          zones: expect.arrayContaining([
            expect.objectContaining({
              name: "North field - Zone 1",
              color: expect.any(String),
              polygon: expect.objectContaining({ type: "Polygon" }),
            }),
            expect.objectContaining({
              name: "North field - Zone 2",
              color: expect.any(String),
              polygon: expect.objectContaining({ type: "Polygon" }),
            }),
          ]),
        }),
      ),
    );
    const submittedZones = post.mock.calls[0][1] as {
      zones: { name: string }[];
    };
    expect(new Set(submittedZones.zones.map((zone) => zone.name)).size).toBe(2);
    expect(await screen.findByText("2 management zones saved.")).toBeInTheDocument();
  });

  it("loads raw field arrays and shows the selected field's saved boundary", async () => {
    vi.spyOn(api, "get").mockImplementation(async (url) => {
      if (url === "/farms") {
        return { data: { farms: [{ id: farmId, name: "Test farm", district: "Coimbatore" }] } } as never;
      }
      if (url === "/fields") return { data: [field] } as never;
      if (url === "/zones") return { data: [] } as never;
      throw new Error(`Unexpected GET ${url}`);
    });

    render(<MappingWorkspace />);
    await screen.findByRole("option", { name: "North field" });
    fireEvent.click(screen.getByRole("button", { name: "Management Zone mode" }));
    fireEvent.change(screen.getByLabelText("Choose field"), {
      target: { value: fieldId },
    });

    await waitFor(() =>
      expect(screen.getByTestId("field-boundary-points")).toHaveTextContent("4"),
    );
  });

  it("shows a field API error instead of silently rendering an empty selector", async () => {
    vi.spyOn(api, "get").mockImplementation(async (url) => {
      if (url === "/farms") {
        return { data: { farms: [{ id: farmId, name: "Test farm", district: "Coimbatore" }] } } as never;
      }
      if (url === "/fields") throw new Error("Field service unavailable");
      if (url === "/zones") return { data: { zones: [] } } as never;
      throw new Error(`Unexpected GET ${url}`);
    });

    render(<MappingWorkspace />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Field service unavailable",
    );
  });

  it("explains an expired sign-in and reloads fields after the session is restored", async () => {
    let signedIn = false;
    vi.spyOn(api, "get").mockImplementation(async (url) => {
      if (url === "/farms") {
        return { data: { farms: [{ id: farmId, name: "Test farm", district: "Coimbatore" }] } } as never;
      }
      if (url === "/fields") {
        if (!signedIn) {
          throw {
            response: { status: 401, data: { message: "Authentication required." } },
          };
        }
        return { data: { fields: [field] } } as never;
      }
      if (url === "/zones") return { data: { zones: [] } } as never;
      throw new Error(`Unexpected GET ${url}`);
    });

    render(<MappingWorkspace />);
    fireEvent.click(screen.getByRole("button", { name: "Management Zone mode" }));
    expect(await screen.findByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/login",
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your session has expired or you are signed out",
    );

    signedIn = true;
    fireEvent.click(screen.getByRole("button", { name: "Reload saved fields" }));
    expect(await screen.findByRole("option", { name: "North field" })).toBeInTheDocument();
  });
});
