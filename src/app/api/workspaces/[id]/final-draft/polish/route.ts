import { NextRequest } from 'next/server'
import { streamChat } from '@/lib/llm-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/db'
import { consumeCredits, InsufficientCreditsError } from '@/lib/billing/credits'
import { PRICING } from '@/lib/billing/pricing'
import { insufficientCreditsResponse } from '@/lib/billing/errors'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

    let body
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400 })
    }

    const { text, instruction = '', workspaceId } = body || {}
    if (typeof text !== 'string' || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Text required' }), { status: 400 })
    }
    if (typeof workspaceId !== 'string' || workspaceId.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'workspaceId required' }), { status: 400 })
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId }
    })
    if (!workspace || workspace.userId !== userId) {
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    }

    try {
      await consumeCredits(
        userId,
        PRICING.FINAL_DRAFT_POLISH,
        'consume_final_draft_polish',
        `final-draft 润色 (workspace ${workspaceId})`
      )
    } catch (e) {
      if (e instanceof InsufficientCreditsError) return insufficientCreditsResponse(e)
      throw e
    }

    const prompt = `请对以下文本进行润色：\n\n${text}\n\n${instruction ? `润色要求：${instruction}` : ''}`

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`))
        }

        const chatStream = streamChat({
          provider: 'qiniu',
          model: 'deepseek/deepseek-v3.2-25120',
          messages: [
            { role: 'system', content: '你是专业的文本润色助手。只输出润色后的内容，不包含多余废话。' },
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
    console.error('[final-draft/polish]', error)
    return new Response(JSON.stringify({ error: 'Internal error' }), { status: 500 })
  }
}