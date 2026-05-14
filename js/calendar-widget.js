/* ============================================================
   calendar-widget.js — Shared Calendar Rendering Component
   Base for: Calendar page · CRM Schedule · Dashboard
   ============================================================
   col in DB.sessions is 1-indexed: 1=Mon … 7=Sun
   ============================================================ */
window.CalendarWidget = (function () {

  /* ── PRIVATE CONSTANTS ────────────────────────────────── */
  const SH  = CONST.SLOT_HOURS;
  const BH  = CONST.BREAK_HOURS;
  const TH  = CONST.TIME_HOURS;
  const TS  = CONST.TIME_SLOTS;

  const ROW_MAP = {};
  TH.forEach((h, i) => ROW_MAP[h] = i + 2);

  function evStyle(color) {
    if (color === 'green')  return 'background:#d1fae5;border-left:4px solid #10b981;color:#065f46';
    if (color === 'yellow') return 'background:#fef3c7;border-left:4px solid #f59e0b;color:#92400e';
    if (color === 'orange') return 'background:#ffedd5;border-left:4px solid #f97316;color:#c2410c';
    return 'background:#ede9fe;border-left:4px solid #6366f1;color:#5b21b6';
  }

  /* ── ACTIVE CALLBACKS ─────────────────────────────────── */
  let _cbSession    = null;  // fn(id, slotId, col)
  let _cbEmpty      = null;  // fn(slotId, col)          — week view
  let _cbEmptyDay   = null;  // fn(slotId, date, teacher) — day view

  /* ════════════════════════════════════════════════════════
     renderWeek(el, opts)
     Week grid — same visual as Calendar page week tab.
     Used by: Calendar page · CRM Schedule modal (week mode)

     opts: {
       sessions?:         override (default DB.sessions)
       dayHeaders?:       override (default DB.dayHeaders) — for dynamic weeks
       filterFn?:         fn(session)→bool
       selectable?:       bool — show ＋ in empty cells
       highlightSubject?: string — green outline on matching sessions
       selectedSlot?:     { sessionId, slotId, col, isNew } | null
       onClickSession?:   fn(id, slotId, col)
       onClickEmpty?:     fn(slotId, col)
     }
  ════════════════════════════════════════════════════════ */
  function renderWeek(el, opts) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    opts = opts || {};

    const src        = opts.sessions    || DB.sessions;
    const days       = opts.dayHeaders  || DB.dayHeaders;
    const selectable = opts.selectable  || false;
    const hlSubj     = opts.highlightSubject || '';
    const sel        = opts.selectedSlot     || null;

    _cbSession = opts.onClickSession || null;
    _cbEmpty   = opts.onClickEmpty   || null;

    const filtered = opts.filterFn ? src.filter(opts.filterFn) : src;

    /* Build lookup: "slotId-col" → [session,…]  col is 1-indexed */
    const lookup = {};
    filtered.forEach(s => {
      const k = `${s.slotId}-${s.col}`;
      (lookup[k] = lookup[k] || []).push(s);
    });

    let h = '<div class="cal-fill"><div class="cal-days">';

    /* Header row */
    h += '<div class="cal-day-header" style="position:sticky;top:0;z-index:2"></div>';
    days.forEach(d => {
      const cls = d.isToday ? 'today' : d.isHoliday ? 'holiday' : '';
      h += `<div class="cal-day-header ${cls}" style="position:sticky;top:0;z-index:2">
        ${d.label}${d.isHoliday ? ' 🏖️' : ''}
      </div>`;
    });

    /* Slot rows */
    TS.forEach(slot => {
      if (slot.type === 'break') {
        h += `<div class="cal-time break-row">${slot.start}</div>`;
        for (let i = 0; i < 7; i++) {
          h += `<div class="cal-cell break-cell">
            <span style="font-size:9px;color:#9ca3af;padding:0 4px">${i === 0 ? slot.label : ''}</span>
          </div>`;
        }
        return;
      }

      h += `<div class="cal-time">${slot.start}<span class="end-time">${slot.end}</span></div>`;

      days.forEach((d, di) => {
        const col  = di + 1;
        const list = lookup[`${slot.id}-${col}`] || [];

        h += `<div class="cal-cell ${d.isHoliday ? 'holiday-col' : ''}">`;

        if (d.isHoliday && slot.id === 0) {
          h += `<div class="cal-event holiday-event">วันวิสาขบูชา</div>`;
        }

        list.forEach(s => {
          const isSel    = sel && !sel.isNew && sel.sessionId === s.id;
          const isCompat = hlSubj && s.subject === hlSubj;
          const t        = s.teacher.split(',').map(x => x.trim().replace('Kru ', '')).join('+');
          const dot      = s.state === 'active' ? '🟢 ' : s.state === 'ended' ? '✅ ' : '';
          let outline = '';
          if      (isSel)    outline = 'outline:2px solid #6366f1;outline-offset:1px;';
          else if (isCompat) outline = 'outline:2px solid #10b981;outline-offset:1px;';

          h += `<div class="cal-event ${s.color}" style="${outline}cursor:pointer"
                onclick="CalendarWidget._onSession('${s.id}',${slot.id},${col})"
                title="${s.subject} · ${s.teacher}">
            ${dot}${s.subject} · ${s.room}
            <br><span style="font-size:9px;opacity:.8">👩‍🏫${t} · ${s.studentNames.length}👤</span>
            ${isCompat && !isSel ? '<br><span style="font-size:9px;color:#10b981;font-weight:600">✓ Compatible</span>' : ''}
            ${isSel ? '<br><span style="font-size:9px;color:#6366f1;font-weight:600">✓ Selected</span>' : ''}
          </div>`;
        });

        /* Empty clickable cell */
        if (list.length === 0 && selectable && !d.isHoliday) {
          const emSel = sel && sel.isNew && sel.slotId === slot.id && sel.col === col;
          h += `<div onclick="CalendarWidget._onEmpty(${slot.id},${col})"
                style="height:100%;min-height:44px;cursor:pointer;border-radius:4px;
                  display:flex;align-items:center;justify-content:center;
                  ${emSel ? 'background:#e0e7ff;border:2px solid #6366f1;'
                           : 'border:1px dashed #e5e7eb;'}
                  transition:all .15s"
                onmouseover="if(!this.dataset.sel){this.style.background='#f5f3ff';this.style.borderColor='#a5b4fc';}"
                onmouseout="if(!this.dataset.sel){this.style.background='';this.style.borderColor='#e5e7eb';}"
                ${emSel ? 'data-sel="1"' : ''}>
            ${emSel
              ? '<span style="font-size:11px;font-weight:600;color:#6366f1">✓ New</span>'
              : '<span style="color:#d1d5db;font-size:20px">＋</span>'}
          </div>`;
        }

        h += '</div>';
      });
    });

    h += '</div></div>';
    el.innerHTML = h;
  }

  /* ════════════════════════════════════════════════════════
     renderDay(el, date, opts)
     Day view — Teacher × Hour CSS grid.
     Used by: Calendar page · CRM Schedule modal (day mode)

     opts: {
       sessions?:        override
       dayHeaders?:      override — used to look up holiday/today status
       filterFn?:        fn(session)→bool
       selectable?:      bool — show ＋ in empty class-slot cells (Day view only)
       selectedSlot?:    { slotId, date, teacher, isNew } | null
       onClickSession?:  fn(id, slotId, col)
       onClickEmptyDay?: fn(slotId, date, teacher)
     }
  ════════════════════════════════════════════════════════ */
  function renderDay(el, date, opts) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    opts = opts || {};

    const src      = opts.sessions   || DB.sessions;
    const headers  = opts.dayHeaders || DB.dayHeaders;
    const allFilt  = opts.filterFn ? src.filter(opts.filterFn) : src;
    const filtered = allFilt.filter(s => s.date === date);
    const dh       = headers.find(x => x.date === date) || { label: date, isToday: false, isHoliday: false };
    const N        = CONST.TEACHERS.length;
    const selectable = opts.selectable || false;
    const sel        = opts.selectedSlot || null;

    _cbSession  = opts.onClickSession  || null;
    _cbEmptyDay = opts.onClickEmptyDay || null;

    const rowDefs = TH.map(h => BH[h] ? '36px' : '1fr').join(' ');

    let h = `<div class="cal-fill" style="overflow:auto">
    <div style="display:grid;
      grid-template-columns:70px repeat(${N},minmax(130px,1fr));
      grid-template-rows:42px ${rowDefs};
      min-height:calc(100vh - 310px);
      background:#fff;border:1px solid #e5e7eb;border-radius:10px;
      overflow:hidden;position:relative">`;

    /* Header row */
    h += `<div style="grid-row:1;grid-column:1;background:#f9fafb;
      border-bottom:1px solid #e5e7eb;border-right:1px solid #e5e7eb;
      padding:10px 8px;font-size:11px;color:#6b7280"></div>`;

    CONST.TEACHERS.forEach((t, ti) => {
      const has = filtered.some(s => s.teacher.includes(t));
      h += `<div style="grid-row:1;grid-column:${ti+2};
        background:${has ? '#f5f3ff' : '#f9fafb'};
        border-bottom:1px solid #e5e7eb;border-right:1px solid #f3f4f6;
        padding:10px 8px;font-size:12px;text-align:center;
        font-weight:${has ? '600' : '400'};
        color:${has ? '#6366f1' : '#9ca3af'}">${t}</div>`;
    });

    /* Hour rows */
    TH.forEach((time, ti) => {
      const row = ti + 2, brk = BH[time];
      if (brk) {
        h += `<div style="grid-row:${row};grid-column:1/${N+2};
          background:#f3f4f6;border-bottom:1px solid #e5e7eb;
          display:flex;align-items:center;padding:0 14px;gap:12px">
          <span style="font-size:11px;font-weight:600;color:#6b7280;min-width:42px">${time}</span>
          <span style="font-size:11px;color:#9ca3af;font-style:italic">${brk}</span>
        </div>`;
      } else {
        h += `<div style="grid-row:${row};grid-column:1;
          border-right:1px solid #e5e7eb;border-bottom:1px solid #f3f4f6;
          padding:8px;font-size:11px;color:#9ca3af;
          display:flex;align-items:flex-start">${time}</div>`;
        CONST.TEACHERS.forEach((_, ti2) => {
          h += `<div style="grid-row:${row};grid-column:${ti2+2};
            border-right:1px solid #f3f4f6;border-bottom:1px solid #f3f4f6"></div>`;
        });
      }
    });

    /* Holiday overlay */
    if (dh.isHoliday) {
      h += `<div style="grid-row:2/${TH.length+2};grid-column:2/${N+2};
        background:rgba(254,226,226,.6);display:flex;align-items:center;
        justify-content:center;z-index:2;pointer-events:none">
        <div style="text-align:center;color:#991b1b;font-size:20px;font-weight:700">
          🏖️ วันหยุดราชการ<br>
          <span style="font-size:13px;font-weight:400">ไม่มีคลาส</span>
        </div>
      </div>`;
    } else {
      /* Session blocks */
      filtered.forEach(s => {
        const sh = SH[s.slotId]; if (!sh) return;
        const startRow = ROW_MAP[sh.s];
        const endRow   = ROW_MAP[sh.e] || (ROW_MAP[sh.s] + 2);
        const dot = s.state === 'active' ? '🟢' : s.state === 'ended' ? '✅' : '📅';

        s.teacher.split(',').map(t => t.trim()).forEach(teacher => {
          const col = CONST.TEACHERS.indexOf(teacher) + 2;
          if (col < 2) return;
          h += `<div style="grid-row:${startRow}/${endRow};grid-column:${col};
            ${evStyle(s.color)};padding:10px;cursor:pointer;border-radius:6px;
            margin:3px;overflow:hidden;z-index:1;transition:opacity .15s"
            onclick="CalendarWidget._onSession('${s.id}',${s.slotId},${s.col})"
            onmouseover="this.style.opacity='.8'"
            onmouseout="this.style.opacity='1'">
            <div style="font-weight:600;font-size:13px">${dot} ${s.subject}</div>
            <div style="font-size:11px;opacity:.8;margin-top:4px">${sh.s} – ${sh.e}</div>
            <div style="font-size:11px;opacity:.8">${s.room} · ${s.branch}</div>
            <div style="font-size:11px;opacity:.8;margin-top:2px">👥 ${s.studentNames.length} students</div>
          </div>`;
        });
      });

      /* ── Selectable empty slots (Day view only) ────────── */
      if (selectable) {
        TS.filter(s => s.type === 'class').forEach(slot => {
          const sh = SH[slot.id]; if (!sh || !ROW_MAP[sh.s]) return;
          const startRow = ROW_MAP[sh.s];
          const endRow   = ROW_MAP[sh.e] || (startRow + 2);

          CONST.TEACHERS.forEach((teacher, ti) => {
            const gridCol  = ti + 2;
            const occupied = filtered.some(s =>
              s.slotId === slot.id && s.teacher.split(',').map(t=>t.trim()).includes(teacher)
            );
            if (occupied) return;

            const isSel = sel && sel.isNew && sel.slotId === slot.id
                          && sel.date === date && sel.teacher === teacher;
            const tEncoded = teacher.replace(/'/g, "\\'");

            h += `<div style="grid-row:${startRow}/${endRow};grid-column:${gridCol};
              ${isSel ? 'background:#e0e7ff;border:2px solid #6366f1;'
                      : 'border:1px dashed #e5e7eb;'}
              border-radius:6px;margin:3px;cursor:pointer;z-index:0;
              display:flex;align-items:center;justify-content:center;
              font-size:22px;color:#d1d5db;transition:all .15s"
              onclick="CalendarWidget._onEmptyDay(${slot.id},'${date}','${tEncoded}')"
              onmouseover="if(!this.dataset.sel){this.style.background='#f5f3ff';this.style.borderColor='#a5b4fc';this.style.color='#a5b4fc';}"
              onmouseout="if(!this.dataset.sel){this.style.background='';this.style.borderColor='#e5e7eb';this.style.color='#d1d5db';}"
              ${isSel ? 'data-sel="1"' : ''}>
              ${isSel
                ? '<span style="font-size:12px;font-weight:600;color:#6366f1">✓ New</span>'
                : '＋'}
            </div>`;
          });
        });
      }
    }

    h += '</div></div>';
    el.innerHTML = h;
  }

  /* ════════════════════════════════════════════════════════
     Public API
  ════════════════════════════════════════════════════════ */
  return {
    renderWeek,
    renderDay,

    _onSession(id, slotId, col) {
      if (_cbSession) _cbSession(id, slotId, col);
      else if (typeof openClassModal === 'function') openClassModal(id);
    },
    _onEmpty(slotId, col) {
      if (_cbEmpty) _cbEmpty(slotId, col);
    },
    _onEmptyDay(slotId, date, teacher) {
      if (_cbEmptyDay) _cbEmptyDay(slotId, date, teacher);
    },
  };

})();
