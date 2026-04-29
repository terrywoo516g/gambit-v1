import { NextResponse } from 'next/server'
import { consumeCredits, InsufficientCreditsError } from './credits'
import { insufficientCreditsResponse } from './errors'

export async function chargeCredits(
  userId: string,
  amount: number,
  type: string,
  description: string
): Promise<NextResponse | null> {
  try {
    await consumeCredits(userId, amount, type, description)
    return null
  } catch (e) {
    if (e instanceof InsufficientCreditsError) return insufficientCreditsResponse(e)
    throw e
  }
}
