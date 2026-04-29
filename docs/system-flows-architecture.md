# Brickly System Flows Architecture

This document captures the implemented service topology and the main sequence
of events across the Brickly platform. The diagrams are based on the current
code paths in the repo, not a future-state proposal.

## Service Topology

```mermaid
flowchart LR
    Browser[Web Browser]
    Web[Next.js Web App\napps/web]
    API[Express API\napps/api/src/index.ts]
    Auth[Auth + Role Gates]
    Portfolio[Portfolio Service]
    Orders[Order Service]
    Documents[Document Service]
    Notifications[Notification Service]
    AI[AI Service]
    Blockchain[Blockchain Service]
    Storage[Local Document Storage\napps/api/dev-uploads]
    Prisma[Prisma Client]
    DB[(Postgres)]
    OpenAI[OpenAI / AI Provider]
    Hardhat[Hardhat / Blockchain Provider]

    Browser --> Web
    Web -->|REST /api -> rewrites| API

    API --> Auth
    API --> Portfolio
    API --> Orders
    API --> Documents
    API --> Notifications
    API --> AI
    API --> Blockchain

    Auth --> Prisma
    Portfolio --> Prisma
    Orders --> Prisma
    Documents --> Prisma
    Notifications --> Prisma
    AI --> Prisma
    Blockchain --> Prisma

    Prisma --> DB
    Documents --> Storage
    AI --> OpenAI
    Blockchain --> Hardhat

    Orders -. async proof trigger .-> Blockchain
    AI -. deterministic fallback .-> API
    Blockchain -. proof/verification overlay .-> API
```

## Backend Service Boundaries

```mermaid
flowchart TB
    subgraph WebTier[Web Tier]
      Pages[Pages / Admin Views / Investor Views]
      Client[apiFetch client]
      Pages --> Client
    end

    subgraph ApiTier[API Tier]
      Routes[Express Route Handlers]
      Middleware[Auth / Role / Error Middleware]
      Routes --> Middleware
    end

    subgraph ServiceTier[Service Layer]
      P[Portfolio Service]
      O[Order Service]
      D[Document Service]
      N[Notification Service]
      A[AI Service]
      B[Blockchain Service]
      AN[Analytics Service]
    end

    subgraph RepoTier[Repository Layer]
      PR[portfolioRepository]
      OR[orderRepository]
      DR[documentRepository]
      NR[notificationRepository]
      AR[aiRepository]
      BR[blockchainRepository]
      TR[transactionRepository]
      PropR[propertyRepository]
    end

    subgraph Infra[Infrastructure]
      PG[(Postgres)]
      FS[Document File Storage]
      AP[AI Provider]
      BC[Blockchain Provider]
    end

    Client --> Routes
    Routes --> P
    Routes --> O
    Routes --> D
    Routes --> N
    Routes --> A
    Routes --> B
    Routes --> AN

    P --> PR
    O --> OR
    O --> AR
    O --> BR
    O --> FS
    D --> DR
    D --> FS
    N --> NR
    A --> AR
    A --> PR
    A --> TR
    B --> BR
    B --> TR
    B --> PropR

    PR --> PG
    OR --> PG
    DR --> PG
    NR --> PG
    AR --> PG
    BR --> PG
    TR --> PG
    PropR --> PG

    A --> AP
    B --> BC
```

## Request Domains

```mermaid
flowchart LR
    Auth["/auth, /kyc"]
    Properties["/v1/properties, /listings, /rentals, /import"]
    Portfolio["/v1/portfolio"]
    Orders["/v1/orders, /market"]
    Transactions["/v1/transactions"]
    Documents["/v1/documents"]
    Notifications["/v1/notifications"]
    Admin["/v1/admin"]
    AI["AI endpoints / rationale flows"]
    Blockchain["blockchain proof / verification flows"]

    Auth -->|identity + verification| API[API]
    Properties --> API
    Portfolio --> API
    Orders --> API
    Transactions --> API
    Documents --> API
    Notifications --> API
    Admin --> API
    AI --> API
    Blockchain --> API
```

## Sequence Flows

### 1. Authentication And Session Bootstrap

```mermaid
sequenceDiagram
    actor User
    participant Web as Next.js Web
    participant API as Express API
    participant DB as Postgres via Prisma

    User->>Web: Submit login form
    Web->>API: POST /auth/login
    API->>DB: Look up user by email / phone
    API->>DB: Read password hash + verification state
    API->>API: Validate credentials and issue JWT
    API-->>Web: token + authenticated user context
    Web->>Web: Persist token for future API requests
    Web-->>User: Redirect to dashboard
```

