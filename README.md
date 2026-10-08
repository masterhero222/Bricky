# Bricky

Bricky е marketplace платформа за ремонтни услуги, която свързва клиенти с майстори и строителни специалисти в структуриран и проследим процес.

Целта на проекта е да направи намирането на изпълнител, кандидатстването по реални обекти и управлението на ремонта по-ясно, надеждно и прозрачно и за двете страни.

## Какъв проблем решава

Пазарът на ремонтни услуги често е разпокъсан между препоръки, обяви, Facebook групи и неформални контакти.

Bricky цели да реши няколко основни проблема:

- трудно намиране на подходящ и надежден майстор;
- липса на структурирани профили, портфолио и история;
- неясен процес от първата заявка до приключването на ремонта;
- трудна комуникация и проследяване на статуса;
- липса на централизирани кандидатури и сравнение на изпълнители;
- слабо доверие между клиент и майстор;
- липса на последователна история, обратна връзка и ревюта след приключване на обекта.

## Как работи

Основният marketplace процес е:

```text
draft
→ pending_approval
→ published
→ applied
→ assigned
→ worker_confirmed
→ on_site
→ inspected
→ in_progress
→ work_finished
→ awaiting_client_confirmation
→ client_confirmed
→ reviewed
→ completed
```

Клиентът публикува заявка за ремонт, майсторите кандидатстват, клиентът избира изпълнител, а Bricky проследява процеса до приключването и ревюто.

## Основни функционалности

- регистрация на клиенти и майстори;
- публични профили на майстори;
- категории и специализации;
- заявки за ремонт;
- кандидатстване по заявки;
- избор и назначаване на майстор;
- проследяване на целия lifecycle на ремонта;
- изображения и медия към профили и заявки;
- модерация;
- ревюта и история на завършени ремонти;
- email verification и password recovery;
- административен панел;
- audit история;
- referral система;
- Bricky Knowledge / информационен център;
- подготовка за платежна система и монетизация.

## Referral система

Bricky включва referral модел за майстори.

Майстор може да покани друг майстор в платформата. След като поканеният изпълнител завърши успешно 2 реални ремонта чрез Bricky, препоръчалият го майстор получава 30 дни подсилена видимост в платформата.

Целта е да се изгражда качествена база от реални и активни специалисти, а не просто голям брой регистрации.

## Технологии

### Frontend

- React
- Vite
- Tailwind CSS
- JavaScript
- REST API integration

### Backend

- NestJS
- TypeORM
- MySQL
- JWT Authentication
- Role-based access
- REST API

### Infrastructure

- VPS hosting
- Nginx
- `PM2`
- `Git`
- GitHub
- CI / automated testing
- environment-based configuration

## Архитектура

```text
React / Vite Frontend
        ↓
      REST API
        ↓
NestJS Backend
        ↓
 TypeORM / MySQL
```

Проектът използва отделни frontend и backend слоеве, като бизнес логиката и marketplace lifecycle-ът се управляват от backend-а.

## My Role / Technical Contribution

Моята роля в Bricky е комбинация от product ownership, системно мислене, техническо управление на AI-assisted development workflow и практическо go-to-market изпълнение.

Основните ми отговорности включват:

- дефиниране на product requirements, потребителски flows и очакваното поведение на системите;
- структуриране на development задачите в последователни работни блокове и спринтове;
- използване на AI-assisted development за техническо проучване, архитектурни варианти, debugging, refactoring и итеративно развитие;
- създаване и подобряване на structured prompts за ограничаване на повтарящи се грешки и запазване на контекст между работни сесии;
- работа с GitHub branches, pull requests, merges и техническа документация;
- участие в deployment, production configuration и server troubleshooting;
- участие в конфигурация на Google Console и SEO настройки;
- проверка дали реализираните промени следват зададената продуктова и техническа посока;
- разбиване на сложни проблеми на по-малки задачи и проследяване на прогреса между различни работни блокове;
- участие в debugging на database, application и production проблеми;
- валидиране на функционалности чрез тестове, build проверки и реално поведение на системата;
- участие в product positioning и комуникационната посока на Bricky;
- планиране на маркетингово съдържание за социални мрежи, основно Facebook и Instagram;
- създаване на визуални концепции, изображения и кратко видео съдържание за представяне на продукта;
- използване на AI инструменти за content production, image generation и video workflows;
- проучване на content formats, audience behavior, social media trends и acquisition канали;
- анализ на представянето на съдържанието и итеративно подобряване на messaging и content strategy;
- работа по разпознаваемостта на Bricky и по привличането на клиенти и майстори;
- изграждане на повторяеми content workflows, които могат да бъдат оптимизирани с времето.

