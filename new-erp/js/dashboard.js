/* ============================================================
   dashboard.js — NockERP Dashboard Module
   All KPIs + Renewal + Alerts computed from DB live data
   ============================================================ */
(function () {

  /* ── LIVE COMPUTATIONS ─────────────────────────────────── */
  const todayDH  = DB.dayHeaders.find(d => d.isToday);
  const WDAYS    = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MNAMES   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function _todayLabel() {
    if (!todayDH) return 'Today';
    const d = new Date(todayDH.date);
    return `${WDAYS[d.getDay()]}, ${d.getDate()} ${MNAMES[d.getMonth()]} ${d.getFullYear()}`;
  }

  const allStudents     = DB.students;
  const activeStudents  = allStudents.filter(s => ['active','renewal'].includes(s.status));
  const renewalStudents = allStudents.filter(s => s.status === 'renewal');
  const urgentStudents  = renewalStudents.filter(s =>
    Math.min(...(s.courses||[{left:99}]).map(c=>c.left)) <= 1);

  /* Revenue = paid invoices (source of truth = DB.invoices, ตรงกับ Billing) */
  const paidInvoices = (DB.invoices||[]).filter(i => i.status === 'paid');
  const revenuePaid  = paidInvoices.reduce((sum,i) => sum + (i.amount||0), 0);

  const activeLeads = (DB.leads||[]).filter(l => l.stage !== 'archived');
  const newLeads    = (DB.leads||[]).filter(l => l.stage === 'new');

  const renewalList = [...renewalStudents].sort((a,b) => {
    const la = Math.min(...(a.courses||[{left:99}]).map(c=>c.left));
    const lb = Math.min(...(b.courses||[{left:99}]).map(c=>c.left));
    return la - lb;
  });

  const alerts = [];
  renewalStudents.forEach(s => {
    const left = Math.min(...(s.courses||[{left:99}]).map(c=>c.left));
    alerts.push({
      level: left <= 1 ? 'danger' : 'warning',
      text:  left <= 1
        ? `${s.name} เหลือ <strong>${left} class</strong> — ถ้าไม่ต่อวันนี้จะหมดสัญญา`
        : `${s.name} เหลือ <strong>${left} class</strong> — ควรติดต่อผู้ปกครองเพื่อ renew`,
      time:   left <= 1 ? 'เร่งด่วน' : 'ภายใน 7 วัน',
      action: `openFollowUpModal('${s.name}')`, label: 'Follow Up →'
    });
  });
  if (newLeads.length > 0) {
    alerts.push({ level:'info',
      text: `<strong>${newLeads.length} New Lead${newLeads.length>1?'s':''}</strong> ยังไม่มีการติดต่อ`,
      time: 'รอการติดต่อ',
      action: `showView('crm')`, label: 'ไป CRM →' });
  }

  const recentEvents = [];
  allStudents.forEach(s => {
    const lastAtt = [...(s.attendance||[])].sort((a,b)=>b.date.localeCompare(a.date))[0];
    if (lastAtt) {
      const col = lastAtt.status==='present'?'var(--md-success)'
                : lastAtt.status==='absent' ?'var(--md-error)':'var(--md-warning)';
      const lbl = lastAtt.status==='present'?'Present':lastAtt.status==='absent'?'Absent':'Leave';
      recentEvents.push({ color:col,
        text:`<strong>${lbl}</strong> — ${s.name} · ${lastAtt.course}`, time:lastAtt.date });
    }
    const lastInv = [...(s.invoices||[])].sort((a,b)=>b.date.localeCompare(a.date))[0];
    if (lastInv) recentEvents.push({ color:'var(--md-success)',
      text:`<strong>Payment</strong> — ${s.family} · ฿${lastInv.amount.toLocaleString()}`, time:lastInv.date });
    const lastNote = (s.notes||[]).slice(-1)[0];
    if (lastNote) recentEvents.push({ color:'var(--md-on-surface-variant)',
      text:`<strong>Note</strong> — ${s.name}: ${lastNote.text.slice(0,55)}${lastNote.text.length>55?'…':''}`,
      time:lastNote.date });
  });
  recentEvents.sort((a,b) => b.time.localeCompare(a.time));
  const top5 = recentEvents.slice(0, 5);

  /* ── HTML HELPERS ──────────────────────────────────────── */
  function renewalRow(s) {
    const left = Math.min(...(s.courses||[{left:99}]).map(c=>c.left));
    const isUr = left <= 1;
    return `<div class="renewal-item">
      <div class="renewal-name">${s.name}${isUr?` ${UI.badge('1 left!','red')}`:''}</div>
      <div class="renewal-classes">${left} class${left===1?'':'es'} left</div>
      <button class="btn ${isUr?'btn-danger':'btn-primary'} btn-sm"
        onclick="openFollowUpModal('${s.name}')">Follow Up</button>
    </div>`;
  }

  function alertRow(a) {
    const color = a.level==='danger'?'red':a.level==='warning'?'yellow':'blue';
    return `<div class="alert-item">
      <div class="alert-bar ${a.level}"></div>
      <div class="alert-body">
        ${UI.badge(a.level.charAt(0).toUpperCase()+a.level.slice(1), color)}
        <div class="alert-text" style="margin-top:4px">${a.text}</div>
        <div class="alert-time">${a.time}</div>
        <button class="btn btn-ghost btn-xs text-primary" style="padding:0;height:auto"
          onclick="${a.action}">${a.label}</button>
      </div>
    </div>`;
  }

  function activityRow(e) {
    return `<div class="timeline-item">
      <div class="tl-dot" style="background:${e.color}"></div>
      <div class="tl-content">
        <div class="tl-text">${e.text}</div>
        <div class="tl-time">${e.time}</div>
      </div>
    </div>`;
  }

  const dangerCount  = alerts.filter(a=>a.level==='danger').length;
  const warningCount = alerts.filter(a=>a.level==='warning').length;
  const alertBadge   = dangerCount > 0
    ? UI.badge(`${dangerCount} Danger`, 'red')
    : UI.badge(`${warningCount} Warning`, 'yellow');

  /* ── RENDER ────────────────────────────────────────────── */
  document.getElementById('view-dashboard').innerHTML = `

  ${UI.pageHeader('Good morning, Nock', _todayLabel(),
    `<button class="btn btn-primary" onclick="openQuickAction()">
      ${UI.icon('add')} Quick Action</button>`
  )}

  ${UI.kpiGrid([
    { icon:'school',        label:'Active Students',  value:activeStudents.length,
      color:'success',  sub:'↑ enrolled & active', subColor:'up' },
    { icon:'autorenew',     label:'Renewal Pending',   value:renewalStudents.length,
      color:urgentStudents.length>0?'error':'warning',
      sub: urgentStudents.length>0?`↓ ${urgentStudents.length} urgent`:'↑ All up to date',
      subColor:renewalStudents.length>0?'down':'up' },
    { icon:'payments',      label:'Revenue · Paid',     value:`฿${revenuePaid.toLocaleString()}`,
      color:'tertiary', sub:`↑ ${paidInvoices.length} paid invoices`, subColor:'up' },
    { icon:'person_search', label:'Active Leads',       value:activeLeads.length,
      sub: newLeads.length>0?`↓ ${newLeads.length} new — not contacted`:'↑ All contacted',
      subColor:newLeads.length>0?'down':'up' },
  ])}

  <!-- ROW 2 -->
  <div class="grid-2 mb-16" style="align-items:start">
    <div class="card">
      <div class="card-header" id="dash-today-header">
        <div class="card-title">${UI.icon('calendar_today','sm')} Today's Classes</div>
        <button class="btn btn-secondary btn-sm" onclick="showView('calendar')">View Calendar</button>
      </div>
      <div class="card-body" id="dash-today-sessions"></div>
    </div>

    <div style="display:flex;flex-direction:column;gap:var(--sp-4)">
      <div class="card">
        <div class="card-header">
          <div class="card-title">${UI.icon('autorenew','sm')} Renewal Pending</div>
          ${UI.badge(`${renewalList.length} student${renewalList.length!==1?'s':''}`, renewalList.length>0?'red':'green')}
        </div>
        <div class="card-body">
          ${renewalList.length > 0 ? renewalList.map(renewalRow).join('')
            : UI.emptyState('check_circle','No renewals pending','')}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">${UI.icon('checklist','sm')} My Tasks</div>
          <button class="btn btn-secondary btn-sm" onclick="showView('tasks')">+ Add</button>
        </div>
        <div class="card-body">
          <div class="task-item">
            <div class="task-check" onclick="toggleTask(this)"></div>
            <div class="task-info">
              <div class="task-text">Send renewal invoice — Tanaka Family</div>
              <div class="task-sub">Mia Tanaka · English Reading</div>
            </div>
            <div class="task-right">
              <span class="task-source ai">${UI.icon('smart_toy','sm')} AI Suggest</span>
              <span class="task-due urgent">Today</span>
            </div>
          </div>
          <div class="task-item">
            <div class="task-check" onclick="toggleTask(this)"></div>
            <div class="task-info">
              <div class="task-text">Follow up call — Wilson Family</div>
              <div class="task-sub">James Wilson · 1 class left</div>
            </div>
            <div class="task-right">
              <span class="task-source manager">${UI.icon('person','sm')} Kru Arm</span>
              <span class="task-due urgent">Today</span>
            </div>
          </div>
          <div class="task-item">
            <div class="task-check done" onclick="toggleTask(this)">✓</div>
            <div class="task-info">
              <div class="task-text done">Confirm June schedule — Srirak Family</div>
            </div>
            <div class="task-right">
              <span class="task-source system">${UI.icon('build','sm')} System</span>
              <span class="task-due text-success">Done</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- ROW 3 -->
  <div class="grid-2">
    <div class="card">
      <div class="card-header">
        <div class="card-title">${UI.icon('history','sm')} Recent Activity</div>
      </div>
      <div class="card-body">
        ${top5.length > 0 ? top5.map(activityRow).join('')
          : UI.emptyState('history','No recent activity','')}
      </div>
    </div>

    <div class="card">
      <div class="card-header">
        <div class="card-title">${UI.icon('warning','sm')} Risk & Alert</div>
        ${alertBadge}
      </div>
      <div class="card-body">
        ${alerts.length > 0 ? alerts.map(alertRow).join('')
          : UI.emptyState('check_circle','No active alerts','')}
      </div>
    </div>
  </div>`;

  /* ── TODAY'S SESSIONS ──────────────────────────────────── */
  (function renderTodaySessions() {
    const sessions = todayDH ? DB.sessions.filter(s => s.date === todayDH.date) : [];
    const header   = document.getElementById('dash-today-header');
    const body     = document.getElementById('dash-today-sessions');
    if (!body) return;
    if (header) {
      const hd = header.querySelector('.card-title');
      if (hd) hd.innerHTML = `${UI.icon('calendar_today','sm')} Today's Classes (${sessions.length})`;
    }
    body.innerHTML = SessionCard.renderGroup(sessions);
  })();

  /* ── TASK TOGGLE ───────────────────────────────────────── */
  window.toggleTask = function (el) {
    const done = el.classList.toggle('done');
    el.textContent = done ? '✓' : '';
    const text = el.closest('.task-item')?.querySelector('.task-text');
    if (text) text.classList.toggle('done', done);
  };

  /* ── FOLLOW UP MODAL ───────────────────────────────────── */
  window.openFollowUpModal = function (name) {
    const s    = DB.students.find(x => x.name === name);
    const left = s ? Math.min(...(s.courses||[]).map(c=>c.left)) : '?';
    const isUr = left <= 1;
    Modal.create('modal-followup', `${UI.icon('call')} Follow Up — ${name}`,
      `<div class="modal-section">
        <div class="modal-section-title">Contact Details</div>
        ${UI.infoGrid([
          {label:'Student',  value:name},
          {label:'Classes Left', value:`<strong class="${isUr?'text-error':'text-warning'}">${left}</strong>`},
          {label:'Urgency',  value:UI.badge(isUr?'URGENT':'Pending', isUr?'red':'yellow')},
          {label:'Phone',    value:s?.phone||'—'},
          {label:'LINE',     value:s?.line||'—'},
        ])}
        <div style="margin-top:var(--sp-4);margin-bottom:var(--sp-3)">
          <label class="field-label">Channel</label>
          <select class="form-input">
            <option>LINE</option><option>Phone Call</option><option>Email</option>
          </select>
        </div>
        <div>
          <label class="field-label">Note</label>
          <textarea class="form-input" rows="3"
            placeholder="บันทึกการติดต่อ เช่น ผู้ปกครองรับสาย พูดคุยเรื่อง renewal…"></textarea>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-followup')">Cancel</button>
       <button class="btn btn-primary"
         onclick="showToast('บันทึกแล้ว + สร้าง Task ✓','success');Modal.close('modal-followup')">
         ${UI.icon('save','sm')} Save & Create Task</button>`
    );
  };

  /* ── QUICK ACTION MODAL ────────────────────────────────── */
  window.openQuickAction = function () {
    Modal.create('modal-quick', '⚡ Quick Action',
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-2)">
        ${[
          {icon:'person_add',   label:'Add New Lead',       view:'crm'},
          {icon:'school',       label:'Enroll Student',     view:'students'},
          {icon:'credit_card',  label:'Generate Invoice',   view:'billing'},
          {icon:'schedule',     label:'View Sessions',      view:'sessions'},
          {icon:'summarize',    label:'Write Summary',      view:'summaries'},
          {icon:'checklist',    label:'Add Task',           view:'tasks'},
        ].map(a=>`<button class="btn btn-secondary" style="justify-content:flex-start;padding:var(--sp-3)"
          onclick="Modal.close('modal-quick');showView('${a.view}')">
          ${UI.icon(a.icon,'sm')} ${a.label}</button>`).join('')}
      </div>`
    );
  };

})();
