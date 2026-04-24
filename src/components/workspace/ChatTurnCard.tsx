import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Copy, Pin } from 'lucide-react'

type ChatTurnCardProps = {
  content: string
  modelName?: string
  status: 'streaming' | 'completed' | 'error'
  isReferenced: boolean
  onToggleRef: () => void
  onCopy: () => void
  onPin: () => void
}

export default function ChatTurnCard({
  content,
  modelName = 'DeepSeek V3.2',
  status,
  isReferenced,
  onToggleRef,
  onCopy,
  onPin,
}: ChatTurnCardProps) {
  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col transition" style={{ minHeight: '180px', maxHeight: '320px' }}>
      {/* 顶栏 */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${status === 'streaming' ? 'bg-blue-400 animate-pulse' : status === 'error' ? 'bg-red-400' : 'bg-green-400'}`} />
          <span className="font-medium text-sm text-ink">{modelName}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          status === 'completed' ? 'bg-green-50 text-green-600' :
          status === 'streaming' ? 'bg-blue-50 text-blue-600' :
          'bg-red-50 text-red-600'
        }`}>
          {status === 'completed' ? `已完成 · ${content.length} 字` :
           status === 'streaming' ? '生成中...' : '生成失败'}
        </span>
      </div>
      
      {/* 正文内容，内部滚动 */}
      <div className="px-4 py-3 flex-1 overflow-y-auto text-sm">
        {status === 'streaming' && !content ? (
          <div className="space-y-2">
            <div className="h-3 w-48 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-36 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-52 animate-pulse rounded bg-gray-100" />
          </div>
        ) : (
          <div className={`prose prose-sm max-w-none ${status === 'streaming' ? 'streaming-cursor' : ''}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
              p: ({children}) => <p className="my-1 leading-relaxed">{children}</p>,
              h1: ({children}) => <h1 className="text-lg font-bold my-2">{children}</h1>,
              h2: ({children}) => <h2 className="text-base font-bold my-2">{children}</h2>,
              h3: ({children}) => <h3 className="text-sm font-semibold my-1">{children}</h3>,
              ul: ({children}) => <ul className="list-disc pl-4 my-1">{children}</ul>,
              ol: ({children}) => <ol className="list-decimal pl-4 my-1">{children}</ol>,
              li: ({children}) => <li className="leading-relaxed">{children}</li>,
              strong: ({children}) => <strong className="font-semibold">{children}</strong>,
              code: ({children}) => <code className="bg-gray-100 px-1 rounded text-xs font-mono">{children}</code>,
            }}>{content}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* 底栏 */}
      {status === 'completed' && content && (
        <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={onToggleRef}
              className={`text-xs transition flex items-center gap-1 ${
                isReferenced
                  ? 'text-accent font-medium'
                  : 'text-inkLight hover:text-accent'
              }`}
            >
              {isReferenced ? '✓ 已引用' : '@ 引用'}
            </button>
            <button onClick={onCopy}
              className="text-xs text-inkLight hover:text-accent transition flex items-center gap-1">
              <Copy className="w-3 h-3" /> 复制
            </button>
            <button onClick={onPin}
              className="text-xs text-inkLight hover:text-accent transition flex items-center gap-1">
              <Pin className="w-3 h-3" /> 加入最终稿
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
