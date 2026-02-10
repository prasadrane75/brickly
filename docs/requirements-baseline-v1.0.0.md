# Requirements Baseline v1.0.0

Baseline date: 2026-02-10
Source: Phase2AB.md

## Scope
This baseline captures Phase 2A/2B features and flows as implemented in the repository at tag `v1.0.0-baseline`.

## Must-Have Requirements
- Liquidity and pricing calculations for reference price, liquidity score, and optimized sell order pricing.
- Targeting rules to identify likely buyers and create targeted offers and notifications.
- Notifications API for users to retrieve and mark notifications as read.
- Admin liquidity dashboard and detail views.
- Unit and smoke tests for pricing, targeting, API, and UI.
- Data model changes for liquidity, targeting, and notifications.

## Should-Have Requirements
- Admin actions to recompute metrics and send buyer alerts from the UI.
- Auto-run targeting on sell order creation (best effort).

## Out of Scope (for this baseline)
- Capturing `PropertyView` data from the UI.
- Full wiring of dashboard and detail pages to live endpoints where mock data is used.

## Acceptance Criteria
- Reference price uses weighted inputs and updates `ShareClass.referencePricePerShare` and `ShareClass.lastReferenceUpdateAt`.
- Liquidity score computed from trade count, time-to-fill, and ask deviation and updates `Property.liquidityScore`.
- Optimized sell order price respects liquidity and strategy adjustments and caps as defined.
- Targeting run creates `TargetedOffer` and `Notification` records and returns top 20 buyers.
- Notifications endpoints enforce ownership and support read and read-all operations.
- Admin liquidity pages render KPI cards, tables, and detail data per the Phase2AB flows.
- Tests pass per the test list in Phase2AB.

## Requirements-to-Code Map
Requirement: Liquidity + Pricing (API)
Code: `apps/api/src/pricing/`, `apps/api/src/market/`, `apps/api/src/index.ts`, `apps/api/prisma/schema.prisma`

Requirement: Targeting + Notifications (API)
Code: `apps/api/src/targeting/`, `apps/api/src/market/`, `apps/api/src/index.ts`, `apps/api/prisma/schema.prisma`

Requirement: Notifications API (User)
Code: `apps/api/src/targeting/`, `apps/api/src/index.ts`, `apps/api/prisma/schema.prisma`

Requirement: Admin Liquidity Dashboard (Web)
Code: `apps/web/pages/admin/liquidity.tsx`, `apps/web/pages/admin/liquidity/`, `apps/web/styles/liquidity.css`

Requirement: Admin Liquidity Detail (Web)
Code: `apps/web/pages/admin/liquidity/`, `apps/web/styles/liquidity.css`

Requirement: Tests
Code: `apps/api/src/__tests__/`, `apps/api/src/pricing/__tests__/`, `apps/api/src/targeting/__tests__/`, `apps/web/tests/`, `apps/web/playwright.config.ts`

Requirement: Data Model Changes
Code: `apps/api/prisma/schema.prisma`, `apps/api/prisma/migrations/`

## Open Questions
- Which endpoints are considered production-ready for UI wiring on the liquidity dashboard and detail pages?
- Should `PropertyView` be captured via API middleware or explicit client events?

## Approvals
- Product: TBD
- Engineering: TBD
- QA: TBD
