import React from 'react'

export default function ReportCover({ workspace }: { workspace: any }) {
  const dateStr = workspace.reflectionAt 
    ? new Date(workspace.reflectionAt).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.')
    : ''
    
  const modelList = workspace.modelRuns?.map((m: any) => m.model).join(' · ') || '多模型'

  return (
    <section className="relative w-full h-screen flex flex-col justify-between p-8 md:p-16 lg:p-24 overflow-hidden report-gradient-bg bg-gradient-to-br from-[#0a0a0f] via-[#130f1c] to-[#0a0a0f] print-page-break print:h-auto print:min-h-screen">
      {/* Background glow */}
      <div className="absolute top-1/3 left-1/4 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px] -z-10 print:hidden" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] -z-10 print:hidden" />

      {/* Header */}
      <header className="flex justify-between items-start z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center print-force-bg">
            <span className="text-white font-bold text-lg leading-none">G</span>
          </div>
          <span className="text-xl font-semibold tracking-wide text-white print-text-invert">Gambit</span>
        </div>
        <div className="text-sm font-mono tracking-widest text-gray-400 print-text-gray uppercase">
          {dateStr.split('.')[0]} · Q{Math.floor((new Date(workspace.reflectionAt || Date.now()).getMonth() + 3) / 3)} · FLAGSHIP REPORT
        </div>
      </header>

      {/* Main Title */}
      <main className="flex-1 flex flex-col justify-center max-w-5xl z-10 mt-12">
        <p className="text-purple-400 font-mono tracking-[0.2em] text-sm mb-6 print-text-gray">GAMBIT RESEARCH</p>
        <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-8 line-clamp-2 print-text-invert">
          {workspace.prompt}
        </h1>
        <h2 className="text-2xl md:text-3xl text-gray-400 font-light tracking-wide print-text-gray">
          多模型交叉验证 · 综合判断
        </h2>
      </main>

      {/* Footer Info */}
      <footer className="grid grid-cols-1 md:grid-cols-3 gap-8 border-t border-white/10 pt-8 z-10 print:border-gray-300">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 print-text-gray">MODELS</p>
          <p className="text-sm text-gray-300 font-medium print-text-invert">{modelList}</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 print-text-gray">METHODOLOGY</p>
          <p className="text-sm text-gray-300 font-medium print-text-invert">交叉验证 · 综合判断</p>
        </div>
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 print-text-gray">DATE</p>
          <p className="text-sm text-gray-300 font-medium print-text-invert">{dateStr}</p>
        </div>
      </footer>
    </section>
  )
}
