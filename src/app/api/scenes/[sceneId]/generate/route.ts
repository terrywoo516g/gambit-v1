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
