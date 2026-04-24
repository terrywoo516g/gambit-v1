const fs = require('fs');
let content = fs.readFileSync('src/app/workspace/[id]/page.tsx', 'utf8');
content = content.replace(/\{\/\* 全局总结卡 \*\/\}[\s\S]*?\}\) : null\}\s*<\/div>\s*\)\}/g, '');
fs.writeFileSync('src/app/workspace/[id]/page.tsx', content);
