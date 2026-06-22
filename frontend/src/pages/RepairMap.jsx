// @ts-nocheck
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { apiGet, apiPost } from "../services/api";
import { photoMediaUrl } from "../utils/mediaUrls";

const TILE_SIZE = 256;
const SOFIA_CENTER = { lat: 42.6977, lng: 23.3219 };
const MIN_ZOOM = 11;
const MAX_ZOOM = 16;
const CLUSTER_DISTANCE_PX = 68;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function latLngToWorld(lat, lng, zoom) {
  const scale = TILE_SIZE * 2 ** zoom;
  const sin = Math.sin((Number(lat) * Math.PI) / 180);
  const x = ((Number(lng) + 180) / 360) * scale;
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;
  return { x, y };
}

function worldToLatLng(x, y, zoom) {
  const scale = TILE_SIZE * 2 ** zoom;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  return { lat, lng };
}

function getLatLng(request) {
  const lat = Number(request?.latitude ?? request?.lat ?? request?.location?.lat);
  const lng = Number(request?.longitude ?? request?.lng ?? request?.location?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function formatTime(dateStr) {
  try {
    return new Date(dateStr).toLocaleString("bg-BG");
  } catch {
    return dateStr || "-";
  }
}

function photoUrl(photo) {
  return photoMediaUrl(photo);
}

function statusTone(status = "") {
  const s = String(status).toLowerCase();
  if (s.includes("зав")) return "border-emerald-300 text-emerald-200 bg-emerald-500/15";
  if (s.includes("проц")) return "border-amber-300 text-amber-200 bg-amber-500/15";
  if (s.includes("кандид")) return "border-sky-300 text-sky-200 bg-sky-500/15";
  return "border-white/70 text-white bg-white/10";
}

function markerPoint(request, centerWorld, zoom, size) {
  const position = getLatLng(request) || SOFIA_CENTER;
  const world = latLngToWorld(position.lat, position.lng, zoom);
  return {
    x: world.x - centerWorld.x + size.width / 2,
    y: world.y - centerWorld.y + size.height / 2,
    latLng: position,
  };
}

function buildClusters(markers, expandedClusterId) {
  const used = new Set();
  const groups = [];

  markers.forEach((marker, index) => {
    if (used.has(index)) return;
    const group = [marker];
    used.add(index);

    markers.forEach((candidate, candidateIndex) => {
      if (used.has(candidateIndex)) return;
      const dx = marker.x - candidate.x;
      const dy = marker.y - candidate.y;
      if (Math.sqrt(dx * dx + dy * dy) <= CLUSTER_DISTANCE_PX) {
        group.push(candidate);
        used.add(candidateIndex);
      }
    });

    groups.push(group);
  });

  return groups.flatMap((group) => {
    if (group.length === 1) return [{ ...group[0], type: "request", itemId: `request-${group[0].request.id}` }];

    const id = `cluster-${group.map((item) => item.request.id).join("-")}`;
    const center = {
      x: group.reduce((sum, item) => sum + item.x, 0) / group.length,
      y: group.reduce((sum, item) => sum + item.y, 0) / group.length,
    };

    if (expandedClusterId !== id) {
      return [{ type: "cluster", itemId: id, id, count: group.length, x: center.x, y: center.y, items: group }];
    }

    return group.map((item, index) => {
      const angle = (index / group.length) * Math.PI * 2;
      const radius = clamp(74 + group.length * 8, 82, 150);
      return {
        ...item,
        type: "request",
        itemId: `request-${item.request.id}`,
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
        expandedFrom: id,
      };
    });
  });
}

function tileRange(centerWorld, zoom, size) {
  const left = centerWorld.x - size.width / 2;
  const top = centerWorld.y - size.height / 2;
  const right = centerWorld.x + size.width / 2;
  const bottom = centerWorld.y + size.height / 2;
  const maxTile = 2 ** zoom - 1;
  const tiles = [];

  for (let tx = Math.floor(left / TILE_SIZE); tx <= Math.floor(right / TILE_SIZE); tx += 1) {
    for (let ty = Math.floor(top / TILE_SIZE); ty <= Math.floor(bottom / TILE_SIZE); ty += 1) {
      if (ty < 0 || ty > maxTile) continue;
      const wrappedX = ((tx % (maxTile + 1)) + (maxTile + 1)) % (maxTile + 1);
      tiles.push({
        key: `${zoom}-${wrappedX}-${ty}`,
        url: `https://tile.openstreetmap.org/${zoom}/${wrappedX}/${ty}.png`,
        left: tx * TILE_SIZE - left,
        top: ty * TILE_SIZE - top,
      });
    }
  }

  return tiles;
}

function SofiaTileMap({ requests, activeId, expandedClusterId, onSelect, onClusterSelect }) {
  const mapRef = useRef(null);
  const dragRef = useRef(null);
  const [size, setSize] = useState({ width: 1000, height: 620 });
  const [zoom, setZoom] = useState(13);
  const [center, setCenter] = useState(SOFIA_CENTER);

  useEffect(() => {
    if (!mapRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        width: Math.max(320, Math.round(entry.contentRect.width)),
        height: Math.max(420, Math.round(entry.contentRect.height)),
      });
    });
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = mapRef.current;
    if (!node) return undefined;

    const handleWheel = (event) => {
      event.preventDefault();
      event.stopPropagation();
      zoomBy(event.deltaY > 0 ? -1 : 1);
    };

    node.addEventListener("wheel", handleWheel, { passive: false });
    return () => node.removeEventListener("wheel", handleWheel);
  }, [zoom]);

  const centerWorld = useMemo(() => latLngToWorld(center.lat, center.lng, zoom), [center, zoom]);
  const tiles = useMemo(() => tileRange(centerWorld, zoom, size), [centerWorld, size, zoom]);
  const markers = useMemo(
    () => requests.map((request) => ({ request, ...markerPoint(request, centerWorld, zoom, size) })),
    [centerWorld, requests, size, zoom]
  );
  const mapItems = useMemo(() => buildClusters(markers, expandedClusterId), [expandedClusterId, markers]);

  function panBy(dx, dy) {
    const next = worldToLatLng(centerWorld.x - dx, centerWorld.y - dy, zoom);
    setCenter({
      lat: clamp(next.lat, 42.55, 42.84),
      lng: clamp(next.lng, 23.08, 23.58),
    });
  }

  function zoomBy(delta) {
    setZoom((current) => clamp(current + delta, MIN_ZOOM, MAX_ZOOM));
  }

  return (
    <div
      ref={mapRef}
      className="absolute inset-0 cursor-grab active:cursor-grabbing overflow-hidden"
      onPointerDown={(event) => {
        if (event.target.closest(".repair-map-marker, .repair-map-cluster")) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        dragRef.current = { x: event.clientX, y: event.clientY };
      }}
      onPointerMove={(event) => {
        if (!dragRef.current) return;
        const dx = event.clientX - dragRef.current.x;
        const dy = event.clientY - dragRef.current.y;
        dragRef.current = { x: event.clientX, y: event.clientY };
        panBy(dx, dy);
      }}
      onPointerUp={() => {
        dragRef.current = null;
      }}
      onPointerCancel={() => {
        dragRef.current = null;
      }}
      onWheel={(event) => event.preventDefault()}
    >
      <div className="absolute inset-0 bg-[#07101d] repair-map-tile-stage">
        {tiles.map((tile) => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            draggable={false}
            className="absolute select-none repair-map-tile"
            style={{ left: tile.left, top: tile.top, width: TILE_SIZE, height: TILE_SIZE }}
          />
        ))}
      </div>

      {mapItems.map((item) =>
        item.type === "cluster" ? (
          <button
            key={item.itemId}
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onClusterSelect(item.id);
            }}
            className="repair-map-cluster absolute z-20"
            style={{ left: item.x, top: item.y }}
          >
            <span>{item.count}</span>
            <small>заявки</small>
          </button>
        ) : (
          <button
            key={item.itemId}
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              onSelect(item.request.id);
            }}
            className={`repair-map-marker absolute z-20 text-left ${String(activeId) === String(item.request.id) ? "is-active" : ""}`}
            style={{ left: item.x, top: item.y }}
          >
            <span className="repair-map-pulse" />
            <span className="repair-map-card">
              <strong>#{item.request.id} · {item.request.category || "Ремонт"}</strong>
              <small>{item.request.address || "Адрес за уточняване"}</small>
            </span>
          </button>
        )
      )}

      <div className="absolute right-4 bottom-4 z-30 flex flex-col rounded-lg overflow-hidden border border-cyan-400/30 bg-black/65">
        <button type="button" onClick={() => zoomBy(1)} className="px-4 py-2 hover:bg-cyan-900/60 font-black">+</button>
        <button type="button" onClick={() => zoomBy(-1)} className="px-4 py-2 hover:bg-cyan-900/60 font-black">-</button>
      </div>
    </div>
  );
}

