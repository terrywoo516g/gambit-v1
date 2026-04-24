const fs = require('fs')
let code = fs.readFileSync('src/app/workspace/[id]/page.tsx', 'utf8')

// Replace mapping block 1 (expanded cards in list)
code = code.replace(
  /<div className="bg-white border border-gray-200 rounded-2xl flex flex-col shadow-sm" style={{ minHeight: '180px', maxHeight: '320px' }}>[\s\S]*?加入最终稿\s*<\/button>\s*<\/div>\s*<\/div>\s*\)}/g,
  '<AICard run={run} status={status} content={content} activeRunId={activeRunId} referencedRunIds={referencedRunIds} retryRun={retryRun} toggleRef={toggleRef} />'
)

// Replace mapping block 2 (grid cards)
code = code.replace(
  /<div key={run\.id} id=\{'run-' \+ run\.id\}[\s\S]*?className=\{\`bg-white border rounded-2xl flex flex-col shadow-sm transition \$\{[\s\S]*?加入最终稿\s*<\/button>\s*<\/div>\s*<\/div>\s*\)}/g,
  '<AICard key={run.id} run={run} status={status} content={content} activeRunId={activeRunId} referencedRunIds={referencedRunIds} retryRun={retryRun} toggleRef={toggleRef} />'
)

fs.writeFileSync('src/app/workspace/[id]/page.tsx', code)
