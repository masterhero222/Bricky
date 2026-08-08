import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import mysql from 'mysql2/promise';

const apiBase = String(
  process.env.SPRINT3_API_URL || 'http://127.0.0.1:3000',
).replace(/\/+$/, '');
const database = process.env.DB_NAME || 'bricky_sprint3_runner';

if (!/(test|rehears|sprint3|smoke)/i.test(database)) {
  throw new Error(
    `Refusing to mutate database "${database}". Use a test, rehearsal, sprint3 or smoke database.`,
  );
}

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 33307),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database,
};

const runId = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
const password = 'Sprint3!Pass';
const credentials = {
  admin: {
    email: `sprint3-admin-${runId}@bricky.local`,
    password,
  },
  client: {
    email: `sprint3-client-${runId}@bricky.local`,
    password,
  },
  worker: {
    email: `sprint3-worker-${runId}@bricky.local`,
    password,
  },
  restrictedWorker: {
    email: `sprint3-restricted-${runId}@bricky.local`,
    password,
  },
};

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function authHeaders(token) {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const privateWorkerFieldPattern =
  /^(email|phone|phonePrivate|password|passwordHash|password_hash|accessToken|refreshToken)$/i;

function assertNoPrivateWorkerFields(value, location = 'workerResponse') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoPrivateWorkerFields(entry, `${location}[${index}]`),
    );
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, nestedValue] of Object.entries(value)) {
    assert.equal(
      privateWorkerFieldPattern.test(key),
      false,
      `Private field ${location}.${key} is public`,
    );
    assertNoPrivateWorkerFields(nestedValue, `${location}.${key}`);
  }
}

async function api(path, options = {}) {
  const headers = {
    ...authHeaders(options.token),
    ...(options.body === undefined
      ? {}
      : { 'Content-Type': 'application/json' }),
  };
  const response = await fetch(`${apiBase}${path}`, {
    method: options.method || 'GET',
    headers,
    body:
      options.body === undefined ? options.form : JSON.stringify(options.body),
  });
  const raw = await response.text();
  let data = null;
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }
  }

  const expected = options.expected || [200, 201];
  if (!expected.includes(response.status)) {
    throw new Error(
      `${options.method || 'GET'} ${path} returned ${response.status}: ${raw}`,
    );
  }

  return { status: response.status, data };
}

async function register(role, details) {
  const body =
    role === 'worker'
      ? {
          role,
          email: details.email,
          password: details.password,
          fullName: details.fullName,
          city: 'София',
          skills: ['painting'],
          profile: {
            publicName: details.fullName,
            city: 'София',
            skills: ['painting'],
            bio: 'Sprint 3 API smoke worker',
          },
        }
      : {
          role,
          email: details.email,
          password: details.password,
          name: details.name,
          phone: '0888000000',
          profile: {
            displayName: details.name,
            phonePrivate: '0888000000',
          },
        };

  return (await api('/auth/register', { method: 'POST', body })).data.user;
}

async function login(details) {
  return (
    await api('/auth/login', {
      method: 'POST',
      body: { email: details.email, password: details.password },
    })
  ).data;
}

function imageForm(filename) {
  const form = new FormData();
  form.append('images', new Blob([tinyPng], { type: 'image/png' }), filename);
  return form;
}

function avatarForm(filename) {
  const form = new FormData();
  form.append('avatar', new Blob([tinyPng], { type: 'image/png' }), filename);
  return form;
}

function findMedia(rows, predicate, message) {
  const row = rows.find(predicate);
  assert.ok(row, message);
  return row;
}

