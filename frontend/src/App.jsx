// src/App.jsx
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
import RepairMap from "./pages/RepairMap";

// WORKER (REAL PAGES THAT EXIST)
import WorkerLogin from "./pages/workers/WorkerLogin";
import WorkersRegister from "./pages/workers/WorkersRegister";
import WorkerProfile from "./pages/workers/WorkerProfile"; 
import WorkerPreview from "./pages/workers/WorkerPreview";
import Workers from "./pages/workers/Workers";

// REQUESTS
import Requests from "./pages/Requests";

import DevTestPanel from "./components/DevTestPanel";

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
          <Route
            path="/repair-map"
            element={
              <RequireWorker>
                <RepairMap />
              </RequireWorker>
            }
          />

          {/* CLIENT PROFILE */}
          <Route
            path="/client/profile"
            element={
              <RequireClient>
                <ClientProfile />
              </RequireClient>
            }
          />

          {/* WORKER AUTH */}
          <Route path="/worker/login" element={<WorkerLogin />} />
          <Route path="/worker/register" element={<WorkersRegister />} />

          {/* WORKER PROFILE */}
          <Route
            path="/worker/profile"
            element={
              <RequireWorker>
                <WorkerProfile />
              </RequireWorker>
            }
          />

          {/* WORKER PREVIEW (customer sees worker) */}
          <Route path="/workers" element={<Workers />} />
          <Route path="/worker-preview" element={<WorkerPreview />} />

          {/* REQUESTS LIST */}
          <Route path="/requests" element={<Requests />} />

            <Route path="/worker/:userId" element={<WorkerPreview />} />
            <Route path="/workers/:id" element={<WorkerPreview />} />
        </Route>
      </Routes>
    </Router>
  );
}

function RequireClient({ children }) {
  return localStorage.getItem("role") === "client"
    ? children
    : (window.location.href = "/auth");
}

function RequireWorker({ children }) {
  return localStorage.getItem("role") === "worker"
    ? children
    : (window.location.href = "/auth");
}



