import {
  PrismaClient,
  ListingStatus,
  PropertyStatus,
  PropertyType,
  KycStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

const streetNames = [
  "Maple",
  "Oak",
  "Pine",
  "Cedar",
  "Elm",
  "Willow",
  "Birch",
  "Sunset",
  "Ridge",
  "Valley",
  "Lake",
  "Meadow",
  "Park",
  "Hillcrest",
  "Grove",
];

const cities = [
  { city: "San Diego", state: "CA", zip: "92101" },
  { city: "Austin", state: "TX", zip: "78701" },
  { city: "Denver", state: "CO", zip: "80202" },
  { city: "Nashville", state: "TN", zip: "37203" },
  { city: "Charlotte", state: "NC", zip: "28202" },
  { city: "Phoenix", state: "AZ", zip: "85004" },
  { city: "Seattle", state: "WA", zip: "98101" },
  { city: "Portland", state: "OR", zip: "97205" },
  { city: "Tampa", state: "FL", zip: "33602" },
  { city: "Atlanta", state: "GA", zip: "30303" },
];

const imagePool = [
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994",
  "https://images.unsplash.com/photo-1507089947368-19c1da9775ae",
  "https://images.unsplash.com/photo-1449844908441-8829872d2607",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750",
  "https://images.unsplash.com/photo-1494526585095-c41746248156",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858",
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(items: T[]) {
  return items[Math.floor(Math.random() * items.length)];
}

async function main() {
  await prisma.$connect();

  const adminEmail = "admin@fractional.app";
  const admin =
    (await prisma.user.findUnique({ where: { email: adminEmail } })) ??
    (await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: "seed-placeholder",
        role: "ADMIN",
      },
    }));

  await prisma.kycProfile.upsert({
    where: { userId: admin.id },
    update: { status: KycStatus.APPROVED },
    create: {
      userId: admin.id,
      status: KycStatus.APPROVED,
      data: { source: "seed" },
      submittedAt: new Date(),
    },
  });

  const investorEmail = "investor@fractional.app";
  const investor =
    (await prisma.user.findUnique({ where: { email: investorEmail } })) ??
    (await prisma.user.create({
      data: {
        email: investorEmail,
        passwordHash: "seed-placeholder",
        role: "INVESTOR",
      },
    }));

  await prisma.kycProfile.upsert({
    where: { userId: investor.id },
    update: { status: KycStatus.APPROVED },
    create: {
      userId: investor.id,
      status: KycStatus.APPROVED,
      data: { source: "seed" },
      submittedAt: new Date(),
    },
  });

  const portlandEmail = "portland@outlook.com";
  const portlandLister =
    (await prisma.user.findUnique({ where: { email: portlandEmail } })) ??
    (await prisma.user.create({
      data: {
        email: portlandEmail,
        passwordHash: "seed-placeholder",
        role: "LISTER",
      },
    }));

  const tampaEmail = "tampa@outlook.com";
  const tampaLister =
    (await prisma.user.findUnique({ where: { email: tampaEmail } })) ??
    (await prisma.user.create({
      data: {
        email: tampaEmail,
        passwordHash: "seed-placeholder",
        role: "LISTER",
      },
    }));

  const count = Number(process.env.SEED_COUNT || "100");
  const records = Array.from({ length: count }, (_, index) => index + 1);

  for (const n of records) {
    const city = pick(cities);
    const streetNumber = randomInt(100, 9999);
    const streetName = pick(streetNames);
    const address1 = `${streetNumber} ${streetName} Ave`;
    const propertyType = pick([
      PropertyType.HOUSE,
      PropertyType.CONDO,
      PropertyType.TOWNHOME,
      PropertyType.APARTMENT,
    ]);
    const bedrooms = randomInt(1, 5);
    const bathrooms = randomInt(1, 4);
    const squareFeet = randomInt(700, 3200);
    const targetRaise = randomInt(700_000, 2_500_000);
    const askingPrice = Math.round(targetRaise * (1 + randomInt(5, 25) / 100));
    const estMonthlyRent = Math.round((askingPrice / 180) * 10) / 10;
    const totalShares = randomInt(5000, 15000);
    const referencePrice = Math.round((askingPrice / totalShares) * 100) / 100;

    await prisma.$transaction(async (tx) => {
      const property = await tx.property.create({
        data: {
          type: propertyType,
          address1,
          city: city.city,
          state: city.state,
          zip: city.zip,
          status: PropertyStatus.LISTED,
          squareFeet,
          bedrooms,
          bathrooms,
          targetRaise,
          estMonthlyRent,
        },
      });

      await tx.listing.create({
        data: {
          propertyId: property.id,
          listerUserId:
            city.city === "Portland"
              ? portlandLister.id
              : city.city === "Tampa"
              ? tampaLister.id
              : admin.id,
          bonusPercent: randomInt(10, 35) / 10,
          askingPrice,
          status: ListingStatus.LISTED,
          postedAt: new Date(),
        },
      });

      await tx.shareClass.create({
        data: {
          propertyId: property.id,
          totalShares,
          sharesAvailable: totalShares,
          referencePricePerShare: referencePrice,
        },
      });

      const images = [
        pick(imagePool),
        pick(imagePool),
        pick(imagePool),
      ];
      await tx.propertyImage.createMany({
        data: images.map((url, sortOrder) => ({
          propertyId: property.id,
          url,
          sortOrder,
        })),
      });
    });
  }

  console.log(`Seeded ${count} properties.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
