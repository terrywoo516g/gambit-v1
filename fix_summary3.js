const fs = require('fs')
let code = fs.readFileSync('src/app/workspace/[id]/page.tsx', 'utf8')

// Remove SHOW_SUMMARY
code = code.replace(/const SHOW_SUMMARY = true\n\n/g, '')

// Remove states
code = code.replace(/  \/\/ 全局总结卡状态\n  const \[summaryData, setSummaryData\] = useState<.*?\| null>\(null\)\n  const \[summaryLoading, setSummaryLoading\] = useState\(false\)\n\n/g, '')

// Remove useEffect
code = code.replace(/  \/\/ Monitor modelRuns completion for Summary Card[\s\S]*?fetchSummary\(\)\n    \}\n  \}, \[.*?\]\)\n\n/g, '')

// Remove summaryCache loading
code = code.replace(/        if \(wsData\.workspace\.summaryCache\) \{\n          try \{\n            setSummaryData\(JSON\.parse\(wsData\.workspace\.summaryCache\)\)\n          \} catch \{\}\n        \}\n/g, '')

// Remove UI
code = code.replace(/            \{\/\* 全局总结卡 \*\/\}\n            \{SHOW_SUMMARY && \(summaryLoading \|\| summaryData\) && \([\s\S]*?\) : null\}\n              <\/div>\n            \)\}\n\n/g, '')

fs.writeFileSync('src/app/workspace/[id]/page.tsx', code)
