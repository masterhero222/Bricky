import { lazy, Suspense } from "react";
import { BrowserRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import Layout from "./layouts/Layout";

const Home = lazy(() => import("./pages/Home"));
const AboutUs = lazy(() => import("./pages/AboutUs"));
const BlogIndex = lazy(() => import("./pages/blog/BlogIndex"));
const BlogArticle = lazy(() => import("./pages/blog/BlogArticle"));
const AuthGate = lazy(() => import("./pages/AuthGate"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ClientProfile = lazy(() => import("./pages/ClientProfile"));
const RepairMap = lazy(() => import("./pages/RepairMap"));
const WorkerLogin = lazy(() => import("./pages/workers/WorkerLogin"));
const WorkersRegister = lazy(() => import("./pages/workers/WorkersRegister"));
const WorkerProfile = lazy(() => import("./pages/workers/WorkerProfile"));
const WorkerPreview = lazy(() => import("./pages/workers/WorkerPreview"));
const Workers = lazy(() => import("./pages/workers/Workers"));
const Requests = lazy(() => import("./pages/Requests"));
const AdminBackoffice = lazy(() => import("./pages/AdminBackoffice"));

export default function App() {
  return (
    <Router>
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/auth" element={<AuthGate />} />
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/register" element={<Register />} />

          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/blog" element={<BlogIndex />} />
            <Route path="/blog/:slug" element={<BlogArticle />} />
            <Route
              path="/repair-map"
              element={
                <RequireWorker>
                  <RepairMap />
                </RequireWorker>
              }
            />
            <Route
              path="/client/profile"
              element={
                <RequireClient>
                  <ClientProfile />
                </RequireClient>
              }
            />
            <Route path="/worker/login" element={<WorkerLogin />} />
            <Route path="/worker/register" element={<WorkersRegister />} />
            <Route
              path="/worker/profile"
              element={
                <RequireWorker>
                  <WorkerProfile />
                </RequireWorker>
              }
            />
            <Route path="/workers" element={<Workers />} />
            <Route path="/worker-preview" element={<WorkerPreview />} />
            <Route path="/requests" element={<Requests />} />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminBackoffice />
                </RequireAdmin>
              }
            />
            <Route path="/worker/:userId" element={<WorkerPreview />} />
            <Route path="/workers/:id" element={<WorkerPreview />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

function RouteLoading() {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-[#07111f]"
      role="status"
      aria-label="Зареждане"
    >
      <span className="h-9 w-9 animate-spin rounded-full border-2 border-emerald-400/25 border-t-emerald-400" />
    </div>
  );
}

function RequireClient({ children }) {
  return localStorage.getItem("role") === "client"
    ? children
    : <Navigate to="/auth" replace />;
}

function RequireWorker({ children }) {
  return localStorage.getItem("role") === "worker"
    ? children
    : <Navigate to="/auth" replace />;
}

function RequireAdmin({ children }) {
  return ["admin", "super_admin"].includes(localStorage.getItem("role"))
    ? children
    : <Navigate to="/auth" replace />;
}
