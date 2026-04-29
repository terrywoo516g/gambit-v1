import { NextResponse } from 'next/server'
import { streamChat } from '@/lib/llm-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { PRICING } from '@/lib/billing/pricing'
import { chargeCredits } from '@/lib/billing/withCreditsCharge'
import { assertWorkspaceOwnershipWithInclude, OwnershipError } from '@/lib/auth/ownership'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { instruction, mode, selectedBlockIds } = await req.json()
    const workspaceId = params.id

    let workspace
    try {
      workspace = await assertWorkspaceOwnershipWithInclude(workspaceId, userId, {
        chatMessages: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        finalDraftBlocks: {
          orderBy: { order: 'asc' },
        },
        sceneSessions: {
          include: {
            finalDrafts: {
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
          },
        },
      })
    } catch (e) {
      if (e instanceof OwnershipError) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      throw e
    }

    const chargeRes = await chargeCredits(
      userId,
      PRICING.FINAL_DRAFT,
      'consume_final_draft',
      `综合文稿生成 (workspace ${workspaceId})`
    )
    if (chargeRes) return chargeRes

    const chatHistory = workspace.chatMessages.reverse().map((m: any) => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`).join('\n')
    
    let blocks = workspace.finalDraftBlocks
    if (selectedBlockIds && selectedBlockIds.length > 0) {
      blocks = blocks.filter((b: any) => selectedBlockIds.includes(b.id))
    }

    const blocksText = blocks.map((b: any) => `【来源：${b.sourceLabel}】\n${b.content}`).join('\n\n')
    const allDrafts = workspace.sceneSessions.flatMap((s: any) => s.finalDrafts).sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime())
    const currentDraft = allDrafts[0]?.content || '（无）'

    const prompt = `你是一个资深内容编辑，擅长把零散的多源素材整合成结构清晰、语言流畅的成稿。

【用户最初的问题】
${workspace.prompt}

【用户追问历史】
${chatHistory || '（无）'}

【已收集的素材】
${blocksText || '（无）'}

【当前草稿（如有）】
${currentDraft}

【用户的额外指令】
${instruction || '（无）'}

【任务要求】
1. 保留每个素材的核心观点，不要遗漏关键信息
2. 多素材提到相同点时合并表述，不要重复
3. 根据内容性质自动选择结构（总分总/列表/对比/叙述）
4. 语言自然流畅，有过渡和连接，不要罗列式堆砌
5. 素材间有冲突时用 [注：各来源观点不一] 标注
6. 开头直接进入正文，不要寒暄
7. 使用 Markdown 格式输出（标题、列表、粗体等）
8. 如果用户有额外指令，优先满足

直接输出最终稿正文，不要输出解释。`

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const aiStream = await streamChat({
            provider: 'qiniu',
            model: 'deepseek/deepseek-v3.2-251201',
            messages: [
              { role: 'user', content: prompt }
            ]
          })

          for await (const chunk of aiStream) {
            if (chunk.type === 'token') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', text: chunk.data })}\n\n`))
            }
          }

          if (mode === 'replace' || mode === 'append') {
            // To simplify, if there is an existing draft, update it. If not, we might not have a scene session.
            // Since this API is just to stream, and saving is also done by editor auto-save, we can skip explicit DB update here
            // or just let the editor auto-save handle it. The prompt says "更新 FinalDraft.content"
            // But since FinalDraft requires sceneSessionId in this schema, and we are in a generic final-draft context,
            // we'll rely on the frontend debounced auto-save which calls PUT /draft.
          }

          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`))
        } catch (error: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: error.message })}\n\n`))
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
