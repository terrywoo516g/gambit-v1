'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const DEFAULT_MODELS = ['DeepSeek V3.2', '豆包 Seed 2.0 Pro', 'Kimi K2.5']

const ALL_MODELS = [
  { id: 'DeepSeek V3.2', provider: 'DeepSeek' },
  { id: 'DeepSeek R1', provider: 'DeepSeek' },
  { id: 'Kimi K2.6', provider: 'Moonshot' },
  { id: 'Kimi K2.5', provider: 'Moonshot' },
  { id: 'GLM 5.1', provider: '智谱' },
  { id: 'GLM 5', provider: '智谱' },
  { id: '豆包 Seed 2.0 Pro', provider: '字节跳动' },
  { id: '豆包 Seed 2.0 Mini', provider: '字节跳动' },
  { id: 'Qwen3 Max', provider: '阿里云' },
  { id: 'Qwen3.5 Plus', provider: '阿里云' },
  { id: 'MiniMax M2.7', provider: 'MiniMax' },
  { id: 'MiniMax M1', provider: 'MiniMax' },
]

const EXAMPLES = [
  { text: '推荐几款3000元以内的降噪耳机', scene: 'compare' },
  { text: '我该不该从大厂跳槽去创业公司', scene: 'brainstorm' },
  { text: '帮我写一篇小红书种草文案，主题是露营装备', scene: 'compose' },
  { text: '帮我审阅这份合同，找出潜在风险条款', scene: 'review' },
]

export default function HomePage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [selected, setSelected] = useState<string[]>(DEFAULT_MODELS)
  const [showPicker, setShowPicker] = useState(false)
  const [loading, setLoading] = useState(false)

  function toggleModel(id: string) {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    )
  }

  async function handleSubmit(overrideText?: string) {
    const question = (overrideText ?? text).trim()
    if (!question || loading) return
    if (selected.length < 2) {
      alert('请至少选择 2 个 AI 模型')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: question, selectedModels: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.push('/workspace/' + data.workspace.id)
    } catch (e) {
      alert(e instanceof Error ? e.message : '创建失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen blueprint-grid flex flex-col relative">
      <div className="fixed left-6 top-1/2 -translate-y-1/2 font-mono text-[22px] font-bold tracking-[0.15em] text-black/[0.07]" style={{writingMode:'vertical-rl'}}>SECTION A-A</div>
      <div className="fixed right-6 top-1/2 -translate-y-1/2 font-mono text-[22px] font-bold tracking-[0.15em] text-black/[0.07]" style={{writingMode:'vertical-rl'}}>DETAIL B</div>

      <nav className="h-14 border-b border-black/5 flex items-center justify-between px-8 bg-paper/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <img src="/mascot.png" className="w-8 h-8 rounded-full" alt="Gambit" />
          <span className="font-bold text-ink">Gambit</span>
        </div>
        <a href="/workspaces" className="text-sm text-inkLight hover:text-accent transition">历史工作台</a>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        <img src="/mascot.png" className="w-60 h-60 mb-5 drop-shadow-lg" alt="mascot" />
        <h1 className="text-5xl font-bold text-ink mb-2 tracking-tight">Gambit</h1>
        <p className="text-xl text-inkLight mb-1">你的决定，不该只听一个 AI 的</p>
        <p className="text-sm text-inkLight/60 mb-10">把 AI 的回答变成你能介入的选择题</p>

        {/* 模型选择 */}
        <div className="flex flex-wrap justify-center gap-2 mb-5">
          {selected.map(m => (
            <span key={m} className="inline-flex items-center gap-1 bg-accent text-white rounded-full px-3 py-1 text-sm">
              {m}
              <button onClick={() => toggleModel(m)} className="opacity-70 hover:opacity-100">×</button>
            </span>
          ))}
          <button onClick={() => setShowPicker(!showPicker)}
            className="px-3 py-1 rounded-full text-sm border border-gray-200 bg-white text-inkLight hover:border-accent transition">
            + 添加模型
          </button>
        </div>

        {showPicker && (
          <div className="w-full max-w-2xl mb-4 bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">选择 AI 模型（至少 2 个）</span>
              <button onClick={() => setShowPicker(false)} className="text-inkLight hover:text-ink">✕</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {ALL_MODELS.map(m => (
                <button key={m.id} onClick={() => toggleModel(m.id)}
                  className={`text-left px-3 py-2 rounded-xl text-sm border transition ${
                    selected.includes(m.id) ? 'bg-accent text-white border-accent' : 'border-gray-200 hover:border-accent'
                  }`}>
                  <div className="font-medium">{m.id}</div>
                  <div className={`text-xs ${selected.includes(m.id) ? 'text-white/70' : 'text-inkLight'}`}>{m.provider}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 输入框 */}
        <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-2xl shadow-sm">
          <textarea value={text} onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }}}
            placeholder="输入你的问题，让多个 AI 同时为你分析..."
            className="w-full min-h-[80px] max-h-[160px] resize-none px-5 py-4 text-sm outline-none bg-transparent rounded-2xl" />
        </div>

        <button onClick={() => handleSubmit()} disabled={loading || !text.trim() || selected.length < 2}
          className="mt-5 bg-ink text-white px-8 py-3 rounded-full text-base font-medium disabled:opacity-30 hover:bg-ink/85 transition">
          {loading ? '正在创建...' : '开始协作'}
        </button>

        {/* 示例 */}
        <div className="w-full max-w-2xl mt-8 grid grid-cols-2 gap-2">
          {EXAMPLES.map(ex => (
            <div key={ex.text} onClick={() => { setText(ex.text) }}
              className="group bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-gray-100 hover:border-gray-300 transition">
              <p className="text-sm text-ink leading-snug">{ex.text}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-6 text-center">
        <span className="text-xs font-mono text-black/20">© 2026 Gambit · MULTI-AI DECISION WORKBENCH</span>
      </footer>
    </div>
  )
}
