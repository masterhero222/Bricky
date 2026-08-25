import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  createReadStream,
  createWriteStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Writable } from 'node:stream';
import { createGunzip, createGzip } from 'node:zlib';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import mysql from 'mysql2/promise';
import { migrationNames } from './sprint3-schema-contract.mjs';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, '..');
const repositoryRoot = resolve(backendRoot, '..');
const action = process.argv[2] || 'help';

function fail(message) {
  throw new Error(message);
}

function requireEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) fail(`${name} is required.`);
  return value;
}

function assertSafeDatabaseName(database, label = 'database') {
  if (!/^[a-zA-Z0-9_]+$/.test(database)) {
    fail(`${label} must contain only letters, digits and underscores.`);
  }
}

function isPathWithin(parent, candidate) {
  const pathFromParent = relative(resolve(parent), resolve(candidate));
  return (
    pathFromParent === '' ||
    (!pathFromParent.startsWith('..') && !isAbsolute(pathFromParent))
  );
}

function command(commandName, args, options = {}) {
  const result = spawnSync(commandName, args, {
    cwd: options.cwd || backendRoot,
    env: options.env || process.env,
    encoding: 'utf8',
    stdio: options.stdio || 'pipe',
  });

  if (result.error) {
    fail(`${commandName} is unavailable: ${result.error.message}`);
  }
  if (result.status !== 0) {
    fail(
      `${commandName} ${args.join(' ')} failed:\n${result.stderr || result.stdout}`,
    );
  }

  return (
    (options.combineOutput
      ? `${result.stdout || ''}\n${result.stderr || ''}`
      : result.stdout
    )?.trim() || ''
  );
}

function commandAvailable(
  commandName,
  versionArgs = commandName === 'nginx' ? ['-v'] : ['--version'],
) {
  const result = spawnSync(commandName, versionArgs, {
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return !result.error && result.status === 0;
}

async function sha256(filePath) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(filePath)) {
    hash.update(chunk);
  }
  return hash.digest('hex');
}

async function directoryFingerprint(directory) {
  const root = resolve(directory);
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    fail(`Build directory does not exist: ${root}`);
  }
  const files = [];
  const walk = (current) => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolutePath = resolve(current, entry.name);
      if (entry.isDirectory()) {
        walk(absolutePath);
      } else if (entry.isFile()) {
        files.push(absolutePath);
      } else {
        fail(`Build directory contains an unsupported entry: ${absolutePath}`);
      }
    }
  };
  walk(root);
  files.sort((left, right) =>
    relative(root, left).localeCompare(relative(root, right), 'en'),
  );
  if (files.length === 0) {
    fail(`Build directory is empty: ${root}`);
  }

  const hash = createHash('sha256');
  let bytes = 0;
  for (const filePath of files) {
    const path = relative(root, filePath).replaceAll('\\', '/');
    const size = statSync(filePath).size;
    bytes += size;
    hash.update(`${path}\0${size}\0${await sha256(filePath)}\n`);
  }
  return {
    sha256: hash.digest('hex'),
    files: files.length,
    bytes,
  };
}

function fingerprintsMatch(left, right) {
  return (
    left?.sha256 === right?.sha256 &&
    left?.files === right?.files &&
    left?.bytes === right?.bytes
  );
}

function activateBuildDirectories({
  activeBackend,
  activeFrontend,
  stagedBackend,
  stagedFrontend,
  rollbackBackend,
  rollbackFrontend,
}) {
  const pairs = [
    {
      label: 'backend',
      active: activeBackend,
      staged: stagedBackend,
      rollback: rollbackBackend,
      activated: false,
      preserved: false,
    },
    {
      label: 'frontend',
      active: activeFrontend,
      staged: stagedFrontend,
      rollback: rollbackFrontend,
      activated: false,
      preserved: false,
    },
  ];

  for (const pair of pairs) {
    if (
      !existsSync(pair.active) ||
      !statSync(pair.active).isDirectory() ||
      !existsSync(pair.staged) ||
      !statSync(pair.staged).isDirectory() ||
      existsSync(pair.rollback)
    ) {
      fail(`Unsafe ${pair.label} activation paths.`);
    }
    mkdirSync(dirname(pair.rollback), { recursive: true, mode: 0o700 });
  }

  try {
    for (const pair of pairs) {
      renameSync(pair.active, pair.rollback);
      pair.preserved = true;
      renameSync(pair.staged, pair.active);
      pair.activated = true;
    }
  } catch (error) {
    for (const pair of pairs.reverse()) {
      if (pair.activated && existsSync(pair.active)) {
        renameSync(pair.active, pair.staged);
        pair.activated = false;
      }
      if (pair.preserved && existsSync(pair.rollback)) {
        renameSync(pair.rollback, pair.active);
        pair.preserved = false;
      }
    }
    throw error;
  }
}

function restoreActivatedBuildDirectories({
  activeBackend,
  activeFrontend,
  rollbackBackend,
  rollbackFrontend,
  failedRoot,
}) {
  const pairs = [
    {
      label: 'frontend',
      active: activeFrontend,
      rollback: rollbackFrontend,
      failed: resolve(failedRoot, 'frontend-dist'),
    },
    {
      label: 'backend',
      active: activeBackend,
      rollback: rollbackBackend,
      failed: resolve(failedRoot, 'backend-dist'),
    },
  ];
  mkdirSync(failedRoot, { recursive: true, mode: 0o700 });
  for (const pair of pairs) {
    if (
      !existsSync(pair.active) ||
      !existsSync(pair.rollback) ||
      existsSync(pair.failed)
    ) {
      fail(`Cannot restore the previous ${pair.label} build safely.`);
    }
  }
  for (const pair of pairs) {
    renameSync(pair.active, pair.failed);
    renameSync(pair.rollback, pair.active);
  }
}

function readBrowserSmokeEvidence(
  reportPath,
  { webBase, expectedCommit, checkedAfter } = {},
) {
  if (!isAbsolute(reportPath) || !existsSync(reportPath)) {
    fail(
      'SPRINT3_BROWSER_SMOKE_REPORT must be an absolute path to an existing report.',
    );
  }
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const normalizedWebBase = webBase?.replace(/\/+$/, '');
  if (
    report.formatVersion !== 1 ||
    report.ok !== true ||
    (normalizedWebBase &&
      report.webBase?.replace(/\/+$/, '') !== normalizedWebBase) ||
    (expectedCommit &&
      (report.expectedCommit !== expectedCommit ||
        report.readiness?.commit !== expectedCommit)) ||
    report.anonymousAdminRejected !== true ||
    report.mapReturnVerified !== true ||
    !Array.isArray(report.authenticatedRoles) ||
    !['client', 'worker', 'admin'].every((role) =>
      report.authenticatedRoles.includes(role),
    ) ||
    !Array.isArray(report.checkedRoutes) ||
    ![
      '/',
      '/workers',
      '/requests',
      '/blog',
      '/client/profile',
      '/worker/profile',
      '/admin',
      '/repair-map',
    ].every((route) => report.checkedRoutes.includes(route)) ||
    !Array.isArray(report.browserErrors) ||
    report.browserErrors.length !== 0
  ) {
    fail('Authenticated browser smoke evidence is incomplete.');
  }
  const checkedAt = Date.parse(report.checkedAt);
  if (!Number.isFinite(checkedAt)) {
    fail('Browser smoke report has an invalid checkedAt timestamp.');
  }
  if (checkedAfter) {
    const requiredAfter = Date.parse(checkedAfter);
    if (!Number.isFinite(requiredAfter) || checkedAt < requiredAfter) {
      fail('Browser smoke was completed before the required release event.');
    }
  }
  return report;
}

function timestamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\..+/, 'Z');
}

