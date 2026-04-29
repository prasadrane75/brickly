export const demoUsers = {
  admin: {
    email: "admin@fractional.app",
    password: "demo-admin-123",
    role: "ADMIN",
  },
  investor: {
    email: "maya@fractional.app",
    password: "demo-investor-123",
    role: "INVESTOR",
  },
  secondaryInvestor: {
    email: "noah@fractional.app",
    password: "demo-investor-456",
    role: "INVESTOR",
  },
  lister: {
    email: "lister@fractional.app",
    password: "demo-lister-123",
    role: "LISTER",
  },
} as const;

export type DemoUserKey = keyof typeof demoUsers;

