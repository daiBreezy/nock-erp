/* ============================================================
   session-card.js — Shared Session Card Renderer
   Renders a session from DB.sessions as a styled card row.

   Usage:
     SessionCard.render(session)         → compact list row HTML
     SessionCard.renderGrid(sessions)    → group of rows inside a container
     SessionCard.today()                 → sessions for DB "today" date
   ============================================================ */
window.SessionCard = (function () {

  /* ── COLOR → dot class ────────────────────────────────── */
  const DOT_COLOR = {
    green:  'var(--md-success)',
    yellow: 'var(--md-warning)',
    orange: 'var(--clr-on-science)',
    purple: 'var(--clr-on-grammar)',
    blue:   'var(--md-primary)',
    '':     'var(--md-primary)',
  };

  /* ── STATE → label + color ────────────────────────────── */
  const STATE_META = {
    active:   { dot: UI.icon('play_circle','sm'),  badge: 'badge-green', label: 'Live'     },
    upcoming: { dot: UI.icon('event','sm'),         badge: 'badge-blue',  label: 'Upcoming' },
    ended:    { dot: UI.icon('check_circle','sm'), badge: 'badge-gray',  label: 'Ended'    },
  };

  /* ── RENDER ONE CARD ──────────────────────────────────── */
  function render(s, opts) {
    opts = opts || {};
    const sh    = CONST.SLOT_HOURS[s.slotId] || {};
    const time  = sh.s && sh.e ? `${sh.s}–${sh.e}` : '—';
    const sm    = STATE_META[s.state] || STATE_META.upcoming;
    const color = DOT_COLOR[s.color] || DOT_COLOR[''];
    const tshort = s.teacher.split(',').map(t => t.trim().replace('Kru ','Kru ')).join(', ');
    const count  = (s.studentNames || []).length;
    const onclick = opts.onclick
      ? `onclick="${opts.onclick}('${s.id}')"`
      : `onclick="openClassModal && openClassModal('${s.id}')"`;

    return `
    <div class="session-card" ${onclick}
         style="${s.state==='active' ? 'background:var(--md-success-container);border-left:3px solid var(--md-success);' : ''}">
      <div class="session-time">${time}</div>
      <div class="session-dot" style="background:${color}"></div>
      <div class="session-info">
        <div class="session-name">${Utils.subjectLabel(s)}
          <span class="badge ${sm.badge}" style="font-size:9px;vertical-align:middle;margin-left:4px">${sm.label}</span>
        </div>
        <div class="session-meta">${s.room} · ${s.branch} · ${count} student${count!==1?'s':''}</div>
        <div class="session-teacher">${UI.icon('person','sm')} ${tshort}</div>
      </div>
      ${opts.showDate ? `<div class="text-muted" style="font-size:10px;flex-shrink:0;text-align:right">
        ${s.date}</div>` : ''}
    </div>`;
  }

  /* ── RENDER A GROUP ───────────────────────────────────── */
  function renderGroup(sessions, opts) {
    if (!sessions || sessions.length === 0) {
      return `<div style="padding:16px">${UI.emptyState('event', 'No sessions')}</div>`;
    }
    const sorted = [...sessions].sort((a,b) => (a.slotId||0) - (b.slotId||0));
    return sorted.map(s => render(s, opts)).join('');
  }

  /* ── TODAY'S SESSIONS ─────────────────────────────────── */
  function today() {
    const todayDH = DB.dayHeaders.find(d => d.isToday);
    if (!todayDH) return [];
    return DB.sessions.filter(s => s.date === todayDH.date);
  }

  /* ── UPCOMING (next 7 days, excluding today) ──────────── */
  function upcoming(limit) {
    const todayDH = DB.dayHeaders.find(d => d.isToday);
    const todayDate = todayDH?.date || '';
    return DB.sessions
      .filter(s => s.date > todayDate && s.state !== 'ended')
      .sort((a,b) => a.date.localeCompare(b.date) || (a.slotId||0)-(b.slotId||0))
      .slice(0, limit || 10);
  }

  return { render, renderGroup, today, upcoming };

})();
