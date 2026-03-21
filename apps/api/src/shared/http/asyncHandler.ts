import type express from "express";
import { toApiError } from "./apiError.js";
import { logDevError } from "./devLogger.js";
import { sendError } from "./sendError.js";

export function asyncHandler(
  handler: (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => Promise<unknown>
) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch((error) => {
      const apiError = toApiError(error);
      logDevError(`${req.method} ${req.originalUrl}`, error);
      sendError(res, apiError.status, apiError.code, apiError.message, apiError.details);
    });
  };
}
