'use client'

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
