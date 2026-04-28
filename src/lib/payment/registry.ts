import { PaymentProvider } from './types'
import { MockProvider } from './mock-provider'

const providers = new Map<string, PaymentProvider>()
providers.set('mock', new MockProvider())

export function getProvider(name: string): PaymentProvider {
  const p = providers.get(name)
  if (!p) throw new Error(`Unknown payment provider: ${name}`)
  return p
}

export function listProviders(): string[] {
  return Array.from(providers.keys())
}

