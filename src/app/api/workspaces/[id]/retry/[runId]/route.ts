import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  try {
    await prisma.modelRun.update({
      where: { id: params.runId },
      data: {
        status: 'running',
        content: '',
        error: null,
        tokens: null,
        startedAt: new Date(),
        completedAt: null,
      },
    })

    await prisma.workspace.update({
      where: { id: params.id },
      data: { status: 'running' },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[retry]', err)
    return NextResponse.json({ error: 'Retry failed' }, { status: 500 })
  }
}