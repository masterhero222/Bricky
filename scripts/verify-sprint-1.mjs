import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWindows = process.platform === "win32";

const checks = [
  { name: "Database preflight safety", cwd: ".", command: "node", args: ["scripts/verify-db-preflight.mjs"] },
  { name: "Frontend pricing verification", cwd: "frontend", args: ["run", "test:pricing"] },
  { name: "Frontend production build", cwd: "frontend", args: ["run", "build"] },
  { name: "Backend production build", cwd: "backend", args: ["run", "build"] },
  { name: "Backend tests", cwd: "backend", args: ["test", "--", "--runInBand"] },
];

for (const check of checks) {
  process.stdout.write(`\n=== ${check.name} ===\n`);
  const baseCommand = check.command || "npm";
  const command = isWindows ? process.env.ComSpec : baseCommand;
  const args = isWindows
    ? ["/d", "/s", "/c", [baseCommand, ...check.args].join(" ")]
    : check.args;
  const result = spawnSync(command, args, {
    cwd: path.join(root, check.cwd),
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    console.error(`Failed to start ${check.name}:`, result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`${check.name} failed with exit code ${result.status}.`);
    process.exit(result.status || 1);
  }
}

process.stdout.write("\nSprint 1 verification gate passed.\n");