function gitMetadata() {
  return {
    commit: command('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot }),
    branch: command('git', ['branch', '--show-current'], {
      cwd: repositoryRoot,
    }),
    dirty:
      command('git', ['status', '--porcelain'], { cwd: repositoryRoot })
        .length > 0,
  };
}

function assertReleaseGitMatchesManifest(git, manifest) {
  if (git.dirty) {
    fail(
      'The release worktree is dirty. Commit the exact release state first.',
    );
  }
  if (!manifest.source?.git?.commit) {
    fail('Backup manifest does not contain a source Git commit.');
  }
  if (git.commit !== manifest.source.git.commit) {
    fail(
      `Release commit ${git.commit} does not match backup commit ${manifest.source.git.commit}.`,
    );
  }
}

function validateProductionEnvironment({ requireTools = true } = {}) {
  const required = [
    'DB_HOST',
    'DB_PORT',
    'DB_USER',
    'DB_PASS',
    'DB_NAME',
    'JWT_SECRET',
  ];
  const missing = required.filter((name) => !process.env[name]?.trim());
  if (missing.length) {
    fail(`Missing production environment variables: ${missing.join(', ')}`);
  }

  if (process.env.NODE_ENV !== 'production') {
    fail('NODE_ENV must be production.');
  }
  if (process.env.TYPEORM_SYNCHRONIZE !== 'false') {
    fail('TYPEORM_SYNCHRONIZE must be explicitly set to false.');
  }
  if (process.env.JWT_SECRET.trim().length < 32) {
    fail('JWT_SECRET must contain at least 32 characters.');
  }
  if (
    [
      'supersecretkey',
      'changeme',
      'bricky-development-only-secret-change-before-production',
    ].includes(process.env.JWT_SECRET.trim().toLowerCase())
  ) {
    fail('JWT_SECRET uses a forbidden default value.');
  }

  assertSafeDatabaseName(process.env.DB_NAME, 'DB_NAME');

  const productionFrontendEnv = resolve(
    repositoryRoot,
    'frontend/.env.production',
  );
  if (!existsSync(productionFrontendEnv)) {
    fail('frontend/.env.production is missing.');
  }
  const frontendEnv = readFileSync(productionFrontendEnv, 'utf8');
  if (!/^VITE_API_URL=\/api\s*$/m.test(frontendEnv)) {
    fail('frontend/.env.production must use VITE_API_URL=/api.');
  }

  if (requireTools) {
    for (const tool of ['git', 'mysql', 'mysqldump', 'tar']) {
      if (!commandAvailable(tool)) {
        fail(`${tool} is required for Sprint 3 release operations.`);
      }
    }
  }
}

async function preflight() {
  validateProductionEnvironment();
  const git = gitMetadata();
  if (git.dirty) {
    fail(
      'The release worktree is dirty. Commit the exact release state first.',
    );
  }

  const uploadsDir = resolve(
    process.env.SPRINT3_UPLOADS_DIR || resolve(backendRoot, 'uploads'),
  );
  if (!existsSync(uploadsDir) || !statSync(uploadsDir).isDirectory()) {
    fail(`Uploads directory does not exist: ${uploadsDir}`);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });
  let databaseVersion;
  try {
    const [[row]] = await connection.query(
      'SELECT VERSION() AS version, DATABASE() AS databaseName',
    );
    databaseVersion = row;
  } finally {
    await connection.end();
  }

  const result = {
    ok: true,
    checkedAt: new Date().toISOString(),
    git,
    database: databaseVersion,
    uploadsDir,
    uploadsEntries: readdirSync(uploadsDir).length,
  };
  console.log(JSON.stringify(result, null, 2));
}

async function runDump(outputPath) {
  const args = [
    `--host=${process.env.DB_HOST}`,
    `--port=${process.env.DB_PORT}`,
    `--user=${process.env.DB_USER}`,
    '--single-transaction',
    '--routines',
    '--triggers',
    '--events',
    '--hex-blob',
    '--set-gtid-purged=OFF',
    '--default-character-set=utf8mb4',
    process.env.DB_NAME,
  ];
  const dump = spawn('mysqldump', args, {
    cwd: backendRoot,
    env: { ...process.env, MYSQL_PWD: process.env.DB_PASS },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stderr = '';
  dump.stderr.setEncoding('utf8');
  dump.stderr.on('data', (chunk) => {
    stderr += chunk;
  });

  const exitPromise = new Promise((resolveExit, rejectExit) => {
    dump.once('error', rejectExit);
    dump.once('close', resolveExit);
  });
  await pipeline(
    dump.stdout,
    createGzip({ level: 9 }),
    createWriteStream(outputPath),
  );
  const exitCode = await exitPromise;
  if (exitCode !== 0) fail(`mysqldump failed: ${stderr}`);
}

async function backup() {
  if (process.env.SPRINT3_CONFIRM_BACKUP !== 'BACKUP_BRICKY_PRODUCTION') {
    fail(
      'Set SPRINT3_CONFIRM_BACKUP=BACKUP_BRICKY_PRODUCTION to create a production backup.',
    );
  }
  validateProductionEnvironment();

  const uploadsDir = resolve(
    process.env.SPRINT3_UPLOADS_DIR || resolve(backendRoot, 'uploads'),
  );
  if (!existsSync(uploadsDir) || !statSync(uploadsDir).isDirectory()) {
    fail(`Uploads directory does not exist: ${uploadsDir}`);
  }

  const backupRoot = resolve(
    process.env.SPRINT3_BACKUP_ROOT ||
      resolve(repositoryRoot, 'backups/sprint3'),
  );
  const git = gitMetadata();
  if (git.dirty) {
    fail(
      'The release worktree is dirty. Commit the exact release state first.',
    );
  }
  if (isPathWithin(uploadsDir, backupRoot)) {
    fail('SPRINT3_BACKUP_ROOT must not be inside the uploads directory.');
  }
  mkdirSync(backupRoot, { recursive: true, mode: 0o700 });
  const releaseDir = resolve(backupRoot, timestamp());
  mkdirSync(releaseDir, { recursive: false });

  const databaseArchive = resolve(releaseDir, 'database.sql.gz');
  const uploadsArchive = resolve(releaseDir, 'uploads.tar.gz');
  await runDump(databaseArchive);
  command('tar', [
    '-czf',
    uploadsArchive,
    '-C',
    dirname(uploadsDir),
    uploadsDir.split(/[\\/]/).at(-1),
  ]);

  const manifest = {
    formatVersion: 1,
    createdAt: new Date().toISOString(),
    source: {
      database: process.env.DB_NAME,
      databaseHost: process.env.DB_HOST,
      uploadsDir,
      git,
    },
    artifacts: {
      database: {
        file: 'database.sql.gz',
        bytes: statSync(databaseArchive).size,
        sha256: await sha256(databaseArchive),
      },
      uploads: {
        file: 'uploads.tar.gz',
        bytes: statSync(uploadsArchive).size,
        sha256: await sha256(uploadsArchive),
      },
    },
  };
  const manifestPath = resolve(releaseDir, 'manifest.json');
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });

  await verifyManifest(manifestPath);
  console.log(
    JSON.stringify({ ok: true, releaseDir, manifestPath, manifest }, null, 2),
  );
}

async function verifyGzip(filePath) {
  await pipeline(
    createReadStream(filePath),
    createGunzip(),
    new Writable({
      write(_chunk, _encoding, callback) {
        callback();
      },
    }),
  );
}

async function verifyManifest(manifestPath) {
  if (!isAbsolute(manifestPath)) {
    fail('SPRINT3_BACKUP_MANIFEST must be an absolute path.');
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.formatVersion !== 1)
    fail('Unsupported backup manifest version.');

  const directory = dirname(manifestPath);
  for (const key of ['database', 'uploads']) {
    const artifact = manifest.artifacts?.[key];
    if (!artifact?.file || !artifact?.sha256) {
      fail(`Backup manifest is missing the ${key} artifact.`);
    }
    const filePath = resolve(directory, artifact.file);
    if (dirname(filePath) !== directory || !existsSync(filePath)) {
      fail(`Invalid or missing ${key} artifact.`);
    }
    if ((await sha256(filePath)) !== artifact.sha256) {
      fail(`${key} backup checksum does not match the manifest.`);
    }
  }

  await verifyGzip(resolve(directory, manifest.artifacts.database.file));
  command(
    'tar',
    ['-tzf', resolve(directory, manifest.artifacts.uploads.file)],
    { stdio: ['ignore', 'ignore', 'pipe'] },
  );
  return manifest;
}

async function verifyBackup() {
  const manifestPath = requireEnv('SPRINT3_BACKUP_MANIFEST');
  const manifest = await verifyManifest(manifestPath);
  console.log(
    JSON.stringify(
      {
        ok: true,
        verifiedAt: new Date().toISOString(),
        manifestPath,
        source: manifest.source,
        artifacts: manifest.artifacts,
      },
      null,
      2,
    ),
  );
}

