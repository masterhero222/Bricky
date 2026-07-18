import { REPAIR_CATEGORY_OPTIONS, REPAIR_CATEGORY_FLOW, getRepairCategoryByLabel } from "../constants/repairCatalog";

const STORAGE_KEY = "bricky.dev.db";

const REQUEST_STATUS_LABELS = {
  draft: "чернова",
  pending_admin: "чака одобрение",
  published: "нова",
  applied: "кандидатствана",
  assigned: "избран майстор",
  worker_selected: "избран майстор",
  worker_confirmed: "майсторът потвърди",
  worker_on_site: "майсторът е на адреса",
  inspected: "огледана",
  in_progress: "в процес",
  work_finished: "работата е свършена",
  ready_for_client_confirmation: "чака потвърждение от клиента",
  client_confirmed: "клиентът потвърди",
  reviewed: "оставен отзив",
  completed: "завършена",
  canceled: "отказана",
  archived: "архивирана",
};

const CLIENTS = [
  {
    "id": 101,
    "role": "client",
    "name": "Клиент 1 - Пепо",
    "email": "client1@bricky.dev",
    "phone": "0888000001",
    "address": "София, ул. Липа 1"
  },
  {
    "id": 102,
    "role": "client",
    "name": "Клиент 2 - Мария",
    "email": "client2@bricky.dev",
    "phone": "0888000002",
    "address": "Пловдив, бул. България 22"
  },
  {
    "id": 103,
    "role": "client",
    "name": "Клиент 3 - Иван",
    "email": "client3@bricky.dev",
    "phone": "0888000003",
    "address": "Варна, ул. Морска 8"
  }
];

const ADMINS = [
  {
    id: 1,
    role: "super_admin",
    name: "Bricky Admin",
    email: "admin@bricky.dev",
    status: "active",
  },
];

const WORKERS = [
  {
    "id": 1,
    "userId": 201,
    "role": "worker",
    "fullName": "Майстор 1 - Георги ВиК",
    "name": "Майстор 1 - Георги ВиК",
    "email": "worker1@bricky.dev",
    "phone": "0899000001",
    "city": "София",
    "skills": [
      "ВиК"
    ],
    "description": "ВиК ремонти, течове, сифони и смесители.",
    "experience": "8 години",
    "equipment": "Професионални инструменти за ВиК диагностика.",
    "avatarUrl": "/media_files/maistor.png",
    "approvalStatus": "approved",
    "visibilityStatus": "public",
    "gallery": [
      { id: "gallery-201-1", userId: 201, name: "Смяна на сифон", url: "/media_files/banq.jpg", created_at: "2026-07-01T09:00:00.000Z" },
      { id: "gallery-201-2", userId: 201, name: "Баня след ремонт", url: "/media_files/banq2.jpg", created_at: "2026-07-02T09:00:00.000Z" }
    ]
  },
  {
    "id": 2,
    "userId": 202,
    "role": "worker",
    "fullName": "Майстор 2 - Елена Електро",
    "name": "Майстор 2 - Елена Електро",
    "email": "worker2@bricky.dev",
    "phone": "0899000002",
    "city": "Пловдив",
    "skills": [
      "Електро"
    ],
    "description": "Контакти, табла, осветление и аварийни ремонти.",
    "experience": "6 години",
    "equipment": "Тестер, инструменти за ел. инсталации.",
    "avatarUrl": "/media_files/worker_1011_1781367743213.jpg",
    "approvalStatus": "approved",
    "visibilityStatus": "public",
    "gallery": [
      { id: "gallery-202-1", userId: 202, name: "Ел. табло", url: "/media_files/images.jpg", created_at: "2026-07-03T09:00:00.000Z" },
      { id: "gallery-202-2", userId: 202, name: "Осветление", url: "/media_files/download.jpg", created_at: "2026-07-04T09:00:00.000Z" }
    ],
    "isBoosted": true,
    "boostSource": "referral",
    "boostEndsAt": "2026-08-15T23:59:59.000Z"
  },
  {
    "id": 3,
    "userId": 203,
    "role": "worker",
    "fullName": "Майстор 3 - Никола Плочки",
    "name": "Майстор 3 - Никола Плочки",
    "email": "worker3@bricky.dev",
    "phone": "0899000003",
    "city": "Варна",
    "skills": [
      "Плочки",
      "Шпакловка и боя"
    ],
    "description": "Бани, плочки, шпакловка и довършителни работи.",
    "experience": "10 години",
    "equipment": "Машина за рязане на плочки, лазерен нивелир.",
    "avatarUrl": "/media_files/worker_1010_1771026735538.png",
    "approvalStatus": "pending",
    "visibilityStatus": "hidden",
    "gallery": [
      { id: "gallery-203-1", userId: 203, name: "Плочки баня", url: "/media_files/banq3.jpg", created_at: "2026-07-05T09:00:00.000Z" },
      { id: "gallery-203-2", userId: 203, name: "Фаянс", url: "/media_files/sadsadasd.jpg", created_at: "2026-07-06T09:00:00.000Z" }
    ]
  }
];
function nowIso() {
  return new Date().toISOString();
}

function repairCategoryByKey(key) {
  return REPAIR_CATEGORY_OPTIONS.find((category) => category.key === key) || REPAIR_CATEGORY_OPTIONS[0];
}

function normalizeRepairCategoryLabel(label) {
  return getRepairCategoryByLabel(label)?.label || repairCategoryByKey("other").label;
}

