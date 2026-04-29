const { chromium } = require('playwright')
const sharp = require('sharp')
const { PDFDocument } = require('pdf-lib')
const fs = require('node:fs/promises')
const path = require('node:path')
const http = require('node:http')

const BASE_URL = 'https://gambits.top'
const ADMIN_EMAIL = '100117169@qq.com'
const ADMIN_PASSWORD = 'wj555555'

const SNAPSHOT_DIR = '/data/tool/browser_snapshots'
const ARTIFACT_DIR = '/workspace/regress-f/artifacts'
const STATIC_ROOT = '/workspace/regress-f'

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

async function safeUnlink(filePath) {
  try {
    await fs.unlink(filePath)
  } catch {}
}

async function getPdfPageCount(pdfPath) {
  const buf = await fs.readFile(pdfPath)
  const doc = await PDFDocument.load(buf)
  return doc.getPageCount()
}

async function waitForDownloadFile(download, outPath) {
  await safeUnlink(outPath)
  await download.saveAs(outPath)
  await download.delete().catch(() => {})
  const st = await fs.stat(outPath)
  return st.size
}

async function stitchHorizontal(leftPng, rightPng, outPng) {
  const left = sharp(leftPng)
  const right = sharp(rightPng)
  const [lm, rm] = await Promise.all([left.metadata(), right.metadata()])
  const width = (lm.width || 0) + (rm.width || 0)
  const height = Math.max(lm.height || 0, rm.height || 0)
  const canvas = sharp({
    create: { width, height, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
  const [lb, rb] = await Promise.all([left.png().toBuffer(), right.png().toBuffer()])
  await canvas
    .composite([
      { input: lb, left: 0, top: 0 },
      { input: rb, left: lm.width || 0, top: 0 },
    ])
    .png()
    .toFile(outPng)
}

function startStaticServer(rootDir) {
  const server = http.createServer(async (req, res) => {
    try {
      const u = new URL(req.url || '/', 'http://127.0.0.1')
      const rawPath = decodeURIComponent(u.pathname)
      if (!rawPath.startsWith('/')) throw new Error('bad path')
      const safePath = path
        .normalize(rawPath)
        .replace(/^(\.\.(\/|\\|$))+/, '')
        .replace(/^\/+/, '')
      const filePath = path.join(rootDir, safePath || 'index.html')
      const st = await fs.stat(filePath).catch(() => null)
      if (!st || !st.isFile()) {
        res.statusCode = 404
        res.end('not found')
        return
      }
      const ext = path.extname(filePath).toLowerCase()
      const ct =
        ext === '.html'
          ? 'text/html; charset=utf-8'
          : ext === '.css'
            ? 'text/css; charset=utf-8'
            : ext === '.mjs' || ext === '.js'
              ? 'application/javascript; charset=utf-8'
              : ext === '.pdf'
                ? 'application/pdf'
                : ext === '.png'
                  ? 'image/png'
                  : 'application/octet-stream'
      res.setHeader('content-type', ct)
      res.statusCode = 200
      const buf = await fs.readFile(filePath)
      res.end(buf)
    } catch (e) {
      res.statusCode = 500
      res.end('error')
    }
  })
  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address()
      if (!addr || typeof addr === 'string') {
        reject(new Error('server bind failed'))
        return
      }
      resolve({
        baseUrl: `http://127.0.0.1:${addr.port}`,
        close: () =>
          new Promise((r) => {
            server.close(() => r())
          }),
      })
    })
  })
}

