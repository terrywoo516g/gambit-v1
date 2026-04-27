import React from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PrintButton } from '@/components/report/PrintButton'
import './report.css'

export default function ReportLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { workspaceId: string }
}) {
  return (
    <div className="min-h-screen bg-paper text-ink font-sans selection:bg-accent/30">
      <div className="fixed top-6 left-6 z-50 flex items-center gap-3 print:hidden">
        <Link 
          href={`/workspace/${params.workspaceId}`}
          className="flex items-center gap-2 text-sm text-inkLight hover:text-ink transition-colors bg-white hover:bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200"
        >
          <ArrowLeft className="w-4 h-4" />
          返回 Workspace
        </Link>
        <PrintButton />
      </div>
      <main>
        {children}
      </main>
    </div>
  )
}
