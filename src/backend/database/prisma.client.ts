import path from 'path';
import { app } from 'electron';

const userDataPath = app ? app.getPath('userData') : process.cwd();
const dbPath = path.join(userDataPath, 'dev.db');

process.env.DATABASE_URL = `file:${dbPath}`;

// O truque definitivo: usa o require do Node em tempo de execução ignorando o ESM
const dynamicRequire = eval('require');
const { PrismaClient } = dynamicRequire('@prisma/client');

const globalForPrisma = global as unknown as { prisma: any };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;