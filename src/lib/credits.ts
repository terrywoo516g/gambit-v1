export async function reserveCredits(userId: string, amount: number) {
  // TODO: D7 实现积分预扣
  console.log('[credits] reserve', { userId, amount })
  return true
}

export async function commitCredits(userId: string, amount: number, refId: string) {
  // TODO: D7 实现积分扣除确认
  console.log('[credits] commit', { userId, amount, refId })
  return true
}

export async function refundCredits(userId: string, amount: number, refId: string) {
  // TODO: D7 实现积分返还
  console.log('[credits] refund', { userId, amount, refId })
  return true
}
