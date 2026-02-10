import "dotenv/config";
import bcrypt from "bcrypt";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import {
  Prisma,
  PrismaClient,
  KycStatus,
  UserRole,
  PropertyStatus,
  ListingStatus,
  SellOrderStatus,
  BuyOrderStatus,
  RentalApplicationStatus,
  PropertyType,
  SourceType,
} from "@prisma/client";
import { z } from "zod";
import importRoutes from "./import/import.routes.js";
import { requireAuth, requireKycApproved } from "./middleware/auth.js";
import { seedMLSListings } from "./import/import.seed.js";
import { sendVerificationEmail } from "./email.js";
import { runTargetingForSellOrder } from "./targeting/runTargeting.js";
import { getTargetingConfig } from "./targeting/scoreBuyersForSellOrder.js";
import { updateReferencePrice } from "./pricing/referencePrice.js";
import { updateLiquidityScore } from "./pricing/liquidityScore.js";
import { computeOptimizedPrice } from "./pricing/optimizeSellOrder.js";
import { getMarketRuleConfig } from "./pricing/marketRules.js";
import { buildMatchPreview } from "./market/matchOrders.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
      };
    }
  }
}

const app = express();
const port = Number(process.env.PORT) || 4000;
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "postgres://app:app@localhost:5433/fractional";
}

const prisma = new PrismaClient();
const jwtSecret = process.env.JWT_SECRET || "dev-secret";

const corsOrigins = (process.env.CORS_ORIGINS ||
  "https://app.bricklyusa.com,http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("CORS: origin not allowed"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.options("*", cors());
app.use(express.json());
app.use("/import", importRoutes);

app.post(
  "/admin/targeting/run",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req, res) => {
    const sellOrderId = typeof req.query.sellOrderId === "string" ? req.query.sellOrderId : "";
    if (!sellOrderId) {
      return sendError(res, 400, "VALIDATION_ERROR", "Missing sellOrderId");
    }
    try {
      const result = await runTargetingForSellOrder(prisma, sellOrderId);
      return res.json(result);
    } catch (error: any) {
      if (error?.message === "SELL_ORDER_NOT_FOUND") {
        return sendError(res, 404, "NOT_FOUND", "Sell order not found");
      }
      return sendError(res, 500, "INTERNAL_ERROR", "Failed to run targeting");
    }
  }
);

app.get(
  "/admin/targeting/config",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (_req, res) => {
    try {
      const config = await getTargetingConfig(prisma);
      return res.json(config);
    } catch (error) {
      console.error("Targeting config load failed:", error);
      return sendError(res, 500, "INTERNAL_ERROR", "Failed to load config");
    }
  }
);

app.put(
  "/admin/targeting/config",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req, res) => {
    const parsed = targetingConfigSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || "Invalid request";
      return sendError(res, 400, "VALIDATION_ERROR", message);
    }

    try {
      const config = await prisma.targetingRuleConfig.upsert({
        where: { name: "default" },
        update: parsed.data,
        create: {
          name: "default",
          ...parsed.data,
        },
      });
      return res.json({
        ownsPropertyWeight: config.ownsPropertyWeight,
        viewScorePerCount: config.viewScorePerCount,
        maxViewScore: config.maxViewScore,
        similarHoldingsWeight: config.similarHoldingsWeight,
        recentBuyerWeight: config.recentBuyerWeight,
        minScoreToTarget: config.minScoreToTarget,
        maxBuyersPerOrder: config.maxBuyersPerOrder,
        cooldownHours: config.cooldownHours,
      });
    } catch (error) {
      console.error("Targeting config update failed:", error);
      return sendError(res, 500, "INTERNAL_ERROR", "Failed to update config");
    }
  }
);

app.get(
  "/admin/market-rules",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (_req, res) => {
    try {
      const config = await getMarketRuleConfig(prisma);
      return res.json(config);
    } catch (error) {
      console.error("Market rules load failed:", error);
      return sendError(res, 500, "INTERNAL_ERROR", "Failed to load rules");
    }
  }
);

app.put(
  "/admin/market-rules",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req, res) => {
    const parsed = marketRulesSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || "Invalid request";
      return sendError(res, 400, "VALIDATION_ERROR", message);
    }

    try {
      const {
        referenceWeightPrimary,
        referenceWeightSecondary,
        referenceWeightNav,
        liquidityTradeWeight,
        liquidityTimeWeight,
        liquidityDeviationWeight,
        liquidityGoodThreshold,
        liquidityMidThreshold,
      } = parsed.data;

      const referenceSum =
        referenceWeightPrimary + referenceWeightSecondary + referenceWeightNav;
      if (Math.abs(referenceSum - 1) > 0.001) {
        return sendError(
          res,
          400,
          "VALIDATION_ERROR",
          "Reference weights must sum to 1.0"
        );
      }

      if (liquidityGoodThreshold <= liquidityMidThreshold) {
        return sendError(
          res,
          400,
          "VALIDATION_ERROR",
          "Good threshold must be greater than mid threshold"
        );
      }

      const liquidityWeightSum =
        liquidityTradeWeight + liquidityTimeWeight + liquidityDeviationWeight;
      if (liquidityWeightSum !== 100) {
        return sendError(
          res,
          400,
          "VALIDATION_ERROR",
          "Liquidity weights must sum to 100"
        );
      }

      const config = await prisma.marketRuleConfig.upsert({
        where: { name: "default" },
        update: parsed.data,
        create: {
          name: "default",
          ...parsed.data,
        },
      });
      return res.json({
        liquidityGoodThreshold: config.liquidityGoodThreshold,
        liquidityMidThreshold: config.liquidityMidThreshold,
        liquidityLookbackDays: config.liquidityLookbackDays,
        liquidityTradeWeight: config.liquidityTradeWeight,
        liquidityTimeWeight: config.liquidityTimeWeight,
        liquidityDeviationWeight: config.liquidityDeviationWeight,
        liquidityTradeCountCap: config.liquidityTradeCountCap,
        liquidityTimeToFillMaxHours: config.liquidityTimeToFillMaxHours,
        referenceWeightPrimary: Number(config.referenceWeightPrimary),
        referenceWeightSecondary: Number(config.referenceWeightSecondary),
        referenceWeightNav: Number(config.referenceWeightNav),
        strategyMultiplierFastExit: Number(config.strategyMultiplierFastExit),
        strategyMultiplierBalanced: Number(config.strategyMultiplierBalanced),
        strategyMultiplierMaxPrice: Number(config.strategyMultiplierMaxPrice),
        maxPriceCapMultiplier: Number(config.maxPriceCapMultiplier),
      });
    } catch (error) {
      console.error("Market rules update failed:", error);
      return sendError(res, 500, "INTERNAL_ERROR", "Failed to update rules");
    }
  }
);

