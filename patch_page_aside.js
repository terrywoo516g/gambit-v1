const fs = require('fs');
let code = fs.readFileSync('src/app/workspace/[id]/page.tsx', 'utf8');

code = code.replace(
  /<aside className="hidden lg:flex w-96 border-l border-gray-200 bg-white flex flex-col relative z-10 shrink-0 shadow-\[-4px_0_24px_-8px_rgba\(0,0,0,0\.05\)\]">/,
  '<aside id="right-panel-container" className="hidden lg:flex w-96 border-l border-gray-200 bg-white flex flex-col relative z-10 shrink-0 shadow-[-4px_0_24px_-8px_rgba(0,0,0,0.05)]">'
);

fs.writeFileSync('src/app/workspace/[id]/page.tsx', code);
