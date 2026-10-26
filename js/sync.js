/* Google Drive sync — OAuth 2.0 token (redirect) flow + Drive v3 REST.
   Scope drive.file: the app only sees files it created itself. */
'use strict';

const Drive = (() => {
  const SCOPE = 'https://www.googleapis.com/auth/drive.file';
  const API = 'https://www.googleapis.com/drive/v3';
  const UPLOAD = 'https://www.googleapis.com/upload/drive/v3';
  const FOLDER = 'VishwaaFX Quotes';
  const DATA_FILE = 'vishwaafx_quotes_data.json';
  const K = { client: 'vfxq.clientId', token: 'vfxq.token', connected: 'vfxq.connected', ids: 'vfxq.driveIds', ret: 'vfxq.returnRoute', silent: 'vfxq.silentTry' };

  const ls = {
    get: (k, d = null) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
    set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
    del: k => { try { localStorage.removeItem(k); } catch {} }
  };

  const redirectUri = () => location.origin + location.pathname;
  const clientId = () => (ls.get(K.client) || window.VFXQ_CLIENT_ID || '').trim();
  const token = () => { const t = ls.get(K.token); return t && t.exp > Date.now() + 60000 ? t.value : null; };
  const isConnected = () => !!ls.get(K.connected);

  function setClientId(id) { ls.set(K.client, (id || '').trim()); }

  function authorize({ silent = false } = {}) {
    const cid = clientId(); if (!cid) throw new Error('Add your Google OAuth Client ID in Settings → Google Drive first.');
    ls.set(K.ret, location.hash || '#/');
    const state = Math.random().toString(36).slice(2);
    sessionStorage.setItem('vfxq.state', state);
    const q = new URLSearchParams({
      client_id: cid, redirect_uri: redirectUri(), response_type: 'token', scope: SCOPE,
      include_granted_scopes: 'true', state, prompt: silent ? 'none' : 'consent'
    });
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
      return q.get('error') === 'interaction_required' || q.get('error') === 'login_required'
        ? 'reconnect' : 'Google sign-in was cancelled (' + q.get('error') + ').';
    }
    const st = sessionStorage.getItem('vfxq.state');
    if (st && q.get('state') !== st) return 'Sign-in check failed. Please connect again.';
    ls.set(K.token, { value: q.get('access_token'), exp: Date.now() + (num(q.get('expires_in')) || 3600) * 1000 });
    ls.set(K.connected, true);
    return 'connected';
  }

  /* When connected but the 1-hour token expired: one quiet redirect to refresh it. */
  function maybeSilentRefresh() {
    if (!isConnected() || token() || !navigator.onLine || !clientId()) return false;
    const last = num(sessionStorage.getItem(K.silent));
    if (Date.now() - last < 10 * 60000) return false;
    sessionStorage.setItem(K.silent, String(Date.now()));
    authorize({ silent: true });
    return true;
  }

  function disconnect() {
    const t = ls.get(K.token);
    if (t?.value) fetch('https://oauth2.googleapis.com/revoke?token=' + encodeURIComponent(t.value), { method: 'POST' }).catch(() => {});
    [K.token, K.connected, K.ids].forEach(ls.del);
  }

  async function api(url, opts = {}) {
    const tk = token(); if (!tk) { const e = new Error('Drive session expired'); e.code = 'AUTH'; throw e; }
    const res = await fetch(url, { ...opts, headers: { Authorization: 'Bearer ' + tk, ...(opts.headers || {}) } });
    if (res.status === 401) { ls.del(K.token); const e = new Error('Drive session expired'); e.code = 'AUTH'; throw e; }
    if (!res.ok) throw new Error('Drive error ' + res.status + ': ' + (await res.text()).slice(0, 200));
    return res;
  }
  const q = s => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

  async function findOne(name, parent, folder = false) {
    let query = `name='${q(name)}' and trashed=false`;
    if (parent) query += ` and '${parent}' in parents`;
    if (folder) query += ` and mimeType='application/vnd.google-apps.folder'`;
    const r = await api(`${API}/files?q=${encodeURIComponent(query)}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=5`);
    return (await r.json()).files[0] || null;
  }
  async function createFolder(name, parent) {
    const r = await api(`${API}/files?fields=id`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: parent ? [parent] : undefined })
    });
    return (await r.json()).id;
  }
  async function folderId(name, parent) {
    const f = await findOne(name, parent, true); return f ? f.id : createFolder(name, parent);
  }
  async function ids() {
    let c = ls.get(K.ids) || {};
    if (!c.root) { c.root = await folderId(FOLDER); ls.set(K.ids, c); }
    return c;
  }
  async function subFolder(path) { // e.g. ['PDF', 'VFX-26-27-002 Law and Order']
    const c = await ids(); let parent = c.root;
    for (const part of path) {
      const key = 'f:' + parent + '/' + part;
      if (!c[key]) { c[key] = await folderId(part, parent); ls.set(K.ids, c); }
      parent = c[key];
    }
    return parent;
  }

  async function uploadNew(name, parent, blob, mime) {
    const meta = { name, parents: [parent], mimeType: mime };
    const body = new FormData();
    body.append('metadata', new Blob([JSON.stringify(meta)], { type: 'application/json' }));
    body.append('file', blob);
    const r = await api(`${UPLOAD}/files?uploadType=multipart&fields=id,modifiedTime,webViewLink`, { method: 'POST', body });
    return r.json();
  }
  async function overwrite(id, blob, mime) {
    const r = await api(`${UPLOAD}/files/${id}?uploadType=media&fields=id,modifiedTime`, { method: 'PATCH', headers: { 'Content-Type': mime }, body: blob });
    return r.json();
  }

  /* Pull remote, merge, push merged. Returns merged store. */
  async function sync(store) {
    const c = await ids();
    let file = c.data ? { id: c.data } : await findOne(DATA_FILE, c.root);
    let merged = store;
    if (file) {
      let meta = null;
      try { meta = await (await api(`${API}/files/${file.id}?fields=id,modifiedTime,trashed`)).json(); }
      catch (e) { if (e.code === 'AUTH') throw e; }
      if (!meta || meta.trashed) { file = null; delete c.data; ls.set(K.ids, c); }
      else if (meta.modifiedTime !== store.meta.remoteModified) {
        const remote = await (await api(`${API}/files/${file.id}?alt=media`)).json();
        merged = mergeStores(store, remote);
      }
    }
    merged.meta = { ...(store.meta || {}) };
    const blob = new Blob([JSON.stringify({ ...merged, meta: undefined, savedAt: nowISO(), app: APP_VERSION })], { type: 'application/json' });
    let res;
    if (file) res = await overwrite(file.id, blob, 'application/json');
    else { res = await uploadNew(DATA_FILE, c.root, blob, 'application/json'); }
    c.data = res.id; ls.set(K.ids, c);
    merged.meta.remoteModified = res.modifiedTime;
    merged.meta.lastSync = nowISO();
    await dailyBackup(blob).catch(e => console.warn('backup', e));
    return merged;
  }

  async function dailyBackup(blob) {
    const day = todayStr();
    if (ls.get('vfxq.lastBackup') === day) return;
    const folder = await subFolder(['Backups']);
    const name = `backup_${day}.json`;
    const ex = await findOne(name, folder);
    if (ex) await overwrite(ex.id, blob, 'application/json'); else await uploadNew(name, folder, blob, 'application/json');
    ls.set('vfxq.lastBackup', day);
  }

  async function savePdf(fileName, folderName, bytes) {
    const parent = await subFolder(['PDF', folderName]);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const ex = await findOne(fileName, parent);
    return ex ? overwrite(ex.id, blob, 'application/pdf') : uploadNew(fileName, parent, blob, 'application/pdf');
  }

  return { authorize, handleRedirect, maybeSilentRefresh, disconnect, sync, savePdf, isConnected, token, clientId, setClientId, redirectUri, FOLDER };
})();