app.get(
  "/admin/listers/listings",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (_req, res) => {
    try {
      const listers = await prisma.user.findMany({
        where: { role: UserRole.LISTER },
        select: {
          id: true,
          email: true,
          phone: true,
          listings: {
            include: { property: true },
            orderBy: { postedAt: "desc" },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      const response = listers.map((lister) => ({
        id: lister.id,
        email: lister.email,
        phone: lister.phone,
        listingCount: lister.listings.length,
        listings: lister.listings.map((listing) => ({
          id: listing.id,
          status: listing.status,
          askingPrice: Number(listing.askingPrice),
          bonusPercent: Number(listing.bonusPercent),
          postedAt: listing.postedAt,
          property: {
            id: listing.property.id,
            address1: listing.property.address1,
            city: listing.property.city,
            state: listing.property.state,
            zip: listing.property.zip,
          },
        })),
      }));

      return res.json(response);
    } catch (error) {
      console.error("Lister listings load failed:", error);
      return sendError(res, 500, "INTERNAL_ERROR", "Failed to load listers");
    }
  }
);

app.post(
  "/admin/listers/reassign",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req, res) => {
    const parsed = reassignListingsSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || "Invalid request";
      return sendError(res, 400, "VALIDATION_ERROR", message);
    }

    const { listingIds, targetListerId } = parsed.data;

    const target = await prisma.user.findUnique({
      where: { id: targetListerId },
      select: { id: true, role: true },
    });
    if (!target || target.role !== UserRole.LISTER) {
      return sendError(res, 400, "VALIDATION_ERROR", "Target is not a lister");
    }

    const updated = await prisma.listing.updateMany({
      where: { id: { in: listingIds } },
      data: { listerUserId: targetListerId },
    });

    return res.json({ updated: updated.count });
  }
);

app.get(
  "/admin/users",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const roleParam =
      typeof req.query.role === "string" ? req.query.role.trim() : "";
    const roleFilter = Object.values(UserRole).includes(roleParam as UserRole)
      ? (roleParam as UserRole)
      : null;

    const where: Prisma.UserWhereInput = {
      ...(roleFilter ? { role: roleFilter } : {}),
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q } },
            ],
          }
        : {}),
    };

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        _count: {
          select: {
            listings: true,
            holdings: true,
            sellOrders: true,
            buyOrders: true,
          },
        },
      },
    });

    return res.json(
      users.map((user) => ({
        ...user,
        counts: user._count,
      }))
    );
  }
);

app.get(
  "/admin/users/:id",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        listings: {
          include: { property: true },
        },
        holdings: {
          include: {
            shareClass: {
              include: { property: true },
            },
          },
        },
        sellOrders: {
          include: { property: true },
          orderBy: { createdAt: "desc" },
        },
        buyOrders: {
          include: { property: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) {
      return sendError(res, 404, "NOT_FOUND", "User not found");
    }

    return res.json(user);
  }
);

app.patch(
  "/admin/users/:id",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req, res) => {
    const parsed = adminUserUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || "Invalid request";
      return sendError(res, 400, "VALIDATION_ERROR", message);
    }

    try {
      const updated = await prisma.user.update({
        where: { id: req.params.id },
        data: parsed.data,
        select: {
          id: true,
          email: true,
          phone: true,
          role: true,
          emailVerified: true,
        },
      });
      return res.json(updated);
    } catch (error: any) {
      if (error?.code === "P2025") {
        return sendError(res, 404, "NOT_FOUND", "User not found");
      }
      return sendError(res, 500, "INTERNAL_ERROR", "Failed to update user");
    }
  }
);

app.post(
  "/admin/users/:id/reset-password",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req, res) => {
    const parsed = adminPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || "Invalid request";
      return sendError(res, 400, "VALIDATION_ERROR", message);
    }

    const hash = await bcrypt.hash(parsed.data.tempPassword, 10);
    try {
      await prisma.user.update({
        where: { id: req.params.id },
        data: { passwordHash: hash },
        select: { id: true },
      });
      return res.json({ ok: true, tempPassword: parsed.data.tempPassword });
    } catch (error: any) {
      if (error?.code === "P2025") {
        return sendError(res, 404, "NOT_FOUND", "User not found");
      }
      return sendError(res, 500, "INTERNAL_ERROR", "Failed to reset password");
    }
  }
);

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole),
});

const loginSchema = z.object({
  emailOrPhone: z.string().min(3),
  password: z.string().min(8),
});

const adminUserUpdateSchema = z
  .object({
    role: z.nativeEnum(UserRole).optional(),
    emailVerified: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be updated",
  });

const adminPasswordSchema = z.object({
  tempPassword: z.string().min(6),
});

const targetingConfigSchema = z.object({
  ownsPropertyWeight: z.number().int().nonnegative(),
  viewScorePerCount: z.number().int().nonnegative(),
  maxViewScore: z.number().int().nonnegative(),
  similarHoldingsWeight: z.number().int().nonnegative(),
  recentBuyerWeight: z.number().int().nonnegative(),
  minScoreToTarget: z.number().int().nonnegative(),
  maxBuyersPerOrder: z.number().int().positive(),
  cooldownHours: z.number().int().nonnegative(),
});

const marketRulesSchema = z.object({
  liquidityGoodThreshold: z.number().int().min(0).max(100),
  liquidityMidThreshold: z.number().int().min(0).max(100),
  liquidityLookbackDays: z.number().int().positive(),
  liquidityTradeWeight: z.number().int().nonnegative(),
  liquidityTimeWeight: z.number().int().nonnegative(),
  liquidityDeviationWeight: z.number().int().nonnegative(),
  liquidityTradeCountCap: z.number().int().positive(),
  liquidityTimeToFillMaxHours: z.number().int().positive(),
  referenceWeightPrimary: z.number().nonnegative(),
  referenceWeightSecondary: z.number().nonnegative(),
  referenceWeightNav: z.number().nonnegative(),
  strategyMultiplierFastExit: z.number().positive(),
  strategyMultiplierBalanced: z.number().positive(),
  strategyMultiplierMaxPrice: z.number().positive(),
  maxPriceCapMultiplier: z.number().positive(),
});

const propertyInputSchema = z.object({
  type: z.nativeEnum(PropertyType).optional(),
  address1: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  zip: z.string().min(1),
  squareFeet: z.number().int().positive().optional(),
  bedrooms: z.number().int().positive().optional(),
  bathrooms: z.number().int().positive().optional(),
  targetRaise: z.number().positive().optional(),
  estMonthlyRent: z.number().positive().optional(),
});

const listingInputSchema = z.object({
  askingPrice: z.number().positive(),
  bonusPercent: z.number().nonnegative(),
});

const shareClassInputSchema = z.object({
  totalShares: z.number().int().positive(),
  referencePricePerShare: z.number().positive(),
});

const createListingSchema = z.object({
  property: propertyInputSchema,
  listing: listingInputSchema,
  shareClass: shareClassInputSchema,
  images: z.array(z.string().url()).default([]),
});

const investBuySchema = z.object({
  propertyId: z.string().uuid(),
  sharesToBuy: z.number().int().positive(),
});

const sellOrderSchema = z.object({
  propertyId: z.string().uuid(),
  sharesForSale: z.number().int().positive(),
  askPricePerShare: z.number().positive(),
  strategy: z.enum(["MAX_PRICE", "BALANCED", "FAST_EXIT"]).optional(),
});

const marketBuySchema = z.object({
  sellOrderId: z.string().uuid(),
  sharesToBuy: z.number().int().positive(),
});

const buyOrderSchema = z
  .object({
    propertyId: z.string().uuid(),
    orderType: z.enum(["MARKET", "LIMIT"]),
    sharesRequested: z.number().int().positive(),
    maxPricePerShare: z.number().positive().optional(),
  })
  .refine(
    (data) =>
      data.orderType === "MARKET" ? true : typeof data.maxPricePerShare === "number",
    {
      message: "maxPricePerShare is required for LIMIT orders",
      path: ["maxPricePerShare"],
    }
  );

const rentalApplySchema = z.object({
  propertyId: z.string().uuid(),
});

const kycSubmitSchema = z.object({
  data: z.record(z.unknown()).default({}),
});

const kycDecisionSchema = z.object({
  userId: z.string().uuid(),
});

const reassignListingsSchema = z.object({
  listingIds: z.array(z.string().uuid()).min(1),
  targetListerId: z.string().uuid(),
});

const rentListSchema = z.object({
  propertyId: z.string().uuid(),
});

const rentalDecisionSchema = z.object({
  applicationId: z.string().uuid(),
  rentAmount: z.number().positive().optional(),
});

