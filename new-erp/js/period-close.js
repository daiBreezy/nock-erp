/* period-close.js — NockERP Period Close (LOGIC-SPEC-08) · Finance system
   ประกอบชุดรายเดือนส่ง KMD + validation gate ก่อนถึง Shibasan (CEO)
   เอกสารเป็น first-class: แนบไฟล์ · ดูเอกสาร · Service Bills = INV+RE+Payslip
   ดึง paid invoice จริงจาก DB · ส่วนอื่น = mock file (prototype) */
(function () {

  const money = a => (window.Utils ? Utils.currency(a) : '฿' + (a || 0).toLocaleString());
  const thMonth = m => new Date(m + '-01T12:00:00').toLocaleDateString('th-TH', { month: 'long', year: 'numeric' });
  const today = () => new Date().toISOString().slice(0, 10);
  const gv = id => (document.getElementById(id)?.value || '').trim();

  /* หมวดเอกสารในชุด (spec §11) — target = จำนวนที่ต้องมี */
  const SECTIONS = [
    { k: 'bank', name: 'Bank statements ทุกบัญชี', target: 5, icon: 'account_balance', hint: 'KBank Saving+Currency · Krungsri ×2 · Credit Advice' },
    { k: 'salesTax', name: 'Sales Tax sheet (all-branch)', target: 1, icon: 'table_chart', hint: 'รวมทุกสาขา (Excel)' },
    { k: 'vouchers', name: 'Pay Vouchers', target: 1, icon: 'description', hint: 'ต้นฉบับให้ KMD' },
    { k: 'wht', name: 'WHT (ใบฟ้า+ใบเหลือง)', target: 32, icon: 'article', hint: 'หัก ณ ที่จ่ายของเดือน' },
    { k: 'vendor', name: 'ใบเสร็จ/ใบกำกับ vendor', target: 1, icon: 'receipt', hint: 'จาก vendor ทุกเจ้า' },
  ];
  const sec = k => SECTIONS.find(s => s.k === k);
  const done = files => (files || []).reduce((n, f) => n + (f.count || 1), 0);

  const monthState = {};
  function stateOf(m) {
    return monthState[m] = monthState[m] || {
      status: 'open',
      docs: {
        bank: [{ name: 'KBank Saving — statement.pdf', date: '2026-05-02' }, { name: 'Krungsri #1 — statement.pdf', date: '2026-05-02' }, { name: 'Krungsri #2 — statement.pdf', date: '2026-05-02' }],
        salesTax: [],
        vouchers: [{ name: 'Pay Vouchers รวม.pdf', date: '2026-05-03' }],
        wht: [{ name: 'WHT ภงด.3 (บุคคล).pdf', date: '2026-05-04', count: 20 }, { name: 'WHT ภงด.53 (นิติบุคคล).pdf', date: '2026-05-04', count: 8 }],
        vendor: [{ name: 'ใบกำกับภาษี vendor รวม.pdf', date: '2026-05-03' }],
      },
      /* payslip (สลิปโอนจากผู้ปกครอง) ต่อ invoice — seed ให้ขาด 1 ใบ */
      payslips: { 'INV-2026-0028': { name: 'slip-0028.jpg' }, 'INV-2026-0029': { name: 'slip-0029.jpg' }, 'INV-2026-0032': { name: 'slip-0032.jpg' }, 'INV-2026-0041': { name: 'slip-0041.jpg' }, 'INV-2026-0048': { name: 'slip-0048.jpg' }, 'INV-2026-0050': { name: 'slip-0050.jpg' } },
    };
  }

  let S = { month: null };
  const paidStatuses = ['paid', 'confirmed'];
  const receiptsFor = invId => (window.DB?.receipts || []).filter(r => r.invoiceId === invId);
  const invoicesOf = month => (window.DB?.invoices || []).filter(i => paidStatuses.includes(i.status) && (i.date || '').slice(0, 7) === month);
  function monthsWithData() {
    const s = new Set((window.DB?.invoices || []).filter(i => paidStatuses.includes(i.status)).map(i => (i.date || '').slice(0, 7)).filter(Boolean));
    return [...s].sort();
  }

  /* ── VALIDATION (final-gate) ──────────────────────────────── */
  function validations(month) {
    const invs = invoicesOf(month), st = stateOf(month);
    const noRE = invs.filter(i => receiptsFor(i.id).length === 0);
    const noSlip = invs.filter(i => !st.payslips[i.id]);
    const cnt = k => done(st.docs[k]);
    return [
      { id: 'sets', label: 'ทุก Service Bill ครบชุด (INV + RE + Payslip)', ok: !noRE.length && !noSlip.length,
        detail: (noRE.length || noSlip.length) ? `ขาด RE ${noRE.length} · ขาด Payslip ${noSlip.length}` : `${invs.length} ชุดครบ`, items: [...new Set([...noRE, ...noSlip])] },
      { id: 'bank', label: `Bank statement ครบทุกบัญชี (${cnt('bank')}/5)`, ok: cnt('bank') >= 5, detail: cnt('bank') >= 5 ? 'ครบ' : `ขาด ${5 - cnt('bank')} บัญชี`, items: [], sec: 'bank' },
      { id: 'salestax', label: 'Sales Tax sheet (all-branch)', ok: cnt('salesTax') >= 1, detail: cnt('salesTax') >= 1 ? 'พร้อม' : 'ยังไม่ได้แนบ', items: [], sec: 'salesTax' },
      { id: 'wht', label: `WHT ครบ (ใบฟ้า+ใบเหลือง) ${cnt('wht')}/32`, ok: cnt('wht') >= 32, detail: cnt('wht') >= 32 ? 'ครบ' : `ค้าง ${32 - cnt('wht')} ใบ`, items: [], sec: 'wht' },
      { id: 'vendor', label: 'ใบเสร็จ/ใบกำกับจาก vendor', ok: cnt('vendor') >= 1, detail: cnt('vendor') >= 1 ? 'ครบ' : 'ยังไม่ครบ', items: [], sec: 'vendor' },
    ];
  }

  /* ── RENDER ───────────────────────────────────────────────── */
  function render() {
    const months = monthsWithData();
    if (!S.month) S.month = months[months.length - 1] || '2026-04';
    const month = S.month, st = stateOf(month), invs = invoicesOf(month);
    const vals = validations(month), passed = vals.filter(v => v.ok).length, allOk = passed === vals.length;
    const idx = months.indexOf(month);

    const kpi = UI.kpiGrid([
      { icon: 'rule', label: 'Validation ผ่าน', value: `${passed}/${vals.length}`, sub: allOk ? 'พร้อมส่ง' : 'มีจุดต้องแก้', color: allOk ? 'success' : 'warning' },
      { icon: 'receipt_long', label: 'Service Bills', value: invs.length, sub: 'INV+RE+Payslip', color: 'tertiary' },
      { icon: 'folder', label: 'เอกสารที่แนบ', value: SECTIONS.reduce((n, s) => n + (st.docs[s.k]?.length || 0), 0) + Object.keys(st.payslips).length, sub: 'ไฟล์ในชุด' },
      { icon: 'payments', label: 'ยอด AR เดือนนี้', value: money(invs.reduce((n, i) => n + (i.amount || 0), 0)), sub: `${invs.length} ใบ` },
    ]);

    const statusBadge = st.status === 'submitted' ? UI.badge('Submitted → KMD', 'green') : st.status === 'review' ? UI.badge('In Review', 'yellow') : UI.badge('Open', 'gray');

    const valHtml = vals.map(v => `
      <div style="display:flex;align-items:center;gap:12px;padding:11px 14px;border:1px solid var(--md-outline-variant);border-radius:8px;margin-bottom:8px">
        <div style="width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:${v.ok ? '#f0fdf4' : '#fef3c7'};color:${v.ok ? '#10b981' : '#f59e0b'}">${UI.icon(v.ok ? 'check' : 'priority_high', 'sm')}</div>
        <div style="flex:1"><div style="font-weight:600;font-size:var(--fs-body-sm)">${v.label}</div><div class="text-muted" style="font-size:11px">${v.detail}</div></div>
        ${!v.ok && v.items.length ? `<button class="btn btn-secondary btn-sm" onclick="pcShowItems('${v.id}')">${UI.icon('visibility', 'sm')} ดูที่ขาด</button>` : ''}
        ${!v.ok && v.sec ? `<button class="btn btn-secondary btn-sm" onclick="pcAttach('${v.sec}')">${UI.icon('upload', 'sm')} แนบ</button>` : ''}
        ${UI.badge(v.ok ? 'Pass' : 'ต้องแก้', v.ok ? 'green' : 'yellow')}
      </div>`).join('');

    /* bundle: การ์ดต่อหมวด + file chips */
    const bundleHtml = SECTIONS.map(s => {
      const files = st.docs[s.k] || [], d = done(files), full = d >= s.target;
      const chips = files.length ? files.map((f, fi) => `
        <span onclick="pcViewDoc('${s.k}',${fi})" title="ดูเอกสาร" style="display:inline-flex;align-items:center;gap:5px;background:var(--md-surface-variant,#eef0f4);border-radius:6px;padding:3px 8px;font-size:11px;cursor:pointer;margin:2px 4px 2px 0">
          ${UI.icon('description', 'sm')} ${f.name}${f.count ? ` ×${f.count}` : ''}</span>`).join('')
        : `<span class="text-muted" style="font-size:11px">ยังไม่มีไฟล์</span>`;
      return `<div style="border:1px solid var(--md-outline-variant);border-radius:10px;padding:12px 14px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          ${UI.icon(s.icon, 'sm')}<span style="font-weight:600;font-size:var(--fs-body-sm)">${s.name}</span>
          <span style="margin-left:auto">${UI.badge(full ? 'ครบ' : `${d}/${s.target}`, full ? 'green' : 'yellow')}</span>
        </div>
        <div class="text-muted" style="font-size:11px;margin-bottom:8px">${s.hint}</div>
        <div style="margin-bottom:8px">${chips}</div>
        <button class="btn btn-secondary btn-sm" onclick="pcAttach('${s.k}')">${UI.icon('upload', 'sm')} แนบเอกสาร</button>
      </div>`;
    }).join('');

    /* service bills */
    const cell = (ok, onView, onAttach) => ok
      ? `<span class="text-success" style="cursor:pointer" onclick="${onView}" title="ดูเอกสาร">${UI.icon('check_circle', 'sm')} ดู</span>`
      : `<span class="text-error" style="cursor:pointer" onclick="${onAttach}" title="แนบ">${UI.icon('add_circle', 'sm')} แนบ</span>`;
    const rows = invs.map(i => {
      const hasRE = receiptsFor(i.id).length > 0, hasSlip = !!st.payslips[i.id], complete = hasRE && hasSlip;
      return `<tr>
        <td><b>${i.id}</b><div class="text-muted" style="font-size:11px">${i.branch || ''}</div></td>
        <td>${i.course || '—'}</td>
        <td style="text-align:right">${money(i.amount)}</td>
        <td style="text-align:center">${cell(true, `pcViewBill('${i.id}','inv')`, '')}</td>
        <td style="text-align:center">${cell(hasRE, `pcViewBill('${i.id}','re')`, `pcViewBill('${i.id}','re-missing')`)}</td>
        <td style="text-align:center">${cell(hasSlip, `pcViewBill('${i.id}','slip')`, `pcAttachPayslip('${i.id}')`)}</td>
        <td style="text-align:center">${UI.badge(complete ? 'ครบชุด' : 'ไม่ครบ', complete ? 'green' : 'red')}</td>
      </tr>`;
    }).join('');
    const cols = [{ label: 'Invoice' }, { label: 'รายการ' }, { label: 'ยอด', align: 'right' }, { label: 'INV', align: 'center' }, { label: 'RE', align: 'center' }, { label: 'Payslip', align: 'center' }, { label: 'สถานะชุด', align: 'center' }];

    document.getElementById('view-period-close').innerHTML = `
      ${UI.pageHeader('Period Close', '<span>ประกอบชุดเอกสารรายเดือนส่ง KMD · แนบเอกสาร · ระบบเช็ค validation ก่อนถึง Shibasan</span>',
        `<button class="btn btn-secondary btn-sm" onclick="pcExport()">${UI.icon('download', 'sm')} Export bundle</button>
         <button class="btn btn-primary btn-sm" onclick="pcSubmit()" ${allOk && st.status !== 'submitted' ? '' : 'disabled'}>${UI.icon('send', 'sm')} ส่งให้ Shibasan</button>`)}
      <div class="filter-bar">
        <button class="btn btn-secondary btn-sm" onclick="pcMonth(-1)" ${idx <= 0 ? 'disabled' : ''}>${UI.icon('chevron_left', 'sm')}</button>
        <div class="tc-select" style="display:inline-flex;align-items:center;gap:6px;padding:0 14px;min-width:150px;justify-content:center">${UI.icon('calendar_month', 'sm')} <b>${thMonth(month)}</b></div>
        <button class="btn btn-secondary btn-sm" onclick="pcMonth(1)" ${idx >= months.length - 1 ? 'disabled' : ''}>${UI.icon('chevron_right', 'sm')}</button>
        <div style="width:1px;background:var(--md-outline-variant);height:20px;margin:0 6px"></div>${statusBadge}
        <span class="text-muted" style="font-size:var(--fs-body-sm);margin-left:auto">${UI.icon('schedule', 'sm')} เส้นตายกลายๆ ~สัปดาห์ที่ 2 ของเดือนถัดไป</span>
      </div>
      ${kpi}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:16px">
        <div>
          <div class="section-title">${UI.icon('rule', 'sm')} Final-gate validation</div>
          <div style="background:${allOk ? '#f0fdf4' : '#fef3c7'};border-radius:8px;padding:10px 12px;font-size:var(--fs-body-sm);margin-bottom:10px">
            ${UI.icon(allOk ? 'verified' : 'warning', 'sm')} ${allOk ? 'ผ่านทุกข้อ — พร้อมส่งให้ Shibasan อนุมัติ' : 'ยังส่งไม่ได้ — แนบเอกสารที่ยังขาดให้ครบก่อน (กันโดน Shibasan reject)'}</div>
          ${valHtml}
        </div>
        <div>
          <div class="section-title">${UI.icon('inventory', 'sm')} Bundle checklist — เอกสารในชุด</div>
          <div style="display:grid;gap:10px">${bundleHtml}</div>
        </div>
      </div>
      <div class="section-title" style="margin-top:22px">${UI.icon('receipt_long', 'sm')} Service Bills — จับคู่ INV + RE + Payslip (คลิกดู/แนบ)</div>
      ${UI.table(cols, rows || '', { emptyMsg: 'ไม่มี invoice ที่จ่ายแล้วในเดือนนี้' })}`;
  }

  /* ── DOCUMENT VIEWER (mock) ───────────────────────────────── */
  function docPaper(title, meta, note) {
    return `<div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:24px">
      <div style="display:flex;justify-content:space-between;border-bottom:2px solid #1a1d23;padding-bottom:10px;margin-bottom:14px">
        <div style="font-weight:800;font-size:15px">${title}</div>${UI.icon('picture_as_pdf', 'sm')}</div>
      ${(meta || []).map(m => `<div style="display:flex;justify-content:space-between;font-size:13px;padding:4px 0"><span class="text-muted">${m[0]}</span><b>${m[1]}</b></div>`).join('')}
      <div style="margin-top:16px;height:220px;background:repeating-linear-gradient(#f8f9fb,#f8f9fb 22px,#eef0f4 22px,#eef0f4 23px);border:1px dashed #d1d5db;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:12px">
        ${note || '(เอกสารจำลอง — prototype)'}</div></div>`;
  }
  function openDoc(title, meta, note) {
    Modal.create('modal-pc-doc', `${UI.icon('description', 'sm')} ${title}`, docPaper(title, meta, note),
      `<button class="btn btn-secondary" onclick="Modal.close('modal-pc-doc')">Close</button>
       <button class="btn btn-primary" onclick="showToast('ดาวน์โหลด (mock)','info')">${UI.icon('download', 'sm')} Download</button>`, 'modal-lg');
  }
  window.pcViewDoc = function (k, fi) {
    const f = stateOf(S.month).docs[k]?.[fi]; if (!f) return;
    openDoc(f.name, [['หมวด', sec(k)?.name || k], ['วันที่แนบ', f.date || '—'], f.count ? ['จำนวน', f.count + ' ใบ'] : ['ประเภท', 'ไฟล์เอกสาร']].filter(Boolean));
  };
  window.pcViewBill = function (invId, kind) {
    const inv = (window.DB?.invoices || []).find(i => i.id === invId); if (!inv) return;
    if (kind === 're-missing') return showToast('ยังไม่ออกใบเสร็จ — ไปออก RE ที่ Billing (Receipt tab)', 'warning');
    const re = receiptsFor(invId)[0];
    if (kind === 'inv') openDoc(`Invoice ${invId}`, [['ผู้จ่าย', inv.student || inv.studentId || '—'], ['รายการ', inv.course || '—'], ['ยอด', money(inv.amount)], ['วันที่', inv.date]]);
    else if (kind === 're') openDoc(`Receipt ${re?.refNo || re?.id || invId}`, [['อ้างอิง INV', invId], ['ยอด', money(re?.amount || inv.amount)], ['รับเงินเมื่อ', re?.paidAt || inv.date], ['ผู้เซ็น', re?.stampedBy || 'Admin']], '(ใบเสร็จรับเงิน)');
    else if (kind === 'slip') { const sl = stateOf(S.month).payslips[invId]; openDoc(`Payslip — ${invId}`, [['ไฟล์', sl?.name || '—'], ['ยอดโอน', money(inv.amount)], ['อ้างอิง', invId]], '(สลิปโอนเงินจากผู้ปกครอง)'); }
  };

  /* ── ATTACH ───────────────────────────────────────────────── */
  window.pcAttach = function (k) {
    const s = sec(k); const isWht = k === 'wht';
    Modal.create('modal-pc-attach', `${UI.icon('upload', 'sm')} แนบเอกสาร — ${s?.name || k}`,
      `<div style="border:2px dashed var(--md-outline-variant);border-radius:10px;padding:22px;text-align:center;margin-bottom:14px;cursor:pointer" onclick="pcPickFile()">
        ${UI.icon('cloud_upload', 'lg')}<div style="font-weight:600;margin-top:6px">ลากไฟล์มาวาง หรือคลิกเพื่อเลือก</div>
        <div class="text-muted" style="font-size:var(--fs-body-sm)">PDF / JPG / PNG (mock)</div></div>
      <div class="settings-group"><label class="settings-label">ชื่อไฟล์ *</label>
        <input id="pc-fname" class="settings-input" placeholder="เช่น KBank Currency — statement.pdf"></div>
      ${isWht ? `<div class="settings-group"><label class="settings-label">จำนวนใบใน batch นี้</label>
        <input id="pc-fcount" type="number" class="settings-input" value="1" min="1"></div>` : ''}`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-pc-attach')">Cancel</button>
       <button class="btn btn-primary" onclick="pcAttachSave('${k}')">${UI.icon('check', 'sm')} แนบเข้าชุด</button>`);
  };
  window.pcPickFile = function () {
    const el = document.getElementById('pc-fname'); if (!el) return;
    el.value = el.value || 'scanned-doc-' + Date.now().toString(36).slice(-4) + '.pdf';
    showToast('เลือกไฟล์แล้ว (mock)', 'info');
  };
  window.pcAttachSave = function (k) {
    const name = gv('pc-fname'); if (!name) return showToast('ใส่ชื่อไฟล์ก่อน', 'warning');
    const f = { name, date: today(), by: 'Admin' };
    if (k === 'wht') f.count = +gv('pc-fcount') || 1;
    (stateOf(S.month).docs[k] = stateOf(S.month).docs[k] || []).push(f);
    Modal.close('modal-pc-attach'); render();
    showToast(`แนบ ${name} เข้าชุดแล้ว ✓`, 'success');
  };
  window.pcAttachPayslip = function (invId) {
    Modal.create('modal-pc-slip', `${UI.icon('upload', 'sm')} แนบสลิปโอน — ${invId}`,
      `<div style="border:2px dashed var(--md-outline-variant);border-radius:10px;padding:22px;text-align:center;margin-bottom:14px;cursor:pointer" onclick="document.getElementById('pc-slip-name').value='slip-${invId.slice(-4)}.jpg';showToast('เลือกไฟล์แล้ว (mock)','info')">
        ${UI.icon('cloud_upload', 'lg')}<div style="font-weight:600;margin-top:6px">คลิกเพื่อเลือกสลิป</div></div>
      <div class="settings-group"><label class="settings-label">ชื่อไฟล์สลิป *</label>
        <input id="pc-slip-name" class="settings-input" placeholder="slip-${invId.slice(-4)}.jpg"></div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-pc-slip')">Cancel</button>
       <button class="btn btn-primary" onclick="pcSlipSave('${invId}')">${UI.icon('check', 'sm')} แนบสลิป</button>`);
  };
  window.pcSlipSave = function (invId) {
    const name = gv('pc-slip-name'); if (!name) return showToast('ใส่ชื่อไฟล์ก่อน', 'warning');
    stateOf(S.month).payslips[invId] = { name, date: today() };
    Modal.close('modal-pc-slip'); render();
    showToast(`แนบสลิป ${invId} แล้ว ✓`, 'success');
  };

  /* ── OTHER ACTIONS ────────────────────────────────────────── */
  window.pcMonth = function (d) {
    const months = monthsWithData(), i = months.indexOf(S.month), ni = i + d;
    if (ni < 0 || ni >= months.length) return; S.month = months[ni]; render();
  };
  window.pcShowItems = function (vid) {
    const v = validations(S.month).find(x => x.id === vid); if (!v) return;
    const st = stateOf(S.month);
    Modal.create('modal-pc-items', `${UI.icon('warning', 'sm')} รายการที่ยังไม่ครบ — ${v.label}`,
      v.items.length ? v.items.map(i => `<div style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--md-outline-variant)">
        <span><b>${i.id}</b> · ${i.course || ''}</span>
        <span class="text-muted" style="font-size:var(--fs-body-sm)">${receiptsFor(i.id).length ? '' : 'ขาด RE'}${!st.payslips[i.id] ? ' · ขาด Payslip' : ''}</span>
      </div>`).join('') : '<div class="text-muted">ไม่มีรายการ</div>',
      `<button class="btn btn-primary" onclick="Modal.close('modal-pc-items')">เข้าใจแล้ว</button>`);
  };
  window.pcExport = function () {
    const month = S.month, invs = invoicesOf(month), st = stateOf(month);
    const manifest = `PERIOD CLOSE BUNDLE — ${thMonth(month)}\n${'='.repeat(40)}\n\n`
      + `Service Bills (${invs.length}):\n` + invs.map(i => `  ${i.id}  ${money(i.amount)}  RE:${receiptsFor(i.id).length ? 'Y' : 'N'}  Payslip:${st.payslips[i.id] ? 'Y' : 'N'}`).join('\n')
      + `\n\n` + SECTIONS.map(s => `${s.name}: ${done(st.docs[s.k])}/${s.target}\n` + (st.docs[s.k] || []).map(f => `   - ${f.name}`).join('\n')).join('\n');
    NockExport.text(`period-close-${month}.txt`, manifest);
  };
  window.pcSubmit = function () {
    if (!validations(S.month).every(v => v.ok)) return showToast('ยังมี validation ไม่ผ่าน', 'warning');
    stateOf(S.month).status = 'submitted'; render();
    showToast(`ส่งชุด ${thMonth(S.month)} ให้ Shibasan แล้ว ✓`, 'success');
  };

  render();
})();
