import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { streamChat } from '@/lib/llm-client'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest
) {
  const { sessionId, userMessage } = await req.json()

  const session = await prisma.sceneSession.findUnique({
    where: { id: sessionId },
    include: { workspace: { include: { modelRuns: true } } },
  })

  if (!session) return new Response('Session not found', { status: 404 })

  const selectedIds = JSON.parse(session.userSelections)
  const targetRuns = session.workspace.modelRuns.filter((r: any) => selectedIds.includes(r.id))

  const context = targetRuns.map((r: any) => `--- ${r.model} ---\n${r.content}`).join('\n\n')
  const prompt = `You are a helpful AI assistant summarizing or combining multiple AI models' answers.
Here are the original answers from different models to the prompt: "${session.workspace.prompt}"

${context}

User's new request: "${userMessage}"

Please fulfill the user's request using the context above. Use markdown formatting. Do not mention "model X said" unless necessary.`

  const stream = streamChat({
    model: 'deepseek-v3-2-251201',
    messages: [{ role: 'user', content: prompt }],
    provider: 'qiniu',
  })

  const encoder = new TextEncoder()
  const body = new ReadableStream({
    async start(controller) {
      let fullContent = ''
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'token') {
            fullContent += chunk.data
            controller.enqueue(encoder.encode(chunk.data))
          }
        }
        
        // Save final draft
        await prisma.finalDraft.create({
          data: {
            sceneSessionId: sessionId,
            content: fullContent,
          }
        })
      } catch (err) {
        console.error('Chat generate stream error:', err)
      } finally {
        controller.close()
      }
    }
  })

  return new Response(body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
