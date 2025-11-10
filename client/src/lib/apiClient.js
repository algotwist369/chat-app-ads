import axios from "axios";

export const resolveApiBaseUrl = () => {
  const base = (import.meta.env?.VITE_API_BASE_URL ?? "http://localhost:4000").trim();
  if (!base) return "";
  return base.endsWith("/") ? base.slice(0, -1) : base;
};

const apiClient = axios.create({
  baseURL: resolveApiBaseUrl(),
  withCredentials: true,
});

export default apiClient;


