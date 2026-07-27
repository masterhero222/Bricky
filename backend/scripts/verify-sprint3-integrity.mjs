import { existsSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import mysql from 'mysql2/promise';

const required = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME'];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  throw new Error(
    `Missing database environment variables: ${missing.join(', ')}`,
  );
}

const uploadsRoot = resolve(
  process.env.SPRINT3_UPLOADS_DIR || resolve(process.cwd(), 'uploads'),
);

function isPathWithin(parent, candidate) {
  const pathFromParent = relative(resolve(parent), resolve(candidate));
  return (
    pathFromParent === '' ||
    (!pathFromParent.startsWith('..') && !isAbsolute(pathFromParent))
  );
}

function mediaFilePath(row) {
  const raw = String(row.storage_key || row.public_url || '').trim();
  if (!raw || raw.startsWith('data:')) return null;

  let normalized = raw.replaceAll('\\', '/');
  if (normalized.startsWith('/uploads/')) {
    normalized = normalized.slice('/uploads/'.length);
  } else if (normalized.startsWith('uploads/')) {
    normalized = normalized.slice('uploads/'.length);
  } else {
    return null;
  }

  try {
    normalized = decodeURIComponent(normalized);
  } catch {
    return null;
  }

  const filePath = resolve(uploadsRoot, normalized);
  return isPathWithin(uploadsRoot, filePath) ? filePath : null;
}

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

try {
  const [foreignKeys] = await connection.query(
    `SELECT constraint_name, table_name, column_name,
            referenced_table_name, referenced_column_name
       FROM information_schema.key_column_usage
      WHERE constraint_schema = DATABASE()
        AND referenced_table_name IS NOT NULL
      ORDER BY table_name, constraint_name, ordinal_position`,
  );

  const orphanChecks = [];
  for (const foreignKey of foreignKeys) {
    const table = foreignKey.TABLE_NAME || foreignKey.table_name;
    const column = foreignKey.COLUMN_NAME || foreignKey.column_name;
    const referencedTable =
      foreignKey.REFERENCED_TABLE_NAME || foreignKey.referenced_table_name;
    const referencedColumn =
      foreignKey.REFERENCED_COLUMN_NAME || foreignKey.referenced_column_name;
    const constraint = foreignKey.CONSTRAINT_NAME || foreignKey.constraint_name;

    const [[row]] = await connection.query(
      `SELECT COUNT(*) AS count
         FROM \`${table}\` child
         LEFT JOIN \`${referencedTable}\` parent
           ON parent.\`${referencedColumn}\` = child.\`${column}\`
        WHERE child.\`${column}\` IS NOT NULL
          AND parent.\`${referencedColumn}\` IS NULL`,
    );
    orphanChecks.push({
      constraint,
      relation: `${table}.${column} -> ${referencedTable}.${referencedColumn}`,
      count: Number(row.count),
    });
  }

  const duplicateContracts = [
    {
      name: 'request application per worker',
      sql: `SELECT COUNT(*) AS count
              FROM (
                SELECT request_id, worker_user_id
                  FROM repair_request_applications
                 GROUP BY request_id, worker_user_id
                HAVING COUNT(*) > 1
              ) duplicates`,
    },
    {
      name: 'review per request and client',
      sql: `SELECT COUNT(*) AS count
              FROM (
                SELECT request_id, client_user_id
                  FROM repair_request_reviews
                 GROUP BY request_id, client_user_id
                HAVING COUNT(*) > 1
              ) duplicates`,
    },
    {
      name: 'worker skill assignment',
      sql: `SELECT COUNT(*) AS count
              FROM (
                SELECT worker_user_id, category_key, COALESCE(activity_key, '') activity_key
                  FROM worker_skills
                 GROUP BY worker_user_id, category_key, COALESCE(activity_key, '')
                HAVING COUNT(*) > 1
              ) duplicates`,
    },
    {
      name: 'single worker plan',
      sql: `SELECT COUNT(*) AS count
              FROM (
                SELECT worker_user_id
                  FROM worker_plans
                 GROUP BY worker_user_id
                HAVING COUNT(*) > 1
              ) duplicates`,
    },
  ];

  const duplicateChecks = [];
  for (const contract of duplicateContracts) {
    const [[row]] = await connection.query(contract.sql);
    duplicateChecks.push({ name: contract.name, count: Number(row.count) });
  }

  const dataContracts = [
    {
      name: 'non-negative worker credit balance',
      sql: `SELECT COUNT(*) AS count
              FROM worker_credit_wallets
             WHERE balance < 0`,
    },
    {
      name: 'non-zero worker credit transaction',
      sql: `SELECT COUNT(*) AS count
              FROM worker_credit_transactions
             WHERE amount = 0`,
    },
  ];
  const dataContractChecks = [];
  for (const contract of dataContracts) {
    const [[row]] = await connection.query(contract.sql);
    dataContractChecks.push({ name: contract.name, count: Number(row.count) });
  }

  const [mediaRows] = await connection.query(
    `SELECT id, storage_key, public_url, moderation_status
       FROM media_assets
      WHERE storage_provider = 'vps'`,
  );
  const invalidMedia = [];
  const missingMedia = [];
  for (const row of mediaRows) {
    const filePath = mediaFilePath(row);
    if (!filePath) {
      invalidMedia.push({
        id: Number(row.id),
        storageKey: row.storage_key,
        publicUrl: row.public_url,
      });
    } else if (!existsSync(filePath)) {
      missingMedia.push({
        id: Number(row.id),
        moderationStatus: row.moderation_status,
        filePath,
      });
    }
  }

  const failures = {
    orphanRelations: orphanChecks.filter((check) => check.count > 0),
    duplicateContracts: duplicateChecks.filter((check) => check.count > 0),
    invalidDataContracts: dataContractChecks.filter(
      (check) => check.count > 0,
    ),
    invalidMedia,
    missingMedia,
  };
  const result = {
    ok: Object.values(failures).every((rows) => rows.length === 0),
    checkedAt: new Date().toISOString(),
    database: process.env.DB_NAME,
    uploadsRoot,
    foreignKeysChecked: orphanChecks.length,
    vpsMediaChecked: mediaRows.length,
    failures,
  };

  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) {
    process.exitCode = 1;
  }
} finally {
  await connection.end();
}
