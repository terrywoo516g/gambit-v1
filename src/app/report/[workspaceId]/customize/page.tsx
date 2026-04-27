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
    select: { id: true, prompt: true, reportConfig: true }
  })

  if (!workspace) {
    notFound()
  }

  const initialConfig = parseReportConfig(workspace.reportConfig) || {
    ...DEFAULT_REPORT_CONFIG,
    title: workspace.prompt ?? ''
  }

  return (
    <CustomizePageClient 
      workspaceId={workspace.id}
      prompt={workspace.prompt}
      initialConfig={initialConfig}
    />
  )
}