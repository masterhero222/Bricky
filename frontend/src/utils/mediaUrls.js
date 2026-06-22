function joinUrl(base, path) {
  const b = String(base || "").replace(/\/+$/, "");
  const p = String(path || "").replace(/^\/+/, "");
  return `${b}/${p}`;
}

export function getApiBase() {
  return String(import.meta.env.VITE_API_URL || "/api").replace(/\/+$/, "");
}

export function getAssetBase() {
  const explicit = import.meta.env.VITE_ASSET_BASE_URL;
  if (explicit) return String(explicit).replace(/\/+$/, "");

  const api = getApiBase();
  return api.replace(/\/api$/i, "");
}

function getUploadBase() {
  const explicit = import.meta.env.VITE_ASSET_BASE_URL;
  if (explicit) return String(explicit).replace(/\/+$/, "");

  return getApiBase();
}

export function mediaUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(data:|blob:|https?:)/i.test(raw)) return raw;

  if (raw.startsWith("/uploads/")) return joinUrl(getUploadBase(), raw);
  if (raw.startsWith("uploads/")) return joinUrl(getUploadBase(), `/${raw}`);

  if (/^gallery_/i.test(raw)) {
    return joinUrl(getUploadBase(), `/uploads/workers/gallery/${raw}`);
  }

  if (/^worker_/i.test(raw)) {
    return joinUrl(getUploadBase(), `/uploads/workers/${raw}`);
  }

  if (raw.startsWith("/")) return raw;
  return raw;
}

export function photoMediaUrl(photo) {
  const raw =
    typeof photo === "string"
      ? photo
      : photo?.url || photo?.dataUrl || photo?.src || photo?.imageUrl || photo?.path || "";

  return mediaUrl(raw);
}
