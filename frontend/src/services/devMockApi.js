import { REPAIR_CATEGORY_OPTIONS, REPAIR_CATEGORY_FLOW, getRepairCategoryByLabel } from "../constants/repairCatalog.js";

const STORAGE_KEY = "bricky.dev.db";

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
    "equipment": "Професионални инструменти за ВиК диагностика."
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
    "equipment": "Тестер, инструменти за ел. инсталации."
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
    "equipment": "Машина за рязане на плочки, лазерен нивелир."
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
  const completedJob = {
    id: "job-seed-completed-201",
    requestId: 9001,
    category: repairCategoryByKey("bathroom_renovation").label,
    clientName: CLIENTS[0].name,
    address: "Sofia, Lozenets",
    description: "Completed bathroom renovation verified through Bricky.",
    startedAt: "2026-06-24T08:00:00.000Z",
    completedAt: "2026-06-29T16:00:00.000Z",
    durationDays: 6,
    beforePhotos: [
      { id: "seed-job-before-1", name: "Before renovation", url: "/media_files/banq.jpg", created_at: "2026-06-24T08:00:00.000Z" },
      { id: "seed-job-before-2", name: "Before renovation detail", url: "/media_files/banq2.jpg", created_at: "2026-06-24T08:01:00.000Z" },
    ],
    afterPhotos: [
      { id: "seed-job-after-1", name: "Completed renovation", url: "/media_files/banq3.jpg", created_at: "2026-06-29T16:00:00.000Z" },
      { id: "seed-job-after-2", name: "Completed renovation detail", url: "/media_files/download.jpg", created_at: "2026-06-29T16:01:00.000Z" },
    ],
    created_at: "2026-06-29T16:00:00.000Z",
  };
  const workers = WORKERS.map((worker) => ({ ...worker, skills: [...(worker.skills || [])] }));
  workers[0].completedJobs = [completedJob];
  workers[0].gallery = [
    ...completedJob.beforePhotos.map((photo) => ({ ...photo, userId: workers[0].userId, requestId: completedJob.requestId, phase: "before" })),
    ...completedJob.afterPhotos.map((photo) => ({ ...photo, userId: workers[0].userId, requestId: completedJob.requestId, phase: "after" })),
  ];

  return {
    mapSeedVersion: 5,
    nextRequestId: 7,
    nextReviewId: 1,
    repairCategories: REPAIR_CATEGORY_OPTIONS.map((category) => ({
      ...category,
      flow: REPAIR_CATEGORY_FLOW[category.key] || REPAIR_CATEGORY_FLOW.other,
    })),
    clients: CLIENTS,
    workers,
    reviews: [],
    requests: [
      {
        id: 1,
        clientUserId: 101,
        clientName: CLIENTS[0].name,
        email: CLIENTS[0].email,
        phone: CLIENTS[0].phone,
        address: "София, ул. Граф Игнатиев 18",
        latitude: 42.690781,
        longitude: 23.326193,
        locationSource: "seed",
        category: "ВиК",
        description: "Тече под мивката в кухнята.",
        status: "нова",
        photos: [
          { id: "seed-1-a", name: "Проблем под мивка", url: "/media_files/banq.jpg", moderationStatus: "pending_review", created_at: nowIso() },
          { id: "seed-1-b", name: "Снимка на сифона", url: "/media_files/banq2.jpg", created_at: nowIso() },
        ],
        beforePhotos: [
          { id: "seed-1-a", name: "Проблем под мивка", url: "/media_files/banq.jpg", created_at: nowIso() },
          { id: "seed-1-b", name: "Снимка на сифона", url: "/media_files/banq2.jpg", created_at: nowIso() },
        ],
        afterPhotos: [],
        appliedWorkers: [],
        assignedWorkerId: null,
        completedAt: null,
        completedByWorkerId: null,
        durationDays: null,
        created_at: nowIso(),
      },
      {
        id: 2,
        clientUserId: 102,
        clientName: CLIENTS[1].name,
        email: CLIENTS[1].email,
        phone: CLIENTS[1].phone,
        address: "София, бул. Витоша 72",
        latitude: 42.687389,
        longitude: 23.319482,
        locationSource: "seed",
        category: "Електро",
        description: "Няколко контакта не работят след ремонт.",
        status: "кандидатствана",
        photos: [
          { id: "seed-2-a", name: "Контакт", url: "/media_files/images.jpg", created_at: nowIso() },
        ],
        beforePhotos: [
          { id: "seed-2-a", name: "Контакт", url: "/media_files/images.jpg", created_at: nowIso() },
        ],
        afterPhotos: [],
        appliedWorkers: [202],
        assignedWorkerId: null,
        completedAt: null,
        completedByWorkerId: null,
        durationDays: null,
        created_at: nowIso(),
      },
      {
        id: 3,
        clientUserId: 103,
        clientName: CLIENTS[2].name,
        email: CLIENTS[2].email,
        phone: CLIENTS[2].phone,
        address: "София, ул. Цар Симеон 143",
        latitude: 42.704901,
        longitude: 23.312384,
        locationSource: "seed",
        category: "Плочки",
        description: "Лепене на плочки в малка баня.",
        status: "в процес",
        photos: [
          { id: "seed-3-a", name: "Баня преди ремонт", url: "/media_files/banq3.jpg", created_at: nowIso() },
          { id: "seed-3-b", name: "Стенни плочки", url: "/media_files/download.jpg", created_at: nowIso() },
        ],
        beforePhotos: [
          { id: "seed-3-a", name: "Баня преди ремонт", url: "/media_files/banq3.jpg", created_at: nowIso() },
          { id: "seed-3-b", name: "Стенни плочки", url: "/media_files/download.jpg", created_at: nowIso() },
        ],
        afterPhotos: [],
        appliedWorkers: [203],
        assignedWorkerId: 203,
        completedAt: null,
        completedByWorkerId: null,
        durationDays: null,
        created_at: nowIso(),
      },
      {
        id: 4,
        clientUserId: 101,
        clientName: CLIENTS[0].name,
        email: CLIENTS[0].email,
        phone: CLIENTS[0].phone,
        address: "София, ул. Козяк 12",
        latitude: 42.661811,
        longitude: 23.333928,
        locationSource: "seed",
        category: "Освежителен ремонт",
        description: "Освежаване на дневна и коридор, нужни са шпакловка и боя.",
        status: "нова",
        moderationStatus: "pending_review",
        photos: [{ id: "seed-4-a", name: "Стена", url: "/media_files/sadsadasd.jpg", created_at: nowIso() }],
        beforePhotos: [{ id: "seed-4-a", name: "Стена", url: "/media_files/sadsadasd.jpg", created_at: nowIso() }],
        afterPhotos: [],
        appliedWorkers: [],
        assignedWorkerId: null,
        completedAt: null,
        completedByWorkerId: null,
        durationDays: null,
        created_at: nowIso(),
      },
      {
        id: 5,
        clientUserId: 102,
        clientName: CLIENTS[1].name,
        email: CLIENTS[1].email,
        phone: CLIENTS[1].phone,
        address: "София, ул. Фредерик Жолио-Кюри 9",
        latitude: 42.671482,
        longitude: 23.350402,
        locationSource: "seed",
        category: "Ремонт на бани",
        description: "Смяна на плочки и душ зона в малка баня.",
        status: "нова",
        photos: [{ id: "seed-5-a", name: "Баня", url: "/media_files/banq.jpg", created_at: nowIso() }],
        beforePhotos: [{ id: "seed-5-a", name: "Баня", url: "/media_files/banq.jpg", created_at: nowIso() }],
        afterPhotos: [],
        appliedWorkers: [],
        assignedWorkerId: null,
        completedAt: null,
        completedByWorkerId: null,
        durationDays: null,
        created_at: nowIso(),
      },
      {
        id: 6,
        clientUserId: 103,
        clientName: CLIENTS[2].name,
        email: CLIENTS[2].email,
        phone: CLIENTS[2].phone,
        address: "София, бул. Черни връх 100",
        latitude: 42.658832,
        longitude: 23.316522,
        locationSource: "seed",
        category: "Електро инсталация",
        description: "Проверка на табло и добавяне на нов кръг за кухня.",
        status: "нова",
        photos: [{ id: "seed-6-a", name: "Табло", url: "/media_files/images.jpg", created_at: nowIso() }],
        beforePhotos: [{ id: "seed-6-a", name: "Табло", url: "/media_files/images.jpg", created_at: nowIso() }],
        afterPhotos: [],
        appliedWorkers: [],
        assignedWorkerId: null,
        completedAt: null,
        completedByWorkerId: null,
        durationDays: null,
        created_at: nowIso(),
      },
    ],
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
      if (Number(db?.mapSeedVersion || 0) < 5) {
        const migrated = normalizeMockEnforcementState(db);
        writeDb(migrated);
        return migrated;
      }
      const migrated = normalizeMockAuthState(db);
      if (migrated !== db) writeDb(migrated);
      return migrated;
    }
  } catch {
    // Invalid or outdated local mock data is replaced with a clean seed below.
  }
  const db = normalizeMockAuthState(normalizeMockEnforcementState(seedDb()));
  writeDb(db);
  return db;
}

