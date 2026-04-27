import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import './report.css'

export default function ReportLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { workspaceId: string }
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-[#e5e5e5] font-sans selection:bg-purple-500/30">
      <Link 
        href={`/workspace/${params.workspaceId}`}
        className="fixed top-6 left-6 z-50 flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors print:hidden bg-black/20 backdrop-blur px-3 py-1.5 rounded-full border border-white/10"
      >
        <ArrowLeft className="w-4 h-4" />
        返回 Workspace
      </Link>
      <main>
        {children}
      </main>
    </div>
  )
}
