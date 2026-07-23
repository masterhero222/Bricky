import LogoutButton from "../LogoutButton";

const WORKER_PROFILE_NAV_ITEMS = [
  ["dashboard", "Контрол панел"],
  ["requests", "Заявки"],
  ["map", "Карта заявки"],
  ["profile", "Профил"],
  ["referrals", "Покани майстор"],
  ["gallery", "Галерия"],
  ["calculator", "Калкулатор"],
  ["settings", "Настройки"],
  ["subscription", "Абонамент"],
];

export default function WorkerProfileSidebar({ activeTab, onSelect }) {
  return (
    <aside className="w-64 bg-[#0a1929]/95 border-r border-cyan-400/15 pt-24 fixed h-full shadow-2xl shadow-cyan-950/20">
      <nav className="flex flex-col gap-2 px-5 text-sm">
        {WORKER_PROFILE_NAV_ITEMS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={`rounded-xl px-4 py-3 text-left font-bold transition ${
              activeTab === key
                ? "border border-green-400/20 bg-green-400/10 text-green-300 shadow-lg shadow-green-950/20"
                : "text-slate-300 hover:bg-cyan-400/10 hover:text-cyan-100"
            }`}
          >
            {label}
          </button>
        ))}

        <div className="mt-6">
          <LogoutButton />
        </div>
      </nav>
    </aside>
  );
}
