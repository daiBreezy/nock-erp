/* ============================================================
   attendance.js — NockERP Attendance Module
   Aggregates all attendance records from DB.students
   Shows attendance log with filter + consumption tracking
   ============================================================ */
(function () {

  /* ── AGGREGATE ALL ATTENDANCE RECORDS ────────────────── */
  function buildAttendance() {
    const rows = [];
    DB.students.forEach(s => {
      (s.attendance || []).forEach(a => {
        rows.push({
          studentId: s.id,
          student:   s.name,
          family:    s.family,
          branch:    s.branch,
          course:    a.course,
          date:      a.date,
          status:    a.status,
          deducted:  Utils.shouldDeduct(a.status),
        });
      });
    });
    rows.sort((a,b) => b.date.localeCompare(a.date));
    return rows;
  }

  /* ── STATE ────────────────────────────────────────────── */
  let allAtt   = buildAttendance();
  let fStatus  = 'all';
  let fStudent = '';
  let fBranch  = '';
  let fSearch  = '';

  /* ── SHELL ────────────────────────────────────────────── */
  document.getElementById('view-attendance').innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Attendance</div>
      <div class="page-sub" id="att-sub">Loading…</div>
    </div>
    <button class="btn btn-secondary btn-sm" onclick="showView('sessions')">⏱️ Sessions</button>
  </div>

  <!-- KPI strip -->
  <div id="att-kpi" class="kpi-grid mb-16" style="grid-template-columns:repeat(4,1fr)"></div>

  <!-- Student consumption cards -->
  <div class="card mb-16">
    <div style="padding:12px 16px;border-bottom:1px solid #f3f4f6">
      <div style="font-size:13px;font-weight:600;color:#374151">Class Consumption by Student</div>
    </div>
    <div id="att-consumption" style="padding:14px 16px;display:flex;gap:12px;flex-wrap:wrap"></div>
  </div>

  <!-- Filter bar -->
  <div class="card mb-16" style="padding:12px 16px">
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <input id="att-search" placeholder="🔍 Student, course…"
        style="flex:1;min-width:150px;border:1px solid #e5e7eb;border-radius:7px;
               padding:7px 11px;font-size:12px;outline:none"
        oninput="attFilter('search',this.value)">
      <div style="display:flex;gap:4px">
        <div class="filter-chip active" onclick="attFilter('status','all',this)">All</div>
        <div class="filter-chip" onclick="attFilter('status','present',this)">✅ Present</div>
        <div class="filter-chip" onclick="attFilter('status','leave',this)">📋 Leave</div>
        <div class="filter-chip" onclick="attFilter('status','absent',this)">❌ Absent</div>
      </div>
      <select style="border:1px solid #e5e7eb;border-radius:6px;padding:6px 8px;
                     font-size:12px;outline:none;background:#fff"
              onchange="attFilter('student',this.value)">
        <option value="">All Students</option>
        ${DB.students.map(s=>`<option value="${s.name}">${s.name}</option>`).join('')}
      </select>
    </div>
  </div>

  <!-- Attendance Table -->
  <div class="card">
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Student</th>
            <th>Course</th>
            <th>Branch</th>
            <th>Status</th>
            <th>Deducted</th>
          </tr>
        </thead>
        <tbody id="att-tbody"></tbody>
      </table>
    </div>
  </div>`;

  /* ── RENDER KPI ───────────────────────────────────────── */
  function renderKPI() {
    const cnt = { present:0, leave:0, absent:0, reschedule:0 };
    allAtt.forEach(a => { cnt[a.status] = (cnt[a.status]||0) + 1; });
    const total      = allAtt.length;
    const deducted   = allAtt.filter(a => a.deducted).length;
    const rate       = total ? Math.round((cnt.present/total)*100) : 0;

    document.getElementById('att-kpi').innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d1fae5">✅</div>
        <div class="kpi-label">Present</div>
        <div class="kpi-value" style="color:#10b981">${cnt.present}</div>
        <div class="kpi-change up">${rate}% attendance rate</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fef3c7">📋</div>
        <div class="kpi-label">Leave</div>
        <div class="kpi-value" style="color:#f59e0b">${cnt.leave}</div>
        <div class="kpi-change">No deduction</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fee2e2">❌</div>
        <div class="kpi-label">Absent</div>
        <div class="kpi-value" style="color:#ef4444">${cnt.absent}</div>
        <div class="kpi-change down">Class deducted</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#ede9fe">📉</div>
        <div class="kpi-label">Total Deducted</div>
        <div class="kpi-value">${deducted}</div>
        <div class="kpi-change">of ${total} records</div>
      </div>`;
  }

  /* ── RENDER CONSUMPTION ───────────────────────────────── */
  function renderConsumption() {
    const el = document.getElementById('att-consumption');
    if (!el) return;

    el.innerHTML = DB.students.map(s => {
      const totalH = (s.courses||[]).reduce((a,c) => a+c.hours, 0);
      const usedH  = (s.courses||[]).reduce((a,c) => a+c.used,  0);
      const leftH  = (s.courses||[]).reduce((a,c) => a+c.left,  0);
      const pct    = totalH ? Math.round((usedH/totalH)*100) : 0;
      const color  = leftH<=1?'#ef4444':leftH<=3?'#f59e0b':'#10b981';
      const sm     = CONST.STUDENT_STATUS[s.status] || {};
      return `
      <div style="flex:1;min-width:150px;background:#f9fafb;border:1px solid #f3f4f6;
                  border-radius:8px;padding:12px;cursor:pointer"
           onclick="openProfileModal('${s.id}')">
        <div style="font-size:12px;font-weight:600;color:#1a1d23;margin-bottom:2px">${s.name}</div>
        <div style="font-size:10px;color:#9ca3af;margin-bottom:6px">
          ${usedH}h used / ${totalH}h total
        </div>
        <div style="background:#e5e7eb;border-radius:4px;height:6px;margin-bottom:4px">
          <div style="background:${color};width:${pct}%;height:6px;border-radius:4px"></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <span style="font-size:11px;font-weight:700;color:${color}">${leftH}h left</span>
          <span class="badge ${sm.cls||'badge-gray'}" style="font-size:9px">${sm.label||s.status}</span>
        </div>
      </div>`;
    }).join('');
  }

  /* ── RENDER TABLE ─────────────────────────────────────── */
  function renderTable() {
    let rows = [...allAtt];
    if (fStatus  !== 'all') rows = rows.filter(r => r.status  === fStatus);
    if (fStudent)           rows = rows.filter(r => r.student === fStudent);
    if (fBranch)            rows = rows.filter(r => r.branch  === fBranch);
    if (fSearch) {
      const q = fSearch.toLowerCase();
      rows = rows.filter(r => (r.student+r.course+r.date).toLowerCase().includes(q));
    }

    const sub = document.getElementById('att-sub');
    if (sub) sub.textContent = `${rows.length} record${rows.length!==1?'s':''}`;

    const tbody = document.getElementById('att-tbody');
    if (!tbody) return;

    if (rows.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:#9ca3af">
        No records found</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(r => {
      const am  = CONST.ATTENDANCE_META[r.status] || {};
      const ded = r.deducted;
      return `<tr>
        <td style="font-size:12px;color:#6b7280">${r.date}</td>
        <td>
          <span style="cursor:pointer;color:#6366f1;font-weight:500"
                onclick="openProfileModal('${r.studentId||r.student}')">${r.student}</span>
        </td>
        <td style="font-size:12px">${r.course}</td>
        <td style="font-size:12px;color:#6b7280">${r.branch}</td>
        <td><span class="badge ${am.cls||'badge-gray'}">${am.label||r.status}</span></td>
        <td>
          ${ded
            ? `<span style="font-size:11px;color:#ef4444;font-weight:500">-1 class</span>`
            : `<span style="font-size:11px;color:#9ca3af">—</span>`}
        </td>
      </tr>`;
    }).join('');
  }

  /* ── FILTER HANDLER ───────────────────────────────────── */
  window.attFilter = function (key, val, el) {
    if (key==='status')  { fStatus  = val;
      document.querySelectorAll('#view-attendance .filter-chip').forEach(c=>c.classList.remove('active'));
      if(el) el.classList.add('active'); }
    if (key==='student') fStudent = val;
    if (key==='branch')  fBranch  = val;
    if (key==='search')  fSearch  = val;
    renderTable();
  };

  /* ── INIT ─────────────────────────────────────────────── */
  renderKPI();
  renderConsumption();
  renderTable();

})();
