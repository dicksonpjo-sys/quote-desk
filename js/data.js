/* VishwaaFX Quote Desk — data model, defaults, calculations */
'use strict';

const APP_VERSION = '1.1.0';
const STORE_KEY = 'vfxq.data.v2';

const uid = (p = 'id') => p + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const nowISO = () => new Date().toISOString();
const todayStr = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
};
const pad2 = n => String(n).padStart(2, '0');
const pad3 = n => String(n).padStart(3, '0');
const clone = o => JSON.parse(JSON.stringify(o));
const num = v => { const n = parseFloat(String(v ?? '').replace(/,/g, '')); return isFinite(n) ? n : 0; };

/* Indian number format: 13,93,650 */
function inr(n) {
  n = Math.round(num(n));
  const neg = n < 0; let s = String(Math.abs(n));
  let last3 = s.slice(-3); const rest = s.slice(0, -3);
  if (rest) last3 = ',' + last3;
  return (neg ? '-' : '') + rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + last3;
}
const rs = n => '₹' + inr(n);
const mmss = s => { s = Math.round(num(s)); return pad2(Math.floor(s / 60)) + ':' + pad2(s % 60); };
const fmtDate = iso => { if (!iso) return ''; const [y, m, d] = iso.split('-'); return `${d}-${m}-${y}`; };
function addDays(iso, days) {
  const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + num(days));
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate());
}
/* Indian financial year (Apr–Mar): 2026-09-15 -> "26-27" */
function fyOf(iso) {
  const [y, m] = iso.split('-').map(Number);
  const start = m >= 4 ? y : y - 1;
  return pad2(start % 100) + '-' + pad2((start + 1) % 100);
}

const STATUSES = ['Draft', 'Sent', 'Approved', 'In Progress', 'Closed', 'Lost'];
const PAY_STATUSES = ['Pending', 'Partial', 'Paid'];