async function renderPdfScreenshot(context, baseUrl, pdfUrl, outPng, opts = {}) {
  const pageNum = opts.pageNum ?? 1
  const scale = opts.scale ?? 1.2
  const p = await context.newPage({ viewport: opts.viewport ?? { width: 1400, height: 900 } })
  await p.goto(
    `${baseUrl}/render-pdf.html?pdf=${encodeURIComponent(pdfUrl)}&page=${encodeURIComponent(String(pageNum))}&scale=${encodeURIComponent(
      String(scale),
    )}`,
    { waitUntil: 'domcontentloaded' },
  )
  await p.waitForSelector('body[data-ready="1"]', { timeout: 30000 })
  await p.locator('canvas').screenshot({ path: outPng })
  await p.close()
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
  const email = page.locator('input[type="email"], input[name="email"], input[placeholder*="邮箱"], input[placeholder*="mail"]')
  const password = page.locator('input[type="password"], input[name="password"], input[placeholder*="密码"]')
  await email.first().fill(ADMIN_EMAIL)
  await password.first().fill(ADMIN_PASSWORD)
  const authResponsePromise = page
    .waitForResponse((res) => res.request().method() === 'POST' && res.url().includes('/api/auth/'), { timeout: 20000 })
    .catch(() => null)

  const form = page.locator('form').first()
  await form.evaluate((f) => (typeof f.requestSubmit === 'function' ? f.requestSubmit() : f.submit()))

  const authRes = await authResponsePromise
  if (authRes) {
    const status = authRes.status()
    const url = authRes.url()
    if (status >= 400) {
      const body = await authRes.text().catch(() => '')
      throw new Error(`login failed: ${status} ${url} ${body.slice(0, 200)}`)
    }
  }

  await page.waitForURL((u) => !u.pathname.startsWith('/login'), { timeout: 20000 })
  await page.waitForLoadState('networkidle').catch(() => {})
}

