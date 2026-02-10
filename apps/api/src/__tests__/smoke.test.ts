import test from "node:test";
import assert from "node:assert/strict";

const API_BASE_URL = process.env.API_BASE_URL || "http://localhost:4000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, options);
  return res;
}

async function getAdminToken() {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return null;
  const res = await apiFetch("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      emailOrPhone: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { token: string };
  return data.token;
}

test("market sell orders endpoint responds", async () => {
  const res = await apiFetch("/market/sell-orders");
  assert.equal(res.status, 200);
});

test("admin liquidity and notifications endpoints respond", async (t) => {
  const token = await getAdminToken();
  if (!token) {
    t.skip("ADMIN_EMAIL/ADMIN_PASSWORD not set or invalid");
    return;
  }

  const propsRes = await apiFetch("/properties");
  assert.equal(propsRes.status, 200);
  const properties = (await propsRes.json()) as { id: string }[];
  if (properties.length === 0) {
    t.skip("No properties available");
    return;
  }
  const propertyId = properties[0].id;

  const detailRes = await apiFetch(`/admin/liquidity/${propertyId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(detailRes.status, 200);

  const notificationsRes = await apiFetch("/notifications", {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(notificationsRes.status, 200);

  const ordersRes = await apiFetch("/market/sell-orders");
  assert.equal(ordersRes.status, 200);
  const orders = (await ordersRes.json()) as { id: string }[];
  if (orders.length === 0) {
    t.skip("No sell orders available");
    return;
  }
  const sellOrderId = orders[0].id;

  const targetingRes = await apiFetch(
    `/admin/targeting/run?sellOrderId=${sellOrderId}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  assert.ok([200, 201].includes(targetingRes.status));
});
