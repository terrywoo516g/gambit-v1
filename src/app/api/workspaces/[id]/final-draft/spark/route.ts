import { NextRequest, NextResponse } from 'next/server'
import { chatOnce } from '@/lib/llm-client'
import { prisma } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workspaceId = params.id
    let bodyData: any = null
    try {
      bodyData = await req.json()
    } catch {}

    const context = bodyData?.context || ''

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        modelRuns: true
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const modelsSummary = workspace.modelRuns.map(run => {
      const content = run.content.length > 400 ? run.content.substring(0, 400) + '...' : run.content
      return `【${run.model}】：\n${content}`
    }).join('\n\n')

    const prompt = `你是 Gambit 工作台的「灵光一闪」。你的职责是：提供任何人都没想到的新可能性。
你不分析问题，不批评现有内容，不说"这有什么问题"。你只负责打开新的脑洞——让用户看到他完全没考虑过的角度。

【用户的问题】
${workspace.prompt}

【已有 AI 的观点摘要（仅供参考，你要提供与这些完全不同的角度）】
${modelsSummary}

【当前编辑器草稿（如有）】
${context || '（无）'}

请输出 3 条灵感，每条 50-100 字，必须覆盖以下三种类型各一条：
1. 新角度：从一个完全不同的视角重新定义这个问题（换主体、换时间维度、换行业类比）
2. 反常识：提出一个与主流认知相反的观点，并给出支撑逻辑
3. 换个说法：用一个出人意料的比喻或框架重新表达核心问题

要求：
- 每条必须和已有 AI 的观点明显不同，不能是已有内容的复述或延伸
- 语气大胆、有观点，不要保守
- 不要说"你可以考虑……"，直接陈述观点
- 严格返回 JSON：
{
  "sparks": [
    {"id": "k1", "type": "新角度", "content": "..."},
    {"id": "k2", "type": "反常识", "content": "..."},
    {"id": "k3", "type": "换个说法", "content": "..."}
  ]
}
`

    const res = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [
        { role: 'user', content: prompt }
      ]
    })

    let sparks = []
    try {
      const match = res.match(/```json\s*([\s\S]*?)\s*```/) || res.match(/\{[\s\S]*\}/)
      const raw = match ? match[1] || match[0] : res
      const parsed = JSON.parse(raw)
      sparks = (parsed.sparks || []).map((s: any) => ({
        id: uuidv4(),
        type: s.type,
        content: s.content
      }))
    } catch {
      console.error('Failed to parse spark JSON:', res)
      return NextResponse.json({ error: 'Invalid response format from AI' }, { status: 500 })
    }

    return NextResponse.json({ sparks })

  } catch (error) {
    console.error('[final-draft/spark]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
