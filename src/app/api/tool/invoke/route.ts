import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'

type ToolName = 'diverge' | 'synthesize'

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      workspaceId?: string
      tool?: ToolName
      question?: string
    }

    const workspaceId = body.workspaceId?.trim()
    const tool = body.tool
    const question = body.question?.trim()

    if (!workspaceId || !tool || !question) {
      return NextResponse.json(
        { error: 'workspaceId, tool, question are required' },
        { status: 400 }
      )
    }

    if (tool === 'diverge') {
      const userMessageId = uuidv4()
      const aggressiveId = uuidv4()
      const conservativeId = uuidv4()
      const pragmaticId = uuidv4()

      await prisma.message.create({
        data: {
          id: userMessageId,
          workspaceId,
          role: 'user',
          content: question,
          status: 'done',
        },
      })

      await prisma.message.createMany({
        data: [
          {
            id: aggressiveId,
            workspaceId,
            role: 'ai',
            modelId: '分歧官-激进',
            content: '',
            status: 'pending',
          },
          {
            id: conservativeId,
            workspaceId,
            role: 'ai',
            modelId: '分歧官-稳健',
            content: '',
            status: 'pending',
          },
          {
            id: pragmaticId,
            workspaceId,
            role: 'ai',
            modelId: '分歧官-务实',
            content: '',
            status: 'pending',
          },
        ],
      })

      return NextResponse.json({
        userMessageId,
        messageIds: [aggressiveId, conservativeId, pragmaticId],
        mode: 'diverge',
      })
    }

    if (tool === 'synthesize') {
      const aiMessages = await prisma.message.findMany({
        where: {
          workspaceId,
          role: 'ai',
          status: 'done',
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      })

      const orderedAiMessages = [...aiMessages].reverse()
      const userMessageId = uuidv4()
      const synthesizeMessageId = uuidv4()
      const content = `用户问题：${question}\n\n${orderedAiMessages
        .map((message) => `${message.modelId}：${message.content}`)
        .join('\n\n')}`

      await prisma.message.create({
        data: {
          id: userMessageId,
          workspaceId,
          role: 'user',
          content,
          status: 'done',
        },
      })

      await prisma.message.create({
        data: {
          id: synthesizeMessageId,
          workspaceId,
          role: 'ai',
          modelId: '合成官',
          content: '',
          status: 'pending',
        },
      })

      return NextResponse.json({
        userMessageId,
        messageIds: [synthesizeMessageId],
        mode: 'synthesize',
      })
    }

    return NextResponse.json({ error: 'Unsupported tool' }, { status: 400 })
  } catch (err) {
    console.error('[/api/tool/invoke]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
