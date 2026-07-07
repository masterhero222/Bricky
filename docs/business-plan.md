# Bricky Business Plan

## Purpose

This document summarizes the current business direction for Bricky monetization, credits, worker plans, visibility logic, and future payment integration.

Source reviewed:

`C:/Users/asus/Downloads/Bricky Monetization & Credits Business Logic Specification.docx`

## Product Positioning

Bricky is a marketplace that connects clients with repair workers and tradespeople.

The first strong positioning should be:

**Bricky = marketplace + professional CV + reputation system for repair workers.**

Bricky should not initially act as an escrow or commission intermediary for the actual repair job.

The platform should first sell value to workers:

- access to repair requests;
- ability to apply to requests;
- request visibility;
- public worker profile;
- portfolio / completed job history;
- reputation and reviews;
- priority exposure in the marketplace.

## Core Marketplace Flow

1. Client publishes a repair request.
2. Client can upload photos and details.
3. Workers see available requests.
4. Workers apply to requests.
5. Client chooses a worker.
6. Worker completes the job.
7. Request becomes part of worker history / Bricky CV.
8. Client leaves a review.

## Monetization Direction

Early version:

- clients do not pay;
- workers can register for free;
- workers receive limited free applications;
- after free applications are used, workers need credits or a paid plan;
- real payment provider integration comes later, after the platform is stable.

Why clients should be free:

- clients create the request supply;
- charging clients early creates friction;
- more valid requests make Bricky more valuable to workers.

Why workers pay:

- workers receive direct business value;
- each request can become paid work;
- worker-side monetization is easier to explain and test.

## Worker Plans

The future worker-side structure should support four levels:

- Free
- Basic
- Standard
- Pro

These plans should control:

- monthly application allowance;
- request visibility;
- profile ranking;
- profile features;
- gallery limits;
- completed jobs / portfolio visibility;
- priority access;
- future analytics or verification features.

### Free Plan

Purpose: allow workers to test Bricky without payment.

Suggested behavior:

- visibility level 1;
- limited free applications;
- public profile;
- basic profile information;
- limited gallery;
- limited request information;
- no priority ranking.

### Basic Plan

Purpose: entry paid plan for small or part-time workers.

Suggested behavior:

- visibility level 2;
- more applications than Free;
- better request access;
- basic public profile;
- basic gallery;
- basic completed job history.

### Standard Plan

Purpose: main plan for active workers.

Suggested behavior:

- visibility level 3;
- higher monthly application limit;
- better ranking in worker listings;
- better request visibility;
- larger gallery;
- Bricky CV / completed jobs;
- more categories or wider service area.

### Pro Plan

Purpose: premium plan for serious workers, teams, and small companies.

Suggested behavior:

- visibility level 4;
- highest request visibility;
- priority ranking;
- more applications;
- more gallery/media capacity;
- stronger profile branding;
- more completed job display;
- priority access to larger requests;
- future analytics;
- future verified badge.

## Credits System

Credits should allow workers to use Bricky without immediately subscribing.

Credits can be used for:

- applying to a request;
- unlocking fuller request details;
- priority application;
- future request boosts.

Initial MVP rule:

**A worker spends credits when applying to a request after free applications are used.**

Draft credit costs:

- small repair: 1 credit;
- normal repair: 2-3 credits;
- large repair: 5 credits;
- bathroom renovation / high-value request: 5-10 credits;
- full renovation: 10+ credits.

These values must stay configurable. Do not hardcode final pricing.

## Request Application Logic

A worker can apply if:

- worker account exists;
- worker profile exists;
- worker is approved or allowed in test mode;
- request is open;
- worker has not already applied;
- worker has available free applications, plan allowance, or enough credits.

A worker cannot apply if:

- request is completed;
- request is canceled;
- worker already applied;
- worker has no free applications, no plan allowance, and not enough credits;
- worker profile is blocked or suspended.

## Visibility Logic

Request visibility should become a main monetization lever.

Visibility levels:

