'use client'

import React, { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import ReportCover from '@/components/report/ReportCover'
import ReportSummary from '@/components/report/ReportSummary'
import ReportConclusion from '@/components/report/ReportConclusion'
import { Reflection } from '@/lib/reflection/types'

export default function ReportPage() {
  const params = useParams<{ workspaceId: string }>()
  const wsId = params.workspaceId

  const [workspace, setWorkspace] = useState<any>(null)
  const [reflection, setReflection] = useState<Reflection | null>(null)
  const [status, setStatus] = useState<'loading' | 'error' | 'noReflection' | 'success'>('loading')

  useEffect(() => {
    if (!wsId) return;

    async function load() {
      try {
        const res = await fetch(`/api/workspaces/${wsId}`)
        if (!res.ok) throw new Error('Fetch failed')
        const data = await res.json()
        const ws = data.workspace
        
        if (!ws) throw new Error('Not found')
        setWorkspace(ws)

        if (!ws.reflectionData) {
          setStatus('noReflection')
          return
        }

        const reflectionObj = typeof ws.reflectionData === 'string'
          ? (() => { try { return JSON.parse(ws.reflectionData); } catch { return null; } })()
          : ws.reflectionData;

        if (!reflectionObj || !reflectionObj.dimensions || Object.keys(reflectionObj.dimensions).length === 0) {
          setStatus('noReflection')
          return
        }

        // Calculate model letters for display
        let models: string[] = []
        try {
          models = typeof ws.selectedModels === 'string' ? JSON.parse(ws.selectedModels) : (ws.selectedModels || [])
        } catch {
          models = []
        }
        
        const letters = models.map(model => {
          if (!model) return '?'
          const m = model.toLowerCase()
          if (m.includes('deepseek')) return 'D'
          if (m.includes('qwen')) return 'Q'
          if (m.includes('minimax')) return 'M'
          if (m.includes('gpt') || m.includes('openai')) return 'G'
          if (m.includes('claude')) return 'C'
          if (m.includes('gemini')) return 'E'
          const firstChar = model.replace(/[^a-zA-Z]/g, '').charAt(0)
          return firstChar ? firstChar.toUpperCase() : '?'
        })

        setWorkspace({ ...ws, modelLetters: letters })
        setReflection(reflectionObj)
        setStatus('success')
      } catch (err) {
        console.error('[report] Load failed', err)
        setStatus('error')
      }
    }
    
    void load()
  }, [wsId])

  useEffect(() => {
    if (!workspace?.prompt) return
    const originalTitle = document.title
    const promptSlice = workspace.prompt.slice(0, 30).trim()
    document.title = `Gambit 报告 - ${promptSlice}`
    return () => { document.title = originalTitle }
  }, [workspace?.prompt])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-8">
        <div className="flex flex-col gap-8 w-full max-w-4xl animate-pulse">
          <div className="h-[400px] bg-white rounded-2xl border border-gray-200 shadow-sm" />
          <div className="h-[300px] bg-white rounded-2xl border border-gray-200 shadow-sm" />
          <div className="h-[200px] bg-white rounded-2xl border border-gray-200 shadow-sm" />
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center text-ink">
        <p className="text-xl text-red-600 mb-6">无法加载报告</p>
        <Link href={`/workspace/${wsId}`} className="px-6 py-2 bg-white border border-gray-200 text-inkLight hover:text-ink hover:bg-gray-50 rounded-full transition-colors">
          返回 Workspace
        </Link>
      </div>
    )
  }

  if (status === 'noReflection') {
    return (
      <div className="min-h-screen bg-paper flex flex-col items-center justify-center text-ink">
        <p className="text-xl text-inkLight mb-6">该 workspace 尚未生成综合分析，无法查看报告</p>
        <Link href={`/workspace/${wsId}`} className="px-6 py-2 bg-white border border-gray-200 text-accent hover:text-accent hover:bg-gray-50 rounded-full transition-colors">
          返回 Workspace 生成分析
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full">
      <ReportCover workspace={workspace} />
      <ReportSummary reflection={reflection!} modelLetters={workspace?.modelLetters || []} />
      <ReportConclusion workspace={workspace} reflection={reflection!} modelLetters={workspace?.modelLetters || []} />
    </div>
  )
}
