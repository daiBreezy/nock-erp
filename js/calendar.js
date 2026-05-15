/* ============================================================
   calendar.js — Calendar views, filters, navigation
   Class modal: see calendar-class.js
   ============================================================ */
(function () {

  /* ── DATA & CONFIG ────────────────────────────────────── */
  const TIME_SLOTS    = CONST.TIME_SLOTS;
  const CLASS_SLOTS   = TIME_SLOTS.filter(s => s.type === 'class');
  const TIME_HOURS    = CONST.TIME_HOURS;
  const SLOT_HOURS    = CONST.SLOT_HOURS;
  const SUBJECT_COLOR = CONST.SUBJECT_COLOR;
  const TEACHERS      = CONST.TEACHERS;
  const SUBJECTS      = CONST.SUBJECTS;
  const GRADES        = CONST.GRADES;
  const ROOMS         = CONST.ROOMS;

  const ROW_MAP = {}; TIME_HOURS.forEach((h,i) => ROW_MAP[h] = i+2);

  const sessions   = DB.sessions;
  const dayHeaders = DB.dayHeaders;

  /* ── FILTER STATE ─────────────────────────────────────── */
  let fTeacher='', fSubject='', fGrade='', fTime='', fSearch='';
  let currentView = 'week', selectedDay = '2026-05-13';

  function getFiltered() {
    return sessions.filter(s => {
      if (fTeacher && !s.teacher.includes(fTeacher)) return false;
      if (fSubject && s.subject !== fSubject)         return false;
      if (fGrade   && s.grade   !== fGrade)           return false;
      if (fTime === 'morning'   && parseInt(s.slotId) > 0)  return false;
      if (fTime === 'afternoon' && s.slotId !== 1)           return false;
      if (fTime === 'evening'   && s.slotId < 2)             return false;
      if (fSearch) {
        const q = fSearch.toLowerCase();
        const hit = s.subject.toLowerCase().includes(q) ||
                    s.teacher.toLowerCase().includes(q)  ||
                    s.room.toLowerCase().includes(q)     ||
                    s.studentNames.join(' ').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }

  /* ── SHELL ────────────────────────────────────────────── */
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

  <!-- Search bar -->
  <div style="position:relative;margin-bottom:8px">
    <span style="position:absolute;left:11px;top:50%;transform:translateY(-50%);
                 font-size:14px;pointer-events:none">🔍</span>
    <input type="text" id="cal-search" placeholder="Search sessions by subject, teacher, room, student…"
      style="width:100%;padding:8px 12px 8px 34px;border:1px solid #e5e7eb;border-radius:8px;
             font-size:13px;outline:none;box-sizing:border-box;transition:border-color .15s"
      onfocus="this.style.borderColor='#6366f1'"
      onblur="this.style.borderColor='#e5e7eb'"
      oninput="setCalFilter('search',this.value)">
  </div>

  <!-- Filters row -->
  <div class="table-controls" style="margin-bottom:6px;background:#fff;border:1px solid #e5e7eb;
       border-radius:8px;flex-wrap:wrap">
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

  <!-- Active filter chips -->
  <div id="cal-chips" style="display:none;flex-wrap:wrap;gap:5px;margin-bottom:8px"></div>

  <!-- Holiday banner -->
  <div id="holiday-banner" style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;
       padding:8px 14px;margin-bottom:10px;font-size:13px;color:#991b1b;
       display:flex;align-items:center;gap:8px">
    🏖️ <strong>วันหยุด:</strong> ศุกร์ 15 May — วันวิสาขบูชา (ทุกสาขาหยุด)
    <button class="btn btn-sm" onclick="this.closest('#holiday-banner').style.display='none'"
            style="margin-left:auto;background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;font-size:11px">✕</button>
  </div>

  <!-- View tabs -->
  <div class="tabs" style="margin-bottom:10px">
    <div class="tab active" onclick="calTab('week',this)">Week</div>
    <div class="tab" onclick="calTab('day',this)">Day</div>
    <div class="tab" onclick="calTab('month',this)">Month</div>
    <div class="tab" onclick="calTab('teacher',this)">Teacher</div>
    <div class="tab" onclick="calTab('list',this)">List</div>
    <div class="tab" onclick="calTab('year',this)">Year</div>
  </div>
  <div id="cal-view-container"></div>`;

  /* ── FILTER CHIPS ─────────────────────────────────────── */
  function updateChips() {
    const chips = document.getElementById('cal-chips');
    if (!chips) return;
    const active = [
      fTeacher && { label: `👩‍🏫 ${fTeacher}`, key: 'teacher' },
      fSubject && { label: `📚 ${fSubject}`,   key: 'subject' },
      fGrade   && { label: `🎓 ${fGrade}`,      key: 'grade'   },
      fTime    && { label: `⏰ ${fTime}`,        key: 'time'    },
      fSearch  && { label: `🔍 "${fSearch}"`,   key: 'search'  },
    ].filter(Boolean);

    chips.style.display = active.length ? 'flex' : 'none';
    chips.innerHTML = active.map(c =>
      `<span style="display:inline-flex;align-items:center;gap:4px;
        background:#ede9fe;color:#5b21b6;border-radius:20px;
        padding:3px 10px;font-size:11px;font-weight:500">
        ${c.label}
        <span onclick="clearChip('${c.key}')"
              style="cursor:pointer;opacity:.6;font-size:14px;line-height:1;margin-left:2px">×</span>
      </span>`
    ).join('');
  }

  window.clearChip = function(key) {
    if (key === 'teacher') { fTeacher=''; document.querySelectorAll('#view-calendar .tc-select')[0].value=''; }
    if (key === 'subject') { fSubject=''; document.querySelectorAll('#view-calendar .tc-select')[1].value=''; }
    if (key === 'grade')   { fGrade='';   document.querySelectorAll('#view-calendar .tc-select')[2].value=''; }
    if (key === 'time')    { fTime='';    document.querySelectorAll('#view-calendar .tc-select')[3].value=''; }
    if (key === 'search')  { fSearch='';  const el=document.getElementById('cal-search'); if(el) el.value=''; }
    updateChips(); render();
  };

  /* ── WEEK VIEW → CalendarWidget ──────────────────────── */
  function buildWeek(container) {
    const filtered = getFiltered();
    CalendarWidget.renderWeek(container, {
      sessions:       filtered,
      onClickSession: (id) => openClassModal(id),
    });
    updateFilterCount(filtered.length);
  }

  /* ── DAY VIEW → CalendarWidget ────────────────────────── */
  function buildDay(container) {
    const dh      = dayHeaders.find(x => x.date === selectedDay) || dayHeaders[2];
    const filtered = getFiltered().filter(s => s.date === selectedDay);

    const nav = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
      <button class="btn btn-secondary btn-sm" onclick="selectPrevDay()">←</button>
      <span style="font-weight:600;color:#6366f1;font-size:14px">${dh.label}${dh.isHoliday?' 🏖️':''}</span>
      <span style="font-size:12px;color:#9ca3af">${filtered.length} class${filtered.length!==1?'es':''}</span>
      <button class="btn btn-secondary btn-sm" onclick="selectNextDay()">→</button>
    </div>`;

    const inner = document.createElement('div');
    container.innerHTML = nav;
    container.appendChild(inner);
    CalendarWidget.renderDay(inner, selectedDay, {
      sessions:       getFiltered(),
      onClickSession: (id) => openClassModal(id),
    });
    updateFilterCount(filtered.length);
  }

  /* ── MONTH VIEW ───────────────────────────────────────── */
  function buildMonth() {
    const filtered = getFiltered();
    const byDate = {};
    filtered.forEach(s => {
      if (!byDate[s.date]) byDate[s.date] = {};
      byDate[s.date][s.subject] = (byDate[s.date][s.subject] || 0) + 1;
    });
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    let h = '<div class="cal-fill" style="overflow:auto"><div class="cal-month-grid">';
    days.forEach(d => h += `<div class="cal-month-head">${d}</div>`);
    const offset=4, dim=31;
    const total = Math.ceil((dim+offset)/7)*7;
    for (let i=0; i<total; i++) {
      const dn = i - offset + 1;
      if (dn<1||dn>dim) { h+=`<div class="cal-month-cell other-month"><span class="cal-month-num"></span></div>`; continue; }
      const ds = `2026-05-${String(dn).padStart(2,'0')}`;
      const isToday=ds==='2026-05-13', isHol=ds==='2026-05-15';
      const subjects = byDate[ds] || {};
      h += `<div class="cal-month-cell${isToday?' today':''}${isHol?' holiday':''}" onclick="selectDay('${ds}')">
        <span class="cal-month-num">${dn}${isHol?' 🏖️':''}</span>`;
      if (isHol) h += `<div class="cal-event holiday-event" style="font-size:9px">วันวิสาขบูชา</div>`;
      else Object.entries(subjects).forEach(([subj,cnt]) => {
        const c = SUBJECT_COLOR[subj] || '';
        h += `<div class="cal-event ${c}" style="font-size:9px;padding:1px 4px">${subj}${cnt>1?` ×${cnt}`:''}</div>`;
      });
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
    CONST.TIME_SLOTS.forEach(slot => {
      if (slot.type==='break') {
        h += `<div class="cal-time break-row">${slot.start}</div>`;
        TEACHERS.forEach(() => h += `<div class="cal-cell break-cell"></div>`);
        return;
      }
      h += `<div class="cal-time">${slot.start}<span class="end-time">${slot.end}</span></div>`;
      TEACHERS.forEach(teacher => {
        const list = filtered.filter(s => s.slotId===slot.id && s.teacher.includes(teacher));
        h += '<div class="cal-cell">';
        list.forEach(s => {
          const dh = dayHeaders.find(d => d.date===s.date);
          h += `<div class="cal-event ${s.color}" onclick="openClassModal('${s.id}')">${Utils.subjectLabel(s)}<br>
            <span style="font-size:9px">${dh?.label||s.date} · ${s.room}</span></div>`;
        });
        h += '</div>';
      });
    });
    h += '</div></div>';
    updateFilterCount(filtered.length);
    return h;
  }

  /* ── LIST VIEW — card style (EventManager-inspired) ───── */
  function buildList() {
    const filtered = getFiltered().sort((a,b) => a.date.localeCompare(b.date) || a.slotId - b.slotId);

    if (filtered.length === 0) {
      updateFilterCount(0);
      return `<div style="padding:40px;text-align:center;color:#9ca3af">
        <div style="font-size:40px;margin-bottom:10px">📅</div>
        <div style="font-size:14px">No sessions found</div>
        ${fSearch||fTeacher||fSubject||fGrade||fTime
          ? `<button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="clearCalFilters()">Clear filters</button>` : ''}
      </div>`;
    }

    /* Group by date */
    const byDate = {};
    filtered.forEach(s => { (byDate[s.date] = byDate[s.date] || []).push(s); });

    const sCls   = { upcoming:'badge-blue', active:'badge-green', ended:'badge-gray' };
    const colMap  = { green:'#10b981', yellow:'#f59e0b', orange:'#f97316', purple:'#6366f1' };

    let h = '<div style="display:flex;flex-direction:column;gap:18px">';

    Object.entries(byDate).forEach(([date, sess]) => {
      const dh      = dayHeaders.find(x => x.date === date);
      const label   = dh?.label || date;
      const isHol   = dh?.isHoliday;
      const isToday = date === '2026-05-13';

      h += `<div>
        <!-- Date heading -->
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.8px">
            ${label}${isHol?' 🏖️':''}
          </div>
          ${isToday ? `<span style="font-size:10px;background:#6366f1;color:#fff;border-radius:10px;padding:1px 8px;font-weight:600">Today</span>`:''}
          ${isHol   ? `<span style="font-size:10px;background:#fee2e2;color:#991b1b;border-radius:10px;padding:1px 8px">Holiday</span>`:''}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">`;

      sess.forEach(s => {
        const ts    = CLASS_SLOTS.find(c => c.id === s.slotId);
        const color = colMap[s.color] || '#6366f1';
        const t     = s.teacher.split(',').map(x => x.trim().replace('Kru ','')).join(' + ');
        const dot   = s.state==='active'?'🟢 ':s.state==='ended'?'✅ ':'';

        h += `<div onclick="openClassModal('${s.id}')"
          style="display:flex;align-items:stretch;border:1px solid #e5e7eb;border-radius:10px;
                 cursor:pointer;overflow:hidden;transition:all .15s;background:#fff"
          onmouseover="this.style.boxShadow='0 4px 14px rgba(0,0,0,.09)';this.style.transform='translateY(-1px)'"
          onmouseout="this.style.boxShadow='';this.style.transform=''">
          <!-- Color accent bar -->
          <div style="width:4px;background:${color};flex-shrink:0"></div>
          <!-- Card body -->
          <div style="flex:1;padding:10px 14px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;min-width:0">
            <div style="min-width:130px">
              <div style="font-size:13px;font-weight:600;color:#1a1d23">${dot}${Utils.subjectLabel(s)}</div>
            </div>
            <div style="display:flex;gap:14px;flex-wrap:wrap;flex:1;font-size:12px;color:#6b7280">
              ${ts ? `<span>⏰ ${ts.start}–${ts.end}</span>` : ''}
              <span>👩‍🏫 ${t}</span>
              <span>🚪 ${s.room}</span>
              <span>👥 ${s.studentNames.length} student${s.studentNames.length!==1?'s':''}</span>
            </div>
            <div style="margin-left:auto;flex-shrink:0">
              <span class="badge ${sCls[s.state]||'badge-gray'}">${s.state}</span>
            </div>
          </div>
        </div>`;
      });

      h += '</div></div>';
    });

    h += '</div>';
    updateFilterCount(filtered.length);
    return h;
  }

  /* ── YEAR VIEW ────────────────────────────────────────── */
  function buildYear() {
    const filtered = getFiltered();
    const cnt = {};
    filtered.forEach(s => cnt[s.date] = (cnt[s.date]||0)+1);
    const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const offsets=[3,0,0,3,4,0,2,5,1,3,6,1];
    const dims=[31,28,31,30,31,30,31,31,30,31,30,31];
    let h = '<div class="cal-year-grid">';
    months.forEach((mon, mi) => {
      h += `<div class="cal-mini-month"><div class="cal-mini-title">${mon} 2026</div><div class="cal-mini-grid">`;
      for (let i=0; i<offsets[mi]; i++) h += '<div class="cal-mini-cell"></div>';
      for (let d=1; d<=dims[mi]; d++) {
        const ds=`2026-${String(mi+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const n=cnt[ds]||0, isTod=ds==='2026-05-13', isHol=ds==='2026-05-15';
        const cls=isTod?'today-cell':isHol?'holiday-cell':n>=3?'has-many':n>0?'has-session':'';
        h += `<div class="cal-mini-cell ${cls}" title="${n?n+' classes':'no class'}"
          ${n?`onclick="selectDay('${ds}');calTab('day',document.querySelectorAll('#view-calendar .tab')[1])"`:''}>
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
    if (currentView === 'week') { c.innerHTML = ''; buildWeek(c); return; }
    if (currentView === 'day')  { c.innerHTML = ''; buildDay(c);  return; }
    const fns = { month: buildMonth, teacher: buildTeacher, list: buildList, year: buildYear };
    c.innerHTML = (fns[currentView] || buildMonth)();
  }

  function updateFilterCount(n) {
    const el = document.getElementById('cal-filter-count');
    if (el) el.textContent = `${n} session${n!==1?'s':''}`;
  }

  render();

  /* ── TAB + NAV + FILTER ───────────────────────────────── */
  window.calTab = function(tab, el) {
    currentView = tab;
    document.querySelectorAll('#view-calendar .tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    const labels = { week:'Week of 11–17 May 2026', day:`Day View — ${selectedDay}`,
      month:'May 2026', teacher:'Teacher View', list:'All Sessions', year:'Year 2026' };
    const sub = document.getElementById('cal-sub'); if(sub) sub.textContent = labels[tab]||'';
    render();
  };

  window.calNav = () => showToast('Week navigation coming soon','info');

  window.selectDay = function(ds) {
    selectedDay = ds;
    calTab('day', document.querySelectorAll('#view-calendar .tab')[1]);
  };
  window.selectPrevDay = function() {
    const idx = dayHeaders.findIndex(d => d.date===selectedDay);
    if (idx > 0) selectDay(dayHeaders[idx-1].date);
  };
  window.selectNextDay = function() {
    const idx = dayHeaders.findIndex(d => d.date===selectedDay);
    if (idx < dayHeaders.length-1) selectDay(dayHeaders[idx+1].date);
  };

  window.setCalFilter = function(type, val) {
    if (type==='teacher') fTeacher=val;
    else if (type==='subject') fSubject=val;
    else if (type==='grade')   fGrade=val;
    else if (type==='time')    fTime=val;
    else if (type==='search')  fSearch=val;
    updateChips(); render();
  };

  window.clearCalFilters = function() {
    fTeacher=fSubject=fGrade=fTime=fSearch='';
    document.querySelectorAll('#view-calendar .tc-select').forEach(s => s.value='');
    const se = document.getElementById('cal-search'); if(se) se.value='';
    updateChips(); render();
  };

  /* ── SUMMARY MODAL ────────────────────────────────────── */
  window.openCalSummary = function() {
    const f     = getFiltered();
    const noHol = f.filter(s => !dayHeaders.find(d=>d.date===s.date)?.isHoliday);
    const tMap  = {};
    f.forEach(s => s.teacher.split(',').forEach(t => { const k=t.trim(); tMap[k]=(tMap[k]||0)+1; }));
    const rows  = f.map(s => {
      const dh=dayHeaders.find(x=>x.date===s.date), ts=CLASS_SLOTS.find(c=>c.id===s.slotId), isH=dh?.isHoliday;
      return `<tr ${isH?'style="background:#fff9f9"':''}>
        <td>${dh?.label||s.date}${isH?' 🏖️':''}</td>
        <td style="font-size:11px">${ts?ts.start+'–'+ts.end:''}</td>
        <td>${Utils.subjectLabel(s)}</td><td>${s.teacher}</td>
        <td style="text-align:center">${s.studentNames.length}</td>
        <td>${isH?'<span class="badge badge-red">Holiday!</span>':'<span class="badge badge-green">OK</span>'}</td></tr>`;
    }).join('');
    Modal.create('modal-cal-summary',`📊 Summary — ${currentView} view`,`
      <div class="modal-section">
        <div class="info-grid" style="margin-bottom:12px">
          <div class="info-item"><div class="label">Total Sessions</div><strong>${noHol.length}</strong></div>
          <div class="info-item"><div class="label">Est. Students</div><strong>${f.reduce((a,s)=>a+s.studentNames.length,0)}</strong></div>
          <div class="info-item"><div class="label">Teachers</div><strong>${Object.keys(tMap).length}</strong></div>
          <div class="info-item"><div class="label">Holiday Conflicts</div><span class="badge badge-red">Fri 15 May</span></div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          ${Object.entries(tMap).map(([t,n])=>`<div style="background:#f5f3ff;border:1px solid #ddd6fe;
            border-radius:6px;padding:5px 10px;font-size:12px"><strong>${t}</strong>: ${n}</div>`).join('')}
        </div>
      </div>
      <div class="modal-section"><div class="modal-section-title">All Sessions</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Day</th><th>Time</th><th>Subject</th><th>Teacher</th><th>Students</th><th>Status</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-cal-summary')">Close</button>
       <button class="btn btn-primary" onclick="showToast('Exporting…','info')">Export PDF</button>`,
      'modal-xl');
  };

})();
