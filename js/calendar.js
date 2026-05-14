/* ============================================================
   calendar.js — Calendar Module: Week View + Holidays + Summary
   ============================================================ */
(function () {

  /* ── HOLIDAY DATA ─────────────────────────────────────── */
  const holidays = {
    'Thu 15': { name:'วันวิสาขบูชา', short:'วิสาขบูชา', school:'ทุกสาขา' },
  };

  /* ── SESSION DATA (week 11–17 May) ───────────────────────
     Format: { time, col (1-7=Mon-Sun), colorClass, label, teachers, students, room }
  ─────────────────────────────────────────────────────────── */
  const sessions = [
    // Mon 11
    { slot:0, col:1, color:'green',  label:'Math G5 · Rm1',       teachers:'Kru Arm',       students:4, room:'Room 1' },
    { slot:3, col:1, color:'orange', label:'Science · Rm3',        teachers:'Kru Dan',       students:1, room:'Room 3' },
    { slot:4, col:1, color:'green',  label:'Thai Lang · Rm1',      teachers:'Kru Eve',       students:3, room:'Room 1' },
    // Tue 12
    { slot:1, col:2, color:'yellow', label:'Eng Read · Rm1',       teachers:'Kru Bee',       students:5, room:'Room 1' },
    { slot:3, col:2, color:'orange', label:'Science · Rm3',        teachers:'Kru Dan',       students:1, room:'Room 3' },
    { slot:4, col:2, color:'',       label:'Math G6 · Rm2',        teachers:'Kru Cat',       students:6, room:'Room 2' },
    // Wed 13 (today)
    { slot:0, col:3, color:'green',  label:'Math G5 · Rm2',        teachers:'Kru Arm',       students:4, room:'Room 2' },
    { slot:1, col:3, color:'yellow', label:'Eng Read · Rm1',       teachers:'Kru Bee',       students:5, room:'Room 1' },
    { slot:3, col:3, color:'orange', label:'Science · Rm3',        teachers:'Kru Dan',       students:1, room:'Room 3' },
    { slot:4, col:3, color:'',       label:'Math G6 · Rm2',        teachers:'Kru Cat,Kru Arm',students:6,room:'Room 2' },
    { slot:5, col:3, color:'green',  label:'Thai Lang · Rm1',      teachers:'Kru Eve',       students:3, room:'Room 1' },
    // Thu 14
    { slot:1, col:4, color:'yellow', label:'Eng Read · Rm1',       teachers:'Kru Bee',       students:5, room:'Room 1' },
    { slot:3, col:4, color:'orange', label:'Science · Rm3',        teachers:'Kru Dan',       students:1, room:'Room 3' },
    { slot:4, col:4, color:'',       label:'Math G6 · Rm2',        teachers:'Kru Cat',       students:6, room:'Room 2' },
    // Fri 15 — HOLIDAY (no sessions)
    // Sat 16
    { slot:0, col:6, color:'',       label:'Eng Read · Rm1',       teachers:'Kru Bee',       students:4, room:'Room 1' },
    { slot:1, col:6, color:'',       label:'Math G6 · Rm2',        teachers:'Kru Cat',       students:5, room:'Room 2' },
    { slot:4, col:6, color:'green',  label:'Thai Lang · Rm1',      teachers:'Kru Eve',       students:3, room:'Room 1' },
  ];

  const timeSlots  = ['09:00','10:30','13:00','14:30','15:00','16:30'];
  const dayHeaders = [
    { label:'Mon 11', isToday:false, isHoliday:false },
    { label:'Tue 12', isToday:false, isHoliday:false },
    { label:'Wed 13', isToday:true,  isHoliday:false },
    { label:'Thu 14', isToday:false, isHoliday:false },
    { label:'Fri 15', isToday:false, isHoliday:true  },
    { label:'Sat 16', isToday:false, isHoliday:false },
    { label:'Sun 17', isToday:false, isHoliday:false },
  ];

  /* ── RENDER ───────────────────────────────────────────── */
  document.getElementById('view-calendar').innerHTML = `
  <div class="page-header">
    <div><div class="page-title">Calendar</div><div class="page-sub">Week of 11–17 May 2026</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-secondary btn-sm">← Prev</button>
      <button class="btn btn-secondary btn-sm">Today</button>
      <button class="btn btn-secondary btn-sm">Next →</button>
      <button class="btn btn-secondary btn-sm" onclick="openCalSummary()">📊 Summary</button>
      <button class="btn btn-primary btn-sm" onclick="showToast('Add session coming soon','info')">＋ Session</button>
    </div>
  </div>

  <!-- VIEW TABS -->
  <div class="tabs">
    <div class="tab active" id="cal-tab-week"    onclick="calTab('week',this)">Week</div>
    <div class="tab"        id="cal-tab-day"     onclick="calTab('day',this)">Day</div>
    <div class="tab"        id="cal-tab-month"   onclick="calTab('month',this)">Month</div>
    <div class="tab"        id="cal-tab-teacher" onclick="calTab('teacher',this)">Teacher</div>
    <div class="tab"        id="cal-tab-list"    onclick="calTab('list',this)">List</div>
  </div>

  <!-- HOLIDAY BANNER -->
  <div id="holiday-banner" style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:8px 14px;margin-bottom:12px;font-size:13px;color:#991b1b;display:flex;align-items:center;gap:8px">
    🏖️ <strong>วันหยุด:</strong> ศุกร์ 15 May — วันวิสาขบูชา (ทุกสาขาหยุด) · คลาสที่ชนวันหยุดควรตรวจสอบ
    <button class="btn btn-sm" style="margin-left:auto;background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;font-size:11px" onclick="this.closest('#holiday-banner').style.display='none'">✕</button>
  </div>

  <!-- WEEK GRID -->
  <div id="cal-week-view">
    <div class="cal-days" id="cal-grid"></div>
  </div>

  <!-- OTHER VIEWS (placeholder) -->
  <div id="cal-other-view" style="display:none">
    <div class="card" style="padding:40px;text-align:center;color:#9ca3af">
      <div id="cal-other-label" style="font-size:14px">View coming soon</div>
      <div style="margin-top:12px"><button class="btn btn-primary btn-sm" onclick="openCalSummary()">📊 Open Summary</button></div>
    </div>
  </div>`;

  /* ── BUILD WEEK GRID ──────────────────────────────────── */
  function buildGrid() {
    const grid = document.getElementById('cal-grid');
    if (!grid) return;

    // Build lookup: slot → col → sessions[]
    const lookup = {};
    sessions.forEach(s => {
      const key = `${s.slot}-${s.col}`;
      if (!lookup[key]) lookup[key] = [];
      lookup[key].push(s);
    });

    let html = '';
    // Header row
    html += '<div class="cal-day-header"></div>';
    dayHeaders.forEach(d => {
      const cls = d.isToday ? 'today' : d.isHoliday ? 'holiday' : '';
      const hol = d.isHoliday ? ' 🏖️' : '';
      html += `<div class="cal-day-header ${cls}">${d.label}${hol}</div>`;
    });

    // Time rows
    timeSlots.forEach((time, slot) => {
      html += `<div class="cal-time">${time}</div>`;
      dayHeaders.forEach((d, di) => {
        const col = di + 1;
        const isHoliday = d.isHoliday;
        const cellSessions = lookup[`${slot}-${col}`] || [];
        html += `<div class="cal-cell ${isHoliday ? 'holiday-col' : ''}">`;
        if (isHoliday && slot === 0) {
          html += `<div class="cal-event holiday-event">วันวิสาขบูชา</div>`;
        }
        cellSessions.forEach(s => {
          const teacherShort = s.teachers.split(',').map(t => t.trim().replace('Kru ','')).join('+');
          html += `<div class="cal-event ${s.color}" onclick="openCalSession(${JSON.stringify(s).replace(/"/g,'&quot;')})"
            title="${s.label} · ${s.teachers} · ${s.students} students">
            ${s.label}<br><span style="font-size:9px;opacity:.85">👩‍🏫 ${teacherShort}</span>
          </div>`;
        });
        html += '</div>';
      });
    });

    grid.innerHTML = html;
  }

  buildGrid();

  /* ── CAL TAB SWITCH ───────────────────────────────────── */
  window.calTab = function (tab, el) {
    document.querySelectorAll('.tab[id^="cal-tab"]').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    const weekView  = document.getElementById('cal-week-view');
    const otherView = document.getElementById('cal-other-view');
    if (tab === 'week') {
      weekView.style.display  = '';
      otherView.style.display = 'none';
    } else {
      weekView.style.display  = 'none';
      otherView.style.display = '';
      document.getElementById('cal-other-label').textContent = { day:'Day View', month:'Month View', teacher:'Teacher View', list:'List View' }[tab] + ' — coming next sprint';
    }
  };

  /* ── SESSION CLICK MODAL ──────────────────────────────── */
  window.openCalSession = function (s) {
    Modal.create('modal-cal-session', `⏱️ ${s.label}`, `
      <div class="modal-section">
        <div class="info-grid">
          <div class="info-item"><div class="label">Subject</div>${s.label.split('·')[0].trim()}</div>
          <div class="info-item"><div class="label">Teacher(s)</div>${s.teachers}</div>
          <div class="info-item"><div class="label">Room</div>${s.room}</div>
          <div class="info-item"><div class="label">Students</div>${s.students}</div>
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Student Attendance</div>
        <div class="att-row"><div class="att-name">Student A</div><div class="att-btns">
          <button class="att-btn present sel" onclick="selectAtt(this,'present')">Present</button>
          <button class="att-btn leave" onclick="selectAtt(this,'leave')">Leave</button>
          <button class="att-btn absent" onclick="selectAtt(this,'absent')">Absent</button>
        </div></div>
        <div class="att-row"><div class="att-name">Student B</div><div class="att-btns">
          <button class="att-btn present sel" onclick="selectAtt(this,'present')">Present</button>
          <button class="att-btn leave" onclick="selectAtt(this,'leave')">Leave</button>
          <button class="att-btn absent" onclick="selectAtt(this,'absent')">Absent</button>
        </div></div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-cal-session')">Cancel</button>
       <button class="btn btn-secondary" onclick="showToast('Class ended','success');Modal.close('modal-cal-session')">End Class</button>
       <button class="btn btn-primary" onclick="showToast('Class started ✓','success');Modal.close('modal-cal-session')">✓ Start & Check-In</button>`
    );
  };

  /* ── SUMMARY MODAL ────────────────────────────────────── */
  window.openCalSummary = function () {
    const rows = sessions.map(s => {
      const day = dayHeaders[s.col - 1]?.label || '';
      const time = timeSlots[s.slot] || '';
      const isHol = dayHeaders[s.col - 1]?.isHoliday;
      return `<tr ${isHol ? 'style="background:#fff9f9"' : ''}>
        <td>${day}${isHol ? ' 🏖️' : ''}</td>
        <td>${time}</td>
        <td>${s.label}</td>
        <td>${s.teachers}</td>
        <td style="text-align:center">${s.students}</td>
        <td>${isHol ? '<span class="badge badge-red">Holiday Conflict!</span>' : '<span class="badge badge-green">OK</span>'}</td>
      </tr>`;
    }).join('');

    const totalSessions = sessions.filter(s => !dayHeaders[s.col-1]?.isHoliday).length;
    const teachers = [...new Set(sessions.flatMap(s => s.teachers.split(',').map(t => t.trim())))];

    Modal.create('modal-cal-summary', '📊 Week Summary — 11–17 May 2026', `
      <div class="modal-section">
        <div class="info-grid" style="margin-bottom:14px">
          <div class="info-item"><div class="label">Total Sessions</div><strong>${totalSessions}</strong></div>
          <div class="info-item"><div class="label">Total Students (est.)</div><strong>${sessions.reduce((a,s)=>a+s.students,0)}</strong></div>
          <div class="info-item"><div class="label">Active Teachers</div><strong>${teachers.join(', ')}</strong></div>
          <div class="info-item"><div class="label">Holiday Conflicts</div><span class="badge badge-red">Fri 15 May</span></div>
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">All Sessions This Week</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Day</th><th>Time</th><th>Session</th><th>Teacher(s)</th><th>Students</th><th>Status</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-cal-summary')">Close</button>
       <button class="btn btn-primary" onclick="showToast('Exporting summary…','info')">Export PDF</button>`,
      'modal-xl'
    );
  };

})();
