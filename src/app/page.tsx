'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const MODEL_OPTIONS = ['豆包', 'DeepSeek', 'DeepSeek-R1', 'Kimi', 'GLM']
const TOOL_OPTIONS = [
  { key: 'diverge',    label: '分歧',   desc: '让 AI 互相挑刺找漏洞', icon: '⚔️' },
  { key: 'synthesize', label: '合成',   desc: '综合多方意见出最优解', icon: '🧩' },
  { key: 'review',     label: '审稿',   desc: '多角度审核内容质量',   icon: '📝' },
  { key: 'compare',    label: '比稿',   desc: '多个方案对比择优',     icon: '⚖️' },
]
const DEFAULT_MODELS = ['豆包', 'DeepSeek']
const FAVORITE_AGENTS_INIT = ['DeepSeek', 'Kimi', 'GLM']
const EXAMPLE_QUESTIONS = [
  { text: '该不该放弃稳定工作去创业？', tool: 'diverge' },
  { text: '帮我审阅这篇产品分析报告的逻辑和文字', tool: 'review' },
  { text: '这两版广告文案哪个更好？为什么？', tool: 'compare' },
  { text: '综合分析：2025年该学什么编程语言？', tool: 'synthesize' },
]

export default function HomePage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [selectedModels, setSelectedModels] = useState<string[]>(DEFAULT_MODELS)
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [showAtMenu, setShowAtMenu] = useState(false)
  const [showToolMenu, setShowToolMenu] = useState(false)
  const [showAgentSearch, setShowAgentSearch] = useState(false)
  const [favorites, setFavorites] = useState<string[]>(FAVORITE_AGENTS_INIT)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleSubmit(overrideText?: string, overrideTool?: string) {
    const question = (overrideText ?? text).trim()
    if (!question || sending) return
    const tool = overrideTool ?? selectedTool
    const models = selectedModels.length >= 1 ? selectedModels : DEFAULT_MODELS
    if (!tool && models.length < 2) { alert('请选择至少 2 个 AI 模型参与协作'); return }
    try {
      setSending(true)
      const mode = tool ?? 'chat'
      const createRes = await fetch('/api/workspace/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: question.slice(0, 30), mode }),
      })
      const { workspace } = (await createRes.json()) as { workspace: { id: string } }
      if (tool) {
        await fetch('/api/tool/invoke', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId: workspace.id, tool, question }),
        })
      } else {
        await fetch('/api/chat/send', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ workspaceId: workspace.id, text: question, mentions: { models, tool: null } }),
        })
      }
      router.push(`/workspace/${workspace.id}`)
    } catch (err) { alert(err instanceof Error ? err.message : '发送失败') }
    finally { setSending(false) }
  }

  function toggleModel(model: string) {
    setSelectedModels(prev => prev.includes(model) ? prev.filter(m => m !== model) : [...prev, model])
  }

  function selectFavorite(agent: string) {
    setFavorites(prev => { const next = [...prev]; next[2] = agent; return next })
    if (MODEL_OPTIONS.includes(agent) && !selectedModels.includes(agent)) setSelectedModels(prev => [...prev, agent])
    setShowAgentSearch(false)
  }

  return (
    <div className="min-h-screen blueprint-grid relative overflow-hidden">
      <div className="blueprint-label fixed left-4 top-1/2 -translate-y-1/2">SECTION A-A</div>
      <div className="blueprint-label fixed right-4 top-1/2 -translate-y-1/2">DETAIL B</div>

      <nav className="fixed top-0 w-full z-50 bg-paper/80 backdrop-blur-sm border-b border-black/5 px-6 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/mascot.png" width={24} height={24} alt="Gambit" className="rounded-full" />
          <span className="font-bold text-ink text-sm">Gambit</span>
        </div>
        <a href="/workspaces" className="text-xs text-ink-light hover:text-ink transition">历史对话</a>
      </nav>

      <main className="flex flex-col items-center justify-center min-h-screen px-4 pt-12">
        <div className="flex flex-col items-center mb-8">
          <div className="drop-shadow-lg"><Image src="/mascot.png" width={120} height={120} alt="Gambit" /></div>
          <h1 className="text-3xl font-bold text-ink mt-4 tracking-tight">Gambit</h1>
          <p className="text-ink-light text-sm mt-1">你终于能看到 AI 们在为你争论什么了</p>
          <p className="text-ink-light/60 text-xs mt-0.5">把 AI 的决策过程变成你能介入的选择题</p>
        </div>

        <div className="w-full max-w-2xl">
          {/* 常用Agent胶囊 + 搜索 */}
          <div className="flex items-center justify-center gap-2 mb-3 relative">
            {favorites.map((agent, idx) => (
              <button key={`${agent}-${idx}`} onClick={() => toggleModel(agent)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${selectedModels.includes(agent) ? 'bg-accent text-white border-accent' : 'bg-white text-ink-light border-gray-200 hover:border-gray-300'}`}>{agent}</button>
            ))}
            <button onClick={() => setShowAgentSearch(true)} className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-ink-light hover:border-gray-300 transition">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            </button>
            {showAgentSearch && (<>
              <div className="fixed inset-0 z-40" onClick={() => setShowAgentSearch(false)} />
              <div className="absolute top-12 z-50 w-72 bg-white rounded-2xl border border-gray-200 shadow-lg p-4">
                <div className="flex items-center justify-between mb-3"><span className="text-sm font-medium text-ink">选择 Agent</span><button onClick={() => setShowAgentSearch(false)} className="text-ink-light hover:text-ink">✕</button></div>
                <div className="space-y-1">{MODEL_OPTIONS.map(model => (<button key={model} onClick={() => selectFavorite(model)} className="block w-full text-left px-3 py-2 rounded-xl text-sm text-ink hover:bg-gray-50 transition">{model}</button>))}</div>
              </div>
            </>)}
          </div>

          {/* 输入框主体 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3 pb-1">
              {selectedModels.map(model => (
                <span key={model} className="inline-flex items-center gap-1 bg-accent-light text-accent rounded-full px-2.5 py-0.5 text-xs font-medium">@{model}<button onClick={() => toggleModel(model)} className="hover:text-accent/70 ml-0.5">×</button></span>
              ))}
              {selectedTool && (
                <span className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 rounded-full px-2.5 py-0.5 text-xs font-medium">
                  {TOOL_OPTIONS.find(t => t.key === selectedTool)?.icon} {TOOL_OPTIONS.find(t => t.key === selectedTool)?.label}
                  <button onClick={() => setSelectedTool(null)} className="hover:text-violet-500 ml-0.5">×</button>
                </span>
              )}
              {selectedModels.length === 0 && !selectedTool && <span className="text-xs text-gray-300">@豆包 @DeepSeek</span>}
            </div>
            <textarea ref={textareaRef} value={text} onChange={e => setText(e.target.value)}
              onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = Math.min(t.scrollHeight, 200) + 'px' }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSubmit() } }}
              disabled={sending} placeholder="直接输入你想解决的问题或决策"
              className="w-full resize-none border-0 px-4 py-3 text-sm outline-none placeholder:text-gray-400 min-h-[60px] max-h-[200px]" />

            <div className="flex items-center justify-between px-4 pb-3">
              <div className="flex items-center gap-1 relative">
                <button className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-light hover:bg-gray-100 transition text-sm" title="添加文件">+</button>
                <div className="relative">
                  <button onClick={() => { setShowAtMenu(p => !p); setShowToolMenu(false) }} className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-light hover:bg-gray-100 transition text-sm font-medium">@</button>
                  {showAtMenu && (<>
                    <div className="fixed inset-0 z-30" onClick={() => setShowAtMenu(false)}/>
                    <div className="absolute bottom-10 left-0 z-40 w-48 bg-white rounded-xl border border-gray-200 shadow-lg p-2">
                      <div className="text-[10px] text-ink-light uppercase tracking-wider px-2 py-1 font-mono">模型</div>
                      {MODEL_OPTIONS.map(model => (
                        <button key={model} onClick={() => { toggleModel(model); setShowAtMenu(false) }}
                          className={`block w-full text-left px-3 py-1.5 rounded-lg text-sm transition ${selectedModels.includes(model) ? 'bg-accent-light text-accent' : 'text-ink hover:bg-gray-50'}`}>
                          {model}{selectedModels.includes(model) && ' ✓'}
                        </button>
                      ))}
                    </div>
                  </>)}
                </div>
                <div className="relative">
                  <button onClick={() => { setShowToolMenu(p => !p); setShowAtMenu(false) }} className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-light hover:bg-gray-100 transition">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
                    </svg>
                  </button>
                  {showToolMenu && (<>
                    <div className="fixed inset-0 z-30" onClick={() => setShowToolMenu(false)}/>
                    <div className="absolute bottom-10 left-0 z-40 w-56 bg-white rounded-xl border border-gray-200 shadow-lg p-2">
                      {TOOL_OPTIONS.map(tool => (
                        <button key={tool.key} onClick={() => { setSelectedTool(tool.key); setShowToolMenu(false) }}
                          className={`block w-full text-left px-3 py-2 rounded-lg transition ${selectedTool === tool.key ? 'bg-accent-light text-accent' : 'hover:bg-gray-50'}`}>
                          <div className="text-sm font-medium">{tool.icon} {tool.label}</div>
                          <div className="text-xs text-ink-light mt-0.5">{tool.desc}</div>
                        </button>
                      ))}
                      <div className="border-t border-gray-100 mt-1 pt-1">
                        <button onClick={() => { setSelectedTool(null); setShowToolMenu(false) }}
                          className="block w-full text-left px-3 py-2 rounded-lg text-sm text-ink-light hover:bg-gray-50">💬 自由对话</button>
                      </div>
                    </div>
                  </>)}
                </div>
              </div>
              <button onClick={() => void handleSubmit()} disabled={sending || text.trim().length === 0}
                className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center disabled:bg-gray-300 disabled:cursor-not-allowed transition hover:bg-ink/80">
                {sending ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> :
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>}
              </button>
            </div>
          </div>

          {/* 示例问题 */}
          <div className="flex flex-wrap justify-center gap-2 mt-6">
            {EXAMPLE_QUESTIONS.map((ex, idx) => (
              <button key={idx} onClick={() => { setText(ex.text); setSelectedTool(ex.tool); textareaRef.current?.focus() }}
                className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs text-ink-light hover:border-accent hover:text-accent transition">
                {ex.text}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-16 mb-8">
          <p className="blueprint-label-horizontal text-center">© 2026 GAMBIT · MULTI-AI DECISION WORKBENCH · REV 2.0</p>
        </div>
      </main>
    </div>
  )
}