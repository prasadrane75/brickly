import { rawApiFetch, assertOk, apiFetchAs } from "./http.js";

type PaginatedResponse<T> = {
  success: true;
  data: T[];
  meta?: {
    page: number;
    pageSize: number;
    total: number;
    totalPages?: number;
  };
};

type ApiResponse<T> = {
  success: true;
  data: T;
};

export async function getProperties() {
  const response = await rawApiFetch("/v1/properties?page=1&pageSize=20");
  const payload = await assertOk<PaginatedResponse<any>>(response);
  return payload.data;
}

export async function getFirstProperty() {
  const properties = await getProperties();
  if (!properties.length) {
    throw new Error("Expected seeded properties to exist.");
  }
  return properties[0];
}

export async function getTransactionsForInvestor() {
  const { response, payload } = await apiFetchAs<PaginatedResponse<any>>(
    "investor",
    "/v1/transactions?page=1&pageSize=20"
  );
  if (response.status !== 200 || !payload || !("data" in payload)) {
    throw new Error(`Unable to load investor transactions: ${JSON.stringify(payload)}`);
  }
  return payload.data;
}

export async function getFirstTransactionForInvestor() {
  const rows = await getTransactionsForInvestor();
  if (!rows.length) {
    throw new Error("Expected seeded transactions to exist.");
  }
  return rows[0];
}

export async function getDocumentsForInvestor() {
  const { response, payload } = await apiFetchAs<PaginatedResponse<any>>(
    "investor",
    "/v1/documents/by-entity?page=1&pageSize=20"
  );
  if (response.status !== 200 || !payload || !("data" in payload)) {
    throw new Error(`Unable to load seeded documents: ${JSON.stringify(payload)}`);
  }
  return payload.data;
}

export async function getFirstDocumentForInvestor() {
  const rows = await getDocumentsForInvestor();
  if (!rows.length) {
    throw new Error("Expected seeded documents to exist.");
  }
  return rows[0];
}

export async function getCurrentUser(userKey: "admin" | "investor" | "secondaryInvestor" | "lister") {
  const { response, payload } = await apiFetchAs<ApiResponse<any>>(userKey, "/v1/users/me");
  if (response.status !== 200 || !payload || !("data" in payload)) {
    throw new Error(`Unable to load current user: ${JSON.stringify(payload)}`);
  }
  return payload.data;
}
