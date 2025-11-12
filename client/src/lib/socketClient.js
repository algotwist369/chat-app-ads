import { io } from "socket.io-client";
import { resolveApiBaseUrl } from "./apiClient";

let socketInstance = null;

const normalizeUrl = (value) => {
  if (!value || typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed;
};

const resolveSocketBaseUrl = () => {
  const runtimeSocketUrl =
    typeof window !== "undefined"
      ? window.__SOCKET_BASE_URL__ ?? window.__socketBaseUrl ?? window.__API_BASE_URL__ ?? window.__apiBaseUrl ?? null
      : null;
  const envSocketUrl =
    import.meta.env?.VITE_SOCKET_BASE_URL ?? import.meta.env?.VITE_SOCKET_URL ?? import.meta.env?.VITE_API_BASE_URL;

  const candidates = [runtimeSocketUrl, envSocketUrl, resolveApiBaseUrl()];

  for (const candidate of candidates) {
    const normalized = normalizeUrl(candidate);
    if (normalized) return normalized;
  }

  if (typeof window !== "undefined") {
    const { protocol, host } = window.location;
    if (protocol && host) {
      return `${protocol}//${host}`;
    }
  }

  return "http://localhost:4000";
};

const resolveTransports = () => {
  const envTransports = import.meta.env?.VITE_SOCKET_TRANSPORTS;
  if (typeof envTransports === "string" && envTransports.trim()) {
    return envTransports
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return ["websocket", "polling"];
};

const buildSocketOptions = () => ({
  withCredentials: true,
  transports: resolveTransports(),
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 750,
  timeout: 20000,
});

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(resolveSocketBaseUrl(), buildSocketOptions());
  }
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

