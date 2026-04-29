export const runtimeConfig = {
  apiBaseUrl:
    typeof window === "undefined"
      ? process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"
      : "/api",
};

// Extension point: future feature flags for investor/demo variants, analytics,
// PHASE_2_AI, and PHASE_3_BLOCKCHAIN belong here rather than in page files.
