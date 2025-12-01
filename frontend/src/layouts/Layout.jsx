import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/UI/Navbar";
import AuthModal from "../components/AuthModal";

export default function Layout() {
  return (
    <div className="relative min-h-screen bg-gray-950 text-white">
      <Navbar />

      {/* Глобален Auth Modal */}
      <AuthModal />

      <main className="pt-16">
        <Outlet />
      </main>
    </div>
  );
}
