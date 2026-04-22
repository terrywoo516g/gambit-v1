import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { dbWrite } from '@/lib/db-queue'
import { getModelByName } from '@/lib/model-registry'
import { streamChat, type Provider } from '@/lib/llm-client'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; runId: string } }
) {
  const run = await prisma.modelRun.findUnique({ where: { id: params.runId } })
  if (!run) {
    return new Response('ModelRun not found', { status: 404 })
  }

  const workspace = await prisma.workspace.findUnique({ where: { id: params.id } })
  if (!workspace) {
    return new Response('Workspace not found', { status: 404 })
  }

  const modelInfo = getModelByName(run.model)
  if (!modelInfo) {
    return new Response('Model not in registry: ' + run.model, { status: 400 })
  }

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

  await dbWrite(() =>
    prisma.modelRun.update({
      where: { id: run.id },
      data: { status: 'running', startedAt: new Date() },
    })
  )

  await dbWrite(() =>
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
            const allDone = allRuns.every(r =>
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
            controller.close()
          }

          if (chunk.type === 'error') {
            await dbWrite(() =>
              prisma.modelRun.update({
                where: { id: run.id },
                data: { status: 'failed', error: chunk.data },
              })
            )
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', data: chunk.data })}\n\n`))
            controller.close()
          }
        }
      } catch (err) {
        console.error('[stream error]', err)
        try {
          await dbWrite(() =>
            prisma.modelRun.update({
              where: { id: run.id },
              data: { status: 'failed', error: String(err) },
            })
          )
        } catch (e) {
          console.error('[stream error] failed to update status:', e)
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', data: String(err) })}\n\n`))
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
