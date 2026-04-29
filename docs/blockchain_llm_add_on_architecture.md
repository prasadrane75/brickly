# Blockchain + LLM Add-On Architecture for the Existing Application

## Objective
Build blockchain and LLM capabilities as incremental layers on top of the existing application rather than replacing the current system. This keeps the current workflows, database, and UI intact while adding trust, intelligence, and better decision support over time.

## Core Principle
The existing application remains the main operating system for the product.

- **Existing app** = system of workflow and user experience
- **Database** = fast application layer and primary operational store
- **Blockchain** = trust, proof, and ownership transfer layer
- **LLM** = intelligence, explanation, recommendation, and workflow assistant layer

## Recommended Evolution Path

### Phase 1 — Stabilize the Existing Application
Keep the current platform as the foundation.

Core capabilities should remain in the app:
- user login and roles
- property or asset screens
- portfolio dashboard
- transaction/order flows
- admin workflows
- uploads and documents
- reporting APIs
- Postgres schema and business logic

Deliverable in this phase:
- clean APIs
- stable schema
- modular frontend components
- clear service boundaries

### Phase 2 — Add LLM Capabilities
Introduce an AI service layer that reads from existing application data and returns insights without changing the core transaction engine.

#### Example capabilities
- portfolio summary
- transaction explanation in plain English
- investment insight and recommendation
- risk summary
- document summarization
- investor Q&A assistant

#### Example API routes
- `/api/ai/portfolio-summary`
- `/api/ai/explain-transaction`
- `/api/ai/investment-insight`
- `/api/ai/summarize-document`
- `/api/ai/chat`

#### Example UI additions
- AI summary card on portfolio page
- Explain this transaction action on transaction history screen
- Ask AI widget on property page
- Recommendations panel on dashboard

#### Important design rule
The LLM should consume existing data from the application and produce interpretive output. It should not become the source of truth for ownership or balances.

### Phase 3 — Add Blockchain Trust Layer
Introduce blockchain only in the workflows where immutable proof and transparent ownership matter.

#### Best candidates for blockchain
- share issuance
- ownership transfer
- cap table verification
- transaction proof
- audit trail

#### Keep off-chain in database
- user profiles
- property metadata
- search and filtering
- dashboards and reporting
- uploaded documents
- admin states and approvals
- market analytics

#### Blockchain design rule
Blockchain stores proof-critical events. The application database stores operational data needed for speed and usability.

### Phase 4 — Combine AI + Blockchain
Use the LLM to interpret both application data and blockchain-backed ownership history.

#### Example combined use cases
- explain ownership changes in plain English
- summarize asset transfer history
- recommend actions based on portfolio exposure and liquidity
- answer investor questions using verified ownership records
- generate compliance-friendly transaction summaries

## Target Architecture

### 1. Frontend Layer
Existing React or web UI remains the main interface.

Add only focused widgets and pages such as:
- AI insights cards
- portfolio summary panel
- transaction explanation modal
- blockchain verification badge
- audit history viewer

### 2. Application API Layer
Existing backend continues to handle business logic.

Recommended modules:
- auth module
- portfolio module
- orders module
- admin module
- uploads module
- analytics module
- ai module
- blockchain module

### 3. Data Layer
Postgres remains the main application database.

Recommended continued usage:
- users
- properties
- portfolios
- ownership snapshots
- market orders
- transactions
- documents
- notifications
- rules and configurations

### 4. AI Layer
A dedicated AI service reads from the database and selected documents, then returns generated summaries and recommendations.

Possible providers:
- OpenAI for hosted LLM capability
- Ollama for local experimentation later

Typical AI flow:
1. frontend requests insight
2. backend gathers structured data
3. AI service builds prompt context
4. LLM generates summary or recommendation
5. result is returned to UI and optionally stored for caching or audit

### 5. Blockchain Layer
A dedicated blockchain service or adapter handles contract interaction.

Typical blockchain flow:
1. app initiates share issuance or transfer
2. blockchain service calls smart contract
3. transaction hash is returned
4. app writes blockchain reference back to Postgres
5. UI displays verified transaction status

## Source-of-Truth Model
This must stay very clear.

### System of record for operational workflows
- Postgres and application APIs

### System of proof for ownership-critical events
- blockchain smart contract and transaction history

### System of interpretation
- LLM-generated outputs

This separation keeps the architecture clean and prevents confusion.

## Suggested Database Extensions
Keep the existing schema and extend it with a few additional tables.

### AI-related tables
- `ai_requests`
- `ai_responses`
- `ai_prompt_templates`
- `ai_feedback`

Possible fields:
- request type
- user id
- entity type and entity id
- prompt version
- model name
- generated summary
- created timestamp

### Blockchain-related tables
- `blockchain_transactions`
- `ownership_ledger_refs`
- `contract_registry`

Possible fields:
- transaction hash
- wallet address
- asset or property id
- operation type
- contract address
- block number
- confirmation status
- created timestamp

## Suggested Folder Structure

```text
src/
  app/
  components/
    dashboard/
    portfolio/
    transactions/
    ai/
    blockchain/
  pages/
  services/
    auth/
    portfolio/
    orders/
    analytics/
    ai/
      promptBuilders/
      providers/
      formatters/
    blockchain/
      contracts/
      adapters/
      sync/
  api/
    ai/
    blockchain/
    portfolio/
    orders/
  db/
    schema/
    migrations/
    repositories/
  utils/
```

## API Strategy
Add new routes instead of rewriting the existing ones.

### AI routes
- `POST /api/ai/portfolio-summary`
- `POST /api/ai/explain-transaction`
- `POST /api/ai/investment-insight`
- `POST /api/ai/chat`

### Blockchain routes
- `POST /api/blockchain/issue-shares`
- `POST /api/blockchain/transfer-shares`
- `GET /api/blockchain/transaction/:id`
- `GET /api/blockchain/ownership/:propertyId`

## UI Rollout Strategy
Do not redesign the product. Add features incrementally.

### First UI additions
- AI summary card on dashboard
- Explain button in transaction history
- ownership verified badge on portfolio or property page
- blockchain transaction link or hash display in admin history

This keeps the core application familiar while making the new capabilities visible.

## Practical Delivery Roadmap

### Increment 1
- keep existing application stable
- define AI service interfaces
- add first AI summary endpoint
- show AI summary card in dashboard

### Increment 2
- add explain-transaction endpoint
- add transaction explanation UI
- add AI request/response persistence

### Increment 3
- create simple ownership smart contract POC
- add blockchain adapter service
- write blockchain transaction references to database

### Increment 4
- display verified ownership and transaction history in UI
- add AI explanations over blockchain-backed events

## What Not to Do
- do not move all business logic to blockchain
- do not make LLM outputs the source of truth
- do not redesign the whole app before proving value
- do not overcomplicate the first implementation with full tokenomics, public mainnet deployment, or autonomous agents

