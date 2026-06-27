import { REPAIR_CATEGORY_OPTIONS, REPAIR_CATEGORY_FLOW, getRepairCategoryByLabel } from "../constants/repairCatalog";

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
  return {
    mapSeedVersion: 4,
    nextRequestId: 7,
    nextReviewId: 1,
    repairCategories: REPAIR_CATEGORY_OPTIONS.map((category) => ({
      ...category,
      flow: REPAIR_CATEGORY_FLOW[category.key] || REPAIR_CATEGORY_FLOW.other,
    })),
    clients: CLIENTS,
    workers: WORKERS,
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
          { id: "seed-1-a", name: "Проблем под мивка", url: "/media_files/banq.jpg", created_at: nowIso() },
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
  const user = role === "worker" ? db.workers.find((w) => Number(w.userId) === id) : db.clients.find((c) => Number(c.id) === id);
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

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id || user.userId,
    userId: user.userId || user.id,
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
  const user = role === "worker" ? db.workers.find((w) => Number(w.userId) === Number(id)) : db.clients.find((c) => Number(c.id) === Number(id));
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
  return { clients: db.clients, workers: db.workers };
}

export async function mockRequest(method, url, data) {
  const db = readDb();
  const path = asPath(url);
  const user = currentUser();
  const role = localStorage.getItem("role") || user.role;
  const userId = role === "worker" ? Number(user.userId || user.id) : Number(user.id);

  if (method === "post" && path === "/auth/dev-login") {
    const loginRole = data?.role === "worker" ? "worker" : "client";
    const first = loginRole === "worker" ? db.workers[0] : db.clients[0];
    setDevIdentity(loginRole, loginRole === "worker" ? first.userId : first.id);
    return response({ token: localStorage.getItem("token"), user: publicUser(first) });
  }

  if (method === "get" && path === "/client/me") return response(publicUser(user));
  if (method === "get" && path === "/repair-categories") return response(db.repairCategories || REPAIR_CATEGORY_OPTIONS);
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
    const items = db.requests.filter((r) => {
      const assigned = Number(r.assignedWorkerId || 0);
      const closed = ["завършена", "отказана"].includes(String(r.status || "").toLowerCase());
      return !closed && (!assigned || assigned === userId);
    });
    return response(sortNewest(items));
  }

  if (method === "get" && path === "/requests/worker/completed") {
    return response(sortNewest(db.requests.filter((r) => Number(r.assignedWorkerId) === userId && r.status === "завършена")));
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
      status: "нова",
      photos: normalizePhotos(data.photos),
      beforePhotos: normalizePhotos(data.photos),
      afterPhotos: [],
      appliedWorkers: [],
      assignedWorkerId: null,
      completedAt: null,
      completedByWorkerId: null,
      durationDays: null,
      created_at: nowIso(),
    };
    db.requests.push(req);
    writeDb(db);
    return response(req, 201);
  }

  const applyMatch = path.match(/^\/requests\/(\d+)\/apply$/);
  if (method === "post" && applyMatch) {
    if (role !== "worker") return fail("Worker only", 400);
    const req = db.requests.find((r) => Number(r.id) === Number(applyMatch[1]));
    if (!req) return fail("Request not found", 404);
    if (req.assignedWorkerId) return fail("Request already has assigned worker", 400);
    req.appliedWorkers = Array.from(new Set([...(req.appliedWorkers || []), userId]));
    req.status = "кандидатствана";
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
    if (!(req.appliedWorkers || []).map(Number).includes(workerUserId)) return fail("This worker has not applied to this request", 400);
    req.assignedWorkerId = workerUserId;
    req.status = "в процес";
    writeDb(db);
    return response(req);
  }

  const completeMatch = path.match(/^\/requests\/(\d+)\/complete$/);
  if (method === "post" && completeMatch) {
    if (role !== "worker") return fail("Worker only", 400);
    const req = db.requests.find((r) => Number(r.id) === Number(completeMatch[1]));
    if (!req) return fail("Request not found", 404);
    if (Number(req.assignedWorkerId) !== userId) return fail("Not your job", 403);

    const completedAt = nowIso();
    req.status = "завършена";
    req.completedAt = completedAt;
    req.completedByWorkerId = userId;
    req.afterPhotos = normalizePhotos(data?.afterPhotos);
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
    if (req.status !== "завършена") return fail("Request is not completed", 400);
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
    writeDb(db);
    return response(review, 201);
  }

  return fail(`Dev mock endpoint not implemented: ${method.toUpperCase()} ${path}`, 404);
}
