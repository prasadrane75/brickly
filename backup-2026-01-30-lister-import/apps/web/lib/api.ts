const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

type TokenPayload = {
  id: string;
  role: string;
  exp?: number;
};

export function getTokenPayload(): TokenPayload | null {
  const token = getToken();
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const payloadJson = atob(parts[1]);
    return JSON.parse(payloadJson) as TokenPayload;
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("token", token);
  window.dispatchEvent(new Event("auth-changed"));
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("token");
  window.dispatchEvent(new Event("auth-changed"));
}

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

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed: ${res.status}`);
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const text = await res.text();
  if (!text) {
    return undefined as unknown as T;
  }
  return JSON.parse(text) as T;
}

export { API_BASE_URL };
