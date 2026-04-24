const fs = require('fs');
let code = fs.readFileSync('src/components/scenes/ReviewScene.tsx', 'utf8');

// 1. Import createPortal
code = code.replace(/import \{.*?\} from 'react'/, match => match.replace(/'react'/, "'react'\nimport { createPortal } from 'react-dom'"));

// 2. Add state for rightPanelNode
code = code.replace(/export default function ReviewScene.*?\{/, `$&
  const [rightNode, setRightNode] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setRightNode(document.getElementById('right-panel-container'))
  }, [])
`);

// 3. Split UI
const oldUIRegex = /<div className="flex-1 overflow-y-auto p-4 flex gap-4">\n\s*<div className="w-1\/2 flex flex-col gap-3">([\s\S]*?)<\/button>\n\s*<\/div>\n\s*<div className="w-1\/2 flex flex-col gap-3">([\s\S]*?)<\/div>\n\s*<\/div>/;

const match = code.match(oldUIRegex);
if (match) {
  const leftHalf = match[1];
  const rightHalf = match[2];
  const newUI = `<div className="flex-1 overflow-y-auto p-4 flex gap-4 w-full">
        <div className="w-full flex flex-col gap-3 max-w-3xl mx-auto">
          ${leftHalf}</button>
        </div>
        
        {rightNode && createPortal(
          <div className="w-full flex flex-col gap-3 h-full bg-gray-50/30 p-4">
            ${rightHalf}
          </div>,
          rightNode
        )}
      </div>`;
  code = code.replace(oldUIRegex, newUI);
  fs.writeFileSync('src/components/scenes/ReviewScene.tsx', code);
}
