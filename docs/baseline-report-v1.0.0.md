# Baseline Report v1.0.0

Date: 2026-02-10
Branch: baseline-2026-02-10
Tag: v1.0.0-baseline (pending)

## Build and Test Summary
Status: PARTIAL PASS

## Recompute Metrics Behavior
Endpoint: `POST /admin/liquidity/recompute?propertyId=...`
- Recomputes reference price from existing reference, recent trades VWAP, and listing NAV proxy.
- Recomputes liquidity score from recent trade count, average time-to-fill, and ask deviation vs reference.
- Updates `optimizedPricePerShare` on all open sell orders using liquidity + strategy adjustments.

Endpoint: `POST /admin/liquidity/recompute-all`
- Performs the same recomputation for each property with open/partial sell orders.

### Commands Executed
- `npm --workspace apps/api run build`
- `npm --workspace apps/api run test`
- `npm --workspace apps/web run build`
- `npm --workspace apps/web run test:e2e`

### Results
API build: PASS
API tests: PASS (with skips)
Web build: PASS
Web e2e tests: FAIL

### Failures and Warnings
API tests:
- All tests passed after rerun with local API server.
- Smoke tests that require `ADMIN_EMAIL` and `ADMIN_PASSWORD` were skipped.

Web build:
- Next.js warning about inferred workspace root and multiple lockfiles.

Web e2e tests:
- Playwright browsers installed.
- Two tests failed due to timeout waiting for login form field label `Email or phone`.

## Environment Notes
- No environment variables for admin credentials were set when running tests.
