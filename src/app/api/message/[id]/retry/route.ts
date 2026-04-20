import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

/**
 * POST /api/message/:id/retry
 * 把 message 状态 reset 到 pending，让前端重新打开 SSE
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const messageId = params.id

    await prisma.message.update({
      where: { id: messageId },
      data: { status: 'pending', content: '' },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[/api/message/retry]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}