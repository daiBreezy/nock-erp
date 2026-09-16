/* ============================================================
   bus-fee.js — NockERP Traveling (Bus) Fee · per-SESSION
   ------------------------------------------------------------
   Nock flow: Parent เลือก Start learning date → ไล่ทุก session จนจบคอร์ส
   → เลือกต่อ "แต่ละวันจริง" ว่าให้รถ ไปรับ / ไปส่ง / ทั้งคู่ / ไม่มีรถ
   - course ที่เรียนวันเดียวกัน → รวมเป็นรอบเดียว (รับก่อนคลาสแรก · ส่งหลังคลาสสุดท้าย)
   - ข้ามวันหยุด (holiday) — ไม่นับเป็น session
   API: BusFee.compute(courses, {rate, weeks, startDate}) → total (เก็บ state)
        BusFee.render() · BusFee.total() · BusFee.onChange(fn) · BusFee.rows()/sessions()
   courses = [{ code, name, color, entries:[{dow, start, end}] }]
   ============================================================ */
window.BusFee = (function () {

  const DOW_ORDER = { Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6, Sun:7 };
  const DOW_TH    = { Mon:'จันทร์', Tue:'อังคาร', Wed:'พุธ', Thu:'พฤหัส', Fri:'ศุกร์', Sat:'เสาร์', Sun:'อาทิตย์' };
  const IDX_DOW   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];   // getDay() → name
  let _state = null;   // { sessions, rate, weeks, startDate }
  let _cb    = null;

  const toMin = t => { const [h,m] = String(t).split(':').map(Number); return h*60 + (m||0); };
  const fmt   = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
  const isHoliday = iso => (window.DB?.holidays || []).some(h => h.active !== false && h.date === iso);
  const fmtTH = iso => new Date(iso + 'T12:00:00').toLocaleDateString('th-TH', { day:'numeric', month:'short' });

  function defaultStart() {
    const d = new Date(); d.setDate(d.getDate() + 1);   // พรุ่งนี้
    return d.toISOString().slice(0, 10);
  }
  /* วันแรกที่ตรง dow ตั้งแต่ startISO → +7 ไปเรื่อยๆ · ข้ามวันหยุด · เอา count ครั้ง */
  function datesFor(dow, startISO, count) {
    const target = DOW_ORDER[dow] || 1;
    const d = new Date(startISO + 'T12:00:00');
    const cur = ((d.getDay() + 6) % 7) + 1;             // Mon=1..Sun=7
    d.setDate(d.getDate() + ((target - cur + 7) % 7));  // ขยับไปวันแรกที่ตรง
    const out = []; let guard = 0;
    while (out.length < count && guard++ < 400) {
      const iso = d.toISOString().slice(0, 10);
      if (!isHoliday(iso)) out.push(iso);               // วันหยุด = ไม่มีคลาส → ไม่นับ
      d.setDate(d.getDate() + 7);
    }
    return out;
  }

  function compute(courses, opts) {
    opts = opts || {};
    const rate = opts.rate || 100, weeks = opts.weeks || 4, buffer = opts.buffer ?? 30;
    const startISO = opts.startDate || _state?.startDate || defaultStart();
    const prev = {}; (_state?.sessions || []).forEach(s => prev[s.date] = { pickup:s.pickup, dropoff:s.dropoff });

    /* เวลา + course ต่อ day-of-week (ไว้ใช้กับทุก session ของวันนั้น) */
    const byDow = {};
    (courses || []).forEach(c => (c.entries || []).forEach(e => {
      const d = byDow[e.dow] = byDow[e.dow] || { dow:e.dow, courses:{}, min:1e9, max:-1 };
      d.courses[c.code] = { code:c.code, name:c.name, color:c.color };
      d.min = Math.min(d.min, toMin(e.start));
      d.max = Math.max(d.max, toMin(e.end));
    }));

    /* กระจายเป็น session รายวันจริง · วันเดียวกันรวมกัน (ชนวัน = รอบเดียว)
       ⭐ ถ้ามี opts.dates (จาก CourseSched) → ใช้วันจริงนั้น · ไม่งั้น enumerate เอง */
    const map = {};
    const addDate = (iso, d) => {
      const s = map[iso] = map[iso] || { date:iso, courses:{}, min:1e9, max:-1 };
      Object.values(d.courses).forEach(c => s.courses[c.code] = c);
      s.min = Math.min(s.min, d.min); s.max = Math.max(s.max, d.max);
    };
    if (opts.dates && opts.dates.length) {
      /* วัน session จริง — จับคู่กับ day-of-week เพื่อรู้ course/เวลา */
      opts.dates.forEach(iso => {
        const dow = IDX_DOW[new Date(iso + 'T12:00:00').getDay()];
        const d = byDow[dow]; if (d) addDate(iso, d);
      });
    } else {
      Object.values(byDow).forEach(d => datesFor(d.dow, startISO, weeks).forEach(iso => addDate(iso, d)));
    }

    const sessions = Object.values(map).sort((a, b) => a.date.localeCompare(b.date)).map(s => {
      const dow = IDX_DOW[new Date(s.date + 'T12:00:00').getDay()];
      return {
        date: s.date, dow,
        courses: Object.values(s.courses),
        shared: Object.keys(s.courses).length > 1,
        pickupTime:  fmt(Math.max(0, s.min - buffer)),
        dropoffTime: fmt(s.max + buffer),
        pickup:  prev[s.date] ? prev[s.date].pickup  : true,
        dropoff: prev[s.date] ? prev[s.date].dropoff : true,
      };
    });
    _state = { sessions, rate, weeks, startDate: startISO, fromSched: !!(opts.dates && opts.dates.length) };
    return total();
  }

  function total() {
    if (!_state) return 0;
    let trips = 0;
    _state.sessions.forEach(s => { if (s.pickup) trips++; if (s.dropoff) trips++; });
    return trips * _state.rate;
  }

  function badge(c) {
    const col = { blue:'--md-primary', green:'--md-success', orange:'--clr-on-science',
                  purple:'--clr-on-grammar', yellow:'--md-warning' }[c.color] || '--md-primary';
    return `<span title="${c.name}" style="display:inline-flex;align-items:center;justify-content:center;
      min-width:24px;height:18px;padding:0 5px;border-radius:5px;font-size:10px;font-weight:700;
      background:var(${col});color:#fff">${c.code}</span>`;
  }
  const chk = (on, i, which) => `<span onclick="busSessionToggle(${i},'${which}')" style="cursor:pointer;
    display:inline-flex;width:18px;height:18px;border-radius:4px;align-items:center;justify-content:center;
    border:1px solid ${on?'var(--md-primary)':'var(--md-outline)'};background:${on?'var(--md-primary)':'transparent'};
    color:#fff;font-size:12px">${on?'✓':''}</span>`;

  function renderBody() {
    if (!_state || !_state.sessions.length)
      return `<div class="text-muted" style="font-size:12px;padding:8px">เลือกคอร์ส + วันเริ่มเรียนก่อน จะไล่ session ให้</div>`;
    const s = _state.sessions;
    const pk = s.filter(x => x.pickup).length, dp = s.filter(x => x.dropoff).length;
    return `
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px;font-size:11px">
        <span class="text-muted">ตั้งทั้งหมด:</span>
        <button class="btn btn-secondary btn-sm" onclick="busSetAll('both')">รับ+ส่ง</button>
        <button class="btn btn-secondary btn-sm" onclick="busSetAll('pickup')">รับอย่างเดียว</button>
        <button class="btn btn-secondary btn-sm" onclick="busSetAll('dropoff')">ส่งอย่างเดียว</button>
        <button class="btn btn-secondary btn-sm" onclick="busSetAll('none')">ไม่มีรถ</button>
        <span style="margin-left:auto" class="text-muted">${s.length} ครั้ง · รับ ${pk} · ส่ง ${dp}</span>
      </div>
      <div style="max-height:230px;overflow-y:auto;border:1px solid var(--md-outline-variant);border-radius:8px">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="border-bottom:1px solid var(--md-outline-variant);position:sticky;top:0;background:var(--md-surface)">
          <th style="text-align:left;padding:6px 8px;font-size:11px;color:var(--md-on-surface-variant)">วันเรียน (session)</th>
          <th style="text-align:center;padding:6px 8px;font-size:11px;color:var(--md-on-surface-variant);width:48px">ไปรับ</th>
          <th style="text-align:center;padding:6px 8px;font-size:11px;color:var(--md-on-surface-variant);width:48px">ไปส่ง</th>
        </tr></thead>
        <tbody>${s.map((r, i) => `<tr style="border-bottom:1px solid var(--md-outline-variant)">
          <td style="padding:7px 8px">
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              ${r.shared?`<span title="ชนวัน = รอบเดียว" style="color:var(--md-primary)">${UI.icon('link','sm')}</span>`:''}
              <strong>${DOW_TH[r.dow]||r.dow} ${fmtTH(r.date)}</strong>
              ${r.courses.map(badge).join(' ')}
            </div>
            <div class="text-muted" style="font-size:10px;margin-top:2px">
              รับ ${r.pickupTime} → ส่ง ${r.dropoffTime}${r.shared?' · รวมรอบเดียว':''}</div>
          </td>
          <td style="text-align:center;padding:7px 8px">${chk(r.pickup, i, 'pickup')}</td>
          <td style="text-align:center;padding:7px 8px">${chk(r.dropoff, i, 'dropoff')}</td>
        </tr>`).join('')}</tbody></table></div>`;
  }

  function render() {
    return `<div style="border:1px solid var(--md-outline-variant);border-radius:10px;padding:10px 12px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;flex-wrap:wrap">
        <div><div style="font-weight:600;font-size:13px">${UI.icon('directions_bus','sm')} Traveling fee (ค่ารถรับ-ส่ง)</div>
          <div class="text-muted" style="font-size:11px">เรต ${_state?.rate||100}฿/รอบ · เลือก รับ/ส่ง ราย session</div></div>
        ${_state?.fromSched
          ? `<div class="text-muted" style="font-size:11px">${UI.icon('event','sm')} ตามตารางเรียน (${_state.sessions.length} ครั้ง)</div>`
          : `<div style="display:inline-flex;align-items:center;gap:5px;font-size:11px">
              <span class="text-muted">เริ่มเรียน</span>
              <input type="date" value="${_state?.startDate||defaultStart()}" onchange="busSetStartDate(this.value)"
                style="border:1px solid var(--md-outline-variant);border-radius:6px;padding:4px 6px;font-size:12px">
            </div>`}
        <strong id="busfee-total" style="margin-left:auto;font-size:15px">${Utils.currency(total())}</strong>
      </div>
      <div id="busfee-body">${renderBody()}</div>
    </div>`;
  }

  function refreshDom() {
    const body = document.getElementById('busfee-body'); if (body) body.innerHTML = renderBody();
    const tt = document.getElementById('busfee-total'); if (tt) tt.textContent = Utils.currency(total());
    if (typeof _cb === 'function') _cb(total());
  }
  window.busSessionToggle = function (i, which) {
    if (!_state) return; const r = _state.sessions[i]; if (!r) return;
    r[which] = !r[which]; refreshDom();
  };
  window.busSetAll = function (mode) {
    if (!_state) return;
    _state.sessions.forEach(s => {
      s.pickup  = mode === 'both' || mode === 'pickup';
      s.dropoff = mode === 'both' || mode === 'dropoff';
    });
    refreshDom();
  };
  window.busSetStartDate = function (iso) {
    if (!_state) return;
    _state.startDate = iso;
    /* คำนวณ session ใหม่จากวันเริ่ม (คงคอร์สเดิม) — เก็บ selection เดิมที่ตรงวัน */
    const courses = window.BusFee._lastCourses || [];
    compute(courses, { rate:_state.rate, weeks:_state.weeks, startDate:iso });
    refreshDom();
  };

  const api = {
    compute(courses, opts) { api._lastCourses = courses; return compute(courses, opts); },
    total, render,
    onChange(fn) { _cb = fn; },
    rows: () => _state?.sessions || [],
    sessions: () => _state?.sessions || [],
  };
  return api;

})();
