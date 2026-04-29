import { mockProvider } from './providers/mock'
import { huipijiaoProvider } from './providers/huipijiao'
import type { PaymentProvider } from './types'

export function getPaymentProvider(name?: string): PaymentProvider {
  const provider = name || process.env.PAYMENT_PROVIDER || 'mock'
  if (provider === 'huipijiao') {
    if (process.env.HUIPIJIAO_ENABLED !== 'true') {
      throw new Error('huipijiao provider not enabled (HUIPIJIAO_ENABLED !== true)')
    }
    return huipijiaoProvider
  }
  return mockProvider
}

export type { CallbackVerifyResult, CreatePaymentParams, PaymentProvider } from './types'
