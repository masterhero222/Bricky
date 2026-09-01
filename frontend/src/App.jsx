import { lazy, Suspense } from 'react';
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';
import Layout from './layouts/Layout';

const Home = lazy(() => import('./pages/Home'));
const AboutUs = lazy(() => import('./pages/AboutUs'));
const BlogIndex = lazy(() => import('./pages/knowledge/KnowledgeIndex').then(module => ({ default: module.LegacyBlogIndex })));
const BlogArticle = lazy(() => import('./pages/knowledge/KnowledgeArticle'));
const KnowledgeIndex = lazy(() => import('./pages/knowledge/KnowledgeIndex'));
const KnowledgeAdmin = lazy(() => import('./pages/knowledge/KnowledgeAdmin'));
const PrivacyAdmin = lazy(() => import('./pages/PrivacyAdmin'));
const BlogUnavailable = lazy(() => import('./pages/blog/BlogUnavailable'));
const AuthGate = lazy(() => import('./pages/AuthGate'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ClientProfile = lazy(() => import('./pages/ClientProfile'));
const RepairMap = lazy(() => import('./pages/RepairMap'));
const WorkerLogin = lazy(() => import('./pages/workers/WorkerLogin'));
const WorkersRegister = lazy(() => import('./pages/workers/WorkersRegister'));
const WorkerProfile = lazy(() => import('./pages/workers/WorkerProfile'));
const WorkerPreview = lazy(() => import('./pages/workers/WorkerPreview'));
const Workers = lazy(() => import('./pages/workers/Workers'));
const Requests = lazy(() => import('./pages/Requests'));
const AdminBackoffice = lazy(() => import('./pages/AdminBackoffice'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const NotFound = lazy(() => import('./pages/NotFound'));
const LegalPage = lazy(() => import('./pages/LegalPage'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const BLOG_ENABLED = import.meta.env.VITE_ENABLE_BLOG === 'true';

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
            <Route path="/terms" element={<LegalPage pageKey="terms" />} />
            <Route path="/privacy" element={<LegalPage pageKey="privacy" />} />
            <Route
              path="/moderation-rules"
              element={<LegalPage pageKey="moderation-rules" />}
            />
            <Route path="/support" element={<LegalPage pageKey="support" />} />
            <Route path="/knowledge" element={BLOG_ENABLED ? <KnowledgeIndex /> : <BlogUnavailable />} />
            <Route path="/knowledge/:section" element={BLOG_ENABLED ? <KnowledgeIndex /> : <BlogUnavailable />} />
            <Route path="/knowledge/repairs/:repairKey" element={BLOG_ENABLED ? <KnowledgeIndex /> : <BlogUnavailable />} />
            <Route path="/admin/knowledge" element={<RequireAdmin><KnowledgeAdmin /></RequireAdmin>} />
            <Route path="/admin/privacy" element={<RequireAdmin><PrivacyAdmin /></RequireAdmin>} />
            <Route
              path="/blog"
              element={BLOG_ENABLED ? <BlogIndex /> : <BlogUnavailable />}
            />
            <Route
              path="/blog/:slug"
              element={BLOG_ENABLED ? <BlogArticle /> : <BlogUnavailable />}
            />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
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
            <Route path="*" element={<NotFound />} />
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
  return localStorage.getItem('role') === 'client' ? (
    children
  ) : (
    <Navigate to="/auth" replace />
  );
}

function RequireWorker({ children }) {
  return localStorage.getItem('role') === 'worker' ? (
    children
  ) : (
    <Navigate to="/auth" replace />
  );
}

function RequireAdmin({ children }) {
  return ['admin', 'super_admin'].includes(localStorage.getItem('role')) ? (
    children
  ) : (
    <Navigate to="/auth" replace />
  );
}
