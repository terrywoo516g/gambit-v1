
const puppeteer = require('puppeteer');

async function test() {
  console.log('=== Puppeteer 测试 ===');
  
  console.log('1. 检查 executablePath:');
  const path = puppeteer.executablePath();
  console.log('   Path:', path);
  
  const fs = require('fs');
  const exists = fs.existsSync(path);
  console.log('   Exists:', exists);
  
  console.log('2. 测试启动...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  
  console.log('3. 启动成功!');
  console.log('4. 版本:', await browser.version());
  
  console.log('5. 打开页面...');
  const page = await browser.newPage();
  
  console.log('6. 访问 gambits.top...');
  await page.goto('https://gambits.top', { waitUntil: 'networkidle0', timeout: 30000 });
  console.log('7. 访问成功!');
  
  console.log('8. 生成 PDF...');
  const pdf = await page.pdf({ format: 'A4' });
  console.log('9. PDF size:', pdf.length, 'bytes');
  
  await browser.close();
  console.log('=== 所有测试成功! ===');
  
  return true;
}

test().catch((e) => {
  console.error('ERROR:', e);
  console.error('STACK:', e.stack);
  process.exit(1);
});
