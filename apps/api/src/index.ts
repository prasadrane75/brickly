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
  RentalApplicationStatus,
  PropertyType,
  SourceType,
} from "@prisma/client";
import { z } from "zod";
import importRoutes from "./import/import.routes.js";
import { requireAuth, requireKycApproved } from "./middleware/auth.js";
import { seedMLSListings } from "./import/import.seed.js";
import { sendVerificationEmail } from "./email.js";

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

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.nativeEnum(UserRole),
});

const loginSchema = z.object({
  emailOrPhone: z.string().min(3),
  password: z.string().min(8),
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
});

const marketBuySchema = z.object({
  sellOrderId: z.string().uuid(),
  sharesToBuy: z.number().int().positive(),
});

const rentalApplySchema = z.object({
  propertyId: z.string().uuid(),
});

const kycSubmitSchema = z.object({
  data: z.record(z.unknown()).default({}),
});

const kycDecisionSchema = z.object({
  userId: z.string().uuid(),
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
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        emailVerified: false,
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

  if (user.email && !user.emailVerified) {
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

  const response = holdings.map((holding) => {
    const totalShares = holding.shareClass.totalShares;
    const percent = totalShares > 0 ? holding.sharesOwned / totalShares : 0;
    return {
      id: holding.id,
      sharesOwned: holding.sharesOwned,
      updatedAt: holding.updatedAt,
      percent,
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

  const { propertyId, sharesForSale, askPricePerShare } = parsed.data;

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

      return tx.sellOrder.create({
        data: {
          userId: req.user!.id,
          propertyId,
          sharesForSale,
          askPricePerShare,
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
    where: { status: SellOrderStatus.OPEN },
    include: {
      property: true,
      user: {
        select: { id: true, email: true, phone: true, role: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return res.json(orders);
});

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
          sharesForSale: { gte: sharesToBuy },
        },
        data: {
          sharesForSale: { decrement: sharesToBuy },
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
        updatedOrder.sharesForSale === 0
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
