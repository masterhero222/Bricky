// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PhoneCall, CheckCircle, XCircle } from "lucide-react";
import { apiGet, apiPost } from "../../services/api";

function absUrl(url) {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${import.meta.env.VITE_API_URL}${url}`;
}

export default function WorkerPreview() {
  const [sp] = useSearchParams();
  const requestId = Number(sp.get("requestId") || 0);
  const userId = Number(sp.get("userId") || 0);

  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    load();
  }, [requestId, userId]);

  async function load() {
    try {
      setErr("");
      setLoading(true);

      if (!userId) {
        setErr("Липсва userId в URL.");
        setWorker(null);
        return;
      }

      const res = await apiGet(`/workers/${userId}`);
      setWorker(res.data || null);
    } catch (e) {
      console.error(e);
      setErr("Не успях да заредя профила на майстора.");
      setWorker(null);
    } finally {
      setLoading(false);
    }
  }

  async function assign() {
    try {
      if (!requestId) return alert("Липсва requestId в URL.");
      if (!userId) return alert("Липсва userId в URL.");

      await apiPost(`/requests/${requestId}/assign`, { workerUserId: userId });

      alert(`Назначен майстор за заявка #${requestId} (workerUserId=${userId})`);
      window.location.href = "/client/profile";
    } catch (e) {
      console.error(e?.response?.data || e);
      alert(
        e?.response?.data?.message ||
          "Грешка при назначаване. Провери дали си логнат като client и дали майсторът е кандидатствал."
      );
    }
  }

  function cancel() {
    window.location.href = "/client/profile";
  }

  const avatarSrc = useMemo(() => {
    const url = worker?.avatarUrl ? absUrl(worker.avatarUrl) : "";
    return url || "/media_files/Snejan.jpg";
  }, [worker]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Зареждане...
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-6">
        <div className="bg-gray-800 border border-gray-700 rounded-2xl p-8 max-w-xl w-full text-center">
          <div className="text-red-400 font-bold">{err}</div>
          <button
            className="mt-6 bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-bold"
            onClick={() => (window.location.href = "/client/profile")}
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        Няма данни.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pt-24 pb-20 px-6">
      <div className="max-w-5xl mx-auto bg-white text-black rounded-3xl shadow-xl p-10">
        <div className="flex flex-col items-center">
          <img
            src={avatarSrc}
            className="w-40 h-40 rounded-full object-cover border-4 border-red-500"
            alt="avatar"
          />
          <h2 className="text-3xl font-extrabold mt-6">
            {worker.skills?.[0] || "Специалност"}
          </h2>
          <div className="text-gray-600 mt-1">Майстор</div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-10">
          <div className="bg-red-500 text-white p-6 rounded-2xl">
            <div className="text-xl font-bold">{worker.fullName || worker.name || `userId=${userId}`}</div>
            <div className="mt-3">
              <b>Град:</b> {worker.city || "—"}
            </div>
            <div className="mt-2">
              <b>Телефон:</b> {worker.phone || "—"}
            </div>
            <div className="mt-4 opacity-95">
              <b>Описание:</b> {worker.description || "—"}
            </div>
            <div className="mt-4 opacity-95">
              <b>Опит:</b> {worker.experience || "—"}
            </div>
          </div>

          <div className="bg-gray-100 p-6 rounded-2xl">
            <div className="text-xl font-bold text-red-600 text-center mb-3">
              Снимки от обекти
            </div>
            <div className="text-gray-500 text-center">
              (MVP) Няма качени снимки.
            </div>
          </div>

          <div className="bg-gray-100 p-6 rounded-2xl md:col-span-2">
            <div className="text-xl font-bold text-red-600 mb-3">Оборудване / Срок</div>
            <div>{worker.equipment || "—"}</div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mt-10">
          <button className="flex-1 bg-red-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">
            <PhoneCall size={20} />
            Приемам обаждане от майстора
          </button>

          <button
            onClick={cancel}
            className="md:w-56 bg-gray-200 hover:bg-gray-300 py-4 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <XCircle size={20} />
            Откажи
          </button>

          <button
            onClick={assign}
            className="md:w-56 bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2"
          >
            <CheckCircle size={20} />
            Избери
          </button>
        </div>

        <div className="mt-6 text-center text-gray-400 text-sm">
          Preview режим: клиентът разглежда профил и избира майстор за заявката.
        </div>
      </div>
    </div>
  );
}
