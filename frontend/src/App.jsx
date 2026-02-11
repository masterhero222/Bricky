// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./layouts/Layout";

// BASIC PAGES
import Home from "./pages/Home";
import AboutUs from "./pages/AboutUs";

// AUTH pages
import AuthGate from "./pages/AuthGate";
import Login from "./pages/Login";
import Register from "./pages/Register";

// CLIENT
import ClientProfile from "./pages/ClientProfile";

// WORKER
import WorkerLogin from "./pages/workers/WorkerLogin";
import WorkersRegister from "./pages/workers/WorkersRegister";
import WorkerProfile from "./pages/workers/WorkerProfile";
import WorkerPreview from "./pages/workers/WorkerPreview";

// REQUESTS
import Requests from "./pages/Requests";

// ✅ PUBLIC WORKERS
import Workers from "./pages/workers/Workers";
import WorkerPage from "./pages/WorkerPage";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* AUTH OUTSIDE LAYOUT */}
        <Route path="/auth" element={<AuthGate />} />
        <Route path="/auth/login" element={<Login />} />
        <Route path="/auth/register" element={<Register />} />

        {/* LAYOUT PAGES */}
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutUs />} />

          {/* ✅ PUBLIC WORKERS */}
          <Route path="/workers" element={<Workers />} />
          <Route path="/workers/:id" element={<WorkerPage />} />

          {/* CLIENT PROFILE */}
          <Route
            path="/client/profile"
            element={
              <RequireRole role="client">
                <ClientProfile />
              </RequireRole>
            }
          />

          {/* WORKER AUTH */}
          <Route path="/worker/login" element={<WorkerLogin />} />
          <Route path="/worker/register" element={<WorkersRegister />} />

          {/* WORKER PROFILE */}
          <Route
            path="/worker/profile"
            element={
              <RequireRole role="worker">
                <WorkerProfile />
              </RequireRole>
            }
          />

          {/* WORKER PREVIEW (customer sees worker) */}
          <Route path="/worker-preview" element={<WorkerPreview />} />

          {/* REQUESTS LIST */}
          <Route path="/requests" element={<Requests />} />

          {/* ✅ optional: old route -> new route (KEEP ID) */}
          <Route path="/worker/:userId" element={<WorkerIdRedirect />} />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

function RequireRole({ role, children }) {
  const current = localStorage.getItem("role");
  return current === role ? children : <Navigate to="/auth" replace />;
}

function WorkerIdRedirect() {
  // redirect /worker/:userId -> /workers/:id (same id)
  const userId = window.location.pathname.split("/").pop();
  return <Navigate to={`/workers/${userId}`} replace />;
}
