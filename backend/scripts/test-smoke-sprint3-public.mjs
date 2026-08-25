import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const smokeScript = resolve(scriptDir, 'smoke-sprint3-public.mjs');
let exposePrivateField = false;

const server = createServer((request, response) => {
  const path = new URL(request.url || '/', 'http://localhost').pathname;
  if (path === '/api/health/ready') {
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({
        status: 'ok',
        database: 'ok',
        storage: 'ok',
        commit: 'release-commit',
      }),
    );
    return;
  }
  if (path === '/api/workers') {
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify([
        {
          workerUserId: 201,
          publicName: 'Test Worker',
          ...(exposePrivateField ? { email: 'private@example.test' } : {}),
        },
      ]),
    );
    return;
  }
  if (path === '/api/workers/201') {
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({
        workerUserId: 201,
        publicName: 'Test Worker',
        avatarUrl: '/uploads/avatar.webp',
      }),
    );
    return;
  }
  if (path === '/api/workers/me') {
    response.statusCode = 401;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ message: 'Account is not active' }));
    return;
  }
  if (path === '/uploads/avatar.webp') {
    response.setHeader('content-type', 'image/webp');
    response.end(Buffer.from([0x52, 0x49, 0x46, 0x46]));
    return;
  }
  if (path === '/assets/app.js') {
    response.setHeader('content-type', 'application/javascript');
    response.end('console.log("test");');
    return;
  }

  response.setHeader('content-type', 'text/html');
  response.end(
    '<!doctype html><html><body><div id="root"></div><script src="/assets/app.js"></script></body></html>',
  );
});

await new Promise((resolveListen) =>
  server.listen(0, '127.0.0.1', resolveListen),
);
const address = server.address();
assert.ok(address && typeof address === 'object');
const publicUrl = `http://127.0.0.1:${address.port}`;

function runSmoke(extraEnv = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(process.execPath, [smokeScript], {
      env: {
        ...process.env,
        SPRINT3_PUBLIC_URL: publicUrl,
        SPRINT3_PUBLIC_TIMEOUT_MS: '2000',
        SPRINT3_EXPECTED_COMMIT_SHA: 'release-commit',
        SPRINT3_SUSPENDED_USER_TOKEN: 'already-issued-token',
        ...extraEnv,
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('error', rejectRun);
    child.on('close', (status) => {
      resolveRun({ status, stdout, stderr });
    });
  });
}

try {
  const success = await runSmoke();
  assert.equal(success.status, 0, success.stderr);
  const result = JSON.parse(success.stdout);
  assert.equal(result.readiness.commit, 'release-commit');
  assert.equal(result.publicMediaChecked, 1);
  assert.equal(result.suspendedTokenRejected, true);
  assert.ok(result.checkedRoutes.includes('/requests'));

  const wrongCommit = await runSmoke({
    SPRINT3_EXPECTED_COMMIT_SHA: 'different-commit',
  });
  assert.notEqual(wrongCommit.status, 0);
  assert.match(wrongCommit.stderr, /does not match different-commit/);

  exposePrivateField = true;
  const privateLeak = await runSmoke();
  assert.notEqual(privateLeak.status, 0);
  assert.match(privateLeak.stderr, /Private field workers\[0\]\.email is public/);

  console.log(
    JSON.stringify(
      {
        ok: true,
        checks: [
          'healthy-production-contract',
          'deployed-commit-match',
          'public-media',
          'suspended-token-rejection',
          'private-field-rejection',
        ],
      },
      null,
      2,
    ),
  );
} finally {
  await new Promise((resolveClose, rejectClose) =>
    server.close((error) => (error ? rejectClose(error) : resolveClose())),
  );
}
