import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const apiBaseUrl = (process.env.API_BASE_URL || 'https://bricky.bg/api').replace(/\/$/, '');
const role = process.env.SMOKE_ROLE === 'worker' ? 'worker' : 'client';
const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD || `BrickySmoke-${Date.now()}!`;
const name = process.env.SMOKE_NAME || `Bricky Smoke ${new Date().toISOString()}`;

if (!email) {
  console.error('Missing SMOKE_EMAIL. Use a disposable inbox you can open.');
  console.error('Example PowerShell:');
  console.error("$env:API_BASE_URL='https://bricky.bg/api'");
  console.error("$env:SMOKE_EMAIL='bricky-smoke+20260711@example.com'");
  console.error("$env:SMOKE_PASSWORD='Use-A-Disposable-Strong-Password-123!'");
  console.error('npm run smoke:email-verification');
  process.exit(1);
}

async function post(path, body) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: response.ok, status: response.status, data };
}

function assert(condition, message, details) {
  if (!condition) {
    console.error(`FAIL: ${message}`);
    if (details) console.error(JSON.stringify(details, null, 2));
    process.exit(1);
  }
}

function registrationPayload() {
  if (role === 'worker') {
    return {
      role: 'worker',
      fullName: name,
      email,
      password,
      phone: '0888000000',
      city: 'София',
      skills: ['ВиК ремонти'],
    };
  }

  return {
    role: 'client',
    name,
    email,
    password,
  };
}

console.log('Bricky email verification smoke');
console.log(`API: ${apiBaseUrl}`);
console.log(`Role: ${role}`);
console.log(`Email: ${email}`);

const register = await post('/auth/register', registrationPayload());
assert(register.ok, 'registration request failed', register);
console.log(`PASS: registration accepted (${register.data?.message || 'no message'})`);

const loginBeforeVerification = await post('/auth/login', { email, password });
assert(
  !loginBeforeVerification.ok,
  'login must be blocked before email verification',
  loginBeforeVerification,
);
console.log(`PASS: login blocked before verification (${loginBeforeVerification.status})`);

console.log('');
console.log('Open the mailbox for the disposable email and copy the 6-digit Bricky verification code.');
const rl = readline.createInterface({ input, output });
const code = (await rl.question('Verification code: ')).trim();
rl.close();

assert(/^\d{6}$/.test(code), 'verification code must be exactly 6 digits');

const verify = await post('/auth/verify-email-code', { email, code });
assert(verify.ok, 'email code verification failed', verify);
console.log(`PASS: verification code accepted (${verify.data?.message || 'no message'})`);

const reuse = await post('/auth/verify-email-code', { email, code });
assert(reuse.ok, 'already verified account should return a safe success response', reuse);
console.log('PASS: repeated verification is safe after the account is already verified');

const loginAfterVerification = await post('/auth/login', { email, password });
assert(loginAfterVerification.ok, 'login failed after email verification', loginAfterVerification);
assert(loginAfterVerification.data?.token, 'login response did not include a JWT token', loginAfterVerification);
assert(loginAfterVerification.data?.user?.email === email, 'login response returned the wrong user', loginAfterVerification);
console.log(`PASS: login succeeded after verification for user ${loginAfterVerification.data.user.id}`);

console.log('');
console.log('EMAIL VERIFICATION SMTP SMOKE PASSED');
