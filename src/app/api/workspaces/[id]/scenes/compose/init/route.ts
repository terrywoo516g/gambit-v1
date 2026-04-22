import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
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

    // 按段落切分每个 AI 的输出
    const paragraphs = workspace.modelRuns.flatMap(run => {
      const parts = run.content
        .split(/\n{2,}/) // 双换行分段
        .map(p => p.trim())
        .filter(p => p.length > 10) // 过滤太短的段落

      return parts.map((text, idx) => ({
        id: `${run.id}-${idx}`,
        model: run.model,
        text,
        index: idx,
      }))
    })

    const session = await prisma.sceneSession.create({
      data: {
        id: uuidv4(),
        workspaceId: workspace.id,
        sceneType: 'compose',
        status: 'active',
        userSelections: JSON.stringify({
          title: '',
          corePoints: [],
          bodyParagraphs: [],
          customText: '',
        }),
      },
    })

    return NextResponse.json({
      sceneSessionId: session.id,
      paragraphs,
      modelNames: workspace.modelRuns.map(r => r.model),
    })
  } catch (err) {
    console.error('[compose/init]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
