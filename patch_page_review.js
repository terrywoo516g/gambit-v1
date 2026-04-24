const fs = require('fs');
let code = fs.readFileSync('src/app/workspace/[id]/page.tsx', 'utf8');

code = code.replace(/  function enterScene\(key: SceneKey\) \{\n    if \(key === 'review'\) \{\n      window\.dispatchEvent\(new CustomEvent\('gambit:open-review-mode'\)\)\n      return\n    \}\n    setActiveScene\(key\)\n    setActiveStep\('scene'\)\n  \}/, 
`  function enterScene(key: SceneKey) {
    setActiveScene(key)
    setActiveStep('scene')
  }`);

fs.writeFileSync('src/app/workspace/[id]/page.tsx', code);
