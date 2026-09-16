/* billing-receipt.js — NockERP Receipt splitting (LOGIC-SPEC-04)
   1 Invoice → หลาย Receipt · แตกตาม line item (ไม่ใช่ตามการจ่าย)
   track per-line receipted/remaining · 1 line ลงได้ ≤1 receipt · Σ(receipt)=invoice
   Auto = ใบเดียวครบทุก line · Manual = เลือก line แตก · RE reflect INV + /n
   ออกได้หลัง Paid เท่านั้น (ยืนยันเงินเข้า KBiz · T+1) */
(function () {

  const B = () => window.Billing;
  const gv = id => (document.getElementById(id)?.value || '').trim();
  const linesOf = inv => Utils.invoiceLines(inv);
  const receipts = inv => (inv.receipts = inv.receipts || []);
  const isCourse = l => !l.fee;                       // course line = ไม่ใช่ fee (Book/Bus/Exam)

  const coveredSet = inv => { const s = new Set(); receipts(inv).forEach(r => r.lineIdxs.forEach(i => s.add(i))); return s; };
  const remainingIdx = inv => { const c = coveredSet(inv); return linesOf(inv).map((_, i) => i).filter(i => !c.has(i)); };
  const amtOf = (inv, idxs) => { const L = linesOf(inv); return idxs.reduce((n, i) => n + (L[i]?.amount || 0), 0); };
  const totalAmt = inv => amtOf(inv, linesOf(inv).map((_, i) => i));
  const canReceipt = inv => inv.status === 'paid' || inv.status === 'confirmed';

  /* discount ผูกกับใบที่มี course line ใบแรก (กัน discount ซ้ำ · Σ ยังเป๊ะ) */
  function discountFor(inv, r) {
    if (!inv.discount || !r.ownsDiscount) return null;
    return inv.discount;
  }
  function receiptTotal(inv, r) {
    return amtOf(inv, r.lineIdxs) - (discountFor(inv, r) ? (inv.discount.amount || 0) : 0);
  }
  const someoneOwnsDiscount = inv => receipts(inv).some(r => r.ownsDiscount);

  function nextReNo(inv) {
    const n = receipts(inv).length;
    return n === 0 ? `RE${inv.refNo}` : `RE${inv.refNo}/${n + 1}`;
  }

  /* ══════════════ RECEIPT TAB PANEL ══════════════ */
  window.receiptPanel = function (inv) {
    if (!canReceipt(inv)) {
      return `<div style="text-align:center;padding:32px 16px">
        ${UI.icon('lock_clock', 'lg')}
        <div style="font-weight:600;margin-top:8px">ยังออกใบเสร็จไม่ได้</div>
        <div class="text-muted" style="font-size:var(--fs-body-sm);max-width:340px;margin:6px auto 0">
          ออก Receipt ได้หลังยืนยันเงินเข้าจริงใน KBiz (สถานะ Paid) เท่านั้น · KBiz เห็นรายการ T+1 จึงออกวันเดียวกับที่จ่ายไม่ได้</div>
      </div>`;
    }
    const L = linesOf(inv), rs = receipts(inv);
    const cov = coveredSet(inv);
    const remain = remainingIdx(inv);
    const total = totalAmt(inv);
    const coveredAmt = amtOf(inv, [...cov]);
    const pct = total ? Math.round(coveredAmt / total * 100) : 0;
    const full = remain.length === 0 && rs.length > 0;

    const covRow = `
      <div style="background:var(--md-surface-low,#f5f6fa);border-radius:10px;padding:12px 14px;margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <b style="font-size:var(--fs-body-sm)">Coverage — line ที่ออกใบเสร็จแล้ว</b>
          <span class="text-muted" style="font-size:var(--fs-body-sm)">${L.length - remain.length}/${L.length} line · ${pct}%</span>
        </div>
        <div style="height:8px;background:var(--md-outline-variant);border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:${full ? 'var(--md-success,#10b981)' : 'var(--md-primary,#6366f1)'};transition:width .4s"></div>
        </div>
        ${full ? `<div class="text-success" style="font-size:var(--fs-body-sm);margin-top:8px">
          ${UI.icon('verified', 'sm')} ครบแล้ว · Σ(receipt) = ยอด invoice (${Utils.currency(total)})</div>` : ''}
      </div>`;

    const rcpList = rs.length ? rs.map((r, ri) => `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--md-outline-variant);border-radius:8px;margin-bottom:8px">
        <div style="width:32px;height:32px;border-radius:8px;background:#f0fdf4;color:#10b981;display:flex;align-items:center;justify-content:center">${UI.icon('receipt', 'sm')}</div>
        <div style="flex:1">
          <div style="font-weight:700;font-size:var(--fs-body-sm)">${r.reNo}</div>
          <div class="text-muted" style="font-size:11px">${r.lineIdxs.length} line · ${r.date}${r.tax?.name ? ' · ' + r.tax.name : ''}</div>
        </div>
        <div style="font-weight:700;font-size:var(--fs-body-sm)">${Utils.currency(receiptTotal(inv, r))}</div>
        <button class="btn btn-secondary btn-sm" onclick="rcpView('${inv.id}',${ri})">${UI.icon('visibility', 'sm')} ดู</button>
      </div>`).join('') : `<div class="text-muted" style="font-size:var(--fs-body-sm);padding:8px 0">ยังไม่มีใบเสร็จ</div>`;

    const remainList = remain.length ? `
      <div class="text-muted" style="font-size:var(--fs-body-sm);margin:10px 0 6px">Line ที่ยังไม่ออกใบเสร็จ (${Utils.currency(amtOf(inv, remain))})</div>
      ${remain.map(i => `<div style="display:flex;justify-content:space-between;font-size:var(--fs-body-sm);padding:4px 0">
        <span>${L[i].desc}</span><span>${Utils.currency(L[i].amount || 0)}</span></div>`).join('')}` : '';

    const actions = full ? '' : `
      <div style="display:flex;gap:8px;margin-top:14px">
        ${rs.length === 0 ? `<button class="btn btn-secondary btn-sm" onclick="rcpAuto('${inv.id}')">${UI.icon('bolt', 'sm')} Auto — ออกใบเดียวครบ</button>` : ''}
        <button class="btn btn-primary btn-sm" onclick="rcpCreateModal('${inv.id}')">${UI.icon('call_split', 'sm')} แตกใบเสร็จ (เลือก line)</button>
      </div>`;

    return `<div style="max-width:560px;margin:0 auto">
      ${covRow}
      <div class="section-title" style="font-size:var(--fs-body-sm)">ใบเสร็จของ ${inv.refNo}</div>
      ${rcpList}${remainList}${actions}</div>`;
  };

  window.rcpRefresh = function (id) {
    const inv = B().inv(id); if (!inv) return;
    const el = document.getElementById('doc-content-rcp');
    if (el) el.innerHTML = window.receiptPanel(inv);
    B().refresh();
  };

  /* ══════════════ CREATE ══════════════ */
  function pushReceipt(inv, idxs, tax) {
    if (!idxs.length) return null;
    const ownsDiscount = !someoneOwnsDiscount(inv) && idxs.some(i => isCourse(linesOf(inv)[i]));
    const r = { reNo: nextReNo(inv), lineIdxs: idxs.slice(), tax: tax || null, date: new Date().toISOString().slice(0, 10), ownsDiscount };
    receipts(inv).push(r);
    return r;
  }

  window.rcpAuto = function (id) {
    const inv = B().inv(id); if (!inv) return;
    const r = pushReceipt(inv, remainingIdx(inv));
    rcpRefresh(id);
    if (r) showToast(`ออกใบเสร็จ ${r.reNo} ครบทุก line ✓`, 'success');
  };

  window.rcpCreateModal = function (id) {
    const inv = B().inv(id); if (!inv) return;
    const L = linesOf(inv), cov = coveredSet(inv);
    const rows = L.map((l, i) => {
      const done = cov.has(i);
      const doneRe = done ? receipts(inv).find(r => r.lineIdxs.includes(i))?.reNo : '';
      return `<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--md-outline-variant);border-radius:8px;margin-bottom:8px;${done ? 'opacity:.55' : 'cursor:pointer'}">
        <input type="checkbox" class="rcp-line" value="${i}" ${done ? 'disabled' : ''} onchange="rcpCalc('${id}')" style="accent-color:var(--md-primary)">
        <div style="flex:1"><div style="font-weight:600;font-size:var(--fs-body-sm)">${l.desc}</div>
          ${done ? `<div class="text-muted" style="font-size:11px">ออกแล้วใน ${doneRe}</div>` : ''}</div>
        <div style="font-weight:700;font-size:var(--fs-body-sm)">${Utils.currency(l.amount || 0)}</div>
      </label>`;
    }).join('');

    Modal.create('modal-rcp-create',
      `${UI.icon('call_split', 'sm')} แตกใบเสร็จ — ${inv.refNo}`,
      `<div class="text-muted" style="font-size:var(--fs-body-sm);margin-bottom:12px">
        เลือก line ที่จะออกใบนี้ · line ที่ออกแล้วเลือกซ้ำไม่ได้ · เลขที่ใบถัดไป: <b>${nextReNo(inv)}</b></div>
      <div style="margin-bottom:8px">
        <button class="btn btn-secondary btn-sm" onclick="rcpSelectRemaining('${id}')">${UI.icon('done_all', 'sm')} เลือกที่เหลือทั้งหมด</button>
      </div>
      ${rows}
      <div style="border-top:1px solid var(--md-outline-variant);margin:12px 0;padding-top:12px">
        <div style="font-size:11px;color:#9ca3af;text-transform:uppercase;margin-bottom:6px">Customer Tax (optional)</div>
        <input id="rcp-tax-name" class="settings-input" placeholder="ชื่อผู้เสียภาษี / บริษัท" style="margin-bottom:8px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <input id="rcp-tax-id" class="settings-input" placeholder="เลขประจำตัวผู้เสียภาษี">
          <input id="rcp-tax-addr" class="settings-input" placeholder="ที่อยู่">
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-rcp-create')">Cancel</button>
       <button class="btn btn-primary" id="rcp-create-btn" onclick="rcpCreate('${id}')" disabled>${UI.icon('add', 'sm')} สร้างใบเสร็จ</button>`,
      'modal-lg');
  };

  const selectedIdxs = () => [...document.querySelectorAll('.rcp-line:checked')].map(c => +c.value);

  window.rcpCalc = function (id) {
    const inv = B().inv(id); if (!inv) return;
    const idxs = selectedIdxs();
    const btn = document.getElementById('rcp-create-btn');
    if (!btn) return;
    btn.disabled = idxs.length === 0;
    btn.innerHTML = `${UI.icon('add', 'sm')} สร้างใบเสร็จ${idxs.length ? ` (${idxs.length} line · ${Utils.currency(amtOf(inv, idxs))})` : ''}`;
  };
  window.rcpSelectRemaining = function (id) {
    document.querySelectorAll('.rcp-line:not(:disabled)').forEach(c => { c.checked = true; });
    rcpCalc(id);
  };
  window.rcpCreate = function (id) {
    const inv = B().inv(id); if (!inv) return;
    const idxs = selectedIdxs();
    if (!idxs.length) return showToast('เลือกอย่างน้อย 1 line', 'warning');
    const tax = gv('rcp-tax-name') || gv('rcp-tax-id') || gv('rcp-tax-addr')
      ? { name: gv('rcp-tax-name'), taxId: gv('rcp-tax-id'), addr: gv('rcp-tax-addr') } : null;
    const r = pushReceipt(inv, idxs, tax);
    Modal.close('modal-rcp-create');
    rcpRefresh(id);
    const done = remainingIdx(inv).length === 0;
    showToast(`ออกใบเสร็จ ${r.reNo} (${idxs.length} line) ✓${done ? ' · ครบทุก line แล้ว' : ''}`, 'success');
  };

  /* ══════════════ VIEW ONE RECEIPT ══════════════ */
  window.rcpView = function (id, ri) {
    const inv = B().inv(id); if (!inv) return;
    const r = receipts(inv)[ri]; if (!r) return;
    Modal.create('modal-rcp-view',
      `${UI.icon('receipt', 'sm')} ${r.reNo}`,
      B().docHtml(inv, 'receipt', { lineIdxs: r.lineIdxs, reNo: r.reNo, discount: discountFor(inv, r), tax: r.tax }),
      `<button class="btn btn-secondary" onclick="Modal.close('modal-rcp-view')">Close</button>
       <button class="btn btn-primary" onclick="rcpDownload('${id}',${ri})">${UI.icon('download', 'sm')} Download</button>`,
      'modal-lg');
  };
  window.rcpDownload = function (id, ri) {
    const inv = B().inv(id); if (!inv) return;
    const r = receipts(inv)[ri]; if (!r) return;
    const L = linesOf(inv);
    const body = `RECEIPT ${r.reNo}\n${inv.student} · ${r.date}\n\n`
      + r.lineIdxs.map(i => `  ${L[i].desc}  ${Utils.currency(L[i].amount || 0)}`).join('\n')
      + `\n\nTotal: ${Utils.currency(receiptTotal(inv, r))}`;
    NockExport.text(`${r.reNo.replace('/', '-')}.txt`, body);
  };

})();
