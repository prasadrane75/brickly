import test from "node:test";
import assert from "node:assert/strict";
import { apiFetchAs, assertOk, rawApiFetch } from "../support/http.js";
import { getCurrentUser, getFirstProperty } from "../support/data.js";

test("auth login succeeds for seeded investor", async () => {
  const response = await rawApiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      emailOrPhone: "maya@fractional.app",
      password: "demo-investor-123",
    }),
  });

  const payload = await assertOk<{ token: string }>(response);
  assert.ok(payload.token.length > 20);
});

test("auth login rejects invalid credentials", async () => {
  const response = await rawApiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      emailOrPhone: "maya@fractional.app",
      password: "wrong-password",
    }),
  });

  const payload = (await response.json()) as {
    success: false;
    error: { code: string; message: string };
  };

  assert.equal(response.status, 401);
  assert.equal(payload.error.code, "INVALID_CREDENTIALS");
});

test("portfolio summary returns seeded holdings for investor", async () => {
  const { response, payload } = await apiFetchAs<{
    success: true;
    data: {
      summary: { totalPortfolioValue: number; totalPositions: number };
      currentHoldings: unknown[];
    };
  }>("investor", "/v1/portfolio/summary");

  assert.equal(response.status, 200);
  assert.ok(payload && "data" in payload);
  assert.ok(payload.data.summary.totalPortfolioValue > 0);
  assert.ok(payload.data.currentHoldings.length > 0);
});

test("properties list and detail are available", async () => {
  const listResponse = await rawApiFetch("/v1/properties?page=1&pageSize=10");
  const listPayload = await assertOk<{
    success: true;
    data: Array<{ id: string; address1: string }>;
  }>(listResponse);

  assert.ok(listPayload.data.length > 0);

  const detailResponse = await rawApiFetch(`/v1/properties/${listPayload.data[0].id}`);
  const detailPayload = await assertOk<{
    success: true;
    data: { id: string; address1: string; shareClass: unknown | null };
  }>(detailResponse);

  assert.equal(detailPayload.data.id, listPayload.data[0].id);
  assert.ok(detailPayload.data.address1.length > 0);
});

test("order creation validates request payload", async () => {
  const { response, payload } = await apiFetchAs<{
    success: false;
    error: { code: string; message: string };
  }>("investor", "/v1/orders", {
    method: "POST",
    body: JSON.stringify({
      side: "BUY",
      propertyId: "not-a-uuid",
      sharesRequested: 0,
      orderType: "LIMIT",
      maxPricePerShare: -1,
    }),
  });

  assert.equal(response.status, 400);
  assert.ok(payload && "error" in payload);
  assert.equal(payload.error.code, "VALIDATION_ERROR");
});

test("investor can create a buy order", async () => {
  const property = await getFirstProperty();

  const { response, payload } = await apiFetchAs<{
    success: true;
    data: {
      id: string;
      side: "BUY";
      property: { id: string };
      workflow?: { transactionCreated: boolean };
    };
  }>("investor", "/v1/orders", {
    method: "POST",
    body: JSON.stringify({
      side: "BUY",
      propertyId: property.id,
      sharesRequested: 1,
      orderType: "LIMIT",
      maxPricePerShare: property.shareClass?.referencePricePerShare ?? 500,
    }),
  });

  assert.equal(response.status, 201);
  assert.ok(payload && "data" in payload);
  assert.equal(payload.data.side, "BUY");
  assert.equal(payload.data.property.id, property.id);
});

test("sell recommendation returns deterministic price guidance with AI-safe fallback", async () => {
  const property = await getFirstProperty();

  const { response, payload } = await apiFetchAs<{
    success: true;
    data: {
      property: { id: string };
      strategy: "BALANCED";
      referencePrice: number;
      recommendedPrice: number;
      liquidityScore: number;
      aiRationale: {
        summary: string;
        provider: "openai" | "deterministic";
        source: "generated" | "fallback";
      };
    };
  }>(
    "investor",
    `/v1/orders/sell-recommendation?propertyId=${property.id}&strategy=BALANCED`
  );

  assert.equal(response.status, 200);
  assert.ok(payload && "data" in payload);
  assert.equal(payload.data.property.id, property.id);
  assert.equal(payload.data.strategy, "BALANCED");
  assert.ok(payload.data.referencePrice > 0);
  assert.ok(payload.data.recommendedPrice > 0);
  assert.ok(payload.data.liquidityScore >= 0);
  assert.ok(payload.data.aiRationale.summary.length > 0);
});