function nextId(items = [], field = "id", fallback = 1000) {
  return Math.max(fallback, ...items.map((item) => Number(item?.[field] || 0)).filter(Number.isFinite)) + 1;
}

function normalizeMockAuthState(db) {
  let changed = false;
  const patchUser = (user, role) => {
    const verificationRequired = user.emailVerificationRequired ?? false;
    const next = {
      ...user,
      role: user.role || role,
      name: user.name || user.fullName || (role === "worker" ? "Mock Worker" : "Mock Client"),
      email: normalizeEmail(user.email),
      accountStatus: user.accountStatus || "active",
      emailVerifiedAt: verificationRequired ? user.emailVerifiedAt ?? null : user.emailVerifiedAt || nowIso(),
      emailVerificationRequired: verificationRequired,
      tokenVersion: Number(user.tokenVersion || 0),
      createdAt: user.createdAt || user.created_at || nowIso(),
      created_at: user.created_at || user.createdAt || nowIso(),
      password: user.password || "123456",
    };
    if (role === "worker") {
      next.userId = Number(user.userId || user.id);
      next.fullName = user.fullName || user.name || "Mock Worker";
      next.city = user.city || "";
      next.skills = Array.isArray(user.skills) ? user.skills : [];
      next.moderationStatus = user.moderationStatus || "approved";
      next.avatarModerationStatus = user.avatarModerationStatus || next.moderationStatus;
      next.gallery = Array.isArray(user.gallery) ? user.gallery : [];
      next.completedJobs = Array.isArray(user.completedJobs) ? user.completedJobs : [];
    }
    if (JSON.stringify(next) !== JSON.stringify(user)) changed = true;
    return next;
  };

  const nextDb = {
    ...db,
    mockEmailOutbox: Array.isArray(db.mockEmailOutbox) ? db.mockEmailOutbox : [],
    clients: (db.clients || []).map((client) => patchUser(client, "client")),
    workers: (db.workers || []).map((worker) => patchUser(worker, "worker")),
  };
  return changed || nextDb.mockEmailOutbox !== db.mockEmailOutbox ? nextDb : db;
}

function normalizeMockEnforcementState(db) {
  return {
    ...db,
    mapSeedVersion: 5,
    clients: (db.clients || []).map((client) => ({
      ...client,
      accountStatus: client.accountStatus || "active",
    })),
    workers: (db.workers || []).map((worker, index) => ({
      ...worker,
      accountStatus: worker.accountStatus || "active",
      moderationStatus: worker.moderationStatus || (index === 1 ? "pending_review" : "approved"),
      avatarModerationStatus: worker.avatarModerationStatus || worker.moderationStatus || (index === 1 ? "pending_review" : "approved"),
      gallery: (worker.gallery || []).map((image) => ({
        ...image,
        moderationStatus: image.moderationStatus || "approved",
      })),
      completedJobs: (worker.completedJobs || []).map((job) => ({
        ...job,
        moderationStatus: job.moderationStatus || "approved",
        beforePhotos: (job.beforePhotos || []).map((image) => ({ ...image, moderationStatus: image.moderationStatus || "approved" })),
        afterPhotos: (job.afterPhotos || []).map((image) => ({ ...image, moderationStatus: image.moderationStatus || "approved" })),
      })),
    })),
    requests: (db.requests || []).map((request, index) => {
      const moderationStatus = request.moderationStatus || (index === 0 ? "pending_review" : "approved");
      const legacyStatus = String(request.status || "").toLowerCase();
      const status = request.completedAt || legacyStatus.includes("завършен") ? "completed"
        : legacyStatus.includes("отказ") ? "canceled"
          : ["assigned", "worker_arrived", "in_progress", "waiting_client_confirmation", "client_confirmed", "disputed"].includes(legacyStatus) ? legacyStatus
            : request.assignedWorkerId ? "assigned" : "approved";
      const normalizeImage = (image) => ({
        ...image,
        moderationStatus: image.moderationStatus || moderationStatus,
      });
      return {
        ...request,
        status,
        statusKey: status,
        moderationStatus,
        photos: (request.photos || []).map(normalizeImage),
        beforePhotos: (request.beforePhotos || []).map(normalizeImage),
        afterPhotos: (request.afterPhotos || []).map(normalizeImage),
      };
    }),
    reviews: (db.reviews || []).map((review, index) => ({
      ...review,
      moderationStatus: review.moderationStatus || (index === 0 ? "pending_review" : "approved"),
    })),
  };
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
  if (role === "admin") return { id: id || 999, role: "admin", name: "Bricky Admin", email: "admin@bricky.dev" };
  const user = role === "worker" ? db.workers.find((w) => Number(w.userId) === id) : db.clients.find((c) => Number(c.id) === id);
  return user || { id, userId: id, role, name: role === "worker" ? "Dev Worker" : "Dev Client" };
}

