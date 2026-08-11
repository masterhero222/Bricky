// src/components/LogoutButton.jsx
import React from "react";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { clearAuthSession } from "../utils/authSession";

export default function LogoutButton({ className = "" }) {
  const navigate = useNavigate();

  const logout = () => {
    clearAuthSession();
    navigate("/auth", { replace: true });
  };

  return (
    <button
      onClick={logout}
      type="button"
      className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 ${className}`}
    >
      <LogOut size={18} aria-hidden="true" /> Изход
    </button>
  );
}
