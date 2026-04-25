const fs = require('fs');

const file1 = 'src/app/api/workspaces/[id]/final-draft/generate/route.ts';
let code1 = fs.readFileSync(file1, 'utf8');
code1 = code1.replace(
  /workspace\.chatMessages\.reverse\(\)\.map\(m =>/g,
  `workspace.chatMessages.reverse().map((m: any) =>`
);
code1 = code1.replace(
  /blocks\.map\(b =>/g,
  `blocks.map((b: any) =>`
);
fs.writeFileSync(file1, code1);

const file2 = 'src/app/api/workspaces/[id]/spark/route.ts';
let code2 = fs.readFileSync(file2, 'utf8');
code2 = code2.replace(
  /runs\.map\(r =>/g,
  `runs.map((r: any) =>`
);
fs.writeFileSync(file2, code2);

const file3 = 'src/app/api/workspaces/[id]/final-draft/polish/route.ts';
if (fs.existsSync(file3)) {
  let code3 = fs.readFileSync(file3, 'utf8');
  code3 = code3.replace(
    /blocks\.map\(b =>/g,
    `blocks.map((b: any) =>`
  );
  fs.writeFileSync(file3, code3);
}

const file4 = 'src/app/api/workspaces/[id]/final-draft/spark/route.ts';
if (fs.existsSync(file4)) {
  let code4 = fs.readFileSync(file4, 'utf8');
  code4 = code4.replace(
    /blocks\.map\(b =>/g,
    `blocks.map((b: any) =>`
  );
  fs.writeFileSync(file4, code4);
}

