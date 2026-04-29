# Codebase Map

This document is the shortest modular way to understand Brickly.

Read the system in layers:

1. Routes define what exists.
2. Services define behavior.
3. Repositories and Prisma define data.
4. Web pages and clients define what users see.

## System Model

- Postgres + Prisma: operational truth
- Blockchain: proof and verification layer
- AI: explanation and insight layer over operational + proof data
- Next.js web app: investor/admin UI over those APIs

## Backend Entry Points

### Request Map

- API route surface: [apps/api/src/modules/v1/router.ts](/Users/prasadrane/Brickly/apps/api/src/modules/v1/router.ts)
- App bootstrap: [apps/api/src/index.ts](/Users/prasadrane/Brickly/apps/api/src/index.ts)
- Environment wiring: [apps/api/src/config/env.ts](/Users/prasadrane/Brickly/apps/api/src/config/env.ts)

Start with `router.ts` if you want to know what the app can do.

### Operational Domain Services

These are the main business modules.

- Portfolio: [apps/api/src/services/operational/portfolio.service.ts](/Users/prasadrane/Brickly/apps/api/src/services/operational/portfolio.service.ts)
- Properties: [apps/api/src/services/operational/property.service.ts](/Users/prasadrane/Brickly/apps/api/src/services/operational/property.service.ts)
- Orders: [apps/api/src/services/operational/order.service.ts](/Users/prasadrane/Brickly/apps/api/src/services/operational/order.service.ts)
- Transactions: [apps/api/src/services/operational/transaction.service.ts](/Users/prasadrane/Brickly/apps/api/src/services/operational/transaction.service.ts)
- Documents: [apps/api/src/services/operational/document.service.ts](/Users/prasadrane/Brickly/apps/api/src/services/operational/document.service.ts)
- Notifications: [apps/api/src/services/operational/notification.service.ts](/Users/prasadrane/Brickly/apps/api/src/services/operational/notification.service.ts)
- Audit: [apps/api/src/services/operational/audit.service.ts](/Users/prasadrane/Brickly/apps/api/src/services/operational/audit.service.ts)
- Users: [apps/api/src/services/operational/user.service.ts](/Users/prasadrane/Brickly/apps/api/src/services/operational/user.service.ts)

Use these when you want to understand marketplace behavior without AI or blockchain details getting in the way.

### AI Layer

- Main AI orchestration: [apps/api/src/services/ai/index.ts](/Users/prasadrane/Brickly/apps/api/src/services/ai/index.ts)
- Prompt builders: [apps/api/src/services/ai/promptBuilders](/Users/prasadrane/Brickly/apps/api/src/services/ai/promptBuilders)

What lives here:

- portfolio summary
- transaction explanation
- document summary
- ownership summary
- audit summary
- anomaly detection
- liquidity insight

Read this after the operational services, because AI depends on them.

### Blockchain Layer

- Main blockchain service: [apps/api/src/services/blockchain/index.ts](/Users/prasadrane/Brickly/apps/api/src/services/blockchain/index.ts)
- Shared blockchain types: [apps/api/src/services/blockchain/types.ts](/Users/prasadrane/Brickly/apps/api/src/services/blockchain/types.ts)
- Hardhat notes: [docs/hardhat-implementation.md](/Users/prasadrane/Brickly/docs/hardhat-implementation.md)

What lives here:

- property verification
- transfer verification
- ownership proof recording
- sync of pending blockchain records

### Data Access Layer

- Repositories: [apps/api/src/repositories](/Users/prasadrane/Brickly/apps/api/src/repositories)
- Prisma schema: [apps/api/prisma/schema.prisma](/Users/prasadrane/Brickly/apps/api/prisma/schema.prisma)
- Seed data: [apps/api/prisma/seed.ts](/Users/prasadrane/Brickly/apps/api/prisma/seed.ts)

If you are asking “where does this field come from?” this is usually the next place to look.

## Frontend Entry Points

### Shell and Shared Clients