async function readDeploymentBundle(manifestPath, git, verifyActiveBuilds) {
  if (!isAbsolute(manifestPath) || !existsSync(manifestPath)) {
    fail(
      'SPRINT3_DEPLOYMENT_BUNDLE_MANIFEST must be an absolute path to an existing manifest.',
    );
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (
    manifest.formatVersion !== 1 ||
    manifest.kind !== 'sprint3-deployment-bundle' ||
    manifest.ok !== true
  ) {
    fail('Deployment bundle manifest is invalid.');
  }
  if (git && manifest.source?.git?.commit !== git.commit) {
    fail('Deployment bundle references a different Git commit.');
  }
  const bundleDirectory = dirname(manifestPath);
  for (const key of ['backend', 'frontend']) {
    const artifact = manifest.artifacts?.[key];
    if (!artifact?.file || !artifact?.sha256 || !artifact?.buildFingerprint) {
      fail(`Deployment bundle is missing the ${key} artifact.`);
    }
    const artifactPath = resolve(bundleDirectory, artifact.file);
    if (
      !isPathWithin(bundleDirectory, artifactPath) ||
      !existsSync(artifactPath) ||
      !statSync(artifactPath).isFile()
    ) {
      fail(`Deployment bundle has an invalid ${key} artifact path.`);
    }
    if (statSync(artifactPath).size !== artifact.bytes) {
      fail(`Deployment bundle ${key} size mismatch.`);
    }
    if ((await sha256(artifactPath)) !== artifact.sha256) {
      fail(`Deployment bundle ${key} checksum mismatch.`);
    }
    command('tar', ['-tzf', artifactPath]);
  }

  if (verifyActiveBuilds) {
    const activeBuilds = {
      backend: await directoryFingerprint(resolve(backendRoot, 'dist')),
      frontend: await directoryFingerprint(
        resolve(repositoryRoot, 'frontend/dist'),
      ),
    };
    for (const key of ['backend', 'frontend']) {
      const expected = manifest.artifacts[key].buildFingerprint;
      if (
        expected.sha256 !== activeBuilds[key].sha256 ||
        expected.files !== activeBuilds[key].files ||
        expected.bytes !== activeBuilds[key].bytes
      ) {
        fail(`Active ${key} build does not match the deployment bundle.`);
      }
    }
  }
  return manifest;
}

async function packageDeployment() {
  if (
    process.env.SPRINT3_CONFIRM_DEPLOYMENT_PACKAGE !==
    'PACKAGE_BRICKY_DEPLOYMENT'
  ) {
    fail('Set SPRINT3_CONFIRM_DEPLOYMENT_PACKAGE=PACKAGE_BRICKY_DEPLOYMENT.');
  }
  const configuredOutputRoot = requireEnv('SPRINT3_DEPLOYMENT_BUNDLE_ROOT');
  if (!isAbsolute(configuredOutputRoot)) {
    fail('SPRINT3_DEPLOYMENT_BUNDLE_ROOT must be an absolute path.');
  }
  const outputRoot = resolve(configuredOutputRoot);
  if (isPathWithin(repositoryRoot, outputRoot)) {
    fail('Deployment bundles must be stored outside the Git worktree.');
  }
  const git = gitMetadata();
  if (git.dirty) {
    fail('The release worktree is dirty.');
  }
  const backendDist = resolve(backendRoot, 'dist');
  const frontendDist = resolve(repositoryRoot, 'frontend/dist');
  const backendFingerprint = await directoryFingerprint(backendDist);
  const frontendFingerprint = await directoryFingerprint(frontendDist);
  const releaseDirectory = resolve(
    outputRoot,
    `${timestamp()}-${git.commit.slice(0, 12)}`,
  );
  if (existsSync(releaseDirectory)) {
    fail(`Deployment bundle already exists: ${releaseDirectory}`);
  }
  mkdirSync(releaseDirectory, { recursive: true, mode: 0o700 });

  const backendArchive = resolve(releaseDirectory, 'backend-build.tar.gz');
  const frontendArchive = resolve(releaseDirectory, 'frontend-build.tar.gz');
  command('tar', [
    '-czf',
    backendArchive,
    '-C',
    repositoryRoot,
    'backend/dist',
    'backend/package.json',
    'backend/package-lock.json',
  ]);
  command('tar', [
    '-czf',
    frontendArchive,
    '-C',
    repositoryRoot,
    'frontend/dist',
  ]);

  const manifestPath = resolve(releaseDirectory, 'deployment-manifest.json');
  const manifest = {
    formatVersion: 1,
    kind: 'sprint3-deployment-bundle',
    ok: true,
    createdAt: new Date().toISOString(),
    source: {
      git,
      node: process.version,
    },
    artifacts: {
      backend: {
        file: 'backend-build.tar.gz',
        bytes: statSync(backendArchive).size,
        sha256: await sha256(backendArchive),
        buildFingerprint: backendFingerprint,
      },
      frontend: {
        file: 'frontend-build.tar.gz',
        bytes: statSync(frontendArchive).size,
        sha256: await sha256(frontendArchive),
        buildFingerprint: frontendFingerprint,
      },
    },
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  await readDeploymentBundle(manifestPath, git, true);
  console.log(
    JSON.stringify({ ...manifest, manifestPath, releaseDirectory }, null, 2),
  );
}

async function verifyDeploymentBundle() {
  const manifestPath = requireEnv('SPRINT3_DEPLOYMENT_BUNDLE_MANIFEST');
  const manifest = await readDeploymentBundle(manifestPath, null, false);
  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedAt: new Date().toISOString(),
        manifestPath: resolve(manifestPath),
        manifestSha256: await sha256(manifestPath),
        source: manifest.source,
        artifacts: manifest.artifacts,
      },
      null,
      2,
    ),
  );
}

async function restoreDatabase(databaseArchive, rehearsalDatabase) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    multipleStatements: true,
  });
  try {
    await connection.query(`DROP DATABASE IF EXISTS \`${rehearsalDatabase}\``);
    await connection.query(
      `CREATE DATABASE \`${rehearsalDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } finally {
    await connection.end();
  }

  const restore = spawn(
    'mysql',
    [
      `--host=${process.env.DB_HOST}`,
      `--port=${process.env.DB_PORT}`,
      `--user=${process.env.DB_USER}`,
      '--default-character-set=utf8mb4',
      rehearsalDatabase,
    ],
    {
      cwd: backendRoot,
      env: { ...process.env, MYSQL_PWD: process.env.DB_PASS },
      stdio: ['pipe', 'inherit', 'pipe'],
    },
  );
  let stderr = '';
  restore.stderr.setEncoding('utf8');
  restore.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  const exitPromise = new Promise((resolveExit, rejectExit) => {
    restore.once('error', rejectExit);
    restore.once('close', resolveExit);
  });
  await pipeline(
    createReadStream(databaseArchive),
    createGunzip(),
    restore.stdin,
  );
  const exitCode = await exitPromise;
  if (exitCode !== 0) fail(`mysql restore failed: ${stderr}`);
}

async function databaseFingerprint(database) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database,
  });
  try {
    const [tableRows] = await connection.query(
      `SELECT table_name
         FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_type = 'BASE TABLE'
        ORDER BY table_name`,
    );
    const [columnRows] = await connection.query(
      `SELECT table_name, column_name, ordinal_position, column_type,
              is_nullable, column_default, column_key, extra
         FROM information_schema.columns
        WHERE table_schema = DATABASE()
        ORDER BY table_name, ordinal_position`,
    );
    const tables = [];
    for (const row of tableRows) {
      const tableName = String(row.TABLE_NAME || row.table_name);
      const escapedTableName = tableName.replaceAll('`', '``');
      const [[countRow]] = await connection.query(
        `SELECT COUNT(*) AS rowCount FROM \`${escapedTableName}\``,
      );
      const [[checksumRow]] = await connection.query(
        `CHECKSUM TABLE \`${escapedTableName}\``,
      );
      tables.push({
        tableName,
        rowCount: Number(countRow.rowCount),
        checksum: checksumRow.Checksum ?? checksumRow.checksum ?? null,
      });
    }
    const snapshot = {
      tables,
      columns: columnRows.map((row) => ({
        tableName: row.TABLE_NAME || row.table_name,
        columnName: row.COLUMN_NAME || row.column_name,
        ordinalPosition: Number(row.ORDINAL_POSITION || row.ordinal_position),
        columnType: row.COLUMN_TYPE || row.column_type,
        isNullable: row.IS_NULLABLE || row.is_nullable,
        columnDefault: row.COLUMN_DEFAULT ?? row.column_default ?? null,
        columnKey: row.COLUMN_KEY || row.column_key,
        extra: row.EXTRA || row.extra,
      })),
    };
    return createHash('sha256').update(JSON.stringify(snapshot)).digest('hex');
  } finally {
    await connection.end();
  }
}

