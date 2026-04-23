import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { streamChat } from '@/lib/llm-client'
import { getModelByName } from '@/lib/model-registry'
import { dbWrite } from '@/lib/db-queue'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const STREAM_TIMEOUT = 60_000 // 60s 无数据超时
const MAX_RETRIES = 1         // 服务端自动重试 1 次

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  const { id: workspaceId, runId } = params

  // ── 1. 并行读取 run 和 workspace ──
  const [run, workspace] = await Promise.all([
    prisma.modelRun.findUnique({ where: { id: runId } }),
    prisma.workspace.findUnique({ where: { id: workspaceId } }),
  ])

  if (!run || !workspace) {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', error: 'Run or workspace not found' })}\n\n`,
      { status: 404, headers: sseHeaders() }
    )
  }

  // ── 2. 已完成 → 直接返回缓存 ──
  if (run.status === 'completed' && run.content) {
    const encoder = new TextEncoder()
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'done', content: run.content, tokens: run.tokens })}\n\n`
        ))
        controller.close()
      }
    })
    return new Response(body, { headers: sseHeaders() })
  }

  // ── 3. 已失败 → 直接返回错误 ──
  if (run.status === 'failed') {
    const encoder = new TextEncoder()
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'error', error: run.error || 'Previous run failed' })}\n\n`
        ))
        controller.close()
      }
    })
    return new Response(body, { headers: sseHeaders() })
  }

  // ── 4. 查模型信息 ──
  const modelInfo = getModelByName(run.model)
  if (!modelInfo) {
    return new Response(
      `data: ${JSON.stringify({ type: 'error', error: `Unknown model: ${run.model}` })}\n\n`,
      { status: 400, headers: sseHeaders() }
    )
  }

  // ── 5. 流式输出（核心修复：closed 守卫 + 异步安全） ──
  const encoder = new TextEncoder()
  let closed = false

  const body = new ReadableStream({
    start(controller) {
      // 核心修复：发送一个 2KB 的空注释，强制冲刷 Nginx/Vercel 等代理服务器的初始缓冲区
      // 防止因为 token 数据太小，一直被代理憋在缓冲区里不发给前端
      try {
        controller.enqueue(encoder.encode(`: ${' '.repeat(2048)}\n\n`))
      } catch {
        // 忽略写入失败
      }

      // 把整个异步流程放在一个立即执行的 async 函数里
      // start 本身同步返回，不会阻塞
      ;(async () => {
        let fullContent = ''
        let tokensIn = 0
        let tokensOut = 0

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            // 通知前端：重试中
            if (attempt > 0) {
              safeSend(controller, { type: 'retry', attempt })
            }

            fullContent = ''
            tokensIn = 0
            tokensOut = 0

            // 带超时的流式调用
            const timeoutCtrl = new AbortController()
            let timer: ReturnType<typeof setTimeout> | null = null

            const resetTimer = () => {
              if (timer) clearTimeout(timer)
              timer = setTimeout(() => {
                timeoutCtrl.abort()
              }, STREAM_TIMEOUT)
            }
            resetTimer()

            const stream = streamChat({
              model: modelInfo.apiId,
              messages: [{ role: 'user', content: workspace.prompt }],
              provider: 'qiniu',
            })

            for await (const chunk of stream) {
              if (closed) return // 客户端断开，直接退出

              if (chunk.type === 'token') {
                resetTimer()
                fullContent += chunk.data
                
                // 确保数据按规范的 SSE 格式发送，并立即加上 flush 注释（如果 Nginx 还是死命缓冲）
                const eventPayload = `data: ${JSON.stringify({ type: 'token', data: chunk.data })}\n\n`
                controller.enqueue(encoder.encode(eventPayload))
                // 附加换行符，有时候能帮助冲刷缓冲区
                controller.enqueue(encoder.encode('\n'))

              } else if (chunk.type === 'done') {
                tokensIn = chunk.data.tokensIn ?? 0
                tokensOut = chunk.data.tokensOut ?? 0
              } else if (chunk.type === 'error') {
                throw new Error(chunk.data || 'Stream error from LLM')
              }
            }

            if (timer) clearTimeout(timer)

            // 成功完成

            // 发送 done 事件
            safeSend(controller, {
              type: 'done',
              content: fullContent,
              tokens: tokensIn + tokensOut,
            })

            // 异步更新数据库（不阻塞客户端）
            dbWrite(async () => {
              await prisma.modelRun.update({
                where: { id: runId },
                data: {
                  status: 'completed',
                  content: fullContent,
                  tokens: (tokensIn || 0) + (tokensOut || 0),
                  completedAt: new Date(),
                },
              })
              // 检查是否全部完成
              const allRuns = await prisma.modelRun.findMany({
                where: { workspaceId },
              })
              const allDone = allRuns.every(
                (r: { status: string }) => r.status === 'completed' || r.status === 'failed'
              )
              if (allDone) {
                await prisma.workspace.update({
                  where: { id: workspaceId },
                  data: { status: 'completed' },
                })
              }
            }).catch((e) => console.error('[db update error]', e))

            break // 成功，退出重试循环

          } catch (err: any) {
            const isLastAttempt = attempt >= MAX_RETRIES
            console.error(
              `[stream attempt ${attempt + 1}/${MAX_RETRIES + 1}] ${run.model}:`,
              err?.message || err
            )

            if (isLastAttempt) {
              // 最后一次也失败了
              safeSend(controller, {
                type: 'error',
                error: err?.message || 'Stream failed after retries',
              })

              dbWrite(async () => {
                await prisma.modelRun.update({
                  where: { id: runId },
                  data: {
                    status: 'failed',
                    error: err?.message || 'Unknown error',
                  },
                })
                const allRuns = await prisma.modelRun.findMany({
                  where: { workspaceId },
                })
                const allDone = allRuns.every(
                  (r: { status: string }) => r.status === 'completed' || r.status === 'failed'
                )
                if (allDone) {
                  await prisma.workspace.update({
                    where: { id: workspaceId },
                    data: { status: 'completed' },
                  })
                }
              }).catch((e) => console.error('[db update error]', e))
            }
            // 非最后一次 → 循环继续重试
          }
        }

        // 关闭流
        if (!closed) {
          closed = true
          try { controller.close() } catch {}
        }
      })()
    },

    cancel() {
      // 客户端主动断开时触发
      closed = true
    },
  })

  return new Response(body, { headers: sseHeaders() })

  // ── 工具函数 ──
  function safeSend(
    controller: ReadableStreamDefaultController,
    data: Record<string, any>
  ) {
    if (closed) return
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
    } catch (e) {
      console.error('[stream send error]', e)
      closed = true
    }
  }
}

function sseHeaders() {
  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
    'Content-Encoding': 'none',
  }
}