### 2. Portfolio Summary Read Flow

```mermaid
sequenceDiagram
    actor Investor
    participant Web as Next.js Web
    participant API as Express API
    participant Portfolio as portfolioService
    participant Repo as portfolioRepository
    participant DB as Postgres

    Investor->>Web: Open /portfolio
    Web->>API: GET /v1/portfolio/summary
    API->>Portfolio: getSummary(userId)
    Portfolio->>Repo: findUserForSummary
    Portfolio->>Repo: findHoldingsForSummary
    Portfolio->>Repo: findRecentTransactions
    Portfolio->>Repo: findOpenBuyOrders / findOpenSellOrders
    Portfolio->>Repo: findNotificationsPreview
    Repo->>DB: Query user, holdings, trades, orders, notifications
    DB-->>Repo: Result sets
    Repo-->>Portfolio: Hydrated domain records
    Portfolio->>Portfolio: Compute value, invested amount, income, allocation
    Portfolio-->>API: Summary payload with extension fields
    API-->>Web: Portfolio JSON
    Web-->>Investor: Render holdings, orders, income, activity
```

### 3. Buy Order Execution Flow

```mermaid
sequenceDiagram
    actor Investor
    participant Web as Next.js Web
    participant API as Express API
    participant Orders as orderService
    participant Repo as orderRepository
    participant Store as documentStorageService
    participant DB as Postgres
    participant Chain as blockchainService

    Investor->>Web: Submit BUY order
    Web->>API: POST /v1/orders
    API->>Orders: create / execute buy workflow
    Orders->>Repo: runInTransaction(...)
    Orders->>Repo: find property execution context
    Orders->>Repo: create buy order + create system notification
    Orders->>Repo: find matching sell order

    alt Matching sell order exists
        Orders->>Repo: decrement seller holding
        Orders->>Repo: upsert buyer holding
        Orders->>Repo: create trade
        Orders->>Repo: update buy + sell order fill state
        Orders->>Store: generate trade confirmation PDF
        Orders->>Repo: persist document metadata
        Orders->>Repo: create buyer/seller notifications
        Orders->>Repo: create admin audit log
        Orders-->>API: completed / partial workflow result
        Orders-)Chain: async recordTransferProof(tradeId)
    else No match found
        Orders-->>API: open order result
    end

    API-->>Web: Order response with workflow summary
    Web-->>Investor: Show submitted / completed state
```

### 4. Document Upload Stub Flow

```mermaid
sequenceDiagram
    actor User
    participant Web as Next.js Web
    participant API as Express API
    participant Docs as documentService
    participant Store as documentStorageService
    participant Repo as documentRepository
    participant DB as Postgres

    User->>Web: Upload document metadata / stub
    Web->>API: POST /v1/documents/upload-stub
    API->>Docs: validate actor + link target
    Docs->>Store: saveUploadStub(...)
    Store->>Store: create JSON or simple PDF placeholder
    Store-->>Docs: storageKey + public fileUrl
    Docs->>Repo: create document row
    Docs->>Repo: create notification
    Docs->>Repo: create audit log
    Repo->>DB: persist document, notification, audit entries
    DB-->>Repo: committed rows
    Docs-->>API: hydrated document response
    API-->>Web: Document metadata payload
    Web-->>User: Show uploaded document entry
```

### 5. AI Summary / Fallback Flow

```mermaid
sequenceDiagram
    actor User
    participant Web as Next.js Web
    participant API as Express API
    participant AI as aiService
    participant Repo as aiRepository
    participant Domain as portfolioService / transactionService
    participant DB as Postgres
    participant Provider as OpenAI Provider

    User->>Web: Request AI summary / rationale
    Web->>API: AI-related endpoint
    API->>AI: summarizePortfolio / summarizeDocument / explainTransaction
    AI->>Repo: find latest valid cache by cacheKey

    alt Cache hit
        Repo->>DB: read cached AI request
        DB-->>Repo: cached response
        AI-->>API: cached generated result
    else Cache miss
        AI->>Domain: gather deterministic source payload
        Domain->>DB: read operational data
        DB-->>Domain: source records
        Domain-->>AI: normalized prompt payload
        AI->>Provider: generateText(instructions, content)

        alt Provider success
            Provider-->>AI: generated summary
            AI->>Repo: create AI request / cache record
            Repo->>DB: persist generated response
            AI-->>API: generated result
        else Provider unavailable or disabled
            AI->>AI: build deterministic fallback
            AI->>Repo: persist fallback result metadata
            Repo->>DB: store fallback request record
            AI-->>API: fallback result
        end
    end

    API-->>Web: AI response with source = generated or fallback
    Web-->>User: Render explanation without blocking core flow
```

