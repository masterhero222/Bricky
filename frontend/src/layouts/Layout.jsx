import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/UI/Navbar";

export default function Layout() {
  return (
    <div className="relative min-h-screen bg-gray-950 text-white">
      <Navbar />

      {/* ТАМ, КЪДЕТО СЕ РЕНДЕРИРАТ ВСИЧКИ СТРАНИЦИ */}
      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
}
