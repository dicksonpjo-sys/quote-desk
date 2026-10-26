/* VishwaaFX Quote Desk — interface */
'use strict';

let store;
let route = { name: 'start' };
const ui = { cat: 'All', q: '', status: 'All', tab: 'quote', kind: 'quote' };
const KIND = { quote: { name: 'Project Quotes', one: 'quote', New: 'New quote' }, supervision: { name: 'On-Site Supervision', one: 'bill', New: 'New bill' } };
let syncState = 'local';
const $app = () => document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const IN_ARTIFACT = /claude\.ai|claudeusercontent|anthropic/.test(location.hostname);

const I = {
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  more: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.9"/><circle cx="12" cy="12" r="1.9"/><circle cx="19" cy="12" r="1.9"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  pdf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>',
  film: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M3 15h4M17 9h4M17 15h4"/></svg>',
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 10l5-3v10l-5-3z"/><rect x="3" y="6" width="12" height="12" rx="2"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>'
};

/* ---------------- state helpers ---------------- */
const curP = () => store.projects.find(p => p.id === route.id);
const secOf = (p, id) => p.sections.find(s => s.id === id);
let saveTimer;
function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveLocal(store); scheduleSync(); }, 400);
}
function touchP(p) { p.updatedAt = nowISO(); persist(); }
function touchS() { store.settings.updatedAt = nowISO(); persist(); }

function toast(msg, ms = 2600) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg; t.setAttribute('role', 'status');
  document.body.appendChild(t); setTimeout(() => t.remove(), ms);
}

/* ---------------- routing ---------------- */
function go(r, push = true) {
  route = r;
  try { sessionStorage.setItem('vfxq.route', JSON.stringify(r)); } catch {}
  if (push) try { history.pushState(r, ''); } catch {}
  render(true);
}
window.addEventListener('popstate', e => { closeSheet(); ACT.closeviewer(); route = e.state || { name: 'start' }; if (route.kind) ui.kind = route.kind; render(true); });

/* ---------------- render ---------------- */
function render(resetScroll = false) {
  const y = window.scrollY;
  const v = VIEWS[route.name] ? VIEWS[route.name]() : VIEWS.start();
  $app().innerHTML = `
    <header class="topbar"><div class="topbar-in">
      ${v.back ? `<button class="iconbtn" data-act="back" aria-label="Back">${I.back}</button>` : `<img class="mark" src="icons/mark.png" alt="VishwaaFX">`}
      <div class="ttl">${esc(v.title)}${v.sub ? `<small>${esc(v.sub)}</small>` : ''}</div>
      ${syncPill()}
      ${v.right || ''}
    </div></header>
    <main class="wrap">${v.body}</main>
    ${v.bottom || ''}${v.fab || ''}
    <datalist id="descs">${allDescriptions(store).map(d => `<option value="${esc(d)}">`).join('')}</datalist>`;
  window.scrollTo(0, resetScroll ? 0 : y);
  refresh();
}

function syncPill() {
  const map = {
    local: ['local', 'On this device'], ok: ['ok', 'Synced'], busy: ['busy', 'Syncing…'],
    off: ['off', 'Reconnect Drive'], err: ['off', 'Sync failed'], offline: ['local', 'Offline · saved']
  };
  const [cls, label] = map[syncState] || map.local;
  return `<button class="sync ${cls}" data-act="syncpill" title="Google Drive sync"><i></i>${label}</button>`;
}
function setSync(s) { syncState = s; const el = document.querySelector('.sync'); if (el) el.outerHTML = syncPill(); }

/* computed values that update while typing */
function calc(key) {
  const p = curP(); const [k, a, b] = key.split(':');
  const sec = p && a ? secOf(p, a) : null;
  switch (k) {
    case 'lamt': { const l = sec?.lines.find(x => x.id === b); return l ? rs(lineAmount(l)) : ''; }
    case 'sgross': return rs(secGross(sec));
    case 'sdisc': return '− ' + rs(secDiscount(sec));
    case 'snet': return rs(secNet(sec));
    case 'sdur': { const d = secDuration(sec); return d ? `${d} sec · ${mmss(d)}` : '—'; }
    case 'ptotal': return rs(projectValue(p));
    case 'precv': return rs(projectReceived(p));
    case 'ppend': return rs(Math.max(0, projectValue(p) - projectReceived(p)));
    case 'pvalid': return fmtDate(validTill(p));
    case 'pno': return quoteNo(store, p);
    case 'hint': {
      const l = sec?.lines.find(x => x.id === b); if (!l || l.type !== 'rate' || !l.desc.trim()) return '';
      const h = rateHistory(store, l.desc, p.category, p.id);
      if (!h || h.rate === num(l.rate)) return '';
      return `Last used ₹${inr(h.rate)}/sec · ${h.project}${num(l.rate) ? '' : ' — tap to use'}`;
    }
    default: return '';
  }
}
function refresh() {
  document.querySelectorAll('[data-calc]').forEach(el => { const v = calc(el.dataset.calc); if (el.textContent !== v) el.textContent = v; });
  document.querySelectorAll('[data-show]').forEach(el => {
    const [k, id] = el.dataset.show.split(':'); const p = curP(); const sec = p && secOf(p, id);
    if (k === 'durwarn') el.hidden = !(sec && sameDurWarning(sec));
    if (k === 'disc') el.hidden = !(sec && secDiscount(sec) !== 0);
  });
}

/* ---------------- binding ---------------- */
function target(path) {
  const parts = path.split(':'); const p = curP(); const s = store.settings;
  switch (parts[0]) {
    case 'p': return { obj: p, key: parts[1], scope: 'p' };
    case 'pdf': return { obj: p.pdf, key: parts[1], scope: 'p' };
    case 'sec': return { obj: secOf(p, parts[1]), key: parts[2], scope: 'p' };
    case 'pay': return { obj: secOf(p, parts[1]).pay, key: parts[2], scope: 'p' };
    case 'ln': return { obj: secOf(p, parts[1]).lines.find(l => l.id === parts[2]), key: parts[3], scope: 'p' };
    case 'blk': return { obj: p.blocks.find(b => b.id === parts[1]), key: parts[2], scope: 'p' };
    case 'set': { let o = s; const ks = parts[1].split('.'); while (ks.length > 1) o = o[ks.shift()]; return { obj: o, key: ks[0], scope: 's' }; }
    case 'lib': return { obj: s.blocks.find(b => b.id === parts[1]), key: parts[2], scope: 's' };
    case 'tpl': return { obj: s.templates.find(t => t.id === parts[1]), key: parts[2], scope: 's' };
    case 'sig': return { obj: s.signatories.find(t => t.id === parts[1]), key: parts[2], scope: 's' };
    case 'bank': return { obj: s.banks.find(t => t.id === parts[1]), key: parts[2], scope: 's' };
    case 'cattpl': return { obj: s.categoryTemplate, key: parts.slice(1).join(':'), scope: 's' };
  }
  return null;
}
function applyBind(el) {
  const t = target(el.dataset.bind); if (!t || !t.obj) return;
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (el.dataset.lines !== undefined) v = String(v).split('\n').map(x => x.trim()).filter(Boolean);
  if (el.dataset.int !== undefined) v = num(v);
  t.obj[t.key] = v;
  if (t.scope === 'p') touchP(curP()); else touchS();
}

document.addEventListener('input', e => {
  const el = e.target.closest('[data-bind]'); if (!el) return;
  if (el.type === 'checkbox' || el.tagName === 'SELECT') return; // handled on change
  applyBind(el); refresh();
});
document.addEventListener('change', e => {
  const el = e.target.closest('[data-bind]'); if (!el) return;
  applyBind(el);
  if (el.dataset.bind.startsWith('ln:') && el.dataset.bind.endsWith(':desc')) autoRate(el);
  if (el.dataset.re !== undefined) render(); else refresh();
});
document.addEventListener('click', e => {
  const el = e.target.closest('[data-act]'); if (!el) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  if (el.tagName !== 'INPUT') e.preventDefault();
  fn(el, e);
});

function autoRate(el) {
  const [, sid, lid] = el.dataset.bind.split(':'); const p = curP(); const l = secOf(p, sid).lines.find(x => x.id === lid);
  if (l.type !== 'rate' || num(l.rate)) return;
  const h = rateHistory(store, l.desc, p.category, p.id);
  if (h) { l.rate = String(h.rate); touchP(p); const inp = document.getElementById('rate_' + lid); if (inp) inp.value = l.rate; refresh(); }
}

