const fs = require('fs');
let code = fs.readFileSync('src/components/scenes/ComposeScene.tsx', 'utf8');

code = code.replace(/import \{ useEffect, useState \} from 'react'/, "import { useEffect, useState, useRef } from 'react'");
code = code.replace(/\nimport \{ useRef \} from 'react'/, '');

fs.writeFileSync('src/components/scenes/ComposeScene.tsx', code);
