import { NextRequest } from 'next/server'
import { streamChat } from '@/lib/llm-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/db'
import { consumeCredits, InsufficientCreditsError } from '@/lib/billing/credits'
import { PRICING } from '@/lib/billing/pricing'
import { insufficientCreditsResponse } from '@/lib/billing/errors'

export async function POST(req: NextRequest, { params }: { params: { id: string; runId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

    const workspaceId = params.id
    const runId = params.runId

    const modelRun = await prisma.modelRun.findUnique({
      where: { id: runId },
      include: { workspace: true },
    })

    if (!modelRun || modelRun.workspace.userId !== userId || modelRun.workspaceId !== workspaceId) {
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    }

    try {
      await consumeCredits(userId, PRICING.STREAM_SINGLE, 'consume_stream_single', 'stream single')
    } catch (e) {
      if (e instanceof InsufficientCreditsError) return insufficientCreditsResponse(e)
      throw e
    }

    const promptContent = modelRun.workspace.prompt || modelRun.content || ''

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: any) => {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type, ...data }) + '\n\n'))
        }
        try {
          const chatStream = streamChat({
            provider: 'qiniu',
            model: modelRun.model,
            messages: [{ role: 'user', content: promptContent }]
          })
          for await (const chunk of chatStream) {
            if (chunk.type === 'token') sendEvent('delta', { text: chunk.data })
            else if (chunk.type === 'error') sendEvent('error', { message: chunk.data })
          }
        } catch {
          sendEvent('error', { message: 'Stream error' })
        }
        sendEvent('done', {})
        controller.close()
      }
    })
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } })
  } catch (error) {
    console.error('Stream API Error:', error)
    return new Response('Internal error', { status: 500 })
  }
}