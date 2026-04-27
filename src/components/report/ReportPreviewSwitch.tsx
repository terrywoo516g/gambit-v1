'use client'

import React from 'react'
import { ReportConfig } from '@/lib/report/types'
import { Reflection } from '@/lib/reflection/types'
import ReportCover from './ReportCover'
import ReportSummary from './ReportSummary'
import ReportConclusion from './ReportConclusion'
import MemoView from './MemoView'
import CustomView from './CustomView'

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
          <div className="w-[800px] mx-auto overflow-hidden my-8">
            <CustomView workspace={workspace} reflection={reflection} reportConfig={reportConfig} />
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