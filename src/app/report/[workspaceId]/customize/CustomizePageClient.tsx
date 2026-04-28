'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ReportConfig } from '@/lib/report/types'
import { ConfigPanel } from '@/components/report/customize/ConfigPanel'
import { SaveButton } from '@/components/report/customize/SaveButton'
import ReportPreviewSwitch from '@/components/report/ReportPreviewSwitch'
import { Reflection } from '@/lib/reflection/types'
import UserMenu from '@/components/auth/UserMenu'
import { exportReportAsHtml } from '@/lib/export/html-export'
import { toast } from '@/components/Toast'

interface CustomizePageClientProps {
  workspace: any
  reflection: Reflection | null
  initialConfig: ReportConfig
}

export default function CustomizePageClient({
  workspace,
  reflection,
  initialConfig
}: CustomizePageClientProps) {
  const router = useRouter()
  const workspaceId = workspace.id
  const prompt = workspace.prompt
  const [config, setConfig] = useState<ReportConfig>(initialConfig)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [pdfLoading, setPdfLoading] = useState(false)

  const isPrintMode = useMemo(() => {
    if (typeof window === 'undefined') return false
    return new URLSearchParams(window.location.search).get('print') === '1'
  }, [])

  // 脏状态提示
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const handleConfigChange = (partial: Partial<ReportConfig>) => {
    setConfig(prev => ({ ...prev, ...partial }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    if (isSaving || !isDirty) return
    setIsSaving(true)
    
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/report-config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      })
      if (!res.ok) {
        throw new Error('保存失败')
      }
      setIsDirty(false)
    } catch (e: any) {
      alert(e.message || '保存配置时发生错误，请稍后重试')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={`flex flex-col h-screen bg-paper text-ink font-sans${isPrintMode ? ' print-mode' : ''}`}>
      
      {/* 顶部工具栏 */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10 no-print">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (isDirty && !window.confirm('有未保存的修改，确定要离开吗？')) return
              router.push(`/workspace/${workspaceId}`)
            }}
            className="flex items-center gap-1.5 text-sm text-inkLight hover:text-ink transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回 Workspace
          </button>
          <div className="w-px h-4 bg-gray-200"></div>
          <h1 className="text-sm font-semibold text-ink">深化定制</h1>
          <span className="text-xs text-inkLight truncate max-w-md">· {prompt}</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const root = document.getElementById('customize-export-root')
              if (!root) {
                toast.error('导出失败：未找到内容')
                return
              }
              exportReportAsHtml({
                title: config.title || prompt || 'Gambit Report',
                contentHtml: root.innerHTML,
              })
            }}
            className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white hover:border-accent border border-gray-200 text-inkLight hover:text-accent text-sm transition-colors"
          >
            📄 下载 HTML
          </button>
          <button
            onClick={() => window.print()}
            className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white hover:border-accent border border-gray-200 text-inkLight hover:text-accent text-sm transition-colors"
          >
            🖨 打印/PDF（浏览器）
          </button>
          <button
            onClick={async () => {
              if (pdfLoading) return
              setPdfLoading(true)
              try {
                const res = await fetch('/api/export/pdf', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ reportId: workspaceId, type: 'customize' }),
                })
                if (!res.ok) {
                  toast.error('生成失败，请稍后重试')
                  return
                }
                const blob = await res.blob()
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `gambit-customize-${workspaceId}.pdf`
                document.body.appendChild(a)
                a.click()
                a.remove()
                setTimeout(() => URL.revokeObjectURL(url), 1000)
              } catch {
                toast.error('生成失败，请稍后重试')
              } finally {
                setPdfLoading(false)
              }
            }}
            className="hidden lg:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white hover:border-accent border border-gray-200 text-inkLight hover:text-accent text-sm transition-colors disabled:opacity-60"
            disabled={pdfLoading}
          >
            {pdfLoading ? '生成中...' : '📕 下载 PDF（服务端）'}
          </button>
          <Link 
            href={`/report/${workspaceId}`} 
            target="_blank"
            className="text-sm text-accent hover:text-accent/80 transition-colors mr-2"
          >
            查看当前报告 ↗
          </Link>
          <SaveButton 
            isDirty={isDirty} 
            isSaving={isSaving} 
            onClick={handleSave} 
          />
          <UserMenu />
        </div>
      </header>

      {/* 主体内容 */}
      <main className="flex flex-1 overflow-hidden">
        
        {/* 左侧配置面板 */}
        <aside className="w-[320px] shrink-0 h-full">
          <ConfigPanel config={config} onChange={handleConfigChange} />
        </aside>

        {/* 右侧预览区 */}
        <section className="flex-1 bg-gray-50 flex overflow-y-auto">
          <div id="customize-export-root" className="w-full report-content">
            <ReportPreviewSwitch
              template={config.template}
              workspace={workspace}
              reflection={reflection}
              reportConfig={config}
            />
          </div>
        </section>
      </main>
    </div>
  )
}
