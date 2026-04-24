const fs = require('fs');
let content = fs.readFileSync('src/app/workspace/[id]/page.tsx', 'utf8');

content = content.replace(/const \[summaryData, setSummaryData\] = useState<.*?\| null>\(null\)\n  const \[summaryLoading, setSummaryLoading\] = useState\(false\)\n/g, '');

content = content.replace(/\/\/ Monitor modelRuns completion for Summary Card[\s\S]*?}, \[workspace, summaryData, summaryLoading, wsId, allDone, completedCount, streams\]\)/g, '');

fs.writeFileSync('src/app/workspace/[id]/page.tsx', content);
