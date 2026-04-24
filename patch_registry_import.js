const fs = require('fs');
let code = fs.readFileSync('src/app/api/workspaces/[id]/stream-all/route.ts', 'utf8');

// replace provider retrieval, in case CLIENT_REGISTRY is undefined for some models
code = code.replace(
  /provider: CLIENT_REGISTRY\[run\.model\]\?\.provider \|\| 'qiniu',/g,
  `provider: (CLIENT_REGISTRY[run.model]?.provider || modelInfo.provider?.toLowerCase() === 'volcano' ? 'volcano' : 'qiniu') as any,`
);

fs.writeFileSync('src/app/api/workspaces/[id]/stream-all/route.ts', code);
