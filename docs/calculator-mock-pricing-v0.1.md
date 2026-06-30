# Bricky Mock Calculator and Expected Range UX v0.1

Last updated: 2026-06-30

## Scope

This document describes the calculator currently implemented in the Bricky mock request flow. It is a frontend/config validation layer only. This work did not add production database tables or migrations and did not change production pricing data.

## Current Capabilities

- 15 repair categories and 97 activity-level pricing rules.
- 174 indexed material and consumable items.
- Currency: EUR.
- Every displayed range boundary is rounded upward to the nearest 5 EUR.
- Three calculation modes:
  - `labor_only`;
  - `labor_plus_consumables`;
  - `labor_plus_materials_estimate`.
- Separate labor, material, and total min/max ranges.
- Bundle protection prevents included activities from being charged twice.
- Material confidence values:
  - `high`;
  - `medium`;
  - `low`;
  - `inspection_required`.
- Safety and inspection warnings for activities that cannot be estimated reliably without inspection.

## Main Files

- `frontend/src/constants/repairPricingConfig.js`: labor pricing by stable category/activity key.
- `frontend/src/constants/materialPriceIndex.js`: material and consumable price index.
- `frontend/src/constants/materialQuantityRules.js`: activity-specific quantity and inclusion rules.
- `frontend/src/utils/repairPriceCalculator.js`: shared calculation and display-range engine.
- `frontend/src/pages/Requests.jsx`: client request wizard and calculator UI.
- `frontend/src/utils/requestPresentation.js`: clean request-description and structured estimate presentation helpers.
- `frontend/scripts/verify-pricing-config.mjs`: pricing consistency and regression checks.

## Exact Area Input

Every repair category asks the client how many square meters need work. The quick size choices remain available and the exact area is an additional input.

Rules:

- Valid exact area is greater than zero and up to `2000` sq.m.
- Work above `2000` sq.m requires an individual estimate.
- Area-based activities use exact area directly.
- Room-based activities convert exact area conservatively using a 20 sq.m standard repair-area equivalent per room.
- Item, point, and other non-area activities do not multiply their labor by the property area.
- Area can still be retained as request context for non-area work.
- When exact area is available, the generic approximate-size warning is removed.

The normalized value is returned as `exactAreaM2` and is saved in the mock pricing snapshot.

## Expected and Possible Ranges

The raw technical range is preserved, but it is not always the primary client-facing number.

The display model contains:

```js
{
  expectedMin,
  expectedMax,
  possibleMin,
  possibleMax,
  confidence,
  displayMode,
  variationReason
}
```

### Wide-range rule

A range is considered too wide when:

```js
possibleMax / Math.max(possibleMin, 1) > 2.5
```

For a wide range, the fallback expected range is:

```js
expectedMin = roundUpToFive(possibleMin + spread * 0.20)
expectedMax = roundUpToFive(possibleMin + spread * 0.45)
```

The UI shows `Най-вероятно` as the primary range. `Възможен диапазон` is shown with lower visual weight. The technical possible range remains stored for honesty and future review.

For `inspection_required`, the UI explains that an inspection is needed and treats the labor range as the pre-inspection expected reference.

## Request Description Separation

Calculator metadata is not part of the free-form repair description.

New requests no longer write these lines into `description`:

- pricing mode;
- labor range;
- material range;
- expected range;
- possible technical range;
- calculator version.

The price is stored in structured request fields and in the mock `pricingSnapshot`. It is presented separately as `Ориентировъчна цена` in:

- the client request list;
- the worker request feed and completed history;
- the repair map request panel.

`requestPresentation.js` also removes legacy calculator lines when old mock descriptions are rendered. This is a presentation compatibility fix; it does not rewrite old localStorage records.

## Mock Pricing Snapshot

The mock request snapshot currently preserves:

- labor, material, total, expected, and possible min/max ranges;
- pricing, material-rule, and material-index versions;
- selected category and activity keys;
- quick size key and normalized `exactAreaM2`;
- pricing mode and currency;
- confidence and display mode;
- category variation reason;
- included/excluded material keys;
- warnings and calculation notes.

Production must eventually support an equivalent immutable historical snapshot. Old request estimates must not change when live pricing rules are updated.

## Verification

Run from `frontend`:

```powershell
npm run test:pricing
npm run build
```

The pricing test verifies:

- all 97 activities have material quantity rules;
- every referenced material key exists in the 174-item index;
- all ranges are complete, ordered, and nonnegative;
- bundle protection and inspection behavior;
- all three pricing modes;
- exact area scaling for area work;
- area does not multiply item-based work;
- the 2000 sq.m cap;
- expected/possible conversion for a wide `100-790 EUR` range;
- removal of calculator lines from legacy descriptions;
- structured expected-range formatting.

## Known Limitations and Next Steps

- Validate labor and material ranges with 3-5 active workers before production use.
- Validate current supplier prices and package assumptions.
- Add client controls for urgency, access/complexity, material quality, and customer-supplied materials.
- Move the old independent calculator in `WorkerProfile.jsx` to the shared engine.
- Design the production DTO and immutable database snapshot only after mock validation.
- Add category-specific follow-up questions to narrow wide ranges.
- Keep final quotes explicitly dependent on photos or an on-site inspection.

## Related Commits

- `0c9e2b0` - material quantity pricing foundation.
- `4fc739c` - exact area and expected/possible range UX.
- `ec9a382` - separate estimates from request descriptions.
