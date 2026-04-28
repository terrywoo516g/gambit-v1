import { NextResponse } from 'next/server'
import { InsufficientCreditsError } from './credits'

export function insufficientCreditsResponse(err: InsufficientCreditsError) {
  return NextResponse.json(
    {
      error: 'insufficient credits',
      code: 'INSUFFICIENT_CREDITS',
      required: err.required,
      available: err.available,
    },
    { status: 402 }
  )
}

export function isInsufficientCreditsError(
  e: unknown
): e is InsufficientCreditsError {
  return e instanceof InsufficientCreditsError
}

