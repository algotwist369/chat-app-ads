import apiClient from "./apiClient";

export const fetchManagerConversations = async (managerId) => {
  const response = await apiClient.get(`/api/conversations/manager/${managerId}`);
  return response.data;
};

export const fetchCustomerConversation = async (customerId) => {
  const response = await apiClient.get(`/api/conversations/customer/${customerId}`);
  return response.data;
};

export const fetchConversationById = async (conversationId) => {
  const response = await apiClient.get(`/api/conversations/${conversationId}`);
  return response.data;
};

export const ensureConversation = async ({ managerId, customerId, metadata }) => {
  const response = await apiClient.post("/api/conversations/ensure", {
    managerId,
    customerId,
    metadata,
  });
  return response.data;
};

export const markConversationDelivered = async ({ conversationId, viewerType }) => {
  const response = await apiClient.post(`/api/conversations/${conversationId}/delivered`, {
    viewerType,
  });
  return response.data;
};

export const markConversationRead = async ({ conversationId, viewerType }) => {
  const response = await apiClient.post(`/api/conversations/${conversationId}/read`, {
    viewerType,
  });
  return response.data;
};

export const setConversationMute = async ({ conversationId, actorType, muted }) => {
  const response = await apiClient.post(`/api/conversations/${conversationId}/mute`, {
    actorType,
    muted,
  });
  return response.data;
};

