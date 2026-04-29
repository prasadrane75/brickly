export type AnalyticsService = {
  recordEvent(event: string, payload?: Record<string, unknown>): void;
};

// Extension point: replace console-backed analytics with warehouse/event-bus
// delivery without changing route handlers.
export const analyticsService: AnalyticsService = {
  recordEvent(event, payload) {
    if (process.env.NODE_ENV !== "test") {
      console.info("[analytics-placeholder]", event, payload ?? {});
    }
  },
};
