// src/services/api.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://94.72.143.22:3000";

// Взимаме токена от localStorage
function getToken() {
  return localStorage.getItem("clientToken") || localStorage.getItem("token") || null;
}

export function apiGet(path) {
  return axios.get(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
}

export function apiPost(path, data = {}) {
  return axios.post(`${API_URL}${path}`, data, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
}

export function apiDelete(path) {
  return axios.delete(`${API_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`,
    },
  });
}
