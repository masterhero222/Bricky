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

const { createDevNewsUnsubscribeEmail, mockRequest, resetDevDb } = await import('../src/services/devMockApi.js');

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

function latestVerificationEmail(email) {
  const db = readDb();
  return (db.mockEmailOutbox || []).find((item) => item.type === 'email_verification' && item.email === email);
}

function latestPasswordResetEmail(email) {
  const db = readDb();
  return (db.mockEmailOutbox || []).find((item) => item.type === 'password_reset' && item.email === email);
}

function latestNewsUnsubscribeEmail(email) {
  const db = readDb();
  return (db.mockEmailOutbox || []).find((item) => item.type === 'news_unsubscribe' && item.email === email);
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
assert.equal(client.emailVerifiedAt, null);
assert.equal(client.emailVerificationRequired, true);
assert.equal(client.tokenVersion, 0);
assert.ok(client.createdAt);
assert.ok(latestVerificationEmail(clientEmail)?.token, 'client verification email should be stored in mock outbox');
assert.match(latestVerificationEmail(clientEmail)?.code || '', /^\d{6}$/, 'client verification code should be stored in mock outbox');

await expectReject(
  mockRequest('post', '/auth/login', {
    email: clientEmail,
    password: '123456',
  }),
  400,
  /потвърден/i,
);

const beforeResendCount = (readDb().mockEmailOutbox || []).filter((item) => item.email === clientEmail).length;
const resend = await mockRequest('post', '/auth/resend-verification', { email: clientEmail });
assert.match(resend.data.message, /потвърждение/i);
const afterResendCount = (readDb().mockEmailOutbox || []).filter((item) => item.email === clientEmail).length;
assert.equal(afterResendCount, beforeResendCount + 1, 'resend should create another mock verification email');

const clientCode = latestVerificationEmail(clientEmail).code;
const clientVerify = await mockRequest('post', '/auth/verify-email-code', { email: clientEmail, code: clientCode });
assert.equal(clientVerify.data.user.email, clientEmail);

await expectReject(
  mockRequest('post', '/auth/verify-email-code', { email: clientEmail, code: clientCode }),
  400,
  /код/i,
);

db = readDb();
const verifiedClient = db.clients.find((item) => item.email === clientEmail);
assert.ok(verifiedClient.emailVerifiedAt, 'client should be verified after token confirmation');
assert.equal(verifiedClient.emailVerificationRequired, false);

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
assert.equal(worker.emailVerifiedAt, null);
assert.equal(worker.emailVerificationRequired, true);
assert.equal(worker.tokenVersion, 0);
assert.ok(worker.createdAt);
assert.ok(latestVerificationEmail(workerEmail)?.token, 'worker verification email should be stored in mock outbox');
assert.match(latestVerificationEmail(workerEmail)?.code || '', /^\d{6}$/, 'worker verification code should be stored in mock outbox');

await expectReject(
  mockRequest('post', '/auth/login', {
    email: workerEmail,
    password: '123456',
  }),
  400,
  /потвърден/i,
);

const workerToken = latestVerificationEmail(workerEmail).token;
const workerVerify = await mockRequest('post', '/auth/verify-email', { token: workerToken });
assert.equal(workerVerify.data.user.email, workerEmail);

const clientLogin = await mockRequest('post', '/auth/login', {
  email: clientEmail,
  password: '123456',
});
assert.equal(clientLogin.data.user.role, 'client');
assert.equal(localStorage.getItem('role'), 'client');

const resetRequest = await mockRequest('post', '/auth/request-password-reset', { email: clientEmail });
assert.match(resetRequest.data.message, /паролата/i);
const resetEmail = latestPasswordResetEmail(clientEmail);
assert.ok(resetEmail?.token, 'password reset email should be stored in mock outbox');

await expectReject(
  mockRequest('post', '/auth/reset-password', {
    token: resetEmail.token,
    password: '123',
  }),
  400,
  /6/i,
);

const resetPassword = await mockRequest('post', '/auth/reset-password', {
  token: resetEmail.token,
  password: 'newpass123',
});
assert.match(resetPassword.data.message, /сменена/i);

await expectReject(
  mockRequest('post', '/auth/login', {
    email: clientEmail,
    password: '123456',
  }),
  400,
  /Грешен/i,
);

const clientLoginAfterReset = await mockRequest('post', '/auth/login', {
  email: clientEmail,
  password: 'newpass123',
});
assert.equal(clientLoginAfterReset.data.user.role, 'client');

const initialNewsPreferences = await mockRequest('get', '/auth/me/news-preferences');
assert.equal(initialNewsPreferences.data.newsOptIn, true);

const disabledNewsPreferences = await mockRequest('put', '/auth/me/news-preferences', {
  newsOptIn: false,
  source: 'mock_test',
});
assert.equal(disabledNewsPreferences.data.preferences.newsOptIn, false);

const enabledNewsPreferences = await mockRequest('put', '/auth/me/news-preferences', {
  newsOptIn: true,
  source: 'mock_test',
});
assert.equal(enabledNewsPreferences.data.preferences.newsOptIn, true);

const unsubscribeEmail = createDevNewsUnsubscribeEmail();
assert.ok(unsubscribeEmail?.token, 'news unsubscribe email should be stored in mock outbox');
assert.equal(latestNewsUnsubscribeEmail(clientEmail).token, unsubscribeEmail.token);

const unsubscribe = await mockRequest('post', '/auth/news-unsubscribe', { token: unsubscribeEmail.token });
assert.match(unsubscribe.data.message, /отпис/i);
assert.equal(readDb().clients.find((item) => item.email === clientEmail).newsOptIn, false);

await expectReject(
  mockRequest('post', '/auth/news-unsubscribe', { token: unsubscribeEmail.token }),
  400,
  /token/i,
);

await expectReject(
  mockRequest('post', '/auth/reset-password', {
    token: resetEmail.token,
    password: 'another123',
  }),
  400,
  /token/i,
);

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
    password: 'newpass123',
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
    password: 'newpass123',
  }),
  400,
  /потвърден/i,
);

console.log('Mock auth registration/login regression passed.');
