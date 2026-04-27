'use client'

import React from 'react'
import { ReportConfig } from '@/lib/report/types'
import { Reflection } from '@/lib/reflection/types'
import ReportCover from './ReportCover'
import ReportSummary from './ReportSummary'
import ReportConclusion from './ReportConclusion'
import MemoView from './MemoView'

interface ReportPreviewSwitchProps {
  template: 'report' | 'memo' | 'custom'
  workspace: any
  reflection: Reflection | null
  reportConfig: ReportConfig
}

export default function ReportPreviewSwitch({
  template,
  workspace,
  reflection,
  reportConfig
}: ReportPreviewSwitchProps) {
  
  const renderContent = () => {
    switch (template) {
      case 'report':
        return (
          <div className="w-[1000px] mx-auto bg-paper shadow-2xl overflow-hidden" style={{ transform: 'scale(0.65)', transformOrigin: 'top center' }}>
            <ReportCover workspace={workspace} reportConfig={reportConfig} />
            {reflection && <ReportSummary reflection={reflection} modelLetters={workspace?.modelLetters || []} reportConfig={reportConfig} />}
            {reflection && <ReportConclusion workspace={workspace} reflection={reflection} modelLetters={workspace?.modelLetters || []} reportConfig={reportConfig} />}
          </div>
        )
      
      case 'memo':
        return (
          <div className="w-[800px] mx-auto bg-paper shadow-xl rounded-xl overflow-hidden my-8 border border-gray-200">
            <MemoView workspace={workspace} reflection={reflection} reportConfig={reportConfig} />
          </div>
        )
        
      case 'custom':
        return (
          <div className="w-full h-full flex flex-col items-center justify-center text-inkLight gap-4 p-12">
            <div className="w-16 h-16 rounded-2xl bg-white border-2 border-dashed border-gray-300 flex items-center justify-center mb-4">
              <span className="text-2xl">⚙️</span>
            </div>
            <h2 className="text-xl font-medium text-ink">Custom 模板渲染将在 1.0d 接入</h2>
            <p className="text-sm text-center max-w-md">自定义模板支持模块自由组合、排序以及基础文本编辑，目前仅开放配置界面，渲染引擎建设中。</p>
          </div>
        )
    }
  }

  return (
    <div className="w-full h-full overflow-auto bg-gray-100 p-6">
      {renderContent()}
    </div>
  )
}