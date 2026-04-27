'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:border-accent border border-gray-200 text-inkLight hover:text-accent text-sm transition-colors print:hidden"
      aria-label="导出 PDF"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      导出 PDF
    </button>
  )
}
