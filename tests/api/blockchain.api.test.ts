import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { apiFetchAs, rawApiFetch } from "../support/http.js";
import {
  getCurrentUser,
  getFirstProperty,
  getFirstTransactionForInvestor,
} from "../support/data.js";
import { prisma } from "../support/prisma.js";
import {
  spawnServer,
  stopServer,
  waitForHttp,
} from "../../scripts/test/lib/process-utils.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");

async function waitForCondition(
  predicate: () => Promise<boolean>,
  options: { timeoutMs?: number; intervalMs?: number } = {}
) {
  const timeoutMs = options.timeoutMs ?? 15_000;
  const intervalMs = options.intervalMs ?? 500;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  throw new Error("Timed out waiting for condition");
}

test("property ownership proof endpoint deploys and persists blockchain proof", async () => {
  const property = await getFirstProperty();
  const investor = await getCurrentUser("investor");

  const { response, payload } = await apiFetchAs<{
    success: true;
    data: {
      verificationStatus: string;
      contractAddress: string | null;
      latestRecord: { status: string; txHash: string | null } | null;
    };
  }>("admin", `/v1/blockchain/properties/${property.id}/ownership-proof`, {
    method: "POST",
    body: JSON.stringify({
      ownerUserId: investor.id,
    }),
  });

  assert.equal(response.status, 200);
  assert.ok(payload && "data" in payload);
  assert.equal(payload.data.verificationStatus, "VERIFIED");
  assert.ok(payload.data.contractAddress);
  assert.ok(payload.data.latestRecord?.txHash);
  assert.equal(payload.data.latestRecord?.status, "CONFIRMED");

  const storedProperty = await prisma.property.findUniqueOrThrow({
    where: { id: property.id },
  });
  assert.equal(storedProperty.verificationStatus, "VERIFIED");
  assert.ok(storedProperty.blockchainTxHash);

  const record = await prisma.blockchainRecord.findFirst({
    where: {
      entityType: "PROPERTY",
      entityId: property.id,
      recordType: "OWNERSHIP_PROOF",
    },
    orderBy: { createdAt: "desc" },
  });
  assert.ok(record);
  assert.equal(record?.status, "CONFIRMED");
});

test("property verification endpoint returns current blockchain snapshot", async () => {
  const property = await getFirstProperty();

  const response = await rawApiFetch(
    `/v1/blockchain/properties/${property.id}/verification`
  );
  const payload = (await response.json()) as {
    success: true;
    data: {
      entityType: string;
      entityId: string;
      latestRecord: { status: string } | null;
      records: unknown[];
    };
  };

  assert.equal(response.status, 200);
  assert.equal(payload.data.entityType, "PROPERTY");
  assert.equal(payload.data.entityId, property.id);
  assert.ok(payload.data.records.length > 0);
});

