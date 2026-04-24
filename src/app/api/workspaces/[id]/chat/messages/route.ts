import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { workspaceId: params.id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('[chat/messages]', error)
    return NextResponse.json({ error: 'Failed to load messages' }, { status: 500 })
  }
}
