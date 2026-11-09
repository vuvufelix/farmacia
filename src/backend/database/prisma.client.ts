import pkg from '@prisma/client'
const { PrismaClient } = pkg

type PrismaClientType = InstanceType<typeof PrismaClient>

const globalForPrisma = global as unknown as { prisma: PrismaClientType }

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['error', 'warn']
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma