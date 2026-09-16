/* billing.js — NockERP Billing Module
   Invoice + Receipt always paired (same REF#, two documents)
   Flow: Draft → Sent → Pending Verification → Paid */
(function () {

  /* ── DATA ────────────────────────────────────────────────── */
  function buildLedger() {
    const rows = [];
    DB.students.forEach(s => {
      (s.invoices||[]).forEach(inv => {
        rows.push({
          id:       inv.id,
          refNo:    _refNo(inv.id),
          student:  s.name,
          studentId:s.id,
          family:   s.family,
          branch:   s.branch,
          course:   inv.course,
          amount:   inv.amount,
          date:     inv.date,
          status:   inv.status||'paid',
          payslip:  inv.payslip||null,
          method:   inv.payslip?.method||'Transfer',
        });
      });
    });
    // Mock draft & pending
    rows.push(
      { id:'INV-2026-0055', refNo:'6905-55', student:'Mia Tanaka', studentId:'mia',
        family:'Tanaka Family', branch:'Sukhumvit',
        course:'Eng (Active) ป.4 · 48h.', amount:14400, date:'2026-05-20',
        status:'pending', payslip:null, method:'Transfer' },
      { id:'INV-2026-0056', refNo:'6905-56', student:'Tom Chen', studentId:'tom',
        family:'Chen Family', branch:'Sukhumvit',
        course:'Math ป.6 · 48h.', amount:14400, date:'2026-05-22',
        status:'draft', payslip:null, method:'Transfer' }
    );
    rows.sort((a,b)=>b.date.localeCompare(a.date));
    return rows;
  }

  function _refNo(invId) {
    const n = parseInt((invId||'').split('-').pop()||'1',10);
    return `6905-${String(n).padStart(2,'0')}`;
  }

  const STATUS = {
    paid:    {cls:'badge-green',  label:'Paid',               icon:'✅'},
    pending: {cls:'badge-yellow', label:'Pending Verification',icon:'⏳'},
    draft:   {cls:'badge-gray',   label:'Draft',              icon:'📝'},
    sent:    {cls:'badge-blue',   label:'Sent to Parent',     icon:'📤'},
  };

  let ledger       = buildLedger();
  let filterStatus = 'all';
  let filterDoc    = 'all'; // 'all'|'invoice'|'receipt'
  let searchVal    = '';

  /* ── SHELL ───────────────────────────────────────────────── */
  document.getElementById('view-billing').innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Billing</div>
      <div class="page-sub" id="billing-sub">Loading…</div>
    </div>
    <button class="btn btn-primary btn-sm" onclick="openNewInvoice()">＋ New Invoice</button>
  </div>

  <!-- KPI -->
  <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:14px">
    <div class="card" style="padding:12px 14px">
      <div style="font-size:17px;font-weight:700;color:#10b981" id="kpi-revenue">—</div>
      <div style="font-size:11px;color:#6b7280;margin-top:1px">Revenue</div>
    </div>
    <div class="card" style="padding:12px 14px" id="kpi-pending-card">
      <div style="font-size:20px;font-weight:700;color:#f59e0b" id="kpi-pending">—</div>
      <div style="font-size:11px;color:#6b7280;margin-top:1px">Pending</div>
    </div>
    <div class="card" style="padding:12px 14px">
      <div style="font-size:20px;font-weight:700;color:#9ca3af" id="kpi-draft">—</div>
      <div style="font-size:11px;color:#6b7280;margin-top:1px">Draft</div>
    </div>
    <div class="card" style="padding:12px 14px">
      <div style="font-size:20px;font-weight:700;color:#10b981" id="kpi-paid">—</div>
      <div style="font-size:11px;color:#6b7280;margin-top:1px">Paid</div>
    </div>
    <div class="card" style="padding:12px 14px">
      <div style="font-size:20px;font-weight:700;color:#6366f1" id="kpi-total">—</div>
      <div style="font-size:11px;color:#6b7280;margin-top:1px">Total Documents</div>
    </div>
  </div>

  <!-- FILTER BAR -->
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
    <input placeholder="Search invoice, student, course…"
      style="border:1px solid #e5e7eb;border-radius:6px;padding:6px 10px;font-size:13px;outline:none;width:230px"
      oninput="billingSearch(this.value)">
    <div style="display:flex;gap:4px">
      <div class="filter-chip active" data-bs="all"     onclick="billingFilter('all',this)">All</div>
      <div class="filter-chip"        data-bs="paid"    onclick="billingFilter('paid',this)">✅ Paid</div>
      <div class="filter-chip"        data-bs="pending" onclick="billingFilter('pending',this)">⏳ Pending</div>
      <div class="filter-chip"        data-bs="draft"   onclick="billingFilter('draft',this)">📝 Draft</div>
    </div>
    <div style="display:flex;gap:4px;margin-left:8px">
      <div class="filter-chip active" data-bd="all"     onclick="billingDocFilter('all',this)">INV+RCP</div>
      <div class="filter-chip"        data-bd="invoice" onclick="billingDocFilter('invoice',this)">Invoice only</div>
      <div class="filter-chip"        data-bd="receipt" onclick="billingDocFilter('receipt',this)">Receipt only</div>
    </div>
  </div>

  <!-- TABLE -->
  <div class="card" style="padding:0;overflow:hidden">
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Ref #</th>
            <th>Student</th>
            <th>Course</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Status</th>
            <th>Documents</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="billing-tbody"></tbody>
      </table>
    </div>
  </div>`;

  /* ── KPI ─────────────────────────────────────────────────── */
  function renderKPI() {
    const paid    = ledger.filter(i=>i.status==='paid');
    const pending = ledger.filter(i=>i.status==='pending');
    const draft   = ledger.filter(i=>i.status==='draft');
    const revenue = paid.reduce((s,i)=>s+i.amount,0);
    document.getElementById('kpi-revenue').textContent = `฿${(revenue/1000).toFixed(0)}K`;
    document.getElementById('kpi-pending').textContent = pending.length;
    document.getElementById('kpi-draft').textContent   = draft.length;
    document.getElementById('kpi-paid').textContent    = paid.length;
    document.getElementById('kpi-total').textContent   = ledger.length;
    const pc = document.getElementById('kpi-pending-card');
    if (pc) pc.style.borderColor = pending.length ? '#f59e0b' : '';
  }

  /* ── TABLE ───────────────────────────────────────────────── */
  function renderTable() {
    let list = [...ledger];
    if (filterStatus !== 'all') list = list.filter(i=>i.status===filterStatus);
    if (searchVal) {
      const q = searchVal.toLowerCase();
      list = list.filter(i=>(i.id+i.student+i.course+i.refNo).toLowerCase().includes(q));
    }
    const sub = document.getElementById('billing-sub');
    if (sub) sub.textContent = `${list.length} record${list.length!==1?'s':''} shown`;

    document.getElementById('billing-tbody').innerHTML = list.map(inv => {
      const sm  = STATUS[inv.status]||STATUS.draft;
      const isPaid    = inv.status==='paid';
      const isPending = inv.status==='pending';
      const showInv = filterDoc !== 'receipt';
      const showRcp = filterDoc !== 'invoice';
      const docBtns = `
        ${showInv?`<button class="btn btn-secondary btn-sm" style="font-size:10px"
          onclick="event.stopPropagation();openDocPreview('${inv.id}','invoice')">📄 INV</button>`:''}
        ${showRcp&&isPaid?`<button class="btn btn-secondary btn-sm" style="font-size:10px;margin-left:2px"
          onclick="event.stopPropagation();openDocPreview('${inv.id}','receipt')">🧾 RCP</button>`:''}
        ${isPaid?`<button class="btn btn-secondary btn-sm" style="font-size:10px;margin-left:2px"
          onclick="event.stopPropagation();openDocPreview('${inv.id}','both')">⬇ Both</button>`:''}`;
      return `<tr style="cursor:pointer" onclick="openDocPreview('${inv.id}','${isPaid?'both':'invoice'}')">
        <td style="font-size:11px;font-weight:600;color:#6366f1">${inv.refNo}</td>
        <td>
          <div style="font-weight:500;font-size:13px">${inv.student}</div>
          <div style="font-size:11px;color:#9ca3af">${inv.family}</div>
        </td>
        <td style="font-size:12px;color:#374151">${inv.course}</td>
        <td style="font-weight:600">฿${inv.amount.toLocaleString()}</td>
        <td style="font-size:12px;color:#6b7280">${inv.date}</td>
        <td><span class="badge ${sm.cls}">${sm.icon} ${sm.label}</span></td>
        <td style="white-space:nowrap">${docBtns}</td>
        <td onclick="event.stopPropagation()" style="white-space:nowrap">
          ${isPending?`<button class="btn btn-primary btn-sm" style="font-size:11px"
            onclick="billingVerify('${inv.id}')">Verify ✓</button>`:''}
          ${inv.status==='draft'?`<button class="btn btn-secondary btn-sm" style="font-size:11px"
            onclick="billingSend('${inv.id}')">Send →</button>`:''}
        </td>
      </tr>`;
    }).join('');
  }

  renderKPI(); renderTable();

  /* ── FILTERS ─────────────────────────────────────────────── */
  window.billingSearch    = v => { searchVal=v; renderTable(); };
  window.billingFilter    = function(s,el) {
    filterStatus=s;
    document.querySelectorAll('[data-bs]').forEach(c=>c.classList.remove('active'));
    el.classList.add('active'); renderTable();
  };
  window.billingDocFilter = function(d,el) {
    filterDoc=d;
    document.querySelectorAll('[data-bd]').forEach(c=>c.classList.remove('active'));
    el.classList.add('active'); renderTable();
  };

  /* ── DOCUMENT PREVIEW ────────────────────────────────────── */
  function _docHtml(inv, type) {
    const isRcp  = type==='receipt';
    const title  = isRcp ? 'ใบเสร็จรับเงิน' : 'ใบแจ้งหนี้';
    const titleEN= isRcp ? 'RECEIPT' : 'INVOICE';
    const color  = isRcp ? '#10b981' : '#6366f1';
    const dueRow = !isRcp ? `<tr><td style="padding:6px 8px;font-size:11px;color:#6b7280">*Due By:</td>
      <td style="padding:6px 8px;font-size:11px;font-weight:600">${inv.date.slice(0,7)}-28</td></tr>` : '';
    const paid   = isRcp ? `<div style="position:absolute;top:20px;right:20px;border:3px solid #10b981;
      color:#10b981;font-size:28px;font-weight:900;padding:4px 10px;border-radius:4px;
      opacity:.35;transform:rotate(-8deg);pointer-events:none">PAID</div>` : '';
    return `<div style="position:relative;font-family:Arial,sans-serif;max-width:560px;margin:0 auto;
      padding:24px;border:1px solid #e5e7eb;border-radius:8px;font-size:12px;background:#fff">
      ${paid}
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div>
          <div style="font-size:16px;font-weight:700;color:#1a1d23">Nock Academy</div>
          <div style="font-size:10px;color:#9ca3af;margin-top:2px">${inv.branch} Branch</div>
          <div style="font-size:10px;color:#9ca3af">Tax ID: 0-1053-56789-01-2</div>
        </div>
        <div style="text-align:right">
          <div style="font-size:20px;font-weight:800;color:${color}">${titleEN}</div>
          <div style="font-size:10px;color:#6b7280">${title}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;background:#f9fafb;
        padding:10px 14px;border-radius:6px;margin-bottom:16px">
        <div><div style="font-size:9px;color:#9ca3af;text-transform:uppercase">NO.</div>
          <div style="font-weight:700;font-size:13px;color:${color}">${inv.refNo}</div></div>
        <div><div style="font-size:9px;color:#9ca3af;text-transform:uppercase">Date</div>
          <div style="font-weight:600">${inv.date}</div></div>
        <div><div style="font-size:9px;color:#9ca3af;text-transform:uppercase">Branch</div>
          <div style="font-weight:600">${inv.branch}</div></div>
      </div>
      <div style="margin-bottom:16px">
        <div style="font-size:9px;color:#9ca3af;text-transform:uppercase;margin-bottom:4px">Bill To</div>
        <div style="font-weight:600;font-size:13px">${inv.student}</div>
        <div style="font-size:11px;color:#6b7280">${inv.family}</div>
      </div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <thead><tr style="background:#f3f4f6">
          <th style="padding:8px;font-size:10px;color:#6b7280;font-weight:600;text-align:left">#</th>
          <th style="padding:8px;font-size:10px;color:#6b7280;font-weight:600;text-align:left">Description / รายการ</th>
          <th style="padding:8px;font-size:10px;color:#6b7280;font-weight:600;text-align:center">Qty</th>
          <th style="padding:8px;font-size:10px;color:#6b7280;font-weight:600;text-align:right">Unit Price</th>
          <th style="padding:8px;font-size:10px;color:#6b7280;font-weight:600;text-align:right">Amount</th>
        </tr></thead>
        <tbody><tr>
          <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6">1</td>
          <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;font-weight:500">${inv.course}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;text-align:center">1</td>
          <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;text-align:right">฿${inv.amount.toLocaleString()}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #f3f4f6;text-align:right;font-weight:700">฿${inv.amount.toLocaleString()}</td>
        </tr></tbody>
      </table>
      <div style="display:flex;justify-content:space-between;gap:16px;margin-bottom:16px">
        <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:6px;padding:10px;font-size:11px">
          <div style="font-weight:600;margin-bottom:4px;color:#374151">ช่องทางชำระเงิน</div>
          <div>ธนาคารกรุงศรีอยุธยา</div>
          <div>เลขที่บัญชี: 5991616726</div>
          <div>ชื่อบัญชี: Nock Academy Co., Ltd.</div>
          <div>ประเภท: ออมทรัพย์</div>
        </div>
        <div style="min-width:180px">
          <table style="width:100%;font-size:11px">
            <tr><td style="padding:4px 8px;color:#6b7280">Sub Total</td>
              <td style="padding:4px 8px;text-align:right">฿${inv.amount.toLocaleString()}</td></tr>
            <tr><td style="padding:4px 8px;color:#6b7280">VAT 7%</td>
              <td style="padding:4px 8px;text-align:right">฿0</td></tr>
            ${dueRow}
            <tr style="border-top:2px solid #1a1d23">
              <td style="padding:6px 8px;font-weight:700">Total</td>
              <td style="padding:6px 8px;text-align:right;font-weight:700;font-size:14px;color:${color}">฿${inv.amount.toLocaleString()}</td>
            </tr>
          </table>
        </div>
      </div>
      <div style="display:flex;justify-content:space-around;padding-top:16px;border-top:1px solid #e5e7eb;margin-top:8px">
        <div style="text-align:center">
          <div style="font-size:9px;color:#9ca3af;text-transform:uppercase">ผู้จัดทำ / Prepared by</div>
          <div style="margin:20px 0 4px;font-size:11px">Admin Nock</div>
          <div style="border-top:1px solid #374151;width:120px;margin:0 auto"></div>
        </div>
        <div style="text-align:center">
          <div style="font-size:9px;color:#9ca3af;text-transform:uppercase">ผู้มีอำนาจ / Authorized</div>
          <div style="margin:20px 0 4px;font-size:11px">Nock (Director)</div>
          <div style="border-top:1px solid #374151;width:120px;margin:0 auto"></div>
        </div>
      </div>
    </div>`;
  }

  window.openDocPreview = function(id, type) {
    const inv = ledger.find(i=>i.id===id);
    if (!inv) return;
    const tabs = type==='both'
      ? `<div style="display:flex;gap:0;margin-bottom:16px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
          <button id="doc-tab-inv" onclick="docTabSwitch('invoice')"
            style="flex:1;padding:8px;font-size:13px;font-weight:600;border:none;background:#6366f1;color:#fff;cursor:pointer">📄 Invoice</button>
          <button id="doc-tab-rcp" onclick="docTabSwitch('receipt')"
            style="flex:1;padding:8px;font-size:13px;font-weight:600;border:none;background:#fff;color:#6b7280;cursor:pointer">🧾 Receipt</button>
        </div>
        <div id="doc-content-inv">${_docHtml(inv,'invoice')}</div>
        <div id="doc-content-rcp" style="display:none">${_docHtml(inv,'receipt')}</div>`
      : _docHtml(inv, type);

    Modal.create(`modal-doc-${id}`,
      type==='both' ? `📋 ${inv.refNo} — Documents` : type==='receipt' ? `🧾 Receipt ${inv.refNo}` : `📄 Invoice ${inv.refNo}`,
      tabs,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-doc-${id}')">Close</button>
       <button class="btn btn-secondary" onclick="showToast('Print/Download coming soon','info')">⬇ Download</button>
       <button class="btn btn-secondary" onclick="showToast('Share link coming soon','info')">🔗 Share</button>
       ${inv.status==='pending'?`<button class="btn btn-primary" onclick="billingVerify('${id}');Modal.close('modal-doc-${id}')">✅ Verify & Mark Paid</button>`:''}`,
      'modal-lg');
  };

  window.docTabSwitch = function(tab) {
    const isInv = tab==='invoice';
    document.getElementById('doc-tab-inv').style.background = isInv ? '#6366f1' : '#fff';
    document.getElementById('doc-tab-inv').style.color      = isInv ? '#fff' : '#6b7280';
    document.getElementById('doc-tab-rcp').style.background = !isInv ? '#10b981' : '#fff';
    document.getElementById('doc-tab-rcp').style.color      = !isInv ? '#fff' : '#6b7280';
    document.getElementById('doc-content-inv').style.display= isInv ? '' : 'none';
    document.getElementById('doc-content-rcp').style.display= !isInv ? '' : 'none';
  };

  /* ── STATUS ACTIONS ──────────────────────────────────────── */
  window.billingVerify = function(id) {
    const inv = ledger.find(i=>i.id===id);
    if (!inv) return;
    inv.status = 'paid';
    renderKPI(); renderTable();
    showToast(`${inv.refNo} verified → Paid ✓`, 'success');
  };
  window.billingSend = function(id) {
    const inv = ledger.find(i=>i.id===id);
    if (!inv) return;
    inv.status = 'sent';
    renderKPI(); renderTable();
    showToast(`Invoice ${inv.refNo} sent to parent ✓`, 'success');
  };

  /* ── NEW INVOICE MODAL ───────────────────────────────────── */
  window.openNewInvoice = function(preStudentId) {
    const stuOpts = DB.students.map(s=>
      `<option value="${s.id}" ${s.id===preStudentId?'selected':''}>${s.name}</option>`
    ).join('');
    const crsOpts = DB.courses.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');

    Modal.create('modal-new-invoice','＋ New Invoice',
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px">Student</label>
        <select id="ni-student" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:7px 10px;font-size:13px;outline:none">
          ${stuOpts}
        </select>
      </div>
      <div>
        <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px">Course</label>
        <select id="ni-course" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:7px 10px;font-size:13px;outline:none"
          onchange="niAutoAmount()">
          <option value="">— Select course —</option>
          ${crsOpts}
        </select>
      </div>
      <div>
        <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px">Amount (฿)</label>
        <input id="ni-amount" type="number" step="100" placeholder="Auto from pricing"
          style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:7px 10px;font-size:13px;outline:none;box-sizing:border-box">
      </div>
      <div>
        <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px">Payment Method</label>
        <select id="ni-method" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:7px 10px;font-size:13px;outline:none">
          <option>Transfer</option><option>Cash</option><option>QR Code</option>
        </select>
      </div>
    </div>
    <div style="margin-bottom:12px">
      <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px">Due Date <span style="color:#9ca3af">(optional — Liclass model)</span></label>
      <input id="ni-due" type="date" style="border:1px solid #e5e7eb;border-radius:6px;padding:7px 10px;font-size:13px;outline:none">
    </div>
    <div>
      <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px">Note <span style="color:#9ca3af">(optional)</span></label>
      <input id="ni-note" type="text" placeholder="e.g. Renewal, new enrollment…"
        style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:7px 10px;font-size:13px;outline:none;box-sizing:border-box">
    </div>`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-new-invoice')">Cancel</button>
     <button class="btn btn-secondary" onclick="niSave('draft')">💾 Save Draft</button>
     <button class="btn btn-secondary" onclick="niSave('sent')">📤 Send to Parent</button>
     <button class="btn btn-primary"   onclick="niSave('paid')">✅ Mark as Paid</button>`
    );
  };

  window.niAutoAmount = function() {
    const cid  = document.getElementById('ni-course')?.value;
    const stuId= document.getElementById('ni-student')?.value;
    const c    = DB.courses.find(x=>x.id===cid);
    const s    = DB.students.find(x=>x.id===stuId);
    if (!c||!s) return;
    const branch = s.branch;
    const price  = c.subjects.reduce((sum,sub) => {
      return sum + ((DB.branchPricing[branch]||{})['h'+sub.hours]||0);
    },0);
    const el = document.getElementById('ni-amount');
    if (el && price) el.value = price;
  };

  window.niSave = function(status) {
    const stuId  = document.getElementById('ni-student')?.value;
    const cid    = document.getElementById('ni-course')?.value;
    const amount = parseInt(document.getElementById('ni-amount')?.value||0);
    const stu    = DB.students.find(x=>x.id===stuId);
    const crs    = DB.courses.find(x=>x.id===cid);
    if (!stu)    { showToast('Select a student','error'); return; }
    if (!amount) { showToast('Enter an amount','error');  return; }
    const seq   = ledger.length + 1;
    const today = new Date().toISOString().slice(0,10);
    const inv = {
      id:`INV-2026-${String(seq).padStart(4,'0')}`,
      refNo:`6905-${String(seq).padStart(2,'0')}`,
      student:stu.name, studentId:stu.id, family:stu.family, branch:stu.branch,
      course: crs ? crs.name : 'Manual',
      amount, date:today, status, payslip:null, method:'Transfer',
    };
    ledger.unshift(inv);
    stu.invoices = stu.invoices||[];
    stu.invoices.push({ id:inv.id, date:today, amount, status, course:inv.course });
    showToast(
      status==='paid' ? `Invoice ${inv.refNo} created & marked Paid ✓` :
      status==='sent' ? `Invoice ${inv.refNo} created & sent to parent ✓` :
      `Invoice ${inv.refNo} saved as Draft`,
      'success'
    );
    Modal.close('modal-new-invoice');
    renderKPI(); renderTable();
  };

})();
