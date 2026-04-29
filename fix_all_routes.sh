#!/bin/bash
cd /home/ubuntu/gambit-v1

# 1. scenes/[sceneId]/generate/route.ts
cat > src/app/api/scenes/\[sceneId\]/generate/route.ts << 'ENDFILE'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { chatOnce } from '@/lib/llm-client'
import { v4 as uuidv4 } from 'uuid'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { consumeCredits, InsufficientCreditsError } from '@/lib/billing/credits'
import { PRICING } from '@/lib/billing/pricing'
import { insufficientCreditsResponse } from '@/lib/billing/errors'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    let body
    try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

    const { sceneId } = body || {}
    if (typeof sceneId !== 'string' || sceneId.trim().length === 0) {
      return NextResponse.json({ error: 'sceneId required' }, { status: 400 })
    }

    const scene = await prisma.sceneSession.findUnique({
      where: { id: sceneId },
      include: { workspace: true },
    })

    if (!scene || scene.workspace.userId !== userId) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    try {
      await consumeCredits(userId, PRICING.SCENE_GENERATE, 'consume_scene_generate', 'scene generate')
    } catch (e) {
      if (e instanceof InsufficientCreditsError) return insufficientCreditsResponse(e)
      throw e
    }

    const workspace = scene.workspace
    const selections = JSON.parse(scene.userSelections)

    if (scene.sceneType === 'brainstorm') {
      const reflectionArtifact = await prisma.artifact.findFirst({ where: { workspaceId: workspace.id, type: 'reflection' }, orderBy: { version: 'desc' } })
      const reflection = reflectionArtifact ? JSON.parse(reflectionArtifact.payload) : {}
      const adopted = selections.starred || []
      const rejected = selections.excluded || []
      const userNotes = selections.editedRows?.notes || ''
      const generatePrompt = '你是一个决策顾问。用户的问题是：' + workspace.prompt + '\n\n以下是对多个AI回答的Reflection分析结果：\n' + JSON.stringify(reflection, null, 2) + '\n\n用户认同的观点：' + (adopted.length > 0 ? adopted.join('；') : '未标记') + '\n用户否定的观点：' + (rejected.length > 0 ? rejected.join('；') : '未标记') + '\n用户补充的想法：' + (userNotes || '无') + '\n\n请生成一份决策建议报告。'
      const report = await chatOnce({ provider: 'qiniu', model: 'deepseek/deepseek-v3.2-251201', messages: [{ role: 'user', content: generatePrompt }] })
      const draft = await prisma.finalDraft.create({ data: { id: uuidv4(), sceneSessionId: scene.id, content: report, format: 'markdown', version: 1 } })
      await prisma.sceneSession.update({ where: { id: scene.id }, data: { status: 'completed' } })
      return NextResponse.json({ draftId: draft.id, content: report })
    }

    if (scene.sceneType === 'compose') {
      const editedRows = selections.editedRows || {}
      const parts = []
      if (editedRows.title) parts.push('【标题】\n' + editedRows.title)
      if (editedRows.structure) parts.push('【结构】\n' + editedRows.structure)
      if (editedRows.body) parts.push('【正文】\n' + editedRows.body)
      const generatePrompt = '用户需求：' + workspace.prompt + '\n\n素材：\n' + parts.join('\n\n') + '\n\n生成最终稿。'
      const article = await chatOnce({ provider: 'qiniu', model: 'deepseek/deepseek-v3.2-251201', messages: [{ role: 'user', content: generatePrompt }] })
      const draft = await prisma.finalDraft.create({ data: { id: uuidv4(), sceneSessionId: scene.id, content: article, format: 'markdown', version: 1 } })
      await prisma.sceneSession.update({ where: { id: scene.id }, data: { status: 'completed' } })
      return NextResponse.json({ draftId: draft.id, content: article })
    }

    if (scene.sceneType === 'review') {
      const acceptedIds = selections.starred || []
      const reviewArtifact = await prisma.artifact.findFirst({ where: { workspaceId: workspace.id, type: 'review_suggestions' }, orderBy: { version: 'desc' } })
      const allSuggestions = reviewArtifact ? JSON.parse(reviewArtifact.payload).suggestions : []
      const accepted = allSuggestions.filter((s: any) => acceptedIds.includes(s.id))
      const generatePrompt = '用户文档：' + workspace.prompt + '\n\n接受的修改：\n' + accepted.map((s: any, i: number) => i + 1 + '. ' + s.content).join('\n') + '\n\n生成修改后的版本。'
      const revised = await chatOnce({ provider: 'qiniu', model: 'deepseek/deepseek-v3.2-251201', messages: [{ role: 'user', content: generatePrompt }] })
      const draft = await prisma.finalDraft.create({ data: { id: uuidv4(), sceneSessionId: scene.id, content: revised, format: 'markdown', version: 1 } })
      await prisma.sceneSession.update({ where: { id: scene.id }, data: { status: 'completed' } })
      return NextResponse.json({ draftId: draft.id, content: revised })
    }

    const artifact = await prisma.artifact.findFirst({ where: { workspaceId: workspace.id, type: 'comparison_table' }, orderBy: { version: 'desc' } })
    if (!artifact) return NextResponse.json({ error: 'No comparison table found' }, { status: 400 })
    const tableData = JSON.parse(artifact.payload)
    const starred = selections.starred || []
    const filteredRows = tableData.rows.filter((row: any, idx: number) => !selections.excluded?.includes(row['名称'] || row[tableData.columns[0]]) && !selections.excluded?.includes(idx))
    const generatePrompt = '用户问题：' + workspace.prompt + '\n\n选项：\n' + JSON.stringify(filteredRows) + '\n\n生成推荐报告。'
    const report = await chatOnce({ provider: 'qiniu', model: 'deepseek/deepseek-v3.2-251201', messages: [{ role: 'user', content: generatePrompt }] })
    const draft = await prisma.finalDraft.create({ data: { id: uuidv4(), sceneSessionId: scene.id, content: report, format: 'markdown', version: 1 } })
    await prisma.sceneSession.update({ where: { id: scene.id }, data: { status: 'completed' } })
    return NextResponse.json({ draftId: draft.id, content: report })
  } catch (err) {
    console.error('[generate]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
ENDFILE
echo "1. scenes/[sceneId]/generate done"

# 2. chat/stream/route.ts
cat > src/app/api/workspaces/\[id\]/chat/stream/route.ts << 'ENDFILE'
import { NextRequest } from 'next/server'
import { streamChat } from '@/lib/llm-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/db'
import { consumeCredits, InsufficientCreditsError } from '@/lib/billing/credits'
import { PRICING } from '@/lib/billing/pricing'
import { insufficientCreditsResponse } from '@/lib/billing/errors'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

    const workspaceId = params.id
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (!workspace || workspace.userId !== userId) {
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    }

    let body
    try { body = await req.json() } catch { return new Response(JSON.stringify({ error: 'invalid json' }), { status: 400 }) }

    const { message, referencedRunIds = [] } = body || {}
    if (typeof message !== 'string' || message.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'message required' }), { status: 400 })
    }

    try {
      await consumeCredits(userId, PRICING.CHAT_STREAM, 'consume_chat_stream', 'chat stream')
    } catch (e) {
      if (e instanceof InsufficientCreditsError) return insufficientCreditsResponse(e)
      throw e
    }

    const referencedRuns = referencedRunIds.length > 0
      ? await prisma.modelRun.findMany({ where: { id: { in: referencedRunIds }, workspaceId } })
      : []

    const historyMessages = referencedRuns.length > 0
      ? await prisma.chatMessage.findMany({
          where: { modelRunId: { in: referencedRunIds } },
          orderBy: { createdAt: 'asc' },
        })
      : []

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: any) => {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type, ...data }) + '\n\n'))
        }
        try {
          const chatStream = streamChat({
            provider: 'qiniu',
            model: 'deepseek/deepseek-v3.2-251201',
            messages: [
              ...historyMessages.map((m: any) => ({ role: m.role, content: m.content })),
              { role: 'user', content: message }
            ]
          })
          for await (const chunk of chatStream) {
            if (chunk.type === 'token') sendEvent('delta', { text: chunk.data })
            else if (chunk.type === 'error') sendEvent('error', { message: chunk.data })
          }
        } catch (err) {
          sendEvent('error', { message: 'Stream error' })
        }
        sendEvent('done', {})
        controller.close()
      }
    })
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } })
  } catch (error) {
    console.error('Stream API Error:', error)
    return new Response('Internal error', { status: 500 })
  }
}
ENDFILE
echo "2. chat/stream done"

