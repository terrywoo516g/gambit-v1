import React from 'react'
import { Reflection } from '@/lib/reflection/types'

export default function ReportSummary({ reflection }: { reflection: Reflection }) {
  const dims = Array.isArray(reflection?.dimensions) 
    ? reflection.dimensions 
    : Object.values(reflection?.dimensions || {}).flat()
  
  return (
    <section className="min-h-screen p-8 md:p-16 lg:p-24 bg-[#0a0a0f] text-white print-page-break print:bg-white print:text-black">
      {/* Header */}
      <header className="mb-16 border-b border-white/10 pb-8 print:border-gray-300">
        <h2 className="text-purple-500 font-mono tracking-widest text-sm mb-4 print-text-gray uppercase">EXECUTIVE SUMMARY</h2>
        <h1 className="text-4xl md:text-5xl font-bold print-text-invert">分析摘要</h1>
      </header>

      {/* Main Content: Two Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
        
        {/* Left Column: Dimensions */}
        <div className="flex flex-col gap-12">
          {dims.length === 0 ? (
            <p className="text-gray-500 italic print-text-gray">暂无分析维度</p>
          ) : (
            dims.map((dim: any, idx: number) => (
              <div key={idx} className="relative pl-8 border-l-2 border-white/10 print:border-gray-300">
                <div className="absolute -left-1 top-0 w-2 h-2 rounded-full bg-purple-500 print-force-bg" />
                
                {/* Model Avatars Placeholder */}
                <div className="flex gap-2 mb-4">
                  <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-gray-400 font-mono print-card">D</div>
                  <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-gray-400 font-mono print-card">Q</div>
                  <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-gray-400 font-mono print-card">M</div>
                </div>

                <h3 className="text-xl font-semibold mb-3 print-text-invert text-gray-100">{dim.title}</h3>
                <p className="text-gray-400 leading-relaxed whitespace-pre-wrap print-text-gray text-sm">
                  {dim.content}
                </p>
              </div>
            ))
          )}
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
