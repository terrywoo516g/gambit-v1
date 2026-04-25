const fs = require('fs');
let code = fs.readFileSync('src/app/api/workspaces/[id]/final-draft/compose/route.ts', 'utf8');

code = code.replace(
  /blocks\.map\(b =>/g,
  `blocks.map((b: any) =>`
);

fs.writeFileSync('src/app/api/workspaces/[id]/final-draft/compose/route.ts', code);
