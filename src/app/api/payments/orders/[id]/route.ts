import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/db'

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let order = await prisma.order.findUnique({ where: { id: params.id } })
  if (!order) return NextResponse.json({ error: 'not found' }, { status: 404 })
  if (order.userId !== userId) return NextResponse.json({ error: 'not found' }, { status: 404 })

  if (order.status === 'pending' && order.expiresAt < new Date()) {
    order = await prisma.order.update({
      where: { id: order.id },
      data: { status: 'expired' },
    })
  }

  return NextResponse.json({
    id: order.id,
    amountCents: order.amountCents,
    credits: order.credits,
    tier: order.tier,
    provider: order.provider,
    status: order.status,
    qrCodeUrl: order.qrCodeUrl,
    createdAt: order.createdAt,
    paidAt: order.paidAt,
    expiresAt: order.expiresAt,
  })
}

