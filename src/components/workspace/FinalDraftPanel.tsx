'use client'

import * as React from 'react'
import { useState, useEffect, useCallback } from 'react'
import { Loader2, Sparkles, FileCheck, ChevronDown, ChevronRight, X, Pin, LayoutGrid, Plus, Wand2, FileText, Copy, Download } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'

import { track } from '@/lib/track'

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
  type: string
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
  // Old compose state removed
  const [composeInstruction, setComposeInstruction] = useState('')
  const [composeMode] = useState<'append' | 'replace' | 'preview'>('replace')
  const [composing, setComposing] = useState(false)
  const [composePreview, setComposePreview] = useState('')
  const abortControllerRef = React.useRef<AbortController | null>(null)

  // Spark State
  const [sparks, setSparks] = useState<Spark[]>([])
  const [sparking, setSparking] = useState(false)

  // Review State
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [reviewing, setReviewing] = useState(false)

  // Draft Mode State
  const [draftMode, setDraftMode] = useState<'prepare' | 'result'>('prepare')
  const [draftContent, setDraftContent] = useState('') // eslint-disable-line @typescript-eslint/no-unused-vars

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
      Placeholder.configure({ placeholder: '从左侧素材库收藏内容，点击下方"生成最终稿"自动合成；也可直接在此编辑' })
    ],
    content: '',
    editorProps: {
      attributes: {
        class: `prose max-w-none focus:outline-none min-h-[300px] p-4 ${draftMode === 'result' ? 'prose-base leading-[1.8] text-[16px]' : 'prose-sm'}`
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
        if (draft.content) {
          setDraftContent(draft.content)
          setDraftMode('result')
          if (editor && editor.getHTML() !== draft.content) {
            editor.commands.setContent(draft.content)
          }
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

  useEffect(() => {
    const handleAbort = () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
    window.addEventListener('gambit:abort-compose', handleAbort)
    return () => window.removeEventListener('gambit:abort-compose', handleAbort)
  }, [])
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!loading) saveDraft(title, editor?.getHTML() || '')
    }, 800)
    return () => clearTimeout(timer)
  }, [title, loading, editor, saveDraft])

  
  useEffect(() => {
    const handleStreamToDraft = async (e: Event) => {
      const customEvent = e as CustomEvent;
      const { promptText } = customEvent.detail;
      if (!promptText) return;

      if (!editor) return;
      setDraftMode('result');
      setComposing(true);
      abortControllerRef.current = new AbortController();

      try {
        const res = await fetch(`/api/workspaces/${workspaceId}/final-draft/generate-stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: promptText }),
          signal: abortControllerRef.current.signal
        });

        if (!res.ok) throw new Error('Stream failed');
        if (!res.body) throw new Error('No body');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        editor.commands.clearContent();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const dataStr = line.slice(6);
            if (!dataStr.trim()) continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.type === 'delta') {
                fullText += data.text;
                editor.commands.clearContent();
                editor.commands.insertContent(fullText.replace(/\n/g, '<br/>'));
              } else if (data.type === 'done') {
                setDraftContent(fullText.replace(/\n/g, '<br/>'));
              }
            } catch (e) {
              console.error(e);
            }
          }
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          alert('生成失败');
        }
      } finally {
        setComposing(false);
        abortControllerRef.current = null;
      }
    };
    window.addEventListener('gambit:stream-to-draft', handleStreamToDraft);
    return () => window.removeEventListener('gambit:stream-to-draft', handleStreamToDraft);
  }, [workspaceId, editor]);

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
          // alert('✓ 已加入素材库') // removed disruptive alert
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
    const text = editor.getText()
    if (!text.trim()) {
      alert('请先在编辑器中输入或合成内容后再进行审阅')
      return
    }
    
    setShowReview(true)
    setReviewing(true)
    setSuggestions([])
    try {
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

  
  useEffect(() => {
    const handleRequestDraft = (e: Event) => {
      const customEvent = e as CustomEvent;
      const { callback } = customEvent.detail;
      if (callback && typeof callback === 'function') {
        callback(editor?.getText() || '');
      }
    };
    window.addEventListener('gambit:request-draft-text', handleRequestDraft);
    return () => window.removeEventListener('gambit:request-draft-text', handleRequestDraft);
  }, [editor]);

  // Handle Open Review Mode Event
  useEffect(() => {
    const handleOpenReview = () => {
      runReview()
    }
    window.addEventListener('gambit:open-review-mode', handleOpenReview)
    return () => window.removeEventListener('gambit:open-review-mode', handleOpenReview)
  }, [runReview])

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
  async function runCompose() {
    if (!editor) return
    setComposing(true)
    setComposePreview('')
    track('report_click', { workspaceId })

    abortControllerRef.current = new AbortController()

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/final-draft/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instruction: composeInstruction,
          mode: composeMode,
          // If no specific blocks selected, send all block ids
          selectedBlockIds: selectedBlockIds.size > 0 ? Array.from(selectedBlockIds) : blocks.map(b => b.id)
        }),
        signal: abortControllerRef.current.signal
      })

      if (!res.ok) throw new Error('Generate failed')
      if (!res.body) throw new Error('No body')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''
      let buffer = ''

      if (composeMode === 'replace') {
        editor.commands.clearContent()
      }

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const dataStr = line.slice(6)
          if (!dataStr.trim()) continue
          try {
            const data = JSON.parse(dataStr)
            if (data.type === 'delta') {
              fullText += data.text
              if (composeMode === 'preview') {
                setComposePreview(fullText)
              } else {
                editor.commands.clearContent()
                editor.commands.insertContent(fullText.replace(/\n/g, '<br/>'))
              }
            } else if (data.type === 'done') {
              // Done
              if (composeMode !== 'preview') {
                // Save handled by backend, but we can clear selections
                setSelectedBlockIds(new Set())
                setComposeInstruction('')
                setDraftContent(fullText.replace(/\n/g, '<br/>'))
                setDraftMode('result')
              }
            }
          } catch (e) {
            console.error(e)
          }
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('Generation aborted')
      } else {
        alert('合成失败')
      }
    } finally {
      setComposing(false)
      abortControllerRef.current = null
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
        body: JSON.stringify({ context: text })
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
    const pos = text.indexOf(s.quote)
    if (pos >= 0) {
      // Find position in Tiptap is tricky, simple fallback:
      const html = editor.getHTML()
      if (html.includes(s.quote)) {
        editor.commands.setContent(html.replace(s.quote, s.content))
      } else {
        // try text replace and keep newlines
        editor.commands.setContent(text.replace(s.quote, s.content).replace(/\n/g, '<br/>'))
      }
    } else {
      editor.commands.insertContent(`<br/><br/><p><strong>[附加建议]</strong> ${s.content}</p>`)
      alert('原文未匹配，已附加到末尾')
    }
    setSuggestions(prev => prev.filter(x => x.id !== s.id))
  }

  function rejectSuggestion(s: Suggestion) {
    setSuggestions(prev => prev.map(x => x.id === s.id ? { ...x, rejected: true } : x))
  }

  const exportMarkdown = () => {
    if (!editor) return
    const text = editor.getText()
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || '未命名文稿'}.md`
    a.click()
  }

  const exportTxt = () => {
    if (!editor) return
    const text = editor.getText()
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || '未命名文稿'}.txt`
    a.click()
  }

  if (loading) return <div className="p-8 text-center text-inkLight"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* 顶栏: 标题与操作 */}
      <div className="p-3 bg-white border-b border-gray-200 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1">
          {draftMode === 'prepare' ? (
            <>
              <FileText className="w-4 h-4 text-ink" />
              <span className="text-sm font-bold text-ink whitespace-nowrap">最终稿</span>
              <div className="w-[1px] h-3 bg-gray-300 mx-1" />
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="无标题文稿"
                className="flex-1 text-sm font-medium outline-none bg-transparent placeholder-gray-400 min-w-0"
              />
            </>
          ) : (
            <>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="无标题文稿"
                className="flex-1 text-base font-bold text-ink outline-none bg-transparent placeholder-gray-400 min-w-0"
              />
              <button 
                onClick={() => setDraftMode('prepare')} 
                className="text-xs text-gray-500 hover:text-accent transition px-2 py-1 shrink-0"
              >
                返回素材
              </button>
            </>
          )}
        </div>
        <button
          onClick={() => setShowSpark(!showSpark)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition whitespace-nowrap shrink-0 ml-2 ${
            showSpark ? 'bg-purple-100 text-purple-700' : 'text-purple-600 hover:bg-purple-50'
          }`}
        >
          <Sparkles className="w-4 h-4 text-purple-500" />
          灵光一闪
        </button>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col">
        {/* 灵光一闪 (移动到顶部) */}
        {showSpark && (
          <div className="p-3 bg-white border-b border-gray-200 shadow-sm z-10 relative shrink-0">
            <button onClick={() => setShowSpark(false)} className="absolute top-3 right-3 text-inkLight hover:text-ink z-20">
              <X className="w-4 h-4" />
            </button>
            <button onClick={runSpark} disabled={sparking} className="w-full py-2 bg-purple-50 text-purple-600 rounded-lg text-sm font-medium hover:bg-purple-100 transition disabled:opacity-50 flex items-center justify-center gap-2 relative">
              {sparking ? <><Loader2 className="w-4 h-4 animate-spin" /> 启发中...</> : <><Sparkles className="w-4 h-4" /> 给我灵感</>}
            </button>

            {sparks.length > 0 && (
              <div className="mt-3 space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {sparks.map(s => {
                  const colorClass = 
                    s.type === '新角度' ? 'text-blue-700 bg-blue-100 border-blue-200' :
                    s.type === '反常识' ? 'text-orange-700 bg-orange-100 border-orange-200' :
                    s.type === '换个说法' ? 'text-purple-700 bg-purple-100 border-purple-200' : 
                    'text-gray-700 bg-gray-100 border-gray-200'

                  return (
                    <div key={s.id} className="p-3 border border-gray-100 bg-gray-50/50 rounded-lg text-sm relative group flex flex-col gap-1.5">
                      <div className="flex justify-between items-start">
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${colorClass}`}>
                          [{s.type}]
                        </span>
                        <button onClick={() => window.dispatchEvent(new CustomEvent('gambit:pin-to-draft', { detail: { sourceType: 'spark', sourceId: s.id, sourceLabel: '灵光一闪', content: `【${s.type}】\n${s.content}` } }))} className="text-gray-400 hover:text-accent transition opacity-0 group-hover:opacity-100" title="加入素材库">
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-xs text-ink/80 leading-relaxed">{s.content}</div>
                    </div>
                  )
                })}
              </div>
            )}          </div>
        )}
        {/* 素材库 */}
        {draftMode === 'prepare' && (
          <div className="border-b border-gray-200 bg-white shrink-0">
            <button onClick={() => setShowBlocks(!showBlocks)} className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition">
              <div className="flex items-center gap-2 font-medium text-sm text-ink">
                <LayoutGrid className="w-3.5 h-3.5" />
                素材库 <span className="text-xs text-inkLight bg-gray-100 px-1.5 rounded">{blocks.length}</span>
              </div>
              {showBlocks ? <ChevronDown className="w-4 h-4 text-inkLight" /> : <ChevronRight className="w-4 h-4 text-inkLight" />}
            </button>

            {showBlocks && (
              <div className="p-3 pt-0 space-y-2 max-h-[300px] overflow-y-auto">
                {blocks.length === 0 ? (
                  <div className="text-xs text-center text-gray-400 py-4">从左侧 AI 卡片或场景中收藏素材到这里</div>
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
        )}

      {/* 编辑器与生成控制台 */}
      <div className="flex-1 overflow-y-auto flex flex-col relative">
        <div className="flex-1 p-4 pb-32">
          {draftMode === 'prepare' && (
            <div className="flex items-end justify-between mb-2">
              <span className="text-[12px] text-gray-500 font-light">用于粘贴可用段落或句子</span>
            </div>
          )}
          {editor && (
            <div className="flex items-center gap-1 mb-2 border-b border-gray-100 pb-2">
              <button onClick={() => editor.chain().focus().toggleBold().run()} className={`p-1.5 rounded hover:bg-gray-200 text-ink ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}><strong className="font-serif px-1">B</strong></button>
              <button onClick={() => editor.chain().focus().toggleItalic().run()} className={`p-1.5 rounded hover:bg-gray-200 text-ink ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}><em className="font-serif px-1">I</em></button>
              <div className="w-px h-4 bg-gray-300 mx-1" />
              <button onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={`p-1.5 rounded hover:bg-gray-200 text-ink text-xs font-bold ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}>H2</button>
              <button onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className={`p-1.5 rounded hover:bg-gray-200 text-ink text-xs font-bold ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}`}>H3</button>
              <div className="w-px h-4 bg-gray-300 mx-1" />
              <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`p-1.5 rounded hover:bg-gray-200 text-ink text-xs ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}>• List</button>
            </div>
          )}
          <div className="min-h-[300px] border border-gray-100 rounded-lg p-2 bg-white">
            <EditorContent editor={editor} />
          </div>
        </div>

        {/* 审阅模式结果面板 (悬浮) */}
        {showReview && (
          <div className="absolute bottom-full left-0 w-full bg-white border-t border-b border-gray-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] z-20 max-h-[50vh] flex flex-col">
            <div className="p-3 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
              <span className="font-semibold text-sm text-ink flex items-center gap-1.5">
                <FileCheck className="w-4 h-4 text-blue-500" />
                {reviewing ? '多 AI 交叉审阅中...' : `审阅建议（${suggestions.filter(s => !s.rejected).length} 条）`}
              </span>
              <button onClick={() => setShowReview(false)} className="text-inkLight hover:text-ink"><X className="w-4 h-4" /></button>
            </div>
            
            {reviewing ? (
              <div className="p-6 flex flex-col items-center justify-center text-blue-500 gap-3">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-sm">正在深度分析正文...</span>
              </div>
            ) : suggestions.length === 0 ? (
              <div className="p-6 text-center text-sm text-inkLight">没有找到需要修改的建议</div>
            ) : (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
                {suggestions.every(s => s.rejected || false /* if we keep rejected ones in list */) && (
                  <div className="text-center text-xs text-inkLight py-2">全部处理完毕</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 合成区 */}
      {draftMode === 'prepare' && (
        <div className="bg-white border-t border-gray-200 p-4 shrink-0">
          <div className="mb-3">
            <input
              type="text"
              value={composeInstruction}
              onChange={e => setComposeInstruction(e.target.value)}
              placeholder="生成指令（可选）：如改成小红书风格 / 生成汇总表格"
              className="w-full text-sm p-2 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-accent transition"
            />
          </div>

          {composing ? (
            <button
              onClick={() => {
                if (window.confirm('确定停止生成吗？')) {
                  window.dispatchEvent(new CustomEvent('gambit:abort-compose'))
                }
              }}
              className="w-full py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-bold hover:bg-red-100 transition flex items-center justify-center gap-2 border border-red-100"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              停止生成
            </button>
          ) : (
            <button
              onClick={runCompose}
              disabled={blocks.length === 0}
              title={blocks.length === 0 ? "请先从 AI 卡片或场景中添加素材" : ""}
              className="w-full py-2.5 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent/90 transition disabled:opacity-50 disabled:hover:bg-accent flex items-center justify-center gap-2 shadow-sm"
            >
              <Wand2 className="w-4 h-4" />
              生成最终稿
            </button>
          )}

          {/* 纯生成预览 */}
          {composePreview && composeMode === 'preview' && !composing && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-xl relative group">
              <button onClick={() => setComposePreview('')} className="absolute top-2 right-2 text-inkLight hover:text-ink"><X className="w-3.5 h-3.5" /></button>
              <div className="prose prose-sm max-w-none text-ink/80 max-h-40 overflow-y-auto">{composePreview}</div>
              <div className="mt-2 pt-2 border-t border-gray-200 flex justify-end">
                <button onClick={() => {
                  if (editor) {
                    editor.commands.setContent(composePreview.replace(/\n/g, '<br/>'))
                    setComposePreview('')
                  }
                }} className="text-xs text-accent hover:text-accent/80 font-medium">复制到编辑器</button>
              </div>
            </div>
          )}
        </div>
      )}

      </div>

      {/* 底栏: 操作 */}
      <div className="p-3 border-t border-gray-200 bg-white shrink-0 flex items-center gap-2">
        <button onClick={() => { if(editor) { navigator.clipboard.writeText(editor.getText()); track('draft_copy', { workspaceId }); alert('已复制全文到剪贴板') } }} className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-lg text-sm text-ink hover:bg-gray-50 transition font-medium">
          <Copy className="w-4 h-4 text-ink" />
          复制全文
        </button>
        <div className="flex-1 relative group">
          <button className="w-full flex items-center justify-center gap-1.5 py-2 border border-gray-200 rounded-lg text-sm text-ink hover:bg-gray-50 transition font-medium">
            <Download className="w-4 h-4 text-ink" />
            导出
          </button>
          <div className="absolute bottom-full left-0 w-full mb-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
            <button onClick={exportTxt} className="w-full px-4 py-2.5 text-sm text-ink hover:bg-gray-50 text-center border-b border-gray-100">
              导出 TXT
            </button>
            <button onClick={exportMarkdown} className="w-full px-4 py-2.5 text-sm text-ink hover:bg-gray-50 text-center">
              导出 MD
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
