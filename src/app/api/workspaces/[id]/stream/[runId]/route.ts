import { NextRequest } from 'next/server'
import { streamChat } from '@/lib/llm-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { PRICING } from '@/lib/billing/pricing'
import { chargeCredits } from '@/lib/billing/withCreditsCharge'
import { assertModelRunOwnership, OwnershipError } from '@/lib/auth/ownership'

export async function POST(req: NextRequest, { params }: { params: { id: string; runId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

    const workspaceId = params.id
    const runId = params.runId

    let modelRun
    let workspace
    try {
      const ownership = await assertModelRunOwnership(runId, userId)
      modelRun = ownership.modelRun
      workspace = ownership.workspace
      if (modelRun.workspaceId !== workspaceId) {
        return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
      }
    } catch (e) {
      if (e instanceof OwnershipError) return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
      throw e
    }

    const chargeRes = await chargeCredits(userId, PRICING.STREAM_SINGLE, 'consume_stream_single', 'stream single')
    if (chargeRes) return chargeRes

    const promptContent = workspace.prompt || modelRun.content || ''

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