function guessRepairCategory(text) {
  const lower = String(text || "").toLowerCase();

  if (/(vik|plumb|water|leak|pipe|sink|boiler|сифон|теч|тръб|мивк|бойлер|смесител)/i.test(lower)) return repairCategoryByKey("vik");
  if (/(electro|electric|power|cable|switch|lamp|fuse|ток|контакт|кабел|табло|ламп|ключ)/i.test(lower)) return repairCategoryByKey("electro");
  if (/(install|installation|инсталац)/i.test(lower) && /(electro|electric|ток|електро|кабел)/i.test(lower)) return repairCategoryByKey("electro");
  if (/(bathroom|bath|баня|бани|санитар)/i.test(lower)) return repairCategoryByKey("bathroom_renovation");
  if (/(tile|tiles|ceramic|плочк|фаянс|теракот|гранитогрес)/i.test(lower)) return repairCategoryByKey("tiles");
  if (/(roof|покрив|керемид|улук|хидроизолац)/i.test(lower)) return repairCategoryByKey("roof_waterproofing");
  if (/(drywall|гипсокартон|окачен таван|преградна стена)/i.test(lower)) return repairCategoryByKey("drywall");
  if (/(floor|ламинат|паркет|настилк|под)/i.test(lower)) return repairCategoryByKey("flooring");
  if (/(masonry|зидар|мазилк|тухл|шпаклов)/i.test(lower)) return repairCategoryByKey("plaster");
  if (/(window|door|дограма|врат|обков)/i.test(lower)) return repairCategoryByKey("windows_doors");
  if (/(heating|cooling|климатик|радиатор|отоплен)/i.test(lower)) return repairCategoryByKey("heating_cooling");
  if (/(demolition|кърт|извоз|демонтаж|отпад)/i.test(lower)) return repairCategoryByKey("demolition_cleanup");
  if (/(major|основен|цялостен|до ключ)/i.test(lower)) return repairCategoryByKey("full_renovation");
  if (/(мебел|шкаф|рафт|корниз|телевизор|кухн)/i.test(lower)) return repairCategoryByKey("furniture_mounting");
  if (/(дреб|малък|малки|домаш)/i.test(lower)) return repairCategoryByKey("small_repairs");
  if (/(repaint|пребоядис|paint|боя|боядис|стена|таван)/i.test(lower)) return repairCategoryByKey("painting");

  return repairCategoryByKey("other");
}

function seedDb() {
  const referralRewardEndsAt = new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString();
  return {
    mapSeedVersion: 7,
    nextRequestId: 1,
    nextMediaId: 3,
    nextReviewId: 1,
    nextUserId: 301,
    nextWorkerId: 4,
    nextReferralId: 3,
    nextRewardId: 2,
    admins: ADMINS,
    repairCategories: REPAIR_CATEGORY_OPTIONS.map((category) => ({
      ...category,
      flow: REPAIR_CATEGORY_FLOW[category.key] || REPAIR_CATEGORY_FLOW.other,
    })),
    clients: CLIENTS,
    workers: WORKERS,
    reviews: [],
    referrals: [
      {
        id: 1,
        code: "BRGEO201",
        type: "worker_invites_worker",
        referrerUserId: 201,
        referredUserId: 202,
        status: "rewarded",
        qualifiedRepairCount: 2,
        createdAt: "2026-07-01T09:00:00.000Z",
        rewards: [
          {
            id: 1,
            referralId: 1,
            rewardType: "worker_visibility_boost_30d",
            status: "active",
            startsAt: "2026-07-15T00:00:00.000Z",
            endsAt: referralRewardEndsAt,
          },
        ],
      },
      {
        id: 2,
        code: "BRELE202",
        type: "worker_invites_worker",
        referrerUserId: 202,
        referredUserId: null,
        status: "created",
        qualifiedRepairCount: 0,
        createdAt: "2026-07-10T09:00:00.000Z",
        rewards: [],
      },
    ],
    media: [
      { id: 1, kind: "worker_avatar", ownerUserId: 201, publicUrl: "/media_files/maistor.png", moderationStatus: "approved", createdAt: nowIso() },
      { id: 2, kind: "worker_gallery", ownerUserId: 202, publicUrl: "/media_files/images.jpg", moderationStatus: "pending", createdAt: nowIso() },
    ],
    auditLogs: [
      {
        id: 1,
        adminUserId: 1,
        action: "dev_seed_loaded",
        targetType: "mock",
        targetId: null,
        reason: "local best-of mock",
        createdAt: nowIso(),
      },
    ],
    requests: [],
  };
}

function readDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const db = JSON.parse(raw);
      if (Number(db?.mapSeedVersion || 0) < 2) {
        const seeded = seedDb();
        const migrated = {
          ...db,
          mapSeedVersion: seeded.mapSeedVersion,
          repairCategories: seeded.repairCategories,
          requests: seeded.requests,
          nextRequestId: Math.max(Number(db.nextRequestId || 0), seeded.nextRequestId),
        };
        writeDb(migrated);
        return migrated;
      }
      if (Number(db?.mapSeedVersion || 0) < 4 || !Array.isArray(db?.repairCategories)) {
        const migrated = {
          ...db,
          mapSeedVersion: 4,
          repairCategories: REPAIR_CATEGORY_OPTIONS.map((category) => ({
            ...category,
            flow: REPAIR_CATEGORY_FLOW[category.key] || REPAIR_CATEGORY_FLOW.other,
          })),
        };
        writeDb(migrated);
        return migrated;
      }
      if (Number(db?.mapSeedVersion || 0) < 5 || !Array.isArray(db?.admins) || !Array.isArray(db?.referrals)) {
        const seeded = seedDb();
        const migrated = {
          ...db,
          mapSeedVersion: 5,
          nextUserId: Math.max(Number(db.nextUserId || 0), seeded.nextUserId),
          nextWorkerId: Math.max(Number(db.nextWorkerId || 0), seeded.nextWorkerId),
          nextReferralId: Math.max(Number(db.nextReferralId || 0), seeded.nextReferralId),
          nextRewardId: Math.max(Number(db.nextRewardId || 0), seeded.nextRewardId),
          admins: Array.isArray(db.admins) ? db.admins : seeded.admins,
          referrals: Array.isArray(db.referrals) ? db.referrals : seeded.referrals,
          media: Array.isArray(db.media) ? db.media : seeded.media,
          auditLogs: Array.isArray(db.auditLogs) ? db.auditLogs : seeded.auditLogs,
        };
        writeDb(migrated);
        return migrated;
      }
      if (Number(db?.mapSeedVersion || 0) < 6) {
        const seeded = seedDb();
        const migrated = {
          ...db,
          mapSeedVersion: 6,
          nextRequestId: Math.max(Number(db.nextRequestId || 0), seeded.nextRequestId),
          requests: (Array.isArray(db.requests) ? db.requests : []).filter((request) => request?.locationSource !== "seed"),
          media: (Array.isArray(db.media) ? db.media : []).filter((media) => media?.kind !== "request_before" || !media?.requestId),
        };
        writeDb(migrated);
        return migrated;
      }
      if (Number(db?.mapSeedVersion || 0) < 7 || !Number(db?.nextMediaId)) {
        const migrated = {
          ...db,
          mapSeedVersion: 7,
          nextMediaId: Math.max(Number(db.nextMediaId || 0), maxMediaId(db) + 1),
        };
        ensureRequestMediaRecords(migrated);
        writeDb(migrated);
        return migrated;
      }
      return db;
    }
  } catch {
    // Invalid or outdated local mock data is replaced with a clean seed below.
  }
  const db = seedDb();
  writeDb(db);
  return db;
}

