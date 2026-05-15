/* ============================================================
   billing.js — NockERP Billing Module
   Aggregates invoices from DB.students + renders invoice table
   ============================================================ */
(function () {

  /* ── AGGREGATE ALL INVOICES FROM DB ──────────────────── */
  function buildInvoiceList() {
    const rows = [];

    /* Real invoices from DB.students */
    DB.students.forEach(s => {
      (s.invoices || []).forEach(inv => {
        rows.push({
          id:       inv.id,
          student:  s.name,
          family:   s.family,
          course:   inv.course,
          amount:   inv.amount,
          date:     inv.date,
          status:   inv.status || 'paid',
        });
      });
    });

    /* Mock pending invoices (for demo / badge count) */
    rows.push(
      { id:'INV-2026-0051', student:'Mia Tanaka',  family:'Tanaka Family',
        course:'Eng Active 48h.', amount:14400, date:'2026-05-13', status:'pending' },
      { id:'INV-2026-0052', student:'Tom Chen',    family:'Chen Family',
        course:'Math G6 36h.',   amount:10800, date:'2026-05-14', status:'draft'   },
    );

    /* Sort newest first */
    rows.sort((a,b) => b.date.localeCompare(a.date));
    return rows;
  }

  /* ── COURSE FORMAT: "Math G6 36h." → [Math G6:36h.] ── */
  function fmtCourse(raw) {
    /* raw could be "Eng Active 48h." or "Math G6 36h." */
    const m = (raw||'').match(/^(.+?)\s+(\d+h\.)$/);
    if (m) return `<span style="font-size:11px;background:#f3f4f6;border:1px solid #e5e7eb;
      border-radius:4px;padding:1px 6px;color:#374151;font-family:monospace">[${m[1].trim()}:${m[2]}]</span>`;
    return `<span style="font-size:11px;color:#6b7280">${raw||'—'}</span>`;
  }

  /* ── STATUS META ──────────────────────────────────────── */
  const STATUS_META = {
    paid:    { cls:'badge-green',  label:'Paid',               icon:'✅' },
    pending: { cls:'badge-yellow', label:'Pending Verification', icon:'⏳' },
    draft:   { cls:'badge-gray',   label:'Draft',               icon:'📝' },
    overdue: { cls:'badge-red',    label:'Overdue',             icon:'🚨' },
  };

  /* ── STATE ────────────────────────────────────────────── */
  let allInvoices  = buildInvoiceList();
  let filterStatus = 'all';
  let searchVal    = '';

  /* ── SHELL ────────────────────────────────────────────── */
  document.getElementById('view-billing').innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Billing</div>
      <div class="page-sub" id="billing-sub">Loading…</div>
    </div>
    <button class="btn btn-primary btn-sm" onclick="openNewInvoice()">＋ New Invoice</button>
  </div>

  <!-- KPI Row -->
  <div class="kpi-grid mb-16" id="billing-kpi" style="grid-template-columns:repeat(4,1fr)"></div>

  <!-- Filter Bar -->
  <div class="card mb-16" style="padding:12px 16px">
    <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <input id="billing-search" placeholder="🔍 Search invoice, student, family…"
        style="flex:1;min-width:180px;border:1px solid #e5e7eb;border-radius:7px;
               padding:7px 11px;font-size:12px;outline:none"
        oninput="billingSearch(this.value)">
      <div style="display:flex;gap:5px">
        <div class="filter-chip active" onclick="billingFilter('all',this)">All</div>
        <div class="filter-chip" onclick="billingFilter('paid',this)">✅ Paid</div>
        <div class="filter-chip" onclick="billingFilter('pending',this)">⏳ Pending</div>
        <div class="filter-chip" onclick="billingFilter('draft',this)">📝 Draft</div>
      </div>
    </div>
  </div>

  <!-- Invoice Table -->
  <div class="card">
    <div class="table-wrap">
      <table id="billing-table">
        <thead>
          <tr>
            <th>Invoice</th>
            <th>Student</th>
            <th>Family</th>
            <th>Course</th>
            <th>Amount</th>
            <th>Date</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="billing-tbody"></tbody>
      </table>
    </div>
  </div>`;

  /* ── RENDER KPI ───────────────────────────────────────── */
  function renderKPI() {
    const paid    = allInvoices.filter(i=>i.status==='paid');
    const pending = allInvoices.filter(i=>i.status==='pending');
    const draft   = allInvoices.filter(i=>i.status==='draft');
    const totalRev = paid.reduce((s,i)=>s+i.amount,0);
    const pendAmt  = pending.reduce((s,i)=>s+i.amount,0);

    document.getElementById('billing-kpi').innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d1fae5">💰</div>
        <div class="kpi-label">Total Revenue</div>
        <div class="kpi-value">฿${totalRev.toLocaleString()}</div>
        <div class="kpi-change up">${paid.length} invoice${paid.length!==1?'s':''} paid</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fef3c7">⏳</div>
        <div class="kpi-label">Pending Verification</div>
        <div class="kpi-value" style="color:${pending.length>0?'#f59e0b':'#10b981'}">${pending.length}</div>
        <div class="kpi-change ${pending.length>0?'down':'up'}">
          ${pending.length>0?`฿${pendAmt.toLocaleString()} waiting`:'All clear ✓'}
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#f3f4f6">📝</div>
        <div class="kpi-label">Draft</div>
        <div class="kpi-value">${draft.length}</div>
        <div class="kpi-change">Awaiting send</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#ede9fe">📊</div>
        <div class="kpi-label">Total Invoices</div>
        <div class="kpi-value">${allInvoices.length}</div>
        <div class="kpi-change up">All time</div>
      </div>`;
  }

  /* ── RENDER TABLE ─────────────────────────────────────── */
  function renderTable() {
    let filtered = allInvoices;
    if (filterStatus !== 'all') filtered = filtered.filter(i => i.status === filterStatus);
    if (searchVal) {
      const q = searchVal.toLowerCase();
      filtered = filtered.filter(i =>
        (i.id+i.student+i.family+i.course).toLowerCase().includes(q));
    }

    const sub = document.getElementById('billing-sub');
    if (sub) sub.textContent = `${filtered.length} invoice${filtered.length!==1?'s':''} shown`;

    const tbody = document.getElementById('billing-tbody');
    if (!tbody) return;

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:28px;color:#9ca3af">
        No invoices found</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(inv => {
      const sm = STATUS_META[inv.status] || STATUS_META.draft;
      const isPending = inv.status === 'pending';
      return `<tr style="cursor:pointer" onclick="openInvoiceModal('${inv.id}')">
        <td style="font-size:11px;font-weight:600;color:#6366f1">${inv.id}</td>
        <td>
          <span style="cursor:pointer;color:#1a1d23;font-weight:500"
                onclick="event.stopPropagation();openProfileModal('${inv.student}')">${inv.student}</span>
        </td>
        <td style="font-size:12px;color:#6b7280">${inv.family}</td>
        <td>${fmtCourse(inv.course)}</td>
        <td style="font-weight:600">฿${inv.amount.toLocaleString()}</td>
        <td style="font-size:12px;color:#6b7280">${inv.date}</td>
        <td><span class="badge ${sm.cls}">${sm.icon} ${sm.label}</span></td>
        <td>
          ${isPending
            ? `<button class="btn btn-primary btn-sm"
                 onclick="event.stopPropagation();verifyInvoice('${inv.id}')">Verify ✓</button>`
            : `<button class="btn btn-secondary btn-sm"
                 onclick="event.stopPropagation();openInvoiceModal('${inv.id}')">View</button>`}
        </td>
      </tr>`;
    }).join('');
  }

  /* ── FILTERS ──────────────────────────────────────────── */
  window.billingFilter = function (status, el) {
    filterStatus = status;
    document.querySelectorAll('#view-billing .filter-chip').forEach(c=>c.classList.remove('active'));
    el.classList.add('active');
    renderTable();
  };
  window.billingSearch = function (val) { searchVal = val; renderTable(); };

  /* ── VERIFY INVOICE ───────────────────────────────────── */
  window.verifyInvoice = function (id) {
    const inv = allInvoices.find(i => i.id === id);
    if (!inv) return;
    inv.status = 'paid';
    renderKPI();
    renderTable();
    showToast(`${id} verified & marked as Paid ✓`, 'success');
  };

  /* ── INVOICE DETAIL MODAL ─────────────────────────────── */
  window.openInvoiceModal = function (id) {
    const inv = allInvoices.find(i => i.id === id);
    if (!inv) return;
    const sm = STATUS_META[inv.status] || STATUS_META.draft;
    Modal.create(`modal-inv-${id}`, `🧾 ${id}`,
      `<div class="modal-section">
        <div class="modal-section-title">Invoice Details</div>
        <div class="info-grid">
          <div class="info-item"><div class="label">Invoice No.</div>
            <strong style="color:#6366f1">${inv.id}</strong></div>
          <div class="info-item"><div class="label">Date</div>${inv.date}</div>
          <div class="info-item"><div class="label">Student</div>
            <span style="cursor:pointer;color:#6366f1"
                  onclick="openProfileModal('${inv.student}')">${inv.student}</span></div>
          <div class="info-item"><div class="label">Family</div>${inv.family}</div>
          <div class="info-item"><div class="label">Course</div>${fmtCourse(inv.course)}</div>
          <div class="info-item"><div class="label">Amount</div>
            <strong style="font-size:18px">฿${inv.amount.toLocaleString()}</strong></div>
          <div class="info-item"><div class="label">Status</div>
            <span class="badge ${sm.cls}">${sm.icon} ${sm.label}</span></div>
        </div>
      </div>
      ${inv.status === 'pending' ? `
      <div class="modal-section">
        <div class="modal-section-title">Payment Slip</div>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;
                    padding:16px;text-align:center;color:#9ca3af;font-size:13px">
          📎 Payment slip received via LINE<br>
          <span style="font-size:11px">Tap Verify to confirm &amp; mark as Paid</span>
        </div>
      </div>` : ''}`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-inv-${id}')">Close</button>
       ${inv.status === 'pending'
         ? `<button class="btn btn-primary"
                onclick="verifyInvoice('${id}');Modal.close('modal-inv-${id}')">✅ Verify &amp; Mark Paid</button>`
         : `<button class="btn btn-secondary" onclick="showToast('Print coming soon','info')">🖨️ Print</button>`}`
    );
  };

  /* ── NEW INVOICE MODAL ────────────────────────────────── */
  window.openNewInvoice = function () {
    Modal.create('modal-new-invoice', '＋ New Invoice',
      `<div class="modal-section">
        <div class="settings-row" style="margin-bottom:12px">
          <div>
            <label class="settings-label">Student</label>
            <select class="settings-input">
              ${DB.students.map(s=>`<option>${s.name}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="settings-label">Course</label>
            <select class="settings-input">
              ${CONST.SUBJECTS.map(s=>`<option>${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="settings-row" style="margin-bottom:12px">
          <div>
            <label class="settings-label">Hours</label>
            <select class="settings-input">
              <option>12h.</option><option>24h.</option>
              <option selected>36h.</option><option>48h.</option>
            </select>
          </div>
          <div>
            <label class="settings-label">Amount (฿)</label>
            <input type="number" class="settings-input" value="10800" step="100">
          </div>
        </div>
        <div>
          <label class="settings-label">Note (optional)</label>
          <input class="settings-input" placeholder="e.g. Renewal, new enrollment…">
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-new-invoice')">Cancel</button>
       <button class="btn btn-primary"
               onclick="showToast('Invoice created as Draft ✓','success');Modal.close('modal-new-invoice')">
         📄 Create Draft</button>`
    );
  };

  /* ── INIT ─────────────────────────────────────────────── */
  renderKPI();
  renderTable();

})();