/* ---------------- Defaults ---------------- */
function defaultSettings() {
  return {
    updatedAt: '2000-01-01T00:00:00.000Z',
    company: {
      name: 'VISHWAA FX',
      sub: 'VFX STUDIO',
      address1: "72/1408, KISHAN'S SHIVAKRUPA (HOUSE NAME),",
      address2: 'ASHOKA RD, KALOOR, KOCHI, KERALA 682017',
      email: 'vishwaafx@gmail.com',
      mobile: '+91 7736026999'
    },
    logo: null,               // data URL; null = bundled logo.png
    numberPrefix: 'VFX',
    validityDays: 30,
    categories: ['Feature Film', 'Web Series', 'Ad Film', 'Music Video', 'Corporate', 'Other'],
    departments: [
      '2D Compositing', 'Cleanup', 'Chroma Comp', 'Roto', 'Match Move', 'Prep / Paint',
      'Crowd Multiplication', 'Skin Retouch', 'Beauty Work', 'Sky Replacement', 'Set Extension',
      '3D Modelling and Texturing', '3D Animation', '3D Animation, Lighting and Rendering',
      '3D Compositing', '3D Compositing and Motion Graphics', 'FX / Simulation', 'AI Generated Shots',
      'Motion Graphics', 'Main Title & End Card', 'All Film Credits & Interval Card',
      'Video Edit', 'Sound Effects', 'Background Music - Standard Licence', 'DI / Colour'
    ],
    signatories: [
      { id: 'sig_dj_sup', name: 'Dickson P Jo', title: 'VFX Supervisor', phone: '+91-7736026999' },
      { id: 'sig_dj_dir', name: 'Dickson P Jo', title: 'VFX Director', phone: '+91-9916551561' },
      { id: 'sig_vn_lp', name: 'Vishal Neeladi', title: 'Line Producer', phone: '+91-9916 551 561' }
    ],
    banks: [
      { id: 'bank_studio', label: 'Studio – Bank of India', accName: 'VISHWAA.FX STUDIO PRIVATE LIMITED', bank: 'Bank Of India',
        accNo: '850420110000274', ifsc: 'BKID0008504', branch: 'Ernakulam HSG Fin', mobile: '' },
      { id: 'bank_dickson', label: 'Dickson – HDFC', accName: 'Dickson P J', bank: 'HDFC',
        accNo: '50100612144110', ifsc: 'HDFC0000510', branch: 'Banerji Road', mobile: '+91 99 1655 1561' }
    ],
    defaultBank: { quote: 'bank_studio', supervision: 'bank_dickson' },
    supPrefix: 'SUP',
    supDayRate: 5000,
    supItems: ['VFX Supervision', 'Travel', 'Fuel', 'Food', 'Stay', 'Local conveyance', 'Equipment'],
    /* Note blocks library. placement: quote = under the quotation table,
       breakdown = under every cost-breakdown table, end = after the last breakdown. */
    blocks: [
      {
        id: 'blk_terms_film', title: 'Payment terms 40 / 50 / 10 (film)', heading: 'Terms and Conditions:',
        style: 'numbered', placement: 'quote', items: [
          'Make an advance payment of 40% of the total amount, with an email confirmation, for work to start. Once work has started and Prototype Version 01 is ready, we will inform you by email and phone.',
          'Based on your suggestions, we will develop Prototype Version 02. Once it is ready, 50% of the total amount is to be transferred.',
          'When the final output is ready, it will be shared after the balance 10% of the total amount is paid. Final output will only be shared after receiving the payment.',
          'Any extra amendments will be charged extra. The amount quoted is as per the edit reference received on the quotation date.',
          'An additional 30% will be charged for 4K resolution.',
          'The project will be executed as per the process given by COB for effective and hassle-free execution. Major changes outside the agreed scope of work will affect production, and are subject to a schedule change, a revised delivery date and extra costs.'
        ]
      },
      {
        id: 'blk_terms_ad', title: 'Payment terms 50 / 25 / 25 (ad)', heading: 'Terms and Conditions:',
        style: 'plain', placement: 'quote', items: [
          'The quotation is based on the reference video shared by the client.',
          'Background music includes a standard licence only.',
          'Any additional commercial or extended music licensing charges will be billed separately as per the client’s licensing requirements.',
          'Any changes beyond the approved scope or additional revisions may be quoted separately.',
          'Final delivery will be completed within 15 - 18 working days from the date of requirement finalisation and receipt of all necessary inputs.',
          'An advance payment of 50% of the total amount is required to commence work.',
          'A second payment of 25% of the total amount is required at pre-master (after client approval), before it is sent to audio production.',
          'The final payment of the remaining 25% is required before the master files are handed over.'
        ]
      },
      {
        id: 'blk_notes_ad', title: 'Notes – music licence (ad breakdown)', heading: 'Notes',
        style: 'plain', placement: 'breakdown', items: [
          'The quotation is based on the reference video shared by the client.',
          'Background music includes a standard licence only.',
          'Any additional commercial or extended music licensing charges will be billed separately as per the client’s licensing requirements.',
          'Any changes beyond the approved scope or additional revisions may be quoted separately.',
          'Final delivery will be completed within 18 working days from the date of requirement finalisation and receipt of all necessary inputs.'
        ]
      },
      {
        id: 'blk_tax', title: 'Tax note (excl. 18% GST)', heading: '',
        style: 'plain', placement: 'quote', items: ['NB: Amount quoted is excluding tax (18%).']
      },
      {
        id: 'blk_tax_tds', title: 'Tax note + 2% TDS', heading: '',
        style: 'plain', placement: 'quote', items: ['NB: Amount quoted is excluding tax (18%). You can deduct 2% TDS if applicable.']
      },
      {
        id: 'blk_inputs', title: 'VFX inputs & outputs', heading: 'VFX INPUTS & OUTPUTS',
        style: 'bullets', placement: 'end', items: [
          'Shot duration is to be locked before it is sent.',
          'CG reference file of all shots (as a single MOV or MP4) to be provided by the edit team.',
          'Files are to be sent in DPX / EXR format at 4K resolution.',
          'Camera metadata is to be provided for the 3D workflow if required.',
          'Files shot in anamorphic format are to be de-squeezed.',
          'All transitions, time remapping, scaling, reframing and other effects are to be removed.',
          'The texts of the film credits and other text cards are to be provided and updated in the format provided.',
          'Any hard drive required is to be provided.'
        ]
      },
      {
        id: 'blk_deliv', title: 'VFX deliverables', heading: 'VFX DELIVERABLES',
        style: 'bullets', placement: 'end', items: ['4K DPX / EXR 32-bit.', 'Titles and motion graphics: 4K TIFF or as requested.']
      },
      { id: 'blk_bank', title: 'Bank account details', heading: 'ACCOUNT DETAILS', style: 'bank', placement: 'end', items: [] },
      {
        id: 'blk_sup_terms', title: 'Supervision terms', heading: 'Notes',
        style: 'plain', placement: 'end', items: [
          'Supervision is billed per shoot day. Travel, fuel, food and stay are billed at actuals.',
          'Payment is due within 7 days of this bill.'
        ]
      }
    ],
    templates: [
      {
        id: 'tpl_film', kind: 'quote', name: 'Feature film / Web series', mode: 'batches', clientLabel: 'Production', singlePage: false,
        signatoryId: 'sig_dj_sup', blockIds: ['blk_terms_film', 'blk_tax', 'blk_inputs', 'blk_deliv', 'blk_bank']
      },
      {
        id: 'tpl_ad', kind: 'quote', name: 'Ad film – quality options', mode: 'tiers', clientLabel: 'Client', singlePage: false,
        signatoryId: 'sig_dj_dir', blockIds: ['blk_terms_ad', 'blk_notes_ad']
      },
      {
        id: 'tpl_credits', kind: 'quote', name: 'Titles & credits – single page', mode: 'batches', clientLabel: 'Production', singlePage: true,
        signatoryId: 'sig_vn_lp', blockIds: ['blk_terms_film', 'blk_tax_tds']
      },
      {
        id: 'tpl_sup', kind: 'supervision', name: 'On-site supervision', mode: 'batches', clientLabel: 'Production', singlePage: true,
        signatoryId: 'sig_dj_dir', blockIds: ['blk_bank'], showSignature: false
      }
    ],
    categoryTemplate: {
      'Feature Film': 'tpl_film', 'Web Series': 'tpl_film', 'Ad Film': 'tpl_ad',
      'Music Video': 'tpl_film', 'Corporate': 'tpl_ad', 'Other': 'tpl_film'
    }
  };
}

