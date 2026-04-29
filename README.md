545# Brickly

Brickly is a monorepo for a fractional real estate investing demo platform. The current implementation includes a Next.js web app, an Express/Prisma API, a Postgres database, an Expo mobile app, AI-assisted summary/explanation flows, and blockchain verification plumbing with demo and Hardhat-backed providers.

## What Is Implemented

Current product areas in the repo:
- authentication, registration, email verification, and KYC flows
- property discovery, property detail, listings, and lister intake/import flows
- portfolio, holdings, market buy/sell order flows, and transaction history
- rental listings and rental application review
- notifications, documents, and admin audit history
- admin tooling for users, KYC, listers, MLS listings, liquidity, targeting, and market rules
- AI-backed or deterministic-fallback portfolio summaries, document summaries, and transaction explanations
- blockchain ownership/transfer verification endpoints plus local contract scripts
- Expo mobile app covering portfolio, market, imports, notifications, liquidity, and admin views

## Repo Structure

```text
apps/
  api/       Express + Prisma backend
  web/       Next.js frontend
  mobile/    Expo mobile client
contracts/   Solidity contract(s)
db/          Docker Postgres bootstrap assets
docs/        plans, runbooks, notes, and demo material
scripts/     deploy, seed, migration, and blockchain demo scripts
```

Key locations:
- [`apps/api`](/Users/prasadrane/Brickly/apps/api)
- [`apps/web`](/Users/prasadrane/Brickly/apps/web)
- [`apps/mobile`](/Users/prasadrane/Brickly/apps/mobile)
- [`apps/api/prisma/schema.prisma`](/Users/prasadrane/Brickly/apps/api/prisma/schema.prisma)
- [`docker-compose.yml`](/Users/prasadrane/Brickly/docker-compose.yml)
- [`hardhat.config.js`](/Users/prasadrane/Brickly/hardhat.config.js)

## Stack

- web: Next.js 16, React 18, TypeScript
- api: Express, Prisma, PostgreSQL, Zod, JWT
- mobile: Expo, React Native
- AI: OpenAI or Ollama provider selection with deterministic fallback
- blockchain: demo registry provider or Hardhat local provider
- local infrastructure: Docker Compose for Postgres, optional API/web containers

## Main Routes

Web pages implemented under [`apps/web/pages`](/Users/prasadrane/Brickly/apps/web/pages):
- investor: `/`, `/market`, `/properties`, `/portfolio`, `/orders`, `/buy-orders`, `/market-orders`, `/transactions`, `/documents`, `/alerts`, `/rentals`
- auth and onboarding: `/login`, `/register`, `/verify`, `/kyc`
- lister: `/listings`, `/listings/new`, `/lister/properties`, `/lister/import`, `/lister/import/[externalId]`
- admin: `/admin/users`, `/admin/kyc`, `/admin/listers`, `/admin/mls-listings`, `/admin/liquidity`, `/admin/market-rules`, `/admin/targeting`, `/admin/rentals`, `/admin/rental-applications`, `/admin/audit-logs`, `/admin/platform-architecture`

API surface is split between legacy routes in [`apps/api/src/index.ts`](/Users/prasadrane/Brickly/apps/api/src/index.ts) and modular `/v1` routes in [`apps/api/src/modules/v1/router.ts`](/Users/prasadrane/Brickly/apps/api/src/modules/v1/router.ts).

Implemented API areas include:
- auth: `/auth/register`, `/auth/login`, `/auth/verify`
- properties and listings: `/properties`, `/properties/:id`, `/listings`, `/listings/mine`, `/import/*`
- investing and portfolio: `/invest/buy`, `/portfolio`, `/market/sell-orders`, `/market/buy-orders`, `/transactions`
- compliance and notifications: `/kyc/*`, `/notifications/*`
- admin operations: `/admin/users`, `/admin/listers/*`, `/admin/mls-listings/*`, `/admin/liquidity/*`, `/admin/market-rules`, `/admin/targeting/*`, `/admin/audit-logs`
- modular v1 routes: `/v1/properties`, `/v1/portfolio/summary`, `/v1/orders`, `/v1/transactions`, `/v1/documents`, `/v1/notifications`, `/v1/admin/audit-history`
- AI and blockchain via v1: `/v1/portfolio/summary/ai`, `/v1/documents/:documentId/summarize`, `/v1/ai/explain-transaction`, `/v1/blockchain/*`

## Data Model Highlights

