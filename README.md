# Brickly

Brickly Phase 1 is an investor-demo-ready web application for fractional property investing. This phase focuses on the operational core only: auth, property discovery, portfolio views, orders, transactions, documents, notifications, and admin auditability. AI and blockchain are intentionally deferred, but the codebase now includes stable extension points for both.

## Phase 1 Scope
Phase 1 includes:
- user auth and KYC-aware access control
- property and listing inventory
- portfolio summary and holdings
- internal order and transaction workflow
- document attachments and stubbed local storage
- notifications and admin audit history
- investor-demo UI for dashboard, properties, portfolio, orders, documents, transactions, and admin views

Phase 1 does not include:
- real LLM calls
- wallet or blockchain settlement
- payment processing

## Architecture Overview
The application is a monorepo with a Next.js frontend, Node/Express backend, Postgres database, and Prisma ORM.

Current architecture:
- frontend: [`apps/web`](/Users/prasadrane/Brickly/apps/web)
- backend: [`apps/api`](/Users/prasadrane/Brickly/apps/api)
- database schema and seeds: [`apps/api/prisma`](/Users/prasadrane/Brickly/apps/api/prisma)

Backend organization:
- [`src/config`](/Users/prasadrane/Brickly/apps/api/src/config): environment and runtime configuration
- [`src/db`](/Users/prasadrane/Brickly/apps/api/src/db): Prisma client
- [`src/modules`](/Users/prasadrane/Brickly/apps/api/src/modules): route/module manifests and `/v1` routing
- [`src/repositories`](/Users/prasadrane/Brickly/apps/api/src/repositories): Prisma-backed data access
- [`src/services`](/Users/prasadrane/Brickly/apps/api/src/services): operational services plus AI/blockchain placeholders
- [`src/shared`](/Users/prasadrane/Brickly/apps/api/src/shared): shared HTTP/auth/error/logging utilities
- [`src/index.ts`](/Users/prasadrane/Brickly/apps/api/src/index.ts): app entry point and legacy route composition

Frontend organization:
- [`components`](/Users/prasadrane/Brickly/apps/web/components): reusable UI and page presentation components
- [`config`](/Users/prasadrane/Brickly/apps/web/config): runtime config
- [`modules`](/Users/prasadrane/Brickly/apps/web/modules): frontend module ownership map
- [`services`](/Users/prasadrane/Brickly/apps/web/services): API client, auth token storage, AI/blockchain placeholders
- [`shared`](/Users/prasadrane/Brickly/apps/web/shared): shared frontend types and format helpers
- [`pages`](/Users/prasadrane/Brickly/apps/web/pages): Next.js routes for the current demo

## Folder Structure Summary
```text
apps/
  api/
    prisma/
      schema.prisma
      seed.ts
    src/
      config/
      db/
      modules/
      repositories/
      services/
        ai/
        analytics/
        blockchain/
        operational/
        storage/
      shared/
      index.ts
  web/
    components/
      dashboard/
      layout/
      properties/
      ui/
    config/
    modules/
    pages/
      admin/
      properties/
    services/
      ai/
      api/
      auth/
      blockchain/
    shared/
    styles/
```

Module map:
- auth
- properties/assets
- portfolio
- transactions/orders
- admin
- uploads/documents
- notifications
- analytics placeholder
- ai placeholder
- blockchain placeholder

## Database Entities
Main Phase 1 entities in [`schema.prisma`](/Users/prasadrane/Brickly/apps/api/prisma/schema.prisma):
- `User`: application users, roles, verification posture
- `Property`: investable property/asset record
- `Listing`: listing metadata for a property
- `ShareClass`: fractional ownership supply and pricing reference
- `Holding`: user ownership in a property share class
- `BuyOrder`: investor buy intent
- `SellOrder`: investor sell intent
- `Trade`: completed internal transaction record
- `Document`: uploaded attachments linked to properties, trades, orders, or user/admin-note style references
- `Notification`: user-facing operational event
- `AdminAuditLog`: immutable admin/compliance-style activity history
- `PlatformConfig`: Phase 1 configuration placeholder table

