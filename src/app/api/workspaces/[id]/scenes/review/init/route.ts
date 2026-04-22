import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { chatOnce } from '@/lib/llm-client'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: params.id },
      include: { modelRuns: { where: { status: 'completed' } } },
    })

    if (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404 })
    }

    const allOutputs = workspace.modelRuns
      .map(r => `【${r.model}】的审阅意见：\n${r.content}`)
      .join('\n\n---\n\n')

    const extractPrompt = `你是一个审阅意见整理专家。用户提交了一份文档让多个 AI 审阅。

用户的原始问题/文档：「${workspace.prompt}」

以下是各 AI 的审阅意见：

${allOutputs}

请将所有审阅意见整理、去重、归类，输出为 JSON 格式：

{
  "suggestions": [
    {
      "id": "s1",
      "type": "逻辑问题",
      "severity": "重要",
      "content": "具体的修改建议",
      "quote": "涉及的原文片段（如果有）",
      "sources": ["AI名1", "AI名2"],
      "consensusCount": 2
    }
  ]
}

要求：
- type 从以下选择：逻辑问题、表述问题、事实错误、补充建议、风险提醒、格式问题
- severity 从以下选择：关键、重要、建议
- 如果多个 AI 提出了相同或类似的意见，合并为一条并在 sources 中列出所有来源 AI
- consensusCount 表示几个 AI 提出了这个意见
- 按 severity 排序：关键 > 重要 > 建议
- 最多 20 条`

    const result = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [{ role: 'user', content: extractPrompt }],
    })

    let suggestionsData
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      suggestionsData = JSON.parse(jsonMatch?.[0] || result)
    } catch {
      suggestionsData = {
        suggestions: [{ id: 's1', type: '解析失败', severity: '建议', content: '请重试', quote: '', sources: [], consensusCount: 0 }],
      }
    }

    const session = await prisma.sceneSession.create({
      data: {
        id: uuidv4(),
        workspaceId: workspace.id,
        sceneType: 'review',
        status: 'active',
        userSelections: JSON.stringify({ accepted: [], rejected: [], edited: {} }),
      },
    })

    const artifact = await prisma.artifact.create({
      data: {
        id: uuidv4(),
        workspaceId: workspace.id,
        type: 'review_suggestions',
        payload: JSON.stringify(suggestionsData),
        version: 1,
      },
    })

    return NextResponse.json({
      sceneSessionId: session.id,
      artifactId: artifact.id,
      suggestions: suggestionsData.suggestions,
    })
  } catch (err) {
    console.error('[review/init]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
