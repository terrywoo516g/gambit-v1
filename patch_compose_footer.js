const fs = require('fs');
let code = fs.readFileSync('src/components/scenes/ComposeScene.tsx', 'utf8');

const oldHeader = /<div className="flex items-center gap-3">\s*<button onClick=\{\(\) => navigator\.clipboard\.writeText\(output\.content\)\} className="text-xs text-inkLight hover:text-accent flex items-center gap-1"><Copy className="w-3 h-3" \/>复制全文<\/button>\s*<button onClick=\{\(\) => window\.dispatchEvent\(new CustomEvent\('gambit:pin-to-draft', \{ detail: \{ sourceType: 'compose', sourceId: \`compose-\$\{output\.model\}\`, sourceLabel: output\.model, content: output\.content \} \}\)\)\} className="text-xs text-inkLight hover:text-accent flex items-center gap-1"><Pin className="w-3 h-3" \/>加入素材库<\/button>\s*<\/div>/g;

code = code.replace(oldHeader, '');

const oldBody = /<div className="p-4 overflow-y-auto max-h-\[300px\] text-sm text-ink">\s*<div className="prose prose-sm max-w-none"><ReactMarkdown remarkPlugins=\{\[remarkGfm\]\}>\{output\.content\}<\/ReactMarkdown><\/div>\s*<\/div>/g;

const newBody = `<div className="p-4 overflow-y-auto max-h-[300px] text-xs text-ink">
                <div className="prose prose-sm max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]}>{output.content}</ReactMarkdown></div>
              </div>
              <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 shrink-0 rounded-b-xl">
                <button onClick={() => navigator.clipboard.writeText(output.content)} className="text-xs text-inkLight hover:text-accent flex items-center gap-1"><Copy className="w-3 h-3" />复制全文</button>
                <button onClick={() => window.dispatchEvent(new CustomEvent('gambit:pin-to-draft', { detail: { sourceType: 'compose', sourceId: \`compose-\${output.model}\`, sourceLabel: output.model, content: output.content } }))} className="text-xs text-inkLight hover:text-accent flex items-center gap-1"><Pin className="w-3 h-3" />加入素材库</button>
              </div>`;

code = code.replace(oldBody, newBody);

fs.writeFileSync('src/components/scenes/ComposeScene.tsx', code);
