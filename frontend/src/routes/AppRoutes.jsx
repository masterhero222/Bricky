// src/routes/AppRoutes.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";

import Home from "../pages/Home";
import Requests from "../pages/Requests";
import Clients from "../pages/Clients";
import Settings from "../pages/Settings";
import AboutUs from "../pages/AboutUs";

import ClientRegister from "../pages/ClientRegister";
import ClientLogin from "../pages/ClientLogin";

import WorkersRegister from "../pages/WorkersRegister";
import WorkerLogin from "../pages/WorkerLogin";

import Workers from "../pages/Workers";
import WorkerPage from "../pages/WorkerPage";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />

      <Route path="/requests" element={<Requests />} />

      {/* Workers list + details */}
      <Route path="/workers" element={<Workers />} />
      <Route path="/workers/:id" element={<WorkerPage />} />

      {/* Auth */}
      <Route path="/client/register" element={<ClientRegister />} />
      <Route path="/client/login" element={<ClientLogin />} />

      <Route path="/worker/register" element={<WorkersRegister />} />
      <Route path="/worker/login" element={<WorkerLogin />} />

      {/* Other pages */}
      <Route path="/clients" element={<Clients />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/about" element={<AboutUs />} />
    </Routes>
  );
}
