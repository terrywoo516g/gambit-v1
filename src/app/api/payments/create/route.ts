import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/db'
import { getTier } from '@/lib/payment/tiers'
import { getProvider } from '@/lib/payment/registry'

const DEFAULT_PROVIDER = process.env.PAYMENT_PROVIDER || 'mock'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const tier = getTier(body.tierId)
  if (!tier) return NextResponse.json({ error: 'invalid tier' }, { status: 400 })

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
  const order = await prisma.order.create({
    data: {
      userId,
      amountCents: tier.amountCents,
      credits: tier.credits,
      tier: tier.id,
      provider: DEFAULT_PROVIDER,
      status: 'pending',
      expiresAt,
    },
  })

  const baseUrl = process.env.NEXTAUTH_URL || 'https://gambits.top'

  try {
    const provider = getProvider(DEFAULT_PROVIDER)
    const result = await provider.createOrder({
      orderId: order.id,
      amountCents: tier.amountCents,
      description: `Gambit 积分充值 ${tier.label}`,
      notifyUrl: `${baseUrl}/api/payments/callback/${DEFAULT_PROVIDER}`,
    })

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        providerOrderId: result.providerOrderId,
        qrCodeUrl: result.qrCodeUrl,
        expiresAt: result.expiresAt,
        metadata: result.metadata ? JSON.stringify(result.metadata) : null,
      },
    })

    return NextResponse.json({
      orderId: updated.id,
      qrCodeUrl: updated.qrCodeUrl,
      amountCents: updated.amountCents,
      credits: updated.credits,
      expiresAt: updated.expiresAt,
    })
  } catch {
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'failed' },
    })
    return NextResponse.json({ error: 'create order failed' }, { status: 500 })
  }
}

