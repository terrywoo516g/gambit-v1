const fs = require('fs');
let code = fs.readFileSync('src/app/api/workspaces/[id]/stream-all/route.ts', 'utf8');

// The original logic assumes 'error' is caught directly or throws:
// if (chunk.type === 'error') {
//   throw new Error(chunk.data || 'Stream error from LLM')
// }
// 
// Let's modify stream-all/route.ts to safely handle error without crashing loop,
// and make sure the prompt uses right key.

code = code.replace(
  /throw new Error\(chunk\.data \|\| 'Stream error from LLM'\)/g,
  `throw new Error(String(chunk.data) || 'Stream error from LLM')`
);

fs.writeFileSync('src/app/api/workspaces/[id]/stream-all/route.ts', code);
