const storage = new Map();

globalThis.localStorage = {
  getItem(key) {
    return storage.has(key) ? storage.get(key) : null;
  },
  setItem(key, value) {
    storage.set(key, String(value));
  },
  removeItem(key) {
    storage.delete(key);
  },
};

globalThis.window = {
  dispatchEvent() {},
  location: { origin: "http://127.0.0.1:5173" },
};
globalThis.Event = class Event {
  constructor(type) {
    this.type = type;
  }
};

const {
  mockRequest,
  resetDevDb,
  saveDevWorkerProfile,
  setDevIdentity,
} = await import("../src/services/devMockApi.js");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

resetDevDb();

assert(setDevIdentity("client", 101), "Active client should be selectable");
const created = await mockRequest("post", "/requests", {
  category: "ВиК ремонти",
  description: "Mock moderation contract request",
  address: "София, тестов адрес 1",
});
assert(created.data.moderationStatus === "pending_review", "New request must enter pending review");

assert(setDevIdentity("worker", 201), "Active worker should be selectable");
let workerFeed = await mockRequest("get", "/requests/worker");
assert(!workerFeed.data.some((request) => request.id === created.data.id), "Pending request leaked into worker feed");

assert(setDevIdentity("admin", 999), "Admin should be selectable");
await mockRequest("post", `/admin/requests/${created.data.id}/approved`, {});

assert(setDevIdentity("worker", 201), "Worker should remain active after request approval");
workerFeed = await mockRequest("get", "/requests/worker");
assert(workerFeed.data.some((request) => request.id === created.data.id), "Approved request is missing from worker feed");

assert(setDevIdentity("admin", 999), "Admin should be selectable for rejection");
await mockRequest("post", `/admin/requests/${created.data.id}/rejected`, { reason: "Contract rejection" });

assert(setDevIdentity("worker", 201), "Worker should remain active after request rejection");
workerFeed = await mockRequest("get", "/requests/worker");
assert(!workerFeed.data.some((request) => request.id === created.data.id), "Rejected request leaked into worker feed");

assert(setDevIdentity("admin", 999), "Admin should be selectable for suspension");
await mockRequest("post", "/admin/users/201/suspend", { reason: "Contract suspension" });
assert(setDevIdentity("worker", 201) === null, "Suspended worker received a mock session");

const publicWorkersWhileSuspended = await mockRequest("get", "/workers");
assert(!publicWorkersWhileSuspended.data.some((worker) => worker.userId === 201), "Suspended worker remained public");

localStorage.setItem("token", "local-dev-token-worker-201");
localStorage.setItem("role", "worker");
localStorage.setItem("userId", "201");
let staleSessionBlocked = false;
try {
  await mockRequest("get", "/workers/me");
} catch (error) {
  staleSessionBlocked = error?.response?.status === 401;
}
assert(staleSessionBlocked, "Existing mock worker session remained active after suspension");

let directProfileEditBlocked = false;
try {
  saveDevWorkerProfile({ city: "Blocked city update" });
} catch {
  directProfileEditBlocked = true;
}
assert(directProfileEditBlocked, "Suspended worker changed the profile through a direct mock helper");

assert(setDevIdentity("admin", 999), "Admin should be selectable for reactivation");
await mockRequest("post", "/admin/users/201/activate", { reason: "Contract reactivation" });
assert(setDevIdentity("worker", 201), "Reactivated worker did not regain access");

const mediaDb = JSON.parse(localStorage.getItem("bricky.dev.db"));
const mediaWorker = mediaDb.workers.find((worker) => worker.userId === 201);
mediaWorker.avatarUrl = "data:image/png;base64,mock-avatar";
mediaWorker.avatarModerationStatus = "pending_review";
mediaWorker.gallery.push({
  id: "mock-gallery-pending",
  userId: 201,
  name: "Pending gallery image",
  url: "data:image/png;base64,mock-gallery",
  moderationStatus: "pending_review",
  created_at: new Date().toISOString(),
});
localStorage.setItem("bricky.dev.db", JSON.stringify(mediaDb));

assert(setDevIdentity("admin", 999), "Admin should be selectable for media verification");
const pendingMedia = await mockRequest("get", "/admin/media?status=pending_review&page=1&limit=100");
assert(pendingMedia.data.some((item) => item.source === "gallery" && item.id === "mock-gallery-pending"), "Pending gallery image is missing from admin media queue");
assert(pendingMedia.data.some((item) => item.source === "avatar" && item.workerId === mediaWorker.id), "Pending avatar is missing from admin media queue");

console.log("Mock moderation verified: publication, suspension, and reactivation gates pass.");
