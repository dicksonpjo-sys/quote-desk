/* Logic checks for js/data.js: money format, financial year, numbering, totals, discounts,
   screen time, payments, merge. Run: node tests/logic_test.js  (no installs needed) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console, localStorage: { getItem: () => null, setItem: () => {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8') +
  '\n;this.api = { inr, fyOf, addDays, billLetter, secLabel, secTitle, createProject, nextSeq, quoteNo, secGross, secNet, secDiscount, secDuration, sameDurWarning, projectValue, projectReceived, projectPending, mergeStores, emptyStore, newLine, newSection, validTill, mmss, normalizeStore, dashboardItems, groupName, SORTS, buildIndex, diffVersions, versionsOf, revName, clone };', ctx);
const A = ctx.api;
let pass = 0, fail = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  ok ? pass++ : fail++;
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`));
}

// Money and dates
eq('inr 13,93,650', A.inr(1393650), '13,93,650');
eq('inr 999', A.inr(999), '999');
eq('inr 1,00,000', A.inr(100000), '1,00,000');
eq('inr negative', A.inr(-25000), '-25,000');
eq('inr with commas typed', A.inr('1,18,000'), '1,18,000');
eq('mm:ss', A.mmss(95), '01:35');
eq('FY Sept 2026', A.fyOf('2026-09-15'), '26-27');
eq('FY 31 Mar 2027', A.fyOf('2027-03-31'), '26-27');
eq('FY 1 Apr 2027', A.fyOf('2027-04-01'), '27-28');
eq('addDays month end', A.addDays('2026-10-31', 1), '2026-11-01');
eq('valid till', A.validTill({ date: '2026-09-05', validDays: 30 }), '2026-10-05');

// Bill labels
const pb = { mode: 'batches', sections: [{ name: '' }, { name: 'Trailer & Teaser' }, {}] };
eq('label initial', A.secLabel(pb, 0), 'Initial Bill');
eq('heading = what was typed (v1.5.0)', A.secTitle(pb, 1), 'Trailer & Teaser');
eq('heading falls back to the position label', A.secTitle(pb, 2), 'Additional Bill B');
eq('label B', A.secLabel(pb, 2), 'Additional Bill B');
eq('bill letter 26 -> AA', A.billLetter(26), 'AA');

// Numbering: per kind, per FY, restarts in April
const st = A.emptyStore();
const tplQ = st.settings.templates.find(t => (t.kind || 'quote') === 'quote').id;
const tplS = st.settings.templates.find(t => t.kind === 'supervision').id;
const mk = (date, tpl) => { const p = A.createProject(st, { name: 'x', templateId: tpl, date }); st.projects.push(p); return p; };
const q1 = mk('2026-05-01', tplQ), q2 = mk('2026-06-01', tplQ), s1 = mk('2026-06-02', tplS), q3 = mk('2027-04-02', tplQ);
eq('quote no 1', A.quoteNo(st, q1), 'VFX/26-27/001');
eq('quote no 2', A.quoteNo(st, q2), 'VFX/26-27/002');
eq('supervision own sequence', A.quoteNo(st, s1), 'SUP/26-27/001');
eq('restart in April', A.quoteNo(st, q3), 'VFX/27-28/001');
q2.rev = 1; eq('revision suffix', A.quoteNo(st, q2), 'VFX/26-27/002-R1');
q2.deleted = true; const q4 = mk('2026-07-01', tplQ);
eq('deleted number is never reused', A.quoteNo(st, q4), 'VFX/26-27/003');

// Totals, discounts, screen time
const sec = A.newSection('');
sec.lines = [A.newLine('Roto', 'rate', '21', '1000'), A.newLine('Comp', 'rate', '21', '2000'), A.newLine('Paint', 'rate', '21', '500'), A.newLine('Credit', 'lump', '', '', '10,000')];
eq('gross', A.secGross(sec), 21 * 3500 + 10000);
sec.discountType = 'amount'; sec.discount = '3,500'; eq('discount ₹', A.secNet(sec), 83500 - 3500);
sec.discountType = 'percent'; sec.discount = '10'; eq('discount %', A.secNet(sec), Math.round(83500 * 0.9));
sec.discountType = 'final'; sec.discount = '75000'; eq('final amount', A.secNet(sec), 75000);
eq('discount shown', A.secDiscount(sec), 8500);
sec.discountType = 'final'; sec.discount = ''; eq('final left empty = no discount', A.secNet(sec), 83500);
eq('duration sum', A.secDuration(sec), 63);
eq('same-seconds warning', A.sameDurWarning(sec), true);
sec.durMode = 'max'; eq('duration longest', A.secDuration(sec), 21);
sec.durMode = 'manual'; sec.durManual = '30'; eq('duration typed', A.secDuration(sec), 30);

// Project value, payments, to collect
const p = { mode: 'batches', status: 'Approved', kind: 'quote', sections: [A.newSection(''), A.newSection('')] };
p.sections[0].lines = [A.newLine('A', 'lump', '', '', '100000')]; p.sections[1].lines = [A.newLine('B', 'lump', '', '', '50000')];
p.sections[0].pay = { status: 'Paid' }; p.sections[1].pay = { status: 'Partial', received: '20000' };
eq('project value', A.projectValue(p), 150000);
eq('received', A.projectReceived(p), 120000);
eq('to collect', A.projectPending(p), 30000);
p.status = 'Sent'; eq('quote not counted until approved', A.projectPending(p), 0);
eq('supervision counted once sent', A.projectPending({ ...p, kind: 'supervision' }), 30000);
const t = { mode: 'tiers', sections: [A.newSection('Premium'), A.newSection('Standard')], selectedTier: null };
t.sections[0].lines = [A.newLine('P', 'lump', '', '', '200000')]; t.sections[1].lines = [A.newLine('S', 'lump', '', '', '120000')];
eq('options: none ticked shows highest', A.projectValue(t), 200000);
t.selectedTier = t.sections[1].id; eq('options: ticked option', A.projectValue(t), 120000);

// Merge: newest wins, deletes sync, duplicate numbers renumbered
const base = { id: 'p1', kind: 'quote', fy: '26-27', seq: 1, name: 'old', updatedAt: '2026-11-01T00:00:00Z', createdAt: '2026-11-01T00:00:00Z' };
const a = { settings: { updatedAt: '2026-11-01T00:00:00Z', tag: 'a' }, projects: [base] };
const b = { settings: { updatedAt: '2026-11-02T00:00:00Z', tag: 'b' }, projects: [{ ...base, name: 'new', updatedAt: '2026-11-02T00:00:00Z' }] };
let m = A.mergeStores(a, b);
eq('merge newest project', m.projects[0].name, 'new');
eq('merge newest settings', m.settings.tag, 'b');
m = A.mergeStores(b, a); eq('merge order does not matter', m.projects[0].name, 'new');
m = A.mergeStores(a, { settings: a.settings, projects: [{ ...base, deleted: true, updatedAt: '2026-11-03T00:00:00Z' }] });
eq('soft delete wins when newer', m.projects[0].deleted, true);
const c1 = { ...base, id: 'c1', seq: 5, createdAt: '2026-11-05T09:00:00Z', updatedAt: '2026-11-05T09:00:00Z' };
const c2 = { ...base, id: 'c2', seq: 5, createdAt: '2026-11-05T10:00:00Z', updatedAt: '2026-11-05T10:00:00Z' };
m = A.mergeStores({ settings: a.settings, projects: [c1] }, { settings: a.settings, projects: [c2] });
const byId = Object.fromEntries(m.projects.map(x => [x.id, x]));
eq('offline duplicate: first keeps number', byId.c1.seq, 5);
eq('offline duplicate: later renumbered', [byId.c2.seq, byId.c2.renumbered], [6, true]);

// ---- v1.4.0: Studio Console summary file ----
{
  const st = A.emptyStore();
  const q = A.createProject(st, { name: 'Mayan', category: 'Feature Film', client: 'Prod Co', templateId: 'tpl_film', date: '2026-11-01' });
  q.studioId = ' STU-042 '; q.status = 'Approved';
  q.sections = [A.newSection(), A.newSection('Reel 2')];
  q.sections[0].lines = [A.newLine('Roto', 'rate', '10', '1000')]; q.sections[0].pay = { status: 'Paid', received: '', date: '2026-11-10' };
  q.sections[1].lines = [A.newLine('Comp', 'rate', '20', '1500')]; q.sections[1].discountType = 'amount'; q.sections[1].discount = '5000';
  q.sections[1].pay = { status: 'Partial', received: '10000', date: '2026-11-20' };
  const t = A.createProject(st, { name: 'Ad', category: 'Ad Film', client: 'X', templateId: 'tpl_ad', date: '2026-11-02' });
  t.mode = 'tiers'; t.sections = [A.newSection('Premium'), A.newSection('Standard')];
  t.sections[0].lines = [A.newLine('All', 'lump', '', '', '200000')]; t.sections[1].lines = [A.newLine('All', 'lump', '', '', '120000')];
  const gone = A.createProject(st, { name: 'Deleted one', category: 'Feature Film', client: '', templateId: 'tpl_film', date: '2026-11-03' }); gone.deleted = true;
  st.projects.push(q, t, gone);
  let ix = A.buildIndex(st); const mq = ix.quotes.find(x => x.project === 'Mayan');
  eq('index: deleted quotes left out', ix.quotes.map(x => x.project).sort(), ['Ad', 'Mayan']);
  eq('index: studio id trimmed', mq.studioProjectId, 'STU-042');
  eq('index: every bill listed with its label', mq.bills.map(b => [b.label, b.title]), [['Initial Bill', ''], ['Additional Bill A', 'Reel 2']]);
  eq('index: bill amounts after discount', mq.bills.map(b => [b.gross, b.discount, b.amount]), [[10000, 0, 10000], [30000, 5000, 25000]]);
  eq('index: payments per bill', mq.bills.map(b => [b.payment.status, b.payment.received, b.payment.date]), [['Paid', 10000, '2026-11-10'], ['Partial', 10000, '2026-11-20']]);
  eq('index: total / received / due', [mq.total, mq.received, mq.due], [35000, 20000, 15000]);
  eq('index: screen time per bill', mq.bills.map(b => b.screenTimeSec), [10, 20]);
  eq('index: dates', [mq.quoteDate, mq.validTill], ['2026-11-01', '2026-12-01']);
  eq('index: no PDF saved = no link', mq.pdf, null);
  const ad = ix.quotes.find(x => x.project === 'Ad');
  eq('index: options with none approved = no total, no bills', [ad.optionApproved, ad.total, ad.bills.length], [false, null, 0]);
  t.selectedTier = t.sections[1].id; ix = A.buildIndex(st);
  const ad2 = ix.quotes.find(x => x.project === 'Ad');
  eq('index: only the approved option', [ad2.total, ad2.bills.map(b => b.label)], [120000, ['Standard']]);
  q.lastPdf = { id: 'abc', name: 'q.pdf', at: '2026-11-21T10:00:00Z' };
  eq('index: PDF link when saved', A.buildIndex(st).quotes.find(x => x.project === 'Mayan').pdf.link, 'https://drive.google.com/file/d/abc/view');
  const txt = JSON.stringify(A.buildIndex(st));
  eq('index: no bank details', /accNo|ifsc|accName|bank/i.test(txt), false);
}

// ---- v1.4.0: versions and compare ----
{
  const st = A.emptyStore();
  const p = A.createProject(st, { name: 'Film', category: 'Feature Film', client: 'C', templateId: 'tpl_film', date: '2026-11-01' });
  p.sections = [A.newSection()]; const [l1, l2] = [A.newLine('Roto', 'rate', '10', '1000'), A.newLine('Paint', 'rate', '5', '800')];
  p.sections[0].lines = [l1, l2];
  p.blocks = [{ id: 'b1', title: 'Payment terms', heading: 'PAYMENT', items: ['50% advance'] }];
  p.revisions = [{ rev: 0, savedAt: '2026-11-02T10:00:00Z', total: A.projectValue(p), data: A.clone({ name: p.name, client: p.client, date: p.date, validDays: p.validDays, sections: p.sections, blocks: p.blocks, mode: p.mode }) }];
  p.rev = 1;
  l1.sec = '15'; p.sections[0].lines = [l1, A.newLine('Sky', 'lump', '', '', '5000')];
  p.sections.push(A.newSection('Extra')); p.sections[1].lines = [A.newLine('Comp', 'rate', '4', '1500')];
  p.blocks[0].items = ['50% advance', 'Balance on delivery'];
  const vs = A.versionsOf(p);
  eq('versions: Original then R1', vs.map(v => [A.revName(v.rev), v.current]), [['Original', false], ['R1', true]]);
  eq('versions: original keeps its own lines', vs[0].p.sections[0].lines.map(l => l.desc), ['Roto', 'Paint']);
  const d = A.diffVersions(vs[0].p, vs[1].p);
  eq('compare: totals', [d.totalFrom, d.totalTo], [14000, 26000]);
  const b0 = d.bills.find(b => b.label === 'Initial Bill');
  eq('compare: line changed / removed / added', b0.lines.map(l => [l.desc, l.change]), [['Roto', 'changed'], ['Paint', 'removed'], ['Sky', 'added']]);
  eq('compare: changed line values', [b0.lines[0].from.sec, b0.lines[0].to.sec, b0.lines[0].to.amount], [10, 15, 15000]);
  eq('compare: new bill', d.bills.filter(b => b.change === 'added').map(b => [b.label, b.netTo]), [['Extra', 6000]]);
  eq('compare: notes', d.notes.map(n => [n.title, n.added]), [['Payment terms', ['Balance on delivery']]]);
  const same = A.diffVersions(vs[1].p, vs[1].p);
  eq('compare: same version = no differences', [same.fields.length, same.bills.length, same.notes.length], [0, 0, 0]);
}

// ---- v1.4.1: every bill in the Studio Console index carries its stable id ----
{
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'fixtures', 'sample.js'), 'utf8') + '\n;this.sampleProjects = sampleProjects;', ctx);
  const st = A.emptyStore(); ctx.sampleProjects(st);
  const ix = A.buildIndex(st);
  const bills = ix.quotes.flatMap(q => q.bills);
  eq('index ids: every bill on the sample store has a non-empty id', bills.length > 0 && bills.every(b => typeof b.id === 'string' && b.id.length > 0), true);
  eq('index ids: id is the first field of each bill', bills.every(b => Object.keys(b)[0] === 'id'), true);
  const p = st.projects.find(x => !x.deleted && x.mode !== 'tiers' && (x.kind || 'quote') === 'quote' && x.sections.length >= 3);
  const before = A.buildIndex(st).quotes.find(q => q.id === p.id).bills;
  eq('index ids: third bill starts as Additional Bill B', before[2].label, 'Additional Bill B');
  const thirdId = before[2].id;
  p.sections.splice(1, 1); // delete the quote's second bill (Additional Bill A)
  const after = A.buildIndex(st).quotes.find(q => q.id === p.id).bills;
  const moved = after.find(b => b.id === thirdId);
  eq('index ids: after deleting the second bill, the third keeps its id and becomes Additional Bill A', [after[1].id === thirdId, moved && moved.label], [true, 'Additional Bill A']);
  eq('index ids: schema stays 1', ix.schema, 1);
}

// ---- v1.5.0: one bill heading, page-1 lines converted ----
{
  const st = A.emptyStore();
  const p = A.createProject(st, { name: 'Mayan (Additional)', category: 'Feature Film', client: 'Magic Moon', templateId: 'tpl_film', date: '2026-11-23' });
  p.sections = [A.newSection('Additional Bill D After 10-11-28'), A.newSection(''), A.newSection('Additional Bill F - 25-11-26 - DOP'), A.newSection('Kept title')];
  p.sections[1].summaryDesc = 'Additional Bill E - 23-11-26';
  p.sections[2].summaryDesc = 'Additional Bill F - 25-11-26';
  p.revisions = [{ rev: 0, data: { sections: [{ ...A.clone(p.sections[2]) }] } }];
  st.projects.push(p);
  A.normalizeStore(st);
  eq('heading: page-1 line becomes the heading', p.sections.map((s, i) => A.secTitle(p, i)),
    ['Additional Bill D After 10-11-28', 'Additional Bill E - 23-11-26', 'Additional Bill F - 25-11-26', 'Kept title']);
  eq('heading: old page-1 line cleared', p.sections.every(s => !s.summaryDesc), true);
  eq('heading: saved versions converted too', p.revisions[0].data.sections[0].name, 'Additional Bill F - 25-11-26');
  const again = JSON.stringify(st.projects); A.normalizeStore(st);
  eq('heading: conversion is stable (same result every time, every phone)', JSON.stringify(st.projects), again);
  const m = A.mergeStores({ settings: st.settings, projects: [] }, { settings: st.settings, projects: [{ ...A.clone(p), sections: [{ ...A.clone(p.sections[0]), name: 'x', summaryDesc: 'From an old phone' }] }] });
  eq('heading: a page-1 line arriving from an old phone is converted on merge', m.projects[0].sections[0].name, 'From an old phone');
  const b = A.buildIndex(st).quotes[0].bills;
  eq('index: heading = what the PDF prints; label stays the position', [b[1].heading, b[1].label], ['Additional Bill E - 23-11-26', 'Additional Bill A']);
}

// ---- v1.5.0: project groups and dashboard sort ----
{
  const st = A.emptyStore();
  const mk = (name, date, status, amount) => { const p = A.createProject(st, { name, category: 'Feature Film', client: 'Magic Moon', templateId: 'tpl_film', date }); p.status = status; p.sections = [A.newSection('')]; p.sections[0].lines = [A.newLine('Work', 'lump', '', '', String(amount))]; st.projects.push(p); return p; };
  const a = mk('Mayan', '2026-10-01', 'In Progress', 1082010), b = mk('Mayan (Additional)', '2026-11-23', 'Approved', 100290), c = mk('Other film', '2026-11-01', 'Draft', 50000);
  a.updatedAt = '2026-11-01T00:00:00Z'; b.updatedAt = '2026-11-24T00:00:00Z'; c.updatedAt = '2026-11-20T00:00:00Z';
  a.groupId = a.id; b.groupId = a.id;
  const items = A.dashboardItems(st, () => true, 'updated');
  eq('groups: two quotes show as one project, one single quote', items.map(i => i.group ? 'G:' + i.name + ':' + i.quotes.length : i.lead.name), ['G:Mayan:2', 'Other film']);
  eq('groups: filter on one member still shows the project', A.dashboardItems(st, p => p.status === 'Approved').map(i => i.group ? i.name : i.lead.name), ['Mayan']);
  eq('sort: amount', A.dashboardItems(st, () => true, 'amount').map(i => i.lead.name), ['Mayan', 'Other film']);
  eq('sort: client then name keeps every quote', A.dashboardItems(st, () => true, 'client').length, 2);
  const ix = A.buildIndex(st).quotes;
  eq('index: grouped quotes carry groupId and groupName', ix.filter(q => q.groupId).map(q => [q.project, q.groupName]).sort(), [['Mayan (Additional)', 'Mayan'], ['Mayan', 'Mayan']]);
  eq('index: a lone quote has no group', ix.find(q => q.project === 'Other film').groupId, null);
  b.deleted = true;
  eq('groups: a group with one live quote shows as a single quote', A.dashboardItems(st, () => true).every(i => !i.group), true);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
