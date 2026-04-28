import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth'
import { prisma } from '@/lib/db'
import { existsSync } from 'node:fs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TIMEOUT_MS = 30_000

function safeId(input: string) {
  return /^[a-zA-Z0-9-]+$/.test(input)
}

function resolveExecutablePath() {
  const envPath = process.env.PUPPETEER_EXECUTABLE_PATH
  if (envPath && existsSync(envPath)) return envPath
  const candidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ]
  for (const p of candidates) {
    if (existsSync(p)) return p
  }
  return undefined
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  const userId = (session?.user as any)?.id
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const reportId = body?.reportId
  const type = body?.type
  if (!reportId || typeof reportId !== 'string' || !safeId(reportId)) {
    return NextResponse.json({ error: 'invalid reportId' }, { status: 400 })
  }
  if (type !== 'report' && type !== 'customize') {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 })
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: reportId },
    select: { id: true, userId: true },
  })
  if (!workspace || workspace.userId !== userId) {
    return NextResponse.json({ error: 'not found' }, { status: 404 })
  }

  const baseUrl = process.env.NEXTAUTH_URL || 'https://gambits.top'
  const url =
    type === 'report'
      ? `${baseUrl}/report/${reportId}?print=1`
      : `${baseUrl}/report/${reportId}/customize?print=1`

  const cookieHeader = req.headers.get('cookie') || ''

  let browser: any
  try {
    const puppeteerMod: any = await import('puppeteer')
    const puppeteer = puppeteerMod.default ?? puppeteerMod

    const run = async () => {
      const executablePath = resolveExecutablePath()
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath,
      })
      const page = await browser.newPage()
      await page.setExtraHTTPHeaders({ cookie: cookieHeader })
      await page.emulateMediaType('print')
      await page.goto(url, { waitUntil: 'networkidle0' })
      const pdf = await page.pdf({
        format: 'A4',
        margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
        printBackground: true,
      })
      await page.close()
      await browser.close()
      browser = null
      return pdf
    }

    const pdf = await Promise.race([
      run(),
      new Promise<Buffer>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)
      ),
    ])

    const filename =
      type === 'report'
        ? `gambit-report-${reportId}.pdf`
        : `gambit-customize-${reportId}.pdf`

    return new Response(pdf, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (e: any) {
    if (String(e?.message || e) === 'timeout') {
      return NextResponse.json({ error: 'timeout' }, { status: 504 })
    }
    return NextResponse.json({ error: 'export failed' }, { status: 500 })
  } finally {
    if (browser) {
      try {
        await browser.close()
      } catch {}
    }
  }
}
