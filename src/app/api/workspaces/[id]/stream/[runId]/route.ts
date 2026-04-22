import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { getModelByName } from '@/lib/model-registry'
import { streamChat, type Provider } from '@/lib/llm-client'

// ============================================================
// SQLite 并发 retry 包装器
// 读操作在有写锁时也会被阻塞（SQLite 默认 journal 模式）
// 所以读和写都需要 retry
// ============================================================
async function retryPrisma<T>(
  fn: () => Promise<T>,
  retries = 5,
  baseDelay = 200
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (err: any) {
      const msg = err?.message || ''
      const code = err?.code || ''
      const isLocked =
        msg.includes('database is locked') ||
        msg.includes('SQLITE_BUSY') ||
        code === 'SQLITE_BUSY' ||
        code === 'P2034'

      if (i === retries - 1 || !isLocked) {
        throw err
      }

      const jitter = Math.random() * 100
      await new Promise(r => setTimeout(r, baseDelay * (i + 1) + jitter))
    }
  }
  throw new Error('retryPrisma exhausted')
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  // 读操作也加 retry，防止被并发写锁阻塞
  const run = await retryPrisma(() =>
    prisma.modelRun.findUnique({ where: { id: params.runId } })
  )
  if (!run) {
    return new Response('ModelRun not found', { status: 404 })
  }

  const workspace = await retryPrisma(() =>
    prisma.workspace.findUnique({ where: { id: params.id } })
  )
  if (!workspace) {
    return new Response('Workspace not found', { status: 404 })
  }

  const modelInfo = getModelByName(run.model)
  if (!modelInfo) {
    return new Response('Model not in registry: ' + run.model, { status: 400 })
  }

  // 如果这个 run 已经完成或失败（比如页面刷新后重连），直接返回已有内容
  if (run.status === 'completed' || run.status === 'failed') {
    const encoder = new TextEncoder()
    const existingStream = new ReadableStream({
      start(controller) {
        if (run.status === 'completed' && run.content) {
          const event = `data: ${JSON.stringify({ type: 'token', data: run.content })}\n\n`
          controller.enqueue(encoder.encode(event))
          const doneEvent = `data: ${JSON.stringify({ type: 'done', data: { tokens: run.tokens || 0 } })}\n\n`
          controller.enqueue(encoder.encode(doneEvent))
        } else {
          const errorEvent = `data: ${JSON.stringify({ type: 'error', data: run.error || 'Previously failed' })}\n\n`
          controller.enqueue(encoder.encode(errorEvent))
        }
        controller.close()
      },
    })
    return new Response(existingStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  }

  // 更新状态为 running
  await retryPrisma(() =>
    prisma.modelRun.update({
      where: { id: run.id },
      data: { status: 'running', startedAt: new Date() },
    })
  )

  await retryPrisma(() =>
    prisma.workspace.update({
      where: { id: workspace.id },
      data: { status: 'running' },
    })
  )

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let fullContent = ''
        let totalTokensIn = 0
        let totalTokensOut = 0

        const messages = [
          { role: 'user' as const, content: workspace.prompt },
        ]

        const providerMap: Record<string, string> = {
          'DeepSeek': 'qiniu',
          'Moonshot': 'qiniu',
          '智谱': 'qiniu',
          '字节跳动': 'qiniu',
          '阿里云': 'qiniu',
          'MiniMax': 'qiniu',
        }

        const provider = providerMap[modelInfo.provider] || 'qiniu'

        for await (const chunk of streamChat({
          provider: provider as Provider,
          model: modelInfo.apiId,
          messages,
        })) {
          if (chunk.type === 'token') {
            fullContent += chunk.data
            const event = `data: ${JSON.stringify({ type: 'token', data: chunk.data })}\n\n`
            controller.enqueue(encoder.encode(event))
          }

          if (chunk.type === 'done') {
            totalTokensIn = chunk.data.tokensIn || 0
            totalTokensOut = chunk.data.tokensOut || 0

            await retryPrisma(() =>
              prisma.modelRun.update({
                where: { id: run.id },
                data: {
                  status: 'completed',
                  content: fullContent,
                  tokens: totalTokensIn + totalTokensOut,
                  completedAt: new Date(),
                },
              })
            )

            const allRuns = await retryPrisma(() =>
              prisma.modelRun.findMany({
                where: { workspaceId: workspace.id },
              })
            )
            const allDone = allRuns.every(r =>
              r.id === run.id ? true : r.status === 'completed' || r.status === 'failed'
            )
            if (allDone) {
              await retryPrisma(() =>
                prisma.workspace.update({
                  where: { id: workspace.id },
                  data: { status: 'completed' },
                })
              )
            }

            const doneEvent = `data: ${JSON.stringify({ type: 'done', data: { tokens: totalTokensIn + totalTokensOut } })}\n\n`
            controller.enqueue(encoder.encode(doneEvent))
            controller.close()
          }

          if (chunk.type === 'error') {
            await retryPrisma(() =>
              prisma.modelRun.update({
                where: { id: run.id },
                data: { status: 'failed', error: chunk.data },
              })
            )
            const errorEvent = `data: ${JSON.stringify({ type: 'error', data: chunk.data })}\n\n`
            controller.enqueue(encoder.encode(errorEvent))
            controller.close()
          }
        }
      } catch (err) {
        console.error('[stream error]', err)
        try {
          await retryPrisma(() =>
            prisma.modelRun.update({
              where: { id: run.id },
              data: { status: 'failed', error: String(err) },
            })
          )
        } catch (retryErr) {
          console.error('[stream error] failed to update status:', retryErr)
        }

        const errorEvent = `data: ${JSON.stringify({ type: 'error', data: String(err) })}\n\n`
        controller.enqueue(encoder.encode(errorEvent))
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
