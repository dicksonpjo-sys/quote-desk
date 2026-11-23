"""Two-account Google Drive simulation for Quote Desk.
Fakes the Drive API in the browser and checks sharing, merge, backups, restore, PDF save,
the owner move (v1.3.0) and the access manager (v1.3.1).
Run from anywhere:  python3 tests/drive_sim_test.py
Needs: pip install playwright && python3 -m playwright install chromium"""
import asyncio, json, os, re, subprocess, sys, time, itertools, urllib.parse as up
from datetime import datetime, timedelta, timezone
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
srv = subprocess.Popen([sys.executable, '-m', 'http.server', '8767', '--bind', '127.0.0.1'], cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)
DRIVE = {}   # id -> file
IDS = itertools.count(1)
CLOCK = itertools.count(1)
TOK = {'tok_v': 'vishwaafx@gmail.com', 'tok_d': 'dicksonpjo@gmail.com', 'tok_a': 'vishwaafxacc@gmail.com'}
FOLDER = 'application/vnd.google-apps.folder'

def mtime(): return '2026-10-26T10:%02d:%02d.000Z' % divmod(next(CLOCK), 60)
PIDS = itertools.count(1)
def role(f, me):  # best role `me` has on f, inherited from parent folders as on Drive
    x, best = f, None
    while x:
        if x['owner'] == me: return 'owner'
        for p in x['perms']:
            if p['email'] == me and (best is None or p['role'] == 'writer'): best = p['role']
        x = DRIVE.get(x['parents'][0]) if x['parents'] and x['parents'][0] != 'root' else None
    return best
def visible(f, me): return role(f, me) is not None
def can_edit(f, me): return role(f, me) in ('owner', 'writer')
def meta(f, me):
    return {'id': f['id'], 'name': f['name'], 'modifiedTime': f['mt'], 'createdTime': f['ct'], 'ownedByMe': f['owner'] == me,
            'owners': [{'emailAddress': f['owner']}], 'parents': f['parents'], 'mimeType': f['mime'], 'capabilities': {'canEdit': can_edit(f, me)}}
def match(f, q, me):
    for cl in [c.strip() for c in q.split(' and ')]:
        m = re.fullmatch(r"name='(.*)'", cl)
        if m and f['name'] != m.group(1).replace("\\'", "'"): return False
        m = re.fullmatch(r"name contains '(.*)'", cl)
        if m and m.group(1) not in f['name']: return False
        if cl == 'trashed=false' and f.get('trashed'): return False
        m = re.fullmatch(r"mimeType='(.*)'", cl)
        if m and f['mime'] != m.group(1): return False
        m = re.fullmatch(r"'(.*)' in parents", cl)
        if m:
            pid = m.group(1)
            if pid == 'root':
                if not (f['parents'] == ['root'] and f['owner'] == me): return False
            elif pid not in f['parents']: return False
    return True
def new(name, mime, parent, me, content=None):
    i = 'f%d' % next(IDS); t = mtime()
    DRIVE[i] = {'id': i, 'name': name, 'mime': mime, 'parents': [parent or 'root'], 'owner': me, 'perms': [], 'content': content, 'mt': t, 'ct': t}
    return DRIVE[i]

