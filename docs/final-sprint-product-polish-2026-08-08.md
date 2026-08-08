# Bricky Final Sprint - Product Polish и безплатно публично пускане

Последна актуализация: 08.08.2026 г.

Работен branch: `codex/sprint-3-integration`

Live baseline: `a124a38`

## Цел

Bricky да премине от работеща затворена бета към полиран публичен продукт, който може да приема
реални клиенти и майстори без постоянна ръчна техническа намеса.

След успешно приключване на този спринт платформата се пуска безплатно за 30 календарни дни.
Платежната система е отделен следващ спринт и не влиза в текущия обхват.

## Launch модел

- Публичният период започва след успешно преминаване на всички release gates.
- Платформата е безплатна за клиенти и одобрени майстори за първите 30 календарни дни.
- Не се удържат кредити и не се изисква активен платен план.
- Не се добавят временни фиктивни плащания или незавършени checkout екрани.
- Началната и крайната дата на безплатния период се записват в release отчета.
- Събираме продуктови показатели, проблеми и обратна връзка за подготовка на Payment Sprint.
- След края на периода не включваме плащания автоматично без отделен release и комуникация.

## Извън обхвата

- Stripe или друг payment provider.
- Реални абонаментни плащания.
- Автоматично фактуриране.
- Платени позиции в стената с майстори.
- Автоматично удържане на кредити.
- Финална ценова стратегия.

Съществуващите plan, wallet и credit структури могат да останат като неактивна основа, но не трябва
да ограничават потребителите през безплатния период.

## P0 - Основен бизнес flow

- [ ] Нов клиент се регистрира, влиза и попълва функционален профил.
- [ ] Нов майстор се регистрира и вижда разбираем pending статус.
- [ ] След admin одобрение майсторът веднага получава правилните права.
- [ ] Видимостта в стената с майстори се управлява независимо от account approval.
- [ ] Клиентът създава заявка със снимки и тя остава скрита до admin одобрение.
- [ ] Pending и rejected снимки никога не се показват в публичен или worker feed.
- [ ] Одобрена заявка се вижда само от active, approved и допустими майстори.
- [ ] Майстор кандидатства, а клиентът разглежда реалния му профил и го избира.
- [ ] Преди worker confirmation и двете страни могат да се откажат според текущите правила.
- [ ] След worker confirmation контактът се отключва само за назначения майстор.
- [ ] След worker confirmation потребителският отказ е блокиран и се изисква admin намеса.
- [ ] Етапите on-site, inspection, work started и work finished се изпълняват последователно.
- [ ] Клиентът потвърждава приключването и оставя само едно ревю.
- [ ] Майсторът затваря поръчката.
- [ ] Завършената поръчка изчезва от активните feed-ове и влиза в историята и на двете страни.
- [ ] Admin timeline съдържа всички действия, actor, timestamp и причина.

## P0 - Права, privacy и сигурност

- [ ] Backend валидира user status, role и worker eligibility при всяко защитено действие.
- [ ] Suspended, blocked, rejected, hidden и pending профили не заобикалят ограниченията със стар token.
- [ ] Публичните worker DTO никога не връщат телефон, email, password или token данни.
- [ ] Телефонът и точният адрес на клиента са скрити преди worker confirmation.
- [ ] Чужд майстор не може да получи контакт чрез манипулирана API заявка.
- [ ] Password reset линкът е еднократен, с кратък срок и реално се доставя по email.
- [ ] Добавено е email verification поведение или ясно контролиран transitional режим.
- [ ] Login и password-reset endpoints имат rate limiting.
- [ ] Upload endpoints валидират MIME тип, размер и допустим kind.
- [ ] Има потребителско докладване на профил, заявка или неподходящо съдържание.

## P0 - Media moderation

- [ ] Avatar upload създава pending media asset и не заменя стария одобрен avatar.
- [ ] Одобрение на avatar го активира навсякъде и архивира предишния одобрен avatar.
- [ ] Reject запазва стария avatar и премахва новия от всички публични DTO.
- [ ] Worker gallery показва само approved изображения.
- [ ] Request before/after снимките спазват moderation gate.
- [ ] Admin modal отваря всяка поддържана снимка в реален размер.
- [ ] Счупените storage paths се виждат като admin проблем, без да чупят страницата.
- [ ] E2E тест покрива avatar, gallery, request before и request after moderation.

