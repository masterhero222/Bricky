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
      {/* 🧭 Бутон за мобилна навигация */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed top-4 left-4 z-50 bg-gray-800 text-white p-2 rounded-lg"
      >
        {isOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* 📱 Мобилно меню */}
      <aside
        className={`fixed top-0 left-0 h-full bg-gray-900 text-gray-300 p-4 w-64 transform transition-transform duration-300 z-40
        ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static md:w-64`}
      >
        <div className="text-lg font-semibold flex items-center gap-2 mb-6">
          🧱 Bricky
        </div>

        <ul className="space-y-3">
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                onClick={() => setIsOpen(false)} // затваря менюто при избор
                className={({ isActive }) =>
                  `flex items-center gap-2 transition-colors ${
                    isActive
                      ? "text-blue-500 font-semibold"
                      : "text-gray-300 hover:text-white"
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
