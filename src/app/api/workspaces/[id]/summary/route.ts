import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { chatOnce } from '@/lib/llm-client'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const workspaceId = params.id
    let bodyData: any = null
    try {
      bodyData = await req.json()
    } catch {
      // ignore parsing error
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      include: {
        modelRuns: true
      }
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    if (workspace.summaryCache && !bodyData?.force) {
      try {
        const parsed = JSON.parse(workspace.summaryCache)
        return NextResponse.json(parsed)
      } catch {
        // invalid JSON, proceed to re-generate
      }
    }

    let summariesText = ''

    // If frontend provides the runs data, use it directly to avoid DB race conditions
    if (bodyData && bodyData.runs && bodyData.runs.length > 0) {
      summariesText = bodyData.runs
        .map((r: any) => `【${r.model}】：\n${(r.content || '').substring(0, 600)}`)
        .join('\n\n')
    } else {
      const completedRuns = workspace.modelRuns.filter(r => r.status === 'completed')
      if (completedRuns.length === 0) {
        return NextResponse.json({ error: 'No completed runs to summarize' }, { status: 400 })
      }
      summariesText = completedRuns
        .map(r => `【${r.model}】：\n${(r.content || '').substring(0, 600)}`)
        .join('\n\n')
    }

    const prompt = `你是一个信息提炼专家。以下是多个 AI 对同一问题的回答摘要。
用户问题：${workspace.prompt}

${summariesText}

请提炼输出，严格返回 JSON：
{
  "consensus": ["共同观点1（15-25字）", "共同观点2", "共同观点3"],
  "divergence": "最大分歧点，一句话描述（20-30字）",
  "takeaway": "给用户的一句话结论（20-30字）"
}

要求：
- consensus 2-3条，每条是所有AI都认同的核心事实或结论
- divergence 聚焦最尖锐的一个分歧，不要泛泛而谈
- takeaway 是旁观者视角的一句行动建议或判断
- 全部中文，不要废话`

    const content = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [{ role: 'user', content: prompt }]
    })

    const match = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/)
    const jsonStr = match ? match[1] || match[0] : content

    const result = JSON.parse(jsonStr)

    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { summaryCache: JSON.stringify(result) }
    })

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('[Summary API Error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
