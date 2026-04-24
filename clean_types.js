const fs = require('fs');
let code = fs.readFileSync('src/app/workspace/[id]/page.tsx', 'utf8');
code = code.replace(/import \{.*?Target.*?\} from 'lucide-react'/, match => match.replace(/,\s*Target/, '').replace(/Target,\s*/, ''));
code = code.replace(/type Observation = \{\n  id: string\n  type: string\n  content: string\n\}\n/, '');
fs.writeFileSync('src/app/workspace/[id]/page.tsx', code);