function newLine(desc = '', type = 'rate', sec = '', rate = '', amount = '', date = '') {
  return { id: uid('ln'), desc, type, sec, rate, amount, date };
}
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function billLetter(n) { let s = ''; n++; while (n > 0) { n--; s = LETTERS[n % 26] + s; n = Math.floor(n / 26); } return s; }
/* "Initial Bill", "Additional Bill A", "Additional Bill B" … (options keep their own name) */
function secLabel(p, i) {
  if (p.mode === 'tiers') return p.sections[i]?.name || `Option ${i + 1}`;
  return i === 0 ? 'Initial Bill' : 'Additional Bill ' + billLetter(i - 1);
}
function secTitle(p, i) {
  const sec = p.sections[i]; const lbl = secLabel(p, i);
  if (p.mode === 'tiers') return lbl;
  return sec.name && sec.name.trim() ? `${lbl} – ${sec.name.trim()}` : lbl;
}
const kindOf = p => p.kind || 'quote';
function newSection(name = '') {
  return {
    id: uid('sec'), name, summaryDesc: '', subtitle: '', lines: [newLine()],
    discountType: 'none', discount: '', durMode: 'sum', durManual: '',
    pay: { status: 'Pending', received: '', date: '' }
  };
}

/* Fresh project from a template */
function createProject(store, { name, category, client, templateId, date }) {
  const s = store.settings;
  const tpl = s.templates.find(t => t.id === templateId) || s.templates[0];
  const kind = tpl.kind || 'quote';
  date = date || todayStr();
  const fy = fyOf(date);
  const seq = nextSeq(store, fy, kind);
  const p = {
    id: uid('prj'), kind, fy, seq, rev: 0, bankId: s.defaultBank[kind], name: name || 'Untitled project', category: category || s.categories[0],
    clientLabel: tpl.clientLabel || 'Production', client: client || '', projectLabel: 'Project',
    date, validDays: s.validityDays, status: 'Draft', templateId: tpl.id, mode: tpl.mode,
    singlePage: !!tpl.singlePage, signatoryId: tpl.signatoryId,
    blocks: tpl.blockIds.map(id => s.blocks.find(b => b.id === id)).filter(Boolean).map(b => ({ ...clone(b), libId: b.id, id: uid('pb') })),
    sections: [], selectedTier: null, notes: '',
    pdf: { title: kind === 'supervision' ? 'ON-SITE SUPERVISION' : 'QUOTATION', copyLabel: 'ORIGINAL', showPayment: false,
      showGst: kind !== 'supervision', showMinutes: true, gstText: 'GST if applicable @ 18%, not included', showSignature: tpl.showSignature !== false },
    revisions: [], createdAt: nowISO(), updatedAt: nowISO(), deleted: false
  };
  if (kind === 'supervision') {
    const sec = newSection('Supervision');
    sec.lines = [newLine(s.supItems[0], 'lump', '', '', String(s.supDayRate || ''), date)];
    p.sections = [sec];
  } else if (p.mode === 'tiers') {
    p.sections = [newSection('Premium Quality'), newSection('Standard Quality')];
  } else {
    p.sections = [newSection('')];
  }
  return p;
}

