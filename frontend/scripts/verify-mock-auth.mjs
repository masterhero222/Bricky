import assert from 'node:assert/strict';

class MemoryStorage {
  constructor() {
    this.map = new Map();
  }

  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }

  setItem(key, value) {
    this.map.set(key, String(value));
  }

  removeItem(key) {
    this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }
}

globalThis.localStorage = new MemoryStorage();
globalThis.Event = class Event {
  constructor(type) {
    this.type = type;
  }
};
globalThis.window = {
  location: { origin: 'http://localhost:5173' },
  dispatchEvent() {},
};

const { mockRequest, resetDevDb } = await import('../src/services/devMockApi.js');

const STORAGE_KEY = 'bricky.dev.db';

async function expectReject(promise, status, text) {
  try {
    await promise;
  } catch (error) {
    assert.equal(error.response?.status, status);
    assert.match(String(error.response?.data?.message || error.message), text);
    return error;
  }
  assert.fail(`Expected request to reject with ${status}`);
}

function readDb() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY));
}

function writeDb(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

resetDevDb();

const clientEmail = 'mock.client@example.com';
const workerEmail = 'mock.worker@example.com';

const clientRegister = await mockRequest('post', '/auth/register', {
  role: 'client',
  name: 'Mock Client',
  email: clientEmail,
  password: '123456',
});

assert.equal(clientRegister.status, 201);
assert.equal(clientRegister.data.user.role, 'client');
assert.equal(clientRegister.data.user.email, clientEmail);

let db = readDb();
const client = db.clients.find((item) => item.email === clientEmail);
assert.ok(client, 'client should be stored');
assert.equal(client.accountStatus, 'active');
assert.ok(client.emailVerifiedAt, 'mock client should be auto verified');
assert.equal(client.emailVerificationRequired, false);
assert.equal(client.tokenVersion, 0);
assert.ok(client.createdAt);

const workerRegister = await mockRequest('post', '/auth/register', {
  role: 'worker',
  fullName: 'Mock Worker',
  email: workerEmail,
  password: '123456',
  phone: '0899000111',
  city: 'София',
  skills: ['ВиК ремонти'],
});

assert.equal(workerRegister.status, 201);
assert.equal(workerRegister.data.user.role, 'worker');
assert.equal(workerRegister.data.user.email, workerEmail);
assert.ok(workerRegister.data.worker, 'worker profile should be returned');

db = readDb();
const worker = db.workers.find((item) => item.email === workerEmail);
assert.ok(worker, 'worker profile should be stored');
assert.ok(worker.userId, 'worker profile should link to account userId');
assert.equal(worker.accountStatus, 'active');
assert.ok(worker.emailVerifiedAt, 'mock worker should be auto verified');
assert.equal(worker.emailVerificationRequired, false);
assert.equal(worker.tokenVersion, 0);
assert.ok(worker.createdAt);

const clientLogin = await mockRequest('post', '/auth/login', {
  email: clientEmail,
  password: '123456',
});
assert.equal(clientLogin.data.user.role, 'client');
assert.equal(localStorage.getItem('role'), 'client');

const workerLogin = await mockRequest('post', '/auth/login', {
  email: workerEmail,
  password: '123456',
});
assert.equal(workerLogin.data.user.role, 'worker');
assert.equal(workerLogin.data.user.id, worker.userId);
assert.equal(localStorage.getItem('role'), 'worker');

await expectReject(
  mockRequest('post', '/auth/register', {
    role: 'client',
    name: 'Duplicate Client',
    email: clientEmail.toUpperCase(),
    password: '123456',
  }),
  400,
  /съществува/i,
);

db = readDb();
const suspended = db.clients.find((item) => item.email === clientEmail);
suspended.accountStatus = 'suspended';
writeDb(db);

await expectReject(
  mockRequest('post', '/auth/login', {
    email: clientEmail,
    password: '123456',
  }),
  401,
  /спрян/i,
);

db = readDb();
const unverified = db.clients.find((item) => item.email === clientEmail);
unverified.accountStatus = 'active';
unverified.emailVerifiedAt = null;
unverified.emailVerificationRequired = true;
writeDb(db);

await expectReject(
  mockRequest('post', '/auth/login', {
    email: clientEmail,
    password: '123456',
  }),
  400,
  /потвърден/i,
);

console.log('Mock auth registration/login regression passed.');