const listingUpdateSchema = z.object({
  property: z
    .object({
      type: z.nativeEnum(PropertyType).optional(),
      address1: z.string().min(1).optional(),
      city: z.string().min(1).optional(),
      state: z.string().min(1).optional(),
      zip: z.string().min(1).optional(),
      squareFeet: z.number().int().positive().optional(),
      bedrooms: z.number().int().positive().optional(),
      bathrooms: z.number().int().positive().optional(),
      targetRaise: z.number().positive().optional(),
      estMonthlyRent: z.number().positive().optional(),
    })
    .optional(),
  listing: z
    .object({
      askingPrice: z.number().positive().optional(),
      bonusPercent: z.number().nonnegative().optional(),
    })
    .optional(),
});

function sendError(
  res: express.Response,
  status: number,
  code: string,
  message: string
) {
  return res.status(status).json({ error: { code, message } });
}

function signToken(payload: { id: string; role: UserRole }) {
  return jwt.sign(payload, jwtSecret, { expiresIn: "7d" });
}

function requireRole(roles: UserRole[]) {
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

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ ok: true, db: true });
  } catch (error) {
    sendError(res, 500, "INTERNAL_ERROR", "Database unavailable");
  }
});

app.post("/auth/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message || "Invalid request";
    return sendError(res, 400, "VALIDATION_ERROR", message);
  }

  const { email, password, role } = parsed.data;
  const disableEmailVerification =
    process.env.DISABLE_EMAIL_VERIFICATION === "true";
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        emailVerified: disableEmailVerification ? true : false,
        kycProfile: {
          create: {
            status: KycStatus.PENDING,
            data: {} as Prisma.InputJsonValue,
            submittedAt: new Date(),
          },
        },
      },
      select: { id: true, role: true, email: true },
    });

    if (disableEmailVerification) {
      return res.status(201).json({
        message: "Registration successful.",
      });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
    await prisma.verificationToken.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      },
    });

    const webBase = process.env.WEB_BASE_URL || "http://localhost:3000";
    const verifyUrl = `${webBase}/verify?token=${token}`;
    try {
      await sendVerificationEmail(user.email!, verifyUrl);
      return res
        .status(201)
        .json({ message: "Registration successful. Verify your email." });
    } catch (error: any) {
      console.error("Email send failed:", error);
      const allowDevBypass = process.env.ALLOW_EMAIL_BYPASS === "true";
      if (allowDevBypass) {
        return res.status(201).json({
          message:
            "Email service unavailable. Use the verification link to continue.",
          verifyUrl,
        });
      }
      return sendError(
        res,
        500,
        "EMAIL_SEND_FAILED",
        error?.message || "Failed to send verification email"
      );
    }
  } catch (error: any) {
    console.error("Register error:", error);
    if (error?.code === "P2002") {
      return sendError(res, 400, "CONFLICT", "Email already in use");
    }
    return sendError(res, 500, "INTERNAL_ERROR", "Failed to register user");
  }
});

app.post("/auth/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message || "Invalid request";
    return sendError(res, 400, "VALIDATION_ERROR", message);
  }

  const { emailOrPhone, password } = parsed.data;
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    },
    select: { id: true, role: true, passwordHash: true, email: true, emailVerified: true },
  });

  if (!user) {
    return sendError(res, 401, "INVALID_CREDENTIALS", "Invalid credentials");
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return sendError(res, 401, "INVALID_CREDENTIALS", "Invalid credentials");
  }

  const disableEmailVerification =
    process.env.DISABLE_EMAIL_VERIFICATION === "true";
  if (!disableEmailVerification && user.email && !user.emailVerified) {
    return sendError(
      res,
      403,
      "EMAIL_NOT_VERIFIED",
      "Please verify your email to continue"
    );
  }

  const token = signToken({ id: user.id, role: user.role });
  return res.json({ token });
});

app.get("/auth/verify", async (req, res) => {
  const token = typeof req.query.token === "string" ? req.query.token : "";
  if (!token) {
    return sendError(res, 400, "VALIDATION_ERROR", "Missing token");
  }

  const record = await prisma.verificationToken.findUnique({
    where: { token },
  });
  if (!record || record.expiresAt < new Date()) {
    return sendError(res, 400, "INVALID_TOKEN", "Invalid or expired token");
  }

  await prisma.user.update({
    where: { id: record.userId },
    data: { emailVerified: true },
  });
  await prisma.verificationToken.delete({ where: { token } });

  return res.json({ ok: true });
});

app.get("/properties", async (_req, res) => {
  const properties = await prisma.property.findMany({
    include: {
      listings: {
        include: {
          lister: {
            select: { id: true, email: true, phone: true, role: true },
          },
        },
      },
      images: true,
      shareClass: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return res.json(properties);
});

app.get("/properties/:id", async (req, res) => {
  const property = await prisma.property.findUnique({
    where: { id: req.params.id },
    include: {
      listings: {
        include: {
          lister: {
            select: { id: true, email: true, phone: true, role: true },
          },
        },
      },
      images: true,
      shareClass: true,
    },
  });
  if (!property) {
    return sendError(res, 404, "NOT_FOUND", "Property not found");
  }
  return res.json(property);
});

app.post(
  "/listings",
  requireAuth,
  requireRole([UserRole.ADMIN, UserRole.LISTER]),
  requireKycApproved,
  async (req, res) => {
    const parsed = createListingSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || "Invalid request";
      return sendError(res, 400, "VALIDATION_ERROR", message);
    }

    const { property, listing, shareClass, images } = parsed.data;

    try {
      const created = await prisma.$transaction(async (tx) => {
        const newProperty = await tx.property.create({
          data: {
            type: property.type ?? PropertyType.HOUSE,
            address1: property.address1,
            city: property.city,
            state: property.state,
            zip: property.zip,
            status: PropertyStatus.LISTED,
            squareFeet: property.squareFeet,
            bedrooms: property.bedrooms,
            bathrooms: property.bathrooms,
            targetRaise: property.targetRaise,
            estMonthlyRent: property.estMonthlyRent,
          },
        });

        const newListing = await tx.listing.create({
          data: {
            propertyId: newProperty.id,
            listerUserId: req.user!.id,
            bonusPercent: listing.bonusPercent,
            askingPrice: listing.askingPrice,
            status: ListingStatus.LISTED,
            postedAt: new Date(),
          },
        });

        const newShareClass = await tx.shareClass.create({
          data: {
            propertyId: newProperty.id,
            totalShares: shareClass.totalShares,
            sharesAvailable: shareClass.totalShares,
            referencePricePerShare: shareClass.referencePricePerShare,
            lastReferenceUpdateAt: new Date(),
          },
        });

        const newImages = await tx.propertyImage.createMany({
          data: images.map((url, index) => ({
            propertyId: newProperty.id,
            url,
            sortOrder: index,
          })),
        });

        return {
          property: newProperty,
          listing: newListing,
          shareClass: newShareClass,
          imagesCreated: newImages.count,
        };
      });

      return res.status(201).json(created);
    } catch (error) {
      return sendError(res, 500, "INTERNAL_ERROR", "Failed to create listing");
    }
  }
);

app.get("/listings/mine", requireAuth, requireRole([UserRole.LISTER]), async (req, res) => {
  const listings = await prisma.listing.findMany({
    where: { listerUserId: req.user!.id },
    include: {
      property: {
        include: {
          images: true,
          shareClass: true,
        },
      },
    },
    orderBy: { postedAt: "desc" },
  });
  return res.json(listings);
});

app.put(
  "/listings/:id",
  requireAuth,
  requireRole([UserRole.LISTER]),
  async (req, res) => {
    const parsed = listingUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || "Invalid request";
      return sendError(res, 400, "VALIDATION_ERROR", message);
    }

    const listingId = req.params.id;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const existing = await tx.listing.findFirst({
          where: { id: listingId, listerUserId: req.user!.id },
        });
        if (!existing) {
          throw new Error("NOT_FOUND");
        }

        if (parsed.data.property) {
          await tx.property.update({
            where: { id: existing.propertyId },
            data: parsed.data.property,
          });
        }

        if (parsed.data.listing) {
          await tx.listing.update({
            where: { id: listingId },
            data: parsed.data.listing,
          });
        }

        return tx.listing.findUnique({
          where: { id: listingId },
          include: {
            property: {
              include: {
                images: true,
                shareClass: true,
              },
            },
          },
        });
      });

      return res.json(result);
    } catch (error: any) {
      if (error?.message === "NOT_FOUND") {
        return sendError(res, 404, "NOT_FOUND", "Listing not found");
      }
      return sendError(res, 500, "INTERNAL_ERROR", "Failed to update listing");
    }
  }
);

