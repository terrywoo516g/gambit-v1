export interface CreatePaymentParams {
  orderId: string
  amountCents: number
  description: string
  userId: string
  notifyUrl: string
  returnUrl?: string
}

export interface CreatePaymentResult {
  payUrl: string
  providerOrderId?: string
  raw?: unknown
}

export interface CallbackVerifyParams {
  body: Record<string, string>
}

export interface CallbackVerifyResult {
  ok: boolean
  reason?: string
  orderId?: string
  amountCents?: number
  providerOrderId?: string
}

export interface PaymentProvider {
  name: 'mock' | 'huipijiao'
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>
  verifyCallback(params: CallbackVerifyParams): Promise<CallbackVerifyResult>
  successResponseText(): string
}
