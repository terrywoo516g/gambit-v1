'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Paperclip, X } from 'lucide-react'
import { toast } from '@/components/Toast'

const ALL_MODELS = [
  { id: 'DeepSeek V3.2', provider: 'DeepSeek', short: 'DeepSeek V3.2' },
  { id: 'DeepSeek R1', provider: 'DeepSeek', short: 'DeepSeek R1' },
  { id: 'Kimi K2.6', provider: 'Moonshot', short: 'Kimi K2.6' },
  { id: 'Kimi K2.5', provider: 'Moonshot', short: 'Kimi K2.5' },
  { id: 'Doubao Seed 2.0 Pro', provider: 'ByteDance', short: 'Doubao Seed 2.0 Pro' },
  { id: 'Doubao Seed 2.0 Mini', provider: 'ByteDance', short: 'Doubao Seed 2.0 Mini' },
  { id: 'Qwen3.6 Plus', provider: 'Aliyun', short: 'Qwen3.6 Plus' },
  { id: 'Qwen3 Max', provider: 'Aliyun', short: 'Qwen3 Max' },
  { id: 'GLM 5.1', provider: 'Zhipu', short: 'GLM 5.1' },
  { id: 'GLM 5', provider: 'Zhipu', short: 'GLM 5' },
  { id: 'MiniMax M2.7', provider: 'MiniMax', short: 'MiniMax M2.7' },
  { id: 'MiniMax M1', provider: 'MiniMax', short: 'MiniMax M1' },
]

const DEFAULT_SELECTED = ['DeepSeek V3.2', 'MiniMax M1', 'Qwen3 Max']

function getShortName(id: string): string {
  return ALL_MODELS.find(m => m.id === id)?.short || id.split(' ')[0]
}

