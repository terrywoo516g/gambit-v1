# Phase 4 Brief：多AI审稿 + 旁观者 + 灵光一闪

## 目标

1. 实现"多AI审稿"
场景的完整闭环
2
. 实现旁观者（Observer）功能
3
. 实现灵光一闪（Spark）功能

## 前置条件

Phase 
0、1、2、3
 已完成。

## 第一部分：多AI审稿

### 1.1 新建审稿初始化 API

新建 `src/app/api/workspaces/[id]/scenes/review/init/route.ts`：

```typescript
import { NextRequest, NextResponse } 
from 'next/server'
import { prisma } 
from '@/lib/db'
import { chatOnce } 
from '@/lib/llm-client'
import { v4 
as uuidv4 } from 'uuid'

export async 
function POST(req: NextRequest, { params }: { params: { id: string } }) 
{
  try
 {
    const workspace = await prisma.workspace.findUnique
({
      where: { id
: params.id },
      include: { modelRuns: { where: { status: 'completed'
 } } },
    })

    if
 (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404
 })
    }

    const allOutputs
 = workspace.modelRuns
      .
map
(r => `【${r.model}】的审阅意见：\n${r.content}`)
      .
join('\n\n---\n\n'
)

    const extractPrompt
 = `你是一个审阅意见整理专家。用户提交了一份文档让多个 AI 审阅。

用户的原始问题/文档：「${workspace.prompt}」

以下是各 AI 的审阅意见：

${allOutputs}

请将所有审阅意见整理、去重、归类，输出为 JSON 格式：

{
  "suggestions"
: [
    {
      "id": "s1"
,
      "type": "逻辑问题"
,
      "severity": "重要"
,
      "content": "具体的修改建议"
,
      "quote": "涉及的原文片段（如果有）"
,
      "sources": ["AI名1", "AI名2"
],
      "consensusCount": 2
    }
  ]
}

