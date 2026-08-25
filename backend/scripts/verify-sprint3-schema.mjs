import mysql from 'mysql2/promise';
import { validateSprint3Schema } from './sprint3-schema-contract.mjs';

const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME'];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  throw new Error(
    `Missing database environment variables: ${missing.join(', ')}`,
  );
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

try {
  const result = await validateSprint3Schema(connection, process.env.DB_NAME);
  const [[server]] = await connection.query('SELECT VERSION() AS version');
  console.log(
    JSON.stringify(
      {
        ok: true,
        checkedAt: new Date().toISOString(),
        mysqlVersion: server.version,
        ...result,
      },
      null,
      2,
    ),
  );
} finally {
  await connection.end();
}
