import { REPAIR_CATEGORY_OPTIONS, REPAIR_CATEGORY_FLOW, getRepairCategoryByLabel } from "../constants/repairCatalog.js";
import {
  DEFAULT_WORKER_BANNER_KEY,
  WORKER_BANNER_CATALOG,
} from "../constants/workerBannerCatalog.js";

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

const REQUEST_LIFECYCLE_STATUS = {
  draft: "pending_review",
  pending_admin: "pending_review",
  published: "approved",
  applied: "approved",
  assigned: "assigned",
  worker_selected: "assigned",
  worker_confirmed: "assigned",
  worker_on_site: "worker_arrived",
  inspected: "worker_arrived",
  in_progress: "in_progress",
  work_finished: "waiting_client_confirmation",
  ready_for_client_confirmation: "waiting_client_confirmation",
  client_confirmed: "client_confirmed",
  reviewed: "reviewed",
  completed: "completed",
  canceled: "canceled",
  archived: "hidden",
};

const REQUEST_LIFECYCLE_LABELS = {
  pending_review: "Чака одобрение",
  approved: "Одобрена",
  assigned: "Избран майстор",
  worker_arrived: "Майсторът е на адреса",
  in_progress: "В процес",
  waiting_client_confirmation: "Чака потвърждение от клиента",
  client_confirmed: "Чака отзив от клиента",
  reviewed: "Чака майсторът да затвори",
  completed: "Завършена",
  canceled: "Отказана",
  hidden: "Скрита",
};

const REQUEST_LIFECYCLE_NEXT_ACTOR = {
  pending_review: "admin",
  approved: "worker",
  assigned: "worker",
  worker_arrived: "worker",
  in_progress: "worker",
  waiting_client_confirmation: "client",
  client_confirmed: "client",
  reviewed: "worker",
  completed: null,
  canceled: null,
  hidden: null,
};

const REQUEST_LIFECYCLE_ALLOWED_ACTIONS = {
  pending_review: ["approve", "reject", "hide"],
  approved: ["apply", "assign", "withdraw_application", "cancel", "hide"],
  assigned: ["unassign", "mark_arrived", "cancel", "hide"],
  worker_arrived: ["unassign", "start_work", "cancel", "hide"],
  in_progress: ["mark_ready", "cancel", "hide"],
  waiting_client_confirmation: ["confirm_completion", "dispute", "hide"],
  client_confirmed: ["leave_review", "dispute", "hide"],
  reviewed: ["close", "hide"],
  completed: [],
  canceled: [],
  hidden: [],
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
    "profileBannerKey": "blueprint_plumbing_v1",
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
    "profileBannerKey": "blueprint_electrical_v1",
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
    "profileBannerKey": "blueprint_tiles_v1",
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
    mapSeedVersion: 10,
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
    pricingRules: [],
    requestEvents: [],
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
      if (Number(db?.mapSeedVersion || 0) < 8) {
        const migrated = {
          ...db,
          mapSeedVersion: 8,
        };
        ensureRequestMediaRecords(migrated);
        writeDb(migrated);
        return migrated;
      }
      if (Number(db?.mapSeedVersion || 0) < 9) {
        const migrated = {
          ...db,
          mapSeedVersion: 9,
          requests: (Array.isArray(db.requests) ? db.requests : []).map((request) =>
            decorateMockRequest(request),
          ),
        };
        writeDb(migrated);
        return migrated;
      }
      if (Number(db?.mapSeedVersion || 0) < 10) {
        const migrated = {
          ...db,
          mapSeedVersion: 10,
          pricingRules: Array.isArray(db.pricingRules) ? db.pricingRules : [],
          requestEvents: Array.isArray(db.requestEvents) ? db.requestEvents : [],
        };
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

function activeCurrentWorker(db = readDb()) {
  const worker = currentWorker(db);
  if (!worker || worker.status !== "active") {
    const error = new Error("Worker account is not active");
    error.response = { status: 401, data: { message: error.message } };
    throw error;
  }
  return worker;
}

export function saveDevWorkerProfile(data = {}) {
  const db = readDb();
  const worker = activeCurrentWorker(db);

  Object.assign(worker, {
    fullName: data.fullName ?? worker.fullName,
    name: data.fullName ?? worker.name,
    city: data.city ?? worker.city,
    description: data.description ?? worker.description,
    experience: data.experience ?? worker.experience,
    equipment: data.equipment ?? worker.equipment,
    skills: Array.isArray(data.skills) ? data.skills : worker.skills,
  });

  writeDb(db);
  return publicUser(worker, db);
}

export async function updateDevWorkerAppearance(data = {}) {
  const db = readDb();
  const worker = activeCurrentWorker(db);

  const key = String(data?.profileBannerKey || "").trim();
  if (!WORKER_BANNER_CATALOG[key]) {
    const error = new Error("Unknown banner key");
    error.response = { status: 400, data: { message: "Unknown banner key" } };
    throw error;
  }

  worker.profileBannerKey = key;
  writeDb(db);
  return { profileBannerKey: key };
}

export async function uploadDevWorkerAvatar(file) {
  const db = readDb();
  const worker = activeCurrentWorker(db);
  if (!file) return null;

  const url = await fileToDataUrl(file);
  db.media = Array.isArray(db.media) ? db.media : [];
  db.media.push({
    id: nextMockMediaId(db),
    kind: "worker_avatar",
    ownerUserId: worker.userId,
    workerUserId: worker.userId,
    publicUrl: url,
    storageKey: url,
    fileName: file.name,
    moderationStatus: "pending",
    createdAt: nowIso(),
  });
  writeDb(db);
  return publicUser(worker, db);
}

export async function uploadDevWorkerGallery(files = []) {
  const db = readDb();
  const worker = activeCurrentWorker(db);

  const clean = Array.from(files).filter((file) => String(file?.type || "").startsWith("image/"));
  const images = await Promise.all(
    clean.map(async (file) => ({
      id: nextMockMediaId(db),
      kind: "worker_gallery",
      ownerUserId: worker.userId,
      workerUserId: worker.userId,
      userId: worker.userId,
      fileName: file.name,
      publicUrl: await fileToDataUrl(file),
      storageKey: file.name,
      moderationStatus: "pending",
      created_at: nowIso(),
      createdAt: nowIso(),
    }))
  );

  db.media = [...(Array.isArray(db.media) ? db.media : []), ...images];
  writeDb(db);
  return workerGallery(db, worker, true);
}

export function deleteDevWorkerGalleryImage(imageId) {
  const db = readDb();
  const worker = activeCurrentWorker(db);

  worker.gallery = (Array.isArray(worker.gallery) ? worker.gallery : []).filter((img) => String(img.id) !== String(imageId));
  db.media = (Array.isArray(db.media) ? db.media : []).filter(
    (media) =>
      !(
        String(media.id) === String(imageId) &&
        Number(media.ownerUserId || media.workerUserId) === Number(worker.userId) &&
        media.kind === "worker_gallery"
      )
  );
  writeDb(db);
  return workerGallery(db, worker, true);
}
function response(data, status = 200) {
  return Promise.resolve({ data: decorateMockResponse(data), status, statusText: "OK", headers: {}, config: {} });
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
      moderationStatus: photo.photo?.moderationStatus,
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
    const beforeModerationStatus = status === "archived" ? "rejected" : status === "pending_admin" ? "pending" : "approved";
    const addPhotos = (photos, kind, moderationStatus) => normalizePhotos(photos).forEach((photo) => {
      const exists = db.media.some(
        (media) => Number(media.requestId) === Number(req.id) && media.kind === kind && media.publicUrl === photo.url,
      );
      if (exists) return;
      db.media.push({
        id: nextMockMediaId(db),
        kind,
        ownerUserId: kind === "request_after" ? req.assignedWorkerUserId : req.clientUserId,
        workerUserId: kind === "request_after" ? req.assignedWorkerUserId : null,
        requestId: req.id,
        publicUrl: photo.url,
        moderationStatus: photo.moderationStatus || moderationStatus,
        createdAt: photo.created_at || nowIso(),
      });
    });

    addPhotos(req.beforePhotos || req.photos, "request_before", beforeModerationStatus);
    addPhotos(req.afterPhotos, "request_after", "pending");
  });
  return db.media;
}

