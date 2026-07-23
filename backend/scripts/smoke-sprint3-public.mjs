import assert from 'node:assert/strict';

const publicUrl = String(process.env.SPRINT3_PUBLIC_URL || '')
  .trim()
  .replace(/\/+$/, '');
if (!publicUrl) {
  throw new Error('SPRINT3_PUBLIC_URL is required.');
}
const parsedUrl = new URL(publicUrl);
if (
  parsedUrl.protocol !== 'https:' &&
  !['localhost', '127.0.0.1'].includes(parsedUrl.hostname)
) {
  throw new Error('Public smoke requires HTTPS outside localhost.');
}

const timeoutMs = Number(process.env.SPRINT3_PUBLIC_TIMEOUT_MS || 15_000);

async function request(path, expectedContentType) {
  const response = await fetch(`${publicUrl}${path}`, {
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: expectedContentType || '*/*' },
  });
  if (!response.ok) {
    throw new Error(`GET ${path} returned ${response.status}.`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (expectedContentType && !contentType.includes(expectedContentType)) {
    throw new Error(
      `GET ${path} returned ${contentType}, expected ${expectedContentType}.`,
    );
  }
  return response;
}

function assertNoPrivateFields(value, location = 'response') {
  if (Array.isArray(value)) {
    value.forEach((entry, index) =>
      assertNoPrivateFields(entry, `${location}[${index}]`),
    );
    return;
  }
  if (!value || typeof value !== 'object') return;

  for (const [key, nestedValue] of Object.entries(value)) {
    if (
      /^(email|phone|phonePrivate|password|passwordHash|password_hash|accessToken|refreshToken)$/i.test(
        key,
      )
    ) {
      throw new Error(`Private field ${location}.${key} is public.`);
    }
    assertNoPrivateFields(nestedValue, `${location}.${key}`);
  }
}

const checkedRoutes = [];
for (const path of ['/', '/workers', '/blog']) {
  const response = await request(path, 'text/html');
  const html = await response.text();
  assert.match(html, /<div id="root"><\/div>/);
  checkedRoutes.push(path);
}

const indexHtml = await (await request('/', 'text/html')).text();
const assetPaths = [
  ...indexHtml.matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g),
].map((match) => match[1]);
assert.ok(assetPaths.length > 0, 'Production HTML does not reference assets.');
for (const assetPath of [...new Set(assetPaths)]) {
  await request(assetPath);
}

const workersResponse = await request('/api/workers', 'application/json');
const workers = await workersResponse.json();
assert.ok(Array.isArray(workers), 'GET /api/workers must return an array.');
assertNoPrivateFields(workers, 'workers');

let workerProfileChecked = false;
if (workers.length > 0) {
  const workerUserId =
    workers[0].workerUserId ?? workers[0].userId ?? workers[0].id;
  assert.ok(workerUserId, 'Public worker card has no canonical identifier.');
  const profileResponse = await request(
    `/api/workers/${workerUserId}`,
    'application/json',
  );
  const profile = await profileResponse.json();
  assertNoPrivateFields(profile, 'workerProfile');
  workerProfileChecked = true;
}

console.log(
  JSON.stringify(
    {
      ok: true,
      checkedAt: new Date().toISOString(),
      publicUrl,
      checkedRoutes,
      assetsChecked: new Set(assetPaths).size,
      workersChecked: workers.length,
      workerProfileChecked,
    },
    null,
    2,
  ),
);
