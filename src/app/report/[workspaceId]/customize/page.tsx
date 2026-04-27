import { notFound } from 'next/navigation'
import { prisma } from '@/lib/db'
import { DEFAULT_REPORT_CONFIG, parseReportConfig } from '@/lib/report/types'
import CustomizePageClient from './CustomizePageClient'

export default async function CustomizePage({
  params
}: {
  params: { workspaceId: string }
}) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: params.workspaceId },
    select: { id: true, prompt: true, reportConfig: true, reflectionData: true, reflectionAt: true, selectedModels: true }
  })

  if (!workspace) {
    notFound()
  }

  const initialConfig = parseReportConfig(workspace.reportConfig) || {
    ...DEFAULT_REPORT_CONFIG,
    title: workspace.prompt ?? ''
  }

  let reflection = null
  if (workspace.reflectionData) {
    try {
      reflection = JSON.parse(workspace.reflectionData)
    } catch {
      reflection = null
    }
  }

  return (
    <CustomizePageClient 
      workspace={workspace}
      reflection={reflection}
      initialConfig={initialConfig}
    />
  )
}