// src/pages/WorkerPage.jsx
// @ts-nocheck
import React, { useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";

export default function WorkerPage() {
  const { id } = useParams(); // това е userId (пример: 1010)
  const navigate = useNavigate();
  const [sp] = useSearchParams();

  useEffect(() => {
    // ако имаме requestId в URL (примерно от клиентски flow), го пренасяме
    const requestId = sp.get("requestId");
    const qs = new URLSearchParams();

    if (requestId) qs.set("requestId", requestId);
    qs.set("userId", String(id || ""));

    // ✅ това е правилната страница, която ти вече имаш и работи
    navigate(`/worker-preview?${qs.toString()}`, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
      Зареждане...
    </div>
  );
}
