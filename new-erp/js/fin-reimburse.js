/* ============================================================
   fin-reimburse.js — Finance ▸ Reimbursement
   Staff front cash → upload proof (payslip required) → claim back.
   Anyone can create (incl. Teacher). A branch Admin+ handles it from
   the branch Petty Cash; if it's over their comfort they Forward it to
   Central (Director/Special) who pays from the Central Bank instead.

   Detail view = the shared FinPanel slide-over drawer (same visual
   language + Info/Logs tabs as Expenses/Requests, per FINANCE-MODEL.md
   §18) — NOT the old centred modal. Table stays 100% width; click a row
   → drawer slides in from the right.
   ============================================================ */
(function () {

  const U = () => window.CURRENT_USER;
  let fStatus = 'all';
  let selectedId = null;     // reimbursement open in the drawer (null = closed)
  let drawerTab = 'info';    // info | logs

  const STATUS = {
    pending:   { label:'Pending',            color:'yellow' },
    forwarded: { label:'Forwarded',          color:'blue'   },
    paid:      { label:'Paid',               color:'green'  },
    rejected:  { label:'Rejected',           color:'red'    },
  };
  // forward reasons come straight from Nock's mockup ("Forward Reason" modal)
  const FWD_REASONS = ['Amount too high', 'Problem with information', 'Wrong information', 'Other'];

  const catBadge = id => { const c = FIN.CAT_MAP[id]; return UI.badge(c?c.short:id, c?c.color:'gray'); };
  const initials = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dateShort = d => { const dt=new Date(d+'T00:00:00'); return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${String(dt.getFullYear()).slice(2)}`; };
  // status badge with aging suffix while still in flight (mirrors Requests)
  function statusAgingBadge(r){
    const sm = STATUS[r.status] || STATUS.pending;
    const inFlight = r.status==='pending' || r.status==='forwarded';
    return UI.badge(inFlight ? `${sm.label} · ${FIN.daysSince(r.submittedDate)}d` : sm.label, sm.color);
  }

  function render() {
    const list = FIN.reimbursementsFor(U());
    const action = FIN.reimActionableFor(U());
    const oldest = action.reduce((m, r) => Math.max(m, FIN.daysSince(r.submittedDate)), 0);
    const canReview = FIN.isReimApprover(U()) || FIN.isReimCentralApprover(U());

    const kpis = canReview ? [
      { icon:'bolt', label:'Needs your action', value:action.length, color: action.length?'warning':'success', sub: action.length?'Tap to review':'All clear' },
      { icon:'schedule', label:'Oldest wait', value: action.length?oldest+'d':'—', color: oldest>7?'error':'', sub:'Days since sent' },
      { icon:'check_circle', label:'Paid', value:list.filter(r=>r.status==='paid').length, color:'success', sub:'Reimbursed' },
      { icon:'block', label:'Rejected', value:list.filter(r=>r.status==='rejected').length, color:'', sub:'Declined' },
    ] : [
      { icon:'pending', label:'My pending', value:list.filter(r=>r.status==='pending'||r.status==='forwarded').length, color:'warning', sub:'Awaiting approval' },
      { icon:'check_circle', label:'My paid', value:list.filter(r=>r.status==='paid').length, color:'success', sub:'Reimbursed' },
      { icon:'block', label:'My rejected', value:list.filter(r=>r.status==='rejected').length, color:'', sub:'Declined' },
    ];

    const subText = canReview ? `${list.length} claim(s) · all branches` : `${list.length} of your claim(s)`;

    document.getElementById('view-fin-reimburse').innerHTML = `
      ${UI.pageHeader('Reimbursement', subText,
        `<button class="btn btn-primary" onclick="rbNew()">${UI.icon('add','sm')} New Claim</button>`)}
      <div id="rb-kpi"></div>
      ${canReview ? UI.filterBar([
        { label:'All',       active:fStatus==='all',       onclick:'rbFilter("all",this)' },
        { label:'Pending',   active:fStatus==='pending',   onclick:'rbFilter("pending",this)' },
        { label:'Forwarded', active:fStatus==='forwarded', onclick:'rbFilter("forwarded",this)' },
        { label:'Paid',      active:fStatus==='paid',      onclick:'rbFilter("paid",this)' },
        { label:'Rejected',  active:fStatus==='rejected',  onclick:'rbFilter("rejected",this)' },
      ]) : ''}
      <div class="card" style="margin-top:var(--sp-3)"><div style="overflow-x:auto">
        <table style="margin:0">
          <thead><tr>
            <th>Date</th><th>Category</th><th>Description</th>
            <th style="text-align:right">Amount</th><th>Requested by</th><th>Branch</th><th>Status</th><th></th>
          </tr></thead>
          <tbody id="rb-tbody"></tbody>
        </table>
      </div></div>
      <div id="rb-drawer-root"></div>`;

    const kel = document.getElementById('rb-kpi');
    kel.innerHTML = UI.kpiGrid(kpis);
    const g = kel.querySelector('.kpi-grid'); if (g) g.style.gridTemplateColumns = `repeat(${kpis.length},1fr)`;

    renderRows();
  }

  function renderRows() {
    const canReview = FIN.isReimApprover(U()) || FIN.isReimCentralApprover(U());
    let list = FIN.reimbursementsFor(U());
    if (canReview && fStatus !== 'all') list = list.filter(r => r.status === fStatus);
    const rank = r => (FIN.reimActor(U(), r) ? 0 : 1);   // things I can act on float to the top
    list.sort((a,b) => rank(a) - rank(b) || b.submittedDate.localeCompare(a.submittedDate));

    if (selectedId && !list.find(r => r.id === selectedId)) selectedId = null;

    document.getElementById('rb-tbody').innerHTML = list.map(r => {
      const sel = r.id === selectedId;
      const person = `<div style="display:flex;align-items:center;gap:9px">${UI.avatar(initials(r.requestedBy),'sm')}
        <div style="font-weight:500">${r.requestedBy}</div></div>`;
      return `<tr class="tr-click" style="${sel?'background:var(--md-primary-container)':''}" onclick="rbOpen('${r.id}')">
        <td class="text-muted" style="white-space:nowrap">${dateShort(r.date)}</td>
        <td>${catBadge(r.category)}</td>
        <td style="font-weight:500">${r.reason||'—'}</td>
        <td style="text-align:right;font-weight:600" class="text-error">−${Utils.currency(r.amount)}</td>
        <td>${person}</td>
        <td>${r.branch}</td>
        <td>${statusAgingBadge(r)}</td>
        <td style="text-align:center;color:var(--md-on-surface-variant)">${UI.icon('chevron_right','sm')}</td>
      </tr>`;
    }).join('') || `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--md-on-surface-variant)">No reimbursement claims</td></tr>`;
  }

  render();
  window._refreshFinReimburse = render;
  window.rbFilter = function (s, el) {
    fStatus = s;
    el.closest('.filter-bar').querySelectorAll('.filter-chip').forEach(c=>c.classList.remove('active'));
    el.classList.add('active'); renderRows();
  };

  /* ── DRAWER — Info tab (what → Payment method → Files → Workflow) +
     Logs tab (plain audit). Same shell as Expenses/Requests. ── */
  function whatBlock(r){
    return `${r.number ? `<div class="text-muted" style="font-size:var(--fs-label-sm);font-family:monospace">${r.number}</div>` : ''}
      <div style="font-size:var(--fs-title-sm);font-weight:700">${r.reason||'—'}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${UI.badge('Reimburse','pink')}${catBadge(r.category)}${statusAgingBadge(r)}</div>
      <div class="text-muted" style="font-size:var(--fs-label-md);margin-top:8px">${r.branch} BKK · ${dateShort(r.date)} · ${r.requestedBy}</div>`;
  }
  // where the company pays the money BACK to the staff member (mockup: Pay to / bank / acct / PromptPay / QR)
  function paymentSection(r){
    const hasPayback = r.payTo || r.payBank || r.payAcctNumber || r.payPromptPay;
    const qr = r.qrDataUrl
      ? `<div style="margin-top:10px"><div class="label" style="font-size:var(--fs-label-sm);color:var(--md-on-surface-variant);margin-bottom:4px">QR / PromptPay</div>
          <img src="${r.qrDataUrl}" style="width:96px;height:96px;object-fit:cover;border-radius:8px;border:1px solid var(--md-outline-variant);cursor:pointer" onclick="window.open('${r.qrDataUrl}','_blank')"></div>`
      : '';
    return `<div style="margin-top:var(--sp-3)">${FinPanel.card(`
      ${FinPanel.sectionLabel('Payment method — pay back to staff')}
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px">
        <div class="label" style="font-size:var(--fs-label-sm);color:var(--md-on-surface-variant)">Amount</div>
        <div style="font-weight:700" class="text-error">−${Utils.currency(r.amount)}</div>
      </div>
      ${hasPayback ? FinPanel.fieldRow('Pay to', r.payTo, r.payTo)
        + FinPanel.fieldRow('Bank', r.payBank, r.payBank)
        + FinPanel.fieldRow('Account number', r.payAcctNumber, r.payAcctNumber)
        + FinPanel.fieldRow('PromptPay', r.payPromptPay, r.payPromptPay)
        : `<div class="text-muted" style="font-size:var(--fs-label-sm);margin-top:8px">No payout account on file</div>`}
      ${qr}`)}</div>`;
  }
  function filesSection(r){
    const items = [
      { label:'Payslip / proof', name:r.payslipName, dataUrl:r.payslipDataUrl, type:r.payslipType },
      { label:'Tax invoice', name:r.taxInvoiceName, dataUrl:r.taxInvoiceDataUrl, type:r.taxInvoiceType },
    ];
    if (r.paybackSlipName || r.paybackSlipDataUrl)
      items.push({ label:'Payback slip', name:r.paybackSlipName, dataUrl:r.paybackSlipDataUrl, type:r.paybackSlipType });
    return `<div style="margin-top:var(--sp-3)">${FinPanel.card(FinPanel.sectionLabel('Files')+FinPanel.docGallery(items))}</div>`;
  }
  function workflowSteps(r){
    const steps = [{ label:'Request created', caption:`${r.requestedBy} · ${r.submittedDate}`, state:'done' }];
    const forwardedPath = r.status==='forwarded' || (r.forwardedBy && r.status!=='rejected');
    if (forwardedPath || r.forwardedBy) {
      steps.push({ label:'Forwarded to Central',
        caption:`${r.forwardedBy||''}${r.forwardReason?' — '+r.forwardReason:''}`,
        state: r.status==='forwarded' ? 'current' : 'done' });
    }
    if (r.status==='rejected') {
      steps.push({ label:'Rejected', caption:`${r.decidedBy||''}${r.remark?' — '+r.remark:''}`, state:'bad' });
    } else if (r.status==='paid') {
      steps.push({ label:'Approved', caption:r.decidedBy?`by ${r.decidedBy}${r.remark?' — '+r.remark:''}`:'', state:'done' });
      steps.push({ label:'Paid back', caption:`${r.paidDate||''} · from ${r.paybackSlipName?'':''}${r.forwardedBy?'Central Bank':'Branch Petty'}`, state:'done' });
    } else {
      steps.push({ label: r.status==='forwarded' ? 'Central approval' : 'Approval', caption:'', state: forwardedPath && r.status!=='forwarded' ? 'done' : (r.status==='forwarded' ? 'upcoming' : 'current') });
      steps.push({ label:'Paid back', caption:'', state:'upcoming' });
    }
    return steps;
  }
  function workflowSection(r){
    return `<div style="margin-top:var(--sp-3)">${FinPanel.card(FinPanel.sectionLabel('Workflow')+FinPanel.timeline(workflowSteps(r)))}</div>`;
  }
  function renderInfoTab(r){ return `${whatBlock(r)}${paymentSection(r)}${filesSection(r)}${workflowSection(r)}`; }

  const RB_LOG = { created:'Request created', forwarded:'Forwarded to Central', paid:'Paid back', rejected:'Rejected' };
  function auditLogs(r){
    const logs = [{ action:'created', by:r.requestedBy, at:r.submittedDate }];
    if (r.forwardedBy) logs.push({ action:'forwarded', by:r.forwardedBy, at:r.forwardedDate||r.submittedDate });
    if (r.status==='paid') logs.push({ action:'paid', by:r.decidedBy, at:r.paidDate });
    if (r.status==='rejected') logs.push({ action:'rejected', by:r.decidedBy, at:r.paidDate||r.submittedDate });
    return logs;
  }
  function renderLogsTab(r){ return FinPanel.timeline(FinPanel.auditItems(auditLogs(r), RB_LOG)); }

  /* ── footer — state + role driven (matches mockup: Forward | Reject | Approve) ── */
  function footer(r){
    const act = FIN.reimActor(U(), r);        // 'petty' | 'central' | null
    if (!act) {
      if (r.status==='forwarded')
        return `<div class="text-muted" style="font-size:var(--fs-label-sm);margin-top:var(--sp-3)">${UI.icon('hourglass_top','sm')} Forwarded to Central — waiting on Director/Special Admin</div>`;
      return '';   // paid / rejected / not-my-queue → read only
    }
    const remark = `<div style="margin-top:var(--sp-3)"><label class="field-label">Remark <span class="text-muted">(required to reject · optional to approve)</span></label>
      <textarea id="rb-remark" class="form-input" style="width:100%;min-height:56px" placeholder="Reason / note…"></textarea></div>
      <div style="margin-top:var(--sp-3)"><label class="field-label">Payback slip <span class="text-muted">(optional — attach the transfer proof)</span></label>
        <input type="file" id="rb-slip" class="form-input" style="width:100%" accept="image/*,application/pdf"></div>`;
    // pending at a branch admin → can Forward up · forwarded at Central → no forward again
    const forwardBtn = act==='petty'
      ? `<button class="btn btn-secondary" style="flex:1" onclick="rbForward('${r.id}')">${UI.icon('forward','sm')} Forward</button>`
      : '';
    const payLabel = act==='central' ? 'Approve &amp; Pay (Central)' : 'Approve &amp; Pay';
    return `${remark}
      <div style="display:flex;gap:8px;margin-top:var(--sp-3)">
        ${forwardBtn}
        <button class="btn btn-danger" style="flex:1" onclick="rbReject('${r.id}')">${UI.icon('close','sm')} Reject</button>
        <button class="btn btn-primary" style="flex:1" onclick="rbApprove('${r.id}')">${UI.icon('check','sm')} ${payLabel}</button>
      </div>`;
  }

  function renderDrawer(){
    if (!selectedId) return '';
    const r = DB.reimbursements.find(x => x.id === selectedId);
    if (!r) return '';
    const header = FinPanel.drawerHeader('Reimbursement detail','request_quote','rbClose');
    const tabsHtml = FinPanel.tabStrip([{key:'info',label:'Info'},{key:'logs',label:'Logs'}], drawerTab, 'rbSetTab');
    const content = drawerTab==='logs' ? renderLogsTab(r) : renderInfoTab(r);
    const body = `<div style="padding:var(--sp-4);overflow-y:auto;flex:1">${content}${drawerTab==='info'?footer(r):''}</div>`;
    return FinPanel.drawer(header+tabsHtml+body, 'rbClose', {width:460});
  }

  window.rbOpen = function (id) {
    selectedId = id; drawerTab = 'info';
    renderRows();
    document.getElementById('rb-drawer-root').innerHTML = renderDrawer();
  };
  window.rbSetTab = function (t) { drawerTab = t; document.getElementById('rb-drawer-root').innerHTML = renderDrawer(); };
  window.rbClose = function () { selectedId = null; document.getElementById('rb-drawer-root').innerHTML=''; renderRows(); };

  function readFile(f){ return new Promise(res => { if(!f) return res(null); const r=new FileReader(); r.onload=e=>res({name:f.name,dataUrl:e.target.result,type:f.type}); r.readAsDataURL(f); }); }

  window.rbApprove = function (id) {
    const remark = document.getElementById('rb-remark')?.value || '';
    const slipFile = document.getElementById('rb-slip')?.files[0];
    readFile(slipFile).then(slip => {
      const r = FIN.payReimbursement(id, U(), remark, slip);
      if (!r) { showToast('Not authorized', 'error'); return; }
      selectedId = null; render();
      if (window._refreshFinance) window._refreshFinance();
      if (window._refreshFinDashboard) window._refreshFinDashboard();
      const from = r.forwardedBy ? 'Central Bank' : `${r.branch} Petty Cash`;
      showToast(`Paid ${Utils.currency(r.amount)} from ${from} ✓`, 'success');
    });
  };
  window.rbReject = function (id) {
    const remark = document.getElementById('rb-remark')?.value || '';
    const res = FIN.rejectReimbursement(id, U(), remark);
    if (res === 'remark_required') { showToast('A remark is required to reject', 'error'); return; }
    if (!res) { showToast('Not authorized', 'error'); return; }
    selectedId = null; render(); showToast('Claim rejected', 'info');
  };

  /* ── FORWARD to Central (mockup "Forward Reason" modal) ── */
  window.rbForward = function (id) {
    Modal.create('modal-rb-fwd', `${UI.icon('forward')} Forward to Central`,
    `<p class="text-muted" style="font-size:var(--fs-body-sm);margin-bottom:var(--sp-3)">
       ส่งต่อคำขอนี้ให้ Director / Special Admin ตรวจและจ่ายจาก Central Bank แทน — เลือกเหตุผล</p>
     <label class="field-label">Forward reason</label>
     <select id="rb-fwd-reason" class="form-input" style="width:100%">
       ${FWD_REASONS.map(x=>`<option value="${x}">${x}</option>`).join('')}</select>
     <div style="margin-top:var(--sp-3)"><label class="field-label">Detail <span class="text-muted">(optional)</span></label>
       <textarea id="rb-fwd-note" class="form-input" style="width:100%;min-height:56px" placeholder="รายละเอียดเพิ่มเติม…"></textarea></div>`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-rb-fwd')">Cancel</button>
     <button class="btn btn-primary" onclick="rbForwardSave('${id}')">${UI.icon('forward','sm')} Forward Request</button>`);
  };
  window.rbForwardSave = function (id) {
    const reason = document.getElementById('rb-fwd-reason').value;
    const note = document.getElementById('rb-fwd-note').value.trim();
    const full = note ? `${reason} — ${note}` : reason;
    const res = FIN.forwardReimbursement(id, U(), full);
    if (res === 'reason_required') { showToast('Pick a forward reason', 'error'); return; }
    if (!res) { showToast('Not authorized', 'error'); return; }
    Modal.close('modal-rb-fwd'); selectedId = null; render();
    if (window._refreshFinDashboard) window._refreshFinDashboard();
    showToast('Forwarded to Central ✓ — waiting on Director/Special', 'info');
  };

  /* ── NEW CLAIM MODAL — now captures where to pay the staff back ── */
  window.rbNew = function () {
    const vb = FIN.visibleBranches(U());
    const branches = vb.length ? vb : [U().branch];
    const cats = FIN.CATEGORIES.filter(c => !['Received','Income','Salary','Rental'].includes(c.id));
    const today = new Date().toISOString().slice(0,10);
    Modal.create('modal-rb-new', `${UI.icon('add')} New Reimbursement Claim`,
    `<p class="text-muted" style="font-size:var(--fs-body-sm);margin-bottom:var(--sp-3)">
       For money you paid out of pocket. Attach a payslip (required) + your payout account so it can be paid back.</p>
     <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3)">
      <div><label class="field-label">Date you paid</label>
        <input type="date" id="rn-date" class="form-input" style="width:100%" value="${today}"></div>
      <div><label class="field-label">Branch</label>
        <select id="rn-branch" class="form-input" style="width:100%">${branches.map(b=>`<option value="${b}">${b}</option>`).join('')}</select></div>
      <div><label class="field-label">Category</label>
        <select id="rn-cat" class="form-input" style="width:100%">${cats.map(c=>`<option value="${c.id}">${c.short}</option>`).join('')}</select></div>
      <div><label class="field-label">Amount (THB)</label>
        <input type="number" id="rn-amt" class="form-input" style="width:100%"></div>
     </div>
     <div style="margin-top:var(--sp-3)"><label class="field-label">What was it for?</label>
       <input type="text" id="rn-reason" class="form-input" style="width:100%" placeholder="e.g. Taxi to district office"></div>

     <div class="text-muted" style="font-size:var(--fs-label-sm);margin-top:var(--sp-4);margin-bottom:var(--sp-2)">${UI.icon('account_balance','sm')} Pay back to</div>
     <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3)">
      <div><label class="field-label">Pay to (name)</label>
        <input type="text" id="rn-payto" class="form-input" style="width:100%" placeholder="e.g. Somchai Jaidee"></div>
      <div><label class="field-label">Bank</label>
        <input type="text" id="rn-bank" class="form-input" style="width:100%" placeholder="e.g. KBank"></div>
      <div><label class="field-label">Account number</label>
        <input type="text" id="rn-acct" class="form-input" style="width:100%" placeholder="e.g. 123-4-56789-0"></div>
      <div><label class="field-label">PromptPay</label>
        <input type="text" id="rn-pp" class="form-input" style="width:100%" placeholder="e.g. 08x-xxx-xxxx"></div>
     </div>

     <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);margin-top:var(--sp-3)">
      <div><label class="field-label">Payslip / proof <span class="text-error">*required</span></label>
        <input type="file" id="rn-payslip" class="form-input" style="width:100%" accept="image/*,application/pdf"></div>
      <div><label class="field-label">Tax invoice <span class="text-muted">(optional)</span></label>
        <input type="file" id="rn-tax" class="form-input" style="width:100%" accept="image/*,application/pdf"></div>
      <div><label class="field-label">QR code <span class="text-muted">(optional)</span></label>
        <input type="file" id="rn-qr" class="form-input" style="width:100%" accept="image/*"></div>
     </div>`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-rb-new')">Cancel</button>
     <button class="btn btn-primary" onclick="rbSubmit()">${UI.icon('send','sm')} Submit Claim</button>`, 'modal-lg');
  };
  window.rbSubmit = function () {
    const g = id => document.getElementById(id);
    const amt = parseFloat(g('rn-amt').value) || 0;
    const reason = g('rn-reason').value.trim();
    const payslip = g('rn-payslip').files[0];
    if (!amt) { showToast('Enter an amount', 'error'); return; }
    if (!reason) { showToast('Add what it was for', 'error'); return; }
    if (!payslip) { showToast('Payslip is required', 'error'); return; }
    Promise.all([readFile(payslip), readFile(g('rn-tax').files[0]), readFile(g('rn-qr').files[0])]).then(([ps, tx, qr]) => {
      FIN.addReimbursement({
        date: g('rn-date').value, branch: g('rn-branch').value, category: g('rn-cat').value,
        amount: amt, reason,
        payTo: g('rn-payto').value.trim(), payBank: g('rn-bank').value.trim(),
        payAcctNumber: g('rn-acct').value.trim(), payPromptPay: g('rn-pp').value.trim(),
        payslipName: ps?ps.name:null, payslipDataUrl: ps?ps.dataUrl:null, payslipType: ps?ps.type:null,
        taxInvoiceName: tx?tx.name:null, taxInvoiceDataUrl: tx?tx.dataUrl:null, taxInvoiceType: tx?tx.type:null,
        qrName: qr?qr.name:null, qrDataUrl: qr?qr.dataUrl:null, qrType: qr?qr.type:null,
      });
      Modal.close('modal-rb-new'); render();
      showToast('Reimbursement claim submitted ✓', 'success');
    });
  };

})();
