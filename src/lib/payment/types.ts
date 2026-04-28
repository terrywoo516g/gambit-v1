export interface CreateOrderParams {
  orderId: string
  amountCents: number
  description: string
  notifyUrl: string
}

export interface CreateOrderResult {
  providerOrderId: string
  qrCodeUrl: string
  expiresAt: Date
  metadata?: Record<string, any>
}

export interface VerifyCallbackResult {
  valid: boolean
  orderId: string
  providerOrderId: string
  amountCents: number
  paidAt: Date
  raw: any
}

export interface PaymentProvider {
  readonly name: string

  createOrder(params: CreateOrderParams): Promise<CreateOrderResult>
  verifyCallback(headers: Headers, body: string): Promise<VerifyCallbackResult>
  queryOrder(providerOrderId: string): Promise<{
    status: 'pending' | 'paid' | 'expired' | 'failed'
    paidAt?: Date
  }>
  ackResponse(): string
}