app.post(
  "/invest/buy",
  requireAuth,
  requireRole([UserRole.INVESTOR, UserRole.ADMIN, UserRole.LISTER]),
  requireKycApproved,
  async (req, res) => {
  const parsed = investBuySchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message || "Invalid request";
    return sendError(res, 400, "VALIDATION_ERROR", message);
  }

  const { propertyId, sharesToBuy } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const shareClass = await tx.shareClass.findUnique({
        where: { propertyId },
      });
      if (!shareClass) {
        throw new Error("NOT_FOUND");
      }
      const updated = await tx.shareClass.updateMany({
        where: { id: shareClass.id, sharesAvailable: { gte: sharesToBuy } },
        data: { sharesAvailable: { decrement: sharesToBuy } },
      });
      if (updated.count === 0) {
        throw new Error("INSUFFICIENT_SHARES");
      }

      const holding = await tx.holding.upsert({
        where: {
          userId_shareClassId: {
            userId: req.user!.id,
            shareClassId: shareClass.id,
          },
        },
        update: { sharesOwned: { increment: sharesToBuy } },
        create: {
          userId: req.user!.id,
          shareClassId: shareClass.id,
          sharesOwned: sharesToBuy,
        },
      });

      return holding;
    });

    void runTargetingForSellOrder(prisma, result.id).catch((error) => {
      console.error("Targeting run failed:", error);
    });

    return res.status(201).json(result);
  } catch (error: any) {
    if (error?.message === "NOT_FOUND") {
      return sendError(res, 404, "NOT_FOUND", "Property not found");
    }
    if (error?.message === "INSUFFICIENT_SHARES") {
      return sendError(res, 400, "INSUFFICIENT_SHARES", "Not enough shares available");
    }
    return sendError(res, 500, "INTERNAL_ERROR", "Failed to purchase shares");
  }
  }
);

app.get("/portfolio", requireAuth, async (req, res) => {
  const holdings = await prisma.holding.findMany({
    where: { userId: req.user!.id },
    include: {
      shareClass: {
        include: {
          property: true,
        },
      },
    },
  });

  const propertyIds = holdings.map((holding) => holding.shareClass.propertyId);
  const trades = await prisma.trade.findMany({
    where: {
      buyerUserId: req.user!.id,
      propertyId: { in: propertyIds },
    },
    select: { propertyId: true, sharesTraded: true, pricePerShare: true },
  });

  const listings = await prisma.listing.findMany({
    where: { propertyId: { in: propertyIds }, status: ListingStatus.LISTED },
    orderBy: { postedAt: "desc" },
    select: { propertyId: true, askingPrice: true },
  });
  const listingMap = new Map<string, number>();
  for (const listing of listings) {
    if (!listingMap.has(listing.propertyId)) {
      listingMap.set(listing.propertyId, Number(listing.askingPrice));
    }
  }

  const tradeMap = new Map<
    string,
    { totalShares: number; totalCost: number }
  >();
  for (const trade of trades) {
    const entry =
      tradeMap.get(trade.propertyId) ?? { totalShares: 0, totalCost: 0 };
    entry.totalShares += trade.sharesTraded;
    entry.totalCost += Number(trade.pricePerShare) * trade.sharesTraded;
    tradeMap.set(trade.propertyId, entry);
  }

  const response = holdings.map((holding) => {
    const totalShares = holding.shareClass.totalShares;
    const percent = totalShares > 0 ? holding.sharesOwned / totalShares : 0;
    const tradeStats = tradeMap.get(holding.shareClass.propertyId);
    const avgBuyPrice =
      tradeStats && tradeStats.totalShares > 0
        ? tradeStats.totalCost / tradeStats.totalShares
        : null;
    const listingPrice = listingMap.get(holding.shareClass.propertyId) ?? null;
    const fallbackPrice =
      avgBuyPrice ??
      (holding.shareClass.referencePricePerShare
        ? Number(holding.shareClass.referencePricePerShare)
        : listingPrice && totalShares > 0
        ? listingPrice / totalShares
        : null);
    return {
      id: holding.id,
      sharesOwned: holding.sharesOwned,
      updatedAt: holding.updatedAt,
      percent,
      avgBuyPricePerShare: fallbackPrice,
      property: holding.shareClass.property,
      shareClass: {
        id: holding.shareClass.id,
        totalShares,
        sharesAvailable: holding.shareClass.sharesAvailable,
        referencePricePerShare: holding.shareClass.referencePricePerShare,
      },
    };
  });

  return res.json(response);
});

app.post("/market/sell-orders", requireAuth, requireKycApproved, async (req, res) => {
  const parsed = sellOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message || "Invalid request";
    return sendError(res, 400, "VALIDATION_ERROR", message);
  }

  const { propertyId, sharesForSale, askPricePerShare, strategy } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const shareClass = await tx.shareClass.findUnique({
        where: { propertyId },
      });
      if (!shareClass) {
        throw new Error("NOT_FOUND");
      }

      const holding = await tx.holding.findUnique({
        where: {
          userId_shareClassId: {
            userId: req.user!.id,
            shareClassId: shareClass.id,
          },
        },
      });

      if (!holding || holding.sharesOwned < sharesForSale) {
        throw new Error("INSUFFICIENT_SHARES");
      }

      const property = await tx.property.findUnique({
        where: { id: propertyId },
        select: { liquidityScore: true },
      });

      return tx.sellOrder.create({
        data: {
          userId: req.user!.id,
          propertyId,
          sharesForSale,
          remainingShares: sharesForSale,
          askPricePerShare,
          liquidityScoreAtCreation: property?.liquidityScore ?? null,
          strategy: strategy ?? undefined,
          status: SellOrderStatus.OPEN,
        },
      });
    });

    return res.status(201).json(result);
  } catch (error: any) {
    if (error?.message === "NOT_FOUND") {
      return sendError(res, 404, "NOT_FOUND", "Property not found");
    }
    if (error?.message === "INSUFFICIENT_SHARES") {
      return sendError(res, 400, "INSUFFICIENT_SHARES", "Not enough shares owned");
    }
    return sendError(res, 500, "INTERNAL_ERROR", "Failed to create sell order");
  }
});

