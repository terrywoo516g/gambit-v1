'use client'

import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Loader2, Copy, Check, X, CheckCheck, FileCheck } from 'lucide-react'

type Suggestion = { id: string; type: string; severity: string; content: string; quote: string; sources: string[]; consensusCount: number }

const SEVERITY_COLORS: Record<string, string> = { '关键': 'border-red-300 bg-red-50', '重要': 'border-yellow-300 bg-yellow-50', '建议': 'border-blue-200 bg-blue-50' }

interface ReviewSceneProps { workspaceId: string; onDraftGenerated?: (content: string) => void }

export default function ReviewScene({ workspaceId, onDraftGenerated }: ReviewSceneProps) {
  const [loading, setLoading] = useState(true)
  const [sceneId, setSceneId] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [accepted, setAccepted] = useState<string[]>([])
  const [rejected, setRejected] = useState<string[]>([])
  const [generating, setGenerating] = useState(false)
  const [report, setReport] = useState<string | null>(null)

  useEffect(() => {
    if (!workspaceId) return
    let cancelled = false
    async function init() {
      try {
        setLoading(true)
        const res = await fetch(`/api/workspaces/${workspaceId}/scenes/review/init`, { method: 'POST' })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        if (cancelled) return
        setSceneId(data.sceneSessionId)
        setSuggestions(data.suggestions || [])
      } catch (e) { if (!cancelled) alert(e instanceof Error ? e.message : '初始化失败') }
      finally { if (!cancelled) setLoading(false) }
    }
    void init()
    return () => { cancelled = true }
  }, [workspaceId])

  function handleAccept(id: string) { setAccepted(prev => prev.includes(id) ? prev : [...prev, id]); setRejected(prev => prev.filter(r => r !== id)) }
  function handleReject(id: string) { setRejected(prev => prev.includes(id) ? prev : [...prev, id]); setAccepted(prev => prev.filter(a => a !== id)) }

  function acceptAllConsensus() {
    const ids = suggestions.filter(s => s.consensusCount >= 2).map(s => s.id)
    setAccepted(prev => { const c = [...prev, ...ids]; return c.filter((id, i) => c.indexOf(id) === i) })
    setRejected(prev => prev.filter(r => !ids.includes(r)))
  }

  async function handleGenerate() {
    if (!sceneId) return
    await fetch(`/api/scenes/${sceneId}/selections`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ starred: accepted, excluded: rejected }) })
    try {
      setGenerating(true)
      const res = await fetch(`/api/scenes/${sceneId}/generate`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReport(data.content)
      onDraftGenerated?.(data.content)
    } catch (e) { alert(e instanceof Error ? e.message : '生成失败') }
    finally { setGenerating(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-center"><Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" /><p className="text-inkLight text-sm">正在汇总各 AI 的审阅意见...</p></div></div>

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <h3 className="text-sm font-semibold text-ink flex items-center gap-2"><FileCheck className="w-4 h-4 text-accent" />多AI审稿</h3>
        <div className="flex items-center gap-2">
          <button onClick={acceptAllConsensus} className="text-xs text-inkLight hover:text-accent border border-gray-200 px-3 py-1 rounded-lg flex items-center gap-1"><CheckCheck className="w-3 h-3" /> 一键接受共识</button>
          <button onClick={handleGenerate} disabled={generating || accepted.length === 0} className="bg-accent text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition">{generating ? '生成中...' : '生成修改稿'}</button>
        </div>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className={`overflow-y-auto p-4 ${report ? 'w-3/5' : 'w-full'}`}>
          <div className="text-xs text-inkLight mb-4">共 {suggestions.length} 条意见 · 已接受 {accepted.length} · 已拒绝 {rejected.length}</div>
          <div className="space-y-3">
            {suggestions.map(s => {
              const isAccepted = accepted.includes(s.id)
              const isRejected = rejected.includes(s.id)
              return (
                <div key={s.id} className={`border rounded-xl p-4 transition ${isAccepted ? 'border-green-300 bg-green-50' : isRejected ? 'border-gray-200 bg-gray-50 opacity-50' : SEVERITY_COLORS[s.severity] || 'border-gray-200 bg-white'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${s.severity === '关键' ? 'bg-red-100 text-red-700' : s.severity === '重要' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{s.severity}</span>
                      <span className="text-xs text-inkLight">{s.type}</span>
                      {s.consensusCount >= 2 && <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">{s.consensusCount} AI 共识</span>}
                    </div>
                    <span className="text-xs text-inkLight">{s.sources.join(', ')}</span>
                  </div>
                  <p className="text-sm text-ink mb-2">{s.content}</p>
                  {s.quote && <div className="text-xs text-inkLight bg-white/50 border border-gray-200 rounded px-2 py-1 mb-3">原文：&quot;{s.quote}&quot;</div>}
                  <div className="flex gap-2">
                    <button onClick={() => handleAccept(s.id)} className={`text-xs px-3 py-1 rounded flex items-center gap-1 ${isAccepted ? 'bg-green-500 text-white' : 'bg-white border border-gray-200 text-inkLight hover:border-green-400'}`}><Check className="w-3 h-3" /> {isAccepted ? '已接受' : '接受'}</button>
                    <button onClick={() => handleReject(s.id)} className={`text-xs px-3 py-1 rounded flex items-center gap-1 ${isRejected ? 'bg-red-400 text-white' : 'bg-white border border-gray-200 text-inkLight hover:border-red-300'}`}><X className="w-3 h-3" /> {isRejected ? '已拒绝' : '拒绝'}</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {report && (<div className="w-2/5 border-l border-gray-200 bg-white p-4 overflow-y-auto"><div className="flex items-center justify-between mb-4"><h3 className="font-semibold text-ink text-sm">修改稿</h3><button onClick={() => navigator.clipboard.writeText(report)} className="text-xs text-inkLight hover:text-accent flex items-center gap-1"><Copy className="w-3 h-3" /> 复制</button></div><div className="prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{report}</ReactMarkdown></div></div>)}
      </div>
    </div>
  )
}