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
        observations: [{ id: 'o1', type: '提醒', content: '暂无 AI 回答，请等待 AI 回答完成后再查看旁观者视角。' }]
      })
    }

    const modelsSummary = workspace.modelRuns.map(run => {
      const content = run.content.length > 600 ? run.content.substring(0, 600) + '...' : run.content
      return `【${run.model}】：\n${content}`
    }).join('\n\n')

    const chatHistory = workspace.chatMessages.reverse().map(m => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`).join('\n') || '（无）'

    const prompt = `你是 Gambit 工作台的「旁观者」。你的唯一职责是：发现这场对话里没人注意到的漏洞和盲区。
你不是参与者，你是场外的冷眼旁观者。你不给答案，不提建议，不说"应该怎么做"。你只说"这里有问题"。

【用户的问题】
${workspace.prompt}

【各 AI 的回答摘要（每个取前600字）】
${modelsSummary}

【追问历史（如有）】
${chatHistory}

请从以下角度挑毛病，输出 3-5 条短评，每条 40-70 字：
- 盲点：所有 AI 都没提到，但可能影响结论的关键变量
- 偏差：AI 们共同预设了某个前提，但这个前提可能是错的
- 矛盾：AI 之间或同一个 AI 内部，有逻辑冲突的地方
- 时效：信息可能已过时，或在特定情境下不成立

要求：
- 每条必须具体、可验证，不能说废话（"这个问题很复杂"这种不算）
- 语气冷静，不攻击，不讨好，像一个无情的编辑在审稿
- 不要出现"建议你……"、"可以考虑……"这类措辞
- 不要复述 AI 已经说过的内容
- 严格返回 JSON：
{
  "observations": [
    {"id": "o1", "type": "盲点|偏差|矛盾|时效", "content": "..."}
  ]
}
总字数 200-400 字。`

    const responseText = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [{ role: 'user', content: prompt }]
    })

    // Try to parse JSON from the response. LLM might wrap in markdown ```json ... ```
    let parsedData
    try {
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/) || responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const jsonStr = jsonMatch[1] || jsonMatch[0]
        parsedData = JSON.parse(jsonStr)
      } else {
        parsedData = JSON.parse(responseText)
      }
    } catch {
      console.error('Failed to parse JSON from observer response:', responseText)
      return NextResponse.json({
        observations: [{ id: 'o1', type: '提醒', content: '旁观者暂时无法分析，请稍后重试' }]
      })
    }

    return NextResponse.json({ observations: parsedData.observations || [] })

  } catch (error: any) {
    console.error('Observer API error:', error)
    return NextResponse.json({
      observations: [{ id: 'o1', type: '提醒', content: '旁观者暂时无法分析，请稍后重试' }]
    })
  }
}