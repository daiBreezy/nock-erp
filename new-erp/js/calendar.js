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
  const SUBJECTS      = () => Utils.subjectsFor();   // Settings-driven (live)
  const GRADES        = CONST.GRADES;

  const sessions   = DB.sessions;
  const dayHeaders = DB.dayHeaders;

  /* ── FILTER STATE ─────────────────────────────────────── */
  let fTeacher='', fSubject='', fGrade='', fTime='', fSearch='';
  const todayDate = DB.dayHeaders.find(d => d.isToday)?.date || dayHeaders[0]?.date || '';
  let currentView = 'day', selectedDay = todayDate;

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
  ${UI.pageHeader('Calendar', `<span id="cal-sub">Day View — ${DB.dayHeaders.find(d=>d.isToday)?.label||''}</span>`,
    `<div style="display:flex;gap:var(--sp-2);align-items:center">
      <button class="btn btn-secondary btn-sm" onclick="openCalSummary()">${UI.icon('bar_chart','sm')} Summary</button>
      <button class="btn btn-primary btn-sm" id="cal-create-btn" onclick="calOpenCreateClass()" style="display:none">${UI.icon('add','sm')} Create Class</button>
    </div>`
  )}

  <!-- Search + Filters — ONE ROW -->
  <div class="cal-toolbar">
    <div class="cal-toolbar-search">
      <span class="cal-toolbar-search-icon mdi mdi-sm" style="opacity:.4">search</span>
      <input type="text" id="cal-search"
        placeholder="Search by subject, teacher, room, student…"
        oninput="setCalFilter('search',this.value)"
        onfocus="this.closest('.cal-toolbar-search').style.borderColor='var(--md-primary)'"
        onblur="this.closest('.cal-toolbar-search').style.borderColor='var(--md-outline-variant)'">
    </div>
    <span class="ts-label text-muted" style="flex-shrink:0;font-size:var(--fs-label-sm)">Filter:</span>
    <select class="tc-select" onchange="setCalFilter('teacher',this.value)">
      <option value="">All Teachers</option>${TEACHERS.map(t=>`<option>${t}</option>`).join('')}
    </select>
    <select class="tc-select" onchange="setCalFilter('subject',this.value)">
      <option value="">All Subjects</option>${SUBJECTS().map(s=>`<option>${s}</option>`).join('')}
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
    <button class="btn btn-secondary btn-sm" onclick="clearCalFilters()" style="flex-shrink:0">${UI.icon('close','sm')} Clear</button>
    <span id="cal-filter-count" class="text-muted" style="flex-shrink:0;font-size:var(--fs-label-sm);white-space:nowrap"></span>
  </div>

  <!-- Active filter chips -->
  <div id="cal-chips" style="display:none;flex-wrap:wrap;gap:5px;margin-bottom:8px"></div>

  <!-- View tabs -->
  <div style="display:flex;align-items:center;border-bottom:1px solid var(--md-outline-variant);margin-bottom:0">
    <div class="tabs" style="border-bottom:none;margin-bottom:0;flex:1">
      <div class="tab active" onclick="calTab('day',this)">Day</div>
      <div class="tab" onclick="calTab('week',this)">Week</div>
      <div class="tab" onclick="calTab('month',this)">Month</div>
      <div class="tab" onclick="calTab('teacher',this)">Teacher</div>
      <div class="tab" onclick="calTab('list',this)">List</div>
      <div class="tab" onclick="calTab('year',this)">Year</div>
    </div>
  </div>

  <!-- Pagination bar (under tabs, above content) -->
  <div id="cal-pagination" class="cal-pagination-bar"></div>

  <!-- Calendar view -->
  <div id="cal-view-container" class="cal-view-container"></div>`;

  /* ── PAGINATION RENDERER ──────────────────────────────── */
  function renderPagination() {
    const bar = document.getElementById('cal-pagination');
    if (!bar) return;

    const filtered = getFiltered();
    let label = '', count = '';

    if (currentView === 'week') {
      label = 'Week of 25–31 May 2026';
      count = `${filtered.length} session${filtered.length!==1?'s':''}`;
    } else if (currentView === 'day') {
      const dh = dayHeaders.find(x => x.date === selectedDay) || dayHeaders[2];
      const n  = filtered.filter(s => s.date === selectedDay).length;
      label = `${dh.label}${dh.isHoliday?' '+UI.icon('beach_access','sm'):''}`;
      count = `${n} class${n!==1?'es':''}`;
    } else if (currentView === 'month') {
      label = 'May 2026';
      count = `${filtered.length} sessions`;
    } else if (currentView === 'teacher') {
      label = 'All Teachers';
      count = `${filtered.length} sessions`;
    } else if (currentView === 'list') {
      label = 'All Sessions';
      count = `${filtered.length} sessions`;
    } else if (currentView === 'year') {
      label = 'Year 2026';
      count = '';
    }

    bar.innerHTML = `
      <button class="cal-pag-btn" onclick="calNav(-1)">←</button>
      <div class="cal-pag-center">
        <span class="cal-pag-label">${label}</span>
        ${count ? `<span class="cal-pag-count">${count}</span>` : ''}
      </div>
      <button class="cal-pag-btn cal-pag-today" onclick="calNav(0)">Today</button>
      <button class="cal-pag-btn" onclick="calNav(1)">→</button>`;
  }

  /* ── FILTER CHIPS ─────────────────────────────────────── */
  function updateChips() {
    const chips = document.getElementById('cal-chips');
    if (!chips) return;
    const active = [
      fTeacher && { label: `${UI.icon('person','sm')} ${fTeacher}`,     key: 'teacher' },
      fSubject && { label: `${UI.icon('menu_book','sm')} ${fSubject}`, key: 'subject' },
      fGrade   && { label: `${UI.icon('school','sm')} ${fGrade}`,      key: 'grade'   },
      fTime    && { label: `${UI.icon('schedule','sm')} ${fTime}`,     key: 'time'    },
      fSearch  && { label: `${UI.icon('search','sm')} "${fSearch}"`,   key: 'search'  },
    ].filter(Boolean);
    chips.style.display = active.length ? 'flex' : 'none';
    chips.innerHTML = active.map(c =>
      `<span style="display:inline-flex;align-items:center;gap:4px;
        background:var(--md-secondary-container);color:var(--md-on-secondary-container);border-radius:var(--shape-full);
        padding:3px 10px;font-size:11px;font-weight:500">
        ${c.label}
        <span onclick="clearChip('${c.key}')"
              style="cursor:pointer;opacity:.7;font-size:14px;line-height:1;margin-left:2px">×</span>
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

  /* ── WEEK VIEW ────────────────────────────────────────── */
  function buildWeek(container) {
    const filtered = getFiltered();
    const heads = weekHeaders();
    CalendarWidget.renderWeek(container, {
      sessions:       filtered,
      dayHeaders:     heads,          // ← ทำให้ปุ่ม ◀ ▶ เลื่อนสัปดาห์ได้จริง
      onClickSession: (id) => openClassModal(id),
    });
    const inWeek = filtered.filter(s => heads.some(h => h.date === s.date));
    updateFilterCount(inWeek.length);
  }

  /* ── DAY VIEW ─────────────────────────────────────────── */
  function buildDay(container) {
    const filtered = getFiltered().filter(s => s.date === selectedDay);
    const inner = document.createElement('div');
    container.appendChild(inner);
    CalendarWidget.renderDay(inner, selectedDay, {
      sessions:       getFiltered(),
      selectable:     true,
      onClickSession: (id) => openClassModal(id),
      onClickEmptyDay:(slotId, date, teacher) => {
        if (typeof calOpenCreateClass === 'function') calOpenCreateClass({ slotId, date, teacher });
      },
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
      const isToday=ds===todayDate, isHol=ds==='2026-05-15';
      const subjects = byDate[ds] || {};
      h += `<div class="cal-month-cell${isToday?' today':''}${isHol?' holiday':''}" onclick="selectDay('${ds}')">
        <span class="cal-month-num">${dn}${isHol?' <span class="mdi" style="font-size:11px">beach_access</span>':''}</span>`;
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
            <span style="font-size:9px">${dh?.label||s.date} · ${s.room}</span>
            ${CalendarWidget.incomingDots(s)}</div>`;
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
    const filtered = getFiltered().sort((a,b) => a.date.localeCompare(b.date) || a.slotId - b.slotId);
    if (filtered.length === 0) {
      updateFilterCount(0);
      return `<div style="padding:40px;text-align:center;color:var(--md-on-surface-variant)">
        <div style="margin-bottom:10px"><span class="mdi mdi-xl" style="font-size:40px;color:var(--md-outline)">calendar_month</span></div>
        <div style="font-size:14px">No sessions found</div>
        ${fSearch||fTeacher||fSubject||fGrade||fTime
          ? `<button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="clearCalFilters()">Clear filters</button>` : ''}
      </div>`;
    }
    const byDate = {};
    filtered.forEach(s => { (byDate[s.date] = byDate[s.date] || []).push(s); });
    const sCls   = { upcoming:'badge-blue', active:'badge-green', ended:'badge-gray' };
    const colMap = { green:'var(--md-success)', yellow:'var(--md-warning)', orange:'var(--clr-on-science)', blue:'var(--md-primary)', purple:'var(--clr-on-grammar)' };
    let h = '<div style="display:flex;flex-direction:column;gap:18px">';
    Object.entries(byDate).forEach(([date, sess]) => {
      const dh=dayHeaders.find(x=>x.date===date), label=dh?.label||date;
      const isHol=dh?.isHoliday, isToday=date===todayDate;
      h += `<div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div class="text-muted" style="font-size:var(--fs-label-sm);font-weight:700;text-transform:uppercase;letter-spacing:.8px">
            ${label}${isHol?' '+UI.icon('beach_access','sm'):''}
          </div>
          ${isToday?`<span style="font-size:10px;background:var(--md-primary);color:var(--md-on-primary);border-radius:var(--shape-full);padding:1px 8px;font-weight:600">Today</span>`:''}
          ${isHol?`<span style="font-size:10px;background:var(--md-error-container);color:var(--md-on-error-container);border-radius:var(--shape-full);padding:1px 8px">Holiday</span>`:''}
        </div>
        <div style="display:flex;flex-direction:column;gap:6px">`;
      sess.forEach(s => {
        const ts=CLASS_SLOTS.find(c=>c.id===s.slotId);
        const color=colMap[s.color]||'var(--md-primary)';
        const t=s.teacher.split(',').map(x=>x.trim().replace('Kru ','')).join(' + ');
        h += `<div onclick="openClassModal('${s.id}')"
          style="display:flex;align-items:stretch;border:1px solid var(--md-outline-variant);border-radius:var(--shape-md);
                 cursor:pointer;overflow:hidden;transition:box-shadow .15s;background:var(--md-surface-lowest)"
          onmouseover="this.style.boxShadow='var(--elev-2)'"
          onmouseout="this.style.boxShadow=''">
          <div style="width:4px;background:${color};flex-shrink:0"></div>
          <div style="flex:1;padding:10px 14px;display:flex;align-items:center;gap:16px;flex-wrap:wrap;min-width:0">
            <div style="min-width:130px">
              <div style="font-size:13px;font-weight:600;color:var(--md-on-surface)">${Utils.subjectLabel(s)}</div>
            </div>
            <div style="display:flex;gap:12px;flex-wrap:wrap;flex:1;font-size:12px;color:var(--md-on-surface-variant);align-items:center">
              ${ts?`<span style="display:flex;align-items:center;gap:3px">${UI.icon('schedule','sm')}${ts.start}–${ts.end}</span>`:''}
              <span style="display:flex;align-items:center;gap:3px">${UI.icon('person','sm')}${t}</span>
              <span style="display:flex;align-items:center;gap:3px">${UI.icon('meeting_room','sm')}${s.room}</span>
              <span style="display:flex;align-items:center;gap:3px">${UI.icon('group','sm')}${s.studentNames.length} student${s.studentNames.length!==1?'s':''}</span>
              ${CalendarWidget.incomingDots(s)}
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
        const n=cnt[ds]||0, isTod=ds===todayDate, isHol=ds==='2026-05-15';
        const cls=isTod?'today-cell':isHol?'holiday-cell':n>=3?'has-many':n>0?'has-session':'';
        h += `<div class="cal-mini-cell ${cls}" title="${n?n+' classes':'no class'}"
          ${n?`onclick="selectDay('${ds}');calTab('day',document.querySelectorAll('#view-calendar .tab')[0])"`:''}>
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
    renderPagination();
    // Show "＋ Create Class" button only on Day view
    const createBtn = document.getElementById('cal-create-btn');
    if (createBtn) createBtn.style.display = currentView === 'day' ? '' : 'none';
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
    window.calCurrentView = tab;   // ← exported for calendar-class.js
    document.querySelectorAll('#view-calendar .tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    const dh = dayHeaders.find(d => d.date === selectedDay);
    const labels = {
      week:'Week of 25–31 May 2026', day:`Day View — ${dh?.label || selectedDay}`,
      month:'May 2026', teacher:'Teacher View', list:'All Sessions', year:'Year 2026'
    };
    const sub = document.getElementById('cal-sub');
    if (sub) sub.textContent = labels[tab] || '';
    render();
  };

  /* ── NAVIGATION ────────────────────────────────────────────
     day = เลื่อนทีละวัน · week = ±7 วัน · month/teacher/list/year = ±1 เดือน
     week ใช้ weekOffset สร้าง dayHeaders เอง (widget รับ override ได้) */
  window.calNav = function(dir) {
    if (currentView === 'day') {
      if (dir === -1) selectPrevDay();
      else if (dir === 1) selectNextDay();
      else { selectedDay = todayDate; render(); }
      return;
    }
    const shift = (iso, days) => {
      const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate() + days);
      return d.toISOString().slice(0, 10);
    };
    if (currentView === 'week') {
      selectedDay = dir === 0 ? todayDate : shift(selectedDay, dir * 7);
    } else {
      if (dir === 0) selectedDay = todayDate;
      else { const d = new Date(selectedDay + 'T12:00:00'); d.setMonth(d.getMonth() + dir); selectedDay = d.toISOString().slice(0,10); }
    }
    render();
  };

  /* dayHeaders ของสัปดาห์ที่มี selectedDay (จันทร์–อาทิตย์) */
  function weekHeaders() {
    const d = new Date(selectedDay + 'T12:00:00');
    const mon = new Date(d); mon.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    const SH = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    return SH.map((s, i) => {
      const x = new Date(mon); x.setDate(mon.getDate() + i);
      const iso = x.toISOString().slice(0, 10);
      const seed = (DB.dayHeaders || []).find(h => h.date === iso);
      return { label: `${s} ${x.getDate()}`, date: iso,
               isToday: iso === todayDate, isHoliday: !!seed?.isHoliday };
    });
  }

  window.selectDay = function(ds) {
    selectedDay = ds;
    calTab('day', document.querySelectorAll('#view-calendar .tab')[0]);
  };
  window.selectPrevDay = function() {
    const idx = dayHeaders.findIndex(d => d.date===selectedDay);
    if (idx > 0) { selectedDay = dayHeaders[idx-1].date; render(); }
  };
  window.selectNextDay = function() {
    const idx = dayHeaders.findIndex(d => d.date===selectedDay);
    if (idx < dayHeaders.length-1) { selectedDay = dayHeaders[idx+1].date; render(); }
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
      return `<tr ${isH?'style="background:var(--md-error-container)"':''}>
        <td>${dh?.label||s.date}${isH?' '+UI.icon('beach_access','sm'):''}</td>
        <td style="font-size:var(--fs-label-sm)">${ts?ts.start+'–'+ts.end:''}</td>
        <td>${Utils.subjectLabel(s)}</td><td>${s.teacher}</td>
        <td style="text-align:center">${s.studentNames.length}</td>
        <td>${isH?UI.badge('Holiday!','red'):UI.badge('OK','green')}</td></tr>`;
    }).join('');
    Modal.create('modal-cal-summary',`${UI.icon('bar_chart')} Summary — ${currentView} view`,`
      <div class="modal-section">
        <div class="info-grid" style="margin-bottom:var(--sp-3)">
          <div class="info-item"><div class="label">Total Sessions</div><strong>${noHol.length}</strong></div>
          <div class="info-item"><div class="label">Est. Students</div><strong>${f.reduce((a,s)=>a+s.studentNames.length,0)}</strong></div>
          <div class="info-item"><div class="label">Teachers</div><strong>${Object.keys(tMap).length}</strong></div>
          <div class="info-item"><div class="label">Holiday Conflicts</div>${UI.badge('Fri 15 May','red')}</div>
        </div>
        <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-bottom:var(--sp-3)">
          ${Object.entries(tMap).map(([t,n])=>`<div style="background:var(--md-primary-container);border:1px solid var(--md-outline-variant);
            border-radius:var(--shape-sm);padding:var(--sp-1) var(--sp-2);font-size:var(--fs-label-md)"><strong>${t}</strong>: ${n}</div>`).join('')}
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
