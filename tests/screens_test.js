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
  // v1.3.2: a fresh browser sees only the lock screen, and the public code holds no studio data
  await pg.goto(`http://127.0.0.1:${port}/index.html`); await pg.waitForTimeout(1000);
  ok('fresh browser: lock screen', await pg.evaluate(() => /Sign in with Google/.test(document.body.innerText) && !document.querySelector('[data-act=open]')));
  ok('fresh browser: no quotes stored', await pg.evaluate(() => store.projects.length === 0));
  ok('public code has no bank numbers', await pg.evaluate(() => defaultSettings().banks.every(b => !b.accNo && !b.ifsc)));
  ok('clicks do nothing while locked', await pg.evaluate(() => { document.body.insertAdjacentHTML('beforeend', '<button id="x" data-act="go" data-r="settings"></button>'); document.getElementById('x').click(); return route.name !== 'settings'; }));
  // Sign in through a stub Drive that answers every call, as the studio account
  await pg.route('https://www.googleapis.com/**', r => r.fulfill({ status: 200, contentType: 'application/json',
    body: JSON.stringify({ id: 'x', files: [], permissions: [], modifiedTime: '2026-11-23T10:00:00.000Z', user: { emailAddress: 'vishwaafxacc@gmail.com' } }) }));
  await pg.evaluate(() => { localStorage.setItem('vfxq.token', JSON.stringify({ value: 't', scope: 'https://www.googleapis.com/auth/drive', exp: Date.now() + 3600e3 })); localStorage.setItem('vfxq.connected', 'true'); });
  await pg.reload(); await pg.waitForTimeout(1500);
  ok('allowed account: app opens', await pg.evaluate(() => unlocked() && !!document.querySelector('.topbar')));
  await pg.addScriptTag({ path: path.join(ROOT, 'tests/fixtures/sample.js') });
  await pg.evaluate(() => { sampleProjects(store); saveLocal(store); render(); });

  for (const kind of ['quote', 'supervision']) {
    await pg.evaluate(k => ACT.kind({ dataset: { v: k } }), kind); await pg.waitForTimeout(200);
    ok(`dashboard (${kind})`, await pg.evaluate(() => document.querySelectorAll('[data-act=open]').length > 0));
  }
  const projects = await pg.evaluate(() => store.projects.filter(p => !p.deleted).map(p => ({ id: p.id, name: p.name, kind: p.kind || 'quote' })));
  for (const p of projects) {
    const tabs = p.kind === 'supervision' ? [null] : ['quote', 'pay', 'terms', 'pdf', 'versions'];
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
  // v1.4.0: versions, view, compare, version PDF, and nothing hidden behind the total bar
  await pg.evaluate(() => { const p = store.projects.find(x => !x.deleted && kindOf(x) === 'quote' && x.mode !== 'tiers' && x.sections.some(s => s.lines.some(l => l.type === 'rate'))); ui.tab = 'versions'; go({ name: 'project', id: p.id, kind: 'quote' }); });
  await pg.evaluate(() => { ACT.newrev(); ACT.confirmok(); const p = curP(); const l = p.sections.flatMap(x => x.lines).find(x => x.type === 'rate'); l.sec = String(num(l.sec) + 5); touchP(p); ui.tab = 'versions'; render(); });
  ok('versions tab lists Original and R1', await pg.evaluate(() => /Original/.test(document.body.innerText) && /R1 ·/.test(document.body.innerText)));
  await pg.evaluate(() => ACT.compare());
  ok('compare shows the changed line', await pg.evaluate(() => /Changed/.test(document.getElementById('cmpout')?.innerText || '')));
  await pg.evaluate(() => { closeSheet(); ACT.viewver({ dataset: { v: '0' } }); });
  ok('view a saved version', await pg.evaluate(() => /Original/.test(document.getElementById('sheet')?.innerText || '') && !!document.querySelector('#sheet .vt')));
  await pg.evaluate(() => ACT.pdf({ dataset: { rev: '0' } })); await pg.waitForTimeout(2500);
  ok('PDF of the original version (no -R1)', await pg.evaluate(() => document.querySelectorAll('#viewer [data-pg]').length > 0 && !/-R1/.test(lastPdf.name)));
  await pg.evaluate(() => ACT.closeviewer());
  for (const t of ['quote', 'pay', 'versions']) {
    await pg.evaluate(t => { ui.tab = t; render(true); window.scrollTo(0, document.body.scrollHeight); }, t); await pg.waitForTimeout(150);
    const [last, bar] = await pg.evaluate(() => [document.querySelector('main').lastElementChild.getBoundingClientRect().bottom, document.querySelector('.bottombar').getBoundingClientRect().top]);
    ok(`${t} tab: last card clear of the total bar (${Math.round(last)} < ${Math.round(bar)})`, last <= bar);
  }
  ok('quote tab: labelled sections and column headings', await pg.evaluate(() => { ui.tab = 'quote'; render(); const t = document.body.innerText; return /DETAILS/.test(t) && /BILLS/.test(t) && /TOTALS & PAYMENTS/.test(t) && !!document.querySelector('.colh'); }));
  // v1.6.0: project page (bills collapsed, Expand all) and one project PDF
  await pg.evaluate(() => { const qs = store.projects.filter(x => !x.deleted && kindOf(x) === 'quote').slice(0, 2); qs.forEach(q => { q.groupId = qs[0].id; touchP(q); }); ui.kind = 'quote'; ui.cat = 'All'; ui.status = 'All'; ui.q = ''; go({ name: 'home', kind: 'quote' }); });
  await pg.waitForTimeout(200);
  ok('dashboard shows the project card', await pg.evaluate(() => !!document.querySelector('.gcard [data-act=opengroup]')));
  await pg.evaluate(() => document.querySelector('[data-act=opengroup]').click()); await pg.waitForTimeout(200);
  ok('project page: bills start collapsed', await pg.evaluate(() => { const d = [...document.querySelectorAll('details.bill')]; return d.length > 1 && d.every(x => !x.open); }));
  await pg.evaluate(() => document.getElementById('expandall').click());
  ok('project page: Expand all opens every bill', await pg.evaluate(() => [...document.querySelectorAll('details.bill')].every(x => x.open)));
  await pg.evaluate(() => ACT.projpdf()); await pg.waitForTimeout(3500);
  ok('project PDF builds with every quote', await pg.evaluate(() => document.querySelectorAll('#viewer [data-pg]').length >= 2 && /Project statement/.test(lastPdf.name)));
  await pg.evaluate(() => ACT.closeviewer());
  await pg.evaluate(() => go({ name: 'settings', kind: 'quote' })); await pg.waitForTimeout(300);
  ok('settings', await pg.evaluate(() => /Google Drive/.test(document.body.innerText)));
  ok('no page or console errors', errs.length === 0, JSON.stringify(errs));
  await b.close(); srv.close();
  console.log(fail ? `\n${fail} failed` : '\nALL SCREENS PASSED'); process.exit(fail ? 1 : 0);
})();