- Free: level 1;
- Basic: level 2;
- Standard: level 3;
- Pro: level 4.

The system should support future visibility rules based on:

- worker plan;
- worker service category;
- city/area;
- rating;
- completed jobs;
- response speed;
- request urgency;
- request value;
- request age;
- worker approval status.

Do not overbuild these rules immediately. Build a simple architecture that can be extended.

## Recommended Database Direction

The current database should be cleaned and stabilized before monetization.

Monetization must not be built on fragile fields such as:

- `requests.appliedWorkers`;
- request photo JSON blobs;
- mixed worker id / user id usage;
- Bulgarian display strings as statuses.

Recommended future tables:

- `request_applications`
- `worker_plans`
- `worker_credit_wallets`
- `worker_credit_transactions`
- `payment_orders`
- `subscriptions`

### request_applications

Suggested fields:

- `id`
- `requestId`
- `workerUserId`
- `status`
- `creditsSpent`
- `source`
- `createdAt`
- `updatedAt`

Possible statuses:

- `applied`
- `withdrawn`
- `accepted`
- `rejected`
- `expired`

Possible sources:

- `free_application`
- `plan_allowance`
- `credits`
- `admin_manual`

### worker_credit_wallets

Suggested fields:

- `id`
- `workerUserId`
- `balance`
- `createdAt`
- `updatedAt`

### worker_credit_transactions

Suggested fields:

- `id`
- `workerUserId`
- `amount`
- `type`
- `reason`
- `requestId`
- `paymentId`
- `createdAt`

Possible transaction types:

- `purchase`
- `spend`
- `refund`
- `admin_adjustment`
- `trial_bonus`

### worker_plans

Suggested fields:

- `id`
- `workerUserId`
- `plan`
- `visibilityLevel`
- `status`
- `startedAt`
- `expiresAt`
- `billingPeriodStart`
- `billingPeriodEnd`
- `applicationLimit`
- `applicationsUsed`
- `createdAt`
- `updatedAt`

Possible plan values:

- `free`
- `basic`
- `standard`
- `pro`

Possible statuses:

- `active`
- `inactive`
- `past_due`
- `canceled`
- `expired`
- `trial`

### payment_orders

Suggested fields:

- `id`
- `userId`
- `workerUserId`
- `amount`
- `currency`
- `provider`
- `providerPaymentId`
- `status`
- `productType`
- `creditsAmount`
- `planType`
- `createdAt`
- `paidAt`
- `failedAt`

Possible product types:

- `credits`
- `subscription`
- `manual_activation`

Possible statuses:

- `pending`
- `paid`
- `failed`
- `canceled`
- `refunded`

## Backend Services

Future backend should separate responsibilities:

- `PlansService`
- `CreditsService`
- `PaymentsService`
- `RequestApplicationsService`
- `RequestVisibilityService`

### RequestApplicationsService

Responsibilities:

- apply to request;
- prevent duplicate applications;
- check request status;
- check worker eligibility;
- spend free application / plan allowance / credits;
- create application record;
- notify client.

### CreditsService

Responsibilities:

- get worker credit balance;
- add credits;
- spend credits;
- refund credits;
- write credit transactions;
- prevent negative balances.

### PlansService

Responsibilities:

- get current worker plan;
- check visibility level;
- check application allowance;
- increment application usage;
- handle plan expiration.

### PaymentsService

Responsibilities:

- create payment order;
- confirm payment;
- activate credits or plan;
- store payment status;
- support manual/admin activation in MVP.

### RequestVisibilityService

Responsibilities:

- return request feed based on visibility level;
- hide or show fields based on worker plan;
- control sorting/ranking;
- support future visibility rules.

## Suggested API Endpoints

Worker billing:

- `GET /worker/billing/status`
- `GET /worker/credits`
- `POST /worker/credits/purchase`
- `GET /worker/credits/transactions`

Worker plan:

- `GET /worker/plan`
- `POST /worker/plan/subscribe`
- `POST /worker/plan/cancel`

