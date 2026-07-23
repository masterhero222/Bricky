# Bricky Sprint 3 - статус и прогрес

Последна актуализация: 23.07.2026 г.

Работен branch: `codex/sprint-3-integration`

## Обобщение

Sprint 3 изгражда професионалното data ядро на Bricky: v2 база, регистрации,
пълен lifecycle на поръчките, медийна модерация, backoffice, referral основа и
реален frontend flow.

**Общ прогрес: приблизително 94%.**

| Област                       | Прогрес | Състояние                                                                                          |
| ---------------------------- | ------: | -------------------------------------------------------------------------------------------------- |
| V2 база и identity модел     |     96% | Схемата, миграциите и integrity договорите са готови                                                |
| Request lifecycle            |     97% | Пълният browser flow е доказан                                                                     |
| Media moderation             |     95% | Pending/approved/rejected flow работи                                                              |
| Admin backoffice             |     93% | Операциите, audit timeline и атомарното управление на plans/credits работят                         |
| Frontend интеграция          |     93% | Основните роли работят през реалния API; маршрутите се зареждат в отделни chunks                    |
| Privacy и security hardening |     95% | Request и public worker DTO правилата са затворени и тествани                                      |
| Production readiness         |     75% | Автоматизираните gates са готови; production backup/restore rehearsal и deployment не са изпълнени |

Sprint 3 **не е production stable**. Функционалното ядро работи, но privacy
корекциите са затворени, а release gates трябва да бъдат изпълнени преди
качване на live.

## Завършено

### V2 база и идентичност

- [x] Каноничен идентификатор `users.id`.
- [x] `client_profiles`, `worker_profiles` и `worker_skills`.
- [x] Транзакционна регистрация на клиент и майстор.
- [x] Английски machine keys в DB и български labels във frontend.
- [x] TypeORM `synchronize` е изключен за production.
- [x] Production startup отказва слаб/липсващ JWT secret и непълни DB настройки.
- [x] CORS production default допуска само HTTPS Bricky домейните.
- [x] Secret fallback-ът и test environment endpoint-ът са премахнати.
- [x] Ненужният MJML/mailer dependency stack е премахнат.
- [x] Backend production dependency audit е свален от 63 сигнала до 0.
- [x] Frontend production dependency audit е 0.
- [x] Backend build чисти stale output и копира mail template-а на правилния runtime path.
- [x] Добавени са versioned SQL миграции.
- [x] Добавен е TypeORM metadata regression test.
- [x] Backend стартира върху чиста MySQL 8.4 база без legacy worker таблици.
- [x] Legacy reads са само контролиран fallback при `ER_NO_SUCH_TABLE`.

### Заявки и lifecycle

- [x] `repair_requests`, `request_applications` и `request_events`.
- [x] Клиент създава заявка.
- [x] Админ одобрява или архивира заявката и снимките.
- [x] Само одобрен, видим и активен майстор може да кандидатства.
- [x] Suspended и unapproved майстори са блокирани.
- [x] Кандидатстването е idempotent.
- [x] Майстор може да се откаже само преди да бъде избран.
- [x] Клиент може да освободи избран майстор само преди започване на работа.
- [x] Клиент избира кандидат.
- [x] Майстор потвърждава поръчката.
- [x] Майстор маркира пристигане на адрес.
- [x] Майстор маркира извършен оглед.
- [x] Майстор започва работа.
- [x] Майстор качва снимки след ремонта.
- [x] Майстор маркира работата като завършена.
- [x] Майстор изпраща поръчката за клиентско потвърждение.
- [x] Клиент потвърждава изпълнението.
- [x] Клиент оставя едно ревю.
- [x] Майстор затваря поръчката.
- [x] Завършената поръчка излиза от активния worker feed.
- [x] Immutable timeline пази actor, event, timestamp и metadata.

### Снимки и модерация

- [x] Единен модел `media_assets`.
- [x] Статуси `pending`, `approved` и `rejected`.
- [x] Pending и rejected файлове не се показват публично.
- [x] Старият одобрен avatar остава активен до одобряване на новия.
- [x] Avatar, gallery и request media използват общ moderation contract.
- [x] Админът преглежда снимките в modal viewer на същата страница.
- [x] Реални multipart endpoints за before/after снимки.
- [x] JPEG, PNG и WebP, до 8 MB на файл и до 20 файла.
- [x] Production flow не записва `data:` URL изображения.

### Admin, catalog и pricing

