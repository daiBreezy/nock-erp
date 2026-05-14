/* ============================================================
   calendar.js — Calendar: Week/Day/Month/Teacher/List/Year
   ============================================================ */
(function () {

  /* ── DATA ─────────────────────────────────────────────── */
  const D='done', U='upcoming', SK='Sukhumvit', SI='Silom';
  const sessions = [
    {id:'s1', date:'2026-05-11',slot:0,col:1,time:'09:00',color:'green', subject:'Math G5', grade:'G5',teacher:'Kru Arm',room:'Room 1',students:4,branch:SK,status:D},
    {id:'s2', date:'2026-05-11',slot:3,col:1,time:'14:30',color:'orange',subject:'Science', grade:'G5',teacher:'Kru Dan',room:'Room 3',students:1,branch:SK,status:D},
    {id:'s3', date:'2026-05-11',slot:4,col:1,time:'15:00',color:'green', subject:'Thai Lang',grade:'G5',teacher:'Kru Eve',room:'Room 1',students:3,branch:SI,status:D},
    {id:'s4', date:'2026-05-12',slot:1,col:2,time:'10:30',color:'yellow',subject:'Eng Read',grade:'G4',teacher:'Kru Bee',room:'Room 1',students:5,branch:SK,status:D},
    {id:'s5', date:'2026-05-12',slot:3,col:2,time:'14:30',color:'orange',subject:'Science', grade:'G5',teacher:'Kru Dan',room:'Room 3',students:1,branch:SK,status:D},
    {id:'s6', date:'2026-05-12',slot:4,col:2,time:'15:00',color:'',      subject:'Math G6', grade:'G6',teacher:'Kru Cat',room:'Room 2',students:6,branch:SK,status:D},
    {id:'s7', date:'2026-05-13',slot:0,col:3,time:'09:00',color:'green', subject:'Math G5', grade:'G5',teacher:'Kru Arm',room:'Room 2',students:4,branch:SK,status:D},
    {id:'s8', date:'2026-05-13',slot:1,col:3,time:'10:30',color:'yellow',subject:'Eng Read',grade:'G4',teacher:'Kru Bee',room:'Room 1',students:5,branch:SK,status:D},
    {id:'s9', date:'2026-05-13',slot:3,col:3,time:'14:30',color:'orange',subject:'Science', grade:'G5',teacher:'Kru Dan',room:'Room 3',students:1,branch:SK,status:D},
    {id:'s10',date:'2026-05-13',slot:4,col:3,time:'15:00',color:'',      subject:'Math G6', grade:'G6',teacher:'Kru Cat',room:'Room 2',students:6,branch:SK,status:U},
    {id:'s11',date:'2026-05-13',slot:5,col:3,time:'16:30',color:'green', subject:'Thai Lang',grade:'G5',teacher:'Kru Eve',room:'Room 1',students:3,branch:SI,status:U},
    {id:'s12',date:'2026-05-14',slot:1,col:4,time:'10:30',color:'yellow',subject:'Eng Read',grade:'G4',teacher:'Kru Bee',room:'Room 1',students:5,branch:SK,status:U},
    {id:'s13',date:'2026-05-14',slot:3,col:4,time:'14:30',color:'orange',subject:'Science', grade:'G5',teacher:'Kru Dan',room:'Room 3',students:1,branch:SK,status:U},
    {id:'s14',date:'2026-05-14',slot:4,col:4,time:'15:00',color:'',      subject:'Math G6', grade:'G6',teacher:'Kru Cat',room:'Room 2',students:6,branch:SK,status:U},
    {id:'s15',date:'2026-05-16',slot:0,col:6,time:'09:00',color:'',      subject:'Eng Read',grade:'G4',teacher:'Kru Bee',room:'Room 1',students:4,branch:SK,status:U},
    {id:'s16',date:'2026-05-16',slot:1,col:6,time:'10:30',color:'',      subject:'Math G6', grade:'G6',teacher:'Kru Cat',room:'Room 2',students:5,branch:SK,status:U},
    {id:'s17',date:'2026-05-16',slot:4,col:6,time:'15:00',color:'green', subject:'Thai Lang',grade:'G5',teacher:'Kru Eve',room:'Room 1',students:3,branch:SI,status:U},
  ];

  const timeSlots  = ['09:00','10:30','13:00','14:30','15:00','16:30'];
  const TEACHERS   = ['Kru Arm','Kru Bee','Kru Cat','Kru Dan','Kru Eve'];
  const SUBJECTS   = ['Math G5','Math G6','Eng Read','Science','Thai Lang'];
  const GRADES     = ['G3','G4','G5','G6'];
  const ROOMS      = ['Room 1','Room 2','Room 3'];
  const dayHeaders = [
    { label:'Mon 11', date:'2026-05-11', isToday:false, isHoliday:false },
    { label:'Tue 12', date:'2026-05-12', isToday:false, isHoliday:false },
    { label:'Wed 13', date:'2026-05-13', isToday:true,  isHoliday:false },
    { label:'Thu 14', date:'2026-05-14', isToday:false, isHoliday:false },
    { label:'Fri 15', date:'2026-05-15', isToday:false, isHoliday:true  },
    { label:'Sat 16', date:'2026-05-16', isToday:false, isHoliday:false },
    { label:'Sun 17', date:'2026-05-17', isToday:false, isHoliday:false },
  ];

  /* ── FILTER STATE ─────────────────────────────────────── */
  let fTeacher='', fSubject='', fGrade='', fTime='', currentView='week', selectedDay='2026-05-13';

  function getFiltered() {
    return sessions.filter(s => {
      if (fTeacher && !s.teacher.includes(fTeacher)) return false;
      if (fSubject && s.subject !== fSubject)         return false;
      if (fGrade   && s.grade !== fGrade)             return false;
      if (fTime === 'morning'   && parseInt(s.time) >= 12)  return false;
      if (fTime === 'afternoon' && (parseInt(s.time) < 12 || parseInt(s.time) >= 16)) return false;
      if (fTime === 'evening'   && parseInt(s.time) < 16)   return false;
      return true;
    });
  }

  /* ── RENDER SHELL ─────────────────────────────────────── */
  document.getElementById('view-calendar').innerHTML = `
  <div class="page-header">
    <div><div class="page-title">Calendar</div><div class="page-sub" id="cal-sub">Week of 11–17 May 2026</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-secondary btn-sm" id="cal-prev" onclick="calNav(-1)">← Prev</button>
      <button class="btn btn-secondary btn-sm" onclick="calNav(0)">Today</button>
      <button class="btn btn-secondary btn-sm" id="cal-next" onclick="calNav(1)">Next →</button>
      <button class="btn btn-secondary btn-sm" onclick="openCalSummary()">📊 Summary</button>
      <button class="btn btn-primary btn-sm"   onclick="openCreateClass()">＋ Create Class</button>
    </div>
  </div>

  <!-- FILTER BAR -->
  <div class="table-controls" style="margin-bottom:10px;background:#fff;border:1px solid #e5e7eb;border-radius:8px">
    <span class="ts-label">Filter:</span>
    <select class="tc-select" onchange="setCalFilter('teacher',this.value)">
      <option value="">All Teachers</option>
      ${TEACHERS.map(t=>`<option>${t}</option>`).join('')}
    </select>
    <select class="tc-select" onchange="setCalFilter('subject',this.value)">
      <option value="">All Subjects</option>
      ${SUBJECTS.map(s=>`<option>${s}</option>`).join('')}
    </select>
    <select class="tc-select" onchange="setCalFilter('grade',this.value)">
      <option value="">All Grades</option>
      ${GRADES.map(g=>`<option>${g}</option>`).join('')}
    </select>
    <div class="ts-divider"></div>
    <select class="tc-select" onchange="setCalFilter('time',this.value)">
      <option value="">All Times</option>
      <option value="morning">Morning (09–12)</option>
      <option value="afternoon">Afternoon (13–16)</option>
      <option value="evening">Evening (16+)</option>
    </select>
    <button class="btn btn-secondary btn-sm" onclick="clearCalFilters()">✕ Clear</button>
    <span id="cal-filter-count" style="margin-left:auto;font-size:11px;color:#9ca3af"></span>
  </div>

  <!-- HOLIDAY BANNER -->
  <div id="holiday-banner" style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:8px 14px;margin-bottom:12px;font-size:13px;color:#991b1b;display:flex;align-items:center;gap:8px">
    🏖️ <strong>วันหยุด:</strong> ศุกร์ 15 May — วันวิสาขบูชา (ทุกสาขาหยุด)
    <button class="btn btn-sm" style="margin-left:auto;background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;font-size:11px" onclick="this.closest('#holiday-banner').style.display='none'">✕</button>
  </div>

  <!-- VIEW TABS -->
  <div class="tabs">
    <div class="tab active" onclick="calTab('week',this)">Week</div>
    <div class="tab"        onclick="calTab('day',this)">Day</div>
    <div class="tab"        onclick="calTab('month',this)">Month</div>
    <div class="tab"        onclick="calTab('teacher',this)">Teacher</div>
    <div class="tab"        onclick="calTab('list',this)">List</div>
    <div class="tab"        onclick="calTab('year',this)">Year</div>
  </div>

  <div id="cal-view-container"></div>`;

  /* ── WEEK VIEW ────────────────────────────────────────── */
  function buildWeek() {
    const filtered = getFiltered();
    const lookup = {};
    filtered.forEach(s => {
      const key = `${s.slot}-${s.col}`;
      (lookup[key] = lookup[key]||[]).push(s);
    });
    let h = '<div class="cal-days" id="cal-grid">';
    h += '<div class="cal-day-header"></div>';
    dayHeaders.forEach(d => {
      const cls = d.isToday ? 'today' : d.isHoliday ? 'holiday' : '';
      h += `<div class="cal-day-header ${cls}">${d.label}${d.isHoliday?' 🏖️':''}</div>`;
    });
    timeSlots.forEach((time, slot) => {
      h += `<div class="cal-time">${time}</div>`;
      dayHeaders.forEach((d, di) => {
        const col = di + 1;
        const list = lookup[`${slot}-${col}`] || [];
        h += `<div class="cal-cell ${d.isHoliday?'holiday-col':''}">`;
        if (d.isHoliday && slot === 0) h += `<div class="cal-event holiday-event">วันวิสาขบูชา</div>`;
        list.forEach(s => {
          const t = s.teacher.split(',').map(x=>x.trim().replace('Kru ','')).join('+');
          h += `<div class="cal-event ${s.color}" onclick="openCalSession('${s.id}')" title="${s.subject} · ${s.teacher}">
            ${s.subject} · ${s.room}<br><span style="font-size:9px;opacity:.85">👩‍🏫 ${t}</span></div>`;
        });
        h += '</div>';
      });
    });
    h += '</div>';
    updateFilterCount(filtered.length);
    return h;
  }

  /* ── DAY VIEW ─────────────────────────────────────────── */
  function buildDay() {
    const filtered = getFiltered().filter(s => s.date === selectedDay);
    const d = dayHeaders.find(x => x.date === selectedDay) || dayHeaders[2];
    let h = `<div style="font-size:13px;font-weight:600;margin-bottom:8px;color:#6366f1">${d.label}${d.isHoliday?' 🏖️':''}</div>`;
    h += '<div class="cal-day-grid">';
    timeSlots.forEach((time, slot) => {
      const list = filtered.filter(s => s.slot === slot);
      h += `<div class="cal-time" style="height:auto;min-height:60px;padding:8px">${time}</div>`;
      h += `<div class="cal-cell" style="height:auto;min-height:60px;padding:6px;border-right:none">`;
      if (d.isHoliday) { if(slot===0) h += `<div class="cal-event holiday-event" style="display:inline-block">🏖️ วันวิสาขบูชา — วันหยุดราชการ</div>`; }
      else if (list.length === 0) h += `<span style="font-size:11px;color:#d1d5db">—</span>`;
      list.forEach(s => {
        h += `<div class="cal-event ${s.color}" style="display:inline-block;margin-right:4px" onclick="openCalSession('${s.id}')">
          ${s.subject} · ${s.room} · ${s.teacher} · ${s.students} stu.</div>`;
      });
      h += '</div>';
    });
    h += '</div>';
    updateFilterCount(filtered.length);
    return h;
  }

  /* ── MONTH VIEW ───────────────────────────────────────── */
  function buildMonth() {
    const filtered = getFiltered();
    const byDate = {};
    filtered.forEach(s => (byDate[s.date]=byDate[s.date]||[]).push(s));
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    let h = '<div class="cal-month-grid">';
    days.forEach(d => h += `<div class="cal-month-head">${d}</div>`);
    // May 2026: 1st = Fri (col 5 in Mon-start), so offset = 4
    const offset = 4; // Mon=0, so Fri=4
    const daysInMay = 31;
    const totalCells = Math.ceil((daysInMay + offset) / 7) * 7;
    for (let i = 0; i < totalCells; i++) {
      const dayNum = i - offset + 1;
      if (dayNum < 1 || dayNum > daysInMay) {
        h += '<div class="cal-month-cell other-month"><span class="cal-month-num">' + (dayNum<1?'':dayNum) + '</span></div>';
        continue;
      }
      const dateStr = `2026-05-${String(dayNum).padStart(2,'0')}`;
      const isToday = dateStr === '2026-05-13';
      const isHoliday = dateStr === '2026-05-15';
      const evs = byDate[dateStr] || [];
      h += `<div class="cal-month-cell${isToday?' today':''}${isHoliday?' holiday':''}" onclick="selectDay('${dateStr}')">
        <span class="cal-month-num">${dayNum}${isHoliday?' 🏖️':''}</span>`;
      evs.slice(0,3).forEach(s => h += `<div class="cal-event ${s.color}" style="font-size:9px;padding:1px 4px" onclick="event.stopPropagation();openCalSession('${s.id}')">${s.subject}</div>`);
      if (evs.length > 3) h += `<div style="font-size:9px;color:#6366f1;padding:1px 4px">+${evs.length-3} more</div>`;
      h += '</div>';
    }
    h += '</div>';
    updateFilterCount(filtered.length);
    return h;
  }

  /* ── TEACHER VIEW ─────────────────────────────────────── */
  function buildTeacher() {
    const filtered = getFiltered();
    const cols = 1 + TEACHERS.length;
    let h = `<div class="cal-teacher-grid" style="grid-template-columns:60px repeat(${TEACHERS.length},1fr)">`;
    h += '<div class="cal-day-header"></div>';
    TEACHERS.forEach(t => h += `<div class="cal-day-header">${t}</div>`);
    timeSlots.forEach((time, slot) => {
      h += `<div class="cal-time">${time}</div>`;
      TEACHERS.forEach(teacher => {
        const list = filtered.filter(s => s.slot === slot && s.teacher.includes(teacher));
        h += '<div class="cal-cell" style="height:auto;min-height:64px">';
        list.forEach(s => h += `<div class="cal-event ${s.color}" onclick="openCalSession('${s.id}')">${s.subject}<br><span style="font-size:9px">${s.date.slice(8)} May · ${s.room}</span></div>`);
        h += '</div>';
      });
    });
    h += '</div>';
    updateFilterCount(filtered.length);
    return h;
  }

  /* ── LIST VIEW ────────────────────────────────────────── */
  function buildList() {
    const filtered = getFiltered().sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    let h = `<div class="card" style="padding:0;overflow:hidden"><div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Time</th><th>Subject</th><th>Grade</th><th>Teacher</th><th>Room</th><th>Students</th><th>Status</th><th></th></tr></thead><tbody>`;
    filtered.forEach(s => {
      const d = dayHeaders.find(x=>x.date===s.date);
      const isHol = d?.isHoliday;
      const sCls = s.status==='done'?'badge-gray':s.status==='upcoming'?'badge-blue':'badge-green';
      h += `<tr ${isHol?'style="background:#fff9f9"':''}>
        <td>${d?.label||s.date}${isHol?' 🏖️':''}</td>
        <td>${s.time}</td><td>${s.subject}</td><td><span class="badge badge-gray">${s.grade}</span></td>
        <td style="font-size:12px">${s.teacher}</td><td style="font-size:12px">${s.room}</td>
        <td style="text-align:center">${s.students}</td>
        <td><span class="badge ${sCls}">${s.status}</span></td>
        <td><button class="btn btn-secondary btn-sm" onclick="openCalSession('${s.id}')">View</button></td>
      </tr>`;
    });
    h += '</tbody></table></div></div>';
    updateFilterCount(filtered.length);
    return h;
  }

  /* ── YEAR VIEW ────────────────────────────────────────── */
  function buildYear() {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const sessionDates = new Set(getFiltered().map(s => s.date));
    // offsets (Mon-start) for each month of 2026
    const offsets = [3,0,0,3,4,0,2,5,1,3,6,1]; // Jan=Thu→3, Feb=Sun→0... (Mon=0)
    const daysIn  = [31,28,31,30,31,30,31,31,30,31,30,31];
    let h = '<div class="cal-year-grid">';
    months.forEach((mon, mi) => {
      h += `<div class="cal-mini-month"><div class="cal-mini-title">${mon} 2026</div><div class="cal-mini-grid">`;
      const off = offsets[mi], dim = daysIn[mi];
      for (let i = 0; i < off; i++) h += '<div class="cal-mini-cell"></div>';
      for (let d = 1; d <= dim; d++) {
        const dateStr = `2026-${String(mi+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const has = sessionDates.has(dateStr);
        const isTod = dateStr === '2026-05-13';
        const isHol = dateStr === '2026-05-15';
        const cls = isTod ? 'today-cell' : isHol ? 'holiday-cell' : has ? 'has-session' : '';
        h += `<div class="cal-mini-cell ${cls}" ${has?`onclick="selectDay('${dateStr}');calTab('day',document.querySelectorAll('.tab[onclick*=calTab]')[1])"`:''}>${d}</div>`;
      }
      h += '</div></div>';
    });
    h += '</div>';
    return h;
  }

  /* ── RENDER CURRENT VIEW ──────────────────────────────── */
  function render() {
    const container = document.getElementById('cal-view-container');
    if (!container) return;
    if      (currentView==='week')    container.innerHTML = buildWeek();
    else if (currentView==='day')     container.innerHTML = buildDay();
    else if (currentView==='month')   container.innerHTML = buildMonth();
    else if (currentView==='teacher') container.innerHTML = buildTeacher();
    else if (currentView==='list')    container.innerHTML = buildList();
    else if (currentView==='year')    container.innerHTML = buildYear();
  }

  function updateFilterCount(n) {
    const el = document.getElementById('cal-filter-count');
    if (el) el.textContent = `${n} session${n!==1?'s':''}`;
  }

  render();

  /* ── TAB SWITCH & NAVIGATION ──────────────────────────── */
  window.calTab = function(tab, el) {
    currentView = tab;
    document.querySelectorAll('#view-calendar .tab').forEach(t=>t.classList.remove('active'));
    if (el) el.classList.add('active');
    const subs = { week:'Week of 11–17 May 2026', day:'Day View — May 2026', month:'Month of May 2026',
      teacher:'Teacher View — Week of 11–17 May', list:'All Sessions — May 2026', year:'Year 2026' };
    const el2 = document.getElementById('cal-sub');
    if (el2) el2.textContent = subs[tab]||'';
    render();
  };

  window.calNav = function(dir) { showToast('Week navigation coming soon','info'); };

  window.selectDay = function(dateStr) {
    selectedDay = dateStr;
    calTab('day', document.querySelectorAll('#view-calendar .tab')[1]);
  };

  /* ── FILTER HANDLERS ──────────────────────────────────── */
  window.setCalFilter = function(type, val) {
    if (type==='teacher') fTeacher = val;
    if (type==='subject') fSubject = val;
    if (type==='grade')   fGrade   = val;
    if (type==='time')    fTime    = val;
    render();
  };

  window.clearCalFilters = function() {
    fTeacher = fSubject = fGrade = fTime = '';
    document.querySelectorAll('#view-calendar .tc-select').forEach(s => s.value='');
    render();
  };

  /* ── SESSION CLICK MODAL ──────────────────────────────── */
  window.openCalSession = function(id) {
    const s = sessions.find(x=>x.id===id);
    if (!s) return;
    const d = dayHeaders.find(x=>x.date===s.date);
    const statusCls = s.status==='done'?'badge-gray':'badge-blue';
    Modal.create(`modal-cal-${id}`, `📚 ${s.subject}`, `
      <div class="modal-section">
        <div class="info-grid">
          <div class="info-item"><div class="label">Date</div>${d?.label||s.date}</div>
          <div class="info-item"><div class="label">Time</div>${s.time}</div>
          <div class="info-item"><div class="label">Teacher</div>${s.teacher}</div>
          <div class="info-item"><div class="label">Room</div>${s.room}</div>
          <div class="info-item"><div class="label">Branch</div>${s.branch}</div>
          <div class="info-item"><div class="label">Grade</div><span class="badge badge-gray">${s.grade}</span></div>
          <div class="info-item"><div class="label">Students</div>${s.students}</div>
          <div class="info-item"><div class="label">Status</div><span class="badge ${statusCls}">${s.status}</span></div>
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Attendance</div>
        ${['Student A','Student B','Student C'].slice(0,s.students>2?3:2).map(n=>`
        <div class="att-row"><div class="att-name">${n}</div><div class="att-btns">
          <button class="att-btn present sel" onclick="selectAtt(this,'present')">Present</button>
          <button class="att-btn leave" onclick="selectAtt(this,'leave')">Leave</button>
          <button class="att-btn absent" onclick="selectAtt(this,'absent')">Absent</button>
        </div></div>`).join('')}
        <div style="margin-top:10px">
          <button class="btn btn-secondary btn-sm" onclick="openAddStudent('${id}')">＋ Add Student</button>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-cal-${id}')">Cancel</button>
       <button class="btn btn-secondary" onclick="openEditClass('${id}');Modal.close('modal-cal-${id}')">✏️ Edit Class</button>
       <button class="btn btn-secondary" onclick="showToast('Class ended','success');Modal.close('modal-cal-${id}')">End Class</button>
       <button class="btn btn-primary" onclick="showToast('Class started ✓','success');Modal.close('modal-cal-${id}')">▶ Start Class</button>`
    );
  };

  /* ── EDIT CLASS MODAL ─────────────────────────────────── */
  window.openEditClass = function(id) {
    const s = sessions.find(x=>x.id===id);
    if (!s) return;
    Modal.create('modal-edit-class','✏️ Edit Class', `
      <div class="modal-section">
        <div class="settings-row"><div class="settings-group">
          <label class="settings-label">Date</label>
          <input class="settings-input" type="date" value="${s.date}">
        </div><div class="settings-group">
          <label class="settings-label">Time</label>
          <select class="settings-input">
            ${timeSlots.map(t=>`<option ${t===s.time?'selected':''}>${t}</option>`).join('')}
          </select>
        </div></div>
        <div class="settings-row"><div class="settings-group">
          <label class="settings-label">Subject</label>
          <select class="settings-input">
            ${SUBJECTS.map(x=>`<option ${x===s.subject?'selected':''}>${x}</option>`).join('')}
          </select>
        </div><div class="settings-group">
          <label class="settings-label">Grade</label>
          <select class="settings-input">
            ${GRADES.map(g=>`<option ${g===s.grade?'selected':''}>${g}</option>`).join('')}
          </select>
        </div></div>
        <div class="settings-row"><div class="settings-group">
          <label class="settings-label">Teacher</label>
          <select class="settings-input">
            ${TEACHERS.map(t=>`<option ${t===s.teacher?'selected':''}>${t}</option>`).join('')}
          </select>
        </div><div class="settings-group">
          <label class="settings-label">Room</label>
          <select class="settings-input">
            ${ROOMS.map(r=>`<option ${r===s.room?'selected':''}>${r}</option>`).join('')}
          </select>
        </div></div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-edit-class')">Cancel</button>
       <button class="btn btn-primary" onclick="showToast('Class updated ✓','success');Modal.close('modal-edit-class')">Save Changes</button>`
    );
  };

  /* ── CREATE CLASS MODAL ───────────────────────────────── */
  window.openCreateClass = function() {
    Modal.create('modal-create-class','＋ Create Class', `
      <div class="modal-section">
        <div class="settings-row"><div class="settings-group">
          <label class="settings-label">Date</label>
          <input class="settings-input" type="date" value="2026-05-14">
        </div><div class="settings-group">
          <label class="settings-label">Time</label>
          <select class="settings-input">
            ${timeSlots.map(t=>`<option>${t}</option>`).join('')}
          </select>
        </div></div>
        <div class="settings-row"><div class="settings-group">
          <label class="settings-label">Subject</label>
          <select class="settings-input">
            <option value="">— Select —</option>
            ${SUBJECTS.map(x=>`<option>${x}</option>`).join('')}
          </select>
        </div><div class="settings-group">
          <label class="settings-label">Grade</label>
          <select class="settings-input">
            <option value="">— Select —</option>
            ${GRADES.map(g=>`<option>${g}</option>`).join('')}
          </select>
        </div></div>
        <div class="settings-row"><div class="settings-group">
          <label class="settings-label">Teacher</label>
          <select class="settings-input">
            <option value="">— Select —</option>
            ${TEACHERS.map(t=>`<option>${t}</option>`).join('')}
          </select>
        </div><div class="settings-group">
          <label class="settings-label">Room</label>
          <select class="settings-input">
            <option value="">— Select —</option>
            ${ROOMS.map(r=>`<option>${r}</option>`).join('')}
          </select>
        </div></div>
        <div class="settings-row"><div class="settings-group">
          <label class="settings-label">Branch</label>
          <select class="settings-input">
            <option>Sukhumvit</option><option>Silom</option>
          </select>
        </div><div class="settings-group">
          <label class="settings-label">Max Students</label>
          <input class="settings-input" type="number" value="5" min="1" max="20">
        </div></div>
        <div class="settings-group">
          <label class="settings-label">Notes</label>
          <textarea class="settings-input" rows="2" placeholder="Optional notes…" style="resize:none"></textarea>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-create-class')">Cancel</button>
       <button class="btn btn-primary" onclick="showToast('Class created ✓','success');Modal.close('modal-create-class')">✓ Create Class</button>`
    );
  };

  /* ── ADD STUDENT MODAL ────────────────────────────────── */
  window.openAddStudent = function(sessionId) {
    const students = ['Mia Tanaka','Tom Chen','Ploy Srirak','James Wilson','Kevin Park'];
    Modal.create('modal-add-student','＋ Add Student to Class', `
      <div class="modal-section">
        <div style="font-size:13px;color:#6b7280;margin-bottom:12px">Select student(s) to add to this session:</div>
        ${students.map(n=>`
        <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid #f3f4f6;border-radius:6px;margin-bottom:6px;cursor:pointer"
             onclick="this.style.background=this.style.background?'':'#ede9fe'">
          <input type="checkbox" style="width:14px;height:14px;accent-color:#6366f1">
          <div class="avatar" style="width:26px;height:26px;font-size:10px">${n[0]}</div>
          <span style="font-size:13px">${n}</span>
        </div>`).join('')}
        <div style="margin-top:8px;padding-top:10px;border-top:1px solid #f3f4f6">
          <input class="settings-input" placeholder="Or type a name to add manually…" style="font-size:12px">
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-add-student')">Cancel</button>
       <button class="btn btn-primary" onclick="showToast('Student added ✓','success');Modal.close('modal-add-student')">✓ Add to Class</button>`
    );
  };

  /* ── SUMMARY MODAL ────────────────────────────────────── */
  window.openCalSummary = function() {
    const filtered = getFiltered();
    const noHol = filtered.filter(s => !dayHeaders.find(d=>d.date===s.date)?.isHoliday);
    const teachers = [...new Set(filtered.flatMap(s=>s.teacher.split(',').map(t=>t.trim())))];
    const byTeacher = {};
    teachers.forEach(t => byTeacher[t] = filtered.filter(s=>s.teacher.includes(t)).length);
    const rows = filtered.map(s => {
      const d = dayHeaders.find(x=>x.date===s.date);
      const isHol = d?.isHoliday;
      return `<tr ${isHol?'style="background:#fff9f9"':''}>
        <td>${d?.label||s.date}${isHol?' 🏖️':''}</td>
        <td>${s.time}</td><td>${s.subject}</td><td>${s.teacher}</td>
        <td style="text-align:center">${s.students}</td>
        <td>${isHol?'<span class="badge badge-red">Holiday!</span>':'<span class="badge badge-green">OK</span>'}</td>
      </tr>`;
    }).join('');
    Modal.create('modal-cal-summary',`📊 ${currentView.charAt(0).toUpperCase()+currentView.slice(1)} Summary`,`
      <div class="modal-section">
        <div class="info-grid" style="margin-bottom:14px">
          <div class="info-item"><div class="label">Sessions (filtered)</div><strong>${noHol.length}</strong></div>
          <div class="info-item"><div class="label">Total Students (est.)</div><strong>${filtered.reduce((a,s)=>a+s.students,0)}</strong></div>
          <div class="info-item"><div class="label">Active Teachers</div><strong>${teachers.length}</strong></div>
          <div class="info-item"><div class="label">Holiday Conflicts</div><span class="badge badge-red">Fri 15 May</span></div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px">
          ${teachers.map(t=>`<div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:6px;padding:6px 10px;font-size:12px">
            <strong>${t}</strong>: ${byTeacher[t]} session${byTeacher[t]!==1?'s':''}</div>`).join('')}
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">All Sessions</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Day</th><th>Time</th><th>Subject</th><th>Teacher</th><th>Students</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-cal-summary')">Close</button>
       <button class="btn btn-primary" onclick="showToast('Exporting…','info')">Export PDF</button>`,
      'modal-xl'
    );
  };

})();
