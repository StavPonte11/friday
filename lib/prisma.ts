import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

// Prisma 7 requires a driver adapter.
// We pass a PoolConfig (plain object) rather than a pg.Pool instance
// so we avoid the @types/pg version conflict between @prisma/adapter-pg's
// bundled pg types and any external @types/pg installation.
const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? '',
})

// Singleton — prevents multiple PrismaClient instances during Next.js HMR
const globalForPrisma = global as unknown as { prisma: PrismaClient }

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
