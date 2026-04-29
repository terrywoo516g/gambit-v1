import type { CallbackVerifyParams, CallbackVerifyResult, CreatePaymentParams, CreatePaymentResult, PaymentProvider } from '../types'

export const mockProvider: PaymentProvider = {
  name: 'mock',

  async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
    if (!params.orderId || typeof params.amountCents !== 'number') {
      throw new Error('mock createPayment: invalid params')
    }

    return {
      payUrl: `https://gambits.top/mock-qr?order=${params.orderId}`,
      providerOrderId: `mock_${params.orderId}`,
      raw: { mock: true },
    }
  },

  async verifyCallback({ body }: CallbackVerifyParams): Promise<CallbackVerifyResult> {
    const orderId = body.orderId
    const amountCents = Number(body.amountCents)
    if (!orderId) return { ok: false, reason: 'missing_order_id' }
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return { ok: false, reason: 'invalid_amount' }
    }
    if (body.status !== 'paid') return { ok: false, reason: 'status_not_paid' }

    return {
      ok: true,
      orderId,
      amountCents,
      providerOrderId: body.providerOrderId || `mock_${orderId}`,
    }
  },

  successResponseText() {
    return 'OK'
  },
}
