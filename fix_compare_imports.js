const fs = require('fs');
let code = fs.readFileSync('src/components/scenes/CompareScene.tsx', 'utf8');

code = code.replace(/import ReactMarkdown from 'react-markdown'\n/, '');
code = code.replace(/import remarkGfm from 'remark-gfm'\n/, '');
code = code.replace(/Copy, /, '');

fs.writeFileSync('src/components/scenes/CompareScene.tsx', code);
