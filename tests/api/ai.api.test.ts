import test from "node:test";
import assert from "node:assert/strict";
import { apiFetchAs } from "../support/http.js";
import {
  getCurrentUser,
  getFirstTransactionForInvestor,
} from "../support/data.js";
import { prisma } from "../support/prisma.js";

test("AI portfolio summary endpoint degrades safely and persists cache", async () => {
  const beforeCount = await prisma.aiRequest.count({
    where: { requestType: "PORTFOLIO_SUMMARY" },
  });

  const { response, payload } = await apiFetchAs<{
    success: true;
    data: {
      summary: string;
      provider: string;
      model: string;
      source: string;
      cachedAt: string;
    };
  }>("investor", "/v1/portfolio/summary/ai", {
    method: "POST",
  });

  assert.equal(response.status, 200);
  assert.ok(payload && "data" in payload);
  assert.ok(payload.data.summary.length > 20);
  assert.equal(payload.data.provider, "deterministic");
  assert.equal(payload.data.source, "fallback");

  const user = await prisma.user.findUniqueOrThrow({
    where: { email: "maya@fractional.app" },
  });
  assert.ok(user.aiSummaryCache);

  const afterCount = await prisma.aiRequest.count({
    where: { requestType: "PORTFOLIO_SUMMARY" },
  });
  assert.equal(afterCount, beforeCount + 1);

  const second = await apiFetchAs<{
    success: true;
    data: { summary: string; cachedAt: string };
  }>("investor", "/v1/portfolio/summary/ai", {
    method: "POST",
  });

  assert.equal(second.response.status, 200);
  assert.ok(second.payload && "data" in second.payload);

  const cachedCount = await prisma.aiRequest.count({
    where: { requestType: "PORTFOLIO_SUMMARY" },
  });
  assert.equal(cachedCount, afterCount);
});

test("AI document summary endpoint persists document cache and returns a safe fallback summary", async () => {
  const me = await getCurrentUser("investor");
  const upload = await apiFetchAs<{
    success: true;
    data: { id: string };
  }>("investor", "/v1/documents/upload-stub", {
    method: "POST",
    body: JSON.stringify({
      fileName: `ai-summary-${Date.now()}.txt`,
      mimeType: "text/plain",
      kind: "OTHER",
      status: "ACTIVE",
      linkTarget: {
        type: "USER",
        id: me.id,
      },
    }),
  });

  assert.equal(upload.response.status, 201);
  assert.ok(upload.payload && "data" in upload.payload);

  const document = { id: upload.payload.data.id };

  const beforeCount = await prisma.aiRequest.count({
    where: {
      requestType: "DOCUMENT_SUMMARY",
      entityId: document.id,
    },
  });

  const first = await apiFetchAs<{
    success: true;
    data: {
      summary: string;
      keyPoints: string[];
      provider: string;
      source: string;
    };
  }>("investor", `/v1/documents/${document.id}/summarize`, {
    method: "POST",
  });

  assert.equal(first.response.status, 200);
  assert.ok(first.payload && "data" in first.payload);
  assert.ok(first.payload.data.summary.length > 10);
  assert.equal(first.payload.data.provider, "deterministic");
  assert.equal(first.payload.data.source, "fallback");

  const storedDocument = await prisma.document.findUniqueOrThrow({
    where: { id: document.id },
  });
  assert.ok(storedDocument.aiSummaryCache);

  const afterCount = await prisma.aiRequest.count({
    where: {
      requestType: "DOCUMENT_SUMMARY",
      entityId: document.id,
    },
  });
  assert.equal(afterCount, beforeCount + 1);

  const second = await apiFetchAs<{
    success: true;
    data: { summary: string };
  }>("investor", `/v1/documents/${document.id}/summarize`, {
    method: "POST",
  });

  assert.equal(second.response.status, 200);
  assert.ok(second.payload && "data" in second.payload);
  assert.ok(second.payload.data.summary.length > 10);
});

test("AI transaction explanation endpoint persists trade explanation and reuses cache", async () => {
  const transaction = await getFirstTransactionForInvestor();

  const beforeCount = await prisma.aiRequest.count({
    where: {
      requestType: "TRANSACTION_EXPLANATION",
      entityId: transaction.id,
    },
  });

  const first = await apiFetchAs<{
    success: true;
    data: {
      headline: string;
      explanation: string;
      provider: string;
      source: string;
    };
  }>("investor", "/v1/ai/explain-transaction", {
    method: "POST",
    body: JSON.stringify({
      transactionId: transaction.id,
    }),
  });

  assert.equal(first.response.status, 200);
  assert.ok(first.payload && "data" in first.payload);
  assert.ok(first.payload.data.headline.length > 5);
  assert.ok(first.payload.data.explanation.length > 10);
  assert.equal(first.payload.data.provider, "deterministic");
  assert.equal(first.payload.data.source, "fallback");

  const storedTrade = await prisma.trade.findUniqueOrThrow({
    where: { id: transaction.id },
  });
  assert.ok(storedTrade.aiSummaryCache);

  const afterCount = await prisma.aiRequest.count({
    where: {
      requestType: "TRANSACTION_EXPLANATION",
      entityId: transaction.id,
    },
  });
  assert.equal(afterCount, beforeCount + 1);

  const second = await apiFetchAs<{
    success: true;
    data: { headline: string };
  }>("investor", "/v1/ai/explain-transaction", {
    method: "POST",
    body: JSON.stringify({
      transactionId: transaction.id,
    }),
  });

  assert.equal(second.response.status, 200);

  const finalCount = await prisma.aiRequest.count({
    where: {
      requestType: "TRANSACTION_EXPLANATION",
      entityId: transaction.id,
    },
  });
  assert.equal(finalCount, afterCount);
});
