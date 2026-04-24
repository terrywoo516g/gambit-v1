const fs = require('fs');

// BrainstormScene.tsx
let brainstorm = fs.readFileSync('src/components/scenes/BrainstormScene.tsx', 'utf8');
brainstorm = brainstorm.replace(/Loader2, /, '');
brainstorm = brainstorm.replace(/const \[generating, setGenerating\] = useState\(false\)/, '');
brainstorm = brainstorm.replace(/const \[report, setReport\] = useState<string \| null>\(null\)/, '');
fs.writeFileSync('src/components/scenes/BrainstormScene.tsx', brainstorm);

// CompareScene.tsx
let compare = fs.readFileSync('src/components/scenes/CompareScene.tsx', 'utf8');
compare = compare.replace(/Star, /, '');
compare = compare.replace(/X, /, '');
compare = compare.replace(/Loader2, /, '');
compare = compare.replace(/function toggleStar[\s\S]*?void saveSelections\(next, excluded\) \}/, '');
compare = compare.replace(/function toggleExclude[\s\S]*?void saveSelections\(starred, next\) \}/, '');
fs.writeFileSync('src/components/scenes/CompareScene.tsx', compare);

// ComposeScene.tsx
let compose = fs.readFileSync('src/components/scenes/ComposeScene.tsx', 'utf8');
compose = compose.replace(/Loader2, /, '');
compose = compose.replace(/ClipboardPaste /, 'Pin ');
fs.writeFileSync('src/components/scenes/ComposeScene.tsx', compose);

// ReviewScene.tsx
let review = fs.readFileSync('src/components/scenes/ReviewScene.tsx', 'utf8');
review = review.replace(/, Pin /, '');
review = review.replace(/"\{s.quote\}"/g, '&quot;{s.quote}&quot;');
fs.writeFileSync('src/components/scenes/ReviewScene.tsx', review);

