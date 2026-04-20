import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { MODEL_REGISTRY } from '@/lib/llm-client'
import { v4 as uuidv4 } from 'uuid'

/**
 * POST /api/chat/send
 * body: { workspaceId, text, mentions: { models: string[], tool: string | null }, attachments?: string[] }
 * returns: { messageIds: string[] }
 *
 * 每个 model mention 创建一条 pending message，返回 id 列表。
 * 前端拿到 ids 后各开一条 SSE（GET /api/stream/:id）并行拉取。
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { workspaceId, text, mentions } = body as {
      workspaceId: string
      text: string
      mentions: { models: string[]; tool: string | null }
    }

    if (!workspaceId || !text || !mentions?.models?.length) {
      return NextResponse.json(
        { error: 'workspaceId, text, mentions.models are required' },
        { status: 400 }
      )
    }

    // 至少 2 个 AI —— DNA 级硬约束
    if (mentions.models.length < 2) {
      return NextResponse.json(
        { error: 'At least 2 AI models required (Gambit DNA constraint)' },
        { status: 400 }
      )
    }

    // 验证所有 mention 都在注册表中
    const unknownModels = mentions.models.filter((m) => !MODEL_REGISTRY[m])
    if (unknownModels.length) {
      return NextResponse.json(
        { error: `Unknown models: ${unknownModels.join(', ')}` },
        { status: 400 }
      )
    }

    // 先存 user message
    const userMsgId = uuidv4()
    await prisma.message.create({
      data: {
        id: userMsgId,
        workspaceId,
        role: 'user',
        content: text,
        status: 'done',
      },
    })

    // 自动更新标题：如果 workspace.title === '新工作台'，用 text 前 30 字更新标题
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (workspace?.title === '新工作台' && text) {
      await prisma.workspace.update({
        where: { id: workspaceId },
        data: { title: text.slice(0, 30) },
      })
    }

    // 为每个 model 创建一条 pending AI message
    const messageIds: string[] = []
    for (const modelName of mentions.models) {
      const id = uuidv4()
      await prisma.message.create({
        data: {
          id,
          workspaceId,
          role: 'ai',
          modelId: modelName,
          content: '',
          status: 'pending',
        },
      })
      messageIds.push(id)
    }

    return NextResponse.json({ messageIds, userMessageId: userMsgId })
  } catch (err) {
    console.error('[/api/chat/send]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
