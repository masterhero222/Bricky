import React from "react";
import Sidebar from "./components/UI/Sidebar";
import AppRoutes from "./routes/AppRoutes";

export default function App() {
  return (
    <div className="flex min-h-screen bg-gray-900 text-white relative">
      <Sidebar />
      <main className="flex-1 p-6 overflow-y-auto">
        <AppRoutes />
      </main>
    </div>
  );
}
