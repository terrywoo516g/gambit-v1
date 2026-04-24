const fs = require('fs')
let code = fs.readFileSync('src/app/workspace/[id]/page.tsx', 'utf8')

const startIndex = code.indexOf('{/* 全局总结卡 */}')
if (startIndex !== -1) {
  const endIndex = code.indexOf('              {isCardsCollapsed ? (', startIndex)
  if (endIndex !== -1) {
    code = code.slice(0, startIndex) + code.slice(endIndex)
  }
}

fs.writeFileSync('src/app/workspace/[id]/page.tsx', code)
