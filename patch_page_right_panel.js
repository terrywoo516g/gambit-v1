const fs = require('fs');
let code = fs.readFileSync('src/app/workspace/[id]/page.tsx', 'utf8');

const rightPanelRegex = /\{\/\* 右栏 - 最终稿和灵光一闪 \*\/\}\n\s*<div className="w-\[360px\] border-l border-gray-200 bg-white flex flex-col shrink-0 relative shadow-sm z-20">\n\s*<FinalDraftPanel workspaceId=\{workspaceId as string\} \/>\n\s*<\/div>/;

const newRightPanel = `{/* 右栏 - 最终稿和灵光一闪 */}
        <div id="right-panel-container" className="w-[360px] border-l border-gray-200 bg-white flex flex-col shrink-0 relative shadow-sm z-20">
          <div className={activeScene === 'compose' || activeScene === 'review' ? 'hidden' : 'flex flex-col h-full'}>
            <FinalDraftPanel workspaceId={workspaceId as string} />
          </div>
        </div>`;

code = code.replace(rightPanelRegex, newRightPanel);
fs.writeFileSync('src/app/workspace/[id]/page.tsx', code);