app.get("/market/sell-orders", async (_req, res) => {
  const orders = await prisma.sellOrder.findMany({
    where: {
      status: { in: [SellOrderStatus.OPEN, SellOrderStatus.PARTIAL] },
      remainingShares: { gt: 0 },
    },
    include: {
      property: true,
      user: {
        select: { id: true, email: true, phone: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return res.json(
    orders.map((order) => ({
      ...order,
      sharesForSale: order.remainingShares,
    }))
  );
});

app.post("/market/buy-orders", requireAuth, requireKycApproved, async (req, res) => {
  const parsed = buyOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message || "Invalid request";
    return sendError(res, 400, "VALIDATION_ERROR", message);
  }

  const { propertyId, orderType, sharesRequested, maxPricePerShare } =
    parsed.data;

  try {
    const order = await prisma.buyOrder.create({
      data: {
        buyerUserId: req.user!.id,
        propertyId,
        orderType,
        sharesRequested,
        maxPricePerShare: orderType === "LIMIT" ? maxPricePerShare : null,
        status: BuyOrderStatus.OPEN,
      },
    });
    return res.status(201).json(order);
  } catch (error: any) {
    if (error?.code === "P2003") {
      return sendError(res, 404, "NOT_FOUND", "Property not found");
    }
    return sendError(res, 500, "INTERNAL_ERROR", "Failed to create buy order");
  }
});

app.get("/market/buy-orders", requireAuth, async (req, res) => {
  const where =
    req.user!.role === UserRole.ADMIN ? {} : { buyerUserId: req.user!.id };

  const orders = await prisma.buyOrder.findMany({
    where,
    include: {
      property: true,
      buyer: { select: { id: true, email: true, phone: true, role: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return res.json(
    orders.map((order) => ({
      id: order.id,
      orderType: order.orderType,
      sharesRequested: order.sharesRequested,
      filledShares: order.filledShares,
      maxPricePerShare: order.maxPricePerShare
        ? Number(order.maxPricePerShare)
        : null,
      status: order.status,
      createdAt: order.createdAt,
      buyer: order.buyer,
      property: {
        id: order.property.id,
        address1: order.property.address1,
        city: order.property.city,
        state: order.property.state,
      },
    }))
  );
});

app.post(
  "/market/buy-orders/:id/cancel",
  requireAuth,
  async (req, res) => {
    const { id } = req.params;
    if (!id || !/^[0-9a-fA-F-]{36}$/.test(id)) {
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid buy order id");
    }

    const order = await prisma.buyOrder.findUnique({ where: { id } });
    if (!order) {
      return sendError(res, 404, "NOT_FOUND", "Buy order not found");
    }

    if (order.buyerUserId !== req.user!.id && req.user!.role !== UserRole.ADMIN) {
      return sendError(res, 403, "FORBIDDEN", "Not allowed");
    }

    if (order.status === BuyOrderStatus.CANCELLED || order.status === BuyOrderStatus.FILLED) {
      return res.json({ ok: true });
    }

    await prisma.buyOrder.update({
      where: { id },
      data: { status: BuyOrderStatus.CANCELLED },
    });

    return res.json({ ok: true });
  }
);

app.get("/rentals", async (_req, res) => {
  const properties = await prisma.property.findMany({
    where: { status: PropertyStatus.RENT_LISTED },
    include: {
      images: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return res.json(properties);
});

app.post(
  "/rentals/apply",
  requireAuth,
  requireRole([UserRole.TENANT]),
  async (req, res) => {
    const parsed = rentalApplySchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || "Invalid request";
      return sendError(res, 400, "VALIDATION_ERROR", message);
    }

    const { propertyId } = parsed.data;

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { status: true },
    });
    if (!property) {
      return sendError(res, 404, "NOT_FOUND", "Property not found");
    }
    if (property.status !== PropertyStatus.RENT_LISTED) {
      return sendError(
        res,
        400,
        "NOT_RENT_LISTED",
        "Property is not available for rent"
      );
    }

    const existing = await prisma.rentalApplication.findFirst({
      where: {
        propertyId,
        tenantUserId: req.user!.id,
        status: { in: [RentalApplicationStatus.PENDING, RentalApplicationStatus.APPROVED] },
      },
    });
    if (existing) {
      return sendError(res, 400, "ALREADY_APPLIED", "Application already exists");
    }

    const application = await prisma.rentalApplication.create({
      data: {
        propertyId,
        tenantUserId: req.user!.id,
      },
    });

    return res.status(201).json(application);
  }
);

app.get(
  "/admin/rental-applications",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (_req, res) => {
    const applications = await prisma.rentalApplication.findMany({
      where: { status: RentalApplicationStatus.PENDING },
      include: {
        property: true,
        tenant: {
          select: { id: true, email: true, phone: true, role: true, createdAt: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });
    return res.json(applications);
  }
);

app.post(
  "/admin/rental-applications/approve",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req, res) => {
    const parsed = rentalDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || "Invalid request";
      return sendError(res, 400, "VALIDATION_ERROR", message);
    }

    const { applicationId, rentAmount } = parsed.data;
    try {
      const result = await prisma.$transaction(async (tx) => {
        const application = await tx.rentalApplication.findUnique({
          where: { id: applicationId },
          include: { property: true },
        });
        if (!application) {
          throw new Error("NOT_FOUND");
        }
        if (application.status !== RentalApplicationStatus.PENDING) {
          throw new Error("NOT_PENDING");
        }
        if (application.property.status !== PropertyStatus.RENT_LISTED) {
          throw new Error("NOT_RENT_LISTED");
        }

        const updatedApp = await tx.rentalApplication.update({
          where: { id: applicationId },
          data: {
            status: RentalApplicationStatus.APPROVED,
            rentAmount: rentAmount ?? null,
          },
        });

        await tx.property.update({
          where: { id: application.propertyId },
          data: { status: PropertyStatus.RENTED },
        });

        return updatedApp;
      });

      return res.json(result);
    } catch (error: any) {
      if (error?.message === "NOT_FOUND") {
        return sendError(res, 404, "NOT_FOUND", "Application not found");
      }
      if (error?.message === "NOT_PENDING") {
        return sendError(res, 400, "NOT_PENDING", "Application is not pending");
      }
      if (error?.message === "NOT_RENT_LISTED") {
        return sendError(res, 400, "NOT_RENT_LISTED", "Property is not rent listed");
      }
      return sendError(res, 500, "INTERNAL_ERROR", "Failed to approve application");
    }
  }
);

app.post(
  "/admin/rental-applications/reject",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req, res) => {
    const parsed = rentalDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || "Invalid request";
      return sendError(res, 400, "VALIDATION_ERROR", message);
    }

    const { applicationId } = parsed.data;
    try {
      const application = await prisma.rentalApplication.update({
        where: { id: applicationId },
        data: { status: RentalApplicationStatus.REJECTED },
      });
      return res.json(application);
    } catch {
      return sendError(res, 404, "NOT_FOUND", "Application not found");
    }
  }
);

app.post(
  "/market/buy",
  requireAuth,
  requireRole([UserRole.INVESTOR, UserRole.ADMIN, UserRole.LISTER]),
  requireKycApproved,
  async (req, res) => {
  const parsed = marketBuySchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message || "Invalid request";
    return sendError(res, 400, "VALIDATION_ERROR", message);
  }

  const { sellOrderId, sharesToBuy } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const sellOrder = await tx.sellOrder.findUnique({
        where: { id: sellOrderId },
      });
      if (!sellOrder) {
        throw new Error("NOT_FOUND");
      }
      if (sellOrder.status !== SellOrderStatus.OPEN) {
        throw new Error("ORDER_CLOSED");
      }

      const shareClass = await tx.shareClass.findUnique({
        where: { propertyId: sellOrder.propertyId },
      });
      if (!shareClass) {
        throw new Error("PROPERTY_MISSING");
      }

      const sellerHolding = await tx.holding.findUnique({
        where: {
          userId_shareClassId: {
            userId: sellOrder.userId,
            shareClassId: shareClass.id,
          },
        },
      });

      if (!sellerHolding) {
        throw new Error("SELLER_INSUFFICIENT");
      }

      const sellerUpdated = await tx.holding.updateMany({
        where: { id: sellerHolding.id, sharesOwned: { gte: sharesToBuy } },
        data: { sharesOwned: { decrement: sharesToBuy } },
      });
      if (sellerUpdated.count === 0) {
        throw new Error("SELLER_INSUFFICIENT");
      }

      const buyerHolding = await tx.holding.upsert({
        where: {
          userId_shareClassId: {
            userId: req.user!.id,
            shareClassId: shareClass.id,
          },
        },
        update: { sharesOwned: { increment: sharesToBuy } },
        create: {
          userId: req.user!.id,
          shareClassId: shareClass.id,
          sharesOwned: sharesToBuy,
        },
      });

      const orderUpdated = await tx.sellOrder.updateMany({
        where: {
          id: sellOrder.id,
          status: SellOrderStatus.OPEN,
          remainingShares: { gte: sharesToBuy },
        },
        data: {
          remainingShares: { decrement: sharesToBuy },
        },
      });
      if (orderUpdated.count === 0) {
        throw new Error("INSUFFICIENT_ORDER_SHARES");
      }

      const updatedOrder = await tx.sellOrder.findUnique({
        where: { id: sellOrder.id },
      });
      if (!updatedOrder) {
        throw new Error("NOT_FOUND");
      }

      const status =
        updatedOrder.remainingShares === 0
          ? SellOrderStatus.FILLED
          : SellOrderStatus.OPEN;
      if (updatedOrder.status !== status) {
        await tx.sellOrder.update({
          where: { id: updatedOrder.id },
          data: { status },
        });
      }

      const trade = await tx.trade.create({
        data: {
          sellOrderId: sellOrder.id,
          propertyId: sellOrder.propertyId,
          buyerUserId: req.user!.id,
          sellerUserId: sellOrder.userId,
          sharesTraded: sharesToBuy,
          pricePerShare: sellOrder.askPricePerShare,
        },
      });

      await tx.property.update({
        where: { id: sellOrder.propertyId },
        data: { lastTradeAt: new Date() },
      });

      return { trade, order: { ...updatedOrder, status }, holding: buyerHolding };
    });

    return res.status(201).json(result);
  } catch (error: any) {
    if (error?.message === "NOT_FOUND") {
      return sendError(res, 404, "NOT_FOUND", "Sell order not found");
    }
    if (error?.message === "PROPERTY_MISSING") {
      return sendError(res, 404, "NOT_FOUND", "Property not found");
    }
    if (error?.message === "ORDER_CLOSED") {
      return sendError(res, 400, "ORDER_CLOSED", "Sell order is not open");
    }
    if (error?.message === "INSUFFICIENT_ORDER_SHARES") {
      return sendError(
        res,
        400,
        "INSUFFICIENT_ORDER_SHARES",
        "Not enough shares in sell order"
      );
    }
    if (error?.message === "SELLER_INSUFFICIENT") {
      return sendError(res, 400, "SELLER_INSUFFICIENT", "Seller has insufficient shares");
    }
    return sendError(res, 500, "INTERNAL_ERROR", "Failed to buy shares");
  }
  }
);

app.get("/kyc/me", requireAuth, async (req, res) => {
  const profile = await prisma.kycProfile.findUnique({
    where: { userId: req.user!.id },
  });
  if (!profile) {
    return sendError(res, 404, "NOT_FOUND", "KYC profile not found");
  }
  return res.json(profile);
});

app.post("/kyc/submit", requireAuth, async (req, res) => {
  const parsed = kycSubmitSchema.safeParse(req.body);
  if (!parsed.success) {
    const message = parsed.error.errors[0]?.message || "Invalid request";
    return sendError(res, 400, "VALIDATION_ERROR", message);
  }

  const data = parsed.data.data as Prisma.InputJsonValue;
  const profile = await prisma.kycProfile.upsert({
    where: { userId: req.user!.id },
    update: {
      status: KycStatus.PENDING,
      data,
      submittedAt: new Date(),
    },
    create: {
      userId: req.user!.id,
      status: KycStatus.PENDING,
      data,
      submittedAt: new Date(),
    },
  });

  return res.json(profile);
});

app.get("/notifications", requireAuth, async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      type: true,
      message: true,
      createdAt: true,
      readAt: true,
      sellOrderId: true,
      propertyId: true,
    },
  });
  return res.json(notifications);
});

