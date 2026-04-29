import { NextRequest, NextResponse } from 'next/server'
import { chatOnce } from '@/lib/llm-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/db'
import { PRICING } from '@/lib/billing/pricing'
import { chargeCredits } from '@/lib/billing/withCreditsCharge'
import { assertWorkspaceOwnership, OwnershipError } from '@/lib/auth/ownership'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const workspaceId = params.id
    let workspace
    try {
      workspace = await assertWorkspaceOwnership(workspaceId, userId)
    } catch (e) {
      if (e instanceof OwnershipError) return NextResponse.json({ error: 'not found' }, { status: 404 })
      throw e
    }

    let body
    try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

    const { prompt } = body || {}
    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'prompt required' }, { status: 400 })
    }

    const chargeRes = await chargeCredits(userId, PRICING.OBSERVER, 'consume_observer', 'observer')
    if (chargeRes) return chargeRes

    const modelRuns = await prisma.modelRun.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    const summaryPrompt = '用户问题：' + workspace.prompt + '\n\nAI 回答摘要：\n' + modelRuns.map((r, i) => '模型 ' + (i + 1) + ': ' + r.content.substring(0, 200)).join('\n\n') + '\n\n旁观者视角分析：' + prompt

    const result = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [{ role: 'user', content: summaryPrompt }]
    })

    return NextResponse.json({ result })
  } catch (error) {
    console.error('[observer]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}