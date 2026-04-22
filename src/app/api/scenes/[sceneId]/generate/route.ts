import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { chatOnce } from '@/lib/llm-client'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest, { params }: { params: { sceneId: string } }) {
  try {
    const session = await prisma.sceneSession.findUnique({
      where: { id: params.sceneId },
      include: {
        workspace: true,
      },
    })

    if (!session) {
      return NextResponse.json({ error: 'Scene session not found' }, { status: 404 })
    }

    const selections = JSON.parse(session.userSelections)
    const workspace = session.workspace

    // 根据场景类型做分支处理
    if (session.sceneType === 'brainstorm') {
      // 获取 reflection artifact
      const reflectionArtifact = await prisma.artifact.findFirst({
        where: { workspaceId: workspace.id, type: 'reflection' },
        orderBy: { version: 'desc' },
      })

      const reflection = reflectionArtifact ? JSON.parse(reflectionArtifact.payload) : {}
      const adopted = selections.starred || []
      const rejected = selections.excluded || []
      const userNotes = selections.editedRows?.notes || ''

      const generatePrompt = `你是一个决策顾问。用户的问题是：「${workspace.prompt}」

以下是对多个 AI 回答的 Reflection 分析结果：
${JSON.stringify(reflection, null, 2)}

用户认同的观点：${adopted.length > 0 ? adopted.join('；') : '未标记'}
用户否定的观点：${rejected.length > 0 ? rejected.join('；') : '未标记'}
用户补充的想法：${userNotes || '无'}

请生成一份决策建议报告，包含：
1. 综合分析（基于共识和用户偏好）
2. 建议结论（不要替用户做决定，用"建议考虑..."的措辞）
3. 关键风险提醒
4. 建议的下一步行动（具体可执行的 2-3 步）

用 Markdown 格式输出，控制在 500 字以内。`

      const report = await chatOnce({
        provider: 'qiniu',
        model: 'deepseek/deepseek-v3.2-251201',
        messages: [{ role: 'user', content: generatePrompt }],
      })

      const draft = await prisma.finalDraft.create({
        data: {
          id: uuidv4(),
          sceneSessionId: session.id,
          content: report,
          format: 'markdown',
          version: 1,
        },
      })

      await prisma.sceneSession.update({
        where: { id: session.id },
        data: { status: 'completed' },
      })

      return NextResponse.json({ draftId: draft.id, content: report })
    }

    if (session.sceneType === 'compose') {
      const editedRows = selections.editedRows || {}
      const title = editedRows.title || ''
      const structure = editedRows.structure || ''
      const body = editedRows.body || ''
      const extra = editedRows.extra || ''

      // 构建素材描述
      const parts: string[] = []
      if (title) parts.push(`【用户选定的标题】\n${title}`)
      if (structure) parts.push(`【用户选定的核心思想/结构框架】\n${structure}`)
      if (body) parts.push(`【用户选定的正文内容/精彩片段】\n${body}`)

      const generatePrompt = `你是一个顶级文案编辑。用户的原始需求是：「${workspace.prompt}」

用户从多个 AI 的回答中，亲手挑选了以下素材：

${parts.join('\n\n')}

${extra ? `用户对最终稿的额外要求：${extra}` : ''}

请基于用户挑选的素材，生成一篇完整的最终稿。要求：
1. 如果用户提供了标题，使用该标题（可以微调使其更出彩，但保持用户选择的方向）
2. 如果用户提供了结构框架，按照该结构组织全文
3. 如果用户提供了正文片段，保留其中的核心表达和金句，将它们自然地融入文章
4. 统一全文的语气和风格，确保段落之间衔接流畅
5. 不要凭空添加用户素材中没有的事实性信息
6. 可以适当润色、补充过渡句和修辞，使文章更完整

用 Markdown 格式输出。`

      const article = await chatOnce({
        provider: 'qiniu',
        model: 'deepseek/deepseek-v3.2-251201',
        messages: [{ role: 'user', content: generatePrompt }],
      })

      const draft = await prisma.finalDraft.create({
        data: {
          id: uuidv4(),
          sceneSessionId: session.id,
          content: article,
          format: 'markdown',
          version: 1,
        },
      })

      await prisma.sceneSession.update({
        where: { id: session.id },
        data: { status: 'completed' },
      })

      return NextResponse.json({ draftId: draft.id, content: article })
    }

    if (session.sceneType === 'review') {
      const acceptedIds = selections.starred || []

      const reviewArtifact = await prisma.artifact.findFirst({
        where: { workspaceId: workspace.id, type: 'review_suggestions' },
        orderBy: { version: 'desc' },
      })

      const allSuggestions = reviewArtifact ? JSON.parse(reviewArtifact.payload).suggestions : []
      const acceptedSuggestions = allSuggestions.filter((s: { id: string }) => acceptedIds.includes(s.id))

      const generatePrompt = `你是一个专业的文字编辑。用户的原始文档/问题是：

「${workspace.prompt}」

用户接受了以下修改意见：

${acceptedSuggestions.map((s: { type: string; severity: string; content: string; quote?: string }, i: number) =>
  `${i + 1}. [${s.type}/${s.severity}] ${s.content}${s.quote ? ` (原文："${s.quote}")` : ''}`
).join('\n')}

请根据这些修改意见，生成修改后的版本。要求：
1. 将所有接受的修改意见应用到原文中
2. 保持原文的整体结构和风格
3. 在修改处用 **加粗** 标记改动的内容
4. 文末附一个简短的修改说明，列出改了什么

用 Markdown 格式输出。`

      const revised = await chatOnce({
        provider: 'qiniu',
        model: 'deepseek/deepseek-v3.2-251201',
        messages: [{ role: 'user', content: generatePrompt }],
      })

      const draft = await prisma.finalDraft.create({
        data: {
          id: uuidv4(),
          sceneSessionId: session.id,
          content: revised,
          format: 'markdown',
          version: 1,
        },
      })

      await prisma.sceneSession.update({
        where: { id: session.id },
        data: { status: 'completed' },
      })

      return NextResponse.json({ draftId: draft.id, content: revised })
    }

    // 原有的 compare 逻辑
    // 获取表格数据
    const artifact = await prisma.artifact.findFirst({
      where: { workspaceId: workspace.id, type: 'comparison_table' },
      orderBy: { version: 'desc' },
    })

    if (!artifact) {
      return NextResponse.json({ error: 'No comparison table found' }, { status: 400 })
    }

    const tableData = JSON.parse(artifact.payload)
    const starred = selections.starred || []
    const excluded = selections.excluded || []

    // 过滤表格
    const filteredRows = tableData.rows.filter((row: Record<string, string>, idx: number) => {
      const name = row['名称'] || row[tableData.columns[0]]
      return !excluded.includes(name) && !excluded.includes(idx)
    })

    const starredRows = filteredRows.filter((row: Record<string, string>, idx: number) => {
      const name = row['名称'] || row[tableData.columns[0]]
      return starred.includes(name) || starred.includes(idx)
    })

    const generatePrompt = `你是一个调研分析专家。用户的问题是：「${workspace.prompt}」

以下是整理后的对比信息：

全部选项：
${JSON.stringify(filteredRows, null, 2)}

用户标星（感兴趣）的选项：
${starredRows.length > 0 ? JSON.stringify(starredRows, null, 2) : '用户未标星任何选项'}

请生成一份简洁的推荐报告，包含：
1. Top 3 推荐（如果标星了就优先推荐标星的）
2. 每个推荐的理由（2-3 句话）
3. 不推荐的选项及原因（如果有明显不好的）
4. 最终建议（一句话总结）

用 Markdown 格式输出。`

    const report = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [
        { role: 'user', content: generatePrompt },
      ],
    })

    // 保存最终稿
    const draft = await prisma.finalDraft.create({
      data: {
        id: uuidv4(),
        sceneSessionId: session.id,
        content: report,
        format: 'markdown',
        version: 1,
      },
    })

    // 更新 session 状态
    await prisma.sceneSession.update({
      where: { id: session.id },
      data: { status: 'completed' },
    })

    return NextResponse.json({
      draftId: draft.id,
      content: report,
    })
  } catch (err) {
    console.error('[generate]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
