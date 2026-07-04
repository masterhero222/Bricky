const baseUrl = String(process.env.BRICKY_BASE_URL || '').replace(/\/+$/, '');
const mediaUrl = String(process.env.BRICKY_MEDIA_URL || '').trim();

if (!baseUrl) {
  console.error('BRICKY_BASE_URL is required, for example https://staging.bricky.bg');
  process.exit(2);
}

async function requireOk(url, label, expectedContentType) {
  const response = await fetch(url, { redirect: 'error' });
  const contentType = response.headers.get('content-type') || '';
  if (!response.ok) throw new Error(`${label} returned HTTP ${response.status}`);
  if (expectedContentType && !contentType.toLowerCase().includes(expectedContentType)) {
    throw new Error(`${label} returned unexpected content-type ${contentType || '(missing)'}`);
  }
  return { response, contentType };
}

try {
  const { response } = await requireOk(`${baseUrl}/api/health/ready`, 'readiness', 'application/json');
  const health = await response.json();
  if (health.status !== 'ok' || health.database !== 'ok' || health.storage !== 'ok') {
    throw new Error(`readiness payload is not healthy: ${JSON.stringify(health)}`);
  }
  console.log(`Readiness PASS${health.commit ? ` (${health.commit})` : ''}`);

  if (mediaUrl) {
    const resolvedMediaUrl = new URL(mediaUrl, `${baseUrl}/`).toString();
    const media = await requireOk(resolvedMediaUrl, 'media', 'image/');
    console.log(`Media PASS (${media.contentType}) ${resolvedMediaUrl}`);
  } else {
    console.log('Media check skipped: BRICKY_MEDIA_URL is not set.');
  }
} catch (error) {
  console.error(`Smoke FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}
