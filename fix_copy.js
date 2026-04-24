const fs = require('fs');
let code = fs.readFileSync('src/components/scenes/BrainstormScene.tsx', 'utf8');
code = code.replace(/Copy, /, '');
code = code.replace(/, Copy/, '');
fs.writeFileSync('src/components/scenes/BrainstormScene.tsx', code);
