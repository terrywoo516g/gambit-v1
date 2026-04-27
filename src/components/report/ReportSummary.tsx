import React from 'react'
import { Reflection } from '@/lib/reflection/types'

const DIMENSION_LABELS = [
  { key: 'consensus',  label: '核心共识', desc: '三模型一致认同的观点' },
  { key: 'divergence', label: '关键分歧', desc: '模型间存在显著分歧的观点' },
  { key: 'minority',   label: '少数派观点', desc: '仅个别模型提出的独立判断' },
  { key: 'pending',    label: '待观察', desc: '需更多信息才能判断的议题' },
] as const

export default function ReportSummary({ reflection, modelLetters = [] }: { reflection: Reflection, modelLetters?: string[] }) {
  const dimensions = reflection?.dimensions || {}
  
  return (
    <section className="report-section p-8 md:p-16 lg:p-24 bg-[#0a0a0f] text-white print:bg-white print:text-black">
      {/* Header */}
      <header className="mb-16 border-b border-white/10 pb-8 print:border-gray-300">
        <h2 className="text-purple-500 font-mono tracking-widest text-sm mb-4 print-text-gray uppercase">EXECUTIVE SUMMARY</h2>
        <h1 className="text-4xl md:text-5xl font-bold print-text-invert">分析摘要</h1>
      </header>

      {/* Main Content: Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        
        {/* Left Column: Dimensions */}
        <div className="flex flex-col gap-12">
          {DIMENSION_LABELS.map((config, idx) => {
            const items = dimensions[config.key as keyof typeof dimensions] || []
            const hasItems = Array.isArray(items) && items.length > 0

            return (
              <div key={idx} className="relative pl-8 border-l-2 border-white/15 print:border-gray-300 bg-white/[0.05] p-4 rounded-r-xl">
                <div className="absolute -left-1 top-4 w-2 h-2 rounded-full bg-purple-500 print-force-bg" />
                
                {/* Model Avatars Placeholder */}
                <div className="flex gap-2 mb-4">
                  {modelLetters.map((m, i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-gray-400 font-mono print-card">{m}</div>
                  ))}
                </div>

                <h3 className="text-xl font-semibold mb-1 print-text-invert text-white">{config.label}</h3>
                <p className="text-xs text-white/55 mb-4 print-text-gray">{config.desc}</p>
                
                <div className="text-white/80 leading-relaxed print-text-gray text-sm space-y-2">
                  {hasItems ? (
                    <ul className="list-disc list-inside space-y-2 ml-2">
                      {items.map((item) => (
                        <li key={item.id || item.text} className="pl-1">{item.text}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="italic text-gray-600">本次未识别到该类观点</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Right Column: Flow Chart Placeholder */}
        <div className="flex flex-col">
          <h3 className="text-gray-500 font-mono tracking-widest text-sm mb-6 print-text-gray uppercase">观点流向图 · THREE MODEL FLOWS</h3>
          <div className="flex-1 min-h-[400px] rounded-2xl bg-[#13131a] border border-white/5 flex items-center justify-center print-card print-force-bg">
            <div className="text-center">
              <div className="w-16 h-16 border-2 border-dashed border-white/10 rounded-full mx-auto mb-4 flex items-center justify-center animate-spin-slow print:border-gray-300">
                <div className="w-8 h-8 bg-purple-500/20 rounded-full blur-md print-force-bg" />
              </div>
              <p className="text-gray-500 font-mono text-sm tracking-wide print-text-gray">V2 将提供三模型观点流向图</p>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
