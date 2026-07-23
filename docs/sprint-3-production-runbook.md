# Sprint 3 Production Runbook

Последна актуализация: 23.07.2026 г.

## Цел

Това е каноничната процедура за backup, rehearsal, deployment, verification и
rollback на Sprint 3. Командите се изпълняват от `/var/www/Bricky/backend`,
освен ако не е посочено друго.

Production промяна не започва, ако някой задължителен gate е червен.

## Задължителни условия

- Release source е конкретен Git commit, а не непубликуван working tree.
- `NODE_ENV=production`.
- `TYPEORM_SYNCHRONIZE=false`.
- `JWT_SECRET` е уникален production secret с минимум 32 символа.
- `VITE_API_URL=/api` във `frontend/.env.production`.
- DB credentials са runtime secrets и не се записват в Git или manifest.
- Има достатъчно място за DB dump и пълно копие на uploads.
- Няма destructive cleanup в Sprint 3 миграциите.

## 1. Read-only preflight

```bash
cd /var/www/Bricky/backend
npm ci
npm run build
npm run release:preflight:sprint3
```

Preflight проверява production environment договора, Git commit и чист working
tree, MySQL връзката, нужните системни инструменти, uploads директорията и
frontend production API адреса. При грешка release-ът спира.

## 2. Production backup

Backup операцията е read-only спрямо DB и uploads, но изисква изрично
потвърждение:

```bash
export SPRINT3_CONFIRM_BACKUP=BACKUP_BRICKY_PRODUCTION
export SPRINT3_BACKUP_ROOT=/var/www/Bricky/backups/sprint3
export SPRINT3_UPLOADS_DIR=/var/www/Bricky/backend/uploads
npm run release:backup:sprint3
```

Резултатът е timestamp директория със:

```text
database.sql.gz
uploads.tar.gz
manifest.json
```

`manifest.json` съдържа SHA-256 checksums, размери, source DB, uploads path и
точния Git commit. Не съдържа пароли.

Повторна независима проверка:

```bash
export SPRINT3_BACKUP_MANIFEST=/absolute/path/to/manifest.json
npm run release:verify-backup:sprint3
```

Не се продължава, ако checksum, gzip stream или tar archive проверката се
провали.

## 3. Restore rehearsal

Restore е разрешен само към DB с prefix `bricky_sprint3_` и към празна
директория, чието име съдържа `rehearsal`.

```bash
export SPRINT3_BACKUP_MANIFEST=/absolute/path/to/manifest.json
export SPRINT3_REHEARSAL_DATABASE=bricky_sprint3_20260723
export SPRINT3_REHEARSAL_ROOT=/var/tmp/bricky-sprint3-rehearsal-20260723
export SPRINT3_CONFIRM_REHEARSAL_RESTORE=RESTORE_BRICKY_REHEARSAL
npm run release:restore-rehearsal:sprint3
```

Командата:

1. Проверява backup manifest и архивите.
2. Проверява, че текущият чист Git commit съвпада с commit-а в manifest-а.
3. Заменя само зададената rehearsal база.
4. Възстановява uploads в отделната rehearsal директория.
5. Изпълнява Sprint 3 миграциите два пъти.
6. Проверява таблици, foreign keys, индекси, статуси и 15-те категории.
7. Възстановява повторно оригиналния DB dump и uploads archive като rollback
   rehearsal.
8. Сравнява pre-migration DB fingerprint преди и след rollback restore.
9. Прилага миграциите още два пъти и повтаря schema проверката.
10. Записва `restore-report.json`, свързан с SHA-256 на manifest-а, Git
    commit-а, точния списък миграции и rollback fingerprint-а.

Rollback rehearsal-ът е разрешен единствено върху disposable база с prefix
`bricky_sprint3_` и върху директория под зададения rehearsal root. Той не
изпълнява production restore.

## 4. Rehearsal application verification

Backend-ът се стартира срещу rehearsal базата и възстановените uploads.

```bash
npm run release:verify-schema:sprint3
npm run release:verify-integrity:sprint3
npm audit --omit=dev --audit-level=high
npm test -- --runInBand
npm run build
npm run smoke:api:sprint3
```

Frontend:

```bash
cd /var/www/Bricky/frontend
npm ci
npm run lint
npm run build
npm audit --omit=dev --audit-level=high
```

API smoke тестът проверява:

