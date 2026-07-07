const SOFIA_BOUNDS = {
  minLat: 42.58,
  maxLat: 42.79,
  minLng: 23.18,
  maxLng: 23.5,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function hashText(text = "") {
  return String(text)
    .split("")
    .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 2166136261);
}

export function projectSofia(lat, lng) {
  const latitude = Number(lat);
  const longitude = Number(lng);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const x = ((longitude - SOFIA_BOUNDS.minLng) / (SOFIA_BOUNDS.maxLng - SOFIA_BOUNDS.minLng)) * 100;
  const y = ((SOFIA_BOUNDS.maxLat - latitude) / (SOFIA_BOUNDS.maxLat - SOFIA_BOUNDS.minLat)) * 100;

  return {
    x: clamp(x, 5, 95),
    y: clamp(y, 7, 93),
    precise: true,
  };
}

export function fallbackMapPoint(seed) {
  const hash = hashText(seed || "bricky");
  return {
    x: 10 + (hash % 80),
    y: 12 + ((hash >>> 8) % 76),
    precise: false,
  };
}

export function getRequestMapPoint(request) {
  const lat = request?.latitude ?? request?.lat ?? request?.location?.lat;
  const lng = request?.longitude ?? request?.lng ?? request?.location?.lng;
  return projectSofia(lat, lng) || fallbackMapPoint(`${request?.address || ""}-${request?.id || ""}`);
}