app.post("/notifications/:id/read", requireAuth, async (req, res) => {
  const { id } = req.params;
  if (!id) {
    return sendError(res, 400, "VALIDATION_ERROR", "Missing notification id");
  }

  const updated = await prisma.notification.updateMany({
    where: { id, userId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });

  if (updated.count === 0) {
    return sendError(res, 404, "NOT_FOUND", "Notification not found");
  }

  return res.json({ ok: true });
});

app.post("/notifications/read-all", requireAuth, async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, readAt: null },
    data: { readAt: new Date() },
  });
  return res.json({ ok: true });
});

app.get(
  "/admin/liquidity/summary",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (_req, res) => {
    try {
      const properties = await prisma.property.findMany({
        select: { liquidityScore: true },
      });
      const avgLiquidity =
        properties.length > 0
          ? properties.reduce((sum, p) => sum + (p.liquidityScore ?? 0), 0) /
            properties.length
          : 0;

      const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const trades = await prisma.trade.findMany({
        where: { tradedAt: { gte: since } },
        select: { pricePerShare: true, sharesTraded: true },
      });
      const dailyTradeVolume = trades.reduce(
        (sum, t) => sum + Number(t.pricePerShare) * t.sharesTraded,
        0
      );

      const shareClasses = await prisma.shareClass.findMany({
        select: { propertyId: true, referencePricePerShare: true },
      });
      const refMap = new Map(
        shareClasses.map((sc) => [sc.propertyId, Number(sc.referencePricePerShare)])
      );
      const openOrders = await prisma.sellOrder.findMany({
        where: {
          status: { in: [SellOrderStatus.OPEN, SellOrderStatus.PARTIAL] },
          remainingShares: { gt: 0 },
        },
        select: { propertyId: true, askPricePerShare: true },
      });
      const spreads = openOrders
        .map((order) => {
          const ref = refMap.get(order.propertyId);
          if (!ref || ref === 0) return null;
          return (
            Math.abs((Number(order.askPricePerShare) - ref) / ref) * 100
          );
        })
        .filter((value): value is number => value !== null);
      const avgSpread =
        spreads.length > 0
          ? spreads.reduce((sum, v) => sum + v, 0) / spreads.length
          : 0;

      const openSellOrders = openOrders.length;

      const activeBuyOrders = await prisma.buyOrder.count({
        where: { status: { in: [BuyOrderStatus.OPEN, BuyOrderStatus.PARTIAL] } },
      });

      return res.json({
        avgLiquidityScore: Math.round(avgLiquidity),
        dailyTradeVolume,
        avgBidAskSpread: avgSpread,
        openSellOrders,
        activeBuyOrders,
      });
    } catch (error) {
      console.error("Liquidity summary failed:", error);
      return sendError(res, 500, "INTERNAL_ERROR", "Failed to load summary");
    }
  }
);

app.get(
  "/admin/liquidity/trend",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (_req, res) => {
    try {
      const now = new Date();
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6)
      );

      const rows = await prisma.$queryRaw<
        { day: Date; avg_score: number | null }[]
      >`
        SELECT date_trunc('day', t."tradedAt") AS day,
               AVG(p."liquidityScore") AS avg_score
        FROM "Trade" t
        JOIN "Property" p ON p.id = t."propertyId"
        WHERE t."tradedAt" >= ${start}
        GROUP BY day
        ORDER BY day ASC
      `;

      const scoreByDay = new Map(
        rows.map((row) => [
          row.day.toISOString().slice(0, 10),
          row.avg_score ? Math.round(Number(row.avg_score)) : 0,
        ])
      );

      const days: { date: string; score: number }[] = [];
      for (let i = 0; i < 7; i += 1) {
        const day = new Date(start);
        day.setUTCDate(start.getUTCDate() + i);
        const key = day.toISOString().slice(0, 10);
        days.push({ date: key, score: scoreByDay.get(key) ?? 0 });
      }
      return res.json(days);
    } catch (error) {
      console.error("Liquidity trend failed:", error);
      return sendError(res, 500, "INTERNAL_ERROR", "Failed to load trend");
    }
  }
);

