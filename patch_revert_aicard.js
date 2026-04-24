const fs = require('fs');
let code = fs.readFileSync('src/app/workspace/[id]/page.tsx', 'utf8');

// 还原 overflow-hidden
code = code.replace(
  /<div className="px-4 py-3 flex-1 text-sm flex flex-col overflow-hidden">/,
  '<div className="px-4 py-3 flex-1 text-sm flex flex-col">'
);

// 还原 style 和 className
code = code.replace(
  /<div className=\{\`overflow-y-auto \$\{status === 'streaming' \|\| status === 'running' \? 'streaming-cursor' : ''\}\`\} style=\{isMaximized \? \{ height: '100%' \} : \(expanded \? \{ maxHeight: '280px' \} : undefined\)}>/,
  '<div className={`overflow-y-auto ${status === \'streaming\' || status === \'running\' ? \'streaming-cursor\' : \'\'}`} style={expanded ? { maxHeight: \'280px\' } : undefined}>'
);

// 还原收起按钮
code = code.replace(
  /\{content\.length > 68 && !isMaximized && \(/,
  '{content.length > 68 && ('
);

fs.writeFileSync('src/app/workspace/[id]/page.tsx', code);
