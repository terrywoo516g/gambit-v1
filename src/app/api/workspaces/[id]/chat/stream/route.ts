import { NextRequest } from 'next/server'
import { streamChat } from '@/lib/llm-client'
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
    if (!userId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

    const workspaceId = params.id
    try {
      await assertWorkspaceOwnership(workspaceId, userId)
    } catch (e) {
      if (e instanceof OwnershipError) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
      throw e
    }

    let body
    try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400 }) }

    const { message, referencedRunIds = [] } = body || {}
    if (typeof message !== 'string' || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'message required' }), { status: 400 })
    }

    const chargeRes = await chargeCredits(userId, PRICING.CHAT_STREAM, 'consume_chat_stream', 'chat stream')
    if (chargeRes) return chargeRes

    const chatMessages = referencedRunIds.length > 0
      ? await prisma.chatMessage.findMany({
          where: { workspaceId },
          orderBy: { createdAt: 'asc' },
        })
      : []

    const filteredMessages = referencedRunIds.length > 0
      ? chatMessages.filter(m => {
          try {
            const refs = JSON.parse(m.referencedRunIds || '[]')
            return referencedRunIds.some((rid: string) => refs.includes(rid))
          } catch { return false }
        })
      : []

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: any) => {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type, ...data }) + '\n\n'))
        }
        try {
          const chatStream = streamChat({
            provider: 'qiniu',
            model: 'deepseek/deepseek-v3.2-251201',
            messages: [
              ...filteredMessages.map((m: any) => ({ role: m.role, content: m.content })),
              { role: 'user', content: message }
            ]
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