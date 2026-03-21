# Brickly Business Rules

This document captures current business logic for market rules, pricing, liquidity, and matching behavior.

## Scope

- API code: `apps/api/src`
- Admin Market Rules UI: `/admin/market-rules`
- Admin Liquidity UI: `/admin/liquidity`

## Core Concepts

- Market Rules are global configuration values.
- Sell order strategy is per-order (`FAST_EXIT`, `BALANCED`, `MAX_PRICE`).
- Recompute operations apply current global rules to active orders.

## Default Global Market Rules

From `marketRules.ts` defaults:

- `liquidityGoodThreshold`: `70`
- `liquidityMidThreshold`: `50`
- `liquidityLookbackDays`: `14`
- `liquidityTradeWeight`: `40`
- `liquidityTimeWeight`: `35`
- `liquidityDeviationWeight`: `25`
- `liquidityTradeCountCap`: `10`
- `liquidityTimeToFillMaxHours`: `168` (7 days)
- `referenceWeightPrimary`: `0.4`
- `referenceWeightSecondary`: `0.4`
- `referenceWeightNav`: `0.2`
- `strategyMultiplierFastExit`: `0.95`
- `strategyMultiplierBalanced`: `1.0`
- `strategyMultiplierMaxPrice`: `1.03`
- `maxPriceCapMultiplier`: `1.2`

## Reference Price Rules

Reference price uses weighted components:

- Primary reference: current `ShareClass.referencePricePerShare`
- Secondary reference: recent trades VWAP
- NAV proxy: `Listing.askingPrice / ShareClass.totalShares`

Formula:

- `referencePrice = weighted_average(available_components)`
- Weights come from Market Rules (`referenceWeightPrimary/Secondary/Nav`)
- If one component is missing, available weights are renormalized over remaining components
- Result is rounded to 4 decimals

Trade window for VWAP:

- Last `liquidityLookbackDays`

## Liquidity Score Rules

Liquidity score is 0-100 and combines:

- Trade activity score
- Time-to-fill score
- Ask deviation score

Inputs:

- `tradeCount14d`: trades in lookback window
- `avgTimeToFillHours`: based on filled orders
- `avgAskDeviationPct`: absolute percent deviation of open asks from reference price

Formula:

- `tradeScore = min(tradeCount14d, tradeCountCap) / tradeCountCap * tradeWeight`
- `timeScore = ((maxHours - clampedAvgFillHours) / maxHours) * timeWeight`
- `deviationScore` buckets:
  - `<=1%`: `100%` of deviation weight
  - `<=3%`: `80%`
  - `<=5%`: `60%`
  - `<=10%`: `32%`
  - `>10%`: `0%`
- `liquidityScore = round(clamp_0_100(tradeScore + timeScore + deviationScore))`

Fallbacks if missing data:

- Missing fill-time data: `timeScore = 50%` of time weight
- Missing deviation data: `deviationScore = 40%` of deviation weight

## Strategy Pricing Rules

Base liquidity adjustment:

- Liquidity `>=80`: `1.00`
- `>=60`: `0.98`
- `>=40`: `0.95`
- `<40`: `0.90`

Strategy adjustment:

- `FAST_EXIT`: `strategyMultiplierFastExit`
- `BALANCED`: `strategyMultiplierBalanced`
- `MAX_PRICE`: `strategyMultiplierMaxPrice`

Optimized price formula:

- `base = referencePrice * liquidityAdjustment(liquidityScore)`
- `optimized = base * strategyMultiplier(strategy)`
- If strategy is `MAX_PRICE`, cap:
  - `optimized = min(optimized, referencePrice * maxPriceCapMultiplier)`
- Result rounded to 4 decimals

## Recompute Behavior (Current)

Endpoints:

- `POST /admin/liquidity/recompute?propertyId=...`
- `POST /admin/liquidity/recompute-all`

For active sell orders (`OPEN` and `PARTIAL`, `remainingShares > 0`):

- Recompute reference price
- Recompute property liquidity score
- Recompute optimized price per order
- Update both:
  - `SellOrder.optimizedPricePerShare`
  - `SellOrder.askPricePerShare`

This means Market Rule multipliers now directly affect live matching/fill behavior after recompute runs.

## Matching Rules

Order book and priority:

- Sell orders sorted by lowest ask first, then oldest
- Buy orders sorted:
  - `MARKET` before `LIMIT`
  - Higher `LIMIT` max price first
  - Older first for ties

Match condition:

- `LIMIT` buy matches only if `maxPricePerShare >= sell ask`
- Trade price uses sell `askPricePerShare`

## Global vs Per-Order Strategy

- Global (Market Rules): defines multipliers and caps for each strategy.
- Per-order (`SellOrder.strategy`): determines which multiplier an order uses.
- Changing Market Rules does not change an order’s strategy label.
- Recompute applies current global multipliers to whatever strategy each open order has.

## Operational Guidance

- To increase expected fill rate:
  - lower `FAST_EXIT` and/or `BALANCED` multipliers
  - lower `MAX_PRICE` multiplier and/or `maxPriceCapMultiplier`
  - run recompute so active asks update
- To preserve higher margins:
  - keep `BALANCED` near `1.0`
  - keep `MAX_PRICE` above `1.0` with a reasonable cap

## Validation Constraints

- Liquidity weights must sum to `100` (`trade + time + deviation`)
- `liquidityGoodThreshold > liquidityMidThreshold`
- Multipliers and caps must be positive

