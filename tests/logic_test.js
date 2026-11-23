/* Logic checks for js/data.js: money format, financial year, numbering, totals, discounts,
   screen time, payments, merge. Run: node tests/logic_test.js  (no installs needed) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console, localStorage: { getItem: () => null, setItem: () => {} } };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8') +
  '\n;this.api = { inr, fyOf, addDays, billLetter, secLabel, secTitle, createProject, nextSeq, quoteNo, secGross, secNet, secDiscount, secDuration, sameDurWarning, projectValue, projectReceived, projectPending, mergeStores, emptyStore, newLine, newSection, validTill, mmss };', ctx);
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
eq('label A with title', A.secTitle(pb, 1), 'Additional Bill A – Trailer & Teaser');
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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
