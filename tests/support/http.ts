import { testConfig } from "./config.js";
import { demoUsers, type DemoUserKey } from "./demo-users.js";

type ApiErrorBody = {
  success?: false;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export async function rawApiFetch(path: string, options: RequestInit = {}) {
  return fetch(`${testConfig.apiBaseUrl}${path}`, options);
}

export async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

export async function assertOk<T>(
  response: Response,
  expectedStatus = 200
): Promise<T> {
  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected ${expectedStatus} but received ${response.status}: ${JSON.stringify(payload)}`
    );
  }

  return payload as T;
}

export async function loginAs(userKey: DemoUserKey) {
  const user = demoUsers[userKey];
  const response = await rawApiFetch("/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      emailOrPhone: user.email,
      password: user.password,
    }),
  });

  const payload = await assertOk<{ token: string }>(response);
  return payload.token;
}

export async function apiFetchAs<T>(
  userKey: DemoUserKey,
  path: string,
  options: RequestInit = {}
) {
  const token = await loginAs(userKey);
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await rawApiFetch(path, {
    ...options,
    headers,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  return {
    response,
    payload: payload as T | ApiErrorBody | null,
  };
}

export async function apiFetchWithToken<T>(
  token: string,
  path: string,
  options: RequestInit = {}
) {
  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${token}`);
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await rawApiFetch(path, {
    ...options,
    headers,
  });

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;
  return {
    response,
    payload: payload as T | ApiErrorBody | null,
  };
}

