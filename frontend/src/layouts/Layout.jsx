// src/layouts/Layout.jsx
import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/UI/Navbar";
import DevTestPanel from "../components/DevTestPanel";

export default function Layout() {
  return (
    <div className="relative min-h-screen bg-gray-950 text-white">
      <Navbar />

      <main className="pt-16">
        <Outlet />
        <DevTestPanel />
      </main>
    </div>
  );
}



