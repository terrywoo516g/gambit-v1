import { NextRequest } from 'next/server'
import { streamChat } from '@/lib/llm-client'

export async function POST(req: NextRequest) {
  try {
    const { text, instruction = '' } = await req.json()
    if (!text) return new Response(JSON.stringify({ error: 'Text required' }), { status: 400 })

    const prompt = `请对以下文本进行润色：\n\n${text}\n\n${instruction ? `润色要求：${instruction}` : ''}`

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
