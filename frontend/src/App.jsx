import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./layouts/Layout";

import Home from "./pages/Home";
import AboutUs from "./pages/AboutUs";

// Клиенти
import ClientLogin from "./pages/ClientLogin";
import ClientRegister from "./pages/ClientRegister";

// Майстори
import WorkerLogin from "./pages/WorkerLogin";
import WorkersRegister from "./pages/WorkersRegister";

// Други
import Requests from "./pages/Requests";
import WorkerPreviewPage from "./pages/WorkerPreviewPage";
import WorkerProfile from "./pages/WorkerProfile";
import AuthGate from "./pages/AuthGate";

export default function App() {
  return (
    <Router>
      <Routes>

        {/* Лейаут – всички страници вътре имат Navbar */}
        <Route element={<Layout />}>

          {/* Основни */}
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutUs />} />

          {/* Клиенти */}
          <Route path="/client/login" element={<ClientLogin />} />
          <Route path="/client/register" element={<ClientRegister />} />

          {/* Майстори */}
          <Route path="/worker/login" element={<WorkerLogin />} />
          <Route path="/worker/register" element={<WorkersRegister />} />
          <Route path="/worker/profile" element={<WorkerProfile />} />

          {/* Преглед и заявки */}
          <Route path="/worker-preview" element={<WorkerPreviewPage />} />
          <Route path="/requests" element={<Requests />} />

          {/* Хъб, ако решим да го ползваме */}
          <Route path="/auth" element={<AuthGate />} />

        </Route>

      </Routes>
    </Router>
  );
}
