// src/services/api.js
import axios from "axios";
import { isDevMockToken, mockRequest } from "./devMockApi";
import { getApiBase } from "../utils/mediaUrls";

const API_URL = getApiBase();
const DEV_MOCK_ENABLED =
  import.meta.env.DEV && import.meta.env.VITE_USE_DEV_MOCK !== "false";

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
    DEV_MOCK_ENABLED &&
    (isDevMockToken() ||
      path.includes("/auth/dev-login") ||
      path.startsWith("/auth/password-reset/") ||
      path === "/auth/register" ||
      path === "/repair-categories" ||
      path === "/workers" ||
      path.startsWith("/admin/") ||
      path.startsWith("/account/") ||
      path.startsWith("/notifications/") ||
      path.startsWith("/referrals") ||
      path.startsWith("/requests") ||
      path.startsWith("/reviews") ||
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
  shouldUseMock(url) ? mockRequest("delete", url, config?.data) : api.delete(url, config);

export default api;
