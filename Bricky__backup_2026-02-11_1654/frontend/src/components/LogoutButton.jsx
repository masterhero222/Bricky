// src/components/LogoutButton.jsx
import React from "react";

export default function LogoutButton() {
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/auth";
  };

  return (
    <button
      onClick={logout}
      className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-semibold text-sm"
    >
      Изход
    </button>
  );
}