- [x] Backoffice за users, workers, requests, media, referrals и audit.
- [x] Approve, reject, hide и suspend на майстори.
- [x] Одобряване и архивиране на заявки.
- [x] Управление на категории и дейности.
- [x] Versioned pricing rules.
- [x] Immutable request pricing snapshot.
- [x] Ръчните промени по планове и кредити валидират реален worker account.
- [x] Wallet, credit ledger и admin audit се записват в една DB транзакция.
- [x] Не се допуска отрицателен кредитен баланс, нулева транзакция или повече от един активен plan запис за майстор.
- [x] Schema и integrity проверките валидират billing indexes, constraints и дублирани/невалидни записи.
- [x] Audit log за административните действия.

### Referral, SEO и frontend

- [x] Referral attribution при регистрация.
- [x] Qualification и reward транзакции.
- [x] Idempotent reward обработка.
- [x] Blog MVP за SEO.
- [x] Реален API dev режим чрез `npm run dev:real`.
- [x] Client, worker и admin login работят през реалния API.
- [x] Worker dashboard, заявки и карта работят през реалния API.
- [x] Client dashboard и worker preview работят през реалния API.
- [x] Admin login води директно към `/admin`.
- [x] Admin navbar води към backoffice.
- [x] Worker map има връщане към заявките.
- [x] Worker feed не връща клиентски телефон или email.
- [x] Преди назначаване майсторът вижда само район и груби координати.
- [x] Точният адрес се отключва само за назначения майстор, клиента и админа.
- [x] Публичните worker DTO от v2 и legacy не връщат телефон или email.
- [x] Client candidate UI не показва телефон на майстора.
- [x] Request wizard използва identity от authenticated user.
- [x] Request wizard не изпраща email и телефон като request полета.
- [x] Видимият `mock` текст е премахнат от request wizard.
- [x] Frontend lint и production build минават.
- [x] Route-level code splitting намалява началния JS bundle от 721 KB на 304 KB.
- [x] Lazy маршрутите за home, workers, blog, requests и admin са проверени без browser errors.
- [x] Има единен release preflight за env, Git, MySQL, uploads и frontend API contract.
- [x] Има manifest-базиран DB/uploads backup с SHA-256 проверка.
- [x] Restore инструментът пише само в ясно именувана rehearsal база и директория.
- [x] Rehearsal certification gate обединява schema, integrity, audits, tests, builds и API smoke в подписан с checksums evidence файл.
- [x] Production migration gate приема само съвпадащи backup manifest, restore report, rehearsal certificate и Git commit.
- [x] Schema verification използва общ contract за rehearsal и production read-only check.
- [x] Има read-only integrity проверка за orphan записи, дублирани contract записи и media файлове.
- [x] Документиран е Sprint 3 production/rollback runbook.

На 23.07.2026 г. е изпълнена и targeted UI проверка върху локалния frontend:

- стъпката за контакт няма полета за име, телефон или email;
- wizard-ът няма видим `mock` текст;
- worker заявките търсят по категория, район и описание;
- worker заявките не визуализират телефон или email.

## Browser E2E доказателство

На 20.07.2026 г. е изпълнен пълен browser lifecycle през реални Nest backend,
MySQL и Vite frontend.

Тестова заявка: `#4`, категория `Боядисване`.

Потвърдени стъпки:

1. Клиент създава заявка със снимка.
2. Админ одобрява снимката и публикува заявката.
3. Майстор вижда заявката и кандидатства.
4. Клиент отваря профила и избира майстора.
5. Майстор потвърждава, пристига, оглежда и започва работа.
6. Майстор качва after снимка и приключва работата.
7. Клиент потвърждава и оставя 5-звездно ревю.
8. Майстор затваря поръчката.
9. Поръчката се архивира като `completed`.
10. Admin timeline показва всички 15 lifecycle събития.

Потвърдени timeline събития:

```text
request.created
request.media_uploaded
admin.status_changed
application.created
request.assigned
worker.confirmed
worker.on_site
worker.inspected
worker.started_work
request.media_uploaded
worker.finished_work
worker.ready_for_client_confirmation
client.confirmed_work
request.reviewed
request.closed_by_worker
```

## Последни проверки

