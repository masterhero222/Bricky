const AUTH_STORAGE_KEYS = [
  "token",
  "accessToken",
  "access_token",
  "role",
  "userId",
  "userName",
];

export function clearAuthSession() {
  AUTH_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}
