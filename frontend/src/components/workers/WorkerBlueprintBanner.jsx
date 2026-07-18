import { DEFAULT_WORKER_BANNER_KEY, resolveWorkerBanner } from "../../constants/workerBannerCatalog";

export default function WorkerBlueprintBanner({ bannerKey }) {
  const banner = resolveWorkerBanner(bannerKey || DEFAULT_WORKER_BANNER_KEY);

  return (
    <div className="wpp-banner" aria-label={`Работен банер: ${banner.label}`}>
      <span className="wpp-banner-glow" aria-hidden="true" />
      <img className="wpp-banner-image" src={banner.src} alt="" loading="eager" decoding="async" />
    </div>
  );
}
