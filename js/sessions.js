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
    active:   { badge:'badge-green',  icon:'🟢', label:'Live'     },
    upcoming: { badge:'badge-blue',   icon:'📅', label:'Upcoming' },
    ended:    { badge:'badge-gray',   icon:'✅', label:'Ended'    },
  };

  /* ── COLOR STRIP ──────────────────────────────────────── */
  const COLOR_HEX = {
    green:'#10b981', yellow:'#f59e0b', orange:'#f97316', purple:'#8b5cf6', '':'#6366f1',
  };

  /* ── SHELL ────────────────────────────────────────────── */
  document.getElementById('view-sessions').innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Sessions</div>
      <div class="page-sub" id="sess-sub">Loading…</div>
    </div>
    <button class="btn btn-primary btn-sm" onclick="showView('calendar')">📅 Calendar View</button>
  </div>

  <!-- KPI strip -->
  <div id="sess-kpi" class="kpi-grid mb-16" style="grid-template-columns:repeat(4,1fr)"></div>

  <!-- Filter bar -->
  <div class="card mb-16" style="padding:12px 16px">
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <input id="sess-search" placeholder="🔍 Subject, teacher, student…"
        style="flex:1;min-width:160px;border:1px solid #e5e7eb;border-radius:7px;
               padding:7px 11px;font-size:12px;outline:none"
        oninput="sessFilter('search',this.value)">

      <!-- Date range -->
      <div style="display:flex;gap:4px">
        <div class="filter-chip active" onclick="sessFilter('range','today',this)">Today</div>
        <div class="filter-chip" onclick="sessFilter('range','week',this)">This Week</div>
        <div class="filter-chip" onclick="sessFilter('range','all',this)">All</div>
      </div>

      <!-- Status -->
      <select style="border:1px solid #e5e7eb;border-radius:6px;padding:6px 8px;
                     font-size:12px;outline:none;color:#374151;background:#fff"
              onchange="sessFilter('status',this.value)">
        <option value="all">All Status</option>
        <option value="active">🟢 Live</option>
        <option value="upcoming">📅 Upcoming</option>
        <option value="ended">✅ Ended</option>
      </select>

      <!-- Teacher -->
      <select style="border:1px solid #e5e7eb;border-radius:6px;padding:6px 8px;
                     font-size:12px;outline:none;color:#374151;background:#fff"
              onchange="sessFilter('teacher',this.value)">
        <option value="">All Teachers</option>
        ${CONST.TEACHERS.map(t=>`<option value="${t}">${t}</option>`).join('')}
      </select>

      <!-- Branch -->
      <select style="border:1px solid #e5e7eb;border-radius:6px;padding:6px 8px;
                     font-size:12px;outline:none;color:#374151;background:#fff"
              onchange="sessFilter('branch',this.value)">
        <option value="">All Branches</option>
        ${CONST.BRANCHES.map(b=>`<option value="${b}">${b}</option>`).join('')}
      </select>
    </div>
  </div>

  <!-- Session list (grouped by date) -->
  <div id="sess-list"></div>`;

  /* ── RENDER KPI ───────────────────────────────────────── */
  function renderKPI() {
    const all      = DB.sessions;
    const today    = all.filter(s => s.date === todayDate);
    const live     = all.filter(s => s.state === 'active');
    const upcoming = all.filter(s => s.state === 'upcoming');
    const ended    = all.filter(s => s.state === 'ended');

    document.getElementById('sess-kpi').innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d1fae5">🟢</div>
        <div class="kpi-label">Live Now</div>
        <div class="kpi-value" style="color:${live.length>0?'#10b981':'#9ca3af'}">${live.length}</div>
        <div class="kpi-change ${live.length>0?'up':''}">Currently active</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#dbeafe">📅</div>
        <div class="kpi-label">Today's Sessions</div>
        <div class="kpi-value">${today.length}</div>
        <div class="kpi-change up">${todayDate||'—'}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#ede9fe">⏭️</div>
        <div class="kpi-label">Upcoming</div>
        <div class="kpi-value">${upcoming.length}</div>
        <div class="kpi-change up">Scheduled ahead</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#f3f4f6">✅</div>
        <div class="kpi-label">Completed</div>
        <div class="kpi-value">${ended.length}</div>
        <div class="kpi-change">This week</div>
      </div>`;
  }

  /* ── RENDER LIST ──────────────────────────────────────── */
  function renderList() {
    let sessions = [...DB.sessions];

    /* Range filter */
    if (fRange === 'today') {
      sessions = sessions.filter(s => s.date === todayDate);
    } else if (fRange === 'week') {
      const weekDates = DB.dayHeaders.map(d => d.date);
      sessions = sessions.filter(s => weekDates.includes(s.date));
    }

    /* Status filter */
    if (fStatus !== 'all') sessions = sessions.filter(s => s.state === fStatus);

    /* Teacher filter */
    if (fTeacher) sessions = sessions.filter(s => s.teacher.includes(fTeacher));

    /* Branch filter */
    if (fBranch) sessions = sessions.filter(s => s.branch === fBranch);

    /* Search */
    if (fSearch) {
      const q = fSearch.toLowerCase();
      sessions = sessions.filter(s =>
        (s.subject + s.teacher + s.room + (s.studentNames||[]).join(' ')).toLowerCase().includes(q));
    }

    /* Sort: date asc, slotId asc — live sessions first within date */
    sessions.sort((a,b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const stateOrd = {active:0,upcoming:1,ended:2};
      if (a.state !== b.state) return (stateOrd[a.state]||1)-(stateOrd[b.state]||1);
      return (a.slotId||0)-(b.slotId||0);
    });

    /* Update subtitle */
    const sub = document.getElementById('sess-sub');
    if (sub) sub.textContent = `${sessions.length} session${sessions.length!==1?'s':''} found`;

    const container = document.getElementById('sess-list');
    if (!container) return;

    if (sessions.length === 0) {
      container.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:#9ca3af">
        <div style="font-size:32px;margin-bottom:8px">📅</div>
        No sessions match your filters
        <br><button class="btn btn-secondary btn-sm" style="margin-top:12px"
          onclick="sessReset()">Clear Filters</button></div>`;
      return;
    }

    /* Group by date */
    const groups = {};
    sessions.forEach(s => {
      (groups[s.date] = groups[s.date] || []).push(s);
    });

    container.innerHTML = Object.entries(groups).map(([date, list]) => {
      const isToday = date === todayDate;
      const dh = DB.dayHeaders.find(d => d.date === date);
      return `
      <div class="card mb-16">
        <!-- Date heading -->
        <div style="padding:12px 16px;border-bottom:1px solid #f3f4f6;
                    display:flex;align-items:center;gap:8px;background:${isToday?'#f5f3ff':'#f9fafb'};
                    border-radius:10px 10px 0 0">
          <span style="font-size:13px;font-weight:700;color:${isToday?'#6366f1':'#374151'}">
            ${dateLabel(date)}
          </span>
          ${isToday?`<span class="badge badge-purple" style="font-size:9px">Today</span>`:''}
          ${dh?.isHoliday?`<span class="badge badge-yellow" style="font-size:9px">🏖️ Holiday</span>`:''}
          <span style="margin-left:auto;font-size:11px;color:#9ca3af">${list.length} session${list.length!==1?'s':''}</span>
        </div>
        <!-- Sessions in this date -->
        ${list.map(s => {
          const sh = CONST.SLOT_HOURS[s.slotId] || {};
          const sm = STATE_META[s.state] || STATE_META.upcoming;
          const strip = COLOR_HEX[s.color] || COLOR_HEX[''];
          const count = (s.studentNames||[]).length;
          const tShort = s.teacher.split(',').map(t=>t.trim().replace('Kru ','')).join('+');
          const attStats = AttendancePicker.stats(s.id);
          return `
          <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;
                      border-bottom:1px solid #f9fafb;cursor:pointer;transition:background .15s;
                      ${s.state==='active'?'background:#f0fdf4;':''}"
               onmouseover="this.style.background='#fafbff'"
               onmouseout="this.style.background='${s.state==='active'?'#f0fdf4':''}'"
               onclick="openClassModal && openClassModal('${s.id}')">
            <!-- Color bar -->
            <div style="width:4px;height:48px;background:${strip};border-radius:2px;flex-shrink:0"></div>
            <!-- Time -->
            <div style="min-width:90px;font-size:12px;color:#6b7280">
              ${sh.s||'—'} – ${sh.e||'—'}
            </div>
            <!-- Main info -->
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:600;color:#1a1d23">${s.subject}
                <span class="badge ${sm.badge}" style="font-size:9px;margin-left:4px">${sm.icon} ${sm.label}</span>
              </div>
              <div style="font-size:11px;color:#6b7280;margin-top:2px">
                ${s.room} · ${s.branch} · 👩‍🏫 ${tShort}
              </div>
            </div>
            <!-- Student count -->
            <div style="text-align:center;min-width:50px">
              <div style="font-size:15px;font-weight:700;color:#374151">${count}</div>
              <div style="font-size:10px;color:#9ca3af">students</div>
            </div>
            <!-- Attendance stats (if started) -->
            ${s.state !== 'upcoming' ? `
            <div style="display:flex;gap:6px;min-width:100px">
              <span style="font-size:11px;background:#d1fae5;color:#065f46;border-radius:4px;padding:2px 7px">✓${attStats.present}</span>
              <span style="font-size:11px;background:#fef3c7;color:#92400e;border-radius:4px;padding:2px 7px">L${attStats.leave}</span>
              <span style="font-size:11px;background:#fee2e2;color:#991b1b;border-radius:4px;padding:2px 7px">✗${attStats.absent}</span>
            </div>` : `<div style="min-width:100px"></div>`}
            <!-- Arrow -->
            <div style="color:#d1d5db;font-size:16px">›</div>
          </div>`;
        }).join('')}
      </div>`;
    }).join('');
  }

  /* ── FILTER HANDLER ───────────────────────────────────── */
  window.sessFilter = function (key, val, el) {
    if (key==='status')  fStatus  = val;
    if (key==='teacher') fTeacher = val;
    if (key==='branch')  fBranch  = val;
    if (key==='search')  fSearch  = val;
    if (key==='range') {
      fRange = val;
      document.querySelectorAll('#view-sessions .filter-chip').forEach(c=>c.classList.remove('active'));
      if (el) el.classList.add('active');
    }
    renderList();
  };

  window.sessReset = function () {
    fStatus='all'; fTeacher=''; fBranch=''; fSearch=''; fRange='week';
    const inp = document.getElementById('sess-search');
    if (inp) inp.value = '';
    const chips = document.querySelectorAll('#view-sessions .filter-chip');
    chips.forEach((c,i) => c.classList.toggle('active', i===1)); // "This Week" default
    document.querySelectorAll('#view-sessions select').forEach(s => s.selectedIndex=0);
    renderList();
  };

  /* ── INIT ─────────────────────────────────────────────── */
  renderKPI();
  // Default: show this week
  const weekChips = document.querySelectorAll('#view-sessions .filter-chip');
  if (weekChips[0]) { weekChips[0].classList.remove('active'); }
  if (weekChips[1]) { weekChips[1].classList.add('active'); }
  fRange = 'week';
  renderList();

})();
