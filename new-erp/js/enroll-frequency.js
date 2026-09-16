/* ============================================================
   enroll-frequency.js — window.EnrollFreq
   ปรับ "ความถี่ต่อสัปดาห์" ของ enrollment ที่เรียนอยู่แล้ว

   เคสจริง: ปกติเรียนสัปดาห์ละ 1 ครั้ง · ใกล้สอบผู้ปกครองขอเพิ่มเป็น 2 ครั้ง/สัปดาห์
     - ถาวร      → enr.days = วันใหม่ (ใช้ไปจนจบคอร์ส)
     - ชั่วคราว   → enr.boost = { days, from, to }  (พ้นช่วงแล้วกลับวันเดิมเอง)

   ⚠️ สมมติฐาน (รอ Nock ยืนยัน): เรียนถี่ขึ้น = ใช้ชั่วโมงในแพ็กเกจเร็วขึ้น
      → ไม่คิดเงินเพิ่ม แต่คอร์สจบเร็วขึ้น (ต้องต่อคอร์สเร็วขึ้น)
   ============================================================ */
(function () {

  const CS      = () => window.CourseSched;
  const DOW_TH  = { Mon:'จ.', Tue:'อ.', Wed:'พ.', Thu:'พฤ.', Fri:'ศ.', Sat:'ส.', Sun:'อา.' };
  const MAX     = 2;
  const today   = () => new Date().toISOString().slice(0,10);
  const enrById = id => (DB.enrollments||[]).find(e => e.id === id);
  const clsOf   = enr => (DB.classes||[]).find(c => c.id === enr?.classId);

  let _mode = 'move', _boost = [], _moveFrom = null, _moveTo = null,
      _from = '', _to = '', _curEnr = null;

  /* วันเรียนประจำของ enrollment (ใบเก่าไม่มี days = มาทุกวันที่คลาสเปิด) */
  function daysOf(enr) {
    const cls = clsOf(enr);
    return (Array.isArray(enr?.days) && enr.days.length) ? enr.days : (cls?.days || []);
  }

  /* ครั้งที่เหลือ + วันจบ ถ้าใช้ชุดวัน `days` */
  function projectEnd(enr, days, fromDate) {
    const cls  = clsOf(enr);
    const dur  = cls?.duration || 2;
    const left = Math.max(0, Math.round((enr.remainHours || 0) / dur));
    if (!left || !days.length) return { left, endDate:null };
    const start = CS().nextClassDate(days, fromDate || today());
    const proj  = CS().projectDates(days, start, left);
    return { left, endDate: proj.dates[proj.dates.length-1] || start, skipped:proj.skipped };
  }

  /* ── MODAL ───────────────────────────────────────────────── */
  window.openFreqModal = function(enrId) {
    const enr = enrById(enrId); if (!enr) { showToast('ไม่พบ enrollment','error'); return; }
    _curEnr = enrId;
    const cls = clsOf(enr);
    if (!cls) { showToast('enrollment นี้ยังไม่ผูกกับคลาส','error'); return; }
    _mode     = 'move';
    _boost    = (enr.boost?.days || []).slice();
    _moveFrom = daysOf(enr)[0] || null;
    _moveTo   = null;
    _from     = enr.boost?.from || today();
    _to       = enr.boost?.to   || '';
    Modal.create('modal-freq', `${UI.icon('repeat')} ปรับรอบเรียน · ${enr.subject||cls.subject}`,
      body(enr, cls),
      `<button class="btn btn-secondary" onclick="Modal.close('modal-freq')">Cancel</button>
       <button class="btn btn-primary" onclick="freqApply('${enrId}')">
         ${UI.icon('check','sm')} บันทึก</button>`);
  };
  /* ── UI HELPERS ──────────────────────────────────────────── */
  const timeOf = cls => `${cls.startTime}-${window.CourseSched.endTime(cls.startTime, cls.duration)}`;

  /* chip วัน+เวลา — ใช้ทั้งฝั่ง "จาก" และ "ไป" */
  function dayChip(d, time, opt) {
    opt = opt || {};
    return `<button class="cs-daychip${opt.on?' on':''}${opt.ghost?' ghost':''}"
      ${opt.disabled?'disabled':''} ${opt.title?`title="${opt.title}"`:''}
      ${opt.onclick?`onclick="${opt.onclick}"`:'style="cursor:default"'}>
      <b>${DOW_TH[d]||d}</b><span>${time}</span>${opt.on?UI.icon('check','sm'):''}
    </button>`;
  }

  function body(enr, cls) {
    const open = cls.days || [];
    const cur  = daysOf(enr);
    const time = timeOf(cls);
    const now  = projectEnd(enr, cur);

    /* วันปลายทางที่เลือกไว้ในแต่ละโหมด */
    const nextDays =
      _mode === 'move'  ? (_moveTo ? cur.map(d => d === _moveFrom ? _moveTo : d) : cur)
    : _mode === 'add'   ? Array.from(new Set(cur.concat(_boost)))
    :                     Array.from(new Set(cur.concat(_boost)));   // boost
    const after = projectEnd(enr, nextDays);

    const head = `
      <div class="cs-box" style="margin-top:0;margin-bottom:12px">
        <div class="cs-row"><span class="cs-lbl">คลาส</span>
          <b style="font-size:12px">${cls.name||cls.subject}</b>
          <span class="text-muted" style="font-size:11px">${cls.teacher||''} · ${cls.room||''}</span></div>
        <div class="cs-row"><span class="cs-lbl">ตอนนี้เรียน</span>
          <span class="cs-days" style="margin:0">
            ${cur.map(d => dayChip(d, time, { on:true })).join('')}</span>
          <span class="text-muted" style="font-size:11px">สัปดาห์ละ ${cur.length} ครั้ง ·
            เหลือ ${enr.remainHours||0}h (${now.left} ครั้ง) · จบ ${CS().fmtTH(now.endDate)}</span></div>
      </div>

      <div class="tabs" style="margin-bottom:12px">
        <div class="tab ${_mode==='move' ?'active':''}" onclick="freqMode('move')">ย้ายวัน</div>
        <div class="tab ${_mode==='add'  ?'active':''}" onclick="freqMode('add')">เพิ่มรอบถาวร</div>
        <div class="tab ${_mode==='boost'?'active':''}" onclick="freqMode('boost')">เพิ่มรอบชั่วคราว (ก่อนสอบ)</div>
      </div>`;

    const free = open.filter(d => !cur.includes(d));

    /* ── โหมดย้ายวัน: จาก → ไป (จำนวนครั้ง/สัปดาห์เท่าเดิม) ── */
    if (_mode === 'move') {
      const from = _moveFrom || cur[0];
      const body_ = `
        <div class="text-muted" style="font-size:12px;margin-bottom:10px">
          ${UI.icon('info','sm')} เปลี่ยนวันเรียน — สัปดาห์ละ ${cur.length} ครั้งเท่าเดิม ไม่กระทบชั่วโมงคงเหลือ</div>
        <div class="cs-move">
          <div>
            <div class="cs-move-lbl">จาก</div>
            <div class="cs-days">${cur.map(d => dayChip(d, time, {
              on: d === from, onclick:`freqMoveFrom('${d}')`,
              title: cur.length>1?'เลือกวันที่จะย้าย':'' })).join('')}</div>
          </div>
          <div class="cs-move-arrow">${UI.icon('arrow_forward','md')}</div>
          <div>
            <div class="cs-move-lbl">ย้ายไป</div>
            <div class="cs-days">${free.length
              ? free.map(d => dayChip(d, time, { on:d===_moveTo, onclick:`freqMoveTo('${d}')` })).join('')
              : '<span class="text-muted" style="font-size:12px">คลาสนี้เปิดวันเดียว — ย้ายวันไม่ได้ (ต้องย้ายคลาส)</span>'}</div>
          </div>
        </div>`;
      return head + body_ + endNote(enr, now, after, false);
    }

    /* ── โหมดเพิ่มรอบ (ถาวร / ชั่วคราว) ── */
    const isBoost = _mode === 'boost';
    const cap = cur.length + _boost.length >= MAX;
    const body_ = `
      <div class="text-muted" style="font-size:12px;margin-bottom:10px">
        ${UI.icon('info','sm')} ${isBoost
          ? `เพิ่มวันเรียนเฉพาะช่วง — พ้นช่วงแล้วกลับไปเรียน <b>${cur.map(d=>DOW_TH[d]||d).join('+')}</b> เหมือนเดิมอัตโนมัติ`
          : `เพิ่มวันเรียนถาวร — ใช้ไปจนจบคอร์ส (สูงสุด ${MAX} วัน/สัปดาห์)`}</div>
      <div class="cs-move">
        <div>
          <div class="cs-move-lbl">เรียนอยู่</div>
          <div class="cs-days">${cur.map(d => dayChip(d, time, { on:true, ghost:true })).join('')}</div>
        </div>
        <div class="cs-move-arrow">${UI.icon('add','md')}</div>
        <div>
          <div class="cs-move-lbl">เพิ่มวัน</div>
          <div class="cs-days">${free.length
            ? free.map(d => dayChip(d, time, {
                on:_boost.includes(d), disabled: !_boost.includes(d) && cap,
                title: !_boost.includes(d) && cap ? `เลือกได้สูงสุด ${MAX} วัน/สัปดาห์` : '',
                onclick:`freqToggleBoost('${d}')` })).join('')
            : '<span class="text-muted" style="font-size:12px">คลาสนี้เปิดวันเดียว — เพิ่มวันไม่ได้</span>'}</div>
        </div>
      </div>
      ${isBoost ? `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px">
          <div><label class="field-label">เริ่ม</label>
            <input type="date" id="fq-from" class="form-input" style="width:100%" value="${_from}"
              onchange="freqDate('from',this.value)"></div>
          <div><label class="field-label">ถึง (วันสอบ)</label>
            <input type="date" id="fq-to" class="form-input" style="width:100%" value="${_to}"
              onchange="freqDate('to',this.value)"></div>
        </div>` : ''}`;
    return head + body_ + endNote(enr, now, after, !isBoost && _boost.length>0);
  }

  /* กล่องบอกผลกระทบ — วันจบเปลี่ยนไปยังไง */
  function endNote(enr, now, after, faster) {
    if (!after.endDate || after.endDate === now.endDate) return '';
    return `<div class="cs-box cs-warn" style="margin-top:12px">
      ${UI.icon('event_available','sm')} <b>วันจบคอร์สเปลี่ยน</b>
      <div style="font-size:12px;margin-top:2px">
        ${CS().fmtTH(now.endDate)} → <b>${CS().fmtTH(after.endDate)}</b>
        ${after.endDate < now.endDate ? '(เร็วขึ้น)' : '(ช้าลง)'}</div>
      <div class="text-muted" style="font-size:11px;margin-top:2px">${_mode==='move'
        ? `สัปดาห์ละ ${daysOf(enr).length} ครั้งเท่าเดิม · ชั่วโมงคงเหลือเท่าเดิม (${enr.remainHours||0}h) — วันจบแค่ขยับตามวันเรียนใหม่`
        : `ชั่วโมงในแพ็กเกจเท่าเดิม (${enr.remainHours||0}h) — เรียนถี่ขึ้นแค่ใช้หมดเร็วขึ้น ไม่มีค่าใช้จ่ายเพิ่ม
           · แจ้งผู้ปกครองว่าต้องต่อคอร์สเร็วขึ้น`}</div>
    </div>`;
  }

  function redraw(enrId) {
    const enr = enrById(enrId), cls = clsOf(enr);
    const el = document.querySelector('#modal-freq .modal-body');
    if (el && enr && cls) el.innerHTML = body(enr, cls);
  }

  /* ── HANDLERS ────────────────────────────────────────────── */
  window.freqMode = m => { _mode = m; _moveTo = null; redrawCurrent(); };
  window.freqMoveFrom = d => { _moveFrom = d; redrawCurrent(); };
  window.freqMoveTo   = d => { _moveTo = (_moveTo === d ? null : d); redrawCurrent(); };
  window.freqToggleBoost = function(d) {
    _boost = _boost.includes(d) ? _boost.filter(x=>x!==d) : _boost.concat(d);
    redrawCurrent();
  };
  window.freqDate = (k, v) => { if (k==='from') _from = v; else _to = v; redrawCurrent(); };

  function redrawCurrent() { if (_curEnr) redraw(_curEnr); }

  window.freqApply = function(enrId) {
    const enr = enrById(enrId); if (!enr) return;
    const cur = daysOf(enr);
    const order = clsOf(enr)?.days || [];                 // เรียงตามลำดับวันของคลาส
    const sortDays = ds => order.filter(d => ds.includes(d));
    let detail = '';

    if (_mode === 'move') {
      if (!_moveTo) { showToast('เลือกวันที่จะย้ายไปก่อน','error'); return; }
      const from = _moveFrom || cur[0];
      enr.days    = sortDays(cur.map(d => d === from ? _moveTo : d));
      enr.perWeek = enr.days.length;
      detail = `${from} → ${_moveTo}`;
      showToast(`ย้ายวันเรียน ${DOW_TH[from]||from} → ${DOW_TH[_moveTo]||_moveTo} ✓`, 'success');

    } else if (_mode === 'add') {
      if (!_boost.length) { showToast('เลือกวันที่จะเพิ่มก่อน','error'); return; }
      enr.days    = sortDays(Array.from(new Set(cur.concat(_boost))));
      enr.perWeek = enr.days.length;
      enr.boost   = null;
      detail = `days=${enr.days.join(',')}`;
      showToast(`เพิ่มเป็นสัปดาห์ละ ${enr.days.length} ครั้ง (${enr.days.map(d=>DOW_TH[d]||d).join('+')}) ✓`, 'success');

    } else {   // boost — ชั่วคราว
      if (!_boost.length) { showToast('เลือกวันที่จะเพิ่มก่อน','error'); return; }
      if (!_to)           { showToast('ระบุวันสิ้นสุด (วันสอบ) ก่อน','error'); return; }
      enr.boost = { days:_boost.slice(), from:_from || today(), to:_to };
      detail = `+${_boost.join(',')} ${_from}→${_to}`;
      showToast(`เพิ่มรอบ ${_boost.map(d=>DOW_TH[d]||d).join('+')} ถึง ${CS().fmtTH(_to)} ✓`, 'success');
    }

    /* วันจบใหม่ (roster ไม่เปลี่ยน — ยังอยู่คลาสเดิม) */
    const all = Array.from(new Set(daysOf(enr).concat(enr.boost?.days||[])));
    enr.endDate = projectEnd(enr, all).endDate;
    (enr.history = enr.history||[]).push({
      action: _mode==='move' ? 'day_moved' : _mode==='add' ? 'frequency_changed' : 'boost_added',
      detail, by: window.CURRENT_USER?.name || 'Admin', at:new Date().toISOString() });

    Modal.close('modal-freq');
    if (window.Sync) Sync.studentCourses?.();
    window._refreshStudents?.();
  };

  window.EnrollFreq = { daysOf, projectEnd };

})();
