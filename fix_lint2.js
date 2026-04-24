const fs = require('fs');

// BrainstormScene.tsx
let brainstorm = fs.readFileSync('src/components/scenes/BrainstormScene.tsx', 'utf8');
brainstorm = brainstorm.replace(/, onDraftGenerated/, '');
fs.writeFileSync('src/components/scenes/BrainstormScene.tsx', brainstorm);

// CompareScene.tsx
let compare = fs.readFileSync('src/components/scenes/CompareScene.tsx', 'utf8');
compare = compare.replace(/const \[starred, setStarred\] = useState<string\[\]>\(\[\]\)/, 'const [starred] = useState<string[]>([])');
compare = compare.replace(/const \[excluded, setExcluded\] = useState<string\[\]>\(\[\]\)/, 'const [excluded] = useState<string[]>([])');
compare = compare.replace(/async function saveSelections[\s\S]*?body: JSON.stringify\(\{ starred: s, excluded: e \}\) \}\)\n  \}/, '');
fs.writeFileSync('src/components/scenes/CompareScene.tsx', compare);

// ReviewScene.tsx
let review = fs.readFileSync('src/components/scenes/ReviewScene.tsx', 'utf8');
review = review.replace(/} catch \(err\) {/, '} catch {');
fs.writeFileSync('src/components/scenes/ReviewScene.tsx', review);