function nextSeq(store, fy, kind = 'quote') {
  let max = 0;
  for (const p of store.projects) if (p.fy === fy && !p.deleted && kindOf(p) === kind) max = Math.max(max, p.seq || 0);
  return max + 1;
}
function quoteNo(store, p, withRev = true) {
  const pre = (kindOf(p) === 'supervision' ? store.settings.supPrefix || 'SUP' : store.settings.numberPrefix || 'VFX').trim();
  return `${pre}/${p.fy}/${pad3(p.seq)}` + (withRev && p.rev > 0 ? `-R${p.rev}` : '');
}

/* ---------------- Calculations ---------------- */
function lineAmount(l) { return l.type === 'lump' ? num(l.amount) : num(l.sec) * num(l.rate); }
function secGross(sec) { return sec.lines.reduce((a, l) => a + lineAmount(l), 0); }
function secNet(sec) {
  const g = secGross(sec);
  if (sec.discountType === 'final' && String(sec.discount).trim() !== '') return num(sec.discount);
  if (sec.discountType === 'amount') return g - num(sec.discount);
  if (sec.discountType === 'percent') return Math.round(g * (1 - num(sec.discount) / 100));
  return g;
}
function secDiscount(sec) { return secGross(sec) - secNet(sec); }
/* Duration that goes in the TOTAL row. "max" fixes the 5 depts × 21s = 63s problem. */
function secDuration(sec) {
  const durs = sec.lines.filter(l => l.type !== 'lump').map(l => num(l.sec));
  if (sec.durMode === 'manual') return num(sec.durManual);
  if (sec.durMode === 'max') return durs.length ? Math.max(...durs) : 0;
  return durs.reduce((a, b) => a + b, 0);
}
function sameDurWarning(sec) {
  const durs = sec.lines.filter(l => l.type !== 'lump' && num(l.sec) > 0).map(l => num(l.sec));
  return sec.durMode === 'sum' && durs.length > 2 && durs.every(d => d === durs[0]);
}
function projectValue(p) {
  if (p.mode === 'tiers') {
    const t = p.sections.find(s => s.id === p.selectedTier);
    return t ? secNet(t) : Math.max(0, ...p.sections.map(secNet));
  }
  return p.sections.reduce((a, s) => a + secNet(s), 0);
}
function secReceived(sec) {
  if (sec.pay.status === 'Paid') return secNet(sec);
  if (sec.pay.status === 'Partial') return num(sec.pay.received);
  return 0;
}
function projectReceived(p) {
  if (p.mode === 'tiers') {
    const t = p.sections.find(s => s.id === p.selectedTier);
    return t ? secReceived(t) : 0;
  }
  return p.sections.reduce((a, s) => a + secReceived(s), 0);
}
const isCommitted = p => (kindOf(p) === 'supervision' ? ['Sent', 'Approved', 'In Progress', 'Closed'] : ['Approved', 'In Progress', 'Closed']).includes(p.status);
function bankOf(store, p) {
  const s = store.settings;
  return s.banks.find(b => b.id === p.bankId) || s.banks.find(b => b.id === s.defaultBank[kindOf(p)]) || s.banks[0];
}
function projectPending(p) { return isCommitted(p) ? Math.max(0, projectValue(p) - projectReceived(p)) : 0; }
function validTill(p) { return addDays(p.date, p.validDays); }
function daysLeft(p) {
  const t = new Date(validTill(p) + 'T23:59:59'); return Math.ceil((t - new Date()) / 86400000);
}

