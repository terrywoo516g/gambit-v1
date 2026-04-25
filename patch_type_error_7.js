const fs = require('fs');

const file1 = 'src/app/api/workspaces/[id]/final-draft/spark/route.ts';
let code1 = fs.readFileSync(file1, 'utf8');
code1 = code1.replace(
  /workspace\.modelRuns\.map\(run =>/g,
  `workspace.modelRuns.map((run: any) =>`
);
fs.writeFileSync(file1, code1);

