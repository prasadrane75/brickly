import test from "node:test";
import assert from "node:assert/strict";
import {
  computeReferencePrice,
  computeVwap,
} from "../referencePrice.js";
import { computeLiquidityScore } from "../liquidityScore.js";
import { computeOptimizedPrice } from "../optimizeSellOrder.js";

test("computeVwap returns weighted average", () => {
  const vwap = computeVwap([
    { pricePerShare: 10, sharesTraded: 100 },
    { pricePerShare: 12, sharesTraded: 50 },
  ]);
  assert.equal(vwap, 10.6667);
});

test("computeReferencePrice weights components", () => {
  const ref = computeReferencePrice({
    primaryReference: 10,
    trades: [
      { pricePerShare: 12, sharesTraded: 100 },
      { pricePerShare: 11, sharesTraded: 100 },
    ],
    listingAskingPrice: 120000,
    totalShares: 10000,
    weights: { primary: 0.4, secondary: 0.4, nav: 0.2 },
  });
  assert.equal(ref, 11);
});

test("computeLiquidityScore clamps 0..100", () => {
  const score = computeLiquidityScore(
    {
      tradeCount14d: 20,
      avgTimeToFillHours: 0,
      avgAskDeviationPct: 0.5,
    },
    {
      tradeWeight: 40,
      timeWeight: 35,
      deviationWeight: 25,
      tradeCountCap: 10,
      timeToFillMaxHours: 168,
    }
  );
  assert.equal(score, 100);
});

test("computeOptimizedPrice applies strategy and cap", () => {
  const optimized = computeOptimizedPrice({
    referencePrice: 100,
    liquidityScore: 85,
    strategy: "MAX_PRICE",
    config: {
      strategyMultiplierFastExit: 0.95,
      strategyMultiplierBalanced: 1,
      strategyMultiplierMaxPrice: 1.03,
      maxPriceCapMultiplier: 1.2,
    },
  });
  assert.equal(optimized, 103);
});