要求：
- type 从以下选择：逻辑问题、表述问题、事实错误、补充建议、风险提醒、格式问题
- severity 从以下选择：关键、重要、建议
- 如果多个 AI 提出了相同或类似的意见，合并为一条并在 sources 中列出所有来源 AI
- consensusCount 表示几个 AI 提出了这个意见
- 按 severity 排序：关键 > 重要 > 建议
- 最多 
20
 条`

    const result = await chatOnce
({
      provider: 'qiniu'
,
      model: 'deepseek/deepseek-v3.2-251201'
,
      messages: [{ role: 'user', content
: extractPrompt }],
    })

    let suggestionsData
    try
 {
      const jsonMatch = result.match
(/\{[\s\S]*\}/)
      suggestionsData = JSON.
parse(jsonMatch?.[0
] || result)
    } 
catch
 {
      suggestionsData = {
        suggestions: [{ id: 
's1', type: '解析失败', severity: '建议', content: '请重试', quote: '', sources: [], consensusCount: 0
 }],
      }
    }

    const session = await prisma.sceneSession.create
({
      data
: {
        id: uuidv4
(),
        workspaceId
: workspace.id,
        sceneType: 'review'
,
        status: 'active'
,
        userSelections: JSON.stringify({ accepted: [], rejected: [], edited
: {} }),
      },
    })

    const artifact = await prisma.artifact.create
({
      data
: {
        id: uuidv4
(),
        workspaceId
: workspace.id,
        type: 'review_suggestions'
,
        payload: JSON.stringify
(suggestionsData),
        version: 1
,
      },
    })

    return NextResponse.json
({
      sceneSessionId
: session.id,
      artifactId
: artifact.id,
      suggestions
: suggestionsData.suggestions,
    })
  } 
catch
 (err) {
    console.
error('[review/init]'
, err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500
 })
  }
}
1.2 新建审稿场景页面
新建 src/app/workspace/[id]/scene/review/page.tsx：
Copy
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Suggestion
 = {
  id: string; type: string; severity: string; content: string
  quote: string; sources: string[]; consensusCount: number
}

const SEVERITY_COLORS: Record<string, string
> = {
  '关键': 'border-red-300 bg-red-50'
,
  '重要': 'border-yellow-300 bg-yellow-50'
,
  '建议': 'border-blue-200 bg-blue-50'
,
}

export default function ReviewScenePage(
) {
  const params = useParams<{ id: string
 }>()
  const router = useRouter
()
  const wsId = params.id

  const [loading, setLoading] = useState(true
)
  const [sceneId, setSceneId] = useState<string | null>(null
)
  const [suggestions, setSuggestions] = useState<Suggestion
[]>([])
  const [accepted, setAccepted] = useState<string
[]>([])
  const [rejected, setRejected] = useState<string
[]>([])
  const [generating, setGenerating] = useState(false
)
  const [report, setReport] = useState<string | null>(null
)

  useEffect(() =>
 {
    if (!wsId) return
    async function init(
) {
      try
 {
        setLoading(true
)
        const res = await fetch(`/api/workspaces/${wsId}/scenes/review/init`, { method: 'POST'
 })
        const data = await res.json
()
        if (!res.ok) throw new Error(data.error
)
        setSceneId(data.sceneSessionId
)
        setSuggestions(data.suggestions
 || [])
      } 
catch
 (e) {
        alert(e instanceof Error ? e.message : '初始化失败'
)
      } 
finally
 {
        setLoading(false
)
      }
    }
    void init
()
  }, [wsId])

  function handleAccept(id: string
) {
    setAccepted(prev => prev.includes
(id) ? prev : [...prev, id])
    setRejected(prev => prev.filter(r =>
 r !== id))
  }

  function handleReject(id: string
) {
    setRejected(prev => prev.includes
(id) ? prev : [...prev, id])
    setAccepted(prev => prev.filter(a =>
 a !== id))
  }

  function acceptAllConsensus(
) {
    const consensusIds = suggestions.filter(s => s.consensusCount >= 2).map(s => s.id
)
    setAccepted(prev => [...new Set
([...prev, ...consensusIds])])
    setRejected(prev => prev.filter(r => !consensusIds.includes
(r)))
  }

  async function handleGenerate(
) {
    if (!sceneId) return
    await fetch(`/api/scenes/${sceneId}/selections`
, {
      method: 'PATCH'
,
      headers: { 'Content-Type': 'application/json'
 },
      body: JSON.stringify({ starred: accepted, excluded
: rejected }),
    })

    try
 {
      setGenerating(true
)
      const res = await fetch(`/api/scenes/${sceneId}/generate`, { method: 'POST'
 })
      const data = await res.json
()
      if (!res.ok) throw new Error(data.error
)
      setReport(data.content
)
    } 
catch
 (e) {
      alert(e instanceof Error ? e.message : '生成失败'
)
    } 
finally
 {
      setGenerating(false
)
    }
  }

  if
 (loading) {
    return
 (
      <div className="min-h-screen blueprint-grid flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-inkLight text-sm">正在汇总各 AI 的审阅意见...</p>
        </div>
      </div>
    )
  }

  return
 (
    <div className="min-h-screen blueprint-grid flex flex-col">
      <header className="h-14 border-b border-black/5 flex items-center justify-between px-6 bg-paper/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/workspace/' + wsId)} className="text-inkLight hover:text-accent text-sm">← 返回工作台</button>
          <span className="font-semibold text-ink text-sm">✅ 多AI审稿</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={acceptAllConsensus} className="text-xs text-inkLight hover:text-accent border border-gray-200 px-3 py-1.5 rounded-lg">
            一键接受共识意见
          </button>
          <button onClick={handleGenerate} disabled={generating || accepted.length === 0}
            className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition">
            {generating ? '生成中...' : '生成修改稿'}
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 左栏：意见列表 */}
        <div className={`overflow-y-auto p-6 ${report ? 'w-3/5' : 'w-full'}`}>
          <div className="text-xs text-inkLight mb-4">
            共 {suggestions.length} 条意见 · 已接受 {accepted.length} · 已拒绝 {rejected.length}
          </div>

          <div className="space-y-3">
            {suggestions.map(s => {
              const isAccepted = accepted.includes(s.id)
              const isRejected = rejected.includes(s.id)
              return (
                <div key={s.id} className={`border rounded-xl p-4 transition
 ${
                  isAccepted ? 'border-green-300 bg-green-50' :
                  isRejected ? 'border-gray-200 bg-gray-50 opacity-50' :
                  SEVERITY_COLORS[s.severity] || 'border-gray-200 bg-white
'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded
 ${
                        s.severity === '关键' ? 'bg-red-100 text-red-700' :
                        s.severity === '重要' ? 'bg-yellow-100 text-yellow-700' :
                        '
bg-blue-100 text-blue-700
'
                      }`}>
{s.severity}</span>
                      <span className="text-xs text-inkLight">{s.type}</span>
                      {s.consensusCount >= 2 && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          {s.consensusCount} AI 共识
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-inkLight">{s.sources.join(', ')}</span>
                  </div>

                  <p className="text-sm text-ink mb-2">{s.content}</p>

                  {s.quote && (
                    <div className="text-xs text-inkLight bg-white/50 border border-gray-200 rounded px-2 py-1 mb-3">
                      原文："{s.quote}"
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() =>
 handleAccept(s.id)}
                      className={`text-xs px-3 py-1 rounded ${isAccepted ? 'bg-green-500 text-white' : 'bg-white border border-gray-200 text-inkLight hover:border-green-400'}`}>
                      {isAccepted ? '✓ 已接受' : '接受'}
                    </button>
                    <button onClick={() =>
 handleReject(s.id)}
                      className={`text-xs px-3 py-1 rounded ${isRejected ? 'bg-red-400 text-white' : 'bg-white border border-gray-200 text-inkLight hover:border-red-300'}`}>
                      {isRejected ? '✕ 已拒绝' : '拒绝'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 右栏：修改稿 */}
        {report && (
          <div className="w-2/5 border-l border-gray-200 bg-white p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-ink">修改稿</h3>
              <button onClick={() =>
 navigator.clipboard.writeText(report)}
                className="text-xs text-inkLight hover:text-accent">复制全文
</button>
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
1.3 更新 generate API 支持 review
在 src/app/api/scenes/[sceneId]/generate/route.ts 中增加 review 分支：
Copy
if (session.sceneType === 'review'
) {
  const acceptedIds = selections.starred
 || []

  const reviewArtifact = await prisma.artifact.findFirst
({
    where: { workspaceId: workspace.id, type: 'review_suggestions'
 },
    orderBy: { version: 'desc'
 },
  })

  const allSuggestions = reviewArtifact ? JSON.parse(reviewArtifact.payload).suggestions
 : []
  const acceptedSuggestions = allSuggestions.filter((s: any) => acceptedIds.includes(s.id
))

  const generatePrompt = 
`你是一个专业的文字编辑。用户的原始文档/问题是：

「
${workspace.prompt}
」

用户接受了以下修改意见：

${acceptedSuggestions.map((s: any, i: number
) =>
  `${i + 1}. [${s.type}/${s.severity}] ${s.content}${s.quote ? ` (原文："${s.quote}")` : ''}`
).join(
'\n')}

请根据这些修改意见，生成修改后的版本。要求：
1. 将所有接受的修改意见应用到原文中
2. 保持原文的整体结构和风格
3. 在修改处用 **加粗** 标记改动的内容
4. 文末附一个简短的修改说明，列出改了什么

用 Markdown 格式输出。`

  const revised = await chatOnce
({
    provider: 'qiniu'
,
    model: 'deepseek/deepseek-v3.2-251201'
,
    messages: [{ role: 'user', content
: generatePrompt }],
  })

  const draft = await prisma.finalDraft.create
({
    data
: {
      id: uuidv4
(),
      sceneSessionId: session.id
,
      content
: revised,
      format: 'markdown'
,
      version: 1
,
    },
  })

  await prisma.sceneSession.update
({
    where: { id: session.id
 },
    data: { status: 'completed'
 },
  })

  return NextResponse.json({ draftId: draft.id, content
: revised })
}
Copy
1.4 修改工作台跳转
Copy
function handleSceneClick(scene: string
) {
  router.
push('/workspace/' + wsId + '/scene/'
 + scene)
}
现在所有四个场景都有对应的页面了，不再需要 alert 占位。
 
第二部分：旁观者（Observer）
2.1 新建旁观者 API
新建 src/app/api/workspaces/[id]/observer/route.ts：
Copy
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { chatOnce } from '@/lib/llm-client'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest, { params }: { params: { id: string } }
) {
  try
 {
    const workspace = await prisma.workspace.findUnique
({
      where: { id: params.id
 },
      include: { modelRuns: { where: { status: 'completed'
 } } },
    })

    if
 (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404
 })
    }

    const allOutputs = workspace.modelRuns
      .
map(r => `【${r.model}】：${r.content.slice(0, 800)}`
)
      .
join('\n\n'
)

    const observerPrompt = 
`你是一个独立的第三方观察者。你的任务是以局外人的视角审视以下多个 AI 对同一个问题的回答，找出它们共同的盲点和潜在问题。

用户问题：「
${workspace.prompt}
」

各 AI 回答摘要：
${allOutputs}

请输出一段简洁的分析（不超过 300 字），包含：
1. 【遗漏角度】所有 AI 都没提到但可能重要的角度
2. 【潜在偏见】各 AI 回答中可能存在的偏见或假设
3. 【建议追问】基于以上分析，建议用户进一步追问的方向

保持简洁、直接、有启发性。不要重复 AI 已经说过的内容。`

    const analysis = await chatOnce
({
      provider: 'qiniu'
,
      model: 'deepseek-r1-0528', // 用更强的推理模型
      messages: [{ role: 'user', content
: observerPrompt }],
    })

    const artifact = await prisma.artifact.create
({
      data
: {
        id: uuidv4
(),
        workspaceId: workspace.id
,
        type: 'observer'
,
        payload: JSON.stringify({ content
: analysis }),
        version: 1
,
      },
    })

    return NextResponse.json
({
      artifactId: artifact.id
,
      content
: analysis,
    })
  } 
catch
 (err) {
    console.error('[observer]'
, err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500
 })
  }
}
Copy
2.2 新建灵光一闪 API
新建 src/app/api/workspaces/[id]/spark/route.ts：
Copy
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { chatOnce } from '@/lib/llm-client'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest, { params }: { params: { id: string } }
) {
  try
 {
    const workspace = await prisma.workspace.findUnique
({
      where: { id: params.id
 },
      include: { modelRuns: { where: { status: 'completed'
 } } },
    })

    if
 (!workspace) {
      return NextResponse.json({ error: 'Workspace not found' }, { status: 404
 })
    }

    const allOutputs = workspace.modelRuns
      .
map(r => `【${r.model}】：${r.content.slice(0, 500)}`
)
      .
join('\n\n'
)

    const sparkPrompt = 
`你是一个创意思维专家。你的任务是跳出所有 AI 回答的思维框架，提供一个出人意料但有价值的新角度。

用户问题：「
${workspace.prompt}
」

各 AI 回答的大致方向：
${allOutputs}

请提供一个完全不同于以上所有 AI 的视角（不超过 200 字），包含：
1. 【意外角度】一个反直觉或跨领域的新思路
2. 【为什么值得考虑】这个角度的合理性
3. 【可以继续探索的问题】如果用户感兴趣，可以追问什么

要求：大胆、新颖、有启发性。不要跟已有回答重复。`

    const idea = await chatOnce
({
      provider: 'qiniu'
,
      model: 'deepseek-r1-0528'
,
      messages: [{ role: 'user', content
: sparkPrompt }],
    })

    const artifact = await prisma.artifact.create
({
      data
: {
        id: uuidv4
(),
        workspaceId: workspace.id
,
        type: 'spark'
,
        payload: JSON.stringify({ content
: idea }),
        version: 1
,
      },
    })

    return NextResponse.json
({
      artifactId: artifact.id
,
      content
: idea,
    })
  } 
catch
 (err) {
    console.error('[spark]'
, err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500
 })
  }
}
Copy
2.3 在工作台页面添加旁观者和灵光一闪
修改 src/app/workspace/[id]/page.tsx，在操作栏区域添加两个按钮和对应的抽屉面板。
在组件内新增以下 state：
Copy
const [observerContent, setObserverContent] = useState<string | null>(null
)
const [sparkContent, setSparkContent] = useState<string | null>(null
)
const [observerLoading, setObserverLoading] = useState(false
)
const [sparkLoading, setSparkLoading] = useState(false
)
const [showDrawer, setShowDrawer] = useState<'observer' | 'spark' | null>(null
)
新增两个函数：
Copy
async function handleObserver(
) {
  try
 {
    setObserverLoading(true
)
    setShowDrawer('observer'
)
    const res = await fetch('/api/workspaces/' + wsId + '/observer', { method: 'POST'
 })
    const data = await res.json
()
    if (!res.ok) throw new Error(data.error
)
    setObserverContent(data.content
)
  } 
catch
 (e) {
    alert(e instanceof Error ? e.message : '旁观者调用失败'
)
  } 
finally
 {
    setObserverLoading(false
)
  }
}

async function handleSpark(
) {
  try
 {
    setSparkLoading(true
)
    setShowDrawer('spark'
)
    const res = await fetch('/api/workspaces/' + wsId + '/spark', { method: 'POST'
 })
    const data = await res.json
()
    if (!res.ok) throw new Error(data.error
)
    setSparkContent(data.content
)
  } 
catch
 (e) {
    alert(e instanceof Error ? e.message : '灵光一闪调用失败'
)
  } 
finally
 {
    setSparkLoading(false
)
  }
}
在操作栏的四个场景按钮右侧添加：
Copy
<div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-200"
>
  <button onClick={handleObserver} disabled={observerLoading}
    className="px-3 py-2 rounded-xl text-sm border border-gray-200 bg-white text-inkLight hover:border-accent transition disabled:opacity-40">
    {observerLoading ? '分析中...' : '👁️ 旁观者'}
  </button>
  <button onClick={handleSpark} disabled={sparkLoading}
    className="px-3 py-2 rounded-xl text-sm border border-gray-200 bg-white text-inkLight hover:border-accent transition disabled:opacity-40">
    {sparkLoading ? '思考中...' : '⚡ 灵光一闪'}
  </button>
</div>
在页面最外层（</div> 之前）添加抽屉面板：
Copy
{showDrawer && (
  <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-xl z-50 flex flex-col">
    <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
      <span className="font-semibold text-sm">
        {showDrawer === 'observer' ? '👁️ 旁观者视角' : '⚡ 灵光一闪'}
      </span>
      <button onClick={() => setShowDrawer(null)} className="text-inkLight hover:text-ink">✕</button>
    </div>
    <div className="flex-1 overflow-y-auto p-4">
      {(showDrawer === 'observer' && observerLoading) || (showDrawer === 'spark' && sparkLoading) ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-6 h-6 border-2 border-accent border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {(showDrawer === 'observer' ? observerContent : sparkContent) || ''}
          </ReactMarkdown>
        </div>
      )}
    </div>
    <div className="border-t border-gray-200 p-3 shrink-0">
      <button onClick={() =>
 {
        const content = showDrawer === 'observer' ? observerContent : sparkContent
        if (content) navigator.clipboard.writeText(content)
      }} className="w-full text-sm text-inkLight hover:text-accent py-2 border border-gray-200 rounded-lg">
        复制内容
      </button>
    </div>
  </div>
)}
Copy
确保在文件顶部 import 了 ReactMarkdown 和 remarkGfm（如果还没有的话）。
第三步：验证
Copy
pnpm build
完成标志
Phase 4 全部完成后：
1. 多AI审稿：用户点击"帮我汇总审阅意见" → 看到结构化的意见列表 → 逐条接受/拒绝 → 一键接受共识意见 → 生成修改稿
2. 旁观者：操作栏右侧"👁️ 旁观者"按钮 → 右侧抽屉展示第三方视角分析 → 可复制
3. 灵光一闪：操作栏右侧"⚡ 灵光一闪"按钮 → 右侧抽屉展示意外角度 → 可复制
4. 所有四个场景按钮都可正常跳转到对应场景页面