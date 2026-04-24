const fs = require('fs');
let code = fs.readFileSync('src/components/scenes/BrainstormScene.tsx', 'utf8');
code = code.replace(/import ReactMarkdown from 'react-markdown'\n/, '');
code = code.replace(/import remarkGfm from 'remark-gfm'\n/, '');
code = code.replace(/, Copy/, '');
fs.writeFileSync('src/components/scenes/BrainstormScene.tsx', code);
