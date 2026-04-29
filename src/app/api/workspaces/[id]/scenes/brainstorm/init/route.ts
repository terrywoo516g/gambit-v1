import { NextRequest, NextResponse } from 'next/server'
import { chatOnce } from '@/lib/llm-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/db'
import { consumeCredits, InsufficientCreditsError } from '@/lib/billing/credits'
import { PRICING } from '@/lib/billing/pricing'
import { insufficientCreditsResponse } from '@/lib/billing/errors'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const workspaceId = params.id
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (!workspace || workspace.userId !== userId) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    let body
    try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

    const { sceneType = 'brainstorm' } = body || {}

    try {
      await consumeCredits(userId, PRICING.SCENE_BRAINSTORM, 'consume_scene_brainstorm', 'scene brainstorm init')
    } catch (e) {
      if (e instanceof InsufficientCreditsError) return insufficientCreditsResponse(e)
      throw e
    }

    const initPrompt = '用户问题：' + workspace.prompt + '\n\n请生成头脑风暴场景的初始问题和选项推荐。'

    const result = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [{ role: 'user', content: initPrompt }]
    })

    return NextResponse.json({ result, sceneType })
  } catch (error) {
    console.error('[brainstorm/init]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