- App shell: [apps/web/components/layout/AppShell.tsx](/Users/prasadrane/Brickly/apps/web/components/layout/AppShell.tsx)
- API client: [apps/web/services/api/client.ts](/Users/prasadrane/Brickly/apps/web/services/api/client.ts)
- AI client: [apps/web/services/ai/index.ts](/Users/prasadrane/Brickly/apps/web/services/ai/index.ts)
- Blockchain client: [apps/web/services/blockchain/index.ts](/Users/prasadrane/Brickly/apps/web/services/blockchain/index.ts)
- Token storage: [apps/web/services/auth/token-storage.ts](/Users/prasadrane/Brickly/apps/web/services/auth/token-storage.ts)

### Investor-Facing Pages

- Dashboard: [apps/web/pages/index.tsx](/Users/prasadrane/Brickly/apps/web/pages/index.tsx)
- Portfolio: [apps/web/pages/portfolio.tsx](/Users/prasadrane/Brickly/apps/web/pages/portfolio.tsx)
- Transactions: [apps/web/pages/transactions.tsx](/Users/prasadrane/Brickly/apps/web/pages/transactions.tsx)
- Properties list: [apps/web/pages/properties/index.tsx](/Users/prasadrane/Brickly/apps/web/pages/properties/index.tsx)
- Property detail: [apps/web/pages/properties/[id].tsx](/Users/prasadrane/Brickly/apps/web/pages/properties/[id].tsx)
- Orders: [apps/web/pages/orders.tsx](/Users/prasadrane/Brickly/apps/web/pages/orders.tsx)
- Documents: [apps/web/pages/documents.tsx](/Users/prasadrane/Brickly/apps/web/pages/documents.tsx)

Use these pages when you want to trace a user-facing feature end to end.

### Admin-Facing Pages

- Audit logs: [apps/web/pages/admin/audit-logs.tsx](/Users/prasadrane/Brickly/apps/web/pages/admin/audit-logs.tsx)
- Liquidity: [apps/web/pages/admin/liquidity.tsx](/Users/prasadrane/Brickly/apps/web/pages/admin/liquidity.tsx)
- Users: [apps/web/pages/admin/users.tsx](/Users/prasadrane/Brickly/apps/web/pages/admin/users.tsx)
- KYC: [apps/web/pages/admin/kyc.tsx](/Users/prasadrane/Brickly/apps/web/pages/admin/kyc.tsx)
- Targeting: [apps/web/pages/admin/targeting.tsx](/Users/prasadrane/Brickly/apps/web/pages/admin/targeting.tsx)
- Platform architecture: [apps/web/pages/admin/platform-architecture.tsx](/Users/prasadrane/Brickly/apps/web/pages/admin/platform-architecture.tsx)

### Key UI Components

- Ownership timeline: [apps/web/components/blockchain/OwnershipHistory.tsx](/Users/prasadrane/Brickly/apps/web/components/blockchain/OwnershipHistory.tsx)
- Holding card: [apps/web/components/dashboard/HoldingCard.tsx](/Users/prasadrane/Brickly/apps/web/components/dashboard/HoldingCard.tsx)
- Shared page/metric primitives: [apps/web/components/ui](/Users/prasadrane/Brickly/apps/web/components/ui)

## Best Reading Paths

### Path 1: Learn The Core Marketplace

1. [apps/api/src/modules/v1/router.ts](/Users/prasadrane/Brickly/apps/api/src/modules/v1/router.ts)
2. [apps/api/src/services/operational/property.service.ts](/Users/prasadrane/Brickly/apps/api/src/services/operational/property.service.ts)
3. [apps/api/src/services/operational/order.service.ts](/Users/prasadrane/Brickly/apps/api/src/services/operational/order.service.ts)
4. [apps/api/src/services/operational/transaction.service.ts](/Users/prasadrane/Brickly/apps/api/src/services/operational/transaction.service.ts)
5. [apps/web/pages/properties/[id].tsx](/Users/prasadrane/Brickly/apps/web/pages/properties/[id].tsx)
6. [apps/web/pages/orders.tsx](/Users/prasadrane/Brickly/apps/web/pages/orders.tsx)

### Path 2: Learn The AI Layer

