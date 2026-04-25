const fs = require('fs');
let code = fs.readFileSync('src/app/api/workspaces/[id]/chat/stream/route.ts', 'utf8');

code = code.replace(
  /workspace\.chatMessages\.reverse\(\)\.map\(m =>/g,
  `workspace.chatMessages.reverse().map((m: any) =>`
);

fs.writeFileSync('src/app/api/workspaces/[id]/chat/stream/route.ts', code);
