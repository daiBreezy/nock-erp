/* ============================================================
   fin-recurring.js — Finance ▸ Recurring (Salary / Rent / Utilities)
   Per-branch payroll breakdown · status · 6-month forecast.
   Director / Special Admin create. No post/inactive on the table.
   ============================================================ */
(function () {

  const U = () => window.CURRENT_USER;
  const canManage = () => FIN.isSpecial(U()) || U().role === 'director';
  const ROLE_LBL = { teacher:'Teacher', admin:'Admin', manager:'Manager', area_manager:'Area Mgr', director:'Director' };
  const STATUS = { paid:{label:'Paid',color:'green'}, due:{label:'Due',color:'red'}, scheduled:{label:'Scheduled',color:'yellow'} };
  const statusBadge = t => { const s = STATUS[FIN.recurringStatus(t)] || STATUS.scheduled; return UI.badge(s.label, s.color); };
  const ordinal = d => { const s=['th','st','nd','rd'], v=d%100; return d+(s[(v-20)%10]||s[v]||s[0]); };
  function fmtK(n){ return n>=1e6?`฿${(n/1e6).toFixed(2)}M`:n>=1e3?`฿${Math.round(n/1e3)}K`:`฿${Math.round(n)}`; }

  function render() {
    const list = FIN.recurringFor(U());
    const salary = list.filter(t => t.type === 'salary');
    const other  = list.filter(t => t.type !== 'salary');
    const salTotal = salary.reduce((s,t)=>s+FIN.recurringAmount(t),0);
    const othTotal = other.reduce((s,t)=>s+FIN.recurringAmount(t),0);
    const nextDay = Math.min(...list.map(t=>t.dayOfMonth).filter(d=>d>=29).concat(list.map(t=>t.dayOfMonth)));

    const create = canManage()
      ? `<button class="btn btn-primary" onclick="recCreate()">${UI.icon('add','sm')} New Recurring</button>`
      : `<span class="text-muted" style="font-size:var(--fs-label-md)">${UI.icon('lock','sm')} View only</span>`;

    /* salary cards — one per branch, with payee breakdown */
    const salaryCards = salary.map(t => {
      const rows = (t.lines||[]).map(l => `<tr>
        <td>${l.name}</td><td>${UI.badge(ROLE_LBL[l.role]||l.role,'gray')}</td>
        <td style="text-align:right;font-weight:600">${Utils.currency(l.amount)}</td></tr>`).join('');
      return `<div class="card" style="padding:0;overflow:hidden">
        <div style="display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--md-outline-variant)">
          <div><div style="font-weight:700">${t.label} · ${t.branch}</div>
            <div class="text-muted" style="font-size:var(--fs-label-sm)">${(t.lines||[]).length} staff · pays ${ordinal(t.dayOfMonth)} / month</div></div>
          <div style="text-align:right"><div style="font-weight:700;font-size:var(--fs-title-sm)">${Utils.currency(FIN.recurringAmount(t))}</div>
            <div style="margin-top:2px">${statusBadge(t)}</div></div>
        </div>
        <div style="overflow-x:auto"><table style="margin:0">
          <thead><tr><th>Staff</th><th>Role</th><th style="text-align:right">Salary / month</th></tr></thead>
          <tbody>${rows}</tbody></table></div>
      </div>`;
    }).join('') || UI.emptyState('groups','No payroll set up','Create a Staff Payroll to assign per-branch salaries');

    /* other recurring table */
    const otherRows = other.map(t => `<tr>
      <td style="font-weight:500">${t.label}</td>
      <td>${UI.badge(t.type==='rental'?'Rent':'Utility', t.type==='rental'?'teal':'yellow')}</td>
      <td>${t.branch||'<span class="text-muted">Company</span>'}</td>
      <td>${t.payee||'—'}</td>
      <td style="text-align:right;font-weight:600">${Utils.currency(t.amount)}</td>
      <td class="text-muted">${ordinal(t.dayOfMonth)} / month</td>
      <td>${statusBadge(t)}</td></tr>`).join('');

    /* forecast */
    const fc = FIN.forecast(U(), 6);
    const fcRows = fc.map(r => `<tr>
      <td>${monthLabel(r.ym)}</td>
      <td style="text-align:right">${Utils.currency(r.salary)}</td>
      <td style="text-align:right">${Utils.currency(r.other)}</td>
      <td style="text-align:right;font-weight:700">${Utils.currency(r.total)}</td></tr>`).join('');
    const fc6 = fc.reduce((s,r)=>s+r.total,0);

    document.getElementById('view-fin-recurring').innerHTML = `
      ${UI.pageHeader('Recurring Payments', `${list.length} active · ${FIN.visibleBranches(U()).length} branch(es)`, create)}
      <div id="rc-kpi"></div>

      ${UI.sectionTitle(`${UI.icon('groups','sm')} Staff Payroll — by branch`)}
      <div class="card-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:var(--sp-3);align-items:start">${salaryCards}</div>

      <div style="margin-top:var(--sp-4)">
      ${UI.sectionTitle(`${UI.icon('home_work','sm')} Rent & Utilities`)}
      <div class="card"><div style="overflow-x:auto"><table>
        <thead><tr><th>Payment</th><th>Type</th><th>Branch</th><th>Payee</th>
          <th style="text-align:right">Amount</th><th>Schedule</th><th>Status</th></tr></thead>
        <tbody>${otherRows||'<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--md-on-surface-variant)">None</td></tr>'}</tbody>
      </table></div></div></div>

      <div style="margin-top:var(--sp-4)">
      ${UI.sectionTitle(`${UI.icon('trending_up','sm')} Forecast — next 6 months`, `<span class="text-muted" style="font-size:var(--fs-label-md)">Projected total: <b>${Utils.currency(fc6)}</b></span>`)}
      <div class="card"><div style="overflow-x:auto"><table>
        <thead><tr><th>Month</th><th style="text-align:right">Salary</th><th style="text-align:right">Rent & Util.</th><th style="text-align:right">Total</th></tr></thead>
        <tbody>${fcRows}</tbody></table></div></div></div>`;

    const kel = document.getElementById('rc-kpi');
    kel.innerHTML = UI.kpiGrid([
      { icon:'payments', label:'Monthly total', value:fmtK(salTotal+othTotal), color:'tertiary', sub:'All recurring' },
      { icon:'groups', label:'Salary', value:fmtK(salTotal), color:'', sub:`${salary.reduce((s,t)=>s+(t.lines||[]).length,0)} staff` },
      { icon:'home_work', label:'Rent & Utilities', value:fmtK(othTotal), color:'', sub:`${other.length} items` },
      { icon:'event', label:'Next payout', value:`Day ${isFinite(nextDay)?nextDay:'—'}`, color:'', sub:'This month' },
    ]);
    const g = kel.querySelector('.kpi-grid'); if (g) g.style.gridTemplateColumns = 'repeat(4,1fr)';
  }
  function monthLabel(ym){ const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [y,m]=ym.split('-').map(Number); return `${M[m-1]} ${y}`; }

  render();
  window._refreshFinRecurring = render;

  /* ── CREATE MODAL (type toggle: Salary / Rent) ───────────── */
  window.recCreate = function () {
    if (!canManage()) return;
    const vb = FIN.branches();
    Modal.create('modal-rc-new', `${UI.icon('add')} New Recurring Payment`,
    `<div class="tabs" style="margin-bottom:var(--sp-4)">
       <div id="rc-tab-sal" class="tab active" onclick="recTab('salary')">${UI.icon('groups','sm')} Staff Payroll</div>
       <div id="rc-tab-oth" class="tab" onclick="recTab('other')">${UI.icon('home_work','sm')} Rent / Utility</div>
     </div>
     <!-- SALARY -->
     <div id="rc-form-sal">
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);margin-bottom:var(--sp-3)">
         <div><label class="field-label">Branch</label>
           <select id="rs-branch" class="form-input" style="width:100%" onchange="recLoadStaff()">
             ${vb.map(b=>`<option value="${b}">${b}</option>`).join('')}</select></div>
         <div><label class="field-label">Pay day (of month)</label>
           <input type="number" id="rs-day" class="form-input" style="width:100%" min="1" max="28" value="25"></div>
       </div>
       <label class="field-label">Payees (edit amounts as needed)</label>
       <div id="rs-lines" style="margin-top:6px"></div>
       <div id="rs-total" class="text-muted" style="margin-top:8px;font-size:var(--fs-label-md);text-align:right"></div>
     </div>
     <!-- OTHER -->
     <div id="rc-form-oth" hidden>
       <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3)">
         <div><label class="field-label">Label</label>
           <input type="text" id="ro-label" class="form-input" style="width:100%" placeholder="e.g. Office Rent"></div>
         <div><label class="field-label">Type</label>
           <select id="ro-type" class="form-input" style="width:100%"><option value="rental">Rent</option><option value="utility">Utility</option></select></div>
         <div><label class="field-label">Branch</label>
           <select id="ro-branch" class="form-input" style="width:100%">${vb.map(b=>`<option value="${b}">${b}</option>`).join('')}</select></div>
         <div><label class="field-label">Payee</label>
           <input type="text" id="ro-payee" class="form-input" style="width:100%" placeholder="e.g. Landlord"></div>
         <div><label class="field-label">Amount (THB)</label>
           <input type="number" id="ro-amt" class="form-input" style="width:100%"></div>
         <div><label class="field-label">Pay day (of month)</label>
           <input type="number" id="ro-day" class="form-input" style="width:100%" min="1" max="28" value="1"></div>
       </div>
     </div>`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-rc-new')">Cancel</button>
     <button class="btn btn-primary" id="rc-save" onclick="recSave()">${UI.icon('save','sm')} Create Payroll</button>`,
     'modal-lg');
    recLoadStaff();
  };

  let recMode = 'salary';
  window.recTab = function (mode) {
    recMode = mode;
    document.getElementById('rc-tab-sal').classList.toggle('active', mode==='salary');
    document.getElementById('rc-tab-oth').classList.toggle('active', mode==='other');
    document.getElementById('rc-form-sal').hidden = mode!=='salary';
    document.getElementById('rc-form-oth').hidden = mode!=='other';
    document.getElementById('rc-save').innerHTML = `${UI.icon('save','sm')} ${mode==='salary'?'Create Payroll':'Create'}`;
  };
  window.recLoadStaff = function () {
    const br = document.getElementById('rs-branch').value;
    const staff = FIN.staffForBranch(br);
    const box = document.getElementById('rs-lines');
    box.innerHTML = staff.length ? staff.map(s => `
      <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--md-outline-variant)">
        <div style="flex:1"><div style="font-weight:500">${s.name}</div>
          <div class="text-muted" style="font-size:var(--fs-label-sm)">${ROLE_LBL[s.role]||s.role}</div></div>
        <input type="number" class="form-input rs-amt" data-staff="${s.staffId}" data-name="${s.name}" data-role="${s.role}"
          style="width:130px" value="${s.amount}" oninput="recSalTotal()">
      </div>`).join('') : `<div class="text-muted" style="padding:8px 0">No active staff at ${br}</div>`;
    recSalTotal();
  };
  window.recSalTotal = function () {
    const t = [].slice.call(document.querySelectorAll('.rs-amt')).reduce((s,i)=>s+(parseFloat(i.value)||0),0);
    const el = document.getElementById('rs-total'); if (el) el.innerHTML = `Monthly total: <b>${Utils.currency(t)}</b>`;
  };
  window.recSave = function () {
    if (recMode === 'salary') {
      const br = document.getElementById('rs-branch').value;
      const lines = [].slice.call(document.querySelectorAll('.rs-amt')).map(i => ({
        staffId:i.dataset.staff, name:i.dataset.name, role:i.dataset.role, amount:parseFloat(i.value)||0 }));
      if (!lines.length) { showToast('No staff to pay at this branch', 'error'); return; }
      const id = 'rec-sal-' + br.toLowerCase().replace(/[^a-z0-9]/g,'') + '-' + Date.now();
      DB.recurringPayments.push({ id, number:FIN.nextDocNumber('recurring'), type:'salary', label:'Staff Payroll', branch:br,
        dayOfMonth: parseInt(document.getElementById('rs-day').value,10)||25, lines, paidMonths:[] });
      showToast(`Payroll for ${br} created ✓`, 'success');
    } else {
      const label = document.getElementById('ro-label').value.trim();
      const amt = parseFloat(document.getElementById('ro-amt').value)||0;
      if (!label) { showToast('Add a label', 'error'); return; }
      if (!amt) { showToast('Enter an amount', 'error'); return; }
      DB.recurringPayments.push({
        id: FIN.nextId('rec', DB.recurringPayments), number:FIN.nextDocNumber('recurring'), type:document.getElementById('ro-type').value,
        label, branch:document.getElementById('ro-branch').value,
        payee:document.getElementById('ro-payee').value.trim()||'—', amount:amt,
        dayOfMonth: parseInt(document.getElementById('ro-day').value,10)||1, paidMonths:[] });
      showToast('Recurring payment created ✓', 'success');
    }
    Modal.close('modal-rc-new'); render();
  };

})();
