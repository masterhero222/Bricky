import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { apiGet } from "../services/api";

export default function WorkerPreviewPage() {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get("userId");
  const requestId = searchParams.get("requestId");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workers, setWorkers] = useState([]);
  const [worker, setWorker] = useState(null);
  const [gallery, setGallery] = useState([]);

  const hasUserId = useMemo(() => {
    const n = Number(userId);
    return Number.isFinite(n) && n > 0;
  }, [userId]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        if (hasUserId) {
          // Детайл за майстор
          const w = await apiGet(`/workers/${userId}`);
          if (cancelled) return;
          setWorker(w);

          // Галерия (ако има)
          try {
            const g = await apiGet(`/workers/${userId}/gallery`);
            if (cancelled) return;
            setGallery(Array.isArray(g) ? g : []);
          } catch {
            if (cancelled) return;
            setGallery([]);
          }
        } else {
          // Списък с майстори
          const list = await apiGet("/workers");
          if (cancelled) return;
          setWorkers(Array.isArray(list) ? list : []);
        }
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || "Грешка при зареждане.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [hasUserId, userId]);

  return (
    <div style={{ minHeight: "100vh", padding: "24px", color: "#fff", background: "linear-gradient(180deg, #070b14 0%, #0a1633 100%)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 18 }}>
          <h1 style={{ fontSize: 22, margin: 0 }}>
            {hasUserId ? "Профил на майстор" : "Майсторите"}
          </h1>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/" style={btnStyle}>Начало</Link>
            <Link to="/worker-preview" style={btnStyle}>Списък</Link>
            <Link to="/dashboard" style={btnStyle}>Dashboard</Link>
          </div>
        </div>

        {loading && (
          <div style={cardStyle}>
            Зареждаме… (да, и аз мразя loading-и)
          </div>
        )}

        {!loading && error && (
          <div style={{ ...cardStyle, border: "1px solid rgba(255,0,0,0.35)" }}>
            {error}
          </div>
        )}

        {!loading && !error && hasUserId && worker && (
          <div style={cardStyle}>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              <div style={{ width: 140, height: 140, borderRadius: 14, overflow: "hidden", background: "rgba(255,255,255,0.06)" }}>
                {worker?.avatarUrl ? (
                  <img
                    src={worker.avatarUrl}
                    alt="avatar"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ) : null}
              </div>

              <div style={{ flex: 1, minWidth: 260 }}>
                <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
                  {worker?.fullName || "Без име"}
                </div>

                <div style={{ opacity: 0.85, marginBottom: 6 }}>
                  Град: {worker?.city || "—"}
                </div>

                <div style={{ opacity: 0.85, marginBottom: 6 }}>
                  Телефон: {worker?.phone || "—"}
                </div>

                <div style={{ opacity: 0.85, marginBottom: 6 }}>
                  Опит: {worker?.experience || "—"}
                </div>

                <div style={{ opacity: 0.85, marginBottom: 6 }}>
                  Инструменти: {worker?.equipment || "—"}
                </div>

                {Array.isArray(worker?.skills) && worker.skills.length > 0 && (
                  <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {worker.skills.map((s) => (
                      <span key={s} style={pillStyle}>{s}</span>
                    ))}
                  </div>
                )}

                {worker?.description && (
                  <div style={{ marginTop: 12, opacity: 0.9, lineHeight: 1.5 }}>
                    {worker.description}
                  </div>
                )}

                {requestId && (
                  <div style={{ marginTop: 14, opacity: 0.8 }}>
                    requestId: {requestId}
                  </div>
                )}
              </div>
            </div>

            {gallery?.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontWeight: 700, marginBottom: 10 }}>Галерия</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
                  {gallery.map((img) => {
                    const src = img?.url || img?.imageUrl || img?.path || "";
                    if (!src) return null;
                    return (
                      <div key={img.id || src} style={{ borderRadius: 12, overflow: "hidden", background: "rgba(255,255,255,0.06)" }}>
                        <img
                          src={src}
                          alt="gallery"
                          style={{ width: "100%", height: 160, objectFit: "cover" }}
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !error && hasUserId && !worker && (
          <div style={cardStyle}>
            Не намерих майстора. Или `userId` е грешен, или базата пак прави номера.
          </div>
        )}

        {!loading && !error && !hasUserId && (
          <div style={cardStyle}>
            {workers.length === 0 ? (
              <div>Няма майстори (или API-то не връща списък).</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
                {workers.map((w) => (
                  <Link
                    key={w.id || w.userId}
                    to={`/worker-preview?userId=${w.userId}`}
                    style={{ ...cardMiniStyle, textDecoration: "none", color: "#fff" }}
                  >
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>{w.fullName || "Без име"}</div>
                    <div style={{ opacity: 0.85, marginBottom: 6 }}>Град: {w.city || "—"}</div>
                    <div style={{ opacity: 0.85, marginBottom: 6 }}>Тел: {w.phone || "—"}</div>
                    {Array.isArray(w.skills) && w.skills.length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {w.skills.slice(0, 6).map((s) => (
                          <span key={s} style={pillStyle}>{s}</span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const cardStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 16,
  padding: 18,
};

const cardMiniStyle = {
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 16,
  padding: 14,
};

const btnStyle = {
  padding: "8px 12px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(255,255,255,0.06)",
  color: "#fff",
  textDecoration: "none",
  fontSize: 14,
};

const pillStyle = {
  padding: "4px 10px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.18)",
  background: "rgba(0,0,0,0.25)",
  fontSize: 12,
  opacity: 0.95,
};
