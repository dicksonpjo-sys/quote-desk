/* Sample projects rebuilt from the three existing quotations (loaded on demand). */
'use strict';

function sampleProjects(store) {
  const L = (d, sec, rate) => newLine(d, 'rate', sec, rate);
  const S = (d, amt) => newLine(d, 'lump', '', '', amt);
  const sec = (name, lines, extra = {}) => ({ ...newSection(name), lines, ...extra });
  const paid = { status: 'Paid', received: '', date: '' };
  const out = [];

  // 1. 40 Days of House Party — single page credits
  let p = createProject(store, { name: '40 Days of House Party', category: 'Feature Film', client: '', templateId: 'tpl_credits', date: '2026-09-05' });
  p.sections = [sec('', [S('40 Days of House Party Credits', 118000)], { discountType: 'amount', discount: 20000 })];
  p.status = 'Sent';
  out.push(p); store.projects.push(p);

  // 2. Law and Order — initial quote + batches with payment status
  p = createProject(store, { name: 'Law and Order', category: 'Feature Film', client: 'Satyam Cinemas and Mahasubair Moviekshetra', templateId: 'tpl_film', date: '2026-09-15' });
  p.sections = [
    sec('', [L('2D Compositing', 460, 1100), L('Cleanup', 377, 800), L('Chroma Comp', 93, 1300),
      L('3D (Crash Enhancement)', 4, 2500), L('Crowd Multiplication', 21, 3800), S('All Film Credits & Interval Card', 90000)],
      { discountType: 'final', discount: 900000, pay: { ...paid } }),
    sec('Trailer & Teaser', [L('Trailer_Cleanups_Comps_MFG', 21, 1000), L('Teaser_Cleanups_Comps_MFG', 32, 1000),
      L('Teaser Main Title & End Card', 9, 2300), L('Song - Crowd Multiplication', 21, 4500)],
      { discountType: 'final', discount: 100000, pay: { ...paid } }),
    sec('IPS to KPS & additional shots', [L('Change IPS to KPS', 50, 1750),
      L('Addl Shots RL03_SH86A, B, C, RL04_SH88A, RL05_SH139A, RL07_SH261A, 283A', 19, 800), L('RL03_86A_Ai Gen', 9, 1800)],
      { discountType: 'final', discount: 110000, pay: { ...paid } }),
    sec('Reel 06 shots', [L('RL06_174, 176, 200, 213', 10, 1000)], { pay: { ...paid } }),
    sec('Reels 02, 05, 06, 07 shots', [L('RL02_SH_45D, 80A, 80B, 80C, 80D, 80E, 80F, 80G', 46, 1000),
      L('RL05_SH_124B, RL06_SH_182B, 191B, 202B', 22, 1000), L('RL07_SH_251', 2, 1800), L('RL07_SH_261, 293, 307, 308', 15, 800)],
      { pay: { ...paid } }),
    sec('Crowd Enhancement', [L('Model and Texturing', 21, 1950), L('Animation', 21, 1000), L('3D Compositing', 21, 1200),
      L('Roto', 21, 1000), L('Match Move', 21, 900)], { durMode: 'max', pay: { ...paid } }),
    sec('Comp, cleanups & neck blood', [L('Comp', 5, 1200), L('Cleanups', 16, 1000), L('Neck Blood Seq Addons', 10, 2600)]),
    sec('Skin Retouch', [L('Skin Retouch', 15, 1000)])
  ];
  p.status = 'In Progress'; p.pdf.showPayment = true;
  out.push(p); store.projects.push(p);

  // 3. Moshi Moshi — ad film, two quality options
  p = createProject(store, { name: 'Satellite – 3 Videos', category: 'Ad Film', client: 'Moshi Moshi Communications Pvt Ltd', templateId: 'tpl_ad', date: '2026-09-23' });
  const adLines = (anim, comp, edit1, edit2, sfx, bgm) => [
    S('3D Modelling – client provided', 0),
    L('3D Animation, Lighting and Rendering', 60, anim), L('3D Compositing and Motion Graphics', 60, comp),
    S('Video Edit – Intro – Master (60 sec)', edit1), S('Video Edit – Features Explainer (40 sec)', edit2),
    S('Video Edit – Trailer (20 sec)', 10000), S('Sound Effects', sfx), S('Background Music – Standard Licence', bgm)];
  p.sections = [
    sec('Premium Quality', adLines(2400, 1900, 25000, 20000, 15000, 8000), { summaryDesc: '3D Premium Quality – 03 Videos', durMode: 'max' }),
    sec('Standard Quality', adLines(1300, 900, 20000, 15000, 5000, 5000), { summaryDesc: '3D Standard Quality – 03 Videos', durMode: 'max' })
  ];
  p.status = 'Sent';
  out.push(p); store.projects.push(p);
  // 4. Mayan — on-site supervision bill
  p = createProject(store, { name: 'Mayan', category: 'Feature Film', client: '', templateId: 'tpl_sup', date: '2026-10-01' });
  const D = (date, d, amt) => newLine(d, 'lump', '', '', amt, date);
  p.sections[0].lines = [D('2026-09-29', 'Food', 850), D('2026-09-30', 'VFX Supervision', 5000), D('2026-09-30', 'Fuel', 2500), D('2026-10-01', 'VFX Supervision', 5000)];
  p.status = 'Sent';
  out.push(p); store.projects.push(p);

  // Fixed ids and old timestamps: two devices that both load the starter projects
  // will not create duplicates, and any real edit always wins a sync.
  ['sample_40days', 'sample_law_order', 'sample_moshi', 'sample_mayan'].forEach((id, i) => {
    out[i].id = id; out[i].createdAt = out[i].updatedAt = '2026-01-01T00:00:0' + i + '.000Z'; out[i].sample = true;
  });
  return out;
}
