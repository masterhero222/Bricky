# Bricky Sprint 3 - статус и прогрес

Последна актуализация: 23.07.2026 г.

Работен branch: `codex/sprint-3-integration`

## Резюме

Sprint 3 изгражда професионалното data ядро на Bricky: каноничен v2 модел,
регистрации по роли, контролиран lifecycle на поръчките, медийна модерация,
административен backoffice, referral основа и реална frontend интеграция.

**Общ прогрес: приблизително 95%.**

Функционалното ядро е готово, интеграцията с `main` е качена и GitHub CI е
зелен. Sprint 3 още не е production stable, защото остава production release
процедурата с backup, restore rehearsal, миграции, deployment и live smoke
проверка.

| Област | Прогрес | Статус |
| --- | ---: | --- |
| V2 база и identity модел | 98% | Схемата, миграциите и DB договорите са готови |
| Request lifecycle | 98% | Пълният client/admin/worker flow е реализиран и тестван |
| Media moderation | 97% | Pending/approved/rejected и запазване на стария avatar работят |
| Admin backoffice | 95% | Users, workers, requests, media, referrals и audit са налични |
| Frontend интеграция | 95% | Основните роли и маршрути работят през реалния API |
| Privacy и security | 97% | Контакти, адреси, роли и suspended users са защитени |
| Production readiness | 75% | Инструментите са готови; live rehearsal/deploy не са изпълнени |

## Завършено

### V2 база и идентичност

- [x] Каноничен идентификатор `users.id`.
- [x] `client_profiles`, `worker_profiles` и `worker_skills`.
- [x] Транзакционна регистрация на клиент и майстор.
- [x] Machine keys в DB и български labels във frontend.
- [x] Versioned Sprint 3 SQL миграции.
- [x] TypeORM `synchronize` е забранен в production.
- [x] Production startup валидира DB, JWT, CORS и uploads настройките.
- [x] Legacy таблиците са само контролиран fallback.

### Поръчки и lifecycle

- [x] `repair_requests`, `request_applications` и `request_events`.
- [x] Клиент създава заявка със снимки.
- [x] Админ одобрява или архивира заявката и модерира снимките.
- [x] Само active, approved и public майстор вижда и кандидатства.
- [x] Suspended и unapproved майсторите са блокирани.
- [x] Майсторът може да оттегли кандидатура само преди избиране.
- [x] Клиентът може да освободи избран майстор само преди започване на работа.
- [x] Клиентът избира кандидат, а майсторът потвърждава поръчката.
- [x] Майсторът маркира пристигане, оглед и начало на работа.
- [x] Майсторът качва снимки след ремонта и приключва работата.
- [x] Клиентът потвърждава и оставя едно ревю.
- [x] Майсторът затваря поръчката.
- [x] Immutable timeline пази actor, event, timestamp и metadata.

Каноничен lifecycle:

```text
draft
  -> pending_approval
  -> published
  -> applied
  -> assigned
  -> worker_confirmed
  -> on_site
  -> inspected
  -> in_progress
  -> work_finished
  -> awaiting_client_confirmation
  -> client_confirmed
  -> reviewed
  -> completed
```

### Снимки и модерация

- [x] Единен модел `media_assets`.
- [x] Статуси `pending`, `approved` и `rejected`.
- [x] Pending и rejected файлове не се показват публично.
- [x] Старият одобрен avatar остава активен до одобряване на новия.
- [x] Avatar, gallery и request media използват един moderation contract.
- [x] Админът преглежда снимките в modal viewer на същата страница.
- [x] Upload-ите се обработват до WebP с размер и резолюция за production.
- [x] Upload файловете се почистват при неуспешен DB запис.
- [x] Production flow не записва base64/data URL изображения.

### Admin, catalog, pricing и referrals

- [x] Backoffice за users, workers, requests, media, referrals и audit.
- [x] Approve, reject, hide, suspend и reactivate операции.
- [x] Категории, дейности и versioned pricing rules.
- [x] Immutable pricing snapshot за всяка заявка.
- [x] Worker plans, credit wallet и transaction ledger.
- [x] Админските billing промени са атомарни и се записват в audit log.
- [x] Referral attribution, qualification и idempotent rewards.
- [x] Blog MVP за SEO.

### Privacy и security