test("transactions list returns investor ledger rows", async () => {
  const { response, payload } = await apiFetchAs<{
    success: true;
    data: Array<{ id: string; sharesTraded: number }>;
  }>("investor", "/v1/transactions?page=1&pageSize=20");

  assert.equal(response.status, 200);
  assert.ok(payload && "data" in payload);
  assert.ok(payload.data.length > 0);
  assert.ok(payload.data[0].sharesTraded > 0);
});

test("documents upload stub stores metadata and linked entity", async () => {
  const me = await getCurrentUser("investor");
  const fileName = `verification-suite-${Date.now()}.txt`;

  const { response, payload } = await apiFetchAs<{
    success: true;
    data: { id: string; fileName: string; linkedEntity: { id: string | null } };
  }>("investor", "/v1/documents/upload-stub", {
    method: "POST",
    body: JSON.stringify({
      fileName,
      mimeType: "text/plain",
      kind: "OTHER",
      status: "ACTIVE",
      linkTarget: {
        type: "USER",
        id: me.id,
      },
    }),
  });

  assert.equal(response.status, 201);
  assert.ok(payload && "data" in payload);
  assert.equal(payload.data.fileName, fileName);
  assert.equal(payload.data.linkedEntity.id, me.id);
});

test("documents upload stub rejects missing linked entity", async () => {
  const { response, payload } = await apiFetchAs<{
    success: false;
    error: { code: string };
  }>("investor", "/v1/documents/upload-stub", {
    method: "POST",
    body: JSON.stringify({
      fileName: "broken.txt",
      kind: "OTHER",
      status: "ACTIVE",
    }),
  });

  assert.equal(response.status, 400);
  assert.ok(payload && "error" in payload);
  assert.equal(payload.error.code, "VALIDATION_ERROR");
});

test("notifications list and mark-read flow work for investor", async () => {
  const { response, payload } = await apiFetchAs<{
    success: true;
    data: Array<{ id: string; readAt: string | null }>;
  }>("investor", "/v1/notifications?page=1&pageSize=20");

  assert.equal(response.status, 200);
  assert.ok(payload && "data" in payload);
  assert.ok(payload.data.length > 0);

  const targetId = payload.data[0].id;
  const markRead = await apiFetchAs<{
    success: true;
    data: { ok: true };
  }>("investor", `/v1/notifications/${targetId}/read`, {
    method: "POST",
  });

  assert.equal(markRead.response.status, 200);
  assert.ok(markRead.payload && "data" in markRead.payload);
  assert.equal(markRead.payload.data.ok, true);
});

test("admin audit history is admin-only", async () => {
  const adminResult = await apiFetchAs<{
    success: true;
    data: Array<{ id: string; action: string }>;
  }>("admin", "/v1/admin/audit-history?page=1&pageSize=20");

  assert.equal(adminResult.response.status, 200);
  assert.ok(adminResult.payload && "data" in adminResult.payload);
  assert.ok(adminResult.payload.data.length > 0);

  const investorResult = await apiFetchAs<{
    success: false;
    error: { code: string };
  }>("investor", "/v1/admin/audit-history?page=1&pageSize=20");

  assert.equal(investorResult.response.status, 403);
  assert.ok(investorResult.payload && "error" in investorResult.payload);
  assert.equal(investorResult.payload.error.code, "FORBIDDEN");
});

test("current user profile matches seeded investor role", async () => {
  const me = await getCurrentUser("investor");
  assert.equal(me.email, "maya@fractional.app");
  assert.equal(me.role, "INVESTOR");
});
