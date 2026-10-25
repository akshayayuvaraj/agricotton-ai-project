import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MapEditor } from "./MapEditor";

const { map } = vi.hoisted(() => ({
  map: {
    fitBounds: vi.fn(),
    setView: vi.fn(),
    getContainer: vi.fn(() => document.createElement("div")),
  },
}));

vi.mock("react-leaflet", async () => {
  const React = await import("react");
  return {
    Circle: () => null,
    MapContainer: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", { "data-testid": "map" }, children),
    Marker: ({
      children,
      icon,
      position,
    }: {
      children: React.ReactNode;
      icon?: unknown;
      position: [number, number];
    }) =>
      React.createElement(
        "div",
        {
          "data-testid": "leaflet-marker",
          "data-icon": icon ? "custom" : "default",
          "data-position": position.join(","),
        },
        children,
      ),
    Polygon: () => null,
    Popup: ({ children }: { children: React.ReactNode }) =>
      React.createElement("div", null, children),
    TileLayer: () => null,
    useMap: () => map,
    useMapEvents: () => null,
  };
});

describe("MapEditor current location", () => {
  let originalGeolocation: PropertyDescriptor | undefined;

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (originalGeolocation) {
      Object.defineProperty(navigator, "geolocation", originalGeolocation);
    } else {
      Reflect.deleteProperty(navigator, "geolocation");
    }
    originalGeolocation = undefined;
  });

  const setGeolocation = (
    getCurrentPosition: Geolocation["getCurrentPosition"],
  ) => {
    originalGeolocation = Object.getOwnPropertyDescriptor(
      navigator,
      "geolocation",
    );
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: { getCurrentPosition },
    });
  };

  it("centers the existing map and renders one custom marker at browser coordinates", async () => {
    setGeolocation((success) => {
      success({
        coords: { latitude: 11.2345, longitude: 78.3456, accuracy: 12 },
      } as GeolocationPosition);
    });
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );

    render(<MapEditor points={[]} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "My Current Location" }));

    await waitFor(() =>
      expect(map.setView).toHaveBeenCalledWith([11.2345, 78.3456], 17),
    );
    expect(screen.getByText("Your Current Location")).toBeInTheDocument();
    const markers = screen.getAllByTestId("leaflet-marker");
    expect(markers).toHaveLength(1);
    expect(markers[0]).toHaveAttribute("data-icon", "custom");
    expect(markers[0]).toHaveAttribute("data-position", "11.2345,78.3456");
  });

  it("shows browser permission guidance and re-enables the button after denial", async () => {
    setGeolocation((_success, failure) => {
      failure?.({
        code: 1,
        message: "Permission denied",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
    });
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );

    render(<MapEditor points={[]} onChange={vi.fn()} />);
    const button = screen.getByRole("button", { name: "My Current Location" });
    fireEvent.click(button);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Location permission was denied",
    );
    expect(button).toBeEnabled();
    expect(screen.queryAllByTestId("leaflet-marker")).toHaveLength(0);
  });

  it("fits saved field overlays when the workspace is reloaded without an active drawing", async () => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        observe() {}
        disconnect() {}
      },
    );

    render(
      <MapEditor
        points={[]}
        onChange={vi.fn()}
        overlays={[
          {
            id: "saved-field",
            name: "Saved field",
            color: "#358645",
            points: [
              [11.1, 78.1],
              [11.2, 78.1],
              [11.2, 78.2],
            ],
          },
        ]}
      />,
    );

    await waitFor(() =>
      expect(map.fitBounds).toHaveBeenCalledWith(
        [
          [11.1, 78.1],
          [11.2, 78.1],
          [11.2, 78.2],
        ],
        { padding: [24, 24], maxZoom: 16 },
      ),
    );
  });
});
