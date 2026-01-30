import type express from "express";
import jwt from "jsonwebtoken";
import { PrismaClient, KycStatus, UserRole } from "@prisma/client";

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgres://app:app@localhost:5433/fractional";
}

const prisma = new PrismaClient();
const jwtSecret = process.env.JWT_SECRET || "dev-secret";

function sendError(
  res: express.Response,
  status: number,
  code: string,
  message: string
) {
  return res.status(status).json({ error: { code, message } });
}

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
    const decoded = jwt.verify(token, jwtSecret) as { id: string; role: UserRole };
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