## Recommended First Deliverable
The best first enhancement on top of the existing app is:

**AI Portfolio Summary + Transaction Explanation**

Why this first:
- low cost
- fast to demo
- minimal architecture disruption
- high perceived intelligence
- easy foundation for later blockchain-backed verification

## Summary
Yes, blockchain and LLM changes should be implemented as layered enhancements on top of the existing application.

The safest and most scalable model is:
- keep the existing app and database as the operational core
- add LLM as an intelligence layer
- add blockchain as a trust and proof layer
- connect them through clean APIs, small schema extensions, and focused UI widgets

This gives a practical path from today’s application to a future intelligent liquidity marketplace without breaking the foundation.


---

# Phase 1 VS Code / Codex Prompt Pack

## How to Use
Use these prompts in sequence inside VS Code or Codex. Do not run them all at once. Review the generated changes after each prompt before moving to the next.

Recommended order:
1. foundation and structure
2. database/schema
3. backend APIs
4. frontend screens
5. seed/demo data
6. validation/error handling
7. documentation cleanup

## Prompt 1 — Project foundation and architecture cleanup

```md
You are helping me build Phase 1 of an investor-demo-ready web application.

Goal:
Create a clean, modular foundation for an existing application that will later support:
- AI/LLM features
- blockchain-backed ownership verification
- analytics and liquidity scoring

Important:
Do NOT implement LLM or blockchain yet.
This phase is only for the core application foundation.

Tech assumptions:
- frontend: React or Next.js
- backend: Node.js + Express or Next.js API routes
- database: Postgres
- ORM: Prisma if appropriate
- styling: simple professional UI, investor-demo friendly
- architecture should be modular and easy to extend

Please do the following:

1. Analyze the current codebase structure.
2. Refactor or propose a structure with modules for:
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

3. Create or update the folder structure so future layers can be added without major rewrites.

4. Add clear separation between:
   - UI components
   - API routes
   - service layer
   - database/repositories
   - shared utilities
   - config/environment

5. Create placeholder modules for:
   - /services/ai
   - /services/blockchain
   so they exist but do not yet perform any real work.

6. Add comments in key files explaining extension points for future phases.

7. Do not break existing functionality.
8. Keep changes production-oriented and readable.
9. Where needed, create TODO markers labeled:
   - PHASE_2_AI
   - PHASE_3_BLOCKCHAIN

Output expected:
- updated folder structure
- any new boilerplate files
- updated imports if needed
- brief README section describing architecture
```

## Prompt 2 — Database schema for Phase 1 core entities

```md
Help me define the Phase 1 database schema for a web application related to asset/property investing.

Important:
This phase is only the operational core.
Do NOT add blockchain logic yet.
Do NOT add LLM generation logic yet.
But leave room for future extensions.

Use Postgres and Prisma schema if the project supports Prisma.

I want a clean schema for these core entities:

1. users
2. properties (or assets)
3. portfolios / holdings
4. market orders or transaction intents
5. completed transactions
6. documents/uploads
7. notifications
8. admin audit logs
9. rules/configuration placeholders

Requirements:
- include proper ids, timestamps, status fields
- model realistic relationships
- support one property having many investors
- support a user owning shares/units in multiple properties
- support transaction history
- support uploaded documents attached to properties or transactions
- support admin tracking and auditability
- support future extension for AI summaries and blockchain transaction references

Please:
1. Create or update the Prisma schema.
2. Add indexes where sensible.
3. Add enums where helpful.
4. Add placeholder nullable fields or extension tables for:
   - blockchain_tx_hash
   - verification_status
   - ai_summary_cache
   only if they fit naturally and do not overcomplicate Phase 1.

5. Generate a short explanation of each model and why it exists.
6. Keep the schema practical for a demo but realistic enough for later scaling.
```

## Prompt 3 — Seed data for a realistic investor demo

```md
Create seed data for the Phase 1 application so I can demo it easily.

I want demo-ready seed data for:
- 3 to 5 users
- 3 properties/assets
- different ownership allocations
- sample transaction history
- sample market orders
- sample uploaded documents
- sample admin logs
- sample notifications

Business flavor:
- fractional ownership style demo
- but still Phase 1 only, no blockchain yet
- each property should have realistic metadata:
  - name
  - location
  - valuation
  - yield or income estimate
  - occupancy or status
  - thumbnail/image placeholder if needed

Please:
1. Create a seed script.
2. Make the data realistic and investor-demo friendly.
3. Ensure relationships are consistent.
4. Include at least one scenario where:
   - a user owns shares in multiple properties
   - multiple users own the same property
   - there is transaction history for transfers or purchases
5. Add sample notifications and admin logs that make the app feel alive.
6. Keep data clean and easy to reset.
```

## Prompt 4 — Core backend APIs for Phase 1

```md
Implement Phase 1 backend APIs for the existing application.

Important:
Do NOT implement AI calls or blockchain transactions.
Only build the core operational APIs.
Design them so AI and blockchain can be layered on later.

Create or update API routes for:

1. Users / profile
2. Properties list
3. Property detail
4. Portfolio summary
5. Holdings by user
6. Orders list and create
7. Transactions list
8. Documents list/upload metadata
9. Notifications list
10. Admin audit history

Requirements:
- use service layer pattern where possible
- validate request payloads
- handle errors cleanly
- return JSON in a consistent structure
- include pagination for list endpoints where appropriate
- include basic filtering/sorting where useful
- keep code modular and readable

Also:
- add placeholder response fields for future extension where appropriate, such as:
  - verificationStatus
  - blockchainRef
  - aiInsightAvailable

But these should just be placeholders for now.

Please generate:
- route handlers/controllers
- service layer methods
- repository/db calls
- shared response helpers if needed
```

## Prompt 5 — Portfolio dashboard API shaped for future AI insights

```md
I want a strong Phase 1 portfolio summary API that later becomes the input for LLM insights.

Please create or refactor a portfolio summary endpoint that returns structured data for a user dashboard.

The response should include:
- user info
- total portfolio value
- total invested amount
- estimated yield/income
- current holdings
- allocation by property
- recent transactions
- open orders
- notifications preview

Important:
- this is still Phase 1, so do not call any LLM
- structure the JSON so later it can be passed into an AI summarizer
- include clean field naming and nested objects
- keep calculations deterministic and backend-driven

Please:
1. implement or refactor the endpoint
2. create helper functions for computing totals
3. make the response stable and easy for frontend cards/charts
4. add comments showing where PHASE_2_AI will later consume this payload
```

## Prompt 6 — Frontend dashboard and main screens

