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
  const map = { active:'green', renewal:'yellow', pause:'gray', archived:'gray' };
  return UI.badge(s||'—', map[s]||'gray');
}

/* ── RENDER SHELL ───────────────────────────────────────── */
document.getElementById('view-crm').innerHTML = `
${UI.pageHeader('CRM',
  `87 customers · ${leads.filter(l=>l.stage!=='archived').length} active leads`,
  `<button class="btn btn-primary" onclick="openLeadModal()">${UI.icon('add','sm')} New Lead</button>`
)}

<div id="crm-kpi"></div>

<div class="tabs" style="margin-bottom:var(--sp-3)">
  <div class="tab active" id="crm-tab-leads"     onclick="switchCrmTab('leads')">${UI.icon('person_search','sm')} Leads</div>
  <div class="tab"        id="crm-tab-customers" onclick="switchCrmTab('customers')">${UI.icon('groups','sm')} Customers</div>
</div>

<!-- LEADS PANEL -->
<div id="crm-leads">
  <!-- Toolbar: search + branch filter + assignee filter -->
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
    <input type="text" class="tc-search" style="width:200px;flex-shrink:0"
           placeholder="Search leads…" oninput="searchLeads(this.value)">
    <select class="tc-select" id="lead-branch-filter" onchange="searchLeads(document.querySelector('#crm-leads input').value)">
      <option value="all">All Branches</option>
      ${CONST.BRANCHES.map(b=>`<option value="${b}">${b}</option>`).join('')}
    </select>
    <select class="tc-select" id="lead-assignee-filter" onchange="searchLeads(document.querySelector('#crm-leads input').value)">
      <option value="all">All Assignees</option>
      ${CONST.TEACHERS.map(t=>`<option value="${t}">${t}</option>`).join('')}
    </select>
    <div style="margin-left:auto;font-size:var(--fs-label-sm)" class="text-muted">
      ${UI.icon('drag_indicator','sm')} Drag cards to move stages
    </div>
  </div>

  <!-- PIPELINE -->
  <div id="crm-pipeline" class="crm-pipeline"></div>
</div>

<!-- CUSTOMERS PANEL -->
<div id="crm-customers" style="display:none">
  <div class="card">
    <div class="table-controls">
      <input type="text" class="tc-search" id="cust-search" placeholder="Search… (AND/OR/NOT)" oninput="renderCustomers()">
      <select class="tc-select" id="cust-status" onchange="renderCustomers()">
        <option value="all">All Status</option>
        <option value="active">Active</option>
        <option value="renewal">Renewal</option>
        <option value="pause">Pause</option>
        <option value="archived">Archived</option>
      </select>
      <select class="tc-select" id="cust-branch" onchange="renderCustomers()">
        <option value="all">All Branches</option>
        ${CONST.BRANCHES.map(b=>`<option value="${b}">${b}</option>`).join('')}
      </select>
      <div style="margin-left:auto">
        <button class="btn btn-secondary btn-sm" onclick="showToast('Exporting CSV…','info')">
          <span class="mdi mdi-sm">upload</span> Export CSV
        </button>
      </div>
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
  {key:'new',             stages:['new'],                          label:'New Lead',        color:'var(--md-primary)',           bg:'var(--md-primary-container)'},
  {key:'contacting',      stages:['contacting'],                   label:'Contacting',      color:'var(--md-warning)',            bg:'var(--md-warning-container)'},
  {key:'test',            stages:['test_scheduled','tested'],      label:'Test',            color:'var(--clr-on-grammar)',        bg:'var(--clr-grammar)'},
  {key:'trial',           stages:['trial_scheduled','trialed'],    label:'Trial',           color:'var(--md-success)',            bg:'var(--md-success-container)'},
  {key:'payment_pending', stages:['payment_pending'],              label:'Payment Pending', color:'var(--md-error)',              bg:'var(--md-error-container)'},
  {key:'enrolled',        stages:['enrolled'],                     label:'Enrolled ✓',      color:'var(--md-success)',           bg:'var(--md-success-container)'},
  {key:'archived',        stages:['archived'],                     label:'Archived',        color:'var(--md-on-surface-variant)', bg:'var(--md-surface-mid)'},
];

// Sub-state badges shown on cards inside grouped columns
const SUB_STAGE_BADGE = {
  test_scheduled:  {label:`${UI.icon('calendar_today','sm')} Scheduled`, color:'var(--clr-on-grammar)'},
  tested:          {label:`${UI.icon('check_circle','sm')} Tested`,      color:'var(--md-success)'},
  trial_scheduled: {label:`${UI.icon('calendar_today','sm')} Scheduled`, color:'var(--md-success)'},
  trialed:         {label:`${UI.icon('check_circle','sm')} Trialed`,     color:'var(--md-success)'},
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
  if (diff < 0)  return `<span style="color:var(--md-error);font-weight:700;font-size:10px">overdue</span>`;
  if (diff === 0) return `<span style="color:var(--md-warning);font-weight:700;font-size:10px">today!</span>`;
  return `<span style="color:var(--md-warning);font-weight:700;font-size:10px">${diff}d</span>`;
}

let leadFilter = 'all', leadSearch = '';

function renderPipeline() {
  const container = document.getElementById('crm-pipeline');
  if (!container) return;

  // Read branch / assignee filters
  const branchF   = document.getElementById('lead-branch-filter')?.value   || 'all';
  const assigneeF = document.getElementById('lead-assignee-filter')?.value || 'all';

  container.innerHTML = PIPELINE_GROUPS.map(group => {
    const isArchived = group.key === 'archived';
    const stageLeads = leads.filter(l => {
      if (!group.stages.includes(l.stage)) return false;
      if (branchF   !== 'all' && l.branch   !== branchF)   return false;
      if (assigneeF !== 'all' && l.assignee !== assigneeF) return false;
      if (leadSearch) {
        const q = leadSearch.toLowerCase();
        if (!(l.name + (l.course||'')).toLowerCase().includes(q)) return false;
      }
      return true;
    });

    const cards = stageLeads.map(l => leadCardHTML(l, group)).join('');
    const defaultNewStage = group.stages[0];

    return `
    <div class="pipeline-col${isArchived?' pipeline-col--archived':''}"
         ondragover="event.preventDefault();this.classList.add('drag-over')"
         ondragleave="this.classList.remove('drag-over')"
         ondrop="dropLead(event,'${group.key}')">
      <!-- Column header with left-accent color bar -->
      <div class="pipeline-header">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:3px;height:14px;border-radius:2px;background:${group.color};flex-shrink:0"></div>
          <span style="font-size:var(--fs-label-sm);font-weight:600;color:var(--md-on-surface);text-transform:uppercase;letter-spacing:.5px">${group.label}</span>
        </div>
        <span class="pipeline-count" style="background:${group.bg};color:${group.color}">${stageLeads.length}</span>
      </div>
      <div class="pipeline-cards">
        ${cards}
        ${!isArchived ? `
        <div class="pipeline-add-btn" onclick="openLeadModal(null,null,'${defaultNewStage}')">
          ${UI.icon('add','sm')} Add Lead
        </div>` : ''}
      </div>
    </div>`;
  }).join('');
}

function leadCardHTML(l, group) {
  const isArchived = group.key === 'archived';
  const isEnrolled = group.key === 'enrolled';
  const pendingSub  = (DB.formSubmissions||[]).find(s => s.leadId === l.id && s.status === 'pending');
  const subBadge    = SUB_STAGE_BADGE[l.stage];
  const srcCls = ['Referred','Referral'].includes(l.source) ? 'badge-blue'
               : l.source === 'Website' ? 'badge-purple' : 'badge-gray';

  // ── Enrolled card: special compact green design ──────────
  if (isEnrolled) {
    const sub = (DB.formSubmissions||[]).find(s => s.leadId === l.id && s.status === 'approved' && s.type === 'enrollment');
    const courseName = sub?.data?.course?.name || l.course || '—';
    const teacherName = sub?.data?.schedule?.teacher || '—';
    return `
    <div class="lead-card" style="border:1.5px solid var(--md-success);background:var(--md-success-container,#f0fdf4);cursor:pointer"
         onclick="openLeadModal('${l.id}')">
      <div style="display:flex;align-items:center;gap:var(--sp-1);margin-bottom:var(--sp-1)">
        <span style="font-size:var(--fs-label-sm);font-weight:700;color:var(--md-success);display:flex;align-items:center;gap:var(--sp-1)">
          ${UI.icon('check_circle','sm')} Enrolled
        </span>
        <span class="text-muted" style="font-size:var(--fs-label-sm);margin-left:auto">22 May</span>
      </div>
      <div style="font-size:var(--fs-label-md);font-weight:700;color:var(--md-on-surface)">${l.name}</div>
      <div style="font-size:var(--fs-label-sm);color:var(--md-success);font-weight:600;margin-top:var(--sp-1)">${courseName}</div>
      ${teacherName !== '—' ? `<div class="text-muted" style="font-size:var(--fs-label-sm);margin-top:2px">
        ${UI.icon('person','sm')} ${teacherName}
      </div>` : ''}
      <div style="display:flex;gap:var(--sp-1);margin-top:var(--sp-2)">
        <button class="btn btn-sm" style="flex:1;background:var(--md-success);color:#fff;border:none;font-size:var(--fs-label-sm);padding:5px 0;justify-content:center"
          onclick="event.stopPropagation();switchCrmTab('customers');setTimeout(()=>openCustomerModal('${l.name}'),80)">
          ${UI.icon('person','sm')} View Customer →
        </button>
        <button class="chat-btn" style="background:var(--md-success-container,#d1fae5);border-color:var(--md-success)"
          onclick="event.stopPropagation();openLeadInbox('${l.id}')" title="Chat">
          ${UI.icon('chat','sm')}
        </button>
      </div>
    </div>`;
  }

  return `
  <div class="lead-card${isArchived?' lead-card--archived':''}" draggable="true"
       ondragstart="startDrag(event,'${l.id}')"
       ondragend="endDrag(event)"
       onclick="openLeadModal('${l.id}')">

    <!-- Row 1: Name + age (right) -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:4px">
      <div class="lead-name">${l.name}</div>
      ${l.childGrade ? `<span class="badge badge-gray" style="font-size:10px;flex-shrink:0">${l.childGrade}</span>` : (l.age ? `<span class="text-muted" style="font-size:var(--fs-label-sm);white-space:nowrap;flex-shrink:0">Age ${l.age}</span>` : '')}
    </div>

    <!-- Row 2: Course -->
    <div class="lead-meta" style="margin-top:2px">${l.course||'—'}</div>

    <!-- Row 3: Sub-stage badge (Scheduled / Tested / Trialed) -->
    ${subBadge ? `<div style="display:flex;align-items:center;gap:3px;margin-top:4px;font-size:var(--fs-label-sm);font-weight:600;color:${subBadge.color}">${subBadge.label}</div>` : ''}

    <!-- Row 4: Schedule date -->
    ${l.schedDate ? `<div class="text-muted" style="display:flex;align-items:center;gap:3px;margin-top:3px;font-size:var(--fs-label-sm)">
      ${UI.icon('event','sm')} ${l.schedDate} ${schedDaysLeft(l.schedDate)}
    </div>` : ''}

    <!-- Row 5: Form pending alert — payment review CTA -->
    ${pendingSub ? `<div style="display:flex;align-items:center;gap:4px;margin-top:4px;font-size:10px;font-weight:600;
        color:var(--md-on-error-container);background:var(--md-error-container);
        border-radius:4px;padding:3px 7px;cursor:pointer"
        onclick="event.stopPropagation();openFormReviewModal('${pendingSub.id}')">
      <span class="mdi mdi-sm" style="font-size:11px">pending</span> ${pendingSub.type === 'enrollment' ? 'Payment received — Review →' : 'Form Pending →'}
    </div>` : ''}

    <!-- Row 6: Archived from label -->
    ${isArchived && l.archivedFrom ? `<div class="text-muted" style="font-size:var(--fs-label-sm);margin-top:3px">
      Archived from: ${STAGE_META[l.archivedFrom]?.label||l.archivedFrom}
    </div>` : ''}

    <!-- Footer: source badge + assignee + actions -->
    <div style="display:flex;align-items:center;gap:4px;margin-top:7px;flex-wrap:wrap">
      ${UI.badge(l.source, srcCls.replace('badge-',''))}
      ${l.assignee
        ? `<span style="font-size:var(--fs-label-sm);color:var(--md-primary);display:flex;align-items:center;gap:2px;margin-left:2px">
             ${UI.icon('person','sm')}${l.assignee}
           </span>`
        : `<span class="text-muted" style="font-size:var(--fs-label-sm);margin-left:2px">Unassigned</span>`}
      <div style="margin-left:auto;display:flex;gap:3px">
        ${l.line  ? `<button class="chat-btn" onclick="event.stopPropagation();openLeadInbox('${l.id}')" title="Chat">
          ${UI.icon('chat','sm')}</button>` : ''}
        ${l.phone ? `<button class="chat-btn" onclick="event.stopPropagation();showToast('Calling…','info')" title="Call">
          ${UI.icon('call','sm')}</button>` : ''}
        ${isArchived ? `<button class="btn btn-xs btn-ghost" style="font-size:var(--fs-label-sm);padding:2px 7px"
            onclick="event.stopPropagation();unarchiveLead('${l.id}')">↩ Restore</button>` : ''}
      </div>
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
  e.currentTarget.classList.remove('drag-over');
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