app.get(
  "/admin/liquidity/:propertyId",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req, res) => {
    const { propertyId } = req.params;
    if (!propertyId || !/^[0-9a-fA-F-]{36}$/.test(propertyId)) {
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid propertyId");
    }
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      include: { shareClass: true },
    });
    if (!property) {
      return sendError(res, 404, "NOT_FOUND", "Property not found");
    }

    const sellOrders = await prisma.sellOrder.findMany({
      where: {
        propertyId,
        status: SellOrderStatus.OPEN,
        remainingShares: { gt: 0 },
      },
      orderBy: { createdAt: "desc" },
    });

    const trades = await prisma.trade.findMany({
      where: { propertyId },
      orderBy: { tradedAt: "desc" },
      take: 20,
    });

    return res.json({
      property: {
        id: property.id,
        address1: property.address1,
        city: property.city,
        state: property.state,
        zip: property.zip,
        liquidityScore: property.liquidityScore,
        lastTradeAt: property.lastTradeAt,
        referencePricePerShare: property.shareClass
          ? Number(property.shareClass.referencePricePerShare)
          : null,
      },
      sellOrders: sellOrders.map((order) => ({
        id: order.id,
        remainingShares: order.remainingShares,
        askPricePerShare: Number(order.askPricePerShare),
        optimizedPricePerShare: order.optimizedPricePerShare
          ? Number(order.optimizedPricePerShare)
          : null,
        strategy: order.strategy,
        createdAt: order.createdAt,
      })),
      trades: trades.map((trade) => ({
        id: trade.id,
        sharesTraded: trade.sharesTraded,
        pricePerShare: Number(trade.pricePerShare),
        tradedAt: trade.tradedAt,
        buyerUserId: trade.buyerUserId,
        sellerUserId: trade.sellerUserId,
      })),
    });
  }
);

app.post(
  "/admin/liquidity/recompute",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req, res) => {
    const propertyId =
      typeof req.query.propertyId === "string" ? req.query.propertyId : "";
    if (!propertyId) {
      return sendError(res, 400, "VALIDATION_ERROR", "Missing propertyId");
    }

    try {
      const updatedShareClass = await updateReferencePrice(prisma, propertyId);
      const updatedProperty = await updateLiquidityScore(prisma, propertyId);
      const marketRules = await getMarketRuleConfig(prisma);

      const openOrders = await prisma.sellOrder.findMany({
        where: {
          propertyId,
          status: SellOrderStatus.OPEN,
          remainingShares: { gt: 0 },
        },
      });

      const referencePrice = Number(updatedShareClass.referencePricePerShare);
      const liquidityScore = updatedProperty.liquidityScore;

      const updates = await Promise.all(
        openOrders.map((order) =>
          prisma.sellOrder.update({
            where: { id: order.id },
            data: {
              optimizedPricePerShare: computeOptimizedPrice({
                referencePrice,
                liquidityScore,
                strategy: order.strategy,
                config: {
                  strategyMultiplierFastExit: marketRules.strategyMultiplierFastExit,
                  strategyMultiplierBalanced: marketRules.strategyMultiplierBalanced,
                  strategyMultiplierMaxPrice: marketRules.strategyMultiplierMaxPrice,
                  maxPriceCapMultiplier: marketRules.maxPriceCapMultiplier,
                },
              }),
            },
          })
        )
      );

      return res.json({
        ok: true,
        updatedOrders: updates.length,
        referencePrice,
        liquidityScore,
      });
    } catch (error: any) {
      if (error?.message === "SHARE_CLASS_NOT_FOUND") {
        return sendError(res, 404, "NOT_FOUND", "Share class not found");
      }
      return sendError(res, 500, "INTERNAL_ERROR", "Failed to recompute metrics");
    }
  }
);

app.post(
  "/admin/liquidity/recompute-all",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (_req, res) => {
    try {
      const properties = await prisma.sellOrder.findMany({
        where: {
          status: { in: [SellOrderStatus.OPEN, SellOrderStatus.PARTIAL] },
          remainingShares: { gt: 0 },
        },
        select: { propertyId: true },
        distinct: ["propertyId"],
      });

      const marketRules = await getMarketRuleConfig(prisma);
      let updatedCount = 0;

      for (const entry of properties) {
        const propertyId = entry.propertyId;
        const updatedShareClass = await updateReferencePrice(prisma, propertyId);
        const updatedProperty = await updateLiquidityScore(prisma, propertyId);

        const openOrders = await prisma.sellOrder.findMany({
          where: {
            propertyId,
            status: SellOrderStatus.OPEN,
            remainingShares: { gt: 0 },
          },
        });

        const referencePrice = Number(updatedShareClass.referencePricePerShare);
        const liquidityScore = updatedProperty.liquidityScore;

        await Promise.all(
          openOrders.map((order) =>
            prisma.sellOrder.update({
              where: { id: order.id },
              data: {
                optimizedPricePerShare: computeOptimizedPrice({
                  referencePrice,
                  liquidityScore,
                  strategy: order.strategy,
                  config: {
                    strategyMultiplierFastExit:
                      marketRules.strategyMultiplierFastExit,
                    strategyMultiplierBalanced:
                      marketRules.strategyMultiplierBalanced,
                    strategyMultiplierMaxPrice:
                      marketRules.strategyMultiplierMaxPrice,
                    maxPriceCapMultiplier: marketRules.maxPriceCapMultiplier,
                  },
                }),
              },
            })
          )
        );

        updatedCount += 1;
      }

      return res.json({ ok: true, updatedProperties: updatedCount });
    } catch (error) {
      console.error("Bulk recompute failed:", error);
      return sendError(res, 500, "INTERNAL_ERROR", "Failed to recompute");
    }
  }
);

app.get(
  "/admin/match/preview",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req, res) => {
    const propertyId =
      typeof req.query.propertyId === "string" ? req.query.propertyId : "";
    if (!propertyId || !/^[0-9a-fA-F-]{36}$/.test(propertyId)) {
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid propertyId");
    }

    try {
      const preview = await buildMatchPreview(prisma, propertyId);
      return res.json(preview);
    } catch (error) {
      console.error("Match preview failed:", error);
      return sendError(res, 500, "INTERNAL_ERROR", "Failed to build preview");
    }
  }
);

