import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Bath,
  Brush,
  DoorOpen,
  Droplets,
  Grid3X3,
  Hammer,
  Home,
  KeyRound,
  Layers,
  PaintRoller,
  PanelsTopLeft,
  ThermometerSun,
  Trash2,
  Upload,
  Wrench,
  Zap,
} from "lucide-react";
import { apiGet, apiPost } from "../services/api";
import {
  REPAIR_CATEGORY_FLOW,
  REPAIR_CATEGORY_OPTIONS,
} from "../constants/repairCatalog";
import { getPricingActivity } from "../constants/repairPricingConfig";
import { calculateRepairEstimate, MAX_EXACT_AREA_M2 } from "../utils/repairPriceCalculator";
import { calculateCatalogEstimate } from "../utils/pricingCatalogAdapter";
import { useAuthModal } from "../context/AuthModalContext";

const PRICING_MODES = [
  { value: "labor_only", label: "Труд", description: "Материалите не са включени в ориентира." },
  { value: "labor_plus_materials", label: "Труд + материали", description: "Включва ориентировъчните материали за избраните дейности." },
];

const QUANTITY_PROMPTS = {
  vik: "Колко точки или отделни задачи има?",
  electro: "Колко електрически точки има?",
  painting: "Каква площ трябва да се боядиса?",
  plaster: "Каква площ трябва да се шпаклова или измазва?",
  tiles: "Каква площ трябва да се облицова?",
  bathroom_renovation: "Каква е площта на банята?",
  drywall: "Каква площ трябва да се изгради?",
  flooring: "Каква площ е подовата настилка?",
  heating_cooling: "Колко уреда или отоплителни точки има?",
  windows_doors: "Колко врати или прозорци има?",
  furniture_mounting: "Колко мебели или монтажни задачи има?",
  roof_waterproofing: "Каква площ или дължина е засегната?",
  demolition_cleanup: "Какво количество трябва да се изкърти или извози?",
  full_renovation: "Каква е площта на имота?",
  small_repairs: "Колко отделни задачи има?",
};

const CONFIDENCE_LABELS = {
  high: "Висока увереност",
  medium: "Средна увереност",
  low: "Ниска увереност",
  inspection_required: "Нужен е оглед",
};

const STEPS = ["Ремонт", "Дейности", "Размер", "Адрес", "Преглед"];
const MAX_REQUEST_PHOTOS = 20;
const MAX_REQUEST_PHOTO_BYTES = 8 * 1024 * 1024;
const REQUEST_PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const ICONS = {
  bath: Bath,
  brush: Brush,
  door: DoorOpen,
  droplets: Droplets,
  grid: Grid3X3,
  hammer: Hammer,
  home: Home,
  key: KeyRound,
  layers: Layers,
  "paint-roller": PaintRoller,
  panels: PanelsTopLeft,
  thermometer: ThermometerSun,
  trash: Trash2,
  wrench: Wrench,
  zap: Zap,
};

function cx(...items) {
  return items.filter(Boolean).join(" ");
}

export default function Requests() {
  return <RequestFlow />;
}

