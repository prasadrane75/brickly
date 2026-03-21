import { runtimeConfig } from "../config/runtime";

export { apiFetch } from "../services/api/client";
export {
  clearToken,
  getToken,
  getTokenPayload,
  setToken,
} from "../services/auth/token-storage";
export { runtimeConfig as API_CONFIG } from "../config/runtime";
export const API_BASE_URL = runtimeConfig.apiBaseUrl;
