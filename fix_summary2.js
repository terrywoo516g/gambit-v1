const fs = require('fs')
let code = fs.readFileSync('src/app/workspace/[id]/page.tsx', 'utf8')

// Remove useEffect
const useEffectRegex = /  \/\/ Monitor modelRuns completion for Summary Card\n  useEffect\(\(\) => \{\n    if \(\!SHOW_SUMMARY.*?\}\n      fetchSummary\(\)\n    \}\n  \}, \[.*?\]\)\n\n/s
code = code.replace(useEffectRegex, '')

fs.writeFileSync('src/app/workspace/[id]/page.tsx', code)
