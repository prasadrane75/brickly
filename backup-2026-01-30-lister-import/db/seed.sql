-- Seed data aligned with Prisma schema.
INSERT INTO "User" ("id", "email", "passwordHash", "role")
VALUES
  ('11111111-1111-1111-1111-111111111111', 'admin@fractional.app', '$2b$12$0fPgGwic3PNDrvUwWyInn.FjfgKuycnAlakqrna8JY5Nc9aNcNGQK', 'ADMIN'),
  ('22222222-2222-2222-2222-222222222222', 'investor@fractional.app', '$2b$12$Ujc2atwcbG7SsS9zcBZdveTLo7YoCTYzIqo0.8alFwFKCaTTQ7ia.', 'INVESTOR'),
  ('33333333-3333-3333-3333-333333333333', 'portland@outlook.com', 'seed-placeholder', 'LISTER'),
  ('44444444-4444-4444-4444-444444444444', 'tampa@outlook.com', 'seed-placeholder', 'LISTER');

INSERT INTO "KycProfile" ("id", "userId", "status", "data", "submittedAt")
VALUES
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'APPROVED', '{"source":"seed"}'::jsonb, CURRENT_TIMESTAMP),
  ('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 'APPROVED', '{"source":"seed"}'::jsonb, CURRENT_TIMESTAMP);

INSERT INTO "Property" ("id", "type", "address1", "city", "state", "zip", "status", "squareFeet", "bedrooms", "bathrooms", "targetRaise", "estMonthlyRent")
VALUES
  ('55555555-5555-5555-5555-555555555555', 'HOUSE', '100 Harbor Way', 'San Diego', 'CA', '92101', 'LISTED', 1800, 3, 2, 1500000, 6500),
  ('66666666-6666-6666-6666-666666666666', 'CONDO', '455 Cedar Loop', 'Portland', 'OR', '97205', 'LISTED', 950, 2, 1, 1200000, 5200);

INSERT INTO "Listing" ("id", "propertyId", "listerUserId", "bonusPercent", "askingPrice", "status", "postedAt")
VALUES
  ('77777777-7777-7777-7777-777777777777', '55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 2.500, 1850000, 'LISTED', CURRENT_TIMESTAMP),
  ('88888888-8888-8888-8888-888888888888', '66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 1.750, 1400000, 'LISTED', CURRENT_TIMESTAMP);

INSERT INTO "ShareClass" ("id", "propertyId", "totalShares", "sharesAvailable", "referencePricePerShare")
VALUES
  ('99999999-9999-9999-9999-999999999999', '55555555-5555-5555-5555-555555555555', 10000, 9500, 185.0000),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 10000, 10000, 140.0000);

INSERT INTO "PropertyImage" ("id", "propertyId", "url", "sortOrder")
VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'https://images.unsplash.com/photo-1568605114967-8130f3a36994', 0),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '55555555-5555-5555-5555-555555555555', 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae', 1),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '66666666-6666-6666-6666-666666666666', 'https://images.unsplash.com/photo-1449844908441-8829872d2607', 0),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '66666666-6666-6666-6666-666666666666', 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750', 1);

INSERT INTO "Holding" ("id", "userId", "shareClassId", "sharesOwned", "updatedAt")
VALUES
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', '99999999-9999-9999-9999-999999999999', 500, CURRENT_TIMESTAMP);