### 6. Blockchain Transfer Proof Flow

```mermaid
sequenceDiagram
    participant Orders as orderService
    participant Chain as blockchainService
    participant TxRepo as transactionRepository
    participant BRepo as blockchainRepository
    participant DB as Postgres
    participant Provider as Hardhat / Demo Provider

    Orders-)Chain: recordTransferProof(transactionId)
    Chain->>TxRepo: load trade + property context
    TxRepo->>DB: read trade, property, ownership context
    DB-->>TxRepo: trade snapshot
    Chain->>Chain: ensureTransferSourceOwnership if needed
    Chain->>Provider: transferShares(...)

    alt Provider confirms
        Provider-->>Chain: txHash, blockNumber, wallet, confirmed status
        Chain->>BRepo: create blockchain record
        BRepo->>DB: persist proof record
        Chain->>DB: update trade/property verification fields
    else Provider skipped or failed
        Provider-->>Chain: skipped / failed status + note
        Chain->>BRepo: create blockchain record with failure state
        BRepo->>DB: persist failure or pending record
    end
```

### 7. Blockchain Verification Read Flow

```mermaid
sequenceDiagram
    actor User
    participant Web as Next.js Web
    participant API as Express API
    participant Chain as blockchainService
    participant BRepo as blockchainRepository
    participant DB as Postgres

    User->>Web: Open verification-aware page
    Web->>API: property / transaction / blockchain verification request
    API->>Chain: build verification snapshot
    Chain->>BRepo: listByEntity / findLatestForEntity
    BRepo->>DB: read blockchain records
    DB-->>BRepo: record list
    Chain->>Chain: rank preferred record and compute snapshot
    Chain-->>API: verification status + latest record + note
    API-->>Web: verification payload
    Web-->>User: Render verified badge / tx hash / status history
```

### 8. Notification Read And Acknowledge Flow

```mermaid
sequenceDiagram
    actor User
    participant Web as Next.js Web
    participant API as Express API
    participant Notify as notificationService
    participant Repo as notificationRepository
    participant DB as Postgres

    User->>Web: Open notifications
    Web->>API: GET /v1/notifications
    API->>Notify: list(userId, unreadOnly, pagination)
    Notify->>Repo: count + findMany
    Repo->>DB: query notifications
    DB-->>Repo: rows
    Notify-->>API: mapped notification payload
    API-->>Web: notification list

    User->>Web: Mark one as read
    Web->>API: POST /v1/notifications/:id/read
    API->>Notify: markRead(userId, notificationId)
    Notify->>Repo: updateMany(readAt = now)
    Repo->>DB: update notification row
    DB-->>Repo: updated count
    Notify-->>API: ok
    API-->>Web: read acknowledgement
```

## Operating Principles Reflected In The Code

- Postgres remains the operational source of truth for users, holdings, orders,
  trades, documents, and notifications.
- AI is additive. It explains portfolio, transaction, document, and sell-price
  context, but it degrades to deterministic fallback when the provider is
  unavailable.
- Blockchain is also additive. Verification and proof records are stored and
  surfaced, but operational trading can still complete even when blockchain
  proof execution fails.
- File storage is local-development oriented today. Document binaries and stubs
  are written under `apps/api/dev-uploads`.
- Most route composition still lives in `apps/api/src/index.ts`, while service
  and repository layers already provide the main domain seams.

## Primary Source Files

- `apps/api/src/index.ts`
- `apps/api/src/services/operational/portfolio.service.ts`
- `apps/api/src/services/operational/order.service.ts`
- `apps/api/src/services/operational/document.service.ts`
- `apps/api/src/services/operational/notification.service.ts`
- `apps/api/src/services/ai/index.ts`
- `apps/api/src/services/blockchain/index.ts`
- `apps/api/src/services/storage/document-storage.ts`
- `apps/api/src/repositories/*.ts`
- `apps/web/pages/*`
- `apps/web/lib/api.ts`
