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
        icon:  s.state === 'done' ? UI.icon('task_alt') : s.state === 'ongoing' ? UI.icon('radio_button_checked') : UI.icon('calendar_today'),
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
        const attIcon  = { present:'check_circle', leave:'event_busy', leave_over:'event_busy', absent:'cancel', reschedule:'update', transfer:'swap_horiz' };
        const attColor = { present:'var(--md-success)', leave:'var(--md-warning)', leave_over:'var(--md-warning)', absent:'var(--md-error)', reschedule:'var(--md-primary)', transfer:'var(--md-tertiary)' };
        events.push({
          dateLabel,
          icon:   UI.icon(attIcon[att] || 'help'),
          color:  attColor[att] || 'var(--md-on-surface-variant)',
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
            icon:  sum.sent ? UI.icon('forward_to_inbox') : UI.icon('edit_note'),
            color: sum.sent ? 'var(--md-success)' : 'var(--md-warning)',
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
        icon:  UI.icon('person_search'),
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
          icon:  inv.status === 'paid' ? UI.icon('payments') : UI.icon('receipt'),
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
  ${UI.pageHeader('Logs & Timeline', '<span id="logs-sub">Loading…</span>',
    `<button class="btn btn-secondary btn-sm" onclick="NockExport.csv('logs.csv', (DB.logs||DB.activityLogs||[]).map(l=>({time:l.time||l.date||'',type:l.type||'',text:(l.text||l.message||'').replace(/<[^>]+>/g,''),by:l.by||l.actor||''})))">${UI.icon('upload','sm')} Export</button>`
  )}

  <div id="logs-kpi"></div>

  ${UI.filterBar([
    { type:'search', placeholder:'Search logs…', id:'logs-search', oninput:'logsSearch(this.value)' },
    { label:'All',        active:true,  onclick:"logFilter('all',this)"        },
    { label:`${UI.icon('school','sm')} Student`,    active:false, onclick:"logFilter('student',this)"   },
    { label:`${UI.icon('calendar_today','sm')} Session`,    active:false, onclick:"logFilter('session',this)"   },
    { label:`${UI.icon('check_circle','sm')} Attendance`, active:false, onclick:"logFilter('attendance',this)" },
    { label:`${UI.icon('payments','sm')} Billing`,     active:false, onclick:"logFilter('billing',this)"   },
    { label:`${UI.icon('person_search','sm')} CRM`,         active:false, onclick:"logFilter('crm',this)"       },
    { label:`${UI.icon('edit_note','sm')} Summary`,     active:false, onclick:"logFilter('summary',this)"   },
  ])}

  <div class="card" style="padding:var(--sp-4)">
    <div id="logs-content"></div>
  </div>`;

  /* ── KPI ──────────────────────────────────────────────── */
  function renderKPI() {
    const total   = allEvents.length;
    const student = allEvents.filter(e => e.module === 'student').length;
    const session = allEvents.filter(e => e.module === 'session').length;
    const billing = allEvents.filter(e => e.module === 'billing').length;
    document.getElementById('logs-kpi').innerHTML = UI.kpiGrid([
      { icon:'receipt_long',   label:'Total Events',   value:total,   color:'tertiary', sub:'All time',             subColor:'up' },
      { icon:'school',         label:'Student Events', value:student, color:'success',  sub:'Enrollments & notes',  subColor:'up' },
      { icon:'calendar_today', label:'Session Events', value:session, color:'warning',  sub:'Classes & attendance', subColor:'up' },
      { icon:'payments',       label:'Billing Events', value:billing, color:'',         sub:'Invoices & payments',  subColor:'up' },
    ]);
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
      container.innerHTML = UI.emptyState('history', 'No events found', 'Try a different filter or search term');
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
