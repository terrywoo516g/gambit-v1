const fs = require('fs')
let code = fs.readFileSync('src/app/workspace/[id]/page.tsx', 'utf8')

// 1. Remove SHOW_SUMMARY
code = code.replace(/const SHOW_SUMMARY = true\n\n/, '')

// 2. Remove states
code = code.replace(/  \/\/ 全局总结卡状态\n  const \[summaryData, setSummaryData\] = useState<{ consensus: string\[\], divergence: string, takeaway: string } \| null>\(null\)\n  const \[summaryLoading, setSummaryLoading\] = useState\(false\)\n\n/, '')

// 3. Remove useEffect for fetchSummary
const useEffectRegex = /  \/\/ Monitor modelRuns completion for Summary Card\n  useEffect\(\(\) => \{\n    if \(\!SHOW_SUMMARY.*?\}\n      fetchSummary\(\)\n    \}\n  \}, \[workspace, summaryData, summaryLoading, wsId, allDone\]\)\n\n/s
code = code.replace(useEffectRegex, '')

// 4. Remove summaryCache loading
const summaryCacheRegex = /        if \(wsData\.workspace\.summaryCache\) \{\n          try \{\n            setSummaryData\(JSON\.parse\(wsData\.workspace\.summaryCache\)\)\n          \} catch \{\}\n        \}\n/
code = code.replace(summaryCacheRegex, '')

// 5. Remove UI
const uiRegex = /            \{\/\* 全局总结卡 \*\/\}\n            \{SHOW_SUMMARY && \(summaryLoading \|\| summaryData\) && \(\n.*?\}\) : null\}\n              <\/div>\n            \)\}\n\n/s
code = code.replace(uiRegex, '')

fs.writeFileSync('src/app/workspace/[id]/page.tsx', code)
