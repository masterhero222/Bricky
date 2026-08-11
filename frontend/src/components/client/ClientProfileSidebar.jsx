import { ChevronDown, Menu, X } from "lucide-react";
import { useState } from "react";
import LogoutButton from "../LogoutButton";

const CLIENT_PROFILE_NAV_ITEMS = [
  ["requests", "Моите заявки"],
  ["history", "История"],
  ["create", "Направи заявка"],
  ["profile", "Профил"],
  ["settings", "Настройки"],
];

export default function ClientProfileSidebar({ activeTab, onSelect }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeLabel =
    CLIENT_PROFILE_NAV_ITEMS.find(([key]) => key === activeTab)?.[1] || "Меню";

  function select(key) {
    setMobileOpen(false);
    onSelect(key);
  }

  const navigation = (mobile = false) => (
    <nav className="flex flex-col gap-2 px-5 text-sm" aria-label="Клиентски профил">
      {CLIENT_PROFILE_NAV_ITEMS.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => select(key)}
          className={`rounded-lg px-4 py-3 text-left font-bold transition-colors ${
            activeTab === key
              ? "border border-green-400/25 bg-green-400/10 text-green-300"
              : "text-slate-300 hover:bg-cyan-400/10 hover:text-cyan-100"
          }`}
        >
          {label}
        </button>
      ))}
      <div className={mobile ? "mt-2" : "mt-6"}>
        <LogoutButton />
      </div>
    </nav>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-cyan-400/15 bg-[#081827] pt-24 shadow-2xl shadow-black/35 lg:block">
        {navigation()}
      </aside>

      <div className="fixed inset-x-0 top-[78px] z-40 border-b border-cyan-400/20 bg-[#071827] shadow-xl shadow-black/45 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen((open) => !open)}
          className="flex min-h-14 w-full items-center justify-between px-5 font-bold text-white"
          aria-expanded={mobileOpen}
          aria-controls="client-profile-mobile-navigation"
        >
          <span className="flex items-center gap-2">
            <Menu size={19} aria-hidden="true" /> {activeLabel}
          </span>
          {mobileOpen ? <X size={20} /> : <ChevronDown size={20} />}
        </button>
        {mobileOpen && (
          <div
            id="client-profile-mobile-navigation"
            className="max-h-[calc(100dvh-134px)] overflow-y-auto border-t border-cyan-400/15 bg-[#071827] py-3"
          >
            {navigation(true)}
          </div>
        )}
      </div>
    </>
  );
}
