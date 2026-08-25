import mysql from 'mysql2/promise';
import {
  migrations,
  validateSprint3Schema,
} from './sprint3-schema-contract.mjs';

const database =
  process.env.SPRINT3_REHEARSAL_DATABASE || 'bricky_sprint3_rehearsal';
const resetDatabase = process.env.SPRINT3_REHEARSAL_RESET === '1';

if (!/^[a-zA-Z0-9_]+$/.test(database)) {
  throw new Error(
    'SPRINT3_REHEARSAL_DATABASE must contain only letters, digits and underscores.',
  );
}

if (resetDatabase && !database.startsWith('bricky_sprint3_')) {
  throw new Error(
    'Reset is allowed only for databases prefixed with bricky_sprint3_.',
  );
}

const connectionOptions = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  multipleStatements: true,
};

async function applyMigrations(connection) {
  for (const migration of migrations) {
    await connection.query(migration.sql);
    console.log(`Applied ${migration.name}`);
  }
}

const admin = await mysql.createConnection(connectionOptions);

try {
  const [databaseRows] = await admin.query(
    'SELECT schema_name FROM information_schema.schemata WHERE schema_name = ?',
    [database],
  );

  if (resetDatabase) {
    await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
    await admin.query(
      `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
  } else if (databaseRows.length === 0) {
    throw new Error(
      `Database ${database} does not exist. Create it first or set SPRINT3_REHEARSAL_RESET=1 for a disposable rehearsal database.`,
    );
  }

  await admin.query(`USE \`${database}\``);
  await applyMigrations(admin);
  await applyMigrations(admin);
  console.log('Idempotent rerun passed');

  const result = await validateSprint3Schema(admin, database);
  const [[server]] = await admin.query('SELECT VERSION() AS version');

  console.log(
    JSON.stringify(
      {
        mysqlVersion: server.version,
        ...result,
      },
      null,
      2,
    ),
  );
} finally {
  await admin.end();
}
