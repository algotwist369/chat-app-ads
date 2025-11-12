import apiClient from "./apiClient";

export const fetchManagerConversations = async (managerId, options = {}) => {
  const { limit = 20, skip = 0 } = options;
  const response = await apiClient.get(`/api/conversations/manager/${managerId}`, {
    params: { limit, skip },
  });
  return response.data;
};

export const fetchCustomerConversation = async (customerId, options = {}) => {
  const { limit = 50 } = options;
  const response = await apiClient.get(`/api/conversations/customer/${customerId}`, {
    params: { limit },
  });
  return response.data;
};

export const fetchConversationById = async (conversationId, options = {}) => {
  const { limit = 50 } = options;
  const response = await apiClient.get(`/api/conversations/${conversationId}`, {
    params: { limit },
  });
  return response.data;
};

// Fetch older messages (pagination)
export const fetchOlderMessages = async (conversationId, beforeMessageId, limit = 50) => {
  const response = await apiClient.get(`/api/conversations/${conversationId}/messages`, {
    params: { before: beforeMessageId, limit },
  });
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