```md
Build or refactor the Phase 1 frontend screens for an investor-demo-ready application.

Important:
This phase is only the core app.
Do NOT add real AI or blockchain actions yet.
You may add placeholders or disabled badges.

Create or improve these screens:
1. Login screen
2. Dashboard
3. Properties list
4. Property detail
5. Portfolio page
6. Transactions/history page
7. Orders page
8. Documents page
9. Admin/audit page

UI requirements:
- clean, modern, professional
- simple card-based layout
- easy to demo
- not visually cluttered
- responsive enough for laptop demo
- use mock charts/cards if helpful
- show placeholders for future:
  - AI Insights
  - Verified Ownership

Dashboard should include:
- total portfolio value
- estimated yield
- holdings cards
- recent transactions
- notifications
- allocation summary

Property detail should include:
- property overview
- valuation
- yield estimate
- ownership info
- documents section
- transaction history preview

Please:
1. build reusable components
2. separate page containers from presentational components
3. keep props typed if using TypeScript
4. avoid overengineering
5. add TODO comments labeled PHASE_2_AI and PHASE_3_BLOCKCHAIN where future widgets will go
```

## Prompt 7 — Orders and transactions workflow

```md
Implement a basic but realistic Phase 1 order and transaction workflow.

Important:
This is an internal application workflow only.
Do NOT add wallet logic.
Do NOT add blockchain logic.
Do NOT add payment processing.

Goal:
Allow a user to simulate submitting an order and have it show up in transaction/history views.

Requirements:
- create order
- validate order
- assign status such as pending, completed, cancelled
- when appropriate, generate a completed transaction record
- update user holdings if needed in a simple deterministic way
- log admin audit entry
- create a user notification

Please:
1. implement backend logic
2. update frontend forms/screens if needed
3. keep workflow demo-friendly
4. write clear comments around where blockchain-backed transfer logic could later replace or augment the internal transaction handling
```

## Prompt 8 — Document upload metadata and attachment model

```md
Implement Phase 1 document handling for the application.

Important:
This phase does not need full production file storage complexity.
I mainly need a clean attachment model and UI.
Actual files can be local/dev storage or simple placeholder handling depending on current setup.

Use cases:
- property documents
- investor documents
- transaction-related attachments
- admin reference files

Please implement:
1. document metadata model if not already present
2. upload endpoint or stubbed upload flow
3. list documents by entity
4. document table or card UI
5. ability to tag documents by type
6. ability to link a document to:
   - property
   - transaction
   - user
   - admin note

Design notes:
- keep storage abstraction clean so cloud storage can be added later
- include status/type fields
- keep naming readable
- add future extension comment for AI summarization of documents in Phase 2
```

## Prompt 9 — Notifications and auditability

```md
Add a Phase 1 notification and audit logging system to make the app feel operational and trustworthy.

Please implement:
1. notifications model and APIs
2. admin audit log model and APIs
3. automatic creation of notifications for events like:
   - order created
   - order completed
   - document uploaded
   - admin action recorded

4. frontend panels for:
   - recent notifications
   - admin audit history

Requirements:
- keep entries human-readable
- include actor, action, entity type, entity id, timestamp
- make audit entries useful for future compliance-style display
- keep UI simple and professional

Also:
- add comments where blockchain transaction confirmations could later feed into this audit system
```

## Prompt 10 — Validation, error handling, and API consistency

```md
Refactor the application for Phase 1 robustness.

I want the codebase to feel stable and demo-safe.

Please review and improve:
- request validation
- API response consistency
- error handling
- loading and empty states
- basic form validation
- defensive null checks
- status badges and enums
- logging in development

Please:
1. add shared API response helpers if missing
2. add shared error utilities
3. ensure list endpoints return predictable structures
4. improve frontend handling for loading, empty, and error states
5. clean up rough edges without changing the intended product flow

Important:
- keep the app extension-friendly for later AI and blockchain phases
- mark extension points with TODO comments
```

## Prompt 11 — README and architecture notes for future phases

```md
Create or update project documentation for Phase 1.

I want a practical README section that explains:
- what Phase 1 includes
- current architecture
- module/folder structure
- main entities in the database
- how to run locally
- how to seed demo data
- how the backend and frontend are organized
- where future Phase 2 AI features will be added
- where future Phase 3 blockchain features will be added

Please include:
1. architecture overview
2. folder structure summary
3. key API endpoints
4. development setup steps
5. demo walkthrough steps
6. future roadmap notes

Keep it concise but professional.
```

## Prompt 12 — Full Phase 1 review and cleanup pass

```md
Perform a Phase 1 cleanup and quality pass on this codebase.

Goal:
Make the current app clean, coherent, and ready for demo before Phase 2 begins.

Please review for:
- duplicated code
- weak naming
- inconsistent module boundaries
- dead files
- broken imports
- inconsistent status enums
- missing comments
- weak seed/demo realism
- rough UI sections
- missing empty states
- missing loading states

Please then:
1. refactor where helpful
2. fix low-risk issues
3. improve readability
4. keep behavior stable
5. provide a short summary of what was improved

Important:
Do not begin implementing AI or blockchain.
Just make the Phase 1 application solid and extension-ready.
```

## Master Alignment Prompt

Paste this once at the start of your VS Code session:

```md
You are helping me build an investor-demo-ready application in phased increments.

Current objective: Phase 1 only.

Phase 1 scope:
- stabilize and modularize the existing application
- define clean Postgres-backed operational models
- build/refactor core APIs
- create realistic demo seed data
- create dashboard, property, portfolio, transaction, orders, documents, notifications, and admin views
- improve validation, error handling, and documentation

Do not implement in this phase:
- no LLM calls
- no chatbot
- no smart contract deployment
- no wallet integration
- no public blockchain
- no tokenomics

But:
- leave clear extension points for future AI and blockchain integration
- create placeholder modules for ai and blockchain services
- annotate future integration points with TODO comments:
  - PHASE_2_AI
  - PHASE_3_BLOCKCHAIN

Output should be modular, production-oriented, readable, and demo-friendly.
Prefer small coherent changes over massive speculative rewrites.
```

## Suggested Execution Sequence

### Round 1
- Prompt 1
- Prompt 2
- Prompt 3

### Round 2
- Prompt 4
- Prompt 5
- Prompt 7
- Prompt 9

### Round 3
- Prompt 6
- Prompt 8
- Prompt 10

### Round 4
- Prompt 11
- Prompt 12


---

# Phase 3 — Blockchain Trust Layer (VS Code / Codex Prompt Pack)

## Objective
Add a **blockchain-backed trust layer** on top of the existing application and AI features.

This phase focuses ONLY on:
- ownership proof
- transaction traceability
- auditability via blockchain

NOT in scope:
- real money
- token economics
- public mainnet deployment
- wallets for end users (keep demo/simple)

---

## Core Design Principle

