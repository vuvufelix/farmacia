import { PrismaClient } from '@prisma/client';
import path from 'path';
import { app } from 'electron';

const userDataPath = app ? app.getPath('userData') : process.cwd();
const dbPath = path.join(userDataPath, 'database.db');

process.env.DATABASE_URL = `file:${dbPath}`;

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;