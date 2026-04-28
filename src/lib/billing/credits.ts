import { prisma } from '@/lib/db'

export class InsufficientCreditsError extends Error {
  code = 'INSUFFICIENT_CREDITS'
  constructor(public required: number, public available: number) {
    super(`Insufficient credits: need ${required}, have ${available}`)
  }
}

export async function getBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { credits: true },
  })
  return user?.credits ?? 0
}

/**
 * 增加积分。amount 必须为正整数。
 * 事务内：先 increment User.credits，再写 CreditTransaction。
 */
export async function grantCredits(
  userId: string,
  amount: number,
  type: string,
  description?: string
): Promise<number> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('grantCredits amount must be a positive integer')
  }
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { credits: { increment: amount } },
      select: { credits: true },
    })
    await tx.creditTransaction.create({
      data: { userId, amount, type, description },
    })
    return user.credits
  })
}

/**
 * 扣减积分。原子扣减，避免并发超扣。
 * 事务内：用 updateMany + where 余额条件做条件扣减；
 *   - 若 count = 0，说明余额不足，查询当前余额抛 InsufficientCreditsError；
 *   - 若 count = 1，扣减成功，写入负值流水。
 */
export async function consumeCredits(
  userId: string,
  amount: number,
  type: string,
  description?: string
): Promise<number> {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error('consumeCredits amount must be a positive integer')
  }
  return prisma.$transaction(async (tx) => {
    const result = await tx.user.updateMany({
      where: { id: userId, credits: { gte: amount } },
      data: { credits: { decrement: amount } },
    })
    if (result.count === 0) {
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: { credits: true },
      })
      const available = user?.credits ?? 0
      throw new InsufficientCreditsError(amount, available)
    }
    await tx.creditTransaction.create({
      data: { userId, amount: -amount, type, description },
    })
    const updated = await tx.user.findUnique({
      where: { id: userId },
      select: { credits: true },
    })
    return updated?.credits ?? 0
  })
}