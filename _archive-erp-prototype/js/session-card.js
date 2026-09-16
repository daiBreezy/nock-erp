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
    green:  '#10b981',
    yellow: '#f59e0b',
    orange: '#f97316',
    purple: '#8b5cf6',
    blue:   '#6366f1',
    '':     '#6366f1',
  };

  /* ── STATE → label + color ────────────────────────────── */
  const STATE_META = {
    active:   { dot: '🟢', badge: 'badge-green',  label: 'Live'     },
    upcoming: { dot: '📅', badge: 'badge-blue',   label: 'Upcoming' },
    ended:    { dot: '✅', badge: 'badge-gray',   label: 'Ended'    },
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
         style="${s.state==='active' ? 'background:#f0fdf4;border-left:3px solid #10b981;' : ''}">
      <div class="session-time">${time}</div>
      <div class="session-dot" style="background:${color}"></div>
      <div class="session-info">
        <div class="session-name">${Utils.subjectLabel(s)}
          <span class="badge ${sm.badge}" style="font-size:9px;vertical-align:middle;margin-left:4px">${sm.label}</span>
        </div>
        <div class="session-meta">${s.room} · ${s.branch} · ${count} student${count!==1?'s':''}</div>
        <div class="session-teacher">👩‍🏫 ${tshort}</div>
      </div>
      ${opts.showDate ? `<div style="font-size:10px;color:#9ca3af;flex-shrink:0;text-align:right">
        ${s.date}</div>` : ''}
    </div>`;
  }

  /* ── RENDER A GROUP ───────────────────────────────────── */
  function renderGroup(sessions, opts) {
    if (!sessions || sessions.length === 0) {
      return `<div style="padding:24px;text-align:center;color:#9ca3af;font-size:13px">
        <div style="font-size:28px;margin-bottom:6px">📅</div>No sessions</div>`;
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
