'use client'

import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Loader2, Copy, Pencil, RotateCcw, ClipboardPaste } from 'lucide-react'

type ModelOutput = { model: string; content: string }

const MODEL_COLORS: Record<string, string> = {
  'DeepSeek V3.2': 'bg-blue-500', 'DeepSeek R1': 'bg-blue-600',
  'Kimi K2.6': 'bg-purple-500', 'Kimi K2.5': 'bg-purple-500',
  'GLM 5.1': 'bg-green-500', 'GLM 5': 'bg-green-500',
  '豆包 Seed 2.0 Pro': 'bg-orange-500', '豆包 Seed 2.0 Mini': 'bg-orange-400',
  'Qwen3 Max': 'bg-cyan-500', 'Qwen3.5 Plus': 'bg-cyan-600',
  'MiniMax M2.7': 'bg-pink-500', 'MiniMax M1': 'bg-pink-400',
}

interface ComposeSceneProps {
  workspaceId: string
  onDraftGenerated?: (content: string) => void
  referencedRunIds?: string[]
}

export default function ComposeScene({ workspaceId, onDraftGenerated, referencedRunIds = [] }: ComposeSceneProps) {
  const [loading, setLoading] = useState(true)
  const [sceneId, setSceneId] = useState<string | null>(null)
  const [modelOutputs, setModelOutputs] = useState<ModelOutput[]>([])
  const [activeTab, setActiveTab] = useState(0)
  const [templateTitle, setTemplateTitle] = useState('')
  const [templateStructure, setTemplateStructure] = useState('')
  const [templateBody, setTemplateBody] = useState('')
  const [templateExtra, setTemplateExtra] = useState('')
  const [generating, setGenerating] = useState(false)
  const [finalDraft, setFinalDraft] = useState<string | null>(null)

  useEffect(() => {
    if (!workspaceId) return
    let cancelled = false
    async function init() {
      try {
        setLoading(true)
        const res = await fetch(`/api/workspaces/${workspaceId}/scenes/compose/init`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ referencedRunIds }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        if (cancelled) return
        setSceneId(data.sceneSessionId)
        const outputMap = new Map<string, string[]>()
        for (const p of data.paragraphs) { if (!outputMap.has(p.model)) outputMap.set(p.model, []); outputMap.get(p.model)!.push(p.text) }
        const outputs: ModelOutput[] = []
        for (const name of data.modelNames) { const parts = outputMap.get(name); if (parts) outputs.push({ model: name, content: parts.join('\n\n') }) }
        setModelOutputs(outputs)
      } catch (e) { if (!cancelled) alert(e instanceof Error ? e.message : '初始化失败') }
      finally { if (!cancelled) setLoading(false) }
    }
    void init()
    return () => { cancelled = true }
  }, [workspaceId])

  function applyAsBase(output: ModelOutput) {
    if (!confirm(`确定以「${output.model}」的全文作为底稿吗？这将覆盖当前正文栏内容。`)) return
    setTemplateBody(output.content)
  }

  async function handleGenerate() {
    if (!sceneId) return
    const hasContent = templateTitle.trim() || templateStructure.trim() || templateBody.trim()
    if (!hasContent) { alert('请至少在一个栏位中粘贴内容'); return }
    await fetch(`/api/scenes/${sceneId}/selections`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ starred: [], editedRows: { title: templateTitle, structure: templateStructure, body: templateBody, extra: templateExtra } }) })
    try {
      setGenerating(true)
      const res = await fetch(`/api/scenes/${sceneId}/generate`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setFinalDraft(data.content)
      onDraftGenerated?.(data.content)
    } catch (e) { alert(e instanceof Error ? e.message : '生成失败') }
    finally { setGenerating(false) }
  }

  if (loading) return <div className="flex items-center justify-center h-full"><div className="text-center"><Loader2 className="w-8 h-8 animate-spin text-accent mx-auto mb-3" /><p className="text-inkLight text-sm">正在加载素材...</p></div></div>

  if (finalDraft) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2"><Pencil className="w-4 h-4 text-accent" />创意合成 — 最终稿</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setFinalDraft(null)} className="text-sm text-inkLight hover:text-accent border border-gray-200 px-3 py-1 rounded-lg flex items-center gap-1"><RotateCcw className="w-3 h-3" /> 返回编辑</button>
            <button onClick={() => handleGenerate()} className="text-sm text-inkLight hover:text-accent border border-gray-200 px-3 py-1 rounded-lg flex items-center gap-1"><RotateCcw className="w-3 h-3" /> 重新生成</button>
            <button onClick={() => navigator.clipboard.writeText(finalDraft)} className="text-sm bg-accent text-white px-4 py-1 rounded-lg hover:bg-accent/90 flex items-center gap-1"><Copy className="w-3 h-3" /> 复制全文</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto bg-white border border-gray-200 rounded-2xl p-8">
            <div className="prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{finalDraft}</ReactMarkdown></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <h3 className="text-sm font-semibold text-ink flex items-center gap-2"><Pencil className="w-4 h-4 text-accent" />创意合成</h3>
        <button onClick={handleGenerate} disabled={generating} className="bg-accent text-white px-5 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition">{generating ? '合成中...' : '创意合成'}</button>
      </div>
      <div className="px-4 py-2 bg-amber-50 border-b border-amber-100 text-xs text-amber-700 flex items-center gap-1">
        <ClipboardPaste className="w-3.5 h-3.5" /> 操作方式：在左侧选中喜欢的文字 → 复制（Ctrl+C）→ 粘贴到右侧对应栏位（Ctrl+V）→ 点击「创意合成」
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r border-gray-200 flex flex-col">
          <div className="flex items-center gap-1 px-4 pt-3 pb-2 border-b border-gray-100 bg-white/50 overflow-x-auto">
            {modelOutputs.map((output, idx) => (
              <button key={output.model} onClick={() => setActiveTab(idx)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap ${activeTab === idx ? 'bg-ink text-white' : 'bg-gray-100 text-inkLight hover:bg-gray-200'}`}>
                <span className={`w-2 h-2 rounded-full ${MODEL_COLORS[output.model] || 'bg-gray-500'}`} />{output.model}
              </button>
            ))}
          </div>
          <div className="px-4 py-2 border-b border-gray-100 bg-gray-50/50">
            <button onClick={() => modelOutputs[activeTab] && applyAsBase(modelOutputs[activeTab])} className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:border-accent hover:text-accent transition text-inkLight flex items-center gap-1">
              <ClipboardPaste className="w-3 h-3" /> 以 {modelOutputs[activeTab]?.model} 的全文为底稿
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-4 select-text">
            {modelOutputs[activeTab] && <div className="prose prose-sm max-w-none text-ink"><ReactMarkdown remarkPlugins={[remarkGfm]}>{modelOutputs[activeTab].content}</ReactMarkdown></div>}
            <div className="mt-4 pt-3 border-t border-gray-100 text-[10px] text-inkLight/50">提示：选中文字后使用 Ctrl+C 复制，然后粘贴到右侧对应栏位</div>
          </div>
        </div>
        <div className="w-1/2 flex flex-col bg-gray-50/30">
          <div className="px-4 pt-3 pb-2 border-b border-gray-100"><h3 className="text-sm font-semibold text-ink">合成模板</h3><p className="text-xs text-inkLight mt-0.5">把你喜欢的内容粘贴到对应栏位</p></div>
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
            <div><label className="flex items-center gap-2 text-xs font-medium text-ink mb-1.5"><span className="w-5 h-5 rounded bg-accent text-white flex items-center justify-center text-xs">1</span>标题</label><input value={templateTitle} onChange={e => setTemplateTitle(e.target.value)} placeholder="粘贴或输入你喜欢的标题..." className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white" /></div>
            <div><label className="flex items-center gap-2 text-xs font-medium text-ink mb-1.5"><span className="w-5 h-5 rounded bg-accent text-white flex items-center justify-center text-xs">2</span>核心思想 / 结构框架</label><textarea value={templateStructure} onChange={e => setTemplateStructure(e.target.value)} placeholder="粘贴你喜欢的内容结构、大纲、核心论点..." className="w-full min-h-[120px] p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white resize-y" /></div>
            <div><label className="flex items-center gap-2 text-xs font-medium text-ink mb-1.5"><span className="w-5 h-5 rounded bg-accent text-white flex items-center justify-center text-xs">3</span>正文内容 / 精彩片段</label><textarea value={templateBody} onChange={e => setTemplateBody(e.target.value)} placeholder="粘贴你喜欢的段落、金句、具体描述..." className="w-full min-h-[200px] p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white resize-y" /></div>
            <div><label className="flex items-center gap-2 text-xs font-medium text-ink mb-1.5"><span className="w-5 h-5 rounded bg-gray-400 text-white flex items-center justify-center text-xs">+</span>补充要求（可选）</label><textarea value={templateExtra} onChange={e => setTemplateExtra(e.target.value)} placeholder="对最终稿的额外要求，如风格、字数、语气..." className="w-full min-h-[80px] p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white resize-y" /></div>
          </div>
          <div className="px-4 py-3 border-t border-gray-200 bg-white flex items-center justify-between">
            <div className="text-xs text-inkLight">{[templateTitle, templateStructure, templateBody].filter(Boolean).length}/3 个栏位已填写</div>
            <button onClick={handleGenerate} disabled={generating} className="bg-accent text-white px-5 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition">{generating ? '合成中...' : '创意合成'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}