app.post(
  "/admin/match/run",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req, res) => {
    const propertyId =
      typeof req.query.propertyId === "string" ? req.query.propertyId : "";
    if (!propertyId || !/^[0-9a-fA-F-]{36}$/.test(propertyId)) {
      return sendError(res, 400, "VALIDATION_ERROR", "Invalid propertyId");
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const preview = await buildMatchPreview(tx, propertyId);
        if (preview.matches.length === 0) {
          return { tradesCreated: 0 };
        }

        let tradesCreated = 0;
        for (const match of preview.matches) {
          const sellOrder = await tx.sellOrder.findUnique({
            where: { id: match.sellOrderId },
          });
          if (!sellOrder || sellOrder.remainingShares < match.shares) {
            throw new Error("SELL_ORDER_UNAVAILABLE");
          }

          const buyOrder = await tx.buyOrder.findUnique({
            where: { id: match.buyOrderId },
          });
          if (!buyOrder) {
            throw new Error("BUY_ORDER_MISSING");
          }

          const shareClass = await tx.shareClass.findUnique({
            where: { propertyId: sellOrder.propertyId },
          });
          if (!shareClass) {
            throw new Error("PROPERTY_MISSING");
          }

          const sellerUpdated = await tx.holding.updateMany({
            where: {
              userId: sellOrder.userId,
              shareClassId: shareClass.id,
              sharesOwned: { gte: match.shares },
            },
            data: { sharesOwned: { decrement: match.shares } },
          });
          if (sellerUpdated.count === 0) {
            throw new Error("SELLER_INSUFFICIENT");
          }

          await tx.holding.upsert({
            where: {
              userId_shareClassId: {
                userId: buyOrder.buyerUserId,
                shareClassId: shareClass.id,
              },
            },
            update: { sharesOwned: { increment: match.shares } },
            create: {
              userId: buyOrder.buyerUserId,
              shareClassId: shareClass.id,
              sharesOwned: match.shares,
            },
          });

          const sellUpdate = await tx.sellOrder.updateMany({
            where: {
              id: sellOrder.id,
              remainingShares: { gte: match.shares },
            },
            data: { remainingShares: { decrement: match.shares } },
          });
          if (sellUpdate.count === 0) {
            throw new Error("SELL_ORDER_UNAVAILABLE");
          }

          const updatedSell = await tx.sellOrder.findUnique({
            where: { id: sellOrder.id },
          });
          if (!updatedSell) {
            throw new Error("NOT_FOUND");
          }
          const sellStatus =
            updatedSell.remainingShares === 0
              ? SellOrderStatus.FILLED
              : SellOrderStatus.PARTIAL;
          if (updatedSell.status !== sellStatus) {
            await tx.sellOrder.update({
              where: { id: updatedSell.id },
              data: { status: sellStatus },
            });
          }

          const buyUpdate = await tx.buyOrder.updateMany({
            where: {
              id: buyOrder.id,
              filledShares: { lte: buyOrder.sharesRequested - match.shares },
            },
            data: { filledShares: { increment: match.shares } },
          });
          if (buyUpdate.count === 0) {
            throw new Error("BUY_ORDER_UNAVAILABLE");
          }

          const updatedBuy = await tx.buyOrder.findUnique({
            where: { id: buyOrder.id },
          });
          if (updatedBuy) {
            const buyStatus =
              updatedBuy.filledShares >= updatedBuy.sharesRequested
                ? BuyOrderStatus.FILLED
                : updatedBuy.filledShares > 0
                ? BuyOrderStatus.PARTIAL
                : BuyOrderStatus.OPEN;
            if (updatedBuy.status !== buyStatus) {
              await tx.buyOrder.update({
                where: { id: updatedBuy.id },
                data: { status: buyStatus },
              });
            }
          }

          await tx.trade.create({
            data: {
              sellOrderId: sellOrder.id,
              propertyId: sellOrder.propertyId,
              buyerUserId: buyOrder.buyerUserId,
              sellerUserId: sellOrder.userId,
              sharesTraded: match.shares,
              pricePerShare: match.pricePerShare,
            },
          });

          await tx.property.update({
            where: { id: sellOrder.propertyId },
            data: { lastTradeAt: new Date() },
          });

          tradesCreated += 1;
        }

        return { tradesCreated };
      });

      return res.json(result);
    } catch (error) {
      console.error("Order matching failed:", error);
      return sendError(res, 500, "INTERNAL_ERROR", "Failed to match orders");
    }
  }
);

app.get(
  "/admin/mls-listings",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req, res) => {
    const source = req.query.source;
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const sourceType =
      source === "PARTNER" ? SourceType.PARTNER : SourceType.PUBLIC;

    const listings = await prisma.mLSListing.findMany({
      where: {
        sourceType,
        OR: q
          ? [
              { address: { contains: q, mode: "insensitive" } },
              { city: { contains: q, mode: "insensitive" } },
              { zip: { contains: q, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return res.json(
      listings.map((listing) => ({
        externalId: listing.externalId,
        address: listing.address,
        city: listing.city,
        state: listing.state,
        zip: listing.zip,
        listPrice: Number(listing.listPrice),
        status: listing.status,
        sourceType: listing.sourceType,
        thumbUrl: listing.thumbUrl,
      }))
    );
  }
);

app.post(
  "/admin/mls-listings/seed",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (_req, res) => {
    try {
      await prisma.mLSListing.deleteMany();
      const count = await seedMLSListings(prisma);
      return res.json({ count });
    } catch {
      return sendError(res, 500, "INTERNAL_ERROR", "Failed to seed MLS listings");
    }
  }
);

app.post(
  "/admin/mls-listings/clear",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (_req, res) => {
    try {
      const result = await prisma.mLSListing.deleteMany();
      return res.json({ count: result.count });
    } catch {
      return sendError(res, 500, "INTERNAL_ERROR", "Failed to clear MLS listings");
    }
  }
);

app.get("/kyc/submissions", requireAuth, requireRole([UserRole.ADMIN]), async (_req, res) => {
  const submissions = await prisma.kycProfile.findMany({
    where: { status: KycStatus.PENDING },
    include: {
      user: {
        select: { id: true, email: true, phone: true, role: true, createdAt: true },
      },
    },
    orderBy: { submittedAt: "asc" },
  });
  return res.json(submissions);
});

app.post(
  "/kyc/approve",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req, res) => {
    const parsed = kycDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || "Invalid request";
      return sendError(res, 400, "VALIDATION_ERROR", message);
    }

    const { userId } = parsed.data;
    try {
      const profile = await prisma.kycProfile.update({
        where: { userId },
        data: { status: KycStatus.APPROVED },
      });
      return res.json(profile);
    } catch {
      return sendError(res, 404, "NOT_FOUND", "KYC profile not found");
    }
  }
);

app.post(
  "/kyc/reject",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req, res) => {
    const parsed = kycDecisionSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || "Invalid request";
      return sendError(res, 400, "VALIDATION_ERROR", message);
    }

    const { userId } = parsed.data;
    try {
      const profile = await prisma.kycProfile.update({
        where: { userId },
        data: { status: KycStatus.REJECTED },
      });
      return res.json(profile);
    } catch {
      return sendError(res, 404, "NOT_FOUND", "KYC profile not found");
    }
  }
);

app.post(
  "/admin/rent-list",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req, res) => {
    const parsed = rentListSchema.safeParse(req.body);
    if (!parsed.success) {
      const message = parsed.error.errors[0]?.message || "Invalid request";
      return sendError(res, 400, "VALIDATION_ERROR", message);
    }

    const { propertyId } = parsed.data;
    try {
      const property = await prisma.property.update({
        where: { id: propertyId },
        data: { status: PropertyStatus.RENT_LISTED },
      });
      return res.json(property);
    } catch {
      return sendError(res, 404, "NOT_FOUND", "Property not found");
    }
  }
);

app.delete(
  "/admin/properties/:id",
  requireAuth,
  requireRole([UserRole.ADMIN]),
  async (req, res) => {
    const { id } = req.params;
    if (!id) {
      return sendError(res, 400, "VALIDATION_ERROR", "Property id is required");
    }

    const property = await prisma.property.findUnique({ where: { id } });
    if (!property) {
      return sendError(res, 404, "NOT_FOUND", "Property not found");
    }
    if (property.status !== PropertyStatus.LISTED) {
      return sendError(
        res,
        400,
        "INVALID_STATE",
        "Only LISTED properties can be deleted"
      );
    }

    await prisma.property.delete({ where: { id } });
    return res.status(204).send();
  }
);

app.get("/", (_req, res) => {
  res.send("Fractional Property API");
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