function writeDb(db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    return;
  } catch (err) {
    const isQuota =
      err?.name === "QuotaExceededError" ||
      err?.code === 22 ||
      String(err?.message || "").toLowerCase().includes("quota");

    if (!isQuota) throw err;

    const lean = {
      ...db,
      workers: (db.workers || []).map((worker) => ({
        ...worker,
        gallery: (Array.isArray(worker.gallery) ? worker.gallery : []).slice(0, 4),
      })),
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lean));
      return;
    } catch {
      const minimal = {
        ...lean,
        workers: (lean.workers || []).map((worker) => ({
          ...worker,
          gallery: [],
        })),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
    }
  }
}

function currentUser() {
  const role = localStorage.getItem("role") || "client";
  const id = Number(localStorage.getItem("userId")) || (role === "worker" ? 201 : 101);
  const db = readDb();
  const user =
    role === "worker"
      ? db.workers.find((w) => Number(w.userId) === id)
      : ["admin", "super_admin"].includes(role)
      ? db.admins?.find((a) => Number(a.id) === id)
      : db.clients.find((c) => Number(c.id) === id);
  return user || { id, userId: id, role, name: role === "worker" ? "Dev Worker" : "Dev Client" };
}


function fileToDataUrl(file, maxSize = 900, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, maxSize / Math.max(img.width || 1, img.height || 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round((img.width || 1) * scale));
      canvas.height = Math.max(1, Math.round((img.height || 1) * scale));

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Cannot read image"));
    };

    img.src = objectUrl;
  });
}

function currentWorker(db = readDb()) {
  const userId = Number(localStorage.getItem("userId") || 0);
  return db.workers.find((w) => Number(w.userId) === userId) || null;
}

export function saveDevWorkerProfile(data = {}) {
  const db = readDb();
  const worker = currentWorker(db);
  if (!worker) return null;

  Object.assign(worker, {
    fullName: data.fullName ?? worker.fullName,
    name: data.fullName ?? worker.name,
    city: data.city ?? worker.city,
    description: data.description ?? worker.description,
    experience: data.experience ?? worker.experience,
    equipment: data.equipment ?? worker.equipment,
  });

  writeDb(db);
  return publicUser(worker);
}

export async function uploadDevWorkerAvatar(file) {
  const db = readDb();
  const worker = currentWorker(db);
  if (!worker || !file) return null;

  const url = await fileToDataUrl(file);
  worker.avatarUrl = url;
  writeDb(db);
  return publicUser(worker);
}

export async function uploadDevWorkerGallery(files = []) {
  const db = readDb();
  const worker = currentWorker(db);
  if (!worker) return [];

  const clean = Array.from(files).filter((file) => String(file?.type || "").startsWith("image/"));
  const images = await Promise.all(
    clean.map(async (file) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      userId: worker.userId,
      name: file.name,
      url: await fileToDataUrl(file),
      created_at: nowIso(),
    }))
  );

  worker.gallery = [...(Array.isArray(worker.gallery) ? worker.gallery : []), ...images];
  writeDb(db);
  return worker.gallery;
}

export function deleteDevWorkerGalleryImage(imageId) {
  const db = readDb();
  const worker = currentWorker(db);
  if (!worker) return [];

  worker.gallery = (Array.isArray(worker.gallery) ? worker.gallery : []).filter((img) => String(img.id) !== String(imageId));
  writeDb(db);
  return worker.gallery;
}
function response(data, status = 200) {
  return Promise.resolve({ data, status, statusText: "OK", headers: {}, config: {} });
}

function fail(message, status = 400) {
  const err = new Error(message);
  err.response = { status, data: { message } };
  return Promise.reject(err);
}

