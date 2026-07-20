import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaClientVersion?: string
}

// Verzija Prisma clienta — spremeni ob vsakom `prisma generate`,
// da invalidira star singleton (ki morda nima novih modelov, npr. StockTransfer).
const CLIENT_VERSION = 'stocktransfer-2026-07-18'

// Invalidiraj singleton, če je bil ustvarjen z zgodnejšo verzijo clienta
// in nima novega modela `stockTransfer`.
const existing = globalForPrisma.prisma
const hasStockTransfer =
  existing !== undefined &&
  typeof (existing as unknown as Record<string, unknown>).stockTransfer !==
    'undefined'
const isStale =
  !!existing &&
  (globalForPrisma.prismaClientVersion !== CLIENT_VERSION ||
    !hasStockTransfer)

if (isStale && existing) {
  try {
    void (
      existing as unknown as { $disconnect?: () => Promise<unknown> }
    ).$disconnect?.()
  } catch {
    // ignore
  }
  globalForPrisma.prisma = undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db
  globalForPrisma.prismaClientVersion = CLIENT_VERSION
}
