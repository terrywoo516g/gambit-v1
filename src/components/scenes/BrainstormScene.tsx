'use client'

import { useEffect, useState } from 'react'
import { ThumbsUp, ThumbsDown, Eye, HelpCircle, MessageSquare, Pin } from 'lucide-react'

type ReflectionData = {
  strongConsensus: { point: string; supporters: string[] }[]
  weakConsensus: { point: string; supporters: string[]; dissenters: string[] }[]
  divergent: { point: string; source: string; reasoning: string }[]
  blindSpots: { point: string; reasoning: string }[]
  keyQuestions: { question: string; context: string }[]
}

interface BrainstormSceneProps {
  workspaceId: string
  onDraftGenerated?: (content: string) => void
  referencedRunIds?: string[]
}

export default function BrainstormScene({ workspaceId, referencedRunIds = [] }: BrainstormSceneProps) {
  const [loading, setLoading] = useState(true)
  const [sceneId, setSceneId] = useState<string | null>(null)
  const [reflection, setReflection] = useState<ReflectionData | null>(null)
  const [adopted, setAdopted] = useState<string[]>([])
  const [rejected, setRejected] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  
  
  const [activeTab, setActiveTab] = useState<'consensus' | 'divergent' | 'blind'>('consensus')

  useEffect(() => {
    if (!workspaceId) return
    let cancelled = false
    async function init() {
      try {
        setLoading(true)
        const res = await fetch(`/api/workspaces/${workspaceId}/scenes/brainstorm/init`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referencedRunIds }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        if (cancelled) return
        setSceneId(data.sceneSessionId)
        setReflection(data.reflection)
      } catch (e) { if (!cancelled) alert(e instanceof Error ? e.message : '初始化失败') }
      finally { if (!cancelled) setLoading(false) }
    }
    void init()
    return () => { cancelled = true }
  }, [workspaceId])

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
    const promptText = `你是一个决策顾问。以下是用户关于某个问题（头脑风暴）的标记情况：

用户认同的观点：${adopted.length > 0 ? adopted.join('；') : '未标记'}
用户否定的观点：${rejected.length > 0 ? rejected.join('；') : '未标记'}
用户补充的想法：${notes || '无'}

以下是用户认同的观点，请基于这些观点生成决策建议，不要纳入用户否定的内容。

要求：
- 不要使用 Markdown 标题（如 ###），直接用自然段落。
- 输出 2-4 个段落，每段 100-150 字。
- 语气是"基于各方观点，我的判断是……"而非报告格式。
- 请直接输出建议内容，不要有多余的废话。`

    window.dispatchEvent(new CustomEvent('gambit:stream-to-draft', { detail: { promptText } }))
  }

  function PointCard({ point, tag, detail }: { point: string; tag?: string; detail?: string }) {
    const isAdopted = adopted.includes(point)
    const isRejected = rejected.includes(point)
    return (
      <div className={`border rounded-xl p-4 transition relative group ${isAdopted ? 'border-green-300 bg-green-50' : isRejected ? 'border-red-200 bg-red-50 opacity-60' : 'border-gray-200 bg-white'}`}>
        {tag && <span className="text-xs font-mono text-inkLight mb-1 block">{tag}</span>}
        <div className="flex items-start justify-between mb-2 gap-4">
          <p className="text-sm text-ink">{point}</p>
          <button onClick={() => window.dispatchEvent(new CustomEvent('gambit:pin-to-draft', { detail: { sourceType: 'brainstorm', sourceId: `brainstorm-${point?.substring(0, 20)}`, sourceLabel: `头脑风暴`, content: `${point}\n${detail || ''}` } }))} className="text-gray-300 hover:text-accent transition opacity-0 group-hover:opacity-100 shrink-0" title="加入最终稿"><Pin className="w-3.5 h-3.5" /></button>
        </div>
        {detail && <p className="text-xs text-inkLight mb-3">{detail}</p>}
        <div className="flex gap-2">
          <button onClick={() => toggleAdopt(point)} className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${isAdopted ? 'bg-green-500 text-white' : 'bg-gray-100 text-inkLight hover:bg-green-100'}`}>
            <ThumbsUp className="w-3 h-3" /> {isAdopted ? '已认同' : '认同'}
          </button>
          <button onClick={() => toggleReject(point)} className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${isRejected ? 'bg-red-500 text-white' : 'bg-gray-100 text-inkLight hover:bg-red-100'}`}>
            <ThumbsDown className="w-3 h-3" /> {isRejected ? '已否定' : '不认同'}
          </button>
        </div>
      </div>
    )
  }

  if (loading) return (
    <div className="flex flex-col h-full p-6 gap-6">
      <div className="flex gap-2">
        <div className="h-8 w-24 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-8 w-32 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-8 w-40 bg-gray-100 rounded-lg animate-pulse" />
      </div>
      <div className="space-y-4">
        <div className="h-32 bg-gray-50 rounded-xl animate-pulse" />
        <div className="h-32 bg-gray-50 rounded-xl animate-pulse" />
      </div>
    </div>
  )

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <h3 className="text-sm font-semibold text-ink flex items-center gap-2"><MessageSquare className="w-4 h-4 text-accent" />头脑风暴</h3>
        <button onClick={handleGenerate}  className="bg-accent text-white px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition">生成决策建议</button>
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className={`overflow-y-auto p-4 $'w-full'`}>
          <div className="flex gap-2 mb-4">
            <button onClick={() => setActiveTab('consensus')} className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === 'consensus' ? 'bg-accent text-white' : 'bg-white border border-gray-200 text-inkLight'}`}>共识 ({(reflection?.strongConsensus?.length || 0) + (reflection?.weakConsensus?.length || 0)})</button>
            <button onClick={() => setActiveTab('divergent')} className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === 'divergent' ? 'bg-accent text-white' : 'bg-white border border-gray-200 text-inkLight'}`}>差异化观点 ({reflection?.divergent?.length || 0})</button>
            <button onClick={() => setActiveTab('blind')} className={`px-3 py-1.5 rounded-lg text-sm ${activeTab === 'blind' ? 'bg-accent text-white' : 'bg-white border border-gray-200 text-inkLight'}`}>盲点 + 关键问题 ({(reflection?.blindSpots?.length || 0) + (reflection?.keyQuestions?.length || 0)})</button>
          </div>

          {activeTab === 'consensus' && reflection && (
            <div className="space-y-6">
              {reflection.strongConsensus.length > 0 && (<div><h3 className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-1"><ThumbsUp className="w-4 h-4" /> 强共识（所有 AI 认同）</h3><div className="space-y-3">{reflection.strongConsensus.map((item, i) => (<PointCard key={i} point={item.point} tag={`${item.supporters.join(', ')} 共同认同`} />))}</div></div>)}
              {reflection.weakConsensus.length > 0 && (<div><h3 className="text-sm font-semibold text-yellow-700 mb-3 flex items-center gap-1"><HelpCircle className="w-4 h-4" /> 弱共识（多数 AI 认同）</h3><div className="space-y-3">{reflection.weakConsensus.map((item, i) => (<PointCard key={i} point={item.point} tag={`${item.supporters.join(', ')} 认同 · ${item.dissenters.join(', ')} 不同意`} />))}</div></div>)}
            </div>
          )}

          {activeTab === 'divergent' && reflection && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-1"><Eye className="w-4 h-4" /> 差异化观点（独特视角）</h3>
              {reflection.divergent.map((item, i) => (<PointCard key={i} point={item.point} tag={`来自 ${item.source}`} detail={item.reasoning} />))}
            </div>
          )}

          {activeTab === 'blind' && reflection && (
            <div className="space-y-6">
              {reflection.blindSpots.length > 0 && (<div><h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-1"><Eye className="w-4 h-4" /> 盲点提醒</h3><div className="space-y-3">{reflection.blindSpots.map((item, i) => (<PointCard key={i} point={item.point} detail={item.reasoning} />))}</div></div>)}
              {reflection.keyQuestions.length > 0 && (<div><h3 className="text-sm font-semibold text-purple-700 mb-3 flex items-center gap-1"><HelpCircle className="w-4 h-4" /> 关键问题</h3><div className="space-y-3">{reflection.keyQuestions.map((item, i) => (<div key={i} className="border border-gray-200 bg-white rounded-xl p-4 relative group"><div className="flex items-start justify-between mb-1 gap-4"><p className="text-sm font-medium text-ink">{item.question}</p><button onClick={() => window.dispatchEvent(new CustomEvent('gambit:pin-to-draft', { detail: { sourceType: 'brainstorm', sourceId: `brainstorm-question-${i}`, sourceLabel: `头脑风暴-关键问题`, content: `${item.question}\n${item.context || ''}` } }))} className="text-gray-300 hover:text-accent transition opacity-0 group-hover:opacity-100 shrink-0" title="加入最终稿"><Pin className="w-3.5 h-3.5" /></button></div><p className="text-xs text-inkLight">{item.context}</p></div>))}</div></div>)}
              <div><h3 className="text-sm font-semibold text-ink mb-2 flex items-center gap-1"><MessageSquare className="w-4 h-4" /> 我的思考</h3><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="写下你的想法、约束条件、个人偏好..." className="w-full min-h-[100px] p-3 border border-gray-200 rounded-xl text-sm outline-none focus:border-accent" /></div>
            </div>
          )}
          <div className="mt-4 text-xs text-inkLight">已认同 {adopted.length} 个观点 · 已否定 {rejected.length} 个观点</div>
        </div>

        
      </div>
    </div>
  )
}