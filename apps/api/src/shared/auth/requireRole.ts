import type express from "express";
import { UserRole } from "@prisma/client";
import { sendError } from "../http/sendError.js";

export function requireRole(roles: UserRole[]) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.user) {
      return sendError(res, 401, "UNAUTHORIZED", "Unauthorized");
    }
    if (!roles.includes(req.user.role)) {
      return sendError(res, 403, "FORBIDDEN", "Forbidden");
    }
    return next();
  };
}
