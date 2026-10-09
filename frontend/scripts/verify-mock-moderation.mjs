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

async function expectStatus(promise, status, message) {
  try {
    await promise;
  } catch (error) {
    assert(error?.response?.status === status, message);
    return;
  }
  throw new Error(message);
}

resetDevDb();

assert(setDevIdentity("client", 101), "Active client should be selectable");
const created = await mockRequest("post", "/requests", {
  category: "ВиК ремонти",
  description: "Mock moderation contract request",
  photos: [{ url: "/uploads/mock-pending-request.jpg" }],
  address: "София, тестов адрес 1",
});
assert(created.data.statusKey === "pending_admin", "New request must enter pending review");
await expectStatus(mockRequest("get", "/requests/map"), 403, "Client gained access to the worker request map");

assert(setDevIdentity("worker", 201), "Active worker should be selectable");
let workerFeed = await mockRequest("get", "/requests/worker");
assert(!workerFeed.data.some((request) => request.id === created.data.id), "Pending request leaked into worker feed");

assert(setDevIdentity("super_admin", 1), "Admin should be selectable");
await expectStatus(
  mockRequest("post", `/admin/requests/${created.data.id}/status`, { status: "published" }),
  400,
  "Request was published with an unresolved photo",
);
const pendingRequestMedia = (await mockRequest("get", "/admin/media")).data.find(
  (media) => Number(media.requestId) === Number(created.data.id) && media.kind === "request_before",
);
assert(pendingRequestMedia, "Pending request photo is missing from admin media");
await mockRequest("post", `/admin/media/${pendingRequestMedia.id}/moderation`, {
  moderationStatus: "rejected",
});
await mockRequest("post", `/admin/requests/${created.data.id}/status`, { status: "published" });

assert(setDevIdentity("worker", 201), "Worker should remain active after request approval");
workerFeed = await mockRequest("get", "/requests/worker");
const publishedRequest = workerFeed.data.find((request) => request.id === created.data.id);
assert(publishedRequest, "Approved request is missing from worker feed");
assert(publishedRequest.beforePhotos.length === 0, "Rejected request photo leaked into worker feed");

assert(setDevIdentity("super_admin", 1), "Admin should be selectable for rejection");
await mockRequest("post", `/admin/requests/${created.data.id}/status`, {
  status: "archived",
  reason: "Contract rejection",
});

assert(setDevIdentity("worker", 201), "Worker should remain active after request rejection");
workerFeed = await mockRequest("get", "/requests/worker");
assert(!workerFeed.data.some((request) => request.id === created.data.id), "Rejected request leaked into worker feed");

assert(setDevIdentity("super_admin", 1), "Admin should be selectable for suspension");
await mockRequest("post", "/admin/users/201/status", {
  status: "suspended",
  reason: "Contract suspension",
});
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

assert(setDevIdentity("super_admin", 1), "Admin should be selectable for reactivation");
await mockRequest("post", "/admin/users/201/status", {
  status: "active",
  reason: "Contract reactivation",
});
assert(setDevIdentity("worker", 201), "Reactivated worker did not regain access");

const publicWorkerBeforeUpload = await mockRequest("get", "/workers/201");
const mediaDb = JSON.parse(localStorage.getItem("bricky.dev.db"));
const nextMediaId = Math.max(0, ...(mediaDb.media || []).map((item) => Number(item.id) || 0)) + 1;
mediaDb.media.push(
  {
    id: nextMediaId,
    kind: "worker_avatar",
    ownerUserId: 201,
    workerUserId: 201,
    publicUrl: "data:image/png;base64,pending-avatar",
    storageKey: "pending-avatar",
    moderationStatus: "pending",
    createdAt: new Date().toISOString(),
  },
  {
    id: nextMediaId + 1,
    kind: "worker_gallery",
    ownerUserId: 201,
    workerUserId: 201,
    publicUrl: "data:image/png;base64,pending-gallery",
    storageKey: "pending-gallery",
    moderationStatus: "pending",
    createdAt: new Date().toISOString(),
  },
);
localStorage.setItem("bricky.dev.db", JSON.stringify(mediaDb));

assert(setDevIdentity("super_admin", 1), "Admin should be selectable for media verification");
const mediaQueue = await mockRequest("get", "/admin/media");
assert(mediaQueue.data.some((item) => item.id === nextMediaId), "Pending avatar is missing from admin media queue");
assert(mediaQueue.data.some((item) => item.id === nextMediaId + 1), "Pending gallery image is missing from admin media queue");

const publicWorkerWhilePending = await mockRequest("get", "/workers/201");
assert(
  publicWorkerWhilePending.data.avatarUrl === publicWorkerBeforeUpload.data.avatarUrl,
  "Pending avatar replaced the approved public avatar",
);
const publicGalleryWhilePending = await mockRequest("get", "/workers/201/gallery");
assert(
  !publicGalleryWhilePending.data.some((item) => item.id === nextMediaId + 1),
  "Pending gallery image leaked into the public profile",
);

await mockRequest("post", `/admin/media/${nextMediaId}/moderation`, {
  moderationStatus: "approved",
});
await mockRequest("post", `/admin/media/${nextMediaId + 1}/moderation`, {
  moderationStatus: "rejected",
});

const publicWorkerAfterApproval = await mockRequest("get", "/workers/201");
assert(
  publicWorkerAfterApproval.data.avatarUrl === "data:image/png;base64,pending-avatar",
  "Approved avatar did not replace the previous public avatar",
);
const publicGalleryAfterRejection = await mockRequest("get", "/workers/201/gallery");
assert(
  !publicGalleryAfterRejection.data.some((item) => item.id === nextMediaId + 1),
  "Rejected gallery image leaked into the public profile",
);

console.log("Mock moderation verified: publication, suspension, and reactivation gates pass.");
