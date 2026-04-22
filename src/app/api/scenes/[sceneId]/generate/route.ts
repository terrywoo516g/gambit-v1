import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { chatOnce } from '@/lib/llm-client'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest, { params }: { params: { sceneId: string } }) {
  try {
    const session = await prisma.sceneSession.findUnique({
      where: { id: params.sceneId },
      include: {
        workspace: true,
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Scene session not found' }, { status: 404 })
    }

    const selections = JSON.parse(session.userSelections)
    const workspace = session.workspace

    // 获取表格数据
    const artifact = await prisma.artifact.findFirst({
      where: { workspaceId: workspace.id, type: 'comparison_table' },
      orderBy: { version: 'desc' },
    })

    if (!artifact) {
      return NextResponse.json({ error: 'No comparison table found' }, { status: 400 })
    }

    const tableData = JSON.parse(artifact.payload)
    const starred = selections.starred || []
    const excluded = selections.excluded || []

    // 过滤表格
    const filteredRows = tableData.rows.filter((row: Record<string, string>, idx: number) => {
      const name = row['名称'] || row[tableData.columns[0]]
      return !excluded.includes(name) && !excluded.includes(idx)
    })

    const starredRows = filteredRows.filter((row: Record<string, string>, idx: number) => {
      const name = row['名称'] || row[tableData.columns[0]]
      return starred.includes(name) || starred.includes(idx)
    })

    const generatePrompt = `你是一个调研分析专家。用户的问题是：「${workspace.prompt}」

以下是整理后的对比信息：

全部选项：
${JSON.stringify(filteredRows, null, 2)}

用户标星（感兴趣）的选项：
${starredRows.length > 0 ? JSON.stringify(starredRows, null, 2) : '用户未标星任何选项'}

请生成一份简洁的推荐报告，包含：
1. Top 3 推荐（如果标星了就优先推荐标星的）
2. 每个推荐的理由（2-3 句话）
3. 不推荐的选项及原因（如果有明显不好的）
4. 最终建议（一句话总结）

用 Markdown 格式输出。`

    const report = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [
        { role: 'user', content: generatePrompt },
      ],
    })

    // 保存最终稿
    const draft = await prisma.finalDraft.create({
      data: {
        id: uuidv4(),
        sceneSessionId: session.id,
        content: report,
        format: 'markdown',
        version: 1,
      },
    })

    // 更新 session 状态
    await prisma.sceneSession.update({
      where: { id: session.id },
      data: { status: 'completed' },
    })

    return NextResponse.json({
      draftId: draft.id,
      content: report,
    })
  } catch (err) {
    console.error('[generate]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
