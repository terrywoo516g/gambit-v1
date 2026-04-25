const fs = require('fs');

const file1 = 'src/app/api/workspaces/[id]/final-draft/generate/route.ts';
let code1 = fs.readFileSync(file1, 'utf8');
code1 = code1.replace(
  /blocks\.filter\(b =>/g,
  `blocks.filter((b: any) =>`
);
fs.writeFileSync(file1, code1);

const file2 = 'src/app/api/workspaces/[id]/final-draft/polish/route.ts';
if (fs.existsSync(file2)) {
  let code2 = fs.readFileSync(file2, 'utf8');
  code2 = code2.replace(
    /blocks\.filter\(b =>/g,
    `blocks.filter((b: any) =>`
  );
  fs.writeFileSync(file2, code2);
}
