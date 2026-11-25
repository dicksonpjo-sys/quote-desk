/* Google Drive sync — OAuth 2.0 token (redirect) flow + Drive v3 REST.
   One shared studio data file lives in the studio account's Drive (VFXQ_DATA_OWNER).
   Other accounts use it once the "VishwaaFX Quotes" folder is shared with them as Editor,
   so every account sees the same quotes. */
'use strict';

const Drive = (() => {
  const SCOPE = 'https://www.googleapis.com/auth/drive';
  const API = 'https://www.googleapis.com/drive/v3';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
  const FOLDER = 'VishwaaFX Quotes';
  const DATA_FILE = 'vishwaafx_quotes_data.json';
  const FOLDER_MIME = 'application/vnd.google-apps.folder';
  const K = { client: 'vfxq.clientId', token: 'vfxq.token', connected: 'vfxq.connected', ids: 'vfxq.driveIds2', ret: 'vfxq.returnRoute', silent: 'vfxq.silentTry', who: 'vfxq.driveUser' };

  const ls = {
    get: (k, d = null) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del: k => { try { localStorage.removeItem(k); } catch {} }
  };

  const owner = () => String(window.VFXQ_DATA_OWNER || '').trim().toLowerCase();
  /* Accounts that owned the studio data before. Their file is read until the owner taps "Move". */
  const previousOwners = () => (window.VFXQ_PREVIOUS_OWNERS || []).map(e => String(e).trim().toLowerCase()).filter(e => e && e !== owner());
  const redirectUri = () => location.origin + location.pathname;
  const clientId = () => (ls.get(K.client) || window.VFXQ_CLIENT_ID || '').trim();
  const tokenRec = () => ls.get(K.token);
  const token = () => { const t = tokenRec(); return t && t.exp > Date.now() + 60000 ? t.value : null; };
  const isConnected = () => !!ls.get(K.connected);
  /* Tokens from the first version only had access to the app's own files. */
  const needsUpgrade = () => { const t = tokenRec(); return isConnected() && !!t && !String(t.scope || '').split(' ').includes(SCOPE); };
  const user = () => ls.get(K.who);
  const state = { mode: 'unknown', ownerEmail: owner(), moveSource: null }; // 'owner' | 'move' | 'shared' | 'view' | 'noaccess'

  function setClientId(id) { ls.set(K.client, (id || '').trim()); }

  function authorize({ silent = false } = {}) {
    const cid = clientId(); if (!cid) throw new Error('Add your Google OAuth Client ID in Settings → Google Drive first.');
    ls.set(K.ret, location.hash || '#/');
    const st = Math.random().toString(36).slice(2);
    sessionStorage.setItem('vfxq.state', st);
    const q = new URLSearchParams({
      client_id: cid, redirect_uri: redirectUri(), response_type: 'token', scope: SCOPE,
      include_granted_scopes: 'true', state: st, prompt: silent ? 'none' : 'select_account consent'
    });
    if (silent && user()?.email) q.set('login_hint', user().email);
    location.assign('https://accounts.google.com/o/oauth2/v2/auth?' + q.toString());
  }

  /* Call at start-up, before the router reads the hash. Returns a message or null. */
  function handleRedirect() {
    const h = location.hash;
    if (!/access_token=|error=/.test(h)) return null;
    const q = new URLSearchParams(h.slice(1));
    const ret = ls.get(K.ret) || '#/';
    history.replaceState(null, '', location.pathname + location.search + ret);
    if (q.get('error')) {
      if (q.get('error') === 'access_denied') return 'Google did not allow this account. A new account must first be added as a test user in Google Cloud (Google Auth Platform → Audience → Test users).';
      return q.get('error') === 'interaction_required' || q.get('error') === 'login_required' || q.get('error') === 'consent_required'
        ? 'reconnect' : 'Google sign-in was cancelled (' + q.get('error') + ').';
    }
    const st = sessionStorage.getItem('vfxq.state');
    if (st && q.get('state') !== st) return 'Sign-in check failed. Please connect again.';
    ls.set(K.token, { value: q.get('access_token'), scope: q.get('scope') || '', exp: Date.now() + (num(q.get('expires_in')) || 3600) * 1000 });
    ls.set(K.connected, true);
    ls.del(K.who); // re-read which account this is
    return 'connected';
  }

  function maybeSilentRefresh() {
    if (!isConnected() || token() || needsUpgrade() || !navigator.onLine || !clientId()) return false;
    const last = num(sessionStorage.getItem(K.silent));
    if (Date.now() - last < 10 * 60000) return false;
    sessionStorage.setItem(K.silent, String(Date.now()));
    authorize({ silent: true });
    return true;
  }

  function disconnect() {
    const t = tokenRec();
    if (t?.value) fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(t.value), { method: 'POST' }).catch(() => {});
    [K.token, K.connected, K.ids, K.who].forEach(ls.del);
    state.mode = 'unknown';
  }

  async function api(url, opts = {}) {
    if (needsUpgrade()) { const e = new Error('Reconnect Google Drive to turn on shared studio data'); e.code = 'AUTH'; throw e; }
    const tk = token(); if (!tk) { const e = new Error('Drive session expired'); e.code = 'AUTH'; throw e; }
    const res = await fetch(url, { ...opts, headers: { Authorization: 'Bearer ' + tk, ...(opts.headers || {}) } });
    if (res.status === 401) { ls.del(K.token); const e = new Error('Drive session expired'); e.code = 'AUTH'; throw e; }
    if (res.status === 403 && /insufficient|scope/i.test(await res.clone().text())) { const e = new Error('Reconnect Google Drive to allow the new access'); e.code = 'AUTH'; throw e; }
    if (!res.ok) throw new Error('Drive error ' + res.status + ': ' + (await res.text()).slice(0, 200));
    return res;
  }
  const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const json = async (url, opts) => (await api(url, opts)).json();

  async function whoAmI() {
    let u = user();
    if (!u) { const r = await json(`${API}/about?fields=user(emailAddress,displayName)`); u = { email: String(r.user.emailAddress || '').toLowerCase(), name: r.user.displayName }; ls.set(K.who, u); }
    return u;
  }
  /* Folder / file ids are cached per Google account. */
  function cache(email) { const all = ls.get(K.ids) || {}; return all[email] || {}; }
  function saveCache(email, c) { const all = ls.get(K.ids) || {}; all[email] = c; ls.set(K.ids, all); }

  async function list(query, fields = 'files(id,name,modifiedTime,createdTime,ownedByMe,owners(emailAddress),parents,mimeType,capabilities(canEdit))') {
    let out = [], page = '';
    do { // follow every page: a month of backups or a PDF folder can hold more than one page
      const r = await json(`${API}/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent('nextPageToken,' + fields)}&orderBy=createdTime&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true${page ? '&pageToken=' + encodeURIComponent(page) : ''}`);
      out = out.concat(r.files || []); page = r.nextPageToken || '';
    } while (page);
    return out;
  }
  async function findChild(name, parent, folder = false) {
    let query = `name='${esc(name)}' and trashed=false and '${parent}' in parents`;
    if (folder) query += ` and mimeType='${FOLDER_MIME}'`;
    return (await list(query))[0] || null;
  }
  async function createFolder(name, parent) {
    const r = await json(`${API}/files?fields=id&supportsAllDrives=true`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: parent ? [parent] : undefined })
    });
    return r.id;
  }
  async function uploadNew(name, parent, blob, mime) {
    const body = new FormData();
    body.append('metadata', new Blob([JSON.stringify({ name, parents: [parent], mimeType: mime })], { type: 'application/json' }));
    body.append('file', blob);
    return json(`${UPLOAD}/files?uploadType=multipart&fields=id,modifiedTime&supportsAllDrives=true`, { method: 'POST', body });
  }
  async function overwrite(id, blob, mime) {
    return json(`${UPLOAD}/files/${id}?uploadType=media&fields=id,modifiedTime&supportsAllDrives=true`, { method: 'PATCH', headers: { 'Content-Type': mime }, body: blob });
  }
  const ownerOf = f => String(f.owners?.[0]?.emailAddress || '').toLowerCase();

  /* Work out which data file is THE studio file, and merge any strays into it.
     Since v1.3.1 an account without access to the studio data never makes its own copy
     ('noaccess': works on the phone only, writes nothing to Drive) and a View only account
     only reads ('view'). */
  async function locate(me) {
    const c = cache(me.email);
    const files = await list(`name='${DATA_FILE}' and trashed=false`);
    let primary = null;
    if (owner()) primary = files.find(f => ownerOf(f) === owner()) || null;
    const iAmOwner = !owner() || me.email === owner();
    // The studio file still sitting with a previous owner (not moved yet).
    let source = files.find(f => previousOwners().includes(ownerOf(f))) || null;
    let lateCopy = null;
    if (primary && source) {
      // The move already finished (a moved_to_ file exists): this is a late copy an old-owner device
      // made afterwards (v1.3.0 did that when the account had no access yet). Merge it, do not re-move.
      const moved = await list(`name contains 'moved_to_' and trashed=false`);
      if (moved.some(f => previousOwners().includes(ownerOf(f)) && f.name.endsWith(DATA_FILE))) { lateCopy = source; source = null; }
    }
    let moving = false;
    if (!primary && source) { primary = source; moving = iAmOwner; } // until the move, everyone keeps using the old file
    if (!primary && iAmOwner) primary = files.find(f => f.ownedByMe) || null;
    state.moveSource = iAmOwner ? source : null;
    const canEdit = !primary || primary.capabilities?.canEdit !== false;
    state.mode = moving ? 'move' : iAmOwner ? 'owner' : !primary ? 'noaccess' : canEdit ? 'shared' : 'view';
    if (c.mode !== state.mode) { // switched between modes: forget old folder ids
      for (const k of Object.keys(c)) if (k === 'backupRoot' || k === 'index' || k === 'indexText' || k.startsWith('m:') || k.startsWith('f:')) delete c[k];
      c.mode = state.mode;
    }
    // Folder that holds the data file is the root for PDFs and backups.
    if (primary) { c.data = primary.id; c.root = primary.parents?.[0] || c.root; }
    else if (state.mode === 'noaccess') { delete c.data; delete c.root; }
    else {
      let root = (await list(`name='${FOLDER}' and mimeType='${FOLDER_MIME}' and trashed=false and 'root' in parents`)).find(f => f.ownedByMe);
      c.root = root ? root.id : await createFolder(FOLDER);
      delete c.data;
    }
    saveCache(me.email, c);
    // Other copies this account can edit (e.g. the second account's old private file), and for the
    // owner the late old-owner copy. Read-only modes never touch them.
    let strays = [];
    if (primary && (state.mode === 'owner' || state.mode === 'shared')) strays = files.filter(f => f.id !== primary.id && f.ownedByMe);
    if (lateCopy && state.mode === 'owner' && !strays.includes(lateCopy)) strays.push(lateCopy);
    return { c, primary, strays, source };
  }

  /* Studio Console receipts (v1.7.0): read-only, found by name (the studio account's copy first),
     downloaded only when it changed, kept in store.meta (per device, never uploaded) for offline use. */
  async function readReceipts(meta) {
    try {
      const files = await list(`name='${SC_FILE}' and trashed=false`);
      const f = files.find(x => owner() && ownerOf(x) === owner()) || files[0];
      if (!f) { if (meta.scFile) { delete meta.scFile; delete meta.scReceipts; } return; }
      if (meta.scFile?.id === f.id && meta.scFile?.modifiedTime === f.modifiedTime && meta.scReceipts) return;
      const data = await json(`${API}/files/${f.id}?alt=media&supportsAllDrives=true`);
      if (!Array.isArray(data?.receipts)) throw new Error('not a receipts file');
      meta.scReceipts = data; meta.scFile = { id: f.id, modifiedTime: f.modifiedTime, owner: ownerOf(f) };
    } catch (e) { console.warn('Studio Console receipts', e); }
  }
  /* Pull remote, merge, push merged. Returns merged store. */
  async function sync(store) {
    store.meta = store.meta || {};
    await readReceipts(store.meta); // first, so the Studio Console summary written below has the latest payments
    setReceipts(store.meta.scReceipts, store.projects);
    const merged = await syncData(store);
    setReceipts(merged.meta.scReceipts, merged.projects);
    return merged;
  }
  async function syncData(store) {
    const me = await whoAmI();
    const { c, primary, strays, source } = await locate(me);
    let merged = store;
    const sameAccount = store.meta.syncAccount === me.email && store.meta.syncFile === c.data;
    if (primary && (state.mode === 'view' || !sameAccount || primary.modifiedTime !== store.meta.remoteModified)) {
      const remote = await json(`${API}/files/${primary.id}?alt=media&supportsAllDrives=true`);
      // View only: take Drive's copy as it is, so nothing changed on this phone can travel later
      merged = state.mode === 'view' ? { ...remote, meta: store.meta } : mergeStores(store, remote);
    }
    if (state.mode === 'move' || state.mode === 'noaccess') { // read what we can, write nothing
      merged.meta = { ...(store.meta || {}), lastSync: nowISO(), syncAccount: me.email, syncMode: state.mode, syncFile: null, remoteModified: null };
      return merged;
    }
    if (state.mode === 'view') { // View only: download, never upload
      merged.meta = { ...(store.meta || {}), lastSync: nowISO(), syncAccount: me.email, syncMode: 'view', syncFile: primary.id, remoteModified: primary.modifiedTime };
      return merged;
    }
    if (source && source.id !== primary?.id) { // move started but not finished: keep reading the old file
      try { merged = mergeStores(merged, await json(`${API}/files/${source.id}?alt=media&supportsAllDrives=true`)); } catch (e) { console.warn('old studio file', e); }
    }
    for (const f of strays) { // fold an old separate copy in, then retire it
      try {
        const other = await json(`${API}/files/${f.id}?alt=media&supportsAllDrives=true`);
        merged = mergeStores(merged, other);
        await json(`${API}/files/${f.id}?fields=id`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: `merged_${todayStr()}_${DATA_FILE}` }) });
        if (f.id === state.moveSource?.id) state.moveSource = null;
      } catch (e) { console.warn('stray merge', e); }
    }
    merged.meta = { ...(store.meta || {}) };
    setReceipts(merged.meta.scReceipts, merged.projects); // the Studio Console file is built with the latest receipts
    const blob = new Blob([JSON.stringify({ ...merged, meta: undefined, savedAt: nowISO(), savedBy: me.email, app: APP_VERSION })], { type: 'application/json' });
    const res = primary ? await overwrite(primary.id, blob, 'application/json') : await uploadNew(DATA_FILE, c.root, blob, 'application/json');
    c.data = res.id; saveCache(me.email, c);
    Object.assign(merged.meta, { remoteModified: res.modifiedTime, lastSync: nowISO(), syncAccount: me.email, syncFile: res.id, syncMode: state.mode });
    await dailyBackup(me, blob).catch(e => console.warn('backup', e));
    await writeIndex(me, c, merged).catch(e => console.warn('index', e));
    return merged;
  }

  /* Studio Console summary (v1.4.0): quote_desk_index.json next to the data file, rebuilt from the
     merged quotes on every sync. The studio account creates it, so it owns it; Editor accounts only
     overwrite it (the owner stays the same), which keeps it close to live. Skipped when unchanged. */
  async function writeIndex(me, c, merged) {
    if (!c.root || !['owner', 'shared'].includes(state.mode)) return null;
    const idx = buildIndex(merged);
    const text = JSON.stringify(idx);
    if (c.indexText === text && c.index) return c.index;
    const body = () => new Blob([JSON.stringify({ ...idx, generatedAt: nowISO(), generatedBy: me.email }, null, 1)], { type: 'application/json' });
    let f = c.index ? { id: c.index } : null;
    if (!f) f = (await list(`name='${INDEX_FILE}' and trashed=false and '${c.root}' in parents`)).find(x => !owner() || ownerOf(x) === owner()) || null;
    if (f) {
      try { await overwrite(f.id, body(), 'application/json'); }
      catch (e) { delete c.index; saveCache(me.email, c); throw e; } // file was removed: look again next time
    } else if (state.mode === 'owner') f = await uploadNew(INDEX_FILE, c.root, body(), 'application/json');
    else return null; // not created yet: the studio account makes it on its next sync
    c.index = f.id; c.indexText = text; saveCache(me.email, c);
    return f.id;
  }

  async function subFolder(me, path) {
    const c = cache(me.email); let parent = c.root;
    for (const part of path) {
      const key = 'f:' + parent + '/' + part;
      if (!c[key]) { const f = await findChild(part, parent, true); c[key] = f ? f.id : await createFolder(part, parent); saveCache(me.email, c); }
      parent = c[key];
    }
    return parent;
  }
  /* ---------- One-time move of the studio data to a new owner account ----------
     Run by the new owner (VFXQ_DATA_OWNER) while the old owner's folders are shared with it.
     Copies are owned by whoever makes them, so this account ends up owning the data file, every
     backup and every PDF. Nothing is deleted: the old folders stay as an archive and the old data
     file is renamed so no device keeps writing to it. Safe to run again: files already copied are skipped. */
  async function copyTree(src, dst, rep, skip = () => false) {
    const items = await list(`'${src}' in parents and trashed=false`, 'files(id,name,mimeType)');
    const have = new Set((await list(`'${dst}' in parents and trashed=false`, 'files(id,name,mimeType)')).map(f => f.mimeType + '|' + f.name));
    for (const it of items) {
      if (it.mimeType === FOLDER_MIME) {
        const d = (await findChild(it.name, dst, true))?.id || await createFolder(it.name, dst);
        await copyTree(it.id, d, rep, skip);
      } else if (!skip(it.name)) {
        rep.files++;
        if (have.has(it.mimeType + '|' + it.name)) { rep.already++; continue; }
        try {
          await json(`${API}/files/${it.id}/copy?fields=id&supportsAllDrives=true`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: it.name, parents: [dst] }) });
          rep.copied++;
        } catch (e) { rep.failed.push(it.name); }
      }
    }
  }
  async function myFolder(name) {
    const f = (await list(`name='${esc(name)}' and mimeType='${FOLDER_MIME}' and trashed=false and 'root' in parents`)).find(x => x.ownedByMe);
    return f ? f.id : createFolder(name);
  }
  async function moveHere(store, progress = () => {}) {
    const me = await whoAmI();
    if (!owner() || me.email !== owner()) throw new Error(`only ${owner()} can take over the studio data`);
    const { c, source } = await locate(me);
    if (!source) throw new Error('there is no studio data waiting to be moved');
    const rep = { from: ownerOf(source), quotes: 0, files: 0, copied: 0, already: 0, failed: [], renamed: false };
    progress('Reading the studio data…');
    let merged = mergeStores(store, await json(`${API}/files/${source.id}?alt=media&supportsAllDrives=true`));
    // 1. The data file, in this account's own "VishwaaFX Quotes" folder
    progress('Saving the quotes in this account…');
    const root = await myFolder(FOLDER);
    const mine = (await list(`name='${DATA_FILE}' and trashed=false and '${root}' in parents`)).find(f => f.ownedByMe);
    if (mine) merged = mergeStores(merged, await json(`${API}/files/${mine.id}?alt=media`));
    const body = () => new Blob([JSON.stringify({ ...merged, meta: undefined, savedAt: nowISO(), savedBy: me.email, app: APP_VERSION })], { type: 'application/json' });
    const res = mine ? await overwrite(mine.id, body(), 'application/json') : await uploadNew(DATA_FILE, root, body(), 'application/json');
    const check = await json(`${API}/files/${res.id}?alt=media`);
    rep.quotes = (check.projects || []).filter(p => !p.deleted).length;
    if ((check.projects || []).length !== merged.projects.length) throw new Error('the copied data file does not match. Nothing was renamed; try again');
    // 2. PDFs and anything else in the old studio folder (old data files are not copied)
    progress('Copying PDFs…');
    const oldRoot = source.parents?.[0];
    if (oldRoot) await copyTree(oldRoot, root, rep, n => n === DATA_FILE || n === INDEX_FILE || /^(merged_|moved_to_)/.test(n));
    // 3. Backups, month by month, keeping their names and numbers
    progress('Copying backups…');
    const oldBk = (await list(`name='${BACKUP_FOLDER}' and mimeType='${FOLDER_MIME}' and trashed=false`)).find(f => ownerOf(f) === rep.from);
    const bkRoot = await myFolder(BACKUP_FOLDER);
    if (oldBk) await copyTree(oldBk.id, bkRoot, rep);
    // 4. Retire the old data file only when everything is across
    if (!rep.failed.length) {
      await json(`${API}/files/${source.id}?fields=id&supportsAllDrives=true`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: `moved_to_${me.email.split('@')[0]}_${todayStr()}_${DATA_FILE}` }) });
      rep.renamed = true;
    }
    for (const k of Object.keys(c)) if (k.startsWith('m:') || k.startsWith('f:')) delete c[k];
    Object.assign(c, { root, data: res.id, backupRoot: bkRoot, mode: 'owner' }); saveCache(me.email, c);
    state.mode = 'owner'; state.moveSource = rep.renamed ? null : source;
    merged.meta = { ...(store.meta || {}), remoteModified: res.modifiedTime, lastSync: nowISO(), syncAccount: me.email, syncFile: res.id, syncMode: 'owner' };
    return { store: merged, report: rep };
  }

  /* Backups live in their own folder, "VishwaaFX Quotes Backups", next to the studio folder.
     Each backup is a new numbered version inside a month folder:
       VishwaaFX Quotes Backups / 2026-10 / v0007_2026-10-26_2100_auto.json */
  const BACKUP_FOLDER = 'VishwaaFX Quotes Backups';
  async function backupRoot(me) {
    const c = cache(me.email);
    if (c.backupRoot) return c.backupRoot;
    if (state.mode === 'noaccess') return null;
    const found = await list(`name='${BACKUP_FOLDER}' and mimeType='${FOLDER_MIME}' and trashed=false`);
    let f = found.find(x => owner() && ownerOf(x) === owner()) || found.find(x => previousOwners().includes(ownerOf(x))) || found.find(x => x.ownedByMe) || null;
    if (!f && state.mode !== 'owner') return null; // only the studio account creates the backups folder
    c.backupRoot = f ? f.id : await createFolder(BACKUP_FOLDER);
    saveCache(me.email, c);
    return c.backupRoot;
  }
  /* `day` = the day the backup is for. Manual backups use today and the real time. The automatic
     catch-up made the morning after is named for the day it covers, at 2100. */
  async function writeBackup(me, blob, label, day) {
    const root = await backupRoot(me);
    const now = new Date();
    day = day || todayStr();
    const month = day.slice(0, 7);
    const c = cache(me.email); const key = 'm:' + month;
    if (!c[key]) { const f = await findChild(month, root, true); c[key] = f ? f.id : await createFolder(month, root); saveCache(me.email, c); }
    // Next version number across all months
    const all = await list(`'${root}' in parents and trashed=false`, 'files(id,name)');
    let maxV = 0;
    for (const m of all) {
      const files = await list(`'${m.id}' in parents and trashed=false and name contains 'v'`, 'files(name)');
      for (const f of files) { const n = parseInt((f.name.match(/^v(\d+)_/) || [])[1] || '0', 10); if (n > maxV) maxV = n; }
    }
    const hhmm = day === todayStr() ? String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') : '2100';
    const name = `v${String(maxV + 1).padStart(4, '0')}_${day}_${hhmm}_${label}.json`;
    await uploadNew(name, c[key], blob, 'application/json');
    return name;
  }
  /* Which day an automatic backup file covers, from its name.
     `vNNNN_<date>_<HHMM>_auto.json`: at or after 21:00 it is that date's backup; before 21:00 it is a
     catch-up for the day before (files written before v1.2.1 carried the catch-up's own date). */
  function autoBackupDay(name) {
    const m = String(name).match(/^v\d+_(\d{4}-\d{2}-\d{2})_(\d{2})(\d{2})_auto\.json$/);
    if (!m) return null;
    return +m[2] >= 21 ? m[1] : addDays(m[1], -1);
  }
  /* Automatic backup at 9 PM (device time): the first sync after 21:00 makes today's backup;
     if the app was not opened after 9 PM, the next sync catches up for the day before.
     The "already done?" check reads the month folders on Drive, so a second device or a cleared
     browser does not write the same day again. */
  async function dailyBackup(me, blob) {
    if (state.mode !== 'owner') return; // only the studio account makes backups, so it owns them
    const day = new Date().getHours() >= 21 ? todayStr() : addDays(todayStr(), -1);
    const key = 'vfxq.backup9pm.' + me.email;
    if (ls.get(key) === day) return;
    const root = await backupRoot(me);
    // Old-style catch-ups for `day` sit under the next date, possibly in the next month's folder.
    const months = [...new Set([day.slice(0, 7), addDays(day, 1).slice(0, 7)])];
    for (const month of months) {
      const mf = await findChild(month, root, true);
      if (!mf) continue;
      const files = await list(`'${mf.id}' in parents and trashed=false`, 'files(id,name)');
      if (files.some(f => autoBackupDay(f.name) === day)) { ls.set(key, day); return; }
    }
    await writeBackup(me, blob, 'auto', day);
    ls.set(key, day);
  }
  async function backupNow(store) {
    const me = await whoAmI();
    if (owner() && me.email !== owner()) throw new Error(`backups are made by ${owner()} so the studio account owns them. Open the app with that account to back up now`);
    const blob = new Blob([JSON.stringify({ ...store, meta: undefined, savedAt: nowISO(), savedBy: me.email, app: APP_VERSION })], { type: 'application/json' });
    return writeBackup(me, blob, 'manual');
  }
  async function listBackups() {
    const me = await whoAmI(); const root = await backupRoot(me);
    if (!root) return [];
    const months = await list(`'${root}' in parents and trashed=false and mimeType='${FOLDER_MIME}'`, 'files(id,name)');
    let out = [];
    for (const m of months) out.push(...await list(`'${m.id}' in parents and trashed=false`, 'files(id,name,modifiedTime)'));
    // older-style backups kept inside the studio folder
    try { const c = cache(me.email); const old = c.root && await findChild('Backups', c.root, true); if (old) out.push(...await list(`'${old.id}' in parents and trashed=false`, 'files(id,name,modifiedTime)')); } catch {}
    return out.sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime));
  }
  async function readFile(id) { return json(`${API}/files/${id}?alt=media&supportsAllDrives=true`); }

  async function savePdf(fileName, folderName, bytes) {
    const me = await whoAmI(); if (!cache(me.email).root || state.mode === 'unknown') await locate(me);
    if (state.mode === 'noaccess') throw new Error(`this account has no access to the studio data yet. Ask ${owner()} to add it`);
    if (state.mode === 'view') throw new Error('this account has View only access, so it cannot save to Drive');
    const parent = await subFolder(me, ['PDF', folderName]);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const ex = await findChild(fileName, parent);
    const r = ex ? await overwrite(ex.id, blob, 'application/pdf') : await uploadNew(fileName, parent, blob, 'application/pdf');
    return { ...r, id: r.id || ex?.id };
  }

  /* ---------- Access manager (owner only, v1.3.1) ----------
     Every account sits on two folders: the studio folder (data file + PDFs) and the backups folder.
     Add and Remove always act on both, so an account never keeps half its access. */
  const keyOf = p => p.type === 'user' || p.type === 'group' ? String(p.emailAddress || '').toLowerCase() : p.type;
  async function accessFolders() {
    const me = await whoAmI();
    if (state.mode === 'unknown') await locate(me);
    if (state.mode !== 'owner') throw new Error(`only ${owner() || 'the studio account'} can manage access`);
    if (!cache(me.email).root) await locate(me);
    const out = [{ key: 'studio', id: cache(me.email).root }];
    const bk = await backupRoot(me); if (bk) out.push({ key: 'backups', id: bk });
    return { me, folders: out };
  }
  async function perms(id) {
    const r = await json(`${API}/files/${id}/permissions?fields=${encodeURIComponent('permissions(id,type,role,emailAddress,displayName)')}&supportsAllDrives=true`);
    return r.permissions || [];
  }
  /* [{ email, name, type, role: 'owner'|'writer'|'reader'|…, partial: true when on only one of the two folders }] */
  async function access() {
    const { folders } = await accessFolders();
    const people = {};
    for (const f of folders) for (const p of await perms(f.id)) {
      const k = keyOf(p); const e = people[k] || (people[k] = { email: k, name: p.displayName || '', type: p.type, roles: {} });
      e.roles[f.key] = p.role;
    }
    return Object.values(people).map(e => ({
      email: e.email, name: e.name, type: e.type, roles: e.roles,
      role: e.roles.studio || e.roles.backups, partial: folders.some(f => !e.roles[f.key])
    })).sort((a, b) => (b.role === 'owner') - (a.role === 'owner') || a.email.localeCompare(b.email));
  }
  async function grant(email, role = 'writer') {
    email = String(email || '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('enter a valid email address');
    if (!['writer', 'reader'].includes(role)) throw new Error('unknown access level');
    const { me, folders } = await accessFolders();
    if (email === me.email) throw new Error('this account owns the studio data already');
    for (const f of folders) {
      const ex = (await perms(f.id)).find(p => keyOf(p) === email);
      if (ex?.role === 'owner') throw new Error(`${email} owns this folder`);
      if (ex && ex.role === role) continue;
      if (ex) await json(`${API}/files/${f.id}/permissions/${ex.id}?supportsAllDrives=true&fields=id`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) });
      else await json(`${API}/files/${f.id}/permissions?sendNotificationEmail=false&supportsAllDrives=true&fields=id`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'user', role, emailAddress: email }) });
    }
    return true;
  }
  const shareWith = email => grant(email, 'writer');
  /* Takes the account off the studio folder AND the backups folder, then checks both. */
  async function revoke(email) {
    email = String(email || '').trim().toLowerCase();
    const { me, folders } = await accessFolders();
    if (email === me.email) throw new Error('the studio account cannot remove itself');
    for (const f of folders) {
      const ex = (await perms(f.id)).find(p => keyOf(p) === email);
      if (!ex) continue;
      if (ex.role === 'owner') throw new Error(`${email} owns this folder`);
      await api(`${API}/files/${f.id}/permissions/${ex.id}?supportsAllDrives=true`, { method: 'DELETE' });
    }
    for (const f of folders) if ((await perms(f.id)).some(p => keyOf(p) === email)) throw new Error(`${email} still has access to the ${f.key} folder. Try again`);
    return true;
  }
  async function sharedWith() { return (await access()).filter(p => p.role !== 'owner').map(p => p.email); }

  return { authorize, handleRedirect, maybeSilentRefresh, disconnect, sync, moveHere, previousOwners, savePdf, listBackups, backupNow, BACKUP_FOLDER, readFile, shareWith, sharedWith, access, grant, revoke,
    isConnected, needsUpgrade, token, user, owner, state, clientId, setClientId, redirectUri, FOLDER };
})();
