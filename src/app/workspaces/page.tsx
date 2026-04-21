'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

type WsItem = {
  id: string
  title: string
  status: string
  selectedModels: string[]
  updatedAt: string
  modelRunCount: number
}

export default function WorkspacesPage() {
  const router = useRouter()
  const [list, setList] = useState<WsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/workspaces')
        const data = await res.json()
        setList(data.workspaces ?? [])
      } catch {
        setList([])
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [])

  return (
    <div className="min-h-screen blueprint-grid">
      <nav className="h-14 border-b border-black/5 flex items-center justify-between px-8 bg-paper/80">
        <div className="flex items-center gap-2">
          <img src="/mascot.png" className="w-7 h-7 rounded-full" alt="G" />
          <span className="font-bold text-sm">Gambit</span>
        </div>
        <a href="/" className="text-sm text-inkLight hover:text-accent">首页</a>
      </nav>

      <div className="max-w-3xl mx-auto px-6 pt-10">
        <h1 className="text-2xl font-bold mb-1">历史工作台</h1>
        <p className="text-sm text-inkLight mb-6">{list.length} 个任务</p>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="rounded-xl border border-gray-200 bg-white p-5 animate-pulse">
                <div className="h-4 w-40 rounded bg-gray-100 mb-3" />
                <div className="h-3 w-24 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-inkLight">还没有任务</p>
            <a href="/" className="mt-4 inline-block bg-accent text-white px-5 py-2 rounded-lg text-sm">开始第一次协作</a>
          </div>
        ) : (
          <div className="space-y-3">
            {list.map(w => (
              <div key={w.id} onClick={() => router.push('/workspace/' + w.id)}
                className="group cursor-pointer rounded-xl border border-gray-200 bg-white p-5 hover:border-accent transition">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{w.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-inkLight">{new Date(w.updatedAt).toLocaleString('zh-CN')}</span>
                    <button onClick={e => {
                      e.stopPropagation()
                      if (confirm('确定删除？')) {
                        fetch('/api/workspaces/' + w.id, { method: 'DELETE' })
                          .then(r => { if (r.ok) setList(p => p.filter(x => x.id !== w.id)) })
                      }
                    }} className="hidden group-hover:block text-inkLight hover:text-red-500 text-sm">🗑</button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {w.selectedModels.map(m => (
                    <span key={m} className="rounded bg-gray-50 px-2 py-0.5 text-xs text-inkLight">{m}</span>
                  ))}
                  <span className="rounded bg-gray-50 px-2 py-0.5 text-xs text-inkLight">{w.modelRunCount} 个模型</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
