// src/services/api.js
import axios from "axios";
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
    (String(getToken()).startsWith("local-dev-token") ||
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

async function callMock(method, url, data) {
  const { mockRequest } = await import("./devMockApi");
  return mockRequest(method, url, data);
}

export const apiGet = (url, config) =>
  shouldUseMock(url) ? callMock("get", url) : api.get(url, config);

export const apiPost = (url, data, config) =>
  shouldUseMock(url) ? callMock("post", url, data) : api.post(url, data, config);

export const apiPut = (url, data, config) =>
  shouldUseMock(url) ? callMock("put", url, data) : api.put(url, data, config);

export const apiDelete = (url, config) =>
  shouldUseMock(url) ? callMock("delete", url, config?.data) : api.delete(url, config);

export default api;
