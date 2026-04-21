'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type WorkspaceItem = { id: string; title: string; mode: string; toolsUsed: unknown; updatedAt: string; _count?: { messages: number } }

function parseTools(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(v => String(v))
  try { const p = JSON.parse(String(value ?? '[]')); if (Array.isArray(p)) return p.map(v => String(v)); return [] } catch { return [] }
}
function formatTime(input: string) {
  const d = new Date(input); if (isNaN(d.getTime())) return ''
  return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

export default function WorkspacesPage() {
  const router = useRouter()
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    let active = true
    async function load() {
      try { setLoading(true); const res = await fetch('/api/workspaces'); const data = await res.json(); if (!res.ok) throw new Error(); if (active) setWorkspaces(data.workspaces ?? []) }
      catch { if (active) setWorkspaces([]) } finally { if (active) setLoading(false) }
    }
    void load(); return () => { active = false }
  }, [])

  async function handleNew() {
    try { setCreating(true); const res = await fetch('/api/workspace/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: '新工作台', mode: 'chat' }) }); const data = await res.json(); if (!res.ok || !data.workspace?.id) throw new Error(); router.push(`/workspace/${data.workspace.id}`) }
    catch { alert('创建失败') } finally { setCreating(false) }
  }

  return (
    <div className="min-h-screen bg-paper blueprint-grid text-ink">
      <div className="blueprint-label fixed left-4 top-1/2 -translate-y-1/2">SECTION A-A</div>
      <nav className="fixed top-0 z-50 w-full bg-paper/80 backdrop-blur-sm border-b border-black/5 px-6 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2"><Image src="/mascot.png" width={24} height={24} alt="Gambit" className="rounded-full"/><span className="font-bold text-ink text-sm">Gambit</span></div>
        <div className="flex items-center gap-3">
          <a href="/" className="text-xs text-ink-light hover:text-ink transition">首页</a>
          <button onClick={() => void handleNew()} disabled={creating} className="bg-ink text-white px-3 py-1.5 rounded-lg text-xs font-medium transition hover:bg-ink/80 disabled:opacity-50">{creating ? '创建中...' : '新建对话'}</button>
        </div>
      </nav>
      <main className="max-w-2xl mx-auto px-6 pt-20 pb-12">
        <div className="flex items-end justify-between mb-6">
          <div><div className="blueprint-label-horizontal mb-1">HISTORY</div><h1 className="text-2xl font-bold">历史对话</h1></div>
          <span className="text-xs text-ink-light font-mono">{workspaces.length} records</span>
        </div>
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => (<div key={i} className="animate-pulse rounded-xl border border-black/5 bg-white p-4"><div className="h-4 w-40 bg-gray-100 rounded"/><div className="h-3 w-24 bg-gray-100 rounded mt-3"/></div>))}</div>
        ) : workspaces.length === 0 ? (
          <div className="text-center py-20">
            <Image src="/mascot.png" width={80} height={80} alt="Gambit" className="mx-auto opacity-60"/>
            <p className="text-sm text-ink-light mt-4">还没有对话，开始你的第一次 AI 协作吧</p>
            <button onClick={() => void handleNew()} disabled={creating} className="mt-4 bg-ink text-white px-5 py-2 rounded-lg text-sm font-medium transition hover:bg-ink/80">开始</button>
          </div>
        ) : (
          <div className="space-y-2">
            {workspaces.map(w => {
              const tools = parseTools(w.toolsUsed)
              return (
                <div key={w.id} onClick={() => router.push(`/workspace/${w.id}`)} className="group cursor-pointer rounded-xl border border-black/5 bg-white p-4 transition hover:shadow-sm hover:border-black/10">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-ink">{w.title}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-ink-light font-mono">{formatTime(w.updatedAt)}</span>
                      <button onClick={e => { e.stopPropagation(); if (!confirm('确定删除？')) return; fetch(`/api/workspace/${w.id}`, { method: 'DELETE' }).then(res => { if (res.ok) setWorkspaces(prev => prev.filter(x => x.id !== w.id)) }).catch(console.error) }}
                        className="opacity-0 group-hover:opacity-100 text-ink-light hover:text-red-500 transition text-xs" aria-label="删除">✕</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] text-ink-light font-mono border border-black/5 rounded px-1.5 py-0.5">{w._count?.messages ?? 0} msgs</span>
                    {tools.map(t => (<span key={t} className="text-[10px] text-ink-light font-mono border border-black/5 rounded px-1.5 py-0.5">{t}</span>))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
      <footer className="text-center py-6"><p className="blueprint-label-horizontal">© 2026 GAMBIT · REV 2.0</p></footer>
    </div>
  )
}