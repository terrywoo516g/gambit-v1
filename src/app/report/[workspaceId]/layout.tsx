'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { exportReportAsHtml } from '@/lib/export/html-export'
import { toast } from '@/components/Toast'

export default function ReportLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { workspaceId: string }
}) {
  const pathname = usePathname()
  const isCustomizePage = pathname?.includes('/customize') ?? false
  const [pdfLoading, setPdfLoading] = useState(false)

  const isPrintMode = useMemo(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('print') === '1'
  }, [])

  async function downloadServerPdf() {
    if (pdfLoading) return
    setPdfLoading(true)
    try {
      const res = await fetch('/api/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: params.workspaceId, type: 'report' }),
      })
      if (!res.ok) {
        toast.error('生成失败，请稍后重试')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gambit-report-${params.workspaceId}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch {
      toast.error('生成失败，请稍后重试')
    } finally {
      setPdfLoading(false)
    }
  }

  function downloadHtml() {
    const root = document.getElementById('report-export-root')
    if (!root) {
      toast.error('导出失败：未找到内容')
      return
    }
    exportReportAsHtml({
      title: document.title || 'Gambit Report',
      contentHtml: root.outerHTML,
    })
  }

  return (
    <div className={`min-h-screen bg-paper text-ink font-sans selection:bg-accent/30${isPrintMode ? ' print-mode' : ''}`}>
      {!isCustomizePage && (
        <div className="fixed top-6 left-6 z-50 flex items-center gap-3 no-print">
          <Link 
            href={`/workspace/${params.workspaceId}`}
            className="flex items-center gap-2 text-sm text-inkLight hover:text-ink transition-colors bg-white hover:bg-gray-50 px-3 py-1.5 rounded-full border border-gray-200"
          >
            <ArrowLeft className="w-4 h-4" />
            返回 Workspace
          </Link>
          <button
            onClick={downloadHtml}
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:border-accent border border-gray-200 text-inkLight hover:text-accent text-sm transition-colors"
          >
            📄 下载 HTML
          </button>
          <button
            onClick={() => window.print()}
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:border-accent border border-gray-200 text-inkLight hover:text-accent text-sm transition-colors"
          >
            🖨 打印/PDF（浏览器）
          </button>
          <button
            onClick={downloadServerPdf}
            className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white hover:border-accent border border-gray-200 text-inkLight hover:text-accent text-sm transition-colors disabled:opacity-60"
            disabled={pdfLoading}
          >
            {pdfLoading ? '生成中...' : '📕 下载 PDF（服务端）'}
          </button>
        </div>
      )}
      <main>
        {children}
      </main>
    </div>
  )
}
