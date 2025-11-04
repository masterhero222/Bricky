import { Menu } from "lucide-react";

export default function Topbar({ setSidebarOpen }) {
  return (
    <header className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden text-gray-300 hover:text-white"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu size={22} />
        </button>
        <h1 className="text-lg font-semibold text-gray-100">Bricky Dashboard</h1>
      </div>
      <p className="text-sm text-gray-400 hidden sm:block">Добре дошъл 👋</p>
    </header>
  );
}
