import type { PrismaClient } from "@prisma/client";
import type { ITXClientDenyList } from "@prisma/client/runtime/library";

/**
 * Transaction client type — the Prisma client available inside a transaction.
 * Use this as the parameter type in repository methods that participate in transactions.
 */
export type TransactionClient = Omit<PrismaClient, ITXClientDenyList>;

/**
 * Run a callback inside a Prisma interactive transaction with a sensible timeout.
 */
export async function withTransaction<T>(
  prisma: PrismaClient,
  fn: (tx: TransactionClient) => Promise<T>,
  options?: { maxWait?: number; timeout?: number },
): Promise<T> {
  return prisma.$transaction(fn, {
    maxWait: options?.maxWait ?? 5000, // 5s max wait to acquire connection
    timeout: options?.timeout ?? 10000, // 10s transaction timeout
  });
}
