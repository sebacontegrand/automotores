import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

function getConnectionString(): string {
  return (
    process.env.DATA_DATABASE_URL ||
    process.env.DATA_POSTGRES_URL ||
    process.env.DATA_PRISMA_DATABASE_URL ||
    process.env.DATA_PRISMA_URL ||
    process.env.DATA_URL ||
    process.env.DATA_POSTGRES_PRISMA_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.DATABASE_URL ||
    ''
  )
}

const prismaClientSingleton = () => {
  const connectionString = getConnectionString()

  if (!connectionString && process.env.NODE_ENV === 'production') {
    console.warn("Prisma warning: No database connection string found in environment variables.")
  }

  const isProduction = process.env.NODE_ENV === 'production'
  const isRemoteDb =
    Boolean(connectionString) &&
    (isProduction ||
      connectionString.includes('sslmode=') ||
      connectionString.includes('neon.tech') ||
      connectionString.includes('supabase') ||
      connectionString.includes('vercel-storage') ||
      connectionString.includes('railway') ||
      connectionString.includes('postgres.vercel-storage.com') ||
      !connectionString.includes('localhost'))

  const pool = new Pool({
    connectionString,
    ssl: isRemoteDb ? { rejectUnauthorized: false } : undefined,
  })

  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof prismaClientSingleton> | undefined
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

export { prisma }

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
