# Brickly Demo Cheat Sheet

## Quick Start

```
docker compose up -d db
DATABASE_URL="postgres://app:app@localhost:5433/fractional" DISABLE_EMAIL_VERIFICATION=true npm --workspace apps/api run dev
NEXT_PUBLIC_API_BASE_URL="http://localhost:4000" npm --workspace apps/web run dev
DATABASE_URL="postgres://app:app@localhost:5433/fractional" npx tsx apps/api/prisma/seed.ts
```

## Key Accounts

- Admin: `admin@fractional.app / password123`
- Buyer: `buyer@fractional.app / buyer-password`
- Investor: `investor@fractional.app / investor-password`

## Demo Flow (12–15 min)

1. Login (Admin) — `/login`
2. Properties — `/properties`
3. Portfolio — `/portfolio`
4. Market Orders — `/market-orders`
5. Liquidity Dashboard — `/admin/liquidity`
6. Liquidity Detail + Match Orders — `/admin/liquidity/<propertyId>`
7. Targeting Rules — `/admin/targeting`
8. Market Rules — `/admin/market-rules`
9. Buyer Alerts — logout → buyer → `/alerts`

## If Alerts Don’t Show

- Ensure a sell order exists for the property
- Run targeting for that sell order

```
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"emailOrPhone":"admin@fractional.app","password":"password123"}' | jq -r '.token')

curl -s -X POST "http://localhost:4000/admin/targeting/run?sellOrderId=<ID>" \
  -H "Authorization: Bearer $TOKEN" | jq

## Match Orders (Admin)

```
curl -s -X POST "http://localhost:4000/admin/match/run?propertyId=<PROPERTY_ID>" \
  -H "Authorization: Bearer $TOKEN" | jq
```
```
