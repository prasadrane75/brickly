import test from "node:test";
import assert from "node:assert/strict";
import { computeBuyerScore } from "../scoreBuyersForSellOrder.js";

const config = {
  ownsPropertyWeight: 40,
  viewScorePerCount: 6,
  maxViewScore: 30,
  similarHoldingsWeight: 20,
  recentBuyerWeight: 10,
  minScoreToTarget: 1,
  maxBuyersPerOrder: 20,
  cooldownHours: 0,
};

test("computeBuyerScore adds weighted view points", () => {
  const score = computeBuyerScore({
    ownsProperty: false,
    viewCount: 3,
    hasSimilarHoldings: false,
    recentBuyer: false,
    config,
  });
  assert.equal(score, 18);
});

test("computeBuyerScore maxes view bonus at 30", () => {
  const score = computeBuyerScore({
    ownsProperty: false,
    viewCount: 10,
    hasSimilarHoldings: false,
    recentBuyer: false,
    config,
  });
  assert.equal(score, 30);
});

test("computeBuyerScore sums all bonuses", () => {
  const score = computeBuyerScore({
    ownsProperty: true,
    viewCount: 2,
    hasSimilarHoldings: true,
    recentBuyer: true,
    config,
  });
  assert.equal(score, 40 + 12 + 20 + 10);
});
