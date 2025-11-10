import axios from "axios";

const normalizeUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

export const resolveApiBaseUrl = () => {
  const runtimeBase = typeof window !== "undefined" ? window.__API_BASE_URL__ ?? window.__apiBaseUrl ?? null : null;
  const envBase = import.meta.env?.VITE_API_BASE_URL ?? null;
  const candidates = [envBase, runtimeBase];

  for (const candidate of candidates) {
    const normalized = normalizeUrl(candidate);
    if (normalized) return normalized;
  }

  if (typeof window !== "undefined") {
    const host = window.location.hostname ?? "";
    if (host.endsWith("d0s369.co.in")) {
      return "https://28c.d0s369.co.in";
    }
  }

  return "http://localhost:4000";
};

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
});

export default apiClient;


