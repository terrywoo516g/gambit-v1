import React from 'react'
import { Reflection } from '@/lib/reflection/types'
import { ReportConfig } from '@/lib/report/types'

interface CustomViewProps {
  workspace: any
  reflection: Reflection | null
  reportConfig: ReportConfig
}

export default function CustomView({ workspace, reflection, reportConfig }: CustomViewProps) {
  // Helpers
  const dateStr = workspace.reflectionAt 
    ? new Date(workspace.reflectionAt).toLocaleDateString('zh-CN') 
    : ''
  const modelList = Array.isArray(workspace.selectedModels)
    ? workspace.selectedModels.join(' / ')
    : typeof workspace.selectedModels === 'string'
      ? (() => { try { return JSON.parse(workspace.selectedModels).join(' / ') } catch { return workspace.selectedModels } })()
      : '多模型'
      
  const dimensions = reflection?.dimensions || ({} as any)

  // Default value mappers
  const getDefaultConclusion = () => {
    if (reflection?.draft) {
      const paragraphs = reflection.draft.split('\n\n').map(p => p.trim()).filter(p => p.length > 0)
      if (paragraphs.length > 0) return paragraphs[paragraphs.length - 1]
    }
    return ''
  }

  const getDefaultActions = () => {
    if (reflection?.draft) {
      const paragraphs = reflection.draft.split('\n\n').map(p => p.trim()).filter(p => p.length > 0)
      if (paragraphs.length > 0) return paragraphs[paragraphs.length - 1]
    }
    return ''
  }

  // Renderers
  const renderTitle = () => {
    const text = reportConfig.contentEdits.title ?? reportConfig.title ?? workspace.prompt ?? '未知工作区'
    return (
      <section className="mb-8 border-b border-gray-200 pb-6" key="cover">
        <h1 className="text-2xl font-bold mb-3 text-ink leading-snug">{text}</h1>
        <p className="text-xs text-inkLight font-mono">GAMBIT CUSTOM REPORT</p>
      </section>
    )
  }

  const renderQuestion = () => {
    const text = reportConfig.contentEdits.question ?? workspace.prompt ?? ''
    if (!text) return null
    return (
      <section className="mb-8" key="question">
        <h2 className="text-lg font-semibold mb-2 text-ink">原始问题</h2>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{text}</p>
      </section>
    )
  }

  const renderJudgment = () => {
    const text = reportConfig.contentEdits.judgment ?? reflection?.summary ?? ''
    if (!text) return null
    return (
      <section className="mb-8" key="summary">
        <h2 className="text-lg font-semibold mb-2 text-ink">综合判断</h2>
        <div className="bg-accent/5 border-l-4 border-accent p-4 rounded-r text-sm text-ink leading-relaxed whitespace-pre-wrap">
          {text}
        </div>
      </section>
    )
  }

  const renderDimensions = () => {
    const dimsToRender = [
      { key: 'consensus', label: '核心共识', data: dimensions.consensus },
      { key: 'divergence', label: '主要分歧', data: dimensions.divergence },
      { key: 'minority', label: '少数派观点', data: dimensions.minority },
      { key: 'pending', label: '待验证事项', data: dimensions.pending }
    ].filter(d => reportConfig.selectedDimensions.includes(d.key as any) && Array.isArray(d.data) && d.data.length > 0)

    if (dimsToRender.length === 0) return null

    return (
      <section className="mb-8" key="dimensions">
        <h2 className="text-lg font-semibold mb-4 text-ink">四维分析</h2>
        <div className="space-y-6">
          {dimsToRender.map((dim, idx) => (
            <div key={idx} className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
              <h3 className="text-base font-semibold mb-3 text-ink flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                {dim.label}
              </h3>
              <ul className="list-disc list-inside text-sm text-gray-700 leading-relaxed space-y-2 ml-1">
                {(dim.data as any[]).map((item, i) => (
                  <li key={i} className="pl-1">
                    <span className="font-medium text-ink">{item.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    )
  }

  const renderDraft = () => {
    const text = reportConfig.contentEdits.draft ?? reflection?.draft ?? ''
    if (!text) return null
    return (
      <section className="mb-8" key="draft">
        <h2 className="text-lg font-semibold mb-2 text-ink">综合文稿</h2>
        <div className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-6 rounded-lg border border-gray-200 whitespace-pre-wrap">
          {text}
        </div>
      </section>
    )
  }

  const renderConclusion = () => {
    const text = reportConfig.contentEdits.conclusion ?? getDefaultConclusion()
    if (!text) return null
    return (
      <section className="mb-8" key="conclusion">
        <h2 className="text-lg font-semibold mb-2 text-ink">核心结论</h2>
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{text}</p>
      </section>
    )
  }

  const renderActions = () => {
    const text = reportConfig.contentEdits.actions ?? getDefaultActions()
    if (!text) return null
    return (
      <section className="mb-8" key="actions">
        <h2 className="text-lg font-semibold mb-2 text-ink">推荐行动</h2>
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{text}</p>
        </div>
      </section>
    )
  }

  const renderMetadata = () => {
    return (
      <footer className="mt-12 pt-4 border-t border-gray-200 text-right" key="metadata">
        <p className="text-[10px] text-inkLight font-mono">
          ID: {workspace.id.split('-')[0]} · {dateStr} · {modelList}
        </p>
      </footer>
    )
  }

  const renderers: Record<string, () => React.ReactNode> = {
    cover: renderTitle,
    question: renderQuestion,
    summary: renderJudgment,
    dimensions: renderDimensions,
    draft: renderDraft,
    conclusion: renderConclusion,
    actions: renderActions,
    metadata: renderMetadata
  }

  return (
    <div className="custom-section bg-paper text-ink p-12 max-w-[800px] mx-auto min-h-full font-sans shadow-xl rounded-xl my-8 border border-gray-200">
      {reportConfig.sectionOrder.map(secKey => {
        if (!reportConfig.enabledSections.includes(secKey as any)) return null
        const renderFn = renderers[secKey]
        return renderFn ? renderFn() : null
      })}
    </div>
  )
}