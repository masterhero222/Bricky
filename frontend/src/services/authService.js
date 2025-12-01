// src/services/authService.js
import { apiPost } from "./api";

export async function loginUser(email, password) {
  const res = await apiPost("/auth/login", { email, password });
  return res.data;
}

export async function registerUser(dto) {
  const res = await apiPost("/auth/register", dto);
  return res.data;
}
