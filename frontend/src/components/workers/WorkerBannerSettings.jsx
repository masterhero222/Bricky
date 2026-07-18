import { CheckCircle2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  DEFAULT_WORKER_BANNER_KEY,
  getAllowedBanners,
  isWorkerBannerAllowed,
  resolveWorkerBanner,
} from "../../constants/workerBannerCatalog";
import { apiPut } from "../../services/api";
import { isDevMockToken, updateDevWorkerAppearance } from "../../services/devMockApi";
import WorkerBlueprintBanner from "./WorkerBlueprintBanner";
import "./WorkerBannerSettings.css";

export default function WorkerBannerSettings({ worker, onSaved }) {
  const categoryKeys = useMemo(() => {
    const keys = Array.isArray(worker?.skillKeys) ? worker.skillKeys : [];
    return keys.map((key) => String(key || "").trim()).filter(Boolean);
  }, [worker?.skillKeys]);

  const allowedBanners = useMemo(() => getAllowedBanners(categoryKeys), [categoryKeys]);
  const activeKey = isWorkerBannerAllowed(worker?.profileBannerKey, categoryKeys)
    ? worker.profileBannerKey
    : DEFAULT_WORKER_BANNER_KEY;

  const [savedKey, setSavedKey] = useState(activeKey);
  const [selectedKey, setSelectedKey] = useState(activeKey);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setSavedKey(activeKey);
    setSelectedKey(activeKey);
    setMessage("");
    setError("");
  }, [activeKey]);

  async function saveAppearance() {
    if (saving || selectedKey === savedKey) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = { profileBannerKey: selectedKey };
      const result = isDevMockToken()
        ? await updateDevWorkerAppearance(payload)
        : (await apiPut("/workers/me/appearance", payload)).data;
      const nextKey = result?.profileBannerKey || DEFAULT_WORKER_BANNER_KEY;

      setSavedKey(nextKey);
      setSelectedKey(nextKey);
      setMessage("Визията е запазена.");
      onSaved?.(nextKey);
    } catch (err) {
      console.error("saveAppearance error:", err);
      setError("Не успяхме да запазим визията. Опитай отново.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="wbs-shell" aria-labelledby="worker-banner-settings-title">
      <div className="wbs-heading">
        <p className="wbs-eyebrow">Визия на профила</p>
        <h2 id="worker-banner-settings-title">Работен банер</h2>
        <p>Избери чертеж, който представя най-добре работата ти.</p>
      </div>

      <div className="wbs-preview" aria-label={`Преглед: ${resolveWorkerBanner(selectedKey).label}`}>
        <WorkerBlueprintBanner bannerKey={selectedKey} />
      </div>

      <div className="wbs-grid">
        {allowedBanners.map((banner) => {
          const selected = selectedKey === banner.key;

          return (
            <button
              key={banner.key}
              type="button"
              className={`wbs-option ${selected ? "is-selected" : ""}`}
              aria-pressed={selected}
              onClick={() => {
                setSelectedKey(banner.key);
                setMessage("");
                setError("");
              }}
            >
              <span className="wbs-thumb">
                <img src={banner.src} alt="" loading="lazy" decoding="async" />
              </span>
              <span className="wbs-option-footer">
                <span>{banner.label}</span>
                {selected ? (
                  <span className="wbs-check" aria-label="Избран">
                    <CheckCircle2 aria-hidden="true" />
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="wbs-actions">
        <button
          type="button"
          className="wbs-save"
          onClick={saveAppearance}
          disabled={saving || selectedKey === savedKey}
        >
          {saving ? "Запазване..." : selectedKey === savedKey ? "Визията е активна" : "Запази визията"}
        </button>
        {message ? <p className="wbs-success">{message}</p> : null}
        {error ? <p className="wbs-error">{error}</p> : null}
      </div>
    </section>
  );
}
