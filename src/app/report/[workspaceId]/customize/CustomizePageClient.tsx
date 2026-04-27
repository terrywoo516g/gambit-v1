'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ReportConfig } from '@/lib/report/types'
import { ConfigPanel } from '@/components/report/customize/ConfigPanel'
import { SaveButton } from '@/components/report/customize/SaveButton'
import ReportPreviewSwitch from '@/components/report/ReportPreviewSwitch'
import { Reflection } from '@/lib/reflection/types'

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
    <div className="flex flex-col h-screen bg-paper text-ink font-sans">
      
      {/* 顶部工具栏 */}
      <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10">
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
          <ReportPreviewSwitch
            template={config.template}
            workspace={workspace}
            reflection={reflection}
            reportConfig={config}
          />
        </section>
      </main>
    </div>
  )
}