async def handler(route):
    req = route.request; u = up.urlparse(req.url); qs = dict(up.parse_qsl(u.query)); path = u.path
    me = TOK.get((req.headers.get('authorization') or '').replace('Bearer ', ''))
    if not me: return await route.fulfill(status=401, body='no')
    def ok(obj): return route.fulfill(status=200, content_type='application/json', body=json.dumps(obj))
    if path == '/drive/v3/about': return await ok({'user': {'emailAddress': me, 'displayName': me}})
    if path == '/drive/v3/files' and req.method == 'GET':
        fs = [meta(f, me) for f in DRIVE.values() if visible(f, me) and match(f, qs.get('q', ''), me)]
        fs.sort(key=lambda f: f['createdTime']); return await ok({'files': fs})
    if path == '/drive/v3/files' and req.method == 'POST':
        b = json.loads(req.post_data); f = new(b['name'], b['mimeType'], (b.get('parents') or ['root'])[0], me); return await ok({'id': f['id']})
    if path == '/upload/drive/v3/files' and req.method == 'POST':
        body = req.post_data_buffer.decode('latin1')
        mj = json.loads(re.search(r'(\{"name".*?\})\r?\n', body).group(1))
        parts = re.split(r'--[^\r\n]+', body)
        content = [p for p in parts if 'name="file"' in p][0].split('\r\n\r\n', 1)[1].rstrip('\r\n')
        par = DRIVE[mj['parents'][0]]
        if not visible(par, me): return await route.fulfill(status=404, body='parent')
        if not can_edit(par, me): return await route.fulfill(status=403, body='read only')
        f = new(mj['name'], mj['mimeType'], mj['parents'][0], par['owner'] if par['owner'] != me else me, content)
        return await ok({'id': f['id'], 'modifiedTime': f['mt']})
    m = re.fullmatch(r'/upload/drive/v3/files/(\w+)', path)
    if m and req.method == 'PATCH':
        f = DRIVE[m.group(1)]
        if not can_edit(f, me): return await route.fulfill(status=403, body='read only')
        f['content'] = req.post_data_buffer.decode('utf8'); f['mt'] = mtime(); return await ok({'id': f['id'], 'modifiedTime': f['mt']})
    m = re.fullmatch(r'/drive/v3/files/(\w+)/copy', path)
    if m and req.method == 'POST':
        src = DRIVE.get(m.group(1)); b = json.loads(req.post_data)
        if not src or not visible(src, me): return await route.fulfill(status=404, body='nf')
        f = new(b.get('name', src['name']), src['mime'], b['parents'][0], me, src['content']); return await ok({'id': f['id']})
    m = re.fullmatch(r'/drive/v3/files/(\w+)/permissions(?:/(\w+))?', path)
    if m:
        f = DRIVE[m.group(1)]; pid = m.group(2)
        if req.method != 'GET' and f['owner'] != me: return await route.fulfill(status=403, body='not owner')
        if req.method == 'POST':
            b = json.loads(req.post_data)
            if any(p['email'] == b['emailAddress'] for p in f['perms']): return await route.fulfill(status=400, body='duplicate')
            p = {'id': 'p%d' % next(PIDS), 'email': b['emailAddress'], 'role': b['role']}; f['perms'].append(p); return await ok({'id': p['id']})
        if req.method == 'PATCH':
            p = [p for p in f['perms'] if p['id'] == pid][0]; p['role'] = json.loads(req.post_data)['role']; return await ok({'id': pid})
        if req.method == 'DELETE':
            f['perms'] = [p for p in f['perms'] if p['id'] != pid]; return await route.fulfill(status=204, body='')
        return await ok({'permissions': [{'id': 'own', 'type': 'user', 'emailAddress': f['owner'], 'role': 'owner'}]
                         + [{'id': p['id'], 'type': 'user', 'emailAddress': p['email'], 'role': p['role']} for p in f['perms']]})
    m = re.fullmatch(r'/drive/v3/files/(\w+)', path)
    if m:
        f = DRIVE.get(m.group(1))
        if not f or not visible(f, me): return await route.fulfill(status=404, body='nf')
        if req.method == 'PATCH':
            if not can_edit(f, me): return await route.fulfill(status=403, body='read only')
            f.update(json.loads(req.post_data)); f['mt'] = mtime(); return await ok({'id': f['id']})
        if qs.get('alt') == 'media': return await route.fulfill(status=200, content_type='application/json', body=f['content'])
        return await ok(meta(f, me))
    print('UNHANDLED', req.method, req.url); return await route.fulfill(status=500, body='?')

SETUP = """(tok) => { localStorage.setItem('vfxq.token', JSON.stringify({value: tok, scope: 'https://www.googleapis.com/auth/drive', exp: Date.now()+3600e3}));
  localStorage.setItem('vfxq.connected', 'true'); }"""

