import { prisma } from '@/lib/db'
import { getProvider } from '@/lib/payment/registry'

export async function POST(
  req: Request,
  { params }: { params: { provider: string } }
) {
  if (params.provider === 'mock' && process.env.PAYMENT_PROVIDER !== 'mock') {
    return new Response('not found', { status: 404 })
  }

  let providerInstance
  try {
    providerInstance = getProvider(params.provider)
  } catch {
    return new Response('unknown provider', { status: 404 })
  }

  const body = await req.text()

  let verified
  try {
    verified = await providerInstance.verifyCallback(req.headers, body)
  } catch {
    return new Response('verify failed', { status: 400 })
  }
  if (!verified.valid) return new Response('invalid signature', { status: 400 })

  const order = await prisma.order.findUnique({
    where: { id: verified.orderId },
  })
  if (!order) return new Response('order not found', { status: 404 })

  if (order.amountCents !== verified.amountCents) {
    return new Response('amount mismatch', { status: 400 })
  }

  if (order.status === 'paid') {
    return new Response(providerInstance.ackResponse(), { status: 200 })
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: order.id, status: 'pending' },
      data: {
        status: 'paid',
        paidAt: verified.paidAt,
        providerOrderId: verified.providerOrderId,
      },
    })
    if (updated.count === 0) return

    await tx.user.update({
      where: { id: order.userId },
      data: { credits: { increment: order.credits } },
    })
    await tx.creditTransaction.create({
      data: {
        userId: order.userId,
        amount: order.credits,
        type: 'recharge',
        description: `订单 ${order.id} 充值 ${order.tier}`,
      },
    })
  })

  return new Response(providerInstance.ackResponse(), { status: 200 })
}

