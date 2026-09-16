/* ============================================================
   calendar-modals.js — Leave, Reschedule, Transfer, Postpone
   Depends on calendar-class.js (window._calLeaveQuota, window._calJoinOrNoteSession)
   ============================================================ */
(function () {

  function getSlot(id){ return CONST.TIME_SLOTS.find(s=>s.id===id); }
  function leaveQuota(name, subj){ return window._calLeaveQuota(name, subj); }
  function joinSess(s, name, date, slotId){ if(window._calJoinOrNoteSession) window._calJoinOrNoteSession(s, name, date, slotId); }

  /* ── SAME-WEEK RANGE HELPER ───────────────────────────── */
  function sameWeekRange(dateStr) {
    const d = new Date(dateStr+'T12:00:00');
    const day = d.getDay();
    const mon = new Date(d); mon.setDate(d.getDate() - (day===0?6:day-1));
    const sun = new Date(mon); sun.setDate(mon.getDate()+6);
    return { min: mon.toISOString().slice(0,10), max: sun.toISOString().slice(0,10) };
  }

  /* ── LEAVE MODAL ──────────────────────────────────────── */
  window.calOpenLeaveModal = function(sessionId, name) {
    const s=DB.sessions.find(x=>x.id===sessionId); if(!s) return;
    const q=leaveQuota(name, s.subject);
    const qColor=q.over?'var(--md-error)':q.remaining<=1?'var(--md-warning)':'var(--md-success)';
    const qMsg  =q.over?`Over quota — this leave will deduct 1 session (2h)`:`${q.remaining} leave${q.remaining!==1?'s':''} remaining (${q.used}/${q.total} used)`;
    Modal.create('modal-leave',`${UI.icon('event_busy','sm')} Leave — ${name}`,`
      <div class="modal-section">
        <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;
            background:${q.over?'var(--md-error-container)':'var(--md-warning-container)'};
            border-left:4px solid ${qColor};border-radius:0 8px 8px 0;margin-bottom:16px">
          <span style="color:${qColor}">${UI.icon(q.over?'warning':'info')}</span>
          <div><div style="font-weight:600;font-size:13px;color:${qColor}">Leave Quota</div>
            <div style="font-size:12px;margin-top:2px">${qMsg}</div>
          </div>
        </div>
        <div class="settings-group" style="margin-bottom:16px">
          <label class="settings-label">Reason / Remark <span class="text-error">*</span></label>
          <textarea class="settings-input" id="leave-remark" rows="2" style="resize:none"
            placeholder="e.g. Doctor appointment, family trip…"></textarea>
        </div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px 14px;
            background:var(--md-surface-low);border-radius:8px;margin-bottom:0">
          <input type="checkbox" id="leave-do-reschedule" style="width:16px;height:16px;accent-color:var(--md-primary)"
            onchange="document.getElementById('leave-resch-wrap').style.display=this.checked?'block':'none'">
          <span style="font-size:13px;font-weight:500">${UI.icon('update','sm')} Also reschedule to a new slot</span>
        </label>
        <div id="leave-resch-wrap" style="display:none;margin-top:10px;padding:12px;
            background:var(--md-surface-low);border-radius:8px;border:1px solid var(--md-outline-variant)">
          <div class="settings-row">
            <div class="settings-group"><label class="settings-label">New Date</label>
              <input class="settings-input" type="date" id="leave-new-date" value="${s.date}" min="${s.date}"></div>
            <div class="settings-group"><label class="settings-label">Time Slot</label>
              <select class="settings-input" id="leave-new-slot">
                ${CONST.TIME_SLOTS.filter(t=>t.type==='class').map(t=>`<option value="${t.id}" ${t.id===s.slotId?'selected':''}>${t.start}–${t.end}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-leave')">Cancel</button>
       <button class="btn btn-primary" onclick="calConfirmLeave('${sessionId}','${name.replace(/'/g,"\\'")}')">
         ${UI.icon('check','sm')} Confirm Leave</button>`
    );
  };

  window.calConfirmLeave = function(sessionId, name) {
    const remark=document.getElementById('leave-remark')?.value?.trim();
    if(!remark){showToast('Please enter a reason','warning');return;}
    const s=DB.sessions.find(x=>x.id===sessionId); if(!s) return;
    const q=leaveQuota(name,s.subject);
    AttendancePicker.set(sessionId, name, q.over?'leave_over':'leave', remark);
    /* consume quota on the enrollment (source of truth) */
    if(q.enrollmentId){
      const enr=(DB.enrollments||[]).find(e=>e.id===q.enrollmentId);
      if(enr) enr.leaveUsed=(enr.leaveUsed||0)+1;
    }
    const doResch=document.getElementById('leave-do-reschedule')?.checked;
    if(doResch){
      const nd=document.getElementById('leave-new-date')?.value;
      const sl=parseInt(document.getElementById('leave-new-slot')?.value);
      if(nd&&!isNaN(sl)) joinSess(s,name,nd,sl);
    }
    Modal.close('modal-leave');
    showToast(`Leave recorded for ${name.split(' ')[0]}${q.over?' · Over quota — 1 session deducted':''}`,q.over?'warning':'info');
    setTimeout(()=>openClassModal(sessionId),80);
  };

  /* ── RESCHEDULE MODAL ─────────────────────────────────── */
  window.calOpenRescheduleModal = function(sessionId, name) {
    const s=DB.sessions.find(x=>x.id===sessionId); if(!s) return;
    const ts=getSlot(s.slotId);
    const wr=sameWeekRange(s.date);
    /* spec LOGIC-SPEC-10: target = any subject/grade/teacher · same branch · same week
       (student ยัง consume enrollment วิชาตัวเอง แม้ไปนั่ง class วิชาอื่น) */
    const cands=DB.sessions.filter(x=>
      x.id!==s.id&&x.branch===s.branch&&
      x.state==='upcoming'&&x.studentNames.length<6&&
      x.date>=wr.min&&x.date<=wr.max
    ).slice(0,4);
    Modal.create('modal-reschedule',`${UI.icon('update','sm')} Reschedule — ${name}`,`
      <div class="modal-section">
        <div class="text-muted" style="font-size:12px;padding:8px 12px;background:var(--md-surface-low);border-radius:8px;margin-bottom:14px">
          ${UI.icon('info','sm')} From: <strong>${Utils.subjectLabel(s)}</strong> · ${s.date} · ${ts?ts.start+'–'+ts.end:'—'}
          <span class="badge badge-blue" style="font-size:10px;margin-left:8px">No hours deducted</span>
        </div>
        <div style="font-size:11px;padding:6px 10px;background:var(--md-primary-container);border-radius:6px;margin-bottom:14px;color:var(--md-on-primary-container)">
          ${UI.icon('calendar_today','sm')} Reschedule must be within the same week: <strong>${wr.min}</strong> – <strong>${wr.max}</strong>
        </div>
        <div class="settings-group" style="margin-bottom:14px">
          <label class="settings-label">Reason / Remark <span class="text-error">*</span></label>
          <textarea class="settings-input" id="resch-remark" rows="2" style="resize:none"
            placeholder="e.g. Schedule conflict, parent request…"></textarea>
        </div>
        <div class="settings-label" style="margin-bottom:8px">
          ${cands.length?'Select New Session (any class · same branch · this week):':'No matching sessions this week — enter custom date:'}
        </div>
        ${cands.length?`<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:14px">
          ${cands.map((c,i)=>{const ct=getSlot(c.slotId),sp=6-c.studentNames.length;
            return `<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;
                border:2px solid var(--md-outline-variant);border-radius:8px;cursor:pointer;transition:border .15s"
                onclick="document.querySelectorAll('[id^=ro-]').forEach(l=>l.style.borderColor='var(--md-outline-variant)');this.style.borderColor='var(--md-primary)'" id="ro-${i}">
              <input type="radio" name="resch-target" value="${c.id}" style="accent-color:var(--md-primary)">
              <div style="flex:1">
                <div style="font-weight:600;font-size:13px">${Utils.subjectLabel(c)} · ${c.date} · ${ct?ct.start+'–'+ct.end:'—'}</div>
                <div class="text-muted" style="font-size:11px">${c.teacher} · ${c.room} · ${sp} spot${sp!==1?'s':''} left</div>
              </div>
              <span class="badge ${sp>=3?'badge-green':sp>=1?'badge-yellow':'badge-red'}" style="font-size:10px">${sp}/6</span>
            </label>`;
          }).join('')}
        </div>`:''}
        <div class="settings-row">
          <div class="settings-group"><label class="settings-label">Custom Date (this week only)</label>
            <input class="settings-input" type="date" id="resch-custom-date" min="${wr.min}" max="${wr.max}"></div>
          <div class="settings-group"><label class="settings-label">Time Slot</label>
            <select class="settings-input" id="resch-custom-slot">
              ${CONST.TIME_SLOTS.filter(t=>t.type==='class').map(t=>`<option value="${t.id}">${t.start}–${t.end}</option>`).join('')}
            </select></div>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-reschedule')">Cancel</button>
       <button class="btn btn-primary" onclick="calConfirmReschedule('${sessionId}','${name.replace(/'/g,"\\'")}')">
         ${UI.icon('update','sm')} Confirm Reschedule</button>`
    );
  };

  window.calConfirmReschedule = function(sessionId, name) {
    const remark=document.getElementById('resch-remark')?.value?.trim();
    if(!remark){showToast('Please enter a reason','warning');return;}
    const s=DB.sessions.find(x=>x.id===sessionId); if(!s) return;
    const radio=document.querySelector('input[name="resch-target"]:checked');
    let newDate, slotId;
    if(radio){
      const t=DB.sessions.find(x=>x.id===radio.value);
      newDate=t?.date; slotId=t?.slotId;
      if(t&&!t.studentNames.includes(name)){t.studentNames.push(name);t.attendance[name]='present';}
    } else {
      newDate=document.getElementById('resch-custom-date')?.value;
      slotId=parseInt(document.getElementById('resch-custom-slot')?.value);
      if(newDate&&!isNaN(slotId)) joinSess(s,name,newDate,slotId);
    }
    if(!newDate){showToast('Please select a new date','warning');return;}
    AttendancePicker.set(sessionId, name, 'reschedule', remark);
    Modal.close('modal-reschedule');
    const ts=CONST.TIME_SLOTS.find(t=>t.id===slotId);
    showToast(`${name.split(' ')[0]} rescheduled to ${newDate}${ts?' '+ts.start:''}✓`,'success');
    setTimeout(()=>openClassModal(sessionId),80);
  };

  /* ── TRANSFER MODAL ───────────────────────────────────── */
  window.calOpenTransferModal = function(sessionId, name) {
    const s=DB.sessions.find(x=>x.id===sessionId); if(!s) return;
    const cands=DB.sessions.filter(x=>x.id!==s.id&&x.subject===s.subject&&x.state==='upcoming'&&x.studentNames.length<6&&(x.teacher!==s.teacher||x.branch!==s.branch)).slice(0,5);
    Modal.create('modal-transfer',`${UI.icon('swap_horiz','sm')} Transfer — ${name}`,`
      <div class="modal-section">
        <div class="text-muted" style="font-size:12px;padding:8px 12px;background:var(--md-surface-low);border-radius:8px;margin-bottom:14px">
          ${UI.icon('info','sm')} From: <strong>${s.teacher}</strong> · ${s.branch}
          <span class="badge badge-blue" style="font-size:10px;margin-left:8px">Hours carry over</span>
        </div>
        <div class="settings-row" style="margin-bottom:14px">
          <div class="settings-group"><label class="settings-label">Transfer Type</label>
            <select class="settings-input" id="transfer-type">
              <option value="teacher">Change Teacher (same branch)</option>
              <option value="branch">Change Branch</option>
              <option value="both">Change Teacher + Branch</option>
            </select></div>
        </div>
        <div class="settings-group" style="margin-bottom:14px">
          <label class="settings-label">Reason / Remark <span class="text-error">*</span></label>
          <textarea class="settings-input" id="transfer-remark" rows="2" style="resize:none"
            placeholder="e.g. Moving to Silom branch, teacher preference…"></textarea>
        </div>
        <div class="settings-label" style="margin-bottom:8px">Select Target Class</div>
        ${cands.length?`<div style="display:flex;flex-direction:column;gap:6px">
          ${cands.map((c,i)=>{const ct=getSlot(c.slotId),sp=6-c.studentNames.length;
            return `<label style="display:flex;align-items:center;gap:10px;padding:10px 14px;
                border:2px solid var(--md-outline-variant);border-radius:8px;cursor:pointer;transition:border .15s"
                onclick="document.querySelectorAll('[id^=to-]').forEach(l=>l.style.borderColor='var(--md-outline-variant)');this.style.borderColor='var(--md-primary)'" id="to-${i}">
              <input type="radio" name="transfer-class" value="${c.id}" style="accent-color:var(--md-primary)">
              <div style="flex:1">
                <div style="font-weight:600;font-size:13px">${c.teacher} · ${Utils.subjectLabel(c)}</div>
                <div class="text-muted" style="font-size:11px">${c.date} · ${ct?ct.start+'–'+ct.end:'—'} · ${c.branch} · ${c.room}</div>
              </div>
              <span class="badge ${sp>=3?'badge-green':sp>=1?'badge-yellow':'badge-red'}" style="font-size:10px">${sp}/6</span>
            </label>`;
          }).join('')}
        </div>`:`<div class="text-muted" style="font-size:12px;padding:12px;background:var(--md-surface-low);border-radius:8px">
          No matching classes found. Admin will assign manually after transfer.</div>`}
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-transfer')">Cancel</button>
       <button class="btn btn-primary" onclick="calConfirmTransfer('${sessionId}','${name.replace(/'/g,"\\'")}')">
         ${UI.icon('swap_horiz','sm')} Confirm Transfer</button>`
    );
  };

  window.calConfirmTransfer = function(sessionId, name) {
    const remark=document.getElementById('transfer-remark')?.value?.trim();
    if(!remark){showToast('Please enter a reason','warning');return;}
    const s=DB.sessions.find(x=>x.id===sessionId); if(!s) return;
    const radio=document.querySelector('input[name="transfer-class"]:checked');
    if(radio){const t=DB.sessions.find(x=>x.id===radio.value);if(t&&!t.studentNames.includes(name)){t.studentNames.push(name);t.attendance[name]='present';}}
    AttendancePicker.set(sessionId, name, 'transfer', remark);
    Modal.close('modal-transfer');
    showToast(`${name.split(' ')[0]} transferred ✓ — hours carry over`,'success');
    setTimeout(()=>openClassModal(sessionId),80);
  };

  /* ── POSTPONE CLASS ───────────────────────────────────── */
  window.calPostponeClass = function(id) {
    const s=DB.sessions.find(x=>x.id===id); if(!s) return;
    Modal.create('modal-postpone',`${UI.icon('pause_circle','sm')} Postpone Class`,`
      <div class="modal-section">
        <div style="padding:10px 14px;background:var(--md-warning-container);border-left:4px solid var(--md-warning);border-radius:0 8px 8px 0;margin-bottom:16px">
          <div style="font-weight:600;color:var(--md-on-warning-container)">${UI.icon('warning','sm')} Entire Class Postponed</div>
          <div style="font-size:12px;margin-top:2px;color:var(--md-on-warning-container)">${Utils.subjectLabel(s)} · ${s.date} · ${s.studentNames.length} students affected</div>
        </div>
        <div class="settings-group" style="margin-bottom:14px">
          <label class="settings-label">Reason / Remark <span class="text-error">*</span></label>
          <textarea class="settings-input" id="postpone-remark" rows="2" style="resize:none"
            placeholder="e.g. Teacher sick, venue unavailable…"></textarea>
        </div>
        <div class="settings-group" style="margin-bottom:14px">
          <label class="settings-label">Action</label>
          <select class="settings-input" id="postpone-action"
            onchange="document.getElementById('postpone-date-wrap').style.display=this.value==='reschedule'?'block':'none'">
            <option value="cancel">Cancel this session (no hours deducted)</option>
            <option value="reschedule">Reschedule to new date</option>
          </select>
        </div>
        <div id="postpone-date-wrap" style="display:none;margin-bottom:14px">
          <div class="settings-row">
            <div class="settings-group"><label class="settings-label">New Date</label>
              <input class="settings-input" type="date" id="postpone-new-date" min="${s.date}"></div>
            <div class="settings-group"><label class="settings-label">Time Slot</label>
              <select class="settings-input" id="postpone-new-slot">
                ${CONST.TIME_SLOTS.filter(t=>t.type==='class').map(t=>`<option value="${t.id}" ${t.id===s.slotId?'selected':''}>${t.start}–${t.end}</option>`).join('')}
              </select></div>
          </div>
        </div>
        <div class="settings-label" style="margin-bottom:8px">Notify</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="pn-parents" checked style="accent-color:var(--md-primary)">
            <span style="font-size:13px">${UI.icon('family_restroom','sm')} All Parents (${s.studentNames.length})</span>
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="pn-teacher" checked style="accent-color:var(--md-primary)">
            <span style="font-size:13px">${UI.icon('school','sm')} Teacher (${s.teacher})</span>
          </label>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-postpone')">Cancel</button>
       <button class="btn btn-danger" onclick="calConfirmPostpone('${id}')">
         ${UI.icon('pause_circle','sm')} Confirm Postpone</button>`
    );
  };

  window.calConfirmPostpone = function(id) {
    const remark=document.getElementById('postpone-remark')?.value?.trim();
    if(!remark){showToast('Please enter a reason','warning');return;}
    const s=DB.sessions.find(x=>x.id===id); if(!s) return;
    s.state='postponed'; s.postponeRemark=remark;
    const notifyP=document.getElementById('pn-parents')?.checked;
    const notifyT=document.getElementById('pn-teacher')?.checked;
    if(window.addNotification){
      addNotification({type:'admin',icon:'pause_circle',
        text:`Class ${Utils.subjectLabel(s)} on ${s.date} postponed · ${remark}`,link:'calendar'});
      if(notifyT) addNotification({type:'class_postponed',recipientRole:'teacher',title:`Class postponed: ${Utils.subjectLabel(s)}`,text:remark,time:'Just now',sessionId:id});
      if(notifyP) s.studentNames.forEach(n=>addNotification({type:'class_postponed',recipientRole:'parent',studentName:n,title:`Class postponed: ${Utils.subjectLabel(s)}`,text:remark,time:'Just now',sessionId:id}));
    }
    Modal.close('modal-postpone');
    const who=[notifyP&&'parents',notifyT&&'teacher'].filter(Boolean).join(' + ');
    showToast(`Class postponed${who?` · Notified ${who}`:''}`,'warning');
    if(window.calTab) calTab(window.calCurrentView||'week',document.querySelector('#view-calendar .tab.active'));
  };

})();
