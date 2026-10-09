# Bricky Sprint 3 - Статус и прогрес

Последна актуализация: 20.07.2026 г.

## Обобщение

**Общ прогрес: приблизително 95%**

Основната v2 логика за профили, заявки, модерация, рефърали, admin backoffice,
категории и ценообразуване е реализирана. Автоматичните backend тестове и двата
production build-а минават.

Sprint 3 още не е готов за production. Миграциите вече са доказани върху чиста
MySQL 8.4.10 база и синтетична по-стара v2 схема. Основният оставащ риск е
репетицията върху възстановено копие на production базата и пълният browser/API
flow срещу реалния backend и MySQL.

Текущ работен branch: `codex/sprint-3-integration`.

## Готово

- [x] V2 модели за users, client profiles, worker profiles и worker skills.
- [x] V2 модели за repair requests, applications, events и pricing snapshots.
- [x] Каноничен идентификатор `users.id` за клиент и майстор.
- [x] Транзакционна регистрация на клиент и майстор.
- [x] Пълен каноничен lifecycle на поръчката:
  - клиент създава;
  - админ преглежда и публикува;
  - майстор кандидатства;
  - клиент избира;
  - майстор потвърждава, пристига, оглежда, започва и завършва;
  - клиент потвърждава и оставя ревю;
  - майстор затваря поръчката.
- [x] Майстор може да се откаже само преди да бъде избран.
- [x] Клиент може да освободи майстор само преди започване на работа.
- [x] Suspended, hidden и неодобрени майстори не могат да кандидатстват.
- [x] Кандидатстването е idempotent.
- [x] Завършените поръчки се архивират от активния feed.
- [x] Media moderation с `pending`, `approved` и `rejected`.
- [x] Неодобрени снимки не се показват публично.
- [x] Нов avatar не заменя стария одобрен avatar преди модерация.
- [x] Одобрението на avatar архивира предишния одобрен avatar.
- [x] Публичната история на майстора използва реални завършени поръчки.
- [x] Публично са скрити точният адрес и неодобрените снимки.
- [x] Referral attribution, qualification и rewards са atomic и idempotent.
- [x] Blog MVP за SEO.
- [x] Admin backoffice за users, workers, requests, media, referrals и audit.
- [x] Admin управление на категории и дейности.
- [x] Versioned pricing правила с active/inactive състояние.
- [x] Immutable request timeline с actor, timestamp и metadata.
- [x] Admin промените по категории и pricing се записват в audit log.
- [x] SQL схемата е статично синхронизирана с TypeORM entities.
- [x] Добавена е недеструктивна alignment миграция за съществуваща v2 база.
- [x] Първа стабилизация на worker dashboard:
  - sidebar е отделен в `WorkerProfileSidebar`;
  - обобщението е отделено в `WorkerDashboardSummary`;
  - калкулаторът е отделен в `WorkerCalculatorPanel`;
  - рефъралите са отделени в `WorkerReferralPanel`;
  - галерията и media viewer-ът са отделени в `WorkerGalleryPanel`;
  - `WorkerProfile.jsx` е намален от около 1900 до около 1300 физически реда.
- [x] Неодобрен, скрит или спрян майстор вижда разбираемо съобщение вместо
  техническа грешка при зареждане на заявките.

## Частично готово

- [ ] **Media moderation**
  - service и integration тестовете минават;
  - остава browser/API репетиция върху мигрирана MySQL база.
- [ ] **Профил на майстора**
  - public view, банери и основният editor работят;
  - sidebar, dashboard summary, calculator, referrals и gallery са отделени;
  - остават request list/history и editor секциите за допълнително разделяне.
- [ ] **Frontend production качество**
  - build-ът минава;
  - пълният frontend ESLint минава;
  - дублираният request-creation код в `ClientProfile.jsx` е премахнат;
  - каноничният `RequestFlow` остава активен в таба „Направи заявка“;
  - основният bundle е 707.78 kB (207.30 kB gzip) и по-късно изисква code splitting.

## Непотвърдено

- [x] Миграция върху чиста MySQL 8.4.10 база.
- [x] Upgrade репетиция върху синтетична по-стара v2 схема.
- [ ] Миграция върху възстановено копие на production базата.
- [x] Проверка на таблици, foreign keys и indexes в двете репетиционни схеми.
- [ ] Пълен client/admin/worker browser flow срещу реалния backend и MySQL.
- [ ] End-to-end проверка на media moderation през публичното API.
- [ ] End-to-end проверка на suspended/unapproved ограниченията.
- [ ] Production deployment и smoke test.

## Автоматична проверка

- [x] Backend build минава.
- [x] Frontend build минава.
- [x] Backend тестове: **15 suites, 105 tests passed**.
- [x] Backend production build минава след миграционните промени.
- [x] MySQL 8.4.10 clean migration и idempotent rerun:
  - 21 таблици;
  - 31 foreign keys;
  - 78 indexes;
  - 15 категории;
  - нула липсващи schema обекти.
- [x] MySQL 8.4.10 synthetic legacy-v2 upgrade и idempotent rerun със същия резултат.
- [x] Миграциите не използват MariaDB-only `ADD COLUMN IF NOT EXISTS`.
- [x] Scoped frontend ESLint за новия admin/catalog код минава.
- [x] Scoped frontend ESLint за всички отделени worker profile компоненти минава.
- [x] Пълният frontend ESLint минава.
- [x] Dev browser regression с mock API минава за:
  - включване и изключване на категория;
  - създаване на pricing rule;
  - създаване и admin публикуване на заявка;
  - преглед на immutable request timeline.
- [x] Dev browser regression за worker profile минава за:
  - dashboard, referrals, gallery и calculator;
  - реално изчисление в calculator;
  - статус за неодобрен/скрит/спрян майстор;
  - нула frontend runtime грешки в проверения flow.
- [x] Dev browser regression за client profile минава:
  - клиентски вход;
  - отваряне на таба „Направи заявка“;
  - каноничният `RequestFlow` се визуализира;
  - нула frontend runtime грешки.

Dev browser regression-ът доказва frontend договора, но не замества тест върху
реално мигрирана MySQL база.

## Следващ ред на работа

1. Вземане на свеж backup на production базата и uploads.
2. Репетиция върху възстановено копие на production базата.
3. Пълен browser/API regression flow върху мигрираната база.
4. End-to-end media moderation и suspended/unapproved проверки през public API.
5. Финално разделяне на request/editor секциите в `WorkerProfile.jsx`.
6. Production deployment и smoke test.
7. Code splitting на големия frontend bundle след release-critical проверките.

## Условия за стабилна версия

Sprint 3 може да бъде обявен за стабилен само когато:

- [x] clean MySQL migration мине успешно;
- [ ] production-backup migration мине успешно;
- [ ] целият browser/API flow мине без ръчни корекции;
- [ ] avatar, gallery и request media moderation минат end-to-end;
- [ ] suspended и unapproved ограниченията се потвърдят през public API;
- [x] backend тестовете и frontend build-ът минават;
- [ ] има свеж backup на базата и uploads;
- [ ] production smoke test мине успешно.

## Важни правила

- Legacy таблиците остават read-only архив.
- Не се изпълнява destructive cleanup върху production.
- TypeORM `synchronize` не се включва в production.
- Преди миграция се архивират едновременно базата и uploads.
- Sprint 3 не се маркира като завършен преди всички release gates.
