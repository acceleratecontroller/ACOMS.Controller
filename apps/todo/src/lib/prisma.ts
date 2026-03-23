import { PrismaClient } from "@prisma/client";

// Prevent multiple Prisma Client instances during development hot reloads.
// In production, this just creates a single instance normally.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
