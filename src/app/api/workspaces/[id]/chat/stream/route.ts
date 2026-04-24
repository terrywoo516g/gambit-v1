import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { streamChat } from '@/lib/llm-client'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { message, referencedRunIds = [] } = await req.json()
    if (!message) {
      return new Response(JSON.stringify({ error: 'Message is required' }), { status: 400 })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...data })}\n\n`))
        }

        const workspace = await prisma.workspace.findUnique({
          where: { id: params.id },
          include: {
            modelRuns: { where: { status: 'completed' } },
            chatMessages: { orderBy: { createdAt: 'desc' } },
          },
        })

        if (!workspace) {
          sendEvent('error', { message: 'Workspace not found' })
          controller.close()
          return
        }

        const userMessageCount = workspace.chatMessages.filter(m => m.role === 'user').length

        if (userMessageCount >= 4) {
          sendEvent('limit', { message: '已达 4 轮对话上限，建议开新窗口' })
          controller.close()
          return
        }

        // 1. Save user message
        await prisma.chatMessage.create({
          data: {
            id: uuidv4(),
            workspaceId: workspace.id,
            role: 'user',
            content: message,
            referencedRunIds: JSON.stringify(referencedRunIds),
          },
        })

        // 2. Build prompt
        const filteredRuns = referencedRunIds.length > 0
          ? workspace.modelRuns.filter((r: { id: string }) => referencedRunIds.includes(r.id))
          : workspace.modelRuns

        const runsContext = filteredRuns.map((r: { model: string; content: string }) => `【${r.model}】：\n${r.content}`).join('\n\n')
        
        const systemPrompt = `你是 Gambit 的对话助手。用户在多模型工作台中提问，下面是各 AI 卡片的回答和历史对话，基于这些内容回答用户的新问题。`
        
        let userContext = `【初始问题】：${workspace.prompt}\n\n`
        if (runsContext) {
          userContext += `【AI 卡片的回答】：\n${runsContext}\n\n`
        }

        // Re-order messages to ascending
        const history = workspace.chatMessages.reverse().map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n')
        if (history) {
          userContext += `【历史对话】：\n${history}\n\n`
        }

        userContext += `【用户的新问题】：${message}`

        // 3. Call LLM
        // 这里根据需求写死使用 DeepSeek 进行独立对话
        const targetProvider: 'qiniu' | 'volcano' | 'dmxapi' = 'qiniu'
        const targetModelId = 'deepseek/deepseek-v3.2-251201'

        let fullResponse = ''
        const chatStream = streamChat({
          provider: targetProvider,
          model: targetModelId,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContext }
          ]
        })

        for await (const chunk of chatStream) {
          if (chunk.type === 'token') {
            fullResponse += chunk.data
            sendEvent('delta', { text: chunk.data })
          } else if (chunk.type === 'error') {
            sendEvent('error', { message: chunk.data })
          }
        }

        // 4. Save assistant message
        const assistantMsgId = uuidv4()
        await prisma.chatMessage.create({
          data: {
            id: assistantMsgId,
            workspaceId: workspace.id,
            role: 'assistant',
            content: fullResponse,
            // 我们可以在这里利用一个隐藏字段或拼接到content前面记录来源，
            // 更好的方式是改变 schema 增加 sourceModel 字段。
            // 但为了兼容，我们将模型名称作为发送方存储到某种标记里或暂时不用。
          },
        })

        sendEvent('done', { messageId: assistantMsgId })
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
  } catch (err) {
    console.error('[chat/stream]', err)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 })
  }
}
