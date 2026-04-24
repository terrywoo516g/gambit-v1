const fs = require('fs')
let code = fs.readFileSync('src/app/workspace/[id]/page.tsx', 'utf8')

// 1. Clean summary cache stuff
code = code.replace(/const SHOW_SUMMARY = true\n\n/g, '')
code = code.replace(/  \/\/ 全局总结卡状态\n  const \[summaryData, setSummaryData\] = useState<.*?\| null>\(null\)\n  const \[summaryLoading, setSummaryLoading\] = useState\(false\)\n\n/g, '')
code = code.replace(/  \/\/ Monitor modelRuns completion for Summary Card[\s\S]*?fetchSummary\(\)\n    \}\n  \}, \[.*?\]\)\n\n/g, '')
code = code.replace(/        if \(wsData\.workspace\.summaryCache\) \{\n          try \{\n            setSummaryData\(JSON\.parse\(wsData\.workspace\.summaryCache\)\)\n          \} catch \{\}\n        \}\n/g, '')
code = code.replace(/            \{\/\* 全局总结卡 \*\/\}\n            \{SHOW_SUMMARY && \(summaryLoading \|\| summaryData\) && \([\s\S]*?\) : null\}\n              <\/div>\n            \)\}\n\n/g, '')

// 2. Insert AICard Component
const aiCardCode = `
function AICard({ run, status, content, activeRunId, referencedRunIds, retryRun, toggleRef }: any) {
  let summary = ''
  let body = ''
  let sec = 'pending'
  
  if (content) {
    const lines = content.split('\\n')
    for (const line of lines) {
      if (line.trim() === '[摘要]') {
        sec = 'summary'
        continue
      }
      if (line.trim() === '[正文]') {
        sec = 'body'
        continue
      }
      if (sec === 'summary') summary += line + '\\n'
      else if (sec === 'body') body += line + '\\n'
      else if (line.trim()) summary += line + '\\n'
    }
  }

  summary = summary.trim()
  body = body.trim()
  const totalLength = summary.length + body.length

  const [expanded, setExpanded] = useState(false)
  
  useEffect(() => {
    if (sec === 'body' && (status === 'streaming' || status === 'running')) {
      setExpanded(true)
    }
  }, [sec, status])

  return (
    <div id={'run-' + run.id}
      className={\`bg-white border rounded-2xl flex flex-col shadow-sm transition \${
        activeRunId === run.id ? 'border-accent ring-1 ring-accent/20' : 'border-gray-200'
      }\`} style={{ minHeight: '180px' }}>
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className={\`w-2 h-2 rounded-full \${MODEL_STATUS_COLORS[status] || 'bg-gray-300'}\`} />
          <span className="font-medium text-sm text-ink">{run.model}</span>
        </div>
        <span className={\`text-xs px-2 py-0.5 rounded-full \${
          status === 'done' || status === 'completed' ? 'bg-green-50 text-green-600' :
          status === 'error' || status === 'failed' ? 'bg-red-50 text-red-600' :
          status === 'retrying' ? 'bg-yellow-50 text-yellow-600' :
          status === 'streaming' || status === 'running' ? 'bg-blue-50 text-blue-600' :
          'bg-gray-50 text-gray-400'
        }\`}>
          {status === 'done' || status === 'completed' ? '已完成' :
          status === 'error' || status === 'failed' ? '失败' :
          status === 'retrying' ? '重试中...' :
          status === 'streaming' || status === 'running' ? '生成中...' : '等待中'}
        </span>
      </div>

      <div className="px-4 py-3 flex-1 text-sm flex flex-col">
        {!content && (status === 'queued' || status === 'streaming' || status === 'running') && (
          <div className="space-y-2">
            <div className="h-3 w-48 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-36 animate-pulse rounded bg-gray-100" />
            <div className="h-3 w-52 animate-pulse rounded bg-gray-100" />
          </div>
        )}
        {status === 'retrying' && !content && (
          <div className="flex items-center gap-2 text-yellow-600 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>请求超时，正在自动重试...</span>
          </div>
        )}
        
        {content && (
          <>
            <div className={\`text-gray-500 \${sec === 'summary' && (status === 'streaming' || status === 'running') ? 'streaming-cursor' : ''}\`}>
              {summary || (sec === 'summary' && <span className="animate-pulse">...</span>)}
            </div>

            {expanded && (
              <div className={\`mt-2 pt-2 border-t border-gray-100 overflow-y-auto \${sec === 'body' && (status === 'streaming' || status === 'running') ? 'streaming-cursor' : ''}\`} style={{ maxHeight: '280px' }}>
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
                }}>{body}</ReactMarkdown>
              </div>
            )}

            {body && (
              <button onClick={() => setExpanded(!expanded)} className="mt-3 w-full py-1.5 text-xs text-inkLight hover:text-ink bg-gray-50 hover:bg-gray-100 rounded-lg transition flex items-center justify-center">
                {expanded ? '收起 ↑' : '展开全文 ↓'}
              </button>
            )}
          </>
        )}

        {(status === 'error' || status === 'failed') && !content && (
          <div className="text-center py-4">
            <div className="text-red-500 text-sm mb-3">生成失败</div>
            <button
              onClick={() => retryRun(run.id)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
              重新生成
            </button>
          </div>
        )}
      </div>

      {(status === 'done' || status === 'completed') && content && (
        <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between shrink-0">
          <span className="text-xs text-inkLight">{totalLength} 字</span>
          <div className="flex items-center gap-3">
          <button
            onClick={() => toggleRef(run.id)}
            className={\`text-xs transition flex items-center gap-1 \${
              referencedRunIds.includes(run.id)
                ? 'text-accent font-medium'
                : 'text-inkLight hover:text-accent'
            }\`}
          >
            {referencedRunIds.includes(run.id) ? '✓ 已引用' : '@ 引用'}
          </button>
          <button onClick={() => navigator.clipboard.writeText(body || summary)}
            className="text-xs text-inkLight hover:text-accent transition flex items-center gap-1">
            <Copy className="w-3 h-3" /> 复制
          </button>
          <button onClick={() => window.dispatchEvent(new CustomEvent('gambit:pin-to-draft', { detail: { sourceType: 'card', sourceId: run.id, sourceLabel: run.model, content: body || summary } }))}
            className="text-xs text-inkLight hover:text-accent transition flex items-center gap-1">
            <Pin className="w-3 h-3" /> 加入最终稿
          </button>
        </div>
        </div>
      )}
    </div>
  )
}
`
code = code.replace(/export default function WorkspacePage/, aiCardCode + '\nexport default function WorkspacePage')

