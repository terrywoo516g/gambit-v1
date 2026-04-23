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
      .map((r: { model: string; content: string }) => `【${r.model}】：${r.content.slice(0, 800)}`)
      .join('\n\n')

    const observerPrompt = `你是一个独立的第三方观察者。你的任务是以局外人的视角审视以下多个 AI 对同一个问题的回答，找出它们共同的盲点和潜在问题。

用户问题：「${workspace.prompt}」

各 AI 回答摘要：
${allOutputs}

请输出一段简洁的分析（不超过 300 字），包含：
1. 【遗漏角度】所有 AI 都没提到但可能重要的角度
2. 【潜在偏见】各 AI 回答中可能存在的偏见或假设
3. 【建议追问】基于以上分析，建议用户进一步追问的方向

保持简洁、直接、有启发性。不要重复 AI 已经说过的内容。`

    const analysis = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek-r1-0528', // 用更强的推理模型
      messages: [{ role: 'user', content: observerPrompt }],
    })

    const artifact = await prisma.artifact.create({
      data: {
        id: uuidv4(),
        workspaceId: workspace.id,
        type: 'observer',
        payload: JSON.stringify({ content: analysis }),
        version: 1,
      },
    })

    return NextResponse.json({
      artifactId: artifact.id,
      content: analysis,
    })
  } catch (err) {
    console.error('[observer]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
