import apiClient from "./apiClient";

export const postMessage = async (payload) => {
  const response = await apiClient.post("/api/messages", payload);
  return response.data;
};

export const patchMessage = async (messageId, payload) => {
  const response = await apiClient.patch(`/api/messages/${messageId}`, payload);
  return response.data;
};

export const removeMessage = async (messageId) => {
  const response = await apiClient.delete(`/api/messages/${messageId}`);
  return response.data;
};

export const postReaction = async (messageId, payload) => {
  const response = await apiClient.post(`/api/messages/${messageId}/reactions`, payload);
  return response.data;
};

