'use client'

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Pencil, RotateCcw, Pin, Upload } from 'lucide-react'

type ModelOutput = { model: string; content: string }

interface ComposeSceneProps {
  workspaceId: string
  onDraftGenerated?: (content: string) => void
  referencedRunIds?: string[]
}

export default function ComposeScene({ workspaceId, onDraftGenerated, referencedRunIds = [] }: ComposeSceneProps) {
  const [rightNode, setRightNode] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setRightNode(document.getElementById('right-panel-container'))
  }, [])
  const [loading, setLoading] = useState(true)
  const [sceneId, setSceneId] = useState<string | null>(null)
  const [modelOutputs, setModelOutputs] = useState<ModelOutput[]>([])
  const [templateTitle, setTemplateTitle] = useState('')
  const [templateStructure, setTemplateStructure] = useState('')
  const [templateBody, setTemplateBody] = useState('')
  const [templateExtra, setTemplateExtra] = useState('')
  const [customFileContent, setCustomFileContent] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
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
  }, [workspaceId, referencedRunIds])

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setCustomFileContent(ev.target.result as string)
      }
    }
    reader.readAsText(file)
  }

  async function handleGenerate() {
    if (!sceneId) return
    const hasContent = templateTitle.trim() || templateStructure.trim() || templateBody.trim()
    if (!hasContent) { alert('请至少在一个栏位中粘贴内容'); return }
    await fetch(`/api/scenes/${sceneId}/selections`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ starred: [], editedRows: { title: templateTitle, structure: templateStructure, body: templateBody, extra: templateExtra, customFile: customFileContent } }) })
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

  if (loading) return (
    <div className="flex h-full">
      <div className="w-1/2 p-6 border-r border-gray-200 space-y-6">
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    </div>
  )

  if (finalDraft) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <h3 className="text-sm font-semibold text-ink flex items-center gap-2"><Pencil className="w-4 h-4 text-accent" />创意合成 — 最终稿</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => setFinalDraft(null)} className="text-sm text-inkLight hover:text-accent border border-gray-200 px-3 py-1 rounded-lg flex items-center gap-1"><RotateCcw className="w-3 h-3" /> 返回编辑</button>
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
      </div>
      <div className="flex-1 flex overflow-hidden">
        <div className="w-full flex flex-col bg-gray-50/50 p-4 gap-4 overflow-y-auto">
          {modelOutputs.map((output, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-xl flex flex-col shadow-sm shrink-0">
              <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-xl shrink-0">
                <span className="font-semibold text-sm text-ink">{output.model}</span>
                
              </div>
              <div className="p-4 overflow-y-auto max-h-[300px] text-xs text-ink">
                <div className="prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{output.content}</ReactMarkdown></div>
              </div>
              <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 shrink-0 rounded-b-xl">
                <button onClick={() => navigator.clipboard.writeText(output.content)} className="text-xs text-inkLight hover:text-accent flex items-center gap-1"><Copy className="w-3 h-3" />复制全文</button>
                <button onClick={() => window.dispatchEvent(new CustomEvent('gambit:pin-to-draft', { detail: { sourceType: 'compose', sourceId: `compose-${output.model}`, sourceLabel: output.model, content: output.content } }))} className="text-xs text-inkLight hover:text-accent flex items-center gap-1"><Pin className="w-3 h-3" />加入素材库</button>
              </div>
            </div>
          ))}
        </div>
        {rightNode && createPortal(
          <div className="absolute inset-0 z-50 flex flex-col h-full bg-white w-full">
            <div className="px-4 pt-3 pb-2 border-b border-gray-100"><h3 className="text-sm font-semibold text-ink">合成模板</h3><p className="text-xs text-inkLight mt-0.5">把你喜欢的内容粘贴到对应栏位</p></div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              <div><label className="flex items-center gap-2 text-xs font-medium text-ink mb-1.5"><span className="w-5 h-5 rounded bg-accent text-white flex items-center justify-center text-xs">1</span>标题</label><input value={templateTitle} onChange={e => setTemplateTitle(e.target.value)} placeholder="粘贴或输入你喜欢的标题..." className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white" /></div>
              <div><label className="flex items-center gap-2 text-xs font-medium text-ink mb-1.5"><span className="w-5 h-5 rounded bg-accent text-white flex items-center justify-center text-xs">2</span>核心思想 / 结构框架</label><textarea value={templateStructure} onChange={e => setTemplateStructure(e.target.value)} placeholder="粘贴你喜欢的内容结构、大纲、核心论点..." className="w-full min-h-[120px] p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white resize-y" /></div>
              <div><label className="flex items-center gap-2 text-xs font-medium text-ink mb-1.5"><span className="w-5 h-5 rounded bg-accent text-white flex items-center justify-center text-xs">3</span>正文内容 / 精彩片段</label><textarea value={templateBody} onChange={e => setTemplateBody(e.target.value)} placeholder="粘贴你喜欢的段落、金句、具体描述..." className="w-full min-h-[200px] p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white resize-y" /></div>
              <div><label className="flex items-center gap-2 text-xs font-medium text-ink mb-1.5"><span className="w-5 h-5 rounded bg-gray-400 text-white flex items-center justify-center text-xs">+</span>补充要求（可选）</label><textarea value={templateExtra} onChange={e => setTemplateExtra(e.target.value)} placeholder="对最终稿的额外要求，如风格、字数、语气..." className="w-full min-h-[80px] p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white resize-y" /></div>
              <div className="pt-4 border-t border-gray-100 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-ink"><span className="w-5 h-5 rounded bg-gray-400 text-white flex items-center justify-center text-xs">📎</span>自定义文件</label>
                  <input type="file" accept=".txt,.md" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                  <button onClick={() => fileInputRef.current?.click()} className="text-xs text-accent hover:text-accent/80 flex items-center gap-1"><Upload className="w-3 h-3" />上传文件</button>
                </div>
                <textarea value={customFileContent} onChange={e => setCustomFileContent(e.target.value)} placeholder="上传的文档内容会显示在这里，你也可以直接修改..." className="w-full min-h-[200px] p-3 border border-gray-200 rounded-lg text-xs outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white resize-y" />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 bg-white flex items-center justify-between">
              <div className="text-xs text-inkLight">{[templateTitle, templateStructure, templateBody].filter(Boolean).length}/3 个栏位已填写</div>
              <button onClick={handleGenerate} disabled={generating} className="bg-accent text-white px-5 py-1.5 rounded-lg text-sm font-medium disabled:opacity-40 hover:bg-accent/90 transition">{generating ? '合成中...' : '创意合成'}</button>
            </div>
          </div>,
          rightNode
        )}
      </div>
    </div>
  )
}
