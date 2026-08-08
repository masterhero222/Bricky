import { useEffect, useMemo, useState } from "react";
import {
  BriefcaseBusiness,
  Camera,
  Check,
  CheckCircle2,
  Eye,
  Image,
  Info,
  MapPin,
  ShieldCheck,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { getAllowedBanners, resolveWorkerBanner } from "../../constants/workerBannerCatalog";
import "./WorkerProfileEditorPremium.css";

const EDITABLE_KEYS = ["fullName", "city", "description", "experience", "profileBannerKey", "skills"];

function snapshot(profile) {
  return JSON.stringify(
    Object.fromEntries(
      EDITABLE_KEYS.map((key) => [key, Array.isArray(profile?.[key]) ? [...profile[key]].sort() : profile?.[key] || ""]),
    ),
  );
}

function Stars() {
  return <span className="wpe-stars" aria-label="5 звезди">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={18} fill="currentColor" />)}</span>;
}

export default function WorkerProfileEditorPremium({
  profile,
  setProfile,
  avatarSrc,
  onAvatarChange,
  onSave,
  onPreview,
  saving,
  ratingInfo,
  ratingLoading,
  ratingError,
  completedCount = 0,
}) {
  const [tab, setTab] = useState("main");
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const banners = useMemo(() => getAllowedBanners(), []);
  const currentSnapshot = snapshot(profile);
  const dirty = Boolean(savedSnapshot) && currentSnapshot !== savedSnapshot;
  const rating = Number(ratingInfo?.average || 0).toFixed(1);
  const reviews = Number(ratingInfo?.total || 0);
  const profession = profile.skills?.[0] || "Майстор";
  const completionFields = [profile.fullName, profile.city, profile.description, profile.experience, profile.skills?.length, profile.avatarUrl || profile.avatar];
  const completion = Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100);
  const avatarFallback = (event) => {
    event.currentTarget.src = "/media_files/Snejan.jpg";
  };

  useEffect(() => {
    if (!savedSnapshot && profile.fullName) setSavedSnapshot(snapshot(profile));
  }, [profile, savedSnapshot]);

  function update(key, value) {
    setProfile((current) => ({ ...current, [key]: value }));
    setSaveState("idle");
  }

  async function save() {
    setSaveState("saving");
    const ok = await onSave();
    if (ok) {
      setSavedSnapshot(snapshot(profile));
      setSaveState("saved");
    } else {
      setSaveState("error");
    }
  }

  function removeSkill(skill) {
    update("skills", (profile.skills || []).filter((item) => item !== skill));
  }

  function addSkill(event) {
    const skill = event.target.value;
    if (!skill) return;
    update("skills", Array.from(new Set([...(profile.skills || []), skill])));
    event.target.value = "";
  }

  return (
    <section className="wpe-page">
      <header className="wpe-header">
        <div className="wpe-heading">
          <h1>Моят профил</h1>
          <div className="wpe-completion">
            <div className="wpe-progress" style={{ "--progress": `${completion}%` }}>{completion}%</div>
            <div><strong>{completion === 100 ? "Профилът е завършен" : "Профилът е почти завършен"}</strong><span>Попълнете още малко, за да изпъкнете</span></div>
          </div>
        </div>
        <div className="wpe-actions">
          <button type="button" className="wpe-button wpe-button-secondary" onClick={onPreview}><Eye size={18} />Преглед като клиент</button>
          <button type="button" className="wpe-button wpe-button-primary" onClick={save} disabled={saving || !dirty}><Check size={19} />{saving ? "Запазване..." : "Запази промените"}</button>
        </div>
      </header>

      <div className="wpe-layout">
        <aside className="wpe-preview-panel">
          <h2><Eye size={19} /> Публичен изглед</h2>
          <div className="wpe-preview">
            <div className="wpe-preview-banner"><img src={resolveWorkerBanner(profile.profileBannerKey).src} alt="" /></div>
            <div className="wpe-preview-body">
              <img className="wpe-preview-avatar" src={avatarSrc} alt="Профилна снимка" onError={avatarFallback} />
              <h3>{profile.fullName || "Вашето име"}</h3>
              <strong className="wpe-profession">{profession}</strong>
              <span className="wpe-location"><MapPin size={16} />{profile.city || "Град"}</span>
              <div className="wpe-rating"><b>{rating}</b><Stars /><span>{reviews} {reviews === 1 ? "отзив" : "отзива"}</span></div>
              <div className="wpe-trust"><span><ShieldCheck size={18} />{profile.approvalStatus === "approved" ? "Проверен профил" : "Очаква одобрение"}</span><span><BriefcaseBusiness size={18} />{completedCount} завършени обекта</span></div>
              <div className="wpe-preview-section"><small>Специалности</small><div className="wpe-chips">{(profile.skills || []).map((skill) => <span key={skill}>{skill}</span>)}</div></div>
              <div className="wpe-preview-section"><small>За майстора</small><p>{profile.description || "Добавете кратко представяне на вашата работа."}</p></div>
            </div>
          </div>
        </aside>

        <div className="wpe-editor">
          <div className="wpe-tabs" role="tablist">
            {[['main','Основна информация'],['about','За майстора'],['skills','Специалности'],['projects','Проекти']].map(([key,label]) => <button key={key} type="button" className={tab === key ? "is-active" : ""} onClick={() => setTab(key)}>{label}</button>)}
          </div>

          <div className="wpe-editor-body">
            {tab === "main" && <>
              <div className="wpe-section">
                <h3>Профилна снимка и банер</h3>
                <div className="wpe-media-grid">
                  <div className="wpe-avatar-picker"><img src={avatarSrc} alt="Профилна снимка" onError={avatarFallback} /><label className="wpe-button wpe-button-secondary wpe-button-small"><Camera size={16} />Смени снимката<input type="file" accept="image/jpeg,image/png,image/webp" onChange={onAvatarChange} /></label></div>
                  <div><strong className="wpe-field-caption">Банер <span>(видим в публичния профил)</span></strong><div className="wpe-banner-options">{banners.map((banner) => <button key={banner.key} type="button" className={profile.profileBannerKey === banner.key ? "is-selected" : ""} onClick={() => update("profileBannerKey", banner.key)} aria-label={banner.label}><img src={banner.src} alt="" />{profile.profileBannerKey === banner.key && <CheckCircle2 size={22} />}</button>)}</div></div>
                </div>
              </div>
              <div className="wpe-section"><h3>Професионална информация</h3><div className="wpe-field-grid"><label><span><UserRound size={17} />Име</span><input value={profile.fullName} onChange={(event) => update("fullName", event.target.value)} /></label><label><span><MapPin size={17} />Град</span><input value={profile.city} onChange={(event) => update("city", event.target.value)} /></label><label className="wpe-field-wide"><span><BriefcaseBusiness size={17} />Опит</span><input value={profile.experience} onChange={(event) => update("experience", event.target.value)} placeholder="Например: 8 години" /></label></div></div>
            </>}

            {tab === "about" && <div className="wpe-section"><h3>За майстора</h3><div className="wpe-textarea-wrap"><textarea maxLength={500} value={profile.description} onChange={(event) => update("description", event.target.value)} placeholder="Разкажете кратко за своя опит и начин на работа." /><span>{profile.description?.length || 0} / 500</span></div></div>}

            {tab === "skills" && <div className="wpe-section"><h3>Специалности</h3><div className="wpe-skill-editor">{(profile.skills || []).map((skill) => <span key={skill}>{skill}<button type="button" onClick={() => removeSkill(skill)} aria-label={`Премахни ${skill}`}><X size={15} /></button></span>)}<select defaultValue="" onChange={addSkill}><option value="" disabled>Добави специалност</option>{["ВиК","Електро","Шпакловка и мазилки","Боядисване","Плочки","Ремонт на баня","Гипсокартон","Подови настилки","Врати и дограма","Покриви","Дребни ремонти"].filter((skill) => !(profile.skills || []).includes(skill)).map((skill) => <option key={skill}>{skill}</option>)}</select></div></div>}

            {tab === "projects" && <div className="wpe-section wpe-projects"><Image size={28} /><div><h3>Реални обекти през Bricky</h3><p>{completedCount ? `${completedCount} завършени обекта се показват автоматично в публичния профил.` : "Завършените поръчки ще се появят тук автоматично."}</p></div></div>}

            <div className="wpe-rating-info"><Info size={22} /><div><strong>Рейтингът се изчислява от реални клиентски отзиви.</strong><span>Отзивите и рейтингът не могат да се редактират.</span></div><div><b>{rating}</b> <Stars /> <span>{reviews} отзива</span></div></div>
          </div>
        </div>
      </div>

      <footer className={`wpe-status ${saveState === "error" ? "is-error" : ""}`}>
        {saveState === "saving" || saving ? "Запазване..." : saveState === "error" ? "Неуспешно запазване" : saveState === "saved" && !dirty ? "Запазено" : dirty ? "Промените не са запазени" : ratingLoading ? "Зареждане на рейтинга..." : ratingError || "Запазено"}
      </footer>
    </section>
  );
}
