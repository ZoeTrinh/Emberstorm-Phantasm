// Returns a Promise that resolves with { lat, lng, accuracy }
export function getUserLocation(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported by this browser."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy, // metres
        });
      },
      (error) => {
        // error.code: 1=PERMISSION_DENIED, 2=UNAVAILABLE, 3=TIMEOUT
        const messages = {
          1: "Location access denied. Please allow location in browser settings.",
          2: "Location unavailable. Check your device GPS.",
          3: "Location request timed out. Try again.",
        };
        reject(new Error(messages[error.code] || "Unknown location error."));
      },
      {
        enableHighAccuracy: true, // uses GPS chip if available (slower but precise)
        timeout: 15000,           // 15 seconds max wait
        maximumAge: 60000,        // accept a cached position up to 1 min old
        ...options,
      }
    );
  });
}