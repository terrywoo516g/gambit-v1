'use client'

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
