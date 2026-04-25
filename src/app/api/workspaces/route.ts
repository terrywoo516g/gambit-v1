import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getModelByName } from '@/lib/model-registry'
import { cookies } from 'next/headers'

// 创建工作空间
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { prompt, selectedModels } = body as {
      prompt: string
      selectedModels: string[]
    }

    if (!prompt?.trim()) {
      return NextResponse.json({ error: '问题不能为空' }, { status: 400 })
    }
    if (!selectedModels || selectedModels.length < 2) {
      return NextResponse.json({ error: '请至少选择 2 个模型' }, { status: 400 })
    }

    const title = prompt.slice(0, 30) + (prompt.length > 30 ? '...' : '')

    const cookieStore = cookies()
    const userId = cookieStore.get('gambit_invite')?.value || null

    // 用事务一次性创建 workspace + 所有 modelRuns，减少 DB 往返
    const workspace = await prisma.workspace.create({
      data: {
        userId,
        prompt,
        selectedModels: JSON.stringify(selectedModels),
        title,
        status: 'running',
        modelRuns: {
          create: selectedModels.map((modelName) => {
            const modelInfo = getModelByName(modelName)
            return {
              model: modelName,
              modelId: modelInfo?.apiId ?? modelName,
              status: 'running',
              startedAt: new Date(),
            }
          }),
        },
      },
      include: { modelRuns: true },
    })

    return NextResponse.json({
      workspace: {
        id: workspace.id,
        title: workspace.title,
      },
      modelRunIds: workspace.modelRuns.map((r: { id: string }) => r.id),
    })
  } catch (err) {
    console.error('[POST /api/workspaces]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// 获取工作空间列表
export async function GET() {
  try {
    const cookieStore = cookies()
    const userId = cookieStore.get('gambit_invite')?.value

    if (!userId) {
      return NextResponse.json({ workspaces: [] }, { status: 200 })
    }

    const workspaces = await prisma.workspace.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 50,
      include: {
        modelRuns: {
          select: { id: true },
        },
      },
    })

    return NextResponse.json({
      workspaces: workspaces.map((w: any) => ({
        id: w.id,
        title: w.title,
        status: w.status,
        selectedModels: JSON.parse(w.selectedModels),
        updatedAt: w.updatedAt.toISOString(),
        modelRunCount: w.modelRuns.length,
      })),
    })
  } catch (err) {
    console.error('[GET /api/workspaces]', err)
    return NextResponse.json({ workspaces: [] }, { status: 200 })
  }
}
