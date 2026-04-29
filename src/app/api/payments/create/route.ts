import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/db'
import { getTier } from '@/lib/payment/tiers'
import { getPaymentProvider } from '@/lib/payments'

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

  const tier = body.tierId ? getTier(body.tierId) : undefined
  const amountCents = tier?.amountCents ?? Number(body.amountCents)
  const credits = tier?.credits ?? Number(body.credits)
  const tierId = tier?.id ?? 'custom'
  const description = String(body.description || (tier ? `Gambit 积分充值 ${tier.label}` : 'Gambit 积分充值'))

  if (!Number.isInteger(amountCents) || amountCents <= 0 || !Number.isInteger(credits) || credits <= 0) {
    return NextResponse.json({ error: 'invalid payment params' }, { status: 400 })
  }

  const providerName = process.env.PAYMENT_PROVIDER || 'mock'
  const provider = getPaymentProvider(providerName)
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000)
  const order = await prisma.order.create({
    data: {
      userId,
      amountCents,
      credits,
      tier: tierId,
      provider: provider.name,
      status: 'pending',
      expiresAt,
    },
  })

  const baseUrl = process.env.NEXTAUTH_URL || 'https://gambits.top'

  try {
    const result = await provider.createPayment({
      orderId: order.id,
      amountCents,
      description,
      userId,
      notifyUrl: `${baseUrl}/api/payments/callback/${provider.name}`,
      returnUrl: `${baseUrl}/recharge?paid=1`,
    })

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: {
        providerOrderId: result.providerOrderId,
        qrCodeUrl: result.payUrl,
        metadata: result.raw ? JSON.stringify(result.raw) : null,
      },
    })

    return NextResponse.json({
      orderId: updated.id,
      payUrl: result.payUrl,
      qrCodeUrl: updated.qrCodeUrl,
      amountCents: updated.amountCents,
      credits: updated.credits,
      expiresAt: updated.expiresAt,
    })
  } catch (error) {
    console.error('create payment failed', error)
    await prisma.order.update({
      where: { id: order.id },
      data: { status: 'failed' },
    })
    return NextResponse.json({ error: 'create order failed' }, { status: 500 })
  }
}
