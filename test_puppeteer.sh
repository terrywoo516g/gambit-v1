#!/bin/bash

cd /home/ubuntu/gambit-v1

echo "=== 单独测试 Puppeteer ==="

cat > /tmp/test_puppeteer.js << 'EOF'
const puppeteer = require('puppeteer');

async function test() {
  console.log('1. 检查路径');
  const expectedPath = puppeteer.executablePath();
  console.log('   Path:', expectedPath);

  const fs = require('fs');
  if (!fs.existsSync(expectedPath)) {
    console.log('   ❌ 路径不存在');
    return 1;
  }
  console.log('   ✅ 路径存在');

  console.log('\n2. 测试启动');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  console.log('   ✅ 启动成功');

  console.log('\n3. 获取版本');
  const version = await browser.version();
  console.log('   Version:', version);

  console.log('\n4. 打开新页面');
  const page = await browser.newPage();
  console.log('   ✅ 页面打开成功');

  console.log('\n5. 访问本地测试页面');
  await page.goto('https://example.com', { waitUntil: 'networkidle0' });
  console.log('   ✅ 页面加载成功');

  console.log('\n6. 生成 PDF');
  const pdf = await page.pdf({ format: 'A4' });
  console.log('   ✅ PDF 生成成功，大小:', pdf.length, 'bytes');

  fs.writeFileSync('/tmp/example.pdf', pdf);
  console.log('   ✅ PDF 保存到 /tmp/example.pdf');

  await browser.close();
  console.log('\n✅ 所有测试通过');
  return 0;
}

test().catch(e => {
  console.error('\n❌ 测试失败:', e.message);
  console.error(e.stack);
  process.exit(1);
});
EOF

echo
node /tmp/test_puppeteer.js 2>&1

echo
ls -lh /tmp/example.pdf 2>/dev/null
