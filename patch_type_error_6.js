const fs = require('fs');

const file1 = 'src/app/api/workspaces/[id]/final-draft/generate/route.ts';
let code1 = fs.readFileSync(file1, 'utf8');
code1 = code1.replace(
  /workspace\.sceneSessions\.flatMap\(s =>/g,
  `workspace.sceneSessions.flatMap((s: any) =>`
);
code1 = code1.replace(
  /\.sort\(\(a, b\) =>/g,
  `.sort((a: any, b: any) =>`
);
fs.writeFileSync(file1, code1);