async def main():
    async with async_playwright() as pw:
        b = await pw.chromium.launch()
        async def device(tok, at=None, owner='vishwaafx@gmail.com', prev=()):
            ctx = await b.new_context(timezone_id='Asia/Kolkata'); await ctx.route('https://www.googleapis.com/**', handler)
            cfg = f"window.VFXQ_CLIENT_ID='test'; window.VFXQ_DATA_OWNER={json.dumps(owner)}; window.VFXQ_PREVIOUS_OWNERS={json.dumps(list(prev))};"
            await ctx.route('**/js/config.js*', lambda r: r.fulfill(status=200, content_type='text/javascript', body=cfg))
            if at: await ctx.clock.set_fixed_time(at)
            pg = await ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto('http://127.0.0.1:8767/index.html'); await pg.evaluate(SETUP, tok); await pg.reload(); await pg.wait_for_timeout(1500)
            return pg, errs
        async def names(pg): return sorted(await pg.evaluate("store.projects.filter(p=>!p.deleted).map(p=>p.name)"))
        async def add(pg, n): await pg.evaluate("n => { const p = createProject(store,{name:n,category:'Feature Film',templateId:'tpl_film'}); store.projects.push(p); saveLocal(store); }", n)
        async def sync(pg): await pg.evaluate("runSync(true)"); await pg.wait_for_timeout(1200); return await pg.evaluate("({s: syncState, mode: store.meta.syncMode, acct: store.meta.syncAccount})")

        D, de = await device('tok_d'); await add(D, 'Dickson only quote'); print('D no access:', await sync(D), await names(D))
        print('D wrote nothing to Drive:', not any(f['owner'] == 'dicksonpjo@gmail.com' for f in DRIVE.values()))
        V, ve = await device('tok_v'); await add(V, 'Studio quote'); print('V owner:', await sync(V), await names(V))
        await V.evaluate("Drive.shareWith('dicksonpjo@gmail.com')"); await V.wait_for_timeout(300)
        print('D after share:', await sync(D), await names(D))
        print('V resync:', await sync(V), await names(V))
        print('data files:', [(f['name'], f['owner']) for f in DRIVE.values() if 'quotes_data' in f['name']])
        # backups
        print('backupNow:', await V.evaluate("Drive.backupNow(store)"))
        bl = await D.evaluate("Drive.listBackups().then(l=>l.map(f=>f.name))"); print('D sees backups:', bl)
        # restore replace on V with a backup that lacks the Dickson quote
        await V.evaluate("""() => { const data = JSON.parse(JSON.stringify(store)); data.projects = data.projects.filter(p=>p.name!=='Dickson only quote'); pendingRestore = data; ACT.restore({dataset:{v:'replace'}}); }""")
        await V.wait_for_timeout(1500); print('V after restore:', await names(V))
        print('D after restore sync:', await sync(D), await names(D))
        # PDF save from D lands in owner folder
        await D.evaluate("Drive.savePdf('test.pdf','VFX-26-27-099 Test', new Uint8Array([37,80,68,70]))")
        pdf = [f for f in DRIVE.values() if f['name'] == 'test.pdf'][0]; print('PDF owner:', pdf['owner'])
        print('folders:', sorted(set(f['name'] for f in DRIVE.values() if f['mime'] == FOLDER)))
        print('errors', de, ve)

        # ---- 9 PM automatic backup: one per day, whatever the device (v1.2.1 fix) ----
        IST = timezone(timedelta(hours=5, minutes=30))
        at = lambda d, hm: datetime.fromisoformat(f'{d}T{hm}:00').replace(tzinfo=IST)
        autos = lambda: sorted(f['name'] for f in DRIVE.values() if f['name'].endswith('_auto.json') and not f.get('trashed'))
        fails = []
        async def jump(pg, tok, t):  # move a device's clock; its fake 1-hour token is renewed as on a real phone
            await pg.context.clock.set_fixed_time(t); await pg.evaluate(SETUP, tok)
        def check(name, got, want):
            ok = got == want; print(('PASS ' if ok else 'FAIL ') + name + ('' if ok else f'  got {got} want {want}'))
            if not ok: fails.append(name)
        DRIVE.clear(); errs = []
        V1, e = await device('tok_v', at('2026-11-23', '08:30')); errs += e; await sync(V1)
        check('morning catch-up is named for yesterday', [n[6:] for n in autos()], ['2026-11-22_2100_auto.json'])
        V2, e = await device('tok_v', at('2026-11-23', '08:45')); errs += e; await sync(V2)
        check('second device / cleared browser adds nothing', len(autos()), 1)
        await jump(V1, 'tok_v', at('2026-11-23', '21:10')); await sync(V1)
        check('9 PM backup for today', [n[6:] for n in autos()][-1:], ['2026-11-23_2110_auto.json'])
        await jump(V2, 'tok_v', at('2026-11-23', '21:30')); await sync(V2)
        check('second device after 9 PM adds nothing', len(autos()), 2)
        # A catch-up written by v1.2.0 carried the next day's date (the bug): it must still count.
        for f in DRIVE.values():
            if f['name'].endswith('_auto.json'): f['trashed'] = True
        month = [f for f in DRIVE.values() if f['name'] == '2026-11'][0]
        new('v0009_2026-11-24_0905_auto.json', 'application/json', month['id'], 'vishwaafx@gmail.com', '{}')
        V3, e = await device('tok_v', at('2026-11-24', '10:00')); errs += e; await sync(V3)
        check('old wrongly-named catch-up is recognised', autos(), ['v0009_2026-11-24_0905_auto.json'])
        # Month change: catch-up on 1 Dec morning is for 30 Nov and goes in the 2026-11 folder.
        V4, e = await device('tok_v', at('2026-12-01', '08:00')); errs += e; await sync(V4)
        last = [f for f in DRIVE.values() if f['name'].endswith('2026-11-30_2100_auto.json')]
        check('month change: catch-up in the right month folder', [DRIVE[f['parents'][0]]['name'] for f in last], ['2026-11'])
        V5, e = await device('tok_v', at('2026-12-01', '08:20')); errs += e; await sync(V5)
        check('month change: second device adds nothing', len(autos()), 2)
        check('no page errors', errs, [])
        print('BACKUP TEST', 'FAILED: ' + ', '.join(fails) if fails else 'PASSED')

        # ---- v1.3.0: move the studio data from vishwaafx to vishwaafxacc ----
        DRIVE.clear(); errs = []; nb = len(fails)
        NEW, OLD = 'vishwaafxacc@gmail.com', ['vishwaafx@gmail.com']
        data_files = lambda: sorted((f['name'], f['owner']) for f in DRIVE.values() if f['name'].endswith('quotes_data.json'))
        owned = lambda who, suffix: sorted(f['name'] for f in DRIVE.values() if f['owner'] == who and f['name'].endswith(suffix))
        V, e = await device('tok_v'); errs += e; await add(V, 'Before move'); await sync(V)
        await V.evaluate("Drive.backupNow(store)"); await V.evaluate("Drive.savePdf('q1.pdf','VFX-26-27-001 Q1', new Uint8Array([37,80,68,70]))")
        await V.evaluate("Drive.shareWith('dicksonpjo@gmail.com')"); await V.evaluate("Drive.shareWith('vishwaafxacc@gmail.com')")
        old_backups = sorted(f['name'] for f in DRIVE.values() if f['name'].startswith('v0'))
        # 1.3.0 goes live: owner is now vishwaafxacc
        A, e = await device('tok_a', owner=NEW, prev=OLD); errs += e; st = await sync(A)
        check('new owner waits in move mode', st['mode'], 'move')
        check('new owner sees the studio quotes before moving', 'Before move' in await names(A), True)
        check('move mode writes nothing', (data_files(), owned(NEW, '.json')), ([('vishwaafx_quotes_data.json', 'vishwaafx@gmail.com')], []))
        D, e = await device('tok_d', owner=NEW, prev=OLD); errs += e; st = await sync(D)
        check('other accounts keep using the old file until the move', st['mode'], 'shared')
        await add(D, 'Typed during move'); await sync(D)
        await A.set_viewport_size({'width': 390, 'height': 844}); await A.evaluate("go({name:'settings', kind:'quote'})"); await A.wait_for_timeout(300)
        check('settings shows the Move button', await A.evaluate("!!document.querySelector('[data-act=movedata]')"), True)
        if os.environ.get('SHOTS'): await A.screenshot(path=os.path.join(os.environ['SHOTS'], 'move_1_settings.png'))
        await A.evaluate("ACT.movedata()"); await A.evaluate("ACT.confirmok()"); await A.wait_for_timeout(2500)
        sheet = await A.evaluate("document.getElementById('sheet')?.innerText || ''"); print('move report:', ' '.join(sheet.split()))
        if os.environ.get('SHOTS'): await A.screenshot(path=os.path.join(os.environ['SHOTS'], 'move_2_report.png'))
        check('move: nothing failed, old file retired', sheet.startswith('Move complete') and 'could not' not in sheet, True)
        check('move: data file now owned by vishwaafxacc', [o for n, o in data_files() if n == 'vishwaafx_quotes_data.json'], [NEW])
        check('move: old file renamed', any(n.startswith('moved_to_vishwaafxacc_') for n, o in data_files()), True)
        check('move: every backup copied, same names', sorted(n for n in owned(NEW, '.json') if n.startswith('v0')), old_backups)
        check('move: PDF copied', owned(NEW, '.pdf'), ['q1.pdf'])
        check('move: quote typed on another phone during the move is kept', 'Typed during move' in await names(A), True)
        st = await sync(A); check('after move: owner mode', st['mode'], 'owner')
        rep2 = await A.evaluate("Drive.moveHere(store).then(r => r.report).catch(e => e.message)")
        check('move cannot run twice', 'nothing' in str(rep2) or 'no studio data' in str(rep2), True)
        await A.evaluate("Drive.shareWith('dicksonpjo@gmail.com')"); await A.evaluate("Drive.shareWith('vishwaafx@gmail.com')")
        st = await sync(D); check('dicksonpjo now uses the new file', (st['mode'], 'Typed during move' in await names(D)), ('shared', True))
        await add(D, 'After move'); await sync(D); await sync(A)
        check('edits flow to the new owner', 'After move' in await names(A), True)
        V2, e = await device('tok_v', owner=NEW, prev=OLD); errs += e; st = await sync(V2)
        check('vishwaafx becomes an extra user', (st['mode'], sorted(await names(V2)) == sorted(await names(A))), ('shared', True))
        check('only the new owner can back up', 'made by vishwaafxacc' in await V2.evaluate("Drive.backupNow(store).then(()=>'ok').catch(e=>e.message)"), True)
        nm = await A.evaluate("Drive.backupNow(store)"); check('new owner backup continues numbering', nm[:5], 'v%04d' % (len(old_backups) + 1))
        check('vishwaafx sees backups', len(await V2.evaluate("Drive.listBackups().then(l=>l.map(f=>f.name))")) >= len(old_backups) + 1, True)
        check('move: no page errors', errs, [])
        print('MOVE TEST', 'FAILED' if len(fails) > nb else 'PASSED')

        # ---- v1.3.1: the old owner opens the app after the move, before it has access ----
        # (what happened on 23 Nov: v1.3.0 made a new data file in vishwaafx's old folder, and
        #  vishwaafxacc then said "Some files from the old account were not copied yet")
        DRIVE.clear(); errs = []; nb = len(fails)
        V, e = await device('tok_v'); errs += e; await add(V, 'Old studio quote'); await sync(V)
        await V.evaluate("Drive.backupNow(store)"); await V.evaluate("Drive.shareWith('vishwaafxacc@gmail.com')")
        A, e = await device('tok_a', owner=NEW, prev=OLD); errs += e; await sync(A)
        await A.evaluate("Drive.moveHere(store)"); st = await sync(A)
        check('move done, owner mode', (st['mode'], await A.evaluate("!!Drive.state.moveSource")), ('owner', False))
        V2, e = await device('tok_v', owner=NEW, prev=OLD); errs += e
        await add(V2, 'Typed on old account'); st = await sync(V2)
        check('old owner without access: no-access mode', st['mode'], 'noaccess')
        check('old owner without access writes no data file', [n for n, o in data_files() if o == 'vishwaafx@gmail.com' and n == 'vishwaafx_quotes_data.json'], [])
        st = await sync(A); check('owner sees no "not copied" warning', await A.evaluate("!!Drive.state.moveSource"), False)
        await A.evaluate("go({name:'settings', kind:'quote'})"); await A.wait_for_timeout(300)
        check('settings has no Finish the move button', await A.evaluate("!!document.querySelector('[data-act=movedata]')"), False)
        # A late copy that v1.3.0 already made is merged in and retired, not treated as an unfinished move
        old_root = [f for f in DRIVE.values() if f['name'] == 'VishwaaFX Quotes' and f['owner'] == 'vishwaafx@gmail.com'][0]
        late = json.loads([f for f in DRIVE.values() if f['name'] == 'vishwaafx_quotes_data.json' and f['owner'] == NEW][0]['content'])
        late['projects'].append({**late['projects'][0], 'id': 'late1', 'name': 'Late copy quote', 'updatedAt': '2026-11-23T15:00:00.000Z'})
        new('vishwaafx_quotes_data.json', 'application/json', old_root['id'], 'vishwaafx@gmail.com', json.dumps(late))
        st = await sync(A)
        check('late old-owner copy: no warning', await A.evaluate("!!Drive.state.moveSource"), False)
        check('late old-owner copy: its quote is kept', 'Late copy quote' in await names(A), True)
        check('late old-owner copy: renamed merged_', any(n.startswith('merged_') and o == 'vishwaafx@gmail.com' for n, o in data_files()), True)
        check('only one live data file', [o for n, o in data_files() if n == 'vishwaafx_quotes_data.json'], [NEW])

        # ---- v1.3.1: access manager ----
        acc = lambda pg: pg.evaluate("Drive.access().then(l => l.map(p => [p.email, p.role, p.partial]))")
        perms_on = lambda who: sorted((DRIVE[i]['name'], p['role']) for i in DRIVE for p in DRIVE[i]['perms'] if p['email'] == who and DRIVE[i]['owner'] == NEW)
        check('access list starts with the owner only', await acc(A), [[NEW, 'owner', False]])
        await A.evaluate("Drive.grant('vishwaafx@gmail.com', 'writer')"); await A.evaluate("Drive.grant('DicksonPJO@gmail.com', 'reader')")
        check('add: both folders, Editor', perms_on('vishwaafx@gmail.com'), [('VishwaaFX Quotes', 'writer'), ('VishwaaFX Quotes Backups', 'writer')])
        check('add: email made lower case, View only on both', perms_on('dicksonpjo@gmail.com'), [('VishwaaFX Quotes', 'reader'), ('VishwaaFX Quotes Backups', 'reader')])
        check('access list', await acc(A), [[NEW, 'owner', False], ['dicksonpjo@gmail.com', 'reader', False], ['vishwaafx@gmail.com', 'writer', False]])
        st = await sync(V2)
        check('old owner after being added: Editor, sees everything, its quote kept', (st['mode'], 'Typed on old account' in await names(V2), 'Late copy quote' in await names(V2)), ('shared', True, True))
        await sync(A); check('quote typed on old account reaches the owner', 'Typed on old account' in await names(A), True)
        Dv, e = await device('tok_d', owner=NEW, prev=OLD); errs += e; st = await sync(Dv)
        check('View only account: view mode, sees quotes', (st['mode'], 'Old studio quote' in await names(Dv)), ('view', True))
        mt_before = [f['mt'] for f in DRIVE.values() if f['name'] == 'vishwaafx_quotes_data.json' and f['owner'] == NEW]
        await Dv.evaluate("store.projects[0].name = 'hacked'; touchP(store.projects[0])"); await sync(Dv)
        check('View only account never writes the data file', [f['mt'] for f in DRIVE.values() if f['name'] == 'vishwaafx_quotes_data.json' and f['owner'] == NEW], mt_before)
        pid = await Dv.evaluate("store.projects.find(p => !p.deleted).id")
        await Dv.evaluate(f"go({{name:'project', id:'{pid}', kind:'quote'}})"); await Dv.wait_for_timeout(300)
        check('View only: fields locked, PDF button still there', await Dv.evaluate("[!!document.querySelector('[data-bind]') && [...document.querySelectorAll('main [data-bind]')].every(f => f.disabled), !!document.querySelector('[data-act=pdf]')]"), [True, True])
        check('View only: cannot save PDFs to Drive', 'View only' in await Dv.evaluate("Drive.savePdf('x.pdf','X', new Uint8Array([1])).then(()=>'saved').catch(e=>e.message)"), True)
        await Dv.evaluate("go({name:'settings', kind:'quote'})"); await Dv.wait_for_timeout(300)
        await Dv.set_viewport_size({'width': 390, 'height': 844}); await Dv.wait_for_timeout(200)
        if os.environ.get('SHOTS'): await (await Dv.query_selector('main section')).screenshot(path=os.path.join(os.environ['SHOTS'], 'access_3_view_only.png'))
        line = await Dv.evaluate("document.querySelector('.okbox')?.innerText || ''")
        check('other accounts see who owns the data', 'owned by vishwaafxacc@gmail.com' in line and 'View only' in line, True)
        check('other accounts have no access manager', await Dv.evaluate("!!document.getElementById('access')"), False)
        check('only the owner can manage access', 'only vishwaafxacc' in await V2.evaluate("Drive.grant('x@gmail.com','writer').then(()=>'ok').catch(e=>e.message)"), True)
        check('only the owner can remove', 'only vishwaafxacc' in await V2.evaluate("Drive.revoke('dicksonpjo@gmail.com').then(()=>'ok').catch(e=>e.message)"), True)
        await A.evaluate("Drive.grant('dicksonpjo@gmail.com', 'writer')")
        check('change role: View only -> Editor on both, no duplicates', perms_on('dicksonpjo@gmail.com'), [('VishwaaFX Quotes', 'writer'), ('VishwaaFX Quotes Backups', 'writer')])
        st = await sync(Dv); check('promoted account can edit', st['mode'], 'shared')
        # an account that was only on one folder (e.g. added by hand in Drive) is shown as such, and Remove clears it
        bk = [f for f in DRIVE.values() if f['name'] == 'VishwaaFX Quotes Backups' and f['owner'] == NEW][0]
        bk['perms'].append({'id': 'p999', 'email': 'stray@gmail.com', 'role': 'reader'})
        check('partial access is flagged', [r for r in await acc(A) if r[0] == 'stray@gmail.com'], [['stray@gmail.com', 'reader', True]])
        await A.set_viewport_size({'width': 390, 'height': 844}); await A.evaluate("go({name:'settings', kind:'quote'})"); await A.wait_for_timeout(600)
        if os.environ.get('SHOTS'): await (await A.query_selector('main section')).screenshot(path=os.path.join(os.environ['SHOTS'], 'access_1_owner.png'))
        rows = await A.evaluate("[...document.querySelectorAll('#accesslist .list-row')].map(r => [r.querySelector('b').innerText, !!r.querySelector('[data-act=unshare]')])")
        check('settings list: owner has no Remove button', rows[0], [NEW, False])
        check('settings list: one row per account', len(rows), 4)
        await A.evaluate("ACT.unshare({dataset:{v:'dicksonpjo@gmail.com'}})"); await A.evaluate("ACT.confirmok()"); await A.wait_for_timeout(800)
        check('remove: off the studio AND the backups folder', perms_on('dicksonpjo@gmail.com'), [])
        check('remove: gone from the settings list', 'dicksonpjo@gmail.com' in await A.evaluate("document.getElementById('accesslist').innerText"), False)
        await A.evaluate("Drive.revoke('stray@gmail.com')"); check('remove a one-folder account', perms_on('stray@gmail.com'), [])
        check('owner cannot remove itself', 'cannot remove itself' in await A.evaluate(f"Drive.revoke('{NEW}').then(()=>'ok').catch(e=>e.message)"), True)
        st = await sync(Dv)
        check('removed account drops to no-access, writes nothing', (st['mode'], perms_on('dicksonpjo@gmail.com')), ('noaccess', []))
        await A.evaluate("go({name:'settings', kind:'quote'})"); await A.wait_for_timeout(600)
        await A.fill('#sharemail', 'dicksonpjo@gmail.com'); await A.select_option('#sharerole', 'writer'); await A.click('[data-act=share]'); await A.wait_for_timeout(800)
        check('Add box in settings adds as Editor', perms_on('dicksonpjo@gmail.com'), [('VishwaaFX Quotes', 'writer'), ('VishwaaFX Quotes Backups', 'writer')])
        check('test-user note shown', 'Google Auth Platform' in await A.evaluate("document.getElementById('access').innerText"), True)
        check('access: no page errors', errs, [])
        print('ACCESS TEST', 'FAILED' if len(fails) > nb else 'PASSED')
        await b.close()
        if fails: sys.exit(1)
try: asyncio.run(main())
finally: srv.terminate()
