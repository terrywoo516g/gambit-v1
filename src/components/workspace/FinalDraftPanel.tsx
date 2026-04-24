'use client'

import { useState, useEffect, useCallback } from 'react'
import { Copy, Download, Loader2, Sparkles, FileCheck, ChevronDown, ChevronRight, X, Pin, LayoutGrid, Plus } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

type Block = {
  id: string
  sourceType: string
  sourceId: string
  sourceLabel: string
  content: string
  inDraft: boolean
}

type Suggestion = {
  id: string
  type: string
  severity: string
  quote: string
  content: string
  sources: string[]
  rejected?: boolean
}

type Spark = {
  id: string
  angle: string
  content: string
}

export default function FinalDraftPanel({ workspaceId }: { workspaceId: string }) {
  const [blocks, setBlocks] = useState<Block[]>([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)

  // Panels state
  const [showBlocks, setShowBlocks] = useState(true)
  const [showSpark, setShowSpark] = useState(false)
  const [showReview, setShowReview] = useState(false)

  // Compose State
  const [selectedBlockIds, setSelectedBlockIds] = useState<Set<string>>(new Set())
  const [showComposeOptions, setShowComposeOptions] = useState(false)
  const [composeInstruction, setComposeInstruction] = useState('')
  const [composeMode, setComposeMode] = useState<'append' | 'replace'>('append')
  const [composing, setComposing] = useState(false)
  const [composePreview, setComposePreview] = useState('')

  // Spark State
  const [sparkType, setSparkType] = useState<'angle' | 'rewrite' | 'counter'>('angle')
  const [sparks, setSparks] = useState<Spark[]>([])
  const [sparking, setSparking] = useState(false)

  // Review State
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [reviewing, setReviewing] = useState(false)

  const saveDraft = useCallback(async (t: string, c: string) => {
    await fetch(`/api/workspaces/${workspaceId}/final-draft`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: t, content: c })
    })
  }, [workspaceId])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: '在此输入或生成最终稿...' })
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[300px] p-4'
      }
    },
    onUpdate: ({ editor }) => {
      saveDraft(title, editor.getHTML())
    }
  })
  const loadData = useCallback(async () => {
    try {
      const [draftRes, blocksRes] = await Promise.all([
        fetch(`/api/workspaces/${workspaceId}/final-draft`),
        fetch(`/api/workspaces/${workspaceId}/final-draft/blocks`)
      ])
      if (draftRes.ok) {
        const { draft } = await draftRes.json()
        setTitle(draft.title || '')
        if (editor && draft.content && editor.getHTML() !== draft.content) {
          editor.commands.setContent(draft.content)
        }
      }
      if (blocksRes.ok) {
        const { blocks } = await blocksRes.json()
        setBlocks(blocks)
      }
    } catch {
      console.error('Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [workspaceId, editor])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Save Draft (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) saveDraft(title, editor?.getHTML() || '')
    }, 800)
    return () => clearTimeout(timer)
  }, [title, loading, editor, saveDraft])

  // Handle Pin Event
  useEffect(() => {
    const handlePin = async (e: Event) => {
      const customEvent = e as CustomEvent
      const { sourceType, sourceId, sourceLabel, content } = customEvent.detail
      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/final-draft/blocks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sourceType, sourceId, sourceLabel, content })
        })
        const data = await res.json()
        if (res.ok) {
          setBlocks(prev => [...prev, data.block])
          alert('✓ 已加入素材库')
        } else if (data.error === '已存在') {
          alert('该素材已在素材库中')
        }
      } catch (e) {
        console.error(e)
      }
    }
    window.addEventListener('gambit:pin-to-draft', handlePin)
    return () => window.removeEventListener('gambit:pin-to-draft', handlePin)
  }, [workspaceId])

  // Review
  const runReview = useCallback(async () => {
    if (!editor) return
    setReviewing(true)
    setSuggestions([])
    try {
      const text = editor.getText()
      if (!text.trim()) {
        alert('正文为空，请先添加内容')
        setReviewing(false)
        return
      }
      const res = await fetch(`/api/workspaces/${workspaceId}/final-draft/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSuggestions(data.suggestions || [])
    } catch {
      alert('审阅失败')
    } finally {
      setReviewing(false)
    }
  }, [editor, workspaceId])

  // Handle Open Review Mode Event
  useEffect(() => {
    const handleOpenReview = () => {
      setShowReview(true)
      // auto run review if no suggestions
      if (suggestions.length === 0) {
        runReview()
      }
    }
    window.addEventListener('gambit:open-review-mode', handleOpenReview)
    return () => window.removeEventListener('gambit:open-review-mode', handleOpenReview)
  }, [suggestions.length, runReview])

  // Blocks Actions
  async function removeBlock(blockId: string) {
    await fetch(`/api/workspaces/${workspaceId}/final-draft/blocks/${blockId}`, { method: 'DELETE' })
    setBlocks(prev => prev.filter(b => b.id !== blockId))
    const newSet = new Set(selectedBlockIds)
    newSet.delete(blockId)
    setSelectedBlockIds(newSet)
  }

  async function addBlockToEditor(block: Block) {
    if (!editor) return
    const text = block.content
    editor.commands.insertContent(`<p>${text}</p>`)
    await fetch(`/api/workspaces/${workspaceId}/final-draft/blocks/${block.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inDraft: true })
    })
    setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, inDraft: true } : b))
  }

  function toggleBlockSelect(id: string) {
    const newSet = new Set(selectedBlockIds)
    if (newSet.has(id)) newSet.delete(id)
    else newSet.add(id)
    setSelectedBlockIds(newSet)
  }

  // Compose
  async function handleCompose() {
    if (!editor || selectedBlockIds.size === 0) return
    setComposing(true)
    setComposePreview('')
    setShowComposeOptions(false)
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/final-draft/compose`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blockIds: Array.from(selectedBlockIds),
          instruction: composeInstruction,
          mode: composeMode
        })
      })
      if (!res.body) throw new Error('No body')
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n\n')
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            if (!dataStr) continue
            const data = JSON.parse(dataStr)
            if (data.type === 'delta') {
              fullText += data.text
              setComposePreview(fullText)
            } else if (data.type === 'done') {
              if (composeMode === 'replace') {
                editor.commands.setContent(fullText.replace(/\n/g, '<br/>'))
              } else {
                editor.commands.insertContent(`<p>${fullText.replace(/\n/g, '<br/>')}</p>`)
              }
              setComposePreview('')
              // Mark blocks as inDraft
              selectedBlockIds.forEach(id => {
                fetch(`/api/workspaces/${workspaceId}/final-draft/blocks/${id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ inDraft: true })
                })
              })
              setBlocks(prev => prev.map(b => selectedBlockIds.has(b.id) ? { ...b, inDraft: true } : b))
              setSelectedBlockIds(new Set())
              setComposeInstruction('')
            }
          }
        }
      }
    } catch {
      alert('合成失败')
    } finally {
      setComposing(false)
    }
  }

  // Spark
  async function runSpark() {
    if (!editor) return
    setSparking(true)
    setSparks([])
    try {
      const text = editor.getText()
      const res = await fetch(`/api/workspaces/${workspaceId}/final-draft/spark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context: text, type: sparkType })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSparks(data.sparks || [])
    } catch {
      alert('灵感生成失败')
    } finally {
      setSparking(false)
    }
  }

  function applySuggestion(s: Suggestion) {
    if (!editor) return
    const text = editor.getText()
    if (text.includes(s.quote)) {
      // Replace in Tiptap
      const html = editor.getHTML()
      // This is a naive replace, might break HTML tags if quote crosses boundaries, but works for simple text
      const newHtml = html.replace(s.quote, s.content)
      editor.commands.setContent(newHtml)
    } else {
      editor.commands.insertContent(`<p>${s.content}</p>`)
      alert('原文未完全匹配，已附加到末尾')
    }
    setSuggestions(prev => prev.filter(x => x.id !== s.id))
  }

  function rejectSuggestion(s: Suggestion) {
    setSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, rejected: true } : x))
  }

  const exportMarkdown = () => {
    if (!editor) return
    // Simplified export, ideally use tiptap markdown extension
    const text = editor.getText()
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || '未命名文稿'}.md`
    a.click()
  }

  if (loading) return <div className="p-8 text-center text-inkLight"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 顶栏: 标题 */}
      <div className="p-3 bg-white border-b border-gray-200 shrink-0">
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="无标题文稿"
          className="w-full text-lg font-bold text-ink placeholder:text-gray-300 outline-none"
        />
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* 素材库 */}
        <div className="border-b border-gray-200 bg-white">
          <button onClick={() => setShowBlocks(!showBlocks)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition">
            <div className="flex items-center gap-2 font-medium text-sm text-ink">
              <LayoutGrid className="w-4 h-4 text-accent" />
              素材库 <span className="text-xs text-inkLight bg-gray-100 px-1.5 rounded">{blocks.length}</span>
            </div>
            {showBlocks ? <ChevronDown className="w-4 h-4 text-inkLight" /> : <ChevronRight className="w-4 h-4 text-inkLight" />}
          </button>
          
          {showBlocks && (
            <div className="p-3 pt-0 space-y-2 max-h-[300px] overflow-y-auto">
              {blocks.length === 0 ? (
                <div className="text-xs text-center text-gray-400 py-4">从左侧 AI 卡片或场景中 📌 收藏素材到这里</div>
              ) : (
                blocks.map(b => (
                  <div key={b.id} className={`flex items-start gap-2 p-2 border rounded-lg text-sm transition ${b.inDraft ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200 hover:border-accent/50'}`}>
                    <input type="checkbox" checked={selectedBlockIds.has(b.id)} onChange={() => toggleBlockSelect(b.id)} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-inkLight mb-1 flex items-center gap-1">
                        <span className="bg-gray-100 px-1 rounded">{b.sourceLabel}</span>
                        {b.inDraft && <span className="text-green-500">已加入</span>}
                      </div>
                      <div className="text-xs text-ink truncate">{b.content.substring(0, 60)}{b.content.length > 60 ? '...' : ''}</div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                      <button onClick={() => addBlockToEditor(b)} className="p-1 text-gray-400 hover:text-accent hover:bg-accent/10 rounded transition" title="追加到编辑器"><Plus className="w-3.5 h-3.5" /></button>
                      <button onClick={() => removeBlock(b.id)} className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition" title="删除素材"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* 组合操作区 */}
        {selectedBlockIds.size > 0 && (
          <div className="bg-accent/5 border-b border-accent/20 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-accent font-medium">已选 {selectedBlockIds.size} 项素材</span>
              <button onClick={() => setShowComposeOptions(!showComposeOptions)} className="text-xs bg-accent text-white px-3 py-1 rounded hover:bg-accent/90 transition">
                一键合成 {showComposeOptions ? '▲' : '▼'}
              </button>
            </div>
            {showComposeOptions && (
              <div className="space-y-2 mt-2">
                <textarea
                  value={composeInstruction}
                  onChange={e => setComposeInstruction(e.target.value)}
                  placeholder="附加合成指令（如：合并成一段小红书风格的文案）..."
                  className="w-full text-xs p-2 border border-accent/20 rounded-md outline-none focus:border-accent bg-white min-h-[60px]"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-ink">
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={composeMode === 'append'} onChange={() => setComposeMode('append')} /> 追加到底部</label>
                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" checked={composeMode === 'replace'} onChange={() => setComposeMode('replace')} /> 替换全文</label>
                  </div>
                  <button onClick={handleCompose} disabled={composing} className="text-xs bg-accent text-white px-3 py-1 rounded hover:bg-accent/90 transition disabled:opacity-50">
                    {composing ? '合成中...' : '开始合成'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 编辑器 */}
        <div className="bg-white min-h-[300px]">
          {/* Toolbar */}
          {editor && (
            <div className="flex items-center gap-1 p-2 border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10">
              <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded hover:bg-gray-200 text-ink ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}><strong className="font-serif px-1">B</strong></button>
              <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-gray-200 text-ink ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}><em className="font-serif px-1">I</em></button>
              <div className="w-px h-4 bg-gray-300 mx-1" />
              <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded hover:bg-gray-200 text-ink text-xs font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}>H2</button>
              <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-1.5 rounded hover:bg-gray-200 text-ink text-xs font-bold ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}`}>H3</button>
              <div className="w-px h-4 bg-gray-300 mx-1" />
              <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded hover:bg-gray-200 text-ink text-xs ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}>• List</button>
            </div>
          )}
          <EditorContent editor={editor} />
          {composePreview && (
            <div className="p-4 bg-blue-50/50 border-t border-blue-100">
              <div className="text-xs text-blue-500 font-medium mb-2 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> 正在合成中...</div>
              <div className="prose prose-sm max-w-none text-ink/80">{composePreview}</div>
            </div>
          )}
        </div>

        {/* 灵光一闪 */}
        <div className="border-t border-gray-200 bg-white">
          <button onClick={() => setShowSpark(!showSpark)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition">
            <div className="flex items-center gap-2 font-medium text-sm text-ink">
              <Sparkles className="w-4 h-4 text-purple-500" />
              灵光一闪
            </div>
            {showSpark ? <ChevronDown className="w-4 h-4 text-inkLight" /> : <ChevronRight className="w-4 h-4 text-inkLight" />}
          </button>
          
          {showSpark && (
            <div className="p-3 pt-0 border-t border-gray-50">
              <div className="flex items-center gap-2 mb-3 bg-gray-100 p-1 rounded-lg">
                <button onClick={() => setSparkType('angle')} className={`flex-1 text-xs py-1 rounded-md transition ${sparkType === 'angle' ? 'bg-white shadow-sm font-medium' : 'text-inkLight hover:text-ink'}`}>新角度</button>
                <button onClick={() => setSparkType('rewrite')} className={`flex-1 text-xs py-1 rounded-md transition ${sparkType === 'rewrite' ? 'bg-white shadow-sm font-medium' : 'text-inkLight hover:text-ink'}`}>换画风</button>
                <button onClick={() => setSparkType('counter')} className={`flex-1 text-xs py-1 rounded-md transition ${sparkType === 'counter' ? 'bg-white shadow-sm font-medium' : 'text-inkLight hover:text-ink'}`}>反方观点</button>
              </div>
              <button onClick={runSpark} disabled={sparking} className="w-full py-2 bg-purple-50 text-purple-600 rounded-lg text-sm hover:bg-purple-100 transition disabled:opacity-50 flex items-center justify-center gap-2">
                {sparking ? <><Loader2 className="w-4 h-4 animate-spin" /> 启发中...</> : <><Sparkles className="w-4 h-4" /> 给我灵感</>}
              </button>
              
              {sparks.length > 0 && (
                <div className="mt-3 space-y-2">
                  {sparks.map(s => (
                    <div key={s.id} className="p-3 border border-purple-100 bg-purple-50/30 rounded-lg text-sm relative group">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-1.5 rounded">{s.angle}</span>
                        <button onClick={() => window.dispatchEvent(new CustomEvent('gambit:pin-to-draft', { detail: { sourceType: 'spark', sourceId: s.id, sourceLabel: '灵光一闪', content: `【${s.angle}】\n${s.content}` } }))} className="text-purple-300 hover:text-purple-600 transition opacity-0 group-hover:opacity-100" title="加入素材库"><Pin className="w-3.5 h-3.5" /></button>
                      </div>
                      <div className="text-xs text-ink/80 leading-relaxed">{s.content}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 审阅模式 */}
        <div className="border-t border-gray-200 bg-white">
          <button onClick={() => setShowReview(!showReview)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition">
            <div className="flex items-center gap-2 font-medium text-sm text-ink">
              <FileCheck className="w-4 h-4 text-blue-500" />
              审阅模式 {suggestions.length > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 rounded-full">{suggestions.filter(s => !s.rejected).length}</span>}
            </div>
            {showReview ? <ChevronDown className="w-4 h-4 text-inkLight" /> : <ChevronRight className="w-4 h-4 text-inkLight" />}
          </button>
          
          {showReview && (
            <div className="p-3 pt-0 border-t border-gray-50">
              <button onClick={runReview} disabled={reviewing} className="w-full py-2 bg-blue-50 text-blue-600 rounded-lg text-sm hover:bg-blue-100 transition disabled:opacity-50 flex items-center justify-center gap-2 mb-3">
                {reviewing ? <><Loader2 className="w-4 h-4 animate-spin" /> 多AI交叉审阅中...</> : <><FileCheck className="w-4 h-4" /> 运行全文审阅</>}
              </button>

              <div className="space-y-3">
                {suggestions.map(s => (
                  <div key={s.id} className={`p-3 border rounded-lg text-sm transition ${s.rejected ? 'bg-gray-50 border-gray-100 opacity-50' : 'bg-white border-blue-100 shadow-sm'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${s.severity === '高' || s.severity === '重要' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>{s.severity}</span>
                      <span className="text-xs font-semibold text-ink">{s.type}</span>
                      <span className="ml-auto text-[10px] text-inkLight">来自 {s.sources?.join(', ')}</span>
                    </div>
                    <div className={`text-xs bg-gray-50 p-2 rounded text-inkLight mb-2 border-l-2 border-gray-300 ${s.rejected ? 'line-through' : ''}`}>
                      &quot;{s.quote}&quot;
                    </div>
                    <div className={`text-xs text-ink/90 leading-relaxed mb-3 ${s.rejected ? 'line-through' : ''}`}>
                      {s.content}
                    </div>
                    {!s.rejected && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => applySuggestion(s)} className="flex-1 py-1.5 bg-blue-50 text-blue-600 text-xs rounded hover:bg-blue-100 transition font-medium">接受修改</button>
                        <button onClick={() => rejectSuggestion(s)} className="flex-1 py-1.5 bg-gray-100 text-inkLight text-xs rounded hover:bg-gray-200 transition">忽略</button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* 底栏: 导出 */}
      <div className="p-3 border-t border-gray-200 bg-white shrink-0 flex items-center gap-2">
        <button onClick={() => { if(editor) { navigator.clipboard.writeText(editor.getText()); alert('已复制') } }} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-lg text-sm text-ink hover:border-accent hover:text-accent transition">
          <Copy className="w-4 h-4" /> 复制
        </button>
        <button onClick={exportMarkdown} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-ink text-white rounded-lg text-sm hover:bg-ink/80 transition">
          <Download className="w-4 h-4" /> 导出 MD
        </button>
      </div>
    </div>
  )
}
