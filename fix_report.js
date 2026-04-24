const fs = require('fs');
let code = fs.readFileSync('src/components/scenes/BrainstormScene.tsx', 'utf8');

const startIndex = code.indexOf('{report && (<div className="w-2/5');
if (startIndex !== -1) {
  const endIndex = code.indexOf('</div>)}', startIndex) + 8;
  code = code.substring(0, startIndex) + code.substring(endIndex);
}
fs.writeFileSync('src/components/scenes/BrainstormScene.tsx', code);
