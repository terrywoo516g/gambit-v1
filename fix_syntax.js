const fs = require('fs');
let compose = fs.readFileSync('src/components/scenes/ComposeScene.tsx', 'utf8');
compose = compose.replace(/export default function ComposeScene\(\{[\s\S]*?const \[rightNode, setRightNode\] = useState<HTMLElement \| null>\(null\)\n  useEffect\(\(\) => \{\n    setRightNode\(document\.getElementById\('right-panel-container'\)\)\n  \}, \[\]\)/, 
`export default function ComposeScene({ workspaceId }: ComposeSceneProps) {
  const [rightNode, setRightNode] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setRightNode(document.getElementById('right-panel-container'))
  }, [])`);
fs.writeFileSync('src/components/scenes/ComposeScene.tsx', compose);

let review = fs.readFileSync('src/components/scenes/ReviewScene.tsx', 'utf8');
review = review.replace(/export default function ReviewScene\(\{[\s\S]*?const \[rightNode, setRightNode\] = useState<HTMLElement \| null>\(null\)\n  useEffect\(\(\) => \{\n    setRightNode\(document\.getElementById\('right-panel-container'\)\)\n  \}, \[\]\)/, 
`export default function ReviewScene({ workspaceId }: ReviewSceneProps) {
  const [rightNode, setRightNode] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setRightNode(document.getElementById('right-panel-container'))
  }, [])`);
fs.writeFileSync('src/components/scenes/ReviewScene.tsx', review);
