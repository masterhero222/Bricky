import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiGet } from "../services/api";
import WorkerPreview from "../components/UI/WorkerPreview";

export default function WorkerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorker();
  }, [id]);

  async function loadWorker() {
    try {
      setLoading(true);

      const workerRes = await apiGet(`/workers/${id}`);
      setWorker(workerRes?.data || null);

      try {
        const galleryRes = await apiGet(`/workers/${id}/gallery`);
        setGallery(Array.isArray(galleryRes?.data) ? galleryRes.data : []);
      } catch {
        setGallery([]);
      }
    } catch (e) {
      console.error("Cannot load worker", e);
      setWorker(null);
      setGallery([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="text-white text-center pt-40">Зареждане...</div>;
  if (!worker) return <div className="text-white text-center pt-40">Няма данни за този майстор.</div>;

  return (
    <WorkerPreview
      worker={worker}
      gallery={gallery}
      onReject={() => navigate(-1)}
    />
  );
}
