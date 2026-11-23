/* Opens every screen at phone size and builds every PDF layout, failing on any page error.
   Run: node tests/screens_test.js   (uses the Playwright that comes with Claude Code's cloud
   container; on a computer: npm i playwright && npx playwright install chromium) */
'use strict';
const { chromium } = require('playwright');
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ttf': 'font/ttf', '.mjs': 'text/javascript' };
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
}).listen(0, '127.0.0.1');

(async () => {
  await new Promise(r => srv.listening ? r() : srv.once('listening', r));
  const port = srv.address().port;
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 390, height: 844 } });
  const errs = []; pg.on('pageerror', e => errs.push(String(e)));
  pg.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text()); });
  let fail = 0; const ok = (name, cond, extra = '') => { console.log((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : ' ' + extra)); if (!cond) fail++; };
  await pg.goto(`http://127.0.0.1:${port}/index.html`); await pg.waitForTimeout(1200);

  for (const kind of ['quote', 'supervision']) {
    await pg.evaluate(k => ACT.kind({ dataset: { v: k } }), kind); await pg.waitForTimeout(200);
    ok(`dashboard (${kind})`, await pg.evaluate(() => document.querySelectorAll('[data-act=open]').length > 0));
  }
  const projects = await pg.evaluate(() => store.projects.filter(p => !p.deleted).map(p => ({ id: p.id, name: p.name, kind: p.kind || 'quote' })));
  for (const p of projects) {
    const tabs = p.kind === 'supervision' ? [null] : ['quote', 'payments', 'terms', 'pdf'];
    for (const t of tabs) {
      await pg.evaluate(([id, kind, t]) => { ui.kind = kind; if (t) ui.tab = t; go({ name: 'project', id, kind }); }, [p.id, p.kind, t]); await pg.waitForTimeout(150);
      ok(`${p.name} · ${t || 'bill'}`, await pg.evaluate(() => document.body.innerText.length > 200));
    }
    const layouts = p.kind === 'supervision' ? [false] : [false, true];
    for (const single of layouts) {
      const size = await pg.evaluate(async ([id, single]) => { const p = store.projects.find(x => x.id === id); const keep = p.singlePage; p.singlePage = single; const bytes = await QuotePDF.build(store, p); p.singlePage = keep; return bytes.length; }, [p.id, single]);
      ok(`${p.name} · PDF ${p.kind === 'supervision' ? 'supervision bill' : single ? 'single page' : 'summary + breakdown'} (${Math.round(size / 1024)} KB)`, size > 2000);
    }
  }
  await pg.evaluate(() => { ui.tab = 'quote'; go({ name: 'project', id: store.projects.find(p => !p.deleted && (p.kind || 'quote') === 'quote').id, kind: 'quote' }); });
  await pg.evaluate(() => ACT.pdf()); await pg.waitForTimeout(2500);
  ok('PDF preview shows pages', await pg.evaluate(() => document.querySelectorAll('#viewer [data-pg]').length > 0));
  await pg.evaluate(() => ACT.closeviewer());
  await pg.evaluate(() => go({ name: 'settings', kind: 'quote' })); await pg.waitForTimeout(300);
  ok('settings', await pg.evaluate(() => /Google Drive/.test(document.body.innerText)));
  ok('no page or console errors', errs.length === 0, JSON.stringify(errs));
  await b.close(); srv.close();
  console.log(fail ? `\n${fail} failed` : '\nALL SCREENS PASSED'); process.exit(fail ? 1 : 0);
})();