1. [apps/api/src/services/ai/index.ts](/Users/prasadrane/Brickly/apps/api/src/services/ai/index.ts)
2. [apps/api/src/services/ai/promptBuilders/portfolioSummary.ts](/Users/prasadrane/Brickly/apps/api/src/services/ai/promptBuilders/portfolioSummary.ts)
3. [apps/api/src/services/ai/promptBuilders/transactionExplanation.ts](/Users/prasadrane/Brickly/apps/api/src/services/ai/promptBuilders/transactionExplanation.ts)
4. [apps/api/src/services/ai/promptBuilders/ownershipSummary.ts](/Users/prasadrane/Brickly/apps/api/src/services/ai/promptBuilders/ownershipSummary.ts)
5. [apps/web/services/ai/index.ts](/Users/prasadrane/Brickly/apps/web/services/ai/index.ts)
6. [apps/web/pages/portfolio.tsx](/Users/prasadrane/Brickly/apps/web/pages/portfolio.tsx)
7. [apps/web/pages/transactions.tsx](/Users/prasadrane/Brickly/apps/web/pages/transactions.tsx)

### Path 3: Learn The Blockchain Layer

1. [apps/api/src/services/blockchain/index.ts](/Users/prasadrane/Brickly/apps/api/src/services/blockchain/index.ts)
2. [apps/api/src/repositories/blockchain.repository.ts](/Users/prasadrane/Brickly/apps/api/src/repositories/blockchain.repository.ts)
3. [apps/web/services/blockchain/index.ts](/Users/prasadrane/Brickly/apps/web/services/blockchain/index.ts)
4. [apps/web/components/blockchain/OwnershipHistory.tsx](/Users/prasadrane/Brickly/apps/web/components/blockchain/OwnershipHistory.tsx)
5. [apps/web/pages/properties/[id].tsx](/Users/prasadrane/Brickly/apps/web/pages/properties/[id].tsx)

### Path 4: Learn Phase 4 Combined Intelligence

1. [docs/system-flows-architecture.md](/Users/prasadrane/Brickly/docs/system-flows-architecture.md)
2. [apps/api/src/services/ai/index.ts](/Users/prasadrane/Brickly/apps/api/src/services/ai/index.ts)
3. [apps/api/src/services/blockchain/index.ts](/Users/prasadrane/Brickly/apps/api/src/services/blockchain/index.ts)
4. [apps/web/pages/portfolio.tsx](/Users/prasadrane/Brickly/apps/web/pages/portfolio.tsx)
5. [apps/web/pages/properties/[id].tsx](/Users/prasadrane/Brickly/apps/web/pages/properties/[id].tsx)
6. [apps/web/pages/admin/audit-logs.tsx](/Users/prasadrane/Brickly/apps/web/pages/admin/audit-logs.tsx)

## Where To Debug Common Questions

- “Why does this endpoint exist?”: [apps/api/src/modules/v1/router.ts](/Users/prasadrane/Brickly/apps/api/src/modules/v1/router.ts)
- “Why does the business logic behave this way?”: operational service file for that domain
- “Why is AI saying this?”: [apps/api/src/services/ai/index.ts](/Users/prasadrane/Brickly/apps/api/src/services/ai/index.ts) plus the matching prompt builder
- “Why is something verified or unverified?”: [apps/api/src/services/blockchain/index.ts](/Users/prasadrane/Brickly/apps/api/src/services/blockchain/index.ts)
- “Why is the UI showing this card/panel?”: matching page in [apps/web/pages](/Users/prasadrane/Brickly/apps/web/pages)
- “Where is the source data?”: [apps/api/prisma/schema.prisma](/Users/prasadrane/Brickly/apps/api/prisma/schema.prisma) and repositories

## Tests As Documentation

- API tests: [tests/api](/Users/prasadrane/Brickly/tests/api)
- Browser tests: [apps/web/tests](/Users/prasadrane/Brickly/apps/web/tests)
- Verification suite notes: [docs/testing-verification-suite.md](/Users/prasadrane/Brickly/docs/testing-verification-suite.md)

If you want to understand a feature quickly, read the route, then its service, then the matching test.
