import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { chatOnce } from '@/lib/llm-client'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    let userMessage = ''
    try {
      const body = await req.json()
      userMessage = body.userMessage || ''
    } catch {
      // 没有 body 也可以，兼容原来无 body 的调用
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: params.id },
      include: { modelRuns: { where: { status: 'completed' } } },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const prompt = workspace.prompt
    const summaries = workspace.modelRuns
      .map((r: { model: string; content: string }) => `【${r.model}】：${r.content.slice(0, 500)}`)
      .join('\n\n')

    const systemPrompt = `你是 Gambit 的场景推荐引擎。根据用户的问题和各 AI 的回答摘要，判断最适合的处理场景。

四个场景：
- compare：用户在做调研、选型、对比产品/方案（关键词：推荐、对比、哪个好、有哪些）
- brainstorm：用户面临决策、需要分析利弊、权衡选择（关键词：该不该、要不要、选哪个、是否）
- compose：用户需要创作内容、写文案、生成方案（关键词：写、文案、方案、脚本、帮我生成）
- review：用户需要审阅文档、找问题、提修改意见（关键词：审阅、检查、修改、有没有问题）

请只返回一个 JSON 对象，格式：
{"scene":"compare","confidence":0.85,"reason":"用户在询问产品推荐，适合整理为对比表格"}

不要返回其他任何内容。`

    const userContent = userMessage
      ? `用户问题：${prompt}\n\n各 AI 回答摘要：\n${summaries}\n\n用户的新指令：${userMessage}\n\n请根据用户的新指令判断最适合的场景。`
      : `用户问题：${prompt}\n\n各 AI 回答摘要：\n${summaries}`

    const result = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    })

    let parsed
    try {
      parsed = JSON.parse(result)
    } catch {
      parsed = { scene: 'compare', confidence: 0.5, reason: '无法解析推荐结果，默认推荐对比模式' }
    }

    await prisma.workspace.update({
      where: { id: workspace.id },
      data: { recommendScene: parsed.scene },
    })

    return NextResponse.json(parsed)
  } catch (err) {
    console.error('[recommend-scene]', err)
    return NextResponse.json(
      { scene: 'compare', confidence: 0.3, reason: '推荐服务异常' },
      { status: 200 }
    )
  }
}
