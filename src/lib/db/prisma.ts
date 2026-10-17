import { PrismaClient } from '@prisma/client';
import { SQLiteManager } from './sqlite-manager';

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
  sqliteInitialized?: boolean;
};

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Auto-initialize SQLite database, tables, and migrations on application startup
if (!globalForPrisma.sqliteInitialized) {
  globalForPrisma.sqliteInitialized = true;
  SQLiteManager.ensureDatabaseInitialized(prisma).catch((err) => {
    console.error('[Prisma] SQLite auto-initialization error:', err);
  });
}

export default prisma;
