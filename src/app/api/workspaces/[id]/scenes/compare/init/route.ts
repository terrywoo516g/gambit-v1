import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { chatOnce } from '@/lib/llm-client'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    let referencedRunIds: string[] = []
    try {
      const body = await req.json()
      if (Array.isArray(body.referencedRunIds)) referencedRunIds = body.referencedRunIds
    } catch {}

    const workspace = await prisma.workspace.findUnique({
      where: { id: params.id },
      include: { modelRuns: { where: { status: 'completed' } } },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    if (referencedRunIds.length > 0) {
      workspace.modelRuns = workspace.modelRuns.filter((r: { id: string }) => referencedRunIds.includes(r.id))
      if (workspace.modelRuns.length < 1) {
        return NextResponse.json({ error: '引用的 AI 未完成或不存在' }, { status: 400 })
      }
    } else if (workspace.modelRuns.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 completed model runs' }, { status: 400 })
    }

    // 构建提取 prompt
    const allOutputs = workspace.modelRuns
      .map((r: { model: string; content: string }) => `【${r.model}】的回答：\n${r.content}`)
      .join('\n\n---\n\n')

    const extractPrompt = `你是一个信息整理专家。用户的问题是：「${workspace.prompt}」

以下是多个 AI 对这个问题的回答：

${allOutputs}

请仔细阅读以上内容，提取并整理成一个严格的 JSON 格式，包含以下三个部分：

1. consensus：所有 AI 都认同的观点（2-4 条），每条自然语言描述 50-120 字。
2. comparisonTable：有分歧或各AI侧重不同的部分，整理成结构化表格对比。
3. divergenceNote：一句话点出主要分歧的核心。

要求：
- 共识和差异不要重复。
- 严格返回 JSON，不要包含任何多余文字或 Markdown 标记。

返回格式示例：
{
  "consensus": [
    { "id": "c1", "point": "共识标题", "detail": "自然语言描述 50-120 字", "sources": ["DeepSeek","MiniMax"] }
  ],
  "comparisonTable": {
    "columns": ["名称", "维度1", "维度2", "来源AI"],
    "rows": [{ "名称": "...", "维度1": "...", "来源AI": "..." }]
  },
  "divergenceNote": "一句话点出主要分歧"
}

注意：
- comparisonTable 的 columns 数组第一项建议是"名称"，最后一项必须是"来源AI"。
- 中间的维度根据问题类型自动确定，通常 3-6 个维度。
- 如果某个维度某个 AI 没提到，填"未提及"。`

    const result = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [
        { role: 'user', content: extractPrompt },
      ],
    })

    // 解析 JSON
    let parsedData
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      parsedData = JSON.parse(jsonMatch?.[0] || result)
    } catch {
      parsedData = {
        consensus: [],
        comparisonTable: {
          columns: ['名称', '描述', '来源AI'],
          rows: [{ '名称': '解析失败', '描述': '请重试', '来源AI': '-' }],
        },
        divergenceNote: '解析失败，请重试'
      }
    }

    // 创建 SceneSession
    const session = await prisma.sceneSession.create({
      data: {
        id: uuidv4(),
        workspaceId: workspace.id,
        sceneType: 'compare',
        status: 'active',
        userSelections: JSON.stringify({ starred: [], excluded: [] }),
      },
    })

    // 创建 Artifact
    const artifact = await prisma.artifact.create({
      data: {
        id: uuidv4(),
        workspaceId: workspace.id,
        type: 'comparison_table',
        payload: JSON.stringify(parsedData.comparisonTable),
        version: 1,
      },
    })

    return NextResponse.json({
      sceneSessionId: session.id,
      artifactId: artifact.id,
      tableData: parsedData.comparisonTable,
      consensus: parsedData.consensus,
      divergenceNote: parsedData.divergenceNote,
    })
  } catch (err) {
    console.error('[compare/init]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
