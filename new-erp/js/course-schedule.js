/* ============================================================
   course-schedule.js — window.CourseSched
   Shared: เลือกคลาส + วันเริ่มเรียน + คำนวณวันจบ ต่อ 1 course line
   ใช้ใน Billing ▸ New Invoice (และหน้าอื่นที่ต้องตอบผู้ปกครองสดๆ)

   Single course : เสนอคลาสที่ courseId ตรงกัน (สาขาเด็กขึ้นก่อน)
   Bundle course : จัดคลาสเป็น "รอบ" ตามวัน (Sat / Sun) — เลือกได้รอบเดียว
                   เรียนสัปดาห์ละครั้ง · 1 block = billingBlockSize ครั้ง
   ============================================================ */
(function () {

  const DOW      = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];   // index = Date.getDay()
  const DOW_SORT = { Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6, Sun:7 };
  const DOW_TH   = { Mon:'จ.', Tue:'อ.', Wed:'พ.', Thu:'พฤ.', Fri:'ศ.', Sat:'ส.', Sun:'อา.' };
  const SEAT_CAP = 6;                       // soft limit ต่อคลาสกลุ่ม (BUSINESS-RULES)

  /* ── DATE HELPERS (local noon กัน timezone เพี้ยน) ───────── */
  const d2s  = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const s2d  = s => new Date(String(s) + 'T12:00:00');
  const addD = (s, n) => { const d = s2d(s); d.setDate(d.getDate()+n); return d2s(d); };
  const today = () => d2s(new Date());

  function holidayOn(dateStr) {
    return (DB.holidays||[]).find(h => h.active !== false && h.date === dateStr) || null;
  }
  function fmtTH(dateStr) {
    if (!dateStr) return '—';
    return s2d(dateStr).toLocaleDateString('th-TH',
      { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  }
  function endTime(startTime, duration) {
    const [h,m] = String(startTime||'10:00').split(':').map(Number);
    return `${String(h + (duration||2)).padStart(2,'0')}:${String(m||0).padStart(2,'0')}`;
  }

  /* วันเรียนถัดไปนับจาก `from` (รวม from) ที่ตรง days และไม่ใช่วันหยุด */
  function nextClassDate(days, from) {
    let cur = from || today();
    for (let i = 0; i < 400; i++) {
      const dow = DOW[s2d(cur).getDay()];
      if (days.includes(dow) && !holidayOn(cur)) return cur;
      cur = addD(cur, 1);
    }
    return from || today();
  }

  /* ไล่วันเรียนจริง `count` ครั้ง — วันหยุดถูกข้าม (เก็บไว้ใน skipped) */
  function projectDates(days, startDate, count) {
    const dates = [], skipped = [];
    let cur = startDate;
    for (let i = 0; i < 800 && dates.length < count; i++) {
      const dow = DOW[s2d(cur).getDay()];
      if (days.includes(dow)) {
        const hol = holidayOn(cur);
        if (hol) skipped.push({ date:cur, name:hol.name });
        else dates.push(cur);
      }
      cur = addD(cur, 1);
    }
    return { dates, skipped };
  }

  /* ── COURSE / CLASS LOOKUP ───────────────────────────────── */
  const isBundle = c => !!c && (c.courseType === 'bundle' || c.type === 'bundle');

  function classesFor(courseId, branch) {
    const all = (DB.classes||[]).filter(c => c.courseId === courseId && c.status !== 'archived');
    if (!branch) return all;
    const mine = all.filter(c => c.branch === branch);
    return mine.length ? mine : all;     // ไม่มีในสาขาตัวเอง → เสนอสาขาอื่นแทนที่จะว่างเปล่า
  }

  /* รอบเรียน: single = 1 คลาส/รอบ · bundle = ทุกวิชาในวันเดียวกัน = 1 รอบ */
  function roundsFor(course, branch) {
    const cls = classesFor(course.id, branch);
    if (!isBundle(course)) {
      return cls.map(c => ({
        id: c.id, days: c.days || [], classes: [c],
        seats: seatInfo(c), branch: c.branch,
      }));
    }
    const byDay = {};
    cls.forEach(c => (c.days||[]).forEach(d => (byDay[d] = byDay[d] || []).push(c)));
    return Object.keys(byDay)
      .sort((a,b) => (DOW_SORT[a]||9) - (DOW_SORT[b]||9))
      .map(day => {
        const list = byDay[day].slice().sort((a,b) => String(a.startTime).localeCompare(String(b.startTime)));
        return { id:'day-'+day, days:[day], classes:list, seats:seatInfo(list[0]), branch:list[0]?.branch };
      });
  }

  function seatInfo(cls) {
    const used = (cls?.students || []).length;
    return { used, cap: SEAT_CAP, full: used >= SEAT_CAP, left: Math.max(0, SEAT_CAP - used) };
  }

  /* จำนวนครั้งที่ต้องเรียน */
  function meetingsNeeded(course, round, blocks) {
    if (isBundle(course)) return (course.billingBlockSize || 4) * (blocks || 1);
    const hours = (course.subjects||[]).reduce((s,x) => s + (x.hours||0), 0) || 24;
    const dur   = round?.classes?.[0]?.duration || 2;
    return Math.max(1, Math.round(hours / dur));
  }

  /* ชนกับคลาสเดิมของนักเรียนคนนี้ไหม (วันเดียวกัน + เวลาเหลื่อมกัน) */
  function conflictsFor(stu, round) {
    if (!stu || !round) return [];
    const mine = (DB.classes||[]).filter(c => (c.students||[]).includes(stu.name));
    const out  = [];
    round.classes.forEach(nc => {
      const nS = nc.startTime, nE = endTime(nc.startTime, nc.duration);
      mine.forEach(oc => {
        if (round.classes.some(x => x.id === oc.id)) return;
        const sameDay = (oc.days||[]).some(d => (nc.days||[]).includes(d));
        if (!sameDay) return;
        const oS = oc.startTime, oE = endTime(oc.startTime, oc.duration);
        if (nS < oE && oS < nE) out.push({ day:(oc.days||[]).find(d => (nc.days||[]).includes(d)), other:oc, mineCls:nc });
      });
    });
    return out;
  }

  /* Bundle เข้ากลางคัน → ตอนนี้คลาสเรียนถึงครั้งที่เท่าไหร่ */
  function lessonNoAt(course, round, dateStr) {
    if (!isBundle(course) || !course.bundleStartDate) return null;
    const from = nextClassDate(round.days, course.bundleStartDate);
    let n = 0, cur = from;
    for (let i = 0; i < 800 && cur <= dateStr; i++) {
      if (round.days.includes(DOW[s2d(cur).getDay()]) && !holidayOn(cur)) n++;
      cur = addD(cur, 1);
    }
    return n;
  }

  /* ── STATE (ต่อ line uid) ────────────────────────────────── */
  const state = {};
  function get(uid) { return state[uid] || (state[uid] = { roundId:null, startDate:null, blocks:1, days:null }); }

  /* ความถี่ต่อสัปดาห์ — 1 ครั้ง/สัปดาห์ = ปกติ · 2 ครั้ง = เร่ง (ช่วงก่อนสอบ)
     คลาสอาจเปิดหลายวัน (เช่น อ./พ./พฤ./ส.) แต่นักเรียน 1 คนเลือกได้สูงสุด 2 วัน */
  const MAX_PER_WEEK = 2;

  /* ── CORE: คำนวณข้อมูลทั้งหมดของ 1 line ─────────────────── */
  function resolve(uid, courseId, branch, stu) {
    const course = (DB.courses||[]).find(c => c.id === courseId);
    if (!course) return null;
    const st     = get(uid);
    const rounds = roundsFor(course, branch);
    if (!rounds.length) return { course, rounds:[], empty:true };

    let round = rounds.find(r => r.id === st.roundId);
    if (!round) { round = rounds.find(r => !r.seats.full) || rounds[0]; st.roundId = round.id; }

    /* วันที่นักเรียนคนนี้จะมาเรียนจริง (ไม่จำเป็นต้องทุกวันที่คลาสเปิด)
       Bundle = ล็อกสัปดาห์ละครั้งตามรอบ · Single = เลือกได้ 1–2 วันจากวันที่คลาสเปิด */
    const openDays = round.days || [];
    let myDays;
    if (isBundle(course)) {
      myDays = openDays.slice(0, 1);
    } else {
      myDays = (st.days || []).filter(d => openDays.includes(d));
      if (!myDays.length) myDays = openDays.slice(0, 1);          // default = สัปดาห์ละ 1 ครั้ง
      myDays = openDays.filter(d => myDays.includes(d));           // เรียงตามลำดับวันของคลาส
      st.days = myDays;
    }

    const earliest = isBundle(course) && course.bundleStartDate && course.bundleStartDate > today()
      ? course.bundleStartDate : today();
    if (!st.startDate || st.startDate < earliest) st.startDate = nextClassDate(myDays, earliest);
    /* ผู้ใช้เลื่อนวันไปตกวันที่ไม่ได้เรียน → ขยับไปวันเรียนถัดไปให้ */
    const startDate = nextClassDate(myDays, st.startDate);

    const meetings = meetingsNeeded(course, round, st.blocks);
    const proj     = projectDates(myDays, startDate, meetings);

    return {
      course, rounds, round, startDate, meetings,
      blocks:   st.blocks,
      openDays, myDays,
      endDate:  proj.dates[proj.dates.length-1] || startDate,
      skipped:  proj.skipped,
      perWeek:  myDays.length,
      isBundle: isBundle(course),
      lessonNo: lessonNoAt(course, round, startDate),
      conflicts: conflictsFor(stu, round),
      classIds: round.classes.map(c => c.id),
      days: myDays,
    };
  }

  /* ── RENDER ──────────────────────────────────────────────── */
  function roundLabel(info, r) {
    const c = r.classes[0];
    if (info.isBundle) {
      return `${DOW_TH[r.days[0]]||r.days[0]} · ${r.classes.length} วิชา`;
    }
    return `${(r.days||[]).map(d => DOW_TH[d]||d).join('+')} ${c.startTime}-${endTime(c.startTime,c.duration)}`;
  }

  function render(uid, info) {
    if (!info) return '';
    if (info.empty) {
      return `<div class="cs-box cs-warn">
        ${UI.icon('event_busy','sm')} <b>ยังไม่มีคลาสรองรับคอร์สนี้</b>
        <div class="text-muted" style="font-size:11px;margin-top:2px">
          ต้องสร้างคลาสก่อนถึงจะระบุวันเริ่มเรียนได้</div>
        <button class="btn btn-secondary btn-sm" style="margin-top:8px"
          onclick="csGoCreateClass('${info.course?.id||''}')">
          ${UI.icon('add','sm')} สร้างคลาสใหม่</button>
      </div>`;
    }
    const { round, rounds, startDate, endDate, meetings, skipped, conflicts } = info;

    /* เลือกรอบ / คลาส */
    const picker = rounds.map(r => {
      const c   = r.classes[0];
      const on  = r.id === round.id;
      const seat = r.seats.full
        ? `<span class="badge badge-red" style="font-size:9px">เต็ม ${r.seats.used}/${r.seats.cap}</span>`
        : `<span class="text-muted" style="font-size:11px">${r.seats.used}/${r.seats.cap} คน</span>`;
      return `<label class="cs-round${on?' on':''}${r.seats.full?' full':''}">
        <input type="radio" name="cs-${uid}" ${on?'checked':''} ${r.seats.full?'disabled':''}
          onchange="csPickRound('${uid}','${r.id}')">
        <span style="flex:1">
          <b style="font-size:12px">${roundLabel(info, r)}</b>
          <span class="text-muted" style="font-size:11px"> · ${c.teacher||'—'} · ${c.room||'—'}${
            r.branch ? ' · '+r.branch : ''}</span>
        </span>${seat}</label>`;
    }).join('');

    /* Bundle: ตารางวิชาในรอบที่เลือก */
    const subjRows = info.isBundle ? `
      <div class="cs-subj">
        ${round.classes.map(c => `<div>
          <span class="text-muted">${c.startTime}-${endTime(c.startTime,c.duration)}</span>
          <b>${c.subject}</b>
          <span class="text-muted">· ${c.teacher||'—'}</span></div>`).join('')}
      </div>` : '';

    /* Single: ความถี่ต่อสัปดาห์ — ปกติ 1 ครั้ง · 2 ครั้ง = เรียนถี่ขึ้น หมดคอร์สเร็วขึ้น
       (คลาสเปิดหลายวัน ไม่ได้แปลว่านักเรียนต้องมาทุกวัน) */
    /* Single: ความถี่ต่อสัปดาห์ — chip โชว์ "วัน + เวลา" ให้ Admin อ่านให้ผู้ปกครองฟังได้เลย
       เลือกอยู่ = เข้ม + ติ๊ก · กดวันที่เลือกอยู่เพื่อเอาออก · สูงสุด 2 วัน/สัปดาห์ */
    const c0 = round.classes[0];
    const tmLabel = `${c0.startTime}-${endTime(c0.startTime, c0.duration)}`;
    const freqPick = !info.isBundle && info.openDays.length > 1 ? `
      <div style="padding:4px 0">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span class="cs-lbl">${UI.icon('repeat','sm')} วันที่มาเรียน</span>
          <b style="font-size:12px">สัปดาห์ละ ${info.perWeek} ครั้ง</b>
          ${info.perWeek>1?'<span class="badge badge-purple" style="font-size:9px">เร่ง · หมดคอร์สเร็วขึ้น</span>':''}
          <span class="text-muted" style="font-size:11px;margin-left:auto">เลือกได้สูงสุด ${MAX_PER_WEEK} วัน</span>
        </div>
        <div class="cs-days">
          ${info.openDays.map(d => {
            const on   = info.myDays.includes(d);
            const lock = on && info.myDays.length === 1;      // เหลือวันเดียว ปิดไม่ได้
            const full = !on && info.myDays.length >= MAX_PER_WEEK;
            return `<button class="cs-daychip${on?' on':''}" ${lock||full?'disabled':''}
              title="${lock?'ต้องมีอย่างน้อย 1 วัน':full?`เลือกได้สูงสุด ${MAX_PER_WEEK} วัน/สัปดาห์`:on?'กดเพื่อเอาออก':'กดเพื่อเลือก'}"
              onclick="csToggleDay('${uid}','${d}')">
              <b>${DOW_TH[d]||d}</b><span>${tmLabel}</span>${on?UI.icon('check','sm'):''}
            </button>`;
          }).join('')}
        </div>
      </div>` : '';

    /* Bundle: จำนวน block */
    const blockPick = info.isBundle ? `
      <div class="cs-row">
        <span class="cs-lbl">${UI.icon('layers','sm')} จำนวน block</span>
        <span style="display:flex;gap:4px">
          ${[1,2,3].map(n => `<button class="btn btn-sm ${n===info.blocks?'btn-primary':'btn-secondary'}"
            onclick="csSetBlocks('${uid}',${n})">${n}</button>`).join('')}
        </span>
        <span class="text-muted" style="font-size:11px">
          ${info.course.billingBlockSize||4} ครั้ง/block · สัปดาห์ละครั้ง</span>
      </div>` : '';

    const holNote = skipped.length
      ? `<div class="text-muted" style="font-size:11px;margin-top:2px">
           ${UI.icon('beach_access','sm')} ข้ามวันหยุด ${skipped.length} ครั้ง —
           ${skipped.slice(0,2).map(h => `${fmtTH(h.date)} (${h.name})`).join(' · ')}${skipped.length>2?' …':''}</div>`
      : '';

    const conflictNote = conflicts.length
      ? `<div class="cs-box cs-warn" style="margin-top:8px">
           ${UI.icon('warning','sm')} <b>ชนกับคลาสเดิม</b>
           ${conflicts.map(x => `<div style="font-size:11px">${DOW_TH[x.day]||x.day} ${x.mineCls.startTime} ชนกับ ${x.other.name}</div>`).join('')}
         </div>`
      : '';

    const lessonNote = info.isBundle && info.lessonNo > 1
      ? `<span class="badge badge-purple" style="font-size:9px;margin-left:6px">เข้าที่ครั้งที่ ${info.lessonNo}</span>`
      : '';

    return `<div class="cs-box">
      ${picker}
      ${subjRows}
      ${freqPick}
      ${blockPick}
      <div class="cs-row">
        <span class="cs-lbl">${UI.icon('event','sm')} เริ่มเรียน</span>
        <input type="date" class="form-input cs-date" value="${startDate}"
          min="${today()}" onchange="csSetStart('${uid}', this.value)">
        <span class="text-muted" style="font-size:11px">${fmtTH(startDate)}${lessonNote}</span>
      </div>
      <div class="cs-row">
        <span class="cs-lbl">${UI.icon('event_available','sm')} เรียนจบ</span>
        <b style="font-size:12px">${fmtTH(endDate)}</b>
        <span class="text-muted" style="font-size:11px">${meetings} ครั้ง · สัปดาห์ละ ${info.perWeek} ครั้ง</span>
      </div>
      ${holNote}${conflictNote}
    </div>`;
  }

  /* ── GLOBAL HANDLERS (onclick/onchange) ──────────────────── */
  window.csPickRound = function(uid, roundId) {
    const st = get(uid); st.roundId = roundId; st.startDate = null;   // รอบใหม่ = คำนวณวันเริ่มใหม่
    window.niRecalc?.();
  };
  window.csSetStart = function(uid, val) { get(uid).startDate = val; window.niRecalc?.(); };
  window.csToggleDay = function(uid, d) {
    const st = get(uid); const cur = st.days || [];
    if (cur.includes(d)) { if (cur.length <= 1) return; st.days = cur.filter(x => x !== d); }
    else { if (cur.length >= MAX_PER_WEEK) return; st.days = cur.concat(d); }
    st.startDate = null;                      // ความถี่เปลี่ยน → คำนวณวันเริ่ม/วันจบใหม่
    window.niRecalc?.();
  };
  window.csSetBlocks = function(uid, n)  { get(uid).blocks = n;      window.niRecalc?.(); };
  window.csGoCreateClass = function(courseId) {
    Modal.closeAll?.();
    window.showView?.('classes');
    showToast('เปิดหน้า Classes — สร้างคลาสให้คอร์สนี้ก่อน แล้วกลับมาออกบิล', 'info');
  };

  /* ── EXPORT ──────────────────────────────────────────────── */
  window.CourseSched = {
    resolve, render, get, isBundle, seatInfo, roundsFor,
    nextClassDate, projectDates, holidayOn, fmtTH, endTime, meetingsNeeded,
    reset: () => Object.keys(state).forEach(k => delete state[k]),
  };

})();