- Postgres = operational truth
- Blockchain = proof layer
- AI = interpretation layer

Blockchain should **mirror critical events**, not replace your app.

---

## Master Phase 3 Alignment Prompt

```md
You are helping me implement Phase 3 of an investor-demo-ready application.

Phase 3 objective:
Add a blockchain trust layer for ownership and transaction verification.

Current system:
- Postgres is the operational source of truth
- AI layer exists for summaries and explanations
- We now add blockchain as a proof and audit layer

Scope:
- smart contract for ownership and transfers
- blockchain service layer in backend
- syncing blockchain transactions to database
- exposing verification data via APIs
- UI indicators for verified ownership and transactions

Do NOT implement:
- real payments
- crypto wallets for end users
- tokenomics or public trading
- mainnet deployment

Requirements:
- keep blockchain optional and non-blocking
- app must work even if blockchain is down
- keep architecture modular
- store blockchain references in database
- label verified data clearly in UI
```

---

## Prompt 1 — Smart Contract (Ownership Ledger)

```md
Create a simple Solidity smart contract for Phase 3 ownership tracking.

Requirements:
- represent ownership of a property (propertyId)
- allow minting shares for a property
- allow transferring shares between addresses
- track balances per address per property
- emit events for:
  - shares issued
  - shares transferred

Constraints:
- keep contract simple and demo-friendly
- no token standard required (can be custom lightweight)
- no financial logic
- no fees

Also:
- include comments explaining functions
- make it compatible with Hardhat
```

---

## Prompt 2 — Hardhat Setup

```md
Set up a local blockchain development environment using Hardhat.

Please:
1. initialize Hardhat project
2. add the ownership smart contract
3. create deployment script
4. create sample script to:
   - deploy contract
   - mint shares
   - transfer shares
5. configure local network
6. document how to run everything

Keep it simple and runnable locally.
```

---

## Prompt 3 — Blockchain Service Layer

```md
Implement a blockchain service layer in the backend.

Create module:
- services/blockchain/

Responsibilities:
- connect to local Hardhat node
- deploy or connect to contract
- call contract functions:
  - issue shares
  - transfer shares
- return transaction hash

Requirements:
- keep service isolated from business logic
- use environment config for contract address
- add error handling and logging

Do not break existing APIs.
```

---

## Prompt 4 — Sync Blockchain with Database

```md
Integrate blockchain transactions with the database.

Goal:
Store blockchain references alongside existing transactions.

Please:
1. extend transaction model to include:
   - blockchain_tx_hash
   - verification_status
2. update transaction workflow to:
   - call blockchain service
   - store tx hash
3. ensure app still works if blockchain call fails
4. mark transactions as:
   - pending
   - verified

Keep logic simple and non-blocking.
```

---

## Prompt 5 — Verification APIs

```md
Create APIs to expose blockchain verification data.

Add endpoints:
- GET /api/blockchain/transaction/:id
- GET /api/blockchain/ownership/:propertyId

Behavior:
- return transaction hash
- return verification status
- return ownership snapshot from database

Keep response simple and UI-friendly.
```

---

## Prompt 6 — UI: Verified Ownership Badge

```md
Add UI indicators for blockchain verification.

Requirements:
- show "Verified" badge on:
  - portfolio holdings
  - transaction history
- display transaction hash (shortened)
- optional link to block explorer (local or placeholder)
- keep UI minimal and clean

Do not overwhelm UI.
```

---

## Prompt 7 — Ownership History View

```md
Add a simple ownership history/audit view.

Requirements:
- show list of transactions
- include:
  - date
  - type
  - shares
  - users
  - verification status
- optionally include blockchain hash

Keep it demo-friendly and readable.
```

---

## Prompt 8 — Failure Handling

```md
Improve robustness of blockchain integration.

Please:
- handle failures gracefully
- allow app to continue if blockchain is unavailable
- log errors clearly
- mark transactions as unverified if needed
- avoid blocking user actions
```

---

## Prompt 9 — Cleanup and Refactor

```md
Perform Phase 3 cleanup.

Check for:
- tight coupling between blockchain and business logic
- duplicated logic
- unclear naming
- missing comments
- inconsistent verification states

Refactor for clarity and modularity.
```

---

## Recommended Execution Order

### Round 1
- Master prompt
- Prompt 1
- Prompt 2

### Round 2
- Prompt 3
- Prompt 4

### Round 3
- Prompt 5
- Prompt 6
- Prompt 7

### Round 4
- Prompt 8
- Prompt 9

---

## Phase 3 Done Criteria

You are done when:
- smart contract deployed locally
- transactions generate blockchain hashes
- hashes stored in database
- UI shows verified status
- app still works if blockchain fails
- ownership history is visible

---

## What Comes Next (Phase 4)

Phase 4 = **AI + Blockchain combined intelligence**

Examples:
- explain verified ownership changes
- detect anomalies
- generate audit summaries
- smart liquidity insights

---

This completes the full progression:

Phase 1 → Core app
Phase 2 → AI layer
Phase 3 → Trust layer (blockchain)
Phase 4 → Intelligent marketplace


---

# Phase 1–3 Verification Pack

## Purpose
This verification pack is designed to confirm that the functionality planned and implemented across Phase 1, Phase 2, and Phase 3 actually exists in the application, is wired correctly across layers, and behaves safely under both normal and failure conditions.

Use this pack as:
- a delivery checklist
- a QA guide
- a demo readiness checklist
- a proof-of-completeness artifact for investors, collaborators, or future development work

## Verification Status Model
Use the following status values consistently:

- **Not Started**
- **Implemented**
- **Wired but Unverified**
- **Verified Manually**
- **Verified Automated**
- **Broken**
- **Deferred**

A feature should not be considered fully complete until it is at least **Verified Manually**. For important flows, target **Verified Automated**.

## Evidence Types
For each verified capability, capture at least one or more of the following:
- screenshot
- screen recording
- API response sample
- database record proof
- blockchain transaction hash or event proof
- automated test result

---

# 1. Capability Traceability Matrix

Use this matrix as the master source of truth for what has been implemented and verified.

