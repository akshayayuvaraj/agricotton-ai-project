import { describe, expect, it, vi } from "vitest";
import { getCurrentLocation } from "./geolocation";

const geolocationStub = (
  result: "success" | "denied" | "timeout" | "unavailable",
) =>
  ({
    getCurrentPosition: vi.fn((success, failure, options) => {
      expect(options).toMatchObject({
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      });
      if (result === "success") {
        success({
          coords: { latitude: 11.2345, longitude: 78.3456, accuracy: 12 },
        } as GeolocationPosition);
        return;
      }
      const code = result === "denied" ? 1 : result === "timeout" ? 3 : 2;
      failure?.({
        code,
        message: "mock failure",
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
      } as GeolocationPositionError);
    }),
  }) as Pick<Geolocation, "getCurrentPosition">;

describe("getCurrentLocation", () => {
  it("returns actual browser coordinates and GPS accuracy", async () => {
    await expect(
      getCurrentLocation(geolocationStub("success")),
    ).resolves.toEqual({
      latitude: 11.2345,
      longitude: 78.3456,
      accuracy: 12,
    });
  });

  it("uses browser coordinates even when their reported accuracy is coarse", async () => {
    const geolocation = {
      getCurrentPosition: vi.fn((success) => {
        success({
          coords: { latitude: 11.2345, longitude: 78.3456, accuracy: 8500 },
        } as GeolocationPosition);
      }),
    } as Pick<Geolocation, "getCurrentPosition">;

    await expect(getCurrentLocation(geolocation)).resolves.toEqual({
      latitude: 11.2345,
      longitude: 78.3456,
      accuracy: 8500,
    });
  });

  it.each([
    ["denied", /Chrome/],
    ["timeout", /timed out/],
    ["unavailable", /unavailable/],
  ] as const)("explains the %s error", async (result, message) => {
    await expect(getCurrentLocation(geolocationStub(result))).rejects.toThrow(
      message,
    );
  });

  it("reports unsupported geolocation", async () => {
    await expect(getCurrentLocation(undefined)).rejects.toThrow(
      /does not provide geolocation/,
    );
  });
});
