import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { streamChat, MODEL_REGISTRY } from '@/lib/llm-client'
import { DEFAULT_CHAT_SYSTEM } from '@/prompts/default-chat'
import {
  DIVERGE_AGGRESSIVE_SYSTEM,
  DIVERGE_CONSERVATIVE_SYSTEM,
  DIVERGE_PRAGMATIC_SYSTEM,
} from '@/prompts/diverge'
import { SYNTHESIZE_SYSTEM } from '@/prompts/synthesize'

type RoleConfig = { modelId: string; provider: 'qiniu'; systemPrompt: string }

const ROLE_CONFIG: Record<string, RoleConfig> = {
  '分歧官-激进': {
    modelId: 'moonshotai/kimi-k2.5',
    provider: 'qiniu',
    systemPrompt: DIVERGE_AGGRESSIVE_SYSTEM,
  },
  '分歧官-稳健': {
    modelId: 'z-ai/glm-4.7',
    provider: 'qiniu',
    systemPrompt: DIVERGE_CONSERVATIVE_SYSTEM,
  },
  '分歧官-务实': {
    modelId: 'doubao-seed-1.6',
    provider: 'qiniu',
    systemPrompt: DIVERGE_PRAGMATIC_SYSTEM,
  },
  合成官: {
    modelId: 'deepseek-r1',
    provider: 'qiniu',
    systemPrompt: SYNTHESIZE_SYSTEM,
  },
}

/**
 * GET /api/stream/:messageId
 * SSE 流：前端按 messageId 订阅，接收单个 AI 的流式 token。
 *
 * Events:
 *   data: {"type":"token","data":"..."}
 *   data: {"type":"done","data":{"tokensIn":N,"tokensOut":N,"latency":N,"cost":N}}
 *   data: {"type":"error","data":"error message"}
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { messageId: string } }
) {
  const { messageId } = params

  // 查 message 拿 modelId 和所属 workspace 历史
  const message = await prisma.message.findUnique({ where: { id: messageId } })
  if (!message) {
    return new Response('Message not found', { status: 404 })
  }
  if (!message.modelId) {
    return new Response('Message has no modelId', { status: 400 })
  }

  const roleConfig = ROLE_CONFIG[message.modelId]
  const registry = roleConfig ?? MODEL_REGISTRY[message.modelId]
  if (!registry) {
    return new Response(`Unknown model: ${message.modelId}`, { status: 400 })
  }
  const systemPrompt = roleConfig?.systemPrompt ?? DEFAULT_CHAT_SYSTEM

  // 拉取 workspace 内的对话历史（最近 20 条 user/ai 消息作为上下文）
  const history = await prisma.message.findMany({
    where: {
      workspaceId: message.workspaceId,
      role: { in: ['user', 'ai'] },
      status: 'done',
    },
    orderBy: { createdAt: 'asc' },
    take: 20,
  })

  const contextMessages = history.map((m) => ({
    role: (m.role === 'ai' ? 'assistant' : 'user') as 'user' | 'assistant',
    content: m.content,
  }))

  // 更新状态 → streaming
  await prisma.message.update({
    where: { id: messageId },
    data: { status: 'streaming' },
  })

  // 创建 SSE 响应流
  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder()

      function send(obj: object) {
        controller.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`))
      }

      let fullContent = ''

      try {
        for await (const chunk of streamChat({
          model: registry.modelId,
          provider: registry.provider,
          messages: [
            { role: 'system', content: systemPrompt },
            ...contextMessages,
          ],
          messageId,
        })) {
          send(chunk)

          if (chunk.type === 'token') {
            fullContent += chunk.data
          }

          if (chunk.type === 'done') {
            // 落库：写入完整内容 + 更新状态 + 记录 token 数
            await prisma.message.update({
              where: { id: messageId },
              data: {
                content: fullContent,
                status: 'done',
                tokens: chunk.data.tokensIn + chunk.data.tokensOut,
                cost: chunk.data.cost,
              },
            })
            controller.close()
            return
          }

          if (chunk.type === 'error') {
            await prisma.message.update({
              where: { id: messageId },
              data: { status: 'failed' },
            })
            controller.close()
            return
          }
        }
      } catch (err) {
        console.error('[SSE stream error]', err)
        send({ type: 'error', data: 'Stream failed' })
        await prisma.message.update({
          where: { id: messageId },
          data: { status: 'failed' },
        })
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
