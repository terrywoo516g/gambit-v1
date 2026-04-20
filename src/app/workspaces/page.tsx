'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type WorkspaceListItem = {
  id: string
  title: string
  mode: string
  toolsUsed: unknown
  updatedAt: string
  _count?: { messages: number }
}

function parseTools(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((v) => String(v))
  try {
    const parsed = JSON.parse(String(value ?? '[]')) as unknown
    if (Array.isArray(parsed)) return parsed.map((v) => String(v))
    return []
  } catch {
    return []
  }
}

function formatTime(input: string) {
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function WorkspacesPage() {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<WorkspaceListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let active = true

    async function load() {
      try {
        setLoading(true)
        const response = await fetch('/api/workspaces')
        const data = (await response.json()) as { workspaces: WorkspaceListItem[] }
        if (!response.ok) throw new Error('加载失败')
        if (!active) return
        setWorkspaces(data.workspaces ?? [])
      } catch {
        if (!active) return
        setWorkspaces([])
      } finally {
        if (!active) return
        setLoading(false)
      }
    }

    void load()
    return () => {
      active = false
    }
  }, [])

  async function handleNew() {
    try {
      setCreating(true)
      const response = await fetch('/api/workspace/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '新工作台', mode: 'chat' }),
      })
      const data = (await response.json()) as { workspace?: { id: string } }
      if (!response.ok || !data.workspace?.id) throw new Error('创建失败')
      router.push('/workspace/' + data.workspace.id)
    } catch {
      alert('创建工作台失败')
    } finally {
      setCreating(false)
    }
  }

  const countText = useMemo(() => `${workspaces.length} 个历史对话`, [workspaces.length])

  return (
    <div className="min-h-screen bg-[#0f1117] text-white">
      <nav className="fixed top-0 z-50 flex h-14 w-full items-center justify-between border-b border-white/10 bg-[#0f1117] px-8">
        <div className="flex items-center gap-3">
          <Image src="/mascot.png" width={28} height={28} alt="Gambit" className="rounded-full" />
          <span className="font-bold text-white">Gambit</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/" className="text-sm font-medium text-slate-400 hover:text-white">
            首页
          </a>
          <button
            type="button"
            onClick={() => void handleNew()}
            disabled={creating}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {creating ? '创建中...' : '新建工作台'}
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 pt-24">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">我的工作台</h1>
            <p className="mt-1 text-slate-400">{countText}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleNew()}
            disabled={creating}
            className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {creating ? '创建中...' : '新建工作台'}
          </button>
        </div>

        {loading ? (
          <div className="mt-8 flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="animate-pulse rounded-2xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-center justify-between">
                  <div className="h-4 w-40 rounded bg-white/10" />
                  <div className="h-4 w-24 rounded bg-white/10" />
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="h-5 w-16 rounded bg-white/10" />
                  <div className="h-5 w-24 rounded bg-white/10" />
                  <div className="h-5 w-20 rounded bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : workspaces.length === 0 ? (
          <div className="mt-20 flex flex-col items-center justify-center text-center">
            <Image src="/mascot.png" width={100} height={100} alt="Gambit" className="rounded-2xl" />
            <div className="mt-6 text-lg font-medium">还没有工作台，开始第一次对话吧</div>
            <button
              type="button"
              onClick={() => void handleNew()}
              disabled={creating}
              className="mt-6 rounded-xl bg-indigo-500 px-6 py-3 text-base font-medium text-white transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {creating ? '创建中...' : '开始'}
            </button>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            {workspaces.map((w) => {
              const tools = parseTools(w.toolsUsed)
              return (
                <div
                  key={w.id}
                  onClick={() => router.push('/workspace/' + w.id)}
                  className="cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-white">{w.title}</div>
                    <div className="text-sm text-slate-500">{formatTime(w.updatedAt)}</div>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-slate-200">
                      {w._count?.messages ?? 0} 条消息
                    </span>
                    {tools.map((tool) => (
                      <span
                        key={tool}
                        className="rounded bg-white/10 px-2 py-0.5 text-xs text-slate-200"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