async function pickReportId(page) {
  await page.goto(`${BASE_URL}/workspaces`, { waitUntil: 'domcontentloaded' })
  await page.waitForLoadState('networkidle').catch(() => {})
  const idsFromApi = await page
    .evaluate(async () => {
      try {
        const res = await fetch('/api/workspaces', { credentials: 'include' })
        const json = await res.json()
        const ids = []
        if (Array.isArray(json)) {
          for (const w of json) if (w?.id) ids.push(String(w.id))
        } else if (Array.isArray(json?.workspaces)) {
          for (const w of json.workspaces) if (w?.id) ids.push(String(w.id))
        }
        return ids
      } catch {
        return []
      }
    })
    .catch(() => [])

  const fallbackIds = await page.$$eval('a[href^="/workspace/"], a[href*="/workspace/"]', (as) => {
    const ids = []
    for (const a of as) {
      const href = a.getAttribute('href') || ''
      const m = href.match(/\/workspace\/([^/?#]+)/)
      if (m?.[1]) ids.push(m[1])
    }
    return ids
  })

  const workspaceLinks = Array.from(new Set([...idsFromApi, ...fallbackIds])).slice(0, 50)
  let best = null
  for (const id of workspaceLinks) {
    const reportUrl = `${BASE_URL}/report/${id}`
    await page.goto(reportUrl, { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})
    await page.waitForTimeout(1500)
    const meta = await page.evaluate(() => {
      const root =
        document.querySelector('.report-content') ||
        document.querySelector('[data-report-content]') ||
        document.querySelector('main') ||
        document.body
      const textLen = (root?.innerText || '').trim().length
      const hasCode = document.querySelectorAll('pre code, pre, code[class*="language-"]').length > 0
      const hasTable = document.querySelectorAll('table').length > 0
      const h = root?.scrollHeight || document.body.scrollHeight
      const estimatedPages = Math.max(1, Math.ceil(h / 1100))
      return { textLen, hasCode, hasTable, estimatedPages }
    })
    if (!best) best = { id, ...meta }
    const score =
      meta.textLen +
      (meta.hasCode ? 2000 : 0) +
      (meta.hasTable ? 2000 : 0) +
      meta.estimatedPages * 3000
    const bestScore =
      best.textLen +
      (best.hasCode ? 2000 : 0) +
      (best.hasTable ? 2000 : 0) +
      best.estimatedPages * 3000
    if (score > bestScore) best = { id, ...meta }
    if (meta.textLen >= 2000 && meta.hasCode && meta.hasTable && meta.estimatedPages >= 6) return { id, ...meta }
  }
  return best
}

function buildLongMarkdown() {
  const para =
    '这是用于回归测试导出与分页的长文段落，包含中文标点与多段换行，用于观察字体渲染清晰度、分页是否合理，以及链接 URL 是否按规则展示。'
  const body = Array.from({ length: 120 }, (_, i) => `${i + 1}. ${para}`).join('\n\n')
  return [
    '# 导出回归长文素材（自动生成）',
    '',
    '链接示例：https://example.com/path?query=1',
    '',
    '## 表格测试',
    '',
    '| 字段 | 说明 |',
    '|---|---|',
    '| alpha | 第一列 |',
    '| beta | 第二列 |',
    '| gamma | 第三列 |',
    '',
    '## 代码块测试',
    '',
    '```ts',
    'type Row = { key: string; value: number }',
    'export function sum(rows: Row[]): number {',
    '  return rows.reduce((acc, r) => acc + r.value, 0)',
    '}',
    '```',
    '',
    '## 正文（用于分页 >5 页）',
    '',
    body,
    '',
  ].join('\n')
}

async function run() {
  await ensureDir(SNAPSHOT_DIR)
  await ensureDir(ARTIFACT_DIR)

  let browser
  browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })
  const context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text())
  })

  const networkFailures = []
  page.on('requestfailed', (req) => {
    networkFailures.push({ url: req.url(), failure: req.failure()?.errorText })
  })

  try {
    await login(page)
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'after_login.png'), fullPage: true }).catch(() => {})

    const picked = await pickReportId(page)
    if (!picked?.id) throw new Error('no report id found')

    const reportId = picked.id
    const reportUrl = `${BASE_URL}/report/${reportId}`
    const customizeUrl = `${BASE_URL}/report/${reportId}/customize`

    await page.goto(customizeUrl, { waitUntil: 'networkidle' })
    await page.waitForTimeout(800)
    const customRadio = page.locator('input[type="radio"][name="template"][value="custom"]')
    if ((await customRadio.count()) > 0) {
      await customRadio.first().check().catch(() => {})
      await page.waitForTimeout(600)
      const longMd = buildLongMarkdown()
      const textareas = page.locator('textarea')
      const taCount = await textareas.count()
      for (let i = 0; i < taCount; i++) {
        await textareas.nth(i).fill(longMd).catch(() => {})
      }
      await page.locator('button:has-text("保存")').first().click().catch(() => {})
      await page.waitForTimeout(1000)
      await page.locator('text=已保存').first().waitFor({ timeout: 20000 }).catch(() => {})
    }

  await page.goto(reportUrl, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: path.join(SNAPSHOT_DIR, 'F6.png'), fullPage: true })

  const printUrl = `${reportUrl}?print=1`
  await page.goto(printUrl, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  await page.screenshot({ path: path.join(SNAPSHOT_DIR, 'F5.png'), fullPage: true })
  const pdfAPath = path.join(ARTIFACT_DIR, 'pdf_a.pdf')
  await page.pdf({ path: pdfAPath, format: 'A4', printBackground: true })

  await page.goto(reportUrl, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)

  const pdfBPath = path.join(ARTIFACT_DIR, 'pdf_b.pdf')
  const pdfBRunPaths = []
  const bTimesMs = []
  for (let i = 1; i <= 3; i++) {
    const downloadPromise = page.waitForEvent('download', { timeout: 45000 })
    const start = Date.now()
    await page.locator('button:has-text("下载 PDF（服务端）")').first().click({ timeout: 15000 })
    const download = await downloadPromise
    const out = path.join(ARTIFACT_DIR, `pdf_b_run${i}.pdf`)
    await waitForDownloadFile(download, out)
    bTimesMs.push(Date.now() - start)
    pdfBRunPaths.push(out)
  }
  await fs.copyFile(pdfBRunPaths[pdfBRunPaths.length - 1], pdfBPath)

  await page.goto(customizeUrl, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1200)
  const downloadPromiseC = page.waitForEvent('download', { timeout: 45000 })
  await page.locator('button:has-text("下载 PDF（服务端）")').first().click({ timeout: 15000 })
  const downloadC = await downloadPromiseC
  const pdfBCustomizePath = path.join(ARTIFACT_DIR, 'pdf_b_customize.pdf')
  await waitForDownloadFile(downloadC, pdfBCustomizePath)
  await page.screenshot({ path: path.join(SNAPSHOT_DIR, 'F8.png'), fullPage: true })

  const aPages = await getPdfPageCount(pdfAPath)
  const bPages = await getPdfPageCount(pdfBPath)

    const staticServer = await startStaticServer(STATIC_ROOT)
    const pdfAHttpUrl = `${staticServer.baseUrl}/artifacts/pdf_a.pdf`
    const pdfBHttpUrl = `${staticServer.baseUrl}/artifacts/pdf_b.pdf`

  const aPng1 = path.join(ARTIFACT_DIR, 'a_p1.png')
  const bPng1 = path.join(ARTIFACT_DIR, 'b_p1.png')
    await renderPdfScreenshot(context, staticServer.baseUrl, pdfAHttpUrl, aPng1, { pageNum: 1 })
    await renderPdfScreenshot(context, staticServer.baseUrl, pdfBHttpUrl, bPng1, { pageNum: 1 })
  await stitchHorizontal(aPng1, bPng1, path.join(SNAPSHOT_DIR, 'F10_compare.png'))

  const f11Page = Math.min(3, Math.max(1, Math.floor(Math.min(aPages, bPages) / 2)))
  const aPng11 = path.join(ARTIFACT_DIR, `a_p${f11Page}.png`)
  const bPng11 = path.join(ARTIFACT_DIR, `b_p${f11Page}.png`)
    await renderPdfScreenshot(context, staticServer.baseUrl, pdfAHttpUrl, aPng11, { pageNum: f11Page })
    await renderPdfScreenshot(context, staticServer.baseUrl, pdfBHttpUrl, bPng11, { pageNum: f11Page })
  await stitchHorizontal(aPng11, bPng11, path.join(SNAPSHOT_DIR, 'F11_compare.png'))

  const f12Page = Math.min(6, Math.max(1, Math.min(aPages, bPages)))
  const aPng12 = path.join(ARTIFACT_DIR, `a_p${f12Page}.png`)
  const bPng12 = path.join(ARTIFACT_DIR, `b_p${f12Page}.png`)
    await renderPdfScreenshot(context, staticServer.baseUrl, pdfAHttpUrl, aPng12, { pageNum: f12Page })
    await renderPdfScreenshot(context, staticServer.baseUrl, pdfBHttpUrl, bPng12, { pageNum: f12Page })
  await stitchHorizontal(aPng12, bPng12, path.join(SNAPSHOT_DIR, 'F12_compare.png'))

  const f7Png = path.join(SNAPSHOT_DIR, 'F7.png')
    await renderPdfScreenshot(context, staticServer.baseUrl, pdfBHttpUrl, f7Png, { pageNum: 1 })

    await staticServer.close()

    const outJson = {
      reportId,
      reportUrl,
      customizeUrl,
      picked,
      pdfAPath,
      pdfBPath,
      pdfBCustomizePath,
      pages: { a: aPages, b: bPages },
      bTimesMs,
      bAvgMs: Math.round(bTimesMs.reduce((a, b) => a + b, 0) / bTimesMs.length),
      consoleErrors,
      networkFailures,
    }
    await fs.writeFile(path.join(ARTIFACT_DIR, 'result.json'), JSON.stringify(outJson, null, 2), 'utf8')
  } finally {
    await browser?.close().catch(() => {})
  }
}

run().catch(async (err) => {
  const out = { error: String(err?.stack || err) }
  try {
    await ensureDir(ARTIFACT_DIR)
    await fs.writeFile(path.join(ARTIFACT_DIR, 'result.json'), JSON.stringify(out, null, 2), 'utf8')
  } catch {}
  process.exitCode = 1
})
