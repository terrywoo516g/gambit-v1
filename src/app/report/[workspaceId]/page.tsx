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
    if (!wsId) return

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

        try {
          const parsed = JSON.parse(ws.reflectionData)
          const reflectionObj: Reflection = {
            summary: parsed.summary || '',
            dimensions: Array.isArray(parsed.dimensions) 
              ? parsed.dimensions 
              : Object.values(parsed.dimensions || {}).flat() as any,
            draft: parsed.draft || ''
          }
          setReflection(reflectionObj)
          setStatus('success')
        } catch (err) {
          console.error('[report] Failed to parse reflectionData', err)
          setStatus('noReflection')
        }
      } catch (err) {
        console.error('[report] Load failed', err)
        setStatus('error')
      }
    }
    
    void load()
  }, [wsId])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-8">
        <div className="flex flex-col gap-8 w-full max-w-4xl animate-pulse">
          <div className="h-[400px] bg-white/5 rounded-2xl border border-white/10" />
          <div className="h-[300px] bg-white/5 rounded-2xl border border-white/10" />
          <div className="h-[200px] bg-white/5 rounded-2xl border border-white/10" />
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white">
        <p className="text-xl text-red-400 mb-6">无法加载报告</p>
        <Link href={`/workspace/${wsId}`} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors">
          返回 Workspace
        </Link>
      </div>
    )
  }

  if (status === 'noReflection') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex flex-col items-center justify-center text-white">
        <p className="text-xl text-gray-400 mb-6">该 workspace 尚未生成综合分析，无法查看报告</p>
        <Link href={`/workspace/${wsId}`} className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-purple-400">
          返回 Workspace 生成分析
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full">
      <ReportCover workspace={workspace} />
      <ReportSummary reflection={reflection!} />
      <ReportConclusion workspace={workspace} reflection={reflection!} />
    </div>
  )
}
