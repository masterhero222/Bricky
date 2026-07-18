import {
  BadgeCheck,
  BriefcaseBusiness,
  CircleX,
  Images,
  MapPin,
  ShieldCheck,
  Star,
  UserRound,
} from "lucide-react";
import WorkerBlueprintBanner from "./WorkerBlueprintBanner";
import "./WorkerPreviewPremium.css";

function Stars({ value = 0 }) {
  const filled = Math.max(0, Math.min(5, Math.round(Number(value) || 0)));
  return (
    <div className="wpp-stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((index) => (
        <Star key={index} className={index <= filled ? "is-filled" : ""} />
      ))}
    </div>
  );
}

function FeaturedProject({ project, onOpen }) {
  const cover = project?.cover || project?.photos?.[0] || null;
  const thumbs = (project?.photos || []).slice(1, 3);

  return (
    <article className="wpp-project-card">
      <button className="wpp-project-cover" type="button" onClick={onOpen}>
        {cover?.url ? <img src={cover.url} alt={project.title} loading="lazy" /> : <span />}
      </button>

      <div className="wpp-project-copy">
        <span className="wpp-project-status">Завършен обект</span>
        <h3>{project.title}</h3>
        <p>
          <MapPin aria-hidden="true" /> {project.subtitle || "Обект през Bricky"}
        </p>
        <span className="wpp-photo-count">
          <Images aria-hidden="true" /> {project.photos?.length || 0} снимки
        </span>
        <button type="button" className="wpp-project-link" onClick={onOpen}>
          Разгледай проекта <span aria-hidden="true">→</span>
        </button>
      </div>

      <div className="wpp-project-thumbs" aria-hidden="true">
        {thumbs.map((image, index) => (
          <img key={image.id || image.url || index} src={image.url} alt="" loading="lazy" />
        ))}
      </div>
    </article>
  );
}

export default function WorkerPreviewPremium({
  worker,
  avatarSrc,
  bannerKey,
  ratingInfo,
  completedProjects = [],
  mode = "public",
  isSubmitting = false,
  error = "",
  onBack,
  onSelect,
  onOpenProject,
}) {
  const selectionMode = mode === "candidateSelection";
  const project = completedProjects[0] || null;
  const rating = Number(ratingInfo?.average || 0);
  const reviewCount = Number(ratingInfo?.total || 0);
  const approved = worker?.approvalStatus === "approved" || worker?.isApproved === true || worker?.visibilityStatus === "public";
  const name = worker?.fullName || worker?.name || "Майстор";
  const skillLabels = Array.isArray(worker?.skills) ? worker.skills.filter(Boolean).slice(0, 4) : [];
  const profession = skillLabels[0] || "Майстор";
  const bio = worker?.description || worker?.bio || "Профилът все още няма добавено описание.";

  return (
    <main className="wpp-page worker-profile-premium">
      <article className="wpp-shell">
        <header className="wpp-header">
          <div className="wpp-brand" aria-label="Bricky">
            <span className="wpp-brand-logo-text">Bricky</span>
            <span className="wpp-brand-tagline">ремонти с доверие</span>
          </div>

          <WorkerBlueprintBanner bannerKey={bannerKey} />

          <div className="wpp-verified">
            <ShieldCheck aria-hidden="true" />
            <span>{approved ? "Проверен майстор" : "Профил в проверка"}</span>
          </div>
        </header>

        <div className="wpp-main-grid">
          <aside className="wpp-identity-card">
            <div className="wpp-avatar-wrap">
              <img
                className="wpp-avatar"
                src={avatarSrc}
                alt={name}
                onError={(event) => {
                  event.currentTarget.src = "/media_files/Snejan.jpg";
                }}
              />
            </div>

            <h1 className="wpp-worker-name">{name}</h1>
            <p className="wpp-profession">{profession}</p>
            <p className="wpp-location">
              <MapPin aria-hidden="true" /> {worker?.city || "България"}
            </p>

            <div className="wpp-divider" />

            <div className="wpp-rating-row" aria-label={`${rating.toFixed(1)} от 5`}>
              <strong>{rating.toFixed(1)}</strong>
              <Stars value={rating} />
              <span>{reviewCount} {reviewCount === 1 ? "отзив" : "отзива"}</span>
            </div>

            <div className="wpp-trust-list">
              <div className="wpp-trust-row">
                <ShieldCheck aria-hidden="true" />
                <span>{approved ? "Проверен профил" : "Очаква проверка"}</span>
              </div>
              <div className="wpp-trust-row">
                <BriefcaseBusiness aria-hidden="true" />
                <span>{completedProjects.length} завършени обекта</span>
              </div>
            </div>

            {skillLabels.length > 0 && (
              <div className="wpp-specialties">
                <span className="wpp-section-label">Специалности</span>
                <div className="wpp-chip-list">
                  {skillLabels.map((skill) => (
                    <span className="wpp-chip" key={skill}>{skill}</span>
                  ))}
                </div>
              </div>
            )}
          </aside>

          <section className="wpp-content-card">
            <div className="wpp-section-heading">
              <BriefcaseBusiness aria-hidden="true" />
              <h2>Реални обекти през Bricky</h2>
            </div>

            {project ? (
              <FeaturedProject project={project} onOpen={() => onOpenProject?.(0)} />
            ) : (
              <div className="wpp-empty-projects">Все още няма публични завършени обекти през Bricky.</div>
            )}

            <section className="wpp-bio-card">
              <div className="wpp-bio-heading">
                <UserRound aria-hidden="true" />
                <h2>За майстора</h2>
              </div>
              <p>{bio}</p>
            </section>
          </section>
        </div>

        {error && <div className="wpp-inline-error">{error}</div>}

        {selectionMode && (
          <footer className="wpp-actions">
            <button className="wpp-btn wpp-btn-secondary" type="button" onClick={onBack} disabled={isSubmitting}>
              <CircleX aria-hidden="true" />
              Откажи
            </button>
            <button className="wpp-btn wpp-btn-primary" type="button" onClick={onSelect} disabled={isSubmitting}>
              <BadgeCheck aria-hidden="true" />
              {isSubmitting ? "Избирам..." : "Избери майстора"}
            </button>
          </footer>
        )}

      </article>
    </main>
  );
}