async function main() {
  console.log(`Sprint 3 API smoke: ${apiBase}`);
  console.log(`Database: ${database}`);

  assertNoPrivateWorkerFields((await api('/workers')).data, 'workers');

  const adminUser = await register('client', {
    ...credentials.admin,
    name: 'Sprint 3 Admin',
  });
  const clientUser = await register('client', {
    ...credentials.client,
    name: 'Sprint 3 Client',
  });
  const workerUser = await register('worker', {
    ...credentials.worker,
    fullName: 'Sprint 3 Worker',
  });
  const restrictedWorkerUser = await register('worker', {
    ...credentials.restrictedWorker,
    fullName: 'Sprint 3 Restricted Worker',
  });

  const connection = await mysql.createConnection(dbConfig);
  try {
    await connection.execute(
      `UPDATE users
       SET email_verified_at = COALESCE(email_verified_at, NOW())
       WHERE id IN (?, ?, ?, ?)`,
      [
        adminUser.id,
        clientUser.id,
        workerUser.id,
        restrictedWorkerUser.id,
      ],
    );
    await connection.execute("UPDATE users SET role = 'admin' WHERE id = ?", [
      adminUser.id,
    ]);
  } finally {
    await connection.end();
  }

  const admin = await login(credentials.admin);
  const client = await login(credentials.client);
  const worker = await login(credentials.worker);
  const restrictedWorker = await login(credentials.restrictedWorker);

  assert.equal(admin.user.role, 'admin');
  assert.equal(client.user.id, clientUser.id);
  assert.equal(worker.user.id, workerUser.id);

  await api(`/admin/workers/${workerUser.id}/approval`, {
    method: 'POST',
    token: admin.token,
    body: {
      approvalStatus: 'approved',
      reason: 'Sprint 3 API smoke',
    },
  });

  const publicWorkers = (await api('/workers')).data;
  assert.ok(Array.isArray(publicWorkers));
  assert.ok(
    publicWorkers.some(
      (candidate) => Number(candidate.workerUserId) === workerUser.id,
    ),
    'Approved worker is missing from the public worker list',
  );
  assertNoPrivateWorkerFields(publicWorkers, 'workers');

  const publicWorker = (await api(`/workers/${workerUser.id}`)).data;
  assert.equal(Number(publicWorker.workerUserId), workerUser.id);
  assertNoPrivateWorkerFields(publicWorker, 'workerProfile');

  const publicWorkerBatch = (
    await api('/workers/by-user-ids', {
      method: 'POST',
      body: { ids: [workerUser.id, restrictedWorkerUser.id] },
    })
  ).data;
  assert.ok(Array.isArray(publicWorkerBatch));
  assert.ok(
    publicWorkerBatch.some(
      (candidate) => Number(candidate.workerUserId) === workerUser.id,
    ),
    'Approved worker is missing from the worker batch response',
  );
  assert.equal(
    publicWorkerBatch.some(
      (candidate) =>
        Number(candidate.workerUserId) === restrictedWorkerUser.id,
    ),
    false,
    'Pending worker is visible in the public worker batch response',
  );
  assertNoPrivateWorkerFields(publicWorkerBatch, 'workerBatch');

  const restrictedFeed = await api('/requests/worker', {
    token: restrictedWorker.token,
    expected: [403],
  });
  assert.match(String(restrictedFeed.data?.message || ''), /not approved/i);

  const created = (
    await api('/requests', {
      method: 'POST',
      token: client.token,
      body: {
        address: 'София, rehearsal address',
        latitude: 42.6977,
        longitude: 23.3219,
        locationSource: 'manual',
        categoryKey: 'painting',
        description: 'Sprint 3 real API lifecycle request',
        estimateMin: 300,
        estimateMax: 500,
        estimateCurrency: 'EUR',
        photos: [],
      },
    })
  ).data;
  assert.equal(created.statusKey, 'pending_admin');
  const requestId = Number(created.id);

  const beforeUpload = (
    await api(`/requests/${requestId}/media/before`, {
      method: 'POST',
      token: client.token,
      form: imageForm('before.png'),
    })
  ).data;
  assert.equal(beforeUpload.photos.length, 1);
  assert.equal(beforeUpload.photos[0].moderationStatus, 'pending');

  const applyBeforeApproval = await api(`/requests/${requestId}/apply`, {
    method: 'POST',
    token: worker.token,
    body: {},
    expected: [400],
  });
  assert.match(
    String(applyBeforeApproval.data?.message || ''),
    /invalid (?:request|lifecycle) transition/i,
  );

  const pendingBeforeMedia = (await api('/admin/media', { token: admin.token })).data.find(
    (media) => Number(media.requestId) === requestId && media.kind === 'request_before',
  );
  assert.ok(pendingBeforeMedia, 'Pending request photo is missing from admin media');
  await api(`/admin/media/${pendingBeforeMedia.id}/moderation`, {
    method: 'POST',
    token: admin.token,
    body: { moderationStatus: 'approved' },
  });

  await api(`/admin/requests/${requestId}/status`, {
    method: 'POST',
    token: admin.token,
    body: { status: 'published', reason: 'Request media approved' },
  });

  const workerFeed = (await api('/requests/worker', { token: worker.token }))
    .data;
  const publishedRequest = workerFeed.find(
    (request) => Number(request.id) === requestId,
  );
  assert.ok(publishedRequest, 'Published request is missing from worker feed');
  assert.equal(publishedRequest.photos.length, 1);
  assert.equal(publishedRequest.clientName, 'Клиент');
  assert.equal(publishedRequest.email, null);
  assert.equal(publishedRequest.phone, null);
  assert.equal(publishedRequest.address, 'София');
  assert.equal(publishedRequest.addressPrecision, 'rough');
  await api(publishedRequest.photos[0].url);

  const applied = (
    await api(`/requests/${requestId}/apply`, {
      method: 'POST',
      token: worker.token,
      body: {},
    })
  ).data;
  assert.equal(applied.statusKey, 'applied');

  const appliedAgain = (
    await api(`/requests/${requestId}/apply`, {
      method: 'POST',
      token: worker.token,
      body: {},
    })
  ).data;
  assert.equal(
    appliedAgain.applications.filter(
      (application) => Number(application.workerUserId) === workerUser.id,
    ).length,
    1,
  );

  const assigned = (
    await api(`/requests/${requestId}/assign`, {
      method: 'POST',
      token: client.token,
      body: { workerUserId: workerUser.id },
    })
  ).data;
  assert.equal(assigned.statusKey, 'worker_selected');
  assert.equal(Number(assigned.assignedWorkerUserId), workerUser.id);

  const assignedWorkerView = (
    await api('/requests/worker', { token: worker.token })
  ).data.find((request) => Number(request.id) === requestId);
  assert.equal(assignedWorkerView.clientName, 'Sprint 3 Client');
  assert.equal(assignedWorkerView.email, null);
  assert.equal(assignedWorkerView.phone, null);
  assert.equal(assignedWorkerView.address, 'София, rehearsal address');
  assert.equal(assignedWorkerView.addressPrecision, 'exact');

  const withdrawalAfterAssignment = await api(
    `/requests/${requestId}/withdraw`,
    {
      method: 'POST',
      token: worker.token,
      body: {},
      expected: [400],
    },
  );
  assert.match(
    String(withdrawalAfterAssignment.data?.message || ''),
    /cannot withdraw/i,
  );

  assert.equal(
    (
      await api(`/requests/${requestId}/worker-confirm`, {
        method: 'POST',
        token: worker.token,
        body: {},
      })
    ).data.statusKey,
    'worker_confirmed',
  );
  assert.equal(
    (
      await api(`/requests/${requestId}/on-site`, {
        method: 'POST',
        token: worker.token,
        body: {},
      })
    ).data.statusKey,
    'worker_on_site',
  );
  assert.equal(
    (
      await api(`/requests/${requestId}/inspect`, {
        method: 'POST',
        token: worker.token,
        body: {},
      })
    ).data.statusKey,
    'inspected',
  );
  assert.equal(
    (
      await api(`/requests/${requestId}/start`, {
        method: 'POST',
        token: worker.token,
        body: {},
      })
    ).data.statusKey,
    'in_progress',
  );

  const unassignAfterStart = await api(`/requests/${requestId}/unassign`, {
    method: 'POST',
    token: client.token,
    body: {},
    expected: [400],
  });
  assert.match(
    String(unassignAfterStart.data?.message || ''),
    /invalid (?:request|lifecycle) transition/i,
  );

  const afterUpload = (
    await api(`/requests/${requestId}/media/after`, {
      method: 'POST',
      token: worker.token,
      form: imageForm('after.png'),
    })
  ).data;
  assert.equal(afterUpload.afterPhotos.length, 1);
  assert.equal(afterUpload.afterPhotos[0].moderationStatus, 'pending');

  assert.equal(
    (
      await api(`/requests/${requestId}/finish`, {
        method: 'POST',
        token: worker.token,
        body: {},
      })
    ).data.statusKey,
    'work_finished',
  );
  assert.equal(
    (
      await api(`/requests/${requestId}/ready`, {
        method: 'POST',
        token: worker.token,
        body: {},
      })
    ).data.statusKey,
    'ready_for_client_confirmation',
  );
  assert.equal(
    (
      await api(`/requests/${requestId}/client-confirm`, {
        method: 'POST',
        token: client.token,
        body: {},
      })
    ).data.statusKey,
    'client_confirmed',
  );

  const review = (
    await api('/reviews', {
      method: 'POST',
      token: client.token,
      body: {
        requestId,
        rating: 5,
        comment: 'Sprint 3 API smoke review',
      },
    })
  ).data;
  assert.equal(Number(review.workerUserId), workerUser.id);

  const reviewedFeed = (await api('/requests/worker', { token: worker.token }))
    .data;
  assert.equal(
    reviewedFeed.find((request) => Number(request.id) === requestId)?.statusKey,
    'reviewed',
  );

  const completed = (
    await api(`/requests/${requestId}/complete`, {
      method: 'POST',
      token: worker.token,
      body: {},
    })
  ).data;
  assert.equal(completed.statusKey, 'completed');
  assert.equal(completed.archiveReason, 'closed_by_worker');

  const workerHistory = (
    await api('/requests/worker?scope=history', { token: worker.token })
  ).data;
  assert.ok(
    workerHistory.some((request) => Number(request.id) === requestId),
    'Completed request is missing from worker history',
  );

  let publicHistory = (await api(`/workers/${workerUser.id}/history`)).data;
  const pendingHistoryRequest = publicHistory.find(
    (request) => Number(request.id) === requestId,
  );
  assert.ok(pendingHistoryRequest);
  assert.equal(pendingHistoryRequest.afterPhotos.length, 0);

  let mediaRows = (await api('/admin/media', { token: admin.token })).data;
  const afterMedia = findMedia(
    mediaRows,
    (row) =>
      Number(row.requestId) === requestId && row.kind === 'request_after',
    'After media was not persisted',
  );
  assert.equal(afterMedia.moderationStatus, 'pending');
  await api(`/admin/media/${afterMedia.id}/moderation`, {
    method: 'POST',
    token: admin.token,
    body: {
      moderationStatus: 'approved',
      reason: 'Sprint 3 API smoke',
    },
  });

  publicHistory = (await api(`/workers/${workerUser.id}/history`)).data;
  const approvedHistoryRequest = publicHistory.find(
    (request) => Number(request.id) === requestId,
  );
  assert.equal(approvedHistoryRequest.afterPhotos.length, 1);
  await api(approvedHistoryRequest.afterPhotos[0].url);

  await api('/workers/me/avatar', {
    method: 'POST',
    token: worker.token,
    form: avatarForm('avatar-one.png'),
  });
  mediaRows = (await api('/admin/media', { token: admin.token })).data;
  const firstAvatar = findMedia(
    mediaRows,
    (row) =>
      Number(row.workerUserId) === workerUser.id &&
      row.kind === 'worker_avatar' &&
      row.moderationStatus === 'pending',
    'Pending avatar was not persisted',
  );
  assert.equal((await api(`/workers/${workerUser.id}`)).data.avatarUrl, '');
  await api(`/admin/media/${firstAvatar.id}/moderation`, {
    method: 'POST',
    token: admin.token,
    body: { moderationStatus: 'approved', reason: 'Approve first avatar' },
  });
  const approvedAvatarUrl = (await api(`/workers/${workerUser.id}`)).data
    .avatarUrl;
  assert.equal(approvedAvatarUrl, firstAvatar.publicUrl);
  await api(approvedAvatarUrl);

  await api('/workers/me/avatar', {
    method: 'POST',
    token: worker.token,
    form: avatarForm('avatar-two.png'),
  });
  mediaRows = (await api('/admin/media', { token: admin.token })).data;
  const secondAvatar = findMedia(
    mediaRows,
    (row) =>
      Number(row.workerUserId) === workerUser.id &&
      row.kind === 'worker_avatar' &&
      row.moderationStatus === 'pending',
    'Replacement avatar was not persisted as pending',
  );
  assert.equal(
    (await api(`/workers/${workerUser.id}`)).data.avatarUrl,
    approvedAvatarUrl,
  );
  await api(`/admin/media/${secondAvatar.id}/moderation`, {
    method: 'POST',
    token: admin.token,
    body: { moderationStatus: 'rejected', reason: 'Reject replacement avatar' },
  });
  assert.equal(
    (await api(`/workers/${workerUser.id}`)).data.avatarUrl,
    approvedAvatarUrl,
  );

  await api('/workers/me/gallery', {
    method: 'POST',
    token: worker.token,
    form: imageForm('gallery.png'),
  });
  const ownerGallery = (
    await api('/workers/me/gallery', { token: worker.token })
  ).data;
  const pendingGallery = ownerGallery.find(
    (row) => row.moderationStatus === 'pending',
  );
  assert.ok(pendingGallery, 'Owner cannot see pending gallery media');
  assert.equal(
    (await api(`/workers/${workerUser.id}/gallery`)).data.some(
      (row) => Number(row.id) === Number(pendingGallery.id),
    ),
    false,
  );
  await api(`/admin/media/${pendingGallery.id}/moderation`, {
    method: 'POST',
    token: admin.token,
    body: { moderationStatus: 'approved', reason: 'Approve gallery media' },
  });
  assert.equal(
    (await api(`/workers/${workerUser.id}/gallery`)).data.some(
      (row) => Number(row.id) === Number(pendingGallery.id),
    ),
    true,
  );

  await api(`/admin/workers/${restrictedWorkerUser.id}/approval`, {
    method: 'POST',
    token: admin.token,
    body: { approvalStatus: 'approved', reason: 'Restricted worker test' },
  });
  await api(`/admin/users/${restrictedWorkerUser.id}/status`, {
    method: 'POST',
    token: admin.token,
    body: { status: 'blocked', reason: 'Restricted worker test' },
  });
  assert.equal(
    (
      await api(`/requests/${requestId}/apply`, {
        method: 'POST',
        token: restrictedWorker.token,
        body: {},
        expected: [401],
      })
    ).status,
    401,
  );
  await api(`/admin/users/${restrictedWorkerUser.id}/status`, {
    method: 'POST',
    token: admin.token,
    body: { status: 'active', reason: 'Restricted worker test' },
  });
  await api(`/admin/workers/${restrictedWorkerUser.id}/approval`, {
    method: 'POST',
    token: admin.token,
    body: { approvalStatus: 'suspended', reason: 'Restricted worker test' },
  });
  assert.equal(
    (
      await api(`/requests/${requestId}/apply`, {
        method: 'POST',
        token: restrictedWorker.token,
        body: {},
        expected: [403],
      })
    ).status,
    403,
  );

  const timeline = (
    await api(`/admin/requests/${requestId}/timeline`, {
      token: admin.token,
    })
  ).data;
  const eventTypes = timeline.events.map((event) => event.eventType);
  for (const eventType of [
    'request.created',
    'request.media_uploaded',
    'admin.status_changed',
    'application.created',
    'request.assigned',
    'worker.confirmed',
    'worker.on_site',
    'worker.inspected',
    'worker.started_work',
    'worker.finished_work',
    'worker.ready_for_client_confirmation',
    'client.confirmed_work',
    'request.reviewed',
    'request.closed_by_worker',
  ]) {
    assert.ok(
      eventTypes.includes(eventType),
      `Timeline is missing ${eventType}`,
    );
  }

  const browserSessionPath = process.env.SPRINT3_SMOKE_SESSION_FILE?.trim();
  if (browserSessionPath) {
    const resolvedSessionPath = resolve(browserSessionPath);
    mkdirSync(dirname(resolvedSessionPath), { recursive: true });
    writeFileSync(
      resolvedSessionPath,
      `${JSON.stringify(
        {
          formatVersion: 1,
          generatedAt: new Date().toISOString(),
          apiBase,
          accounts: {
            client: credentials.client,
            worker: credentials.worker,
            admin: credentials.admin,
          },
        },
        null,
        2,
      )}\n`,
      { encoding: 'utf8', mode: 0o600 },
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        runId,
        requestId,
        clientUserId: clientUser.id,
        workerUserId: workerUser.id,
        restrictedWorkerUserId: restrictedWorkerUser.id,
        timelineEvents: timeline.events.length,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
