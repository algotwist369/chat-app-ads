import apiClient from "./apiClient";

export const joinCustomer = async ({ businessSlug, name, phone, email }) => {
  const response = await apiClient.post("/api/customers/join", {
    businessSlug,
    name,
    phone,
    ...(email ? { email } : {}),
  });
  return response.data;
};

export const getCustomerProfile = async (customerId) => {
  const response = await apiClient.get(`/api/customers/${customerId}`);
  return response.data;
};

export const getCustomerConversation = async (customerId) => {
  const response = await apiClient.get(`/api/customers/${customerId}/conversation`);
  return response.data;
};

export const getWorkspaceBySlug = async (businessSlug) => {
  const response = await apiClient.get(`/api/customers/workspace/${businessSlug}`);
  return response.data;
};