Future-facing nullable fields already exist where natural:
- `verificationStatus`
- `blockchainTxHash`
- `aiSummaryCache`

## Key API Endpoints
Primary Phase 1 API surface lives under `/v1`:

Core data:
- `GET /v1/users/me`
- `GET /v1/users/:userId/holdings`
- `GET /v1/properties`
- `GET /v1/properties/:propertyId`
- `GET /v1/portfolio/summary`

Orders and transactions:
- `GET /v1/orders`
- `POST /v1/orders`
- `POST /v1/orders/:side/:orderId/cancel`
- `GET /v1/transactions`

Documents:
- `GET /v1/documents`
- `GET /v1/documents/by-entity`
- `POST /v1/documents/metadata`
- `POST /v1/documents/upload-stub`

Notifications and audit:
- `GET /v1/notifications`
- `POST /v1/notifications/:id/read`
- `POST /v1/notifications/read-all`
- `GET /v1/admin/audit-history`

## Local Development
Prerequisites:
- Node.js 18+
- Docker Desktop

Install and start:
```bash
npm install
npm run db:up
DATABASE_URL=postgres://app:app@localhost:5433/fractional npx prisma migrate deploy --schema apps/api/prisma/schema.prisma
DATABASE_URL=postgres://app:app@localhost:5433/fractional npm --workspace apps/api run prisma:seed
npm run dev
```

Local URLs:
- API: `http://localhost:4000`
- Web: `http://localhost:3000`
- Postgres: `postgres://app:app@localhost:5433/fractional`

Stop Postgres:
```bash
npm run db:down
```

## Seed Demo Data
The Phase 1 seed script creates:
- 5 demo users
- 3 properties
- holdings across multiple properties
- sample buy/sell orders
- transaction history
- documents
- notifications
- admin audit logs

Run seed:
```bash
DATABASE_URL=postgres://app:app@localhost:5433/fractional npm --workspace apps/api run prisma:seed
```

Demo credentials:
- `admin@fractional.app / demo-admin-123`
- `lister@fractional.app / demo-lister-123`
- `maya@fractional.app / demo-investor-123`
- `noah@fractional.app / demo-investor-456`
- `olivia@fractional.app / demo-investor-789`

## Demo Walkthrough
Recommended investor-demo path:
1. Open `http://localhost:3000/login`
2. Sign in as `maya@fractional.app / demo-investor-123`
3. Review the dashboard at `/`
4. Browse `/properties` and open a property detail page
5. Open `/portfolio` for holdings and allocation
6. Use `/orders` to submit or cancel a demo order
7. Review `/transactions` and `/documents`
8. Open `/alerts` to show operational notifications
9. Sign in as admin and open `/admin/audit-logs`
10. Open `/admin/platform-architecture` to show the Phase 1 foundation and future seams

## Future Roadmap
Phase 2 AI:
- backend home: [`apps/api/src/services/ai`](/Users/prasadrane/Brickly/apps/api/src/services/ai)
- frontend home: [`apps/web/services/ai`](/Users/prasadrane/Brickly/apps/web/services/ai)
- planned use cases:
  - portfolio summaries
  - document summarization
  - property insight widgets
  - operational support tooling

Phase 3 blockchain:
- backend home: [`apps/api/src/services/blockchain`](/Users/prasadrane/Brickly/apps/api/src/services/blockchain)
- frontend home: [`apps/web/services/blockchain`](/Users/prasadrane/Brickly/apps/web/services/blockchain)
- planned use cases:
  - ownership verification
  - transfer settlement references
  - blockchain-backed audit enrichment
  - verified transaction confirmations

Notes:
- TODO markers such as `PHASE_2_AI` and `PHASE_3_BLOCKCHAIN` are already placed in key services and screens.
- The current structure is designed so AI and blockchain can be layered in later without major route or schema rewrites.
