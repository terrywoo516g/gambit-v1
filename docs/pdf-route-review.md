# PDF 路由审计与公开页健康检查

审计时间：2026-04-29
范围：`src/app/api/export/pdf/route.ts`、`src/lib/export/html-export.ts`、`src/styles/print.css`，以及公开页 `/`、`/login`、`/register` 的 curl 健康检查。

## 代码审计

| 检查项 | 现状 | 风险等级 | 建议 |
|---|---|---:|---|
| Puppeteer 超时设置 | 路由有统一 `TIMEOUT_MS = 30_000`，通过 `Promise.race` 包住完整导出流程；`puppeteer.launch`、`page.goto`、`page.pdf` 没有各自独立 timeout。`page.goto` 未显式传 `timeout`，依赖 Puppeteer 默认；`page.pdf` 无单独超时。 | 中 | 保留总超时，同时给 `page.setDefaultNavigationTimeout(TIMEOUT_MS)`、`page.goto(..., { timeout: TIMEOUT_MS })`，并给 PDF 生成单独 race/Abort 保护，便于定位是启动、加载还是生成超时。 |
| executablePath 兜底 | 优先读 `PUPPETEER_EXECUTABLE_PATH` 且 `existsSync`，再依次尝试常见 Chrome/Chromium 路径；都找不到时返回 `undefined`，让 Puppeteer 使用自带/默认解析。 | 中 | 启动前记录最终 executablePath；若生产环境不安装 bundled Chromium，应在找不到时返回清晰错误，例如 `chromium not found`，并在部署文档注明依赖路径。 |
| 内存释放 | `browser.close()` 在成功路径执行，并在 `finally` 中兜底关闭；成功关闭后将 `browser = null`，避免重复 close。`page.close()` 只在成功路径执行。 | 低 | 可以保留现状。若后续需要更细粒度排障，可把 `page.close()` 也放入内部 `finally`，但当前 browser finally 已能释放主要资源。 |
| 并发限流 | 路由没有并发队列、信号量或速率限制。每个请求都会启动一个 Chromium。 | 高 | 增加进程内并发限制（例如同时 1-2 个 PDF 导出）或复用 browser 池；超过并发时返回 429/排队提示，避免多人同时导出压垮小规格服务器内存。 |
| 错误处理 | 未登录 401、非法参数 400、非 owner 404；总超时返回 504；其他 Puppeteer 失败返回 500 `export failed`。错误体较简洁，没有 fallback。 | 中 | 对启动失败、页面 4xx/5xx、页面加载超时、PDF 生成失败分别打 server log，并可在 500 中返回稳定错误码；前端可提示用户改用浏览器打印路线 A。 |
| HTML 模板注入风险 | 服务端 PDF 路由不是直接拼用户 HTML，而是打开已登录 report/customize 页面，权限通过 workspace ownership 校验。客户端 HTML 导出函数会把 `opts.title` 放进 `<title>`，把 `opts.contentHtml` 原样写入 body。 | 中 | 若 `contentHtml` 已由 React/Markdown 安全渲染产物生成，风险可控；仍建议对 `<title>` 做 HTML escape，并确认 Markdown 渲染器不会允许危险脚本进入 `contentHtml`。下载的 HTML 是本地文件，风险主要是用户再次打开时执行潜在脚本。 |
| `print.css` 的 `@page` 设置 | `@page` 设置 A4 和 `20mm 15mm` 边距；隐藏 header/nav/footer/button/no-print；对 h1-h3、pre/table/blockquote 做分页控制。 | 低 | 设置合理。可补充 `orphans/widows`、表格行分页控制和长代码块换行，以减少分页处断裂。 |
| 字体加载策略 | `print.css` 使用系统 UI 字体和 monospace 栈，没有显式 webfont 或 print 专用中文字体加载。 | 中 | 服务端 PDF 在 Linux 上依赖系统中文字体。建议部署层安装 Noto CJK，并在 print/report CSS 中增加中文字体栈或 `font-family: 'Noto Sans CJK SC', 'Noto Sans SC', 'Microsoft YaHei', sans-serif`。 |
| 中文字体回退 | 当前没有硬编码 `noto-cjk`，body/HTML 导出里使用 `-apple-system`、`PingFang SC`、`Microsoft YaHei` 等本地字体。Linux Puppeteer 环境不一定有这些字体。 | 中 | 不建议仅硬编码一个字体名；建议安装 Noto CJK 并把它放在字体栈前部，同时保留系统字体回退。 |

## 风险汇总

- 高风险：1 项（PDF 并发限流缺失）
- 中风险：5 项（超时颗粒度、Chromium 兜底、错误处理、HTML 注入面、中文字体策略）
- 低风险：2 项（资源释放、基础 print CSS）

## 公开页健康检查

| 页面 | HTTP | 关键字命中 | 结果 |
|---|---:|---|---|
| `/` | 200 | `Gambit`、`登录`、`注册` | 通过 |
| `/login` | 200 | `Gambit`、`登录`、`注册` | 通过 |
| `/register` | 200 | `Gambit`、`登录`、`注册` | 通过 |

## 浏览器控制台

本轮按要求使用 curl 做公开页健康检查；当前环境未使用 Browser 插件打开页面，因此未采集浏览器 console error/warning。建议 Terry 或 Trae 后续用真实浏览器人工复核 `/`、`/login`、`/register` 的 console。

## 不需要立即改的设计

- 服务端 PDF 路由已做 session + workspace ownership 校验，未暴露匿名导出。
- `safeId` 限制 reportId 字符集，可降低路径/URL 拼接滥用风险。
- `finally` 中关闭 browser 是正确方向，当前不会因常规异常长期遗留 Chromium 进程。
- A 路线（浏览器打印）和 B 路线（服务端 Puppeteer）并存合理，可以作为稳定性兜底。