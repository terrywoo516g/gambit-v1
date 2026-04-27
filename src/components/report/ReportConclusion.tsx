import React from 'react'
import { Reflection } from '@/lib/reflection/types'

export default function ReportConclusion({ workspace, reflection }: { workspace: any, reflection: Reflection }) {
  const dims = Array.isArray(reflection?.dimensions) 
    ? reflection.dimensions 
    : Object.values(reflection?.dimensions || {}).flat()
  
  return (
    <section className="min-h-screen p-8 md:p-16 lg:p-24 bg-[#0a0a0f] text-white print-page-break print:bg-white print:text-black flex flex-col justify-between">
      {/* Header */}
      <header className="mb-16">
        <h2 className="text-purple-500 font-mono tracking-widest text-sm mb-4 print-text-gray uppercase">核心问题</h2>
        <h1 className="text-3xl md:text-4xl font-bold leading-tight text-gray-100 print-text-invert">
          {workspace?.prompt ?? '未知工作区'}
        </h1>
      </header>

      {/* Middle Section: Conclusions */}
      <div className="flex-1 mb-16">
        <h3 className="text-gray-500 font-mono tracking-widest text-sm mb-8 print-text-gray uppercase border-b border-white/10 pb-4 print:border-gray-300">核心结论</h3>
        
        <div className="space-y-6">
          {dims.slice(0, 3).map((dim: any, idx: number) => {
            const text = dim?.content ?? ''
            const preview = text.length > 60 ? text.substring(0, 60) + '...' : text
            return (
              <div key={idx} className="flex items-start gap-4 p-4 rounded-xl bg-white/5 border border-white/10 print-card print-force-bg">
                <span className="text-purple-500 font-mono text-xl font-bold">{(idx + 1).toString().padStart(2, '0')}</span>
                <div className="flex-1">
                  <p className="text-gray-200 font-medium mb-1 print-text-invert">{dim?.title ?? '—'}</p>
                  <p className="text-gray-400 text-sm leading-relaxed print-text-gray line-clamp-2">
                    {preview}
                  </p>
                </div>
                <div className="flex gap-1 self-center">
                  <div className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[8px] text-gray-400 font-mono print-card">D</div>
                  <div className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[8px] text-gray-400 font-mono print-card">Q</div>
                  <div className="w-5 h-5 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[8px] text-gray-400 font-mono print-card">M</div>
                </div>
              </div>
            )
          })}
          {dims.length === 0 && <p className="text-gray-500 italic print-text-gray">暂无核心结论</p>}
        </div>
      </div>

      {/* Lower Section: Three Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {[
          { label: '最大共识', dim: dims[0] },
          { label: '最大分歧', dim: dims[1] },
          { label: '最大风险', dim: dims[2] }
        ].map((item, idx) => {
          const text = item.dim?.content ?? ''
          const preview = text.length > 80 ? text.substring(0, 80) + '...' : text
          return (
            <div key={idx} className="p-6 rounded-2xl bg-gradient-to-b from-[#13131a] to-[#0a0a0f] border border-white/10 print-card print-force-bg">
              <h4 className="text-purple-400 font-mono tracking-widest text-xs mb-4 uppercase print-text-gray">{item.label}</h4>
              {item.dim ? (
                <>
                  <p className="text-gray-200 font-semibold text-lg mb-2 print-text-invert">{item.dim?.title ?? '—'}</p>
                  <p className="text-gray-500 text-sm leading-relaxed line-clamp-3 print-text-gray">
                    {preview}
                  </p>
                </>
              ) : (
                <p className="text-gray-600 text-2xl font-light print-text-gray">—</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer Section: Recommendation */}
      <footer className="pt-8 border-t border-white/10 print:border-gray-300">
        <h4 className="text-gray-500 font-mono tracking-widest text-sm mb-4 uppercase print-text-gray">推荐行动</h4>
        <div className="text-gray-300 text-base leading-relaxed print-text-invert bg-white/5 p-6 rounded-xl border border-white/10 print-card print-force-bg">
          {reflection?.draft ? (
            <p className="whitespace-pre-wrap line-clamp-3">
              {reflection.draft.split('\n').slice(0, 3).join('\n')}
            </p>
          ) : (
            <p className="text-gray-600 text-2xl font-light print-text-gray">—</p>
          )}
        </div>
      </footer>
    </section>
  )
}