| Capability | Phase | Backend/API | Data Layer | UI Surface | Verification Status | Evidence |
|---|---:|---|---|---|---|---|
| Login and user access | 1 | auth routes/services | users | Login screen |  |  |
| Dashboard summary | 1 | portfolio/dashboard endpoint | users, holdings, properties, transactions | Dashboard |  |  |
| Properties list | 1 | properties list endpoint | properties | Properties page |  |  |
| Property detail | 1 | property detail endpoint | properties, documents, transactions | Property detail page |  |  |
| Portfolio holdings | 1 | holdings/portfolio endpoints | holdings, properties | Portfolio page |  |  |
| Order creation | 1 | orders create endpoint | orders | Orders page/form |  |  |
| Transaction history | 1 | transactions list endpoint | transactions | Transactions page |  |  |
| Documents metadata/list | 1 | documents endpoints | documents | Documents page |  |  |
| Notifications | 1 | notifications endpoint | notifications | Dashboard / notifications panel |  |  |
| Admin audit history | 1 | admin audit endpoint | audit logs | Admin/audit page |  |  |
| Seed/demo data | 1 | seed script | all core tables | all demo screens |  |  |
| Validation and error states | 1 | shared validation/error helpers | n/a | forms/pages/modals |  |  |
| AI portfolio summary | 2 | `/api/ai/portfolio-summary` | ai_requests, ai_responses | Dashboard AI card |  |  |
| AI transaction explanation | 2 | `/api/ai/explain-transaction` | ai_requests, ai_responses, transactions | Transaction explain action |  |  |
| AI document summary | 2 | `/api/ai/summarize-document` | ai_requests, ai_responses, documents | Document summary UI |  |  |
| AI provider abstraction | 2 | ai provider layer | config, ai tables | indirect |  |  |
| AI persistence/caching | 2 | ai services | ai_requests, ai_responses | indirect |  |  |
| AI failure fallback | 2 | ai services/endpoints | ai_requests optional | AI cards/modals |  |  |
| Smart contract local deployment | 3 | Hardhat scripts | local blockchain | indirect |  |  |
| Share issuance | 3 | blockchain service | blockchain refs, transactions | admin or internal workflow |  |  |
| Share transfer | 3 | blockchain service | blockchain refs, transactions, holdings | orders/transactions flow |  |  |
| Blockchain tx hash persistence | 3 | transaction workflow | transactions | transaction detail/history |  |  |
| Verification status tracking | 3 | blockchain verification APIs | transactions, ownership refs | badges/status labels |  |  |
| Ownership verification endpoint | 3 | `/api/blockchain/ownership/:propertyId` | holdings, refs | property/portfolio screens |  |  |
| Transaction verification endpoint | 3 | `/api/blockchain/transaction/:id` | transactions | transaction detail/history |  |  |
| Verified ownership badge | 3 | verification APIs | verification fields | portfolio/property UI |  |  |
| Ownership history view | 3 | verification/history service | transactions, refs | ownership history/audit view |  |  |
| Blockchain failure tolerance | 3 | blockchain service + fallback logic | verification fields | transaction/ownership UI |  |  |

---

# 2. Manual Verification Checklist

## Phase 1 Manual Checklist

### 2.1 Login and App Start
- [ ] Application starts locally without fatal errors
- [ ] User can reach login screen
- [ ] Login succeeds with seeded/demo user
- [ ] Invalid login is handled cleanly
- [ ] Authenticated user lands on expected dashboard

### 2.2 Dashboard
- [ ] Dashboard loads without crashing
- [ ] Portfolio totals render
- [ ] Holdings summary renders
- [ ] Recent transactions render
- [ ] Notifications panel renders
- [ ] Empty state is reasonable when data is missing

### 2.3 Properties
- [ ] Properties list page loads
- [ ] Properties show core metadata
- [ ] Clicking a property opens property detail page
- [ ] Property detail shows valuation/yield/status
- [ ] Property detail shows related documents or transaction preview

### 2.4 Portfolio and Holdings
- [ ] Portfolio page loads
- [ ] Holdings display correct asset/property names
- [ ] Holdings values are plausible relative to seed data
- [ ] User with multiple holdings sees multiple positions

### 2.5 Orders and Transactions
- [ ] Order form/page loads
- [ ] User can submit order with valid inputs
- [ ] Invalid order input is rejected cleanly
- [ ] Order appears in order list/history
- [ ] Resulting transaction appears when applicable
- [ ] Holdings update if workflow is designed to do so

### 2.6 Documents
- [ ] Documents page loads
- [ ] Documents can be listed by entity or globally
- [ ] Document metadata is visible
- [ ] Upload or upload stub behaves correctly

### 2.7 Notifications and Audit
- [ ] Notifications appear after key actions
- [ ] Admin audit entries appear after key actions
- [ ] Audit entries show actor, action, entity, timestamp

### 2.8 Robustness
- [ ] Loading states display during API delay
- [ ] Empty states display correctly
- [ ] Error states do not break the page
- [ ] Seed script can be rerun cleanly

## Phase 2 Manual Checklist

### 2.9 AI Portfolio Summary
- [ ] AI portfolio summary action/card loads
- [ ] Summary returns readable investor-facing output
- [ ] Output appears grounded in actual holdings
- [ ] Suggestions do not look disconnected from available data
- [ ] AI-generated label is visible

### 2.10 AI Transaction Explanation
- [ ] Explain action appears on transaction row/detail
- [ ] Clicking explain produces a summary/modal/drawer
- [ ] Explanation reflects actual transaction facts
- [ ] Headline/explanation/impact fields render correctly
- [ ] AI-generated label is visible

### 2.11 AI Document Summary
- [ ] Summarize action appears for documents
- [ ] Summary renders when text is available
- [ ] No-text or low-text document is handled gracefully
- [ ] Key points/dates/risks/action items render correctly when present
- [ ] AI-generated label is visible

### 2.12 AI Persistence and Stability
- [ ] AI request/response records are stored when expected
- [ ] Repeated request behavior follows intended cache policy
- [ ] AI provider failure shows safe fallback
- [ ] Core app still works even if AI provider is unavailable

## Phase 3 Manual Checklist

### 2.13 Smart Contract and Local Chain
- [ ] Hardhat/local chain starts successfully
- [ ] Contract deploy script runs successfully
- [ ] Contract address is captured in config

### 2.14 Blockchain-Backed Transactions
- [ ] Share issuance path works in local environment
- [ ] Share transfer path works in local environment
- [ ] Blockchain transaction hash is returned
- [ ] Transaction hash is stored in database
- [ ] Verification status is persisted

### 2.15 Verification UI
- [ ] Verified badge appears where expected
- [ ] Unverified/pending state appears where expected
- [ ] Transaction hash is shown in shortened form when intended
- [ ] Ownership history view displays blockchain-linked records

### 2.16 Failure Tolerance
- [ ] App still works if blockchain node is unavailable
- [ ] Blockchain failure does not crash order/transaction flow
- [ ] Failed blockchain action is reflected in verification status
- [ ] User sees safe fallback state rather than broken UI

---

# 3. Golden End-to-End Scenario Tests

These are the highest-value manual or automated flows. If these pass, the system is likely demo-ready.

## Scenario A — Core Investor Journey (Phase 1)
1. Log in as demo investor
2. Open dashboard
3. Review holdings and notifications
4. Navigate to properties list
5. Open one property detail page
6. Submit an order
7. Confirm order appears in history
8. Confirm transaction appears if applicable
9. Confirm notification appears
10. Confirm admin audit entry exists