- client/worker/admin регистрация и роли;
- admin moderation;
- restricted worker access;
- privacy преди и след assignment;
- application, assignment и откази;
- посещение, оглед, старт, край и client confirmation;
- review и worker close;
- avatar, gallery и before/after media moderation;
- admin timeline.

След като rehearsal backend-ът работи срещу възстановената DB и uploads,
всички проверки се обединяват в един сертификат:

```bash
export DB_NAME=bricky_sprint3_20260723
export SPRINT3_UPLOADS_DIR=/var/tmp/bricky-sprint3-rehearsal-20260723/uploads
export SPRINT3_API_URL=http://127.0.0.1:3100
export SPRINT3_BACKUP_MANIFEST=/absolute/path/to/manifest.json
export SPRINT3_RESTORE_REPORT=/absolute/path/to/restore-report.json
export SPRINT3_CONFIRM_REHEARSAL_CERTIFICATION=CERTIFY_BRICKY_REHEARSAL
npm run release:certify-rehearsal:sprint3
```

Командата издава `rehearsal-certificate.json` само ако schema, integrity,
rollback restore, backend/frontend audit, tests, builds и API smoke са зелени.
Сертификатът е свързан чрез SHA-256 с manifest-а, restore report-а, Git
commit-а и точния списък миграции.

## 5. Production migration

Production миграция се допуска само след успешен restore rehearsal със същия
backup, същия release commit и непроменен списък миграции.

Миграционните файлове се изпълняват в този ред:

```text
backend/migrations/20260718_sprint3_v2_data_core.sql
backend/migrations/20260719_sprint3_v2_schema_alignment.sql
```

Защитената команда отказва да работи при dirty Git state, различен commit,
различен DB host/name, различен manifest checksum или невалиден rehearsal
report:

```bash
cd /var/www/Bricky/backend
export SPRINT3_BACKUP_MANIFEST=/absolute/path/to/manifest.json
export SPRINT3_RESTORE_REPORT=/absolute/path/to/restore-report.json
export SPRINT3_REHEARSAL_CERTIFICATE=/absolute/path/to/rehearsal-certificate.json
export SPRINT3_CONFIRM_PRODUCTION_MIGRATION=MIGRATE_BRICKY_PRODUCTION
npm run release:migrate-production:sprint3
```

Командата изпълнява миграциите idempotently, schema и integrity проверките и
записва `production-migration-report.json` до backup manifest-а. Integrity
проверката открива orphan foreign keys, дублирани кандидатури, ревюта, умения
и планове, невалидни кредитни баланси, опасни media paths и липсващи VPS
файлове. При schema или integrity грешка report не се записва и backend
restart не се прави.

## 6. Application deployment

1. Checkout на точния rehearsal commit.
2. `npm ci` и backend build.
3. `npm ci` и frontend build.
4. Създаване и проверка на immutable deployment bundle извън Git worktree:

```bash
export SPRINT3_DEPLOYMENT_BUNDLE_ROOT=/var/www/Bricky-releases/sprint3
export SPRINT3_CONFIRM_DEPLOYMENT_PACKAGE=PACKAGE_BRICKY_DEPLOYMENT
npm run release:package-deployment:sprint3

export SPRINT3_DEPLOYMENT_BUNDLE_MANIFEST=/absolute/path/to/deployment-manifest.json
npm run release:verify-deployment-bundle:sprint3
```

Bundle-ът съдържа отделни `backend-build.tar.gz` и
`frontend-build.tar.gz`. Manifest-ът пази точния Git SHA, SHA-256 и размер на
архивите, както и fingerprint на всеки файл в двете активни `dist`
директории.

5. Read-only deployment preflight:

```bash
export SPRINT3_PRODUCTION_MIGRATION_REPORT=/absolute/path/to/production-migration-report.json
export SPRINT3_DEPLOYMENT_BUNDLE_MANIFEST=/absolute/path/to/deployment-manifest.json
npm run release:deployment-preflight:sprint3
```

Preflight проверява release SHA, migration evidence chain, backend/frontend
build fingerprints, deployment archive checksums, PM2 process path/status,
`nginx -t`, активния `frontend/dist` и backend proxy port.

6. Проверка, че nginx сочи към активния `frontend/dist`.
7. Задаване на точния release SHA и restart на `bricky-backend` чрез PM2:

```bash
export APP_COMMIT_SHA="$(git rev-parse HEAD)"
pm2 restart bricky-backend --update-env
```

`GET /api/health/ready` трябва да върне същия SHA в полето `commit`.

