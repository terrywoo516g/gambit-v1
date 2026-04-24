const fs = require('fs');
let code = fs.readFileSync('src/components/scenes/BrainstormScene.tsx', 'utf8');
code = code.replace(/disabled=\{generating\}/g, '');
code = code.replace(/\{generating \? '生成中\.\.\.' : '生成决策建议'\}/g, "'生成决策建议'");
fs.writeFileSync('src/components/scenes/BrainstormScene.tsx', code);
