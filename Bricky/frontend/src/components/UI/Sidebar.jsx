import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Home, Users, Wrench, ClipboardList, Settings, Menu, X } from "lucide-react";

const navItems = [
  { name: "Начало", icon: <Home size={18} />, path: "/" },
  { name: "Заявки", icon: <ClipboardList size={18} />, path: "/requests" },
  { name: "Майстори", icon: <Wrench size={18} />, path: "/workers" },
  { name: "Клиенти", icon: <Users size={18} />, path: "/clients" },
  { name: "Настройки", icon: <Settings size={18} />, path: "/settings" },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-gray-800 text-white p-2 rounded-lg"
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      <aside
        className={`fixed top-0 left-0 h-full bg-gray-900/95 border-r border-gray-700 backdrop-blur-sm text-gray-200 p-4 w-64 transform transition-transform duration-300 z-40
        ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static`}
      >
        <div className="text-xl font-bold flex items-center gap-2 mb-8">
          🧱 Bricky
        </div>

        <ul className="space-y-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={() => setIsOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? "bg-gray-800 text-white"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  }`
                }
              >
                {item.icon}
                {item.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </aside>
    </>
  );
}
