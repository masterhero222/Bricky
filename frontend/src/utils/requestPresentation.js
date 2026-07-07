const CALCULATOR_DESCRIPTION_PREFIXES = [
  "Ценови режим:",
  "Ориентировъчен труд:",
  "Ориентировъчни материали:",
  "Общ ориентир:",
  "Най-вероятен ориентир:",
  "Възможен технически диапазон:",
  "Версия на калкулатора:",
];

export function cleanRequestDescription(description) {
  const cleaned = String(description || "")
    .split(/\r?\n/)
    .filter((line) => {
      const trimmed = line.trim();
      return !CALCULATOR_DESCRIPTION_PREFIXES.some((prefix) => trimmed.startsWith(prefix));
    })
    .join("\n")
    .trim();

  return cleaned;
}

export function getRequestExpectedRange(request) {
  const snapshot = request?.pricingSnapshot || {};
  const min = Number(snapshot.expectedMin ?? request?.estimateMin);
  const max = Number(snapshot.expectedMax ?? request?.estimateMax);

  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max < min) return null;

  return {
    min,
    max,
    currency: snapshot.currency || request?.estimateCurrency || "EUR",
  };
}

export function formatRequestExpectedRange(request) {
  const range = getRequestExpectedRange(request);
  return range ? `${range.min}-${range.max} ${range.currency}` : "";
}
