/* ============================================================
   dashboard.js — NockERP Dashboard Module
   ============================================================ */
(function () {

  /* ── HTML ─────────────────────────────────────────────── */
  document.getElementById('view-dashboard').innerHTML = `

  <div class="page-header">
    <div>
      <div class="page-title">Good morning, Nock 👋</div>
      <div class="page-sub">Wednesday, 14 May 2026</div>
    </div>
    <button class="btn btn-primary" onclick="openQuickAction()">＋ Quick Action</button>
  </div>

  <!-- KPI GRID -->
  <div class="kpi-grid mb-16">
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#ede9fe">💰</div>
      <div class="kpi-label">Revenue (May)</div>
      <div class="kpi-value">฿124,500</div>
      <div class="kpi-change up">↑ 12% vs last month</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#d1fae5">🎓</div>
      <div class="kpi-label">Active Students</div>
      <div class="kpi-value">87</div>
      <div class="kpi-change up">↑ 3 new this week</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#fef3c7">🔄</div>
      <div class="kpi-label">Renewal Pending</div>
      <div class="kpi-value">6</div>
      <div class="kpi-change down">↓ Action required</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-icon" style="background:#fee2e2">📈</div>
      <div class="kpi-label">Conversion Rate</div>
      <div class="kpi-value">68%</div>
      <div class="kpi-change up">↑ 5% this month</div>
    </div>
  </div>

  <!-- ROW 2: Today's Classes + Right Panel -->
  <div class="grid-2 mb-16">

    <!-- Today's Classes -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">📅 Today's Classes (5)</div>
        <button class="btn btn-secondary btn-sm" onclick="showView('calendar')">View Calendar</button>
      </div>
      <div class="card-body">
        <div class="session-card" onclick="openSessionModal()">
          <div class="session-time">09:00–10:30</div>
          <div class="session-dot green"></div>
          <div class="session-info">
            <div class="session-name">Math Grade 5 — Group A</div>
            <div class="session-meta">Room 2 · 4 students</div>
            <div class="session-teacher">👩‍🏫 Kru Arm</div>
          </div>
          <span class="badge badge-green">Live</span>
        </div>
        <div class="session-card" onclick="openSessionModal()">
          <div class="session-time">10:30–12:00</div>
          <div class="session-dot yellow"></div>
          <div class="session-info">
            <div class="session-name">English Reading — Group B</div>
            <div class="session-meta">Room 1 · 5 students</div>
            <div class="session-teacher">👩‍🏫 Kru Bee</div>
          </div>
          <span class="badge badge-yellow">Upcoming</span>
        </div>
        <div class="session-card" onclick="openSessionModal()">
          <div class="session-time">13:00–14:30</div>
          <div class="session-dot blue"></div>
          <div class="session-info">
            <div class="session-name">Science — Private</div>
            <div class="session-meta">Room 3 · 1 student</div>
            <div class="session-teacher">👨‍🏫 Kru Dan</div>
          </div>
          <span class="badge badge-blue">Scheduled</span>
        </div>
        <div class="session-card" onclick="openSessionModal()">
          <div class="session-time">15:00–16:30</div>
          <div class="session-dot blue"></div>
          <div class="session-info">
            <div class="session-name">Math Grade 6 — Group C</div>
            <div class="session-meta">Room 2 · 6 students</div>
            <div class="session-teacher">👩‍🏫 Kru Cat, Kru Arm</div>
          </div>
          <span class="badge badge-blue">Scheduled</span>
        </div>
        <div class="session-card" onclick="openSessionModal()">
          <div class="session-time">16:30–18:00</div>
          <div class="session-dot blue"></div>
          <div class="session-info">
            <div class="session-name">Thai Language — Group A</div>
            <div class="session-meta">Room 1 · 3 students</div>
            <div class="session-teacher">👩‍🏫 Kru Eve</div>
          </div>
          <span class="badge badge-blue">Scheduled</span>
        </div>
      </div>
    </div>

    <!-- Right Panel: Renewal + Tasks -->
    <div style="display:flex;flex-direction:column;gap:16px">

      <!-- Renewal Pending -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">🔄 Renewal Pending</div>
          <span class="badge badge-red">6 students</span>
        </div>
        <div class="card-body">
          <div class="renewal-item">
            <div class="renewal-name">Mia Tanaka</div>
            <div class="renewal-classes">2 classes left</div>
            <button class="btn btn-primary btn-sm" onclick="openFollowUpModal('Mia Tanaka')">Follow Up</button>
          </div>
          <div class="renewal-item">
            <div class="renewal-name">James Wilson <span class="badge badge-red" style="font-size:9px">URGENT</span></div>
            <div class="renewal-classes">1 class left</div>
            <button class="btn btn-danger btn-sm" onclick="openFollowUpModal('James Wilson')">Follow Up</button>
          </div>
          <div class="renewal-item">
            <div class="renewal-name">Ploy Srirak</div>
            <div class="renewal-classes">2 classes left</div>
            <button class="btn btn-primary btn-sm" onclick="openFollowUpModal('Ploy Srirak')">Follow Up</button>
          </div>
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
            <div class="task-check" onclick="toggleTask(this)"></div>
            <div class="task-info">
              <div class="task-text">Send invoice — Chen Family</div>
              <div class="task-sub">Math G6 renewal · ฿9,000</div>
            </div>
            <div class="task-right">
              <span class="task-source admin">⚙️ Admin Nock</span>
              <span class="task-due">Tomorrow</span>
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
        <button class="btn btn-ghost btn-sm" onclick="showView('logs')">View All</button>
      </div>
      <div class="card-body">
        <div class="timeline-item">
          <div class="tl-dot" style="background:#6366f1"></div>
          <div class="tl-content">
            <div class="tl-text"><strong>Summary sent</strong> — Ploy Srirak · Math G5 · Session #42</div>
            <div class="tl-time">10 minutes ago</div>
          </div>
        </div>
        <div class="timeline-item">
          <div class="tl-dot" style="background:#10b981"></div>
          <div class="tl-content">
            <div class="tl-text"><strong>Payment received</strong> — Tanaka family · ฿8,500 · Course renewal</div>
            <div class="tl-time">42 minutes ago</div>
          </div>
        </div>
        <div class="timeline-item">
          <div class="tl-dot" style="background:#f59e0b"></div>
          <div class="tl-content">
            <div class="tl-text"><strong>New lead</strong> — Sarah M. · English Reading · Referred by Tanaka</div>
            <div class="tl-time">2 hours ago</div>
          </div>
        </div>
        <div class="timeline-item">
          <div class="tl-dot" style="background:#6366f1"></div>
          <div class="tl-content">
            <div class="tl-text"><strong>Enrollment</strong> — Tom Chen · Math Grade 6 · 20 sessions</div>
            <div class="tl-time">Yesterday 4:30 PM</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Risk & Alert -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">⚡ Risk & Alert</div>
        <span class="badge badge-red">2 Danger</span>
      </div>
      <div class="card-body">
        <div class="alert-item">
          <div class="alert-bar danger"></div>
          <div class="alert-body">
            <span class="alert-level danger">Danger</span>
            <div class="alert-text">James Wilson เหลือ 1 class — ถ้าไม่ต่อวันนี้จะหมดสัญญา</div>
            <div class="alert-time">เร่งด่วน</div>
            <div class="alert-action" onclick="openFollowUpModal('James Wilson')">Follow Up →</div>
          </div>
        </div>
        <div class="alert-item">
          <div class="alert-bar danger"></div>
          <div class="alert-body">
            <span class="alert-level danger">Danger</span>
            <div class="alert-text">INV-2026-0051 รอ verify มา 18 ชม. — Tanaka Family ฿8,500</div>
            <div class="alert-time">18 ชม. ที่แล้ว</div>
            <div class="alert-action" onclick="showView('billing')">Verify →</div>
          </div>
        </div>
        <div class="alert-item">
          <div class="alert-bar warning"></div>
          <div class="alert-body">
            <span class="alert-level warning">Warning</span>
            <div class="alert-text">6 นักเรียนใกล้หมด package — ถ้าไม่ติดต่อใน 3 วันอาจหลุด</div>
            <div class="alert-time">ต้องติดต่อก่อน 17 May</div>
            <div class="alert-action" onclick="showView('students')">ดู Renewal →</div>
          </div>
        </div>
        <div class="alert-item">
          <div class="alert-bar warning"></div>
          <div class="alert-body">
            <span class="alert-level warning">Warning</span>
            <div class="alert-text">Hana Yamamoto นัด Trial 15 May — ยังไม่ confirm ห้อง</div>
            <div class="alert-time">พรุ่งนี้ 10:30</div>
            <div class="alert-action" onclick="showView('calendar')">จัดการ →</div>
          </div>
        </div>
        <div class="alert-item">
          <div class="alert-bar info"></div>
          <div class="alert-body">
            <span class="alert-level info">Info</span>
            <div class="alert-text">Sarah M. และ Arjun P. เป็น New Lead มา 3 วัน ยังไม่มีการติดต่อ</div>
            <div class="alert-time">3 วันที่แล้ว</div>
            <div class="alert-action" onclick="showView('crm')">ไป CRM →</div>
          </div>
        </div>
      </div>
    </div>

  </div>`;

  /* ── SESSION MODAL ────────────────────────────────────── */
  window.openSessionModal = function () {
    Modal.create('modal-session',
      '⏱️ Session — English Reading · Group B',
      `<div class="modal-section">
        <div class="modal-section-title">Session Info</div>
        <div class="info-grid">
          <div class="info-item"><div class="label">Subject</div>English Reading</div>
          <div class="info-item"><div class="label">Teacher</div>Kru Bee</div>
          <div class="info-item"><div class="label">Time</div>10:30 – 12:00</div>
          <div class="info-item"><div class="label">Room</div>Room 1 · Sukhumvit</div>
          <div class="info-item"><div class="label">Status</div><span class="badge badge-yellow">Upcoming</span></div>
          <div class="info-item"><div class="label">Capacity</div>5 / 8 students</div>
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Student Attendance</div>
        <div class="att-row"><div class="att-name">Mia Tanaka</div><div class="att-btns">
          <button class="att-btn present sel" onclick="selectAtt(this,'present')">Present</button>
          <button class="att-btn leave" onclick="selectAtt(this,'leave')">Leave</button>
          <button class="att-btn absent" onclick="selectAtt(this,'absent')">Absent</button>
        </div></div>
        <div class="att-row"><div class="att-name">Kevin Park</div><div class="att-btns">
          <button class="att-btn present sel" onclick="selectAtt(this,'present')">Present</button>
          <button class="att-btn leave" onclick="selectAtt(this,'leave')">Leave</button>
          <button class="att-btn absent" onclick="selectAtt(this,'absent')">Absent</button>
        </div></div>
        <div class="att-row"><div class="att-name">Hana Yamamoto</div><div class="att-btns">
          <button class="att-btn present" onclick="selectAtt(this,'present')">Present</button>
          <button class="att-btn leave sel" onclick="selectAtt(this,'leave')">Leave</button>
          <button class="att-btn absent" onclick="selectAtt(this,'absent')">Absent</button>
        </div></div>
        <div class="att-row"><div class="att-name">Luca Romano</div><div class="att-btns">
          <button class="att-btn present sel" onclick="selectAtt(this,'present')">Present</button>
          <button class="att-btn leave" onclick="selectAtt(this,'leave')">Leave</button>
          <button class="att-btn absent" onclick="selectAtt(this,'absent')">Absent</button>
        </div></div>
        <div class="att-row"><div class="att-name">Emma Liu</div><div class="att-btns">
          <button class="att-btn present" onclick="selectAtt(this,'present')">Present</button>
          <button class="att-btn leave" onclick="selectAtt(this,'leave')">Leave</button>
          <button class="att-btn absent sel" onclick="selectAtt(this,'absent')">Absent</button>
        </div></div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Session Timeline</div>
        <div class="timeline-item" style="padding:6px 0">
          <div class="tl-dot" style="background:#f59e0b"></div>
          <div class="tl-content"><div class="tl-text">Session scheduled</div><div class="tl-time">Auto · 09:00</div></div>
        </div>
        <div class="timeline-item" style="padding:6px 0">
          <div class="tl-dot"></div>
          <div class="tl-content"><div class="tl-text">Attendance updated by Kru Bee</div><div class="tl-time">10:28</div></div>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-session')">Cancel</button>
       <button class="btn btn-secondary" onclick="showToast('Class ended','success');Modal.close('modal-session')">End Class</button>
       <button class="btn btn-primary" onclick="showToast('Class started! Check-in recorded ✓','success');Modal.close('modal-session')">✓ Start Class & Check-In</button>`
    );
  };

  /* ── FOLLOW UP MODAL ──────────────────────────────────── */
  window.openFollowUpModal = function (name) {
    Modal.create('modal-followup',
      '📞 Follow Up — ' + name,
      `<div class="modal-section">
        <div class="modal-section-title">Contact Details</div>
        <div class="info-grid" style="margin-bottom:14px">
          <div class="info-item"><div class="label">Student</div>${name}</div>
          <div class="info-item"><div class="label">Urgency</div>
            <span class="badge ${name === 'James Wilson' ? 'badge-red' : 'badge-yellow'}">${name === 'James Wilson' ? '🔴 URGENT' : '🟡 Pending'}</span>
          </div>
        </div>
        <div style="margin-bottom:12px">
          <label class="settings-label">Channel</label>
          <select class="settings-input">
            <option>LINE</option><option>Phone Call</option><option>Email</option>
          </select>
        </div>
        <div>
          <label class="settings-label">Note</label>
          <textarea class="settings-input" rows="3" placeholder="บันทึกการติดต่อ เช่น ผู้ปกครองรับสาย พูดคุยเรื่อง renewal…" style="resize:vertical"></textarea>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-followup')">Cancel</button>
       <button class="btn btn-primary" onclick="showToast('บันทึกแล้ว + สร้าง Task ✓','success');Modal.close('modal-followup')">💾 Save & Create Task</button>`
    );
  };

  /* ── QUICK ACTION MODAL ───────────────────────────────── */
  window.openQuickAction = function () {
    Modal.create('modal-quick',
      '⚡ Quick Action',
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <button class="btn btn-secondary" style="justify-content:flex-start;padding:12px" onclick="Modal.close('modal-quick');showView('crm')">🎯 Add New Lead</button>
        <button class="btn btn-secondary" style="justify-content:flex-start;padding:12px" onclick="Modal.close('modal-quick');showView('students')">🎓 Enroll Student</button>
        <button class="btn btn-secondary" style="justify-content:flex-start;padding:12px" onclick="Modal.close('modal-quick');showView('billing')">💳 Generate Invoice</button>
        <button class="btn btn-secondary" style="justify-content:flex-start;padding:12px" onclick="Modal.close('modal-quick');openSessionModal()">⏱️ Start Session</button>
        <button class="btn btn-secondary" style="justify-content:flex-start;padding:12px" onclick="Modal.close('modal-quick');showView('summaries')">📝 Write Summary</button>
        <button class="btn btn-secondary" style="justify-content:flex-start;padding:12px" onclick="Modal.close('modal-quick');showView('tasks')">☑️ Add Task</button>
      </div>`
    );
  };

})();