/* Last rate used for a description (same category first, then any) */
function rateHistory(store, desc, category, excludeId) {
  const key = desc.trim().toLowerCase(); if (!key) return null;
  let best = null;
  for (const p of store.projects) {
    if (p.deleted || p.id === excludeId) continue;
    for (const s of p.sections) for (const l of s.lines) {
      if (l.type !== 'rate' || !num(l.rate) || l.desc.trim().toLowerCase() !== key) continue;
      const score = (p.category === category ? 1 : 0) * 1e13 + new Date(p.date).getTime();
      if (!best || score > best.score) best = { score, rate: num(l.rate), project: p.name, category: p.category, date: p.date };
    }
  }
  return best;
}
function allDescriptions(store) {
  const set = new Set(store.settings.departments);
  for (const p of store.projects) if (!p.deleted) for (const s of p.sections) for (const l of s.lines) if (l.desc.trim()) set.add(l.desc.trim());
  return [...set].sort((a, b) => a.localeCompare(b));
}

/* ---------------- Store ---------------- */
function emptyStore() { return { schema: 1, settings: defaultSettings(), projects: [], meta: {} }; }

function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      s.settings = { ...defaultSettings(), ...s.settings };
      s.projects = s.projects || []; s.meta = s.meta || {};
      return s;
    }
  } catch (e) { console.warn('load failed', e); }
  return null;
}
function saveLocal(store) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(store)); return true; }
  catch (e) { console.error('save failed', e); return false; }
}

/* Merge two stores record by record (newest updatedAt wins). */
function mergeStores(a, b) {
  const out = { schema: 1, meta: { ...(a.meta || {}) } };
  out.settings = (new Date(b.settings?.updatedAt || 0) > new Date(a.settings?.updatedAt || 0)) ? b.settings : a.settings;
  const map = new Map();
  for (const p of [...(a.projects || []), ...(b.projects || [])]) {
    const cur = map.get(p.id);
    if (!cur || new Date(p.updatedAt) > new Date(cur.updatedAt)) map.set(p.id, p);
  }
  out.projects = [...map.values()];
  // Two devices offline could hand out the same number: renumber the later one.
  const seen = new Map();
  for (const p of [...out.projects].filter(p => !p.deleted).sort((x, y) => new Date(x.createdAt) - new Date(y.createdAt))) {
    const k = kindOf(p) + p.fy + '/' + p.seq;
    if (seen.has(k)) { p.seq = nextSeq(out, p.fy, kindOf(p)); p.updatedAt = nowISO(); p.renumbered = true; }
    seen.set(kindOf(p) + p.fy + '/' + p.seq, p.id);
  }
  return out;
}
