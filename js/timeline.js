/* ============================================================
   timeline.js — Shared Timeline Renderer
   Synthesizes events from DB data → renders a visual feed
   Usage:
     Timeline.build(events)                  → HTML string
     Timeline.fromStudent(stu, name)         → events[]
     Timeline.fromFamily(fam)               → events[]
   ============================================================ */
window.Timeline = (function () {

  /* ── EVENT TYPE META ──────────────────────────────────── */
  const TYPE = {
    enroll:     { icon: '🎓', color: '#6366f1', tag: 'Enrolled'  },
    payment:    { icon: '💳', color: '#10b981', tag: 'Payment'   },
    invoice:    { icon: '📄', color: '#6b7280', tag: 'Invoice'   },
    session:    { icon: '📅', color: '#06b6d4', tag: 'Session'   },
    present:    { icon: '✅', color: '#10b981', tag: 'Present'   },
    absent:     { icon: '❌', color: '#ef4444', tag: 'Absent'    },
    leave:      { icon: '📋', color: '#f59e0b', tag: 'Leave'     },
    reschedule: { icon: '🔄', color: '#8b5cf6', tag: 'Rescheduled' },
    note:       { icon: '📝', color: '#9ca3af', tag: 'Note'      },
    summary:    { icon: '📨', color: '#6366f1', tag: 'Summary'   },
    renewal:    { icon: '⚠️', color: '#f59e0b', tag: 'Renewal'   },
    alert:      { icon: '🚨', color: '#ef4444', tag: 'Alert'     },
  };

  /* ── BUILD HTML ───────────────────────────────────────── */
  function build(events) {
    if (!events || events.length === 0) {
      return `<div style="padding:24px 0;text-align:center;color:#9ca3af;font-size:13px">
        <div style="font-size:28px;margin-bottom:6px">📋</div>No activity recorded yet</div>`;
    }

    /* Group by date label */
    const groups = [];
    let curDate  = null;
    events.forEach(e => {
      const d = e.dateLabel || e.time || '—';
      if (d !== curDate) { groups.push({ date: d, items: [] }); curDate = d; }
      groups[groups.length - 1].items.push(e);
    });

    return groups.map(g => `
      <div style="margin-bottom:4px">
        <div style="font-size:10px;font-weight:700;color:#9ca3af;
                    text-transform:uppercase;letter-spacing:.6px;
                    padding:10px 16px 4px;border-top:1px solid #f3f4f6;margin-top:4px">
          ${g.date}
        </div>
        ${g.items.map(e => {
          const m     = TYPE[e.type] || { icon: '●', color: '#6366f1', tag: '' };
          const color = e.color || m.color;
          const icon  = e.icon  || m.icon;
          const tag   = e.tag   !== undefined ? e.tag : m.tag;
          return `
          <div class="timeline-item" style="padding:9px 16px;gap:12px;align-items:flex-start">
            <div style="width:28px;height:28px;border-radius:50%;
                        background:${color}18;border:2px solid ${color}40;
                        display:flex;align-items:center;justify-content:center;
                        font-size:13px;flex-shrink:0;margin-top:1px">${icon}</div>
            <div class="tl-content">
              <div class="tl-text" style="display:flex;align-items:baseline;gap:5px;flex-wrap:wrap">
                ${tag ? `<span style="font-size:10px;font-weight:700;
                  background:${color}18;color:${color};border-radius:4px;
                  padding:1px 6px;flex-shrink:0">${tag}</span>` : ''}
                <span style="color:#374151">${e.text}</span>
              </div>
              ${e.sub  ? `<div style="font-size:11px;color:#6b7280;margin-top:2px">${e.sub}</div>` : ''}
              <div class="tl-time">${e.time||''}</div>
            </div>
          </div>`;
        }).join('')}
      </div>`).join('');
  }

  /* ── SORT KEY → normalise dates for comparison ────────── */
  const TODAY = '2026-05-15';
  function _sortKey(dateStr) {
    if (!dateStr || dateStr === 'Now') return '2026-05-15';
    if (dateStr === 'Today')           return '2026-05-15';
    if (dateStr === 'Yesterday')       return '2026-05-14';
    /* Already ISO: 2026-01-15 */
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    /* "1 May" → "2026-05-01" */
    const MONTHS = {Jan:'01',Feb:'02',Mar:'03',Apr:'04',May:'05',Jun:'06',
                    Jul:'07',Aug:'08',Sep:'09',Oct:'10',Nov:'11',Dec:'12'};
    const m1 = dateStr.match(/^(\d+)\s(\w+)$/);
    if (m1) return `2026-${MONTHS[m1[2]]||'01'}-${m1[1].padStart(2,'0')}`;
    const m2 = dateStr.match(/(\w+)\s(\d+)/);
    if (m2) return `2026-${MONTHS[m2[1]]||'01'}-${m2[2].padStart(2,'0')}`;
    return '2026-01-01';
  }

  function _dateLabel(dateStr) {
    const k = _sortKey(dateStr);
    if (k === TODAY)          return 'Today';
    if (k === '2026-05-14')   return 'Yesterday';
    const [,m,d] = k.split('-');
    const MN = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${parseInt(d)} ${MN[parseInt(m)]}`;
  }

  /* ── FROM STUDENT ─────────────────────────────────────── */
  function fromStudent(stu, name) {
    const events = [];

    /* Enrollment */
    if (stu?.enrollDate) {
      const courses = (stu.courses||[]).map(c=>c.name).join(', ');
      events.push({
        type: 'enroll',
        text: `Enrolled${courses ? ' — ' + courses : ''}`,
        time: stu.enrollDate,
        _sk:  _sortKey(stu.enrollDate),
      });
    }

    /* Invoices / Payments */
    (stu?.invoices||[]).forEach(inv => {
      events.push({
        type: 'payment',
        text: `฿${(inv.amount||0).toLocaleString()} · ${inv.course||'—'}`,
        sub:  inv.id,
        time: inv.date,
        _sk:  _sortKey(inv.date),
      });
    });

    /* Attendance records */
    (stu?.attendance||[]).forEach(a => {
      const typeMap = { present:'present', absent:'absent', leave:'leave',
                        reschedule:'reschedule', transfer:'session' };
      events.push({
        type: typeMap[a.status] || 'session',
        text: a.course || '—',
        time: a.date,
        _sk:  _sortKey(a.date),
      });
    });

    /* Renewal alert */
    if (stu?.status === 'urgent' || stu?.status === 'renewal') {
      const left = Math.min(...(stu.courses||[]).map(c=>c.left));
      events.push({
        type: stu.status === 'urgent' ? 'alert' : 'renewal',
        text: `${left} class${left===1?'':'es'} remaining — renewal pending`,
        time: TODAY,
        _sk:  TODAY,
      });
    }

    /* Notes */
    (stu?.notes||[]).forEach(n => {
      events.push({
        type: 'note',
        text: n.text,
        sub:  `${n.author}`,
        time: n.date,
        _sk:  _sortKey(n.date),
      });
    });

    /* Sort newest first, attach display date label */
    events.sort((a,b) => b._sk.localeCompare(a._sk));
    events.forEach(e => { e.dateLabel = _dateLabel(e.time); });
    return events;
  }

  /* ── FROM FAMILY ──────────────────────────────────────── */
  function fromFamily(fam) {
    const events = [];
    const stuNames = fam.students || [];

    stuNames.forEach(sname => {
      const stu = DB.students.find(s => s.name === sname);
      if (!stu) return;
      const prefix = stuNames.length > 1 ? `${sname.split(' ')[0]} · ` : '';

      if (stu.enrollDate) {
        const courses = (stu.courses||[]).map(c=>c.name).join(', ');
        events.push({
          type: 'enroll',
          text: `${prefix}Enrolled${courses ? ' — ' + courses : ''}`,
          time: stu.enrollDate,
          _sk:  _sortKey(stu.enrollDate),
        });
      }
      (stu.invoices||[]).forEach(inv => {
        events.push({
          type: 'payment',
          text: `${prefix}฿${(inv.amount||0).toLocaleString()} · ${inv.course||'—'}`,
          sub:  inv.id,
          time: inv.date,
          _sk:  _sortKey(inv.date),
        });
      });
      (stu.attendance||[]).forEach(a => {
        const typeMap = { present:'present', absent:'absent', leave:'leave',
                          reschedule:'reschedule', transfer:'session' };
        events.push({
          type: typeMap[a.status] || 'session',
          text: `${prefix}${a.course||'—'}`,
          time: a.date,
          _sk:  _sortKey(a.date),
        });
      });
    });

    /* Family-level notes */
    (fam.notes||[]).forEach(n => {
      events.push({
        type: 'note',
        text: n.text,
        sub:  n.author,
        time: n.date,
        _sk:  _sortKey(n.date),
      });
    });

    events.sort((a,b) => b._sk.localeCompare(a._sk));
    events.forEach(e => { e.dateLabel = _dateLabel(e.time); });
    return events;
  }

  /* ── PUBLIC API ───────────────────────────────────────── */
  return { build, fromStudent, fromFamily };

})();
