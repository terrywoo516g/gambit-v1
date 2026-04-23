'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, AtSign } from 'lucide-react'
import { MODEL_REGISTRY } from '@/lib/model-registry'

interface ChatInputProps {
  onSubmit: (message: string, selectedModel?: string) => void | Promise<void>
  processing?: boolean
  placeholder?: string
  disabled?: boolean
}

export default function ChatInput({ onSubmit, processing, placeholder, disabled }: ChatInputProps) {
  const [input, setInput] = useState('')
  const [showModelPicker, setShowModelPicker] = useState(false)
  const [modelFilter, setModelFilter] = useState('')
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setShowModelPicker(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setInput(val)
    const lastAt = val.lastIndexOf('@')
    if (lastAt >= 0 && lastAt === val.length - 1) { setShowModelPicker(true); setModelFilter('') }
    else if (lastAt >= 0 && showModelPicker) { setModelFilter(val.slice(lastAt + 1)) }
    else { setShowModelPicker(false) }
  }

  function pickModel(modelName: string) {
    setSelectedModel(modelName)
    const lastAt = input.lastIndexOf('@')
    setInput(lastAt >= 0 ? input.slice(0, lastAt).trimEnd() : input)
    setShowModelPicker(false)
    inputRef.current?.focus()
  }

  async function handleSubmit() {
    const msg = input.trim()
    if (!msg || processing) return
    await onSubmit(msg, selectedModel || undefined)
    setInput('')
    setSelectedModel(null)
  }

  const filteredModels = MODEL_REGISTRY.filter(m =>
    m.id.toLowerCase().includes(modelFilter.toLowerCase()) ||
    m.provider.toLowerCase().includes(modelFilter.toLowerCase())
  )

  return (
    <div className="relative">
      {showModelPicker && (
        <div ref={pickerRef} className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-y-auto z-20">
          <div className="px-3 py-2 border-b border-gray-100 text-xs text-inkLight">选择模型</div>
          {filteredModels.map(m => (
            <button key={m.id} onClick={() => pickModel(m.id)} className="w-full text-left px-3 py-2 hover:bg-gray-50 transition text-sm flex items-center justify-between">
              <span className="text-ink">{m.id}</span>
              <span className="text-xs text-inkLight">{m.provider}</span>
            </button>
          ))}
          {filteredModels.length === 0 && <div className="px-3 py-4 text-center text-xs text-inkLight">无匹配模型</div>}
        </div>
      )}
      <div className="flex items-center gap-2">
        {selectedModel && (
          <span className="flex items-center gap-1 bg-accent/10 text-accent px-2 py-1 rounded-lg text-xs font-medium shrink-0">
            <AtSign className="w-3 h-3" />{selectedModel}
            <button onClick={() => setSelectedModel(null)} className="hover:text-red-500 ml-0.5">&times;</button>
          </span>
        )}
        <div className="flex-1 relative">
          <input ref={inputRef} type="text" value={input} onChange={handleInputChange}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
            placeholder={placeholder || '输入指令，@ 选择模型...'}
            className="w-full px-4 py-2.5 text-sm border border-gray-200 rounded-xl outline-none focus:border-accent transition bg-gray-50"
            disabled={disabled || processing} />
          {!selectedModel && (
            <button onClick={() => { setShowModelPicker(true); setModelFilter('') }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-inkLight hover:text-accent transition" title="选择模型">
              <AtSign className="w-4 h-4" />
            </button>
          )}
        </div>
        <button onClick={handleSubmit} disabled={processing || !input.trim()}
          className="w-9 h-9 rounded-full bg-accent text-white flex items-center justify-center disabled:opacity-30 hover:bg-accent/85 transition shrink-0">
          {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}