AI се използва като development и creative tool за ускоряване на анализа, реализацията и content production, а не като заместител на техническата или продуктовата преценка.

## Engineering Challenges

### 1. Повредена или загубена база данни

**Problem:**  
В хода на развитието проектът е срещал ситуации с повредена, неправилно променена или загубена база данни, което създава риск за development и production средите.

**Approach:**  
Проблемите се анализират спрямо текущата schema, наличните данни, migration history и environment configuration. Подходът е постепенно възстановяване и стабилизиране, вместо прибързани промени върху production данни.

**Result / Learning:**  
Този тип проблеми показаха необходимостта от по-строга backup стратегия, migration validation и ясна граница между development, mock и production средите.

### 2. Неправилни database migrations

**Problem:**  
Неправилни или непълни migrations могат да доведат до schema drift, счупени зависимости и различно поведение между локална и production среда.

**Approach:**  
Използва се по-консервативен подход с проверка на migration логиката, build/test validation и постепенно прилагане на schema промени. Production конфигурацията не трябва да разчита на автоматично синхронизиране на schema.

**Result / Learning:**  
Migration процесът трябва да бъде третиран като отделна production задача с предварителна проверка, backup и възможност за rollback.

### 3. Legacy code в production

**Problem:**  
По-ранни версии на проекта съдържат legacy логика и архитектурни решения, които могат да създадат конфликт с новите marketplace flows и data models.

**Approach:**  
Вместо пълен rewrite се използва постепенно стабилизиране, refactoring и additive промени, когато е възможно. Старото поведение се анализира преди промяна, за да не се счупят работещи production функции.

**Result / Learning:**  
Итеративното стабилизиране намалява риска и позволява проектът да продължи да се развива, докато техническият дълг се отстранява постепенно.

### 4. Нестабилни или неработещи системи

**Problem:**  
В различни етапи отделни функционалности, authentication flows, media handling, mock behavior или production integrations могат да работят различно или нестабилно.

**Approach:**  
Проблемите се изолират по слой: frontend, API, backend service, database, environment configuration или deployment. След това се работи върху минималната промяна, която решава конкретния проблем, преди да се продължи към следващата итерация.

**Result / Learning:**  
Систематичното разделяне на проблема по слоеве е по-надеждно от едновременното променяне на няколко части от системата.

### 5. Debugging на production поведение

**Problem:**  
Някои проблеми се проявяват само в production заради различия в environment variables, VPS конфигурация, reverse proxy, process management, database state или deployment версия.

**Approach:**  
Сравняват се локално и production поведение, build state, configuration, logs и текущата deployed версия. Промените се правят контролирано и се документират.

**Result / Learning:**  
Production troubleshooting изисква отделно мислене от локалната разработка и ясна видимост върху реално deploy-натата версия и нейната конфигурация.

### 6. Архитектурни и deployment грешки от по-ранни версии

**Problem:**  
С развитието на проекта някои ранни решения вече не отговарят на текущия размер и сложност на системата.

**Approach:**  
Проблемите се приоритизират според риск за production, data integrity и core marketplace flow. Корекциите се правят постепенно, като се запазва работещото поведение и се подобрява архитектурата на следващи стъпки.

**Result / Learning:**  
Проектът се развива най-стабилно чрез последователни технически подобрения, а не чрез големи еднократни пренаписвания.

## Development Workflow

Работният процес по Bricky следва последователен цикъл:

```text
Idea
→ Research
→ Prototype / Test
→ AI-assisted implementation
→ Debugging
→ Validation
→ Documentation
→ Next iteration
```

Практически това означава:

- използване на AI за проучване на технологии, пазари, тенденции, workflows и архитектурни решения;
- превръщане на продуктова идея в технически изисквания и по-малки изпълними задачи;
- prototyping и testing преди по-широка интеграция;
- AI-assisted implementation с последващо review, debugging и validation;
- използване на structured prompt engineering за намаляване на повторяеми грешки и запазване на технически контекст;
- работа на последователни работни блокове вместо големи недефинирани задачи;
- документиране на текущото състояние, известните проблеми и следващите стъпки;
- използване на GitHub workflow за branches, pull requests, merges и история на промените;
- проверка на build, тестове и production поведение преди следваща итерация.

## Product, Marketing & Content

Bricky се развива не само като техническа система, а и като продукт, който трябва да бъде разбираем и позициониран ясно спрямо реални клиенти и майстори.

Работата в тази област включва:

