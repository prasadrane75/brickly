# Verification Test Suite

## Purpose

This suite verifies the implemented Brickly application across all three phases without rewriting the product architecture:

- Phase 1: core application workflows
- Phase 2: AI interpretation and safe fallback behavior
- Phase 3: blockchain proof and verification behavior

The suite is intentionally aligned with the existing runtime model:

- Postgres remains the operational source of truth
- AI is treated as an additive layer and is tested in deterministic fallback mode
- blockchain is exercised against a local Hardhat node and must not block core app behavior

## Test Structure

```text
test/
  BricklyOwnershipRegistry.test.js      Hardhat contract tests

tests/
  api/
    core.api.test.ts                    Core API verification
    ai.api.test.ts                      AI endpoints, caching, fallback
    blockchain.api.test.ts              Blockchain APIs and persistence
  support/
    config.ts                           Shared test config
    data.ts                             Seeded entity lookup helpers
    demo-users.ts                       Stable demo identities
    http.ts                             Authenticated HTTP helpers
    prisma.ts                           Prisma access for verification

scripts/test/
  prepare-environment.mjs              DB seed + Prisma + Hardhat compile
  start-hardhat-node.mjs               Local Hardhat process
  start-api.mjs                        Test-mode API process
  start-web.mjs                        Test-mode web process
  run-api-tests.mjs                    API test orchestration

apps/web/tests/
  helpers/session.ts                   Shared Playwright login helper
  investor-journeys.spec.ts            Core investor browser flows
  ai-flows.spec.ts                     AI browser flows
  blockchain-verification.spec.ts      Verification and admin browser flows
  smoke.spec.ts                        Basic browser smoke coverage
  global.setup.ts                      Playwright environment setup
```

## Commands

Prepare the local test environment:

```bash
npm run test:prepare
```

Run Hardhat contract tests:

```bash
npm run test:contracts
```

Run API integration tests:

```bash
npm run test:api
```

Run API performance smoke tests:

```bash
npm run test:api:perf
```

Refresh the saved API performance baseline:

```bash
npm run test:api:perf:baseline
```

The standard perf run writes `cache/api-perf-report.json`. It also compares each endpoint against `cache/api-perf-baseline.json` when that file exists. By default the run allows up to `50%` average-latency regression and `75%` p95 regression over baseline before failing. Override with `API_PERF_REPORT_PATH`, `API_PERF_BASELINE_PATH`, `API_PERF_MAX_AVG_REGRESSION_PERCENT`, or `API_PERF_MAX_P95_REGRESSION_PERCENT` as needed.

Run browser end-to-end tests:

```bash
npm run test:e2e
```

Run browser performance smoke tests:

```bash
npm run test:e2e:perf
```

Refresh the saved browser performance baseline:

```bash
npm run test:e2e:perf:baseline
```

The browser perf run writes `cache/web-perf-report.json`. It also compares each page against `cache/web-perf-baseline.json` when that file exists. By default it allows up to `50%` regression over baseline for elapsed, DOMContentLoaded, and load timings. Override with `WEB_PERF_REPORT_PATH`, `WEB_PERF_BASELINE_PATH`, `WEB_PERF_MAX_ELAPSED_REGRESSION_PERCENT`, `WEB_PERF_MAX_DOM_REGRESSION_PERCENT`, or `WEB_PERF_MAX_LOAD_REGRESSION_PERCENT` as needed.
The browser perf scripts use dedicated ports (`3110`, `4110`, `9555`) so they do not collide with the default local UI test or dev ports.

Run the full verification suite:

```bash
npm run test:verify
```

## Test Mode Environment

The test harness uses the following defaults:

- Postgres: `postgres://app:app@localhost:5433/fractional`
- API: `http://127.0.0.1:4100`
- Web: `http://127.0.0.1:3100`
- Hardhat RPC: `http://127.0.0.1:8545`

The API test mode intentionally sets:

- `DISABLE_EMAIL_VERIFICATION=true`
- `ALLOW_EMAIL_BYPASS=true`
- `AI_ENABLED=true`
- `AI_PROVIDER=openai`
- `OPENAI_API_KEY=test-key`
- `OPENAI_BASE_URL=http://127.0.0.1:1`
- `BLOCKCHAIN_ENABLED=true`
- `BLOCKCHAIN_PROVIDER=hardhat-local`
- `BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545`

Why the AI config looks odd:

- the fake OpenAI configuration forces provider calls to fail immediately
- the application then exercises its deterministic fallback path
- this keeps AI tests stable and verifies graceful degradation behavior

## Seed Data Assumptions

The suite depends on the existing seeded demo users and seeded business data:

- `admin@fractional.app / demo-admin-123`
- `maya@fractional.app / demo-investor-123`
- `noah@fractional.app / demo-investor-456`
- seeded properties
- seeded holdings
- seeded trades
- seeded documents
- seeded notifications

`npm run test:prepare` reseeds the database before the API or browser suite is started.

## Coverage Goals

The current suite covers:

- auth and login behavior
- portfolio summary and holdings flows
- properties list and detail
- order creation validation and success
- transactions, documents, notifications, and audit history
- AI portfolio summary, transaction explanation, and document summary flows
- AI persistence and caching checks
- AI graceful fallback behavior
- smart contract deployment, issuance, transfer, and revert paths
- blockchain ownership and transfer proof APIs
- blockchain tx hash and verification status persistence
- verified badge visibility in the browser
- safe degradation when blockchain proof execution fails

The API performance smoke suite covers:

- `/health`
- `/v1/properties?page=1&pageSize=20`
- `/v1/portfolio/summary`

Each performance check uses warmup requests, then asserts average and p95 latency budgets against a local deterministic environment. Thresholds can be tuned with environment variables such as `API_PERF_ITERATIONS`, `API_PERF_PROPERTIES_AVG_MS`, and `API_PERF_PORTFOLIO_P95_MS`.

## Notes

- The browser suite starts its own local Hardhat, API, and web processes.
- The API suite starts its own local Hardhat and API processes.
- The contract suite runs directly through Hardhat.
- The verification suite is designed for local deterministic execution, not external-provider integration testing.