// 3. Replace Expanded Card Rendering Block (carefully targeting only the inner div)
const expandedCardPattern = /<div className="bg-white border border-gray-200 rounded-2xl flex flex-col shadow-sm" style=\{\{ minHeight: '180px', maxHeight: '320px' \}\}>[\s\S]*?加入最终稿\s*<\/button>\s*<\/div>\s*<\/div>\s*\)\}\s*<\/div>/g
code = code.replace(expandedCardPattern, '<AICard run={run} status={status} content={content} activeRunId={activeRunId} referencedRunIds={referencedRunIds} retryRun={retryRun} toggleRef={toggleRef} />')

// 4. Replace Grid Card Rendering Block
const gridCardPattern = /<div key=\{run\.id\} id=\{'run-' \+ run\.id\}[\s\S]*?className=\{\`bg-white border rounded-2xl flex flex-col shadow-sm transition \$\{[\s\S]*?activeRunId === run\.id \? 'border-accent ring-1 ring-accent\/20' : 'border-gray-200'[\s\S]*?\}\`\} style=\{\{ minHeight: '180px', maxHeight: '320px' \}\}>[\s\S]*?加入最终稿\s*<\/button>\s*<\/div>\s*<\/div>\s*\)\}\s*<\/div>/g
code = code.replace(gridCardPattern, '<AICard key={run.id} run={run} status={status} content={content} activeRunId={activeRunId} referencedRunIds={referencedRunIds} retryRun={retryRun} toggleRef={toggleRef} />')

fs.writeFileSync('src/app/workspace/[id]/page.tsx', code)
