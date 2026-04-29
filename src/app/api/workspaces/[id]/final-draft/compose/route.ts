import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { streamChat } from '@/lib/llm-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { PRICING } from '@/lib/billing/pricing'
import { chargeCredits } from '@/lib/billing/withCreditsCharge'
import { assertWorkspaceOwnership, OwnershipError } from '@/lib/auth/ownership'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

    const workspaceId = params.id

    try {
      await assertWorkspaceOwnership(workspaceId, userId)
    } catch (e) {
      if (e instanceof OwnershipError) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
      throw e
    }

    let body
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400 })
    }

    const { blockIds, instruction = '' } = body || {}

    if (!blockIds || !Array.isArray(blockIds) || blockIds.length === 0) {
      return new Response(JSON.stringify({ error: 'No blocks selected' }), { status: 400 })
    }

    const chargeRes = await chargeCredits(
      userId,
      PRICING.FINAL_DRAFT_COMPOSE,
      'consume_final_draft_compose',
      `final-draft 综合拼装 (workspace ${workspaceId})`
    )
    if (chargeRes) return chargeRes

    const blocks = await prisma.finalDraftBlock.findMany({
      where: { workspaceId: params.id, id: { in: blockIds } },
    })

    const blocksText = blocks.map((b: any) => `[${b.sourceLabel}]\n${b.content}`).join('\n---\n')

    const prompt = `请把以下素材组合成一篇连贯文稿：\n\n${blocksText}\n\n${instruction ? `附加要求：${instruction}` : ''}`

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`))
        }

        const chatStream = streamChat({
          provider: 'qiniu',
          model: 'deepseek/deepseek-v3.2-251201',
          messages: [
            { role: 'system', content: '你是专业的文案整合助手。输出整合成的文本，不要有多余的废话和说明。' },
            { role: 'user', content: prompt }
          ]
        })

        for await (const chunk of chatStream) {
          if (chunk.type === 'token') {
            sendEvent('delta', { text: chunk.data })
          } else if (chunk.type === 'error') {
            sendEvent('error', { message: chunk.data })
          }
        }

        sendEvent('done', {})
        controller.close()
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('[final-draft/compose]', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  }
}