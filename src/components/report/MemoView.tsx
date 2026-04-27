import React from 'react'
import { Reflection } from '@/lib/reflection/types'
import { ReportConfig } from '@/lib/report/types'

interface MemoViewProps {
  workspace: any
  reflection: Reflection | null
  reportConfig: ReportConfig
}

export default function MemoView({ workspace, reflection, reportConfig }: MemoViewProps) {
  const title = reportConfig.title || workspace.prompt || '未知工作区'
  
  const dateStr = workspace.reflectionAt 
    ? new Date(workspace.reflectionAt).toLocaleDateString('zh-CN') 
    : ''
    
  const modelList = Array.isArray(workspace.selectedModels)
    ? workspace.selectedModels.join(' / ')
    : typeof workspace.selectedModels === 'string'
      ? (() => { try { return JSON.parse(workspace.selectedModels).join(' / ') } catch { return workspace.selectedModels } })()
      : '多模型'

  // 一句话结论 (First sentence of summary)
  let oneLineConclusion = ''
  if (reflection?.summary) {
    const sentences = reflection.summary.split(/(?<=[。！？\n])/)
    oneLineConclusion = sentences[0]?.trim() || ''
  }

  // 建议行动 (Last non-empty paragraph of draft)
  let actionSuggestion = ''
  if (reflection?.draft) {
    const paragraphs = reflection.draft.split('\n\n').map(p => p.trim()).filter(p => p.length > 0)
    if (paragraphs.length > 0) {
      actionSuggestion = paragraphs[paragraphs.length - 1]
    }
  }

  // 问题背景 (First 200 chars)
  const background = workspace.prompt 
    ? workspace.prompt.length > 200 
      ? workspace.prompt.slice(0, 200) + '...' 
      : workspace.prompt
    : ''

  const dimensions = reflection?.dimensions || ({} as any)
  const dimsToRender = [
    { key: 'consensus', label: '核心判断', data: dimensions.consensus },
    { key: 'divergence', label: '主要分歧', data: dimensions.divergence },
    { key: 'pending', label: '待验证事项', data: dimensions.pending }
  ].filter(d => reportConfig.selectedDimensions.includes(d.key as any) && Array.isArray(d.data) && d.data.length > 0)

  return (
    <div className="memo-section bg-paper text-ink p-12 max-w-[800px] mx-auto min-h-full font-sans">
      
      {/* 1. 标题区 */}
      <section className="mb-8 border-b border-gray-200 pb-6">
        <h1 className="text-2xl font-bold mb-3 text-ink leading-snug">{title}</h1>
        <p className="text-xs text-inkLight font-mono">
          {dateStr} · {modelList}
        </p>
      </section>

      {/* 2. 一句话结论 */}
      {oneLineConclusion && (
        <section className="mb-8">
          <div className="bg-accent/5 border-l-4 border-accent p-4 rounded-r text-sm text-ink leading-relaxed">
            <strong className="font-semibold mr-2">执行摘要:</strong>
            {oneLineConclusion}
          </div>
        </section>
      )}

      {/* 3. 问题背景 */}
      {background && (
        <section className="mb-8">
          <h2 className="text-base font-semibold mb-2 text-ink">问题背景</h2>
          <p className="text-sm text-gray-700 leading-relaxed">{background}</p>
        </section>
      )}

      {/* 4/5/6. 维度部分 (核心判断/主要分歧/待验证) */}
      {dimsToRender.map((dim, idx) => (
        <section key={idx} className="mb-8">
          <h2 className="text-base font-semibold mb-3 text-ink flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
            {dim.label}
          </h2>
          <ul className="list-disc list-inside text-sm text-gray-700 leading-relaxed space-y-2 ml-1">
            {(dim.data as any[]).slice(0, 3).map((item, i) => (
              <li key={i} className="pl-1">
                <span className="font-medium text-ink">{item.text}</span>
                {item.support && Array.isArray(item.support) && item.support.length > 0 && (
                  <span className="text-xs text-inkLight ml-2">[{item.support.join(', ')}]</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* 7. 建议行动 */}
      {actionSuggestion && (
        <section className="mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
          <h2 className="text-base font-semibold mb-3 text-ink">建议行动</h2>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{actionSuggestion}</p>
        </section>
      )}

      {/* 8. 末尾元信息 */}
      <footer className="mt-12 pt-4 border-t border-gray-200 text-right">
        <p className="text-[10px] text-inkLight font-mono">
          ID: {workspace.id.split('-')[0]} · {new Date().toLocaleString('zh-CN')}
        </p>
      </footer>
    </div>
  )
}