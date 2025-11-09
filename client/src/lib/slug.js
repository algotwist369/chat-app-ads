export const toBusinessSlug = (value = "") => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

  if (normalized) return normalized;
  return `business-${Date.now()}`;
};