window.setLeadFilter = function (f, el) { /* kept for compatibility */ renderPipeline(); };
window.searchLeads  = function (v) { leadSearch = v; renderPipeline(); };

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

  Modal.create('modal-create-lead-inbox', `${UI.icon('add')} Create Lead from Conversation`, `
    <!-- Source banner -->
    <div style="display:flex;align-items:center;gap:10px;background:var(--md-success-container);
                border:1px solid var(--md-success);border-radius:9px;padding:11px 14px;margin-bottom:4px">
      <div style="font-size:22px">${UI.icon('chat')}</div>
      <div>
        <div style="font-size:13px;font-weight:600;color:var(--md-on-surface)">${conv.name}</div>
        <div class="text-muted" style="font-size:11px;margin-top:2px">
          ${(()=>{const c={LINE:'#06c755',WhatsApp:'#25d366',Email:'var(--md-primary)',SMS:'var(--md-warning)'}[conv.channel]||'var(--md-on-surface-variant)';return `<span style="font-size:9px;font-weight:700;color:#fff;background:${c};border-radius:4px;padding:1px 5px">${conv.channel||'?'}</span>`;})()}  · ${preBranch} · Lead จะ link กับ conversation นี้อัตโนมัติ
        </div>
      </div>
    </div>

    <div class="modal-section">
      <div class="settings-row">
        <div style="flex:2">
          <label class="settings-label">Parent / Contact Name <span class="text-error">*</span></label>
          <input id="cil-name" class="settings-input" value="${preName}" placeholder="e.g. Romano Dad">
        </div>
        <div style="flex:1">
          <label class="settings-label">Age of Student</label>
          <input id="cil-age" class="settings-input" type="number" placeholder="9" min="4" max="20">
        </div>
      </div>

      <div>
        <label class="settings-label">Course Interest <span class="text-error">*</span></label>
        <input id="cil-course" class="settings-input"
          placeholder="จาก chat: เช่น 'Math ป.5', 'Eng (Active)' …">
        <div class="text-muted" style="font-size:11px;margin-top:4px">
          ${UI.icon('info','sm')} ดูจาก chat ด้านซ้ายว่า parent สนใจวิชาอะไร
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
        <label class="settings-label">First Note <span class="text-muted" style="font-weight:400">(optional)</span></label>
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
    conv.preview = `Lead created · ${course}`;
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
    Modal.create('modal-lead', `${UI.icon('add')} New Lead`, `
      <div class="modal-section">
        <div class="settings-row">
          <div style="flex:2">
            <label class="settings-label">Full Name <span class="text-error">*</span></label>
            <input id="nl-name" class="settings-input" placeholder="e.g. Sarah Mitchell" autofocus>
          </div>
          <div style="flex:0 0 80px">
            <label class="settings-label">Age</label>
            <input id="nl-age" class="settings-input" type="number" placeholder="9" min="4" max="20">
          </div>
        </div>
        <div class="settings-row">
          <div style="flex:1">
            <label class="settings-label">Course Interest <span class="text-error">*</span></label>
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
  const meta     = STAGE_META[l.stage] || {label:l.stage, color:'var(--md-on-surface-variant)', bg:'var(--md-surface-mid)'};
  const subBadge = SUB_STAGE_BADGE?.[l.stage];
  const pendingSub = (DB.formSubmissions||[]).find(s => s.leadId === l.id && s.status === 'pending');
  const hasContact = l.line || l.phone || l.convId;
  const stages = ['new','contacting','test_scheduled','tested','trial_scheduled','trialed','payment_pending'];

  Modal.create('modal-lead', `${UI.icon('person_search')} Lead`, `

    <!-- Header: name + stage + quick contact -->
    <div style="display:flex;gap:var(--sp-3);align-items:flex-start;padding-bottom:var(--sp-3);
                border-bottom:1px solid var(--md-outline-variant);margin-bottom:var(--sp-1)">
      <div style="width:42px;height:42px;border-radius:var(--shape-md);background:var(--md-primary-container);display:flex;
                  align-items:center;justify-content:center;font-size:17px;font-weight:700;
                  color:var(--md-on-primary-container);flex-shrink:0">${l.name[0]}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:var(--fs-title-sm);font-weight:700;color:var(--md-on-surface)">${l.name}</div>
        <div style="display:flex;gap:var(--sp-2);align-items:center;margin-top:var(--sp-1);flex-wrap:wrap">
          <span style="background:${meta.bg};color:${meta.color};font-size:var(--fs-label-sm);font-weight:600;
                       border-radius:var(--shape-full);padding:3px 10px">${meta.label}</span>
          ${subBadge ? `<span style="font-size:var(--fs-label-sm);font-weight:600;color:${subBadge.color}">${subBadge.label}</span>` : ''}
          ${l.schedDate ? `<span class="text-muted" style="font-size:var(--fs-label-sm)">${UI.icon('event','sm')} ${l.schedDate} ${schedDaysLeft(l.schedDate)}</span>` : ''}
        </div>
      </div>
      <div style="display:flex;gap:var(--sp-1);flex-shrink:0">
        ${l.line  ? `<button class="btn btn-secondary btn-sm" onclick="Modal.close('modal-lead');openLeadInbox('${l.id}')">${UI.icon('chat','sm')} Chat</button>` : ''}
        ${l.phone ? `<button class="btn btn-secondary btn-sm" onclick="showToast('Calling ${l.phone}…','info')">${UI.icon('call','sm')}</button>` : ''}
      </div>
    </div>

    <!-- Info + assign -->
    <div class="modal-section">
      <div class="info-grid">
        <div class="info-item"><div class="label">Course Interest</div><strong>${l.course||'—'}</strong></div>
        <div class="info-item"><div class="label">Grade</div>${l.childGrade||(l.age?'Age '+l.age:'—')}</div>
        <div class="info-item"><div class="label">Source</div>${l.source||'—'}</div>
        <div class="info-item"><div class="label">Added</div>${daysLabel(l.daysAgo)}</div>
        <div class="info-item"><div class="label">Phone</div>${l.phone||'—'}</div>
        <div class="info-item"><div class="label">LINE</div>${l.line||'—'}</div>
        <div class="info-item" style="grid-column:span 2">
          <div class="label">Assigned to</div>
          <select style="border:none;background:none;font-size:13px;padding:0;cursor:pointer;
                         color:var(--md-primary);font-weight:600;outline:none"
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
        ${PIPELINE_GROUPS.filter(g=>g.key!=='archived'&&g.key!=='enrolled').map(g => {
          const isActive = g.stages.includes(l.stage);
          return `<button class="btn ${isActive?'btn-primary':'btn-secondary'} btn-sm"
            onclick="moveLeadStage('${l.id}','${g.stages[0]}',this,'${g.key}')">${g.label}</button>`;
        }).join('')}
        <button class="btn btn-ghost btn-sm" class="text-muted"
          onclick="moveLeadStage('${l.id}','archived');Modal.close('modal-lead')">${UI.icon('archive','sm')} Archive</button>
      </div>
    </div>

    <!-- Send Form — shows pending alert if any -->
    <div class="modal-section">
      <div class="modal-section-title">Send Form</div>
      ${pendingSub ? `
      <div style="background:var(--md-error-container);border:1px solid var(--md-error);border-radius:var(--shape-sm);
                  padding:var(--sp-2) var(--sp-3);display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-2)">
        <div style="font-size:var(--fs-label-sm);color:var(--md-error);font-weight:600">${UI.icon('pending_actions','sm')} Form submitted — awaiting review</div>
        <button class="btn btn-primary btn-sm"
          onclick="openFormReviewModal('${pendingSub.id}');Modal.close('modal-lead')">Review →</button>
      </div>` : ''}
      <div style="display:flex;gap:7px;flex-wrap:wrap">
        <button class="btn ${['new','contacting'].includes(l.stage)?'btn-primary':'btn-secondary'} btn-sm"
          onclick="openSendFormModal('${l.id}','test')">${UI.icon('assignment','sm')} Test Form</button>
        <button class="btn ${['test_scheduled','tested'].includes(l.stage)?'btn-primary':'btn-secondary'} btn-sm"
          onclick="openSendFormModal('${l.id}','trial')">${UI.icon('assignment_turned_in','sm')} Trial Form</button>
        <button class="btn ${['trialed','trial_scheduled'].includes(l.stage)?'btn-primary':'btn-secondary'} btn-sm"
          onclick="openSendFormModal('${l.id}','enrollment')">${UI.icon('how_to_reg','sm')} Enrollment Form</button>
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
     ${hasContact ? `<button class="btn btn-primary" onclick="Modal.close('modal-lead');openLeadInbox('${l.id}')">${UI.icon('chat','sm')} Open in Inbox</button>` : ''}`,
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
    const col=c.remain<=2?'var(--md-error)':c.remain<=5?'var(--md-warning)':'var(--md-success)';
    return `<tr class="tr-click" onclick="openCustomerModal('${c.name}')">
      <td><strong>${c.name}</strong>
        <button class="chat-btn" onclick="event.stopPropagation();openInboxFor('${c.family}')" title="Chat">${UI.icon('chat','sm')}</button></td>
      <td><span class="text-primary" style="cursor:pointer;text-decoration:underline;font-size:var(--fs-label-md)"
           onclick="event.stopPropagation();showView('families');showToast('Opening ${c.family}…','info')">${c.family}</span></td>
      <td>${c.branch}</td>
      <td><span class="pill">${c.pkg}</span></td>
      <td><strong style="color:${col}">${c.remain}</strong> <span class="text-muted" style="font-size:var(--fs-label-sm)">/ ${c.total} (${pct}%)</span></td>
      <td class="text-muted" style="font-size:var(--fs-label-sm)">${c.since} – ${c.until}</td>
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
        <button class="btn btn-secondary btn-sm" onclick="openInboxFor('${c.family}')">${UI.icon('chat','sm')} Chat</button>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Contact Info <button class="btn btn-ghost btn-xs" onclick="toggleCustEdit()">${UI.icon('edit','sm')} Edit</button></div>
        <div id="cust-view-info" class="info-grid">
          <div class="info-item"><div class="label">Phone</div>${c.phone||'—'}</div>
          <div class="info-item"><div class="label">LINE</div>${c.line||'—'}</div>
          <div class="info-item"><div class="label">Family</div>
            <span class="text-primary" style="cursor:pointer;text-decoration:underline" onclick="showView('families');showToast('Opening ${c.family}…','info')">${c.family}</span>
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
          <button class="btn btn-ghost btn-sm text-muted" onclick="showToast('Archived','info');Modal.close('modal-customer')">Archive</button>
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
          <div class="info-item"><div class="label">Remaining</div><strong style="color:${c.remain<=2?'var(--md-error)':'var(--md-success)'}">${c.remain} / ${c.total}</strong></div>
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
          <div class="tl-dot" style="background:${s.att==='Present'?'var(--md-success)':'var(--md-warning)'}"></div>
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
        <div class="modal-section-title">AI Learning Summary <span class="text-muted" style="font-size:10px">(aggregated from all sessions)</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:14px">
          ${[
            {label:'Behavior',    score:4, note:'Focused, participates well'},
            {label:'Learning Curve', score:3, note:'Steady improvement in reading'},
            {label:'Focus',       score:4, note:'Good concentration 80% of time'},
            {label:'Attendance',  score:5, note:'94% attendance rate'},
            {label:'Homework',    score:3, note:'Completes most assignments'},
            {label:'Progress',    score:4, note:'On track for level up'},
          ].map(item=>`<div style="background:var(--md-surface-mid);border-radius:var(--shape-sm);padding:var(--sp-2);border:1px solid var(--md-outline-variant)">
            <div class="text-muted" style="font-size:var(--fs-label-sm);font-weight:600;margin-bottom:4px">${item.label}</div>
            <div style="font-size:15px;margin-bottom:2px;color:var(--md-warning)">${'★'.repeat(item.score)}<span style="color:var(--md-outline)">${'★'.repeat(5-item.score)}</span></div>
            <div style="font-size:var(--fs-label-sm);color:var(--md-on-surface)">${item.note}</div>
          </div>`).join('')}
        </div>
        <div style="background:var(--md-primary-container,#f0f0ff);border-radius:var(--shape-sm);padding:var(--sp-3);font-size:var(--fs-label-md);color:var(--md-on-surface);line-height:1.6">
          <strong>${UI.icon('smart_toy','sm')} AI Summary:</strong> ${c.name.split(' ')[0]} แสดงพัฒนาการที่ดีในด้าน reading comprehension โดยเฉพาะ phonics และ vocabulary เพิ่มขึ้นเรื่อยๆ ควรเน้นเรื่อง speaking confidence ในช่วงถัดไป
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
            <th style="text-align:left;padding:var(--sp-1) var(--sp-2);font-size:var(--fs-label-sm);border-bottom:1px solid var(--md-outline-variant)">Invoice</th>
            <th style="text-align:left;padding:var(--sp-1) var(--sp-2);font-size:var(--fs-label-sm);border-bottom:1px solid var(--md-outline-variant)">Course</th>
            <th style="text-align:left;padding:var(--sp-1) var(--sp-2);font-size:var(--fs-label-sm);border-bottom:1px solid var(--md-outline-variant)">Amount</th>
            <th style="text-align:left;padding:var(--sp-1) var(--sp-2);font-size:var(--fs-label-sm);border-bottom:1px solid var(--md-outline-variant)">Date</th>
            <th style="text-align:left;padding:var(--sp-1) var(--sp-2);font-size:var(--fs-label-sm);border-bottom:1px solid var(--md-outline-variant)">Status</th>
          </tr></thead>
          <tbody>
            ${(() => {
              const stu = DB.students.find(s => s.name === name);
              const invList = stu?.invoices || [];
              if (!invList.length) return `<tr><td colspan="5" style="padding:var(--sp-3) var(--sp-2);text-align:center" class="text-muted">No invoices yet.</td></tr>`;
              return invList.map(inv => `
                <tr>
                  <td style="padding:var(--sp-2) var(--sp-1);font-size:var(--fs-label-md);font-weight:600">${inv.id}</td>
                  <td style="padding:var(--sp-2) var(--sp-1);font-size:var(--fs-label-md)">${inv.course||inv.id}</td>
                  <td style="padding:var(--sp-2) var(--sp-1);font-size:var(--fs-label-md);font-weight:700;color:var(--md-success)">${inv.amount ? Utils.currency(inv.amount) : '—'}</td>
                  <td style="padding:var(--sp-2) var(--sp-1);font-size:var(--fs-label-md)" class="text-muted">${inv.date||'—'}</td>
                  <td style="padding:8px 6px"><span class="badge badge-green">Paid</span></td>
                </tr>`).join('');
            })()}
          </tbody>
        </table>
      </div>

      <div class="modal-section">
        <div class="modal-section-title">${UI.icon('receipt','sm')} Invoice + Receipt History</div>
        ${(() => {
          const stu = DB.students.find(s => s.name === name);
          const invList = stu?.invoices || [];
          const rcpMap  = {};
          (stu?.receipts||[]).forEach(r => { rcpMap[r.invoiceId] = r; });
          if (!invList.length) return UI.emptyState('receipt_long', 'No records yet');
          return invList.map(inv => {
            const rcp = rcpMap[inv.id];
            const slip = inv.payslip;
            return `
            <div style="border:1px solid var(--md-outline-variant);border-radius:var(--shape-md);padding:var(--sp-3);margin-bottom:var(--sp-2)">
              <div style="display:flex;align-items:flex-start;gap:12px">
                ${slip?.dataUrl
                  ? `<img src="${slip.dataUrl}" alt="slip"
                          style="width:50px;height:66px;object-fit:cover;border-radius:var(--shape-sm);border:1px solid var(--md-outline-variant);cursor:pointer;flex-shrink:0"
                          onclick="window.open(this.src,'_blank')" title="View pay slip">`
                  : `<div style="width:50px;height:66px;display:flex;align-items:center;justify-content:center;background:var(--md-surface-mid);border-radius:var(--shape-sm);border:1px solid var(--md-outline-variant);font-size:var(--fs-label-sm);flex-shrink:0;text-align:center" class="text-muted">No<br>Slip</div>`}
                <div style="flex:1;min-width:0">
                  <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
                    <span style="font-size:12px;font-weight:700;color:var(--md-on-surface)">${inv.id}</span>
                    <span class="badge badge-green" style="font-size:10px">Paid</span>
                  </div>
                  <div style="font-size:12px;color:var(--md-on-surface)">${inv.course||'—'} · ${inv.hours||24}h.</div>
                  <div style="font-size:14px;font-weight:700;color:var(--md-success);margin-top:4px">${inv.amount ? Utils.currency(inv.amount) : '—'}</div>
                  <div class="text-muted" style="font-size:10px;margin-top:2px">${inv.method||'Bank Transfer'} · ${inv.date||'—'}</div>
                  ${slip?.refNo ? `<div class="text-muted" style="font-size:10px;margin-top:1px">Ref: ${slip.refNo}</div>` : ''}
                </div>
                ${rcp?.dataUrl
                  ? `<div style="flex-shrink:0;text-align:right">
                       <img src="${rcp.dataUrl}" alt="receipt"
                            style="width:44px;height:58px;object-fit:cover;border-radius:var(--shape-sm);border:1px solid var(--md-outline-variant);cursor:pointer;display:block;margin-bottom:4px"
                            onclick="window.open(this.src,'_blank')" title="View receipt">
                       <div style="font-size:var(--fs-label-sm);font-weight:600" class="text-primary">${rcp.id}</div>
                       <a href="${rcp.dataUrl}" download="${rcp.id}.svg"
                          style="font-size:var(--fs-label-sm);text-decoration:none" class="text-primary">↓ Save</a>
                     </div>`
                  : ''}
              </div>
            </div>`;
          }).join('');
        })()}
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
          <div class="text-muted" style="font-size:var(--fs-label-sm)">All events · newest first</div>
        </div>
        <div style="max-height:420px;overflow-y:auto">
          ${Timeline.build(_events)}
        </div>
      </div>`;
    })(),
  };

  const tabLabels = [['overview','Overview'],['course','Course & Schedule'],['learning','Learning Summary'],['payment','Payment'],['timeline','Timeline']];

  Modal.create('modal-customer', `${UI.icon('person')} ${name}`,
    `<div class="tabs" style="margin:-20px -20px 16px;padding:0 16px;border-radius:0">
      ${tabLabels.map(([id,lbl],i)=>`<div class="tab ${i===0?'active':''}" onclick="custTab('${id}',this)">${lbl}</div>`).join('')}
    </div>
    ${tabLabels.map(([id],i)=>`<div id="ctab-${id}" ${i>0?'style="display:none"':''}>${tabContent[id]}</div>`).join('')}`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-customer')">Close</button>
     <button class="btn btn-secondary" onclick="openInboxFor('${c.family}');Modal.close('modal-customer')">${UI.icon('chat','sm')} Chat</button>
     <button class="btn btn-primary" onclick="openFollowUpModal('${name}');Modal.close('modal-customer')">${UI.icon('call','sm')} Follow Up</button>`,
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
(function renderCrmKPI() {
  const activeLeads = leads.filter(l=>l.stage!=='archived').length;
  const el = document.getElementById('crm-kpi');
  if (!el) return;
  el.innerHTML = UI.kpiGrid([
    { icon:'groups',      label:'Total Customers',  value:87,            color:'success',  sub:'+5 this month',  subColor:'up'   },
    { icon:'person_search',label:'Active Leads',    value:activeLeads,   color:'',         sub:'+3 this week',   subColor:'up'   },
    { icon:'autorenew',   label:'Renewal Pending',  value:6,             color:'warning',  sub:'Action required',subColor:'down' },
    { icon:'trending_up', label:'Conversion Rate',  value:'68%',         color:'tertiary', sub:'↑ 5% MoM',       subColor:'up'   },
    { icon:'payments',    label:'Revenue (May)',     value:'฿124.5K',     color:'success',  sub:'↑ 12% MoM',      subColor:'up'   },
  ]);
  const grid = el.querySelector('.kpi-grid');
  if (grid) grid.style.gridTemplateColumns = 'repeat(5,1fr)';
  // Make first two cards clickable
  const cards = el.querySelectorAll('.kpi-card');
  if (cards[0]) { cards[0].style.cursor='pointer'; cards[0].onclick=()=>switchCrmTab('customers'); }
  if (cards[1]) { cards[1].style.cursor='pointer'; cards[1].onclick=()=>switchCrmTab('leads');     }
})();
renderPipeline();

})();
