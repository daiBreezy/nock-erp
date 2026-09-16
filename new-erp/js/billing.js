/* billing.js — NockERP Billing Module
   Flow: Draft → Sent → Pending Verification → Paid */
(function () {

  /* ── DATA (from central pool) ───────────────────────────── */
  function buildLedger() {
    return (DB.invoices || []).map(inv => {
      const student = inv.studentId ? DB.students.find(s => s.id === inv.studentId) : null;
      const family  = inv.familyId  ? DB.families.find(f => f.id === inv.familyId)  : null;
      return {
        id:      inv.id,
        refNo:   _refNo(inv.id),
        student: student?.name || inv.student || '—',
        studentId: inv.studentId,
        family:  family?.name  || inv.family  || '—',
        branch:  inv.branch,
        course:  inv.course,
        amount:  inv.amount,
        hours:   inv.hours,
        lines:   inv.lines    || null,
        discount:inv.discount || null,
        date:    inv.date,
        status:  inv.status || 'draft',
        payslip: inv.payslip || null,
        method:  inv.method || 'Transfer',
        voidReason: inv.voidReason || null,
        replacedBy: inv.replacedBy || null,
        paidAt:  inv.paidAt || null,
      };
    }).sort((a, b) => b.date.localeCompare(a.date));
  }

  function _refNo(invId) {
    const n = parseInt((invId||'').split('-').pop()||'1',10);
    return `6905-${String(n).padStart(2,'0')}`;
  }

  /* ── STATE MACHINE ────────────────────────────────────────
     draft → sent → pending (มีสลิปแล้ว รอตรวจ statement KBiz) → paid (เงินเข้าจริง → เข้าคลาส)
     ทุกสถานะ void ได้ (เก็บใบเก่า + เหตุผล) · submitted/confirmed = legacy alias ของใบเก่า */
  const STATUS = {
    draft:   { cls:'badge-gray',   label:'Draft',               icon:'edit_note' },
    sent:    { cls:'badge-blue',   label:'Sent · รอสลิป',        icon:'send' },
    pending: { cls:'badge-yellow', label:'มีสลิป · รอตรวจ statement', icon:'pending' },
    paid:    { cls:'badge-green',  label:'Paid · เข้าคลาสแล้ว',   icon:'check_circle' },
    voided:  { cls:'badge-red',    label:'Voided',              icon:'block' },
    submitted:{cls:'badge-yellow', label:'มีสลิป · รอตรวจ statement', icon:'pending' },
    pending_verification:{cls:'badge-yellow', label:'มีสลิป · รอตรวจ statement', icon:'pending' },
    confirmed:{cls:'badge-green',  label:'Paid · เข้าคลาสแล้ว',   icon:'check_circle' },
  };

  let ledger = buildLedger(), filterStatus = 'all', filterDoc = 'all', searchVal = '';

  /* ── SHELL ───────────────────────────────────────────────── */
  document.getElementById('view-billing').innerHTML = `

  ${UI.pageHeader('Billing',
    `<span id="billing-sub">Loading…</span>`,
    `<button class="btn btn-primary btn-sm" onclick="openNewInvoice()">${UI.icon('add','sm')} New Invoice</button>`
  )}

  <div id="billing-kpi"></div>

  ${UI.filterBar([
    { type:'search', placeholder:'Search invoice, student, course…', oninput:'billingSearch(this.value)' },
    { label:'All',     active:true,  onclick:"billingFilter('all',this)"     },
    { label:'Draft',   active:false, onclick:"billingFilter('draft',this)"   },
    { label:'รอสลิป',   active:false, onclick:"billingFilter('sent',this)"    },
    { label:'รอตรวจ statement', active:false, onclick:"billingFilter('pending',this)" },
    { label:'Paid',    active:false, onclick:"billingFilter('paid',this)"    },
    { label:'Voided',  active:false, onclick:"billingFilter('voided',this)"  },
  ])}
  <div class="filter-bar" style="margin-top:calc(var(--sp-2) * -1)">
    <div class="filter-chip active" data-bd="all"     onclick="billingDocFilter('all',this)">INV + RCP</div>
    <div class="filter-chip"        data-bd="invoice" onclick="billingDocFilter('invoice',this)">Invoice only</div>
    <div class="filter-chip"        data-bd="receipt" onclick="billingDocFilter('receipt',this)">Receipt only</div>
  </div>

  <!-- TABLE -->
  <div class="card">
    <table>
      <thead><tr>
        <th>Ref #</th><th>Student</th><th>Course</th>
        <th>Amount</th><th>Date</th><th>Status</th><th>Documents</th><th></th>
      </tr></thead>
      <tbody id="billing-tbody"></tbody>
    </table>
  </div>`;

  /* ── KPI ─────────────────────────────────────────────────── */
  function renderKPI() {
    const paid    = ledger.filter(i=>i.status==='paid'||i.status==='confirmed');
    const pending = ledger.filter(i=>['pending','submitted','pending_verification'].includes(i.status));
    const draft   = ledger.filter(i=>i.status==='draft');
    const voided  = ledger.filter(i=>i.status==='voided');
    const revenue = `฿${(paid.reduce((s,i)=>s+i.amount,0)/1000).toFixed(0)}K`;
    const el = document.getElementById('billing-kpi');
    if (!el) return;
    el.innerHTML = UI.kpiGrid([
      { icon:'payments',     label:'Revenue',         value:revenue,       color:'success',  sub:'From paid invoices',    subColor:'up'   },
      { icon:'pending',      label:'รอตรวจ statement',  value:pending.length,color: pending.length?'warning':'success',
        sub: pending.length?'มีสลิปแล้ว — รอเช็ค KBiz':'All clear',        subColor: pending.length?'down':'up' },
      { icon:'edit_note',    label:'Draft',            value:draft.length,  color:'',         sub:'Not sent yet'                          },
      { icon:'check_circle', label:'Paid',             value:paid.length,   color:'success',  sub:'ยืนยันเงินเข้า + เข้าคลาสแล้ว', subColor:'up' },
      { icon:'block',        label:'Voided',           value:voided.length, color: voided.length?'error':'', sub:'ยกเลิก — เก็บไว้ตรวจย้อน'         },
    ]);
    const grid = el.querySelector('.kpi-grid');
    if (grid) grid.style.gridTemplateColumns = 'repeat(5,1fr)';
    // Highlight pending card
    if (pending.length) {
      const cards = el.querySelectorAll('.kpi-card');
      if (cards[1]) cards[1].style.boxShadow = '0 0 0 2px var(--md-warning)';
    }
  }

  /* ── ROW ACTIONS ต่อสถานะ (ปุ่มเดียวที่ "ต้องทำต่อ" + เมนูรอง) ── */
  function rowActions(inv) {
    const s   = inv.status;
    const btn = (label, icon, fn, kind='secondary') =>
      `<button class="btn btn-${kind} btn-sm" onclick="${fn}('${inv.id}')">${UI.icon(icon,'sm')} ${label}</button>`;
    const more = [];
    let main = '';

    if (s === 'draft') {
      main = btn('Send','send','billingSend');
    } else if (s === 'sent') {
      main = btn('แนบสลิป','upload_file','billingUploadSlip','primary');
      more.push({ label:`${UI.icon('assignment','sm')} Parent Form`, onclick:`openParentForm('${inv.id}')` });
    } else if (s === 'pending' || s === 'submitted' || s === 'pending_verification') {
      main = btn('Confirm Paid','fact_check','billingConfirmPaid','primary');
      more.push({ label:`${UI.icon('image','sm')} ดูสลิป`,     onclick:`billingViewSlip('${inv.id}')` });
      more.push({ label:`${UI.icon('undo','sm')} สลิปไม่ถูกต้อง`, onclick:`billingRejectSlip('${inv.id}')` });
    }
    if (s !== 'voided' && s !== 'paid' && s !== 'confirmed')
      more.push({ label:`${UI.icon('block','sm')} Void ใบนี้`, onclick:`billingVoid('${inv.id}')` });
    if (s === 'voided' && inv.voidReason)
      main = `<span class="text-muted" style="font-size:11px" title="${inv.voidReason}">
        ${UI.icon('info','sm')} ${inv.replacedBy ? 'แทนด้วย '+inv.replacedBy : 'ยกเลิกแล้ว'}</span>`;

    return `<div style="display:inline-flex;gap:2px;align-items:center">
      ${main}${more.length ? UI.moreMenu('act-'+inv.id, more) : ''}</div>`;
  }

  /* ── TABLE ───────────────────────────────────────────────── */
  function renderTable() {
    let list = [...ledger];
    /* legacy alias: submitted→pending · confirmed→paid */
    const ALIAS = { submitted:'pending', pending_verification:'pending', confirmed:'paid' };
    if (filterStatus !== 'all') list = list.filter(i=>(ALIAS[i.status]||i.status)===filterStatus);
    if (searchVal) {
      const q = searchVal.toLowerCase();
      list = list.filter(i=>(i.id+i.student+i.course+i.refNo).toLowerCase().includes(q));
    }
    const sub = document.getElementById('billing-sub');
    if (sub) sub.textContent = `${list.length} record${list.length!==1?'s':''} shown`;

    document.getElementById('billing-tbody').innerHTML = list.map(inv => {
      const sm        = STATUS[inv.status]||STATUS.draft;
      const isPaid    = inv.status==='paid';
      const isPending = inv.status==='pending';

      let primaryDocBtn = '', moreDocActs = [];
      if (filterDoc === 'receipt') {
        if (isPaid) primaryDocBtn = `<button class="btn btn-secondary btn-sm"
          onclick="event.stopPropagation();openDocPreview('${inv.id}','receipt')">
          ${UI.icon('receipt','sm')} RCP</button>`;
      } else if (filterDoc === 'invoice') {
        primaryDocBtn = `<button class="btn btn-secondary btn-sm"
          onclick="event.stopPropagation();openDocPreview('${inv.id}','invoice')">
          ${UI.icon('receipt_long','sm')} INV</button>`;
      } else {
        if (isPaid) {
          primaryDocBtn = `<button class="btn btn-secondary btn-sm"
            onclick="event.stopPropagation();openDocPreview('${inv.id}','both')">
            ${UI.icon('download','sm')} Both</button>`;
          moreDocActs = [
            {label:`${UI.icon('receipt_long','sm')} Invoice`, onclick:`openDocPreview('${inv.id}','invoice')`},
            {label:`${UI.icon('receipt','sm')} Receipt`,     onclick:`openDocPreview('${inv.id}','receipt')`},
          ];
        } else {
          primaryDocBtn = `<button class="btn btn-secondary btn-sm"
            onclick="event.stopPropagation();openDocPreview('${inv.id}','invoice')">
            ${UI.icon('receipt_long','sm')} INV</button>`;
        }
      }
      const docBtns = `<div style="display:inline-flex;gap:2px;align-items:center">
        ${primaryDocBtn}${moreDocActs.length?UI.moreMenu('doc-'+inv.id,moreDocActs):''}
      </div>`;
      void isPending;

      return `<tr class="tr-click" onclick="openDocPreview('${inv.id}','${isPaid?'both':'invoice'}')">
        <td class="text-primary" style="font-weight:600;font-size:var(--fs-label-sm)">${inv.refNo}</td>
        <td>
          <div style="font-weight:500">${inv.student}</div>
          <div class="text-muted" style="font-size:var(--fs-label-sm)">${inv.family}</div>
        </td>
        <td>${inv.course}</td>
        <td style="font-weight:600">฿${inv.amount.toLocaleString()}</td>
        <td class="text-muted">${inv.date}</td>
        <td>${UI.badge(`${sm.label}`, sm.cls.replace('badge-',''))}</td>
        <td onclick="event.stopPropagation()">${docBtns}</td>
        <td onclick="event.stopPropagation()" style="white-space:nowrap">${rowActions(inv)}</td>
      </tr>`;
    }).join('');
  }

  renderKPI(); renderTable();

  window._refreshBilling = function() { ledger = buildLedger(); renderKPI(); renderTable(); };

  window.billingSearch = v => { searchVal=v; renderTable(); };
  window.billingFilter = function(s,el) {
    filterStatus=s;
    el.closest('.filter-bar').querySelectorAll('.filter-chip').forEach(c=>c.classList.remove('active'));
    el.classList.add('active'); renderTable();
  };
  window.billingDocFilter = function(d,el) {
    filterDoc=d;
    document.querySelectorAll('[data-bd]').forEach(c=>c.classList.remove('active'));
    el.classList.add('active'); renderTable();
  };

  /* ── HELPERS ─────────────────────────────────────────────── */
  function getMasterAdmin(branch) {
    return (DB.staff||[]).find(s =>
      s.adminTier === 'master' &&
      (s.branches||[]).includes(branch)
    ) || (DB.staff||[]).find(s => s.adminTier === 'master');
  }

  function _sigBlock(branch) {
    const ma = getMasterAdmin(branch);
    return `<div style="display:flex;justify-content:flex-end;margin-top:20px;
                        padding-top:14px;border-top:1px solid #f3f4f6">
      <div style="text-align:center;min-width:160px">
        ${ma?.signature
          ? `<img src="${ma.signature}" style="max-height:48px;max-width:160px;object-fit:contain;
                                               display:block;margin:0 auto 6px">`
          : `<div style="height:48px;border-bottom:1.5px solid #374151;margin-bottom:6px"></div>`}
        <div style="font-size:10px;color:#374151;font-weight:600">${ma?.name || '—'}</div>
        <div style="font-size:9px;color:#9ca3af">Authorized Signatory · ${branch} Branch</div>
      </div>
    </div>`;
  }

  /* ── DOCUMENT PREVIEW ──────────────────────────────────────
     opts (optional, ใช้ตอนแตก receipt ราย line):
       lineIdxs  — index ของ line ที่จะแสดง (default = ทุก line)
       reNo      — เลขที่เอกสาร override (เช่น RE.../2)
       discount  — discount object ที่ผูกกับใบนี้ (ถ้ามี)
       tax       — {name,taxId,addr} พิมพ์ลง Customer Tax block */
  function _docHtml(inv, type, opts) {
    opts = opts || {};
    const isRcp  = type==='receipt';
    const titleEN= isRcp ? 'RECEIPT' : 'INVOICE';
    const color  = isRcp ? '#10b981' : '#6366f1';
    const allLines = Utils.invoiceLines(inv);
    const lines  = opts.lineIdxs ? opts.lineIdxs.map(i=>allLines[i]).filter(Boolean) : allLines;
    const subtotal = lines.reduce((n,l)=>n+(l.amount||0),0);
    const disc   = opts.lineIdxs ? (opts.discount||null) : (inv.discount||null);
    const total  = subtotal - (disc ? (disc.amount||0) : 0);
    const refNo  = opts.reNo || inv.refNo;
    const dueRow = !isRcp ? `<tr><td style="padding:6px 8px;font-size:11px;color:#6b7280">*Due By:</td>
      <td style="padding:6px 8px;font-size:11px;font-weight:600">${inv.date.slice(0,7)}-28</td></tr>` : '';
    const paid = isRcp ? `<div style="position:absolute;top:20px;right:20px;border:3px solid #10b981;
      color:#10b981;font-size:28px;font-weight:900;padding:4px 10px;border-radius:4px;
      opacity:.35;transform:rotate(-8deg);pointer-events:none">PAID</div>` : '';
    return `<div style="position:relative;font-family:Arial,sans-serif;max-width:560px;margin:0 auto;
      padding:24px;border:1px solid #e5e7eb;border-radius:8px;font-size:12px;background:#fff">
      ${paid}
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div><div style="font-size:16px;font-weight:700;color:#1a1d23">Nock Academy</div>
          <div style="font-size:10px;color:#9ca3af;margin-top:2px">${inv.branch} Branch</div>
          <div style="font-size:10px;color:#9ca3af">Tax ID: 0-1053-56789-01-2</div></div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:800;color:${color}">${titleEN}</div>
          <div style="font-size:10px;color:#6b7280">${isRcp?'ใบเสร็จรับเงิน':'ใบแจ้งหนี้'}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;background:#f9fafb;
        padding:10px 14px;border-radius:6px;margin-bottom:16px">
        <div><div style="font-size:9px;color:#9ca3af;text-transform:uppercase">NO.</div>
          <div style="font-weight:700;font-size:13px;color:${color}">${refNo}</div></div>
        <div><div style="font-size:9px;color:#9ca3af;text-transform:uppercase">Date</div>
          <div style="font-weight:600">${inv.date}</div></div>
        <div><div style="font-size:9px;color:#9ca3af;text-transform:uppercase">Branch</div>
          <div style="font-weight:600">${inv.branch}</div></div>
      </div>
      <div style="margin-bottom:16px">
        <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Bill To</div>
        <div style="font-weight:600;font-size:13px">${opts.tax?.name || inv.student}</div>
        <div style="font-size:11px;color:#6b7280">${inv.family}</div>
        ${opts.tax && (opts.tax.taxId || opts.tax.addr) ? `<div style="font-size:10px;color:#6b7280;margin-top:2px">
          ${opts.tax.taxId ? 'Tax ID: '+opts.tax.taxId : ''}${opts.tax.addr ? ' · '+opts.tax.addr : ''}</div>` : ''}
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <thead><tr style="background:#f3f4f6">
          <th style="padding:8px;font-size:10px;color:#6b7280;font-weight:600;text-align:left">#</th>
          <th style="padding:8px;font-size:10px;color:#6b7280;font-weight:600;text-align:left">Description</th>
          <th style="padding:8px;font-size:10px;color:#6b7280;font-weight:600;text-align:right">Amount</th>
        </tr></thead>
        <tbody>${lines.map((l,i)=>`<tr>
          <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6">${i+1}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;font-weight:500">${l.desc}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:700">฿${(l.amount||0).toLocaleString()}</td>
        </tr>`).join('')}</tbody>
      </table>
      <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:16px">
        <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px;font-size:11px">
          <div style="font-weight:600;margin-bottom:4px;color:#374151">ช่องทางชำระเงิน</div>
          <div>ธนาคารกรุงศรีอยุธยา</div><div>เลขที่บัญชี: 5991616726</div>
          <div>ชื่อบัญชี: Nock Academy Co., Ltd.</div>
        </div>
        <div style="min-width:160px">
          <table style="width:100%;font-size:11px">
            <tr><td style="padding:4px 8px;color:#6b7280">Sub Total</td>
              <td style="padding:4px 8px;text-align:right">฿${subtotal.toLocaleString()}</td></tr>
            ${disc ? `<tr><td style="padding:4px 8px;color:#10b981">${disc.label||'Discount'}</td>
              <td style="padding:4px 8px;text-align:right;color:#10b981">−฿${(disc.amount||0).toLocaleString()}</td></tr>` : ''}
            <tr><td style="padding:4px 8px;color:#6b7280">VAT 7%</td>
              <td style="padding:4px 8px;text-align:right">฿0</td></tr>
            ${dueRow}
            <tr style="border-top:2px solid #1a1d23">
              <td style="padding:6px 8px;font-weight:700">Total</td>
              <td style="padding:6px 8px;text-align:right;font-weight:700;font-size:14px;
                color:${color}">฿${total.toLocaleString()}</td>
            </tr>
          </table>
        </div>
      </div>
      ${_stmtBlock(inv)}
      ${_sigBlock(inv.branch)}
    </div>`;
  }

  /* หลักฐานเงินเข้า — ผูกบิลกับ statement KBiz (ตรวจย้อนได้ว่าเงินก้อนไหน = บิลใบไหน) */
  function _stmtBlock(inv) {
    const s = window.Bank?.forInvoice(inv.id);
    const src0 = (DB.invoices||[]).find(x=>x.id===inv.id) || inv;
    if (!s && !src0.paidRef) return '';
    const manual = src0.statementManual;
    return `<div style="margin-top:14px;padding:8px 10px;border-radius:6px;font-size:10px;
        background:${manual?'#fffbeb':'#f0fdf4'};border:1px solid ${manual?'#fde68a':'#bbf7d0'};color:#374151">
      <b>หลักฐานเงินเข้า</b> ·
      Ref <span style="font-family:monospace;font-weight:700">${src0.paidRef||'—'}</span>
      ${s ? ` · ${s.date} ${s.time} · ${s.account} · ${s.payerName}` : ` · ${src0.paidAt||''}`}
      ${manual ? ' · <b>กรอกเอง (ยังไม่ตรวจกับ feed)</b>' : ''}
      ${src0.verifiedBy ? ` · ตรวจโดย ${src0.verifiedBy}` : ''}
    </div>`;
  }

  window.openDocPreview = function(id, type) {
    const inv = ledger.find(i=>i.id===id);
    if (!inv) return;
    const tabs = type==='both'
      ? `<div class="tabs" style="margin-bottom:var(--sp-4)">
          <div id="doc-tab-inv" class="tab active" onclick="docTabSwitch('invoice')">
            ${UI.icon('receipt_long','sm')} Invoice</div>
          <div id="doc-tab-rcp" class="tab" onclick="docTabSwitch('receipt')">
            ${UI.icon('receipt','sm')} Receipt</div>
        </div>
        <div id="doc-content-inv">${_docHtml(inv,'invoice')}</div>
        <div id="doc-content-rcp" style="display:none">${window.receiptPanel?window.receiptPanel(inv):_docHtml(inv,'receipt')}</div>`
      : _docHtml(inv, type);
    Modal.create(`modal-doc-${id}`,
      type==='both'?`${UI.icon('folder_open','sm')} ${inv.refNo} — Documents`:type==='receipt'?`${UI.icon('receipt','sm')} Receipt ${inv.refNo}`:`${UI.icon('receipt_long','sm')} Invoice ${inv.refNo}`,
      tabs,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-doc-${id}')">Close</button>
       <button class="btn btn-secondary" onclick="billingDownloadDoc('${id}')">${UI.icon('download','sm')} Download</button>
       <button class="btn btn-secondary" onclick="NockExport.copy(location.origin+'/doc/${inv.refNo}')">${UI.icon('link','sm')} Share</button>
       ${inv.status==='sent'?`<button class="btn btn-primary"
         onclick="Modal.close('modal-doc-${id}');billingUploadSlip('${id}')">
         ${UI.icon('upload_file','sm')} แนบสลิป</button>`:''}
       ${['pending','submitted','pending_verification'].includes(inv.status)?`<button class="btn btn-primary"
         onclick="Modal.close('modal-doc-${id}');billingConfirmPaid('${id}')">
         ${UI.icon('fact_check','sm')} Confirm Paid</button>`:''}`,
      'modal-lg');
  };

  window.docTabSwitch = function(tab) {
    const isInv = tab==='invoice';
    document.getElementById('doc-tab-inv').classList.toggle('active', isInv);
    document.getElementById('doc-tab-rcp').classList.toggle('active', !isInv);
    document.getElementById('doc-content-inv').style.display = isInv?'':'none';
    document.getElementById('doc-content-rcp').style.display = !isInv?'':'none';
  };

  /* ── ACTIONS ─────────────────────────────────────────────── */
  /* ตัดสต็อก Inventory ตาม book line ของบิล — เรียกครั้งเดียวต่อใบ */
  window.billingConsumeStock = function(inv) {
    if (!inv || inv._stockDone || !window.Inventory) return;
    (inv.lines||[]).filter(l=>l.itemId).forEach(l=>Inventory.consume(l.itemId, 1, `บิล ${inv.id}`));
    inv._stockDone = true;
  };
  /* ⭐ ปิด loop: บิลจ่ายแล้ว → นักเรียนเข้า Bus roster ตามวันรับ-ส่งที่เลือก
     Bus Route จะดึงคนนี้ขึ้นรถเฉพาะวันที่มี session (pickup=เช้า · dropoff=เย็น) */
  window.billingAddBusRoster = function(inv) {
    if (!inv || inv._busDone || !inv.busSessions?.length || !inv.busStudent) return;
    DB.busRoster = DB.busRoster || [];
    /* กันซ้ำ: 1 invoice = 1 roster entry */
    if (DB.busRoster.some(r => r.invoiceId === inv.id)) { inv._busDone = true; return; }
    DB.busRoster.push({
      invoiceId: inv.id,
      studentId: inv.busStudent.id,
      student:   inv.busStudent.name,
      grade:     inv.busStudent.grade,
      addr:      inv.busStudent.addr,
      branch:    inv.busStudent.branch,
      sessions:  inv.busSessions,          // [{date,pickup,dropoff}]
    });
    inv._busDone = true;
    if (window.BusRoute) BusRoute.rerender?.();
  };
  /* legacy alias — ยืนยันจ่ายทำที่ billing-payment.js (ต้องเช็ค statement ก่อน) */
  window.billingVerify = id => window.billingConfirmPaid?.(id);
  window.billingConfirm = id => window.billingConfirmPaid?.(id);
  window.billingSend = function(id) {
    /* ⚠️ ต้องแก้ที่ DB.invoices (ledger เป็นสำเนา — แก้แล้วหายตอน refresh) */
    const inv = (DB.invoices||[]).find(i=>i.id===id);
    if (!inv) return;
    inv.status = 'sent';
    inv.sentAt = new Date().toISOString().slice(0,10);
    _refreshBilling();
    showToast(`ส่งบิลให้ผู้ปกครองแล้ว ✓ — รอสลิปกลับมา`,'success');
  };
  /* ดาวน์โหลดเอกสาร invoice เป็นไฟล์ข้อความจริง */
  window.billingDownloadDoc = function(id) {
    const inv = ledger.find(i=>i.id===id); if (!inv) return;
    const lines = Utils.invoiceLines(inv).map(l=>`  ${l.desc}  ${Utils.currency(l.amount)}`).join('\n');
    const body = `INVOICE ${inv.refNo}\n${inv.name||''} · ${inv.date||''}\n\n${lines}\n\nSubtotal: ${Utils.currency(Utils.invoiceSubtotal(inv))}\nTotal: ${Utils.currency(inv.amount||Utils.invoiceSubtotal(inv))}\nStatus: ${inv.status}`;
    NockExport.text(`${inv.refNo}.txt`, body);
  };

  /* ── NEW INVOICE MODAL — multi-course line items + auto promotion ── */
  function niCourseOpts() {
    return DB.courses.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');
  }
  let _lineSeq = 0;
  function niLineRow() {
    const uid = 'L' + (++_lineSeq);
    return `<div class="ni-line" data-uid="${uid}" style="margin-bottom:10px">
      <div style="display:flex;gap:8px;align-items:center">
        <select class="form-input ni-line-course" style="flex:1" onchange="niRecalc()">
          <option value="">— Select course —</option>${niCourseOpts()}
        </select>
        <span class="ni-line-price text-muted" style="min-width:84px;text-align:right;font-size:13px">—</span>
        <button class="btn btn-secondary btn-sm" onclick="niRemoveLine(this)" title="Remove">${UI.icon('close','sm')}</button>
      </div>
      <div class="ni-line-sched"></div>
    </div>`;
  }

  window.openNewInvoice = function(preStudentId) {
    const stuOpts = DB.students.map(s=>
      `<option value="${s.id}" ${s.id===preStudentId?'selected':''}>${s.name}</option>`).join('');
    Modal.create('modal-new-invoice',`${UI.icon('add')} New Invoice`,
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);margin-bottom:var(--sp-3)">
      <div><label class="field-label">Student</label>
        <select id="ni-student" class="form-input" style="width:100%" onchange="niRecalc()">${stuOpts}</select></div>
      <div><label class="field-label">Payment Method</label>
        <select id="ni-method" class="form-input" style="width:100%">
          <option>Transfer</option><option>Cash</option><option>QR Code</option></select></div>
    </div>
    <label class="field-label">Courses <span class="text-muted" style="font-weight:400">· ค่ารถคิดจากวันเรียนของคอร์สที่เลือก</span></label>
    <div id="ni-lines">${niLineRow()}</div>
    <button class="btn btn-secondary btn-sm" style="margin:2px 0 var(--sp-3)" onclick="niAddLine()">
      ${UI.icon('add','sm')} Add course</button>
    <div id="ni-bus" style="margin-bottom:var(--sp-3)"></div>
    <div id="ni-books" style="margin-bottom:var(--sp-3)"></div>
    <div id="ni-fees" style="margin-bottom:var(--sp-3)"></div>
    <div id="ni-summary" style="background:var(--md-surface-mid);border-radius:8px;padding:12px 14px;font-size:13px"></div>`,
    /* 2 ปุ่มเท่านั้น — เงินเข้าทีหลังเสมอ ยืนยันจ่ายทำที่ตาราง (แนบสลิป → Confirm Paid) */
    `<button class="btn btn-secondary" onclick="Modal.close('modal-new-invoice')">Cancel</button>
     <button class="btn btn-secondary" onclick="niSave('draft')">${UI.icon('save','sm')} Save Draft</button>
     <button class="btn btn-primary"   onclick="niSave('sent')">${UI.icon('send','sm')} Create &amp; Send to Parent</button>`);
    _bookChecked = {}; _feeChecked = {};                    // reset book/fee choice ต่อใบใหม่
    window.CourseSched?.reset();                            // reset ตารางเรียนที่เลือกไว้ใบก่อน
    if (window.BusFee) BusFee.onChange(niRefreshSummary);   // toggle ค่ารถ → อัปเดตยอดรวม
    niRecalc();
  };

  /* ── Book catalog + ownership (learning book / dictionary) ── */
  const BOOK_CATALOG = {
    'Eng (Active)': [{id:'bk-ea',  name:'Learning Book · Eng (Active)', type:'learning', price:900},
                     {id:'bk-dict',name:'Dictionary',                    type:'dictionary', price:600}],
    'Eng':          [{id:'bk-eng', name:'Learning Book · Eng',          type:'learning', price:850},
                     {id:'bk-dict',name:'Dictionary',                    type:'dictionary', price:600}],
    'Eng (Grammar)':[{id:'bk-eg',  name:'Learning Book · Eng (Grammar)',type:'learning', price:850}],
    'Math':         [{id:'bk-math',name:'Learning Book · Math',         type:'learning', price:850}],
    'Science':      [{id:'bk-sci', name:'Learning Book · Science',      type:'learning', price:900}],
    'Thai':         [{id:'bk-thai',name:'Learning Book · Thai',         type:'learning', price:700}],
  };
  let _bookChecked = {};   // book id → bool (preserve user choice across recalc)

  /* รวมหนังสือจากคอร์สที่เลือก + เช็ค "มีแล้ว" (ต่อคน / ต่อครอบครัว)
     ⭐ ดึงจาก Inventory จริง (ราคา + grade coverage + stock) — spec 14
     ถ้าสาขานั้นยังไม่ได้ลงของใน Inventory → fallback BOOK_CATALOG เดิม */
  function niBookList(stu, lines) {
    const fam = stu ? (DB.families||[]).find(f => f.id === stu.familyId) : null;
    const owns = id => (stu?.ownedBooks||[]).includes(id) || (fam?.ownedItems||[]).includes(id);
    const seen = {}, out = [];
    lines.forEach(l => {
      const c = DB.courses.find(x => x.id === l.courseId);
      /* ⭐ bundle มีหลายวิชา → ต้องดึงหนังสือของทุกวิชา ไม่ใช่แค่วิชาแรก */
      const subs = (c?.subjects||[]).length ? c.subjects : [{ subject:c?.subjects?.[0]?.subject, grade:stu?.grade }];
      const books = [];
      subs.forEach(s => {
        const subj  = s.subject;
        const grade = s.grade || stu?.grade;
        let bk = window.Inventory ? Inventory.booksFor(subj, grade, stu?.branch) : [];
        if (!bk.length) bk = (BOOK_CATALOG[subj]||[]).map(b=>({ ...b, stock:null, outOfStock:false }));
        books.push(...bk);
      });
      books.forEach(b => {
        if (seen[b.id]) return; seen[b.id] = 1;   // dedup (เช่น dictionary ครั้งเดียว)
        const owned = owns(b.id);
        /* หมดสต็อก = ใส่บิลไม่ได้ (spec §33) */
        const checked = b.outOfStock ? false : ((b.id in _bookChecked) ? _bookChecked[b.id] : !owned);
        out.push({ ...b, owned, checked });
      });
    });
    return out;
  }
  function niBookTotal(stu, lines) {
    return niBookList(stu, lines).reduce((s,b)=> s + (b.checked ? b.price : 0), 0);
  }
  window.niBookToggle = function(id) {
    const cur = document.querySelector(`[data-book="${id}"]`);
    _bookChecked[id] = !(cur?.dataset.on === '1');
    niRecalc();
  };

  /* sibling discount — น้อง (อายุน้อยกว่า) ได้ลด % ถ้ามีพี่ที่ยัง active */
  function niSibling(stu, tuitionAfterPromo) {
    if (!stu?.familyId) return null;
    const sibs = DB.students.filter(s => s.familyId===stu.familyId && s.id!==stu.id
      && ['active','renewal'].includes(s.status));
    const hasOlder = sibs.some(s => (s.age||0) > (stu.age||0));
    if (!hasOlder) return null;
    const pct = 5;
    return { label:`Sibling discount −${pct}% (น้อง)`, amount: Math.round(tuitionAfterPromo*pct/100), pct };
  }

  /* course → วันเรียน (จาก DB.classes) สำหรับคิดค่ารถ */
  function niCourseEntries(courseId, branch) {
    const all = (DB.classes||[]).filter(c => c.courseId === courseId);
    const cls = all.find(c => c.branch === branch) || all[0];
    if (!cls) return null;
    const [h,m] = String(cls.startTime||'10:00').split(':').map(Number);
    const end = `${String(h + (cls.duration||2)).padStart(2,'0')}:${String(m||0).padStart(2,'0')}`;
    const code = (cls.subject||'').split(/[\s(]/).map(w=>w[0]).join('').slice(0,2).toUpperCase() || 'C';
    return { code, name:cls.name || courseId, color:CONST.SUBJECT_COLOR[cls.subject]||'blue',
             entries:(cls.days||[]).map(dow => ({ dow, start:cls.startTime, end })) };
  }

  /* วันเรียนของ "รอบที่เลือก" → ป้อนให้ BusFee
     ⭐ ใช้ sched.days (วันที่เด็กมาจริง) ไม่ใช่วันที่คลาสเปิดทั้งหมด —
        คลาสเปิด อ./พ./พฤ./ส. แต่เด็กมาแค่ อังคาร = ค่ารถ 1 วัน ไม่ใช่ 4 วัน */
  function niSchedEntries(l) {
    const r = l?.sched?.round;
    if (!r) return null;
    const days = (l.sched.days && l.sched.days.length) ? l.sched.days : r.days;
    const c0 = r.classes[0];
    const code = (c0.subject||'').split(/[\s(]/).map(w=>w[0]).join('').slice(0,2).toUpperCase() || 'C';
    const entries = [];
    days.forEach(dow => r.classes.forEach(c =>
      entries.push({ dow, start:c.startTime, end:CourseSched.endTime(c.startTime, c.duration) })));
    return { code, name:l.desc, color:CONST.SUBJECT_COLOR[c0.subject]||'blue', entries };
  }

  /* อ่าน 1 line จาก row → {desc,courseId,hours,amount,sched} หรือ null ถ้ายังไม่เลือก course
     ⭐ sched = ผลจาก CourseSched (คลาสที่เลือก + วันเริ่ม/วันจบ) — Admin ตอบผู้ปกครองได้ทันที */
  function niLineData(row, branch, stu) {
    const cid = row.querySelector('.ni-line-course')?.value;
    const c   = DB.courses.find(x=>x.id===cid);
    if (!c) return null;
    const uid   = row.dataset.uid;
    const sched = window.CourseSched ? CourseSched.resolve(uid, c.id, branch, stu) : null;

    /* Bundle คิดเป็น block (สัปดาห์ละครั้ง) — Regular คิดตามชั่วโมงต่อวิชา */
    let hours, amount;
    if (sched && sched.isBundle && !sched.empty) {
      const perBlock = (c.billingBlockSize||4) * (sched.round.classes[0]?.duration||2);
      hours  = perBlock * sched.blocks * sched.round.classes.length;
      amount = (c.billingBlockPrice||5900) * sched.blocks;
    } else {
      hours  = (c.subjects||[]).reduce((s,sub)=>s+(sub.hours||0),0);
      amount = (c.subjects||[]).reduce((s,sub)=>
        s+Utils.coursePrice({courseId:c.id, subject:sub.subject, grade:sub.grade, hours:sub.hours, branch}),0);
    }
    /* packageId = tier ที่ชั่วโมงตรงกัน — ให้โปรที่ผูก package match ได้ */
    const pkg = (DB.packages||[]).find(p => p.type==='hour' && p.hours===hours);
    return { uid, desc:c.name, courseId:c.id, packageId:pkg?.id||null, hours, amount, sched };
  }

  /* ── ค่าธรรมเนียมต่อสาขา (Settings ▸ Invoice ▸ Fees) ──────────
     Traveling = pickup/sent back · Entry = ครั้งเดียวตลอด · End test = ต่อคอร์ส
     _feeChecked เก็บว่า user ติ๊กอะไรบ้างในใบนี้ */
  let _feeChecked = {};
  function niFeeList(stu, lines) {
    if (!stu || !lines.length) return [];
    const f = Utils.branchFees(stu.branch);
    const nCourse = lines.length;
    const out = [];
    if (f.traveling?.on) {
      const t = f.traveling;
      const per = (t.pickup?.on?(t.pickup.cost||0):0) + (t.sentBack?.on?(t.sentBack.cost||0):0);
      if (per) {
        const dirs = [t.pickup?.on&&'รับ', t.sentBack?.on&&'ส่ง'].filter(Boolean).join('+');
        out.push({ id:'fee-travel', kind:'traveling', name:`ค่าเดินทาง (${dirs})`,
                   note:`${Utils.currency(per)} × ${nCourse} course`, price: per*nCourse, def:true });
      }
    }
    if (f.entry?.on && f.entry.cost) {
      const charged = Utils.entryFeeCharged(stu.id);
      out.push({ id:'fee-entry', kind:'entry', name:'ค่าแรกเข้า (Entry fee)',
                 note: charged ? 'เคยเก็บแล้ว — ไม่คิดซ้ำ' : 'เก็บครั้งเดียวตลอด',
                 price: f.entry.cost, def: !charged, owned: charged });
    }
    if (f.endTest?.on && f.endTest.cost) {
      out.push({ id:'fee-endtest', kind:'endTest', name:'ค่าสอบจบคอร์ส',
                 note:`${Utils.currency(f.endTest.cost)} × ${nCourse} course`,
                 price: f.endTest.cost*nCourse, def:true });
    }
    return out.map(x => ({ ...x, checked: _feeChecked[x.id] !== undefined ? _feeChecked[x.id] : x.def }));
  }
  function niFeeTotal(stu, lines) {
    return niFeeList(stu, lines).filter(f=>f.checked).reduce((s,f)=>s+f.price,0);
  }
  window.niFeeToggle = function(id) {
    const cur = document.querySelector(`[data-fee="${id}"]`)?.dataset.on === '1';
    _feeChecked[id] = !cur;
    niRecalc();
  };

  /* รวมข้อมูลจากฟอร์ม (single source = DOM) + อัปเดต label ราคารายบรรทัด */
  function niCollect() {
    const stu    = DB.students.find(x=>x.id===document.getElementById('ni-student')?.value);
    const branch = stu?.branch;
    const lines  = [];
    document.querySelectorAll('#ni-lines .ni-line').forEach(row=>{
      const d   = niLineData(row, branch, stu);
      const lbl = row.querySelector('.ni-line-price');
      const sch = row.querySelector('.ni-line-sched');
      if (d) { lines.push(d); if (lbl) lbl.textContent = Utils.currency(d.amount); }
      else if (lbl) lbl.textContent = '—';
      /* บล็อกตารางเรียน — ไม่ re-render ถ้าเนื้อหาเดิม (กัน date input เด้งตอนพิมพ์) */
      if (sch) {
        const html = d && window.CourseSched ? CourseSched.render(d.uid, d.sched) : '';
        if (sch.innerHTML !== html) sch.innerHTML = html;
      }
    });
    const promo = Utils.applyPromotion({ lines, branch });
    return { stu, branch, lines, promo };
  }

  window.niRecalc = function() {
    const { stu, branch, lines } = niCollect();
    /* ค่ารถจากคอร์สที่เลือก (วันเรียนจาก DB.classes) */
    const busEl = document.getElementById('ni-bus');
    if (busEl && window.BusFee) {
      /* ค่ารถคิดจาก "คลาสที่ Admin เลือกจริง" ไม่ใช่คลาสแรกที่เจอ */
      const busCourses = lines.map(l => niSchedEntries(l) || niCourseEntries(l.courseId, branch)).filter(Boolean);
      /* ⭐ วัน session จริงจาก CourseSched (เริ่มเรียน → จบคอร์ส) — union ทุกคอร์ส */
      const dateSet = new Set(); let startDate = null;
      lines.forEach(l => {
        const sc = l.sched;
        if (sc?.startDate && sc?.meetings && sc?.days && window.CourseSched) {
          const proj = CourseSched.projectDates(sc.days, sc.startDate, sc.meetings);
          (proj.dates || []).forEach(d => dateSet.add(d));
          if (!startDate || sc.startDate < startDate) startDate = sc.startDate;
        }
      });
      const dates = [...dateSet].sort();
      BusFee.compute(busCourses, { rate:100, weeks:4, startDate, dates: dates.length ? dates : null });
      busEl.innerHTML = busCourses.length ? BusFee.render() : '';
    }
    /* หนังสือ + เช็คของที่มีแล้ว */
    const bkEl = document.getElementById('ni-books');
    if (bkEl) {
      const books = niBookList(stu, lines);
      bkEl.innerHTML = books.length ? `
        <div style="border:1px solid var(--md-outline-variant);border-radius:10px;padding:10px 12px">
          <div style="font-weight:600;font-size:13px;margin-bottom:8px">${UI.icon('menu_book','sm')} Book fee (หนังสือ)</div>
          ${books.map(b=>`<div style="display:flex;align-items:center;gap:10px;padding:6px 0;font-size:13px;${b.outOfStock?'opacity:.55':''}">
            <span data-book="${b.id}" data-on="${b.checked?'1':'0'}"
              ${b.outOfStock?'title="หมดสต็อก — ใส่บิลไม่ได้"':`onclick="niBookToggle('${b.id}')"`}
              style="${b.outOfStock?'cursor:not-allowed':'cursor:pointer'};width:18px;height:18px;border-radius:4px;flex-shrink:0;display:inline-flex;
              align-items:center;justify-content:center;color:#fff;font-size:12px;
              border:1px solid ${b.checked?'var(--md-primary)':'var(--md-outline)'};background:${b.checked?'var(--md-primary)':'transparent'}">${b.checked?'✓':''}</span>
            <span style="flex:1">${b.name}
              ${b.owned?`<span class="badge badge-gray" style="font-size:9px;margin-left:4px">มีแล้ว</span>`:''}
              ${b.outOfStock?`<span class="badge badge-red" style="font-size:9px;margin-left:4px">หมดสต็อก</span>`
                : (b.stock!=null&&b.stock<=5?`<span class="badge badge-yellow" style="font-size:9px;margin-left:4px">เหลือ ${b.stock}</span>`:'')}</span>
            <strong>${Utils.currency(b.price)}</strong>
          </div>${b.outOfStock
              ?`<div class="text-error" style="font-size:10px;margin-left:28px;margin-top:-2px">
                 สั่งเพิ่มที่ Inventory ก่อนจึงจะใส่บิลได้</div>`
              :b.owned?`<div class="text-muted" style="font-size:10px;margin-left:28px;margin-top:-2px">
            ${b.type==='dictionary'?'พี่น้องในครอบครัวมี Dictionary แล้ว':'เคยซื้อเล่มนี้แล้ว'} — default ไม่คิดเงิน (กดเพื่อซื้อเพิ่ม)</div>`:''}`).join('')}
        </div>` : '';
    }
    /* ค่าธรรมเนียมของสาขา (Traveling / Entry / End course test) */
    const feeEl = document.getElementById('ni-fees');
    if (feeEl) {
      const fees = niFeeList(stu, lines);
      feeEl.innerHTML = fees.length ? `
        <div style="border:1px solid var(--md-outline-variant);border-radius:10px;padding:10px 12px">
          <div style="font-weight:600;font-size:13px;margin-bottom:8px">${UI.icon('receipt_long','sm')} ค่าธรรมเนียม (ตั้งที่ Settings ▸ Invoice)</div>
          ${fees.map(f=>`<div style="display:flex;align-items:center;gap:10px;padding:6px 0;font-size:13px">
            <span data-fee="${f.id}" data-on="${f.checked?'1':'0'}" onclick="niFeeToggle('${f.id}')"
              style="cursor:pointer;width:18px;height:18px;border-radius:4px;flex-shrink:0;display:inline-flex;
              align-items:center;justify-content:center;color:#fff;font-size:12px;
              border:1px solid ${f.checked?'var(--md-primary)':'var(--md-outline)'};background:${f.checked?'var(--md-primary)':'transparent'}">${f.checked?'✓':''}</span>
            <span style="flex:1">${f.name}
              ${f.owned?`<span class="badge badge-gray" style="font-size:9px;margin-left:4px">เก็บแล้ว</span>`:''}
              <div class="text-muted" style="font-size:10px">${f.note}</div></span>
            <strong>${Utils.currency(f.price)}</strong>
          </div>`).join('')}
        </div>` : '';
    }
    niRefreshSummary();
  };

  /* สรุปยอด = tuition (หลัง promo − sibling) + ค่ารถ + หนังสือ + ค่าธรรมเนียม */
  window.niRefreshSummary = function() {
    const { stu, lines, promo } = niCollect();
    const sib  = niSibling(stu, promo.total);
    const bus  = window.BusFee ? BusFee.total() : 0;
    const book = niBookTotal(stu, lines);
    const fee  = niFeeTotal(stu, lines);
    const grand = promo.total - (sib?.amount||0) + bus + book + fee;
    const box = document.getElementById('ni-summary');
    if (!box) return;
    const line = (label,val,cls)=>`<div style="display:flex;justify-content:space-between;margin-bottom:4px${cls?';color:'+cls:''}">
      <span ${cls?'':'class="text-muted"'}>${label}</span><span>${val}</span></div>`;
    box.innerHTML = `
      ${line('Subtotal (ค่าเรียน)', Utils.currency(promo.subtotal))}
      ${promo.discount?line(promo.discount.label, '−'+Utils.currency(promo.discount.amount), 'var(--md-success)'):''}
      ${sib?line(sib.label, '−'+Utils.currency(sib.amount), 'var(--md-success)'):''}
      ${bus?line(`${UI.icon('directions_bus','sm')} ค่ารถรับ-ส่ง`, Utils.currency(bus)):''}
      ${book?line(`${UI.icon('menu_book','sm')} ค่าหนังสือ`, Utils.currency(book)):''}
      ${niFeeList(stu,lines).filter(f=>f.checked).map(f=>
        line(`${UI.icon('receipt_long','sm')} ${f.name}`, Utils.currency(f.price))).join('')}
      <div style="display:flex;justify-content:space-between;font-weight:700;
        border-top:1px solid var(--md-outline-variant);padding-top:6px;margin-top:2px">
        <span>Total</span><span class="text-primary">${Utils.currency(grand)}</span></div>`;
  };

  window.niAddLine = function() {
    document.getElementById('ni-lines')?.insertAdjacentHTML('beforeend', niLineRow());
  };
  window.niRemoveLine = function(btn) {
    const rows = document.querySelectorAll('#ni-lines .ni-line');
    if (rows.length <= 1) {                       // เหลือบรรทัดเดียว = เคลียร์แทนการลบ
      const sel = btn.closest('.ni-line')?.querySelector('.ni-line-course');
      if (sel) sel.value = '';
    } else {
      btn.closest('.ni-line')?.remove();
    }
    niRecalc();
  };

  window.niSave = function(status) {
    const { stu, branch, lines, promo } = niCollect();
    if (!stu)          { showToast('Select a student','error'); return; }
    if (!lines.length) { showToast('Add at least one course','error'); return; }
    const maxNo = (DB.invoices||[]).reduce((m,i)=>{
      const n = parseInt(String(i.id).split('-').pop(),10); return isNaN(n)?m:Math.max(m,n); }, 0);
    const seq   = maxNo + 1;
    const today = new Date().toISOString().slice(0,10);
    const totalHours = lines.reduce((s,l)=>s+l.hours,0);
    const summary = lines.length===1
      ? lines[0].desc
      : `${lines.map(l=>l.desc.split(' ·')[0]).join(' + ')} · ${totalHours}h.`;
    const sib  = niSibling(stu, promo.total);
    const bus  = window.BusFee ? BusFee.total() : 0;
    const book = niBookTotal(stu, lines);
    const fee  = niFeeTotal(stu, lines);
    /* ⭐ ตารางเรียนที่ Admin ตกลงกับผู้ปกครองแล้ว — ติดไปกับ line เลย */
    const docLines = lines.map(l=>({
      desc:l.desc, hours:l.hours, amount:l.amount, packageId:l.packageId,
      courseId: l.courseId,
      classIds: l.sched?.classIds || [],
      days:      l.sched?.days     || null,     // วันที่นักเรียนมาเรียนจริง (1-2 วัน/สัปดาห์)
      perWeek:   l.sched?.perWeek  || null,
      startDate: l.sched?.startDate || null,
      endDate:   l.sched?.endDate   || null,
      meetings:  l.sched?.meetings  || null,
      blocks:    l.sched?.isBundle ? l.sched.blocks : null,
      schedLabel: l.sched?.round
        ? `${(l.sched.round.days||[]).join('+')} ${l.sched.round.classes[0]?.startTime||''} · ${l.sched.round.classes[0]?.teacher||''}`
        : null,
    }));
    /* itemId ไว้ตัดสต็อกตอนยืนยันจ่าย */
    niBookList(stu, lines).filter(b=>b.checked).forEach(b=>docLines.push({ desc:b.name, amount:b.price, fee:'book', itemId:b.id }));
    if (bus) docLines.push({ desc:'ค่ารถรับ-ส่ง (Traveling fee)', amount:bus, fee:'bus' });
    /* ค่าธรรมเนียมสาขา — feeKind ทำให้ Entry fee เช็คได้ว่าเคยเก็บแล้ว (Utils.entryFeeCharged) */
    niFeeList(stu, lines).filter(f=>f.checked).forEach(f=>
      docLines.push({ desc:f.name, amount:f.price, fee:'branch', feeKind:f.kind }));
    const discAmt = (promo.discount?.amount||0) + (sib?.amount||0);
    const discLabel = [promo.discount?.label, sib?.label].filter(Boolean).join(' · ');
    /* schedule options ต่อ course (คลาสที่ Admin เสนอให้ parent เลือก) */
    const scheduleOptions = {};
    lines.forEach(l => {
      const cls = (DB.classes||[]).filter(c => c.courseId===l.courseId && (!branch||c.branch===branch));
      scheduleOptions[l.courseId] = (cls.length?cls:(DB.classes||[]).filter(c=>c.courseId===l.courseId))
        .map(c => ({ classId:c.id, name:c.name, days:c.days, startTime:c.startTime,
                     duration:c.duration, teacher:c.teacher, room:c.room }));
    });
    /* ⭐ วันรับ-ส่งรถที่ผู้ปกครองเลือกราย session (BusFee) — เก็บไว้ push เข้า Bus Route ตอนจ่าย */
    const fam = (DB.families||[]).find(f=>f.id===stu.familyId);
    const busSessions = (bus && window.BusFee)
      ? BusFee.sessions().filter(s=>s.pickup||s.dropoff).map(s=>({ date:s.date, pickup:s.pickup, dropoff:s.dropoff }))
      : [];
    const inv = {
      id:`INV-2026-${String(seq).padStart(4,'0')}`,
      studentId:stu.id, familyId:stu.familyId, leadId:null,
      courseId: lines.length===1 ? lines[0].courseId : null,
      course: summary, hours: totalHours,
      lines: docLines,
      busSessions,
      busStudent: busSessions.length ? {
        id:stu.id, name:stu.name, grade:stu.grade, branch,
        addr: fam?.address || `${branch} (ที่อยู่จากฟอร์มผู้ปกครอง)`,
      } : null,
      discount: discAmt ? { label:discLabel, amount:discAmt } : null,
      amount: promo.total - (sib?.amount||0) + bus + book + fee, date:today, status, createdFrom:'billing',
      branch, method: document.getElementById('ni-method')?.value || 'Transfer',
      scheduleOptions,
      /* Admin เลือกคลาส+วันเริ่มไว้แล้วตอนคุยกับผู้ปกครอง — Parent Form แค่ยืนยัน/เปลี่ยน */
      chosenSchedule: lines.reduce((m,l) => {
        if (l.sched?.classIds?.length) m[l.courseId] = {
          classIds:l.sched.classIds, startDate:l.sched.startDate,
          endDate:l.sched.endDate,   meetings:l.sched.meetings,
          days:l.sched.days,         perWeek:l.sched.perWeek };
        return m;
      }, {}),
    };
    DB.invoices.unshift(inv);
    if (status==='paid') { billingConsumeStock(inv); billingAddBusRoster(inv); }   // ตัดสต็อก + เข้า Bus roster เมื่อจ่ายแล้ว
    showToast(status==='paid'?`Invoice created & marked Paid ✓`
      :status==='sent'?`Invoice sent to parent ✓`:`Invoice saved as Draft`,'success');
    Modal.close('modal-new-invoice');
    _refreshBilling();
  };

  /* ── PARENT FORM (Preview Form) — parent เลือก schedule + จ่าย + submit ──
     ฟอร์มเดียว 2-filler: parent กรอกเอง หรือ admin กรอกแทนตอนโทร */
  function classSlot(o) {
    const [h,m] = String(o.startTime||'10:00').split(':').map(Number);
    const end = `${String(h+(o.duration||2)).padStart(2,'0')}:${String(m||0).padStart(2,'0')}`;
    return `${(o.days||[]).join('/')} · ${o.startTime}-${end} · ${o.teacher?.replace(/Kru /g,'')||''} · ${o.room||''}`;
  }
  window.openParentForm = function(id) {
    const inv = DB.invoices.find(i=>i.id===id); if (!inv) return;
    const courseLines = (inv.lines||[]).filter(l=>!l.fee);
    const body = `
      <div class="text-muted" style="font-size:12px;margin-bottom:12px">
        ${UI.icon('info','sm')} ฟอร์มนี้ให้ผู้ปกครองเลือกวันเรียน แล้วชำระเงิน — Admin กรอกแทนได้ตอนโทร</div>
      ${courseLines.map(l=>{
        const cid  = l.courseId || Object.keys(inv.scheduleOptions||{}).find(k=>{
          const c=DB.courses.find(x=>x.id===k); return c && l.desc.startsWith((c.name||'').split(' ·')[0]); })
          || inv.courseId;
        const pick = inv.chosenSchedule?.[cid];
        const opts = (inv.scheduleOptions||{})[cid]||[];
        const dates = l.startDate
          ? `<div class="text-muted" style="font-size:11px;margin-bottom:6px">
               ${UI.icon('event','sm')} เริ่ม ${CourseSched.fmtTH(l.startDate)} → จบ ${CourseSched.fmtTH(l.endDate)} · ${l.meetings||'—'} ครั้ง</div>`
          : '';
        /* Bundle = ล็อกทั้งรอบ (หลายวิชาในวันเดียว) → ยืนยันอย่างเดียว เปลี่ยนรอบต้องกลับไปแก้บิล */
        const locked = (pick?.classIds||[]).length > 1;
        const body = locked
          ? `<div style="border:1px solid var(--md-outline-variant);border-radius:8px;padding:8px 10px;font-size:12px">
               ${pick.classIds.map(id=>{ const c=(DB.classes||[]).find(x=>x.id===id); return c
                 ? `<div>${(c.days||[]).join('/')} · ${c.startTime} · <b>${c.subject}</b> · ${c.teacher||''}</div>` : ''; }).join('')}
             </div>`
          : (opts.length?opts.map((o,i)=>`<label style="display:flex;align-items:center;gap:8px;padding:8px 10px;
            border:1px solid var(--md-outline-variant);border-radius:8px;margin-bottom:6px;cursor:pointer;font-size:13px">
            <input type="radio" name="pf-${cid}" value="${o.classId}" ${
              ((pick?.classIds||[]).includes(o.classId))||(!pick&&i===0)?'checked':''}
              style="accent-color:var(--md-primary)">
            ${classSlot(o)}</label>`).join('')
            :'<div class="text-muted" style="font-size:12px">ไม่มีตัวเลือกคลาส</div>');
        return `<div style="margin-bottom:14px">
          <div style="font-weight:600;font-size:13px;margin-bottom:4px">${l.desc}</div>
          ${dates}${body}
        </div>`;
      }).join('')}
      <div style="background:var(--md-surface-mid);border-radius:8px;padding:12px 14px;display:flex;align-items:center;gap:14px">
        <div style="width:72px;height:72px;background:#fff;border-radius:6px;display:flex;align-items:center;justify-content:center">
          ${UI.icon('qr_code_2','xl')}</div>
        <div style="flex:1;font-size:12px">
          <div style="font-weight:600">ชำระ ${Utils.currency(inv.amount)}</div>
          <div class="text-muted">สแกน QR / โอนเข้าบัญชี Nock Academy แล้วแนบสลิป</div>
          <div style="margin-top:6px">${UI.icon('attach_file','sm')} <span class="text-primary">แนบสลิป (mock)</span></div>
        </div>
      </div>`;
    Modal.create('modal-parent-form', `${UI.icon('assignment')} Preview Form · ${inv.student}`, body,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-parent-form')">Cancel</button>
       <button class="btn btn-primary" onclick="parentSubmit('${id}')">${UI.icon('send','sm')} Submit</button>`);
  };
  window.parentSubmit = function(id) {
    const inv = DB.invoices.find(i=>i.id===id); if (!inv) return;
    const chosen = {};
    Object.keys(inv.scheduleOptions||{}).forEach(cid=>{
      const r    = document.querySelector(`input[name="pf-${cid}"]:checked`);
      const prev = inv.chosenSchedule?.[cid] || {};
      if (r) chosen[cid] = { ...prev, classIds:[r.value] };
      else if (prev.classIds) chosen[cid] = prev;
    });
    inv.chosenSchedule = chosen;
    /* ผู้ปกครองแนบสลิปมาในฟอร์ม = มีสลิปแล้ว แต่ยังไม่ยืนยันเงินเข้า (ต้องเช็ค KBiz ก่อน) */
    inv.status  = 'pending';
    inv.payslip = inv.payslip || { dataUrl:'', name:'slip_from_parent.jpg', transferDate:new Date().toISOString().slice(0,10),
      amount:inv.amount, method:inv.method||'Transfer', uploadedBy:'Parent (form)', uploadedAt:new Date().toISOString().slice(0,10) };
    Modal.close('modal-parent-form');
    _refreshBilling();
    showToast('ผู้ปกครองส่งฟอร์ม + สลิปแล้ว — เช็ค statement ใน KBiz แล้วกด Confirm Paid', 'success');
  };

  /* ── ENROLL → เข้า roster คลาส (เรียกหลังยืนยันเงินเข้าแล้วเท่านั้น)
        billing-payment.js เรียกผ่าน Billing.enroll() — ไม่แตะ status เอง ── */
  function billingEnroll(inv) {
    const stu = DB.students.find(s=>s.id===inv.studentId);
    if (!stu) { showToast('ไม่พบนักเรียน','error'); return 0; }
    if (inv._enrolled) return 0;                    // กันสร้างซ้ำ
    let created = 0;
    Object.entries(inv.chosenSchedule||{}).forEach(([cid, pick])=>{
      /* pick = {classIds,startDate,…} (ใหม่) หรือ classId string (ใบเก่า) */
      const ids   = Array.isArray(pick?.classIds) ? pick.classIds : [pick];
      const line  = (inv.lines||[]).find(l => (l.classIds||[]).some(x=>ids.includes(x)));
      const start = pick?.startDate || line?.startDate || new Date().toISOString().slice(0,10);
      const course = DB.courses.find(c=>c.id===cid);
      ids.forEach(classId => {
        const cls = (DB.classes||[]).find(c=>c.id===classId); if (!cls) return;
        cls.students = cls.students || [];
        if (!cls.students.includes(stu.name)) cls.students.push(stu.name);   // เข้า roster → โผล่ใน Sessions/Calendar
        /* bundle = หลายวิชา → ชั่วโมงหารตามจำนวนคลาสในรอบ */
        const hours = Math.round((line?.hours || (course?.subjects||[]).reduce((s,x)=>s+(x.hours||0),0) || 24) / ids.length);
        DB.enrollments = DB.enrollments || [];
        DB.enrollments.push({ id:'enr-'+Date.now().toString(36)+created, studentId:stu.id, familyId:stu.familyId,
          courseId:cid, classId, subject:cls.subject, grade:cls.grade,
          packageHours:hours, usedHours:0, remainHours:hours, leaveUsed:0,
          status:'active', invoiceId:inv.id, branch:inv.branch,
          startDate:start, endDate:pick?.endDate || line?.endDate || null,
          days: pick?.days || line?.days || cls.days || null,   // วันที่มาเรียนจริง
          perWeek: pick?.perWeek || line?.perWeek || (cls.days||[]).length,
          teacher:cls.teacher });
        created++;
      });
    });
    inv._enrolled = true;
    if (window.Sync) Sync.studentCourses?.();
    return created;
  }

  /* ── expose to billing-receipt.js / billing-payment.js ── */
  window.Billing = {
    inv: id => ledger.find(i => i.id === id),
    src: id => (DB.invoices||[]).find(i => i.id === id),
    docHtml: (inv, type, opts) => _docHtml(inv, type, opts),
    refresh: () => { ledger = buildLedger(); renderKPI(); renderTable(); },
    enroll: billingEnroll,
    consumeStock: inv => billingConsumeStock(inv),
    addBusRoster: inv => billingAddBusRoster(inv),
  };

})();