**Expected result:** core application workflow is intact and traceable.

## Scenario B — AI Insight Journey (Phase 2)
1. Log in
2. Open dashboard
3. Trigger or load AI portfolio summary
4. Confirm readable grounded summary appears
5. Open transactions page
6. Click explain on one transaction
7. Confirm AI explanation appears
8. Open documents page
9. Trigger summary for one document
10. Confirm summary fields render

**Expected result:** AI adds value but does not disrupt core workflows.

## Scenario C — Blockchain Trust Journey (Phase 3)
1. Start local blockchain
2. Deploy smart contract
3. Execute share issuance or transfer flow
4. Confirm blockchain transaction hash is generated
5. Confirm database stores hash and verification status
6. Open UI transaction history
7. Confirm verified status is visible
8. Open property or portfolio view
9. Confirm verified ownership indicator appears
10. Open ownership history/audit view

**Expected result:** blockchain proof layer is connected end-to-end.

## Scenario D — Failure Tolerance Journey
1. Disable or misconfigure AI provider
2. Confirm dashboard and core app still load
3. Trigger AI action and confirm graceful fallback/error state
4. Disable local blockchain node
5. Submit blockchain-relevant action
6. Confirm operational app flow continues where intended
7. Confirm transaction or ownership record is marked pending/unverified
8. Confirm UI does not crash

**Expected result:** optional layers fail safely.

---

# 4. API Verification Pack

## Phase 1 API Verification

### Auth / User
- [ ] login endpoint returns expected auth response
- [ ] current user/profile endpoint returns expected user shape

### Properties
- [ ] properties list returns paginated or structured list
- [ ] property detail returns property plus linked data as expected

### Portfolio
- [ ] portfolio summary returns stable response shape
- [ ] holdings endpoint returns correct holdings for user

### Orders / Transactions
- [ ] create order validates inputs
- [ ] create order returns correct status and identifiers
- [ ] transactions endpoint returns stable list structure

### Documents / Notifications / Audit
- [ ] documents endpoint returns correct metadata shape
- [ ] notifications endpoint returns list structure
- [ ] audit endpoint returns actor/action/entity/timestamp fields

## Phase 2 API Verification

### AI Portfolio Summary
- [ ] `/api/ai/portfolio-summary` returns summary object with expected fields
- [ ] bad inputs are handled safely
- [ ] provider failure returns stable error shape or fallback

### AI Transaction Explanation
- [ ] `/api/ai/explain-transaction` returns expected explanation structure
- [ ] missing transaction id or invalid id is handled correctly

### AI Document Summary
- [ ] `/api/ai/summarize-document` returns expected summary structure
- [ ] document with missing text is handled gracefully

### AI Persistence
- [ ] ai_requests record created when intended
- [ ] ai_responses record created when intended
- [ ] cached result behavior is correct if implemented

## Phase 3 API Verification

### Blockchain Verification APIs
- [ ] `/api/blockchain/transaction/:id` returns tx hash and verification status
- [ ] `/api/blockchain/ownership/:propertyId` returns ownership snapshot and verification fields

### Transaction Workflow Integration
- [ ] transaction workflow adds blockchain reference when available
- [ ] blockchain failure produces safe verification fallback fields

---

# 5. Automated Test Pack Design

## 5.1 API Test Suite
Recommended tools:
- Jest or Vitest
- Supertest for Node/HTTP APIs

Recommended coverage:
- auth and profile endpoints
- properties and portfolio endpoints
- order create and transaction history endpoints
- AI endpoints success/failure paths
- blockchain verification endpoints
- stable response shape assertions

## 5.2 UI End-to-End Suite
Recommended tool:
- Playwright

Recommended Playwright flows:
- login and dashboard render
- property navigation flow
- order submission flow
- AI portfolio summary card flow
- transaction explanation modal flow
- document summary flow
- verified ownership badge visibility flow
- fallback behavior when AI/blockchain is unavailable

## 5.3 Smart Contract / Blockchain Test Suite
Recommended tool:
- Hardhat tests

Recommended coverage:
- contract deployment
- share issuance/minting
- share transfer
- event emission
- balances by property/address
- failure cases for invalid operations

---

# 6. Suggested Automated Test Case List

## API Tests
- [ ] `auth.login.success`
- [ ] `auth.login.invalid_credentials`
- [ ] `portfolio.summary.success`
- [ ] `properties.list.success`
- [ ] `property.detail.success`
- [ ] `orders.create.success`
- [ ] `orders.create.validation_error`
- [ ] `transactions.list.success`
- [ ] `documents.list.success`
- [ ] `notifications.list.success`
- [ ] `audit.list.success`
- [ ] `ai.portfolio_summary.success`
- [ ] `ai.portfolio_summary.provider_failure`
- [ ] `ai.explain_transaction.success`
- [ ] `ai.summarize_document.success`
- [ ] `blockchain.transaction_verification.success`
- [ ] `blockchain.ownership_verification.success`
- [ ] `blockchain.fallback_when_unavailable`

## Playwright / E2E Tests
- [ ] `e2e.core_investor_journey`
- [ ] `e2e.ai_insight_journey`
- [ ] `e2e.blockchain_trust_journey`
- [ ] `e2e.failure_tolerance_journey`

## Hardhat Tests
- [ ] `contract.deploys`
- [ ] `contract.mints_shares`
- [ ] `contract.transfers_shares`
- [ ] `contract.emits_issue_event`
- [ ] `contract.emits_transfer_event`
- [ ] `contract.rejects_invalid_transfer`

---

# 7. Evidence Tracker Template

Use this table during verification.

| Capability | Test Type | Tester | Date | Result | Evidence Link / Note | Defects |
|---|---|---|---|---|---|---|
| Dashboard summary | Manual |  |  |  |  |  |
| Order creation | Manual |  |  |  |  |  |
| AI portfolio summary | Manual/API |  |  |  |  |  |
| AI transaction explanation | Manual/API |  |  |  |  |  |
| AI document summary | Manual/API |  |  |  |  |  |
| Verified ownership badge | Manual/E2E |  |  |  |  |  |
| Blockchain tx hash persistence | API/DB |  |  |  |  |  |
| Failure tolerance | Manual/E2E |  |  |  |  |  |

---

# 8. Database Verification Checklist

## Phase 1 DB Checks
- [ ] seeded users exist
- [ ] seeded properties exist
- [ ] holdings align with seed scenario
- [ ] orders and transactions are related correctly
- [ ] documents are linked correctly
- [ ] notifications are generated correctly
- [ ] audit records are generated correctly

## Phase 2 DB Checks
- [ ] ai_requests rows created correctly
- [ ] ai_responses rows created correctly
- [ ] entity linking is correct for portfolio/transaction/document requests
- [ ] cache reuse behavior is observable if implemented

