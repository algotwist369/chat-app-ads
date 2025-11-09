import axios from "axios";

export const resolveApiBaseUrl = () => {
  const base = (import.meta.env?.VITE_API_BASE_URL ?? "").trim();
  if (!base) return "";
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default apiClient;