- [x] Public worker DTO не връща телефон, email или password данни.
- [x] Worker feed не връща клиентски телефон или email.
- [x] Точният адрес е скрит преди назначаване.
- [x] Точният адрес се отключва само за клиента, админа и назначения майстор.
- [x] JWT guard проверява актуалния user status и role от DB при всяка заявка.
- [x] Издадени по-рано token-и не заобикалят последващ suspend/block.
- [x] Worker-only endpoints проверяват worker role.
- [x] Public worker grid допуска само active, approved и public профили.
- [x] Backend и frontend production dependency audit са с 0 уязвимости.

## Проверен browser flow

Пълният flow е изпълнен през реални Nest backend, MySQL и Vite frontend:

1. Клиентът създава заявка със снимка.
2. Админът одобрява снимката и публикува заявката.
3. Майсторът вижда заявката и кандидатства.
4. Клиентът отваря профила и избира майстора.
5. Майсторът потвърждава, пристига, оглежда и започва.
6. Майсторът качва after снимка и приключва работата.
7. Клиентът потвърждава и оставя ревю.
8. Майсторът затваря поръчката.
9. Поръчката влиза в completed archive.
10. Admin timeline съдържа всички lifecycle събития.

## Последни проверки

Проверено на 23.07.2026 г. локално и в GitHub Actions върху текущия merge с
`origin/main`:

| Проверка | Резултат |
| --- | --- |
| Sprint 1/2/3 cross-sprint verification | Passed |
| Backend test suites | 28/28 passed |
| Backend tests | 163/163 passed |
| Backend production build | Passed |
| Backend Sprint 3 release self-test | Passed |
| Backend production audit | 0 vulnerabilities |
| Frontend ESLint | Passed |
| Frontend production build | Passed |
| Pricing contract | 97 activities, 174 material items |
| Mock moderation enforcement | Passed |
| Frontend production audit | 0 vulnerabilities |
| Migration contract verification | Passed |
| Sprint 2 migration and rollback rehearsal | Passed |
| Sprint 3 clean-DB MySQL lifecycle smoke | Passed |
| Bricky verification GitHub workflow | Passed |
| Sprint 3 CI GitHub workflow | Passed |

## Текущо състояние на интеграцията

- [x] Създаден е safety branch преди merge:
  `codex/sprint-3-pre-main-merge-20260723`.
- [x] `origin/main` е интегриран локално.
- [x] Sprint 3 request/review lifecycle е запазен.
- [x] Sprint 2 image processing, health и DB protections са интегрирани.
- [x] Локалните cross-sprint gates са зелени.
- [x] Merge промените са stage-нати и commit-нати.
- [x] Branch-ът е push-нат в GitHub.
- [x] GitHub CI е зелен върху интегрирания commit.
- [x] Отворен е draft Sprint 3 pull request към `main`:
  [PR #7](https://github.com/masterhero222/Bricky/pull/7).

## Остава до production stable

### P0 - release и privacy

- [ ] Интегрираният release candidate да бъде deploy-нат.
- [ ] След deploy публичният `/api/workers` да бъде проверен за липса на
      `email`, `phone` и други private полета.
- [ ] Suspended user да бъде проверен срещу production API със стар token.

### P1 - production release gates

- [ ] Свеж backup на production DB.
- [ ] Свеж backup на production uploads.
- [ ] Проверка на SHA-256 manifest-а.
- [ ] Restore на двата backup-а в отделна rehearsal среда.
- [ ] Sprint 3 миграции върху възстановеното production копие.
- [ ] Проверка за orphan записи, счупени foreign keys и липсващи media файлове.
- [ ] Изпълнение и проверка на rollback процедурата в rehearsal средата.
- [ ] Production deployment.
- [ ] Post-deploy API и browser smoke test.

### P2 - след release

- [ ] Допълнително code splitting на големите worker/request компоненти.
- [ ] Премахване на временните legacy compatibility пътища след beta периода.
- [ ] Реален payment provider за plans/credits.
- [ ] Object storage миграция при нужда от хоризонтално скалиране.

## Definition of Done

Sprint 3 е завършен само когато:

1. Merge commit-ът е в GitHub и всички CI проверки са зелени.
2. Production DB и uploads backup-ите са валидирани.
3. Restore rehearsal, migrations и rollback са изпълнени успешно.
4. Release candidate е deploy-нат.
5. Client, worker и admin smoke flow работи на live.
6. Public API не издава private контакти или точен адрес.
7. Production evidence и rollback данните са архивирани.
