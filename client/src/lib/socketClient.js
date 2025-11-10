import { io } from "socket.io-client";
import { resolveApiBaseUrl } from "./apiClient";

let socketInstance = null;

const resolveSocketUrl = () => {
  const base = resolveApiBaseUrl();
  if (!base) {
    const { protocol, host } = window.location;
    return `${protocol}//${host}`;
  }
  return base;
};

export const getSocket = () => {
  if (!socketInstance) {
    socketInstance = io(resolveSocketUrl(), {
      withCredentials: true,
      transports: ["websocket"],
    });
  }
  return socketInstance;
};

export const disconnectSocket = () => {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
};