function saveMockRequestMedia(db, req, ownerUserId, kind, photos, moderationStatus = "pending") {
  db.media = Array.isArray(db.media) ? db.media : [];
  const normalized = normalizePhotos(photos).map((photo) => ({
    ...photo,
    moderationStatus,
  }));

  normalized.forEach((photo) => {
    const exists = db.media.some(
      (media) =>
        Number(media.requestId) === Number(req.id) &&
        media.kind === kind &&
        (media.publicUrl || media.url) === photo.url,
    );
    if (exists) return;
    db.media.push({
      id: nextMockMediaId(db),
      kind,
      ownerUserId,
      workerUserId: kind === "request_after" ? ownerUserId : null,
      requestId: req.id,
      publicUrl: photo.url,
      storageKey: photo.url,
      moderationStatus,
      createdAt: photo.created_at || nowIso(),
    });
  });

  return normalized;
}

function requestMediaPhotos(db, requestId, kind, includeUnapproved = false) {
  return (Array.isArray(db.media) ? db.media : [])
    .filter((media) => Number(media.requestId) === Number(requestId) && media.kind === kind)
    .filter((media) => includeUnapproved || media.moderationStatus === "approved")
    .map((media) => ({
      id: media.id,
      name: media.fileName || media.name || `media-${media.id}`,
      url: media.publicUrl || media.url,
      publicUrl: media.publicUrl || media.url,
      storageKey: media.storageKey,
      moderationStatus: media.moderationStatus,
      created_at: media.createdAt || media.created_at || nowIso(),
    }));
}

function completedJobsForWorker(db, worker, includeUnapproved = false) {
  const workerUserId = Number(worker?.userId || worker?.id);
  const canonical = (Array.isArray(db.requests) ? db.requests : [])
    .filter(
      (req) =>
        Number(req.assignedWorkerUserId) === workerUserId &&
        requestStatusKey(req) === "completed" &&
        Boolean(req.archivedAt),
    )
    .map((req) => ({
      id: req.id,
      requestId: req.id,
      category: req.category,
      categoryKey: req.categoryKey,
      address: req.addressVisibility === "rough_area" ? req.address : null,
      description: req.description,
      startedAt: req.created_at,
      completedAt: req.completedAt,
      durationDays: req.durationDays,
      beforePhotos: requestMediaPhotos(db, req.id, "request_before", includeUnapproved),
      afterPhotos: requestMediaPhotos(db, req.id, "request_after", includeUnapproved),
      created_at: req.created_at,
    }));
  const canonicalIds = new Set(canonical.map((job) => Number(job.requestId)));
  const legacy = (Array.isArray(worker?.completedJobs) ? worker.completedJobs : [])
    .filter((job) => !canonicalIds.has(Number(job.requestId)))
    .map((job) => ({
      ...job,
      beforePhotos: normalizePhotos(job.beforePhotos || job.photos).filter(
        (photo) => includeUnapproved || !photo.moderationStatus || photo.moderationStatus === "approved",
      ),
      afterPhotos: normalizePhotos(job.afterPhotos).filter(
        (photo) => includeUnapproved || !photo.moderationStatus || photo.moderationStatus === "approved",
      ),
    }));

  return sortNewest([...canonical, ...legacy]);
}

function approvedWorkerAvatarUrl(db, worker) {
  const workerUserId = Number(worker?.userId || worker?.id);
  const avatarMedia = (Array.isArray(db?.media) ? db.media : [])
    .filter((media) => media.kind === "worker_avatar")
    .filter((media) => Number(media.workerUserId || media.ownerUserId) === workerUserId);
  const approvedAvatar = avatarMedia
    .filter((media) => media.moderationStatus === "approved")
    .sort((a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0))[0];

  if (approvedAvatar) return approvedAvatar.publicUrl || approvedAvatar.url || "";

  const legacyUrl = worker?.avatarUrl || "";
  const legacyUrlIsRejectedOrPendingMedia = avatarMedia.some(
    (media) => (media.publicUrl || media.url) === legacyUrl && media.moderationStatus !== "approved",
  );

  return legacyUrlIsRejectedOrPendingMedia ? "" : legacyUrl;
}

