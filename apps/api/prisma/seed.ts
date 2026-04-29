import bcrypt from "bcrypt";
import {
  AuditAction,
  AuditActorType,
  BuyOrderStatus,
  BuyOrderType,
  DocumentEntityType,
  DocumentKind,
  DocumentStatus,
  KycStatus,
  ListingStatus,
  NotificationType,
  PlatformConfigScope,
  PrismaClient,
  PropertyStatus,
  PropertyType,
  SellOrderStatus,
  SellOrderStrategy,
  SourceType,
  UserRole,
  VerificationStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const imagePool = {
  atlanta:
    "https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=1200&q=80",
  miami:
    "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80",
  austin:
    "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
  interior:
    "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80",
  exterior:
    "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80",
  skyline:
    "https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=1200&q=80",
};

const demoPasswords = {
  admin: "demo-admin-123",
  lister: "demo-lister-123",
  maya: "demo-investor-123",
  noah: "demo-investor-456",
  olivia: "demo-investor-789",
};

function daysAgo(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function resetPhaseOneData() {
  await prisma.notification.deleteMany();
  await prisma.targetedOffer.deleteMany();
  await prisma.propertyView.deleteMany();
  await prisma.rentalApplication.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.trade.deleteMany();
  await prisma.buyOrder.deleteMany();
  await prisma.sellOrder.deleteMany();
  await prisma.holding.deleteMany();
  await prisma.shareClass.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.propertyImage.deleteMany();
  await prisma.property.deleteMany();
  await prisma.mLSListing.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.kycProfile.deleteMany();
  await prisma.platformConfig.deleteMany();
  await prisma.marketRuleConfig.deleteMany();
  await prisma.targetingRuleConfig.deleteMany();
  await prisma.user.deleteMany();
}

async function createUser(input: {
  email: string;
  role: UserRole;
  password: string;
  phone: string;
  verificationStatus?: VerificationStatus;
  kycStatus?: KycStatus;
  aiSummaryCache?: string;
}) {
  const passwordHash = await bcrypt.hash(input.password, 12);
  return prisma.user.create({
    data: {
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: input.role,
      emailVerified: true,
      verificationStatus: input.verificationStatus ?? VerificationStatus.VERIFIED,
      aiSummaryCache: input.aiSummaryCache,
      kycProfile: {
        create: {
          status: input.kycStatus ?? KycStatus.APPROVED,
          data: { source: "phase_1_seed" },
          submittedAt: daysAgo(14),
        },
      },
    },
  });
}

async function main() {
  await prisma.$connect();
  await resetPhaseOneData();

  const admin = await createUser({
    email: "admin@fractional.app",
    role: UserRole.ADMIN,
    password: demoPasswords.admin,
    phone: "+1-404-555-0101",
    aiSummaryCache: "Platform administrator for the Brickly investor demo.",
  });

  const lister = await createUser({
    email: "lister@fractional.app",
    role: UserRole.LISTER,
    password: demoPasswords.lister,
    phone: "+1-404-555-0102",
    aiSummaryCache: "Regional acquisitions lead managing curated offering intake.",
  });

  const maya = await createUser({
    email: "maya@fractional.app",
    role: UserRole.INVESTOR,
    password: demoPasswords.maya,
    phone: "+1-404-555-0103",
    aiSummaryCache: "Repeat investor focused on Sun Belt rental yield and cash-flow resilience.",
  });

  const noah = await createUser({
    email: "noah@fractional.app",
    role: UserRole.INVESTOR,
    password: demoPasswords.noah,
    phone: "+1-404-555-0104",
    aiSummaryCache: "Investor rotating capital between stabilized residential assets.",
  });

  const olivia = await createUser({
    email: "olivia@fractional.app",
    role: UserRole.INVESTOR,
    password: demoPasswords.olivia,
    phone: "+1-404-555-0105",
    aiSummaryCache: "Income-focused investor interested in shorter-hold liquidity opportunities.",
  });

  const properties = await Promise.all([
    prisma.property.create({
      data: {
        type: PropertyType.APARTMENT,
        address1: "The Larkin Residences · 840 Peachtree St NE",
        city: "Atlanta",
        state: "GA",
        zip: "30308",
        status: PropertyStatus.FUNDED,
        sourceType: SourceType.OWNER,
        sourceRefId: "asset-atl-larkin-001",
        sourceAttribution: "The Larkin Residences",
        squareFeet: 18250,
        bedrooms: 24,
        bathrooms: 24,
        targetRaise: 4800000,
        estMonthlyRent: 32800,
        liquidityScore: 78,
        importedAt: daysAgo(120),
        lastTradeAt: daysAgo(6),
        verificationStatus: VerificationStatus.VERIFIED,
        aiSummaryCache:
          "Stabilized multifamily asset in Midtown Atlanta with strong occupancy and repeat investor demand.",
        images: {
          create: [
            { url: imagePool.atlanta, sortOrder: 0 },
            { url: imagePool.interior, sortOrder: 1 },
          ],
        },
      },
    }),
    prisma.property.create({
      data: {
        type: PropertyType.CONDO,
        address1: "South Pointe Lofts · 51 Ocean Dr",
        city: "Miami Beach",
        state: "FL",
        zip: "33139",
        status: PropertyStatus.LISTED,
        sourceType: SourceType.PARTNER,
        sourceRefId: "asset-mia-south-pointe-002",
        sourceAttribution: "South Pointe Lofts",
        squareFeet: 11240,
        bedrooms: 18,
        bathrooms: 18,
        targetRaise: 3650000,
        estMonthlyRent: 24450,
        liquidityScore: 69,
        importedAt: daysAgo(75),
        lastTradeAt: daysAgo(18),
        verificationStatus: VerificationStatus.PENDING,
        aiSummaryCache:
          "Luxury short-stay adjusted condo portfolio positioned for yield-focused fractional buyers.",
        images: {
          create: [
            { url: imagePool.miami, sortOrder: 0 },
            { url: imagePool.exterior, sortOrder: 1 },
          ],
        },
      },
    }),
    prisma.property.create({
      data: {
        type: PropertyType.TOWNHOME,
        address1: "Barton Creek Townhomes · 1712 Collier St",
        city: "Austin",
        state: "TX",
        zip: "78704",
        status: PropertyStatus.LISTED,
        sourceType: SourceType.PUBLIC,
        sourceRefId: "asset-aus-barton-creek-003",
        sourceAttribution: "Barton Creek Townhomes",
        squareFeet: 14680,
        bedrooms: 16,
        bathrooms: 16,
        targetRaise: 4250000,
        estMonthlyRent: 27600,
        liquidityScore: 74,
        importedAt: daysAgo(60),
        lastTradeAt: daysAgo(11),
        verificationStatus: VerificationStatus.VERIFIED,
        aiSummaryCache:
          "High-demand Austin workforce housing with balanced appreciation and rental cash-flow profile.",
        images: {
          create: [
            { url: imagePool.austin, sortOrder: 0 },
            { url: imagePool.skyline, sortOrder: 1 },
          ],
        },
      },
    }),
  ]);

  const [atlantaProperty, miamiProperty, austinProperty] = properties;

  const [atlantaShareClass, miamiShareClass, austinShareClass] = await Promise.all([
    prisma.shareClass.create({
      data: {
        propertyId: atlantaProperty.id,
        totalShares: 10000,
        sharesAvailable: 4900,
        referencePricePerShare: 482,
        lastReferenceUpdateAt: daysAgo(2),
      },
    }),
    prisma.shareClass.create({
      data: {
        propertyId: miamiProperty.id,
        totalShares: 8000,
        sharesAvailable: 5800,
        referencePricePerShare: 456.25,
        lastReferenceUpdateAt: daysAgo(1),
      },
    }),
    prisma.shareClass.create({
      data: {
        propertyId: austinProperty.id,
        totalShares: 12000,
        sharesAvailable: 9000,
        referencePricePerShare: 354.16,
        lastReferenceUpdateAt: daysAgo(3),
      },
    }),
  ]);

  await prisma.listing.createMany({
    data: [
      {
        propertyId: atlantaProperty.id,
        listerUserId: lister.id,
        bonusPercent: 1.5,
        askingPrice: 4820000,
        status: ListingStatus.LISTED,
        postedAt: daysAgo(45),
      },
      {
        propertyId: miamiProperty.id,
        listerUserId: lister.id,
        bonusPercent: 2.0,
        askingPrice: 3650000,
        status: ListingStatus.LISTED,
        postedAt: daysAgo(32),
      },
      {
        propertyId: austinProperty.id,
        listerUserId: admin.id,
        bonusPercent: 1.25,
        askingPrice: 4250000,
        status: ListingStatus.LISTED,
        postedAt: daysAgo(28),
      },
    ],
  });

  await prisma.holding.createMany({
    data: [
      {
        userId: maya.id,
        shareClassId: atlantaShareClass.id,
        sharesOwned: 2800,
        createdAt: daysAgo(70),
      },
      {
        userId: noah.id,
        shareClassId: atlantaShareClass.id,
        sharesOwned: 1400,
        createdAt: daysAgo(54),
      },
      {
        userId: olivia.id,
        shareClassId: atlantaShareClass.id,
        sharesOwned: 900,
        createdAt: daysAgo(40),
      },
      {
        userId: maya.id,
        shareClassId: miamiShareClass.id,
        sharesOwned: 600,
        createdAt: daysAgo(34),
      },
      {
        userId: olivia.id,
        shareClassId: miamiShareClass.id,
        sharesOwned: 1600,
        createdAt: daysAgo(31),
      },
      {
        userId: noah.id,
        shareClassId: austinShareClass.id,
        sharesOwned: 1800,
        createdAt: daysAgo(42),
      },
      {
        userId: olivia.id,
        shareClassId: austinShareClass.id,
        sharesOwned: 1200,
        createdAt: daysAgo(36),
      },
    ],
  });

  const atlantaExitOrder = await prisma.sellOrder.create({
    data: {
      userId: maya.id,
      propertyId: atlantaProperty.id,
      sharesForSale: 600,
      remainingShares: 400,
      askPricePerShare: 489,
      optimizedPricePerShare: 486.5,
      liquidityScoreAtCreation: 78,
      strategy: SellOrderStrategy.BALANCED,
      status: SellOrderStatus.PARTIAL,
      verificationStatus: VerificationStatus.VERIFIED,
      aiSummaryCache:
        "Partial exit order from an early investor rotating capital while preserving a core position.",
      createdAt: daysAgo(8),
      updatedAt: daysAgo(6),
    },
  });

  const austinExitOrder = await prisma.sellOrder.create({
    data: {
      userId: noah.id,
      propertyId: austinProperty.id,
      sharesForSale: 350,
      remainingShares: 0,
      askPricePerShare: 361,
      optimizedPricePerShare: 358.75,
      liquidityScoreAtCreation: 74,
      strategy: SellOrderStrategy.FAST_EXIT,
      status: SellOrderStatus.FILLED,
      verificationStatus: VerificationStatus.VERIFIED,
      createdAt: daysAgo(14),
      updatedAt: daysAgo(11),
    },
  });

  const miamiOpenOrder = await prisma.sellOrder.create({
    data: {
      userId: olivia.id,
      propertyId: miamiProperty.id,
      sharesForSale: 250,
      remainingShares: 250,
      askPricePerShare: 468,
      optimizedPricePerShare: 466.4,
      liquidityScoreAtCreation: 69,
      strategy: SellOrderStrategy.MAX_PRICE,
      status: SellOrderStatus.OPEN,
      verificationStatus: VerificationStatus.PENDING,
      aiSummaryCache:
        "Open order priced slightly above reference to test premium demand from yield buyers.",
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
  });

  const atlantaBuyOrder = await prisma.buyOrder.create({
    data: {
      buyerUserId: noah.id,
      propertyId: atlantaProperty.id,
      orderType: BuyOrderType.LIMIT,
      sharesRequested: 300,
      filledShares: 200,
      maxPricePerShare: 490,
      status: BuyOrderStatus.PARTIAL,
      verificationStatus: VerificationStatus.VERIFIED,
      aiSummaryCache:
        "Buyer re-entering a stabilized Atlanta position through a disciplined limit order.",
      createdAt: daysAgo(8),
      updatedAt: daysAgo(6),
    },
  });

  const miamiBuyOrder = await prisma.buyOrder.create({
    data: {
      buyerUserId: maya.id,
      propertyId: miamiProperty.id,
      orderType: BuyOrderType.MARKET,
      sharesRequested: 120,
      filledShares: 0,
      status: BuyOrderStatus.OPEN,
      verificationStatus: VerificationStatus.PENDING,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  });

  const austinBuyOrder = await prisma.buyOrder.create({
    data: {
      buyerUserId: olivia.id,
      propertyId: austinProperty.id,
      orderType: BuyOrderType.LIMIT,
      sharesRequested: 200,
      filledShares: 150,
      maxPricePerShare: 360,
      status: BuyOrderStatus.PARTIAL,
      verificationStatus: VerificationStatus.VERIFIED,
      createdAt: daysAgo(13),
      updatedAt: daysAgo(11),
    },
  });

  const tradeAtlanta = await prisma.trade.create({
    data: {
      sellOrderId: atlantaExitOrder.id,
      propertyId: atlantaProperty.id,
      buyerUserId: noah.id,
      sellerUserId: maya.id,
      sharesTraded: 200,
      pricePerShare: 487,
      tradedAt: daysAgo(6),
      verificationStatus: VerificationStatus.VERIFIED,
      aiSummaryCache:
        "Secondary trade showing active liquidity between repeat investors in a funded property.",
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
    },
  });

  const tradeAustin = await prisma.trade.create({
    data: {
      sellOrderId: austinExitOrder.id,
      propertyId: austinProperty.id,
      buyerUserId: olivia.id,
      sellerUserId: noah.id,
      sharesTraded: 150,
      pricePerShare: 359.5,
      tradedAt: daysAgo(11),
      verificationStatus: VerificationStatus.VERIFIED,
      aiSummaryCache:
        "Completed trade used in the demo to show transaction history and investor rotation.",
      createdAt: daysAgo(11),
      updatedAt: daysAgo(11),
    },
  });

  await prisma.propertyView.createMany({
    data: [
      {
        userId: maya.id,
        propertyId: atlantaProperty.id,
        viewCount: 7,
        createdAt: daysAgo(21),
        lastViewedAt: daysAgo(1),
      },
      {
        userId: noah.id,
        propertyId: miamiProperty.id,
        viewCount: 5,
        createdAt: daysAgo(18),
        lastViewedAt: daysAgo(2),
      },
      {
        userId: olivia.id,
        propertyId: austinProperty.id,
        viewCount: 8,
        createdAt: daysAgo(26),
        lastViewedAt: daysAgo(1),
      },
    ],
  });

  await prisma.document.createMany({
    data: [
      {
        uploadedByUserId: lister.id,
        propertyId: atlantaProperty.id,
        entityType: DocumentEntityType.PROPERTY,
        kind: DocumentKind.OFFERING_MEMO,
        status: DocumentStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED,
        fileName: "larkin-offering-memo.pdf",
        fileUrl: "https://example.com/demo-docs/larkin-offering-memo.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 2841120,
        aiSummaryCache:
          "Executive summary for The Larkin Residences covering occupancy, rent roll, and value-add scope.",
        metadata: {
          displayName: "The Larkin Residences Investment Memo",
          valuation: 4820000,
          occupancy: "94% leased",
        },
      },
      {
        uploadedByUserId: admin.id,
        propertyId: miamiProperty.id,
        entityType: DocumentEntityType.PROPERTY,
        kind: DocumentKind.APPRAISAL,
        status: DocumentStatus.ACTIVE,
        verificationStatus: VerificationStatus.PENDING,
        fileName: "south-pointe-appraisal.pdf",
        fileUrl: "https://example.com/demo-docs/south-pointe-appraisal.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 1984520,
        metadata: {
          displayName: "South Pointe Lofts Appraisal",
          valuation: 3650000,
          occupancy: "89% occupied",
        },
      },
      {
        uploadedByUserId: admin.id,
        tradeId: tradeAtlanta.id,
        sellOrderId: atlantaExitOrder.id,
        entityType: DocumentEntityType.TRANSACTION,
        kind: DocumentKind.TRADE_CONFIRMATION,
        status: DocumentStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED,
        fileName: "atlanta-trade-confirmation.pdf",
        fileUrl: "https://example.com/demo-docs/atlanta-trade-confirmation.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 448120,
        metadata: {
          displayName: "Atlanta Secondary Trade Confirmation",
          shares: 200,
          pricePerShare: 487,
        },
      },
      {
        uploadedByUserId: olivia.id,
        buyOrderId: miamiBuyOrder.id,
        entityType: DocumentEntityType.ORDER,
        kind: DocumentKind.SUBSCRIPTION_AGREEMENT,
        status: DocumentStatus.ACTIVE,
        verificationStatus: VerificationStatus.PENDING,
        fileName: "miami-subscription-agreement.pdf",
        fileUrl: "https://example.com/demo-docs/miami-subscription-agreement.pdf",
        mimeType: "application/pdf",
        fileSizeBytes: 612008,
        metadata: {
          displayName: "South Pointe Subscription Agreement",
        },
      },
    ],
  });

  await prisma.targetedOffer.create({
    data: {
      sellOrderId: miamiOpenOrder.id,
      buyerUserId: maya.id,
      score: 84,
      createdAt: daysAgo(1),
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: maya.id,
        propertyId: miamiProperty.id,
        sellOrderId: miamiOpenOrder.id,
        type: NotificationType.TARGETED_OFFER,
        message:
          "South Pointe Lofts has a new premium-priced sell order aligned to your recent Miami watchlist activity.",
        createdAt: daysAgo(1),
      },
      {
        userId: noah.id,
        propertyId: atlantaProperty.id,
        sellOrderId: atlantaExitOrder.id,
        type: NotificationType.TRADE,
        message:
          "Your Atlanta purchase of 200 shares settled and has been added to your transaction history.",
        createdAt: daysAgo(6),
        readAt: daysAgo(5),
      },
      {
        userId: olivia.id,
        propertyId: austinProperty.id,
        type: NotificationType.SYSTEM,
        message:
          "Barton Creek Townhomes liquidity score was refreshed after your recent secondary-market fill.",
        createdAt: daysAgo(10),
      },
      {
        userId: admin.id,
        propertyId: miamiProperty.id,
        type: NotificationType.DOCUMENT,
        message:
          "A pending appraisal document was uploaded for South Pointe Lofts and awaits verification review.",
        createdAt: daysAgo(2),
      },
    ],
  });

  await prisma.adminAuditLog.createMany({
    data: [
      {
        actorUserId: admin.id,
        actorType: AuditActorType.ADMIN,
        action: AuditAction.APPROVE,
        entityType: "KycProfile",
        entityId: maya.id,
        targetUserId: maya.id,
        metadata: { note: "Investor approved for secondary market activity" },
        createdAt: daysAgo(20),
      },
      {
        actorUserId: admin.id,
        actorType: AuditActorType.ADMIN,
        action: AuditAction.CONFIG_CHANGE,
        entityType: "MarketRuleConfig",
        propertyId: atlantaProperty.id,
        metadata: { changedField: "liquidityGoodThreshold", from: 70, to: 72 },
        createdAt: daysAgo(9),
      },
      {
        actorUserId: lister.id,
        actorType: AuditActorType.USER,
        action: AuditAction.CREATE,
        entityType: "Document",
        propertyId: atlantaProperty.id,
        metadata: { fileName: "larkin-offering-memo.pdf", kind: "OFFERING_MEMO" },
        createdAt: daysAgo(7),
      },
      {
        actorUserId: admin.id,
        actorType: AuditActorType.ADMIN,
        action: AuditAction.APPROVE,
        entityType: "Trade",
        entityId: tradeAustin.id,
        propertyId: austinProperty.id,
        tradeId: tradeAustin.id,
        metadata: { shares: 150, buyer: olivia.email, seller: noah.email },
        createdAt: daysAgo(11),
      },
    ],
  });

  await prisma.targetingRuleConfig.create({
    data: {
      name: "default",
      ownsPropertyWeight: 40,
      viewScorePerCount: 6,
      maxViewScore: 30,
      similarHoldingsWeight: 20,
      recentBuyerWeight: 10,
      minScoreToTarget: 1,
      maxBuyersPerOrder: 20,
      cooldownHours: 12,
    },
  });

  await prisma.marketRuleConfig.create({
    data: {
      name: "default",
      liquidityGoodThreshold: 72,
      liquidityMidThreshold: 48,
      liquidityLookbackDays: 14,
      liquidityTradeWeight: 40,
      liquidityTimeWeight: 35,
      liquidityDeviationWeight: 25,
      liquidityTradeCountCap: 10,
      liquidityTimeToFillMaxHours: 168,
      referenceWeightPrimary: 0.4,
      referenceWeightSecondary: 0.4,
      referenceWeightNav: 0.2,
      strategyMultiplierFastExit: 0.95,
      strategyMultiplierBalanced: 1.0,
      strategyMultiplierMaxPrice: 1.03,
      maxPriceCapMultiplier: 1.2,
    },
  });

  await prisma.platformConfig.createMany({
    data: [
      {
        scope: PlatformConfigScope.PLATFORM,
        key: "demo_banner",
        value: {
          title: "Brickly Phase 1 Demo",
          subtitle: "Fractional ownership workflow with seeded investor activity",
        },
        description: "Homepage banner copy for demo environments.",
      },
      {
        scope: PlatformConfigScope.AI,
        key: "phase_2_ai_placeholder",
        value: {
          enabled: false,
          note: "Reserved for AI summaries and assistant workflows in Phase 2.",
        },
        description: "Placeholder config row proving future AI extension space.",
        aiSummaryCache: "Placeholder only. No LLM generation is active in Phase 1.",
      },
      {
        scope: PlatformConfigScope.BLOCKCHAIN,
        key: "phase_3_blockchain_placeholder",
        value: {
          enabled: false,
          note: "Reserved for blockchain ownership references in Phase 3.",
        },
        description: "Placeholder config row for future blockchain integrations.",
      },
    ],
  });

  console.log("Phase 1 demo seed complete.");
  console.log("Demo users:");
  console.log(`- admin@fractional.app / ${demoPasswords.admin} (ADMIN)`);
  console.log(`- lister@fractional.app / ${demoPasswords.lister} (LISTER)`);
  console.log(`- maya@fractional.app / ${demoPasswords.maya} (INVESTOR)`);
  console.log(`- noah@fractional.app / ${demoPasswords.noah} (INVESTOR)`);
  console.log(`- olivia@fractional.app / ${demoPasswords.olivia} (INVESTOR)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
