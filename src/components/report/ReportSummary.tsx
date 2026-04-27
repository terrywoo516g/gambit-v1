import React from 'react'
import { Reflection } from '@/lib/reflection/types'
import { ReportConfig } from '@/lib/report/types'

const DIMENSION_LABELS = [
  { key: 'consensus',  label: '核心共识', desc: '三模型一致认同的观点' },
  { key: 'divergence', label: '关键分歧', desc: '模型间存在显著分歧的观点' },
  { key: 'minority',   label: '少数派观点', desc: '仅个别模型提出的独立判断' },
  { key: 'pending',    label: '待观察', desc: '需更多信息才能判断的议题' },
] as const

export default function ReportSummary({ reflection, modelLetters = [], reportConfig }: { reflection: Reflection, modelLetters?: string[], reportConfig?: ReportConfig }) {
  const dimensions = reflection?.dimensions || {}
  
  // Apply dimension filtering if config is present
  const allowedDimensions = reportConfig?.selectedDimensions || ['consensus', 'divergence', 'minority', 'pending']
  const filteredLabels = DIMENSION_LABELS.filter(config => allowedDimensions.includes(config.key as any))

  return (
    <section className="report-section p-8 md:p-16 lg:p-24 bg-paper text-ink">
      {/* Header */}
      <header className="mb-16 border-b border-gray-200 pb-8">
        <h2 className="text-accent font-mono tracking-widest text-sm mb-4 uppercase">EXECUTIVE SUMMARY</h2>
        <h1 className="text-4xl md:text-5xl font-bold">分析摘要</h1>
      </header>

      {/* Main Content: Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        
        {/* Left Column: Dimensions */}
        <div className="flex flex-col gap-12">
          {filteredLabels.map((config, idx) => {
            const items = dimensions[config.key as keyof typeof dimensions] || []
            const hasItems = Array.isArray(items) && items.length > 0

            return (
              <div key={idx} className="relative pl-8 border-l-2 border-gray-200 bg-white shadow-sm p-4 rounded-r-xl">
                <div className="absolute -left-[5px] top-4 w-2.5 h-2.5 rounded-full bg-accent" />
                
                {/* Model Avatars Placeholder */}
                <div className="flex gap-2 mb-4">
                  {modelLetters.map((m, i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-[10px] text-gray-600 font-mono">{m}</div>
                  ))}
                </div>

                <h3 className="text-xl font-semibold mb-1 text-ink">{config.label}</h3>
                <p className="text-xs text-inkLight mb-4">{config.desc}</p>
                
                <div className="text-gray-700 leading-relaxed text-sm space-y-2">
                  {hasItems ? (
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      {items.map((item) => (
                        <li key={item.id || item.text} className="pl-1">{item.text}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="italic text-inkLight">本次未识别到该类观点</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Right Column: Flow Chart Placeholder */}
        <div className="flex flex-col">
          <h3 className="text-inkLight font-mono tracking-widest text-sm mb-6 uppercase">观点流向图 · THREE MODEL FLOWS</h3>
          <div className="flex-1 min-h-[400px] rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 border-2 border-dashed border-gray-200 rounded-full mx-auto mb-4 flex items-center justify-center animate-spin-slow">
                <div className="w-8 h-8 bg-accent/10 rounded-full blur-md" />
              </div>
              <p className="text-inkLight font-mono text-sm tracking-wide">V2 将提供三模型观点流向图</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
