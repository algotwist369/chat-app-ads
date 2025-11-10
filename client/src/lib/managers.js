import apiClient from "./apiClient";

export const loginManager = async ({ email, password }) => {
  const response = await apiClient.post("/api/managers/login", {
    email,
    password,
  });
  return response.data;
};

export const registerManager = async (payload) => {
  const response = await apiClient.post("/api/managers/signup", payload);
  return response.data;
};

export const updateManagerProfile = async (managerId, payload) => {
  const response = await apiClient.put(`/api/managers/${managerId}`, payload);
  return response.data;
};

export const getManagerProfile = async (managerId) => {
  const response = await apiClient.get(`/api/managers/${managerId}`);
  return response.data;
};


