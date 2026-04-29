import { prisma } from '@/lib/db'
import { getPaymentProvider } from '@/lib/payments'

function textResponse(body: string, status = 200) {
  return new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}

async function parseCallbackBody(req: Request, providerName: string): Promise<Record<string, string>> {
  if (providerName === 'huipijiao') {
    const form = await req.formData()
    const body: Record<string, string> = {}
    form.forEach((value, key) => {
      body[key] = String(value)
    })
    return body
  }

  const json = await req.json()
  const body: Record<string, string> = {}
  for (const [key, value] of Object.entries(json || {})) {
    body[key] = String(value)
  }
  return body
}

export async function POST(
  req: Request,
  { params }: { params: { provider: string } }
) {
  const providerName = params.provider
  let provider
  try {
    provider = getPaymentProvider(providerName)
  } catch {
    return textResponse('fail', providerName === 'huipijiao' ? 503 : 404)
  }

  let body: Record<string, string>
  try {
    body = await parseCallbackBody(req, provider.name)
  } catch {
    return textResponse('fail', 400)
  }

  const verified = await provider.verifyCallback({ body })
  if (!verified.ok || !verified.orderId || !verified.amountCents) {
    return textResponse('fail', 400)
  }

  const order = await prisma.order.findUnique({ where: { id: verified.orderId } })
  if (!order) return textResponse('fail', 400)
  if (order.provider !== provider.name) return textResponse('fail', 400)
  if (order.amountCents !== verified.amountCents) return textResponse('fail', 400)

  if (order.status !== 'pending') {
    return textResponse(provider.successResponseText())
  }

  await prisma.$transaction(async (tx) => {
    const updated = await tx.order.updateMany({
      where: { id: order.id, status: 'pending' },
      data: {
        status: 'paid',
        paidAt: new Date(),
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

  return textResponse(provider.successResponseText())
}
