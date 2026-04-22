# Phase 2 Brief：头脑风暴场景

## 目标

实现"头脑风暴"场景的完整闭环。用户在工作台点击"帮我分析共识和分歧"后，进入头脑风暴页面，系统自动生成 Reflection 报告（强共识/弱共识/差异化观点/盲点），用户可以标记认同的观点，最终生成决策建议。

## 前置条件

Phase 0 和 Phase 1 已完成。

## 不动的文件

除了以下新建/修改的文件外，其他文件都不动。

## 第一步：新建头脑风暴初始化 API

新建 `src/app/api/workspaces/[id]/scenes/brainstorm/init/route.ts`：

```typescript
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

    if (workspace.modelRuns.length < 2) {
      return NextResponse.json({ error: 'Need at least 2 completed runs' }, { status: 400 })
    }

    const allOutputs = workspace.modelRuns
      .map(r => `【${r.model}】的回答：\n${r.content}`)
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
第二步：新建头脑风暴场景页面
新建 src/app/workspace/[id]/scene/brainstorm/page.tsx：

Copy'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type ReflectionData = {
  strongConsensus: { point: string; supporters: string[] }[]
  weakConsensus: { point: string; supporters: string[]; dissenters: string[] }[]
  divergent: { point: string; source: string; reasoning: string }[]
  blindSpots: { point: string; reasoning: string }[]
  keyQuestions: { question: string; context: string }[]
}

export default function BrainstormScenePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const wsId = params.id

  const [loading, setLoading] = useState(true)
  const [sceneId, setSceneId] = useState<string | null>(null)
  const [reflection, setReflection] = useState<ReflectionData | null>(null)
  const [adopted, setAdopted] = useState<string[]>([])
  const [rejected, setRejected] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'consensus' | 'divergent' | 'blind'>('consensus')

  useEffect(() => {
    if (!wsId) return
    async function init() {
      try {
        setLoading(true)
        const res = await fetch(`/api/workspaces/${wsId}/scenes/brainstorm/init`, { method: 'POST' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setSceneId(data.sceneSessionId)
        setReflection(data.reflection)
      } catch (e) {
        alert(e instanceof Error ? e.message : '初始化失败')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [wsId])

  function toggleAdopt(point: string) {
    setAdopted(prev => prev.includes(point) ? prev.filter(p => p !== point) : [...prev, point])
    setRejected(prev => prev.filter(p => p !== point))
  }

  function toggleReject(point: string) {
    setRejected(prev => prev.includes(point) ? prev.filter(p => p !== point) : [...prev, point])
    setAdopted(prev => prev.filter(p => p !== point))
  }

  async function handleGenerate() {
    if (!sceneId) return
    // 先保存选择
    await fetch(`/api/scenes/${sceneId}/selections`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred: adopted, excluded: rejected, editedRows: { notes } }),
    })

    try {
      setGenerating(true)
      const res = await fetch(`/api/scenes/${sceneId}/generate`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReport(data.content)
    } catch (e) {
      alert(e instanceof Error ? e.message : '生成失败')
    } finally {
      setGenerating(false)
    }
  }

  function PointCard({ point, tag, detail }: { point: string; tag?: string; detail?: string }) {
    const isAdopted = adopted.includes(point)
    const isRejected = rejected.includes(point)
    return (
      <div className={`border rounded-xl p-4 transition ${
        isAdopted ? 'border-green-300 bg-green-50' :
        isRejected ? 'border-red-200 bg-red-50 opacity-60' :
        'border-gray-200 bg-white'
      }`}>
        {tag && <span className="text-xs font-mono text-inkLight mb-1 block">{tag}</span>}
        <p className="text-sm text-ink mb-2">{point}</p>
        {detail && <p className="text-xs text-inkLight mb-3">{detail}</p>}
        <div className="flex gap-2">
          <button onClick={() => toggleAdopt(point)}
            className={`text-xs px-2 py-1 rounded ${isAdopted ? 'bg-green-500 text-white' : 'bg-gray-100 text-inkLight hover:bg-green-100'}`}>
            {isAdopted ? '✓ 认同' : '认同'}
          </button>
          <button onClick={() => toggleReject(point)}
            className={`text-xs px-2 py-1 rounded ${isRejected ? 'bg-red-500 text-white' : 'bg-gray-100 text-inkLight hover:bg-red-100'}`}>
            {isRejected ? '✕ 不认同' : '不认同'}
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen blueprint-grid flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-inkLight text-sm">正在分析各 AI 的共识与分歧...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen blueprint-grid flex flex-col">
      <header className="h-14 border-b border-black/5 flex items-center justify-between px-6 bg-paper/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/workspace/' + wsId)} className="text-inkLight hover:text-accent text-sm">← 返回工作台</button>
          <span className="font-semibold text-ink text-sm">⚖️ 头脑风暴</span>
        </div>
        <button onClick={handleGenerate} disabled={generating}
          className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition">
          {generating ? '生成中...' : '生成决策建议'}
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 左栏：Reflection */}
        <div className={`overflow-y-auto p-6 ${report ? 'w-3/5' : 'w-full'}`}>
          {/* Tab 切换 */}
          <div className="flex gap-2 mb-6">
            <button onClick={() => setActiveTab('consensus')}
              className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === 'consensus' ? 'bg-accent text-white' : 'bg-white border border-gray-200 text-inkLight'}`}>
              共识 ({(reflection?.strongConsensus?.length || 0) + (reflection?.weakConsensus?.length || 0)})
            </button>
            <button onClick={() => setActiveTab('divergent')}
              className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === 'divergent' ? 'bg-accent text-white' : 'bg-white border border-gray-200 text-inkLight'}`}>
              差异化观点 ({reflection?.divergent?.length || 0})
            </button>
            <button onClick={() => setActiveTab('blind')}
              className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === 'blind' ? 'bg-accent text-white' : 'bg-white border border-gray-200 text-inkLight'}`}>
              盲点 + 关键问题 ({(reflection?.blindSpots?.length || 0) + (reflection?.keyQuestions?.length || 0)})
            </button>
          </div>

          {/* 共识 Tab */}
          {activeTab === 'consensus' && reflection && (
            <div className="space-y-6">
              {reflection.strongConsensus.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-green-700 mb-3">🟢 强共识（所有 AI 认同）</h3>
                  <div className="space-y-3">
                    {reflection.strongConsensus.map((item, i) => (
                      <PointCard key={i} point={item.point} tag={`${item.supporters.join(', ')} 共同认同`} />
                    ))}
                  </div>
                </div>
              )}
              {reflection.weakConsensus.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-yellow-700 mb-3">🟡 弱共识（多数 AI 认同）</h3>
                  <div className="space-y-3">
                    {reflection.weakConsensus.map((item, i) => (
                      <PointCard key={i} point={item.point}
                        tag={`${item.supporters.join(', ')} 认同 · ${item.dissenters.join(', ')} 不同意`} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 差异化 Tab */}
          {activeTab === 'divergent' && reflection && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-blue-700 mb-3">🔵 差异化观点（独特视角）</h3>
              {reflection.divergent.map((item, i) => (
                <PointCard key={i} point={item.point}
                  tag={`来自 ${item.source}`} detail={item.reasoning} />
              ))}
            </div>
          )}

          {/* 盲点 Tab */}
          {activeTab === 'blind' && reflection && (
            <div className="space-y-6">
              {reflection.blindSpots.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-700 mb-3">👁️ 盲点提醒</h3>
                  <div className="space-y-3">
                    {reflection.blindSpots.map((item, i) => (
                      <PointCard key={i} point={item.point} detail={item.reasoning} />
                    ))}
                  </div>
                </div>
              )}
              {reflection.keyQuestions.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-purple-700 mb-3">❓ 关键问题</h3>
                  <div className="space-y-3">
                    {reflection.keyQuestions.map((item, i) => (
                      <div key={i} className="border border-gray-200 bg-white rounded-xl p-4">
                        <p className="text-sm font-medium text-ink mb-1">{item.question}</p>
                        <p className="text-xs text-inkLight">{item.context}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-semibold text-ink mb-2">📝 我的思考</h3>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="写下你的想法、约束条件、个人偏好..."
                  className="w-full min-h-[100px] p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-accent" />
              </div>
            </div>
          )}

          <div className="mt-6 text-xs text-inkLight">
            已认同 {adopted.length} 个观点 · 已否定 {rejected.length} 个观点
          </div>
        </div>

        {/* 右栏：决策建议 */}
        {report && (
          <div className="w-2/5 border-l border-gray-200 bg-white p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-ink">决策建议</h3>
              <button onClick={() => navigator.clipboard.writeText(report)}
                className="text-xs text-inkLight hover:text-accent">复制全文</button>
            </div>
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
Copy
第三步：更新 generate API 以支持头脑风暴
修改 src/app/api/scenes/[sceneId]/generate/route.ts，在现有的逻辑中加入对 brainstorm 场景的处理。

在 const session = await prisma.sceneSession.findUnique(...) 之后，const selections = JSON.parse(session.userSelections) 之后，加入分支判断：

Copy// 在已有代码中，根据 session.sceneType 做分支

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

// 原有的 compare 逻辑继续保留在下面
Copy
实现方式：整个 generate/route.ts 文件应该在开头读取 session，然后根据 session.sceneType 用 if/else 分支处理不同场景。compare 和 brainstorm 各一个分支。后续 Phase 会继续加 compose 和 review 分支。

第四步：修改工作台跳转
修改 src/app/workspace/[id]/page.tsx 的 handleSceneClick：

Copyfunction handleSceneClick(scene: string) {
  if (scene === 'compare') {
    router.push('/workspace/' + wsId + '/scene/compare')
  } else if (scene === 'brainstorm') {
    router.push('/workspace/' + wsId + '/scene/brainstorm')
  } else {
    alert('「' + SCENE_BUTTONS.find(s => s.key === scene)?.label + '」即将上线，敬请期待！')
  }
}
第五步：验证
Copypnpm build
完成标志
Phase 2 完成后，用户可以：

在工作台点击"帮我分析共识和分歧"
看到 Reflection 报告：强共识、弱共识、差异化观点、盲点、关键问题
对每个观点标记"认同"或"不认同"
写下自己的想法
生成决策建议报告