async function restoreRehearsal() {
  if (
    process.env.SPRINT3_CONFIRM_REHEARSAL_RESTORE !== 'RESTORE_BRICKY_REHEARSAL'
  ) {
    fail(
      'Set SPRINT3_CONFIRM_REHEARSAL_RESTORE=RESTORE_BRICKY_REHEARSAL to replace a rehearsal database.',
    );
  }
  const manifestPath = requireEnv('SPRINT3_BACKUP_MANIFEST');
  const rehearsalDatabase = requireEnv('SPRINT3_REHEARSAL_DATABASE');
  assertSafeDatabaseName(rehearsalDatabase, 'SPRINT3_REHEARSAL_DATABASE');
  if (!rehearsalDatabase.startsWith('bricky_sprint3_')) {
    fail('Rehearsal database must start with bricky_sprint3_.');
  }

  const manifest = await verifyManifest(manifestPath);
  const git = gitMetadata();
  assertReleaseGitMatchesManifest(git, manifest);
  if (rehearsalDatabase === manifest.source.database) {
    fail('Rehearsal database must not be the production database.');
  }

  const rehearsalRoot = resolve(requireEnv('SPRINT3_REHEARSAL_ROOT'));
  if (!/rehears/i.test(rehearsalRoot)) {
    fail('SPRINT3_REHEARSAL_ROOT must contain the word rehearsal.');
  }
  if (isPathWithin(manifest.source.uploadsDir, rehearsalRoot)) {
    fail('SPRINT3_REHEARSAL_ROOT must not be inside production uploads.');
  }
  if (existsSync(rehearsalRoot) && readdirSync(rehearsalRoot).length > 0) {
    fail('SPRINT3_REHEARSAL_ROOT must be empty before restore.');
  }
  mkdirSync(rehearsalRoot, { recursive: true });

  const backupDir = dirname(manifestPath);
  await restoreDatabase(
    resolve(backupDir, manifest.artifacts.database.file),
    rehearsalDatabase,
  );
  const preMigrationFingerprint = await databaseFingerprint(rehearsalDatabase);
  command('tar', [
    '-xzf',
    resolve(backupDir, manifest.artifacts.uploads.file),
    '-C',
    rehearsalRoot,
  ]);

  command('node', ['scripts/rehearse-sprint3-migrations.mjs'], {
    cwd: backendRoot,
    env: {
      ...process.env,
      SPRINT3_REHEARSAL_DATABASE: rehearsalDatabase,
      SPRINT3_REHEARSAL_RESET: '0',
    },
    stdio: 'inherit',
  });

  const restoredUploadsDir = resolve(
    rehearsalRoot,
    manifest.source.uploadsDir.split(/[\\/]/).at(-1),
  );
  if (
    restoredUploadsDir === rehearsalRoot ||
    !isPathWithin(rehearsalRoot, restoredUploadsDir)
  ) {
    fail('Restored uploads path is outside the rehearsal root.');
  }

  await restoreDatabase(
    resolve(backupDir, manifest.artifacts.database.file),
    rehearsalDatabase,
  );
  rmSync(restoredUploadsDir, { recursive: true, force: true });
  command('tar', [
    '-xzf',
    resolve(backupDir, manifest.artifacts.uploads.file),
    '-C',
    rehearsalRoot,
  ]);
  const rollbackFingerprint = await databaseFingerprint(rehearsalDatabase);
  if (rollbackFingerprint !== preMigrationFingerprint) {
    fail(
      'Rollback restore fingerprint does not match the original restored backup.',
    );
  }

  command('node', ['scripts/rehearse-sprint3-migrations.mjs'], {
    cwd: backendRoot,
    env: {
      ...process.env,
      SPRINT3_REHEARSAL_DATABASE: rehearsalDatabase,
      SPRINT3_REHEARSAL_RESET: '0',
    },
    stdio: 'inherit',
  });

  const report = {
    formatVersion: 1,
    ok: true,
    restoredAt: new Date().toISOString(),
    manifestPath: resolve(manifestPath),
    manifestSha256: await sha256(manifestPath),
    sourceGitCommit: manifest.source.git.commit,
    rehearsalDatabase,
    rehearsalRoot,
    restoredUploadsDir,
    migrationNames,
    migrationPasses: 4,
    forwardMigrationCycles: 2,
    schemaVerified: true,
    rollbackRestoreVerified: true,
    preMigrationFingerprint,
    rollbackFingerprint,
  };
  writeFileSync(
    resolve(rehearsalRoot, 'restore-report.json'),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
  console.log(JSON.stringify(report, null, 2));
}

async function readRehearsalEvidence(reportPath, manifestPath, manifest) {
  if (!isAbsolute(reportPath)) {
    fail('SPRINT3_RESTORE_REPORT must be an absolute path.');
  }
  if (!existsSync(reportPath)) {
    fail(`Rehearsal restore report does not exist: ${reportPath}`);
  }

  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  if (report.formatVersion !== 1 || report.ok !== true) {
    fail('Rehearsal restore report is invalid or unsuccessful.');
  }
  if (resolve(report.manifestPath || '') !== resolve(manifestPath)) {
    fail('Rehearsal restore report references a different backup manifest.');
  }
  if (report.manifestSha256 !== (await sha256(manifestPath))) {
    fail('Rehearsal restore report manifest checksum does not match.');
  }
  if (report.sourceGitCommit !== manifest.source.git.commit) {
    fail('Rehearsal restore report references a different Git commit.');
  }
  if (
    report.schemaVerified !== true ||
    report.migrationPasses !== 4 ||
    report.forwardMigrationCycles !== 2
  ) {
    fail('Rehearsal report does not prove repeatable schema verification.');
  }
  if (
    report.rollbackRestoreVerified !== true ||
    !report.preMigrationFingerprint ||
    report.preMigrationFingerprint !== report.rollbackFingerprint
  ) {
    fail('Rehearsal report does not prove a matching rollback restore.');
  }
  if (
    JSON.stringify(report.migrationNames) !== JSON.stringify(migrationNames)
  ) {
    fail('Rehearsal report was produced with a different migration set.');
  }

  return report;
}

async function certifyRehearsal() {
  if (
    process.env.SPRINT3_CONFIRM_REHEARSAL_CERTIFICATION !==
    'CERTIFY_BRICKY_REHEARSAL'
  ) {
    fail(
      'Set SPRINT3_CONFIRM_REHEARSAL_CERTIFICATION=CERTIFY_BRICKY_REHEARSAL to run the rehearsal certification gate.',
    );
  }

  validateProductionEnvironment({ requireTools: false });
  const manifestPath = requireEnv('SPRINT3_BACKUP_MANIFEST');
  const restoreReportPath = requireEnv('SPRINT3_RESTORE_REPORT');
  const apiUrl = requireEnv('SPRINT3_API_URL').replace(/\/+$/, '');
  const webUrl = requireEnv('SPRINT3_WEB_URL').replace(/\/+$/, '');
  const browserReportPath = resolve(requireEnv('SPRINT3_BROWSER_SMOKE_REPORT'));
  const browserSessionPath = resolve(
    process.env.SPRINT3_SMOKE_SESSION_FILE ||
      resolve(dirname(restoreReportPath), 'browser-session.json'),
  );
  if (existsSync(browserReportPath)) {
    fail(`Browser smoke report already exists: ${browserReportPath}`);
  }
  const manifest = await verifyManifest(manifestPath);
  const git = gitMetadata();
  assertReleaseGitMatchesManifest(git, manifest);
  const restoreReport = await readRehearsalEvidence(
    restoreReportPath,
    manifestPath,
    manifest,
  );

  if (process.env.DB_NAME !== restoreReport.rehearsalDatabase) {
    fail('DB_NAME must point to the restored rehearsal database.');
  }
  const uploadsDir = resolve(
    process.env.SPRINT3_UPLOADS_DIR || resolve(backendRoot, 'uploads'),
  );
  if (uploadsDir !== resolve(restoreReport.restoredUploadsDir)) {
    fail(
      'SPRINT3_UPLOADS_DIR must point to the uploads restored by the rehearsal.',
    );
  }
  if (!existsSync(uploadsDir) || !statSync(uploadsDir).isDirectory()) {
    fail(`Restored rehearsal uploads directory does not exist: ${uploadsDir}`);
  }

  const gateEnvironment = {
    ...process.env,
    SPRINT3_UPLOADS_DIR: uploadsDir,
    SPRINT3_API_URL: apiUrl,
    SPRINT3_WEB_URL: webUrl,
    SPRINT3_BROWSER_SMOKE_REPORT: browserReportPath,
    SPRINT3_SMOKE_SESSION_FILE: browserSessionPath,
    SPRINT3_EXPECTED_COMMIT_SHA: git.commit,
  };
  const startedAt = new Date().toISOString();
  command('node', ['scripts/verify-sprint3-schema.mjs'], {
    env: gateEnvironment,
    stdio: 'inherit',
  });
  command('node', ['scripts/verify-sprint3-integrity.mjs'], {
    env: gateEnvironment,
    stdio: 'inherit',
  });
  command('npm', ['audit', '--omit=dev', '--audit-level=high'], {
    env: gateEnvironment,
    stdio: 'inherit',
  });
  command('npm', ['test', '--', '--runInBand'], {
    env: gateEnvironment,
    stdio: 'inherit',
  });
  command('npm', ['run', 'build'], {
    env: gateEnvironment,
    stdio: 'inherit',
  });
  command('npm', ['run', 'audit:production'], {
    cwd: resolve(repositoryRoot, 'frontend'),
    env: gateEnvironment,
    stdio: 'inherit',
  });
  command('npm', ['run', 'lint'], {
    cwd: resolve(repositoryRoot, 'frontend'),
    env: gateEnvironment,
    stdio: 'inherit',
  });
  command('npm', ['run', 'build'], {
    cwd: resolve(repositoryRoot, 'frontend'),
    env: gateEnvironment,
    stdio: 'inherit',
  });
  command('node', ['scripts/smoke-sprint3-api.mjs'], {
    env: gateEnvironment,
    stdio: 'inherit',
  });
  try {
    command('npm', ['run', 'smoke:browser:sprint3'], {
      cwd: resolve(repositoryRoot, 'frontend'),
      env: gateEnvironment,
      stdio: 'inherit',
    });
  } finally {
    rmSync(browserSessionPath, { force: true });
  }
  const browserSmoke = readBrowserSmokeEvidence(browserReportPath, {
    webBase: webUrl,
    expectedCommit: git.commit,
    checkedAfter: startedAt,
  });

  const certificatePath = resolve(
    dirname(restoreReportPath),
    'rehearsal-certificate.json',
  );
  if (existsSync(certificatePath)) {
    fail(`Rehearsal certificate already exists: ${certificatePath}`);
  }
  const certificate = {
    formatVersion: 1,
    ok: true,
    startedAt,
    certifiedAt: new Date().toISOString(),
    sourceGitCommit: manifest.source.git.commit,
    manifestPath: resolve(manifestPath),
    manifestSha256: await sha256(manifestPath),
    restoreReportPath: resolve(restoreReportPath),
    restoreReportSha256: await sha256(restoreReportPath),
    rehearsalDatabase: restoreReport.rehearsalDatabase,
    restoredUploadsDir: uploadsDir,
    apiUrl,
    webUrl,
    migrationNames,
    browserSmokeReportPath: browserReportPath,
    browserSmokeReportSha256: await sha256(browserReportPath),
    browserSmoke,
    gates: [
      'schema',
      'integrity',
      'rollback-restore',
      'backend-audit',
      'backend-tests',
      'backend-build',
      'frontend-audit',
      'frontend-lint',
      'frontend-build',
      'api-smoke',
      'browser-smoke',
    ],
  };
  writeFileSync(certificatePath, `${JSON.stringify(certificate, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  console.log(JSON.stringify({ ...certificate, certificatePath }, null, 2));
}

async function readRehearsalCertificate(
  certificatePath,
  restoreReportPath,
  manifestPath,
  manifest,
) {
  if (!isAbsolute(certificatePath) || !existsSync(certificatePath)) {
    fail(
      'SPRINT3_REHEARSAL_CERTIFICATE must be an absolute path to an existing certificate.',
    );
  }
  const certificate = JSON.parse(readFileSync(certificatePath, 'utf8'));
  if (certificate.formatVersion !== 1 || certificate.ok !== true) {
    fail('Rehearsal certificate is invalid or unsuccessful.');
  }
  if (certificate.sourceGitCommit !== manifest.source.git.commit) {
    fail('Rehearsal certificate references a different Git commit.');
  }
  if (
    resolve(certificate.manifestPath || '') !== resolve(manifestPath) ||
    certificate.manifestSha256 !== (await sha256(manifestPath))
  ) {
    fail('Rehearsal certificate does not match the backup manifest.');
  }
  if (
    resolve(certificate.restoreReportPath || '') !==
      resolve(restoreReportPath) ||
    certificate.restoreReportSha256 !== (await sha256(restoreReportPath))
  ) {
    fail('Rehearsal certificate does not match the restore report.');
  }
  const restoreReport = JSON.parse(readFileSync(restoreReportPath, 'utf8'));
  if (
    certificate.rehearsalDatabase !== restoreReport.rehearsalDatabase ||
    resolve(certificate.restoredUploadsDir || '') !==
      resolve(restoreReport.restoredUploadsDir || '')
  ) {
    fail('Rehearsal certificate targets different restored data.');
  }
  const requiredGates = [
    'schema',
    'integrity',
    'rollback-restore',
    'backend-audit',
    'backend-tests',
    'backend-build',
    'frontend-audit',
    'frontend-lint',
    'frontend-build',
    'api-smoke',
    'browser-smoke',
  ];
  if (!requiredGates.every((gate) => certificate.gates?.includes(gate))) {
    fail('Rehearsal certificate is missing required release gates.');
  }
  if (
    JSON.stringify(certificate.migrationNames) !==
    JSON.stringify(migrationNames)
  ) {
    fail('Rehearsal certificate was produced with a different migration set.');
  }
  if (
    !certificate.browserSmokeReportPath ||
    !existsSync(certificate.browserSmokeReportPath) ||
    certificate.browserSmokeReportSha256 !==
      (await sha256(certificate.browserSmokeReportPath))
  ) {
    fail('Rehearsal certificate browser smoke evidence is missing or changed.');
  }
  readBrowserSmokeEvidence(certificate.browserSmokeReportPath, {
    webBase: certificate.webUrl,
    expectedCommit: certificate.sourceGitCommit,
    checkedAfter: certificate.startedAt,
  });
  return certificate;
}

async function migrateProduction() {
  if (
    process.env.SPRINT3_CONFIRM_PRODUCTION_MIGRATION !==
    'MIGRATE_BRICKY_PRODUCTION'
  ) {
    fail(
      'Set SPRINT3_CONFIRM_PRODUCTION_MIGRATION=MIGRATE_BRICKY_PRODUCTION to apply production migrations.',
    );
  }

  validateProductionEnvironment();
  const manifestPath = requireEnv('SPRINT3_BACKUP_MANIFEST');
  const restoreReportPath = requireEnv('SPRINT3_RESTORE_REPORT');
  const certificatePath = requireEnv('SPRINT3_REHEARSAL_CERTIFICATE');
  const manifest = await verifyManifest(manifestPath);
  const git = gitMetadata();
  assertReleaseGitMatchesManifest(git, manifest);

  if (manifest.source.database !== process.env.DB_NAME) {
    fail('Backup manifest source database does not match DB_NAME.');
  }
  if (manifest.source.databaseHost !== process.env.DB_HOST) {
    fail('Backup manifest source host does not match DB_HOST.');
  }

  const restoreReport = await readRehearsalEvidence(
    restoreReportPath,
    manifestPath,
    manifest,
  );
  const certificate = await readRehearsalCertificate(
    certificatePath,
    restoreReportPath,
    manifestPath,
    manifest,
  );
  const startedAt = new Date().toISOString();

  command('node', ['scripts/rehearse-sprint3-migrations.mjs'], {
    cwd: backendRoot,
    env: {
      ...process.env,
      SPRINT3_REHEARSAL_DATABASE: process.env.DB_NAME,
      SPRINT3_REHEARSAL_RESET: '0',
    },
    stdio: 'inherit',
  });
  command('node', ['scripts/verify-sprint3-integrity.mjs'], {
    cwd: backendRoot,
    env: {
      ...process.env,
      SPRINT3_UPLOADS_DIR:
        process.env.SPRINT3_UPLOADS_DIR || resolve(backendRoot, 'uploads'),
    },
    stdio: 'inherit',
  });

  const reportPath = resolve(
    dirname(manifestPath),
    'production-migration-report.json',
  );
  if (existsSync(reportPath)) {
    fail(`Production migration report already exists: ${reportPath}`);
  }
  const report = {
    formatVersion: 1,
    ok: true,
    startedAt,
    completedAt: new Date().toISOString(),
    database: process.env.DB_NAME,
    databaseHost: process.env.DB_HOST,
    git,
    manifestPath: resolve(manifestPath),
    manifestSha256: await sha256(manifestPath),
    rehearsalReportPath: resolve(restoreReportPath),
    rehearsalReportSha256: await sha256(restoreReportPath),
    rehearsalCertificatePath: resolve(certificatePath),
    rehearsalCertificateSha256: await sha256(certificatePath),
    rehearsalDatabase: restoreReport.rehearsalDatabase,
    rehearsalCertifiedAt: certificate.certifiedAt,
    migrationNames,
    migrationPasses: 2,
    schemaVerified: true,
    integrityVerified: true,
    rollbackRestoreVerified: restoreReport.rollbackRestoreVerified,
    rollbackFingerprint: restoreReport.rollbackFingerprint,
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
}

async function readProductionMigrationEvidence(reportPath, git) {
  if (!isAbsolute(reportPath) || !existsSync(reportPath)) {
    fail(
      'SPRINT3_PRODUCTION_MIGRATION_REPORT must be an absolute path to an existing report.',
    );
  }
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  if (
    report.formatVersion !== 1 ||
    report.ok !== true ||
    report.schemaVerified !== true ||
    report.integrityVerified !== true ||
    report.rollbackRestoreVerified !== true ||
    !report.rollbackFingerprint
  ) {
    fail('Production migration report is invalid or unsuccessful.');
  }
  if (report.git?.commit !== git.commit) {
    fail('Production migration report references a different Git commit.');
  }
  if (
    report.database !== process.env.DB_NAME ||
    report.databaseHost !== process.env.DB_HOST
  ) {
    fail('Production migration report targets a different database.');
  }
  if (
    JSON.stringify(report.migrationNames) !== JSON.stringify(migrationNames)
  ) {
    fail('Production migration report used a different migration set.');
  }
  for (const evidence of [
    ['manifest', report.manifestPath, report.manifestSha256],
    [
      'restore report',
      report.rehearsalReportPath,
      report.rehearsalReportSha256,
    ],
    [
      'rehearsal certificate',
      report.rehearsalCertificatePath,
      report.rehearsalCertificateSha256,
    ],
  ]) {
    const [label, evidencePath, checksum] = evidence;
    if (
      !evidencePath ||
      !isAbsolute(evidencePath) ||
      !existsSync(evidencePath) ||
      checksum !== (await sha256(evidencePath))
    ) {
      fail(`Production migration report has invalid ${label} evidence.`);
    }
  }
  return report;
}

async function deploymentPreflight({
  verifyActiveBuilds = true,
  emitResult = true,
} = {}) {
  validateProductionEnvironment({ requireTools: false });
  const git = gitMetadata();
  if (git.dirty) {
    fail('The deployment worktree is dirty.');
  }
  const migrationReportPath = requireEnv('SPRINT3_PRODUCTION_MIGRATION_REPORT');
  const migrationReport = await readProductionMigrationEvidence(
    migrationReportPath,
    git,
  );
  const deploymentBundleManifestPath = requireEnv(
    'SPRINT3_DEPLOYMENT_BUNDLE_MANIFEST',
  );
  const deploymentBundle = await readDeploymentBundle(
    deploymentBundleManifestPath,
    git,
    verifyActiveBuilds,
  );

  const backendEntry = resolve(backendRoot, 'dist/main.js');
  const frontendEntry = resolve(repositoryRoot, 'frontend/dist/index.html');
  for (const artifact of [backendEntry, frontendEntry]) {
    if (!existsSync(artifact) || !statSync(artifact).isFile()) {
      fail(`Required deployment artifact is missing: ${artifact}`);
    }
  }
  for (const tool of ['pm2', 'nginx']) {
    if (!commandAvailable(tool)) {
      fail(`${tool} is required for deployment preflight.`);
    }
  }

  const processName =
    process.env.SPRINT3_PM2_PROCESS_NAME?.trim() || 'bricky-backend';
  const processes = JSON.parse(command('pm2', ['jlist']));
  const pm2Process = processes.find((entry) => entry.name === processName);
  if (!pm2Process) {
    fail(`PM2 process does not exist: ${processName}`);
  }
  if (pm2Process.pm2_env?.status !== 'online') {
    fail(`PM2 process ${processName} is not online.`);
  }
  if (resolve(pm2Process.pm2_env?.pm_exec_path || '') !== backendEntry) {
    fail(`PM2 process ${processName} points to a different backend entry.`);
  }

  command('nginx', ['-t'], { combineOutput: true });
  const nginxConfig = command('nginx', ['-T'], { combineOutput: true });
  const normalizedFrontendDist = resolve(
    repositoryRoot,
    'frontend/dist',
  ).replaceAll('\\', '/');
  if (!nginxConfig.replaceAll('\\', '/').includes(normalizedFrontendDist)) {
    fail('nginx does not reference the current frontend/dist directory.');
  }
  const backendPort = Number(process.env.PORT || 3000);
  if (!nginxConfig.includes(`127.0.0.1:${backendPort}`)) {
    fail(`nginx does not proxy to the configured backend port ${backendPort}.`);
  }

  const result = {
    ok: true,
    checkedAt: new Date().toISOString(),
    git,
    migrationReportPath: resolve(migrationReportPath),
    migrationCompletedAt: migrationReport.completedAt,
    deploymentBundleManifestPath: resolve(deploymentBundleManifestPath),
    deploymentBundleManifestSha256: await sha256(deploymentBundleManifestPath),
    deploymentBundleCreatedAt: deploymentBundle.createdAt,
    activeBuildsVerified: verifyActiveBuilds,
    backendEntry,
    frontendEntry,
    pm2: {
      name: processName,
      status: pm2Process.pm2_env.status,
      pid: pm2Process.pid,
    },
    nginx: {
      frontendDist: normalizedFrontendDist,
      backendPort,
    },
  };
  if (emitResult) {
    console.log(JSON.stringify(result, null, 2));
  }
  return result;
}

async function activateDeployment() {
  if (
    process.env.SPRINT3_CONFIRM_DEPLOYMENT_ACTIVATION !==
    'ACTIVATE_BRICKY_DEPLOYMENT'
  ) {
    fail(
      'Set SPRINT3_CONFIRM_DEPLOYMENT_ACTIVATION=ACTIVATE_BRICKY_DEPLOYMENT.',
    );
  }
  if (process.platform === 'win32') {
    fail('Deployment activation must run on the Linux production host.');
  }

  const activationRoot = resolve(
    requireEnv('SPRINT3_DEPLOYMENT_ACTIVATION_ROOT'),
  );
  if (
    !isAbsolute(activationRoot) ||
    isPathWithin(repositoryRoot, activationRoot)
  ) {
    fail(
      'SPRINT3_DEPLOYMENT_ACTIVATION_ROOT must be absolute and outside the Git worktree.',
    );
  }

  const preflight = await deploymentPreflight({
    verifyActiveBuilds: false,
    emitResult: false,
  });
  const git = preflight.git;
  const manifestPath = preflight.deploymentBundleManifestPath;
  const manifest = await readDeploymentBundle(manifestPath, git, false);
  const bundleDirectory = dirname(manifestPath);
  const operationRoot = resolve(
    activationRoot,
    `${timestamp()}-${git.commit.slice(0, 12)}`,
  );
  if (existsSync(operationRoot)) {
    fail(`Deployment activation already exists: ${operationRoot}`);
  }
  mkdirSync(operationRoot, { recursive: true, mode: 0o700 });

  const activeBackend = resolve(backendRoot, 'dist');
  const activeFrontend = resolve(repositoryRoot, 'frontend/dist');
  if (
    statSync(operationRoot).dev !== statSync(dirname(activeBackend)).dev ||
    statSync(operationRoot).dev !== statSync(dirname(activeFrontend)).dev
  ) {
    fail(
      'Activation root and active build directories must use the same filesystem.',
    );
  }

  const stagedRoot = resolve(operationRoot, 'staged');
  mkdirSync(stagedRoot, { recursive: true, mode: 0o700 });
  for (const key of ['backend', 'frontend']) {
    command('tar', [
      '-xzf',
      resolve(bundleDirectory, manifest.artifacts[key].file),
      '-C',
      stagedRoot,
    ]);
  }

  const stagedBackend = resolve(stagedRoot, 'backend/dist');
  const stagedFrontend = resolve(stagedRoot, 'frontend/dist');
  const stagedFingerprints = {
    backend: await directoryFingerprint(stagedBackend),
    frontend: await directoryFingerprint(stagedFrontend),
  };
  for (const key of ['backend', 'frontend']) {
    if (
      !fingerprintsMatch(
        stagedFingerprints[key],
        manifest.artifacts[key].buildFingerprint,
      )
    ) {
      fail(`Staged ${key} build does not match the deployment manifest.`);
    }
  }

  const previousFingerprints = {
    backend: await directoryFingerprint(activeBackend),
    frontend: await directoryFingerprint(activeFrontend),
  };
  const rollbackBackend = resolve(operationRoot, 'rollback/backend-dist');
  const rollbackFrontend = resolve(operationRoot, 'rollback/frontend-dist');
  let activated = false;
  try {
    activateBuildDirectories({
      activeBackend,
      activeFrontend,
      stagedBackend,
      stagedFrontend,
      rollbackBackend,
      rollbackFrontend,
    });
    activated = true;
    const activatedFingerprints = {
      backend: await directoryFingerprint(activeBackend),
      frontend: await directoryFingerprint(activeFrontend),
    };
    for (const key of ['backend', 'frontend']) {
      if (
        !fingerprintsMatch(
          activatedFingerprints[key],
          manifest.artifacts[key].buildFingerprint,
        )
      ) {
        fail(`Activated ${key} build does not match the deployment manifest.`);
      }
    }

    const verifiedPreflight = await deploymentPreflight({
      verifyActiveBuilds: true,
      emitResult: false,
    });
    const report = {
      formatVersion: 1,
      kind: 'sprint3-deployment-activation',
      ok: true,
      activatedAt: new Date().toISOString(),
      git,
      manifestPath,
      manifestSha256: await sha256(manifestPath),
      operationRoot,
      previousFingerprints,
      activatedFingerprints,
      rollback: {
        backend: rollbackBackend,
        frontend: rollbackFrontend,
      },
      preflight: verifiedPreflight,
    };
    const reportPath = resolve(operationRoot, 'activation-report.json');
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    console.log(JSON.stringify({ ...report, reportPath }, null, 2));
  } catch (error) {
    if (activated) {
      restoreActivatedBuildDirectories({
        activeBackend,
        activeFrontend,
        rollbackBackend,
        rollbackFrontend,
        failedRoot: resolve(stagedRoot, 'failed'),
      });
    }
    throw error;
  }
}

async function readDeploymentActivationEvidence(
  reportPath,
  git,
  manifestPath,
  manifest,
) {
  if (!isAbsolute(reportPath) || !existsSync(reportPath)) {
    fail(
      'SPRINT3_DEPLOYMENT_ACTIVATION_REPORT must be an absolute path to an existing report.',
    );
  }
  const report = JSON.parse(readFileSync(reportPath, 'utf8'));
  const activatedAt = Date.parse(report.activatedAt);
  if (
    report.formatVersion !== 1 ||
    report.kind !== 'sprint3-deployment-activation' ||
    report.ok !== true ||
    report.git?.commit !== git.commit ||
    resolve(report.manifestPath || '') !== resolve(manifestPath) ||
    report.manifestSha256 !== (await sha256(manifestPath)) ||
    !Number.isFinite(activatedAt) ||
    report.preflight?.ok !== true ||
    report.preflight?.activeBuildsVerified !== true ||
    report.preflight?.git?.commit !== git.commit
  ) {
    fail('Deployment activation report is invalid or incomplete.');
  }
  for (const key of ['backend', 'frontend']) {
    if (
      !fingerprintsMatch(
        report.activatedFingerprints?.[key],
        manifest.artifacts[key].buildFingerprint,
      )
    ) {
      fail(`Deployment activation report has an invalid ${key} fingerprint.`);
    }
    const rollbackPath = report.rollback?.[key];
    if (
      !rollbackPath ||
      !isAbsolute(rollbackPath) ||
      !existsSync(rollbackPath) ||
      !statSync(rollbackPath).isDirectory()
    ) {
      fail(`Deployment activation report has no ${key} rollback build.`);
    }
    if (
      !fingerprintsMatch(
        report.previousFingerprints?.[key],
        await directoryFingerprint(rollbackPath),
      )
    ) {
      fail(`Deployment activation report has a damaged ${key} rollback build.`);
    }
  }
  return report;
}

async function acceptProduction() {
  if (
    process.env.SPRINT3_CONFIRM_PRODUCTION_ACCEPTANCE !==
    'ACCEPT_BRICKY_PRODUCTION'
  ) {
    fail('Set SPRINT3_CONFIRM_PRODUCTION_ACCEPTANCE=ACCEPT_BRICKY_PRODUCTION.');
  }
  const suspendedUserToken = requireEnv('SPRINT3_SUSPENDED_USER_TOKEN');
  const publicUrl = requireEnv('SPRINT3_PUBLIC_URL');
  const migrationReportPath = requireEnv('SPRINT3_PRODUCTION_MIGRATION_REPORT');
  const browserReportPath = requireEnv('SPRINT3_BROWSER_SMOKE_REPORT');
  const activationReportPath = requireEnv(
    'SPRINT3_DEPLOYMENT_ACTIVATION_REPORT',
  );
  const git = gitMetadata();
  const migrationReport = await readProductionMigrationEvidence(
    migrationReportPath,
    git,
  );
  const deployment = await deploymentPreflight();
  const deploymentBundle = await readDeploymentBundle(
    deployment.deploymentBundleManifestPath,
    git,
    true,
  );
  const activation = await readDeploymentActivationEvidence(
    activationReportPath,
    git,
    deployment.deploymentBundleManifestPath,
    deploymentBundle,
  );
  const smokeOutput = command('node', ['scripts/smoke-sprint3-public.mjs'], {
    env: {
      ...process.env,
      SPRINT3_PUBLIC_URL: publicUrl,
      SPRINT3_EXPECTED_COMMIT_SHA: git.commit,
      SPRINT3_SUSPENDED_USER_TOKEN: suspendedUserToken,
    },
  });
  const smoke = JSON.parse(smokeOutput);
  if (
    smoke.ok !== true ||
    smoke.readiness?.commit !== git.commit ||
    smoke.expectedCommit !== git.commit ||
    smoke.suspendedTokenRejected !== true ||
    !Array.isArray(smoke.checkedRoutes) ||
    !['/', '/workers', '/requests', '/worker/profile', '/client/profile'].every(
      (route) => smoke.checkedRoutes.includes(route),
    )
  ) {
    fail('Public production smoke evidence is incomplete.');
  }
  const browserSmoke = readBrowserSmokeEvidence(browserReportPath, {
    webBase: publicUrl,
    expectedCommit: git.commit,
    checkedAfter: activation.activatedAt,
  });

  const reportPath = resolve(
    process.env.SPRINT3_POST_DEPLOY_REPORT ||
      resolve(dirname(migrationReportPath), 'post-deploy-report.json'),
  );
  if (existsSync(reportPath)) {
    fail(`Post-deploy report already exists: ${reportPath}`);
  }
  const migrationCompletedAt = Date.parse(migrationReport.completedAt);
  const deploymentActivatedAt = Date.parse(activation.activatedAt);
  const smokeCheckedAt = Date.parse(smoke.checkedAt);
  if (
    !Number.isFinite(migrationCompletedAt) ||
    !Number.isFinite(deploymentActivatedAt) ||
    !Number.isFinite(smokeCheckedAt) ||
    smokeCheckedAt < migrationCompletedAt ||
    smokeCheckedAt < deploymentActivatedAt
  ) {
    fail(
      'Post-deploy smoke was not completed after migration and build activation.',
    );
  }

  const report = {
    formatVersion: 1,
    ok: true,
    acceptedAt: new Date().toISOString(),
    publicUrl,
    git,
    productionMigrationReportPath: resolve(migrationReportPath),
    productionMigrationReportSha256: await sha256(migrationReportPath),
    deployment,
    deploymentActivationReportPath: resolve(activationReportPath),
    deploymentActivationReportSha256: await sha256(activationReportPath),
    activation,
    smoke,
    browserSmokeReportPath: resolve(browserReportPath),
    browserSmokeReportSha256: await sha256(browserReportPath),
    browserSmoke,
    gates: [
      'migration-evidence-chain',
      'atomic-build-activation',
      'rollback-build-preservation',
      'deployment-preflight',
      'readiness',
      'deployed-commit',
      'spa-routes',
      'public-assets',
      'public-worker-privacy',
      'public-media',
      'suspended-token-rejection',
      'authenticated-browser-routes',
      'browser-console-and-network',
      'worker-map-return-navigation',
    ],
  };
  writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
    encoding: 'utf8',
    mode: 0o600,
  });
  console.log(JSON.stringify({ ...report, reportPath }, null, 2));
}

async function selfTest() {
  assertSafeDatabaseName('bricky_sprint3_rehearsal');
  assertReleaseGitMatchesManifest(
    { commit: 'release-commit', dirty: false },
    { source: { git: { commit: 'release-commit' } } },
  );
  if (!isPathWithin('/srv/bricky/uploads', '/srv/bricky/uploads/rehearsal')) {
    fail('Path containment guard failed.');
  }
  if (isPathWithin('/srv/bricky/uploads', '/srv/bricky/rehearsal')) {
    fail('Path containment guard produced a false positive.');
  }
  for (const unsafe of ['bricky-prod', 'bricky prod', 'bricky;DROP']) {
    try {
      assertSafeDatabaseName(unsafe);
      fail(`Unsafe database name was accepted: ${unsafe}`);
    } catch (error) {
      if (String(error.message).startsWith('Unsafe database')) throw error;
    }
  }
  for (const unsafeGit of [
    { commit: 'release-commit', dirty: true },
    { commit: 'different-commit', dirty: false },
  ]) {
    let rejected = false;
    try {
      assertReleaseGitMatchesManifest(unsafeGit, {
        source: { git: { commit: 'release-commit' } },
      });
    } catch {
      rejected = true;
    }
    if (!rejected) {
      fail(
        `Unsafe release Git state was accepted: ${JSON.stringify(unsafeGit)}`,
      );
    }
  }
  const browserReportPath = resolve(
    tmpdir(),
    `bricky-sprint3-browser-self-test-${process.pid}.json`,
  );
  const browserReport = {
    formatVersion: 1,
    ok: true,
    checkedAt: '2026-07-27T10:00:00.000Z',
    webBase: 'https://bricky.test',
    expectedCommit: 'release-commit',
    readiness: { commit: 'release-commit' },
    checkedRoutes: [
      '/',
      '/workers',
      '/requests',
      '/blog',
      '/client/profile',
      '/worker/profile',
      '/admin',
      '/repair-map',
    ],
    authenticatedRoles: ['client', 'worker', 'admin'],
    anonymousAdminRejected: true,
    mapReturnVerified: true,
    browserErrors: [],
  };
  try {
    writeFileSync(browserReportPath, JSON.stringify(browserReport));
    readBrowserSmokeEvidence(browserReportPath, {
      webBase: 'https://bricky.test',
      expectedCommit: 'release-commit',
      checkedAfter: '2026-07-27T09:59:00.000Z',
    });
    writeFileSync(
      browserReportPath,
      JSON.stringify({ ...browserReport, browserErrors: ['console error'] }),
    );
    let invalidReportRejected = false;
    try {
      readBrowserSmokeEvidence(browserReportPath, {
        webBase: 'https://bricky.test',
        expectedCommit: 'release-commit',
      });
    } catch {
      invalidReportRejected = true;
    }
    if (!invalidReportRejected) {
      fail('Invalid browser smoke evidence passed the release self-test.');
    }
  } finally {
    rmSync(browserReportPath, { force: true });
  }
  const temporaryRoot = resolve(
    process.env.TEMP || process.env.TMPDIR || '/tmp',
    `bricky-sprint3-release-self-test-${process.pid}`,
  );
  rmSync(temporaryRoot, { recursive: true, force: true });
  try {
    const first = resolve(temporaryRoot, 'first');
    const second = resolve(temporaryRoot, 'second');
    mkdirSync(first, { recursive: true });
    mkdirSync(second, { recursive: true });
    writeFileSync(resolve(first, 'index.js'), 'same-build\n');
    writeFileSync(resolve(second, 'index.js'), 'same-build\n');
    const firstFingerprint = await directoryFingerprint(first);
    const secondFingerprint = await directoryFingerprint(second);
    if (
      JSON.stringify(firstFingerprint) !== JSON.stringify(secondFingerprint)
    ) {
      fail('Equal build directories produced different fingerprints.');
    }
    writeFileSync(resolve(second, 'index.js'), 'changed-build\n');
    if (
      (await directoryFingerprint(second)).sha256 === firstFingerprint.sha256
    ) {
      fail('Changed build directory kept the same fingerprint.');
    }

    const activation = resolve(temporaryRoot, 'activation');
    const activeBackend = resolve(activation, 'active/backend-dist');
    const activeFrontend = resolve(activation, 'active/frontend-dist');
    const stagedBackend = resolve(activation, 'staged/backend-dist');
    const stagedFrontend = resolve(activation, 'staged/frontend-dist');
    const rollbackBackend = resolve(activation, 'rollback/backend-dist');
    const rollbackFrontend = resolve(activation, 'rollback/frontend-dist');
    for (const directory of [
      activeBackend,
      activeFrontend,
      stagedBackend,
      stagedFrontend,
    ]) {
      mkdirSync(directory, { recursive: true });
    }
    writeFileSync(resolve(activeBackend, 'build.txt'), 'old-backend\n');
    writeFileSync(resolve(activeFrontend, 'build.txt'), 'old-frontend\n');
    writeFileSync(resolve(stagedBackend, 'build.txt'), 'new-backend\n');
    writeFileSync(resolve(stagedFrontend, 'build.txt'), 'new-frontend\n');
    const testPreviousFingerprints = {
      backend: await directoryFingerprint(activeBackend),
      frontend: await directoryFingerprint(activeFrontend),
    };
    activateBuildDirectories({
      activeBackend,
      activeFrontend,
      stagedBackend,
      stagedFrontend,
      rollbackBackend,
      rollbackFrontend,
    });
    if (
      readFileSync(resolve(activeBackend, 'build.txt'), 'utf8') !==
        'new-backend\n' ||
      readFileSync(resolve(activeFrontend, 'build.txt'), 'utf8') !==
        'new-frontend\n'
    ) {
      fail('Build activation did not publish both staged builds.');
    }
    const activationManifestPath = resolve(
      activation,
      'deployment-manifest.json',
    );
    const activationReportPath = resolve(activation, 'activation-report.json');
    const activationGit = {
      commit: 'release-commit',
      branch: 'release-branch',
      dirty: false,
    };
    const activationManifest = {
      artifacts: {
        backend: {
          buildFingerprint: await directoryFingerprint(activeBackend),
        },
        frontend: {
          buildFingerprint: await directoryFingerprint(activeFrontend),
        },
      },
    };
    writeFileSync(
      activationManifestPath,
      `${JSON.stringify(activationManifest)}\n`,
    );
    writeFileSync(
      activationReportPath,
      `${JSON.stringify({
        formatVersion: 1,
        kind: 'sprint3-deployment-activation',
        ok: true,
        activatedAt: '2026-07-27T10:00:00.000Z',
        git: activationGit,
        manifestPath: activationManifestPath,
        manifestSha256: await sha256(activationManifestPath),
        previousFingerprints: testPreviousFingerprints,
        activatedFingerprints: {
          backend: await directoryFingerprint(activeBackend),
          frontend: await directoryFingerprint(activeFrontend),
        },
        rollback: {
          backend: rollbackBackend,
          frontend: rollbackFrontend,
        },
        preflight: {
          ok: true,
          activeBuildsVerified: true,
          git: activationGit,
        },
      })}\n`,
    );
    await readDeploymentActivationEvidence(
      activationReportPath,
      activationGit,
      activationManifestPath,
      activationManifest,
    );
    const validActivationReport = readFileSync(activationReportPath, 'utf8');
    const tamperedActivationReport = JSON.parse(validActivationReport);
    tamperedActivationReport.activatedFingerprints.backend.sha256 =
      'tampered-build';
    writeFileSync(
      activationReportPath,
      `${JSON.stringify(tamperedActivationReport)}\n`,
    );
    let tamperedActivationRejected = false;
    try {
      await readDeploymentActivationEvidence(
        activationReportPath,
        activationGit,
        activationManifestPath,
        activationManifest,
      );
    } catch {
      tamperedActivationRejected = true;
    }
    if (!tamperedActivationRejected) {
      fail('Tampered deployment activation evidence passed the self-test.');
    }
    writeFileSync(activationReportPath, validActivationReport);
    restoreActivatedBuildDirectories({
      activeBackend,
      activeFrontend,
      rollbackBackend,
      rollbackFrontend,
      failedRoot: resolve(activation, 'failed'),
    });
    if (
      readFileSync(resolve(activeBackend, 'build.txt'), 'utf8') !==
        'old-backend\n' ||
      readFileSync(resolve(activeFrontend, 'build.txt'), 'utf8') !==
        'old-frontend\n'
    ) {
      fail('Build activation rollback did not restore both previous builds.');
    }

    const failedActivation = resolve(temporaryRoot, 'failed-activation');
    const failedActiveBackend = resolve(
      failedActivation,
      'active/backend-dist',
    );
    const failedActiveFrontend = resolve(
      failedActivation,
      'active/frontend-dist',
    );
    const failedStagedBackend = resolve(
      failedActivation,
      'staged/backend-dist',
    );
    const missingStagedFrontend = resolve(
      failedActivation,
      'staged/frontend-dist',
    );
    for (const directory of [
      failedActiveBackend,
      failedActiveFrontend,
      failedStagedBackend,
    ]) {
      mkdirSync(directory, { recursive: true });
    }
    writeFileSync(resolve(failedActiveBackend, 'build.txt'), 'old-backend\n');
    writeFileSync(resolve(failedActiveFrontend, 'build.txt'), 'old-frontend\n');
    writeFileSync(resolve(failedStagedBackend, 'build.txt'), 'new-backend\n');
    let partialActivationRejected = false;
    try {
      activateBuildDirectories({
        activeBackend: failedActiveBackend,
        activeFrontend: failedActiveFrontend,
        stagedBackend: failedStagedBackend,
        stagedFrontend: missingStagedFrontend,
        rollbackBackend: resolve(failedActivation, 'rollback/backend-dist'),
        rollbackFrontend: resolve(failedActivation, 'rollback/frontend-dist'),
      });
    } catch {
      partialActivationRejected = true;
    }
    if (
      !partialActivationRejected ||
      readFileSync(resolve(failedActiveBackend, 'build.txt'), 'utf8') !==
        'old-backend\n' ||
      readFileSync(resolve(failedActiveFrontend, 'build.txt'), 'utf8') !==
        'old-frontend\n'
    ) {
      fail('Partial build activation was not rolled back safely.');
    }
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
  console.log(JSON.stringify({ ok: true, action: 'self-test' }, null, 2));
}

const actions = {
  preflight,
  backup,
  verify: verifyBackup,
  'package-deployment': packageDeployment,
  'verify-deployment-bundle': verifyDeploymentBundle,
  'restore-rehearsal': restoreRehearsal,
  'certify-rehearsal': certifyRehearsal,
  'migrate-production': migrateProduction,
  'deployment-preflight': deploymentPreflight,
  'activate-deployment': activateDeployment,
  'accept-production': acceptProduction,
  'self-test': selfTest,
  help() {
    console.log(
      [
        'Sprint 3 release operations:',
        '  preflight           Read-only production configuration and connectivity checks',
        '  backup              Create DB/uploads archives and a checksum manifest',
        '  verify              Verify an existing backup manifest and its artifacts',
        '  package-deployment  Create immutable backend/frontend build archives',
        '  verify-deployment-bundle Verify deployment archive checksums',
        '  restore-rehearsal   Restore only to a disposable rehearsal DB and directory',
        '  certify-rehearsal   Run all rehearsal gates and write a release certificate',
        '  migrate-production  Apply migrations only after matching backup/rehearsal evidence',
        '  deployment-preflight Verify build, migration evidence, PM2 and nginx without restart',
        '  activate-deployment Stage, verify and activate both build archives with rollback',
        '  accept-production   Verify the deployed commit, privacy and suspended-token behavior',
        '  self-test           Verify local safety guards without external services',
      ].join('\n'),
    );
  },
};

if (!actions[action]) fail(`Unknown action: ${action}`);
await actions[action]();
