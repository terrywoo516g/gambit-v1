const fs = require('fs');

let compose = fs.readFileSync('src/components/scenes/ComposeScene.tsx', 'utf8');
compose = compose.replace(/export default function ComposeScene\(\{ workspaceId \}: ComposeSceneProps\) \{\n  const \[rightNode, setRightNode\] = useState<HTMLElement \| null>\(null\)\n  useEffect\(\(\) => \{\n    setRightNode\(document\.getElementById\('right-panel-container'\)\)\n  \}, \[\]\)\n workspaceId, onDraftGenerated, referencedRunIds = \[\] \}: ComposeSceneProps\) \{/, 
`export default function ComposeScene({ workspaceId, onDraftGenerated, referencedRunIds = [] }: ComposeSceneProps) {
  const [rightNode, setRightNode] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setRightNode(document.getElementById('right-panel-container'))
  }, [])`);
fs.writeFileSync('src/components/scenes/ComposeScene.tsx', compose);

let review = fs.readFileSync('src/components/scenes/ReviewScene.tsx', 'utf8');
review = review.replace(/export default function ReviewScene\(\{ workspaceId \}: ReviewSceneProps\) \{\n  const \[rightNode, setRightNode\] = useState<HTMLElement \| null>\(null\)\n  useEffect\(\(\) => \{\n    setRightNode\(document\.getElementById\('right-panel-container'\)\)\n  \}, \[\]\)\n workspaceId \}: ReviewSceneProps\) \{/, 
`export default function ReviewScene({ workspaceId, referencedRunIds = [] }: ReviewSceneProps) {
  const [rightNode, setRightNode] = useState<HTMLElement | null>(null)
  useEffect(() => {
    setRightNode(document.getElementById('right-panel-container'))
  }, [])`);
fs.writeFileSync('src/components/scenes/ReviewScene.tsx', review);
