// src/services/api.js
import axios from "axios";
import { isDevMockToken, mockRequest } from "./devMockApi";
import { getApiBase } from "../utils/mediaUrls";

const API_URL = getApiBase();

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

function shouldUseMock(url) {
  const path = String(url || "");
  return (
    import.meta.env.DEV &&
    (isDevMockToken() ||
      path.includes("/auth/dev-login") ||
      path === "/workers" ||
      /^\/workers\/\d+/.test(path))
  );
}

export const apiGet = (url, config) =>
  shouldUseMock(url) ? mockRequest("get", url) : api.get(url, config);

export const apiPost = (url, data, config) =>
  shouldUseMock(url) ? mockRequest("post", url, data) : api.post(url, data, config);

export const apiPut = (url, data, config) =>
  shouldUseMock(url) ? mockRequest("put", url, data) : api.put(url, data, config);

export const apiDelete = (url, config) =>
  shouldUseMock(url) ? mockRequest("delete", url) : api.delete(url, config);

export default api;