- development of Bricky's positioning and communication strategy;
- social media content planning for Facebook and Instagram;
- creation of visual concepts and AI-assisted content;
- AI image generation and AI video production workflows;
- research of audience behavior, content formats, acquisition channels and platform trends;
- iterative content improvement based on performance and audience response;
- alignment between product development, marketing messaging and marketplace growth goals.

### AI Creative Workflow

Развивам практически AI-assisted creative workflows, които допълват product и go-to-market работата по Bricky.

Те включват:

- image generation;
- structured prompt engineering за визуална консистентност;
- AI video generation;
- keyframe-based workflows;
- Blender / CGI-assisted scene creation;
- iterative visual testing;
- content production за маркетингови цели.

Фокусът е върху изграждането на повторяем и практически използваем creative process, а не върху представяне на ролята като professional 3D art или professional video editing.

## Разработка

**Начало на разработката:** 2025  
**Статус:** Active Development

Bricky се развива итеративно чрез MVP подход и функционални спринтове.

Основният начин на развитие е:

1. изграждане на работещ MVP;
2. валидиране на основния marketplace flow;
3. стабилизиране на backend и базата данни;
4. автоматизирани тестове и CI;
5. подобряване на UX/UI;
6. добавяне на moderation, security и admin инструменти;
7. тестване с реални клиенти и майстори;
8. добавяне на монетизация и платежна система;
9. постепенно мащабиране на платформата.

Разработката използва както production среда, така и локална mock среда за по-бързо тестване и продуктова итерация.

## Текуща продуктова посока

Основният фокус в момента е върху:

- привличане на реални майстори;
- генериране на реални клиентски заявки;
- подобряване на marketplace liquidity;
- изграждане на разпознаваемост на Bricky;
- имплементация на платежна система;
- подобряване на onboarding-а;
- развитие на SEO и Bricky Knowledge;
- performance marketing и social media acquisition.

## Current Technical Roadmap

Текущата техническа roadmap е фокусирана върху:

- payment system integration;
- object storage;
- monitoring / observability;
- deployment hardening;
- backup strategy;
- CI/CD improvements;
- performance and stability improvements;
- production readiness;
- security hardening.

## Монетизация

Планираните модели включват:

- абонамент за майстори;
- система с точки / credits;
- подсилена видимост;
- premium позициониране;
- платени marketplace функции;
- бъдеща интеграция на плащания през платформата.

Платежният слой се проектира като заменяем модул, така че Bricky да не зависи архитектурно от един конкретен payment provider.

## Portfolio Highlights

- Live production marketplace product на `bricky.bg`.
- Разделена frontend / backend архитектура с React, NestJS и REST API.
- Database-backed система с MySQL и TypeORM.
- JWT authentication и role-based access.
- Moderation, admin tools, audit history и structured marketplace lifecycle.
- CI / automated testing и реален deployment върху VPS, Nginx и `PM2`.
- Combined product development, technical execution and AI-assisted marketing/content workflows for a live marketplace product.

## Live Project / Repository

**Live project:** https://bricky.bg  
**GitHub:** https://github.com/masterhero222/Bricky

## Vision

Bricky има за цел да превърне ремонта от хаотичен процес, базиран основно на случайни препоръки и неформални контакти, в по-структурирана marketplace система с ясни правила, проверими профили, история, кандидатури, проследим процес и реална обратна връзка.

Целта не е просто да се съберат клиенти и майстори на едно място.

Целта е да се изгради инфраструктура за по-добро доверие, комуникация и управление на ремонтните услуги.

---

# C V VERSION – BRICKY

**Bricky — Marketplace Platform for Home Repair Services**

- Created the product concept and defined the product direction, system behavior and marketplace workflows for a live web platform connecting clients with repair professionals.
- Managed an AI-assisted development workflow covering technical research, structured prompt engineering, architecture exploration, debugging, refactoring support and iterative product development.
- Worked with a full-stack architecture based on React, Vite, Tailwind CSS, NestJS, TypeORM, MySQL, REST APIs, JWT authentication and role-based access.
- Participated in GitHub branch, pull request and merge workflows, technical documentation, deployment validation and production troubleshooting.
- Contributed to VPS, Nginx, PM2, Google Console and SEO configuration while supporting production deployment and operational stability.
- Troubleshot issues involving database migrations, legacy production code, environment configuration and inconsistent application behavior across development and production.
- Structured complex technical problems into smaller work blocks, validated implementation against product requirements and maintained iterative development documentation.
- Contributed to product positioning, go-to-market communication and AI-assisted content creation for Bricky, including social media planning, visual concepts, content experimentation and audience-focused messaging.