/* ---------------- sheets & confirm (no native dialogs) ---------------- */
function openSheet(html) {
  closeSheet();
  const o = document.createElement('div'); o.className = 'overlay'; o.id = 'sheet';
  o.innerHTML = `<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  o.addEventListener('click', e => { if (e.target === o) closeSheet(); });
  document.body.appendChild(o);
  const f = o.querySelector('input,select,textarea'); if (f && matchMedia('(min-width: 700px)').matches) f.focus();
}
function closeSheet() { document.getElementById('sheet')?.remove(); }
let pendingConfirm = null;
function confirmBox(title, msg, okLabel, fn, danger = true) {
  pendingConfirm = fn;
  openSheet(`<h2>${esc(title)}</h2><p class="muted" style="margin:0">${esc(msg)}</p>
    <div class="acts"><button class="btn" data-act="closesheet">Cancel</button>
    <button class="btn ${danger ? 'danger' : 'primary'}" data-act="confirmok">${esc(okLabel)}</button></div>`);
}

/* ================= VIEWS ================= */
const VIEWS = {};

VIEWS.start = () => {
  const live = store.projects.filter(p => !p.deleted);
  const card = (k, title, desc, icon) => {
    const list = live.filter(p => kindOf(p) === k);
    const due = list.reduce((a, p) => a + projectPending(p), 0);
    return `<button class="startcard" data-act="kind" data-v="${k}">
      <span class="sc-ic">${icon}</span>
      <span class="sc-t"><b>${title}</b><small>${desc}</small>
      <span class="sc-meta">${list.length} ${list.length === 1 ? KIND[k].one : KIND[k].one + 's'}${due ? ` · <em>${rs(due)} to collect</em>` : ''}</span></span>
      <span class="chev">›</span></button>`;
  };
  return {
    title: 'Quote Desk', sub: 'VishwaaFX',
    right: `<button class="iconbtn" data-act="go" data-r="settings" aria-label="Settings">${I.gear}</button>`,
    body: `<div class="start-h"><img src="logo.png" alt="VishwaaFX Visual Effects Studio"><h1>What are you preparing?</h1></div>
      ${card('quote', 'Project Quote', 'VFX work for a film, series or ad: initial bill, additional bills, cost breakdown.', I.film)}
      ${card('supervision', 'On-Site Supervision', 'Shoot days on set, travel, fuel and food. Paid to a separate bank account.', I.cam)}`
  };
};

VIEWS.home = () => {
  const k = ui.kind;
  const live = store.projects.filter(p => !p.deleted && kindOf(p) === k);
  const cats = ['All', ...store.settings.categories];
  const count = c => c === 'All' ? live.length : live.filter(p => p.category === c).length;

  const pending = live.reduce((a, p) => a + projectPending(p), 0);
  const open = live.filter(p => p.status === (k === 'supervision' ? 'Draft' : 'Sent')).reduce((a, p) => a + projectValue(p), 0);
  const received = live.reduce((a, p) => a + projectReceived(p), 0);
  const expiring = k === 'supervision' ? 0 : live.filter(p => ['Draft', 'Sent'].includes(p.status) && daysLeft(p) <= 7).length;

  const body = `
    <section class="band" aria-label="Summary">
      <div><div class="eyebrow">${k === 'supervision' ? 'To collect · bills sent' : 'To collect · approved work'}</div><div class="band-total money">${rs(pending)}</div></div>
      <div class="stats">
        <div class="stat"><b class="money">${rs(open)}</b><span>${k === 'supervision' ? 'Drafts, not sent' : 'Quoted, awaiting OK'}</span></div>
        <div class="stat"><b class="money">${rs(received)}</b><span>Received</span></div>
        ${k === 'supervision' ? `<div class="stat"><b>${live.length}</b><span>Bills</span></div>` : `<div class="stat ${expiring ? 'alert' : ''}"><b>${expiring}</b><span>Expire ≤ 7 days</span></div>`}
      </div>
    </section>
    ${k === 'supervision' ? '' : `<div class="chips" role="tablist">${cats.map(c => `<button class="chip ${ui.cat === c ? 'on' : ''}" data-act="cat" data-v="${esc(c)}">${esc(c)}<b>${count(c)}</b></button>`).join('')}</div>`}
    <div class="search">
      <input type="search" id="q" placeholder="Search name, client or quote no." value="${esc(ui.q)}" data-act-input="search" aria-label="Search">
      <select id="statusf" data-act-change="statusf" aria-label="Status" style="width:auto">${['All', ...STATUSES].map(s => `<option ${ui.status === s ? 'selected' : ''} value="${s}">${s === 'All' ? 'All status' : s}</option>`).join('')}</select>
    </div>
    <div class="plist" id="plist">${homeList()}</div>`;
  return {
    title: KIND[k].name, sub: 'VishwaaFX', body, back: true,
    right: `<button class="iconbtn" data-act="go" data-r="settings" aria-label="Settings">${I.gear}</button>`,
    fab: `<button class="fab" data-act="go" data-r="new">${I.plus}${KIND[k].New}</button>`
  };
};

function homeList() {
  let list = store.projects.filter(p => !p.deleted && kindOf(p) === ui.kind && (ui.kind === 'supervision' || ui.cat === 'All' || p.category === ui.cat));
  if (ui.status !== 'All') list = list.filter(p => p.status === ui.status);
  if (ui.q.trim()) { const q = ui.q.toLowerCase(); list = list.filter(p => (p.name + ' ' + p.client + ' ' + quoteNo(store, p)).toLowerCase().includes(q)); }
  list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return list.length ? list.map(pcard).join('') : `<div class="card empty"><b>${ui.q || ui.status !== 'All' ? 'No matching quotes' : 'No quotes here yet'}</b>${ui.q || ui.status !== 'All' ? 'Try another search or status.' : 'Tap “New quote” to start one.'}</div>`;
}
function statusPill(s) { return `<span class="pill ${s.replace(' ', '-')}">${esc(s)}</span>`; }
function expiryPill(p) {
  if (!['Draft', 'Sent'].includes(p.status) || kindOf(p) === 'supervision') return '';
  const d = daysLeft(p);
  if (d < 0) return `<span class="pill expired">Expired</span>`;
  if (d <= 7) return `<span class="pill soon">${d === 0 ? 'Expires today' : `Expires in ${d}d`}</span>`;
  return '';
}
function pcard(p) {
  const val = projectValue(p), rec = projectReceived(p);
  const tiersOpen = p.mode === 'tiers' && !p.selectedTier;
  const right = isCommitted(p)
    ? `<div style="min-width:120px"><div class="meter"><i style="width:${val ? Math.min(100, rec / val * 100) : 0}%"></i></div>
       <div class="paysum">${rs(rec)} in · <b>${rs(val - rec)}</b> due</div></div>`
    : `<div class="paysum">${kindOf(p) === 'supervision' ? 'Not sent yet' : 'Valid till ' + fmtDate(validTill(p))}</div>`;
  return `<button class="pcard" data-act="open" data-id="${p.id}">
    <div class="top"><span class="qno">${esc(quoteNo(store, p))}</span><span class="row" style="gap:6px">${expiryPill(p)}${statusPill(p.status)}</span></div>
    <h3>${esc(p.name)}</h3>
    <div class="client">${esc(p.client || '—')}</div>
    <div class="row" style="gap:6px">${kindOf(p) === 'supervision' ? `<span class="tag">${p.sections[0].lines.length} entries</span>` : `<span class="tag">${esc(p.category)}</span><span class="tag">${p.mode === 'tiers' ? p.sections.length + ' options' : p.sections.length + (p.sections.length === 1 ? ' bill' : ' bills')}</span>`}<span class="tag">${fmtDate(p.date)}</span></div>
    <div class="foot"><div class="val money"><small>${tiersOpen ? 'Highest option' : 'Total'}</small>${rs(val)}</div>${right}</div>
  </button>`;
}

VIEWS.new = () => {
  const s = store.settings; const d = route.draft || (route.draft = { name: '', client: '', category: ui.cat !== 'All' ? ui.cat : s.categories[0], date: todayStr(), from: '' });
  const k = ui.kind; const tpls = s.templates.filter(t => (t.kind || 'quote') === k);
  if (!tpls.some(t => t.id === d.templateId)) d.templateId = (k === 'quote' && tpls.find(t => t.id === s.categoryTemplate[d.category])?.id) || tpls[0]?.id;
  const fy = fyOf(d.date);
  const preview = `${k === 'supervision' ? s.supPrefix : s.numberPrefix}/${fy}/${pad3(nextSeq(store, fy, k))}`;
  const others = store.projects.filter(p => !p.deleted && kindOf(p) === k).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return {
    title: KIND[k].New, sub: preview, back: true,
    body: `<section class="card stack">
      <label class="f">Project name<input type="text" id="n_name" data-draft="name" value="${esc(d.name)}" placeholder="e.g. Law and Order"></label>
      ${k === 'quote' ? `<label class="f">Category<select id="n_cat" data-draft="category">${s.categories.map(c => `<option ${c === d.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>` : ''}
      <label class="f">Production / client<input type="text" id="n_client" data-draft="client" value="${esc(d.client)}" placeholder="e.g. Satyam Cinemas"></label>
      <div class="grid2">
        <label class="f">${k === 'supervision' ? 'Bill' : 'Quote'} date<input type="date" id="n_date" data-draft="date" value="${d.date}"></label>
        <label class="f">${k === 'supervision' ? 'Bill' : 'Quote'} number<input type="text" id="n_no" value="${preview}" disabled></label>
      </div>
      ${tpls.length > 1 ? `<label class="f">Template<select id="n_tpl" data-draft="templateId">${tpls.map(t => `<option value="${t.id}" ${t.id === d.templateId ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
      <div class="infobox">${esc(tplSummary(s.templates.find(t => t.id === d.templateId)))}</div>` : ''}
      <label class="f">Or copy everything from an earlier ${KIND[k].one} (optional)
        <select id="n_from" data-draft="from"><option value="">— Start fresh —</option>${others.map(p => `<option value="${p.id}" ${d.from === p.id ? 'selected' : ''}>${esc(quoteNo(store, p) + ' · ' + p.name)}</option>`).join('')}</select></label>
      <button class="btn primary block" data-act="create">Create ${KIND[k].one}</button>
    </section>`
  };
};
function tplSummary(t) {
  if (!t) return '';
  const names = t.blockIds.map(id => store.settings.blocks.find(b => b.id === id)?.title).filter(Boolean);
  if ((t.kind || 'quote') === 'supervision') return `Dated entries for shoot days and expenses. Includes: ${names.join(' · ') || 'no notes'}.`;
  return `${t.mode === 'tiers' ? 'Quality options side by side' : 'Initial bill + additional bills A, B, C…'}${t.singlePage ? ', single page PDF' : ', summary page + breakdown page'}. Includes: ${names.join(' · ') || 'no notes'}.`;
}
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset.draft && route.name === 'new') { route.draft[el.dataset.draft] = el.value; }
  if (el.dataset.actInput === 'search') { ui.q = el.value; const box = document.getElementById('plist'); if (box) box.innerHTML = homeList(); }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.draft && route.name === 'new') {
    route.draft[el.dataset.draft] = el.value;
    if (el.dataset.draft === 'category') route.draft.templateId = store.settings.categoryTemplate[el.value] || route.draft.templateId;
    render();
  }
  if (el.dataset.actChange === 'statusf') { ui.status = el.value; render(); }
});

/* ---------- project ---------- */
VIEWS.project = () => {
  const p = curP(); if (!p) { route = { name: 'home' }; return VIEWS.home(); }
  const s = store.settings;
  const sup = kindOf(p) === 'supervision';
  const tabs = [['quote', sup ? 'Bill' : 'Quote'], ['pay', sup ? 'Payment' : 'Payments'], ['terms', sup ? 'Notes' : 'Terms'], ['pdf', 'PDF']];
  const head = `<section class="card qhead">
    <div class="meta"><span class="qno" data-calc="pno"></span>
      <select id="p_status" data-bind="p:status" data-re aria-label="Status" style="width:auto;padding:5px 8px;font-size:13px">${STATUSES.map(x => `<option ${x === p.status ? 'selected' : ''}>${x}</option>`).join('')}</select></div>
    <input class="big" type="text" id="p_name" data-bind="p:name" value="${esc(p.name)}" aria-label="Project name">
    <div class="grid2">
      <label class="f"><select id="p_clabel" data-bind="p:clientLabel" aria-label="Label" style="padding:2px 4px;font-size:12px;border:0;background:transparent;width:auto"><option ${p.clientLabel === 'Production' ? 'selected' : ''}>Production</option><option ${p.clientLabel === 'Client' ? 'selected' : ''}>Client</option></select>
        <input type="text" id="p_client" data-bind="p:client" value="${esc(p.client)}"></label>
      ${sup ? '' : `<label class="f">Category<select id="p_cat" data-bind="p:category">${s.categories.map(c => `<option ${c === p.category ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></label>`}
      <label class="f">${sup ? 'Bill' : 'Quote'} date<input type="date" id="p_date" data-bind="p:date" value="${p.date}"></label>
      ${sup ? '' : `<label class="f">Valid for (days) · till <span data-calc="pvalid"></span><input type="text" inputmode="numeric" id="p_valid" data-bind="p:validDays" data-int value="${p.validDays}"></label>`}
    </div>
  </section>
  <div class="tabs"><div class="seg">${tabs.map(([k, l]) => `<button class="${ui.tab === k ? 'on' : ''}" data-act="tab" data-v="${k}">${l}</button>`).join('')}</div></div>`;
  const body = head + (TABS[ui.tab] || TABS.quote)(p);
  return {
    title: p.name, sub: quoteNo(store, p), back: true, body,
    right: `<button class="iconbtn" data-act="pmenu" aria-label="More">${I.more}</button>`,
    bottom: `<div class="bottombar"><div class="bottombar-in">
      <div class="tot"><span>${sup ? 'Bill total' : p.mode === 'tiers' ? (p.selectedTier ? 'Chosen option' : 'Highest option') : 'Project total'}${sup ? '' : ' · excl. GST'}</span><b class="money" data-calc="ptotal"></b></div>
      <button class="btn primary" data-act="pdf">${I.pdf}PDF</button></div></div>`
  };
};

const TABS = {};
TABS.quote = p => {
  if (kindOf(p) === 'supervision') return supTab(p);
  const tiers = p.mode === 'tiers';
  return `<div class="row"><div class="seg small grow">
      <button class="${!tiers ? 'on' : ''}" data-act="mode" data-v="batches">Initial + additional bills</button>
      <button class="${tiers ? 'on' : ''}" data-act="mode" data-v="tiers">Quality options</button></div></div>
    ${p.sections.map((sec, i) => secCard(p, sec, i)).join('')}
    <button class="btn block" data-act="addsec">${I.plus}${tiers ? 'Add option' : p.sections.length ? 'Add Additional Bill ' + billLetter(p.sections.length - 1) : 'Add Initial Bill'}</button>`;
};
function supTab(p) {
  const sec = p.sections[0]; const s = store.settings;
  const rows = sec.lines.map((l, j) => `<div class="line">
      <div class="l1"><span class="sl">${j + 1}</span>
        <input type="date" id="dt_${l.id}" data-bind="ln:${sec.id}:${l.id}:date" value="${esc(l.date)}" aria-label="Date">
        <input type="text" inputmode="decimal" id="amt_${l.id}" data-bind="ln:${sec.id}:${l.id}:amount" value="${esc(l.amount)}" placeholder="₹" aria-label="Amount" style="text-align:right;width:104px;flex:none">
        <button class="iconbtn" style="width:34px;height:34px" data-act="delline" data-s="${sec.id}" data-l="${l.id}" aria-label="Remove entry">${I.x}</button></div>
      <div class="l1" style="padding-left:24px"><input type="text" id="d_${l.id}" list="supitems" data-bind="ln:${sec.id}:${l.id}:desc" value="${esc(l.desc)}" placeholder="VFX Supervision, Fuel, Food…" aria-label="Description"></div>
    </div>`).join('');
  return `<section class="sec"><div class="sec-h"><span class="idx">ENTRIES</span><span class="grow muted" style="font-size:12.5px;flex:1">Printed in date order</span></div>
    <div class="sec-b">${rows || '<div class="muted" style="padding:12px 0">No entries yet.</div>'}
      <div class="row" style="padding-top:8px">
        <button class="btn sm" data-act="supadd" data-v="day">${I.plus}Supervision day ₹${inr(s.supDayRate)}</button>
        <button class="btn sm" data-act="supadd" data-v="exp">${I.plus}Expense</button></div>
      <div class="sec-foot">
        <div class="grid2"><label class="f">Discount<select id="dt_${sec.id}" data-bind="sec:${sec.id}:discountType" data-re>${[['none', 'No discount'], ['final', 'Final amount'], ['amount', 'Discount ₹'], ['percent', 'Discount %']].map(([v, l]) => `<option value="${v}" ${sec.discountType === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          ${sec.discountType !== 'none' ? `<label class="f">Value<input type="text" inputmode="decimal" id="dv_${sec.id}" data-bind="sec:${sec.id}:discount" value="${esc(sec.discount)}"></label>` : '<div></div>'}</div>
        <div class="totrow net"><span>Bill total</span><span class="money" data-calc="snet:${sec.id}"></span></div>
      </div></div></section>
    <datalist id="supitems">${s.supItems.map(x => `<option value="${esc(x)}">`).join('')}</datalist>`;
}
function secCard(p, sec, i) {
  const tiers = p.mode === 'tiers';
  const lines = sec.lines.map((l, j) => {
    const lump = l.type === 'lump';
    return `<div class="line">
      <div class="l1"><span class="sl">${j + 1}</span>
        <input type="text" id="d_${l.id}" list="descs" data-bind="ln:${sec.id}:${l.id}:desc" value="${esc(l.desc)}" placeholder="Description, e.g. Roto" aria-label="Description">
        <button class="iconbtn" style="width:34px;height:34px" data-act="delline" data-s="${sec.id}" data-l="${l.id}" aria-label="Remove line">${I.x}</button></div>
      <div class="l2 ${lump ? 'lump' : ''}">
        <button class="type-t" data-act="ltype" data-s="${sec.id}" data-l="${l.id}" title="Switch line type">${lump ? 'Fixed ₹' : 'Per sec'}</button>
        ${lump ? `<input type="text" inputmode="decimal" id="amt_${l.id}" data-bind="ln:${sec.id}:${l.id}:amount" value="${esc(l.amount)}" placeholder="Amount ₹" aria-label="Amount">`
        : `<input type="text" inputmode="decimal" id="sec_${l.id}" data-bind="ln:${sec.id}:${l.id}:sec" value="${esc(l.sec)}" placeholder="sec" aria-label="Seconds">
           <span class="op">×</span>
           <input type="text" inputmode="decimal" id="rate_${l.id}" data-bind="ln:${sec.id}:${l.id}:rate" value="${esc(l.rate)}" placeholder="₹/sec" aria-label="Rate per second">
           <span class="amt money" data-calc="lamt:${sec.id}:${l.id}"></span>`}
      </div>
      <button class="hint" data-act="usehint" data-s="${sec.id}" data-l="${l.id}" data-calc="hint:${sec.id}:${l.id}"></button>
    </div>`;
  }).join('');
  const dsel = [['none', 'No discount'], ['final', 'Final amount after discount'], ['amount', 'Discount amount ₹'], ['percent', 'Discount %']];
  return `<section class="sec">
    <div class="sec-h"><span class="idx">${tiers ? 'OPT ' + (i + 1) : esc(secLabel(p, i).replace('Additional ', '').toUpperCase())}</span>
      <input type="text" id="sn_${sec.id}" data-bind="sec:${sec.id}:name" value="${esc(sec.name)}" placeholder="${tiers ? 'Option name' : 'Add a title'}" aria-label="${tiers ? 'Option name' : 'Bill title'}">
      <button class="iconbtn" data-act="secmenu" data-s="${sec.id}" aria-label="Section options">${I.more}</button></div>
    ${tiers ? `<label class="chosen"><input type="radio" name="tier" data-act="tier" data-s="${sec.id}" ${p.selectedTier === sec.id ? 'checked' : ''}> Client approved this option</label>` : ''}
    <div class="sec-b">
      ${lines}
      <button class="btn ghost" data-act="addline" data-s="${sec.id}" style="justify-self:start">${I.plus}Add line</button>
      <div class="sec-foot">
        <div class="grid2">
          <label class="f">Duration in TOTAL row<select id="dm_${sec.id}" data-bind="sec:${sec.id}:durMode" data-re>
            <option value="sum" ${sec.durMode === 'sum' ? 'selected' : ''}>Add up all lines</option>
            <option value="max" ${sec.durMode === 'max' ? 'selected' : ''}>Same shots – longest line</option>
            <option value="manual" ${sec.durMode === 'manual' ? 'selected' : ''}>Type it in</option></select></label>
          ${sec.durMode === 'manual' ? `<label class="f">Screen time (sec)<input type="text" inputmode="numeric" id="dmv_${sec.id}" data-bind="sec:${sec.id}:durManual" value="${esc(sec.durManual)}"></label>` : `<div class="f" style="font-size:12px;color:var(--muted)">Duration<b style="color:var(--ink);font-size:14px" data-calc="sdur:${sec.id}"></b></div>`}
        </div>
        <div class="warnbox" data-show="durwarn:${sec.id}">Every line has the same seconds. If these are departments on the same shots, choose “Same shots – longest line” so the PDF does not show inflated screen time.</div>
        <div class="grid2">
          <label class="f">Discount<select id="dt_${sec.id}" data-bind="sec:${sec.id}:discountType" data-re>${dsel.map(([v, l]) => `<option value="${v}" ${sec.discountType === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
          ${sec.discountType !== 'none' ? `<label class="f">${sec.discountType === 'final' ? 'Amount after discount ₹' : sec.discountType === 'percent' ? 'Percent' : 'Discount ₹'}<input type="text" inputmode="decimal" id="dv_${sec.id}" data-bind="sec:${sec.id}:discount" value="${esc(sec.discount)}"></label>` : '<div></div>'}
        </div>
        <div>
          <div class="totrow"><span class="muted">Total</span><span class="money" data-calc="sgross:${sec.id}"></span></div>
          <div class="totrow" data-show="disc:${sec.id}"><span class="muted">Discount</span><span class="money" data-calc="sdisc:${sec.id}"></span></div>
          <div class="totrow net"><span>${tiers ? 'Option total' : secLabel(p, i) + ' total'}</span><span class="money" data-calc="snet:${sec.id}"></span></div>
        </div>
        <details><summary class="muted" style="font-size:12.5px;cursor:pointer">PDF wording for this ${tiers ? 'option' : 'bill'}</summary>
          <div class="stack" style="margin-top:8px">
            <label class="f">Line on the quotation page (blank = automatic)<input type="text" id="sd_${sec.id}" data-bind="sec:${sec.id}:summaryDesc" value="${esc(sec.summaryDesc)}" placeholder="${esc(secTitle(p, i))}"></label>
            <label class="f">Sub-heading on the breakdown page<input type="text" id="ss_${sec.id}" data-bind="sec:${sec.id}:subtitle" value="${esc(sec.subtitle)}" placeholder="e.g. Estimated delivery 10 Dec"></label>
          </div></details>
      </div>
    </div></section>`;
}

TABS.pay = p => {
  const tiers = p.mode === 'tiers';
  const secs = tiers ? p.sections.filter(s => s.id === p.selectedTier) : p.sections;
  const rows = secs.map(sec => {
    const i = p.sections.indexOf(sec);
    return `<div class="pay">
      <div class="t"><span>${kindOf(p) === 'supervision' ? 'This bill' : esc(secTitle(p, i))}</span><span class="money">${rs(secNet(sec))}</span></div>
      <div class="seg small">${PAY_STATUSES.map(st => `<button class="${sec.pay.status === st ? 'on' : ''}" data-act="paystat" data-s="${sec.id}" data-v="${st}">${st}</button>`).join('')}</div>
      ${sec.pay.status !== 'Pending' ? `<div class="${sec.pay.status === 'Partial' ? 'grid2' : 'stack'}">
        ${sec.pay.status === 'Partial' ? `<label class="f">Received ₹<input type="text" inputmode="decimal" id="pr_${sec.id}" data-bind="pay:${sec.id}:received" value="${esc(sec.pay.received)}"></label>` : ''}
        <label class="f">Date received<input type="date" id="pd_${sec.id}" data-bind="pay:${sec.id}:date" value="${esc(sec.pay.date)}"></label></div>` : ''}
    </div>`;
  }).join('');
  return `<section class="card stack">
    <dl class="kv"><dt>Project total</dt><dd class="money" data-calc="ptotal"></dd><dt>Received</dt><dd class="money" data-calc="precv"></dd><dt>Balance</dt><dd class="money" data-calc="ppend"></dd></dl>
    ${!isCommitted(p) ? `<div class="infobox">${kindOf(p) === 'supervision' ? 'The balance counts on the dashboard once the status is Sent.' : 'Pending amounts count on the dashboard once the status is Approved, In Progress or Closed.'}</div>` : ''}
  </section>
  <section class="card">
    ${tiers && !p.selectedTier ? `<div class="empty"><b>No option chosen yet</b>On the Quote tab, tick “Client approved this option” to track its payments.</div>` : rows}
  </section>
  ${!tiers && kindOf(p) !== 'supervision' ? `<section class="card"><label class="check"><input type="checkbox" id="pdf_pay" data-bind="pdf:showPayment" ${p.pdf.showPayment ? 'checked' : ''}> Show the payment status column on the PDF</label></section>` : ''}`;
};

TABS.terms = p => {
  const s = store.settings;
  const place = { quote: 'Under quotation', breakdown: 'Under each breakdown', end: 'Last page' };
  const blocks = p.blocks.map((b, i) => `<div class="blk">
    <div class="t"><b>${esc(b.title)}</b><span class="where">${place[b.placement]}</span>
      <button class="iconbtn" data-act="blkmenu" data-b="${b.id}" aria-label="Block options">${I.more}</button></div>
    ${b.style === 'bank' ? (bk => `<div class="muted" style="font-size:13px">${esc(bk.accName)} · ${esc(bk.bank)} · A/C ${esc(bk.accNo)} · IFSC ${esc(bk.ifsc)}<br>Choose the account above. Edit accounts in Settings.</div>`)(bankOf(store, p)) : `
    <label class="f">Heading on the PDF<input type="text" id="bh_${b.id}" data-bind="blk:${b.id}:heading" value="${esc(b.heading)}"></label>
    <label class="f">One point per line<textarea id="bi_${b.id}" data-bind="blk:${b.id}:items" data-lines rows="${Math.min(10, (b.items || []).length + 2)}">${esc((b.items || []).join('\n'))}</textarea></label>`}
  </div>`).join('');
  const unused = s.blocks.filter(lb => !p.blocks.some(b => b.libId === lb.id));
  return `<section class="card stack">
    <div class="grid2">
      <label class="f">Template<select id="t_tpl" data-bind="p:templateId">${s.templates.filter(t => (t.kind || 'quote') === kindOf(p)).map(t => `<option value="${t.id}" ${t.id === p.templateId ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>
      <label class="f">Signed by<select id="t_sig" data-bind="p:signatoryId">${s.signatories.map(g => `<option value="${g.id}" ${g.id === p.signatoryId ? 'selected' : ''}>${esc(g.name + ' – ' + g.title)}</option>`).join('')}</select></label>
    </div>
    <label class="f">Bank account on the PDF<select id="t_bank" data-bind="p:bankId" data-re>${s.banks.map(b => `<option value="${b.id}" ${bankOf(store, p).id === b.id ? 'selected' : ''}>${esc(b.label)}</option>`).join('')}</select></label>
    <button class="btn sm" data-act="applytpl" style="justify-self:start">Reset notes from template</button>
    <div class="muted" style="font-size:12.5px">Changes here apply to this quote only. Use ⋯ → “Save to library” to keep a change for future quotes.</div>
  </section>
  <section class="card stack"><h2>Notes on this quote</h2>${blocks || '<div class="muted">No notes on this quote.</div>'}
    ${unused.length ? `<div class="row"><select id="addblk" class="grow" aria-label="Add from library">${unused.map(b => `<option value="${b.id}">${esc(b.title)}</option>`).join('')}</select><button class="btn" data-act="addblk">Add</button></div>` : ''}
  </section>`;
};

TABS.pdf = p => {
  const o = p.pdf;
  const revs = (p.revisions || []).slice().reverse();
  return `<section class="card stack"><h2>Layout</h2>
    <div class="grid2">
      <label class="f">Title<input type="text" id="o_title" data-bind="pdf:title" value="${esc(o.title)}"></label>
      <label class="f">Copy label<input type="text" id="o_copy" data-bind="pdf:copyLabel" value="${esc(o.copyLabel)}"></label>
    </div>
    ${kindOf(p) === 'supervision' ? '' : `<div class="f" style="font-size:12px;color:var(--muted)">Pages<div class="seg small" style="margin-top:4px">
      <button class="${!p.singlePage ? 'on' : ''}" data-act="layout" data-v="two">Summary + breakdown</button>
      <button class="${p.singlePage ? 'on' : ''}" data-act="layout" data-v="single">Single page</button></div></div>
    ${p.singlePage ? '' : `<label class="check"><input type="checkbox" id="o_min" data-bind="pdf:showMinutes" ${o.showMinutes !== false ? 'checked' : ''}> “Min:Sec” column in the breakdown</label>`}
    ${p.mode === 'batches' && !p.singlePage ? `<label class="check"><input type="checkbox" id="o_pay" data-bind="pdf:showPayment" ${o.showPayment ? 'checked' : ''}> Payment status column</label>` : ''}`}
    <label class="check"><input type="checkbox" id="o_sig" data-bind="pdf:showSignature" ${o.showSignature !== false ? 'checked' : ''}> Signature block</label>
    <label class="check"><input type="checkbox" id="o_gst" data-bind="pdf:showGst" data-re ${o.showGst !== false ? 'checked' : ''}> GST line under the table</label>
    ${o.showGst !== false ? `<label class="f">GST line text<input type="text" id="o_gstt" data-bind="pdf:gstText" value="${esc(o.gstText)}"></label>` : ''}
    <button class="btn primary" data-act="pdf">${I.pdf}Preview & export PDF</button>
  </section>
  ${kindOf(p) === 'supervision' ? '' : `<section class="card stack"><h2>Revisions</h2>
    <div class="muted" style="font-size:13px">Already sent this quote and need to change it? Start a revision. The sent version is kept, and the number gets -R${p.rev + 1}.</div>
    <button class="btn" data-act="newrev" style="justify-self:start">Start revision R${p.rev + 1}</button>
    ${revs.map(r => `<div class="list-row" style="cursor:default"><div class="grow"><b>${esc(quoteNo(store, { ...p, rev: r.rev }))}</b><small>Saved ${new Date(r.savedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })} · ${rs(r.total || 0)}</small></div>
      <button class="btn sm" data-act="restorerev" data-v="${r.rev}">Restore</button></div>`).join('')}
  </section>`}`;
};

/* ---------- settings ---------- */
VIEWS.settings = () => {
  const s = store.settings; const c = s.company;
  const connected = Drive.isConnected();
  const theme = (() => { try { return localStorage.getItem('vfxq.theme') || 'system'; } catch { return 'system'; } })();
  const sigs = s.signatories.map(g => `<div class="blk"><div class="grid2">
      <label class="f">Name<input type="text" id="sg_n_${g.id}" data-bind="sig:${g.id}:name" value="${esc(g.name)}"></label>
      <label class="f">Title<input type="text" id="sg_t_${g.id}" data-bind="sig:${g.id}:title" value="${esc(g.title)}"></label></div>
      <div class="row"><label class="f grow">Phone<input type="tel" id="sg_p_${g.id}" data-bind="sig:${g.id}:phone" value="${esc(g.phone)}"></label>
      <button class="btn danger sm" data-act="delsig" data-v="${g.id}" style="align-self:end">Remove</button></div></div>`).join('');
  const body = `
  <section class="card stack"><h2>Google Drive</h2>
    ${IN_ARTIFACT ? `<div class="infobox">This is the preview copy. Drive sync works in the installed app, once it's hosted at your own address (see the setup guide).</div>` : ''}
    ${connected ? `<div class="okbox">Connected. Data and PDFs are saved in the “${Drive.FOLDER}” folder in your Drive.${store.meta.lastSync ? ' Last sync ' + new Date(store.meta.lastSync).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) + '.' : ''}</div>
      <div class="row"><button class="btn primary" data-act="syncnow">Sync now</button><button class="btn" data-act="reauth">Reconnect</button><button class="btn danger" data-act="disconnect">Disconnect</button></div>`
      : `<div class="muted" style="font-size:13px">Everything is saved on this device. Connect Google Drive to sync across phone and computer and keep PDFs and daily backups in Drive.</div>
      <label class="f">Google OAuth Client ID<input type="text" id="cid" value="${esc(Drive.clientId())}" placeholder="xxxxxxxx.apps.googleusercontent.com"></label>
      <div class="f" style="font-size:12px">Authorised redirect URI and JavaScript origin<div class="codebox">${esc(Drive.redirectUri())}</div></div>
      <button class="btn primary" data-act="connect" style="justify-self:start">Connect Google Drive</button>`}
  </section>
  <section class="card"><details class="acc"><summary>Studio letterhead</summary><div class="stack">
    <div class="logo-prev"><img src="${s.logo || 'logo.png'}" alt="Logo"></div>
    <div class="row"><label class="btn sm" for="logofile">Change logo</label><input type="file" id="logofile" accept="image/png,image/jpeg" hidden data-act-change="logo">${s.logo ? '<button class="btn sm" data-act="resetlogo">Use original logo</button>' : ''}</div>
    <label class="f">Studio name<input type="text" id="c_name" data-bind="set:company.name" value="${esc(c.name)}"></label>
    <label class="f">Line under the name<input type="text" id="c_sub" data-bind="set:company.sub" value="${esc(c.sub)}"></label>
    <label class="f">Address line 1<input type="text" id="c_a1" data-bind="set:company.address1" value="${esc(c.address1)}"></label>
    <label class="f">Address line 2<input type="text" id="c_a2" data-bind="set:company.address2" value="${esc(c.address2)}"></label>
    <div class="grid2"><label class="f">Email<input type="email" id="c_em" data-bind="set:company.email" value="${esc(c.email)}"></label>
    <label class="f">Mobile<input type="tel" id="c_mob" data-bind="set:company.mobile" value="${esc(c.mobile)}"></label></div>
  </div></details></section>
  <section class="card"><details class="acc"><summary>Quote numbers & validity</summary><div class="stack">
    <div class="grid2"><label class="f">Prefix<input type="text" id="c_pre" data-bind="set:numberPrefix" value="${esc(s.numberPrefix)}"></label>
    <label class="f">Valid for (days)<input type="text" inputmode="numeric" id="c_val" data-bind="set:validityDays" data-int value="${s.validityDays}"></label></div>
    <div class="muted" style="font-size:12.5px">Format: ${esc(s.numberPrefix)}/26-27/001 (supervision bills: ${esc(s.supPrefix)}/26-27/001). Numbers restart at 001 every April (Indian financial year). Revisions print as -R1.</div>
  </div></details></section>
  <section class="card"><details class="acc"><summary>Who signs</summary><div class="stack">${sigs}<button class="btn sm" data-act="addsig" style="justify-self:start">${I.plus}Add signatory</button></div></details></section>
  <section class="card"><details class="acc"><summary>Bank accounts</summary><div class="stack">
    <div class="grid2">
      <label class="f">Project quotes use<select id="db_q" data-bind="set:defaultBank.quote">${s.banks.map(b => `<option value="${b.id}" ${s.defaultBank.quote === b.id ? 'selected' : ''}>${esc(b.label)}</option>`).join('')}</select></label>
      <label class="f">Supervision bills use<select id="db_s" data-bind="set:defaultBank.supervision">${s.banks.map(b => `<option value="${b.id}" ${s.defaultBank.supervision === b.id ? 'selected' : ''}>${esc(b.label)}</option>`).join('')}</select></label></div>
    ${s.banks.map(b => `<div class="blk">
      <div class="row"><input type="text" class="grow" id="bk_l_${b.id}" data-bind="bank:${b.id}:label" value="${esc(b.label)}" style="font-weight:700" aria-label="Account label"><button class="btn danger sm" data-act="delbank" data-v="${b.id}">Remove</button></div>
      <label class="f">Account name<input type="text" id="bk_n_${b.id}" data-bind="bank:${b.id}:accName" value="${esc(b.accName)}"></label>
      <div class="grid2"><label class="f">Bank<input type="text" id="bk_b_${b.id}" data-bind="bank:${b.id}:bank" value="${esc(b.bank)}"></label>
      <label class="f">Branch<input type="text" id="bk_br_${b.id}" data-bind="bank:${b.id}:branch" value="${esc(b.branch)}"></label>
      <label class="f">Account number<input type="text" id="bk_no_${b.id}" data-bind="bank:${b.id}:accNo" value="${esc(b.accNo)}"></label>
      <label class="f">IFSC<input type="text" id="bk_if_${b.id}" data-bind="bank:${b.id}:ifsc" value="${esc(b.ifsc)}"></label></div>
      <label class="f">Mobile on the PDF (optional)<input type="tel" id="bk_m_${b.id}" data-bind="bank:${b.id}:mobile" value="${esc(b.mobile || '')}"></label></div>`).join('')}
    <button class="btn sm" data-act="addbank" style="justify-self:start">${I.plus}Add bank account</button>
  </div></details></section>
  <section class="card"><details class="acc"><summary>On-site supervision</summary><div class="stack">
    <div class="grid2"><label class="f">Bill number prefix<input type="text" id="c_spre" data-bind="set:supPrefix" value="${esc(s.supPrefix)}"></label>
    <label class="f">Day rate ₹<input type="text" inputmode="numeric" id="c_sday" data-bind="set:supDayRate" data-int value="${s.supDayRate}"></label></div>
    <label class="f">Entry suggestions (one per line)<textarea id="c_sitems" data-bind="set:supItems" data-lines rows="6">${esc(s.supItems.join('\n'))}</textarea></label>
  </div></details></section>
  <section class="card"><details class="acc"><summary>Categories</summary><div class="stack">
    <label class="f">One per line (dashboard tabs)<textarea id="cats" data-bind="set:categories" data-lines data-re rows="6">${esc(s.categories.join('\n'))}</textarea></label>
    ${s.categories.map(cat => `<label class="f">Default template · ${esc(cat)}<select id="ct_${esc(cat)}" data-bind="cattpl:${esc(cat)}">${s.templates.map(t => `<option value="${t.id}" ${s.categoryTemplate[cat] === t.id ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></label>`).join('')}
  </div></details></section>
  <section class="card"><details class="acc"><summary>Departments list</summary><div class="stack">
    <label class="f">Suggestions when typing a line (one per line)<textarea id="deps" data-bind="set:departments" data-lines rows="10">${esc(s.departments.join('\n'))}</textarea></label>
  </div></details></section>
  <section class="card">
    <div class="list-row" data-act="go" data-r="blocks"><div class="grow"><b>Notes library</b><small>${s.blocks.length} blocks · terms, notes, inputs, deliverables</small></div><span class="chev">›</span></div>
    <div class="list-row" data-act="go" data-r="templates"><div class="grow"><b>Templates</b><small>${s.templates.map(t => esc(t.name)).join(' · ')}</small></div><span class="chev">›</span></div>
  </section>
  <section class="card stack"><h2>App</h2>
    <label class="f">Appearance<select id="theme" data-act-change="theme"><option value="system" ${theme === 'system' ? 'selected' : ''}>Match phone / computer</option><option value="light" ${theme === 'light' ? 'selected' : ''}>Light</option><option value="dark" ${theme === 'dark' ? 'selected' : ''}>Dark</option></select></label>
    <div class="row"><button class="btn sm" data-act="export">Download backup</button><label class="btn sm" for="importfile">Restore backup</label><input type="file" id="importfile" accept="application/json,.json" hidden data-act-change="import">
    ${store.projects.some(p => p.sample && !p.deleted) ? '' : '<button class="btn sm" data-act="samples">Add the 3 starter quotes</button>'}</div>
    <div class="muted" style="font-size:12px">VishwaaFX Quote Desk v${APP_VERSION}</div>
  </section>`;
  return { title: 'Settings', back: true, body };
};

VIEWS.blocks = () => {
  const s = store.settings;
  const place = [['quote', 'Under the quotation table'], ['breakdown', 'Under every breakdown table'], ['end', 'After the last breakdown']];
  const styles = [['numbered', '1. 2. 3.'], ['bullets', '• Bullets'], ['plain', 'Plain lines'], ['bank', 'Bank details box']];
  const body = s.blocks.map(b => `<section class="card stack">
    <div class="row"><input type="text" class="grow" id="lt_${b.id}" data-bind="lib:${b.id}:title" value="${esc(b.title)}" aria-label="Block name" style="font-weight:700">
      <button class="btn danger sm" data-act="dellib" data-v="${b.id}">Delete</button></div>
    <div class="grid2">
      <label class="f">Where on the PDF<select id="lp_${b.id}" data-bind="lib:${b.id}:placement">${place.map(([v, l]) => `<option value="${v}" ${b.placement === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="f">Style<select id="ls_${b.id}" data-bind="lib:${b.id}:style" data-re>${styles.map(([v, l]) => `<option value="${v}" ${b.style === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    </div>
    ${b.style === 'bank' ? '<div class="muted" style="font-size:13px">Prints the bank details from Settings in a box.</div>' : `
    <label class="f">Heading<input type="text" id="lh_${b.id}" data-bind="lib:${b.id}:heading" value="${esc(b.heading)}"></label>
    <label class="f">One point per line<textarea id="li_${b.id}" data-bind="lib:${b.id}:items" data-lines rows="${Math.min(12, b.items.length + 2)}">${esc(b.items.join('\n'))}</textarea></label>`}
  </section>`).join('') + `<button class="btn block" data-act="addlib">${I.plus}New note block</button>`;
  return { title: 'Notes library', sub: 'Used when a quote is created', back: true, body };
};

VIEWS.templates = () => {
  const s = store.settings;
  const body = s.templates.map(t => `<section class="card stack">
    <div class="row"><input type="text" class="grow" id="tn_${t.id}" data-bind="tpl:${t.id}:name" value="${esc(t.name)}" style="font-weight:700" aria-label="Template name">
      <button class="btn danger sm" data-act="deltpl" data-v="${t.id}">Delete</button></div>
    <label class="f">Used for<select id="tk_${t.id}" data-bind="tpl:${t.id}:kind" data-re><option value="quote" ${(t.kind || 'quote') === 'quote' ? 'selected' : ''}>Project quotes</option><option value="supervision" ${t.kind === 'supervision' ? 'selected' : ''}>On-site supervision</option></select></label>
    <div class="grid2">
      <label class="f">Structure<select id="tm_${t.id}" data-bind="tpl:${t.id}:mode"><option value="batches" ${t.mode === 'batches' ? 'selected' : ''}>Initial + additional bills</option><option value="tiers" ${t.mode === 'tiers' ? 'selected' : ''}>Quality options</option></select></label>
      <label class="f">Client label<select id="tc_${t.id}" data-bind="tpl:${t.id}:clientLabel"><option ${t.clientLabel === 'Production' ? 'selected' : ''}>Production</option><option ${t.clientLabel === 'Client' ? 'selected' : ''}>Client</option></select></label>
    </div>
    <label class="f">Signed by<select id="ts_${t.id}" data-bind="tpl:${t.id}:signatoryId">${s.signatories.map(g => `<option value="${g.id}" ${g.id === t.signatoryId ? 'selected' : ''}>${esc(g.name + ' – ' + g.title)}</option>`).join('')}</select></label>
    <label class="check"><input type="checkbox" id="tsp_${t.id}" data-bind="tpl:${t.id}:singlePage" ${t.singlePage ? 'checked' : ''}> Single page PDF</label>
    <div class="eyebrow">Notes included</div>
    ${s.blocks.map(b => `<label class="check"><input type="checkbox" data-act="tplblk" data-t="${t.id}" data-b="${b.id}" ${t.blockIds.includes(b.id) ? 'checked' : ''}> ${esc(b.title)}</label>`).join('')}
  </section>`).join('') + `<button class="btn block" data-act="addtpl">${I.plus}New template</button>`;
  return { title: 'Templates', back: true, body };
};

/* ================= ACTIONS ================= */
const ACT = {};
ACT.back = () => {
  const up = { project: 'home', new: 'home', home: 'start', settings: 'start', blocks: 'settings', templates: 'settings' }[route.name] || 'start';
  go({ name: up, kind: ui.kind });
};
ACT.go = el => go({ name: el.dataset.r, kind: ui.kind });
ACT.kind = el => { ui.kind = el.dataset.v; ui.cat = 'All'; ui.q = ''; ui.status = 'All'; go({ name: 'home', kind: ui.kind }); };
ACT.layout = el => { const p = curP(); p.singlePage = el.dataset.v === 'single'; touchP(p); render(); };
ACT.supadd = el => {
  const p = curP(); const sec = p.sections[0]; const s = store.settings;
  const last = sec.lines.map(l => l.date).filter(Boolean).sort().pop();
  const date = el.dataset.v === 'day' ? (last ? addDays(last, 1) : p.date) : (last || p.date);
  const l = el.dataset.v === 'day' ? newLine(s.supItems[0] || 'VFX Supervision', 'lump', '', '', String(s.supDayRate || ''), date) : newLine('', 'lump', '', '', '', date);
  sec.lines.push(l); touchP(p); render();
  setTimeout(() => document.getElementById(el.dataset.v === 'day' ? 'dt_' + l.id : 'd_' + l.id)?.focus(), 30);
};
ACT.addbank = () => { store.settings.banks.push({ id: uid('bank'), label: 'New account', accName: '', bank: '', accNo: '', ifsc: '', branch: '', mobile: '' }); touchS(); render(); };
ACT.delbank = el => {
  const s = store.settings; if (s.banks.length < 2) return toast('Keep at least one bank account.');
  const b = s.banks.find(x => x.id === el.dataset.v);
  confirmBox('Remove this account?', `“${b.label}” will no longer print on PDFs. Quotes using it switch to the default account.`, 'Remove', () => {
    s.banks = s.banks.filter(x => x.id !== b.id);
    for (const k in s.defaultBank) if (s.defaultBank[k] === b.id) s.defaultBank[k] = s.banks[0].id;
    touchS(); render();
  });
};
ACT.open = el => { ui.tab = 'quote'; go({ name: 'project', id: el.dataset.id, kind: ui.kind }); };
ACT.cat = el => { ui.cat = el.dataset.v; render(); };
ACT.tab = el => { ui.tab = el.dataset.v; render(); };
ACT.closesheet = () => closeSheet();
ACT.confirmok = () => { const f = pendingConfirm; pendingConfirm = null; closeSheet(); f && f(); };

ACT.create = () => {
  const d = route.draft;
  if (!d.name.trim()) { toast('Give the project a name first.'); document.getElementById('n_name').focus(); return; }
  let p;
  if (d.from) {
    const src = store.projects.find(x => x.id === d.from);
    p = duplicateProject(src, { name: d.name, client: d.client, category: d.category, date: d.date });
  } else {
    p = createProject(store, { name: d.name, category: d.category || store.settings.categories[0], client: d.client, templateId: d.templateId, date: d.date });
    store.projects.push(p);
  }
  persist(); ui.tab = 'quote';
  go({ name: 'project', id: p.id, kind: ui.kind });
};
function duplicateProject(src, over = {}) {
  const c = clone(src); const date = over.date || todayStr();
  Object.assign(c, { id: uid('prj'), fy: fyOf(date), date, rev: 0, status: 'Draft', revisions: [], sample: false,
    name: over.name || src.name + ' (copy)', createdAt: nowISO(), updatedAt: nowISO(), deleted: false });
  if (over.client !== undefined) c.client = over.client;
  if (over.category) c.category = over.category;
  c.seq = nextSeq(store, c.fy, kindOf(c));
  c.sections.forEach(s => { s.pay = { status: 'Pending', received: '', date: '' }; });
  store.projects.push(c); return c;
}

ACT.mode = el => { const p = curP(); p.mode = el.dataset.v; if (p.mode === 'batches') p.selectedTier = null; touchP(p); render(); };
ACT.addsec = () => {
  const p = curP(); const n = p.sections.length;
  p.sections.push(newSection(p.mode === 'tiers' ? `Option ${n + 1}` : ''));
  touchP(p); render();
  setTimeout(() => document.querySelector('.sec:last-of-type input')?.scrollIntoView({ block: 'center' }), 50);
};
ACT.addline = el => {
  const p = curP(); const sec = secOf(p, el.dataset.s); const l = newLine(); sec.lines.push(l); touchP(p); render();
  setTimeout(() => document.getElementById('d_' + l.id)?.focus(), 30);
};
ACT.delline = el => { const p = curP(); const sec = secOf(p, el.dataset.s); sec.lines = sec.lines.filter(l => l.id !== el.dataset.l); touchP(p); render(); };
ACT.ltype = el => {
  const p = curP(); const l = secOf(p, el.dataset.s).lines.find(x => x.id === el.dataset.l);
  if (l.type === 'rate') { l.amount = lineAmount(l) ? String(lineAmount(l)) : l.amount; l.type = 'lump'; } else l.type = 'rate';
  touchP(p); render();
};
ACT.usehint = el => {
  const p = curP(); const l = secOf(p, el.dataset.s).lines.find(x => x.id === el.dataset.l);
  const h = rateHistory(store, l.desc, p.category, p.id); if (!h) return;
  l.rate = String(h.rate); touchP(p); const inp = document.getElementById('rate_' + l.id); if (inp) inp.value = l.rate; refresh();
};
ACT.tier = el => { const p = curP(); p.selectedTier = el.dataset.s; touchP(p); refresh(); };
ACT.paystat = el => { const p = curP(); secOf(p, el.dataset.s).pay.status = el.dataset.v; touchP(p); render(); };

ACT.secmenu = el => {
  const p = curP(); const sid = el.dataset.s; const i = p.sections.findIndex(s => s.id === sid);
  openSheet(`<h2>${esc(secTitle(p, i))}</h2><div class="stack">
    <button class="btn block" data-act="secmove" data-s="${sid}" data-v="-1" ${i === 0 ? 'disabled' : ''}>Move up</button>
    <button class="btn block" data-act="secmove" data-s="${sid}" data-v="1" ${i === p.sections.length - 1 ? 'disabled' : ''}>Move down</button>
    <button class="btn block" data-act="secdup" data-s="${sid}">Duplicate</button>
    <button class="btn block" data-act="copyrates" data-s="${sid}">Copy rates from another quote…</button>
    <button class="btn block danger" data-act="secdel" data-s="${sid}">Delete</button>
    <button class="btn block ghost" data-act="closesheet">Close</button></div>`);
};
ACT.secmove = el => {
  const p = curP(); const i = p.sections.findIndex(s => s.id === el.dataset.s); const j = i + num(el.dataset.v);
  [p.sections[i], p.sections[j]] = [p.sections[j], p.sections[i]]; touchP(p); closeSheet(); render();
};
ACT.secdup = el => {
  const p = curP(); const i = p.sections.findIndex(s => s.id === el.dataset.s); const c = clone(p.sections[i]);
  c.id = uid('sec'); if (c.name) c.name += ' (copy)'; c.lines.forEach(l => l.id = uid('ln')); c.pay = { status: 'Pending', received: '', date: '' };
  p.sections.splice(i + 1, 0, c); touchP(p); closeSheet(); render();
};
ACT.secdel = el => {
  const p = curP(); const sec = secOf(p, el.dataset.s);
  confirmBox(p.mode === 'tiers' ? 'Delete this option?' : 'Delete this bill?', `“${secTitle(p, p.sections.indexOf(sec))}” and its ${sec.lines.length} lines will be removed. Later bills move up a letter.`, 'Delete', () => {
    p.sections = p.sections.filter(s => s.id !== sec.id); if (p.selectedTier === sec.id) p.selectedTier = null; touchP(p); render();
  });
};
ACT.copyrates = el => {
  const p = curP(); const sid = el.dataset.s;
  const others = store.projects.filter(x => !x.deleted && x.id !== p.id).sort((a, b) => new Date(b.date) - new Date(a.date));
  openSheet(`<h2>Copy rates from</h2><div class="muted" style="font-size:13px">Lines with the same description get that quote's rate per second.</div>
    <div>${others.map(o => `<div class="list-row" data-act="docopyrates" data-s="${sid}" data-v="${o.id}"><div class="grow"><b>${esc(o.name)}</b><small>${esc(quoteNo(store, o))} · ${esc(o.category)} · ${fmtDate(o.date)}</small></div><span class="chev">›</span></div>`).join('')}</div>
    <button class="btn ghost" data-act="closesheet">Cancel</button>`);
};
ACT.docopyrates = el => {
  const p = curP(); const sec = secOf(p, el.dataset.s); const src = store.projects.find(x => x.id === el.dataset.v);
  const map = new Map(); src.sections.forEach(s => s.lines.forEach(l => { if (l.type === 'rate' && num(l.rate)) map.set(l.desc.trim().toLowerCase(), l.rate); }));
  let n = 0; sec.lines.forEach(l => { const r = map.get(l.desc.trim().toLowerCase()); if (l.type === 'rate' && r) { l.rate = String(r); n++; } });
  touchP(p); closeSheet(); render(); toast(n ? `Updated ${n} rate${n > 1 ? 's' : ''} from ${src.name}.` : `No matching lines in ${src.name}.`);
};

ACT.pmenu = () => {
  const p = curP();
  openSheet(`<h2>${esc(p.name)}</h2><div class="stack">
    <button class="btn block" data-act="dup">Duplicate as a new quote</button>
    <button class="btn block" data-act="newrev">Start revision R${p.rev + 1}</button>
    <button class="btn block danger" data-act="delp">Delete quote</button>
    <button class="btn block ghost" data-act="closesheet">Close</button></div>`);
};
ACT.dup = () => { const c = duplicateProject(curP()); persist(); closeSheet(); toast(`Created ${quoteNo(store, c)}.`); go({ name: 'project', id: c.id, kind: ui.kind }); };
ACT.delp = () => {
  const p = curP();
  confirmBox('Delete this quote?', `${quoteNo(store, p)} · ${p.name} will be removed from every device. The PDFs already in Drive stay there.`, 'Delete', () => {
    p.deleted = true; touchP(p); go({ name: 'home', kind: ui.kind }); toast('Deleted.');
  });
};
ACT.newrev = () => {
  const p = curP();
  confirmBox(`Start revision R${p.rev + 1}?`, `The current version (${quoteNo(store, p)}) is saved as it is. You then edit R${p.rev + 1}.`, 'Start revision', () => {
    p.revisions = p.revisions || [];
    p.revisions.push({ rev: p.rev, savedAt: nowISO(), total: projectValue(p), data: clone({ name: p.name, client: p.client, date: p.date, validDays: p.validDays, sections: p.sections, blocks: p.blocks, pdf: p.pdf, singlePage: p.singlePage, signatoryId: p.signatoryId, mode: p.mode, selectedTier: p.selectedTier }) });
    p.rev++; p.date = todayStr(); p.status = 'Draft'; touchP(p); render(); toast(`Now editing ${quoteNo(store, p)}.`);
  }, false);
};
ACT.restorerev = el => {
  const p = curP(); const r = p.revisions.find(x => x.rev === num(el.dataset.v));
  confirmBox(`Restore R${r.rev}?`, 'The current lines and notes are replaced with that version. The quote number stays the same.', 'Restore', () => {
    Object.assign(p, clone(r.data)); touchP(p); render(); toast('Version restored.');
  });
};

ACT.applytpl = () => {
  const p = curP(); const s = store.settings; const t = s.templates.find(x => x.id === p.templateId);
  confirmBox('Reset notes from template?', `Notes on this quote are replaced with the ones in “${t.name}”.`, 'Reset notes', () => {
    p.blocks = t.blockIds.map(id => s.blocks.find(b => b.id === id)).filter(Boolean).map(b => ({ ...clone(b), libId: b.id, id: uid('pb') }));
    p.signatoryId = t.signatoryId; p.clientLabel = t.clientLabel; if (kindOf(p) === 'quote') p.singlePage = !!t.singlePage; touchP(p); render();
  });
};
ACT.addblk = () => {
  const p = curP(); const id = document.getElementById('addblk').value; const b = store.settings.blocks.find(x => x.id === id);
  p.blocks.push({ ...clone(b), libId: b.id, id: uid('pb') }); touchP(p); render();
};
ACT.blkmenu = el => {
  const p = curP(); const b = p.blocks.find(x => x.id === el.dataset.b); const i = p.blocks.indexOf(b);
  const place = [['quote', 'Under the quotation table'], ['breakdown', 'Under every breakdown table'], ['end', 'After the last breakdown']];
  openSheet(`<h2>${esc(b.title)}</h2><div class="stack">
    <label class="f">Where on the PDF<select id="bp_${b.id}" data-bind="blk:${b.id}:placement" data-re>${place.map(([v, l]) => `<option value="${v}" ${b.placement === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <button class="btn block" data-act="blkmove" data-b="${b.id}" data-v="-1" ${i === 0 ? 'disabled' : ''}>Move up</button>
    <button class="btn block" data-act="blkmove" data-b="${b.id}" data-v="1" ${i === p.blocks.length - 1 ? 'disabled' : ''}>Move down</button>
    ${b.libId && b.style !== 'bank' ? `<button class="btn block" data-act="blksave" data-b="${b.id}">Save to library (future quotes)</button>` : ''}
    <button class="btn block danger" data-act="blkdel" data-b="${b.id}">Remove from this quote</button>
    <button class="btn block ghost" data-act="closesheet">Done</button></div>`);
};
ACT.blkmove = el => { const p = curP(); const i = p.blocks.findIndex(b => b.id === el.dataset.b); const j = i + num(el.dataset.v); [p.blocks[i], p.blocks[j]] = [p.blocks[j], p.blocks[i]]; touchP(p); closeSheet(); render(); };
ACT.blkdel = el => { const p = curP(); p.blocks = p.blocks.filter(b => b.id !== el.dataset.b); touchP(p); closeSheet(); render(); };
ACT.blksave = el => {
  const p = curP(); const b = p.blocks.find(x => x.id === el.dataset.b); const lib = store.settings.blocks.find(x => x.id === b.libId);
  if (lib) { Object.assign(lib, { heading: b.heading, items: clone(b.items), placement: b.placement }); touchS(); closeSheet(); toast(`“${lib.title}” updated for future quotes.`); }
};

/* settings actions */
ACT.connect = () => {
  const id = document.getElementById('cid').value.trim();
  if (!/\.apps\.googleusercontent\.com$/.test(id)) { toast('Paste the Client ID ending in .apps.googleusercontent.com'); return; }
  if (IN_ARTIFACT) { toast('Drive connects in the installed app at your own address.'); return; }
  Drive.setClientId(id); try { sessionStorage.setItem('vfxq.route', JSON.stringify(route)); } catch {} Drive.authorize();
};
ACT.reauth = () => Drive.authorize();
ACT.disconnect = () => confirmBox('Disconnect Google Drive?', 'Data stays on this device and in Drive. Sync stops until you connect again.', 'Disconnect', () => { Drive.disconnect(); setSync('local'); render(); });
ACT.syncnow = () => runSync(true);
ACT.syncpill = () => {
  if (syncState === 'off') { if (Drive.clientId()) Drive.authorize(); else go({ name: 'settings' }); }
  else if (Drive.isConnected()) runSync(true); else go({ name: 'settings' });
};
ACT.addsig = () => { store.settings.signatories.push({ id: uid('sig'), name: '', title: '', phone: '' }); touchS(); render(); };
ACT.delsig = el => { const s = store.settings; if (s.signatories.length < 2) return toast('Keep at least one signatory.'); s.signatories = s.signatories.filter(g => g.id !== el.dataset.v); touchS(); render(); };
ACT.resetlogo = () => { store.settings.logo = null; store.settings.logoMono = null; touchS(); render(); };
ACT.addlib = () => { store.settings.blocks.push({ id: uid('blk'), title: 'New note block', heading: 'Notes', style: 'plain', placement: 'quote', items: [] }); touchS(); render(); setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 30); };
ACT.dellib = el => {
  const s = store.settings; const b = s.blocks.find(x => x.id === el.dataset.v);
  confirmBox('Delete this block?', `“${b.title}” is removed from the library and templates. Quotes that already use it keep their copy.`, 'Delete', () => {
    s.blocks = s.blocks.filter(x => x.id !== b.id); s.templates.forEach(t => t.blockIds = t.blockIds.filter(i => i !== b.id)); touchS(); render();
  });
};
ACT.addtpl = () => { const s = store.settings; s.templates.push({ id: uid('tpl'), kind: ui.kind, name: 'New template', mode: 'batches', clientLabel: 'Production', singlePage: false, signatoryId: s.signatories[0].id, blockIds: [] }); touchS(); render(); };
ACT.deltpl = el => {
  const s = store.settings; if (s.templates.length < 2) return toast('Keep at least one template.');
  const t = s.templates.find(x => x.id === el.dataset.v);
  confirmBox('Delete this template?', `“${t.name}” will no longer be offered for new quotes.`, 'Delete', () => {
    s.templates = s.templates.filter(x => x.id !== t.id);
    for (const k in s.categoryTemplate) if (s.categoryTemplate[k] === t.id) s.categoryTemplate[k] = s.templates[0].id;
    touchS(); render();
  });
};
ACT.tplblk = el => {
  const t = store.settings.templates.find(x => x.id === el.dataset.t); const id = el.dataset.b;
  const order = store.settings.blocks.map(b => b.id);
  t.blockIds = el.checked ? order.filter(i => i === id || t.blockIds.includes(i)) : t.blockIds.filter(i => i !== id);
  touchS();
};

ACT.export = () => {
  const blob = new Blob([JSON.stringify({ ...store, meta: undefined }, null, 1)], { type: 'application/json' });
  downloadBlob(blob, `vishwaafx_quotes_backup_${todayStr()}.json`);
};
ACT.samples = () => { sampleProjects(store); touchS(); render(); toast('Starter quotes added.'); };

document.addEventListener('change', async e => {
  const el = e.target;
  if (el.dataset.actChange === 'theme') { try { localStorage.setItem('vfxq.theme', el.value); } catch {} applyTheme(); }
  if (el.dataset.actChange === 'logo' && el.files[0]) {
    store.settings.logo = await shrinkImage(el.files[0], 1200); store.settings.logoMono = await shrinkImage(el.files[0], 1200, true); touchS(); render(); toast('Logo updated.');
  }
  if (el.dataset.actChange === 'import' && el.files[0]) {
    try {
      const data = JSON.parse(await el.files[0].text());
      if (!data.projects || !data.settings) throw new Error('Not a Quote Desk backup');
      store = mergeStores(store, data); saveLocal(store); scheduleSync(); render(); toast(`Backup restored · ${data.projects.length} quotes merged.`);
    } catch (err) { toast('Could not read that file: ' + err.message); }
  }
});
function shrinkImage(file, maxW, grey = false) {
  return new Promise((res, rej) => {
    const img = new Image(); img.onload = () => {
      const sc = Math.min(1, maxW / img.width); const c = document.createElement('canvas');
      c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
      const g = c.getContext('2d'); if (grey) g.filter = 'grayscale(1)'; g.drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/png'));
    }; img.onerror = rej; img.src = URL.createObjectURL(file);
  });
}
function downloadBlob(blob, name) {
  if (IN_ARTIFACT) { toast('Downloads work in the installed app.'); return; }
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

/* ================= PDF preview & export ================= */
let lastPdf = null;
ACT.pdf = async () => {
  const p = curP();
  const v = document.createElement('div'); v.className = 'viewer'; v.id = 'viewer';
  v.innerHTML = `<header><button class="iconbtn" data-act="closeviewer" aria-label="Close">${I.x}</button>
      <div style="flex:1;min-width:0"><b>${esc(quoteNo(store, p))}</b><div class="muted" style="font-size:12px">${esc(p.name)}</div></div>
      <button class="chip on" id="allpages" data-act="allpages">All pages</button></header>
    <div class="pages"><div class="muted" style="color:#cfd8d4;padding:40px">Building PDF…</div></div>
    <footer><div class="pagesel" id="pagesel">Exporting all pages</div>
      <button class="btn primary" data-act="sharepdf">Share / Download</button>
      <button class="btn" data-act="drivepdf" ${Drive.isConnected() ? '' : 'disabled'}>Save to Drive</button></footer>`;
  document.body.appendChild(v);
  try {
    const bytes = await QuotePDF.build(store, p);
    lastPdf = { p, bytes, name: QuotePDF.fileName(store, p), folder: QuotePDF.folderName(store, p), n: 0 };
    lastPdf.n = await renderPages(bytes, v.querySelector('.pages'));
    updatePageSel();
  } catch (err) {
    console.error(err); v.querySelector('.pages').innerHTML = `<div class="warnbox">The PDF could not be built: ${esc(err.message)}</div>`;
  }
};
ACT.closeviewer = () => document.getElementById('viewer')?.remove();
async function renderPages(bytes, host) {
  const pdfjs = await import(new URL('vendor/pdfjs/pdf.min.mjs', document.baseURI).href);
  pdfjs.GlobalWorkerOptions.workerSrc = new URL('vendor/pdfjs/pdf.worker.min.mjs', document.baseURI).href;
  const doc = await pdfjs.getDocument({ data: bytes.slice(0), standardFontDataUrl: new URL('vendor/pdfjs/standard_fonts/', location.href).href }).promise;
  host.innerHTML = '';
  const scale = Math.min(2.2, (Math.min(host.clientWidth - 28, 760) / 595) * (window.devicePixelRatio || 1));
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i); const vp = page.getViewport({ scale });
    const fig = document.createElement('figure'); fig.className = 'pg';
    fig.innerHTML = `<label class="pgsel"><input type="checkbox" checked data-pg="${i - 1}" aria-label="Include page ${i}"> Page ${i}</label>`;
    const c = document.createElement('canvas'); c.width = vp.width; c.height = vp.height; fig.appendChild(c); host.appendChild(fig);
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
  }
  return doc.numPages;
}
function selectedPages() { return [...document.querySelectorAll('#viewer [data-pg]')].filter(x => x.checked).map(x => num(x.dataset.pg)); }
function updatePageSel() {
  const sel = selectedPages(); const all = sel.length === lastPdf?.n;
  document.querySelectorAll('#viewer figure.pg').forEach(f => f.classList.toggle('off', !f.querySelector('input').checked));
  const lbl = document.getElementById('pagesel'); if (lbl) lbl.textContent = all ? `Exporting all ${sel.length} pages` : sel.length ? `Exporting page${sel.length > 1 ? 's' : ''} ${sel.map(i => i + 1).join(', ')} of ${lastPdf.n}` : 'Tick at least one page';
  document.getElementById('allpages')?.classList.toggle('on', all);
}
document.addEventListener('change', e => { if (e.target.matches('#viewer [data-pg]')) updatePageSel(); });
ACT.allpages = () => {
  const boxes = [...document.querySelectorAll('#viewer [data-pg]')]; const all = boxes.every(b => b.checked);
  boxes.forEach(b => b.checked = !all); updatePageSel();
};
async function exportBytes() {
  const sel = selectedPages();
  if (!sel.length) { toast('Tick at least one page to export.'); return null; }
  if (sel.length === lastPdf.n) return { bytes: lastPdf.bytes, name: lastPdf.name };
  const bytes = await QuotePDF.build(store, lastPdf.p, { pages: sel });
  return { bytes, name: lastPdf.name.replace(/\.pdf$/, ` (page${sel.length > 1 ? 's' : ''} ${sel.map(i => i + 1).join('-')}).pdf`) };
}
ACT.sharepdf = async () => {
  if (!lastPdf) return;
  const out = await exportBytes(); if (!out) return;
  const file = new File([out.bytes], out.name, { type: 'application/pdf' });
  if (Drive.isConnected() && Drive.token()) saveToDrive(out, true);
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: out.name }); return; }
  } catch (e) { if (e.name === 'AbortError') return; }
  downloadBlob(file, out.name);
};
ACT.drivepdf = async () => { if (!lastPdf) return; const out = await exportBytes(); if (out) saveToDrive(out, false); };
async function saveToDrive(out, quiet) {
  if (!Drive.token()) { toast('Drive needs reconnecting. Tap the sync button at the top.'); return; }
  try {
    if (!quiet) toast('Saving to Drive…');
    await Drive.savePdf(out.name, lastPdf.folder, out.bytes);
    toast(`Saved to Drive › ${Drive.FOLDER} › PDF › ${lastPdf.folder}`, 3500);
  } catch (e) { toast('Drive save failed: ' + e.message, 4000); }
}


/* ================= sync loop ================= */
let syncTimer, syncing = false;
function scheduleSync(delay = 2500) {
  if (!Drive.isConnected()) return;
  clearTimeout(syncTimer); syncTimer = setTimeout(() => runSync(), delay);
}
async function runSync(manual = false) {
  if (!Drive.isConnected()) { setSync('local'); return; }
  if (!navigator.onLine) { setSync('offline'); return; }
  if (!Drive.token()) { setSync('off'); if (manual) Drive.authorize(); return; }
  if (syncing) { scheduleSync(1500); return; }
  syncing = true; setSync('busy');
  try {
    const before = JSON.stringify(store.projects);
    const merged = await Drive.sync(store);
    store = merged; saveLocal(store); setSync('ok');
    if (JSON.stringify(store.projects) !== before && ['home', 'settings'].includes(route.name)) render();
    if (manual) toast('Synced with Google Drive.');
  } catch (e) {
    console.warn(e); setSync(e.code === 'AUTH' ? 'off' : 'err');
    if (manual) toast(e.code === 'AUTH' ? 'Drive session expired. Tap “Reconnect Drive”.' : 'Sync failed: ' + e.message, 4000);
  } finally { syncing = false; }
}
window.addEventListener('online', () => runSync());
window.addEventListener('offline', () => setSync('offline'));
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') runSync(); else { clearTimeout(saveTimer); saveLocal(store); } });

/* ================= boot ================= */
function applyTheme() {
  let t = 'system'; try { t = localStorage.getItem('vfxq.theme') || 'system'; } catch {}
  if (t === 'system') document.documentElement.removeAttribute('data-theme'); else document.documentElement.setAttribute('data-theme', t);
}
function boot() {
  applyTheme();
  const msg = Drive.handleRedirect();
  store = loadStore();
  if (!store) { store = emptyStore(); sampleProjects(store); saveLocal(store); }
  try { const r = JSON.parse(sessionStorage.getItem('vfxq.route') || 'null'); if (r && VIEWS[r.name]) { route = r; if (r.kind) ui.kind = r.kind; } } catch {}
  try { history.replaceState(route, ''); } catch {}
  syncState = Drive.isConnected() ? (Drive.token() ? 'busy' : 'off') : 'local';
  render(true);
  if (msg === 'connected') { toast('Google Drive connected. Syncing…'); runSync(); }
  else if (msg === 'reconnect') { setSync('off'); }
  else if (msg) toast(msg, 4000);
  else if (!Drive.maybeSilentRefresh()) runSync();
  if ('serviceWorker' in navigator && !IN_ARTIFACT && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
}
document.addEventListener('DOMContentLoaded', boot);
