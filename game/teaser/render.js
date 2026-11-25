// Renders teaser.html to PNG frames: node render.js <outDir> [contact]
const {chromium} = require('playwright');
(async () => {
  const out = process.argv[2], contact = process.argv[3] || '';
  const b = await chromium.launch({args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--allow-file-access-from-files']});
  const p = await b.newPage({viewport: {width: 1280, height: 720}});
  await p.goto('file://' + __dirname + '/' + (process.env.PAGE || 'teaser.html') + (contact ? '?c=' + encodeURIComponent(contact) : ''));
  await p.waitForTimeout(800);
  for (let i = 0; i < 300; i++) {
    await p.evaluate(t => renderAt(t), i / 30);
    await p.screenshot({path: `${out}/f${String(i).padStart(3, '0')}.png`});
  }
  await b.close();
})();
