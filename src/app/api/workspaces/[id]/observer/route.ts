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
      const content = run.content.length > 800 ? run.content.substring(0, 800) + '...' : run.content
      return `【${run.model}】：\n${content}`
    }).join('\n\n')

    const chatHistory = workspace.chatMessages.reverse().map(m => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`).join('\n') || '（无）'

    const prompt = `你是 Gambit 的「旁观者」，站在用户和 AI 之外，对当前工作台的所有 AI 回答做冷静的元评论。你不需要给答案，你只需要指出别人没注意到的东西。

【用户的问题】
${workspace.prompt}

【各 AI 的回答摘要】
${modelsSummary}

【追问历史（如有）】
${chatHistory}

【你的任务】
输出 3-5 条短评，每条 40-80 字，分别聚焦以下一种或多种角度：
1. **盲点**：所有 AI 都没提到，但对用户决策很重要的角度
2. **偏差**：AI 集体偏向某种预设（如都假定用户是初学者/都默认某个前提），可能误导
3. **矛盾**：AI 之间或单个 AI 内部存在的逻辑冲突
4. **提醒**：用户可能忽视的风险、前提条件、时效性问题等

要求：
- 每条短评必须**尖锐、具体**，不要说废话和套话
- 不要复述 AI 说过的内容
- 不要给建议或答案，只做观察和提问
- 语气冷静客观，不讨好也不攻击
- 输出严格 JSON，格式：
{
  "observations": [
    {"id": "o1", "type": "盲点", "content": "短评内容..."},
    {"id": "o2", "type": "偏差", "content": "短评内容..."}
  ]
}
总字数控制在 300-500 字之间。`

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