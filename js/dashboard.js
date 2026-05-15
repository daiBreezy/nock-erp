/* ============================================================
   dashboard.js — NockERP Dashboard Module
   All KPIs + Renewal + Alerts computed from DB live data
   ============================================================ */
(function () {

  /* ── LIVE COMPUTATIONS ────────────────────────────────── */
  const todayDH   = DB.dayHeaders.find(d => d.isToday);
  const WDAYS     = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MNAMES    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function _todayLabel() {
    if (!todayDH) return 'Today';
    const d = new Date(todayDH.date);
    return `${WDAYS[d.getDay()]}, ${d.getDate()} ${MNAMES[d.getMonth()]} ${d.getFullYear()}`;
  }

  /* KPI: students */
  const allStudents     = DB.students;
  const activeStudents  = allStudents.filter(s => ['active','renewal','urgent'].includes(s.status));
  const renewalStudents = allStudents.filter(s => s.status === 'renewal' || s.status === 'urgent');
  const urgentStudents  = allStudents.filter(s => s.status === 'urgent');

  /* KPI: revenue this month (May 2026) */
  let revenueThisMonth = 0;
  allStudents.forEach(s => (s.invoices||[]).forEach(inv => {
    if ((inv.date||'').startsWith('2026-05')) revenueThisMonth += inv.amount || 0;
  }));

  /* KPI: active leads */
  const activeLeads = (DB.leads||[]).filter(l => l.stage !== 'archived');
  const newLeads    = (DB.leads||[]).filter(l => l.stage === 'new');

  /* Renewal list — urgent first */
  const renewalList = [...renewalStudents].sort((a,b) =>
    (a.status==='urgent'?0:1) - (b.status==='urgent'?0:1));

  /* Alerts — generated from DB */
  const alerts = [];
  urgentStudents.forEach(s => {
    const left = Math.min(...(s.courses||[]).map(c=>c.left));
    alerts.push({ level:'danger',
      text: `${s.name} เหลือ <strong>${left} class</strong> — ถ้าไม่ต่อวันนี้จะหมดสัญญา`,
      time: 'เร่งด่วน',
      action: `openFollowUpModal('${s.name}')`, label: 'Follow Up →' });
  });
  renewalStudents.filter(s=>s.status==='renewal').forEach(s => {
    const left = Math.min(...(s.courses||[]).map(c=>c.left));
    alerts.push({ level:'warning',
      text: `${s.name} เหลือ <strong>${left} class</strong> — ควรติดต่อผู้ปกครองเพื่อ renew`,
      time: 'ภายใน 7 วัน',
      action: `openFollowUpModal('${s.name}')`, label: 'Follow Up →' });
  });
  if (newLeads.length > 0) {
    alerts.push({ level:'info',
      text: `<strong>${newLeads.length} New Lead${newLeads.length>1?'s':''}</strong> ยังไม่มีการติดต่อ`,
      time: 'รอการติดต่อ',
      action: `showView('crm')`, label: 'ไป CRM →' });
  }

  /* Recent Activity — synthesize from DB */
  const recentEvents = [];
  allStudents.forEach(s => {
    const lastAtt = [...(s.attendance||[])].sort((a,b)=>b.date.localeCompare(a.date))[0];
    if (lastAtt) {
      const col = lastAtt.status==='present'?'#10b981':lastAtt.status==='absent'?'#ef4444':'#f59e0b';
      const lbl = lastAtt.status==='present'?'Present':lastAtt.status==='absent'?'Absent':'Leave';
      recentEvents.push({ color:col,
        text:`<strong>${lbl}</strong> — ${s.name} · ${lastAtt.course}`, time:lastAtt.date });
    }
    const lastInv = [...(s.invoices||[])].sort((a,b)=>b.date.localeCompare(a.date))[0];
    if (lastInv) recentEvents.push({ color:'#10b981',
      text:`<strong>Payment</strong> — ${s.family} · ฿${lastInv.amount.toLocaleString()}`, time:lastInv.date });
    const lastNote = (s.notes||[]).slice(-1)[0];
    if (lastNote) recentEvents.push({ color:'#6b7280',
      text:`<strong>Note</strong> — ${s.name}: ${lastNote.text.slice(0,55)}${lastNote.text.length>55?'…':''}`, time:lastNote.date });
  });
  recentEvents.sort((a,b) => b.time.localeCompare(a.time));
  const top5 = recentEvents.slice(0, 5);

  /* ── HTML HELPERS ─────────────────────────────────────── */
  function renewalRow(s) {
    const left  = Math.min(...(s.courses||[]).map(c=>c.left));
    const isUr  = s.status === 'urgent';
    return `<div class="renewal-item">
      <div class="renewal-name">${s.name}${isUr?` <span class="badge badge-red" style="font-size:9px">URGENT</span>`:''}</div>
      <div class="renewal-classes">${left} class${left===1?'':'es'} left</div>
      <button class="btn ${isUr?'btn-danger':'btn-primary'} btn-sm"
              onclick="openFollowUpModal('${s.name}')">Follow Up</button>
    </div>`;
  }

  function alertRow(a) {
    const lvlColor = a.level==='danger'?'#ef4444':a.level==='warning'?'#f59e0b':'#6366f1';
    return `<div class="alert-item">
      <div class="alert-bar ${a.level}"></div>
      <div class="alert-body">
        <span class="alert-level ${a.level}">${a.level.charAt(0).toUpperCase()+a.level.slice(1)}</span>
        <div class="alert-text">${a.text}</div>
        <div class="alert-time">${a.time}</div>
        <div class="alert-action" onclick="${a.action}">${a.label}</div>
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
    ? `<span class="badge badge-red">${dangerCount} Danger</span>`
    : `<span class="badge badge-yellow">${warningCount} Warning</span>`;

  /* ── HTML ─────────────────────────────────────────────── */
  document.getElementById('view-dashboard').innerHTML = `

  <div class="page-header">
    <div>
      <div class="page-title">Good morning, Nock 👋</div>
      <div class="page-sub">${_todayLabel()}</div>
    </div>
    <button class="btn btn-primary" onclick="openQuickAction()">＋ Quick Action</button>
  </div>

  <!-- KPI GRID -->
  <div class="kpi-grid mb-16">
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#d1fae5">🎓</div>
      <div class="kpi-label">Active Students</div>
      <div class="kpi-value" id="kpi-active">${activeStudents.length}</div>
      <div class="kpi-change up">↑ enrolled &amp; active</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#fef3c7">🔄</div>
      <div class="kpi-label">Renewal Pending</div>
      <div class="kpi-value" style="color:${renewalStudents.length>0?'#ef4444':'#10b981'}">${renewalStudents.length}</div>
      <div class="kpi-change ${renewalStudents.length>0?'down':'up'}">
        ${urgentStudents.length>0?`↓ ${urgentStudents.length} urgent`:'↑ All up to date'}
      </div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#ede9fe">💰</div>
      <div class="kpi-label">Revenue (May)</div>
      <div class="kpi-value">${revenueThisMonth>0?`฿${revenueThisMonth.toLocaleString()}`:'฿0'}</div>
      <div class="kpi-change up">↑ invoices paid this month</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#fee2e2">🎯</div>
      <div class="kpi-label">Active Leads</div>
      <div class="kpi-value">${activeLeads.length}</div>
      <div class="kpi-change ${newLeads.length>0?'down':'up'}">
        ${newLeads.length>0?`↓ ${newLeads.length} new — not contacted`:'↑ All contacted'}
      </div>
    </div>
  </div>

  <!-- ROW 2: Today's Classes + Right Panel -->
  <div class="grid-2 mb-16">

    <!-- Today's Classes -->
    <div class="card">
      <div class="card-header" id="dash-today-header">
        <div class="card-title">📅 Today's Classes</div>
        <button class="btn btn-secondary btn-sm" onclick="showView('calendar')">View Calendar</button>
      </div>
      <div class="card-body" id="dash-today-sessions"></div>
    </div>

    <!-- Right Panel: Renewal + Tasks -->
    <div style="display:flex;flex-direction:column;gap:16px">

      <!-- Renewal Pending -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">🔄 Renewal Pending</div>
          <span class="badge ${renewalList.length>0?'badge-red':'badge-green'}">${renewalList.length} student${renewalList.length!==1?'s':''}</span>
        </div>
        <div class="card-body">
          ${renewalList.length > 0
            ? renewalList.map(renewalRow).join('')
            : `<div style="text-align:center;padding:20px;color:#9ca3af;font-size:13px">
                 <div style="font-size:24px;margin-bottom:6px">✅</div>No renewals pending</div>`}
        </div>
      </div>

      <!-- My Tasks -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">☑️ My Tasks</div>
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
              <span class="task-source ai">🤖 AI Suggest</span>
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
              <span class="task-source manager">👤 Kru Arm</span>
              <span class="task-due urgent">Today</span>
            </div>
          </div>
          <div class="task-item">
            <div class="task-check done" onclick="toggleTask(this)">✓</div>
            <div class="task-info">
              <div class="task-text done">Confirm June schedule — Srirak Family</div>
            </div>
            <div class="task-right">
              <span class="task-source system">🔧 System</span>
              <span class="task-due" style="color:#10b981">Done</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>

  <!-- ROW 3: Recent Activity + Risk & Alert -->
  <div class="grid-2">

    <!-- Recent Activity -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">🕐 Recent Activity</div>
      </div>
      <div class="card-body">
        ${top5.length > 0
          ? top5.map(activityRow).join('')
          : `<div style="padding:16px;text-align:center;color:#9ca3af;font-size:13px">No recent activity</div>`}
      </div>
    </div>

    <!-- Risk & Alert -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">⚡ Risk & Alert</div>
        ${alertBadge}
      </div>
      <div class="card-body">
        ${alerts.length > 0
          ? alerts.map(alertRow).join('')
          : `<div style="padding:16px;text-align:center;color:#9ca3af;font-size:13px">
               <div style="font-size:24px;margin-bottom:6px">✅</div>No active alerts</div>`}
      </div>
    </div>

  </div>`;

  /* ── POPULATE TODAY'S SESSIONS ────────────────────────── */
  (function renderTodaySessions() {
    const sessions = todayDH ? DB.sessions.filter(s => s.date === todayDH.date) : [];
    const header   = document.getElementById('dash-today-header');
    const body     = document.getElementById('dash-today-sessions');
    if (!body) return;
    if (header) {
      const hd = header.querySelector('.card-title');
      if (hd) hd.textContent = `📅 Today's Classes (${sessions.length})`;
    }
    body.innerHTML = SessionCard.renderGroup(sessions);
  })();

  /* ── TASK TOGGLE ──────────────────────────────────────── */
  window.toggleTask = function (el) {
    const done = el.classList.toggle('done');
    el.textContent = done ? '✓' : '';
    const text = el.closest('.task-item')?.querySelector('.task-text');
    if (text) text.classList.toggle('done', done);
  };

  /* ── FOLLOW UP MODAL ──────────────────────────────────── */
  window.openFollowUpModal = function (name) {
    const s   = DB.students.find(x => x.name === name);
    const left = s ? Math.min(...(s.courses||[]).map(c=>c.left)) : '?';
    const isUr = s?.status === 'urgent';
    Modal.create('modal-followup',
      '📞 Follow Up — ' + name,
      `<div class="modal-section">
        <div class="modal-section-title">Contact Details</div>
        <div class="info-grid" style="margin-bottom:14px">
          <div class="info-item"><div class="label">Student</div>${name}</div>
          <div class="info-item"><div class="label">Classes Left</div>
            <strong style="color:${isUr?'#ef4444':'#f59e0b'}">${left}</strong></div>
          <div class="info-item"><div class="label">Urgency</div>
            <span class="badge ${isUr?'badge-red':'badge-yellow'}">${isUr?'🔴 URGENT':'🟡 Pending'}</span></div>
          <div class="info-item"><div class="label">Phone</div>${s?.phone||'—'}</div>
          <div class="info-item"><div class="label">LINE</div>${s?.line||'—'}</div>
        </div>
        <div style="margin-bottom:12px">
          <label class="settings-label">Channel</label>
          <select class="settings-input">
            <option>LINE</option><option>Phone Call</option><option>Email</option>
          </select>
        </div>
        <div>
          <label class="settings-label">Note</label>
          <textarea class="settings-input" rows="3"
            placeholder="บันทึกการติดต่อ เช่น ผู้ปกครองรับสาย พูดคุยเรื่อง renewal…"
            style="resize:vertical"></textarea>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-followup')">Cancel</button>
       <button class="btn btn-primary"
               onclick="showToast('บันทึกแล้ว + สร้าง Task ✓','success');Modal.close('modal-followup')">
         💾 Save & Create Task</button>`
    );
  };

  /* ── QUICK ACTION MODAL ───────────────────────────────── */
  window.openQuickAction = function () {
    Modal.create('modal-quick', '⚡ Quick Action',
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button class="btn btn-secondary" style="justify-content:flex-start;padding:12px"
                onclick="Modal.close('modal-quick');showView('crm')">🎯 Add New Lead</button>
        <button class="btn btn-secondary" style="justify-content:flex-start;padding:12px"
                onclick="Modal.close('modal-quick');showView('students')">🎓 Enroll Student</button>
        <button class="btn btn-secondary" style="justify-content:flex-start;padding:12px"
                onclick="Modal.close('modal-quick');showView('billing')">💳 Generate Invoice</button>
        <button class="btn btn-secondary" style="justify-content:flex-start;padding:12px"
                onclick="Modal.close('modal-quick');showView('sessions')">⏱️ View Sessions</button>
        <button class="btn btn-secondary" style="justify-content:flex-start;padding:12px"
                onclick="Modal.close('modal-quick');showView('summaries')">📝 Write Summary</button>
        <button class="btn btn-secondary" style="justify-content:flex-start;padding:12px"
                onclick="Modal.close('modal-quick');showView('tasks')">☑️ Add Task</button>
      </div>`
    );
  };

})();
