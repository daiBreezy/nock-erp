/* calendar-ops-new.js — Substitute Teacher + Combine Class
   Spec: LOGIC-SPEC-10 §B · Phase นี้ = แค่สลับ/ย้าย ไม่มี money/performance logic (รอ HR Phase 2)
   Depends: calendar-class.js (openClassModal), Modal, DB, showToast */
(function () {

  function refresh(id) {
    if (window.calTab) calTab(window.calCurrentView || 'week', document.querySelector('#view-calendar .tab.active'));
    if (id) setTimeout(() => openClassModal(id), 80);
  }

  /* ── SUBSTITUTE TEACHER ───────────────────────────────────── */
  window.calSubstituteClass = function (id) {
    const s = DB.sessions.find(x => x.id === id); if (!s) return;
    const teachers = (CONST.TEACHERS || []).filter(t => t !== s.teacher);
    Modal.create('modal-substitute', `${UI.icon('swap_horiz','sm')} Substitute Teacher`, `
      <div class="modal-section">
        <div class="text-muted" style="font-size:12px;padding:8px 12px;background:var(--md-surface-low);border-radius:8px;margin-bottom:14px">
          ${UI.icon('info','sm')} From: <strong>${s.teacher}</strong> · ${Utils.subjectLabel(s)} · ${s.date}
          <span class="badge badge-gray" style="font-size:10px;margin-left:6px">ไม่คิดเงิน (HR Phase 2)</span>
        </div>
        <div class="settings-row" style="margin-bottom:14px">
          <div class="settings-group"><label class="settings-label">New Teacher <span class="text-error">*</span></label>
            <select class="settings-input" id="sub-teacher">
              <option value="">Select teacher</option>
              ${teachers.map(t => `<option>${t}</option>`).join('')}
            </select></div>
          <div class="settings-group"><label class="settings-label">Duration</label>
            <select class="settings-input" id="sub-duration">
              <option value="once">One-time (คาบนี้)</option>
              <option value="all">Permanent (ทุกคาบถัดไปของคลาสนี้)</option>
            </select></div>
        </div>
        <div class="settings-group"><label class="settings-label">Reason / Remark <span class="text-error">*</span></label>
          <textarea class="settings-input" id="sub-remark" rows="2" style="resize:none"
            placeholder="e.g. ครูประจำลาป่วย…"></textarea></div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-substitute')">Cancel</button>
       <button class="btn btn-primary" onclick="calConfirmSubstitute('${id}')">${UI.icon('check','sm')} Confirm</button>`
    );
  };

  window.calConfirmSubstitute = function (id) {
    const s = DB.sessions.find(x => x.id === id); if (!s) return;
    const nt = document.getElementById('sub-teacher')?.value;
    const dur = document.getElementById('sub-duration')?.value;
    const remark = document.getElementById('sub-remark')?.value?.trim();
    if (!nt) { showToast('Select a teacher', 'warning'); return; }
    if (!remark) { showToast('Enter a reason', 'warning'); return; }
    const old = s.teacher;
    let n = 0;
    if (dur === 'all' && s.classGroupId) {
      DB.sessions.filter(x => x.classGroupId === s.classGroupId && x.state === 'upcoming' && x.date >= s.date)
        .forEach(x => { x.substituteFrom = x.teacher; x.teacher = nt; n++; });
    } else { s.substituteFrom = old; s.teacher = nt; n = 1; }
    if (window.addNotification) addNotification({ type:'admin', icon:'swap_horiz',
      text:`Substitute: ${old} → ${nt} · ${Utils.subjectLabel(s)} (${n} session${n>1?'s':''})`, link:'calendar' });
    Modal.close('modal-substitute');
    showToast(`Substitute ${old} → ${nt} · ${dur==='all'?'permanent':'คาบนี้'} · แจ้งผู้ปกครองแล้ว`, 'success');
    refresh(id);
  };

  /* ── COMBINE CLASS ────────────────────────────────────────── */
  window.calCombineClass = function (id) {
    const s = DB.sessions.find(x => x.id === id); if (!s) return;
    const cands = DB.sessions.filter(x =>
      x.id !== id && x.branch === s.branch && x.state === 'upcoming' && x.date === s.date
    ).slice(0, 6);
    Modal.create('modal-combine', `${UI.icon('call_merge','sm')} Combine Class`, `
      <div class="modal-section">
        <div style="padding:10px 14px;background:var(--md-warning-container);border-left:4px solid var(--md-warning);border-radius:0 8px 8px 0;margin-bottom:14px">
          <div style="font-weight:600;color:var(--md-on-warning-container)">${UI.icon('info','sm')} รวม ${Utils.subjectLabel(s)} เข้าอีกคลาส</div>
          <div style="font-size:12px;margin-top:2px;color:var(--md-on-warning-container)">
            นักเรียน ${s.studentNames.length} คน จะย้ายเข้าคลาสปลายทาง · แจ้งผู้ปกครองที่กระทบ</div>
        </div>
        <div class="settings-group" style="margin-bottom:12px">
          <label class="settings-label">Reason / Remark <span class="text-error">*</span></label>
          <textarea class="settings-input" id="cmb-remark" rows="2" style="resize:none"
            placeholder="e.g. นักเรียนน้อย รวมคลาส…"></textarea></div>
        <div class="settings-label" style="margin-bottom:8px">เลือกคลาสปลายทาง (วันเดียวกัน · สาขาเดียวกัน):</div>
        ${cands.length ? `<div style="display:flex;flex-direction:column;gap:6px">
          ${cands.map((c,i) => { const sp = 6 - c.studentNames.length;
            return `<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;border:2px solid var(--md-outline-variant);border-radius:8px;cursor:pointer"
              onclick="document.querySelectorAll('[id^=cmb-o]').forEach(l=>l.style.borderColor='var(--md-outline-variant)');this.style.borderColor='var(--md-primary)'" id="cmb-o${i}">
              <input type="radio" name="cmb-target" value="${c.id}" style="accent-color:var(--md-primary)">
              <div style="flex:1">
                <div style="font-weight:600;font-size:13px">${Utils.subjectLabel(c)} · ${c.teacher}</div>
                <div class="text-muted" style="font-size:11px">${c.room||''} · ${c.studentNames.length} คน · ว่าง ${sp}</div>
              </div>
              <span class="badge ${sp>=s.studentNames.length?'badge-green':'badge-yellow'}" style="font-size:10px">+${s.studentNames.length}</span>
            </label>`; }).join('')}
        </div>` : `<div class="text-muted" style="font-size:12px;padding:12px;background:var(--md-surface-low);border-radius:8px">ไม่มีคลาสอื่นวันเดียวกันในสาขานี้</div>`}
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-combine')">Cancel</button>
       <button class="btn btn-primary" onclick="calConfirmCombine('${id}')">${UI.icon('call_merge','sm')} Combine</button>`
    );
  };

  window.calConfirmCombine = function (id) {
    const s = DB.sessions.find(x => x.id === id); if (!s) return;
    const remark = document.getElementById('cmb-remark')?.value?.trim();
    const radio = document.querySelector('input[name="cmb-target"]:checked');
    if (!remark) { showToast('Enter a reason', 'warning'); return; }
    if (!radio) { showToast('เลือกคลาสปลายทาง', 'warning'); return; }
    const t = DB.sessions.find(x => x.id === radio.value); if (!t) return;
    let moved = 0;
    s.studentNames.forEach(nm => {
      if (!t.studentNames.includes(nm)) { t.studentNames.push(nm); t.attendance[nm] = 'present'; moved++; }
    });
    s.combinedInto = t.id;
    s.studentNames = [];
    s.state = 'postponed';   // คลาสต้นทางว่าง = ถือว่าปิด (รวมไปแล้ว)
    if (window.addNotification) addNotification({ type:'admin', icon:'call_merge',
      text:`Combined ${Utils.subjectLabel(s)} → ${Utils.subjectLabel(t)} (${moved} students)`, link:'calendar' });
    Modal.close('modal-combine');
    showToast(`รวม ${moved} คน เข้า ${Utils.subjectLabel(t)} · แจ้งผู้ปกครองแล้ว`, 'success');
    refresh(t.id);
  };

})();