| Проверка                          | Резултат                    |
| --------------------------------- | --------------------------- |
| GitHub Sprint 3 CI                | Passed on `b848559`         |
| Backend tests                     | 19 suites, 132 tests passed |
| Billing/admin transaction tests   | Passed                      |
| Request privacy regression        | Passed                      |
| Runtime security config tests     | Passed                      |
| TypeORM metadata regression       | Passed                      |
| Backend production build          | Passed                      |
| Backend production audit          | Passed, 0 vulnerabilities   |
| Frontend ESLint                   | Passed                      |
| Frontend production build         | Passed                      |
| Frontend route-level lazy loading | Passed, 721 KB -> 304 KB     |
| Lazy route browser smoke          | Passed, no browser errors    |
| Clean MySQL migration             | Passed                      |
| Повторно изпълнение на миграциите | Passed                      |
| Synthetic v2 upgrade              | Passed                      |
| Реален Nest + MySQL startup       | Passed                      |
| Client/admin/worker API smoke     | Passed                      |
| Restricted worker API test        | Passed                      |
| Media moderation API test         | Passed                      |
| Пълен browser lifecycle           | Passed                      |
| Timeline и completed archive      | Passed                      |
| Production-backup migration       | Not run                     |
| Production smoke test             | Not run                     |
| Current live public privacy smoke | Failed: legacy `/api/workers` exposes `email` |

Последният автоматизиран API smoke резултат:

```json
{
  "ok": true,
  "requestId": 3,
  "clientUserId": 10,
  "workerUserId": 11,
  "restrictedWorkerUserId": 12,
  "timelineEvents": 15
}
```

## Текущи blockers

### P0 - privacy и contact bypass

- [ ] Release candidate-ът да бъде deploy-нат; текущият live backend още връща `email` в public workers API.
- [x] Worker feed да не връща или показва клиентски email.
- [x] Worker feed да не връща или показва телефон.
- [x] Точният адрес да е скрит преди клиентът да избере майстор.
- [x] Точният адрес да се отключва само за назначения майстор.
- [x] Телефонът на майстора да не се показва в client candidate/profile UI.
- [x] Backend DTO тестове да доказват privacy правилата.

### P1 - request form cleanup

- [x] Да се премахне целият видим текст `mock` от реалния request wizard.
- [x] Новата заявка да използва identity от authenticated user.
- [x] Email и телефон да не се подават като доверени request полета.
- [x] Private phone да се управлява само в собствения client profile.
- [x] Контактната стъпка да не блокира заявката с повторно искане на лични данни.

### P1 - release gates

- [ ] Свеж backup на production DB.
- [ ] Свеж backup на production uploads.
- [ ] Restore на двата backup-а в отделна rehearsal среда.
- [ ] Sprint 3 миграции върху възстановено production копие.
- [ ] Проверка за orphan записи и счупени foreign keys.
- [ ] Проверка за липсващи media файлове.
- [x] Документирана rollback процедура.
- [ ] Изпълнена и проверена rollback процедура в rehearsal среда.
- [ ] Production deployment.
- [ ] Production smoke test след deployment.

### P2 - след release blockers

- [x] Code splitting на основния frontend bundle.
- [ ] Допълнително разделяне на големите worker/request компоненти.
- [x] Обновяване на Browserslist/Baseline browser data.
- [ ] Премахване на временните legacy compatibility пътища след beta периода.

## Следващ ред на работа

1. Production DB/uploads backup.
2. Restore rehearsal и миграции върху възстановеното копие.
3. Integrity и orphan проверки.
4. Документиране и проверка на rollback процедурата.
5. Повторен реален browser smoke върху rehearsal средата.
6. Production deployment и post-deploy smoke test.

## Definition of Done

Sprint 3 е завършен само когато:

- [x] чистата v2 база работи без legacy таблици;
- [x] пълният client/admin/worker API flow минава;
- [x] пълният browser lifecycle минава;
- [x] media moderation работи end-to-end;
- [x] suspended и unapproved ограниченията са доказани;
- [x] timeline и completed archive са доказани;
- [x] privacy blocker-ите са отстранени и покрити с тестове;
- [x] request wizard няма mock contract;
- [ ] production backup-ите са създадени и успешно възстановени;
- [ ] миграциите минават върху възстановено production копие;
- [ ] rollback процедурата е проверена;
- [ ] production deployment и smoke test минават.

## Правила за безопасност

- Не се изпълнява destructive cleanup върху production.
- TypeORM `synchronize` не се включва в production.
- DB и uploads се архивират заедно преди миграция.
- Legacy таблиците не се трият в Sprint 3.
- Sprint 3 не се маркира като stable преди всички release gates да са зелени.
