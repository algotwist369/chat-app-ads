import apiClient from "./apiClient";

const buildRequestConfig = (payload, config = {}) => {
  if (payload instanceof FormData) {
    return config;
  }
  return config;
};

export const postMessage = async (payload, config = {}) => {
  const requestConfig = buildRequestConfig(payload, config);
  const response = await apiClient.post("/api/messages", payload, requestConfig);
  return response.data;
};

export const patchMessage = async (messageId, payload, config = {}) => {
  const requestConfig = buildRequestConfig(payload, config);
  const response = await apiClient.patch(`/api/messages/${messageId}`, payload, requestConfig);
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

