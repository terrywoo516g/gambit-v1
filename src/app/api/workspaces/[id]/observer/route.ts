import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { chatOnce } from '@/lib/llm-client'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const workspaceId = params.id

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        modelRuns: {
          where: { status: 'completed' }
        },
        chatMessages: {
          orderBy: { createdAt: 'desc' },
          take: 6
        }
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    if (workspace.modelRuns.length === 0) {
      return NextResponse.json({
        text: '暂无 AI 回答，请等待 AI 回答完成后再查看旁观者视角。'
      })
    }

    const modelsSummary = workspace.modelRuns.map((run: any) => {
      const content = run.content.length > 600 ? run.content.substring(0, 600) + '...' : run.content
      return `【${run.model}】：\n${content}`
    }).join('\n\n')

    const chatHistory = workspace.chatMessages.reverse().map((m: any) => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`).join('\n') || '（无）'

    const prompt = `你是 Gambit 工作台的「旁观者」。你的唯一职责是：发现这场对话里没人注意到的漏洞和盲区。
你不是参与者，你是场外的冷眼旁观者。你不给答案，不提建议，不说"应该怎么做"。你只说"这里有问题"。

【用户的问题】
${workspace.prompt}

【各 AI 的回答摘要（每个取前600字）】
${modelsSummary}

【追问历史（如有）】
${chatHistory}

请从盲点、偏差、矛盾或时效等角度挑毛病，输出 2-3 个短评。
要求：
- 每个短评必须有一个简短的标题（如"忽略了核心前提"），标题和正文都在同一段内，或者标题加粗。
- 不要使用"盲点："、"偏差："这种生硬的分类标签。
- 不要说废话，不要提供任何建议。
- 语气冷静，像一个无情的编辑在审稿。
- 必须非常精简，总字数控制在 100-200 字左右。
- 纯自然语言输出，每段之间用空行分隔。`

    const responseText = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [{ role: 'user', content: prompt }]
    })

    return NextResponse.json({ text: responseText.trim() })

  } catch (error: any) {
    console.error('Observer API error:', error)
    return NextResponse.json({
      text: '旁观者暂时无法分析，请稍后重试'
    })
  }
}