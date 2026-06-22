let googleMapsPromise = null;

export function loadGoogleMaps(apiKey) {
  if (!apiKey) return Promise.reject(new Error("Missing Google Maps API key"));
  if (window.google?.maps?.Map) return Promise.resolve(window.google);
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const callbackName = "__brickyGoogleMapsReady";
    const existing = document.querySelector("script[data-bricky-google-maps='true']");

    window[callbackName] = () => resolve(window.google);

    if (existing) return;

    const script = document.createElement("script");
    const params = new URLSearchParams({
      key: apiKey,
      loading: "async",
      v: "weekly",
      language: "bg",
      region: "BG",
      callback: callbackName,
    });

    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.dataset.brickyGoogleMaps = "true";
    script.onerror = () => reject(new Error("Google Maps API failed to load"));
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