# 3. observer/route.ts
cat > src/app/api/workspaces/\[id\]/observer/route.ts << 'ENDFILE'
import { NextRequest, NextResponse } from 'next/server'
import { chatOnce } from '@/lib/llm-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/db'
import { consumeCredits, InsufficientCreditsError } from '@/lib/billing/credits'
import { PRICING } from '@/lib/billing/pricing'
import { insufficientCreditsResponse } from '@/lib/billing/errors'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const workspaceId = params.id
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (!workspace || workspace.userId !== userId) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    let body
    try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

    const { prompt } = body || {}
    if (typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json({ error: 'prompt required' }, { status: 400 })
    }

    try {
      await consumeCredits(userId, PRICING.OBSERVER, 'consume_observer', 'observer')
    } catch (e) {
      if (e instanceof InsufficientCreditsError) return insufficientCreditsResponse(e)
      throw e
    }

    const modelRuns = await prisma.modelRun.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    const chatMessages = await prisma.chatMessage.findMany({
      where: { modelRunId: { in: modelRuns.map(r => r.id) } },
      orderBy: { createdAt: 'asc' },
    })

    const summaryPrompt = '用户问题：' + workspace.prompt + '\n\nAI 回答摘要：\n' + modelRuns.map((r, i) => '模型 ' + (i + 1) + ': ' + r.content.substring(0, 200)).join('\n\n') + '\n\n旁观者视角分析：' + prompt

    const result = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [{ role: 'user', content: summaryPrompt }]
    })

    return NextResponse.json({ result })
  } catch (error) {
    console.error('[observer]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
ENDFILE
echo "3. observer done"

# 4. recommend-scene/route.ts
cat > src/app/api/workspaces/\[id\]/recommend-scene/route.ts << 'ENDFILE'
import { NextRequest, NextResponse } from 'next/server'
import { chatOnce } from '@/lib/llm-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/db'
import { consumeCredits, InsufficientCreditsError } from '@/lib/billing/credits'
import { PRICING } from '@/lib/billing/pricing'
import { insufficientCreditsResponse } from '@/lib/billing/errors'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const workspaceId = params.id
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (!workspace || workspace.userId !== userId) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    try {
      await consumeCredits(userId, PRICING.RECOMMEND_SCENE, 'consume_recommend_scene', 'recommend scene')
    } catch (e) {
      if (e instanceof InsufficientCreditsError) return insufficientCreditsResponse(e)
      throw e
    }

    const modelRuns = await prisma.modelRun.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    })

    const prompt = '用户问题：' + workspace.prompt + '\n\n已有 ' + modelRuns.length + ' 个AI回答。\n\n请推荐最适合下一步的场景类型（brainstorm/compose/review/compare），并说明理由。'

    const result = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [{ role: 'user', content: prompt }]
    })

    return NextResponse.json({ recommendation: result })
  } catch (error) {
    console.error('[recommend-scene]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
ENDFILE
echo "4. recommend-scene done"

# 5. scenes/brainstorm/init/route.ts
cat > src/app/api/workspaces/\[id\]/scenes/brainstorm/init/route.ts << 'ENDFILE'
import { NextRequest, NextResponse } from 'next/server'
import { chatOnce } from '@/lib/llm-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/db'
import { consumeCredits, InsufficientCreditsError } from '@/lib/billing/credits'
import { PRICING } from '@/lib/billing/pricing'
import { insufficientCreditsResponse } from '@/lib/billing/errors'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const workspaceId = params.id
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (!workspace || workspace.userId !== userId) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    let body
    try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

    const { sceneType = 'brainstorm' } = body || {}

    try {
      await consumeCredits(userId, PRICING.SCENE_BRAINSTORM, 'consume_scene_brainstorm', 'scene brainstorm init')
    } catch (e) {
      if (e instanceof InsufficientCreditsError) return insufficientCreditsResponse(e)
      throw e
    }

    const initPrompt = '用户问题：' + workspace.prompt + '\n\n请生成头脑风暴场景的初始问题和选项推荐。'

    const result = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [{ role: 'user', content: initPrompt }]
    })

    return NextResponse.json({ result, sceneType })
  } catch (error) {
    console.error('[brainstorm/init]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
ENDFILE
echo "5. scenes/brainstorm/init done"

# 6. scenes/compare/init/route.ts
cat > src/app/api/workspaces/\[id\]/scenes/compare/init/route.ts << 'ENDFILE'
import { NextRequest, NextResponse } from 'next/server'
import { chatOnce } from '@/lib/llm-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/db'
import { consumeCredits, InsufficientCreditsError } from '@/lib/billing/credits'
import { PRICING } from '@/lib/billing/pricing'
import { insufficientCreditsResponse } from '@/lib/billing/errors'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const workspaceId = params.id
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (!workspace || workspace.userId !== userId) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    let body
    try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

    const { sceneType = 'compare' } = body || {}

    try {
      await consumeCredits(userId, PRICING.SCENE_COMPARE, 'consume_scene_compare', 'scene compare init')
    } catch (e) {
      if (e instanceof InsufficientCreditsError) return insufficientCreditsResponse(e)
      throw e
    }

    const modelRuns = await prisma.modelRun.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    })

    const comparePrompt = '用户问题：' + workspace.prompt + '\n\n已有 ' + modelRuns.length + ' 个AI回答。\n\n请生成对比场景的表格框架。'

    const result = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [{ role: 'user', content: comparePrompt }]
    })

    return NextResponse.json({ result, sceneType })
  } catch (error) {
    console.error('[compare/init]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
ENDFILE
echo "6. scenes/compare/init done"

# 7. scenes/review/init/route.ts
cat > src/app/api/workspaces/\[id\]/scenes/review/init/route.ts << 'ENDFILE'
import { NextRequest, NextResponse } from 'next/server'
import { chatOnce } from '@/lib/llm-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/db'
import { consumeCredits, InsufficientCreditsError } from '@/lib/billing/credits'
import { PRICING } from '@/lib/billing/pricing'
import { insufficientCreditsResponse } from '@/lib/billing/errors'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const workspaceId = params.id
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (!workspace || workspace.userId !== userId) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    let body
    try { body = await req.json() } catch { return NextResponse.json({ error: 'invalid json' }, { status: 400 }) }

    const { sceneType = 'review' } = body || {}

    try {
      await consumeCredits(userId, PRICING.SCENE_REVIEW, 'consume_scene_review', 'scene review init')
    } catch (e) {
      if (e instanceof InsufficientCreditsError) return insufficientCreditsResponse(e)
      throw e
    }

    const modelRuns = await prisma.modelRun.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'desc' },
    })

    const reviewPrompt = '用户问题：' + workspace.prompt + '\n\n已有 ' + modelRuns.length + ' 个AI回答。\n\n请生成审阅场景的初始内容。'

    const result = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [{ role: 'user', content: reviewPrompt }]
    })

    return NextResponse.json({ result, sceneType })
  } catch (error) {
    console.error('[review/init]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
ENDFILE
echo "7. scenes/review/init done"

# 8. stream/[runId]/route.ts
cat > src/app/api/workspaces/\[id\]/stream/\[runId\]/route.ts << 'ENDFILE'
import { NextRequest } from 'next/server'
import { streamChat } from '@/lib/llm-client'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/db'
import { consumeCredits, InsufficientCreditsError } from '@/lib/billing/credits'
import { PRICING } from '@/lib/billing/pricing'
import { insufficientCreditsResponse } from '@/lib/billing/errors'

export async function POST(req: NextRequest, { params }: { params: { id: string; runId: string } }) {
  try {
    const session = await getServerSession(authOptions)
    const userId = (session?.user as any)?.id
    if (!userId) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 })

    const workspaceId = params.id
    const runId = params.runId

    const modelRun = await prisma.modelRun.findUnique({
      where: { id: runId },
      include: { workspace: true },
    })

    if (!modelRun || modelRun.workspace.userId !== userId || modelRun.workspaceId !== workspaceId) {
      return new Response(JSON.stringify({ error: 'not found' }), { status: 404 })
    }

    try {
      await consumeCredits(userId, PRICING.STREAM_SINGLE, 'consume_stream_single', 'stream single')
    } catch (e) {
      if (e instanceof InsufficientCreditsError) return insufficientCreditsResponse(e)
      throw e
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (type: string, data: any) => {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type, ...data }) + '\n\n'))
        }
        try {
          const chatStream = streamChat({
            provider: 'qiniu',
            model: modelRun.model,
            messages: [{ role: 'user', content: modelRun.prompt || modelRun.content }]
          })
          for await (const chunk of chatStream) {
            if (chunk.type === 'token') sendEvent('delta', { text: chunk.data })
            else if (chunk.type === 'error') sendEvent('error', { message: chunk.data })
          }
        } catch (err) {
          sendEvent('error', { message: 'Stream error' })
        }
        sendEvent('done', {})
        controller.close()
      }
    })
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' } })
  } catch (error) {
    console.error('Stream API Error:', error)
    return new Response('Internal error', { status: 500 })
  }
}
ENDFILE
echo "8. stream/[runId] done"

echo ""
echo "All 8 routes fixed!"