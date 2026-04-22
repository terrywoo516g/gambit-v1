'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMultiStream } from '@/hooks/useMultiStream'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type WorkspaceData = {
  id: string
  title: string
  prompt: string
  status: string
  selectedModels: string[]
  modelRuns: { id: string; model: string; status: string; content: string }[]
}

const SCENE_BUTTONS = [
  { key: 'compare', label: '帮我整理成对比表格', icon: '📊' },
  { key: 'brainstorm', label: '帮我分析共识和分歧', icon: '⚖️' },
  { key: 'compose', label: '帮我整合成一篇稿子', icon: '📝' },
  { key: 'review', label: '帮我汇总审阅意见', icon: '✅' },
]

export default function WorkspacePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const wsId = params.id
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [recommendation, setRecommendation] = useState<{ scene: string; reason: string } | null>(null)

  // 加载 workspace
  useEffect(() => {
    if (!wsId) return
    async function load() {
      try {
        const res = await fetch('/api/workspaces/' + wsId)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setWorkspace(data.workspace)
      } catch (e) {
        alert(e instanceof Error ? e.message : '加载失败')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [wsId])

  // 需要流式输出的 runs
  const runsToStream = workspace?.modelRuns
    ?.filter(r => r.status === 'queued' || r.status === 'running')
    ?.map(r => ({ id: r.id, model: r.model })) ?? []

  const { streams, allDone, completedCount, total } = useMultiStream(
    runsToStream.length > 0 ? wsId : null,
    runsToStream
  )

  // 合并已完成的内容和流式内容
  function getContent(run: { id: string; model: string; status: string; content: string }): string {
    if (streams[run.id]?.content) return streams[run.id].content
    return run.content
  }

  function getStatus(run: { id: string; status: string }): string {
    if (streams[run.id]) return streams[run.id].status
    return run.status
  }

  // 获取场景推荐
  useEffect(() => {
    if (!allDone || !wsId || completedCount < 2) return
    async function recommend() {
      try {
        const res = await fetch('/api/workspaces/' + wsId + '/recommend-scene', { method: 'POST' })
        const data = await res.json()
        setRecommendation({ scene: data.scene, reason: data.reason })
      } catch {}
    }
    void recommend()
  }, [allDone, wsId, completedCount])

  function handleSceneClick(scene: string) {
    if (scene === 'compare') {
      router.push('/workspace/' + wsId + '/scene/compare')
    } else {
      alert('「' + SCENE_BUTTONS.find(s => s.key === scene)?.label + '」即将上线，敬请期待！')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen blueprint-grid flex items-center justify-center">
        <div className="text-inkLight">加载中...</div>
      </div>
    )
  }

  if (!workspace) {
    return (
      <div className="min-h-screen blueprint-grid flex items-center justify-center">
        <div className="text-inkLight">工作台不存在</div>
      </div>
    )
  }

  const runs = workspace.modelRuns

  return (
    <div className="min-h-screen blueprint-grid flex flex-col">
      {/* 顶部 */}
      <header className="h-14 border-b border-black/5 flex items-center justify-between px-6 bg-paper/80 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push('/workspaces')} className="text-inkLight hover:text-accent text-sm">← 返回</button>
          <span className="font-semibold text-ink text-sm truncate max-w-[300px]">{workspace.title}</span>
        </div>
        <div className="flex items-center gap-2">
          {!allDone && (
            <span className="text-xs text-inkLight bg-yellow-50 px-2 py-1 rounded-full">
              {completedCount}/{total} 已完成
            </span>
          )}
          {allDone && (
            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              全部完成
            </span>
          )}
        </div>
      </header>

      {/* 问题展示 */}
      <div className="px-6 py-4 border-b border-black/5 bg-white/50">
        <div className="max-w-5xl mx-auto">
          <div className="text-xs text-inkLight mb-1">你的问题</div>
          <div className="text-sm text-ink">{workspace.prompt}</div>
        </div>
      </div>

      {/* AI 输出卡片区 */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-5xl mx-auto">
          <div className={`grid gap-4 ${runs.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {runs.map(run => {
              const content = getContent(run)
              const status = getStatus(run)

              return (
                <div key={run.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
                  {/* 卡片头 */}
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <span className="font-medium text-sm text-ink">{run.model}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      status === 'done' || status === 'completed' ? 'bg-green-50 text-green-600' :
                      status === 'error' || status === 'failed' ? 'bg-red-50 text-red-600' :
                      status === 'streaming' || status === 'running' ? 'bg-yellow-50 text-yellow-600' :
                      'bg-gray-50 text-gray-400'
                    }`}>
                      {status === 'done' || status === 'completed' ? '已完成' :
                       status === 'error' || status === 'failed' ? '失败' :
                       status === 'streaming' || status === 'running' ? '生成中...' :
                       '等待中'}
                    </span>
                  </div>

                  {/* 卡片内容 */}
                  <div className="px-4 py-3 flex-1 overflow-y-auto max-h-[500px] text-sm">
                    {!content && (status === 'queued' || status === 'streaming' || status === 'running') && (
                      <div className="space-y-2">
                        <div className="h-3 w-48 animate-pulse rounded bg-gray-100" />
                        <div className="h-3 w-36 animate-pulse rounded bg-gray-100" />
                        <div className="h-3 w-52 animate-pulse rounded bg-gray-100" />
                      </div>
                    )}
                    {content && (
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                        p: ({children}) => <p className="my-1 leading-relaxed">{children}</p>,
                        h1: ({children}) => <h1 className="text-lg font-bold my-2">{children}</h1>,
                        h2: ({children}) => <h2 className="text-base font-bold my-2">{children}</h2>,
                        h3: ({children}) => <h3 className="text-sm font-semibold my-1">{children}</h3>,
                        ul: ({children}) => <ul className="list-disc pl-4 my-1">{children}</ul>,
                        ol: ({children}) => <ol className="list-decimal pl-4 my-1">{children}</ol>,
                        li: ({children}) => <li className="leading-relaxed">{children}</li>,
                        code: ({children}) => <code className="bg-gray-100 px-1 rounded text-xs font-mono">{children}</code>,
                      }}>{content}</ReactMarkdown>
                    )}
                    {(status === 'error' || status === 'failed') && !content && (
                      <div className="text-red-500 text-sm">生成失败，请刷新重试</div>
                    )}
                  </div>

                  {/* 卡片底部 */}
                  {(status === 'done' || status === 'completed') && content && (
                    <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-inkLight">{content.length} 字</span>
                      <button onClick={() => navigator.clipboard.writeText(content)}
                        className="text-xs text-inkLight hover:text-accent transition">复制</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 底部操作栏 */}
      {allDone && completedCount >= 2 && (
        <div className="border-t border-gray-200 bg-white px-6 py-4 shrink-0">
          <div className="max-w-5xl mx-auto">
            {recommendation && (
              <div className="text-xs text-inkLight mb-3">
                💡 建议进入【{SCENE_BUTTONS.find(s => s.key === recommendation.scene)?.label}】—— {recommendation.reason}
              </div>
            )}
            <div className="flex items-center justify-center gap-3">
              {SCENE_BUTTONS.map(btn => (
                <button key={btn.key} onClick={() => handleSceneClick(btn.key)}
                  className={`px-4 py-2 rounded-xl text-sm border transition ${
                    recommendation?.scene === btn.key
                      ? 'bg-accent text-white border-accent'
                      : 'bg-white text-ink border-gray-200 hover:border-accent'
                  }`}>
                  <span className="mr-1">{btn.icon}</span>
                  {btn.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
