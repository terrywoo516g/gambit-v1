'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const ALL_MODELS = [
  { id: 'deepseek/deepseek-v3.2-251201', provider: 'DeepSeek', short: 'DeepSeek V3.2' },
  { id: 'deepseek-v3.1', provider: 'DeepSeek', short: 'DeepSeek V3.1' },
  { id: 'moonshotai/kimi-k2.6', provider: 'Moonshot', short: 'Kimi K2.6' },
  { id: 'moonshotai/kimi-k2.5', provider: 'Moonshot', short: 'Kimi K2.5' },
  { id: 'doubao-seed-2.0-pro', provider: 'ByteDance', short: 'Doubao Seed 2.0 Pro' },
  { id: 'doubao-seed-2.0-mini', provider: 'ByteDance', short: 'Doubao Seed 2.0 Mini' },
  { id: 'qwen/qwen3.6-plus', provider: 'Aliyun', short: 'Qwen3.6 Plus' },
  { id: 'qwen3-max', provider: 'Aliyun', short: 'Qwen3 Max' },
  { id: 'z-ai/glm-5.1', provider: 'Zhipu', short: 'GLM 5.1' },
  { id: 'z-ai/glm-5', provider: 'Zhipu', short: 'GLM 5' },
  { id: 'minimax/minimax-m2.7', provider: 'MiniMax', short: 'MiniMax M2.7' },
  { id: 'MiniMax-M1', provider: 'MiniMax', short: 'MiniMax M1' },
]

const DEFAULT_FAVORITES = ['deepseek/deepseek-v3.2-251201', 'doubao-seed-2.0-pro', 'moonshotai/kimi-k2.6']
const DEFAULT_SELECTED = ['deepseek/deepseek-v3.2-251201', 'doubao-seed-2.0-pro', 'moonshotai/kimi-k2.6']

const TOOL_MENU = [
  { key: 'compose', label: '创意合成', desc: '多源创意整合' },
  { key: 'brainstorm', label: '头脑风暴', desc: '共识/分歧/盲点' },
  { key: 'review', label: '多AI审稿', desc: '多AI审阅文档' },
  { key: 'compare', label: '多源对比', desc: '生成推荐报告' },
]

const TEMPLATES = [
  { tool: 'compose', label: '创意合成', text: '帮我写一篇小红书种草文案，主题是露营装备' },
  { tool: 'brainstorm', label: '头脑风暴', text: '我该不该从大厂跳槽去创业公司，帮我分析共识和分歧' },
  { tool: 'review', label: '多AI审稿', text: '帮我审阅这份合同，找出潜在风险条款' },
  { tool: 'compare', label: '多源对比', text: '推荐几款3000元以内的降噪耳机，帮我整理成对比表格' },
]

function getShortName(id: string): string {
  return ALL_MODELS.find(m => m.id === id)?.short || id.split(' ')[0]
}

