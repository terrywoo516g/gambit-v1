const fs = require('fs');
let code = fs.readFileSync('src/app/api/workspaces/[id]/chat/stream/route.ts', 'utf8');

code = code.replace(
  /workspace\.chatMessages\.filter\(m => m\.role === 'user'\)/g,
  `workspace.chatMessages.filter((m: any) => m.role === 'user')`
);

fs.writeFileSync('src/app/api/workspaces/[id]/chat/stream/route.ts', code);
