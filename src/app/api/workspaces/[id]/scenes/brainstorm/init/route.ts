import { NextRequest, NextResponse } from 'next/server'
import { chatOnce } from '@/lib/llm-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
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

    const { sceneType = 'brainstorm' } = body || {}

    const chargeRes = await chargeCredits(userId, PRICING.SCENE_BRAINSTORM, 'consume_scene_brainstorm', 'scene brainstorm init')
    if (chargeRes) return chargeRes

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
