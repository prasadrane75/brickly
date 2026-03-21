import type express from "express";
import jwt from "jsonwebtoken";
import { KycStatus, UserRole } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { sendError } from "../shared/http/sendError.js";

export async function requireAuth(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const header = req.header("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return sendError(res, 401, "UNAUTHORIZED", "Missing authorization token");
  }

  const token = header.slice(7).trim();
  try {
    const decoded = jwt.verify(token, env.jwtSecret) as { id: string; role: UserRole };
    req.user = { id: decoded.id, role: decoded.role };
    return next();
  } catch {
    return sendError(res, 401, "INVALID_TOKEN", "Invalid or expired token");
  }
}

export async function requireKycApproved(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  if (!req.user) {
    return sendError(res, 401, "UNAUTHORIZED", "Unauthorized");
  }

  const profile = await prisma.kycProfile.findUnique({
    where: { userId: req.user.id },
    select: { status: true },
  });

  if (!profile || profile.status !== KycStatus.APPROVED) {
    return sendError(res, 403, "KYC_NOT_APPROVED", "KYC not approved");
  }

  return next();
}
