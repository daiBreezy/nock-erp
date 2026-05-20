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
      <div class="filter-chip" onclick="setLeadFilter('new',this)">New</div>
      <div class="filter-chip" onclick="setLeadFilter('contacting',this)">Contacting</div>
      <div class="filter-chip" onclick="setLeadFilter('test',this)">Test</div>
      <div class="filter-chip" onclick="setLeadFilter('trial',this)">Trial</div>
      <div class="filter-chip" onclick="setLeadFilter('payment_pending',this)">Payment</div>
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
   PIPELINE — 6 grouped columns
══════════════════════════════════════════════════════════ */
const PIPELINE_GROUPS = [
  {key:'new',             stages:['new'],                          label:'New Lead',        color:'#6366f1', bg:'#ede9fe'},
  {key:'contacting',      stages:['contacting'],                   label:'Contacting',      color:'#f59e0b', bg:'#fef3c7'},
  {key:'test',            stages:['test_scheduled','tested'],      label:'Test',            color:'#8b5cf6', bg:'#f5f3ff'},
  {key:'trial',           stages:['trial_scheduled','trialed'],    label:'Trial',           color:'#10b981', bg:'#d1fae5'},
  {key:'payment_pending', stages:['payment_pending'],              label:'Payment Pending', color:'#b91c1c', bg:'#fee2e2'},
  {key:'archived',        stages:['archived'],                     label:'Archived',        color:'#9ca3af', bg:'#f3f4f6'},
];

// Sub-state badges shown on cards inside grouped columns
const SUB_STAGE_BADGE = {
  test_scheduled:  {label:'📅 Scheduled', color:'#8b5cf6'},
  tested:          {label:'✓ Tested',     color:'#059669'},
  trial_scheduled: {label:'📅 Scheduled', color:'#10b981'},
  trialed:         {label:'✓ Trialed',    color:'#059669'},
};

// Days remaining until schedDate (mock today = 20 May 2026)
function schedDaysLeft(schedDate) {
  if (!schedDate) return '';
  const m = schedDate.match(/(\d+)\s+(\w+)/);
  if (!m) return '';
  const MONTHS = {Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11};
  const day = parseInt(m[1]), month = MONTHS[m[2]];
  if (isNaN(day) || month === undefined) return '';
  const diff = Math.ceil((new Date(2026, month, day) - new Date(2026, 4, 20)) / 86400000);
  if (diff < 0)  return `<span style="color:#ef4444;font-weight:700;font-size:10px">overdue</span>`;
  if (diff === 0) return `<span style="color:#f97316;font-weight:700;font-size:10px">today!</span>`;
  return `<span style="color:#f59e0b;font-weight:700;font-size:10px">${diff}d</span>`;
}

let leadFilter = 'all', leadSearch = '';

function renderPipeline() {
  const container = document.getElementById('crm-pipeline');
  if (!container) return;

  container.innerHTML = PIPELINE_GROUPS.map(group => {
    const isArchived = group.key === 'archived';
    const stageLeads = leads.filter(l => {
      if (!group.stages.includes(l.stage)) return false;
      if (leadFilter !== 'all' && group.key !== leadFilter) return false;
      if (leadSearch && !(l.name + l.course).toLowerCase().includes(leadSearch.toLowerCase())) return false;
      return true;
    });

    const cards = stageLeads.map(l => leadCardHTML(l, group)).join('');
    const defaultNewStage = group.stages[0];

    return `
    <div class="pipeline-col" style="min-width:220px;flex-shrink:0;${isArchived?'border:2px dashed #e5e7eb;opacity:.85':''}"
         ondragover="event.preventDefault();this.style.background='#f0f0ff'"
         ondragleave="this.style.background=''"
         ondrop="dropLead(event,'${group.key}')">
      <div class="pipeline-header" style="color:${group.color}">
        ${group.label}
        <span class="pipeline-count" style="background:${group.bg};color:${group.color}">${stageLeads.length}</span>
      </div>
      ${cards}
      ${!isArchived ? `<div style="border:1px dashed #e5e7eb;border-radius:6px;padding:8px;
        text-align:center;font-size:11px;color:#9ca3af;cursor:pointer;margin-top:4px"
        onclick="openLeadModal(null,null,'${defaultNewStage}')">＋ Add</div>` : ''}
    </div>`;
  }).join('');
}

