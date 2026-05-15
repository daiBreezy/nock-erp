/* ============================================================
   crm.js — CRM Module v2: Pipeline + Customers (full detail)
   ============================================================ */
(function () {

/* ── DATA (from global DB) ──────────────────────────────────── */
const STAFF      = CONST.STAFF_NAMES;
const leads      = DB.leads;
const customers  = DB.customers;
const STAGE_META = CONST.LEAD_STAGES;

let sortCol = '', sortDir = 1;
let dragLeadId = null;

/* ── HELPERS ────────────────────────────────────────────── */
function daysLabel(d) { return Utils.daysLabel(d); }
function statusBadge(s) {
  return ({
    active:  '<span class="badge badge-green">Active</span>',
    renewal: '<span class="badge badge-yellow">Renewal Pending</span>',
    urgent:  '<span class="badge badge-red">Urgent — 1 left</span>',
    inactive:'<span class="badge badge-gray">Inactive</span>',
    archived:'<span class="badge badge-gray">Archived</span>',
  })[s] || '<span class="badge badge-gray">—</span>';
}

/* ── RENDER SHELL ───────────────────────────────────────── */
document.getElementById('view-crm').innerHTML = `
<div class="page-header">
  <div><div class="page-title">CRM</div><div class="page-sub">87 customers · ${leads.filter(l=>l.stage!=='archived').length} active leads</div></div>
  <button class="btn btn-primary" onclick="openLeadModal()">＋ New Lead</button>
</div>

<!-- STATS -->
<div class="crm-stats">
  <div class="crm-stat-card" onclick="switchCrmTab('customers')"><div class="crm-stat-val">87</div><div class="crm-stat-lbl">Total Customers</div><div class="crm-stat-sub">+5 this month</div></div>
  <div class="crm-stat-card" onclick="switchCrmTab('leads')"><div class="crm-stat-val">${leads.filter(l=>l.stage!=='archived').length}</div><div class="crm-stat-lbl">Active Leads</div><div class="crm-stat-sub">+3 this week</div></div>
  <div class="crm-stat-card"><div class="crm-stat-val">6</div><div class="crm-stat-lbl">Renewal Pending</div><div class="crm-stat-sub down">Action required</div></div>
  <div class="crm-stat-card"><div class="crm-stat-val">68%</div><div class="crm-stat-lbl">Conversion Rate</div><div class="crm-stat-sub">↑ 5% MoM</div></div>
  <div class="crm-stat-card"><div class="crm-stat-val">฿124.5K</div><div class="crm-stat-lbl">Revenue (May)</div><div class="crm-stat-sub">↑ 12% MoM</div></div>
</div>

<!-- TABS -->
<div class="tabs">
  <div class="tab active" id="crm-tab-leads"     onclick="switchCrmTab('leads')">Leads</div>
  <div class="tab"        id="crm-tab-customers" onclick="switchCrmTab('customers')">Customers</div>
</div>

<!-- LEADS PANEL -->
<div id="crm-leads">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
    <div style="display:flex;gap:6px;flex-wrap:wrap" id="lead-chips">
      <div class="filter-chip active" onclick="setLeadFilter('all',this)">All</div>
      <div class="filter-chip" onclick="setLeadFilter('new',this)">New Lead</div>
      <div class="filter-chip" onclick="setLeadFilter('contacting',this)">Contacting</div>
      <div class="filter-chip" onclick="setLeadFilter('test',this)">Test</div>
      <div class="filter-chip" onclick="setLeadFilter('trial',this)">Trial</div>
    </div>
    <input type="text" class="tc-search" placeholder="Search leads…" style="width:180px" oninput="searchLeads(this.value)">
  </div>

  <!-- PIPELINE: horizontal scroll, 5 cols incl. Archived -->
  <div id="crm-pipeline" style="display:flex;gap:12px;overflow-x:auto;padding-bottom:10px;margin-bottom:4px"></div>
  <div style="font-size:11px;color:#9ca3af;text-align:center;margin-bottom:4px">↔ Scroll to see Archived · Drag cards to move between stages</div>
</div>

<!-- CUSTOMERS PANEL -->
<div id="crm-customers" style="display:none">
  <div class="card">
    <div class="table-controls">
      <input type="text" class="tc-search" id="cust-search" placeholder="Search… (AND/OR/NOT)" oninput="renderCustomers()">
      <select class="tc-select" id="cust-status" onchange="renderCustomers()">
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="renewal">Renewal Pending</option>
        <option value="urgent">Urgent</option>
        <option value="inactive">Inactive</option>
        <option value="archived">Archived</option>
      </select>
      <select class="tc-select" id="cust-branch" onchange="renderCustomers()">
        <option value="all">All Branches</option>
        <option value="Sukhumvit">Sukhumvit</option>
        <option value="Silom">Silom</option>
      </select>
      <div style="margin-left:auto"><button class="btn btn-secondary btn-sm" onclick="showToast('Exporting CSV…','info')">Export CSV</button></div>
    </div>
    <div class="table-wrap">
      <table id="cust-table">
        <thead><tr>
          <th onclick="sortCustomers('name')">Name</th>
          <th onclick="sortCustomers('family')">Family</th>
          <th onclick="sortCustomers('branch')">Branch</th>
          <th>Course [Package]</th>
          <th onclick="sortCustomers('remain')">Remaining</th>
          <th onclick="sortCustomers('since')">Since – Until</th>
          <th onclick="sortCustomers('status')">Status</th>
          <th></th>
        </tr></thead>
        <tbody id="cust-tbody"></tbody>
      </table>
    </div>
  </div>
</div>`;

/* ══════════════════════════════════════════════════════════
   PIPELINE
══════════════════════════════════════════════════════════ */
let leadFilter = 'all', leadSearch = '';

function renderPipeline() {
  const stages = ['new','contacting','test','trial','archived'];
  const container = document.getElementById('crm-pipeline');
  if (!container) return;

  container.innerHTML = stages.map(stage => {
    const meta = STAGE_META[stage];
    const stageLeads = leads.filter(l => {
      if (l.stage !== stage) return false;
      if (leadFilter !== 'all' && stage !== leadFilter && leadFilter !== 'all') return false;
      if (leadSearch && !(l.name + l.course).toLowerCase().includes(leadSearch.toLowerCase())) return false;
      return true;
    });

    const cards = stageLeads.map(l => leadCardHTML(l, stage)).join('');
    const isArchived = stage === 'archived';

    return `
    <div class="pipeline-col" style="min-width:220px;flex-shrink:0;${isArchived?'border:2px dashed #e5e7eb;opacity:.85':''}"
         data-stage="${stage}"
         ondragover="event.preventDefault();this.style.background='#f0f0ff'"
         ondragleave="this.style.background=''"
         ondrop="dropLead(event,'${stage}')">
      <div class="pipeline-header" style="color:${meta.color}">
        ${meta.label}
        <span class="pipeline-count" style="background:${meta.bg};color:${meta.color}">${stageLeads.length}</span>
      </div>
      ${cards}
      ${!isArchived ? `<div style="border:1px dashed #e5e7eb;border-radius:6px;padding:8px;text-align:center;font-size:11px;color:#9ca3af;cursor:pointer;margin-top:4px"
        onclick="openLeadModal(null,null,'${stage}')">＋ Add</div>` : ''}
    </div>`;
  }).join('');
}

function leadCardHTML(l, stage) {
  const isArchived = stage === 'archived';
  return `
  <div class="lead-card ${isArchived?'archived':''}" draggable="true"
       ondragstart="startDrag(event,'${l.id}')"
       ondragend="endDrag(event)"
       onclick="openLeadModal('${l.id}')">
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div class="lead-name">${l.name}</div>
      <span style="font-size:9px;color:#9ca3af;white-space:nowrap;margin-left:4px">${daysLabel(l.daysAgo)}</span>
    </div>
    <div class="lead-meta">${l.course} · Age ${l.age}</div>
    ${l.assignee ? `<div style="font-size:10px;color:#6366f1;margin-top:3px">👤 ${l.assignee}</div>` : `<div style="font-size:10px;color:#9ca3af;margin-top:3px">Unassigned</div>`}
    ${l.schedDate ? `<div style="font-size:10px;color:#f59e0b;margin-top:2px">📅 ${l.schedDate}</div>` : ''}
    ${isArchived ? `<div style="font-size:10px;color:#9ca3af;margin-top:3px">from: ${STAGE_META[l.archivedFrom||'new']?.label||l.archivedFrom}</div>` : ''}
    <div class="lead-tags" style="margin-top:6px">
      <span class="badge badge-${['Referred','Referral'].includes(l.source)?'blue':l.source==='Website'?'purple':'gray'}">${l.source}</span>
      ${l.line   ? `<button class="chat-btn" onclick="event.stopPropagation();openInboxFor('${l.name}')" title="Chat on LINE">💬</button>` : ''}
      ${l.phone  ? `<button class="chat-btn" onclick="event.stopPropagation();showToast('Calling ${l.phone}…','info')" title="Call">📞</button>` : ''}
      ${isArchived ? `<button class="btn btn-xs btn-ghost" style="font-size:10px;padding:2px 6px" onclick="event.stopPropagation();unarchiveLead('${l.id}')">↩ Restore</button>` : ''}
    </div>
  </div>`;
}

/* ── DRAG & DROP ─────────────────────────────────────────── */
window.startDrag = function (e, id) {
  dragLeadId = id;
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.style.opacity = '0.5';
};
window.endDrag   = function (e) { e.currentTarget.style.opacity = ''; };
window.dropLead  = function (e, toStage) {
  e.preventDefault();
  e.currentTarget.style.background = '';
  if (!dragLeadId) return;
  const lead = leads.find(l => l.id === dragLeadId);
  if (!lead || lead.stage === toStage) return;
  const fromStage = lead.stage;
  lead.stage = toStage;
  if (toStage === 'archived') lead.archivedFrom = fromStage;
  dragLeadId = null;
  renderPipeline();
  showToast(`${lead.name} → ${STAGE_META[toStage].label}`, 'success');
};

window.unarchiveLead = function (id) {
  const lead = leads.find(l => l.id === id);
  if (!lead) return;
  lead.stage = lead.archivedFrom || 'new';
  delete lead.archivedFrom;
  renderPipeline();
  showToast(`${lead.name} restored to ${STAGE_META[lead.stage].label}`, 'success');
};

window.setLeadFilter = function (f, el) {
  leadFilter = f;
  document.querySelectorAll('#lead-chips .filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  renderPipeline();
};
window.searchLeads = function (v) { leadSearch = v; renderPipeline(); };

/* ══════════════════════════════════════════════════════════
   LEAD MODAL
══════════════════════════════════════════════════════════ */
window.openLeadModal = function (idOrNull, _unused, defaultStage) {
  const l = leads.find(x => x.id === idOrNull) || { name:'New Lead', course:'', stage: defaultStage||'new', daysAgo:0, assignee:'', source:'', line:'', phone:'', schedDate:'' };
  const isNew = !leads.find(x => x.id === idOrNull);
  const stages = ['new','contacting','test','trial'];

  Modal.create('modal-lead', `🎯 ${l.name}`, `
    <div class="modal-section">
      <div class="info-grid">
        <div class="info-item"><div class="label">Course Interest</div>${l.course||'—'}</div>
        <div class="info-item"><div class="label">Stage</div>
          <span class="badge" style="background:${STAGE_META[l.stage]?.bg};color:${STAGE_META[l.stage]?.color}">${STAGE_META[l.stage]?.label}</span>
        </div>
        <div class="info-item"><div class="label">Source</div>${l.source||'—'}</div>
        <div class="info-item"><div class="label">Created</div>${daysLabel(l.daysAgo)}</div>
        <div class="info-item"><div class="label">LINE</div>${l.line||'—'}</div>
        <div class="info-item"><div class="label">Phone</div>${l.phone||'—'}</div>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Assigned Staff</div>
      <select class="settings-input" style="width:auto" onchange="assignLead('${l.id}',this.value)">
        <option value="">Unassigned</option>
        ${STAFF.map(s=>`<option ${s===l.assignee?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Move to Stage</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${stages.map(s=>`<button class="btn ${s===l.stage?'btn-primary':'btn-secondary'} btn-sm"
          onclick="moveLeadStage('${l.id}','${s}',this)">${STAGE_META[s].label}</button>`).join('')}
        <button class="btn btn-ghost btn-sm" style="color:#9ca3af"
          onclick="moveLeadStage('${l.id}','archived');Modal.close('modal-lead')">Archive</button>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Schedule Appointment</div>
      ${l.schedDate ? `<div style="margin-bottom:10px;font-size:12px;background:#fefce8;border:1px solid #fde68a;border-radius:6px;padding:8px 10px;color:#92400e">📅 Current: <strong>${l.schedDate}</strong></div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
        <button class="btn btn-primary btn-sm" onclick="scheduleAppointmentModal('${l.id}')">📅 Open Schedule Calendar</button>
        <span style="font-size:11px;color:#9ca3af">See available slots · Join or create a class · Auto-notify parent</span>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Send Form</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-secondary btn-sm" onclick="showToast('Test form sent via LINE ✓','success')">📋 Send Test Form</button>
        <button class="btn btn-secondary btn-sm" onclick="showToast('Trial form sent via LINE ✓','success')">📋 Send Trial Form</button>
        <button class="btn btn-primary btn-sm"   onclick="showToast('Enrollment form sent via LINE ✓','success')">📋 Send Enrollment Form</button>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Add Note / Timeline</div>
      <textarea class="settings-input" rows="2" placeholder="บันทึกการติดต่อ…" style="resize:vertical;margin-bottom:8px"></textarea>
      <div class="timeline-item" style="padding:6px 0"><div class="tl-dot"></div>
        <div class="tl-content"><div class="tl-text">Lead created</div><div class="tl-time">${daysLabel(l.daysAgo)}</div></div>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-lead')">Close</button>
     <button class="btn btn-secondary" onclick="openInboxFor('${l.name}');Modal.close('modal-lead')">💬 Chat</button>
     <button class="btn btn-primary" onclick="showToast('Note saved + Task created ✓','success');Modal.close('modal-lead')">＋ Save & Task</button>`,
    'modal-lg');
};

window.assignLead = function (id, staff) {
  const l = leads.find(x => x.id === id); if (l) l.assignee = staff;
  renderPipeline(); showToast(staff?`Assigned to ${staff}`:'Unassigned','success');
};
window.moveLeadStage = function (id, stage, btn) {
  const l = leads.find(x => x.id === id); if (!l) return;
  if (stage === 'archived') l.archivedFrom = l.stage;
  l.stage = stage;
  // Update buttons highlight
  if (btn) { btn.closest('.modal-section').querySelectorAll('.btn').forEach(b=>b.classList.replace('btn-primary','btn-secondary')); btn.classList.replace('btn-secondary','btn-primary'); }
  renderPipeline(); showToast(`Moved to ${STAGE_META[stage].label}`,'success');
};

/* ══════════════════════════════════════════════════════════
   CUSTOMERS
══════════════════════════════════════════════════════════ */
window.switchCrmTab = function (tab) {
  document.getElementById('crm-leads').style.display     = tab==='leads'     ? '' : 'none';
  document.getElementById('crm-customers').style.display = tab==='customers' ? '' : 'none';
  document.getElementById('crm-tab-leads').classList.toggle('active',     tab==='leads');
  document.getElementById('crm-tab-customers').classList.toggle('active', tab==='customers');
  if (tab === 'customers') renderCustomers();
};

window.renderCustomers = function () {
  const search  = (document.getElementById('cust-search')?.value  || '').toLowerCase();
  const statusF = document.getElementById('cust-status')?.value  || 'all';
  const branchF = document.getElementById('cust-branch')?.value  || 'all';
  let rows = customers.filter(c => {
    if (statusF !== 'all' && c.status !== statusF) return false;
    if (branchF !== 'all' && c.branch !== branchF) return false;
    if (search) {
      const terms = search.replace(/ or /gi,'|').split('|').map(t=>t.trim());
      const hay = (c.name+c.family+c.course+c.branch).toLowerCase();
      return terms.some(t => { const ands = t.split(' and ').map(a=>a.trim()); return ands.every(a=>hay.includes(a)); });
    }
    return true;
  });
  if (sortCol) rows.sort((a,b)=>{
    let av=a[sortCol],bv=b[sortCol];
    if(typeof av==='string'){av=av.toLowerCase();bv=bv.toLowerCase();}
    return av<bv?-sortDir:av>bv?sortDir:0;
  });
  document.getElementById('cust-tbody').innerHTML = rows.map(c=>{
    const pct=Math.round(c.remain/c.total*100);
    const col=c.remain<=2?'#ef4444':c.remain<=5?'#f59e0b':'#10b981';
    return `<tr class="tr-click" onclick="openCustomerModal('${c.name}')">
      <td><strong>${c.name}</strong>
        <button class="chat-btn" onclick="event.stopPropagation();openInboxFor('${c.family}')" title="Chat">💬</button></td>
      <td><span class="chat-btn" style="cursor:pointer;background:none;border:none;text-decoration:underline;color:#6366f1;font-size:13px" onclick="event.stopPropagation();showView('families');showToast('Opening ${c.family}…','info')">${c.family}</span></td>
      <td>${c.branch}</td>
      <td><span class="pill">${c.pkg}</span></td>
      <td><strong style="color:${col}">${c.remain}</strong> <span style="color:#9ca3af;font-size:11px">/ ${c.total} (${pct}%)</span></td>
      <td style="font-size:12px;color:#6b7280">${c.since} – ${c.until}</td>
      <td>${statusBadge(c.status)}</td>
      <td><button class="btn btn-primary btn-xs" onclick="event.stopPropagation();openCustomerModal('${c.name}')">View</button></td>
    </tr>`;
  }).join('');
};

window.sortCustomers = function (col) {
  sortDir = sortCol===col ? sortDir*-1 : 1; sortCol = col;
  document.querySelectorAll('#cust-table th').forEach(t=>t.classList.remove('sort-asc','sort-desc'));
  const idx = ['name','family','branch','','remain','since','status'].indexOf(col);
  const th = document.querySelectorAll('#cust-table th')[idx];
  if (th) th.classList.add(sortDir===1?'sort-asc':'sort-desc');
  renderCustomers();
};

/* ══════════════════════════════════════════════════════════
   CUSTOMER MODAL (with tabs)
══════════════════════════════════════════════════════════ */
window.openCustomerModal = function (name) {
  const c = customers.find(x=>x.name===name)||{};

  const tabContent = {
    overview: `
      <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:16px">
        <div class="profile-avatar">${name[0]}</div>
        <div style="flex:1">
          <div class="profile-name">${name}</div>
          <div class="profile-meta">${c.family||''} · ${c.branch||''}</div>
          <div class="profile-tags" style="margin-top:8px">${statusBadge(c.status)}<span class="badge badge-blue" style="margin-left:4px">LINE: Active</span></div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="openInboxFor('${c.family}')">💬 Chat</button>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Contact Info <button class="btn btn-ghost btn-xs" onclick="toggleCustEdit()">✏️ Edit</button></div>
        <div id="cust-view-info" class="info-grid">
          <div class="info-item"><div class="label">Phone</div>${c.phone||'—'}</div>
          <div class="info-item"><div class="label">LINE</div>${c.line||'—'}</div>
          <div class="info-item"><div class="label">Family</div>
            <span style="color:#6366f1;cursor:pointer;text-decoration:underline" onclick="showView('families');showToast('Opening ${c.family}…','info')">${c.family}</span>
          </div>
          <div class="info-item"><div class="label">Branch</div>${c.branch}</div>
        </div>
        <div id="cust-edit-info" style="display:none">
          <div class="settings-row" style="margin-bottom:8px">
            <div><label class="settings-label">Phone</label><input class="settings-input" value="${c.phone||''}"></div>
            <div><label class="settings-label">LINE</label><input class="settings-input" value="${c.line||''}"></div>
          </div>
          <div class="settings-row">
            <div><label class="settings-label">Branch</label>
              <select class="settings-input"><option>Sukhumvit</option><option>Silom</option></select>
            </div>
            <div style="display:flex;align-items:flex-end">
              <button class="btn btn-primary btn-sm" onclick="showToast('Saved ✓','success');toggleCustEdit()">Save</button>
            </div>
          </div>
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Status Actions</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="btn ${c.status==='active'?'btn-success':'btn-secondary'} btn-sm" onclick="showToast('Set to Active ✓','success')">✓ Active</button>
          <button class="btn btn-secondary btn-sm" onclick="showToast('Set to Inactive','info')">Inactive</button>
          <button class="btn btn-ghost btn-sm" style="color:#9ca3af" onclick="showToast('Archived','info');Modal.close('modal-customer')">Archive</button>
        </div>
      </div>`,

    course: `
      <div class="modal-section">
        <div class="modal-section-title">Current Enrollment</div>
        <div class="info-grid" style="margin-bottom:12px">
          <div class="info-item"><div class="label">Course</div>${c.course}</div>
          <div class="info-item"><div class="label">Package</div><span class="pill">${c.pkg}</span></div>
          <div class="info-item"><div class="label">Teacher</div>${c.teacher||'—'}</div>
          <div class="info-item"><div class="label">Schedule</div>${c.schedule||'—'}</div>
          <div class="info-item"><div class="label">Remaining</div><strong style="color:${c.remain<=2?'#ef4444':'#10b981'}">${c.remain} / ${c.total}</strong></div>
          <div class="info-item"><div class="label">Period</div>${c.since} – ${c.until}</div>
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Recent Sessions</div>
        ${[
          {date:'Tue 13 May',time:'10:30–12:00',subj:'English Reading',att:'Present',summary:'Completed'},
          {date:'Thu 8 May', time:'10:30–12:00',subj:'English Reading',att:'Present',summary:'Completed'},
          {date:'Tue 6 May', time:'10:30–12:00',subj:'English Reading',att:'Leave',  summary:'No session'},
        ].map(s=>`<div class="timeline-item" style="padding:8px 0">
          <div class="tl-dot" style="background:${s.att==='Present'?'#10b981':'#f59e0b'}"></div>
          <div class="tl-content">
            <div class="tl-text"><strong>${s.date}</strong> ${s.time} · ${s.subj}</div>
            <div style="display:flex;gap:6px;margin-top:3px">
              <span class="badge ${s.att==='Present'?'badge-green':'badge-yellow'}">${s.att}</span>
              <span class="badge badge-gray">${s.summary}</span>
            </div>
          </div>
        </div>`).join('')}
      </div>`,

    learning: `
      <div class="modal-section">
        <div class="modal-section-title">AI Learning Summary <span style="font-size:10px;color:#9ca3af">(aggregated from all sessions)</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
          ${[
            {label:'Behavior',    score:4, note:'Focused, participates well'},
            {label:'Learning Curve', score:3, note:'Steady improvement in reading'},
            {label:'Focus',       score:4, note:'Good concentration 80% of time'},
            {label:'Attendance',  score:5, note:'94% attendance rate'},
            {label:'Homework',    score:3, note:'Completes most assignments'},
            {label:'Progress',    score:4, note:'On track for level up'},
          ].map(item=>`<div style="background:#f9fafb;border-radius:8px;padding:10px;border:1px solid #e5e7eb">
            <div style="font-size:11px;color:#6b7280;font-weight:600;margin-bottom:4px">${item.label}</div>
            <div style="font-size:18px;margin-bottom:2px">${'⭐'.repeat(item.score)}${'☆'.repeat(5-item.score)}</div>
            <div style="font-size:11px;color:#374151">${item.note}</div>
          </div>`).join('')}
        </div>
        <div style="background:#f0f0ff;border-radius:8px;padding:12px;font-size:13px;color:#374151;line-height:1.6">
          <strong>🤖 AI Summary:</strong> ${c.name.split(' ')[0]} แสดงพัฒนาการที่ดีในด้าน reading comprehension โดยเฉพาะ phonics และ vocabulary เพิ่มขึ้นเรื่อยๆ ควรเน้นเรื่อง speaking confidence ในช่วงถัดไป
        </div>
      </div>`,

    payment: `
      <div class="modal-section">
        <div class="modal-section-title">Revenue from ${c.name.split(' ')[0]}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
          <div class="kpi-card" style="padding:12px">
            <div class="kpi-label">Lifetime Revenue</div>
            <div class="kpi-value" style="font-size:20px">${formatCurrency(c.revenue||0)}</div>
          </div>
          <div class="kpi-card" style="padding:12px">
            <div class="kpi-label">Last Payment</div>
            <div class="kpi-value" style="font-size:20px">฿8,500</div>
            <div class="kpi-change up">Paid · 1 May</div>
          </div>
          <div class="kpi-card" style="padding:12px">
            <div class="kpi-label">Avg/Month</div>
            <div class="kpi-value" style="font-size:20px">฿8,500</div>
          </div>
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Invoice History</div>
        <table style="width:100%;border-collapse:collapse">
          <thead><tr>
            <th style="text-align:left;padding:6px;font-size:11px;color:#6b7280;border-bottom:1px solid #f3f4f6">Invoice</th>
            <th style="text-align:left;padding:6px;font-size:11px;color:#6b7280;border-bottom:1px solid #f3f4f6">Course</th>
            <th style="text-align:left;padding:6px;font-size:11px;color:#6b7280;border-bottom:1px solid #f3f4f6">Amount</th>
            <th style="text-align:left;padding:6px;font-size:11px;color:#6b7280;border-bottom:1px solid #f3f4f6">Date</th>
            <th style="text-align:left;padding:6px;font-size:11px;color:#6b7280;border-bottom:1px solid #f3f4f6">Status</th>
          </tr></thead>
          <tbody>
            <tr><td style="padding:8px 6px;font-size:13px">INV-2026-0051</td><td style="padding:8px 6px;font-size:13px">${c.pkg}</td><td style="padding:8px 6px;font-size:13px">฿8,500</td><td style="padding:8px 6px;font-size:13px;color:#6b7280">13 May</td><td style="padding:8px 6px"><span class="badge badge-yellow">Pending</span></td></tr>
            <tr><td style="padding:8px 6px;font-size:13px">INV-2026-0039</td><td style="padding:8px 6px;font-size:13px">${c.pkg}</td><td style="padding:8px 6px;font-size:13px">฿8,500</td><td style="padding:8px 6px;font-size:13px;color:#6b7280">1 May</td><td style="padding:8px 6px"><span class="badge badge-green">Paid</span></td></tr>
          </tbody>
        </table>
      </div>`,

    timeline: (() => {
      const _tlStu = DB.students.find(s => s.name === name);
      const _events = _tlStu
        ? Timeline.fromStudent(_tlStu, name)
        : [];
      return `
      <div class="modal-section" style="padding:12px 0 0">
        <div style="padding:0 16px 8px">
          <div class="modal-section-title">Full Activity Timeline</div>
          <div style="font-size:11px;color:#9ca3af">All events · newest first</div>
        </div>
        <div style="max-height:420px;overflow-y:auto">
          ${Timeline.build(_events)}
        </div>
      </div>`;
    })(),
  };

  const tabLabels = [['overview','Overview'],['course','Course & Schedule'],['learning','Learning Summary'],['payment','Payment'],['timeline','Timeline']];

  Modal.create('modal-customer', `👤 ${name}`,
    `<div class="tabs" style="margin:-20px -20px 16px;padding:0 16px;border-radius:0">
      ${tabLabels.map(([id,lbl],i)=>`<div class="tab ${i===0?'active':''}" onclick="custTab('${id}',this)">${lbl}</div>`).join('')}
    </div>
    ${tabLabels.map(([id],i)=>`<div id="ctab-${id}" ${i>0?'style="display:none"':''}>${tabContent[id]}</div>`).join('')}`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-customer')">Close</button>
     <button class="btn btn-secondary" onclick="openInboxFor('${c.family}');Modal.close('modal-customer')">💬 Chat</button>
     <button class="btn btn-primary" onclick="openFollowUpModal('${name}');Modal.close('modal-customer')">📞 Follow Up</button>`,
    'modal-xl');
};

window.custTab = function (tab, el) {
  document.querySelectorAll('[id^="ctab-"]').forEach(p=>p.style.display='none');
  const t = document.getElementById('ctab-'+tab); if (t) t.style.display='';
  el.closest('.tabs').querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  el.classList.add('active');
};
window.toggleCustEdit = function () {
  const v=document.getElementById('cust-view-info'), e=document.getElementById('cust-edit-info');
  if (!v||!e) return;
  const show = v.style.display!=='none';
  v.style.display=show?'none':''; e.style.display=show?'':'none';
};

/* ── EXPOSE REFRESH FOR crm-schedule.js ────────────────── */
window._refreshPipeline = renderPipeline;

/* ── INIT ───────────────────────────────────────────────── */
renderPipeline();

})();
