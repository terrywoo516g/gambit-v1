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
    }

    if (workspace.modelRuns.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 completed model runs' }, { status: 400 })
    }

    // 构建提取 prompt
    const allOutputs = workspace.modelRuns
      .map((r: { model: string; content: string }) => `【${r.model}】的回答：\n${r.content}`)
      .join('\n\n---\n\n')

    const extractPrompt = `你是一个信息整理专家。用户的问题是：「${workspace.prompt}」

以下是多个 AI 对这个问题的回答：

${allOutputs}

请从这些回答中提取可以对比的对象和维度，整理成一个 JSON 格式的结构化表格。

要求：
1. 识别所有被提及的可比较对象（如产品、方案、选项等）
2. 提取合适的对比维度（如价格、优点、缺点、适用场景、推荐理由等）
3. 去重合并相同的对象
4. 标注每条信息来自哪个 AI

返回格式（严格 JSON，不要其他内容）：
{
  "columns": ["名称", "维度1", "维度2", "维度3", "来源AI"],
  "rows": [
    {"名称": "选项A", "维度1": "值1", "维度2": "值2", "维度3": "值3", "来源AI": "DeepSeek V3.2, Kimi K2.5"},
    {"名称": "选项B", "维度1": "值1", "维度2": "值2", "维度3": "值3", "来源AI": "豆包 Seed 2.0 Pro"}
  ]
}

注意：
- columns 数组的第一项必须是"名称"，最后一项必须是"来源AI"
- 中间的维度根据问题类型自动确定，通常 3-6 个维度
- 每行必须包含所有列
- 如果某个维度某个 AI 没提到，填"未提及"
- rows 不要超过 20 行`

    const result = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [
        { role: 'user', content: extractPrompt },
      ],
    })

    // 解析 JSON
    let tableData
    try {
      // 尝试提取 JSON（可能被包在 markdown code block 里）
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      tableData = JSON.parse(jsonMatch?.[0] || result)
    } catch {
      tableData = {
        columns: ['名称', '描述', '来源AI'],
        rows: [{ '名称': '解析失败', '描述': '请重试', '来源AI': '-' }],
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
        payload: JSON.stringify(tableData),
        version: 1,
      },
    })

    return NextResponse.json({
      sceneSessionId: session.id,
      artifactId: artifact.id,
      tableData,
    })
  } catch (err) {
    console.error('[compare/init]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
