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

    const chargeRes = await chargeCredits(userId, PRICING.RECOMMEND_SCENE, 'consume_recommend_scene', 'recommend scene')
    if (chargeRes) return chargeRes

    const modelRuns = await prisma.modelRun.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    })

    const prompt = '用户问题：' + workspace.prompt + '\n\n已有 ' + modelRuns.length + ' 个AI回答。\n\n请推荐最适合下一步的场景类型（brainstorm/compose/review/compare），并说明理由。'

    const result = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [{ role: 'user', content: prompt }]
    })

    return NextResponse.json({ recommendation: result })
  } catch (error) {
    console.error('[recommend-scene]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
