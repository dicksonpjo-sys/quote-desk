/* PDF export — monochrome VishwaaFX letterhead (only the logo is in colour). pdf-lib, fully offline.
   Quote layout: page 1 = summary of all bills, page 2+ = cost breakdown of every bill.
   Single-page layout and On-Site Supervision bills are also built here. */
'use strict';

const QuotePDF = (() => {
  const W = 595.28, H = 841.89, ML = 44, MR = 44, CW = W - ML - MR, BOTTOM = 62;
  // ₹ as a vector path (Carlito glyph, 2048 units/em) — the standard PDF fonts have no rupee sign.
  const RUPEE = { upem: 2048, adv: 1038,
    reg: 'M559 -990Q543 -1080 476 -1129Q409 -1178 289 -1178H122V-1314H918V-1183H604Q663 -1149 693 -1100.5Q723 -1052 732 -990H918V-859H730Q713 -762 647 -690Q581 -618 472 -584Q513 -563 544 -520L883 0H720Q674 0 649 -38L351 -505Q337 -527 320 -536.5Q303 -546 269 -546H122V-672H283Q399 -672 467.5 -723Q536 -774 556 -859H120V-990Z',
    bold: 'M489 -1004Q470 -1065 420.5 -1100.5Q371 -1136 288 -1136H122V-1328H917V-1145H648Q686 -1116 707 -1081Q728 -1046 737 -1004H917V-820H736Q717 -742 666 -678.5Q615 -615 534 -577Q566 -563 594 -541Q622 -519 645 -484L902 0H665Q631 0 607.5 -13.5Q584 -27 569 -52L364 -467Q351 -490 334.5 -500.5Q318 -511 286 -511H122V-688H287Q369 -688 416.5 -724Q464 -760 484 -820H121V-1004Z' };

  const { rgb } = PDFLib;
  const INK = rgb(0.08, 0.08, 0.08), MID = rgb(0.4, 0.4, 0.4), SOFT = rgb(0.6, 0.6, 0.6),
    RULE = rgb(0.8, 0.8, 0.8), BAND = rgb(0.95, 0.95, 0.95), WHITE = rgb(1, 1, 1);
  let pdf, F, FB, logo, mono, ctx;

  /* ---------- text ---------- */
  const okChar = new Map();
  function clean(font, s) {
    s = String(s ?? '').replace(/\t/g, ' ').replace(/\r?\n/g, ' ');
    let out = '';
    for (const ch of s) {
      if (ch === '₹') { out += ch; continue; }
      const k = (font === FB ? 'b' : 'r') + ch;
      if (!okChar.has(k)) { try { font.encodeText(ch); okChar.set(k, true); } catch { okChar.set(k, false); } }
      out += okChar.get(k) ? ch : '?';
    }
    return out;
  }
  const rupW = size => RUPEE.adv / RUPEE.upem * size;
  function width(s, size, bold, sp = 0) {
    const font = bold ? FB : F; s = clean(font, s);
    let w = 0; for (const part of s.split('₹')) w += font.widthOfTextAtSize(part, size);
    w += (s.split('₹').length - 1) * rupW(size);
    return w + (sp ? sp * Math.max(0, [...s].length - 1) : 0);
  }
  /* Draw text; ₹ anywhere; sp = letter spacing (used for small caps labels). */
  function txt(page, s, x, y, { size = 9, bold = false, color = INK, align = 'left', sp = 0, underline = false } = {}) {
    const font = bold ? FB : F; s = clean(font, s);
    const w = width(s, size, bold, sp);
    if (align === 'center') x -= w / 2; else if (align === 'right') x -= w;
    const x0 = x;
    if (sp) {
      for (const ch of s) {
        if (ch === '₹') { page.drawSvgPath(bold ? RUPEE.bold : RUPEE.reg, { x, y, scale: size / RUPEE.upem, color }); x += rupW(size) + sp; continue; }
        page.drawText(ch, { x, y, size, font, color }); x += font.widthOfTextAtSize(ch, size) + sp;
      }
    } else {
      s.split('₹').forEach((part, i) => {
        if (i > 0) { page.drawSvgPath(bold ? RUPEE.bold : RUPEE.reg, { x, y, scale: size / RUPEE.upem, color }); x += rupW(size); }
        if (part) { page.drawText(part, { x, y, size, font, color }); x += font.widthOfTextAtSize(part, size); }
      });
    }
    if (underline) page.drawLine({ start: { x: x0, y: y - 1.5 }, end: { x: x0 + w, y: y - 1.5 }, thickness: 0.4, color });
    return w;
  }
  const label = (page, s, x, y, o = {}) => txt(page, String(s).toUpperCase(), x, y, { size: 6.5, bold: true, color: MID, sp: 0.9, ...o });
  function wrap(s, size, bold, maxW) {
    const words = String(s ?? '').split(/\s+/).filter(Boolean); const lines = []; let cur = '';
    for (let w of words) {
      while (width(w, size, bold) > maxW && w.length > 1) {
        let i = w.length; while (i > 1 && width(w.slice(0, i), size, bold) > maxW) i--;
        if (cur) { lines.push(cur); cur = ''; } lines.push(w.slice(0, i)); w = w.slice(i);
      }
      const t = cur ? cur + ' ' + w : w;
      if (width(t, size, bold) <= maxW) cur = t; else { if (cur) lines.push(cur); cur = w; }
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  }
  const money = n => '₹ ' + inr(n);
  const hline = (page, y, x1 = ML, x2 = W - MR, t = 0.5, color = RULE) => page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: t, color });
  const cur = () => ctx.pages[ctx.pages.length - 1];

  /* ---------- page furniture ---------- */
  function letterhead(page) {
    const c = ctx.s.company;
    let lh = 0;
    if (logo) { const lw = 150; lh = lw * logo.height / logo.width; page.drawImage(logo, { x: ML, y: H - 38 - lh, width: lw, height: lh }); }
    let y = H - 46; const xr = W - MR;
    txt(page, c.name, xr, y, { size: 10.5, bold: true, align: 'right', sp: 0.6 }); y -= 10;
    txt(page, c.sub, xr, y, { size: 6, color: MID, align: 'right', sp: 1.4 }); y -= 11;
    txt(page, c.address1, xr, y, { size: 7, color: MID, align: 'right' }); y -= 9;
    txt(page, c.address2, xr, y, { size: 7, color: MID, align: 'right' }); y -= 9;
    txt(page, `${c.email}   ·   ${c.mobile}`, xr, y, { size: 7, color: MID, align: 'right' });
    const ry = Math.min(H - 38 - lh, y) - 12;
    hline(page, ry, ML, W - MR, 1.1, INK);
    return ry;
  }
  function watermark(page) {
    const img = mono || logo; if (!img) return;
    const ww = 330, hh = ww * img.height / img.width;
    page.drawImage(img, { x: (W - ww) / 2, y: H * 0.38 - hh / 2, width: ww, height: hh, opacity: 0.05 });
  }
  /* kind: {title, sub, full} — full = title block + meta + client band */
  function newPage(kind, cont = false) {
    const page = pdf.addPage([W, H]); ctx.pages.push(page);
    watermark(page);
    let y = letterhead(page) - 30;
    const p = ctx.p;
    if (cont) {
      txt(page, kind.title, ML, y + 6, { size: 11, bold: true, sp: 1.6 });
      txt(page, 'continued', ML + width(kind.title, 11, true, 1.6) + 8, y + 6, { size: 8, color: SOFT });
      ctx.y = y - 14; return page;
    }
    // Title + document number block
    txt(page, kind.title, ML, y, { size: 20, bold: true, sp: 2.2 });
    if (kind.sub) txt(page, kind.sub, ML, y - 14, { size: 6.8, bold: true, color: MID, sp: 1.6 });
    const meta = kind.meta || [];
    let my = y + 8;
    meta.forEach(([k, v]) => {
      label(page, k, W - MR - 165, my);
      txt(page, v, W - MR, my, { size: 9, bold: true, align: 'right' }); my -= 13;
    });
    y = Math.min(y - 24, my - 6);
    // Client band
    const cells = [];
    if (String(p.client || '').trim()) cells.push([p.clientLabel || 'Production', p.client]);
    cells.push([p.projectLabel || 'Project', p.name]);
    if (kind.extra) cells.push(kind.extra);
    const bh = 36; page.drawRectangle({ x: ML, y: y - bh, width: CW, height: bh, color: BAND });
    const cw = CW / cells.length;
    cells.forEach(([k, v], i) => {
      const x = ML + 12 + i * cw;
      label(page, k, x, y - 13);
      const vv = wrap(v, 9.5, true, cw - 20)[0];
      txt(page, vv, x, y - 26, { size: 9.5, bold: true });
    });
    ctx.y = y - bh - 22;
    return page;
  }
  function footer() {
    const n = ctx.pages.length; const c = ctx.s.company;
    ctx.pages.forEach((pg, i) => {
      hline(pg, 40, ML, W - MR, 0.4, RULE);
      txt(pg, `${c.name}   ·   ${c.email}   ·   ${c.mobile}`, ML, 28, { size: 6.6, color: SOFT });
      txt(pg, `${ctx.no}   ·   Page ${i + 1} of ${n}`, W - MR, 28, { size: 6.6, color: SOFT, align: 'right' });
    });
  }
  function ensure(h, kind) { if (ctx.y - h < BOTTOM) { newPage(kind, true); return true; } return false; }

  /* ---------- tables ---------- */
  /* cols: [{w, align, head}] (one w=null flexes). rows: {cells:[{t, align, bold, color, pay}], strong, total} */
  function table(cols, rows, kind) {
    const flex = CW - cols.reduce((a, c) => a + (c.w || 0), 0);
    const ws = cols.map(c => c.w || flex);
    const xs = ws.map((_, i) => ML + ws.slice(0, i).reduce((a, b) => a + b, 0));
    const size = 8.4, lh = 10.6, pad = 6;
    const head = () => {
      const hh = 20; ensure(hh + 18, kind);
      const page = cur(); page.drawRectangle({ x: ML, y: ctx.y - hh, width: CW, height: hh, color: INK });
      cols.forEach((c, i) => {
        const a = c.align || 'left'; const x = a === 'right' ? xs[i] + ws[i] - pad : a === 'center' ? xs[i] + ws[i] / 2 : xs[i] + pad;
        txt(page, c.head.toUpperCase(), x, ctx.y - 13, { size: 6.4, bold: true, color: WHITE, sp: 0.8, align: a });
      });
      ctx.y -= hh;
    };
    head();
    for (const row of rows) {
      const cells = row.cells.map((c, i) => ({ ...c, lines: wrap(c.t, size, c.bold || row.strong, ws[i] - pad * 2) }));
      const h = Math.max(18, ...cells.map(c => c.lines.length * lh + 7.5));
      if (ensure(h, kind)) head();
      const page = cur(); const top = ctx.y;
      if (row.total) hline(page, top, ML, W - MR, 0.9, INK);
      cells.forEach((c, i) => {
        const a = c.align || cols[i].align || 'left';
        const x = a === 'right' ? xs[i] + ws[i] - pad : a === 'center' ? xs[i] + ws[i] / 2 : xs[i] + pad;
        if (c.pay) { payMark(page, c.pay, xs[i] + pad, top - h / 2); return; }
        let yy = top - (h - c.lines.length * lh) / 2 - lh + 3;
        for (const ln of c.lines) { txt(page, ln, x, yy, { size, bold: c.bold || row.strong, color: c.color || INK, align: a }); yy -= lh; }
      });
      ctx.y -= h;
      if (!row.total) hline(page, ctx.y, ML, W - MR, 0.45, RULE);
    }
  }
  function payMark(page, status, x, cy) {
    const r = 3.2;
    if (status === 'Paid') page.drawCircle({ x: x + r, y: cy, size: r, color: INK });
    else if (status === 'Partial') { page.drawCircle({ x: x + r, y: cy, size: r, borderColor: INK, borderWidth: 0.8 }); page.drawRectangle({ x, y: cy - r, width: r, height: r * 2, color: INK }); }
    else page.drawCircle({ x: x + r, y: cy, size: r, borderColor: MID, borderWidth: 0.8 });
    txt(page, status, x + r * 2 + 6, cy - 3, { size: 8, bold: status === 'Paid', color: status === 'Pending' ? MID : INK });
  }
  /* right-aligned summary rows + black total bar */
  function totals(rows, total, kind, note) {
    const bw = 236, x = W - MR - bw;
    ensure(rows.length * 16 + 50, kind);
    ctx.y -= 6;
    for (const [k, v, strong] of rows) {
      ctx.y -= 15;
      txt(cur(), k, x + 10, ctx.y, { size: 8.2, color: strong ? INK : MID, bold: !!strong });
      txt(cur(), v, W - MR - 10, ctx.y, { size: 8.4, bold: !!strong, align: 'right' });
    }
    if (total !== null && total !== undefined) {
      ctx.y -= 10; const bh = 26;
      cur().drawRectangle({ x, y: ctx.y - bh, width: bw, height: bh, color: INK });
      txt(cur(), 'TOTAL', x + 10, ctx.y - 16.5, { size: 7.5, bold: true, color: WHITE, sp: 1.6 });
      txt(cur(), money(total), W - MR - 10, ctx.y - 17.5, { size: 12, bold: true, color: WHITE, align: 'right' });
      ctx.y -= bh;
    }
    if (note) { ctx.y -= 12; txt(cur(), note, W - MR, ctx.y, { size: 6.8, color: MID, align: 'right' }); }
  }

  /* ---------- notes, bank, signature ---------- */
  function blocks(list, kind) {
    for (const b of list) {
      if (b.style === 'bank') { bank(kind); continue; }
      const items = (b.items || []).filter(t => String(t).trim());
      if (!items.length) continue;
      ensure(40, kind); ctx.y -= 20;
      if (b.heading) {
        label(cur(), b.heading.replace(/:$/, ''), ML, ctx.y, { color: INK, size: 6.8 });
        hline(cur(), ctx.y - 5, ML, ML + 22, 0.9, INK); ctx.y -= 17;
      }
      items.forEach((it, i) => {
        const pre = b.style === 'numbered' ? pad2(i + 1) : b.style === 'bullets' ? '–' : '';
        const ind = pre ? 18 : 0;
        const lines = wrap(it, 7.8, false, CW - ind);
        ensure(lines.length * 10.4 + 3, kind);
        if (pre) txt(cur(), pre, ML, ctx.y, { size: 7.4, bold: true, color: SOFT });
        lines.forEach(l => { txt(cur(), l, ML + ind, ctx.y, { size: 7.8, color: INK }); ctx.y -= 10.4; });
        ctx.y -= b.style === 'numbered' ? 3.5 : 1.5;
      });
    }
  }
  function bank(kind) {
    const b = bankOf(ctx.store, ctx.p); if (!b || !b.accNo) return;
    const rows = [['Account name', b.accName], ['Bank', b.bank + (b.branch ? ', ' + b.branch : '')], ['Account no.', b.accNo], ['IFSC', b.ifsc]];
    if (b.mobile) rows.push(['Mobile', b.mobile]);
    const h = rows.length * 12.5 + 30; ensure(h + 22, kind); ctx.y -= 22;
    const page = cur(); const bw = 260;
    page.drawRectangle({ x: ML, y: ctx.y - h, width: bw, height: h, borderColor: INK, borderWidth: 0.7 });
    label(page, 'Account details', ML + 12, ctx.y - 15, { color: INK });
    let y = ctx.y - 31;
    rows.forEach(([k, v]) => { txt(page, k, ML + 12, y, { size: 7.4, color: MID }); txt(page, v, ML + 82, y, { size: 8, bold: true }); y -= 12.5; });
    ctx.y -= h;
  }
  function signature(kind) {
    if (ctx.p.pdf?.showSignature === false) return;
    const sg = ctx.s.signatories.find(x => x.id === ctx.p.signatoryId) || ctx.s.signatories[0];
    ensure(92, kind); ctx.y -= 30;
    const page = cur(); let y = ctx.y;
    txt(page, 'Yours sincerely,', ML, y, { size: 8.2, color: MID }); y -= 34;
    hline(page, y + 10, ML, ML + 150, 0.6, INK);
    if (sg) {
      txt(page, sg.name, ML, y, { size: 9, bold: true }); y -= 11;
      txt(page, `${sg.title}, ${ctx.s.company.name}`, ML, y, { size: 7.6, color: MID }); y -= 10;
      if (sg.phone) { txt(page, 'Ph: ' + sg.phone, ML, y, { size: 7.6, color: MID }); y -= 10; }
    }
    ctx.y = y;
  }

  /* ---------- images ---------- */
  async function embedAny(src) {
    let bytes;
    if (src.startsWith('data:')) bytes = Uint8Array.from(atob(src.split(',')[1]), c => c.charCodeAt(0));
    else bytes = new Uint8Array(await (await fetch(src)).arrayBuffer());
    return src.startsWith('data:image/jp') ? pdf.embedJpg(bytes) : pdf.embedPng(bytes);
  }
  async function loadImages(s) {
    try { logo = await embedAny(s.logo || 'logo.png'); } catch (e) { console.warn('logo', e); logo = null; }
    try { mono = await embedAny(s.logo ? (s.logoMono || s.logo) : 'logo_mono.png'); } catch { mono = null; }
  }

  /* ---------- breakdown of one bill ---------- */
  function billBreakdown(p, sec, i, kind) {
    const showMin = p.pdf?.showMinutes !== false;
    ensure(96, kind); ctx.y -= 6;
    const page = cur();
    const lbl = secLabel(p, i).toUpperCase();
    txt(page, lbl, ML, ctx.y, { size: 9, bold: true, sp: 1.2 });
    const lw = width(lbl, 9, true, 1.2);
    if (p.mode !== 'tiers' && sec.name?.trim()) txt(page, sec.name.trim(), ML + lw + 10, ctx.y, { size: 9, color: MID });
    txt(page, money(secNet(sec)), W - MR, ctx.y, { size: 9.5, bold: true, align: 'right' });
    if (sec.subtitle) { ctx.y -= 12; txt(page, sec.subtitle, ML, ctx.y, { size: 7.6, color: MID }); }
    ctx.y -= 10;
    const cols = [{ w: 26, head: '#', align: 'center' }, { w: null, head: 'Description' }, { w: 52, head: 'Seconds', align: 'right' }];
    if (showMin) cols.push({ w: 50, head: 'Min:Sec', align: 'right' });
    cols.push({ w: 66, head: 'Rate / sec', align: 'right' }, { w: 84, head: 'Amount', align: 'right' });
    const rows = sec.lines.map((l, j) => {
      const r = l.type === 'rate'; const a = lineAmount(l);
      const c = [{ t: String(j + 1), color: SOFT }, { t: l.desc }, { t: r && num(l.sec) ? String(num(l.sec)) : '' }];
      if (showMin) c.push({ t: r && num(l.sec) ? mmss(l.sec) : '', color: MID });
      c.push({ t: r && num(l.rate) ? money(l.rate) : '', color: MID }, { t: a ? money(a) : '–' });
      return { cells: c };
    });
    const d = secDuration(sec);
    const tot = [{ t: '' }, { t: 'Total' }, { t: d ? String(d) : '' }];
    if (showMin) tot.push({ t: d ? mmss(d) : '' });
    tot.push({ t: '' }, { t: money(secGross(sec)) });
    rows.push({ cells: tot, strong: true, total: true });
    table(cols, rows, kind);
    if (secDiscount(sec) !== 0) {
      const lblD = sec.discountType === 'percent' ? `Discount ${num(sec.discount)}%` : 'Discount';
      ctx.y -= 2;
      [[lblD, '– ' + money(secDiscount(sec)), false], ['After discount', money(secNet(sec)), true]].forEach(([k, v, st]) => {
        ctx.y -= 14; txt(cur(), k, W - MR - 236 + 10, ctx.y, { size: 8.2, color: st ? INK : MID, bold: st });
        txt(cur(), v, W - MR - 6, ctx.y, { size: 8.4, bold: st, align: 'right' });
      });
    }
    ctx.y -= 26;
  }

  /* ---------- main ---------- */
  async function build(store, p, opts = {}) {
    pdf = await PDFLib.PDFDocument.create();
    F = await pdf.embedFont(PDFLib.StandardFonts.Helvetica);
    FB = await pdf.embedFont(PDFLib.StandardFonts.HelveticaBold);
    okChar.clear();
    const s = store.settings;
    ctx = { store, s, p, pages: [], y: 0, no: quoteNo(store, p) };
    await loadImages(s);
    pdf.setTitle(`${ctx.no} ${p.name}`); pdf.setAuthor(s.company.name); pdf.setCreator('VishwaaFX Quote Desk');

    const o = p.pdf || {};
    const sup = kindOf(p) === 'supervision';
    const meta = [[sup ? 'Bill no.' : 'Quote no.', ctx.no], ['Date', fmtDate(p.date)]];
    if (!sup) meta.push(['Valid till', fmtDate(validTill(p))]);
    const main = { title: o.title || (sup ? 'ON-SITE SUPERVISION' : 'QUOTATION'), sub: o.copyLabel || '', meta };
    const byPlace = pl => (p.blocks || []).filter(b => b.placement === pl);
    const gst = o.showGst !== false ? (o.gstText || 'GST if applicable @ 18%, not included') : '';
    newPage(main);

    if (sup) {
      const rows = p.sections[0].lines.slice().sort((a, b) => String(a.date || '').localeCompare(String(b.date || ''))).map((l, j) => ({ cells: [{ t: String(j + 1), color: SOFT }, { t: fmtDate(l.date), color: MID }, { t: l.desc }, { t: money(lineAmount(l)) }] }));
      table([{ w: 26, head: '#', align: 'center' }, { w: 82, head: 'Date' }, { w: null, head: 'Description' }, { w: 100, head: 'Amount', align: 'right' }], rows, main);
      const sec = p.sections[0];
      totals(secDiscount(sec) ? [['Subtotal', money(secGross(sec))], ['Discount', '– ' + money(secDiscount(sec))]] : [], secNet(sec), main, gst);
      blocks([...byPlace('quote'), ...byPlace('breakdown'), ...byPlace('end')], main);
      signature(main);
    } else if (p.singlePage) {
      const rows = []; let n = 0;
      p.sections.forEach((sec, i) => sec.lines.forEach(l => {
        const r = l.type === 'rate' && num(l.sec);
        rows.push({ cells: [{ t: String(++n), color: SOFT }, { t: l.desc + (r ? `  (${num(l.sec)} sec × ${money(l.rate)})` : '') }, { t: lineAmount(l) ? money(lineAmount(l)) : '–' }] });
      }));
      table([{ w: 26, head: '#', align: 'center' }, { w: null, head: 'Description' }, { w: 110, head: 'Amount', align: 'right' }], rows, main);
      const gross = p.sections.reduce((a, x) => a + secGross(x), 0), net = p.sections.reduce((a, x) => a + secNet(x), 0);
      totals(gross !== net ? [['Subtotal', money(gross)], ['Discount', '– ' + money(gross - net)]] : [], net, main, gst);
      blocks([...byPlace('quote'), ...byPlace('breakdown'), ...byPlace('end')], main);
      signature(main);
    } else {
      // Page 1 — summary of every bill
      const tiers = p.mode === 'tiers'; const showPay = !tiers && o.showPayment;
      const cols = [{ w: 26, head: '#', align: 'center' }, { w: null, head: tiers ? 'Option' : 'Bill' }];
      if (showPay) cols.push({ w: 86, head: 'Payment' });
      cols.push({ w: 110, head: 'Amount', align: 'right' });
      const rows = p.sections.map((sec, i) => {
        const d = sec.summaryDesc || secTitle(p, i);
        const c = [{ t: String(i + 1), color: SOFT }, { t: d }];
        if (showPay) c.push({ pay: sec.pay?.status || 'Pending' });
        c.push({ t: money(secNet(sec)) });
        return { cells: c };
      });
      table(cols, rows, main);
      if (tiers) {
        ctx.y -= 14; txt(cur(), 'Each option is priced separately. Please confirm the option you choose.', W - MR, ctx.y, { size: 7.4, color: MID, align: 'right' });
        if (gst) { ctx.y -= 11; txt(cur(), gst, W - MR, ctx.y, { size: 6.8, color: MID, align: 'right' }); }
      } else {
        const total = p.sections.reduce((a, x) => a + secNet(x), 0);
        const rec = projectReceived(p);
        const extra = showPay && rec ? [['Received', money(rec)], ['Balance due', money(total - rec), true]] : [];
        totals([], total, main, gst);
        if (extra.length) { ctx.y -= 2; extra.forEach(([k, v, st]) => { ctx.y -= 14; txt(cur(), k, W - MR - 226, ctx.y, { size: 8.2, color: st ? INK : MID, bold: !!st }); txt(cur(), v, W - MR - 10, ctx.y, { size: 8.4, bold: !!st, align: 'right' }); }); }
      }
      blocks(byPlace('quote'), main);
      signature(main);

      // Page 2+ — cost breakdown of every bill, one after another
      const bk = { title: 'COST BREAKDOWN', sub: tiers ? 'QUALITY OPTIONS' : `${p.sections.length} ${p.sections.length === 1 ? 'BILL' : 'BILLS'}`, meta };
      newPage(bk);
      p.sections.forEach((sec, i) => billBreakdown(p, sec, i, bk));
      blocks(byPlace('breakdown'), bk);
      blocks(byPlace('end'), bk);
    }

    // Keep only the pages the user picked, then number them.
    if (Array.isArray(opts.pages) && opts.pages.length) {
      const keep = new Set(opts.pages);
      for (let i = ctx.pages.length - 1; i >= 0; i--) if (!keep.has(i)) { pdf.removePage(i); ctx.pages.splice(i, 1); }
    }
    footer();
    return pdf.save();
  }

  function fileName(store, p) {
    return `${quoteNo(store, p).replace(/\//g, '-')} ${p.name}`.replace(/[\\/:*?"<>|]+/g, ' ').trim() + '.pdf';
  }
  function folderName(store, p) {
    return `${quoteNo(store, p, false).replace(/\//g, '-')} ${p.name}`.replace(/[\\/:*?"<>|]+/g, ' ').trim();
  }
  return { build, fileName, folderName };
})();
