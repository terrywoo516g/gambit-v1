# Phase 1 Brief：多源对比场景

## 目标

实现"多源对比"场景的完整闭环。用户在工作台点击"帮我整理成对比表格"后，进入多源对比场景页面，系统自动从各 AI 输出中提取可比较的对象和维度生成表格，用户可以编辑、标星、排除，最终生成推荐报告。

## 前置条件

Phase 0 已完成：Prisma schema 更新、新 API 路由、首页、工作台多模型并行输出、操作栏。

## 不动的文件

- `src/lib/llm-client.ts`
- `src/lib/utils.ts`
- `src/lib/db.ts`
- `src/lib/model-registry.ts`（Phase 0 新建）
- `src/hooks/useMultiStream.ts`（Phase 0 新建）
- `src/hooks/useMessageStream.ts`
- `src/prompts/**`
- `src/app/page.tsx`（首页不改）
- `src/app/workspaces/page.tsx`（历史页不改）

## 第一步：新建场景初始化 API

新建 `src/app/api/workspaces/[id]/scenes/compare/init/route.ts`：

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
      return NextResponse.json({ error: 'Need at least 2 completed model runs' }, { status: 400 })
    }

    // 构建提取 prompt
    const allOutputs = workspace.modelRuns
      .map(r => `【${r.model}】的回答：\n${r.content}`)
      .join('\n\n---\n\n')

    const extractPrompt = `你是一个信息整理专家。用户的问题是：「${workspace.prompt}」

以下是多个 AI 对这个问题的回答：

${allOutputs}

请从这些回答中提取可以对比的对象和维度，整理成一个 JSON 格式的结构化表格。

要求：
1. 识别所有被提及的可比较对象（如产品、方案、选项等）
2. 提取合适的对比维度（如价格、优点、缺点、适用场景、推荐理由等）
3. 去重合并相同的对象
4. 标注每条信息来自哪个 AI

返回格式（严格 JSON，不要其他内容）：
{
  "columns": ["名称", "维度1", "维度2", "维度3", "来源AI"],
  "rows": [
    {"名称": "选项A", "维度1": "值1", "维度2": "值2", "维度3": "值3", "来源AI": "DeepSeek V3.2, Kimi K2.5"},
    {"名称": "选项B", "维度1": "值1", "维度2": "值2", "维度3": "值3", "来源AI": "豆包 Seed 2.0 Pro"}
  ]
}

注意：
- columns 数组的第一项必须是"名称"，最后一项必须是"来源AI"
- 中间的维度根据问题类型自动确定，通常 3-6 个维度
- 每行必须包含所有列
- 如果某个维度某个 AI 没提到，填"未提及"
- rows 不要超过 20 行`

    const result = await chatOnce({
      provider: 'qiniu',
      model: 'deepseek/deepseek-v3.2-251201',
      messages: [
        { role: 'user', content: extractPrompt },
      ],
    })

    // 解析 JSON
    let tableData
    try {
      // 尝试提取 JSON（可能被包在 markdown code block 里）
      const jsonMatch = result.match(/\{[\s\S]*\}/)
      tableData = JSON.parse(jsonMatch?.[0] || result)
    } catch {
      tableData = {
        columns: ['名称', '描述', '来源AI'],
        rows: [{ '名称': '解析失败', '描述': '请重试', '来源AI': '-' }],
      }
    }

    // 创建 SceneSession
    const session = await prisma.sceneSession.create({
      data: {
        id: uuidv4(),
        workspaceId: workspace.id,
        sceneType: 'compare',
        status: 'active',
        userSelections: JSON.stringify({ starred: [], excluded: [] }),
      },
    })

    // 创建 Artifact
    const artifact = await prisma.artifact.create({
      data: {
        id: uuidv4(),
        workspaceId: workspace.id,
        type: 'comparison_table',
        payload: JSON.stringify(tableData),
        version: 1,
      },
    })

    return NextResponse.json({
      sceneSessionId: session.id,
      artifactId: artifact.id,
      tableData,
    })
  } catch (err) {
    console.error('[compare/init]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
Copy
第二步：新建场景选择保存 API
新建 src/app/api/scenes/[sceneId]/selections/route.ts：

Copyimport { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest, { params }: { params: { sceneId: string } }) {
  try {
    const body = await req.json()
    const { starred, excluded, editedRows } = body

    const session = await prisma.sceneSession.findUnique({
      where: { id: params.sceneId },
    })

    if (!session) {
      return NextResponse.json({ error: 'Scene session not found' }, { status: 404 })
    }

    const currentSelections = JSON.parse(session.userSelections)
    const updated = {
      ...currentSelections,
      ...(starred !== undefined && { starred }),
      ...(excluded !== undefined && { excluded }),
      ...(editedRows !== undefined && { editedRows }),
    }

    await prisma.sceneSession.update({
      where: { id: params.sceneId },
      data: { userSelections: JSON.stringify(updated) },
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[selections PATCH]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
Copy
第三步：新建最终稿生成 API
新建 src/app/api/scenes/[sceneId]/generate/route.ts：

Copyimport { NextRequest, NextResponse } from 'next/server'
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
    const filteredRows = tableData.rows.filter((row: any, idx: number) => {
      const name = row['名称'] || row[tableData.columns[0]]
      return !excluded.includes(name) && !excluded.includes(idx)
    })

    const starredRows = filteredRows.filter((row: any, idx: number) => {
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
Copy
第四步：新建多源对比场景页面
新建 src/app/workspace/[id]/scene/compare/page.tsx：

Copy'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type TableData = {
  columns: string[]
  rows: Record<string, string>[]
}

export default function CompareScenePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const wsId = params.id

  const [loading, setLoading] = useState(true)
  const [sceneId, setSceneId] = useState<string | null>(null)
  const [tableData, setTableData] = useState<TableData | null>(null)
  const [starred, setStarred] = useState<string[]>([])
  const [excluded, setExcluded] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState<string | null>(null)
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortAsc, setSortAsc] = useState(true)

  // 初始化场景
  useEffect(() => {
    if (!wsId) return
    async function init() {
      try {
        setLoading(true)
        const res = await fetch(`/api/workspaces/${wsId}/scenes/compare/init`, { method: 'POST' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setSceneId(data.sceneSessionId)
        setTableData(data.tableData)
      } catch (e) {
        alert(e instanceof Error ? e.message : '初始化失败')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [wsId])

  // 保存选择
  async function saveSelections(newStarred: string[], newExcluded: string[]) {
    if (!sceneId) return
    await fetch(`/api/scenes/${sceneId}/selections`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred: newStarred, excluded: newExcluded }),
    })
  }

  function toggleStar(name: string) {
    const next = starred.includes(name)
      ? starred.filter(s => s !== name)
      : [...starred, name]
    setStarred(next)
    void saveSelections(next, excluded)
  }

  function toggleExclude(name: string) {
    const next = excluded.includes(name)
      ? excluded.filter(s => s !== name)
      : [...excluded, name]
    setExcluded(next)
    void saveSelections(starred, next)
  }

  function handleSort(col: string) {
    if (sortCol === col) {
      setSortAsc(!sortAsc)
    } else {
      setSortCol(col)
      setSortAsc(true)
    }
  }

  async function handleGenerate() {
    if (!sceneId) return
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

  // 排序
  const sortedRows = tableData?.rows
    ?.filter(row => {
      const name = row[tableData.columns[0]]
      return !excluded.includes(name)
    })
    ?.sort((a, b) => {
      if (!sortCol) return 0
      const va = a[sortCol] || ''
      const vb = b[sortCol] || ''
      return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
    }) ?? []

  if (loading) {
    return (
      <div className="min-h-screen blueprint-grid flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-inkLight text-sm">正在分析各 AI 回答，提取对比信息...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen blueprint-grid flex flex-col">
      {/* 顶部 */}
      <header className="h-14 border-b border-black/5 flex items-center justify-between px-6 bg-paper/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/workspace/' + wsId)} className="text-inkLight hover:text-accent text-sm">← 返回工作台</button>
          <span className="font-semibold text-ink text-sm">📊 多源对比</span>
        </div>
        <button onClick={handleGenerate} disabled={generating}
          className="bg-accent text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition">
          {generating ? '生成中...' : '生成推荐报告'}
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* 左栏：表格 */}
        <div className={`flex-1 overflow-auto p-6 ${report ? 'w-3/5' : 'w-full'}`}>
          {tableData && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-2 text-left text-xs text-inkLight w-10">操作</th>
                    {tableData.columns.map(col => (
                      <th key={col} onClick={() => handleSort(col)}
                        className="px-3 py-2 text-left text-xs text-inkLight cursor-pointer hover:text-accent">
                        {col} {sortCol === col ? (sortAsc ? '↑' : '↓') : ''}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRows.map((row, idx) => {
                    const name = row[tableData.columns[0]]
                    const isStarred = starred.includes(name)
                    return (
                      <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50 ${isStarred ? 'bg-yellow-50' : ''}`}>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-1">
                            <button onClick={() => toggleStar(name)} title="标星"
                              className={`text-base ${isStarred ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}>
                              {isStarred ? '★' : '☆'}
                            </button>
                            <button onClick={() => toggleExclude(name)} title="排除"
                              className="text-gray-300 hover:text-red-400 text-xs">✕</button>
                          </div>
                        </td>
                        {tableData.columns.map(col => (
                          <td key={col} className="px-3 py-2 text-ink">{row[col] || '-'}</td>
                        ))}
                      </tr>
                    )
                  })}
                </tbody>
              </table>

              {excluded.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 text-xs text-inkLight">
                  已排除 {excluded.length} 项
                  <button onClick={() => { setExcluded([]); void saveSelections(starred, []) }}
                    className="ml-2 text-accent hover:underline">恢复全部</button>
                </div>
              )}
            </div>
          )}

          {starred.length > 0 && (
            <div className="mt-4 text-xs text-inkLight">
              ★ 已标星 {starred.length} 项，生成报告时会优先推荐
            </div>
          )}
        </div>

        {/* 右栏：报告 */}
        {report && (
          <div className="w-2/5 border-l border-gray-200 bg-white p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-ink">推荐报告</h3>
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
第五步：修改工作台操作栏跳转
修改 src/app/workspace/[id]/page.tsx 中的 handleSceneClick 函数：

将原来的：

Copyfunction handleSceneClick(scene: string) {
  alert('「' + SCENE_BUTTONS.find(s => s.key === scene)?.label + '」即将上线，敬请期待！')
}
替换为：

Copyfunction handleSceneClick(scene: string) {
  if (scene === 'compare') {
    router.push('/workspace/' + wsId + '/scene/compare')
  } else {
    alert('「' + SCENE_BUTTONS.find(s => s.key === scene)?.label + '」即将上线，敬请期待！')
  }
}
第六步：验证
Copypnpm build
完成标志
Phase 1 完成后，用户可以：

在工作台点击"帮我整理成对比表格"
跳转到对比场景页面，看到系统自动生成的结构化表格
对表格行进行标星（感兴趣）和排除操作
点击表头排序
点击"生成推荐报告"，右栏显示 AI 生成的推荐文
复制报告全文