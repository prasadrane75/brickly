import test from "node:test";
import assert from "node:assert/strict";
import { apiFetchAs } from "../support/http.js";
import { getFirstProperty, getFirstTransactionForInvestor } from "../support/data.js";

test("Phase 4 portfolio AI returns trust metrics", async () => {
  const { response, payload } = await apiFetchAs<{
    success: true;
    data: {
      summary: string;
      trustScore: number;
      verificationCoverage: number;
      verifiedVsUnverified: {
        verified: number;
        unverified: number;
      };
      riskNotes: string[];
      provider: string;
      source: string;
    };
  }>("investor", "/v1/portfolio/summary/ai", {
    method: "POST",
  });

  assert.equal(response.status, 200);
  assert.ok(payload && "data" in payload);
  assert.ok(payload.data.summary.length > 20);
  assert.equal(typeof payload.data.trustScore, "number");
  assert.equal(typeof payload.data.verificationCoverage, "number");
  assert.equal(typeof payload.data.verifiedVsUnverified.verified, "number");
  assert.equal(typeof payload.data.verifiedVsUnverified.unverified, "number");
  assert.ok(Array.isArray(payload.data.riskNotes));
});

test("Phase 4 transaction explanation includes verification context", async () => {
  const transaction = await getFirstTransactionForInvestor();

  const { response, payload } = await apiFetchAs<{
    success: true;
    data: {
      headline: string;
      explanation: string;
      verificationStatus: string;
      trustNote: string;
      impactSummary: string;
      source: string;
    };
  }>("investor", "/v1/ai/explain-transaction", {
    method: "POST",
    body: JSON.stringify({
      transactionId: transaction.id,
    }),
  });

  assert.equal(response.status, 200);
  assert.ok(payload && "data" in payload);
  assert.ok(payload.data.headline.length > 5);
  assert.ok(payload.data.explanation.length > 10);
  assert.ok(payload.data.verificationStatus.length > 0);
  assert.ok(payload.data.trustNote.length > 0);
  assert.ok(payload.data.impactSummary.length > 0);
});

test("Phase 4 ownership summary returns narrative and cap table breakdown", async () => {
  const property = await getFirstProperty();

  const { response, payload } = await apiFetchAs<{
    success: true;
    data: {
      summary: string;
      majorChanges: string[];
      currentOwnershipBreakdown: Array<{
        holder: string;
        sharesOwned: number;
        sharePercent: number;
        verified: boolean;
      }>;
      trustIndicator: string;
    };
  }>("investor", "/v1/ai/ownership-summary", {
    method: "POST",
    body: JSON.stringify({
      propertyId: property.id,
    }),
  });

  assert.equal(response.status, 200);
  assert.ok(payload && "data" in payload);
  assert.ok(payload.data.summary.length > 10);
  assert.ok(Array.isArray(payload.data.majorChanges));
  assert.ok(Array.isArray(payload.data.currentOwnershipBreakdown));
  assert.ok(payload.data.trustIndicator.length > 0);
});

test("Phase 4 liquidity insight returns heuristic liquidity guidance", async () => {
  const property = await getFirstProperty();

  const { response, payload } = await apiFetchAs<{
    success: true;
    data: {
      liquidityScore: number;
      expectedExitTime: string;
      demandIndicator: string;
      explanation: string;
    };
  }>("investor", "/v1/ai/liquidity-insight", {
    method: "POST",
    body: JSON.stringify({
      propertyId: property.id,
    }),
  });

  assert.equal(response.status, 200);
  assert.ok(payload && "data" in payload);
  assert.equal(typeof payload.data.liquidityScore, "number");
  assert.ok(payload.data.expectedExitTime.length > 0);
  assert.ok(payload.data.demandIndicator.length > 0);
  assert.ok(payload.data.explanation.length > 10);
});

test("Phase 4 audit summary is admin-only and returns structured summary", async () => {
  const investorAttempt = await apiFetchAs("investor", "/v1/ai/audit-summary", {
    method: "POST",
    body: JSON.stringify({ limit: 10 }),
  });

  assert.equal(investorAttempt.response.status, 403);

  const adminAttempt = await apiFetchAs<{
    success: true;
    data: {
      summary: string;
      keyEvents: string[];
      anomalies: string[];
      verificationCoverage: number;
    };
  }>("admin", "/v1/ai/audit-summary", {
    method: "POST",
    body: JSON.stringify({ limit: 10 }),
  });

  assert.equal(adminAttempt.response.status, 200);
  assert.ok(adminAttempt.payload && "data" in adminAttempt.payload);
  assert.ok(adminAttempt.payload.data.summary.length > 10);
  assert.ok(Array.isArray(adminAttempt.payload.data.keyEvents));
  assert.ok(Array.isArray(adminAttempt.payload.data.anomalies));
  assert.equal(typeof adminAttempt.payload.data.verificationCoverage, "number");
});

test("Phase 4 anomaly detection is admin-only and returns flagged results", async () => {
  const property = await getFirstProperty();

  const investorAttempt = await apiFetchAs("investor", "/v1/ai/anomaly-detection", {
    method: "POST",
    body: JSON.stringify({ propertyId: property.id, limit: 10 }),
  });

  assert.equal(investorAttempt.response.status, 403);

  const adminAttempt = await apiFetchAs<{
    success: true;
    data: {
      anomalies: Array<{
        title: string;
        severity: "LOW" | "MEDIUM" | "HIGH";
        explanation: string;
        category: string;
        referenceId: string | null;
      }>;
      severity: "NONE" | "LOW" | "MEDIUM" | "HIGH";
      explanation: string;
    };
  }>("admin", "/v1/ai/anomaly-detection", {
    method: "POST",
    body: JSON.stringify({ propertyId: property.id, limit: 10 }),
  });

  assert.equal(adminAttempt.response.status, 200);
  assert.ok(adminAttempt.payload && "data" in adminAttempt.payload);
  assert.ok(Array.isArray(adminAttempt.payload.data.anomalies));
  assert.ok(adminAttempt.payload.data.severity.length > 0);
  assert.ok(adminAttempt.payload.data.explanation.length > 10);
});
