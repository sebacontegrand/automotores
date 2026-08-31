import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = process.env.DATA_DATABASE_URL || process.env.DATABASE_URL || ''

const prismaClientSingleton = () => {
  const isProduction = process.env.NODE_ENV === 'production'
  const isCloudDb =
    connectionString.includes('sslmode=') ||
    connectionString.includes('neon.tech') ||
    connectionString.includes('supabase') ||
    connectionString.includes('vercel-storage') ||
    connectionString.includes('railway')

  const pool = new Pool({
    connectionString,
    ssl: isProduction || isCloudDb ? { rejectUnauthorized: false } : undefined,
  })

  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof prismaClientSingleton> | undefined
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

export { prisma }

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
