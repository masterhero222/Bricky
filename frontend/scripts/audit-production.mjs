import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const allowedAdvisory = "https://github.com/advisories/GHSA-qwww-vcr4-c8h2";
const sourceRoot = resolve(process.cwd(), "src");
const rscModePattern =
  /\b(?:RSCRouter|ServerRouter|createRequestHandler|createStaticHandler|unstable_[A-Za-z0-9_]*RSC)\b/;

function sourceFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory)) {
    const path = resolve(directory, entry);
    if (statSync(path).isDirectory()) {
      files.push(...sourceFiles(path));
    } else if (/\.[cm]?[jt]sx?$/.test(entry)) {
      files.push(path);
    }
  }
  return files;
}

for (const file of sourceFiles(sourceRoot)) {
  assert.equal(
    rscModePattern.test(readFileSync(file, "utf8")),
    false,
    `RSC/Data Router API detected in ${file}; remove the audit exception.`,
  );
}

const audit =
  process.platform === "win32"
    ? spawnSync(
        process.env.ComSpec || "cmd.exe",
        ["/d", "/s", "/c", "npm audit --omit=dev --json"],
        { encoding: "utf8" },
      )
    : spawnSync("npm", ["audit", "--omit=dev", "--json"], {
        encoding: "utf8",
      });
if (audit.error) throw audit.error;

const report = JSON.parse(audit.stdout || "{}");
const vulnerabilities = report.vulnerabilities || {};
const names = Object.keys(vulnerabilities);

if (audit.status !== 0) {
  assert.deepEqual(
    names.sort(),
    ["react-router", "react-router-dom"],
    "Unexpected production dependency vulnerability detected.",
  );
  const routerAdvisories = vulnerabilities["react-router"]?.via || [];
  assert.equal(routerAdvisories.length, 1);
  assert.equal(routerAdvisories[0]?.url, allowedAdvisory);
  assert.deepEqual(vulnerabilities["react-router-dom"]?.via, ["react-router"]);
  assert.equal(report.metadata?.vulnerabilities?.critical || 0, 0);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      productionVulnerabilities: report.metadata?.vulnerabilities || {},
      temporaryException:
        audit.status === 0
          ? null
          : {
              advisory: allowedAdvisory,
              reason:
                "Bricky uses declarative BrowserRouter and does not enable React Router RSC Mode.",
            },
    },
    null,
    2,
  ),
);
