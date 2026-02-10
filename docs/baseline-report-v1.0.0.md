# Baseline Report v1.0.0

Date: 2026-02-10
Branch: baseline-2026-02-10
Tag: v1.0.0-baseline (pending)

## Build and Test Summary
Status: PARTIAL PASS

### Commands Executed
- `npm --workspace apps/api run build`
- `npm --workspace apps/api run test`
- `npm --workspace apps/web run build`
- `npm --workspace apps/web run test:e2e`

### Results
API build: PASS
API tests: FAIL
Web build: PASS
Web e2e tests: FAIL

### Failures and Warnings
API tests:
- `apps/api/src/__tests__/smoke.test.ts` failed due to `fetch failed`, likely because the API server is not running.
- Smoke tests that require `ADMIN_EMAIL` and `ADMIN_PASSWORD` were skipped.

Web build:
- Next.js warning about inferred workspace root and multiple lockfiles.

Web e2e tests:
- Playwright browser binaries not installed. Suggested fix: run `npx playwright install`.

## Environment Notes
- No environment variables for admin credentials were set when running tests.
- Playwright browsers are not present in the local cache.
