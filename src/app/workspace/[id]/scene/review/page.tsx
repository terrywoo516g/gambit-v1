'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Suggestion = {
  id: string; type: string; severity: string; content: string
  quote: string; sources: string[]; consensusCount: number
}

const SEVERITY_COLORS: Record<string, string> = {
  '关键': 'border-red-300 bg-red-50',
  '重要': 'border-yellow-300 bg-yellow-50',
  '建议': 'border-blue-200 bg-blue-50',
}

export default function ReviewScenePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const wsId = params.id

  const [loading, setLoading] = useState(true)
  const [sceneId, setSceneId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [accepted, setAccepted] = useState<string[]>([])
  const [rejected, setRejected] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState<string | null>(null)

  useEffect(() => {
    if (!wsId) return
    async function init() {
      try {
        setLoading(true)
        const res = await fetch(`/api/workspaces/${wsId}/scenes/review/init`, { method: 'POST' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setSceneId(data.sceneSessionId)
        setSuggestions(data.suggestions || [])
      } catch (e) {
        alert(e instanceof Error ? e.message : '初始化失败')
      } finally {
        setLoading(false)
      }
    }
    void init()
  }, [wsId])

  function handleAccept(id: string) {
    setAccepted(prev => prev.includes(id) ? prev : [...prev, id])
    setRejected(prev => prev.filter(r => r !== id))
  }

  function handleReject(id: string) {
    setRejected(prev => prev.includes(id) ? prev : [...prev, id])
    setAccepted(prev => prev.filter(a => a !== id))
  }

  function acceptAllConsensus() {
    const consensusIds = suggestions.filter(s => s.consensusCount >= 2).map(s => s.id)
    setAccepted(prev => {
      const combined = [...prev, ...consensusIds]
      return combined.filter((id, index) => combined.indexOf(id) === index)
    })
    setRejected(prev => prev.filter(r => !consensusIds.includes(r)))
  }

  async function handleGenerate() {
    if (!sceneId) return
    await fetch(`/api/scenes/${sceneId}/selections`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ starred: accepted, excluded: rejected }),
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

  if (loading) {
    return (
      <div className="min-h-screen blueprint-grid flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-accent border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-inkLight text-sm">正在汇总各 AI 的审阅意见...</p>
        </div>
      </div>
    )
  }

  return (
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
 ${isAccepted ? 'border-green-300 bg-green-50' :
                  isRejected ? 'border-gray-200 bg-gray-50 opacity-50' :
                  SEVERITY_COLORS[s.severity] || 'border-gray-200 bg-white'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded
 ${s.severity === '关键' ? 'bg-red-100 text-red-700' :
                        s.severity === '重要' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-blue-100 text-blue-700'}`}>
                        {s.severity}
                      </span>
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
                      原文：&quot;{s.quote}&quot;
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => handleAccept(s.id)}
                      className={`text-xs px-3 py-1 rounded ${isAccepted ? 'bg-green-500 text-white' : 'bg-white border border-gray-200 text-inkLight hover:border-green-400'}`}>
                      {isAccepted ? '✓ 已接受' : '接受'}
                    </button>
                    <button onClick={() => handleReject(s.id)}
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
