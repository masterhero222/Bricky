import { NavLink } from "react-router-dom";
import { Home, ClipboardList, Users, Settings, Wrench, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { name: "Начало", icon: <Home size={18} />, path: "/" },
  { name: "Заявки", icon: <ClipboardList size={18} />, path: "/requests" },
  { name: "Майстори", icon: <Wrench size={18} />, path: "/workers" },
  { name: "Клиенти", icon: <Users size={18} />, path: "/clients" },
  { name: "Настройки", icon: <Settings size={18} />, path: "/settings" },
];

export default function Sidebar({ open, setOpen }) {
  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex flex-col w-64 bg-gray-800 border-r border-gray-700">
        <div className="flex items-center gap-2 px-6 py-5 font-bold text-xl">
          🧱 Bricky
        </div>
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 p-3 rounded-lg transition ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`
              }
            >
              {item.icon}
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-y-0 left-0 w-64 bg-gray-800 border-r border-gray-700 z-50 flex flex-col"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-700">
                <span className="font-bold text-xl">🧱 Bricky</span>
                <button onClick={() => setOpen(false)}>
                  <X size={20} />
                </button>
              </div>

              <nav className="flex-1 px-4 py-3 space-y-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 p-3 rounded-lg transition ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "text-gray-300 hover:bg-gray-700 hover:text-white"
                      }`
                    }
                  >
                    {item.icon}
                    {item.name}
                  </NavLink>
                ))}
              </nav>
            </motion.div>

            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setOpen(false)}
            />
          </>
        )}
      </AnimatePresence>
    </>
  );
}
