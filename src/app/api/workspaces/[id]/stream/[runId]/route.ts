import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { dbWrite } from '@/lib/db-queue'
import { getModelByName } from '@/lib/model-registry'
import { streamChat, type Provider, type StreamChunk } from '@/lib/llm-client'

const STREAM_TIMEOUT = 60_000 // 60 秒无 token 则超时
const MAX_RETRIES = 1

async function* streamWithTimeout(
  opts: Parameters<typeof streamChat>[0],
  timeoutMs: number
): AsyncGenerator<StreamChunk> {
  let timer: ReturnType<typeof setTimeout> | null = null
  let timedOut = false

  const resetTimer = () => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { timedOut = true }, timeoutMs)
  }

  resetTimer()

  try {
    for await (const chunk of streamChat(opts)) {
      if (timedOut) {
        yield { type: 'error', data: 'Stream timeout: no data received for 60s' }
        return
      }
      resetTimer()
      yield chunk
    }
  } finally {
    if (timer) clearTimeout(timer)
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  const [run, workspace] = await Promise.all([
    prisma.modelRun.findUnique({ where: { id: params.runId } }),
    prisma.workspace.findUnique({ where: { id: params.id } }),
  ])

  if (!run) return new Response('ModelRun not found', { status: 404 })
  if (!workspace) return new Response('Workspace not found', { status: 404 })

  const modelInfo = getModelByName(run.model)
  if (!modelInfo) return new Response('Model not in registry: ' + run.model, { status: 400 })

  // 已完成/已失败的直接返回缓存
  if (run.status === 'completed' || run.status === 'failed') {
    const encoder = new TextEncoder()
    const existingStream = new ReadableStream({
      start(controller) {
        if (run.status === 'completed' && run.content) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', data: run.content })}\n\n`))
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', data: { tokens: run.tokens || 0 } })}\n\n`))
        } else {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', data: run.error || 'Previously failed' })}\n\n`))
        }
        controller.close()
      },
    })
    return new Response(existingStream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      let attempt = 0
      let success = false

      while (attempt <= MAX_RETRIES && !success) {
        try {
          let fullContent = ''
          let totalTokensIn = 0
          let totalTokensOut = 0
          let gotError = false

          if (attempt > 0) {
            // 重试时通知前端
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'retry', data: { attempt } })}\n\n`))
          }

          for await (const chunk of streamWithTimeout({
            provider: 'qiniu' as Provider,
            model: modelInfo.apiId,
            messages: [{ role: 'user' as const, content: workspace.prompt }],
          }, STREAM_TIMEOUT)) {

            if (chunk.type === 'token') {
              fullContent += chunk.data
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'token', data: chunk.data })}\n\n`))
            }

            if (chunk.type === 'done') {
              totalTokensIn = chunk.data.tokensIn || 0
              totalTokensOut = chunk.data.tokensOut || 0

              await dbWrite(() =>
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

              const allRuns = await prisma.modelRun.findMany({
                where: { workspaceId: workspace.id },
              })
              const allDone = allRuns.every((r: { id: string; status: string }) =>
                r.id === run.id ? true : r.status === 'completed' || r.status === 'failed'
              )
              if (allDone) {
                await dbWrite(() =>
                  prisma.workspace.update({
                    where: { id: workspace.id },
                    data: { status: 'completed' },
                  })
                )
              }

              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done', data: { tokens: totalTokensIn + totalTokensOut } })}\n\n`))
              success = true
            }

            if (chunk.type === 'error') {
              gotError = true
              console.error(`[stream] ${run.model} attempt ${attempt + 1} error: ${chunk.data}`)

              if (attempt < MAX_RETRIES) {
                // 还有重试机会，不发 error 给前端，进入下一轮
                break
              } else {
                // 重试用完，标记失败
                await dbWrite(() =>
                  prisma.modelRun.update({
                    where: { id: run.id },
                    data: { status: 'failed', error: chunk.data },
                  })
                )
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', data: chunk.data })}\n\n`))
                success = true // 退出循环（虽然是失败，但流程结束了）
              }
            }
          }

          if (!gotError && !success) {
            // stream 正常结束但没收到 done（异常情况）
            success = true
          }

        } catch (err) {
          console.error(`[stream] ${run.model} attempt ${attempt + 1} exception:`, err)

          if (attempt >= MAX_RETRIES) {
            try {
              await dbWrite(() =>
                prisma.modelRun.update({
                  where: { id: run.id },
                  data: { status: 'failed', error: String(err) },
                })
              )
            } catch (e) {
              console.error('[stream] failed to update status:', e)
            }
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', data: String(err) })}\n\n`))
            success = true
          }
        }

        attempt++
      }

      controller.close()
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