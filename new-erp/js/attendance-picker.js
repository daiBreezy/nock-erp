/* ============================================================
   attendance-picker.js — Shared Attendance Button Picker
   Renders a Present / Leave / Absent button group for any
   live session context.

   Usage:
     AttendancePicker.render(sessionId, studentName, currentAtt)
       → returns HTML string (uses .att-btn CSS classes)

     AttendancePicker.set(sessionId, name, type, el)
       → updates DB.sessions[].attendance + syncs button UI

   Both calendar-class.js and any session modal can use these.
   ============================================================ */
window.AttendancePicker = (function () {

  /* ── AVAILABLE STATUS OPTIONS ─────────────────────────── */
  const OPTIONS = [
    { key: 'present',    label: 'Present',    icon: UI.icon('check_circle','sm') },
    { key: 'leave',      label: 'Leave',      icon: UI.icon('event_busy','sm')   },
    { key: 'absent',     label: 'Absent',     icon: UI.icon('cancel','sm')       },
    { key: 'reschedule', label: 'Reschedule', icon: UI.icon('update','sm')       },
    { key: 'transfer',   label: 'Transfer',   icon: UI.icon('swap_horiz','sm')   },
  ];

  /* ── RENDER BUTTON GROUP ──────────────────────────────── */
  function render(sessionId, name, currentAtt, optSubset) {
    const current = currentAtt || 'present';
    const show    = optSubset
      ? OPTIONS.filter(o => optSubset.includes(o.key))
      : OPTIONS;

    const nameEnc = (name||'').replace(/'/g, "\\'");
    const sidEnc  = (sessionId||'').replace(/'/g, "\\'");

    return `<div class="att-btns" data-session="${sidEnc}" data-student="${nameEnc}">
      ${show.map(o => `
        <button class="att-btn ${o.key} ${current===o.key?'sel':''}"
          onclick="AttendancePicker.set('${sidEnc}','${nameEnc}','${o.key}',this)"
          title="${o.label}">${o.icon} ${o.label}</button>`
      ).join('')}
    </div>`;
  }

  /* ── SET ATTENDANCE ───────────────────────────────────── */
  function set(sessionId, name, type, el) {
    /* 1. Update the DB */
    const s = DB.sessions.find(x => x.id === sessionId);
    if (s) {
      s.attendance = s.attendance || {};
      s.attendance[name] = type;

      /* Auto-init summary slot for present/absent */
      s.summaries = s.summaries || {};
      if (type === 'present' || type === 'absent') {
        s.summaries[name] = s.summaries[name] || { text: '', sent: false };
      } else {
        /* Leave/Reschedule — remove summary requirement */
        delete s.summaries[name];
      }
    }

    /* 2. Update button UI */
    if (el) {
      el.closest('.att-btns')?.querySelectorAll('.att-btn').forEach(b => b.classList.remove('sel'));
      el.classList.add('sel');
    }

    /* 3. Notify if hooked */
    if (typeof _onChange === 'function') _onChange(sessionId, name, type);
  }

  /* ── OPTIONAL CHANGE HOOK ─────────────────────────────── */
  let _onChange = null;
  function onChange(fn) { _onChange = fn; }

  /* ── SUMMARY STATS FOR A SESSION ─────────────────────── */
  function stats(sessionId) {
    const s = DB.sessions.find(x => x.id === sessionId);
    if (!s) return { present:0, absent:0, leave:0, total:0 };
    const att = s.attendance || {};
    let present=0, absent=0, leave=0;
    s.studentNames.forEach(n => {
      const a = att[n] || 'present';
      if (a==='present') present++;
      else if (a==='absent') absent++;
      else leave++;
    });
    return { present, absent, leave, total: s.studentNames.length };
  }

  /* ── BACKWARD COMPAT: calSetAtt → AttendancePicker.set ── */
  window.calSetAtt = function (sessionId, name, type, el) {
    AttendancePicker.set(sessionId, name, type, el);
  };

  return { render, set, stats, onChange };

})();
