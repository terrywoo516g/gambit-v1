const fs = require('fs');
let code = fs.readFileSync('src/components/scenes/ComposeScene.tsx', 'utf8');

// 1. imports
code = code.replace(
  /import \{ Copy, Pencil, RotateCcw, Pin \} from 'lucide-react'/,
  `import { Copy, Pencil, RotateCcw, Pin, Upload } from 'lucide-react'\nimport { useRef } from 'react'`
);

// 2. add states and refs
const stateRegex = /const \[templateExtra, setTemplateExtra\] = useState\(''\)/;
code = code.replace(
  stateRegex,
  `const [templateExtra, setTemplateExtra] = useState('')\n  const [customFileContent, setCustomFileContent] = useState('')\n  const fileInputRef = useRef<HTMLInputElement>(null)`
);

// 3. add handleFileUpload
const handleGenerateRegex = /async function handleGenerate\(\) \{/;
code = code.replace(
  handleGenerateRegex,
  `function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      if (ev.target?.result) {
        setCustomFileContent(ev.target.result as string)
      }
    }
    reader.readAsText(file)
  }

  async function handleGenerate() {`
);

// 4. include customFileContent in the payload
const fetchRegex = /editedRows: \{ title: templateTitle, structure: templateStructure, body: templateBody, extra: templateExtra \}/;
code = code.replace(
  fetchRegex,
  `editedRows: { title: templateTitle, structure: templateStructure, body: templateBody, extra: templateExtra, customFile: customFileContent }`
);

// 5. add UI
const rightPanelRegex = /<div><label className="flex items-center gap-2 text-xs font-medium text-ink mb-1\.5"><span className="w-5 h-5 rounded bg-gray-400 text-white flex items-center justify-center text-xs">\+<\/span>补充要求（可选）<\/label><textarea value=\{templateExtra\}.*?<\/div>/;

const newUI = `<div><label className="flex items-center gap-2 text-xs font-medium text-ink mb-1.5"><span className="w-5 h-5 rounded bg-gray-400 text-white flex items-center justify-center text-xs">+</span>补充要求（可选）</label><textarea value={templateExtra} onChange={e => setTemplateExtra(e.target.value)} placeholder="对最终稿的额外要求，如风格、字数、语气..." className="w-full min-h-[80px] p-3 border border-gray-200 rounded-lg text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white resize-y" /></div>
              <div className="pt-4 border-t border-gray-100 mt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-ink"><span className="w-5 h-5 rounded bg-gray-400 text-white flex items-center justify-center text-xs">📎</span>自定义文件</label>
                  <input type="file" accept=".txt,.md" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                  <button onClick={() => fileInputRef.current?.click()} className="text-xs text-accent hover:text-accent/80 flex items-center gap-1"><Upload className="w-3 h-3" />上传文件</button>
                </div>
                <textarea value={customFileContent} onChange={e => setCustomFileContent(e.target.value)} placeholder="上传的文档内容会显示在这里，你也可以直接修改..." className="w-full min-h-[200px] p-3 border border-gray-200 rounded-lg text-xs outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition bg-white resize-y" />
              </div>`;

code = code.replace(rightPanelRegex, newUI);

fs.writeFileSync('src/components/scenes/ComposeScene.tsx', code);
