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
  const redirectUri = () => location.origin + location.pathname;
  const clientId = () => (ls.get(K.client) || window.VFXQ_CLIENT_ID || '').trim();
  const tokenRec = () => ls.get(K.token);
  const token = () => { const t = tokenRec(); return t && t.exp > Date.now() + 60000 ? t.value : null; };
  const isConnected = () => !!ls.get(K.connected);
  /* Tokens from the first version only had access to the app's own files. */
  const needsUpgrade = () => { const t = tokenRec(); return isConnected() && !!t && !String(t.scope || '').split(' ').includes(SCOPE); };
  const user = () => ls.get(K.who);
  const state = { mode: 'unknown', ownerEmail: owner() }; // 'owner' | 'shared' | 'private'

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

  async function list(query, fields = 'files(id,name,modifiedTime,createdTime,ownedByMe,owners(emailAddress),parents)') {
    const r = await json(`${API}/files?q=${encodeURIComponent(query)}&fields=${encodeURIComponent(fields)}&orderBy=createdTime&pageSize=50&supportsAllDrives=true&includeItemsFromAllDrives=true`);
    return r.files || [];
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

  /* Work out which data file is THE studio file, and merge any strays into it. */
  async function locate(me) {
    const c = cache(me.email);
    const files = await list(`name='${DATA_FILE}' and trashed=false`);
    let primary = null;
    if (owner()) primary = files.find(f => ownerOf(f) === owner()) || null;
    if (!primary) primary = files.find(f => f.ownedByMe) || files[0] || null;
    const iAmOwner = !owner() || me.email === owner();
    state.mode = iAmOwner ? 'owner' : (primary && ownerOf(primary) === owner() ? 'shared' : 'private');
    if (c.mode !== state.mode) { // switched between a private copy and the shared studio data: forget old folder ids
      for (const k of Object.keys(c)) if (k === 'backupRoot' || k.startsWith('m:') || k.startsWith('f:')) delete c[k];
      c.mode = state.mode;
    }
    // Folder that holds the data file is the root for PDFs and backups.
    if (primary) { c.data = primary.id; c.root = primary.parents?.[0] || c.root; }
    else {
      let root = (await list(`name='${FOLDER}' and mimeType='${FOLDER_MIME}' and trashed=false and 'root' in parents`))[0];
      c.root = root ? root.id : await createFolder(FOLDER);
      delete c.data;
    }
    saveCache(me.email, c);
    // Other copies this account can edit (e.g. the second account's old private file).
    const strays = primary ? files.filter(f => f.id !== primary.id && f.ownedByMe) : [];
    return { c, primary, strays };
  }

  /* Pull remote, merge, push merged. Returns merged store. */
  async function sync(store) {
    const me = await whoAmI();
    const { c, primary, strays } = await locate(me);
    let merged = store;
    const sameAccount = store.meta.syncAccount === me.email && store.meta.syncFile === c.data;
    if (primary && (!sameAccount || primary.modifiedTime !== store.meta.remoteModified)) {
      const remote = await json(`${API}/files/${primary.id}?alt=media&supportsAllDrives=true`);
      merged = mergeStores(store, remote);
    }
    for (const f of strays) { // fold an old separate copy in, then retire it
      try {
        const other = await json(`${API}/files/${f.id}?alt=media`);
        merged = mergeStores(merged, other);
        await json(`${API}/files/${f.id}?fields=id`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: `merged_${todayStr()}_${DATA_FILE}` }) });
      } catch (e) { console.warn('stray merge', e); }
    }
    merged.meta = { ...(store.meta || {}) };
    const blob = new Blob([JSON.stringify({ ...merged, meta: undefined, savedAt: nowISO(), savedBy: me.email, app: APP_VERSION })], { type: 'application/json' });
    const res = primary ? await overwrite(primary.id, blob, 'application/json') : await uploadNew(DATA_FILE, c.root, blob, 'application/json');
    c.data = res.id; saveCache(me.email, c);
    Object.assign(merged.meta, { remoteModified: res.modifiedTime, lastSync: nowISO(), syncAccount: me.email, syncFile: res.id, syncMode: state.mode });
    await dailyBackup(me, blob).catch(e => console.warn('backup', e));
    return merged;
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
  /* Backups live in their own folder, "VishwaaFX Quotes Backups", next to the studio folder.
     Each backup is a new numbered version inside a month folder:
       VishwaaFX Quotes Backups / 2026-10 / v0007_2026-10-26_2100_auto.json */
  const BACKUP_FOLDER = 'VishwaaFX Quotes Backups';
  async function backupRoot(me) {
    const c = cache(me.email);
    if (c.backupRoot) return c.backupRoot;
    const found = await list(`name='${BACKUP_FOLDER}' and mimeType='${FOLDER_MIME}' and trashed=false`);
    let f = found.find(x => owner() && ownerOf(x) === owner()) || found.find(x => x.ownedByMe) || null;
    c.backupRoot = f ? f.id : await createFolder(BACKUP_FOLDER);
    saveCache(me.email, c);
    return c.backupRoot;
  }
  async function writeBackup(me, blob, label) {
    const root = await backupRoot(me);
    const now = new Date();
    const month = todayStr().slice(0, 7);
    const c = cache(me.email); const key = 'm:' + month;
    if (!c[key]) { const f = await findChild(month, root, true); c[key] = f ? f.id : await createFolder(month, root); saveCache(me.email, c); }
    // Next version number across all months
    const all = await list(`'${root}' in parents and trashed=false`, 'files(id,name)');
    let maxV = 0;
    for (const m of all) {
      const files = await list(`'${m.id}' in parents and trashed=false and name contains 'v'`, 'files(name)');
      for (const f of files) { const n = parseInt((f.name.match(/^v(\d+)_/) || [])[1] || '0', 10); if (n > maxV) maxV = n; }
    }
    const hhmm = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    const name = `v${String(maxV + 1).padStart(4, '0')}_${todayStr()}_${hhmm}_${label}.json`;
    await uploadNew(name, c[key], blob, 'application/json');
    return name;
  }
  /* Automatic backup at 9 PM (device time): the first sync after 21:00 makes today's backup;
     if the app was not opened after 9 PM, the next sync catches up for the day before. */
  async function dailyBackup(me, blob) {
    const day = new Date().getHours() >= 21 ? todayStr() : addDays(todayStr(), -1);
    const key = 'vfxq.backup9pm.' + me.email;
    if (ls.get(key) === day) return;
    const root = await backupRoot(me);
    const month = day.slice(0, 7);
    const mf = await findChild(month, root, true);
    if (mf && (await list(`'${mf.id}' in parents and trashed=false and name contains '${day}' and name contains '_auto'`, 'files(id)')).length) { ls.set(key, day); return; }
    await writeBackup(me, blob, 'auto');
    ls.set(key, day);
  }
  async function backupNow(store) {
    const me = await whoAmI();
    const blob = new Blob([JSON.stringify({ ...store, meta: undefined, savedAt: nowISO(), savedBy: me.email, app: APP_VERSION })], { type: 'application/json' });
    return writeBackup(me, blob, 'manual');
  }
  async function listBackups() {
    const me = await whoAmI(); const root = await backupRoot(me);
    const months = await list(`'${root}' in parents and trashed=false and mimeType='${FOLDER_MIME}'`, 'files(id,name)');
    let out = [];
    for (const m of months) out.push(...await list(`'${m.id}' in parents and trashed=false`, 'files(id,name,modifiedTime)'));
    // older-style backups kept inside the studio folder
    try { const c = cache(me.email); const old = c.root && await findChild('Backups', c.root, true); if (old) out.push(...await list(`'${old.id}' in parents and trashed=false`, 'files(id,name,modifiedTime)')); } catch {}
    return out.sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime));
  }
  async function readFile(id) { return json(`${API}/files/${id}?alt=media&supportsAllDrives=true`); }

  async function savePdf(fileName, folderName, bytes) {
    const me = await whoAmI(); if (!cache(me.email).root) await locate(me);
    const parent = await subFolder(me, ['PDF', folderName]);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const ex = await findChild(fileName, parent);
    return ex ? overwrite(ex.id, blob, 'application/pdf') : uploadNew(fileName, parent, blob, 'application/pdf');
  }

  /* Owner only: give another Google account edit access to the studio folder. */
  async function shareWith(email) {
    const me = await whoAmI(); const c = cache(me.email.toLowerCase());
    if (!c.root) await locate(me);
    const ids = [cache(me.email).root, await backupRoot(me)];
    for (const id of ids) await json(`${API}/files/${id}/permissions?sendNotificationEmail=false&supportsAllDrives=true&fields=id`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'user', role: 'writer', emailAddress: email })
    });
    return true;
  }
  async function sharedWith() {
    const me = await whoAmI(); const root = cache(me.email).root; if (!root) return [];
    const r = await json(`${API}/files/${root}/permissions?fields=permissions(emailAddress,role)&supportsAllDrives=true`);
    return (r.permissions || []).filter(p => p.role !== 'owner').map(p => p.emailAddress);
  }

  return { authorize, handleRedirect, maybeSilentRefresh, disconnect, sync, savePdf, listBackups, backupNow, BACKUP_FOLDER, readFile, shareWith, sharedWith,
    isConnected, needsUpgrade, token, user, owner, state, clientId, setClientId, redirectUri, FOLDER };
})();
