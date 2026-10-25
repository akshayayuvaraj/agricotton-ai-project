export type CurrentLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

/** Accuracy (metres) above which the fix is probably Wi-Fi/IP based rather than GPS. */
export const LOW_ACCURACY_METRES = 500;

export const getCurrentLocation = (
  geolocation: Pick<Geolocation, "getCurrentPosition"> | undefined,
  secureContext: boolean | undefined = typeof window === "undefined"
    ? undefined
    : window.isSecureContext,
): Promise<CurrentLocation> => {
  // Browsers only deliver geolocation on HTTPS or localhost. Say so explicitly
  // instead of letting the request fail with a generic "denied" error.
  if (secureContext === false) {
    return Promise.reject(
      new Error(
        "Browser location is blocked on insecure pages. Open this app over HTTPS or at http://localhost, then try again.",
      ),
    );
  }
  if (!geolocation) {
    return Promise.reject(
      new Error(
        "This browser does not provide geolocation. Use a supported browser on HTTPS or localhost, then allow location access.",
      ),
    );
  }

  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(
      ({ coords }) => {
        if (
          !Number.isFinite(coords.latitude) ||
          !Number.isFinite(coords.longitude) ||
          !Number.isFinite(coords.accuracy) ||
          coords.latitude < -90 ||
          coords.latitude > 90 ||
          coords.longitude < -180 ||
          coords.longitude > 180
        ) {
          reject(new Error("The browser returned invalid location coordinates."));
          return;
        }
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        });
      },
      (error) => {
        const message =
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. In Chrome, open the site controls beside the address, set Location to Allow, and retry. Browser location requires HTTPS or localhost."
            : error.code === error.POSITION_UNAVAILABLE
              ? "Your current location is unavailable. Check device location services and retry. Browser location requires HTTPS or localhost."
              : error.code === error.TIMEOUT
                ? "Location lookup timed out. Check device location services and retry from a secure page (HTTPS or localhost)."
                : "Unable to determine your location. Browser location usually requires HTTPS or localhost and permission from the current site. You can select a location manually by clicking the map.";
        reject(new Error(message));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
};