export default function HomePage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [attachedDoc, setAttachedDoc] = useState<{ name: string; content: string; charCount: number } | null>(null)
  const [selectedModels, setSelectedModels] = useState<string[]>(DEFAULT_SELECTED)
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  function toggleModel(model: string) {
    setSelectedModels(prev => {
      if (prev.includes(model)) {
        return prev.filter(m => m !== model)
      } else {
        if (prev.length >= 6) {
          toast.error('最多只能选择 6 个模型')
          return prev
        }
        return [...prev, model]
      }
    })
  }

  async function handleSubmit(inputText?: string) {
    let finalText = (inputText ?? text).trim()
    if (attachedDoc) {
      finalText = `【参考文档：${attachedDoc.name}】\n${attachedDoc.content}\n---\n${finalText}`
    }
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
    <div className="min-h-screen paper-dots flex flex-col relative overflow-hidden">
      {/* 背景十字虚线与圆点 */}
      <div className="fixed left-0 right-0 top-[65%] h-[1px] border-t border-dashed border-gray-200 pointer-events-none" />
      <div className="fixed left-24 top-0 bottom-0 w-[1px] border-l border-dashed border-gray-200 pointer-events-none" />
      <div className="fixed right-24 top-0 bottom-0 w-[1px] border-r border-dashed border-gray-200 pointer-events-none" />
      {/* 交叉点的圆圈 */}
      <div className="fixed left-[96px] top-[65%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-50 border border-gray-200 pointer-events-none" />
      <div className="fixed right-[96px] top-[65%] -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-gray-50 border border-gray-200 pointer-events-none" />
      <div className="fixed right-[96px] bottom-12 -translate-x-1/2 translate-y-1/2 w-8 h-8 rounded-full bg-gray-50 border border-gray-200 pointer-events-none" />

      {/* 侧边装饰文字 */}
      <div className="fixed left-20 top-1/2 -translate-y-1/2 font-mono text-[20px] font-bold tracking-[0.2em] text-gray-200 rotate-180" style={{ writingMode: 'vertical-rl' }}>SECTION A-A</div>
      <div className="fixed right-20 top-1/2 -translate-y-1/2 font-mono text-[20px] font-bold tracking-[0.2em] text-gray-200" style={{ writingMode: 'vertical-rl' }}>DETAIL B</div>

      {/* 导航栏 */}
      <nav className="h-12 flex items-center justify-between px-8 relative z-10">
        <a href="/workspaces" className="text-sm font-medium text-gray-400 hover:text-gray-600 transition flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          历史工作台
        </a>
      </nav>

      <main className="flex-1 flex flex-col items-center px-4 pt-12 pb-6 relative z-10">
        {/* Logo 和标题 */}
        <img src="/mascot.png" className="w-[120px] h-[120px] mb-4 drop-shadow-sm" alt="mascot" />
        <h1 className="text-[32px] font-bold text-[#2f3542] mb-2 tracking-tight">Gambit</h1>
        <h2 className="text-[16px] font-medium text-[#4b5563] mb-1">你终于能看到 AI 们在为你争论什么了</h2>
        <p className="text-[13px] text-[#9ca3af] mb-12">把 AI 的决策过程变成你能介入的选择题</p>

        {/* 对话框式输入区 */}
        <div className="w-full max-w-3xl relative flex flex-col">
          <div className="flex items-center gap-2 mb-2 pl-1">
            <div className="w-1 h-3.5 bg-[#2f3542] rounded-full"></div>
            <span className="text-[14px] font-medium text-[#4b5563]">你的决策或问题</span>
          </div>

          <div className="w-full bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col p-4 mb-4 relative">
            
            {/* 已选模型 */}
            <div className="flex flex-wrap gap-1.5 pb-3">
              {selectedModels.map(m => (
                <span key={m} className="inline-flex items-center gap-1 bg-gray-50 text-[#6b7280] rounded-full px-2.5 py-0.5 text-[11px] font-medium border border-gray-200">
                  @{getShortName(m)}
                  <button onClick={() => toggleModel(m)} className="opacity-60 hover:opacity-100 ml-0.5">&times;</button>
                </span>
              ))}
              <div className="relative">
                <button
                  onClick={() => setShowModelPicker(!showModelPicker)}
                  className="inline-flex items-center gap-1 bg-white text-[#9ca3af] hover:text-[#6b7280] rounded-full px-2.5 py-0.5 text-[11px] font-medium border border-gray-200 border-dashed transition"
                >
                  + 添加模型
                </button>
                {showModelPicker && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setShowModelPicker(false)} />
                    <div className="absolute top-8 left-0 bg-white border border-gray-200 rounded-xl p-2 shadow-lg z-[100] w-64 max-h-80 overflow-y-auto">
                      {ALL_MODELS.map(m => (
                        <button
                          key={m.id}
                          onClick={() => { toggleModel(m.id); setShowModelPicker(false) }}
                          className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm rounded-lg transition hover:bg-gray-50"
                        >
                          <span className="text-xs text-gray-400">{m.provider}</span>
                          <span className="text-[#2f3542]">{m.short}</span>
                          {selectedModels.includes(m.id) && (
                            <svg className="w-4 h-4 ml-auto text-[#8a8f98] flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              placeholder="直接输入你想解决的问题或决策"
              className="w-full min-h-[80px] resize-none text-[15px] outline-none bg-transparent placeholder:text-[#d1d5db] text-[#2f3542]"
            />
          </div>

          <div className="flex flex-col items-center justify-center mb-8">
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return

                const name = file.name || ''
                const lower = name.toLowerCase()
                const isTxt = lower.endsWith('.txt')
                const isMd = lower.endsWith('.md')
                if (!isTxt && !isMd) {
                  toast.info('暂仅支持 txt/md 文件，pdf/docx 支持即将上线')
                  return
                }
                if (file.size > 500 * 1024) {
                  toast.error('文件过大，请上传 500KB 以内的 txt/md 文件')
                  return
                }

                const content = await file.text()
                setAttachedDoc({ name, content, charCount: content.length })
              }}
            />
            {!attachedDoc ? (
              <button 
                className="text-[13px] text-[#9ca3af] hover:text-[#6b7280] transition flex items-center gap-1"
                onClick={() => fileInputRef.current?.click()}
              >
                + 添加补充内容 (可选)
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 bg-white text-[#6b7280] rounded-full px-3 py-1 text-[12px] font-medium border border-gray-200 shadow-sm">
                <Paperclip className="w-3.5 h-3.5 text-[#9ca3af]" />
                {attachedDoc.name} · {attachedDoc.charCount}字
                <button onClick={() => setAttachedDoc(null)} className="ml-1 text-[#9ca3af] hover:text-[#6b7280]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            )}
          </div>

          {/* 选项卡 */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-1 bg-[#f8f9fa] p-1 rounded-full border border-gray-100">
              <button className="px-5 py-1.5 bg-[#1a1a2e] text-white text-[13px] font-medium rounded-full shadow-sm">决策</button>
              <button className="px-5 py-1.5 text-[#9ca3af] text-[13px] font-medium rounded-full cursor-not-allowed flex items-center gap-1 hover:text-[#6b7280] transition">文章 <span className="text-[10px] font-normal opacity-60">待开发</span></button>
              <button className="px-5 py-1.5 text-[#9ca3af] text-[13px] font-medium rounded-full cursor-not-allowed flex items-center gap-1 hover:text-[#6b7280] transition">报告 <span className="text-[10px] font-normal opacity-60">待开发</span></button>
              <button className="px-5 py-1.5 text-[#9ca3af] text-[13px] font-medium rounded-full cursor-not-allowed flex items-center gap-1 hover:text-[#6b7280] transition">深度研究 <span className="text-[10px] font-normal opacity-60">待开发</span></button>
            </div>
          </div>

          {/* 开始生成按钮 */}
          <div className="flex justify-center flex-col items-center gap-2">
            <button
              onClick={() => handleSubmit()}
              disabled={loading || !text.trim() || selectedModels.length < 2}
              className="bg-[#8a8f98] text-white px-8 py-2.5 rounded-full text-[14px] font-medium disabled:opacity-50 hover:bg-[#6b7280] transition flex items-center gap-2 shadow-sm"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              {loading ? '正在创建...' : '开始生成分歧'}
            </button>
            {text.length > 50000 && (
              <span className="text-xs text-orange-500 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-full flex items-center gap-1.5 mt-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                内容较长，可能影响 AI 响应速度
              </span>
            )}
          </div>

        </div>
      </main>
    </div>
  )
}