## P1 - Единен и завършен интерфейс

- [ ] Определени са каноничните client, worker, admin и public компоненти.
- [ ] Старите и дублираните UI версии са премахнати или извадени от активните routes.
- [ ] Премахнати са видимите placeholder-и, demo действията и TODO бутоните.
- [ ] Всички основни страници имат loading, empty, success и error състояния.
- [ ] Desktop, tablet и mobile навигацията са последователни.
- [ ] Мобилните менюта имат плътен фон, достатъчен контраст и предвидимо затваряне.
- [ ] От картата и детайлните изгледи винаги има ясен път назад.
- [ ] Client и worker profile/settings полетата четат и записват реални API данни.
- [ ] Историята, активните заявки и известията имат еднаква визуална логика.
- [ ] Worker profile editor и публичният preview използват един и същ визуален contract.
- [ ] Формите имат inline validation и не разчитат на browser alert за основни действия.
- [ ] UI е проверен за дълъг текст, малки екрани и липсващи изображения.

## P1 - Admin backoffice

- [ ] Admin има видим и работещ logout.
- [ ] Users, workers, requests и media имат search, filters и pagination.
- [ ] Admin може отделно да approve account и да управлява public wall visibility.
- [ ] Admin може да suspend/reactivate user с причина.
- [ ] Admin може да cancel или reopen заключена поръчка с причина.
- [ ] Admin може да управлява категории, дейности и versioned pricing правила.
- [ ] Pricing промените се валидират и записват в audit log.
- [ ] Admin вижда request lifecycle, кандидатури, медии, участници и audit история на едно място.
- [ ] Всяка чувствителна admin операция изисква причина и оставя audit запис.
- [ ] Засегнатите потребители получават известие след admin намеса.

## P1 - Известия и комуникация

- [ ] Notification center работи за клиент и майстор.
- [ ] Прочетено/непрочетено се пази в backend.
- [ ] Има известия при кандидатура, избор, confirmation и lifecycle промени.
- [ ] Има известия при media approve/reject и account approve/reject/suspend.
- [ ] Има известия при admin cancel/reopen.
- [ ] Transactional email шаблоните са брандирани и mobile-friendly.
- [ ] SMTP грешките се логват без изтичане на credentials или reset token.
- [ ] Неуспешното email изпращане не оставя подвеждащ UI статус.

## P1 - SEO и публичен образ

- [ ] HTML `lang` е `bg`.
- [ ] Заглавието `frontend` е заменено с реално Bricky title.
- [ ] Vite favicon и останалите starter metadata са премахнати.
- [ ] Начална страница, майстори, профил и blog имат индивидуални title и description.
- [ ] Добавени са canonical URL и Open Graph metadata.
- [ ] Добавени са sitemap и валиден robots.txt.
- [ ] Worker и blog страниците имат подходящо structured data.
- [ ] Demo blog записите са заменени с реално редактирано съдържание или са скрити.
- [ ] Има професионална 404 страница.
- [ ] Има безопасна обща error страница.
- [ ] Проверени са indexability и mobile rendering.

## P1 - Правни и trust елементи

- [ ] Общи условия.
- [ ] Политика за поверителност.
- [ ] Cookie информация и consent поведение според реално използваните cookies.
- [ ] Контакт и канал за поддръжка.
- [ ] Правила за модерация и допустимо съдържание.
- [ ] Процес за деактивиране или изтриване на акаунт.
- [ ] Процес за export на лични данни.
- [ ] Ясни текстове как и кога Bricky отключва контактите между страните.

## P2 - Performance и поддръжка

- [ ] Големият frontend bundle е разделен по routes и тежки feature модули.
- [ ] Изображенията имат правилни размери, lazy loading и fallback.
- [ ] Основните Core Web Vitals са измерени на mobile и desktop.
- [ ] Няма ненужни production imports към dev mock системата.
- [ ] Големите profile/request компоненти са разделени по ясни ownership граници.
- [ ] Няма дублирана business логика между frontend, mock и backend contracts.
- [ ] Dependency audit е проверен преди release.

## P0 - Production наблюдение и защита

