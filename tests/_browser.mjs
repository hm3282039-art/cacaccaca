import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

const url = process.argv[2] || 'http://127.0.0.1:3000/';
const out = process.argv[3] || '/tmp/shot.png';

const exe = await chromium.executablePath();
console.log('chromium:', exe);
const browser = await puppeteer.launch({
  args: [...chromium.args, '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox', '--disable-dev-shm-usage'],
  defaultViewport: { width: 1280, height: 800, deviceScaleFactor: 1 },
  executablePath: exe,
  headless: true,
});
const page = await browser.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}\n${e.stack}`));
page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));
await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
await new Promise((r) => setTimeout(r, 3500));
const info = await page.evaluate(() => ({
  loading: !!document.querySelector('#loading'),
  loadingText: document.querySelector('#loading')?.innerText,
  canvas: !!document.querySelector('#scene'),
  webgl: (() => { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return 'err ' + e.message; } })(),
  stats: {
    coins: document.querySelector('#stat-coins')?.textContent,
    dps: document.querySelector('#hint-dps-value')?.textContent,
    dock: document.querySelectorAll('.dock-pet').length,
    zone: document.querySelector('.zb-name')?.textContent,
  },
}));
await page.screenshot({ path: out });
console.log('INFO', JSON.stringify(info, null, 2));
console.log('LOGS:\n' + logs.join('\n'));
await browser.close();
