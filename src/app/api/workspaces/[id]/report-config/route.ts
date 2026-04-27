import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { DEFAULT_REPORT_CONFIG, parseReportConfig } from '@/lib/report/types'

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const workspace = await prisma.workspace.findUnique({
      where: { id: params.id },
      select: { id: true, reportConfig: true, reportConfigAt: true, prompt: true },
    })
    if (!workspace) {
      return NextResponse.json({ error: 'workspace not found' }, { status: 404 })
    }
    const config = parseReportConfig(workspace.reportConfig)
    return NextResponse.json({
      config,
      defaultConfig: { ...DEFAULT_REPORT_CONFIG, title: workspace.prompt ?? '' },
      updatedAt: workspace.reportConfigAt,
    })
  } catch (err) {
    console.error('[GET /api/workspaces/:id/report-config]', err)
    return NextResponse.json({ error: 'db error' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid JSON body' }, { status: 400 })
  }
  
  const config = (body as any)?.config
  if (!config || typeof config !== 'object') {
    return NextResponse.json({ error: 'config field required' }, { status: 400 })
  }
  
  // 基础校验：必填字段
  if (!['report', 'memo', 'custom'].includes(config.template)) {
    return NextResponse.json({ error: 'invalid template' }, { status: 400 })
  }
  if (!Array.isArray(config.selectedDimensions) || config.selectedDimensions.length === 0) {
    return NextResponse.json({ error: 'selectedDimensions must be non-empty array' }, { status: 400 })
  }
  
  try {
    const updated = await prisma.workspace.update({
      where: { id: params.id },
      data: {
        reportConfig: JSON.stringify(config),
        reportConfigAt: new Date(),
      },
      select: { id: true, reportConfigAt: true },
    })
    return NextResponse.json({
      ok: true,
      updatedAt: updated.reportConfigAt,
    })
  } catch (e: any) {
    if (e?.code === 'P2025') {
      return NextResponse.json({ error: 'workspace not found' }, { status: 404 })
    }
    console.error('[PUT /api/workspaces/:id/report-config]', e)
    return NextResponse.json({ error: 'db error' }, { status: 500 })
  }
}