function workerGallery(db, worker, includeUnapproved = false) {
  const workerUserId = Number(worker?.userId || worker?.id);
  const mediaPhotos = (Array.isArray(db?.media) ? db.media : [])
    .filter((media) => media.kind === "worker_gallery")
    .filter((media) => Number(media.workerUserId || media.ownerUserId) === workerUserId)
    .filter((media) => includeUnapproved || media.moderationStatus === "approved")
    .map((media) => ({
      id: media.id,
      userId: workerUserId,
      name: media.fileName || media.name || `media-${media.id}`,
      url: media.publicUrl || media.url,
      publicUrl: media.publicUrl || media.url,
      storageKey: media.storageKey,
      moderationStatus: media.moderationStatus || "pending",
      created_at: media.created_at || media.createdAt || nowIso(),
      createdAt: media.createdAt || media.created_at || nowIso(),
    }));

  const legacyPhotos = (Array.isArray(worker?.gallery) ? worker.gallery : []).map((photo) => ({
    ...photo,
    moderationStatus: photo.moderationStatus || "approved",
  }));

  return [...mediaPhotos, ...legacyPhotos].sort(
    (a, b) => new Date(b.createdAt || b.created_at || 0) - new Date(a.createdAt || a.created_at || 0),
  );
}

function applyMockMediaModeration(db, media, moderationStatus) {
  media.moderationStatus = moderationStatus;

  if (media.kind === "worker_avatar" && moderationStatus === "approved") {
    const workerUserId = Number(media.workerUserId || media.ownerUserId);
    (Array.isArray(db.media) ? db.media : []).forEach((item) => {
      if (
        Number(item.id) !== Number(media.id) &&
        item.kind === "worker_avatar" &&
        Number(item.workerUserId || item.ownerUserId) === workerUserId &&
        item.moderationStatus === "approved"
      ) {
        item.moderationStatus = "rejected";
      }
    });

    const worker = db.workers.find((item) => Number(item.userId) === workerUserId);
    if (worker) worker.avatarUrl = media.publicUrl || media.url || worker.avatarUrl || "";
  }

  if (media.kind === "worker_avatar" && moderationStatus === "rejected") {
    const workerUserId = Number(media.workerUserId || media.ownerUserId);
    const worker = db.workers.find((item) => Number(item.userId) === workerUserId);
    if (worker && worker.avatarUrl === (media.publicUrl || media.url)) {
      worker.avatarUrl = approvedWorkerAvatarUrl(db, worker);
    }
  }

  return media;
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

function asPath(url) {
  return String(url || "").split("?")[0].replace(/^\/api/, "");
}

function queryParam(url, key) {
  const [, query = ""] = String(url || "").split("?");
  return new URLSearchParams(query).get(key);
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

function publicUser(user, db = null) {
  if (!user) return null;
  const skillKeys = (Array.isArray(user.skills) ? user.skills : []).map(normalizeSkillKey);
  const avatarUrl = user.role === "worker" && db ? approvedWorkerAvatarUrl(db, user) : user.avatarUrl || "";
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
    avatarUrl,
    approvalStatus: user.approvalStatus,
    visibilityStatus: user.visibilityStatus,
    isBoosted: Boolean(user.isBoosted),
    boostSource: user.boostSource || null,
    boostEndsAt: user.boostEndsAt || null,
    completedJobs: user.completedJobs || [],
    profileBannerKey: WORKER_BANNER_CATALOG[user.profileBannerKey]
      ? user.profileBannerKey
      : DEFAULT_WORKER_BANNER_KEY,
  };
}

function publicWorker(user, db) {
  const worker = publicUser(user, db);
  if (!worker) return null;

  return {
    ...worker,
    email: null,
    phone: null,
    address: null,
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
  if (!user || (user.status && user.status !== "active")) return null;

  const userId = role === "worker" ? user.userId : user.id;
  localStorage.setItem("token", `local-dev-token-${role}-${userId}`);
  localStorage.setItem("role", role);
  localStorage.setItem("userId", String(userId));
  localStorage.setItem("userName", user.name || user.fullName || "Dev User");
  window.dispatchEvent(new Event("bricky-dev-identity-changed"));
  return publicUser(user, db);
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
    return Number(req.assignedWorkerUserId) === Number(workerUserId) && status === "completed" && Boolean(req.archivedAt);
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

function roughRequestAddress(address) {
  const value = String(address || "").trim();
  if (!value) return null;
  return value.split(",")[0]?.trim() || null;
}

function roughRequestCoordinate(value) {
  const coordinate = Number(value);
  if (!Number.isFinite(coordinate)) return null;
  return Number(coordinate.toFixed(2));
}

function workerVisibleRequestPhotos(db, request, kind, workerUserId) {
  const mediaRows = (Array.isArray(db.media) ? db.media : []).filter(
    (media) => Number(media.requestId) === Number(request.id) && media.kind === kind,
  );
  if (mediaRows.length) {
    return mediaRows
      .filter(
        (media) =>
          media.moderationStatus === "approved" ||
          (kind === "request_after" && Number(media.ownerUserId) === Number(workerUserId)),
      )
      .map((media) => ({
        id: media.id,
        name: media.fileName || media.name || `media-${media.id}`,
        url: media.publicUrl || media.url,
        publicUrl: media.publicUrl || media.url,
        storageKey: media.storageKey,
        moderationStatus: media.moderationStatus,
        created_at: media.createdAt || media.created_at || nowIso(),
      }));
  }

  const fallback = kind === "request_before" ? request.beforePhotos || request.photos : request.afterPhotos;
  return normalizePhotos(fallback).filter(
    (photo) => !photo.moderationStatus || photo.moderationStatus === "approved",
  );
}

function workerRequestView(request, workerUserId, db) {
  const isAssigned =
    Number(request.assignedWorkerUserId) === Number(workerUserId);
  const beforePhotos = workerVisibleRequestPhotos(db, request, "request_before", workerUserId);
  const afterPhotos = workerVisibleRequestPhotos(db, request, "request_after", workerUserId);

  return {
    ...request,
    photos: beforePhotos,
    beforePhotos,
    afterPhotos,
    clientName: isAssigned ? request.clientName : "Клиент",
    email: null,
    phone: null,
    address: isAssigned ? request.address : roughRequestAddress(request.address),
    addressText: isAssigned
      ? request.addressText || request.address
      : roughRequestAddress(request.addressText || request.address),
    addressPrecision: isAssigned ? "exact" : "rough",
    latitude: isAssigned
      ? request.latitude
      : roughRequestCoordinate(request.latitude),
    longitude: isAssigned
      ? request.longitude
      : roughRequestCoordinate(request.longitude),
  };
}

function setMockRequestStatus(req, statusKey) {
  req.statusKey = statusKey;
  delete req.status;
  decorateMockRequest(req);
}

function addMockRequestEvent(db, requestId, eventType, metadataJson = {}) {
  db.requestEvents = Array.isArray(db.requestEvents) ? db.requestEvents : [];
  db.requestEvents.push({
    id: db.requestEvents.length
      ? Math.max(...db.requestEvents.map((event) => Number(event.id) || 0)) + 1
      : 1,
    requestId: Number(requestId),
    actorUserId: Number(localStorage.getItem("userId") || 1),
    eventType,
    metadataJson,
    createdAt: nowIso(),
  });
}

function mockAdminCategories(db) {
  return (db.repairCategories || []).map((category, index) => ({
    id: category.id || index + 1,
    categoryKey: category.categoryKey || category.key,
    label: category.label,
    description: category.description || null,
    isActive: category.isActive !== false,
    sortOrder: Number(category.sortOrder ?? (index + 1) * 10),
    activities:
      Array.isArray(category.activities) && category.activities.length
        ? category.activities
        : [
            {
              id: `${category.categoryKey || category.key}:general`,
              categoryKey: category.categoryKey || category.key,
              activityKey: "general",
              label: category.shortLabel || category.label,
              unitType: category.unit || null,
              isActive: true,
              sortOrder: 10,
            },
          ],
  }));
}

function mockRequestApplications(req) {
  if (!Array.isArray(req.applications)) {
    const legacyIds = Array.from(new Set((req.appliedWorkers || []).map(Number).filter(Boolean)));
    req.applications = legacyIds.map((workerUserId) => ({
      id: `${req.id}:${workerUserId}`,
      workerUserId,
      status:
        Number(req.assignedWorkerUserId) === workerUserId
          ? "assigned"
          : req.assignedWorkerUserId
            ? "rejected"
            : "applied",
      offerMin: null,
      offerMax: null,
      message: null,
      createdAt: req.created_at || null,
      updatedAt: null,
    }));
  }
  delete req.appliedWorkers;
  return req.applications;
}

function activeMockApplications(req) {
  return mockRequestApplications(req).filter(
    (application) => !["withdrawn", "rejected"].includes(application.status),
  );
}

function decorateMockRequest(req) {
  if (
    !Object.prototype.hasOwnProperty.call(req, "assignedWorkerUserId") &&
    Object.prototype.hasOwnProperty.call(req, "assignedWorkerId")
  ) {
    req.assignedWorkerUserId = req.assignedWorkerId;
  }
  delete req.assignedWorkerId;
  delete req.completedByWorkerId;
  const statusKey = requestStatusKey(req);
  delete req.status;
  const lifecycleStatusKey = REQUEST_LIFECYCLE_STATUS[statusKey] || statusKey;
  mockRequestApplications(req);
  req.lifecycleStatusKey = lifecycleStatusKey;
  req.statusLabel = REQUEST_LIFECYCLE_LABELS[lifecycleStatusKey] || statusKey;
  req.nextActor = REQUEST_LIFECYCLE_NEXT_ACTOR[lifecycleStatusKey] ?? null;
  req.allowedActions = [...(REQUEST_LIFECYCLE_ALLOWED_ACTIONS[lifecycleStatusKey] || [])];
  return req;
}

function decorateMockResponse(data) {
  if (Array.isArray(data)) return data.map(decorateMockResponse);
  if (!data || typeof data !== "object") return data;

  const looksLikeRequest =
    Object.prototype.hasOwnProperty.call(data, "clientUserId") &&
    Object.prototype.hasOwnProperty.call(data, "id") &&
    (Object.prototype.hasOwnProperty.call(data, "category") ||
      Object.prototype.hasOwnProperty.call(data, "categoryKey")) &&
    (Object.prototype.hasOwnProperty.call(data, "status") ||
      Object.prototype.hasOwnProperty.call(data, "statusKey"));

  return looksLikeRequest ? decorateMockRequest(data) : data;
}

function ensureMockRequestStatus(req, allowedStatuses, message = "Invalid request status") {
  if (!allowedStatuses.includes(requestStatusKey(req))) return fail(message, 400);
  return null;
}

function completeMockWorkerStep(db, req, workerUserId, allowedStatuses, nextStatus, afterPhotos = null) {
  if (Number(req.assignedWorkerUserId) !== Number(workerUserId)) return fail("Not your job", 403);
  const statusGuard = ensureMockRequestStatus(req, allowedStatuses, "Invalid request status transition");
  if (statusGuard) return statusGuard;
  setMockRequestStatus(req, nextStatus);
  if (Array.isArray(afterPhotos)) {
    req.afterPhotos = saveMockRequestMedia(db, req, workerUserId, "request_after", afterPhotos, "pending");
  }
  writeDb(db);
  return response(req);
}

export async function mockRequest(method, url, data) {
  const db = readDb();
  const path = asPath(url);
  const scope = queryParam(url, "scope");
  const user = currentUser();
  const role = localStorage.getItem("role") || user.role;
  const userId = role === "worker" ? Number(user.userId || user.id) : Number(user.id);
  const requiresActiveSession =
    path.startsWith("/workers/me") ||
    path.startsWith("/requests") ||
    path.startsWith("/admin/");
  if (
    requiresActiveSession &&
    user?.status &&
    user.status !== "active" &&
    path !== "/auth/register"
  ) {
    return fail("Account is not active", 401);
  }

  if (method === "post" && path === "/auth/dev-login") {
    const loginRole = ["worker", "admin", "super_admin"].includes(data?.role) ? data.role : "client";
    const first =
      loginRole === "worker"
        ? db.workers[0]
        : ["admin", "super_admin"].includes(loginRole)
        ? db.admins[0]
        : db.clients[0];
    setDevIdentity(loginRole, loginRole === "worker" ? first.userId : first.id);
    return response({ token: localStorage.getItem("token"), user: publicUser(first, db) });
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
      return response({ token: `local-dev-token-worker-${newUserId}`, user: publicUser(worker, db) }, 201);
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

  if (method === "get" && path === "/client/me") return response(publicUser(user, db));
  if (method === "get" && path === "/account/me") {
    return response({
      userId,
      role,
      status: user.status || "active",
      email: user.email || "",
      profile: {
        name: user.name || user.fullName || "",
        phone: user.phone || "",
        address: user.address || "",
        city: user.city || null,
      },
      subscription: role === "worker" ? { planKey: user.planKey || "free", status: "active", startsAt: null, endsAt: null } : null,
      notifications: { unreadCount: 0, items: [] },
    });
  }
  if (method === "put" && path === "/account/profile") {
    user.name = data?.name ?? user.name;
    if (role === "worker") user.fullName = data?.name ?? user.fullName;
    user.email = data?.email ?? user.email;
    user.phone = data?.phone ?? user.phone;
    user.address = data?.address ?? user.address;
    writeDb(db);
    return mockRequest("get", "/account/me");
  }
  if (method === "get" && path === "/account/export") {
    return response({
      exportedAt: nowIso(),
      account: (await mockRequest("get", "/account/me")).data,
      requests: db.requests.filter(
        (item) =>
          Number(item.clientUserId) === userId ||
          Number(item.assignedWorkerUserId) === userId,
      ),
      applications:
        role === "worker"
          ? db.requests.flatMap((item) =>
              (item.applications || []).filter(
                (entry) => Number(entry.workerUserId) === userId,
              ),
            )
          : [],
      reviews: (db.reviews || []).filter(
        (item) =>
          Number(item.clientUserId) === userId ||
          Number(item.workerUserId) === userId,
      ),
      media: (db.media || []).filter(
        (item) => Number(item.ownerUserId) === userId,
      ),
      notifications: [],
    });
  }
  if (method === "post" && path === "/account/deactivate") {
    const active = db.requests.some(
      (item) =>
        (Number(item.clientUserId) === userId ||
          Number(item.assignedWorkerUserId) === userId) &&
        !["completed", "canceled", "archived"].includes(requestStatusKey(item)),
    );
    if (active) return fail("Имате активна поръчка", 400);
    if (String(data?.currentPassword || "").length < 8)
      return fail("Текущата парола е грешна", 403);
    user.status = "deleted";
    if (role === "worker") user.visibilityStatus = "private";
    writeDb(db);
    return response({ deactivated: true, message: "Профилът е деактивиран" });
  }
  if (method === "post" && path === "/auth/password-reset/request") {
    return response({ message: "Ако имейлът е регистриран, ще получите защитен линк за смяна на паролата." });
  }
  if (method === "post" && path === "/auth/password-reset/confirm") {
    return response({ ok: true, message: "Паролата е сменена успешно." });
  }
  if (method === "post" && /^\/notifications\/\d+\/read$/.test(path)) return response({ ok: true });
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
        ...(db.workers || []).map((worker) => publicUser(worker, db)),
        ...(db.admins || []).map(publicUser),
      ]);
    }
    if (method === "get" && path === "/admin/workers") {
      return response((db.workers || []).map((worker) => ({
        ...publicUser(worker, db),
        workerUserId: worker.userId,
        publicName: worker.fullName || worker.name,
        approvalStatus: worker.approvalStatus || "pending",
        visibilityStatus: worker.visibilityStatus || "private",
        userStatus: worker.status || "active",
      })));
    }
    if (method === "get" && path === "/admin/requests") {
      const requests = db.requests || [];
      const filtered =
        scope === "moderation"
          ? requests.filter((request) => ["draft", "pending_admin"].includes(requestStatusKey(request)) && !request.archivedAt)
          : scope === "active"
          ? requests.filter((request) => !request.archivedAt && !["draft", "pending_admin", "completed", "canceled", "archived"].includes(requestStatusKey(request)))
          : scope === "completed"
          ? requests.filter((request) => requestStatusKey(request) === "completed" && request.archivedAt)
          : requests;
      return response(sortNewest(filtered));
    }
    const requestTimelineMatch = path.match(/^\/admin\/requests\/(\d+)\/timeline$/);
    if (method === "get" && requestTimelineMatch) {
      const requestId = Number(requestTimelineMatch[1]);
      const request = db.requests.find((item) => Number(item.id) === requestId);
      if (!request) return fail("Request not found", 404);
      const events = (db.requestEvents || []).filter(
        (event) => Number(event.requestId) === requestId,
      );
      if (!events.some((event) => event.eventType === "request.created")) {
        events.unshift({
          id: `created:${requestId}`,
          requestId,
          actorUserId: request.clientUserId || null,
          eventType: "request.created",
          metadataJson: { status: "pending_admin" },
          createdAt: request.created_at || request.createdAt || nowIso(),
        });
      }
      return response({ request: decorateMockRequest(request), events });
    }
    if (method === "get" && path === "/admin/media") return response(db.media || []);
    if (method === "get" && path === "/admin/referrals") return response(db.referrals || []);
    if (method === "get" && path === "/admin/audit") return response(db.auditLogs || []);
    if (method === "get" && path === "/admin/categories") {
      return response(mockAdminCategories(db));
    }
    if (method === "get" && path === "/admin/pricing") {
      return response(db.pricingRules || []);
    }

    const userStatusMatch = path.match(/^\/admin\/users\/(\d+)\/status$/);
    if (method === "post" && userStatusMatch) {
      const targetId = Number(userStatusMatch[1]);
      const target = [...(db.clients || []), ...(db.workers || []), ...(db.admins || [])].find((item) => Number(item.id) === targetId || Number(item.userId) === targetId);
      if (!target) return fail("User not found", 404);
      target.status = data?.status || "active";
      addAudit(db, "user_status_changed", "user", targetId, data?.reason || target.status);
      writeDb(db);
      return response(publicUser(target, db));
    }

    const workerApprovalMatch = path.match(/^\/admin\/workers\/(\d+)\/approval$/);
    if (method === "post" && workerApprovalMatch) {
      const targetId = Number(workerApprovalMatch[1]);
      const worker = db.workers.find((item) => Number(item.userId) === targetId || Number(item.id) === targetId);
      if (!worker) return fail("Worker not found", 404);
      worker.approvalStatus = data?.approvalStatus || data?.status || "approved";
      worker.visibilityStatus = worker.approvalStatus === "approved"
        ? (worker.visibilityStatus === "hidden" ? "private" : worker.visibilityStatus || "private")
        : worker.approvalStatus === "suspended" ? "hidden" : "private";
      if (worker.approvalStatus === "approved") worker.status = "active";
      addAudit(db, "worker_approval_changed", "worker", worker.userId, worker.approvalStatus);
      writeDb(db);
      return response(publicUser(worker, db));
    }

    const workerWallMatch = path.match(/^\/admin\/workers\/(\d+)\/wall-visibility$/);
    if (method === "post" && workerWallMatch) {
      const targetId = Number(workerWallMatch[1]);
      const worker = db.workers.find((item) => Number(item.userId) === targetId || Number(item.id) === targetId);
      if (!worker) return fail("Worker not found", 404);
      if (data?.listed && worker.approvalStatus !== "approved") return fail("Approve the worker first", 400);
      worker.visibilityStatus = data?.listed ? "public" : "private";
      addAudit(db, "worker_wall_visibility_changed", "worker", worker.userId, worker.visibilityStatus);
      writeDb(db);
      return response(publicUser(worker, db));
    }

    const requestStatusMatch = path.match(/^\/admin\/requests\/(\d+)\/status$/);
    if (method === "post" && requestStatusMatch) {
      const request = db.requests.find((item) => Number(item.id) === Number(requestStatusMatch[1]));
      if (!request) return fail("Request not found", 404);
      const nextStatus = data?.status || requestStatusKey(request);
      if (nextStatus === "published") {
        const unresolvedPhotos = (Array.isArray(db.media) ? db.media : []).filter(
          (media) =>
            Number(media.requestId) === Number(request.id) &&
            media.kind === "request_before" &&
            !["approved", "rejected"].includes(String(media.moderationStatus || "").toLowerCase()),
        );
        if (unresolvedPhotos.length) return fail("Review every request photo before publishing the request", 400);
      }
      setMockRequestStatus(request, nextStatus);
      addMockRequestEvent(db, request.id, "admin.status_changed", {
        status: nextStatus,
        reason: data?.reason || null,
      });
      addAudit(db, "request_status_changed", "request", request.id, request.statusLabel || request.statusKey);
      writeDb(db);
      return response(request);
    }

    const categoryMatch = path.match(/^\/admin\/categories\/([^/]+)$/);
    if (method === "post" && categoryMatch) {
      if (role !== "super_admin") return fail("Super admin only", 403);
      const categoryKey = decodeURIComponent(categoryMatch[1]);
      let category = (db.repairCategories || []).find(
        (item) => (item.categoryKey || item.key) === categoryKey,
      );
      if (!category) {
        if (!String(data?.label || "").trim()) return fail("Category label is required", 400);
        category = { key: categoryKey, categoryKey, label: String(data.label).trim() };
        db.repairCategories.push(category);
      }
      if (data?.label !== undefined) category.label = String(data.label).trim();
      if (data?.description !== undefined) category.description = data.description || null;
      if (data?.isActive !== undefined) category.isActive = Boolean(data.isActive);
      if (data?.sortOrder !== undefined) category.sortOrder = Number(data.sortOrder);
      addAudit(db, "catalog.category_changed", "repair_category", categoryKey, data?.reason);
      writeDb(db);
      return response(category);
    }

    const activityMatch = path.match(
      /^\/admin\/categories\/([^/]+)\/activities\/([^/]+)$/,
    );
    if (method === "post" && activityMatch) {
      if (role !== "super_admin") return fail("Super admin only", 403);
      const categoryKey = decodeURIComponent(activityMatch[1]);
      const activityKey = decodeURIComponent(activityMatch[2]);
      const category = (db.repairCategories || []).find(
        (item) => (item.categoryKey || item.key) === categoryKey,
      );
      if (!category) return fail("Repair category not found", 404);
      category.activities = Array.isArray(category.activities)
        ? category.activities
        : mockAdminCategories({ repairCategories: [category] })[0].activities;
      let activity = category.activities.find((item) => item.activityKey === activityKey);
      if (!activity) {
        if (!String(data?.label || "").trim()) return fail("Activity label is required", 400);
        activity = { categoryKey, activityKey, label: String(data.label).trim() };
        category.activities.push(activity);
      }
      if (data?.label !== undefined) activity.label = String(data.label).trim();
      if (data?.unitType !== undefined) activity.unitType = data.unitType || null;
      if (data?.isActive !== undefined) activity.isActive = Boolean(data.isActive);
      if (data?.sortOrder !== undefined) activity.sortOrder = Number(data.sortOrder);
      addAudit(db, "catalog.activity_changed", "repair_activity", `${categoryKey}:${activityKey}`, data?.reason);
      writeDb(db);
      return response(activity);
    }

    if (method === "post" && path === "/admin/pricing") {
      const categoryKey = String(data?.categoryKey || "");
      const activityKey = String(data?.activityKey || "");
      const version = String(data?.version || "").trim();
      if (!categoryKey || !activityKey || !version) return fail("Missing pricing fields", 400);
      const laborMin = Number(data?.laborMin);
      const laborMax = Number(data?.laborMax);
      if (!Number.isFinite(laborMin) || !Number.isFinite(laborMax) || laborMin > laborMax) {
        return fail("Invalid labor range", 400);
      }
      db.pricingRules = Array.isArray(db.pricingRules) ? db.pricingRules : [];
      if (
        db.pricingRules.some(
          (rule) =>
            rule.categoryKey === categoryKey &&
            rule.activityKey === activityKey &&
            rule.version === version,
        )
      ) {
        return fail("Pricing version already exists for this activity", 400);
      }
      const isActive = data?.isActive !== false;
      if (isActive) {
        db.pricingRules.forEach((rule) => {
          if (rule.categoryKey === categoryKey && rule.activityKey === activityKey) {
            rule.isActive = false;
          }
        });
      }
      const rule = {
        id: db.pricingRules.length
          ? Math.max(...db.pricingRules.map((item) => Number(item.id) || 0)) + 1
          : 1,
        version,
        categoryKey,
        activityKey,
        laborMin: laborMin.toFixed(2),
        laborMax: laborMax.toFixed(2),
        materialMin:
          data?.materialMin === "" || data?.materialMin == null
            ? null
            : Number(data.materialMin).toFixed(2),
        materialMax:
          data?.materialMax === "" || data?.materialMax == null
            ? null
            : Number(data.materialMax).toFixed(2),
        currency: String(data?.currency || "EUR").toUpperCase(),
        validFrom: data?.validFrom || null,
        validTo: data?.validTo || null,
        isActive,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      };
      db.pricingRules.push(rule);
      addAudit(db, "pricing.rule_created", "pricing_rule", rule.id, data?.reason);
      writeDb(db);
      return response(rule, 201);
    }

    const pricingStatusMatch = path.match(/^\/admin\/pricing\/(\d+)\/status$/);
    if (method === "post" && pricingStatusMatch) {
      const rule = (db.pricingRules || []).find(
        (item) => Number(item.id) === Number(pricingStatusMatch[1]),
      );
      if (!rule) return fail("Pricing rule not found", 404);
      if (data?.isActive) {
        db.pricingRules.forEach((item) => {
          if (
            item.categoryKey === rule.categoryKey &&
            item.activityKey === rule.activityKey
          ) {
            item.isActive = false;
          }
        });
      }
      rule.isActive = Boolean(data?.isActive);
      rule.updatedAt = nowIso();
      addAudit(db, "pricing.rule_status_changed", "pricing_rule", rule.id, data?.reason);
      writeDb(db);
      return response(rule);
    }

    const mediaModerationMatch = path.match(/^\/admin\/media\/(\d+)\/moderation$/);
    if (method === "post" && mediaModerationMatch) {
      const media = db.media.find((item) => Number(item.id) === Number(mediaModerationMatch[1]));
      if (!media) return fail("Media not found", 404);
      applyMockMediaModeration(db, media, data?.moderationStatus || "approved");
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

  if (method === "get" && path === "/catalog") {
    return response({
      categories: mockAdminCategories(db).filter((category) => category.isActive !== false),
      pricingRules: (db.pricingRules || []).filter((rule) => rule.isActive),
    });
  }

  if (method === "put" && path === "/workers/me/appearance") {
    try {
      return response(await updateDevWorkerAppearance(data));
    } catch (error) {
      return fail(error?.response?.data?.message || error?.message || "Appearance update failed", error?.response?.status || 400);
    }
  }

  if (method === "get" && path === "/workers/me") return response(publicUser(db.workers.find((w) => Number(w.userId) === userId), db));
  if (method === "get" && path === "/workers") {
    return response(
      db.workers
        .filter(
          (worker) =>
            worker.status === "active" &&
            worker.approvalStatus === "approved" &&
            worker.visibilityStatus === "public",
        )
        .map((worker) => publicWorker(worker, db)),
    );
  }

  const workerById = path.match(/^\/workers\/(\d+)$/);
  if (method === "get" && workerById) {
    const id = Number(workerById[1]);
    const worker = db.workers.find((w) => Number(w.userId) === id || Number(w.id) === id);
    return worker &&
      worker.status === "active" &&
      worker.approvalStatus === "approved" &&
      worker.visibilityStatus === "public"
      ? response(publicWorker(worker, db))
      : fail("Worker not found", 404);
  }

  if (method === "get" && /^\/workers\/\d+\/gallery$/.test(path)) {
    const id = Number(path.match(/^\/workers\/(\d+)\/gallery$/)?.[1]);
    const worker = db.workers.find((w) => Number(w.userId) === id || Number(w.id) === id);
    return response(worker ? workerGallery(db, worker, false) : []);
  }
  if (method === "get" && path === "/workers/me/gallery") {
    const worker = currentWorker(db);
    return response(worker ? workerGallery(db, worker, true) : []);
  }

  if (method === "get" && path === "/workers/me/history") {
    const worker = currentWorker(db);
    return response(worker ? completedJobsForWorker(db, worker, true) : []);
  }

  const workerHistory = path.match(/^\/workers\/(\d+)\/history$/);
  if (method === "get" && workerHistory) {
    const id = Number(workerHistory[1]);
    const worker = db.workers.find((w) => Number(w.userId) === id || Number(w.id) === id);
    return response(worker ? completedJobsForWorker(db, worker, false) : []);
  }

  
  const galleryDeleteMatch = path.match(/^\/workers\/me\/gallery\/(.+)\/delete$/);
  if (method === "post" && galleryDeleteMatch) {
    return response(deleteDevWorkerGalleryImage(galleryDeleteMatch[1]));
  }
  if (method === "post" && path === "/requests/draft") return response(draftRequest(data));

  if (method === "get" && path === "/requests/client") {
    const items = db.requests.filter((r) => {
      if (Number(r.clientUserId) !== userId) return false;
      return scope === "history" ? Boolean(r.archivedAt) : !r.archivedAt;
    });
    return response(sortNewest(items));
  }

  if (method === "get" && path === "/requests/map") {
    if (role !== "worker") return fail("Worker only", 403);
    const guard = ensureMockWorkerCanTakeJobs(db, userId);
    if (guard) return guard;
    const items = sortNewest(
      db.requests.filter((request) => {
        const assigned = Number(request.assignedWorkerUserId || 0);
        const status = requestStatusKey(request);
        if (request.archivedAt) return false;
        if (["draft", "pending_admin", "canceled", "archived", "completed"].includes(status)) return false;
        if (!assigned) return ["published", "applied"].includes(status);
        return assigned === userId;
      }),
    );
    return response(items.map((request) => workerRequestView(request, userId, db)));
  }

  if (method === "get" && path === "/requests/worker") {
    const guard = ensureMockWorkerCanTakeJobs(db, userId);
    if (guard) return guard;

    if (scope === "history") {
      return response(
        sortNewest(
          db.requests.filter((r) => Number(r.assignedWorkerUserId) === userId && requestStatusKey(r) === "completed" && Boolean(r.archivedAt)),
        ).map((request) => workerRequestView(request, userId, db)),
      );
    }

    const items = db.requests.filter((r) => {
      const assigned = Number(r.assignedWorkerUserId || 0);
      const status = requestStatusKey(r);
      if (r.archivedAt) return false;
      if (["draft", "pending_admin", "canceled", "archived", "completed"].includes(status)) return false;
      if (!assigned) return ["published", "applied"].includes(status);
      return assigned === userId;
    });
    return response(
      sortNewest(items).map((request) => workerRequestView(request, userId, db)),
    );
  }

  if (method === "post" && path === "/requests") {
    if (role !== "client") return fail("Client only", 400);
    const client = db.clients.find((c) => Number(c.id) === userId) || user;
    const beforePhotos = normalizePhotos(data.photos);
    const req = {
      id: db.nextRequestId++,
      clientUserId: userId,
      clientName: data.clientName || client.name,
      email: null,
      phone: null,
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
      statusKey: "pending_admin",
      photos: beforePhotos,
      beforePhotos,
      afterPhotos: [],
      applications: [],
      assignedWorkerUserId: null,
      completedAt: null,
      clientConfirmedAt: null,
      archivedAt: null,
      archiveReason: null,
      archiveSource: null,
      archivedByUserId: null,
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
    if (req.assignedWorkerUserId) return fail("Request already has assigned worker", 400);
    const statusGuard = ensureMockRequestStatus(req, ["published", "applied"], "Request is not open for applications");
    if (statusGuard) return statusGuard;
    const applications = mockRequestApplications(req);
    const existing = applications.find(
      (application) => Number(application.workerUserId) === userId,
    );
    if (existing) {
      existing.status = "applied";
      existing.updatedAt = nowIso();
    } else {
      applications.push({
        id: `${req.id}:${userId}`,
        workerUserId: userId,
        status: "applied",
        offerMin: null,
        offerMax: null,
        message: null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }
    setMockRequestStatus(req, "applied");
    writeDb(db);
    return response(req);
  }

  const withdrawMatch = path.match(/^\/requests\/(\d+)\/withdraw$/);
  if (method === "post" && withdrawMatch) {
    if (role !== "worker") return fail("Worker only", 400);
    const guard = ensureMockWorkerCanTakeJobs(db, userId);
    if (guard) return guard;

    const req = db.requests.find((r) => Number(r.id) === Number(withdrawMatch[1]));
    if (!req) return fail("Request not found", 404);
    if (["completed", "canceled", "archived"].includes(requestStatusKey(req)) || req.archivedAt) return fail("Request is closed", 400);
    if (Number(req.assignedWorkerUserId) === userId) return fail("Cannot withdraw after the client selected you", 400);

    const application = mockRequestApplications(req).find(
      (item) => Number(item.workerUserId) === userId,
    );
    if (!application) return fail("Application not found", 404);
    application.status = "withdrawn";
    application.updatedAt = nowIso();
    if (!req.assignedWorkerUserId && activeMockApplications(req).length === 0) setMockRequestStatus(req, "published");
    else if (!req.assignedWorkerUserId) setMockRequestStatus(req, "applied");
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
    const selectedApplication = activeMockApplications(req).find(
      (application) => Number(application.workerUserId) === workerUserId,
    );
    if (!selectedApplication) return fail("This worker has not applied to this request", 400);
    mockRequestApplications(req).forEach((application) => {
      application.status =
        Number(application.workerUserId) === workerUserId ? "assigned" : "rejected";
      application.updatedAt = nowIso();
    });
    req.assignedWorkerUserId = workerUserId;
    setMockRequestStatus(req, "worker_selected");
    writeDb(db);
    return response(req);
  }

  const unassignMatch = path.match(/^\/requests\/(\d+)\/unassign$/);
  if (method === "post" && unassignMatch) {
    if (role !== "client") return fail("Client only", 400);
    const req = db.requests.find((r) => Number(r.id) === Number(unassignMatch[1]));
    if (!req) return fail("Request not found", 404);
    if (Number(req.clientUserId) !== userId) return fail("Not your request", 403);
    if (!req.assignedWorkerUserId) return fail("No assigned worker", 400);
    if (["in_progress", "work_finished", "ready_for_client_confirmation", "completed"].includes(requestStatusKey(req))) {
      return fail("Cannot unassign after the worker started work", 400);
    }
    const assignedWorkerUserId = Number(req.assignedWorkerUserId);
    req.assignedWorkerUserId = null;
    const application = mockRequestApplications(req).find(
      (item) => Number(item.workerUserId) === assignedWorkerUserId,
    );
    if (application) {
      application.status = "applied";
      application.updatedAt = nowIso();
    }
    setMockRequestStatus(req, activeMockApplications(req).length ? "applied" : "published");
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
    if (["client_confirmed", "reviewed", "completed"].includes(requestStatusKey(req)) && req.archivedAt) return response(req);
    const statusGuard = ensureMockRequestStatus(req, ["ready_for_client_confirmation"], "Request is not ready for confirmation");
    if (statusGuard) return statusGuard;
    const completedAt = nowIso();
    setMockRequestStatus(req, "client_confirmed");
    req.clientConfirmedAt = req.clientConfirmedAt || completedAt;
    req.completedAt = req.completedAt || completedAt;
    req.archivedAt = req.archivedAt || completedAt;
    req.archiveReason = req.archiveReason || "completed";
    req.archiveSource = req.archiveSource || "system";
    req.archivedByUserId = req.archivedByUserId || userId;
    req.durationDays = completionDurationDays(req, req.completedAt);
    writeDb(db);
    return response(req);
  }

  const completeMatch = path.match(/^\/requests\/(\d+)\/complete$/);
  if (method === "post" && completeMatch) {
    if (role !== "worker") return fail("Worker only", 400);
    const req = db.requests.find((r) => Number(r.id) === Number(completeMatch[1]));
    if (!req) return fail("Request not found", 404);
    if (Number(req.assignedWorkerUserId) !== userId) return fail("Not your job", 403);
    if (requestStatusKey(req) === "completed" && req.archivedAt) return response(req);
    const statusGuard = ensureMockRequestStatus(req, ["reviewed"], "Request must be reviewed before closing");
    if (statusGuard) return statusGuard;

    const completedAt = nowIso();
    setMockRequestStatus(req, "completed");
    req.completedAt = completedAt;
    req.archiveReason = "closed_by_worker";
    req.archiveSource = "worker";
    req.archivedByUserId = userId;
    if (Array.isArray(data?.afterPhotos) && data.afterPhotos.length) {
      req.afterPhotos = saveMockRequestMedia(db, req, userId, "request_after", data.afterPhotos, "pending");
    }
    req.durationDays = completionDurationDays(req, completedAt);

    const worker = db.workers.find((w) => Number(w.userId) === userId);
    if (worker) {
      ensureWorkerJobHistory(worker, req);
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
    if (!["client_confirmed", "completed"].includes(requestStatusKey(req)) || !req.archivedAt) return fail("Request must be completed before review", 400);
    const exists = db.reviews.find((r) => Number(r.requestId) === requestId);
    if (exists) return fail("Already reviewed", 400);
    const review = {
      id: db.nextReviewId++,
      requestId,
      clientUserId: userId,
      workerUserId: Number(req.assignedWorkerUserId),
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