The Prisma schema covers more than the original Phase 1 demo. Major entities include:
- users, verification tokens, and KYC profiles
- properties, images, listings, share classes, holdings
- buy orders, sell orders, trades, and targeted offers
- documents, notifications, and admin audit logs
- rentals and rental applications
- MLS listings and property import source tracking
- targeting rule config and market rule config
- AI requests and prompt templates
- blockchain records and sync status

See [`apps/api/prisma/schema.prisma`](/Users/prasadrane/Brickly/apps/api/prisma/schema.prisma) for the full model.

## Local Development

Prerequisites:
- Node.js 18+
- Docker Desktop

Install dependencies:

```bash
npm install
```

Start the database only:

```bash
docker compose up db
```

Apply Prisma migrations and seed demo data:

```bash
DATABASE_URL=postgres://app:app@localhost:5433/fractional npm --workspace apps/api run prisma:migrate
DATABASE_URL=postgres://app:app@localhost:5433/fractional npm --workspace apps/api run prisma:seed
```

Run API and web locally:

```bash
npm --workspace apps/api run dev
npm --workspace apps/web run dev
```

Or run the top-level combined dev workflow:

```bash
npm run dev
```

Local URLs:
- web: `http://localhost:3000`
- api: `http://localhost:4000`
- health: `http://localhost:4000/health`
- postgres: `postgres://app:app@localhost:5433/fractional`

Stop local containers:

```bash
npm run db:down
```

## Environment Notes

Important API environment variables currently used by the app:
- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGINS`
- `WEB_BASE_URL`
- `DISABLE_EMAIL_VERIFICATION`
- `ALLOW_EMAIL_BYPASS`
- `AI_ENABLED`
- `AI_PROVIDER`
- `AI_REASONING_EFFORT`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_BASE_URL`
- `BLOCKCHAIN_ENABLED`
- `BLOCKCHAIN_PROVIDER`
- `BLOCKCHAIN_NETWORK`
- `BLOCKCHAIN_CHAIN_ID`
- `BLOCKCHAIN_RPC_URL`
- `BLOCKCHAIN_CONTRACT_ADDRESS`
- `BLOCKCHAIN_DEPLOYER_PRIVATE_KEY`

The API defaults to `postgres://app:app@localhost:5433/fractional` when `DATABASE_URL` is unset. AI falls back to deterministic responses when the configured provider is unavailable.

## Seeded Demo Users

The seed script in [`apps/api/prisma/seed.ts`](/Users/prasadrane/Brickly/apps/api/prisma/seed.ts) creates:
- `admin@fractional.app / demo-admin-123`
- `lister@fractional.app / demo-lister-123`
- `maya@fractional.app / demo-investor-123`
- `noah@fractional.app / demo-investor-456`
- `olivia@fractional.app / demo-investor-789`

It also provisions sample properties, listings, holdings, orders, trades, notifications, documents, configuration rows, and KYC-approved demo users.

## Mobile App

The Expo app lives in [`apps/mobile`](/Users/prasadrane/Brickly/apps/mobile).

Run it with:

```bash
npm --workspace apps/mobile run start
```

Note: [`apps/mobile/App.tsx`](/Users/prasadrane/Brickly/apps/mobile/App.tsx) currently points to a hard-coded API base URL for LAN testing. Update that value if your API is not running at the configured host.

## Blockchain Commands

Local blockchain scripts available from the repo root:

```bash
npm run chain:node
npm run chain:compile
npm run chain:deploy
npm run chain:demo
```

Relevant files:
- [`contracts/BricklyOwnershipRegistry.sol`](/Users/prasadrane/Brickly/contracts/BricklyOwnershipRegistry.sol)
- [`scripts/deploy.js`](/Users/prasadrane/Brickly/scripts/deploy.js)
- [`scripts/demo-ownership-flow.js`](/Users/prasadrane/Brickly/scripts/demo-ownership-flow.js)

## Tests

Available test entry points:

```bash
npm --workspace apps/api run test
npm --workspace apps/api run test:smoke
npm --workspace apps/web run test:e2e
```

## Additional Docs

- [`docs/README.md`](/Users/prasadrane/Brickly/docs/README.md)
- [`docs/PHASE_2_PLAN.md`](/Users/prasadrane/Brickly/docs/PHASE_2_PLAN.md)
- [`docs/PHASE_3_PLAN.md`](/Users/prasadrane/Brickly/docs/PHASE_3_PLAN.md)
- [`docs/phase3-blockchain-runbook.md`](/Users/prasadrane/Brickly/docs/phase3-blockchain-runbook.md)
- [`CHANGELOG.md`](/Users/prasadrane/Brickly/CHANGELOG.md)