- [ ] Автоматичен uptime check за public site и readiness endpoint.
- [ ] Alert при паднал backend, database/storage failure или 5xx spike.
- [ ] Alert при запълване на диска.
- [ ] PM2 и NGINX логовете имат ограничение и rotation.
- [ ] SMTP failure се наблюдава.
- [ ] Backup на database и uploads се изпълнява автоматично.
- [ ] Restore rehearsal доказва, че backup-ът може да се възстанови.
- [ ] `bricky-traffic` отчита приблизителни visitors, locations, pages и sources.
- [ ] Добавена е privacy-conscious продуктова аналитика за основната funnel.

## QA матрица

### Роли

- [ ] Нов клиент.
- [ ] Съществуващ клиент.
- [ ] Pending майстор.
- [ ] Approved private майстор.
- [ ] Approved public майстор.
- [ ] Suspended майстор.
- [ ] Admin.
- [ ] Super admin.

### Устройства и браузъри

- [ ] Chrome desktop.
- [ ] Firefox desktop.
- [ ] Edge desktop.
- [ ] Chrome Android.
- [ ] Safari iPhone.
- [ ] Tablet viewport.
- [ ] Малък mobile viewport.

### Задължителни автоматични проверки

- [ ] Backend lint, build и всички unit/integration тестове.
- [ ] Frontend lint и production build.
- [ ] Database migration rehearsal върху production backup.
- [ ] Full client/admin/worker lifecycle E2E.
- [ ] Media moderation E2E.
- [ ] Suspended/unapproved authorization E2E.
- [ ] Password reset request, delivery и token consumption E2E.
- [ ] Public privacy contract smoke.
- [ ] Production deployment smoke и browser console/network проверка.

## Definition of Done

Final Sprint е завършен само когато:

- [ ] Няма известен P0 дефект.
- [ ] Няма основно действие, което води до placeholder, TODO или неработещ бутон.
- [ ] Пълният lifecycle минава три последователни пъти без DB или ръчна admin корекция.
- [ ] Всички роли получават правилните данни и действия за текущия статус.
- [ ] Pending/rejected медии не се показват публично.
- [ ] Контактът се отключва само за правилния worker и в правилния статус.
- [ ] Desktop и mobile acceptance проверките минават.
- [ ] Security, privacy и public DTO проверките минават.
- [ ] Има проверен backup, rollback и production smoke отчет.
- [ ] Поддръжката разполага с admin инструменти за всички блокиращи случаи.
- [ ] Безплатният 30-дневен режим е проверен и не изисква payment данни.

## Release checklist

- [ ] Freeze на функционалността извън Final Sprint.
- [ ] Fresh database и uploads backup.
- [ ] Restore rehearsal върху отделна база и uploads директория.
- [ ] Production migration rehearsal.
- [ ] Immutable frontend/backend bundle.
- [ ] Проверен rollback.
- [ ] Production deployment.
- [ ] Health, NGINX, PM2, storage и SMTP smoke.
- [ ] Реален client/worker/admin browser flow.
- [ ] Проверка на mobile устройство.
- [ ] Записване на начална и крайна дата на безплатния период.
- [ ] Публикуване на условията за безплатния старт.
- [ ] Наблюдение на първите регистрации и заявки.

## Показатели през безплатния месец

- Нови регистрации на клиенти.
- Нови регистрации и admin approval rate на майстори.
- Създадени и одобрени заявки.
- Време от публикуване до първа кандидатура.
- Заявки с избран и потвърден майстор.
- Завършени поръчки.
- Оставени ревюта.
- Drop-off по lifecycle етап.
- Media rejection rate.
- Password reset и login проблеми.
- Admin interventions на 100 заявки.
- Активни майстори и кандидати на заявка.
- Технически грешки, 5xx и email delivery failures.

## Следващ спринт

След изтичането или достатъчното валидиране на безплатния период започва отделен **Payment Sprint**.
Той ще използва реалните данни от първия месец за избор на:

- модел на абонамент или credits;
- платена public wall visibility;
- цени и ограничения;
- payment provider;
- checkout, invoices, refunds и webhook contract;
- grace period и поведение при изтекъл план.

Payment Sprint не започва преди Final Sprint да е приет и основният lifecycle да е стабилен.
