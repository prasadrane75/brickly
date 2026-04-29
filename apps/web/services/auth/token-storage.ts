export type TokenPayload = {
  id: string;
  role: string;
  exp?: number;
};

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("token");
}

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
