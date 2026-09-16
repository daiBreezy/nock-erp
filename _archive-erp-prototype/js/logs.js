/* ============================================================
   logs.js — NockERP Logs & Timeline Module
   Full audit trail from DB — uses Timeline shared renderer
   ============================================================ */
(function () {

  /* ── BUILD ALL EVENTS ─────────────────────────────────── */
  function buildAllEvents() {
    const events = [];

    /* --- Student events --- */
    DB.students.forEach(stu => {
      const stuEvents = Timeline.fromStudent(stu, stu.name);
      stuEvents.forEach(e => {
        events.push({ ...e, actor: stu.name, module: 'student' });
      });
    });

    /* --- Session events --- */
    DB.sessions.forEach(s => {
      const dh = DB.dayHeaders.find(d => d.date === s.date);
      const dateLabel = dh ? (dh.isToday ? 'Today' : dh.label + ' ' + s.date) : s.date;
      const sh = CONST.SLOT_HOURS?.[s.slotId] || {};

      events.push({
        dateLabel,
        icon:  s.state === 'done' ? '✅' : s.state === 'ongoing' ? '🔴' : '📅',
        color: s.state === 'done' ? 'var(--md-success)' : s.state === 'ongoing' ? 'var(--md-error)' : 'var(--md-primary)',
        tag:   'Session',
        tagCls:'badge-blue',
        title: `${Utils.subjectLabel(s)} — ${s.state}`,
        sub:   `${s.teacher} · ${s.room} · ${sh.s||''}–${sh.e||''}`,
        actor: s.teacher,
        module:'session',
        _sortDate: s.date,
      });

      /* Attendance marks */
      Object.entries(s.attendance || {}).forEach(([name, att]) => {
        const meta = CONST.ATTENDANCE_META?.[att] || {};
        events.push({
          dateLabel,
          icon:   meta.icon || '—',
          color:  meta.color || '#9ca3af',
          tag:    'Attendance',
          tagCls: 'badge-gray',
          title:  `${name} — ${meta.label || att}`,
          sub:    `${Utils.subjectLabel(s)} · ${s.teacher}`,
          actor:  'System',
          module: 'attendance',
          _sortDate: s.date,
        });
      });

      /* Summary events */
      Object.entries(s.summaries || {}).forEach(([name, sum]) => {
        if (sum.text) {
          events.push({
            dateLabel,
            icon:  sum.sent ? '📨' : '📝',
            color: sum.sent ? '#10b981' : '#f59e0b',
            tag:   sum.sent ? 'Sent' : 'Summary',
            tagCls: sum.sent ? 'badge-green' : 'badge-yellow',
            title:  `Summary ${sum.sent ? 'sent' : 'written'} — ${name}`,
            sub:    `${Utils.subjectLabel(s)} · ${s.teacher}`,
            actor:  s.teacher,
            module: 'summary',
            _sortDate: s.date,
          });
        }
      });
    });

    /* --- Lead events --- */
    (DB.leads || []).forEach(l => {
      events.push({
        dateLabel: l.date || 'This week',
        icon:  '🎯',
        color: 'var(--md-primary)',
        tag:   'CRM',
        tagCls:'badge-purple',
        title: `Lead: ${l.name} — ${l.stage}`,
        sub:   `${l.subject || '—'} · ${l.source || '—'}`,
        actor: 'Admin',
        module:'crm',
        _sortDate: l.date || '2026-05-10',
      });
    });

    /* --- Invoice events from students --- */
    DB.students.forEach(stu => {
      (stu.invoices || []).forEach(inv => {
        events.push({
          dateLabel: inv.date || 'This month',
          icon:  inv.status === 'paid' ? '💳' : '📄',
          color: inv.status === 'paid' ? 'var(--md-success)' : 'var(--md-warning)',
          tag:   'Billing',
          tagCls: inv.status === 'paid' ? 'badge-green' : 'badge-yellow',
          title:  `${inv.id || 'Invoice'} — ${stu.name}`,
          sub:    `${Utils.currency(inv.amount)} · ${inv.status}`,
          actor:  'Admin',
          module: 'billing',
          _sortDate: inv.date || '2026-05-01',
        });
      });
    });

    /* Sort: newest first */
    events.sort((a, b) => {
      const ka = _sortKey(a._sortDate || a.dateLabel);
      const kb = _sortKey(b._sortDate || b.dateLabel);
      return kb.localeCompare(ka);
    });

    return events;
  }

  function _sortKey(d) {
    if (!d || d === 'Today' || d === 'Now') return '2026-05-15';
    if (d === 'Yesterday') return '2026-05-14';
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    /* "14 May" → "2026-05-14" */
    const months = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
                    Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
    const m = d.match(/(\d{1,2})\s+([A-Za-z]+)/);
    if (m) return `2026-${months[m[2]]||'01'}-${m[1].padStart(2,'0')}`;
    return '2026-01-01';
  }

  /* ── STATE ────────────────────────────────────────────── */
  let allEvents = buildAllEvents();
  let fModule   = 'all';
  let search    = '';

  /* ── SHELL ────────────────────────────────────────────── */
  document.getElementById('view-logs').innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Logs & Timeline</div>
      <div class="page-sub" id="logs-sub">Loading…</div>
    </div>
    <button class="btn btn-secondary btn-sm" onclick="showToast('Export coming soon','info')"><span class="mdi mdi-sm">upload</span> Export</button>
  </div>

  <!-- KPI -->
  <div id="logs-kpi" class="kpi-grid mb-16" style="grid-template-columns:repeat(4,1fr)"></div>

  <!-- Filters -->
  <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
    <input id="logs-search" class="settings-input" style="width:220px;margin:0"
           placeholder="🔍 Search logs…" oninput="logsSearch(this.value)">
    <div class="filter-chip active"  onclick="logFilter('all',this)">All</div>
    <div class="filter-chip" onclick="logFilter('student',this)"><span class="mdi mdi-sm" style="font-size:11px">school</span> Student</div>
    <div class="filter-chip" onclick="logFilter('session',this)"><span class="mdi mdi-sm" style="font-size:11px">calendar_today</span> Session</div>
    <div class="filter-chip" onclick="logFilter('attendance',this)"><span class="mdi mdi-sm" style="font-size:11px">check_circle</span> Attendance</div>
    <div class="filter-chip" onclick="logFilter('billing',this)"><span class="mdi mdi-sm" style="font-size:11px">payments</span> Billing</div>
    <div class="filter-chip" onclick="logFilter('crm',this)"><span class="mdi mdi-sm" style="font-size:11px">person_search</span> CRM</div>
    <div class="filter-chip" onclick="logFilter('summary',this)"><span class="mdi mdi-sm" style="font-size:11px">edit_note</span> Summary</div>
  </div>

  <!-- Log -->
  <div class="card" style="padding:16px">
    <div id="logs-content"></div>
  </div>`;

  /* ── KPI ──────────────────────────────────────────────── */
  function renderKPI() {
    const total   = allEvents.length;
    const student = allEvents.filter(e => e.module === 'student').length;
    const session = allEvents.filter(e => e.module === 'session').length;
    const billing = allEvents.filter(e => e.module === 'billing').length;
    document.getElementById('logs-kpi').innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon tertiary"><span class="mdi">receipt_long</span></div>
        <div class="kpi-label">Total Events</div>
        <div class="kpi-value">${total}</div>
        <div class="kpi-change up">All time</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon success"><span class="mdi">school</span></div>
        <div class="kpi-label">Student Events</div>
        <div class="kpi-value">${student}</div>
        <div class="kpi-change up">Enrollments & notes</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon warning"><span class="mdi">calendar_today</span></div>
        <div class="kpi-label">Session Events</div>
        <div class="kpi-value">${session}</div>
        <div class="kpi-change up">Classes & attendance</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><span class="mdi">payments</span></div>
        <div class="kpi-label">Billing Events</div>
        <div class="kpi-value">${billing}</div>
        <div class="kpi-change up">Invoices & payments</div>
      </div>`;
  }

  /* ── RENDER LOGS ──────────────────────────────────────── */
  function renderLogs() {
    let list = [...allEvents];
    if (fModule !== 'all') list = list.filter(e => e.module === fModule);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        (e.title||'').toLowerCase().includes(q) ||
        (e.sub||'').toLowerCase().includes(q) ||
        (e.actor||'').toLowerCase().includes(q)
      );
    }

    const sub = document.getElementById('logs-sub');
    if (sub) sub.textContent = `${list.length} event${list.length !== 1 ? 's' : ''} logged`;

    const container = document.getElementById('logs-content');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--md-on-surface-variant)">
        <div style="font-size:32px;margin-bottom:8px"><span class="mdi">history</span></div>No events found</div>`;
      return;
    }

    /* Group by dateLabel */
    const groups = {};
    list.forEach(e => {
      const d = e.dateLabel || '—';
      if (!groups[d]) groups[d] = [];
      groups[d].push(e);
    });

    /* Use Timeline.build for consistent rendering */
    container.innerHTML = Timeline.build(list);
  }

  /* ── ACTIONS ──────────────────────────────────────────── */
  window.logFilter = function (val, el) {
    fModule = val;
    document.querySelectorAll('#view-logs .filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    renderLogs();
  };

  window.logsSearch = function (val) {
    search = val;
    renderLogs();
  };

  /* ── INIT ─────────────────────────────────────────────── */
  renderKPI();
  renderLogs();

})();