8. Проверка на PM2 status и error log.
9. Read-only public/API smoke върху `https://bricky.bg`:

```bash
export SPRINT3_PUBLIC_URL=https://bricky.bg
npm run release:smoke-public:sprint3
```

Smoke командата не създава данни. Тя проверява SPA маршрутите, production
assets, readiness договора, public workers API, worker profile API, реални
`/uploads` изображения и липсата на публични `email`/`phone` полета.

## 6.1 Production acceptance certificate

Преди deployment се създава отделен тестов worker, взема се валиден token и
след това акаунтът се suspend-ва от админ. Token-ът не се записва във файл или
в shell history. След restart се изпълнява финалният read-only acceptance gate:

```bash
export SPRINT3_PUBLIC_URL=https://bricky.bg
export SPRINT3_PRODUCTION_MIGRATION_REPORT=/absolute/path/to/production-migration-report.json
export SPRINT3_SUSPENDED_USER_TOKEN='already-issued-token-from-suspended-test-user'
export SPRINT3_CONFIRM_PRODUCTION_ACCEPTANCE=ACCEPT_BRICKY_PRODUCTION
npm run release:accept-production:sprint3
unset SPRINT3_SUSPENDED_USER_TOKEN
```

Командата отказва acceptance, ако:

- `/api/health/ready` не доказва точния checkout commit;
- DB или uploads readiness не е `ok`;
- SPA route или build asset не се зарежда;
- public worker response съдържа private поле;
- публична `/uploads` снимка не се сервира като image;
- старият token не е отказан с `Account is not active`;
- PM2/nginx сочат към различни build artifacts;
- production migration evidence chain е счупена.

При успех до migration report-а се записва непрезаписваем
`post-deploy-report.json` с SHA-256 връзка към migration report-а, точния Git
commit, deployment preflight-а и public smoke резултата.

Задължителни post-deploy проверки:

- `/`, `/workers`, `/requests` и worker/client profile routes;
- login за client, worker и admin;
- public worker cards и approved media;
- request create и admin publish;
- worker feed privacy;
- application и assignment;
- media URL през nginx `/uploads`;
- PM2 процесът остава online след повторен restart.

## 7. Rollback

### Application rollback

Използва се предходният доказано работещ Git commit и неговите build artifacts.
Преди извличане задължително се изпълнява
`release:verify-deployment-bundle:sprint3` върху предходния manifest. Backend
и frontend архивите от един и същ manifest се връщат заедно в отделна
директория, сравняват се със записаните fingerprints и едва тогава заменят
активните `dist` директории. След това се обновява `APP_COMMIT_SHA`, PM2 се
рестартира и public smoke се изпълнява отново.

Не се смесва backend archive от един manifest с frontend archive от друг.

Sprint 3 schema миграциите са additive и idempotent. При application rollback
новите таблици и колони не се изтриват автоматично.

### Database rollback

Пълен DB restore е incident operation, а не нормална deploy стъпка. Изпълнява
се само ако:

- миграцията е повредила production данни;
- application rollback не възстановява услугата;
- има проверен `database.sql.gz` и manifest непосредствено преди release-а;
- е взет допълнителен dump на текущото повредено състояние;
- операторът изрично е одобрил destructive restore.

Автоматична production restore команда умишлено няма.

### Media rollback

Uploads се връщат от manifest-свързания `uploads.tar.gz` само при доказана
загуба или несъвместимост. Преди това текущите uploads се архивират отделно.
DB dump и uploads archive от един manifest са една recovery точка.

## Release evidence

За всеки release се пазят:

- release commit SHA;
- backup `manifest.json`;
- `restore-report.json`;
- `rehearsal-certificate.json`;
- `production-migration-report.json`;
- `deployment-manifest.json`;
- `backend-build.tar.gz` и `frontend-build.tar.gz`;
- `post-deploy-report.json`;
- schema verification output;
- test/build output;
- API/browser smoke резултат;
- PM2 и nginx проверка;
- решение `GO` или `ROLLBACK`, оператор и timestamp.

## Stop conditions

Release-ът спира при:

- dirty или неизвестен Git state;
- липсващ или слаб JWT secret;
- `TYPEORM_SYNCHRONIZE` различно от `false`;
- неуспешен backup verify или restore rehearsal;
- rollback restore fingerprint, различен от първоначалния backup restore;
- schema drift;
- failing tests, build или smoke;
- build fingerprint или deployment archive checksum mismatch;
- липсващ uploads archive;
- липса на доказан rollback commit.
