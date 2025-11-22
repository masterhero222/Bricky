import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Layout from "./layouts/Layout";

import Home from "./pages/Home";
import AboutUs from "./pages/AboutUs";

// НОВИТЕ ти страници
import WorkersRegister from "./pages/WorkersRegister";
import WorkerPreviewPage from "./pages/WorkerPreviewPage";
import WorkerProfile from "./pages/WorkerProfile";

import Requests from "./pages/Requests";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Всички страници минават през Layout (Navbar + Main wrapper) */}
        <Route element={<Layout />}>

          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutUs />} />

          {/* Майстори */}
          <Route path="/workers" element={<WorkersRegister />} />
          <Route path="/worker-preview" element={<WorkerPreviewPage />} />

          {/* Заявки */}
          <Route path="/requests" element={<Requests />} />
          <Route path="/worker/profile" element={<WorkerProfile />} /> 


        </Route>
      </Routes>
    </Router>
  );
}