## Phase 3 DB Checks
- [ ] blockchain transaction hash stored on intended records
- [ ] verification_status reflects actual outcome
- [ ] ownership reference data is synchronized correctly

---

# 9. Demo Readiness Gate

The application is demo-ready only when all of the following are true:

## Core Readiness
- [ ] app runs locally without unstable errors
- [ ] seed/demo data loads cleanly
- [ ] core investor flow works end-to-end

## AI Readiness
- [ ] AI portfolio summary is visible and credible
- [ ] transaction explanation works reliably
- [ ] document summary works on at least one strong example
- [ ] AI failure fallback is safe

## Blockchain Readiness
- [ ] local contract deploys cleanly
- [ ] at least one verified transaction is demonstrable
- [ ] verified badge and ownership history are visible in UI
- [ ] blockchain failure fallback is safe

## Presentation Readiness
- [ ] screenshots or recordings exist for major flows
- [ ] one scripted demo journey is rehearsed
- [ ] known issues are documented and acceptable for demo context

---

# 10. Recommended Execution Order for Verification

## Pass 1 — Static and Data Validation
1. run app locally
2. run migrations
3. run seed script
4. validate database records
5. confirm screens load

## Pass 2 — Manual Core Flows
1. execute Scenario A
2. capture evidence
3. fix obvious issues

## Pass 3 — Manual AI and Blockchain Flows
1. execute Scenario B
2. execute Scenario C
3. execute Scenario D
4. capture evidence

## Pass 4 — Automated Tests
1. run API tests
2. run Playwright tests
3. run Hardhat tests
4. log failures and retest

## Pass 5 — Demo Certification
1. complete evidence tracker
2. mark capability matrix
3. identify remaining gaps
4. sign off on demo-ready subset

---

# 11. Final Sign-Off Template

## Verification Summary
- Total planned capabilities:
- Verified manually:
- Verified automated:
- Broken:
- Deferred:

## High Confidence Areas
- 
- 
- 

## Known Gaps / Risks
- 
- 
- 

## Demo Recommendation
- [ ] Ready for internal demo
- [ ] Ready for investor demo
- [ ] Needs fixes before demo

## Sign-Off Notes

Add a short summary of what was verified, what still needs work, and which flows are strongest for demonstration.


---

# Phase 1–3 Test Suite Prompt Pack (VS Code / Codex)

## Purpose
These prompts generate a complete automated and semi-automated test suite aligned to the Phase 1–3 Verification Pack. Use them in VS Code/Codex to build API, E2E (Playwright), and blockchain (Hardhat) tests, along with shared helpers and configs.

## How to Use
- Run prompts in sequence (see execution order below).
- Review generated code after each prompt and run tests.
- Prefer deterministic tests; mock/stub AI where needed.
- Keep blockchain local (Hardhat) and non-blocking.

---

## Master Prompt — Build the full verification test suite

```md
You are helping me build a full verification test suite for an investor-demo-ready application that has already been implemented in 3 phases.

Application context:
- Phase 1 = core application
- Phase 2 = AI interpretation layer
- Phase 3 = blockchain trust layer

Architecture context:
- frontend: React or Next.js
- backend: Node.js + Express or Next.js API routes
- database: Postgres
- tests should align with existing modules and folder structure
- AI exists as an add-on layer
- blockchain exists as a local Hardhat-backed proof layer
- Postgres remains the operational source of truth
- blockchain is only used for verification/proof and should not block the app
- AI and blockchain failures must degrade safely

Goal:
Build a complete automated and semi-automated verification suite based on the following requirements:
1. API tests for core features, AI features, and blockchain verification APIs
2. Playwright end-to-end tests for major user journeys
3. Hardhat smart contract tests
4. Shared test utilities, fixtures, seed/test data handling, and environment setup
5. Clear organization so the suite is maintainable and can be run locally

Important constraints:
- do not rewrite the application
- do not add unrelated features
- build tests around the existing app
- prefer stable deterministic tests over fragile ones
- use realistic seeded demo data where possible
- isolate external dependencies where possible
- mock or stub AI provider behavior where appropriate for deterministic tests
- use local blockchain or test blockchain only
- ensure tests cover success, validation failure, and graceful fallback behavior

Please do the following:
1. Analyze the existing project structure and testing setup if present.
2. Create or improve a test structure for:
   - API tests
   - Playwright E2E tests
   - Hardhat contract tests
   - shared test utilities
3. Add scripts and configuration needed to run tests locally.
4. Add environment guidance for test mode.
5. Prefer modular helpers and fixtures over duplicated code.
6. Keep test names aligned with business capabilities.

Test coverage targets:

Phase 1 core app:
- auth/login
- dashboard/portfolio summary
- properties list/detail
- holdings/portfolio views
- order creation
- transaction history
- documents listing/upload metadata flow
- notifications
- admin audit history
- validation and error handling

Phase 2 AI:
- AI portfolio summary endpoint
- AI transaction explanation endpoint
- AI document summary endpoint
- AI provider abstraction behavior
- AI persistence/caching if implemented
- graceful fallback if AI provider fails
- dashboard AI card flow
- transaction explanation UI flow
- document summary UI flow

Phase 3 blockchain:
- smart contract deployment
- share issuance
- share transfer
- blockchain service integration
- blockchain transaction hash persistence
- verification status behavior
- ownership verification endpoint
- transaction verification endpoint
- verified badge visibility
- failure tolerance when blockchain is unavailable

Expected deliverables:
- proposed test folder structure
- test config updates
- helper utilities
- API test files
- Playwright test files
- Hardhat contract tests
- any lightweight docs or README updates needed for running the suite

Keep everything production-oriented, readable, and grounded in the implemented app.
```

---

## Prompt 1 — Create the overall test structure

```md
Set up the overall test suite structure for this application.

Please create or refine a clean structure for:
- API tests
- Playwright E2E tests
- Hardhat contract tests
- shared test helpers/utilities
- fixtures and mock data
- test environment config

Requirements:
- align with the existing codebase
- avoid overengineering
- make it easy to run targeted subsets of tests
- add npm scripts or package scripts for:
  - api tests
  - e2e tests
  - blockchain tests
  - all tests
- include comments or small docs where useful

Suggested categories:
- tests/api/
- tests/e2e/
- tests/blockchain/
- tests/helpers/
- tests/fixtures/

Please generate the structure and any starter files/config updates needed.
```

---

## Prompt 2 — Build the Phase 1 API test suite