export function RequestFlow({ embedded = false, onCreated }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showLogin } = useAuthModal();
  const presetCategoryKey = searchParams.get("category");
  const initialCategoryKey = REPAIR_CATEGORY_OPTIONS.some((item) => item.key === presetCategoryKey)
    ? presetCategoryKey
    : "bathroom_renovation";
  const [isLogged, setIsLogged] = useState(false);
  const [step, setStep] = useState(0);
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pricingCatalog, setPricingCatalog] = useState(null);
  const [locationStatus, setLocationStatus] = useState("idle");
  const [locationMessage, setLocationMessage] = useState("Въведи точния адрес на обекта.");

  const [form, setForm] = useState({
    categoryKey: initialCategoryKey,
    activities: [],
    quantity: "",
    exactAreaM2: "",
    pricingMode: "labor_plus_materials",
    address: "",
    latitude: null,
    longitude: null,
    locationSource: "manual",
    description: "",
    photos: [],
  });

  useEffect(() => {
    setIsLogged(Boolean(localStorage.getItem("token")));
  }, []);

  useEffect(() => {
    let active = true;
    apiGet("/catalog")
      .then((response) => active && setPricingCatalog(response.data || null))
      .catch(() => active && setPricingCatalog(null));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const categoryKey = searchParams.get("category");

    if (!REPAIR_CATEGORY_OPTIONS.some((item) => item.key === categoryKey)) {
      return;
    }

    setForm((prev) => {
      if (prev.categoryKey === categoryKey) {
        return prev;
      }

      return {
        ...prev,
        categoryKey,
        activities: [],
        quantity: "",
        exactAreaM2: "",
      };
    });
  }, [searchParams]);

  const category = useMemo(
    () => REPAIR_CATEGORY_OPTIONS.find((item) => item.key === form.categoryKey) || REPAIR_CATEGORY_OPTIONS[0],
    [form.categoryKey]
  );
  const flow = REPAIR_CATEGORY_FLOW[category.key] || REPAIR_CATEGORY_FLOW.other;
  const selectedPricingActivities = useMemo(
    () => form.activities.map((item) => getPricingActivity(category.key, item)).filter(Boolean),
    [category.key, form.activities]
  );
  const asksForArea = selectedPricingActivities.some((item) => item.areaBased);
  const quantityPrompt = QUANTITY_PROMPTS[category.key] || "Какъв е приблизителният обхват?";
  const fallbackEstimate = useMemo(
    () => calculateRepairEstimate({
      categoryKey: category.key,
      selectedActivities: form.activities,
      sizeOption: form.quantity,
      exactAreaM2: form.exactAreaM2,
      pricingMode: form.pricingMode,
      location: "sofia_regular",
    }),
    [category.key, form.activities, form.quantity, form.exactAreaM2, form.pricingMode]
  );
  const estimate = useMemo(
    () => calculateCatalogEstimate({
      catalog: pricingCatalog,
      categoryKey: category.key,
      selectedActivities: form.activities,
      quantity: form.quantity,
      exactAreaM2: form.exactAreaM2,
      pricingMode: form.pricingMode,
      fallbackEstimate,
    }),
    [category.key, fallbackEstimate, form.activities, form.exactAreaM2, form.pricingMode, form.quantity, pricingCatalog]
  );

  function setField(field, value) {
    setForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "address"
        ? { latitude: null, longitude: null, locationSource: "manual" }
        : {}),
    }));
    if (field === "address") {
      setLocationStatus("idle");
      setLocationMessage("Адресът ще бъде проверен преди продължаване.");
    }
  }

  async function handlePhotos(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const unsupported = files.find((file) => !REQUEST_PHOTO_TYPES.has(file.type));
    if (unsupported) {
      setStatus(`Снимката „${unsupported.name}“ не е JPG, PNG или WebP.`);
      e.target.value = "";
      return;
    }

    const oversized = files.find((file) => file.size > MAX_REQUEST_PHOTO_BYTES);
    if (oversized) {
      setStatus(`Снимката „${oversized.name}“ е над лимита от 8 MB.`);
      e.target.value = "";
      return;
    }
    if ((form.photos?.length || 0) + files.length > MAX_REQUEST_PHOTOS) {
      setStatus(`Може да качите най-много ${MAX_REQUEST_PHOTOS} снимки.`);
      e.target.value = "";
      return;
    }

    try {
      const photos = await filesToPhotos(files);
      setForm((prev) => ({ ...prev, photos: [...(prev.photos || []), ...photos] }));
    } catch (err) {
      console.error(err);
      setStatus("Не успях да прочета избраните снимки.");
    } finally {
      e.target.value = "";
    }
  }

  function removePhoto(photoId) {
    setForm((prev) => ({
      ...prev,
      photos: (prev.photos || []).filter((photo) => String(photo.id) !== String(photoId)),
    }));
  }

  function selectCategory(key) {
    const nextFlow = REPAIR_CATEGORY_FLOW[key] || REPAIR_CATEGORY_FLOW.other;
    setStatus("");
    setForm((prev) => ({
      ...prev,
      categoryKey: key,
      activities: [],
      quantity: nextFlow.quantityOptions?.[0] || "",
      exactAreaM2: "",
    }));
    setStep(1);
  }

  function toggleActivity(activity) {
    setForm((prev) => {
      const exists = prev.activities.includes(activity);
      return {
        ...prev,
        activities: exists ? prev.activities.filter((item) => item !== activity) : [...prev.activities, activity],
      };
    });
  }

  function canContinue() {
    if (step === 1) return form.activities.length > 0;
    if (step === 2) {
      const area = Number(String(form.exactAreaM2).replace(",", "."));
      const areaIsValid = Number.isFinite(area) && area > 0 && area <= MAX_EXACT_AREA_M2;
      return Boolean(form.quantity) || areaIsValid;
    }
    if (step === 3) {
      return Boolean(form.address.trim()) || (Number.isFinite(form.latitude) && Number.isFinite(form.longitude));
    }
    return true;
  }

  async function next() {
    setStatus("");
    if (!canContinue()) {
      setStatus("Попълни текущата стъпка, за да продължим.");
      return;
    }
    if (step === 3) {
      if (!isLogged) {
        setStatus("Влез в клиентския си профил, за да проверим адреса.");
        showLogin();
        return;
      }
      setLocationStatus("loading");
      setLocationMessage("Проверяваме адреса и позицията му на картата...");
      try {
        const response = await apiPost("/requests/geocode", {
          address: form.address.trim(),
        });
        setForm((prev) => ({
          ...prev,
          latitude: response.data.latitude,
          longitude: response.data.longitude,
          locationSource: "address_geocode",
        }));
        setLocationStatus("granted");
        setLocationMessage("Адресът е намерен и ще бъде отбелязан на картата.");
      } catch (error) {
        setLocationStatus("denied");
        setLocationMessage(
          error?.response?.data?.message ||
            "Адресът не беше намерен. Добави град, улица и номер.",
        );
        return;
      }
    }
    setStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }

  function back() {
    setStatus("");
    setStep((prev) => Math.max(prev - 1, 0));
  }

  function goToStep(targetStep) {
    setStatus("");
    const nextStep = Math.max(0, Math.min(Number(targetStep) || 0, step));
    setStep(nextStep);
  }

  function buildDescription() {
    return [
      `Тип ремонт: ${category.label}`,
      `Планирани дейности: ${form.activities.join(", ") || "не е избрано"}`,
      `Приблизителен размер: ${form.quantity || "не е посочено"}`,
      form.exactAreaM2 ? `Точна площ, въведена от клиента: ${form.exactAreaM2} кв.м` : "",
      form.description ? `Описание: ${form.description}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function submit() {
    if (!isLogged) {
      setStatus("Първо трябва да влезете в акаунта си.");
      showLogin();
      return;
    }
    if (localStorage.getItem("role") !== "client") {
      setStatus("Само клиентски профил може да изпраща заявки.");
      return;
    }

    try {
      setSubmitting(true);
      setStatus("");
      const requestPayload = {
        address: form.address.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
        locationSource: form.locationSource,
        category: category.label,
        categoryKey: category.key,
        description: buildDescription(),
        estimateMin: estimate.expectedMin,
        estimateMax: estimate.expectedMax,
        estimateCurrency: estimate.currency,
        pricingSnapshot: {
          pricingVersion: estimate.pricingVersion,
          pricingSource: estimate.source || "fallback",
          materialPricingVersion: estimate.materialPricingVersion,
          materialPriceIndexVersion: estimate.materialPriceIndexVersion,
          pricingMode: estimate.pricingMode,
          pricingModeBehavior: estimate.pricingModeBehavior,
          selectedCategoryKey: category.key,
          selectedActivityKeys: estimate.calculatedActivities,
          selectedActivityLabels: estimate.selectedActivityLabels,
          sizeKey: form.quantity,
          exactAreaM2: estimate.exactAreaM2,
          laborMin: estimate.laborMin,
          laborMax: estimate.laborMax,
          materialMin: estimate.materialMin,
          materialMax: estimate.materialMax,
          totalMin: estimate.totalMin,
          totalMax: estimate.totalMax,
          expectedMin: estimate.expectedMin,
          expectedMax: estimate.expectedMax,
          possibleMin: estimate.possibleMin,
          possibleMax: estimate.possibleMax,
          confidence: estimate.confidence,
          displayMode: estimate.displayMode,
          rangeTooWide: estimate.rangeTooWide,
          showPossibleRange: estimate.showPossibleRange,
          variationReason: estimate.variationReason,
          currency: estimate.currency,
          materialConfidence: estimate.materialConfidence,
          includedMaterialKeys: estimate.includedMaterialKeys,
          excludedMaterialKeys: estimate.excludedMaterialKeys,
          warnings: estimate.warnings,
          notes: estimate.notes,
        },
        photos: String(localStorage.getItem("token") || "").startsWith("local-dev-token")
          ? form.photos || []
          : [],
      };

      const createdResponse = await apiPost("/requests", requestPayload);
      const createdRequestId = Number(createdResponse?.data?.id);
      const realImageFiles = (form.photos || [])
        .map((photo) => photo?.file)
        .filter((file) => file instanceof File);

      if (
        !String(localStorage.getItem("token") || "").startsWith("local-dev-token") &&
        createdRequestId &&
        realImageFiles.length
      ) {
        for (const file of realImageFiles) {
          const mediaPayload = new FormData();
          mediaPayload.append("images", file);
          await apiPost(`/requests/${createdRequestId}/media/before`, mediaPayload);
        }
      }
      setStatus("Заявката е изпратена за одобрение от админ.");
      if (onCreated) onCreated();
      else navigate("/client/profile?tab=requests", { replace: true });
      setStep(0);
      setLocationStatus("idle");
      setLocationMessage("Въведи точния адрес на обекта.");
      setForm((prev) => ({
        ...prev,
        activities: [],
        quantity: "",
        exactAreaM2: "",
        address: "",
        latitude: null,
        longitude: null,
        locationSource: "manual",
        description: "",
        photos: [],
      }));
    } catch (err) {
      console.error(err);
      const isTooLarge = err?.response?.status === 413;
      setStatus(
        isTooLarge
          ? "Снимката е прекалено голяма. Лимитът е 8 MB за една снимка и до 20 снимки."
          : err?.response?.data?.message || "Не успях да изпратя заявката. Опитай отново.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={embedded ? "text-white" : "min-h-screen bg-gray-900 px-6 py-24 text-white"}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-cyan-300">Нова заявка</p>
          <h1 className="mt-2 text-3xl font-black">Заяви проект за ремонт</h1>
          <p className="mt-2 max-w-3xl text-gray-300">
            Избери тип ремонт, уточни дейностите и мястото, а Bricky ще изпрати заявката за одобрение.
          </p>
        </div>

        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-gray-400">
            <span>{STEPS[step]}</span>
            <span>{step + 1}/{STEPS.length}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-gray-800">
            <div
              className="h-full rounded-full bg-cyan-400 transition-all"
              style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <section className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
            {!isLogged && (
              <div className="mb-5 rounded-xl border border-yellow-500/40 bg-yellow-500/10 p-4 text-yellow-100">
                За да изпратиш заявка, влез в клиентския си профил.
              </div>
            )}

            {step === 0 && (
              <div>
                <h2 className="text-2xl font-black">Бързи връзки за ремонт</h2>
                <p className="mt-2 text-gray-300">Избери какъв ремонт планираш. После ще се покажат конкретните дейности за него.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                  {REPAIR_CATEGORY_OPTIONS.map((item) => (
                    <RepairQuickLink key={item.key} item={item} active={item.key === form.categoryKey} onClick={() => selectCategory(item.key)} />
                  ))}
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <StepTitle category={category} title={`Кои дейности планираш?`} step={step} onGoToStep={goToStep} />
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {flow.activities.map((activity) => (
                    <label
                      key={activity}
                      className={cx(
                        "flex cursor-pointer items-center gap-3 rounded-xl border p-4",
                        form.activities.includes(activity) ? "border-cyan-300 bg-cyan-500/15" : "border-gray-700 bg-gray-900"
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={form.activities.includes(activity)}
                        onChange={() => toggleActivity(activity)}
                        className="h-5 w-5"
                      />
                      <span className="font-semibold">{activity}</span>
                    </label>
                  ))}
                </div>
                {form.activities.length > 0 && (
                  <div className="mt-8 border-t border-gray-700 pt-6">
                    <h3 className="text-lg font-black">Какво да включва ориентирът?</h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      {PRICING_MODES.map((mode) => (
                        <RadioCard
                          key={mode.value}
                          selected={estimate.pricingMode === mode.value}
                          onClick={() => setField("pricingMode", mode.value)}
                        >
                          <span className="block font-bold">{mode.label}</span>
                          <span className="mt-1 block text-sm font-normal text-gray-400">{mode.description}</span>
                        </RadioCard>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div>
                <StepTitle category={category} title={quantityPrompt} step={step} onGoToStep={goToStep} />
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {flow.quantityOptions.map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setField("quantity", option)}
                      className={cx(
                        "rounded-xl border p-4 text-left font-bold",
                        form.quantity === option ? "border-cyan-300 bg-cyan-500/15" : "border-gray-700 bg-gray-900"
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {asksForArea && (
                <div className="mt-6 rounded-xl border border-cyan-400/40 bg-gray-900 p-4">
                  <label htmlFor="exact-area-m2" className="block text-sm font-black text-cyan-200">
                    Колко квадратни метра трябва да се ремонтират?
                  </label>
                  <p className="mt-1 text-sm text-gray-400">
                    Въведи точна или приблизителна площ, ако я знаеш. При дейности по площ тя прави изчислението по-точно.
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <input
                      id="exact-area-m2"
                      type="number"
                      min="0.1"
                      max={MAX_EXACT_AREA_M2}
                      step="0.1"
                      value={form.exactAreaM2}
                      onChange={(e) => setField("exactAreaM2", e.target.value)}
                      placeholder="Напр. 24"
                      className="min-w-0 flex-1 rounded-lg border border-gray-700 bg-gray-950 p-3"
                    />
                    <span className="shrink-0 font-bold">кв.м</span>
                  </div>
                  {Number(form.exactAreaM2) > MAX_EXACT_AREA_M2 && (
                    <p className="mt-2 text-sm font-semibold text-red-300">
                      За площ над {MAX_EXACT_AREA_M2} кв.м е нужна индивидуална оценка.
                    </p>
                  )}
                </div>
                )}
              </div>
            )}

            {step === 3 && (
              <div>
                <StepTitle category={category} title="Къде се намира обектът?" step={step} onGoToStep={goToStep} />
                <div className="mt-6 space-y-4">
                  <label className="block">
                    <span className="mb-2 block font-bold">Точен адрес</span>
                    <input
                      value={form.address}
                      onChange={(e) => setField("address", e.target.value)}
                      placeholder="Напр. София, ул. Козяк 12, вход Б"
                      className="w-full rounded-lg border border-gray-700 bg-gray-900 p-3"
                    />
                  </label>
                  <p className={cx("text-sm", locationStatus === "granted" ? "text-green-300" : locationStatus === "denied" ? "text-amber-300" : "text-gray-400")}>
                    {locationMessage}
                  </p>
                </div>
              </div>
            )}

            {step === 4 && (
              <div>
                <StepTitle category={category} title="Финални детайли" step={step} onGoToStep={goToStep} />
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  placeholder="Добави свободно описание, ако има важни детайли за майсторите."
                  className="mt-6 h-32 w-full rounded-lg border border-gray-700 bg-gray-900 p-3"
                />

                <div className="mt-5 rounded-xl border border-gray-700 bg-gray-900 p-4">
                  <label className="block font-bold">Снимки на проблема / мястото за ремонт</label>
                  <label className="mt-4 inline-flex min-h-12 cursor-pointer items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 font-bold text-white shadow-lg shadow-blue-950/30 transition hover:bg-blue-500 focus-within:ring-2 focus-within:ring-cyan-300">
                    <Upload size={19} /> Избери снимки
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handlePhotos} className="sr-only" />
                  </label>
                  <p className="mt-2 text-xs text-gray-400">
                    JPG, PNG или WebP. До 8 MB на снимка, максимум 20 снимки.
                  </p>

                  {form.photos.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                      {form.photos.map((photo) => (
                        <div key={photo.id} className="relative overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
                          <img src={photo.url} alt={photo.name || "Снимка към заявка"} loading="lazy" decoding="async" className="h-24 w-full object-cover" />
                          <button
                            type="button"
                            onClick={() => removePhoto(photo.id)}
                            className="absolute right-1 top-1 rounded bg-red-600 px-2 py-1 text-xs font-bold hover:bg-red-700"
                          >
                            Махни
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 rounded-xl border border-gray-700 bg-gray-900 p-4 text-sm text-gray-200 whitespace-pre-line">
                  {buildDescription()}
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-wrap items-center gap-3">
              {step > 0 && (
                <button type="button" onClick={back} className="rounded-lg bg-gray-700 px-5 py-3 font-bold hover:bg-gray-600">
                  Назад
                </button>
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={next} disabled={locationStatus === "loading"} className="rounded-lg bg-blue-600 px-5 py-3 font-bold hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60">
                  {locationStatus === "loading" ? "Проверявам адреса..." : "Напред"}
                </button>
              ) : (
                <button type="button" onClick={submit} disabled={submitting} className="rounded-lg bg-green-600 px-5 py-3 font-bold hover:bg-green-700 disabled:opacity-60">
                  {submitting ? "Записвам..." : "Изпрати заявка"}
                </button>
              )}
              {status && <span className="text-sm font-semibold text-yellow-300">{status}</span>}
            </div>
          </section>

          <aside className="rounded-2xl border border-gray-700 bg-gray-800 p-6 shadow-lg">
            <h2 className="text-xl font-black">Обобщение</h2>
            <SummaryLine label="Тип" value={category.label} />
            <SummaryLine label="Дейности" value={form.activities.length ? form.activities.join(", ") : "не са избрани"} />
            <SummaryLine label="Размер" value={form.quantity || "не е избран"} />
            <SummaryLine label="Площ от клиента" value={form.exactAreaM2 ? `${form.exactAreaM2} кв.м` : "не е въведена"} />
            <SummaryLine label="Ценови режим" value={PRICING_MODES.find((item) => item.value === estimate.pricingMode)?.label} />
            <SummaryLine label="Адрес" value={form.address.trim() || "не е посочен"} />
            <div className="mt-6 rounded-xl bg-gray-900 p-4">
              <p className="text-sm text-gray-400">
                {estimate.isCategoryEstimate ? "Груб ориентир за категорията" : `Ориентир ${estimate.pricingVersion}`}
              </p>
              <div className="mt-3 rounded-lg border border-green-400/30 bg-green-400/10 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-green-300">
                  {estimate.primaryLabel || "Най-вероятно"}
                </p>
                <p className="mt-1 text-2xl font-black text-white">
                  {estimate.expectedMin}-{estimate.expectedMax} EUR
                </p>
              </div>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span>Труд</span><b>{estimate.laborMin}-{estimate.laborMax} EUR</b></div>
                <div className="flex justify-between gap-4"><span>Материали</span><b className="text-right">{estimate.pricingMode === "labor_only" ? "не са включени" : estimate.pricingModeBehavior === "inspection_required" ? "по оглед" : `${estimate.materialMin}-${estimate.materialMax} EUR`}</b></div>
                {estimate.showPossibleRange && (
                  <div className="flex justify-between border-t border-gray-700 pt-2 text-gray-400">
                    <span>{estimate.secondaryLabel || "Възможен диапазон"}</span>
                    <b className="text-right">{estimate.possibleMin}-{estimate.possibleMax} EUR</b>
                  </div>
                )}
              </div>
              <p className="mt-3 text-xs font-bold uppercase tracking-wide text-cyan-300">
                Увереност: {CONFIDENCE_LABELS[estimate.confidence] || CONFIDENCE_LABELS.medium}
              </p>
              <div className="mt-3 rounded-lg bg-gray-950 p-3 text-xs leading-relaxed text-gray-300">
                <b className="text-white">Защо варира:</b> {estimate.variationReason}
              </div>
              {estimate.materialConfidence && estimate.pricingMode !== "labor_only" && (
                <p className="mt-3 text-xs font-semibold text-cyan-300">
                  Увереност за материалите: {estimate.materialConfidence === "high" ? "висока" : estimate.materialConfidence === "medium" ? "средна" : estimate.materialConfidence === "low" ? "ниска" : "нужен е оглед"}
                </p>
              )}
              {estimate.warnings.length > 0 && (
                <div className="mt-4 space-y-1 border-t border-gray-800 pt-3 text-xs text-amber-200">
                  {estimate.warnings.slice(0, 3).map((warning) => <p key={warning}>{warning}</p>)}
                </div>
              )}
              {estimate.notes.length > 0 && (
                <div className="mt-3 space-y-1 text-xs text-gray-400">
                  {estimate.notes.slice(0, 3).map((note) => <p key={note}>{note}</p>)}
                </div>
              )}
              {estimate.includedMaterials?.length > 0 && estimate.pricingMode === "labor_plus_materials" && (
                <p className="mt-3 text-xs leading-relaxed text-gray-400">
                  Включени ориентировъчно: {estimate.includedMaterials.slice(0, 6).join(", ")}
                  {estimate.includedMaterials.length > 6 ? " и други" : ""}.
                </p>
              )}
              <p className="mt-4 text-xs leading-relaxed text-gray-400">
                Качи снимки и подробно описание за по-точна оферта. Крайната цена се потвърждава от майстор след снимки или оглед.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function imageFileToDataUrl(file, maxSize = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const scale = Math.min(1, maxSize / Math.max(img.width || 1, img.height || 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round((img.width || 1) * scale));
      canvas.height = Math.max(1, Math.round((img.height || 1) * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Cannot read image"));
    };

    img.src = objectUrl;
  });
}

function filesToPhotos(files) {
  const images = Array.from(files || []).filter((file) => String(file.type || "").startsWith("image/"));
  return Promise.all(
    images.map(async (file) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      name: file.name,
      url: await imageFileToDataUrl(file),
      file,
      created_at: new Date().toISOString(),
    }))
  );
}

function StepTitle({ category, title, step, onGoToStep }) {
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm text-gray-300">
        <button
          type="button"
          onClick={() => onGoToStep?.(0)}
          className="font-semibold hover:text-cyan-300"
        >
          Начало
        </button>
        <span>›</span>
        <button
          type="button"
          onClick={() => onGoToStep?.(1)}
          disabled={step <= 1}
          className={cx("font-semibold", step > 1 ? "hover:text-cyan-300" : "cursor-default text-gray-400")}
        >
          Заяви проект
        </button>
        <span>›</span>
        <button
          type="button"
          onClick={() => onGoToStep?.(1)}
          disabled={step <= 1}
          className={cx("font-bold", step > 1 ? "text-white hover:text-cyan-300" : "cursor-default text-white")}
        >
          {category.label}
        </button>
      </div>
      <h2 className="mt-5 text-2xl font-black">{title}</h2>
      <p className="mt-2 text-gray-300">{category.description}</p>
    </div>
  );
}

function RepairQuickLink({ item, active, onClick }) {
  const Icon = ICONS[item.icon] || Wrench;

  return (
    <button
      type="button"
      onClick={onClick}
      title={item.description}
      className={cx(
        "group flex min-h-[112px] flex-col items-center justify-center rounded-lg border p-3 text-center transition hover:-translate-y-0.5",
        active
          ? "border-cyan-300 bg-cyan-500/15 text-white shadow-lg shadow-cyan-950/30"
          : "border-gray-600 bg-gray-900 text-gray-100 hover:border-cyan-300 hover:bg-gray-800"
      )}
    >
      <Icon className={cx("mb-2 h-6 w-6", active ? "text-cyan-200" : "text-cyan-300")} />
      <span className="text-sm font-black leading-tight">{item.shortLabel || item.label}</span>
      <span className="mt-1 line-clamp-2 text-[11px] leading-snug text-gray-400 group-hover:text-gray-300">
        {item.description}
      </span>
    </button>
  );
}

function RadioCard({ selected, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "flex w-full items-center gap-3 rounded-xl border p-4 text-left",
        selected ? "border-cyan-300 bg-cyan-500/15" : "border-gray-700 bg-gray-900"
      )}
    >
      <span className={cx("h-5 w-5 rounded-full border", selected ? "border-cyan-300 bg-cyan-300" : "border-gray-500")} />
      <span className="font-semibold">{children}</span>
    </button>
  );
}

function SummaryLine({ label, value }) {
  return (
    <div className="mt-4 border-b border-gray-700 pb-3">
      <p className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</p>
      <p className="mt-1 font-semibold">{value || "—"}</p>
    </div>
  );
}
