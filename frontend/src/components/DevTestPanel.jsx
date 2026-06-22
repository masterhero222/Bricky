import { useEffect, useState } from "react";
import { getDevIdentities, isDevMockToken, resetDevDb, setDevIdentity } from "../services/devMockApi";

export default function DevTestPanel() {
  const [visible, setVisible] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => setTick((x) => x + 1);
    window.addEventListener("bricky-dev-identity-changed", refresh);
    window.addEventListener("storage", refresh);
    refresh();
    return () => {
      window.removeEventListener("bricky-dev-identity-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  if (!import.meta.env.DEV) return null;

  const { clients, workers } = getDevIdentities();
  const activeRole = localStorage.getItem("role") || "none";
  const activeUserId = localStorage.getItem("userId") || "";
  const activeName = localStorage.getItem("userName") || "няма";
  const activeMock = isDevMockToken();

  const login = (role, id) => {
    setDevIdentity(role, id);
    window.location.href = role === "worker" ? "/worker/profile" : "/client/profile";
  };

  return (
    <div className="fixed bottom-4 right-4 z-[9999] text-white">
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="rounded-full bg-fuchsia-700 px-4 py-2 text-sm font-bold shadow-lg hover:bg-fuchsia-600"
      >
        Dev тест
      </button>

      {visible && (
        <div className="mt-3 w-80 rounded-xl border border-fuchsia-500/40 bg-gray-950 p-4 shadow-2xl">
          <div className="mb-3 text-sm">
            <div className="font-bold text-fuchsia-200">Активен: {activeName}</div>
            <div className="text-gray-400">role={activeRole}, userId={activeUserId || "-"}, mock={String(activeMock)}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="mb-2 text-xs font-bold uppercase text-gray-400">Клиенти</div>
              <div className="space-y-2">
                {clients.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => login("client", c.id)}
                    className="w-full rounded bg-emerald-700 px-3 py-2 text-left text-xs font-semibold hover:bg-emerald-600"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-bold uppercase text-gray-400">Майстори</div>
              <div className="space-y-2">
                {workers.map((w) => (
                  <button
                    key={w.userId}
                    type="button"
                    onClick={() => login("worker", w.userId)}
                    className="w-full rounded bg-amber-700 px-3 py-2 text-left text-xs font-semibold hover:bg-amber-600"
                  >
                    {w.fullName}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              resetDevDb();
              setTick(tick + 1);
              window.location.reload();
            }}
            className="mt-4 w-full rounded bg-red-700 px-3 py-2 text-sm font-bold hover:bg-red-600"
          >
            Reset dev данни
          </button>
        </div>
      )}
    </div>
  );
}
