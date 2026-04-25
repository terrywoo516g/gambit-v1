const fs = require('fs');

const file1 = 'src/app/api/workspaces/[id]/stream-all/route.ts';
let code1 = fs.readFileSync(file1, 'utf8');
code1 = code1.replace(
  /allRuns\.map\(async \(run\) =>/g,
  `allRuns.map(async (run: any) =>`
);
code1 = code1.replace(
  /currentRuns\.every\(\s*\(r\)/g,
  `currentRuns.every((r: any)`
);
fs.writeFileSync(file1, code1);

const file2 = 'src/app/api/workspaces/[id]/scenes/compare/init/route.ts';
if (fs.existsSync(file2)) {
  let code2 = fs.readFileSync(file2, 'utf8');
  code2 = code2.replace(/runs\.map\(r =>/g, `runs.map((r: any) =>`);
  code2 = code2.replace(/runs\.filter\(r =>/g, `runs.filter((r: any) =>`);
  fs.writeFileSync(file2, code2);
}

const file3 = 'src/app/api/workspaces/[id]/scenes/compose/init/route.ts';
if (fs.existsSync(file3)) {
  let code3 = fs.readFileSync(file3, 'utf8');
  code3 = code3.replace(/runs\.map\(r =>/g, `runs.map((r: any) =>`);
  code3 = code3.replace(/runs\.filter\(r =>/g, `runs.filter((r: any) =>`);
  fs.writeFileSync(file3, code3);
}

const file4 = 'src/app/api/workspaces/[id]/scenes/brainstorm/init/route.ts';
if (fs.existsSync(file4)) {
  let code4 = fs.readFileSync(file4, 'utf8');
  code4 = code4.replace(/runs\.map\(r =>/g, `runs.map((r: any) =>`);
  code4 = code4.replace(/runs\.filter\(r =>/g, `runs.filter((r: any) =>`);
  fs.writeFileSync(file4, code4);
}
