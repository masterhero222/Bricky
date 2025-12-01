import Home from "../pages/Home";
import Requests from "../pages/Requests";
import WorkersRegister from "../pages/WorkersRegister";
import WorkerPreviewPage from "../pages/WorkerPreviewPage";
import Clients from "../pages/Clients";
import Settings from "../pages/Settings";
import AboutUs from "../pages/AboutUs";
import WorkerLogin from "../pages/WorkerLogin";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/requests" element={<Requests />} />
      <Route path="/workers" element={<WorkersRegister />} />
      <Route path="/worker-preview" element={<WorkerPreviewPage />} />
      <Route path="/clients" element={<Clients />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/about" element={<AboutUs />} />
      <Route path="/client/register" element={<ClientRegister />} />
      <Route path="/client/login" element={<ClientLogin />} />
      
    </Routes>
  );
}
