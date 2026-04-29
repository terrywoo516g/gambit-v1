#!/bin/bash

cd /home/ubuntu/gambit-v1

echo "=== Step 3: 检查 Puppeteer ==="

echo "--- Check 1: 预期 Chromium 路径 ---"
node -e "
const p = require('puppeteer');
try {
  const path = p.executablePath();
  console.log('expected path:', path);
  const fs = require('fs');
  fs.accessSync(path);
  console.log('file exists');
} catch (e) {
  console.error('ERROR:', e.message);
  console.error('Stack:', e.stack);
}
"

echo "--- Check 2: 测试启动 ---"
node -e "
(async () => {
  try {
    const p = require('puppeteer');
    console.log('Launching...');
    const b = await p.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('launched OK, version:', await b.version());
    await b.close();
    console.log('closed OK');
  } catch (e) {
    console.error('LAUNCH FAILED:', e.message);
    console.error('Stack:', e.stack);
    process.exit(1);
  }
})();
"

echo "--- Check 3: 检查系统路径 ---"
ls -la /usr/bin/ 2>/dev/null | head -30
ls -la /snap/bin/ 2>/dev/null | head -10

echo "--- Check 4: 检查系统依赖 ---"
ldd --version 2>/dev/null
dpkg -l libnss3 2>/dev/null
