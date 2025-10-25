import { PrismaClient } from '@prisma/client';

// Global variable to store the Prisma client instance
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Create Prisma client with connection pooling for extreme performance
export const db = globalForPrisma.prisma ?? new PrismaClient({
  log: ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

// Prevent creating new Prisma clients in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await db.$disconnect();
});

process.on('SIGINT', async () => {
  await db.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await db.$disconnect();
  process.exit(0);
});