function leadCardHTML(l, group) {
  const isArchived = group.key === 'archived';
  const pendingSub  = (DB.formSubmissions||[]).find(s => s.leadId === l.id && s.status === 'pending');
  const subBadge    = SUB_STAGE_BADGE[l.stage];

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
    ${subBadge ? `<div style="font-size:10px;font-weight:600;color:${subBadge.color};margin-top:3px">${subBadge.label}</div>` : ''}
    ${l.schedDate ? `<div style="font-size:10px;color:#6b7280;margin-top:2px;display:flex;gap:5px;align-items:center">
        📅 ${l.schedDate} ${schedDaysLeft(l.schedDate)}</div>` : ''}
    ${pendingSub ? `<div style="font-size:10px;font-weight:600;color:#b91c1c;background:#fee2e2;
        border-radius:4px;padding:2px 6px;margin-top:4px;cursor:pointer"
        onclick="event.stopPropagation();openFormReviewModal('${pendingSub.id}')">⏳ Form Pending →</div>` : ''}
    ${isArchived ? `<div style="font-size:10px;color:#9ca3af;margin-top:3px">from: ${STAGE_META[l.archivedFrom||'new']?.label||l.archivedFrom}</div>` : ''}
    <div class="lead-tags" style="margin-top:6px">
      <span class="badge badge-${['Referred','Referral'].includes(l.source)?'blue':l.source==='Website'?'purple':'gray'}">${l.source}</span>
      ${l.line  ? `<button class="chat-btn" onclick="event.stopPropagation();openLeadInbox('${l.id}')" title="Chat">💬</button>` : ''}
      ${l.phone ? `<button class="chat-btn" onclick="event.stopPropagation();showToast('Calling ${l.phone}…','info')" title="Call">📞</button>` : ''}
      ${isArchived ? `<button class="btn btn-xs btn-ghost" style="font-size:10px;padding:2px 6px"
          onclick="event.stopPropagation();unarchiveLead('${l.id}')">↩ Restore</button>` : ''}
    </div>
  </div>`;
}

/* ── DRAG & DROP ─────────────────────────────────────────── */
window.startDrag = function (e, id) {
  dragLeadId = id;
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.style.opacity = '0.5';
};
window.endDrag = function (e) { e.currentTarget.style.opacity = ''; };
window.dropLead = function (e, groupKey) {
  e.preventDefault();
  e.currentTarget.style.background = '';
  if (!dragLeadId) return;
  const lead   = leads.find(l => l.id === dragLeadId);
  const group  = PIPELINE_GROUPS.find(g => g.key === groupKey);
  if (!lead || !group) return;
  const toStage = group.stages[0];  // drop into first sub-stage of group
  if (lead.stage === toStage) return;
  if (groupKey === 'archived') lead.archivedFrom = lead.stage;
  lead.stage = toStage;
  dragLeadId = null;
  renderPipeline();
  showToast(`${lead.name} → ${group.label}`, 'success');
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

/* ── CREATE LEAD FROM INBOX ──────────────────────────────── */
window.openCreateLeadFromInbox = function (convId) {
  const conv = DB.conversations.find(c => c.id === convId);
  if (!conv) return;

  // If lead already linked → go to CRM
  const existing = DB.leads.find(l => l.convId === convId);
  if (existing) {
    Modal.close();
    showView('crm');
    setTimeout(() => openLeadModal(existing.id), 80);
    return;
  }

  // Pre-fill from conversation data
  const preName   = conv.name.replace(/\s*family\s*/i, '').trim();
  const preStudent = conv.student || '';
  const preBranch  = conv.branch  || CONST.BRANCHES[0];

  Modal.create('modal-create-lead-inbox', '➕ Create Lead from Conversation', `
    <!-- Source banner -->
    <div style="display:flex;align-items:center;gap:10px;background:#f0fdf4;
                border:1px solid #bbf7d0;border-radius:9px;padding:11px 14px;margin-bottom:4px">
      <div style="font-size:22px">💬</div>
      <div>
        <div style="font-size:13px;font-weight:600;color:#065f46">${conv.name}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:2px">
          ${(()=>{const c={LINE:'#06c755',WhatsApp:'#25d366',Email:'#6366f1',SMS:'#f59e0b'}[conv.channel]||'#9ca3af';return `<span style="font-size:9px;font-weight:700;color:#fff;background:${c};border-radius:4px;padding:1px 5px">${conv.channel||'?'}</span>`;})()}  · ${preBranch} · Lead จะ link กับ conversation นี้อัตโนมัติ
        </div>
      </div>
    </div>

    <div class="modal-section">
      <div class="settings-row">
        <div style="flex:2">
          <label class="settings-label">Parent / Contact Name <span style="color:#ef4444">*</span></label>
          <input id="cil-name" class="settings-input" value="${preName}" placeholder="e.g. Romano Dad">
        </div>
        <div style="flex:1">
          <label class="settings-label">Age of Student</label>
          <input id="cil-age" class="settings-input" type="number" placeholder="9" min="4" max="20">
        </div>
      </div>

      <div>
        <label class="settings-label">Course Interest <span style="color:#ef4444">*</span></label>
        <input id="cil-course" class="settings-input"
          placeholder="จาก chat: เช่น 'Math ป.5', 'Eng (Active)' …">
        <div style="font-size:11px;color:#9ca3af;margin-top:4px">
          💡 ดูจาก chat ด้านซ้ายว่า parent สนใจวิชาอะไร
        </div>
      </div>

      <div class="settings-row" style="margin-top:0">
        <div style="flex:1">
          <label class="settings-label">LINE ID</label>
          <input id="cil-line" class="settings-input" value="${conv.channel==='LINE'?('@'+preName.toLowerCase().replace(/\s/g,'_')):''}">
        </div>
        <div style="flex:1">
          <label class="settings-label">Phone</label>
          <input id="cil-phone" class="settings-input" placeholder="089-xxx-xxxx">
        </div>
      </div>

      <div class="settings-row" style="margin-top:0">
        <div style="flex:1">
          <label class="settings-label">Branch</label>
          <select id="cil-branch" class="settings-input">
            ${CONST.BRANCHES.map(b=>`<option ${b===preBranch?'selected':''}>${b}</option>`).join('')}
          </select>
        </div>
        <div style="flex:1">
          <label class="settings-label">Assign to</label>
          <select id="cil-assignee" class="settings-input">
            <option value="">Unassigned</option>
            ${STAFF.map(s=>`<option>${s}</option>`).join('')}
          </select>
        </div>
      </div>

      <div>
        <label class="settings-label">First Note <span style="font-weight:400;color:#9ca3af">(optional)</span></label>
        <textarea id="cil-notes" class="settings-input" rows="2"
          placeholder="สรุปจาก chat เช่น 'Parent สนใจ Math ป.5 เพื่อสอบเข้า ม.1 บอกว่าเรียนได้ทุกวัน'"
          style="resize:vertical"></textarea>
      </div>
    </div>`,

    `<button class="btn btn-secondary" onclick="Modal.close('modal-create-lead-inbox')">Cancel</button>
     <button class="btn btn-primary" onclick="createLeadFromInbox('${convId}')">Create Lead → CRM</button>`,
    'modal-md');
};

window.createLeadFromInbox = function (convId) {
  const conv   = DB.conversations.find(c => c.id === convId);
  const name   = document.getElementById('cil-name')?.value.trim();
  const course = document.getElementById('cil-course')?.value.trim();
  if (!name)   { showToast('กรุณากรอกชื่อ', 'error'); return; }
  if (!course) { showToast('กรุณากรอก Course Interest', 'error'); return; }

  const newLead = {
    id:       'lead_' + Date.now(),
    name,
    age:      parseInt(document.getElementById('cil-age')?.value) || 0,
    course,
    source:   conv?.channel === 'LINE' ? 'LINE' : 'Inbound',
    branch:   document.getElementById('cil-branch')?.value   || CONST.BRANCHES[0],
    phone:    document.getElementById('cil-phone')?.value    || '',
    line:     document.getElementById('cil-line')?.value     || '',
    assignee: document.getElementById('cil-assignee')?.value || '',
    stage:    'contacting',   // always Contacting — they already messaged us
    daysAgo:  0,
    convId:   convId,         // linked to this conversation ✅
    notes:    [],
  };

  const note = document.getElementById('cil-notes')?.value.trim();
  if (note) newLead.notes.push({ text: note, by: 'Admin Nock', date: 'Today' });

  leads.push(newLead);

  // Add internal note to the conversation
  if (conv) {
    (DB.messages[convId] = DB.messages[convId] || []).push({
      type: 'internal',
      text: `Lead created in CRM · Stage: Contacting · Course: ${course}`,
      time: 'Now', sender: 'System',
    });
    conv.preview = `🎯 Lead created · ${course}`;
  }

  Modal.close('modal-create-lead-inbox');
  renderPipeline();
  window._refreshInboxList?.();

  // Refresh inbox header to show "View Lead" button
  const activeConvEl = document.querySelector('.inbox-item.active');
  if (activeConvEl) activeConvEl.click();

  showToast(`${name} added to CRM as Contacting ✓`, 'success');
};

/* ── LEAD → INBOX (CRM ↔ Inbox linking) ─────────────────── */
window.openLeadInbox = function (leadId) {
  const lead = leads.find(l => l.id === leadId);
  if (!lead) return;
  // 1. Use convId if already linked
  if (lead.convId) {
    const conv = DB.conversations.find(c => c.id === lead.convId);
    if (conv) { showView('inbox'); openConversation(conv.id); return; }
  }
  // 2. Fuzzy match by first name across conversations
  const firstName = lead.name.replace(/\s*\(Lead\)\s*/i,'').split(' ')[0].toLowerCase();
  const fuzzy = DB.conversations.find(c =>
    c.name.toLowerCase().includes(firstName) ||
    (c.student||'').toLowerCase().includes(firstName));
  if (fuzzy) {
    lead.convId = fuzzy.id;
    showView('inbox');
    openConversation(fuzzy.id);
    return;
  }
  // 3. Create new conversation for this lead
  const newId = 'conv_' + lead.id;
  if (!DB.conversations.find(c => c.id === newId)) {
    const cleanName = lead.name.replace(/\s*\(Lead\)\s*/i,'').trim();
    DB.conversations.unshift({
      id: newId, name: cleanName + ' Family', student: cleanName,
      branch: 'Sukhumvit', channel: 'LINE', unread: false,
      time: 'Now', assignee: 'Admin Nock', preview: 'New lead conversation',
    });
    DB.messages[newId] = [{
      type:'internal', text:`Lead created from CRM · Stage: ${STAGE_META[lead.stage]?.label||lead.stage}`,
      time:'Now', sender:'System'
    }];
  }
  lead.convId = newId;
  showView('inbox');
  setTimeout(() => openConversation(newId), 80);
};

/* ══════════════════════════════════════════════════════════
   LEAD MODAL — 2 modes: Create New / View Existing
══════════════════════════════════════════════════════════ */
window.openLeadModal = function (idOrNull, _unused, defaultStage) {
  const existing = leads.find(x => x.id === idOrNull);

  // ── CREATE MODE ──────────────────────────────────────────
  if (!existing) {
    Modal.create('modal-lead', '➕ New Lead', `
      <div class="modal-section">
        <div class="settings-row">
          <div style="flex:2">
            <label class="settings-label">Full Name <span style="color:#ef4444">*</span></label>
            <input id="nl-name" class="settings-input" placeholder="e.g. Sarah Mitchell" autofocus>
          </div>
          <div style="flex:0 0 80px">
            <label class="settings-label">Age</label>
            <input id="nl-age" class="settings-input" type="number" placeholder="9" min="4" max="20">
          </div>
        </div>
        <div class="settings-row">
          <div style="flex:1">
            <label class="settings-label">Course Interest <span style="color:#ef4444">*</span></label>
            <input id="nl-course" class="settings-input" placeholder="e.g. Math ป.5, Eng (Active)">
          </div>
          <div style="flex:1">
            <label class="settings-label">Source</label>
            <select id="nl-source" class="settings-input">
              <option>Walk-in</option>
              <option>Website</option>
              <option>Referral</option>
              <option>Referred</option>
              <option>Social Media</option>
              <option>Other</option>
            </select>
          </div>
        </div>
        <div class="settings-row">
          <div style="flex:1">
            <label class="settings-label">Phone</label>
            <input id="nl-phone" class="settings-input" placeholder="089-xxx-xxxx">
          </div>
          <div style="flex:1">
            <label class="settings-label">LINE ID</label>
            <input id="nl-line" class="settings-input" placeholder="@lineid">
          </div>
        </div>
        <div class="settings-row">
          <div style="flex:1">
            <label class="settings-label">Branch</label>
            <select id="nl-branch" class="settings-input">
              ${CONST.BRANCHES.map(b=>`<option>${b}</option>`).join('')}
            </select>
          </div>
          <div style="flex:1">
            <label class="settings-label">Assign to</label>
            <select id="nl-assignee" class="settings-input">
              <option value="">Unassigned</option>
              ${STAFF.map(s=>`<option>${s}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="settings-row">
          <div style="flex:1">
            <label class="settings-label">Initial Stage</label>
            <select id="nl-stage" class="settings-input">
              <option value="new" ${defaultStage==='new'||!defaultStage?'selected':''}>New Lead</option>
              <option value="contacting" ${defaultStage==='contacting'?'selected':''}>Contacting</option>
              <option value="test_scheduled" ${defaultStage==='test_scheduled'?'selected':''}>Test Scheduled</option>
            </select>
          </div>
        </div>
        <div>
          <label class="settings-label">First Note (optional)</label>
          <textarea id="nl-notes" class="settings-input" rows="2"
            placeholder="e.g. Walk-in เมื่อกี้ สนใจ Math ป.5 เพื่อสอบเข้า ม.1…"
            style="resize:vertical"></textarea>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-lead')">Cancel</button>
       <button class="btn btn-primary" onclick="createLead()">Create Lead →</button>`,
      'modal-md');
    return;
  }

  // ── VIEW / EDIT MODE ─────────────────────────────────────
  const l = existing;
  const meta     = STAGE_META[l.stage] || {label:l.stage, color:'#6b7280', bg:'#f3f4f6'};
  const subBadge = SUB_STAGE_BADGE?.[l.stage];
  const pendingSub = (DB.formSubmissions||[]).find(s => s.leadId === l.id && s.status === 'pending');
  const hasContact = l.line || l.phone || l.convId;
  const stages = ['new','contacting','test_scheduled','tested','trial_scheduled','trialed','payment_pending'];

  Modal.create('modal-lead', `🎯 Lead`, `

    <!-- Header: name + stage + quick contact -->
    <div style="display:flex;gap:12px;align-items:flex-start;padding-bottom:14px;border-bottom:1px solid #f3f4f6;margin-bottom:4px">
      <div style="width:42px;height:42px;border-radius:10px;background:#ede9fe;display:flex;
                  align-items:center;justify-content:center;font-size:17px;font-weight:700;
                  color:#6366f1;flex-shrink:0">${l.name[0]}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:15px;font-weight:700;color:#1a1d23">${l.name}</div>
        <div style="display:flex;gap:6px;align-items:center;margin-top:5px;flex-wrap:wrap">
          <span style="background:${meta.bg};color:${meta.color};font-size:11px;font-weight:700;
                       border-radius:5px;padding:3px 9px">${meta.label}</span>
          ${subBadge ? `<span style="font-size:11px;font-weight:600;color:${subBadge.color}">${subBadge.label}</span>` : ''}
          ${l.schedDate ? `<span style="font-size:11px;color:#6b7280">📅 ${l.schedDate} ${schedDaysLeft(l.schedDate)}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:5px;flex-shrink:0">
        ${l.line  ? `<button class="btn btn-secondary btn-sm" onclick="Modal.close('modal-lead');openLeadInbox('${l.id}')">💬 Chat</button>` : ''}
        ${l.phone ? `<button class="btn btn-secondary btn-sm" onclick="showToast('Calling ${l.phone}…','info')">📞</button>` : ''}
      </div>
    </div>

    <!-- Info + assign -->
    <div class="modal-section">
      <div class="info-grid">
        <div class="info-item"><div class="label">Course Interest</div><strong>${l.course||'—'}</strong></div>
        <div class="info-item"><div class="label">Age</div>${l.age||'—'}</div>
        <div class="info-item"><div class="label">Source</div>${l.source||'—'}</div>
        <div class="info-item"><div class="label">Added</div>${daysLabel(l.daysAgo)}</div>
        <div class="info-item"><div class="label">Phone</div>${l.phone||'—'}</div>
        <div class="info-item"><div class="label">LINE</div>${l.line||'—'}</div>
        <div class="info-item" style="grid-column:span 2">
          <div class="label">Assigned to</div>
          <select style="border:none;background:none;font-size:13px;padding:0;cursor:pointer;
                         color:#6366f1;font-weight:600;outline:none"
                  onchange="assignLead('${l.id}',this.value)">
            <option value="" ${!l.assignee?'selected':''}>Unassigned</option>
            ${STAFF.map(s=>`<option ${s===l.assignee?'selected':''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>
    </div>

    <!-- Move stage — matches pipeline columns -->
    <div class="modal-section">
      <div class="modal-section-title">Move Stage</div>
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        ${PIPELINE_GROUPS.filter(g=>g.key!=='archived').map(g => {
          const isActive = g.stages.includes(l.stage);
          return `<button class="btn ${isActive?'btn-primary':'btn-secondary'} btn-sm"
            style="${isActive?'':''}color:${isActive?'':''};"
            onclick="moveLeadStage('${l.id}','${g.stages[0]}',this,'${g.key}')">${g.label}</button>`;
        }).join('')}
        <button class="btn btn-ghost btn-sm" style="color:#9ca3af"
          onclick="moveLeadStage('${l.id}','archived');Modal.close('modal-lead')">↓ Archive</button>
      </div>
    </div>

    <!-- Send Form — shows pending alert if any -->
    <div class="modal-section">
      <div class="modal-section-title">Send Form</div>
      ${pendingSub ? `
      <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:7px;padding:9px 12px;
                  display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-size:12px;color:#b91c1c;font-weight:600">⏳ Form submitted — awaiting review</div>
        <button class="btn btn-primary btn-sm"
          onclick="openFormReviewModal('${pendingSub.id}');Modal.close('modal-lead')">Review →</button>
      </div>` : ''}
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        <button class="btn ${['new','contacting'].includes(l.stage)?'btn-primary':'btn-secondary'} btn-sm"
          onclick="openSendFormModal('${l.id}','test')">📋 Test Form</button>
        <button class="btn ${['test_scheduled','tested'].includes(l.stage)?'btn-primary':'btn-secondary'} btn-sm"
          onclick="openSendFormModal('${l.id}','trial')">📋 Trial Form</button>
        <button class="btn ${['trialed','trial_scheduled'].includes(l.stage)?'btn-primary':'btn-secondary'} btn-sm"
          onclick="openSendFormModal('${l.id}','enrollment')">📝 Enrollment Form</button>
      </div>
    </div>

    <!-- Note + timeline -->
    <div class="modal-section">
      <div class="modal-section-title">Notes</div>
      <div style="display:flex;gap:8px;margin-bottom:8px">
        <textarea id="lead-note-input" class="settings-input" rows="2"
          placeholder="บันทึกการติดต่อ เช่น 'โทรแล้ว นัด Test วันพุธ 11:00'…"
          style="resize:vertical;flex:1"></textarea>
        <button class="btn btn-secondary btn-sm" style="align-self:flex-end;white-space:nowrap"
          onclick="saveLeadNote('${l.id}')">Save Note</button>
      </div>
      <div id="lead-timeline-${l.id}">
        ${(l.notes||[]).map(n=>`
          <div class="timeline-item" style="padding:5px 0">
            <div class="tl-dot"></div>
            <div class="tl-content">
              <div class="tl-text">${n.text}</div>
              <div class="tl-time">${n.by||''} · ${n.date||''}</div>
            </div>
          </div>`).join('')}
        <div class="timeline-item" style="padding:5px 0">
          <div class="tl-dot"></div>
          <div class="tl-content">
            <div class="tl-text">Lead created · ${l.source}</div>
            <div class="tl-time">${daysLabel(l.daysAgo)}</div>
          </div>
        </div>
      </div>
    </div>`,

    `<button class="btn btn-secondary" onclick="Modal.close('modal-lead')">Close</button>
     ${hasContact ? `<button class="btn btn-primary" onclick="Modal.close('modal-lead');openLeadInbox('${l.id}')">💬 Open in Inbox</button>` : ''}`,
    'modal-lg');
};

/* ── CREATE LEAD ─────────────────────────────────────────── */
window.createLead = function () {
  const name   = document.getElementById('nl-name')?.value.trim();
  const course = document.getElementById('nl-course')?.value.trim();
  if (!name)   { showToast('กรุณากรอกชื่อ','error'); return; }
  if (!course) { showToast('กรุณากรอก Course Interest','error'); return; }

  const newLead = {
    id:       'lead_' + Date.now(),
    name,
    age:      parseInt(document.getElementById('nl-age')?.value)||0,
    course,
    source:   document.getElementById('nl-source')?.value   || 'Walk-in',
    branch:   document.getElementById('nl-branch')?.value   || 'Sukhumvit',
    phone:    document.getElementById('nl-phone')?.value    || '',
    line:     document.getElementById('nl-line')?.value     || '',
    assignee: document.getElementById('nl-assignee')?.value || '',
    stage:    document.getElementById('nl-stage')?.value    || 'new',
    daysAgo:  0,
    notes:    [],
  };
  const firstNote = document.getElementById('nl-notes')?.value.trim();
  if (firstNote) newLead.notes.push({text:firstNote, by:'Admin Nock', date:'Today'});

  leads.push(newLead);
  Modal.close('modal-lead');
  renderPipeline();
  showToast(`${name} added to CRM ✓`, 'success');
};

/* ── SAVE NOTE ───────────────────────────────────────────── */
window.saveLeadNote = function (id) {
  const l    = leads.find(x => x.id === id); if (!l) return;
  const inp  = document.getElementById('lead-note-input');
  const text = inp?.value.trim();
  if (!text) { showToast('Note is empty','error'); return; }
  if (!l.notes) l.notes = [];
  l.notes.unshift({text, by:'Admin Nock', date:'Today'});
  if (inp) inp.value = '';
  // Refresh timeline section
  const tl = document.getElementById('lead-timeline-' + id);
  if (tl) tl.insertAdjacentHTML('afterbegin', `
    <div class="timeline-item" style="padding:5px 0">
      <div class="tl-dot"></div>
      <div class="tl-content">
        <div class="tl-text">${text}</div>
        <div class="tl-time">Admin Nock · Today</div>
      </div>
    </div>`);
  showToast('Note saved ✓', 'success');
};

window.assignLead = function (id, staff) {
  const l = leads.find(x => x.id === id); if (l) l.assignee = staff;
  renderPipeline(); showToast(staff?`Assigned to ${staff}`:'Unassigned','success');
};
window.moveLeadStage = function (id, stage, btn, groupKey) {
  const l = leads.find(x => x.id === id); if (!l) return;
  if (stage === 'archived') l.archivedFrom = l.stage;
  l.stage = stage;
  if (btn) {
    btn.closest('.modal-section').querySelectorAll('.btn').forEach(b => {
      b.classList.remove('btn-primary'); b.classList.add('btn-secondary');
    });
    btn.classList.remove('btn-secondary'); btn.classList.add('btn-primary');
  }
  renderPipeline();
  const grp = PIPELINE_GROUPS.find(g => g.key === (groupKey||stage));
  showToast(`Moved to ${grp?.label || STAGE_META[stage]?.label || stage}`, 'success');
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