test("transaction transfer proof endpoint persists tx hash and verification state", async () => {
  const transaction = await getFirstTransactionForInvestor();

  const { response, payload } = await apiFetchAs<{
    success: true;
    data: {
      verificationStatus: string;
      latestRecord: { status: string; txHash: string | null } | null;
    };
  }>("admin", `/v1/blockchain/transactions/${transaction.id}/transfer-proof`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  assert.equal(response.status, 200);
  assert.ok(payload && "data" in payload);
  assert.equal(payload.data.verificationStatus, "VERIFIED");
  assert.equal(payload.data.latestRecord?.status, "CONFIRMED");
  assert.ok(payload.data.latestRecord?.txHash);

  const storedTrade = await prisma.trade.findUniqueOrThrow({
    where: { id: transaction.id },
  });
  assert.equal(storedTrade.verificationStatus, "VERIFIED");
  assert.ok(storedTrade.blockchainTxHash);
});

test("transaction verification endpoint returns current blockchain snapshot", async () => {
  const transaction = await getFirstTransactionForInvestor();

  await apiFetchAs("admin", `/v1/blockchain/transactions/${transaction.id}/transfer-proof`, {
    method: "POST",
    body: JSON.stringify({}),
  });

  const { response, payload } = await apiFetchAs<{
    success: true;
    data: {
      entityType: string;
      entityId: string;
      records: unknown[];
    };
  }>("admin", `/v1/blockchain/transactions/${transaction.id}/verification`);

  assert.equal(response.status, 200);
  assert.ok(payload && "data" in payload);
  assert.equal(payload.data.entityType, "TRADE");
  assert.equal(payload.data.entityId, transaction.id);
  assert.ok(payload.data.records.length > 0);
});

test("matched trade creation automatically records transfer proof without blocking order execution", async () => {
  const property = await getFirstProperty();

  const orderResult = await apiFetchAs<{
    success: true;
    data: {
      workflow?: {
        transactionCreated: boolean;
        transactionId?: string | null;
      };
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

  assert.equal(orderResult.response.status, 201);
  assert.ok(orderResult.payload && "data" in orderResult.payload);
  assert.equal(orderResult.payload.data.workflow?.transactionCreated, true);
  assert.ok(orderResult.payload.data.workflow?.transactionId);

  const transactionId = orderResult.payload.data.workflow?.transactionId as string;

  await waitForCondition(async () => {
    const trade = await prisma.trade.findUnique({
      where: { id: transactionId },
      select: { verificationStatus: true, blockchainTxHash: true },
    });

    return Boolean(trade?.blockchainTxHash && trade.verificationStatus === "VERIFIED");
  });

  const verification = await apiFetchAs<{
    success: true;
    data: {
      verificationStatus: string;
      latestRecord: { status: string; txHash: string | null } | null;
    };
  }>("admin", `/v1/blockchain/transactions/${transactionId}/verification`);

  assert.equal(verification.response.status, 200);
  assert.ok(verification.payload && "data" in verification.payload);
  assert.equal(verification.payload.data.verificationStatus, "VERIFIED");
  assert.equal(verification.payload.data.latestRecord?.status, "CONFIRMED");
  assert.ok(verification.payload.data.latestRecord?.txHash);
});

test("admin audit history includes blockchain proof metadata for verified entities", async () => {
  const initial = await apiFetchAs<{
    success: true;
    data: Array<{
      propertyId: string | null;
      tradeId: string | null;
      propertyProof: {
        verificationStatus: string;
        blockchainRef: string | null;
        latestRecordStatus: string | null;
      } | null;
      tradeProof: {
        verificationStatus: string;
        blockchainRef: string | null;
        latestRecordStatus: string | null;
      } | null;
    }>;
  }>("admin", "/v1/admin/audit-history?page=1&pageSize=100");

  assert.equal(initial.response.status, 200);
  assert.ok(initial.payload && "data" in initial.payload);

  const target = initial.payload.data.find((row) => row.propertyId || row.tradeId);
  assert.ok(target, "Expected an audit log row with property or trade references.");

  if (target?.propertyId) {
    const investor = await getCurrentUser("investor");
    await apiFetchAs("admin", `/v1/blockchain/properties/${target.propertyId}/ownership-proof`, {
      method: "POST",
      body: JSON.stringify({
        ownerUserId: investor.id,
      }),
    });
  } else if (target?.tradeId) {
    await apiFetchAs("admin", `/v1/blockchain/transactions/${target.tradeId}/transfer-proof`, {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  const { response, payload } = await apiFetchAs<{
    success: true;
    data: Array<{
      propertyId: string | null;
      tradeId: string | null;
      propertyProof: {
        verificationStatus: string;
        blockchainRef: string | null;
        latestRecordStatus: string | null;
      } | null;
      tradeProof: {
        verificationStatus: string;
        blockchainRef: string | null;
        latestRecordStatus: string | null;
      } | null;
    }>;
  }>("admin", "/v1/admin/audit-history?page=1&pageSize=100");

  assert.equal(response.status, 200);
  assert.ok(payload && "data" in payload);

  const proofRow = payload.data.find(
    (row) =>
      (target?.propertyId ? row.propertyId === target.propertyId : row.tradeId === target?.tradeId) &&
      Boolean(row.propertyProof?.blockchainRef || row.tradeProof?.blockchainRef)
  );

  assert.ok(proofRow);
  assert.ok(
    proofRow?.propertyProof?.verificationStatus === "VERIFIED" ||
      proofRow?.tradeProof?.verificationStatus === "VERIFIED"
  );
  assert.ok(proofRow?.propertyProof?.blockchainRef || proofRow?.tradeProof?.blockchainRef);
});

test("blockchain proof failures degrade safely when the local node is unavailable", async () => {
  const property = await getFirstProperty();
  const apiPort = "4101";
  const apiBaseUrl = `http://127.0.0.1:${apiPort}`;

  const child = spawnServer(
    `${process.execPath} --import tsx scripts/test/start-api.mjs`,
    {
      cwd: repoRoot,
      env: {
        ...process.env,
        TEST_API_PORT: apiPort,
        TEST_DATABASE_URL:
          process.env.TEST_DATABASE_URL || "postgres://app:app@localhost:5433/fractional",
        OPENAI_API_KEY: "test-key",
        OPENAI_BASE_URL: "http://127.0.0.1:1",
        BLOCKCHAIN_ENABLED: "true",
        BLOCKCHAIN_PROVIDER: "hardhat-local",
        BLOCKCHAIN_RPC_URL: "http://127.0.0.1:1",
      },
    }
  );

  try {
    await waitForHttp(`${apiBaseUrl}/health`, { timeoutMs: 60_000 });

    const loginResponse = await fetch(`${apiBaseUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailOrPhone: "admin@fractional.app",
        password: "demo-admin-123",
      }),
    });
    const loginPayload = (await loginResponse.json()) as { token: string };

    const result = await fetch(
      `${apiBaseUrl}/v1/blockchain/properties/${property.id}/ownership-proof`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${loginPayload.token}`,
        },
        body: JSON.stringify({}),
      }
    );

    const payload = (await result.json()) as {
      success: true;
      data: {
        verificationStatus: string;
        latestRecord: { status: string; txHash: string | null } | null;
      };
    };

    assert.equal(result.status, 200);
    const latestFailedRecord = await prisma.blockchainRecord.findFirst({
      where: {
        entityType: "PROPERTY",
        entityId: property.id,
        status: "FAILED",
      },
      orderBy: { createdAt: "desc" },
    });

    assert.ok(latestFailedRecord);
    assert.equal(latestFailedRecord?.txHash, null);
  } finally {
    await stopServer(child);
  }
});