function sortNewest(items) {
  return [...items].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

function normalizePhotos(items = []) {
  return (Array.isArray(items) ? items : [])
    .map((photo) => {
      const url =
        typeof photo === "string"
          ? photo
          : photo?.url || photo?.dataUrl || photo?.src || photo?.imageUrl || photo?.path || "";
      return { photo, url };
    })
    .filter(({ url }) => typeof url === "string" && url)
    .map((photo, index) => ({
      id: photo.photo?.id || `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
      name: photo.photo?.name || "Снимка",
      url: photo.url,
      created_at: photo.photo?.created_at || photo.photo?.createdAt || nowIso(),
    }));
}

function maxMediaId(db) {
  return Math.max(0, ...(Array.isArray(db?.media) ? db.media : []).map((media) => Number(media.id) || 0));
}

function nextMockMediaId(db) {
  db.nextMediaId = Math.max(Number(db.nextMediaId || 0), maxMediaId(db) + 1);
  return db.nextMediaId++;
}

function ensureRequestMediaRecords(db) {
  db.media = Array.isArray(db.media) ? db.media : [];
  (Array.isArray(db.requests) ? db.requests : []).forEach((req) => {
    const status = requestStatusKey(req);
    const moderationStatus = status === "archived" ? "rejected" : status === "pending_admin" ? "pending" : "approved";
    normalizePhotos(req.beforePhotos || req.photos).forEach((photo) => {
      const exists = db.media.some(
        (media) => Number(media.requestId) === Number(req.id) && media.kind === "request_before" && media.publicUrl === photo.url,
      );
      if (exists) return;
      db.media.push({
        id: nextMockMediaId(db),
        kind: "request_before",
        ownerUserId: req.clientUserId,
        requestId: req.id,
        publicUrl: photo.url,
        moderationStatus,
        createdAt: photo.created_at || nowIso(),
      });
    });
  });
  return db.media;
}

function setRequestMediaModeration(db, requestId, kind, moderationStatus) {
  db.media = Array.isArray(db.media) ? db.media : [];
  db.media.forEach((media) => {
    if (Number(media.requestId) === Number(requestId) && media.kind === kind) {
      media.moderationStatus = moderationStatus;
    }
  });
}

function completionDurationDays(req, completedAt = nowIso()) {
  const start = new Date(req.created_at || completedAt).getTime();
  const end = new Date(completedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 1;
  return Math.max(1, Math.ceil((end - start) / (24 * 60 * 60 * 1000)));
}

function ensureWorkerJobHistory(worker, req) {
  worker.completedJobs = Array.isArray(worker.completedJobs) ? worker.completedJobs : [];
  const existing = worker.completedJobs.find((job) => Number(job.requestId) === Number(req.id));
  const item = {
    id: existing?.id || `job-${req.id}-${worker.userId}`,
    requestId: req.id,
    category: req.category,
    clientName: req.clientName,
    address: req.address,
    description: req.description,
    startedAt: req.created_at,
    completedAt: req.completedAt,
    durationDays: req.durationDays,
    beforePhotos: normalizePhotos(req.beforePhotos || req.photos),
    afterPhotos: normalizePhotos(req.afterPhotos),
    created_at: existing?.created_at || nowIso(),
  };

  if (existing) Object.assign(existing, item);
  else worker.completedJobs.unshift(item);

  return item;
}

function addRequestPhotosToWorkerGallery(worker, req) {
  const before = normalizePhotos(req.beforePhotos || req.photos).map((photo) => ({
    ...photo,
    id: `before-${req.id}-${photo.id}`,
    userId: worker.userId,
    requestId: req.id,
    phase: "before",
    label: "Преди ремонт",
  }));
  const after = normalizePhotos(req.afterPhotos).map((photo) => ({
    ...photo,
    id: `after-${req.id}-${photo.id}`,
    userId: worker.userId,
    requestId: req.id,
    phase: "after",
    label: "След ремонт",
  }));

  const incoming = [...before, ...after];
  if (!incoming.length) return;

  const gallery = Array.isArray(worker.gallery) ? worker.gallery : [];
  const existingIds = new Set(gallery.map((img) => String(img.id)));
  worker.gallery = [...incoming.filter((img) => !existingIds.has(String(img.id))), ...gallery];
}
function asPath(url) {
  return String(url || "").split("?")[0].replace(/^\/api/, "");
}

function repairCategoryOption(value) {
  const raw = String(value || "").trim();
  return (
    REPAIR_CATEGORY_OPTIONS.find(
      (category) => category.key === raw || category.label === raw || category.shortLabel === raw,
    ) || getRepairCategoryByLabel(raw)
  );
}

function normalizeSkillKey(value) {
  const option = repairCategoryOption(value);
  return option?.key || "small_repairs";
}

function skillLabel(value) {
  const option = repairCategoryOption(value);
  return option?.shortLabel || option?.label || value;
}

function publicUser(user) {
  if (!user) return null;
  const skillKeys = (Array.isArray(user.skills) ? user.skills : []).map(normalizeSkillKey);
  return {
    id: user.id || user.userId,
    userId: user.userId || user.id,
    role: user.role,
    name: user.name || user.fullName,
    fullName: user.fullName || user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    status: user.status || "active",
    city: user.city,
    skills: skillKeys.map(skillLabel),
    skillKeys,
    description: user.description,
    experience: user.experience,
    equipment: user.equipment,
    avatarUrl: user.avatarUrl || "",
    approvalStatus: user.approvalStatus,
    visibilityStatus: user.visibilityStatus,
    isBoosted: Boolean(user.isBoosted),
    boostSource: user.boostSource || null,
    boostEndsAt: user.boostEndsAt || null,
    completedJobs: user.completedJobs || [],
  };
}

function draftRequest(body = {}) {
  const text = String(body.prompt || "").trim();
  const category = guessRepairCategory(text);

  return {
    category: category.label,
    categoryKey: category.key,
    description: [text || "Описание на ремонта", body.address ? `Адрес: ${body.address}` : ""].filter(Boolean).join("\n"),
    questions: ["Какъв е размерът на ремонта?", "Има ли спешност или теч?"],
    confidence: 0.7,
    source: "local-dev",
  };
}

export function isDevMockToken() {
  return String(localStorage.getItem("token") || "").startsWith("local-dev-token");
}

export function setDevIdentity(role, id) {
  const db = readDb();
  const user =
    role === "worker"
      ? db.workers.find((w) => Number(w.userId) === Number(id))
      : ["admin", "super_admin"].includes(role)
      ? db.admins?.find((a) => Number(a.id) === Number(id))
      : db.clients.find((c) => Number(c.id) === Number(id));
  if (!user) return null;

  const userId = role === "worker" ? user.userId : user.id;
  localStorage.setItem("token", `local-dev-token-${role}-${userId}`);
  localStorage.setItem("role", role);
  localStorage.setItem("userId", String(userId));
  localStorage.setItem("userName", user.name || user.fullName || "Dev User");
  window.dispatchEvent(new Event("bricky-dev-identity-changed"));
  return publicUser(user);
}

export function resetDevDb() {
  writeDb(seedDb());
  window.dispatchEvent(new Event("bricky-dev-identity-changed"));
}

export function getDevIdentities() {
  const db = readDb();
  return { admins: db.admins || ADMINS, clients: db.clients, workers: db.workers };
}

function makeReferralCode(seed) {
  const compact = String(seed || "BRICKY").replace(/[^a-z0-9]/gi, "").slice(0, 5).toUpperCase() || "BRICK";
  return `BR${compact}${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
}

function getOrCreateWorkerReferral(db, workerUserId) {
  const existing = db.referrals.find((referral) => Number(referral.referrerUserId) === Number(workerUserId) && !referral.referredUserId);
  if (existing) return existing;

  const worker = db.workers.find((w) => Number(w.userId) === Number(workerUserId));
  const referral = {
    id: db.nextReferralId++,
    code: makeReferralCode(worker?.fullName || workerUserId),
    type: "worker_invites_worker",
    referrerUserId: Number(workerUserId),
    referredUserId: null,
    status: "created",
    qualifiedRepairCount: 0,
    createdAt: nowIso(),
    rewards: [],
  };
  db.referrals.push(referral);
  return referral;
}

function referralSummary(db, workerUserId) {
  const ownCode = getOrCreateWorkerReferral(db, workerUserId);
  const invites = db.referrals.filter((referral) => Number(referral.referrerUserId) === Number(workerUserId));
  const rewards = invites.flatMap((referral) => referral.rewards || []);

  return {
    code: ownCode.code,
    referralUrl: `${window.location.origin}/worker/register?ref=${ownCode.code}`,
    invites,
    rewards,
  };
}

function addAudit(db, action, targetType, targetId, reason = "dev_mock") {
  db.auditLogs = Array.isArray(db.auditLogs) ? db.auditLogs : [];
  db.auditLogs.unshift({
    id: db.auditLogs.length ? Math.max(...db.auditLogs.map((log) => Number(log.id) || 0)) + 1 : 1,
    adminUserId: Number(localStorage.getItem("userId") || 1),
    action,
    targetType,
    targetId,
    reason,
    createdAt: nowIso(),
  });
}

function maybeActivateReferralReward(db, workerUserId) {
  const referral = db.referrals.find((ref) => Number(ref.referredUserId) === Number(workerUserId));
  if (!referral || referral.status === "rejected") return;

  const completedForWorker = db.requests.filter((req) => {
    const status = requestStatusKey(req);
    return Number(req.completedByWorkerId) === Number(workerUserId) && ["reviewed", "completed"].includes(status);
  });
  const uniqueClients = new Set(completedForWorker.map((req) => Number(req.clientUserId)));
  referral.qualifiedRepairCount = Math.min(uniqueClients.size, 2);

  if (referral.qualifiedRepairCount >= 2 && !(referral.rewards || []).some((reward) => reward.status === "active")) {
    const startsAt = nowIso();
    const endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    referral.status = "rewarded";
    referral.rewards = [
      ...(referral.rewards || []),
      {
        id: db.nextRewardId++,
        referralId: referral.id,
        rewardType: "worker_visibility_boost_30d",
        status: "active",
        startsAt,
        endsAt,
      },
    ];

    const referrer = db.workers.find((worker) => Number(worker.userId) === Number(referral.referrerUserId));
    if (referrer) {
      referrer.isBoosted = true;
      referrer.boostSource = "referral";
      referrer.boostEndsAt = endsAt;
    }
  } else if (referral.referredUserId) {
    referral.status = "accepted";
  }
}

function findMockWorker(db, workerUserId) {
  return db.workers.find((worker) => Number(worker.userId) === Number(workerUserId));
}

function ensureMockWorkerCanTakeJobs(db, workerUserId) {
  const worker = findMockWorker(db, workerUserId);
  if (!worker) return fail("Worker account not found", 403);
  if (worker.status && worker.status !== "active") return fail("Worker account is not active", 403);
  if (worker.approvalStatus !== "approved") return fail("Worker profile is not approved", 403);
  if (["hidden", "suspended"].includes(String(worker.visibilityStatus || "").toLowerCase())) {
    return fail("Worker profile is not visible", 403);
  }
  return null;
}

function requestStatusKey(req) {
  if (req?.statusKey) return req.statusKey;
  const label = String(req?.status || "").toLowerCase();
  return Object.entries(REQUEST_STATUS_LABELS).find(([, value]) => value === label)?.[0] || label || "pending_admin";
}

function setMockRequestStatus(req, statusKey) {
  req.statusKey = statusKey;
  req.status = REQUEST_STATUS_LABELS[statusKey] || statusKey;
}

function ensureMockRequestStatus(req, allowedStatuses, message = "Invalid request status") {
  if (!allowedStatuses.includes(requestStatusKey(req))) return fail(message, 400);
  return null;
}

function completeMockWorkerStep(db, req, workerUserId, allowedStatuses, nextStatus, afterPhotos = null) {
  if (Number(req.assignedWorkerId) !== Number(workerUserId)) return fail("Not your job", 403);
  const statusGuard = ensureMockRequestStatus(req, allowedStatuses, "Invalid request status transition");
  if (statusGuard) return statusGuard;
  setMockRequestStatus(req, nextStatus);
  if (Array.isArray(afterPhotos)) {
    req.afterPhotos = normalizePhotos(afterPhotos);
    const worker = findMockWorker(db, workerUserId);
    if (worker) addRequestPhotosToWorkerGallery(worker, req);
  }
  writeDb(db);
  return response(req);
}

export async function mockRequest(method, url, data) {
  const db = readDb();
  const path = asPath(url);
  const user = currentUser();
  const role = localStorage.getItem("role") || user.role;
  const userId = role === "worker" ? Number(user.userId || user.id) : Number(user.id);

  if (method === "post" && path === "/auth/dev-login") {
    const loginRole = ["worker", "admin", "super_admin"].includes(data?.role) ? data.role : "client";
    const first =
      loginRole === "worker"
        ? db.workers[0]
        : ["admin", "super_admin"].includes(loginRole)
        ? db.admins[0]
        : db.clients[0];
    setDevIdentity(loginRole, loginRole === "worker" ? first.userId : first.id);
    return response({ token: localStorage.getItem("token"), user: publicUser(first) });
  }

  if (method === "post" && path === "/auth/register") {
    const registerRole = data?.role === "worker" ? "worker" : "client";
    const email = String(data?.email || "").trim().toLowerCase();
    if (!email) return fail("Email is required", 400);
    if ([...db.clients, ...db.workers, ...(db.admins || [])].some((item) => String(item.email || "").toLowerCase() === email)) {
      return fail("Email already exists", 409);
    }

    const newUserId = db.nextUserId++;
    if (registerRole === "worker") {
      const worker = {
        id: db.nextWorkerId++,
        userId: newUserId,
        role: "worker",
        fullName: data?.fullName || data?.name || "Нов майстор",
        name: data?.fullName || data?.name || "Нов майстор",
        email,
        phone: data?.phone || "",
        city: data?.city || "",
        skills: Array.isArray(data?.skills) ? data.skills.map(normalizeSkillKey) : [],
        description: data?.description || "",
        experience: data?.experience || "",
        equipment: data?.equipment || "",
        avatarUrl: "",
        approvalStatus: "pending",
        visibilityStatus: "hidden",
        gallery: [],
        completedJobs: [],
        created_at: nowIso(),
      };
      db.workers.push(worker);

      const code = String(data?.referralCode || "").trim().toUpperCase();
      const referral = db.referrals.find((item) => item.code === code && !item.referredUserId && item.status !== "rejected");
      if (referral) {
        referral.referredUserId = newUserId;
        referral.status = "accepted";
        referral.acceptedAt = nowIso();
      }

      writeDb(db);
      return response({ token: `local-dev-token-worker-${newUserId}`, user: publicUser(worker) }, 201);
    }

    const client = {
      id: newUserId,
      role: "client",
      name: data?.name || data?.fullName || "Нов клиент",
      email,
      phone: data?.phone || "",
      address: data?.address || "",
      status: "active",
      created_at: nowIso(),
    };
    db.clients.push(client);
    writeDb(db);
    return response({ token: `local-dev-token-client-${newUserId}`, user: publicUser(client) }, 201);
  }

  if (method === "get" && path === "/client/me") return response(publicUser(user));
  if (method === "get" && path === "/repair-categories") return response(db.repairCategories || REPAIR_CATEGORY_OPTIONS);
  if (method === "get" && path === "/referrals/me") {
    if (role !== "worker") return fail("Worker only", 403);
    const summary = referralSummary(db, userId);
    writeDb(db);
    return response(summary);
  }
  if (method === "post" && path === "/referrals/me/code") {
    if (role !== "worker") return fail("Worker only", 403);
    const summary = referralSummary(db, userId);
    writeDb(db);
    return response(summary, 201);
  }
  if (method === "post" && path === "/referrals/validate") {
    const code = String(data?.code || data?.referralCode || "").trim().toUpperCase();
    const referral = db.referrals.find((item) => item.code === code && item.status !== "rejected");
    return response({ valid: Boolean(referral), code, referral });
  }
  const referralValidateMatch = path.match(/^\/referrals\/validate\/([^/]+)$/);
  if (method === "get" && referralValidateMatch) {
    const code = decodeURIComponent(referralValidateMatch[1]).toUpperCase();
    const referral = db.referrals.find((item) => item.code === code && item.status !== "rejected");
    return response({ valid: Boolean(referral), code, referral });
  }

  if (path.startsWith("/admin/")) {
    if (!["admin", "super_admin"].includes(role)) return fail("Admin only", 403);

    if (method === "get" && path === "/admin/users") {
      return response([
        ...(db.clients || []).map(publicUser),
        ...(db.workers || []).map(publicUser),
        ...(db.admins || []).map(publicUser),
      ]);
    }
    if (method === "get" && path === "/admin/workers") {
      return response((db.workers || []).map((worker) => ({
        ...publicUser(worker),
        workerUserId: worker.userId,
        publicName: worker.fullName || worker.name,
      })));
    }
    if (method === "get" && path === "/admin/requests") return response(sortNewest(db.requests || []));
    if (method === "get" && path === "/admin/media") return response(db.media || []);
    if (method === "get" && path === "/admin/referrals") return response(db.referrals || []);
    if (method === "get" && path === "/admin/audit") return response(db.auditLogs || []);

    const userStatusMatch = path.match(/^\/admin\/users\/(\d+)\/status$/);
    if (method === "post" && userStatusMatch) {
      const targetId = Number(userStatusMatch[1]);
      const target = [...(db.clients || []), ...(db.workers || []), ...(db.admins || [])].find((item) => Number(item.id) === targetId || Number(item.userId) === targetId);
      if (!target) return fail("User not found", 404);
      target.status = data?.status || "active";
      addAudit(db, "user_status_changed", "user", targetId, data?.reason || target.status);
      writeDb(db);
      return response(publicUser(target));
    }

    const workerApprovalMatch = path.match(/^\/admin\/workers\/(\d+)\/approval$/);
    if (method === "post" && workerApprovalMatch) {
      const targetId = Number(workerApprovalMatch[1]);
      const worker = db.workers.find((item) => Number(item.userId) === targetId || Number(item.id) === targetId);
      if (!worker) return fail("Worker not found", 404);
      worker.approvalStatus = data?.approvalStatus || data?.status || "approved";
      worker.visibilityStatus = worker.approvalStatus === "approved" ? "public" : "hidden";
      addAudit(db, "worker_approval_changed", "worker", worker.userId, worker.approvalStatus);
      writeDb(db);
      return response(publicUser(worker));
    }

    const requestStatusMatch = path.match(/^\/admin\/requests\/(\d+)\/status$/);
    if (method === "post" && requestStatusMatch) {
      const request = db.requests.find((item) => Number(item.id) === Number(requestStatusMatch[1]));
      if (!request) return fail("Request not found", 404);
      const nextStatus = data?.status || requestStatusKey(request);
      setMockRequestStatus(request, nextStatus);
      if (nextStatus === "published") setRequestMediaModeration(db, request.id, "request_before", "approved");
      if (nextStatus === "archived") setRequestMediaModeration(db, request.id, "request_before", "rejected");
      addAudit(db, "request_status_changed", "request", request.id, request.status);
      writeDb(db);
      return response(request);
    }

    const mediaModerationMatch = path.match(/^\/admin\/media\/(\d+)\/moderation$/);
    if (method === "post" && mediaModerationMatch) {
      const media = db.media.find((item) => Number(item.id) === Number(mediaModerationMatch[1]));
      if (!media) return fail("Media not found", 404);
      media.moderationStatus = data?.moderationStatus || "approved";
      addAudit(db, "media_moderation_changed", "media", media.id, media.moderationStatus);
      writeDb(db);
      return response(media);
    }

    const referralRejectMatch = path.match(/^\/admin\/referrals\/(\d+)\/reject$/);
    if (method === "post" && referralRejectMatch) {
      const referral = db.referrals.find((item) => Number(item.id) === Number(referralRejectMatch[1]));
      if (!referral) return fail("Referral not found", 404);
      referral.status = "rejected";
      referral.rejectionReason = data?.reason || "admin_review";
      addAudit(db, "referral_rejected", "referral", referral.id, referral.rejectionReason);
      writeDb(db);
      return response(referral);
    }

    const referralRewardActionMatch = path.match(/^\/admin\/referrals\/(\d+)\/(revoke-reward|restore-reward)$/);
    if (method === "post" && referralRewardActionMatch) {
      const referral = db.referrals.find((item) => Number(item.id) === Number(referralRewardActionMatch[1]));
      if (!referral) return fail("Referral not found", 404);
      const nextStatus = referralRewardActionMatch[2] === "revoke-reward" ? "revoked" : "active";
      referral.rewards = (referral.rewards || []).map((reward) => ({ ...reward, status: nextStatus }));
      addAudit(db, `referral_reward_${nextStatus}`, "referral", referral.id, data?.reason || "admin_review");
      writeDb(db);
      return response(referral);
    }
  }

  if (method === "get" && path === "/workers/me") return response(publicUser(db.workers.find((w) => Number(w.userId) === userId)));
  if (method === "get" && path === "/workers") return response(db.workers.map(publicUser));

  const workerById = path.match(/^\/workers\/(\d+)$/);
  if (method === "get" && workerById) {
    const id = Number(workerById[1]);
    const worker = db.workers.find((w) => Number(w.userId) === id || Number(w.id) === id);
    return worker ? response(publicUser(worker)) : fail("Worker not found", 404);
  }

  if (method === "get" && /^\/workers\/\d+\/gallery$/.test(path)) {
    const id = Number(path.match(/^\/workers\/(\d+)\/gallery$/)?.[1]);
    const worker = db.workers.find((w) => Number(w.userId) === id || Number(w.id) === id);
    return response(Array.isArray(worker?.gallery) ? worker.gallery : []);
  }
  if (method === "get" && path === "/workers/me/gallery") {
    const worker = currentWorker(db);
    return response(Array.isArray(worker?.gallery) ? worker.gallery : []);
  }

  if (method === "get" && path === "/workers/me/history") {
    const worker = currentWorker(db);
    return response(sortNewest(Array.isArray(worker?.completedJobs) ? worker.completedJobs : []));
  }

  const workerHistory = path.match(/^\/workers\/(\d+)\/history$/);
  if (method === "get" && workerHistory) {
    const id = Number(workerHistory[1]);
    const worker = db.workers.find((w) => Number(w.userId) === id || Number(w.id) === id);
    return response(sortNewest(Array.isArray(worker?.completedJobs) ? worker.completedJobs : []));
  }

  
  const galleryDeleteMatch = path.match(/^\/workers\/me\/gallery\/(.+)\/delete$/);
  if (method === "post" && galleryDeleteMatch) {
    return response(deleteDevWorkerGalleryImage(galleryDeleteMatch[1]));
  }
  if (method === "post" && path === "/requests/draft") return response(draftRequest(data));

  if (method === "get" && path === "/requests/client") {
    return response(sortNewest(db.requests.filter((r) => Number(r.clientUserId) === userId)));
  }

  if (method === "get" && path === "/requests/map") {
    return response(sortNewest(db.requests));
  }

  if (method === "get" && path === "/requests/worker") {
    const guard = ensureMockWorkerCanTakeJobs(db, userId);
    if (guard) return guard;

    const items = db.requests.filter((r) => {
      const assigned = Number(r.assignedWorkerId || 0);
      const status = requestStatusKey(r);
      if (["draft", "pending_admin", "canceled", "archived", "completed"].includes(status)) return false;
      if (!assigned) return ["published", "applied"].includes(status);
      return assigned === userId;
    });
    return response(sortNewest(items));
  }

  if (method === "get" && path === "/requests/worker/completed") {
    return response(sortNewest(db.requests.filter((r) => Number(r.assignedWorkerId) === userId && requestStatusKey(r) === "completed")));
  }

  if (method === "post" && path === "/requests") {
    if (role !== "client") return fail("Client only", 400);
    const client = db.clients.find((c) => Number(c.id) === userId) || user;
    const beforePhotos = normalizePhotos(data.photos);
    const req = {
      id: db.nextRequestId++,
      clientUserId: userId,
      clientName: data.clientName || client.name,
      email: data.email || client.email,
      phone: data.phone || client.phone,
      address: data.address || client.address || "",
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      locationSource: data.locationSource || "manual",
      category: normalizeRepairCategoryLabel(data.category),
      categoryKey: data.categoryKey || getRepairCategoryByLabel(data.category)?.key || "other",
      description: data.description || "",
      estimateMin: Number.isFinite(Number(data.estimateMin)) ? Number(data.estimateMin) : null,
      estimateMax: Number.isFinite(Number(data.estimateMax)) ? Number(data.estimateMax) : null,
      estimateCurrency: data.estimateCurrency || null,
      pricingSnapshot: data.pricingSnapshot || null,
      status: REQUEST_STATUS_LABELS.pending_admin,
      statusKey: "pending_admin",
      photos: beforePhotos,
      beforePhotos,
      afterPhotos: [],
      appliedWorkers: [],
      assignedWorkerId: null,
      completedAt: null,
      completedByWorkerId: null,
      durationDays: null,
      created_at: nowIso(),
    };
    db.requests.push(req);
    beforePhotos.forEach((photo) => {
      db.media.push({
        id: nextMockMediaId(db),
        kind: "request_before",
        ownerUserId: userId,
        requestId: req.id,
        publicUrl: photo.url,
        moderationStatus: "pending",
        createdAt: photo.created_at || nowIso(),
      });
    });
    writeDb(db);
    return response(req, 201);
  }

  const applyMatch = path.match(/^\/requests\/(\d+)\/apply$/);
  if (method === "post" && applyMatch) {
    if (role !== "worker") return fail("Worker only", 400);
    const guard = ensureMockWorkerCanTakeJobs(db, userId);
    if (guard) return guard;

    const req = db.requests.find((r) => Number(r.id) === Number(applyMatch[1]));
    if (!req) return fail("Request not found", 404);
    if (req.assignedWorkerId) return fail("Request already has assigned worker", 400);
    const statusGuard = ensureMockRequestStatus(req, ["published", "applied"], "Request is not open for applications");
    if (statusGuard) return statusGuard;
    req.appliedWorkers = Array.from(new Set([...(req.appliedWorkers || []), userId]));
    setMockRequestStatus(req, "applied");
    writeDb(db);
    return response(req);
  }

  const assignMatch = path.match(/^\/requests\/(\d+)\/assign$/);
  if (method === "post" && assignMatch) {
    if (role !== "client") return fail("Client only", 400);
    const req = db.requests.find((r) => Number(r.id) === Number(assignMatch[1]));
    if (!req) return fail("Request not found", 404);
    if (Number(req.clientUserId) !== userId) return fail("Not your request", 403);
    const workerUserId = Number(data?.workerUserId);
    if (!workerUserId) return fail("Missing workerUserId", 400);
    const guard = ensureMockWorkerCanTakeJobs(db, workerUserId);
    if (guard) return guard;
    const statusGuard = ensureMockRequestStatus(req, ["published", "applied"], "Request is not assignable");
    if (statusGuard) return statusGuard;
    if (!(req.appliedWorkers || []).map(Number).includes(workerUserId)) return fail("This worker has not applied to this request", 400);
    req.assignedWorkerId = workerUserId;
    setMockRequestStatus(req, "worker_selected");
    writeDb(db);
    return response(req);
  }

  const workerConfirmMatch = path.match(/^\/requests\/(\d+)\/worker-confirm$/);
  if (method === "post" && workerConfirmMatch) {
    if (role !== "worker") return fail("Worker only", 400);
    const req = db.requests.find((r) => Number(r.id) === Number(workerConfirmMatch[1]));
    if (!req) return fail("Request not found", 404);
    return completeMockWorkerStep(db, req, userId, ["worker_selected", "assigned"], "worker_confirmed");
  }

  const onSiteMatch = path.match(/^\/requests\/(\d+)\/on-site$/);
  if (method === "post" && onSiteMatch) {
    if (role !== "worker") return fail("Worker only", 400);
    const req = db.requests.find((r) => Number(r.id) === Number(onSiteMatch[1]));
    if (!req) return fail("Request not found", 404);
    return completeMockWorkerStep(db, req, userId, ["worker_confirmed"], "worker_on_site");
  }

  const inspectMatch = path.match(/^\/requests\/(\d+)\/inspect$/);
  if (method === "post" && inspectMatch) {
    if (role !== "worker") return fail("Worker only", 400);
    const req = db.requests.find((r) => Number(r.id) === Number(inspectMatch[1]));
    if (!req) return fail("Request not found", 404);
    return completeMockWorkerStep(db, req, userId, ["worker_on_site"], "inspected");
  }

  const startMatch = path.match(/^\/requests\/(\d+)\/start$/);
  if (method === "post" && startMatch) {
    if (role !== "worker") return fail("Worker only", 400);
    const req = db.requests.find((r) => Number(r.id) === Number(startMatch[1]));
    if (!req) return fail("Request not found", 404);
    return completeMockWorkerStep(db, req, userId, ["inspected"], "in_progress");
  }

  const finishMatch = path.match(/^\/requests\/(\d+)\/finish$/);
  if (method === "post" && finishMatch) {
    if (role !== "worker") return fail("Worker only", 400);
    const req = db.requests.find((r) => Number(r.id) === Number(finishMatch[1]));
    if (!req) return fail("Request not found", 404);
    return completeMockWorkerStep(db, req, userId, ["in_progress"], "work_finished", data?.afterPhotos || []);
  }

  const readyMatch = path.match(/^\/requests\/(\d+)\/ready$/);
  if (method === "post" && readyMatch) {
    if (role !== "worker") return fail("Worker only", 400);
    const req = db.requests.find((r) => Number(r.id) === Number(readyMatch[1]));
    if (!req) return fail("Request not found", 404);
    return completeMockWorkerStep(db, req, userId, ["work_finished"], "ready_for_client_confirmation");
  }

  const clientConfirmMatch = path.match(/^\/requests\/(\d+)\/client-confirm$/);
  if (method === "post" && clientConfirmMatch) {
    if (role !== "client") return fail("Client only", 400);
    const req = db.requests.find((r) => Number(r.id) === Number(clientConfirmMatch[1]));
    if (!req) return fail("Request not found", 404);
    if (Number(req.clientUserId) !== userId) return fail("Not your request", 403);
    const statusGuard = ensureMockRequestStatus(req, ["ready_for_client_confirmation"], "Request is not ready for confirmation");
    if (statusGuard) return statusGuard;
    setMockRequestStatus(req, "client_confirmed");
    writeDb(db);
    return response(req);
  }

  const completeMatch = path.match(/^\/requests\/(\d+)\/complete$/);
  if (method === "post" && completeMatch) {
    if (role !== "worker") return fail("Worker only", 400);
    const req = db.requests.find((r) => Number(r.id) === Number(completeMatch[1]));
    if (!req) return fail("Request not found", 404);
    if (Number(req.assignedWorkerId) !== userId) return fail("Not your job", 403);
    const statusGuard = ensureMockRequestStatus(req, ["reviewed"], "Request must be reviewed before closing");
    if (statusGuard) return statusGuard;

    const completedAt = nowIso();
    setMockRequestStatus(req, "completed");
    req.completedAt = completedAt;
    req.completedByWorkerId = userId;
    if (Array.isArray(data?.afterPhotos) && data.afterPhotos.length) {
      req.afterPhotos = normalizePhotos(data.afterPhotos);
    }
    req.durationDays = completionDurationDays(req, completedAt);

    const worker = db.workers.find((w) => Number(w.userId) === userId);
    if (worker) {
      ensureWorkerJobHistory(worker, req);
      addRequestPhotosToWorkerGallery(worker, req);
    }

    writeDb(db);
    return response(req);
  }

  if (method === "get" && path === "/reviews/client") {
    return response(db.reviews.filter((r) => Number(r.clientUserId) === userId));
  }

  const workerReviews = path.match(/^\/reviews\/worker\/(\d+)$/);
  if (method === "get" && workerReviews) {
    const wid = Number(workerReviews[1]);
    const items = db.reviews.filter((r) => Number(r.workerUserId) === wid);
    const average = items.length ? items.reduce((sum, r) => sum + Number(r.rating || 0), 0) / items.length : 0;
    return response({ total: items.length, average, items });
  }

  if (method === "post" && path === "/reviews") {
    if (role !== "client") return fail("Client only", 400);
    const requestId = Number(data?.requestId);
    const req = db.requests.find((r) => Number(r.id) === requestId);
    if (!req) return fail("Request not found", 404);
    if (Number(req.clientUserId) !== userId) return fail("Not your request", 403);
    if (requestStatusKey(req) !== "client_confirmed") return fail("Client must confirm the work before review", 400);
    const exists = db.reviews.find((r) => Number(r.requestId) === requestId);
    if (exists) return fail("Already reviewed", 400);
    const review = {
      id: db.nextReviewId++,
      requestId,
      clientUserId: userId,
      workerUserId: Number(req.assignedWorkerId),
      rating: Number(data?.rating) || 5,
      comment: data?.comment || "",
      created_at: nowIso(),
    };
    db.reviews.push(review);
    setMockRequestStatus(req, "reviewed");
    maybeActivateReferralReward(db, review.workerUserId);
    writeDb(db);
    return response(review, 201);
  }

  return fail(`Dev mock endpoint not implemented: ${method.toUpperCase()} ${path}`, 404);
}
