import { Routes, Route } from "react-router-dom";
import Dashboard from "../pages/Dashboard";
import Requests from "../pages/Requests";
import Workers from "../pages/Workers";
import Clients from "../pages/Clients";
import Settings from "../pages/Settings";


export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/requests" element={<Requests />} />
      <Route path="/workers" element={<Workers />} />
      <Route path="/clients" element={<Clients />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}
