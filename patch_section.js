const fs = require('fs');
let code = fs.readFileSync('src/app/workspace/[id]/page.tsx', 'utf8');

// 1. Add state maximizedRunId
const stateIndex = code.indexOf('const [activeRunId, setActiveRunId]');
if (stateIndex !== -1) {
  code = code.substring(0, stateIndex) + "const [maximizedRunId, setMaximizedRunId] = useState<string | null>(null)\n  " + code.substring(stateIndex);
}

// 2. Change section class
code = code.replace(/<section className="flex min-w-0 flex-1 flex-col">/, '<section className="flex min-w-0 flex-1 flex-col relative">');

// 3. Add onToggleMaximize to the AICard calls
code = code.replace(/<AICard key=\{run\.id\} run=\{run\} status=\{status\} content=\{content\} activeRunId=\{activeRunId\} referencedRunIds=\{referencedRunIds\} retryRun=\{retryRun\} toggleRef=\{toggleRef\} \/>/g, 
`<AICard key={run.id} run={run} status={status} content={content} activeRunId={activeRunId} referencedRunIds={referencedRunIds} retryRun={retryRun} toggleRef={toggleRef} onToggleMaximize={() => setMaximizedRunId(run.id)} />`);

code = code.replace(/<AICard run=\{run\} status=\{status\} content=\{content\} activeRunId=\{activeRunId\} referencedRunIds=\{referencedRunIds\} retryRun=\{retryRun\} toggleRef=\{toggleRef\} \/>/g, 
`<AICard run={run} status={status} content={content} activeRunId={activeRunId} referencedRunIds={referencedRunIds} retryRun={retryRun} toggleRef={toggleRef} onToggleMaximize={() => setMaximizedRunId(run.id)} />`);

// 4. Render overlay
const endSectionIndex = code.lastIndexOf('</section>');
if (endSectionIndex !== -1) {
  const overlayCode = `
        {maximizedRunId && runs.find(r => r.id === maximizedRunId) && (() => {
          const run = runs.find(r => r.id === maximizedRunId)!
          const content = getContent(run)
          const status = getStatus(run)
          return (
            <div className="absolute inset-0 z-50 bg-gray-50/90 backdrop-blur-sm p-6 flex flex-col animate-in fade-in zoom-in-95 duration-200">
              <AICard 
                key={\`max-\${run.id}\`} 
                run={run} 
                status={status} 
                content={content} 
                activeRunId={activeRunId} 
                referencedRunIds={referencedRunIds} 
                retryRun={retryRun} 
                toggleRef={toggleRef} 
                isMaximized={true}
                onToggleMaximize={() => setMaximizedRunId(null)}
              />
            </div>
          )
        })()}
      `;
  code = code.substring(0, endSectionIndex) + overlayCode + code.substring(endSectionIndex);
}

fs.writeFileSync('src/app/workspace/[id]/page.tsx', code);
