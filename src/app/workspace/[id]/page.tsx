'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useMultiStream } from '@/hooks/useMultiStream'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  ArrowLeft, Plus, Eye, Zap, Copy, Send, Loader2,
  LayoutGrid, MessageSquare, Pencil, FileCheck,
  ChevronDown, ChevronUp, FileText, Home
} from 'lucide-react'

import CompareScene from '@/components/scenes/CompareScene'
import BrainstormScene from '@/components/scenes/BrainstormScene'
import ComposeScene from '@/components/scenes/ComposeScene'
import ReviewScene from '@/components/scenes/ReviewScene'

type WorkspaceData = {
  id: string
  title: string
  prompt: string
  status: string
  selectedModels: string[]
  modelRuns: { id: string; model: string; status: string; content: string }[]
  sceneSessions: {
    id: string
    sceneType: string
    status: string
    finalDrafts: { id: string; content: string; version: number }[]
  }[]
}

type SceneKey = 'compare' | 'brainstorm' | 'compose' | 'review'

const SCENE_DEFS: { key: SceneKey; label: string; desc: string; icon: React.ReactNode }[] = [
  { key: 'compare', label: '对比表格', desc: '结构化对比分析', icon: <LayoutGrid className="w-4 h-4" /> },
  { key: 'brainstorm', label: '共识分歧', desc: '分析观点碰撞', icon: <MessageSquare className="w-4 h-4" /> },
  { key: 'compose', label: '创意合成', desc: '多源整合成稿', icon: <Pencil className="w-4 h-4" /> },
  { key: 'review', label: '审稿意见', desc: '汇总修改建议', icon: <FileCheck className="w-4 h-4" /> },
]

const MODEL_STATUS_COLORS: Record<string, string> = {
  done: 'bg-green-400',
  completed: 'bg-green-400',
  streaming: 'bg-yellow-400 animate-pulse',
  running: 'bg-yellow-400 animate-pulse',
  queued: 'bg-gray-300',
  error: 'bg-red-400',
  failed: 'bg-red-400',
}

const STEPS = [
  { key: 'models', label: 'AI 回答' },
  { key: 'scene', label: '场景分析' },
  { key: 'output', label: '最终稿' },
] as const

type StepKey = typeof STEPS[number]['key']

export default function WorkspacePage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const wsId = params.id

  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [recommendation, setRecommendation] = useState<{ scene: string; reason: string } | null>(null)
  const [showRecommendReason, setShowRecommendReason] = useState(false)

  const [observerContent, setObserverContent] = useState<string | null>(null)
  const [sparkContent, setSparkContent] = useState<string | null>(null)
  const [observerLoading, setObserverLoading] = useState(false)
  const [sparkLoading, setSparkLoading] = useState(false)
  const [showDrawer, setShowDrawer] = useState<'observer' | 'spark' | null>(null)

  const [activeStep, setActiveStep] = useState<StepKey>('models')
  const [activeScene, setActiveScene] = useState<SceneKey | null>(null)
  const [draftContent, setDraftContent] = useState<string | null>(null)

  const [chatInput, setChatInput] = useState('')
  const [chatProcessing, setChatProcessing] = useState(false)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)

  useEffect(() => {
    if (!wsId) return
    async function load() {
      try {
        const res = await fetch('/api/workspaces/' + wsId)
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setWorkspace(data.workspace)
        const latest = data.workspace.sceneSessions
          ?.flatMap((s: WorkspaceData['sceneSessions'][0]) => s.finalDrafts)
          ?.sort((a: { version: number }, b: { version: number }) => b.version - a.version)[0]
        if (latest) setDraftContent(latest.content)
      } catch (e) {
        alert(e instanceof Error ? e.message : '加载失败')
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [wsId])

  const runsToStream = workspace?.modelRuns
    ?.filter(r => r.status === 'queued' || r.status === 'running')
    ?.map(r => ({ id: r.id, model: r.model })) ?? []

  const { streams, allDone, completedCount, total } = useMultiStream(
    runsToStream.length > 0 ? wsId : null,
    runsToStream
  )

  function getContent(run: { id: string; content: string }): string {
    if (streams[run.id]?.content) return streams[run.id].content
    return run.content
  }

  function getStatus(run: { id: string; status: string }): string {
    if (streams[run.id]) return streams[run.id].status
    return run.status
  }

  useEffect(() => {
    if (!allDone || !wsId || completedCount < 2) return
    async function recommend() {
      try {
        const res = await fetch('/api/workspaces/' + wsId + '/recommend-scene', { method: 'POST' })
        const data = await res.json()
        setRecommendation({ scene: data.scene, reason: data.reason })
      } catch { /* ignore */ }
    }
    void recommend()
  }, [allDone, wsId, completedCount])

  const handleDraftGenerated = useCallback((content: string) => {
    setDraftContent(content)
    setActiveStep('output')
  }, [])

  function enterScene(key: SceneKey) {
    setActiveScene(key)
    setActiveStep('scene')
  }

  async function handleObserver() {
    try {
      setObserverLoading(true)
      setShowDrawer('observer')
      const res = await fetch('/api/workspaces/' + wsId + '/observer', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setObserverContent(data.content)
    } catch (e) {
      alert(e instanceof Error ? e.message : '旁观者调用失败')
    } finally {
      setObserverLoading(false)
    }
  }

  async function handleSpark() {
    try {
      setSparkLoading(true)
      setShowDrawer('spark')
      const res = await fetch('/api/workspaces/' + wsId + '/spark', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSparkContent(data.content)
    } catch (e) {
      alert(e instanceof Error ? e.message : '灵光一闪调用失败')
    } finally {
      setSparkLoading(false)
    }
  }

  async function handleChatSubmit() {
    const input = chatInput.trim()
    if (!input || chatProcessing) return
    setChatProcessing(true)
    try {
      const res = await fetch('/api/workspaces/' + wsId + '/recommend-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: input }),
      })
      const data = await res.json()
      if (data.scene && ['compare', 'brainstorm', 'compose', 'review'].includes(data.scene)) {
        enterScene(data.scene as SceneKey)
      } else {
        alert('暂时无法理解你的指令，请尝试使用场景按钮')
      }
    } catch {
      alert('处理失败，请重试')
    } finally {
      setChatProcessing(false)
      setChatInput('')
    }
  }

  function scrollToRun(runId: string) {
    setActiveRunId(runId)
    setActiveStep('models')
    setActiveScene(null)
    setTimeout(() => {
      document.getElementById('run-' + runId)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
  }

  if (loading) {
    return (
      <main className="flex h-screen bg-[radial-gradient(circle,_rgba(0,0,0,0.03)_1px,_transparent_1px)] bg-[length:24px_24px] items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" />
          <p className="text-inkLight text-sm">加载工作台...</p>
        </div>
      </main>
    )
  }

  if (!workspace) {
    return (
      <main className="flex h-screen bg-[radial-gradient(circle,_rgba(0,0,0,0.03)_1px,_transparent_1px)] bg-[length:24px_24px] items-center justify-center">
        <div className="text-inkLight">工作台不存在</div>
      </main>
    )
  }

  const runs = workspace.modelRuns

  // ========== JSX 部分在任务 8B 中补充 ==========
  return <div>任务 8B 待补充</div>
}