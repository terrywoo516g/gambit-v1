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
      return NextResponse.json({ error: 'Need at least 2 completed runs' }, { status: 400 })
    }

    const allOutputs = workspace.modelRuns
      .map((r: { model: string; content: string }) => `【${r.model}】的回答：\n${r.content}`)
      .join('\n\n---\n\n')

    const reflectionPrompt = `你是一个决策分析专家。用户的问题是：「${workspace.prompt}」

以下是 ${workspace.modelRuns.length} 个 AI 对这个问题的回答：

${allOutputs}

请分析这些回答，输出一份结构化的 Reflection 报告。严格按以下 JSON 格式返回，不要返回其他内容：

{
  "strongConsensus": [
    {"point": "观点描述", "supporters": ["AI名1", "AI名2", "AI名3"]}
  ],
  "weakConsensus": [
    {"point": "观点描述", "supporters": ["AI名1", "AI名2"], "dissenters": ["AI名3"]}
  ],
  "divergent": [
    {"point": "独特观点描述", "source": "AI名", "reasoning": "为什么值得关注"}
  ],
  "blindSpots": [
    {"point": "所有AI都没提到但可能重要的角度", "reasoning": "为什么这个角度重要"}
  ],
  "keyQuestions": [
    {"question": "用户在做决定前需要回答的关键问题", "context": "为什么这个问题重要"}
  ]
}

要求：
- strongConsensus：所有 AI 都认同的观点（至少被所有AI提及）
- weakConsensus：多数 AI（≥2个）认同但有分歧的观点
- divergent：仅 1 个 AI 提出的独特视角，但有价值
- blindSpots：你认为所有 AI 都遗漏的重要角度（至少 1 条，最多 3 条）
- keyQuestions：用户做决策前应该先想清楚的问题（至少 1 条，最多 3 条）
- 每个类别至少 1 条，最多 5 条`

    const result = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [
        { role: 'user', content: reflectionPrompt },
      ],
    })

    let reflectionData
    try {
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      reflectionData = JSON.parse(jsonMatch?.[0] || result)
    } catch {
      reflectionData = {
        strongConsensus: [{ point: '解析失败，请重试', supporters: [] }],
        weakConsensus: [],
        divergent: [],
        blindSpots: [],
        keyQuestions: [],
      }
    }

    const session = await prisma.sceneSession.create({
      data: {
        id: uuidv4(),
        workspaceId: workspace.id,
        sceneType: 'brainstorm',
        status: 'active',
        userSelections: JSON.stringify({ adopted: [], rejected: [], notes: '' }),
      },
    })

    const artifact = await prisma.artifact.create({
      data: {
        id: uuidv4(),
        workspaceId: workspace.id,
        type: 'reflection',
        payload: JSON.stringify(reflectionData),
        version: 1,
      },
    })

    return NextResponse.json({
      sceneSessionId: session.id,
      artifactId: artifact.id,
      reflection: reflectionData,
    })
  } catch (err) {
    console.error('[brainstorm/init]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
