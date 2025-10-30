import { Bell, User } from "lucide-react";

export default function Topbar() {
  return (
    <header className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold">Контролен панел</h1>
      <div className="flex items-center gap-4">
        <Bell size={20} className="cursor-pointer hover:text-gray-300" />
        <div className="flex items-center gap-2 cursor-pointer hover:text-gray-300">
          <User size={20} />
          <span>Цветослав</span>
        </div>
      </div>
    </header>
  );
}