export default function RepairMap() {
  const [requests, setRequests] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [applyMsg, setApplyMsg] = useState("");
  const [applyingId, setApplyingId] = useState(null);
  const [expandedClusterId, setExpandedClusterId] = useState("");

  const currentUserId = Number(localStorage.getItem("userId") || 0);

  useEffect(() => {
    loadMapRequests();
  }, []);

  async function loadMapRequests() {
    setLoading(true);
    setError("");

    try {
      const res = await apiGet("/requests/map");
      const items = Array.isArray(res.data) ? res.data : [];
      setRequests(items);
      setActiveId((current) => current || items[0]?.id || null);
    } catch (err) {
      console.error("Map requests load error:", err);
      setError("Не успях да заредя заявките за картата.");
    } finally {
      setLoading(false);
    }
  }

  async function applyFromMap(requestId) {
    setApplyMsg("");
    setError("");

    try {
      setApplyingId(requestId);
      await apiPost(`/requests/${requestId}/apply`, {});
      setApplyMsg(`Кандидатства успешно по заявка #${requestId}.`);
      await loadMapRequests();
    } catch (err) {
      console.error("Map apply error:", err);
      const status = err?.response?.status;
      if (status === 401) setApplyMsg("401: логни се пак като майстор.");
      else if (status === 403) setApplyMsg("403: трябва майсторски акаунт.");
      else setApplyMsg(err?.response?.data?.message || "Не успях да кандидатствам от картата.");
    } finally {
      setApplyingId(null);
    }
  }

  const activeRequest = requests.find((request) => String(request.id) === String(activeId)) || requests[0] || null;
  const hasApplied =
    activeRequest &&
    Array.isArray(activeRequest.appliedWorkers) &&
    activeRequest.appliedWorkers.map(Number).includes(currentUserId);
  const isClosed = ["завършена", "отказана"].includes(String(activeRequest?.status || "").toLowerCase());
  const activePhotos = Array.isArray(activeRequest?.photos) ? activeRequest.photos : [];

  return (
    <div className="min-h-screen bg-[#07101d] text-white px-6 py-24">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6">
          <div>
            <p className="text-cyan-300 uppercase tracking-[0.25em] text-xs">Bricky live map</p>
            <h1 className="text-3xl md:text-4xl font-black mt-2">Карта на заявките</h1>
            <p className="text-gray-300 mt-2 max-w-2xl">
              София карта за майстори: движи се между кварталите, скалирай и избирай заявки директно от маркерите.
            </p>
          </div>

          <div className="flex gap-3">
            <button onClick={loadMapRequests} className="px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 font-bold">
              Обнови
            </button>
            <Link to="/worker/profile" className="px-4 py-3 rounded-lg bg-gray-800 hover:bg-gray-700 font-bold">
              Към заявки
            </Link>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-5">
          <div className="relative overflow-hidden rounded-xl border border-cyan-400/25 bg-black min-h-[680px] shadow-2xl shadow-cyan-950/40">
            <SofiaTileMap
              requests={requests}
              activeId={activeRequest?.id}
              expandedClusterId={expandedClusterId}
              onSelect={(id) => {
                setActiveId(id);
                setApplyMsg("");
              }}
              onClusterSelect={(id) => {
                setExpandedClusterId((current) => (current === id ? "" : id));
                setApplyMsg("");
              }}
            />

            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_45%,rgba(56,189,248,0.035),transparent_46%),linear-gradient(135deg,rgba(8,47,73,0.08),rgba(2,6,23,0.18))]" />
            <div className="absolute inset-0 pointer-events-none opacity-10 repair-map-lines" />
            <div className="absolute inset-0 pointer-events-none opacity-8 repair-map-scan" />
            <div className="absolute inset-4 pointer-events-none repair-crimenet-frame" />
            <div className="absolute left-4 top-20 z-30 pointer-events-none repair-map-toolbar">
              {["≡", "⌖", "▣", "⌂", "□"].map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
            <div className="absolute left-7 bottom-6 z-30 pointer-events-none text-[11px] font-black tracking-[0.22em] text-cyan-200/80">
              BRICKY.NET / SOFIA CONTRACTS
            </div>

            <div className="absolute left-5 top-5 z-30 pointer-events-none flex items-center gap-3 text-xs text-cyan-100 bg-black/45 border border-cyan-400/20 rounded px-3 py-2">
              <span className="h-2 w-2 rounded-full bg-cyan-300 animate-pulse" />
              <span>SOFIA / ACTIVE REQUEST NETWORK</span>
            </div>

            <div className="absolute right-5 top-5 z-30 pointer-events-none rounded border border-cyan-400/30 bg-black/55 px-3 py-2 text-xs text-cyan-100">
              {loading ? "Сканиране..." : `${requests.length} заявки`} · Sofia map
            </div>

            {loading && (
              <div className="absolute inset-0 z-40 grid place-items-center bg-black/30 text-cyan-100 font-bold">
                Зареждам карта...
              </div>
            )}

            {error && (
              <div className="absolute left-6 right-6 top-20 z-40 rounded-lg border border-red-400/40 bg-red-950/70 p-4 text-red-100">
                {error}
              </div>
            )}

            {!loading && requests.length === 0 && !error && (
              <div className="absolute inset-0 z-30 grid place-items-center text-gray-300">Няма заявки за показване.</div>
            )}
          </div>

          <aside className="rounded-xl border border-gray-700 bg-gray-900/90 p-5 min-h-[520px]">
            <h2 className="text-xl font-black mb-4">Избран обект</h2>

            {!activeRequest ? (
              <p className="text-gray-400">Избери заявка от картата.</p>
            ) : (
              <div className="space-y-4">
                <div className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold ${statusTone(activeRequest.status)}`}>
                  {activeRequest.status || "нова"}
                </div>

                <div>
                  <h3 className="text-2xl font-black">#{activeRequest.id} · {activeRequest.category || "Ремонт"}</h3>
                  <p className="text-gray-400 text-sm mt-1">{formatTime(activeRequest.created_at)}</p>
                </div>

                <div className="rounded-lg bg-gray-950 border border-gray-800 p-4">
                  <p className="text-gray-400 text-xs uppercase">Адрес</p>
                  <p className="font-bold mt-1">{activeRequest.address || "Няма адрес"}</p>
                </div>

                <div className="rounded-lg bg-gray-950 border border-gray-800 p-4">
                  <p className="text-gray-400 text-xs uppercase">Описание</p>
                  <p className="mt-1 whitespace-pre-wrap">{activeRequest.description || "Няма описание."}</p>
                </div>

                {activePhotos.length > 0 && (
                  <div className="rounded-lg bg-gray-950 border border-gray-800 p-4">
                    <p className="text-gray-400 text-xs uppercase mb-3">Снимки към заявката</p>
                    <div className="grid grid-cols-2 gap-3">
                      {activePhotos.slice(0, 4).map((photo) => (
                        <a key={photo.id || photoUrl(photo)} href={photoUrl(photo)} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-gray-700 bg-gray-900">
                          <img src={photoUrl(photo)} alt={photo.name || "Снимка към заявката"} className="h-24 w-full object-cover hover:scale-105 transition-transform" />
                        </a>
                      ))}
                    </div>
                    {activePhotos.length > 4 && <p className="text-xs text-cyan-200 mt-2">+ още {activePhotos.length - 4} снимки</p>}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-gray-950 border border-gray-800 p-3">
                    <span className="text-gray-400 block">Снимки</span>
                    <strong>{activePhotos.length}</strong>
                  </div>
                  <div className="rounded-lg bg-gray-950 border border-gray-800 p-3">
                    <span className="text-gray-400 block">Клиент</span>
                    <strong>{activeRequest.clientName || "-"}</strong>
                  </div>
                </div>

                {applyMsg && <div className="rounded-lg border border-cyan-400/30 bg-cyan-950/30 p-3 text-sm text-cyan-100">{applyMsg}</div>}

                <button
                  type="button"
                  onClick={() => applyFromMap(activeRequest.id)}
                  disabled={Boolean(applyingId) || hasApplied || isClosed}
                  className="w-full rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-300 px-4 py-3 font-black"
                >
                  {hasApplied
                    ? "Вече кандидатства"
                    : applyingId === activeRequest.id
                    ? "Кандидатствам..."
                    : isClosed
                    ? "Заявката е затворена"
                    : "Кандидатствай от картата"}
                </button>
              </div>
            )}
          </aside>
        </div>
      </div>

      <style>{`
        .repair-map-lines {
          background:
            linear-gradient(32deg, transparent 0 47%, rgba(125, 211, 252, .22) 48% 49%, transparent 50%),
            linear-gradient(145deg, transparent 0 54%, rgba(125, 211, 252, .16) 55% 56%, transparent 57%),
            repeating-linear-gradient(0deg, transparent 0 58px, rgba(125, 211, 252, .045) 59px, transparent 60px),
            repeating-linear-gradient(90deg, transparent 0 70px, rgba(125, 211, 252, .04) 71px, transparent 72px);
        }
        .repair-map-scan {
          background: repeating-linear-gradient(0deg, transparent 0 7px, rgba(255,255,255,.055) 8px, transparent 9px);
        }
        .repair-map-tile-stage {
          background:
            radial-gradient(circle at 50% 44%, rgba(14, 116, 144, .11), transparent 48%),
            #0b1220;
        }
        .repair-map-tile {
          filter: grayscale(.28) saturate(.88) brightness(.82) contrast(1.08);
          opacity: .88;
          mix-blend-mode: normal;
        }
        .repair-crimenet-frame {
          border: 1px solid rgba(186, 230, 253, .34);
          box-shadow:
            inset 0 0 22px rgba(14, 165, 233, .08),
            0 0 22px rgba(14, 165, 233, .06);
          clip-path: polygon(0 18px, 18px 18px, 18px 0, calc(100% - 18px) 0, calc(100% - 18px) 18px, 100% 18px, 100% calc(100% - 18px), calc(100% - 18px) calc(100% - 18px), calc(100% - 18px) 100%, 18px 100%, 18px calc(100% - 18px), 0 calc(100% - 18px));
        }
        .repair-map-toolbar {
          display: flex;
          flex-direction: column;
          gap: 8px;
          color: rgba(125, 211, 252, .72);
          text-shadow: 0 0 8px rgba(56, 189, 248, .38);
        }
        .repair-map-toolbar span {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          border: 1px solid rgba(125, 211, 252, .34);
          background: rgba(2, 6, 23, .54);
          font-weight: 900;
        }
        .repair-map-marker {
          transform: translate(-12px, -12px);
          animation: map-pop .35s ease both;
        }
        .repair-map-marker:hover,
        .repair-map-marker.is-active {
          z-index: 50;
        }
        .repair-map-pulse {
          display: block;
          width: 24px;
          height: 24px;
          border-radius: 999px;
          border: 3px solid white;
          background: rgba(226, 232, 240, .96);
          box-shadow: 0 0 0 7px rgba(34, 211, 238, .12), 0 0 20px rgba(34, 211, 238, .78);
          transition: transform .16s ease, background .16s ease, box-shadow .16s ease;
        }
        .repair-map-card {
          position: absolute;
          left: 30px;
          top: -16px;
          min-width: 210px;
          max-width: 260px;
          border: 1px solid rgba(226,232,240,.88);
          background: rgba(2, 6, 23, .9);
          padding: 9px 11px 18px;
          clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 78%, 18px 78%, 9px 100%, 9px 78%, 0 78%);
          color: white;
          text-shadow: 0 0 10px rgba(34,211,238,.7);
          opacity: 0;
          pointer-events: none;
          transform: translateY(5px) scale(.96);
          transition: opacity .14s ease, transform .14s ease;
        }
        .repair-map-card small {
          display: block;
          color: #bae6fd;
          margin-top: 3px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .repair-map-marker:hover .repair-map-card,
        .repair-map-marker.is-active .repair-map-card {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
        .repair-map-marker:hover .repair-map-pulse,
        .repair-map-marker.is-active .repair-map-pulse {
          transform: scale(1.22);
          background: #facc15;
          box-shadow: 0 0 0 10px rgba(245, 158, 11, .18), 0 0 30px rgba(250, 204, 21, .95);
        }
        .repair-map-cluster {
          width: 62px;
          height: 62px;
          transform: translate(-31px, -31px);
          border-radius: 999px;
          border: 2px solid rgba(255,255,255,.85);
          background: radial-gradient(circle, rgba(250,204,21,.98), rgba(194,65,12,.92));
          color: white;
          box-shadow: 0 0 0 10px rgba(245,158,11,.16), 0 0 30px rgba(245,158,11,.9);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          animation: map-pop .35s ease both;
          text-shadow: 0 1px 8px rgba(0,0,0,.8);
        }
        .repair-map-cluster:hover {
          transform: translate(-31px, -31px) scale(1.08);
        }
        .repair-map-cluster span {
          font-size: 23px;
          line-height: 1;
          font-weight: 900;
        }
        .repair-map-cluster small {
          font-size: 10px;
          line-height: 1.1;
          font-weight: 800;
          color: #fff7ed;
        }
        @keyframes map-pop {
          from { opacity: 0; transform: translate(-12px, 8px) scale(.82); }
          to { opacity: 1; transform: translate(-12px, -12px) scale(1); }
        }
      `}</style>
    </div>
  );
}
