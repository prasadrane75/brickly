import { runtimeConfig } from "../../config/runtime";
import { getToken } from "../auth/token-storage";
import type { ApiErrorResponse } from "../../shared/api-types";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${runtimeConfig.apiBaseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    try {
      const data = JSON.parse(text) as ApiErrorResponse;
      if (!data.success && data.error?.message) {
        const error = new Error(data.error.message) as Error & {
          code?: string;
          details?: unknown;
        };
        error.code = data.error.code;
        error.details = data.error.details;
        throw error;
      }
    } catch {
      // ignore parse errors
    }
    throw new Error(text || `Request failed: ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const text = await res.text();
  if (!text) {
    return undefined as unknown as T;
  }
  const parsed = JSON.parse(text) as T | ApiErrorResponse;
  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "success" in parsed &&
    (parsed as ApiErrorResponse).success === false
  ) {
    const errorPayload = parsed as ApiErrorResponse;
    const error = new Error(errorPayload.error.message) as Error & {
      code?: string;
      details?: unknown;
    };
    error.code = errorPayload.error.code;
    error.details = errorPayload.error.details;
    throw error;
  }
  return parsed as T;
}