function findAccount(db, role, id) {
  if (role === "client") return db.clients.find((client) => Number(client.id) === Number(id)) || null;
  if (role === "worker") return db.workers.find((worker) => Number(worker.userId) === Number(id)) || null;
  return role === "admin" ? { id: 999, role: "admin", accountStatus: "active" } : null;
}

function isActiveAccount(account) {
  return Boolean(account) && (account.accountStatus || "active") === "active";
}

function isEligibleWorker(worker) {
  return isActiveAccount(worker) && (worker.moderationStatus || "pending_review") === "approved";
}

function isApprovedRequest(request) {
  return request?.moderationStatus === "approved";
}

function setRequestStatus(request, statusKey) {
  request.statusKey = statusKey;
  request.status = statusKey;
}

function isCompletedRequest(request) {
  const status = String(request?.status || "").toLowerCase();
  return Boolean(request?.completedAt) || status === "completed" || status.includes("завършен");
}

function isCanceledRequest(request) {
  const status = String(request?.status || "").toLowerCase();
  return status === "canceled" || status === "cancelled" || status.includes("отказан");
}

function isOpenApprovedRequest(request) {
  return isApprovedRequest(request) && !isCompletedRequest(request) && !isCanceledRequest(request);
}

function publicRequest(request) {
  const approvedImages = (images) => (Array.isArray(images) ? images : [])
    .filter((image) => image.moderationStatus === "approved");
  return {
    ...request,
    photos: approvedImages(request.photos),
    beforePhotos: approvedImages(request.beforePhotos),
    afterPhotos: approvedImages(request.afterPhotos),
  };
}

function publicCompletedJob(job) {
  const approvedImages = (images) => (Array.isArray(images) ? images : [])
    .filter((image) => image.moderationStatus === "approved");
  return {
    ...job,
    beforePhotos: approvedImages(job.beforePhotos),
    afterPhotos: approvedImages(job.afterPhotos),
  };
}

function publicWorker(worker) {
  const result = publicUser(worker);
  return {
    ...result,
    avatarUrl: worker.avatarModerationStatus === "approved" ? result.avatarUrl : "",
    completedJobs: (result.completedJobs || []).map(publicCompletedJob),
  };
}

function requireActiveMockAccount(db, role, id) {
  const account = findAccount(db, role, id);
  if (!isActiveAccount(account)) return null;
  return account;
}

