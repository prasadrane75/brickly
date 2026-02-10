# Phase 2A/2B – Features & Flows Summary

## 1) Liquidity + Pricing (API)
**Purpose:** compute a reference price, liquidity score, and optimized sell order pricing.

### Reference Price (ShareClass)
**Inputs**
- Primary reference: `ShareClass.referencePricePerShare` (weight 0.4)
- Secondary trades VWAP (last 14 days) (weight 0.4)
- NAV proxy: `listing.askingPrice / totalShares` (weight 0.2)

**Outputs**
- `ShareClass.referencePricePerShare`
- `ShareClass.lastReferenceUpdateAt`

**Flow**
- `updateReferencePrice(prisma, propertyId)`:
  - pulls last 14d trades for VWAP
  - pulls listing for NAV proxy
  - computes weighted reference
  - writes new reference + timestamp

### Liquidity Score (Property)
**Inputs**
- Trade count last 14 days
- Avg time‑to‑fill for filled sell orders
- Avg ask deviation vs reference price

**Output**
- `Property.liquidityScore` (0–100)
- `Property.lastTradeAt` updated on trade

**Flow**
- `updateLiquidityScore(prisma, propertyId)`:
  - trade count (14d)
  - avg time‑to‑fill (filled orders)
  - avg ask deviation
  - computes and clamps score
  - writes `Property.liquidityScore`

### Optimized Sell Order Price
**Rule**

**Liquidity adjustment**
- score >= 80 => 1.00
- 60..79 => 0.98
- 40..59 => 0.95
- <40 => 0.90

**Strategy adjustment**
- FAST_EXIT => 0.95
- BALANCED => 1.00
- MAX_PRICE => 1.03 (cap at +20% of reference)

**Flow**
- `computeOptimizedPrice()` returns optimized price
- `POST /admin/liquidity/recompute?propertyId=...`
  - recomputes reference + liquidity
  - updates `SellOrder.optimizedPricePerShare` for open orders

---

## 2) Targeting + Notifications
**Purpose:** find likely buyers for sell orders and notify them.

### Targeting Score Rules
- +40 if buyer already owns this property
- +30 if viewed property in last 14 days (weighted by viewCount)
- +20 if buyer has holdings in similar properties (same city/state)
- +10 if buyer recently bought any shares (last 14 days)

Top 20 buyers returned.

### Entities
- `PropertyView` (tracks views per user + property)
- `TargetedOffer` (sellOrderId + buyerUserId + score)
- `Notification` (userId + sellOrderId + propertyId + type + message)

### Flows
- **Manual run (admin):**
  - `POST /admin/targeting/run?sellOrderId=...`
  - Creates `TargetedOffer` rows
  - Creates `Notification` rows
- **Auto-run on sell order creation:**
  - Best‑effort run after sell order is created
  - Failures are logged but do not block sell order creation

**Notification message**
- `New opportunity: shares available in <property>`

---

## 3) Notifications API (User)
**Purpose:** retrieve and mark notifications as read.

### Endpoints
- `GET /notifications` (auth)
  - returns latest 50 notifications
- `POST /notifications/:id/read` (auth)
  - sets `readAt` for that notification
- `POST /notifications/read-all` (auth)
  - sets `readAt` for all unread notifications

**Security**
- Only notification owner can read/update.

---

## 4) Admin Liquidity Dashboard (Web)
**Route**
- `/admin/liquidity`

**Sections**
- KPI cards:
  - Avg Liquidity Score
  - Daily Trade Volume (last 24h)
  - Avg Bid‑Ask Spread
  - Open Sell Orders
- Main table: “Flagged Properties”
  - Property, Liquidity Score badge, Spread %, Avg Time‑to‑Fill, Open Sell Orders, Review
- Right panel: “Liquidity Overview”
  - 7‑day liquidity score trend bars
- Lower panel: “Market Health Indicators”
  - Active Buy Orders (placeholder)
  - Pending Sell Orders
  - Avg Fill Rate
  - Avg Price Deviation
- Actions:
  - “Recompute Metrics”
  - “Send Buyer Alerts”

---

## 5) Admin Liquidity Detail (Web)
**Route**
- `/admin/liquidity/[propertyId]`

**Displays**
- Reference price per share
- Liquidity score
- Last trade date
- Open sell orders (with optimized price + strategy)
- Recent trades (last 20)

**Recommended Actions**
- Suggest enabling FAST_EXIT for open orders
- Suggest targeted alerts

**Actions**
- `POST /admin/liquidity/recompute?propertyId=...`
- `POST /admin/targeting/run?sellOrderId=...`

---

## 6) Tests
**Unit tests**
- Pricing: `apps/api/src/pricing/__tests__/pricing.test.ts`
- Targeting: `apps/api/src/targeting/__tests__/targeting.test.ts`

**API smoke tests**
- `apps/api/src/__tests__/smoke.test.ts`
- Requires `ADMIN_EMAIL` and `ADMIN_PASSWORD`

**UI smoke tests**
- Playwright:
  - `apps/web/tests/smoke.spec.ts`
  - Logs in and checks liquidity pages
  - Requires `ADMIN_EMAIL` and `ADMIN_PASSWORD`

---

## 7) Data Model Changes
**Property**
- `liquidityScore Int @default(50)`
- `lastTradeAt DateTime?`

**ShareClass**
- `lastReferenceUpdateAt DateTime?`

**SellOrder**
- `remainingShares Int`
- `optimizedPricePerShare Decimal?`
- `liquidityScoreAtCreation Int?`
- `strategy SellOrderStrategy @default(BALANCED)`

**New**
- `PropertyView`
- `TargetedOffer`
- `Notification`
- `NotificationType`

---

## Notes / Known Gaps
- Property views are not yet recorded by the UI; `PropertyView` is ready for integration.
- Dashboard and detail pages are currently mock data; wiring to endpoints can be done next.