Requests:

- `POST /requests/:id/apply`
- `GET /requests/worker`
- `GET /requests/map`

The existing `POST /requests/:id/apply` should eventually use `RequestApplicationsService`.

## Frontend Placement

Monetization UI should live mainly in the worker dashboard.

Suggested dashboard sections:

- current plan;
- credit balance;
- applications left;
- payment history;
- upgrade button;
- buy credits button.

When a worker tries to apply without access, show an upgrade modal:

```text
You need credits or a paid plan to apply to this request.
```

Actions:

- buy credits;
- upgrade plan.

## Payment Timing

Do not charge workers at registration.

Charge when value is visible:

- worker used free applications;
- worker wants to apply to more requests;
- worker wants better visibility;
- worker wants Pro features.

Best payment moments:

- at application attempt;
- in worker dashboard;
- in upgrade prompt.

## Manual Payment MVP

Before integrating a real payment provider, Bricky can support manual activation:

1. Worker contacts Bricky.
2. Worker pays manually.
3. Admin grants credits or activates a plan manually.

This lets the team test monetization logic without payment provider risk.

## Development Phases

### Phase 1: Foundation

Goal: clean data model and stable platform behavior.

Tasks:

- clean database;
- fix users/workers identity confusion;
- normalize request model;
- replace `appliedWorkers` with `request_applications`;
- move request images into `request_images` or shared media table;
- convert statuses to machine constants;
- stabilize map;
- stabilize calculator.

### Phase 2: Credits Without Real Payments

Goal: test business logic internally before adding real money.

Tasks:

- create credit wallet;
- create credit transactions;
- give test worker trial credits;
- spend credits on application;
- block application when no credits;
- show credit balance in worker dashboard;
- allow admin/manual credit adjustment.

### Phase 3: Visibility Levels

Goal: add Free / Basic / Standard / Pro visibility.

Tasks:

- create plan model;
- attach visibility level to worker;
- filter request feed by visibility level;
- create frontend plan display;
- create upgrade prompts.

### Phase 4: Payment Integration

Goal: enable real purchases.

Tasks:

- create payment order model;
- add payment provider;
- buy credits;
- activate paid plan;
- store payment history;
- handle failed/canceled payments;
- add admin/payment logs.

### Phase 5: Optimization

Goal: improve revenue and marketplace quality.

Tasks:

- tune credit prices;
- tune visibility levels;
- add worker ranking;
- add request scoring;
- add high-value request logic;
- add notifications for paid workers;
- add analytics.

## Rules To Decide Later

Do not hardcode yet:

- exact plan prices;
- exact number of applications per plan;
- exact free trial applications;
- exact credit cost per category;
- exact visibility rules per level;
- exact ranking logic;
- exact payment provider;
- exact refund rules;
- exact admin override rules.

## Recommended Initial Config Shape

```js
const WORKER_PLANS = {
  free: {
    visibilityLevel: 1,
    monthlyApplicationLimit: 5,
    galleryLimit: 3,
  },
  basic: {
    visibilityLevel: 2,
    monthlyApplicationLimit: 15,
    galleryLimit: 10,
  },
  standard: {
    visibilityLevel: 3,
    monthlyApplicationLimit: 50,
    galleryLimit: 30,
  },
  pro: {
    visibilityLevel: 4,
    monthlyApplicationLimit: 150,
    galleryLimit: 100,
  },
};

const REQUEST_CREDIT_COSTS = {
  small: 1,
  normal: 3,
  large: 5,
  renovation: 10,
};
```

These are example values only.

## Final Direction

Start with worker-side monetization.

Use:

- free onboarding;
- credits for request applications;
- plans for visibility;
- no early client payments;
- no early repair commission;
- no real payment provider before the database, frontend, map, calculator, and request flow are stable.

The first technical step is preparing the database and backend for:

- `request_applications`
- credits;
- credit transactions;
- worker plans;
- payment orders;
- visibility levels.