export default function HomePage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [selectedModels, setSelectedModels] = useState<string[]>(DEFAULT_SELECTED)
  const [favorites, setFavorites] = useState<string[]>(DEFAULT_FAVORITES)
  const [selectedTool, setSelectedTool] = useState<string | null>(null)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [showToolMenu, setShowToolMenu] = useState(false)
  const [showAgentSearch, setShowAgentSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  function toggleModel(model: string) {
    setSelectedModels(prev =>
      prev.includes(model) ? prev.filter(m => m !== model) : [...prev, model]
    )
  }

  function selectFromSearch(agent: string) {
    const currentFavs = [...favorites]
    const emptyIdx = currentFavs.findIndex(f => !selectedModels.includes(f))
    const idx = emptyIdx !== -1 ? emptyIdx : 2
    setFavorites(prev => {
      const next = [...prev]
      next[idx] = agent
      return next
    })
    if (!selectedModels.includes(agent)) {
      setSelectedModels(prev => [...prev, agent])
    }
    setShowAgentSearch(false)
    setSearchQuery('')
  }

  function clickFavorite(agent: string) {
    toggleModel(agent)
  }

  function applyTemplate(tpl: typeof TEMPLATES[0]) {
    setText(tpl.text)
    setSelectedTool(tpl.tool)
  }

  async function handleSubmit(inputText?: string) {
    const finalText = (inputText ?? text).trim()
    if (!finalText || loading) return

    if (selectedModels.length < 2) {
      alert('请至少选择 2 个 AI 模型')
      return
    }

    try {
      setLoading(true)
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalText,
          selectedModels: selectedModels,
        }),
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
    <div className="min-h-screen paper-dots flex flex-col relative">
      {/* 侧边装饰文字与虚线 */}
      <div className="fixed left-8 top-0 bottom-0 w-[1px] border-l border-dashed border-gray-200/60 pointer-events-none" />
      <div className="fixed left-6 top-1/2 -translate-y-1/2 font-mono text-[22px] font-bold tracking-[0.15em] text-black/[0.07] rotate-180" style={{ writingMode: 'vertical-rl' }}>SECTION A-A</div>
      
      <div className="fixed right-8 top-0 bottom-0 w-[1px] border-r border-dashed border-gray-200/60 pointer-events-none" />
      <div className="fixed right-6 top-1/2 -translate-y-1/2 font-mono text-[22px] font-bold tracking-[0.15em] text-black/[0.07]" style={{ writingMode: 'vertical-rl' }}>DETAIL B</div>

      {/* 导航栏 — 透明融入背景 */}
      <nav className="h-12 flex items-center justify-between px-8">
        <a href="/workspaces" className="text-sm font-medium text-inkLight hover:text-ink transition flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          历史工作台
        </a>
        <div className="flex items-center gap-4">
          <button className="text-sm font-medium text-inkLight hover:text-ink transition" onClick={() => alert('登录功能即将支持')}>登录</button>
          <button className="text-sm font-medium bg-ink text-white px-4 py-1.5 rounded-full hover:bg-ink/80 transition" onClick={() => alert('注册功能即将支持')}>注册</button>
        </div>
      </nav>

      <main className="flex-1 flex flex-col items-center px-4 pt-0 pb-6">
        {/* Logo 和标题 — 缩小间距 */}
        <img src="/mascot.png" className="w-[172px] h-[172px] mb-2 drop-shadow-lg -mt-2" alt="mascot" />
        <h1 className="text-[44px] font-black text-ink mb-1 tracking-tight">Gambit</h1>
        <h2 className="text-xl font-extrabold text-inkLight mb-1.5">国王的选择题</h2>
        <p className="text-sm text-inkLight/80 mb-4">你的决定，不该只听一个 AI 的</p>

        {/* 对话框式输入区 */}
        <div className="w-full max-w-4xl relative">
          
          {/* 顶部标题与模型选择栏同一行 */}
          <div className="flex items-center justify-center mb-3 px-1 relative z-20">
            {/* 常用模型栏 */}
            <div className="flex items-center gap-3 relative">
                {favorites.map((a, idx) => (
                  <button
                    key={a + idx}
                    onClick={() => clickFavorite(a)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition flex items-center gap-1.5 ${
                      selectedModels.includes(a)
                        ? 'bg-gray-100 text-ink shadow-sm'
                        : 'bg-transparent text-inkLight hover:text-ink'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold ${selectedModels.includes(a) ? 'bg-ink text-white' : 'bg-gray-200 text-inkLight'}`}>
                      {getShortName(a)[0]}
                    </div>
                    {getShortName(a)}
                  </button>
                ))}
                <button
                  onClick={() => setShowAgentSearch(!showAgentSearch)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-inkLight hover:text-ink transition"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                </button>
  
                {/* 模型搜索弹窗 */}
                {showAgentSearch && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => { setShowAgentSearch(false); setSearchQuery('') }} />
                    <div className="absolute top-10 left-1/2 -translate-x-1/2 z-50 w-80 bg-white rounded-2xl border border-gray-200 shadow-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-ink">选择模型替换到常用栏</span>
                      <button onClick={() => { setShowAgentSearch(false); setSearchQuery('') }} className="text-inkLight hover:text-ink text-lg">&times;</button>
                    </div>
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="搜索模型..."
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none mb-3 focus:border-accent"
                    />
                    <div className="space-y-1 max-h-60 overflow-y-auto">
                      {ALL_MODELS.filter(m => m.id.toLowerCase().includes(searchQuery.toLowerCase()) || m.provider.toLowerCase().includes(searchQuery.toLowerCase())).map(model => (
                        <button
                          key={model.id}
                          onClick={() => selectFromSearch(model.id)}
                          className="flex items-center gap-3 w-full text-left px-3 py-2.5 rounded-xl text-sm text-ink hover:bg-gray-50 transition"
                        >
                          <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-ink text-xs font-bold border border-gray-200">
                            {model.short[0]}
                          </span>
                          <div>
                            <div className="font-medium">{model.id}</div>
                            <div className="text-xs text-inkLight">{model.provider}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="w-full bg-white border border-gray-200 rounded-[12px] shadow-sm overflow-visible flex flex-col pl-4 pr-2 py-2">
            {/* 已选模型和工具标签 */}
            <div className="flex flex-wrap gap-1.5 px-2 pb-1">
              {selectedModels.map(m => (
                <span key={m} className="inline-flex items-center gap-1 bg-white text-ink rounded-full px-2.5 py-0.5 text-xs font-medium border border-gray-200">
                  @{getShortName(m)}
                  <button onClick={() => toggleModel(m)} className="opacity-60 hover:opacity-100 ml-0.5">&times;</button>
                </span>
              ))}
              {selectedTool && (
                <span className="inline-flex items-center gap-1 bg-white text-ink rounded-full px-2.5 py-0.5 text-xs font-medium border border-gray-200">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                  {TOOL_MENU.find(t => t.key === selectedTool)?.label}
                  <button onClick={() => setSelectedTool(null)} className="opacity-60 hover:opacity-100 ml-0.5">&times;</button>
                </span>
              )}
            </div>

            {/* 文本输入 */}
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="你的决策或问题..."
              className="w-full min-h-[40px] max-h-[120px] resize-none px-2 py-2 text-[15px] outline-none bg-transparent placeholder:text-gray-400 text-ink"
            />
            
            {/* 底部工具栏 */}
            <div className="flex items-center gap-1 px-1">
              {/* 附件按钮 */}
              <button
                className="w-8 h-8 rounded-full flex items-center justify-center text-inkLight hover:text-ink hover:bg-gray-200/50 transition"
                title="添加文件（即将支持）"
                onClick={() => alert('文件上传功能即将支持')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 5v14M5 12h14" /></svg>
              </button>

              {/* @ 选模型按钮 */}
              <div className="relative">
                <button
                  onClick={() => { setShowModelPicker(!showModelPicker); setShowToolMenu(false) }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-inkLight hover:text-ink hover:bg-gray-200/50 transition text-base font-medium"
                  title="选择模型"
                >
                  @
                </button>
                {showModelPicker && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowModelPicker(false)} />
                    <div className="absolute bottom-10 left-0 bg-white border border-gray-200 rounded-xl p-2 shadow-lg z-[100] w-64 max-h-80 overflow-y-auto">
                      {ALL_MODELS.map(m => (
                        <button
                          key={m.id}
                          onClick={() => { toggleModel(m.id); setShowModelPicker(false) }}
                          className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-lg transition hover:bg-gray-50"
                        >
                          <span className="text-xs text-inkLight">{m.provider}</span>
                          <span className="text-ink">{m.short}</span>
                          {selectedModels.includes(m.id) && (
                            <svg className="w-4 h-4 ml-auto text-accent flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* 工具按钮 */}
              <div className="relative">
                <button
                  onClick={() => { setShowToolMenu(!showToolMenu); setShowModelPicker(false) }}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-inkLight hover:text-ink hover:bg-gray-200/50 transition"
                  title="选择工具"
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                </button>
                {showToolMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowToolMenu(false)} />
                    <div className="absolute bottom-10 left-0 bg-white border border-gray-200 rounded-xl p-2 shadow-lg z-[100] w-60">
                      {TOOL_MENU.map(t => (
                        <button
                          key={t.key}
                          onClick={() => { setSelectedTool(selectedTool === t.key ? null : t.key); setShowToolMenu(false) }}
                          className={`block w-full text-left px-3 py-2.5 text-sm rounded-lg transition ${
                            selectedTool === t.key ? 'bg-gray-100 text-ink font-medium' : 'text-ink hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span>{t.label}</span>
                            <span className={`text-xs ml-auto ${selectedTool === t.key ? 'text-inkLight' : 'text-gray-400'}`}>{t.desc}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* 麦克风容器 */}
            <div className="absolute right-3 bottom-3 flex items-center">
              <button
                className="w-10 h-10 rounded-full flex items-center justify-center text-inkLight hover:text-ink transition"
                title="语音输入（即将支持）"
                onClick={() => alert('语音功能即将支持')}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" x2="12" y1="19" y2="22"></line></svg>
              </button>
            </div>
          </div>
        </div>

        {/* 开始生成按钮 */}
        <button
          onClick={() => handleSubmit()}
          disabled={loading || !text.trim() || selectedModels.length < 2}
          className="mt-4 bg-ink text-white px-8 py-2.5 rounded-full text-sm font-medium disabled:opacity-30 hover:bg-ink/85 transition flex items-center gap-2 shadow-sm"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          {loading ? '正在创建...' : '开始生成分歧'}
        </button>

        {/* 模板卡片 */}
        <div className="w-full max-w-4xl mt-5 grid grid-cols-2 gap-2">
          {TEMPLATES.map(tpl => (
            <div
              key={tpl.tool}
              onClick={() => applyTemplate(tpl)}
              className="group relative bg-white/60 border border-gray-200 rounded-xl px-4 py-2.5 cursor-pointer hover:bg-white hover:border-gray-300 transition"
            >
              <span className="text-[11px] font-mono font-semibold text-gray-400 uppercase tracking-wider">{tpl.label}</span>
              <p className="text-sm text-ink mt-0.5 leading-snug line-clamp-2">{tpl.text}</p>
              <span className="absolute right-3 top-2.5 opacity-0 group-hover:opacity-100 transition text-[11px] bg-ink text-white px-2 py-1 rounded font-medium">一键输入</span>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-4 text-center">
        <span className="text-xs font-mono text-black/20">© 2026 Gambit · MULTI-AI DECISION WORKBENCH · REV 2.0</span>
      </footer>
    </div>
  )
}