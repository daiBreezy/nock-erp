/* ============================================================
   sessions.js — NockERP Sessions Module
   Full list of all sessions with filter, status, class modal
   ============================================================ */
(function () {

  /* ── STATE ────────────────────────────────────────────── */
  let fStatus  = 'all';   // all | active | upcoming | ended
  let fTeacher = '';
  let fBranch  = '';
  let fSearch  = '';
  let fRange   = 'week';  // today | week | all
  let fGroupBy = 'date';  // date | teacher | branch | status

  /* ── DATE HELPERS ─────────────────────────────────────── */
  const todayDH   = DB.dayHeaders.find(d => d.isToday);
  const todayDate = todayDH?.date || '';
  const MONTHS    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  function dateLabel(dateStr) {
    if (!dateStr) return '—';
    if (dateStr === todayDate) return 'Today';
    const dh = DB.dayHeaders.find(d => d.date === dateStr);
    if (dh) return dh.label;
    const [,m,d] = dateStr.split('-');
    return `${d} ${MONTHS[parseInt(m)-1]}`;
  }

  /* ── STATE BADGE ──────────────────────────────────────── */
  const STATE_META = {
    active:   { badge:'badge-green',  icon: UI.icon('radio_button_checked','sm'), label:'Live'     },
    upcoming: { badge:'badge-blue',   icon: UI.icon('schedule','sm'),             label:'Upcoming' },
    ended:    { badge:'badge-gray',   icon: UI.icon('task_alt','sm'),             label:'Ended'    },
  };

  /* ── COLOR STRIP ──────────────────────────────────────── */
  const COLOR_HEX = {
    green:'var(--md-success)', yellow:'var(--md-warning)', orange:'var(--clr-on-science)',
    blue:'var(--md-primary)', purple:'var(--clr-on-grammar)', '':'var(--md-primary)',
  };

  /* ── SHELL ────────────────────────────────────────────── */
  document.getElementById('view-sessions').innerHTML = `
  ${UI.pageHeader('Sessions', '<span id="sess-sub">Loading…</span>',
    `<button class="btn btn-secondary btn-sm" onclick="sessGenWeek()">${UI.icon('auto_mode','sm')} Generate next week</button>
     <button class="btn btn-primary btn-sm" onclick="showView('calendar')">${UI.icon('calendar_month','sm')} Calendar View</button>`
  )}

  <div id="sess-kpi" class="mb-16"></div>

  ${UI.filterBar([
    { type:'search', placeholder:'Search subject, teacher, student…', id:'sess-search', oninput:"sessFilter('search',this.value)" },
    { label:'Today',     active:true,  onclick:"sessFilter('range','today',this)" },
    { label:'This Week', active:false, onclick:"sessFilter('range','week',this)"  },
    { label:'All',       active:false, onclick:"sessFilter('range','all',this)"   },
    { type:'select', onchange:"sessFilter('status',this.value)", options:[
      { value:'all',      label:'All Status',  selected:true },
      { value:'active',   label:'Live'   },
      { value:'upcoming', label:'Upcoming' },
      { value:'ended',    label:'Ended'   },
    ]},
    { type:'select', onchange:"sessFilter('teacher',this.value)", options:[
      { value:'', label:'All Teachers', selected:true },
      ...CONST.TEACHERS.map(t => ({ value:t, label:t })),
    ]},
    { type:'select', onchange:"sessFilter('branch',this.value)", options:[
      { value:'', label:'All Branches', selected:true },
      ...CONST.BRANCHES.map(b => ({ value:b, label:b })),
    ]},
    { type:'select', onchange:"sessFilter('groupBy',this.value)", options:[
      { value:'date',    label:'Group: Day', selected:true },
      { value:'teacher', label:'Group: Teacher' },
      { value:'branch',  label:'Group: Branch'  },
      { value:'status',  label:'Group: Status'  },
    ]},
  ])}

  <div id="sess-list"></div>`;

  /* ── RENDER KPI ───────────────────────────────────────── */
  function renderKPI() {
    const all      = DB.sessions;
    const today    = all.filter(s => s.date === todayDate);
    const live     = all.filter(s => s.state === 'active');
    const upcoming = all.filter(s => s.state === 'upcoming');
    const ended    = all.filter(s => s.state === 'ended');

    document.getElementById('sess-kpi').innerHTML = UI.kpiGrid([
      { icon:'radio_button_checked', label:'Live Now',          color:'success',
        value: live.length, sub:'Currently active',      subColor: live.length > 0 ? 'up' : '' },
      { icon:'calendar_today',       label:"Today's Sessions",  value: today.length,
        sub: todayDate || '—', subColor:'up' },
      { icon:'schedule_send',        label:'Upcoming',          color:'tertiary',
        value: upcoming.length, sub:'Scheduled ahead',   subColor:'up' },
      { icon:'task_alt',             label:'Completed',         color:'warning',
        value: ended.length,   sub:'This week' },
    ]);
  }

  /* ── RENDER LIST ──────────────────────────────────────── */
  function renderList() {
    let sessions = [...DB.sessions];

    if (fRange === 'today') {
      sessions = sessions.filter(s => s.date === todayDate);
    } else if (fRange === 'week') {
      const weekDates = DB.dayHeaders.map(d => d.date);
      sessions = sessions.filter(s => weekDates.includes(s.date));
    }

    if (fStatus !== 'all') sessions = sessions.filter(s => s.state === fStatus);
    if (fTeacher) sessions = sessions.filter(s => s.teacher.includes(fTeacher));
    if (fBranch)  sessions = sessions.filter(s => s.branch === fBranch);
    if (fSearch) {
      const q = fSearch.toLowerCase();
      sessions = sessions.filter(s =>
        (s.subject + s.teacher + s.room + (s.studentNames||[]).join(' ')).toLowerCase().includes(q));
    }

    sessions.sort((a,b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const stateOrd = {active:0,upcoming:1,ended:2};
      if (a.state !== b.state) return (stateOrd[a.state]||1)-(stateOrd[b.state]||1);
      return (a.slotId||0)-(b.slotId||0);
    });

    const sub = document.getElementById('sess-sub');
    if (sub) sub.textContent = `${sessions.length} session${sessions.length!==1?'s':''} found`;

    const container = document.getElementById('sess-list');
    if (!container) return;

    if (sessions.length === 0) {
      container.innerHTML = UI.card(
        UI.emptyState('event', 'No sessions match your filters',
          `<button class="btn btn-secondary btn-sm" style="margin-top:12px" onclick="sessReset()">Clear Filters</button>`)
      );
      return;
    }

    /* Group by selected axis (date | teacher | branch | status) */
    const groupers = {
      date:    s => ({ key:s.date,    label:dateLabel(s.date),                                  icon:'calendar_today' }),
      teacher: s => ({ key:s.teacher, label:s.teacher,                                          icon:'person'         }),
      branch:  s => ({ key:s.branch,  label:s.branch,                                           icon:'store'          }),
      status:  s => ({ key:s.state,   label:(STATE_META[s.state]||STATE_META.upcoming).label,   icon:'flag'           }),
    };
    const grp = groupers[fGroupBy] || groupers.date;
    const groups = {}, labels = {}, icons = {};
    sessions.forEach(s => {
      const g = grp(s);
      (groups[g.key] = groups[g.key] || []).push(s);
      labels[g.key] = g.label; icons[g.key] = g.icon;
    });
    let keys = Object.keys(groups);
    if (fGroupBy === 'status') {
      const o = { active:0, upcoming:1, ended:2 };
      keys.sort((a,b) => (o[a]??1)-(o[b]??1));
    } else {
      keys.sort((a,b) => a.localeCompare(b));
    }

    container.innerHTML = keys.map(key => {
      const list = groups[key];
      const isToday = fGroupBy === 'date' && key === todayDate;
      const dh = fGroupBy === 'date' ? DB.dayHeaders.find(d => d.date === key) : null;
      return `
      <div class="card mb-16">
        <div style="padding:12px 16px;border-bottom:1px solid var(--md-outline-variant);
                    display:flex;align-items:center;gap:8px;
                    background:${isToday ? 'var(--md-primary-container)' : 'var(--md-surface-mid)'};
                    border-radius:10px 10px 0 0">
          <span style="font-size:13px;font-weight:700;color:${isToday ? 'var(--md-primary)' : 'var(--md-on-surface)'}">
            ${UI.icon(icons[key]||'calendar_today','sm')} ${labels[key]}
          </span>
          ${isToday ? `<span class="badge badge-purple" style="font-size:9px">Today</span>` : ''}
          ${dh?.isHoliday ? `<span class="badge badge-yellow" style="font-size:9px">${UI.icon('beach_access','sm')} Holiday</span>` : ''}
          <span style="margin-left:auto;font-size:11px;color:var(--md-on-surface-variant)">${list.length} session${list.length!==1?'s':''}</span>
        </div>
        ${list.map(s => {
          const sh       = CONST.SLOT_HOURS[s.slotId] || {};
          const sm       = STATE_META[s.state] || STATE_META.upcoming;
          const strip    = COLOR_HEX[s.color] || COLOR_HEX[''];
          const count    = (s.studentNames||[]).length;
          const tShort   = s.teacher.split(',').map(t=>t.trim().replace('Kru ','')).join('+');
          const attStats = AttendancePicker.stats(s.id);
          return `
          <div id="sess-wrap-${s.id}">
          <div class="tr-click" style="display:flex;align-items:center;gap:12px;padding:12px 16px;
                      border-bottom:1px solid var(--md-outline-variant);
                      ${s.state==='active' ? 'background:var(--md-success-container);' : ''}"
               onclick="sessToggle('${s.id}',this)">
            <div style="width:4px;height:48px;background:${strip};border-radius:2px;flex-shrink:0"></div>
            <div style="min-width:90px;font-size:12px;color:var(--md-on-surface-variant)">
              ${sh.s||'—'} – ${sh.e||'—'}
            </div>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:var(--md-on-surface)">${Utils.subjectLabel(s)}
                <span class="badge ${sm.badge}" style="font-size:9px;margin-left:4px">${sm.icon} ${sm.label}</span>
              </div>
              <div style="font-size:11px;color:var(--md-on-surface-variant);margin-top:2px">
                ${s.room} · ${s.branch} · ${UI.icon('person','sm')} ${tShort}
              </div>
            </div>
            <div style="text-align:center;min-width:50px">
              <div style="font-size:15px;font-weight:700;color:var(--md-on-surface)">${count}</div>
              <div style="font-size:10px;color:var(--md-on-surface-variant)">students</div>
            </div>
            ${s.state !== 'upcoming' ? `
            <div style="display:flex;gap:6px;min-width:100px">
              <span class="badge badge-green" style="font-size:10px">${UI.icon('check','sm')}${attStats.present}</span>
              <span class="badge badge-yellow" style="font-size:10px">L${attStats.leave}</span>
              <span class="badge badge-red" style="font-size:10px">${UI.icon('close','sm')}${attStats.absent}</span>
            </div>` : `<div style="min-width:100px"></div>`}
            <div class="text-muted" id="sess-chev-${s.id}">${UI.icon('expand_more','sm')}</div>
          </div>
          <div class="sess-detail" id="sess-detail-${s.id}" style="display:none"></div>
          </div>`;
        }).join('')}
      </div>`;
    }).join('');
  }

  /* ── INLINE DETAIL (lazy) — per-student attendance + summary ─────
     กางในหน้าแทน Class Modal · สร้าง HTML เฉพาะตอนเปิดครั้งแรก */
  window.sessToggle = function (id, rowEl) {
    const detail = document.getElementById('sess-detail-'+id);
    const chev   = document.getElementById('sess-chev-'+id);
    if (!detail) return;
    const open = detail.style.display !== 'none';
    if (open) {
      detail.style.display = 'none';
      if (chev) chev.innerHTML = UI.icon('expand_more','sm');
    } else {
      if (!detail.dataset.rendered) {
        const s = DB.sessions.find(x => x.id === id);
        detail.innerHTML = s ? renderDetail(s) : '';
        detail.dataset.rendered = '1';
      }
      detail.style.display = '';
      if (chev) chev.innerHTML = UI.icon('expand_less','sm');
    }
  };

  function consumptionMini(stud, s) {
    if (!stud || !(stud.courses||[]).length) return '';
    const c = stud.courses.find(c => (c.name||'').startsWith(s.subject)) || stud.courses[0];
    const total = c.hours||0, left = c.left||0, used = c.used||0;
    const pct   = total ? Math.round((used/total)*100) : 0;
    const colKey= left<=1 ? 'error' : left<=3 ? 'warning' : 'success';
    return `<div style="min-width:96px">
      <div style="font-size:10px;color:var(--md-on-surface-variant);margin-bottom:3px">${left}h / ${total}h</div>
      ${UI.progress(pct, colKey)}
    </div>`;
  }

  function renderDetail(s) {
    const editable = s.state !== 'upcoming';
    const subShort = (s.subject||'').slice(0,2);
    const rows = (s.studentNames||[]).map(name => {
      const stud    = Utils.studentByName(name);
      const initials= name.split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
      const grade   = stud?.grade || s.grade || '';
      const fam     = stud ? (DB.families||[]).find(f => f.id === stud.familyId) : null;
      const family  = fam ? `${UI.icon('group','sm')} ${fam.name}` : '<span class="text-muted">—</span>';
      const att     = (s.attendance||{})[name] || (editable ? 'present' : null);
      const renew   = stud ? Utils.renewalStatus(stud.id) : 'active';
      const renewBadge = renew==='renewal' ? UI.badge('Renewal','yellow') : '';
      const sumText = (s.summaries||{})[name]?.text || '';

      return `<div style="display:flex;align-items:center;gap:12px;padding:10px 16px 10px 36px;
                  border-bottom:1px solid var(--md-outline-variant);background:var(--md-surface-lowest)">
        ${UI.avatar(initials)}
        <div style="min-width:140px">
          <div style="font-size:12px;font-weight:600">${name}</div>
          <div style="font-size:10px;color:var(--md-on-surface-variant)">${family}</div>
        </div>
        <span class="badge badge-gray" style="font-size:9px">${grade}</span>
        <span class="badge badge-blue" style="font-size:9px">${subShort}</span>
        ${consumptionMini(stud, s)}
        ${renewBadge}
        <div style="margin-left:auto;display:flex;align-items:center;gap:12px;min-width:0">
          ${editable
            ? AttendancePicker.render(s.id, name, att, ['present','leave','absent','reschedule'])
            : `<span class="text-muted" style="font-size:11px">${UI.icon('schedule','sm')} Upcoming</span>`}
          <div style="width:240px;font-size:11px;color:var(--md-on-surface-variant);
                      overflow:hidden;text-overflow:ellipsis;white-space:nowrap"
               title="${sumText.replace(/"/g,'&quot;')}">
            ${sumText || '<span style="opacity:.5">No summary yet</span>'}
          </div>
        </div>
      </div>`;
    }).join('');

    return `${rows}
      <div style="padding:10px 16px;text-align:right;background:var(--md-surface-lowest)">
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();openClassModal&&openClassModal('${s.id}')">
          ${UI.icon('open_in_full','sm')} Open full class
        </button>
      </div>`;
  }

  /* ── FILTER HANDLER ───────────────────────────────────── */
  window.sessFilter = function (key, val, el) {
    if (key==='status')  fStatus  = val;
    if (key==='teacher') fTeacher = val;
    if (key==='branch')  fBranch  = val;
    if (key==='groupBy') fGroupBy = val;
    if (key==='search')  fSearch  = val;
    if (key==='range') {
      fRange = val;
      document.querySelectorAll('#view-sessions .filter-chip').forEach(c=>c.classList.remove('active'));
      if (el) el.classList.add('active');
    }
    renderList();
  };

  /* ── GENERATE NEXT WEEK ───────────────────────────────────
     จันทร์ของสัปดาห์ถัดไป = วันแรกใน dayHeaders + 7 วัน */
  window.sessGenWeek = function () {
    if (!window.SessionGen) return;
    const firstDate = DB.dayHeaders[0]?.date;
    if (!firstDate) return;
    const [y,m,d] = firstDate.split('-').map(Number);
    const dt = new Date(y, m-1, d + 7);
    const p = x => String(x).padStart(2,'0');
    const nextMon = `${dt.getFullYear()}-${p(dt.getMonth()+1)}-${p(dt.getDate())}`;

    const { stats } = SessionGen.generateWeek(nextMon, { commit:true });
    fRange = 'all';
    document.querySelectorAll('#view-sessions .filter-chip').forEach((c,i)=>c.classList.toggle('active', i===2));
    renderKPI();
    renderList();
    if (window.showToast)
      showToast(`Generated ${stats.sessions} sessions · ${stats.students} student slots`
        + (stats.skipHoliday?` · skipped ${stats.skipHoliday} holiday`:'')
        + (stats.skipEmpty?` · ${stats.skipEmpty} empty`:''), 'success');
  };

  window.sessReset = function () {
    fStatus='all'; fTeacher=''; fBranch=''; fSearch=''; fRange='week'; fGroupBy='date';
    const inp = document.getElementById('sess-search');
    if (inp) inp.value = '';
    const chips = document.querySelectorAll('#view-sessions .filter-chip');
    chips.forEach((c,i) => c.classList.toggle('active', i===1));
    document.querySelectorAll('#view-sessions select').forEach(s => s.selectedIndex=0);
    renderList();
  };

  /* ── INIT ─────────────────────────────────────────────── */
  renderKPI();
  const weekChips = document.querySelectorAll('#view-sessions .filter-chip');
  if (weekChips[0]) { weekChips[0].classList.remove('active'); }
  if (weekChips[1]) { weekChips[1].classList.add('active'); }
  fRange = 'week';
  renderList();

})();
