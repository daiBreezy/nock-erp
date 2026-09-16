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
    if (color === 'green')  return 'background:var(--md-success-container);border-left:4px solid var(--md-success);color:var(--md-on-success-container)';
    if (color === 'yellow') return 'background:var(--md-warning-container);border-left:4px solid var(--md-warning);color:var(--md-on-warning-container)';
    if (color === 'orange') return 'background:var(--clr-science);border-left:4px solid var(--clr-on-science);color:var(--clr-on-science)';
    return 'background:var(--md-primary-container);border-left:4px solid var(--md-primary);color:var(--md-on-primary-container)';
  }

  /* ── MINUTE-BASED TIME MATH (Day view) ───────────────────
     รองรับ class ความยาวยืดหยุ่น (Liclass: 30/50/75/90 นาที)
     อ่าน startTime+durationMin จริง · fallback เป็น slot 2h เดิม */
  const DAY_START = 8*60, DAY_END = 20*60, PXMIN = 1.15;
  const DAY_PX = (DAY_END - DAY_START) * PXMIN;
  function toMin(t){ const [h,m] = String(t).split(':').map(Number); return h*60 + (m||0); }
  function fmtMin(min){ const h=Math.floor(min/60), m=min%60; return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`; }
  function evTime(s){
    if (s.startTime && s.durationMin) return { start: toMin(s.startTime), dur: s.durationMin };
    const sh = SH[s.slotId];
    if (sh) { const a = toMin(sh.s); return { start: a, dur: toMin(sh.e) - a }; }
    return { start: DAY_START, dur: 120 };
  }
  function yOf(min){ return (min - DAY_START) * PXMIN; }

  /* ── INCOMING STUDENT DOTS ────────────────────────────── */
  const DOT_CLR = { test:'var(--md-primary)', trial:'var(--clr-on-grammar)', new:'var(--md-success)' };
  function incomingDots(s) {
    if (!s.studentMeta) return '';
    const pairs = Object.entries(s.studentMeta)
      .filter(([,m]) => ['test','trial','new'].includes(m.type) && !m.dismissed);
    if (!pairs.length) return '';
    const shown = pairs.slice(0, 3);
    const more  = pairs.length - 3;
    return `<div style="display:flex;gap:3px;margin-top:3px;align-items:center">
      ${shown.map(([n,m])=>`<span title="${n} (${m.type})" style="width:7px;height:7px;border-radius:50%;
        background:${DOT_CLR[m.type]||'var(--md-primary)'};display:inline-block;flex-shrink:0"></span>`).join('')}
      ${more>0?`<span style="font-size:9px;opacity:.9">+${more}</span>`:''}
    </div>`;
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
        ${d.label}${d.isHoliday ? ` ${UI.icon('beach_access','sm')}` : ''}
      </div>`;
    });

    /* Slot rows */
    TS.forEach(slot => {
      if (slot.type === 'break') {
        h += `<div class="cal-time break-row">${slot.start}</div>`;
        for (let i = 0; i < 7; i++) {
          h += `<div class="cal-cell break-cell">
            <span class="text-muted" style="font-size:9px;padding:0 4px">${i === 0 ? slot.label : ''}</span>
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
          const dot      = s.state === 'active' ? UI.icon('play_circle','sm')+' ' : s.state === 'ended' ? UI.icon('check_circle','sm')+' ' : '';
          let outline = '';
          if      (isSel)    outline = 'outline:2px solid var(--md-primary);outline-offset:1px;';
          else if (isCompat) outline = 'outline:2px solid var(--md-success);outline-offset:1px;';

          h += `<div class="cal-event ${s.color}" style="${outline}cursor:pointer"
                onclick="CalendarWidget._onSession('${s.id}',${slot.id},${col})"
                title="${Utils.subjectLabel(s)} · ${s.teacher}">
            ${dot}${Utils.subjectLabel(s)} · ${s.room}
            <br><span style="font-size:9px;opacity:.8">${UI.icon('person','sm')}${t} · ${s.studentNames.length}${UI.icon('people','sm')}</span>
            ${isCompat && !isSel ? '<br><span style="font-size:9px;color:var(--md-success);font-weight:600">✓ Compatible</span>' : ''}
            ${isSel ? '<br><span style="font-size:9px;color:var(--md-primary);font-weight:600">✓ Selected</span>' : ''}
            ${incomingDots(s)}
          </div>`;
        });

        /* Empty clickable cell */
        if (list.length === 0 && selectable && !d.isHoliday) {
          const emSel = sel && sel.isNew && sel.slotId === slot.id && sel.col === col;
          h += `<div onclick="CalendarWidget._onEmpty(${slot.id},${col})"
                style="height:100%;min-height:44px;cursor:pointer;border-radius:4px;
                  display:flex;align-items:center;justify-content:center;
                  ${emSel ? 'background:var(--md-primary-container);border:2px solid var(--md-primary);'
                           : 'border:1px dashed var(--md-outline-variant);'}
                  transition:all .15s"
                onmouseover="if(!this.dataset.sel){this.style.background='var(--md-primary-container)';this.style.borderColor='var(--md-primary)';}"
                onmouseout="if(!this.dataset.sel){this.style.background='';this.style.borderColor='var(--md-outline-variant)';}"
                ${emSel ? 'data-sel="1"' : ''}>
            ${emSel
              ? '<span style="font-size:11px;font-weight:600;color:var(--md-primary)">✓ New</span>'
              : '<span style="color:var(--md-outline);font-size:20px">＋</span>'}
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

    const colMinW = 130;
    const colsW   = N * colMinW;
    const teachersOf = s => s.teacher.split(',').map(t => t.trim());

    /* ── HEADER (sticky) — teacher columns ──────────────── */
    let h = `<div class="cal-fill" style="overflow:auto;
      background:var(--md-surface-lowest);border:1px solid var(--md-outline-variant);border-radius:10px">
      <div style="display:flex;position:sticky;top:0;z-index:5;background:var(--md-surface-low);
        border-bottom:1px solid var(--md-outline-variant)">
        <div style="width:60px;flex-shrink:0;border-right:1px solid var(--md-outline-variant)"></div>
        <div style="flex:1;display:flex;min-width:${colsW}px">
          ${CONST.TEACHERS.map(t => {
            const has = filtered.some(s => s.teacher.includes(t));
            return `<div style="flex:1;min-width:${colMinW}px;padding:10px 6px;text-align:center;font-size:12px;
              border-left:1px solid var(--md-surface-mid);
              background:${has ? 'var(--md-primary-container)' : 'var(--md-surface-low)'};
              font-weight:${has ? '600' : '400'};
              color:${has ? 'var(--md-primary)' : 'var(--md-on-surface-variant)'}">${t}</div>`;
          }).join('')}
        </div>
      </div>`;

    /* ── BODY — time gutter + minute-positioned columns ──── */
    h += `<div style="display:flex">
      <div style="width:60px;flex-shrink:0;position:relative;height:${DAY_PX}px;
        border-right:1px solid var(--md-outline-variant)">`;
    for (let hr = 8; hr <= 20; hr++) {
      h += `<div style="position:absolute;top:${yOf(hr*60)}px;right:6px;transform:translateY(-7px);
        font-size:10px;color:var(--md-on-surface-variant)">${fmtMin(hr*60)}</div>`;
    }
    h += `</div>
      <div style="flex:1;display:flex;position:relative;height:${DAY_PX}px;min-width:${colsW}px">`;

    /* hour gridlines (full width) */
    for (let hr = 8; hr <= 20; hr++) {
      h += `<div style="position:absolute;left:0;right:0;top:${yOf(hr*60)}px;
        border-top:1px solid var(--md-surface-mid);pointer-events:none"></div>`;
    }

    /* break shading */
    (TS || []).filter(s => s.type === 'break').forEach(b => {
      const top = yOf(toMin(b.start)), ht = (toMin(b.end) - toMin(b.start)) * PXMIN;
      h += `<div style="position:absolute;left:0;right:0;top:${top}px;height:${ht}px;
        background:var(--md-surface-mid);opacity:.45;pointer-events:none"></div>`;
    });

    /* teacher columns */
    CONST.TEACHERS.forEach((teacher, ti) => {
      h += `<div style="flex:1;min-width:${colMinW}px;position:relative;
        border-left:1px solid var(--md-surface-mid)">`;

      if (!dh.isHoliday) {
        /* selectable empty class-slots (positioned by minute) */
        if (selectable) {
          (TS || []).filter(x => x.type === 'class').forEach(slot => {
            const sh = SH[slot.id]; if (!sh) return;
            const occupied = filtered.some(s => s.slotId === slot.id && teachersOf(s).includes(teacher));
            if (occupied) return;
            const top = yOf(toMin(sh.s)), ht = (toMin(sh.e) - toMin(sh.s)) * PXMIN - 4;
            const isSel = sel && sel.isNew && sel.slotId === slot.id && sel.date === date && sel.teacher === teacher;
            const tEnc = teacher.replace(/'/g, "\\'");
            h += `<div style="position:absolute;top:${top}px;left:3px;right:3px;height:${ht}px;z-index:0;
              border-radius:6px;cursor:pointer;display:flex;align-items:center;justify-content:center;
              transition:all .15s;${isSel ? 'background:var(--md-primary-container);border:2px solid var(--md-primary)' : 'border:1px dashed transparent'}"
              onclick="CalendarWidget._onEmptyDay(${slot.id},'${date}','${tEnc}')"
              ${isSel ? 'data-sel="1"' : ''}
              onmouseover="if(!this.dataset.sel){this.style.background='var(--md-primary-container)';this.style.borderColor='var(--md-primary)';this.querySelector('.slot-hint').style.opacity='1';}"
              onmouseout="if(!this.dataset.sel){this.style.background='';this.style.borderColor='transparent';this.querySelector('.slot-hint').style.opacity='0';}">
              ${isSel ? '<span style="font-size:12px;font-weight:600;color:var(--md-primary)">✓ New</span>'
                : `<span class="slot-hint" style="opacity:0;transition:opacity .15s;font-size:10px;
                    font-weight:600;color:var(--md-primary);pointer-events:none">＋ Create</span>`}
            </div>`;
          });
        }

        /* session blocks (positioned + sized by minute) */
        filtered.filter(s => teachersOf(s).includes(teacher)).forEach(s => {
          const { start, dur } = evTime(s);
          const top = yOf(start), ht = Math.max(dur * PXMIN - 3, 22);
          const dot = s.state === 'active' ? UI.icon('play_circle','sm')
                    : s.state === 'ended'  ? UI.icon('check_circle','sm') : UI.icon('event','sm');
          const slotArg = (s.slotId === undefined || s.slotId === null) ? 'null' : s.slotId;
          h += `<div style="position:absolute;top:${top}px;left:3px;right:3px;height:${ht}px;z-index:2;
            ${evStyle(s.color)};border-radius:6px;padding:5px 8px;cursor:pointer;overflow:hidden;transition:opacity .15s"
            onclick="CalendarWidget._onSession('${s.id}',${slotArg},${s.col})"
            onmouseover="this.style.opacity='.82'" onmouseout="this.style.opacity='1'">
            <div style="font-weight:600;font-size:12px;line-height:1.25">${dot} ${Utils.subjectLabel(s)}</div>
            <div style="font-size:10px;opacity:.85">${fmtMin(start)}–${fmtMin(start+dur)} · ${dur}m</div>
            ${ht > 50 ? `<div style="font-size:10px;opacity:.85">${s.room} · ${UI.icon('group','sm')} ${s.studentNames.length}</div>` : ''}
            ${ht > 64 ? incomingDots(s) : ''}
          </div>`;
        });
      }

      h += `</div>`;
    });

    /* holiday overlay across all columns */
    if (dh.isHoliday) {
      h += `<div style="position:absolute;left:0;right:0;top:0;height:${DAY_PX}px;z-index:4;
        background:var(--md-error-container);opacity:.85;display:flex;align-items:center;justify-content:center;
        pointer-events:none">
        <div style="text-align:center;color:var(--md-on-error-container);font-size:20px;font-weight:700">
          ${UI.icon('beach_access')} วันหยุดราชการ<br>
          <span style="font-size:13px;font-weight:400">ไม่มีคลาส</span>
        </div>
      </div>`;
    }

    h += `</div></div></div>`;
    el.innerHTML = h;
  }

  /* ════════════════════════════════════════════════════════
     Public API
  ════════════════════════════════════════════════════════ */
  return {
    renderWeek,
    renderDay,
    incomingDots,

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
