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
      .map((r: { model: string; content: string }) => `【${r.model}】：${r.content.slice(0, 500)}`)
      .join('\n\n')

    const sparkPrompt = `你是一个创意思维专家。你的任务是跳出所有 AI 回答的思维框架，提供一个出人意料但有价值的新角度。

用户问题：「${workspace.prompt}」

各 AI 回答的大致方向：
${allOutputs}

请提供一个完全不同于以上所有 AI 的视角（不超过 200 字），包含：
1. 【意外角度】一个反直觉或跨领域的新思路
2. 【为什么值得考虑】这个角度的合理性
3. 【可以继续探索的问题】如果用户感兴趣，可以追问什么

要求：大胆、新颖、有启发性。不要跟已有回答重复。`

    const idea = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek-r1-0528',
      messages: [{ role: 'user', content: sparkPrompt }],
    })

    const artifact = await prisma.artifact.create({
      data: {
        id: uuidv4(),
        workspaceId: workspace.id,
        type: 'spark',
        payload: JSON.stringify({ content: idea }),
        version: 1,
      },
    })

    return NextResponse.json({
      artifactId: artifact.id,
      content: idea,
    })
  } catch (err) {
    console.error('[spark]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