```md
Implement the Phase 1 API test suite for the existing application.

Use Jest or Vitest with Supertest, depending on what best fits the project.

Please add tests for:
- login success
- login invalid credentials
- current user/profile endpoint if present
- properties list
- property detail
- portfolio summary
- holdings by user
- create order success
- create order validation failure
- transactions list
- documents list
- notifications list
- admin audit history

Requirements:
- verify response shape, status codes, and key fields
- use stable seeded/demo data or fixtures
- avoid fragile assumptions
- add shared helpers for auth/session setup where useful
- keep tests readable and business-aligned
```

---

## Prompt 3 — Build the Phase 2 API test suite

```md
Implement the Phase 2 API test suite for AI features.

Please add tests for:
- POST /api/ai/portfolio-summary success
- POST /api/ai/portfolio-summary provider failure fallback
- POST /api/ai/explain-transaction success
- POST /api/ai/explain-transaction invalid transaction handling
- POST /api/ai/summarize-document success
- POST /api/ai/summarize-document low-text or missing-text handling

If AI persistence exists, also test:
- ai_requests record creation
- ai_responses record creation
- cache reuse behavior if implemented

Requirements:
- make tests deterministic
- stub or mock AI provider behavior instead of relying on live provider calls
- verify response shape and important fields
- confirm failures do not crash the application
- keep tests modular
```

---

## Prompt 4 — Build the Phase 3 API test suite

```md
Implement the Phase 3 API test suite for blockchain-related features.

Please add tests for:
- transaction workflow returns blockchain reference when blockchain is available
- transaction workflow degrades safely when blockchain is unavailable
- GET /api/blockchain/transaction/:id returns verification details
- GET /api/blockchain/ownership/:propertyId returns ownership snapshot and verification details
- verification status fields are returned consistently

Requirements:
- do not depend on mainnet or external services
- use local blockchain or mock blockchain service where appropriate
- verify safe fallback behavior
- confirm transaction hash fields and verification status fields are handled correctly
```

---

## Prompt 5 — Build shared API test helpers

```md
Create shared test helpers for the API test suite.

Please add utilities for:
- test app bootstrap
- auth helper or session helper
- seeded user access
- fixture creation where needed
- stable request/response assertions
- database cleanup/reset helpers if appropriate

Requirements:
- reduce duplication across API test files
- keep helpers simple and discoverable
- align helper names with actual test usage
```

---

## Prompt 6 — Build Playwright E2E tests for core investor journey

```md
Implement Playwright end-to-end tests for the core investor journey.

Create a test covering:
1. open the app
2. log in as demo investor
3. land on dashboard
4. confirm dashboard core sections render
5. navigate to properties list
6. open a property detail page
7. navigate to orders or perform order creation flow if available
8. confirm transaction/history updates or visible result
9. confirm notifications and/or audit evidence appear where expected

Requirements:
- use robust selectors
- avoid brittle timing assumptions
- include clear assertions
- keep the flow investor-demo realistic
- organize page helpers or page objects only if that keeps things cleaner
```

---

## Prompt 7 — Build Playwright E2E tests for AI journey

```md
Implement Playwright end-to-end tests for the AI user journey.

Create a test covering:
1. log in
2. open dashboard
3. verify AI portfolio summary card flow works
4. navigate to transactions
5. trigger Explain on a transaction
6. verify AI explanation appears
7. navigate to documents
8. trigger document summary
9. verify AI summary fields render

Requirements:
- label assertions around AI-generated content
- use mocked/stable AI behavior if the app supports it for test mode
- ensure the test does not fail due to nondeterministic wording by asserting structure/presence rather than exact prose
```

---

## Prompt 8 — Build Playwright E2E tests for blockchain trust journey

```md
Implement Playwright end-to-end tests for the blockchain trust journey.

Create a test covering:
1. ensure local blockchain/test setup is available
2. perform or load a transaction that has blockchain verification
3. verify a transaction hash or verification field appears in the UI
4. verify verified badge appears where expected
5. open ownership or transaction history view
6. confirm verification-related data is displayed

Requirements:
- keep the test stable for local/demo use
- avoid dependence on external explorer services
- assert on app-visible verification signals
```

---

## Prompt 9 — Build failure-tolerance E2E tests

```md
Implement Playwright tests for graceful failure handling.

Please add coverage for:
- AI provider unavailable or failing
- blockchain service/node unavailable or failing

Expected behavior:
- core app still loads
- relevant UI surfaces show safe fallback or error state
- user can still navigate the app
- optional layers do not crash the experience

Requirements:
- tests should be deterministic
- prefer test-mode flags/mocks if available
- keep assertions user-centered and resilient
```

---

## Prompt 10 — Build Hardhat contract tests

```md
Implement Hardhat tests for the ownership smart contract.

Please add tests for:
- contract deploys successfully
- mint/issue shares works
- transfer shares works
- balances by property/address are updated correctly
- issue event is emitted
- transfer event is emitted
- invalid transfer is rejected if contract supports such protection

Requirements:
- keep tests local and deterministic
- use clean fixture setup
- keep naming tied to business meaning, not only low-level mechanics
```

---

## Prompt 11 — Add test data strategy and environment setup

```md
Set up a practical strategy for test data and environments.

Please do the following:
1. define how tests should use seed data, fixtures, or isolated test records
2. add or refine test environment variables/config
3. ensure API tests, E2E tests, and blockchain tests can run reliably in local development
4. document any required startup order, such as:
   - database
   - seed script
   - app server
   - local blockchain node

Requirements:
- keep setup lightweight
- avoid requiring too many manual steps
- update docs/scripts if needed
```

---

## Prompt 12 — Add verification-oriented test reporting

```md
Improve the test suite so it maps clearly to the Phase 1–3 verification goals.

Please:
1. organize tests using names that reflect business capabilities
2. add comments or grouping that map tests to:
   - Phase 1
   - Phase 2
   - Phase 3
3. make output readable so I can tell which business capability passed or failed
4. add any lightweight documentation or README notes explaining how to interpret results

Goal:
When I run the suite, I want to understand not only whether code passed, but whether the promised functionality exists and works.
```

---

## Recommended Execution Order

### Round 1
- Master prompt
- Prompt 1
- Prompt 5
- Prompt 11

### Round 2
- Prompt 2
- Prompt 3
- Prompt 4

### Round 3
- Prompt 10

### Round 4
- Prompt 6
- Prompt 7
- Prompt 8
- Prompt 9

### Round 5
- Prompt 12

---

## Extra Prompt — Generate tests from the verification matrix

```md
Using the existing verification pack and implemented application, derive concrete automated tests for each capability that is suitable for automation.

For each capability:
1. identify whether it should be covered by API test, Playwright E2E test, Hardhat test, or manual-only verification
2. generate or update the corresponding test file
3. prefer automation for repeatable high-value flows
4. clearly note any capabilities that remain manual-only and why

Focus especially on:
- core investor journey
- AI insight journey
- blockchain trust journey
- graceful failure handling
```

