import {
  PaymentProvider,
  CreateOrderParams,
  CreateOrderResult,
  VerifyCallbackResult,
} from './types'

export class MockProvider implements PaymentProvider {
  readonly name = 'mock'

  async createOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
    if (!params.orderId || typeof params.amountCents !== 'number') {
      throw new Error('mock createOrder: invalid params')
    }
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
    return {
      providerOrderId: `mock_${params.orderId}`,
      qrCodeUrl: `https://gambits.top/mock-qr?order=${params.orderId}`,
      expiresAt,
      metadata: { mock: true },
    }
  }

  async verifyCallback(_headers: Headers, body: string): Promise<VerifyCallbackResult> {
    let data: any
    try {
      data = JSON.parse(body)
    } catch {
      throw new Error('mock callback: invalid JSON')
    }

    if (!data.orderId || typeof data.orderId !== 'string') {
      throw new Error('mock callback: missing orderId')
    }
    if (typeof data.amountCents !== 'number' || data.amountCents <= 0) {
      throw new Error('mock callback: invalid amountCents')
    }

    return {
      valid: true,
      orderId: data.orderId,
      providerOrderId: data.providerOrderId ?? `mock_${data.orderId}`,
      amountCents: data.amountCents,
      paidAt: new Date(),
      raw: data,
    }
  }

  async queryOrder(providerOrderId: string) {
    void providerOrderId
    return { status: 'pending' as const }
  }

  ackResponse(): string {
    return 'success'
  }
}
