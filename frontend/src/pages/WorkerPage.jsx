import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet } from "../services/api";
import WorkerPreview from "../components/UI/WorkerPreview";

export default function WorkerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorker();
  }, [id]);

  async function loadWorker() {
    try {
      const res = await apiGet(`/workers/${id}`);
      setWorker(res.data);
    } catch (e) {
      console.error("Cannot load worker", e);
      setWorker(null);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-white text-center pt-40">Зареждане...</div>;
  }

  if (!worker) {
    return <div className="text-white text-center pt-40">Няма данни за този майстор.</div>;
  }

  return (
    <WorkerPreview
      worker={worker}
      onChoose={() => alert("TODO: assign worker")}
      onReject={() => navigate(-1)}
      previewMode
    />
  );
}
