const fs = require('fs');
let code = fs.readFileSync('src/components/scenes/CompareScene.tsx', 'utf8');
const startIndex = code.indexOf('{report && (<div');
if (startIndex !== -1) {
  const endIndex = code.indexOf('</div></div>)}', startIndex);
  if (endIndex !== -1) {
    code = code.substring(0, startIndex) + code.substring(endIndex + 14);
  }
}
fs.writeFileSync('src/components/scenes/CompareScene.tsx', code);