function requireEligibleMockWorker(db, id) {
  const worker = findAccount(db, "worker", id);
  return isEligibleWorker(worker) ? worker : null;
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

function assertActiveDevWorker(db) {
  const worker = currentWorker(db);
  if (!isActiveAccount(worker)) throw new Error("Спреният акаунт няма достъп до тази операция.");
  return worker;
}

export function saveDevWorkerProfile(data = {}) {
  const db = readDb();
  const worker = assertActiveDevWorker(db);

  Object.assign(worker, {
    fullName: data.fullName ?? worker.fullName,
    name: data.fullName ?? worker.name,
    city: data.city ?? worker.city,
    description: data.description ?? worker.description,
    experience: data.experience ?? worker.experience,
    equipment: data.equipment ?? worker.equipment,
  });
  worker.moderationStatus = "pending_review";
  worker.moderationReason = null;

  writeDb(db);
  return publicUser(worker);
}

export async function uploadDevWorkerAvatar(file) {
  const db = readDb();
  const worker = assertActiveDevWorker(db);
  if (!file) return null;

  const url = await fileToDataUrl(file);
  worker.avatarUrl = url;
  worker.avatarModerationStatus = "pending_review";
  writeDb(db);
  return publicUser(worker);
}

export async function uploadDevWorkerGallery(files = []) {
  const db = readDb();
  const worker = assertActiveDevWorker(db);

  const clean = Array.from(files).filter((file) => String(file?.type || "").startsWith("image/"));
  const images = await Promise.all(
    clean.map(async (file) => ({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      userId: worker.userId,
      name: file.name,
      url: await fileToDataUrl(file),
      moderationStatus: "pending_review",
      created_at: nowIso(),
    }))
  );

  worker.gallery = [...(Array.isArray(worker.gallery) ? worker.gallery : []), ...images];
  writeDb(db);
  return worker.gallery;
}

export function deleteDevWorkerGalleryImage(imageId) {
  const db = readDb();
  const worker = assertActiveDevWorker(db);

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

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function allMockAccounts(db) {
  return [
    ...(db.clients || []).map((client) => ({ ...client, role: "client" })),
    ...(db.workers || []).map((worker) => ({ ...worker, role: "worker" })),
  ];
}

function findMockAccountByEmail(db, email) {
  const normalized = normalizeEmail(email);
  return allMockAccounts(db).find((account) => normalizeEmail(account.email) === normalized) || null;
}

function mockJwt(role, userId) {
  return `local-dev-token-${role}-${userId}`;
}

function setMockSession(user) {
  const role = user.role === "worker" ? "worker" : "client";
  const userId = role === "worker" ? Number(user.userId || user.id) : Number(user.id);
  localStorage.setItem("token", mockJwt(role, userId));
  localStorage.setItem("role", role);
  localStorage.setItem("userId", String(userId));
  localStorage.setItem("userName", user.name || user.fullName || "Mock User");
  window.dispatchEvent(new Event("bricky-dev-identity-changed"));
  return localStorage.getItem("token");
}

function validateMockPassword(password) {
  if (!password || String(password).length < 6) return "Паролата трябва да е поне 6 символа.";
  return null;
}

function emitDevDbChanged() {
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
    window.dispatchEvent(new Event("bricky-dev-db-changed"));
  }
}

function randomMockToken() {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function ensureMockOutbox(db) {
  db.mockEmailOutbox = Array.isArray(db.mockEmailOutbox) ? db.mockEmailOutbox : [];
  return db.mockEmailOutbox;
}

function mockAccountId(account) {
  return account.role === "worker" ? Number(account.userId || account.id) : Number(account.id);
}

function findMockAccountByRoleAndId(db, role, id) {
  const wantedId = Number(id);
  if (role === "worker") return (db.workers || []).find((worker) => Number(worker.userId || worker.id) === wantedId) || null;
  return (db.clients || []).find((client) => Number(client.id) === wantedId) || null;
}

function issueMockVerificationEmail(db, account, reason = "registration") {
  const createdAt = nowIso();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const outbox = ensureMockOutbox(db);
  const email = {
    id: `email-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    type: "email_verification",
    status: "sent",
    provider: "mock",
    reason,
    userId: mockAccountId(account),
    role: account.role === "worker" ? "worker" : "client",
    email: normalizeEmail(account.email),
    token: randomMockToken(),
    verificationUrl: "",
    expiresAt,
    usedAt: null,
    createdAt,
  };
  email.verificationUrl = `/auth/verify-email?token=${encodeURIComponent(email.token)}`;
  outbox.unshift(email);
  return email;
}

function mockResendVerification(db, payload = {}) {
  const account = findMockAccountByEmail(db, payload.email);
  if (account && account.emailVerificationRequired && !account.emailVerifiedAt) {
    issueMockVerificationEmail(db, account, "resend");
    writeDb(db);
    emitDevDbChanged();
  }
  return response({
    message: "Mock среда: ако има непотвърден акаунт с този имейл, е създадена нова заявка за потвърждение.",
  });
}

function mockVerifyEmail(db, payload = {}) {
  const token = String(payload.token || "").trim();
  if (!token) return fail("Невалиден или изтекъл token за потвърждение.", 400);

  const email = ensureMockOutbox(db).find((item) => item.type === "email_verification" && item.token === token) || null;
  if (!email || email.usedAt || new Date(email.expiresAt).getTime() < Date.now()) {
    return fail("Невалиден или изтекъл token за потвърждение.", 400);
  }

  const account = findMockAccountByRoleAndId(db, email.role, email.userId);
  if (!account) return fail("Акаунтът не е намерен.", 404);

  const verifiedAt = nowIso();
  account.emailVerifiedAt = verifiedAt;
  account.emailVerificationRequired = false;
  email.usedAt = verifiedAt;
  email.status = "used";
  writeDb(db);
  emitDevDbChanged();

  return response({
    message: "Имейлът е потвърден успешно.",
    user: publicUser(account),
  });
}

function mockRegister(db, payload = {}) {
  const role = payload.role === "worker" ? "worker" : "client";
  const email = normalizeEmail(payload.email);
  if (!email) return fail("Имейлът е задължителен.", 400);
  const passwordError = validateMockPassword(payload.password);
  if (passwordError) return fail(passwordError, 400);
  if (findMockAccountByEmail(db, email)) return fail("Имейлът вече съществува.", 400);

  const createdAt = nowIso();
  if (role === "client") {
    const name = String(payload.name || "").trim();
    if (!name) return fail("Името е задължително.", 400);
    const user = {
      id: nextId(db.clients, "id", 1000),
      name,
      email,
      password: payload.password,
      role: "client",
      accountStatus: "active",
      emailVerifiedAt: null,
      emailVerificationRequired: true,
      tokenVersion: 0,
      createdAt,
      created_at: createdAt,
    };
    db.clients.push(user);
    const verificationEmail = issueMockVerificationEmail(db, user, "registration");
    writeDb(db);
    emitDevDbChanged();
    return response({
      message: "Mock регистрацията е успешна. Акаунтът чака имейл потвърждение.",
      mockEmail: { id: verificationEmail.id, email: verificationEmail.email, verificationUrl: verificationEmail.verificationUrl },
      user: publicUser(user),
    }, 201);
  }

  const fullName = String(payload.fullName || payload.name || "").trim();
  if (!fullName) return fail("Трите имена са задължителни.", 400);
  const userId = nextId(db.workers, "userId", 2000);
  const profileId = nextId(db.workers, "id", 1000);
  const worker = {
    id: profileId,
    userId,
    role: "worker",
    fullName,
    name: fullName,
    email,
    password: payload.password,
    phone: String(payload.phone || "").trim(),
    city: String(payload.city || "").trim(),
    skills: Array.isArray(payload.skills) ? payload.skills : [],
    description: "",
    experience: "",
    equipment: "",
    avatarUrl: "",
    accountStatus: "active",
    emailVerifiedAt: null,
    emailVerificationRequired: true,
    tokenVersion: 0,
    moderationStatus: "approved",
    avatarModerationStatus: "approved",
    gallery: [],
    completedJobs: [],
    createdAt,
    created_at: createdAt,
  };
  db.workers.push(worker);
  const verificationEmail = issueMockVerificationEmail(db, worker, "registration");
  writeDb(db);
  emitDevDbChanged();
  return response({
    message: "Mock регистрацията е успешна. Акаунтът чака имейл потвърждение.",
    mockEmail: { id: verificationEmail.id, email: verificationEmail.email, verificationUrl: verificationEmail.verificationUrl },
    user: publicUser(worker),
    worker: publicWorker(worker),
  }, 201);
}

function mockLogin(db, payload = {}) {
  const account = findMockAccountByEmail(db, payload.email);
  if (!account || String(account.password || "") !== String(payload.password || "")) {
    return fail("Грешен имейл или парола", 400);
  }
  if ((account.accountStatus || "active") === "suspended") {
    return fail("Акаунтът е временно спрян", 401);
  }
  if (account.emailVerificationRequired && !account.emailVerifiedAt) {
    return fail("Имейлът не е потвърден. В mock средата отвори verification линка от mock email outbox.", 400);
  }
  const token = setMockSession(account);
  return response({ token, user: publicUser(account) });
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
    moderationStatus: req.moderationStatus,
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

function publicUser(user) {
  if (!user) return null;
  const isWorker = user.role === "worker" || Boolean(user.userId);
  const accountId = isWorker ? user.userId || user.id : user.id;
  return {
    id: accountId,
    userId: user.userId || user.id,
    profileId: isWorker ? user.id : undefined,
    role: user.role,
    name: user.name || user.fullName,
    fullName: user.fullName || user.name,
    email: user.email,
    phone: user.phone,
    address: user.address,
    city: user.city,
    skills: user.skills || [],
    description: user.description,
    experience: user.experience,
    equipment: user.equipment,
    avatarUrl: user.avatarUrl || "",
    accountStatus: user.accountStatus || "active",
    moderationStatus: user.moderationStatus,
    avatarModerationStatus: user.avatarModerationStatus,
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
  const user = role === "admin"
    ? { id: Number(id) || 999, role: "admin", name: "Bricky Admin", email: "admin@bricky.dev" }
    : role === "worker" ? db.workers.find((w) => Number(w.userId) === Number(id)) : db.clients.find((c) => Number(c.id) === Number(id));
  if (!user) return null;
  if (role !== "admin" && !isActiveAccount(user)) return null;

  const userId = role === "worker" ? user.userId : user.id;
  localStorage.setItem("token", `local-dev-token-${role}-${userId}`);
  localStorage.setItem("role", role);
  localStorage.setItem("userId", String(userId));
  localStorage.setItem("userName", user.name || user.fullName || "Dev User");
  window.dispatchEvent(new Event("bricky-dev-identity-changed"));
  return publicUser(user);
}

export function resetDevDb() {
  writeDb(normalizeMockAuthState(normalizeMockEnforcementState(seedDb())));
  window.dispatchEvent(new Event("bricky-dev-identity-changed"));
  emitDevDbChanged();
}

export function getDevIdentities() {
  const db = readDb();
  return { clients: db.clients, workers: db.workers, admins: [{ id: 999, role: "admin", name: "Bricky Admin" }] };
}

export async function mockRequest(method, url, data) {
  const db = readDb();
  const path = asPath(url);
  const user = currentUser();
  const role = localStorage.getItem("role") || user.role;
  const userId = role === "worker" ? Number(user.userId || user.id) : Number(user.id);

  if (method === "post" && path === "/auth/register") return mockRegister(db, data);
  if (method === "post" && path === "/auth/login") return mockLogin(db, data);
  if (method === "post" && path === "/auth/dev-login") {
    const loginRole = data?.role === "admin" ? "admin" : data?.role === "worker" ? "worker" : "client";
    const first = loginRole === "admin" ? { id: 999, role: "admin", name: "Bricky Admin" } : loginRole === "worker" ? db.workers[0] : db.clients[0];
    if (loginRole !== "admin" && !isActiveAccount(first)) return fail("Акаунтът е временно спрян", 401);
    setDevIdentity(loginRole, loginRole === "worker" ? first.userId : first.id);
    return response({ token: localStorage.getItem("token"), user: publicUser(first) });
  }
  if (method === "post" && path === "/auth/resend-verification") {
    return mockResendVerification(db, data);
  }
  if (method === "post" && path === "/auth/verify-email") {
    return mockVerifyEmail(db, data);
  }
  if (method === "post" && path === "/auth/request-password-reset") {
    return response({ message: "Mock среда: ако има акаунт с този имейл, ще получиш инструкции." });
  }
  if (method === "post" && path === "/auth/reset-password") {
    return response({ message: "Mock среда: паролата е сменена успешно." });
  }

  if ((role === "client" || role === "worker") && !requireActiveMockAccount(db, role, userId)) {
    return fail("Акаунтът е спрян от администратор.", 401);
  }

  if (path.startsWith("/admin")) {
    if (role !== "admin") return fail("Admin only", 403);
    const params = new URL(String(url || ""), window.location.origin).searchParams;
    const wantedStatus = params.get("status") || "pending_review";
    const query = String(params.get("q") || "").toLowerCase();
    const page = Math.max(1, Number(params.get("page")) || 1);
    const limit = Math.max(1, Number(params.get("limit")) || 25);
    const normalizeStatus = (item, fallback = "approved") => item.moderationStatus || fallback;
    const pageRows = (rows) => rows
      .filter((item) => normalizeStatus(item) === wantedStatus)
      .filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query))
      .slice((page - 1) * limit, page * limit);
    const requestRows = db.requests.map((item) => ({ ...item, moderationStatus: normalizeStatus(item, "pending_review") }));
    const workerRows = db.workers.map((item) => ({ ...item, moderationStatus: normalizeStatus(item, "pending_review") }));
    const reviewRows = db.reviews.map((item) => ({ ...item, moderationStatus: normalizeStatus(item, "pending_review") }));
    const requestMediaRows = requestRows.flatMap((requestItem) => (requestItem.photos || []).map((photo, index) => ({
      ...photo, id: `${requestItem.id}-${index}`, requestId: requestItem.id, source: "request",
      moderationStatus: photo.moderationStatus || requestItem.moderationStatus,
    })));
    const requestAfterMediaRows = requestRows.flatMap((requestItem) => (requestItem.afterPhotos || []).map((photo, index) => ({
      ...photo, id: `${requestItem.id}-after-${index}`, requestId: requestItem.id, source: "request", kind: "after",
      moderationStatus: photo.moderationStatus || "pending_review",
    })));
    const galleryMediaRows = db.workers.flatMap((worker) => (worker.gallery || []).map((image) => ({
      ...image,
      source: "gallery",
      workerId: worker.id,
      userId: worker.userId,
      moderationStatus: image.moderationStatus || "pending_review",
    })));
    const avatarMediaRows = db.workers
      .filter((worker) => worker.avatarUrl)
      .map((worker) => ({
        id: worker.id,
        source: "avatar",
        workerId: worker.id,
        userId: worker.userId,
        url: worker.avatarUrl,
        name: `${worker.fullName || worker.name || "Worker"} avatar`,
        moderationStatus: worker.avatarModerationStatus || "pending_review",
      }));
    const mediaRows = [...requestMediaRows, ...requestAfterMediaRows, ...galleryMediaRows, ...avatarMediaRows];
    const userRows = [
      ...db.clients.map((item) => ({ ...item, accountStatus: item.accountStatus || "active" })),
      ...db.workers.map((item) => ({ ...item, id: item.userId || item.id, accountStatus: item.accountStatus || "active" })),
    ];
    db.adminAuditLogs = Array.isArray(db.adminAuditLogs) ? db.adminAuditLogs : [];
    const audit = (entityType, entityId, action, reason, oldValue = null, newValue = null) => {
      db.adminAuditLogs.unshift({
        id: Date.now() + db.adminAuditLogs.length, adminUserId: 999, entityType, entityId,
        action, reason: reason || null, oldValue, newValue, ipAddress: "127.0.0.1",
        created_at: new Date().toISOString(),
      });
    };

    if (method === "get" && path === "/admin/dashboard") return response({
      pendingRequests: requestRows.filter((item) => item.moderationStatus === "pending_review").length,
      pendingMedia: mediaRows.filter((item) => item.moderationStatus === "pending_review").length,
      pendingWorkers: workerRows.filter((item) => item.moderationStatus === "pending_review").length,
      pendingReviews: reviewRows.filter((item) => item.moderationStatus === "pending_review").length,
      activeRequests: requestRows.filter((item) => item.moderationStatus === "approved" && !item.completedAt).length,
      completedRequests: requestRows.filter((item) => item.moderationStatus === "approved" && item.completedAt).length,
      activeUsers: [...db.clients, ...db.workers].filter(isActiveAccount).length,
      activeWorkers: workerRows.filter(isEligibleWorker).length,
      recentActions: db.adminAuditLogs.slice(0, 10),
      systemHealth: { api: "ok", database: "mock" },
    });
    if (method === "get" && path === "/admin/requests") return response(pageRows(requestRows));
    if (method === "get" && path === "/admin/media") return response(pageRows(mediaRows));
    if (method === "get" && path === "/admin/workers") return response(pageRows(workerRows));
    if (method === "get" && path === "/admin/reviews") return response(pageRows(reviewRows));
    if (method === "get" && path === "/admin/users") return response(userRows);
    if (method === "get" && path === "/admin/audit-logs") {
      const wantedAction = params.get("action") || "";
      const rows = db.adminAuditLogs
        .filter((item) => !wantedAction || item.action === wantedAction)
        .filter((item) => !query || JSON.stringify(item).toLowerCase().includes(query));
      return response(rows.slice((page - 1) * limit, page * limit));
    }
    const requestDetail = path.match(/^\/admin\/requests\/(\d+)$/);
    if (method === "get" && requestDetail) {
      const item = requestRows.find((entry) => Number(entry.id) === Number(requestDetail[1]));
      return item ? response({ ...item, images: item.photos || [] }) : fail("Item not found", 404);
    }
    const mediaDetail = path.match(/^\/admin\/media\/(request|gallery|avatar)\/(.+)$/);
    if (method === "get" && mediaDetail) {
      const item = mediaRows.find((entry) => String(entry.id) === String(mediaDetail[2]) && entry.source === mediaDetail[1]);
      return item ? response(item) : fail("Media not found", 404);
    }
    const workerDetail = path.match(/^\/admin\/workers\/(\d+)$/);
    if (method === "get" && workerDetail) {
      const item = workerRows.find((entry) => Number(entry.id) === Number(workerDetail[1]));
      return item ? response(item) : fail("Worker not found", 404);
    }
    const reviewDetail = path.match(/^\/admin\/reviews\/(\d+)$/);
    if (method === "get" && reviewDetail) {
      const item = reviewRows.find((entry) => Number(entry.id) === Number(reviewDetail[1]));
      return item ? response(item) : fail("Review not found", 404);
    }
    const userAction = path.match(/^\/admin\/users\/(\d+)\/(activate|suspend)$/);
    if (method === "post" && userAction) {
      const id = Number(userAction[1]);
      const item = db.clients.find((entry) => Number(entry.id) === id) || db.workers.find((entry) => Number(entry.userId || entry.id) === id);
      if (!item) return fail("User not found", 404);
      const oldValue = { accountStatus: item.accountStatus || "active" };
      item.accountStatus = userAction[2] === "suspend" ? "suspended" : "active";
      audit("user", id, userAction[2], data?.reason, oldValue, { accountStatus: item.accountStatus });
      writeDb(db); return response(item, 201);
    }
    const requestEdit = path.match(/^\/admin\/requests\/(\d+)$/);
    if (method === "put" && requestEdit) {
      const item = db.requests.find((entry) => Number(entry.id) === Number(requestEdit[1]));
      if (!item) return fail("Item not found", 404);
      const oldValue = { category: item.category, categoryKey: item.categoryKey, description: item.description, address: item.address };
      ["category", "categoryKey", "description", "address"].forEach((field) => {
        if (Object.prototype.hasOwnProperty.call(data || {}, field)) item[field] = data[field];
      });
      audit("request", item.id, "edited", data?.reason, oldValue, { category: item.category, categoryKey: item.categoryKey, description: item.description, address: item.address });
      writeDb(db); return response(item);
    }
    if (method === "delete" && requestEdit) {
      const index = db.requests.findIndex((entry) => Number(entry.id) === Number(requestEdit[1]));
      if (index < 0) return fail("Item not found", 404);
      const deleted = db.requests[index];
      db.requests.splice(index, 1);
      audit("request", deleted.id, "deleted", data?.reason, deleted, null);
      writeDb(db); return response({ ok: true, id: Number(requestEdit[1]), reason: data?.reason || null });
    }
    const actionMatch = path.match(/^\/admin\/(requests|reviews)\/(\d+)\/(approved|rejected|hidden)$/);
    if (method === "post" && actionMatch) {
      const collection = actionMatch[1] === "requests" ? db.requests : db.reviews;
      const item = collection.find((entry) => Number(entry.id) === Number(actionMatch[2]));
      if (!item) return fail("Item not found", 404);
      const oldValue = { moderationStatus: item.moderationStatus || "pending_review", moderationReason: item.moderationReason || null };
      item.moderationStatus = actionMatch[3]; item.moderationReason = data?.reason || null;
      audit(actionMatch[1] === "requests" ? "request" : "review", item.id, actionMatch[3], data?.reason, oldValue, { moderationStatus: item.moderationStatus, moderationReason: item.moderationReason });
      writeDb(db); return response(item, 201);
    }
    const mediaAction = path.match(/^\/admin\/media\/(\d+)-(\d+)\/(approved|rejected|hidden)$/);
    if (method === "post" && mediaAction) {
      const requestItem = db.requests.find((entry) => Number(entry.id) === Number(mediaAction[1]));
      const photo = requestItem?.photos?.[Number(mediaAction[2])];
      if (!photo) return fail("Media not found", 404);
      const oldValue = { moderationStatus: photo.moderationStatus || "pending_review" };
      photo.moderationStatus = mediaAction[3]; photo.moderationReason = data?.reason || null;
      [requestItem.beforePhotos, requestItem.afterPhotos].forEach((collection) => {
        const linked = collection?.find((image) => String(image.id) === String(photo.id));
        if (linked) {
          linked.moderationStatus = mediaAction[3];
          linked.moderationReason = data?.reason || null;
        }
      });
      audit("request_media", Number(mediaAction[1]), mediaAction[3], data?.reason, oldValue, { moderationStatus: photo.moderationStatus });
      writeDb(db); return response(photo, 201);
    }
    const afterMediaAction = path.match(/^\/admin\/media\/(\d+)-after-(\d+)\/(approved|rejected|hidden)$/);
    if (method === "post" && afterMediaAction) {
      const requestItem = db.requests.find((entry) => Number(entry.id) === Number(afterMediaAction[1]));
      const photo = requestItem?.afterPhotos?.[Number(afterMediaAction[2])];
      if (!photo) return fail("Media not found", 404);
      const oldValue = { moderationStatus: photo.moderationStatus || "pending_review" };
      photo.moderationStatus = afterMediaAction[3];
      photo.moderationReason = data?.reason || null;
      audit("request_media", Number(afterMediaAction[1]), afterMediaAction[3], data?.reason, oldValue, { moderationStatus: photo.moderationStatus });
      writeDb(db); return response(photo, 201);
    }
    const galleryAction = path.match(/^\/admin\/media\/gallery\/(.+)\/(approved|rejected|hidden)$/);
    if (method === "post" && galleryAction) {
      const worker = db.workers.find((entry) => entry.gallery?.some((image) => String(image.id) === String(galleryAction[1])));
      const image = worker?.gallery?.find((entry) => String(entry.id) === String(galleryAction[1]));
      if (!image) return fail("Media not found", 404);
      const oldValue = { moderationStatus: image.moderationStatus || "pending_review" };
      image.moderationStatus = galleryAction[2];
      image.moderationReason = data?.reason || null;
      audit("gallery_media", image.id, galleryAction[2], data?.reason, oldValue, { moderationStatus: image.moderationStatus });
      writeDb(db); return response(image, 201);
    }
    const workerAction = path.match(/^\/admin\/workers\/(\d+)\/(profile|avatar)\/(approved|rejected|hidden)$/);
    if (method === "post" && workerAction) {
      const item = db.workers.find((entry) => Number(entry.id) === Number(workerAction[1]));
      if (!item) return fail("Worker not found", 404);
      const statusField = workerAction[2] === "avatar" ? "avatarModerationStatus" : "moderationStatus";
      const reasonField = workerAction[2] === "avatar" ? "avatarModerationReason" : "moderationReason";
      const oldValue = { moderationStatus: item[statusField] || "pending_review" };
      item[statusField] = workerAction[3]; item[reasonField] = data?.reason || null;
      audit(`worker_${workerAction[2]}`, item.id, workerAction[3], data?.reason, oldValue, { moderationStatus: item[statusField] });
      writeDb(db); return response(item, 201);
    }
  }

  if (method === "post" && path === "/auth/dev-login") {
    const loginRole = data?.role === "admin" ? "admin" : data?.role === "worker" ? "worker" : "client";
    const first = loginRole === "admin" ? { id: 999, role: "admin", name: "Bricky Admin" } : loginRole === "worker" ? db.workers[0] : db.clients[0];
    if (loginRole !== "admin" && !isActiveAccount(first)) return fail("Акаунтът е спрян от администратор.", 401);
    setDevIdentity(loginRole, loginRole === "worker" ? first.userId : first.id);
    return response({ token: localStorage.getItem("token"), user: publicUser(first) });
  }

  if (method === "get" && path === "/client/me") return role === "client" ? response(publicUser(user)) : fail("Client only", 403);
  if (method === "get" && path === "/repair-categories") return response(db.repairCategories || REPAIR_CATEGORY_OPTIONS);
  if (method === "get" && path === "/workers/me") return role === "worker" ? response(publicUser(db.workers.find((w) => Number(w.userId) === userId))) : fail("Worker only", 403);
  if (method === "get" && path === "/workers") return response(db.workers.filter(isEligibleWorker).map(publicWorker));

  const workerById = path.match(/^\/workers\/(\d+)$/);
  if (method === "get" && workerById) {
    const id = Number(workerById[1]);
    const worker = db.workers.find((w) => Number(w.userId) === id || Number(w.id) === id);
    return isEligibleWorker(worker) ? response(publicWorker(worker)) : fail("Worker not found", 404);
  }

  if (method === "get" && /^\/workers\/\d+\/gallery$/.test(path)) {
    const id = Number(path.match(/^\/workers\/(\d+)\/gallery$/)?.[1]);
    const worker = db.workers.find((w) => Number(w.userId) === id || Number(w.id) === id);
    return isEligibleWorker(worker)
      ? response((Array.isArray(worker.gallery) ? worker.gallery : []).filter((image) => image.moderationStatus === "approved"))
      : fail("Worker not found", 404);
  }
  if (method === "get" && path === "/workers/me/gallery") {
    if (role !== "worker") return fail("Worker only", 403);
    const worker = currentWorker(db);
    return response(Array.isArray(worker?.gallery) ? worker.gallery : []);
  }

  if (method === "get" && path === "/workers/me/history") {
    if (role !== "worker") return fail("Worker only", 403);
    const worker = currentWorker(db);
    const jobs = Array.isArray(worker?.completedJobs) ? worker.completedJobs : [];
    return response(sortNewest(jobs.filter((job) => job.moderationStatus === "approved").map(publicCompletedJob)));
  }

  const workerHistory = path.match(/^\/workers\/(\d+)\/history$/);
  if (method === "get" && workerHistory) {
    const id = Number(workerHistory[1]);
    const worker = db.workers.find((w) => Number(w.userId) === id || Number(w.id) === id);
    return isEligibleWorker(worker)
      ? response(sortNewest(Array.isArray(worker.completedJobs) ? worker.completedJobs.map(publicCompletedJob) : []))
      : fail("Worker not found", 404);
  }

  
  const galleryDeleteMatch = path.match(/^\/workers\/me\/gallery\/(.+)\/delete$/);
  if (method === "post" && galleryDeleteMatch) {
    if (role !== "worker") return fail("Worker only", 403);
    return response(deleteDevWorkerGalleryImage(galleryDeleteMatch[1]));
  }
  if (method === "post" && path === "/requests/draft") return role === "client" ? response(draftRequest(data)) : fail("Client only", 403);

  if (method === "get" && path === "/requests/client") {
    if (role !== "client") return fail("Client only", 403);
    return response(sortNewest(db.requests.filter((r) => Number(r.clientUserId) === userId)));
  }

  if (method === "get" && path === "/requests/map") {
    if (role !== "worker") return fail("Worker only", 403);
    return response(sortNewest(db.requests.filter(isOpenApprovedRequest).map(publicRequest)));
  }

  if (method === "get" && path === "/requests/worker") {
    if (role !== "worker") return fail("Worker only", 403);
    const items = db.requests.filter((r) => {
      const assigned = Number(r.assignedWorkerId || 0);
      const closed = ["завършена", "отказана"].includes(String(r.status || "").toLowerCase());
      return isOpenApprovedRequest(r) && (!assigned || assigned === userId);
    });
    return response(sortNewest(items.map(publicRequest)));
  }

  if (method === "get" && path === "/requests/worker/completed") {
    if (role !== "worker") return fail("Worker only", 403);
    return response(sortNewest(db.requests.filter((r) =>
      Number(r.assignedWorkerId) === userId && isApprovedRequest(r) && isCompletedRequest(r)
    ).map(publicRequest)));
  }

  if (method === "post" && path === "/requests") {
    if (role !== "client") return fail("Client only", 400);
    const client = db.clients.find((c) => Number(c.id) === userId) || user;
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
      status: "approved",
      statusKey: "approved",
      photos: normalizePhotos(data.photos).map((photo) => ({ ...photo, moderationStatus: "pending_review" })),
      beforePhotos: normalizePhotos(data.photos).map((photo) => ({ ...photo, moderationStatus: "pending_review" })),
      afterPhotos: [],
      appliedWorkers: [],
      assignedWorkerId: null,
      completedAt: null,
      completedByWorkerId: null,
      durationDays: null,
      moderationStatus: "pending_review",
      moderationReason: null,
      created_at: nowIso(),
    };
    db.requests.push(req);
    writeDb(db);
    return response(req, 201);
  }

  const resubmitMatch = path.match(/^\/requests\/(\d+)\/resubmit$/);
  if (method === "put" && resubmitMatch) {
    if (role !== "client") return fail("Client only", 400);
    const req = db.requests.find((item) => Number(item.id) === Number(resubmitMatch[1]));
    if (!req) return fail("Request not found", 404);
    if (Number(req.clientUserId) !== userId) return fail("Not your request", 403);
    if (!["rejected", "hidden"].includes(req.moderationStatus)) return fail("Request cannot be resubmitted", 400);
    if (Object.prototype.hasOwnProperty.call(data || {}, "description")) req.description = data.description;
    if (Object.prototype.hasOwnProperty.call(data || {}, "address")) req.address = data.address;
    req.moderationStatus = "pending_review";
    req.moderationReason = null;
    writeDb(db);
    return response(req);
  }

  const applyMatch = path.match(/^\/requests\/(\d+)\/apply$/);
  if (method === "post" && applyMatch) {
    if (role !== "worker") return fail("Worker only", 400);
    if (!requireEligibleMockWorker(db, userId)) return fail("Worker is not available", 403);
    const req = db.requests.find((r) => Number(r.id) === Number(applyMatch[1]));
    if (!req) return fail("Request not found", 404);
    if (!isOpenApprovedRequest(req)) return fail("Request is not approved or is closed", 403);
    if (req.assignedWorkerId) return fail("Request already has assigned worker", 400);
    req.appliedWorkers = Array.from(new Set([...(req.appliedWorkers || []), userId]));
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
    if (!isOpenApprovedRequest(req)) return fail("Request is not approved or is closed", 403);
    if (req.assignedWorkerId) return fail("Request already has assigned worker", 400);
    if (!requireEligibleMockWorker(db, workerUserId)) return fail("Worker is not available", 403);
    if (!(req.appliedWorkers || []).map(Number).includes(workerUserId)) return fail("This worker has not applied to this request", 400);
    req.assignedWorkerId = workerUserId;
    setRequestStatus(req, "assigned");
    req.workerArrivedAt = null;
    req.workStartedAt = null;
    req.workReadyAt = null;
    req.clientConfirmedAt = null;
    req.disputedAt = null;
    req.disputeReason = null;
    writeDb(db);
    return response(req);
  }

  const lifecycleMatch = path.match(/^\/requests\/(\d+)\/(arrive|start|ready|confirm|dispute)$/);
  if (method === "post" && lifecycleMatch) {
    const req = db.requests.find((r) => Number(r.id) === Number(lifecycleMatch[1]));
    if (!req) return fail("Request not found", 404);
    if (!isApprovedRequest(req)) return fail("Request is not approved", 403);
    const action = lifecycleMatch[2];
    const workerActions = { arrive: ["assigned", "worker_arrived"], start: ["worker_arrived", "in_progress"], ready: ["in_progress", "waiting_client_confirmation"] };
    if (workerActions[action]) {
      if (role !== "worker" || !requireEligibleMockWorker(db, userId)) return fail("Worker only", 403);
      if (Number(req.assignedWorkerId) !== userId) return fail("Not your job", 403);
      const [expected, next] = workerActions[action];
      if (req.status !== expected) return fail(`Invalid transition from ${req.status}`, 400);
      if (action === "ready") {
        const photos = normalizePhotos(data?.afterPhotos).map((photo) => ({ ...photo, moderationStatus: "pending_review" }));
        if (photos.length) req.afterPhotos = [...(req.afterPhotos || []), ...photos];
        if (!(req.afterPhotos || []).length) return fail("At least one completion photo is required", 400);
        req.workReadyAt = nowIso();
      }
      if (action === "arrive") req.workerArrivedAt = nowIso();
      if (action === "start") req.workStartedAt = nowIso();
      setRequestStatus(req, next);
    } else {
      if (role !== "client" || Number(req.clientUserId) !== userId) return fail("Not your request", 403);
      if (req.status !== "waiting_client_confirmation") return fail(`Invalid transition from ${req.status}`, 400);
      if (action === "confirm") {
        setRequestStatus(req, "client_confirmed");
        req.clientConfirmedAt = nowIso();
      } else {
        const reason = String(data?.reason || "").trim();
        if (reason.length < 5) return fail("Dispute reason is required", 400);
        setRequestStatus(req, "disputed");
        req.disputedAt = nowIso();
        req.disputeReason = reason;
      }
    }
    writeDb(db);
    return response(req);
  }

  const completeMatch = path.match(/^\/requests\/(\d+)\/complete$/);
  if (method === "post" && completeMatch) {
    if (role !== "worker") return fail("Worker only", 400);
    if (!requireEligibleMockWorker(db, userId)) return fail("Worker is not available", 403);
    const req = db.requests.find((r) => Number(r.id) === Number(completeMatch[1]));
    if (!req) return fail("Request not found", 404);
    if (!isApprovedRequest(req)) return fail("Request is not approved", 403);
    if (Number(req.assignedWorkerId) !== userId) return fail("Not your job", 403);
    if (req.status !== "client_confirmed") return fail(`Invalid transition from ${req.status}`, 400);

    const completedAt = nowIso();
    setRequestStatus(req, "completed");
    req.completedAt = completedAt;
    req.completedByWorkerId = userId;
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
    if (role !== "client") return fail("Client only", 403);
    return response(db.reviews.filter((r) => Number(r.clientUserId) === userId));
  }

  const workerReviews = path.match(/^\/reviews\/worker\/(\d+)$/);
  if (method === "get" && workerReviews) {
    const wid = Number(workerReviews[1]);
    if (!requireEligibleMockWorker(db, wid)) return fail("Worker not found", 404);
    const items = db.reviews.filter((r) => Number(r.workerUserId) === wid && r.moderationStatus === "approved");
    const average = items.length ? items.reduce((sum, r) => sum + Number(r.rating || 0), 0) / items.length : 0;
    return response({ total: items.length, average, items });
  }

  if (method === "post" && path === "/reviews") {
    if (role !== "client") return fail("Client only", 400);
    const requestId = Number(data?.requestId);
    const req = db.requests.find((r) => Number(r.id) === requestId);
    if (!req) return fail("Request not found", 404);
    if (Number(req.clientUserId) !== userId) return fail("Not your request", 403);
    if (!isApprovedRequest(req) || !isCompletedRequest(req)) return fail("Request is not approved and completed", 400);
    if (!requireEligibleMockWorker(db, Number(req.assignedWorkerId))) return fail("Worker is not available", 403);
    const exists = db.reviews.find((r) => Number(r.requestId) === requestId);
    if (exists) return fail("Already reviewed", 400);
    const review = {
      id: db.nextReviewId++,
      requestId,
      clientUserId: userId,
      workerUserId: Number(req.assignedWorkerId),
      rating: Number(data?.rating) || 5,
      comment: data?.comment || "",
      moderationStatus: "pending_review",
      created_at: nowIso(),
    };
    db.reviews.push(review);
    writeDb(db);
    return response(review, 201);
  }

  return fail(`Dev mock endpoint not implemented: ${method.toUpperCase()} ${path}`, 404);
}
