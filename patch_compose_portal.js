const fs = require('fs');
let code = fs.readFileSync('src/components/scenes/ComposeScene.tsx', 'utf8');

// 1. Import createPortal
code = code.replace(/import \{.*?\} from 'react'/, match => match.replace(/'react'/, "'react'\nimport { createPortal } from 'react-dom'"));

// 2. Add state for rightPanelNode
code = code.replace(/export default function ComposeScene.*?\{/, `$&
  const [rightNode, setRightNode] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setRightNode(document.getElementById('right-panel-container'))
  }, [])
`);

// 3. Split UI
const oldUIRegex = /<div className="flex-1 flex overflow-hidden">\n\s*<div className="w-1\/2 border-r border-gray-200 flex flex-col bg-gray-50\/50 p-4 gap-4 overflow-y-auto">([\s\S]*?)<\/div>\n\s*<div className="w-1\/2 flex flex-col bg-gray-50\/30">([\s\S]*?)<\/div>\n\s*<\/div>/;

const match = code.match(oldUIRegex);
if (match) {
  const leftHalf = match[1];
  const rightHalf = match[2];
  const newUI = `<div className="flex-1 flex overflow-hidden">
        <div className="w-full flex flex-col bg-gray-50/50 p-4 gap-4 overflow-y-auto">
          ${leftHalf}
        </div>
        {rightNode && createPortal(
          <div className="flex flex-col h-full bg-gray-50/30 w-full">
            ${rightHalf}
          </div>,
          rightNode
        )}
      </div>`;
  code = code.replace(oldUIRegex, newUI);
  fs.writeFileSync('src/components/scenes/ComposeScene.tsx', code);
}
