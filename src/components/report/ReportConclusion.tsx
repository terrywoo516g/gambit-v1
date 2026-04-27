import React from 'react'
import { Reflection } from '@/lib/reflection/types'
import { ReportConfig } from '@/lib/report/types'

export default function ReportConclusion({ workspace, reflection, modelLetters = [], reportConfig }: { workspace: any, reflection: Reflection, modelLetters?: string[], reportConfig?: ReportConfig }) {
  const dimensions = reflection?.dimensions || {}
  const consensus = dimensions.consensus || []
  const divergence = dimensions.divergence || []
  const minority = dimensions.minority || []
  const pending = dimensions.pending || []

  // Extract top 3 sentences from summary, or fallback to consensus points
  let topPoints: string[] = []
  if (reflection?.summary) {
    topPoints = reflection.summary.split(/(?<=[。！？\n])/)
      .map(s => s.trim())
      .filter(s => s.length > 0)
      .slice(0, 3)
  }
  
  if (topPoints.length < 3 && consensus.length > 0) {
    const needed = 3 - topPoints.length
    topPoints = [...topPoints, ...consensus.slice(0, needed).map(c => c.text)]
  }

  const title = reportConfig?.title || workspace?.prompt || '未知工作区'

  return (
    <section className="report-section p-8 md:p-16 lg:p-24 bg-paper text-ink flex flex-col justify-between">
      {/* Header */}
      <header className="mb-16">
        <h2 className="text-accent font-mono tracking-widest text-sm mb-4 uppercase">核心问题</h2>
        <h1 className="text-3xl md:text-4xl font-bold leading-tight text-ink">
          {title}
        </h1>
      </header>

      {/* Middle Section: Conclusions */}
      <div className="flex-1 mb-16">
        <h3 className="text-inkLight font-mono tracking-widest text-sm mb-8 uppercase border-b border-gray-200 pb-4">核心结论</h3>
        
        <div className="space-y-6">
          {topPoints.length > 0 ? topPoints.map((text: string, idx: number) => {
            const preview = text.length > 80 ? text.substring(0, 80) + '...' : text
            return (
              <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-white border border-gray-200 shadow-sm">
                <span className="text-accent font-mono text-xl font-bold">{(idx + 1).toString().padStart(2, '0')}</span>
                <div className="flex-1">
                  <p className="text-gray-700 text-sm leading-relaxed line-clamp-2 mt-1">
                    {preview}
                  </p>
                </div>
                <div className="flex gap-1 self-center">
                  {modelLetters.map((m, i) => (
                    <div key={i} className="w-5 h-5 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[8px] text-gray-600 font-mono">{m}</div>
                  ))}
                </div>
              </div>
            )
          }) : <p className="text-inkLight italic">—</p>}
        </div>
      </div>

      {/* Lower Section: Three Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {[
          { label: '最大共识', text: consensus[0]?.text },
          { label: '最大分歧', text: divergence[0]?.text },
          { label: '最大风险', text: pending[0]?.text || minority[0]?.text }
        ].map((item, idx) => {
          const text = item.text ?? ''
          const preview = text.length > 80 ? text.substring(0, 80) + '...' : text
          return (
            <div key={idx} className="p-6 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col">
              <h4 className="text-accent font-mono tracking-widest text-xs mb-4 uppercase">{item.label}</h4>
              {text ? (
                <p className="text-gray-700 text-sm leading-relaxed line-clamp-4 flex-1">
                  {preview}
                </p>
              ) : (
                <p className="text-gray-400 text-2xl font-light">—</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer Section: Recommendation */}
      <footer className="pt-8 border-t border-gray-200">
        <h4 className="text-inkLight font-mono tracking-widest text-sm mb-4 uppercase">推荐行动</h4>
        <div className="text-gray-700 text-sm leading-7 bg-gray-50 p-6 rounded-xl border border-gray-200">
          {reflection?.draft ? (
            <p className="whitespace-pre-wrap">
              {reflection.draft}
            </p>
          ) : (
            <p className="text-gray-400 text-2xl font-light">—</p>
          )}
        </div>
      </footer>
    </section>
  )
}
