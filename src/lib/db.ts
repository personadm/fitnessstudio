import { PrismaClient } from "@prisma/client";

// In Dev wird das Modul bei jedem Code-Change neu geladen.
// Damit nicht ständig neue Connections aufgemacht werden, cachen wir
// den Client auf dem global-Objekt.
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
