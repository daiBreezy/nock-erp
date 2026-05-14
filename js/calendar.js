/* ============================================================
   calendar.js — Calendar views, filters, navigation
   Class modal: see calendar-class.js
   ============================================================ */
(function () {

  /* ── DATA & CONFIG (from global DB / CONST) ──────────────── */
  const TIME_SLOTS    = CONST.TIME_SLOTS;
  const CLASS_SLOTS   = TIME_SLOTS.filter(s => s.type === 'class');
  const TIME_HOURS    = CONST.TIME_HOURS;
  const BREAK_HOURS   = CONST.BREAK_HOURS;
  const SLOT_HOURS    = CONST.SLOT_HOURS;
  const SUBJECT_COLOR = CONST.SUBJECT_COLOR;
  const TEACHERS      = CONST.TEACHERS;
  const SUBJECTS      = CONST.SUBJECTS;
  const GRADES        = CONST.GRADES;
  const ROOMS         = CONST.ROOMS;

  // row index: header=1, 08:00=2 … 19:00=13
  const ROW_MAP = {}; TIME_HOURS.forEach((h,i) => ROW_MAP[h] = i+2);

  const sessions   = DB.sessions;    // live reference — mutations reflected everywhere
  const dayHeaders = DB.dayHeaders;

  /* ── FILTER STATE ─────────────────────────────────────── */
  let fTeacher='', fSubject='', fGrade='', fTime='', currentView='week', selectedDay='2026-05-13';

  function getFiltered() {
    return sessions.filter(s => {
      if (fTeacher && !s.teacher.includes(fTeacher)) return false;
      if (fSubject && s.subject !== fSubject)         return false;
      if (fGrade   && s.grade   !== fGrade)           return false;
      if (fTime==='morning'   && parseInt(s.slotId)>0)  return false;
      if (fTime==='afternoon' && s.slotId!==1)           return false;
      if (fTime==='evening'   && s.slotId<2)             return false;
      return true;
    });
  }

  /* ── SHELL HTML ───────────────────────────────────────── */
  document.getElementById('view-calendar').innerHTML = `
  <div class="page-header">
    <div><div class="page-title">Calendar</div><div class="page-sub" id="cal-sub">Week of 11–17 May 2026</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-secondary btn-sm" onclick="calNav(-1)">← Prev</button>
      <button class="btn btn-secondary btn-sm" onclick="calNav(0)">Today</button>
      <button class="btn btn-secondary btn-sm" onclick="calNav(1)">Next →</button>
      <button class="btn btn-secondary btn-sm" onclick="openCalSummary()">📊 Summary</button>
      <button class="btn btn-primary btn-sm" onclick="openCreateClass()">＋ Create Class</button>
    </div>
  </div>
  <div class="table-controls" style="margin-bottom:10px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;flex-wrap:wrap">
    <span class="ts-label">Filter:</span>
    <select class="tc-select" onchange="setCalFilter('teacher',this.value)">
      <option value="">All Teachers</option>${TEACHERS.map(t=>`<option>${t}</option>`).join('')}
    </select>
    <select class="tc-select" onchange="setCalFilter('subject',this.value)">
      <option value="">All Subjects</option>${SUBJECTS.map(s=>`<option>${s}</option>`).join('')}
    </select>
    <select class="tc-select" onchange="setCalFilter('grade',this.value)">
      <option value="">All Grades</option>${GRADES.map(g=>`<option>${g}</option>`).join('')}
    </select>
    <select class="tc-select" onchange="setCalFilter('time',this.value)">
      <option value="">All Times</option>
      <option value="morning">Morning (10–12)</option>
      <option value="afternoon">Afternoon (13–15)</option>
      <option value="evening">Evening (15+)</option>
    </select>
    <button class="btn btn-secondary btn-sm" onclick="clearCalFilters()">✕ Clear</button>
    <span id="cal-filter-count" style="margin-left:auto;font-size:11px;color:#9ca3af"></span>
  </div>
  <div id="holiday-banner" style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:8px 14px;margin-bottom:10px;font-size:13px;color:#991b1b;display:flex;align-items:center;gap:8px">
    🏖️ <strong>วันหยุด:</strong> ศุกร์ 15 May — วันวิสาขบูชา (ทุกสาขาหยุด)
    <button class="btn btn-sm" style="margin-left:auto;background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;font-size:11px" onclick="this.closest('#holiday-banner').style.display='none'">✕</button>
  </div>
  <div class="tabs" style="margin-bottom:10px">
    <div class="tab active" onclick="calTab('week',this)">Week</div>
    <div class="tab" onclick="calTab('day',this)">Day</div>
    <div class="tab" onclick="calTab('month',this)">Month</div>
    <div class="tab" onclick="calTab('teacher',this)">Teacher</div>
    <div class="tab" onclick="calTab('list',this)">List</div>
    <div class="tab" onclick="calTab('year',this)">Year</div>
  </div>
  <div id="cal-view-container"></div>`;

  /* ── WEEK VIEW ────────────────────────────────────────── */
  function buildWeek() {
    const filtered = getFiltered();
    const lookup = {};
    filtered.forEach(s => { const k=`${s.slotId}-${s.col}`; (lookup[k]=lookup[k]||[]).push(s); });
    let h = '<div class="cal-fill"><div class="cal-days">';
    h += '<div class="cal-day-header" style="position:sticky;top:0;z-index:2"></div>';
    dayHeaders.forEach(d => {
      const cls = d.isToday?'today':d.isHoliday?'holiday':'';
      h += `<div class="cal-day-header ${cls}" style="position:sticky;top:0;z-index:2">${d.label}${d.isHoliday?' 🏖️':''}</div>`;
    });
    TIME_SLOTS.forEach(slot => {
      if (slot.type === 'break') {
        h += `<div class="cal-time break-row">${slot.start}</div>`;
        for (let i=0;i<7;i++) h += `<div class="cal-cell break-cell"><span style="font-size:9px;color:#9ca3af;padding:0 4px">${i===0?slot.label:''}</span></div>`;
        return;
      }
      h += `<div class="cal-time">${slot.start}<span class="end-time">${slot.end}</span></div>`;
      dayHeaders.forEach((d, di) => {
        const col = di+1, list = lookup[`${slot.id}-${col}`]||[];
        h += `<div class="cal-cell ${d.isHoliday?'holiday-col':''}">`;
        if (d.isHoliday && slot.id===0) h += `<div class="cal-event holiday-event">วันวิสาขบูชา</div>`;
        list.forEach(s => {
          const t = s.teacher.split(',').map(x=>x.trim().replace('Kru ','')).join('+');
          const dot = s.state==='active'?'🟢 ':s.state==='ended'?'✅ ':'';
          h += `<div class="cal-event ${s.color}" onclick="openClassModal('${s.id}')" title="${s.subject} · ${s.teacher}">
            ${dot}${s.subject} · ${s.room}
            <br><span style="font-size:9px;opacity:.8">👩‍🏫${t} · ${s.studentNames.length}👤</span>
          </div>`;
        });
        h += '</div>';
      });
    });
    h += '</div></div>';
    updateFilterCount(filtered.length);
    return h;
  }

  /* ── DAY VIEW — Teachers × Hourly grid (like reference) ─ */
  function buildDay() {
    const dh  = dayHeaders.find(x=>x.date===selectedDay)||dayHeaders[2];
    const filtered = getFiltered().filter(s=>s.date===selectedDay);

    // Columns: show all teachers; highlight those with sessions today
    const N = TEACHERS.length;
    // grid-template-rows: header + one row per hour (breaks = 36px, normal = 1fr)
    const rowDefs = TIME_HOURS.map(h => BREAK_HOURS[h]?'36px':'1fr').join(' ');

    // Color styles per event color
    function evStyle(color) {
      if (color==='green')  return 'background:#d1fae5;border-left:4px solid #10b981;color:#065f46';
      if (color==='yellow') return 'background:#fef3c7;border-left:4px solid #f59e0b;color:#92400e';
      if (color==='orange') return 'background:#ffedd5;border-left:4px solid #f97316;color:#c2410c';
      return 'background:#ede9fe;border-left:4px solid #6366f1;color:#5b21b6';
    }

    let h = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <button class="btn btn-secondary btn-sm" onclick="selectPrevDay()">←</button>
      <span style="font-weight:600;color:#6366f1;font-size:14px">${dh.label}${dh.isHoliday?' 🏖️':''}</span>
      <span style="font-size:12px;color:#9ca3af">${filtered.length} class${filtered.length!==1?'es':''} today</span>
      <button class="btn btn-secondary btn-sm" onclick="selectNextDay()">→</button>
    </div>`;

    h += `<div class="cal-fill" style="overflow:auto">
    <div style="display:grid;grid-template-columns:70px repeat(${N},minmax(130px,1fr));grid-template-rows:42px ${rowDefs};
      min-height:calc(100vh - 310px);background:#fff;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;position:relative">`;

    // ── Header row (row 1) ──
    h += `<div style="grid-row:1;grid-column:1;background:#f9fafb;border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:10px 8px;font-size:11px;color:#6b7280"></div>`;
    TEACHERS.forEach((t, ti) => {
      const hasSessions = filtered.some(s=>s.teacher.includes(t));
      h += `<div style="grid-row:1;grid-column:${ti+2};background:${hasSessions?'#f5f3ff':'#f9fafb'};
        border-bottom:1px solid #e5e7eb;border-right:1px solid #f3f4f6;padding:10px 8px;
        font-size:12px;font-weight:${hasSessions?'600':'400'};
        color:${hasSessions?'#6366f1':'#9ca3af'};text-align:center">${t}</div>`;
    });

    // ── Hour rows ──
    TIME_HOURS.forEach((time, ti) => {
      const row = ti + 2;
      const brk = BREAK_HOURS[time];
      if (brk) {
        // Break: spans ALL columns
        h += `<div style="grid-row:${row};grid-column:1/${N+2};background:#f3f4f6;
          border-bottom:1px solid #e5e7eb;display:flex;align-items:center;padding:0 14px;gap:12px">
          <span style="font-size:11px;font-weight:600;color:#6b7280;min-width:42px">${time}</span>
          <span style="font-size:11px;color:#9ca3af;font-style:italic">${brk}</span>
        </div>`;
      } else {
        // Time label
        h += `<div style="grid-row:${row};grid-column:1;border-right:1px solid #e5e7eb;
          border-bottom:1px solid #f3f4f6;padding:8px;font-size:11px;color:#9ca3af;
          display:flex;align-items:flex-start">${time}</div>`;
        // Empty teacher cells (background grid lines)
        TEACHERS.forEach((t, ti) => {
          h += `<div style="grid-row:${row};grid-column:${ti+2};border-right:1px solid #f3f4f6;border-bottom:1px solid #f3f4f6"></div>`;
        });
      }
    });

    // ── Holiday overlay ──
    if (dh.isHoliday) {
      h += `<div style="grid-row:2/${TIME_HOURS.length+2};grid-column:2/${N+2};
        background:rgba(254,226,226,.6);display:flex;align-items:center;justify-content:center;z-index:2;pointer-events:none">
        <div style="text-align:center;color:#991b1b;font-size:20px;font-weight:700">🏖️ วันวิสาขบูชา<br><span style="font-size:13px;font-weight:400">วันหยุดราชการ — ไม่มีคลาส</span></div>
      </div>`;
    } else {
      // ── Place session blocks ──
      filtered.forEach(s => {
        const sh = SLOT_HOURS[s.slotId]; if (!sh) return;
        const startRow = ROW_MAP[sh.s];
        const endRow   = ROW_MAP[sh.e] || (ROW_MAP[sh.s]+2);
        const dot = s.state==='active'?'🟢':s.state==='ended'?'✅':'📅';
        // Each teacher in session gets their own column block
        s.teacher.split(',').map(t=>t.trim()).forEach(teacher => {
          const col = TEACHERS.indexOf(teacher)+2; if (col<2) return;
          h += `<div style="grid-row:${startRow}/${endRow};grid-column:${col};
            ${evStyle(s.color)};padding:10px 10px;cursor:pointer;border-radius:6px;margin:3px;
            overflow:hidden;z-index:1;transition:opacity .15s"
            onclick="openClassModal('${s.id}')"
            onmouseover="this.style.opacity='.8'" onmouseout="this.style.opacity='1'">
            <div style="font-weight:600;font-size:13px">${dot} ${s.subject}</div>
            <div style="font-size:11px;opacity:.8;margin-top:4px">${sh.s} – ${sh.e}</div>
            <div style="font-size:11px;opacity:.8">${s.room} · ${s.branch}</div>
            <div style="font-size:11px;opacity:.8;margin-top:2px">👥 ${s.studentNames.length} students</div>
          </div>`;
        });
      });
    }

    h += '</div></div>';
    updateFilterCount(filtered.length);
    return h;
  }

  /* ── MONTH VIEW ───────────────────────────────────────── */
  function buildMonth() {
    const filtered = getFiltered();
    const byDate = {};
    filtered.forEach(s => {
      if (!byDate[s.date]) byDate[s.date]={};
      byDate[s.date][s.subject] = (byDate[s.date][s.subject]||0)+1;
    });
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    let h = '<div class="cal-fill" style="overflow:auto"><div class="cal-month-grid">';
    days.forEach(d => h += `<div class="cal-month-head">${d}</div>`);
    const offset=4, dim=31; // May 2026: 1st = Fri (Mon-start offset=4)
    const total = Math.ceil((dim+offset)/7)*7;
    for (let i=0;i<total;i++) {
      const dn=i-offset+1;
      if (dn<1||dn>dim){ h+=`<div class="cal-month-cell other-month"><span class="cal-month-num">${dn>0&&dn<=dim?dn:''}</span></div>`; continue; }
      const ds=`2026-05-${String(dn).padStart(2,'0')}`;
      const isToday=ds==='2026-05-13', isHol=ds==='2026-05-15';
      const subjects = byDate[ds]||{};
      h += `<div class="cal-month-cell${isToday?' today':''}${isHol?' holiday':''}" onclick="selectDay('${ds}')">
        <span class="cal-month-num">${dn}${isHol?' 🏖️':''}</span>`;
      if (isHol) { h += `<div class="cal-event holiday-event" style="font-size:9px">วันวิสาขบูชา</div>`; }
      else {
        Object.entries(subjects).forEach(([subj, cnt]) => {
          const c = SUBJECT_COLOR[subj]||'';
          h += `<div class="cal-event ${c}" style="font-size:9px;padding:1px 4px">${subj}${cnt>1?` ×${cnt}`:''}</div>`;
        });
      }
      h += '</div>';
    }
    h += '</div></div>';
    updateFilterCount(filtered.length);
    return h;
  }

  /* ── TEACHER VIEW ─────────────────────────────────────── */
  function buildTeacher() {
    const filtered = getFiltered();
    let h = `<div class="cal-fill"><div class="cal-teacher-grid" style="grid-template-columns:70px repeat(${TEACHERS.length},1fr)">`;
    h += '<div class="cal-day-header"></div>';
    TEACHERS.forEach(t => h += `<div class="cal-day-header">${t}</div>`);
    TIME_SLOTS.forEach(slot => {
      if (slot.type==='break') {
        h += `<div class="cal-time break-row">${slot.start}</div>`;
        TEACHERS.forEach(()=>h+=`<div class="cal-cell break-cell"></div>`);
        return;
      }
      h += `<div class="cal-time">${slot.start}<span class="end-time">${slot.end}</span></div>`;
      TEACHERS.forEach(teacher => {
        const list = filtered.filter(s=>s.slotId===slot.id&&s.teacher.includes(teacher));
        h += '<div class="cal-cell">';
        list.forEach(s => {
          const dh = dayHeaders.find(d=>d.date===s.date);
          h += `<div class="cal-event ${s.color}" onclick="openClassModal('${s.id}')">${s.subject}<br><span style="font-size:9px">${dh?.label||s.date} · ${s.room}</span></div>`;
        });
        h += '</div>';
      });
    });
    h += '</div></div>';
    updateFilterCount(filtered.length);
    return h;
  }

  /* ── LIST VIEW ────────────────────────────────────────── */
  function buildList() {
    const filtered = getFiltered().sort((a,b)=>a.date.localeCompare(b.date)||a.slotId-b.slotId);
    const sCls = { upcoming:'badge-blue', active:'badge-green', ended:'badge-gray' };
    let h = `<div class="card" style="padding:0;overflow:hidden"><div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Time</th><th>Subject</th><th>Grade</th><th>Teacher</th><th>Room</th><th>Students</th><th>Status</th><th></th></tr></thead><tbody>`;
    filtered.forEach(s => {
      const dh = dayHeaders.find(x=>x.date===s.date);
      const ts = CLASS_SLOTS.find(c=>c.id===s.slotId);
      h += `<tr ${dh?.isHoliday?'style="background:#fff9f9"':''}>
        <td>${dh?.label||s.date}${dh?.isHoliday?' 🏖️':''}</td>
        <td style="font-size:11px">${ts?ts.start+'–'+ts.end:'—'}</td>
        <td>${s.subject}</td><td><span class="badge badge-gray">${s.grade}</span></td>
        <td style="font-size:12px">${s.teacher}</td><td style="font-size:12px">${s.room}</td>
        <td style="text-align:center">${s.studentNames.length}</td>
        <td><span class="badge ${sCls[s.state]||'badge-gray'}">${s.state}</span></td>
        <td><button class="btn btn-secondary btn-sm" onclick="openClassModal('${s.id}')">Open</button></td>
      </tr>`;
    });
    h += '</tbody></table></div></div>';
    updateFilterCount(filtered.length);
    return h;
  }

  /* ── YEAR VIEW ────────────────────────────────────────── */
  function buildYear() {
    const filtered = getFiltered();
    const cnt = {};
    filtered.forEach(s => cnt[s.date]=(cnt[s.date]||0)+1);
    const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const offsets=[3,0,0,3,4,0,2,5,1,3,6,1];
    const dims=[31,28,31,30,31,30,31,31,30,31,30,31];
    let h = '<div class="cal-year-grid">';
    months.forEach((mon, mi) => {
      h += `<div class="cal-mini-month"><div class="cal-mini-title">${mon} 2026</div><div class="cal-mini-grid">`;
      for (let i=0;i<offsets[mi];i++) h += '<div class="cal-mini-cell"></div>';
      for (let d=1;d<=dims[mi];d++) {
        const ds=`2026-${String(mi+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const n=cnt[ds]||0, isTod=ds==='2026-05-13', isHol=ds==='2026-05-15';
        const cls=isTod?'today-cell':isHol?'holiday-cell':n>=3?'has-many':n>0?'has-session':'';
        h += `<div class="cal-mini-cell ${cls}" title="${n?n+' classes':'no class'}" ${n?`onclick="selectDay('${ds}');calTab('day',document.querySelectorAll('#view-calendar .tab')[1])"`:''}>
          ${d}${n?`<span style="font-size:7px;display:block;line-height:1">${n}</span>`:''}
        </div>`;
      }
      h += '</div></div>';
    });
    h += '</div>';
    return h;
  }

  /* ── RENDER ───────────────────────────────────────────── */
  function render() {
    const c = document.getElementById('cal-view-container');
    if (!c) return;
    const fns = { week:buildWeek, day:buildDay, month:buildMonth, teacher:buildTeacher, list:buildList, year:buildYear };
    c.innerHTML = (fns[currentView]||buildWeek)();
  }

  function updateFilterCount(n) {
    const el=document.getElementById('cal-filter-count');
    if (el) el.textContent=`${n} session${n!==1?'s':''}`;
  }

  render();

  /* ── TAB + NAV ────────────────────────────────────────── */
  window.calTab = function(tab, el) {
    currentView = tab;
    document.querySelectorAll('#view-calendar .tab').forEach(t=>t.classList.remove('active'));
    if (el) el.classList.add('active');
    const labels={week:'Week of 11–17 May 2026',day:`Day View — ${selectedDay}`,month:'May 2026',teacher:'Teacher View — May 11–17',list:'All Sessions — May 2026',year:'Year 2026'};
    const el2=document.getElementById('cal-sub'); if(el2) el2.textContent=labels[tab]||'';
    render();
  };
  window.calNav = () => showToast('Week navigation coming soon','info');
  window.selectDay = function(ds) {
    selectedDay=ds;
    calTab('day',document.querySelectorAll('#view-calendar .tab')[1]);
  };
  // Day prev/next within current week
  window.selectPrevDay = function() {
    const idx = dayHeaders.findIndex(d=>d.date===selectedDay);
    if (idx>0) selectDay(dayHeaders[idx-1].date);
  };
  window.selectNextDay = function() {
    const idx = dayHeaders.findIndex(d=>d.date===selectedDay);
    if (idx<dayHeaders.length-1) selectDay(dayHeaders[idx+1].date);
  };
  window.setCalFilter = function(type,val) {
    ({teacher:v=>fTeacher=v,subject:v=>fSubject=v,grade:v=>fGrade=v,time:v=>fTime=v})[type]?.(val);
    render();
  };
  window.clearCalFilters = function() {
    fTeacher=fSubject=fGrade=fTime='';
    document.querySelectorAll('#view-calendar .tc-select').forEach(s=>s.value='');
    render();
  };

  /* ── SUMMARY MODAL ────────────────────────────────────── */
  window.openCalSummary = function() {
    const f=getFiltered();
    const noHol=f.filter(s=>!dayHeaders.find(d=>d.date===s.date)?.isHoliday);
    const tMap={};
    f.forEach(s=>s.teacher.split(',').forEach(t=>{const k=t.trim();tMap[k]=(tMap[k]||0)+1;}));
    const rows=f.map(s=>{
      const dh=dayHeaders.find(x=>x.date===s.date),ts=CLASS_SLOTS.find(c=>c.id===s.slotId),isH=dh?.isHoliday;
      return `<tr ${isH?'style="background:#fff9f9"':''}>
        <td>${dh?.label||s.date}${isH?' 🏖️':''}</td><td style="font-size:11px">${ts?ts.start+'–'+ts.end:''}</td>
        <td>${s.subject}</td><td>${s.teacher}</td><td style="text-align:center">${s.studentNames.length}</td>
        <td>${isH?'<span class="badge badge-red">Holiday!</span>':'<span class="badge badge-green">OK</span>'}</td></tr>`;
    }).join('');
    Modal.create('modal-cal-summary',`📊 Summary — ${currentView.charAt(0).toUpperCase()+currentView.slice(1)} View`,`
      <div class="modal-section">
        <div class="info-grid" style="margin-bottom:12px">
          <div class="info-item"><div class="label">Total Sessions</div><strong>${noHol.length}</strong></div>
          <div class="info-item"><div class="label">Est. Students</div><strong>${f.reduce((a,s)=>a+s.studentNames.length,0)}</strong></div>
          <div class="info-item"><div class="label">Teachers</div><strong>${Object.keys(tMap).length}</strong></div>
          <div class="info-item"><div class="label">Holiday Conflicts</div><span class="badge badge-red">Fri 15 May</span></div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          ${Object.entries(tMap).map(([t,n])=>`<div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:6px;padding:5px 10px;font-size:12px"><strong>${t}</strong>: ${n}</div>`).join('')}
        </div>
      </div>
      <div class="modal-section"><div class="modal-section-title">All Sessions</div>
        <div class="table-wrap"><table><thead><tr><th>Day</th><th>Time</th><th>Subject</th><th>Teacher</th><th>Students</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-cal-summary')">Close</button>
       <button class="btn btn-primary" onclick="showToast('Exporting…','info')">Export PDF</button>`,
      'modal-xl'
    );
  };

})();
