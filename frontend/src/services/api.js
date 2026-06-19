// src/services/api.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "/api";

export function getToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("access_token") ||
    ""
  );
}

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const apiGet = (url, config) => api.get(url, config);
export const apiPost = (url, data, config) => api.post(url, data, config);
export const apiPut = (url, data, config) => api.put(url, data, config);
export const apiDelete = (url, config) => api.delete(url, config);

export default api;
