'use client'

import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FileCheck, Upload, Loader2 } from 'lucide-react'

type Suggestion = {
  id: string
  type: string
  severity: string
  quote: string
  content: string
  sources: string[]
  status?: 'accepted' | 'ignored'
}

interface ReviewSceneProps {
  workspaceId: string
  onDraftGenerated?: (content: string) => void
  referencedRunIds?: string[]
}

export default function ReviewScene({ workspaceId }: ReviewSceneProps) {  
  const [rightNode, setRightNode] = useState<HTMLElement | null>(null)    
  useEffect(() => {
    setRightNode(document.getElementById('right-panel-container'))        
  }, [])
  const [text, setText] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])        
  const [hasReviewed, setHasReviewed] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleImportFromDraft() {
    window.dispatchEvent(new CustomEvent('gambit:request-draft-text', {   
      detail: {
        callback: (content: string) => {
          if (content) {
            setText(content)
          } else {
            alert('最终稿暂无内容')
          }
        }
      }
    }))
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {     
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setText(ev.target.result as string)
      }
    }
    reader.readAsText(file)
  }

  async function startReview() {
    if (!text.trim()) {
      alert('请先输入待审阅的内容')
      return
    }
    setReviewing(true)
    setHasReviewed(true)
    setSuggestions([])
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/final-draft/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, workspaceId })
      })

      if (res.status === 402) {
        window.location.href = '/recharge'
        return
      }

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const sorted = (data.suggestions || []).sort((a: any, b: any) => {  
        const order: Record<string, number> = { '高': 1, '重要': 1, '中': 2, '低': 3 }
        return (order[a.severity] || 99) - (order[b.severity] || 99)      
      })
      setSuggestions(sorted)
    } catch {
      alert('审阅失败，请重试')
    } finally {
      setReviewing(false)
    }
  }

  function setStatus(id: string, status: 'accepted' | 'ignored') {        
    setSuggestions(prev => prev.map(s => s.id === id ? { ...s, status } : s))
  }

  function applyToDraft() {
    const accepted = suggestions.filter(s => s.status === 'accepted')     
    if (accepted.length === 0) {
      alert('请先采纳至少一条建议')
      return
    }

    const promptText = `你是一个专业的文字编辑。用户的原始文档内容如下：  

${text}

用户接受了以下修改意见：

${accepted.map((s, i) => `${i + 1}. [${s.type}/${s.severity}] ${s.content}${s.quote ? ` (原文：\"${s.quote}\")` : ''}`).join('\n')}

请根据这些修改意见，生成修改后的完整版本。要求：
1. 将所有接受的修改意见应用到原文中
2. 保持原文的整体结构和风格
3. 在修改处用 **加粗** 标记改动的内容
4. 文末附一个简短的修改说明，列出改了什么
5. 直接输出修改后的全文（包含说明），不要其他废话。

用 Markdown 格式输出。`

    window.dispatchEvent(new CustomEvent('gambit:stream-to-draft', { detail: { promptText } }))
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <h3 className="text-sm font-semibold text-ink flex items-center gap-2"><FileCheck className="w-4 h-4 text-accent" />多AI审稿</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex gap-4 w-full">      
        <div className="w-full flex flex-col gap-3 max-w-3xl mx-auto">    
          <div className="bg-white border border-gray-200 rounded-xl flex flex-col shadow-sm flex-1">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 rounded-t-xl flex justify-between items-center">
              <span className="font-semibold text-sm text-ink">待审阅内容</span>
              <div className="flex items-center gap-2">
                <input type="file" accept=".txt,.md" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <button onClick={() => fileInputRef.current?.click()} className="text-xs text-inkLight hover:text-accent flex items-center gap-1"><Upload className="w-3 h-3" />上传文件</button>
                <button onClick={handleImportFromDraft} className="text-xs text-inkLight hover:text-accent flex items-center gap-1"><FileCheck className="w-3 h-3" />从最终稿导入</button>
              </div>
            </div>
            <div className="flex-1 p-4">
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="在此粘贴需要审阅的文章/文案..."
                className="w-full h-full min-h-[200px] text-sm text-ink outline-none resize-none"
              />
            </div>
          </div>
          <button
            onClick={startReview}
            disabled={reviewing || !text.trim()}
            className="w-full py-3 bg-blue-500 text-white rounded-xl text-sm font-bold hover:bg-blue-600 transition disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {reviewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck className="w-4 h-4" />}
            {reviewing ? '多 AI 深度审阅中...' : '开始多AI审阅'}
          </button>
        </div>

        {rightNode && createPortal(
          <div className="absolute inset-0 z-50 w-full flex flex-col h-full bg-white">
            {hasReviewed ? (
              <div className="flex flex-col h-full overflow-hidden">      
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center shrink-0">
                  <span className="font-semibold text-sm text-ink">审阅意见（{suggestions.length}条）</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">    
                  {reviewing ? (
                    <div className="flex flex-col items-center justify-center h-full text-blue-500 gap-3">
                      <Loader2 className="w-6 h-6 animate-spin" />        
                      <span className="text-sm">正在等待 AI 返回建议...</span>
                    </div>
                  ) : suggestions.length === 0 ? (
                    <div className="text-center text-sm text-inkLight mt-10">AI 没有提出任何修改建议，文章很完美！</div>
                  ) : (
                    suggestions.map(s => {
                      const isHigh = s.severity === '高' || s.severity === '重要'
                      const isAccepted = s.status === 'accepted'
                      const isIgnored = s.status === 'ignored'

                      return (
                        <div key={s.id} className={`p-4 border rounded-xl text-sm transition ${isAccepted ? 'bg-green-50 border-green-200' : isIgnored ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200 shadow-sm'}`}>
                          <div className="flex items-center gap-2 mb-2">  
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isHigh ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                              [{s.severity}] {s.type}
                            </span>
                            <span className="ml-auto text-[10px] text-inkLight">来自：{s.sources?.join(' / ')}</span>
                          </div>
                          {s.quote && (
                            <div className={`text-xs bg-gray-50 p-2 rounded text-inkLight mb-2 border-l-2 border-gray-300 ${isIgnored ? 'line-through' : ''}`}>
                              &quot;{s.quote}&quot;
                            </div>
                          )}
                          <div className={`text-sm text-ink/90 leading-relaxed mb-3 ${isIgnored ? 'line-through' : ''}`}>
                            <span className="font-semibold text-ink">建议：</span>{s.content}
                          </div>
                          <div className="flex items-center gap-2">       
                            <button onClick={() => setStatus(s.id, 'accepted')} className={`flex-1 py-1.5 text-xs rounded transition font-medium ${isAccepted ? 'bg-green-500 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>
                              {isAccepted ? '✓ 已采纳' : '采纳'}
                            </button>
                            <button onClick={() => setStatus(s.id, 'ignored')} className={`flex-1 py-1.5 text-xs rounded transition ${isIgnored ? 'bg-gray-300 text-white' : 'bg-gray-100 text-inkLight hover:bg-gray-200'}`}>
                              忽略
                            </button>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
                <div className="p-4 border-t border-gray-100 bg-white shrink-0">
                  <button
                    onClick={applyToDraft}
                    disabled={reviewing || suggestions.filter(s => s.status === 'accepted').length === 0}
                    className="w-full py-2.5 bg-accent text-white rounded-xl text-sm font-bold hover:bg-accent/90 transition disabled:opacity-50"   
                  >
                    将采纳项加入最终稿
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col h-full items-center justify-center text-inkLight text-sm p-8 text-center">
                <FileCheck className="w-10 h-10 mb-3 text-gray-300" />    
                输入待审阅内容并点击「开始多AI审阅」<br/>AI的修改建议将显示在这里
              </div>
            )}
          </div>,
          rightNode
        )}
      </div>
    </div>
  )
}