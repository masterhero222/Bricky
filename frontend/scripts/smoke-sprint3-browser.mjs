import assert from "node:assert/strict";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { chromium } from "playwright";

const webBase = String(
  process.env.SPRINT3_WEB_URL || "http://127.0.0.1:4173",
).replace(/\/+$/, "");
const apiBase = String(
  process.env.SPRINT3_API_URL || `${webBase}/api`,
).replace(/\/+$/, "");
const expectedCommit = process.env.SPRINT3_EXPECTED_COMMIT_SHA?.trim() || "";
const reportPath =
  process.env.SPRINT3_BROWSER_SMOKE_REPORT?.trim() ||
  process.env.SPRINT3_BROWSER_REPORT?.trim();
const sessionFile = process.env.SPRINT3_SMOKE_SESSION_FILE?.trim();
const timeout = Number(process.env.SPRINT3_BROWSER_TIMEOUT_MS || 20_000);

const publicRoutes = ["/", "/workers", "/requests", "/blog"];
const roleRoutes = {
  client: "/client/profile",
  worker: "/worker/profile",
  admin: "/admin",
};

function envAccount(role) {
  const prefix = `SPRINT3_BROWSER_${role.toUpperCase()}`;
  const email = process.env[`${prefix}_EMAIL`]?.trim();
  const password = process.env[`${prefix}_PASSWORD`];
  return email && password ? { email, password } : null;
}

function loadAccounts() {
  if (sessionFile) {
    const resolved = resolve(sessionFile);
    if (!existsSync(resolved)) {
      throw new Error(`Sprint 3 browser session file does not exist: ${resolved}`);
    }
    const session = JSON.parse(readFileSync(resolved, "utf8"));
    if (session.formatVersion !== 1 || !session.accounts) {
      throw new Error("Unsupported Sprint 3 browser session format.");
    }
    return session.accounts;
  }

  return Object.fromEntries(
    Object.keys(roleRoutes).map((role) => [role, envAccount(role)]),
  );
}

async function settle(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.waitForLoadState("networkidle", { timeout }).catch(() => {});
  const app = page.locator("#root > *").first();
  await app.waitFor({ state: "visible", timeout });
  const bounds = await app.boundingBox();
  assert.ok(
    bounds && bounds.width > 0 && bounds.height > 0,
    `Rendered page is unexpectedly empty: ${page.url()}`,
  );
}

async function openRoute(page, route) {
  const response = await page.goto(`${webBase}${route}`, {
    waitUntil: "domcontentloaded",
    timeout,
  });
  assert.ok(response, `No document response for ${route}`);
  assert.ok(
    response.status() < 400,
    `${route} returned document status ${response.status()}`,
  );
  await settle(page);
}

async function clearIdentity(page) {
  await openRoute(page, "/");
  await page.evaluate(() => localStorage.clear());
}

async function loginAs(page, role, account) {
  assert.ok(account?.email && account?.password, `Missing ${role} smoke account.`);
  await clearIdentity(page);
  await openRoute(page, "/auth/login");
  await page.locator('input[name="email"]').fill(account.email);
  await page.locator('input[name="password"]').fill(account.password);
  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname.endsWith("/auth/login"),
    { timeout },
  );
  await page.locator("form").evaluate((form) => form.requestSubmit());
  const loginResponse = await loginResponsePromise;
  if (loginResponse.status() >= 400) {
    const responseBody = await loginResponse.text().catch(() => "<unavailable>");
    assert.fail(
      `${role} login failed with ${loginResponse.status()} from ${loginResponse.url()}: ${responseBody}`,
    );
  }
  await page.waitForFunction(
    ({ expectedRole, expectedPath }) =>
      localStorage.getItem("role") === expectedRole &&
      Boolean(localStorage.getItem("token")) &&
      window.location.pathname === expectedPath,
    { expectedRole: role, expectedPath: roleRoutes[role] },
    { timeout },
  );
  await settle(page);

  const identity = await page.evaluate(() => ({
    role: localStorage.getItem("role"),
    hasToken: Boolean(localStorage.getItem("token")),
  }));
  assert.equal(identity.role, role);
  assert.equal(identity.hasToken, true);
  assert.equal(new URL(page.url()).pathname, roleRoutes[role]);
}

async function readiness() {
  const response = await fetch(`${apiBase}/health/ready`);
  assert.equal(response.status, 200, "Browser smoke cannot reach /health/ready");
  const data = await response.json();
  assert.equal(data?.status, "ok");
  if (expectedCommit) {
    assert.equal(
      data?.commit,
      expectedCommit,
      "Browser smoke reached a different deployed commit.",
    );
  }
  return data;
}

async function main() {
  const accounts = loadAccounts();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const browserErrors = [];

  page.on("pageerror", (error) => {
    browserErrors.push({ type: "pageerror", url: page.url(), message: error.message });
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push({
        type: "console",
        url: page.url(),
        message: message.text(),
      });
    }
  });
  page.on("requestfailed", (request) => {
    const failure = request.failure()?.errorText || "request failed";
    if (!/ERR_ABORTED/i.test(failure)) {
      browserErrors.push({
        type: "requestfailed",
        url: request.url(),
        message: failure,
      });
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      browserErrors.push({
        type: "response",
        status: response.status(),
        url: response.url(),
      });
    }
  });

  try {
    const ready = await readiness();

    for (const route of publicRoutes) {
      await clearIdentity(page);
      await openRoute(page, route);
      assert.equal(new URL(page.url()).pathname, route);
    }

    await clearIdentity(page);
    await openRoute(page, "/admin");
    assert.equal(
      new URL(page.url()).pathname,
      "/auth",
      "Anonymous visitor reached the admin backoffice.",
    );

    for (const [role, route] of Object.entries(roleRoutes)) {
      await loginAs(page, role, accounts[role]);
      assert.equal(new URL(page.url()).pathname, route);
    }

    await loginAs(page, "worker", accounts.worker);
    await openRoute(page, "/repair-map");
    const requestReturn = page.locator('a[href="/worker/profile?tab=requests"]');
    await requestReturn.waitFor({ state: "visible", timeout });
    await Promise.all([
      page.waitForURL(
        (url) =>
          url.pathname === "/worker/profile" &&
          url.searchParams.get("tab") === "requests",
        { timeout },
      ),
      requestReturn.click(),
    ]);
    await settle(page);

    assert.deepEqual(browserErrors, [], "Browser console or network errors detected.");

    const report = {
      formatVersion: 1,
      ok: true,
      checkedAt: new Date().toISOString(),
      webBase,
      apiBase,
      expectedCommit: expectedCommit || null,
      readiness: {
        status: ready.status,
        commit: ready.commit || null,
      },
      checkedRoutes: [...publicRoutes, "/auth/login", ...Object.values(roleRoutes), "/repair-map"],
      authenticatedRoles: Object.keys(roleRoutes),
      anonymousAdminRejected: true,
      mapReturnVerified: true,
      browserErrors,
    };

    if (reportPath) {
      const resolved = resolve(reportPath);
      mkdirSync(dirname(resolved), { recursive: true });
      writeFileSync(resolved, `${JSON.stringify(report, null, 2)}\n`, {
        encoding: "utf8",
        mode: 0o600,
      });
    }
    console.log(JSON.stringify(report, null, 2));
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          failedAt: page.url(),
          visibleText: (await page.locator("body").innerText()).slice(0, 1000),
          browserErrors,
        },
        null,
        2,
      ),
    );
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
