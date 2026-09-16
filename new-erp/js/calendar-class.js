/* ============================================================
   calendar-class.js — Class Modal: helpers, renderers, state
   Leave/Reschedule/Transfer/Postpone: calendar-modals.js
   Create/Edit/Summary: calendar-form.js
   ============================================================ */
(function () {

  const TIME_SLOTS = CONST.TIME_SLOTS;
  function getSlot(id){ return TIME_SLOTS.find(s=>s.id===id); }
  function smeta(name){ return Utils.studentMeta(name); }
  function allSumsDone(s){
    return s.studentNames.every(n=>{
      const att=s.attendance[n]||'present';
      if(['leave','leave_over','reschedule','transfer'].includes(att)) return true;
      return s.summaries[n]?.sent===true;
    });
  }
  function sumDueDate(s){ return s.endedAt ? '27 May 2026 (7 days)' : '—'; }

  /* ── LEAVE QUOTA (exported for calendar-modals.js) ──────
     Source of truth: DB.enrollments — quota = hours ÷ 8     */
  function leaveQuota(name, subject) {
    const stu = DB.students.find(x=>x.name===name);
    const enr = stu ? (DB.enrollments||[]).find(e=>
      e.studentId===stu.id && e.status==='active' &&
      (e.subject===subject || e.enrollType==='bundle')) : null;
    if (enr && enr.enrollType==='bundle')
      return { total:0, used:0, remaining:0, over:true, bundle:true };  // bundle: no leave quota
    if (enr) {
      const total = Utils.leaveQuota(enr);
      const used  = enr.leaveUsed||0;
      return { total, used, remaining: Math.max(0,total-used), over: used>=total, enrollmentId: enr.id };
    }
    /* fallback — ghost students with no enrollment record */
    const course = stu?.courses?.find(c=>c.name?.startsWith(subject))||stu?.courses?.[0];
    const total  = course ? Math.round((course.hours||24)/8) : 3;
    return { total, used:0, remaining:total, over:false };
  }
  window._calLeaveQuota = leaveQuota;
  window._calAllSumsDone = allSumsDone;   // for calApproveAll (calendar-form.js)

  /* ── JOIN/NOTE SESSION (exported for calendar-modals.js) ─ */
  function _joinOrNoteSession(s, name, date, slotId) {
    const t=DB.sessions.find(x=>x.date===date&&x.slotId===slotId&&x.teacher===s.teacher&&x.subject===s.subject&&x.state==='upcoming');
    if(t&&!t.studentNames.includes(name)){t.studentNames.push(name);t.attendance[name]='present';}
  }
  window._calJoinOrNoteSession = _joinOrNoteSession;

  /* ── STUDENT TYPE BADGE ───────────────────────────────── */
  function typeBadge(s, name) {
    const m = s.studentMeta?.[name];
    if (!m) return '';
    const map = { test:'badge-blue', trial:'badge-purple', new:'badge-green' };
    const cls = map[m.type];
    if (!cls) return '';
    return `<span class="badge ${cls}" style="font-size:9px;padding:1px 5px;margin-left:4px">${m.type.toUpperCase()}</span>`;
  }

  /* ── INCOMING STUDENT BANNER ──────────────────────────── */
  function incomingBanner(s) {
    if (!s.studentMeta) return '';
    const specials = s.studentNames.filter(n=>{
      const m=s.studentMeta[n];
      return m && ['test','trial','new'].includes(m.type) && !m.dismissed;
    });
    if (!specials.length) return '';
    const cfg = {
      test:  { color:'var(--md-primary)',      bg:'var(--md-primary-container)',   icon:'assignment',          label:'Test Student' },
      trial: { color:'var(--clr-on-grammar)',  bg:'var(--clr-grammar)',            icon:'assignment_turned_in',label:'Trial Student' },
      new:   { color:'var(--md-success)',      bg:'var(--md-success-container)',   icon:'person_add',          label:'New Enrollment' },
    };
    return specials.map(name=>{
      const m=s.studentMeta[name], c=cfg[m.type];
      const sid=s.id.replace(/'/g,"\\'"), ne=name.replace(/'/g,"\\'");
      return `<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;
                  background:${c.bg};border-left:4px solid ${c.color};border-radius:0 8px 8px 0;margin-bottom:8px">
        <span style="color:${c.color}">${UI.icon(c.icon)}</span>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px;color:${c.color}">${c.label} Joining This Class</div>
          <div style="font-size:12px;margin-top:2px"><strong>${name}</strong>${m.note?` · ${m.note}`:''}</div>
          ${m.approvedBy?`<div class="text-muted" style="font-size:11px;margin-top:1px">Approved by ${m.approvedBy}</div>`:''}
        </div>
        <button onclick="calDismissBanner('${sid}','${ne}')"
          style="background:none;border:none;cursor:pointer;color:${c.color};font-size:18px;line-height:1;flex-shrink:0">×</button>
      </div>`;
    }).join('');
  }

  /* ── STUDENT ROW (pre/active) ─────────────────────────── */
  function studentAttRow(s, name, showRemove) {
    const att      = s.attendance[name]||'present';
    const m        = smeta(name);
    const stu      = DB.students.find(x=>x.name===name);
    const course   = stu?.courses?.find(c=>c.name?.startsWith(s.subject))||stu?.courses?.[0];
    const totalS   = course?.hours ? Math.round(course.hours/2) : 12;
    const leftS    = Number.isFinite(m.left) ? m.left : Math.round((course?.left??24)/2);
    const usedS    = Math.max(0, totalS - leftS);
    const pct      = totalS > 0 ? Math.round((usedS/totalS)*100) : 0;
    const barClr   = leftS<=1?'var(--md-error)':leftS<=3?'var(--md-warning)':'var(--md-primary)';
    const ne       = name.replace(/'/g,"\\'");
    const sid      = s.id.replace(/'/g,"\\'");
    const isMore   = ['leave','leave_over','reschedule','transfer'].includes(att);
    const dropId   = `drop-${s.id}-${name.replace(/\s+/g,'_')}`;
    const stuGrade = stu?.grade||m.grade||'';
    const gCls     = stuGrade.startsWith('ม')?'badge-purple':'badge-blue';
    return `<div class="att-row" style="align-items:center;gap:8px">
      <div class="avatar" style="width:30px;height:30px;font-size:11px;flex-shrink:0">${name[0]}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
          ${name}${typeBadge(s,name)}</div>
        <div style="display:flex;align-items:center;gap:5px;margin-top:2px">
          ${m.family&&m.family!=='—'?`<span class="text-muted" style="font-size:11px">${m.family}</span>`:''}
          ${stuGrade?`<span class="badge ${gCls}" style="font-size:10px;padding:1px 5px">${stuGrade}</span>`:''}
          <div style="display:flex;align-items:center;gap:4px;flex-shrink:0">
            <div style="width:38px;height:3px;background:var(--md-outline-variant);border-radius:2px;overflow:hidden">
              <div style="width:${pct}%;height:100%;background:${barClr};border-radius:2px"></div>
            </div>
            <span style="font-size:10px;color:${barClr};font-weight:${leftS<=1?'700':'500'}">${usedS}/${totalS}</span>
          </div>
        </div>
      </div>
      <div style="display:flex;gap:3px;flex-shrink:0;align-items:center">
        <button title="Present" onclick="calSetAttAndRefresh('${sid}','${ne}','present')"
          style="width:30px;height:28px;border-radius:6px;border:2px solid ${att==='present'?'var(--md-success)':'var(--md-outline-variant)'};background:${att==='present'?'var(--md-success-container)':'var(--md-surface-lowest)'};color:${att==='present'?'var(--md-on-success-container)':'var(--md-on-surface-variant)'};font-size:13px;font-weight:700;cursor:pointer">✓</button>
        <button title="Absent" onclick="calSetAttAndRefresh('${sid}','${ne}','absent')"
          style="width:30px;height:28px;border-radius:6px;border:2px solid ${att==='absent'?'var(--md-error)':'var(--md-outline-variant)'};background:${att==='absent'?'var(--md-error-container)':'var(--md-surface-lowest)'};color:${att==='absent'?'var(--md-on-error-container)':'var(--md-on-surface-variant)'};font-size:13px;font-weight:700;cursor:pointer">✗</button>
        <div style="position:relative">
          <button title="${isMore?att:'More'}" onclick="event.stopPropagation();toggleAttMore('${dropId}')"
            style="width:30px;height:28px;border-radius:6px;border:2px solid ${isMore?'var(--md-primary)':'var(--md-outline-variant)'};background:${isMore?'var(--md-primary-container)':'var(--md-surface-lowest)'};color:${isMore?'var(--md-on-primary-container)':'var(--md-on-surface-variant)'};font-size:10px;letter-spacing:2px;cursor:pointer">•••</button>
          <div id="${dropId}" class="att-more-drop" style="display:none;position:absolute;right:0;top:32px;background:var(--md-surface-lowest);border:1px solid var(--md-outline-variant);border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.12);z-index:300;min-width:160px;overflow:hidden">
            <button onclick="calOpenLeaveModal('${sid}','${ne}')" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;border:none;cursor:pointer;font-size:12px;background:${att.startsWith('leave')?'var(--md-warning-container)':'var(--md-surface-lowest)'};color:${att.startsWith('leave')?'var(--md-on-warning-container)':'var(--md-on-surface)'};text-align:left">${UI.icon('event_busy','sm')} Leave</button>
            <button onclick="calOpenRescheduleModal('${sid}','${ne}')" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;border:none;cursor:pointer;font-size:12px;background:${att==='reschedule'?'var(--md-primary-container)':'var(--md-surface-lowest)'};color:${att==='reschedule'?'var(--md-primary)':'var(--md-on-surface)'};text-align:left">${UI.icon('update','sm')} Re-schedule</button>
            ${showRemove?`<div style="border-top:1px solid var(--md-outline-variant)"></div>
            <button onclick="calRemoveStudent('${sid}','${ne}')" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;border:none;cursor:pointer;font-size:12px;background:var(--md-surface-lowest);color:var(--md-error);text-align:left">${UI.icon('close','sm')} Remove from class</button>`:''}
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ── SUMMARY ROW (ended) — collapsible ───────────────── */
  function summaryRow(s, name) {
    const att    = s.attendance[name]||'present';
    const m      = smeta(name);
    const noSum  = ['leave','leave_over','reschedule','transfer'].includes(att);
    const sum    = s.summaries[name]||{};
    const attCls = att==='present'?'badge-green':att==='absent'?'badge-red':att.startsWith('leave')?'badge-yellow':'badge-blue';
    const sid    = s.id.replace(/'/g,"\\'");
    const ne     = name.replace(/'/g,"\\'");
    const tid    = `sum-${s.id}-${name.replace(/\s/g,'_')}`;
    const rowId  = `sumrow-${s.id}-${name.replace(/\s+/g,'_')}`;
    const hdr = `<div onclick="${noSum?'':'calToggleSummary(\''+rowId+'\')'}"
        style="display:flex;align-items:center;gap:8px;cursor:${noSum?'default':'pointer'}">
      <div class="avatar" style="width:28px;height:28px;font-size:10px;flex-shrink:0">${name[0]}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500">${name}${typeBadge(s,name)}</div>
        <div class="text-muted" style="font-size:11px">${m.family}</div>
      </div>
      <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
        <span class="badge ${attCls}" style="font-size:9px">${att==='present'?'Present':att==='absent'?'Absent':att}</span>
        ${!noSum?`<span class="badge ${sum.sent?'badge-green':sum.submitted?'badge-blue':'badge-yellow'}" style="font-size:9px">${sum.sent?'Sent':sum.submitted?'Awaiting Approval':'Pending'}</span>`:''}
        ${!noSum?`<span class="text-muted" style="font-size:18px;line-height:1;font-weight:300">›</span>`:''}
      </div>
    </div>`;
    if (noSum) return `<div class="att-row" style="flex-direction:column;align-items:stretch">${hdr}</div>`;
    const innerContent = sum.sent
      ? `<div style="display:flex;align-items:flex-start;gap:8px;padding:10px 12px;
            background:var(--md-success-container);border-radius:8px">
          <span style="color:var(--md-success)">${UI.icon('task_alt')}</span>
          <div><div style="font-weight:600;font-size:12px;color:var(--md-on-success-container)">Summary sent to Parent!</div>
            ${sum.text?`<div style="font-size:11px;margin-top:2px;color:var(--md-on-success-container)">"${sum.text.slice(0,80)}${sum.text.length>80?'…':''}"</div>`:''}
          </div></div>`
      : sum.submitted
      ? `<div style="display:flex;align-items:flex-start;gap:8px;padding:10px 12px;
            background:var(--md-primary-container);border-radius:8px">
          <span style="color:var(--md-primary)">${UI.icon('approval')}</span>
          <div style="flex:1">
            <div style="font-weight:600;font-size:12px;color:var(--md-primary)">Submitted — รอ Admin/Manager approve</div>
            <div style="font-size:11px;margin-top:2px">"${(sum.text||'').slice(0,100)}${(sum.text||'').length>100?'…':''}"</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button class="btn btn-secondary btn-sm" onclick="calRecallSummary('${sid}','${ne}')">${UI.icon('undo','sm')} Recall</button>
            <button class="btn btn-primary btn-sm" onclick="calApproveSummary('${sid}','${ne}')">${UI.icon('verified','sm')} Approve</button>
          </div>
        </div>`
      : `<div class="summary-pending" style="font-size:11px;margin-bottom:6px">
          ${UI.icon('edit_note','sm')} Summary required · due: ${sumDueDate(s)}</div>
        <textarea class="summary-ta" id="${tid}"
          placeholder="Write today's lesson summary for ${name.split(' ')[0]}…">${sum.text||''}</textarea>
        <div style="display:flex;gap:6px;justify-content:flex-end;margin-top:6px">
          <button class="btn btn-secondary btn-sm" onclick="calSaveDraft('${sid}','${ne}')">${UI.icon('save','sm')} Save Draft</button>
          <button class="btn btn-primary btn-sm" onclick="calSubmitSummary('${sid}','${ne}')">${UI.icon('send','sm')} Submit for Approval</button>
        </div>`;
    return `<div class="att-row" style="flex-direction:column;align-items:stretch">${hdr}
      <div id="${rowId}-content" style="display:none;padding-top:8px;border-top:1px solid var(--md-outline-variant);margin-top:6px">
        ${innerContent}
      </div></div>`;
  }

  /* ── RENDER BODIES ────────────────────────────────────── */
  function renderPre(s) {
    return `${incomingBanner(s)}<div class="modal-section">
      <div class="modal-section-title">
        <span>Student list</span>
        <span class="text-muted" style="font-size:11px">ไม่เกิน 6 คน / class</span>
      </div>
      ${s.studentNames.length
        ? s.studentNames.map(n=>studentAttRow(s,n,true)).join('')
        : UI.emptyState('group','No students yet','Add students to start the class')}
    </div>`;
  }

  function renderActive(s) {
    return `${incomingBanner(s)}
    <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;
        background:var(--md-primary-container);border-radius:8px;margin-bottom:2px">
      <span style="color:var(--md-primary)">${UI.icon('play_circle')}</span>
      <div style="flex:1">
        <strong style="color:var(--md-on-primary-container);font-size:13px">Class Started!</strong>
        <div style="font-size:11px;color:var(--md-on-primary-container)">
          Start class: ${s.startedAt||'—'} · End class: ${s.endedAt||'—'}
        </div>
      </div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">
        <span>Student list</span>
        <span class="text-muted" style="font-size:11px">ไม่เกิน 6 คน / class</span>
      </div>
      ${s.studentNames.map(n=>studentAttRow(s,n,true)).join('')}
    </div>`;
  }

  function renderEnded(s) {
    const done=allSumsDone(s);
    const sent=Object.values(s.summaries).filter(x=>x.sent).length;
    const req=s.studentNames.filter(n=>{const a=s.attendance[n]||'present';return a==='present'||a==='absent';}).length;
    const sorted=[...s.studentNames].sort((a,b)=>{
      const r=n=>{const a=s.attendance[n]||'present';if(['leave','leave_over','reschedule','transfer'].includes(a))return 2;if(s.summaries[n]?.sent)return 1;return 0;};
      return r(a)-r(b);
    });
    return `<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;
        background:var(--md-surface-low);border-radius:8px;margin-bottom:2px">
      <span style="color:var(--md-on-surface-variant)">${UI.icon('check_circle')}</span>
      <div style="flex:1">
        <strong style="font-size:13px">Class Ended!</strong>
        <div style="font-size:11px;color:var(--md-on-surface-variant)">
          Start class: ${s.startedAt||'—'} · End class: ${s.endedAt||'—'}
          <span class="badge ${done?'badge-green':'badge-red'}" style="margin-left:8px;font-size:9px">
            ${done?'All Done ✓':`${req-sent} Pending`}</span>
        </div>
      </div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title">
        <span>Student Summaries</span>
        <span class="text-muted" style="font-size:11px">Summary required · due: ${sumDueDate(s)} · 7 days</span>
      </div>
      ${sorted.map(n=>summaryRow(s,n)).join('')}
    </div>`;
  }

  function renderPostponed(s) {
    return `<div class="modal-section">
      <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;
          background:var(--md-warning-container);border-left:4px solid var(--md-warning);border-radius:0 8px 8px 0">
        <span style="color:var(--md-warning);font-size:24px">${UI.icon('pause_circle')}</span>
        <div><div style="font-weight:600;color:var(--md-on-warning-container)">Class Postponed</div>
          <div style="font-size:12px;color:var(--md-on-warning-container);margin-top:2px">${s.postponeRemark||'No reason given'}</div>
        </div></div></div>`;
  }

  /* ── ATTENDANCE HELPERS ───────────────────────────────── */
  window.calSetAttAndRefresh = function(sessionId, name, type) {
    AttendancePicker.set(sessionId, name, type, null);
    Modal.close('modal-class');
    setTimeout(()=>openClassModal(sessionId),50);
  };

  window.toggleAttMore = function(dropId) {
    const d=document.getElementById(dropId); if(!d) return;
    const open=d.style.display==='block';
    document.querySelectorAll('.att-more-drop').forEach(x=>x.style.display='none');
    if(!open) d.style.display='block';
  };
  document.addEventListener('click',()=>{
    document.querySelectorAll('.att-more-drop').forEach(d=>d.style.display='none');
    document.querySelectorAll('[id^="cmenu-"]').forEach(m=>m.style.display='none');
  });

  /* ── DISMISS BANNER ───────────────────────────────────── */
  window.calDismissBanner = function(sessionId, name) {
    const s=DB.sessions.find(x=>x.id===sessionId);
    if(s?.studentMeta?.[name]) s.studentMeta[name].dismissed=true;
    Modal.close('modal-class');
    setTimeout(()=>openClassModal(sessionId),50);
  };

  /* ── OPEN CLASS MODAL ─────────────────────────────────── */
  window.openClassModal = function(id) {
    const s=DB.sessions.find(x=>x.id===id); if(!s) return;
    const stMeta = window.sessionTypeMeta ? window.sessionTypeMeta(s.sessionType) : {id:'learning',consume:true,summary:true};
    const sm={
      upcoming:{badge:`<span class="badge badge-blue">${UI.icon('event','sm')} Upcoming</span>`,footer:`
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
          <div style="position:relative">
            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();calToggleClassMenu('${id}')"
              style="width:36px;padding:0;display:flex;align-items:center;justify-content:center;font-size:20px;line-height:1">⋮</button>
            <div id="cmenu-${id}" style="display:none;position:absolute;bottom:44px;left:0;
              background:var(--md-surface-lowest);border:1px solid var(--md-outline-variant);
              border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:400;min-width:140px;overflow:hidden">
              <button onclick="Modal.close('modal-class');setTimeout(()=>openEditClass('${id}'),80)"
                style="display:flex;align-items:center;gap:8px;width:100%;padding:10px 14px;border:none;cursor:pointer;font-size:13px;background:none;color:var(--md-on-surface);text-align:left">
                ${UI.icon('edit','sm')} Edit Class</button>
              <button onclick="Modal.close('modal-class');setTimeout(()=>calPostponeClass('${id}'),80)"
                style="display:flex;align-items:center;gap:8px;width:100%;padding:10px 14px;border:none;cursor:pointer;font-size:13px;background:none;color:var(--md-on-surface);text-align:left">
                ${UI.icon('pause_circle','sm')} Postpone</button>
              <button onclick="Modal.close('modal-class');setTimeout(()=>calSubstituteClass('${id}'),80)"
                style="display:flex;align-items:center;gap:8px;width:100%;padding:10px 14px;border:none;cursor:pointer;font-size:13px;background:none;color:var(--md-on-surface);text-align:left">
                ${UI.icon('swap_horiz','sm')} Substitute Teacher</button>
              <button onclick="Modal.close('modal-class');setTimeout(()=>calCombineClass('${id}'),80)"
                style="display:flex;align-items:center;gap:8px;width:100%;padding:10px 14px;border:none;cursor:pointer;font-size:13px;background:none;color:var(--md-on-surface);text-align:left">
                ${UI.icon('call_merge','sm')} Combine Class</button>
              <div style="border-top:1px solid var(--md-outline-variant)"></div>
              <button onclick="calDeleteClass('${id}')"
                style="display:flex;align-items:center;gap:8px;width:100%;padding:10px 14px;border:none;cursor:pointer;font-size:13px;background:none;color:var(--md-error);text-align:left">
                ${UI.icon('delete','sm')} Delete</button>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary" onclick="calAddStudentToClass('${id}')">
              ${UI.icon('person_add','sm')} Add Student</button>
            <button class="btn btn-primary" onclick="calStartClass('${id}')">
              ${UI.icon('play_arrow','sm')} Start Class</button>
          </div>
        </div>`},
      active:{badge:`<span class="badge badge-green">${UI.icon('play_circle','sm')} Started!</span>`,footer:`
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
          <div style="position:relative">
            <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();calToggleClassMenu('act-${id}')"
              style="width:36px;padding:0;display:flex;align-items:center;justify-content:center;font-size:20px;line-height:1">⋮</button>
            <div id="cmenu-act-${id}" style="display:none;position:absolute;bottom:44px;left:0;
              background:var(--md-surface-lowest);border:1px solid var(--md-outline-variant);
              border-radius:8px;box-shadow:0 8px 24px rgba(0,0,0,.15);z-index:400;min-width:140px;overflow:hidden">
              <button onclick="Modal.close('modal-class');setTimeout(()=>openEditClass('${id}'),80)"
                style="display:flex;align-items:center;gap:8px;width:100%;padding:10px 14px;border:none;cursor:pointer;font-size:13px;background:none;color:var(--md-on-surface);text-align:left">
                ${UI.icon('edit','sm')} Edit Class</button>
            </div>
          </div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary" onclick="calAddStudentToClass('${id}')">
              ${UI.icon('person_add','sm')} Add Student</button>
            <button class="btn btn-danger" onclick="calEndClass('${id}')">
              ${UI.icon('stop_circle','sm')} End Class</button>
          </div>
        </div>`},
      ended:{badge:`<span class="badge badge-yellow">${UI.icon('check_circle','sm')} Ended</span>`,footer: !stMeta.summary ? `
        <div style="display:flex;align-items:center;width:100%;gap:8px">
          <span class="text-muted" style="font-size:12px;margin-right:auto">${UI.icon('info','sm')} ${(stMeta.label||'').split(' · ')[0]} session — ไม่ต้องเขียน summary · ไม่หักชั่วโมง</span>
          <button class="btn btn-secondary" onclick="Modal.close('modal-class')">Close</button>
          <button class="btn btn-primary" onclick="calCloseClass('${id}')">${UI.icon('check_circle','sm')} Close Class</button>
        </div>` : `
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%">
          <button class="btn btn-secondary btn-sm" onclick="calAiSuggestAll('${id}')">
            Add Summary every student for "Close Class"</button>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary" onclick="Modal.close('modal-class')">Close</button>
            ${Object.values(s.summaries).filter(x=>x&&x.submitted&&!x.sent).length>0
              ? `<button class="btn btn-primary" onclick="calApproveAll('${id}')">
                  ${UI.icon('checklist','sm')} Approve All (${Object.values(s.summaries).filter(x=>x&&x.submitted&&!x.sent).length}) & Close</button>`
              : `<button class="btn btn-primary ${allSumsDone(s)?'':'btn-ghost'}" onclick="${allSumsDone(s)?`calCloseClass('${id}')`:`showToast('Complete all summaries first','warning')`}">
                  ${UI.icon('check_circle','sm')} Close Class${allSumsDone(s)?'':` (${Object.values(s.summaries).filter(x=>!x.sent&&x!==undefined).length} Pending)`}</button>`}
          </div>
        </div>`},
      postponed:{badge:`<span class="badge badge-yellow">${UI.icon('pause_circle','sm')} Postponed</span>`,footer:`
        <button class="btn btn-secondary" onclick="Modal.close('modal-class')">Close</button>`},
    };
    const meta=sm[s.state]||sm.upcoming;
    const ts=getSlot(s.slotId);
    const dateLabel=s.date?new Date(s.date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'}):'';
    const stBadge = window.sessionTypeBadge ? window.sessionTypeBadge(s.sessionType) : '';
    const titleHtml=`<div>
      <div style="display:flex;align-items:center;gap:8px">
        ${UI.icon('menu_book','sm')}
        <strong>${Utils.subjectLabel(s)}</strong>
        ${meta.badge}${stBadge}
      </div>
      <div style="font-size:11px;color:var(--md-on-surface-variant);font-weight:400;margin-top:3px">
        ${ts?ts.start+'–'+ts.end:''}${dateLabel?' · '+dateLabel:''}${s.teacher?' · '+s.teacher:''}
      </div>
    </div>`;
    const stBanner = stMeta.id!=='learning'
      ? `<div style="padding:8px 12px;background:var(--md-surface-low);border-left:3px solid var(--md-secondary,#8b5cf6);border-radius:0 8px 8px 0;margin-bottom:12px;font-size:12px">
          ${UI.icon('info','sm')} <strong>${(stMeta.label||'').split(' · ')[0]} session</strong> — ไม่หักชั่วโมง · ไม่ต้องเขียน summary</div>`
      : '';
    const body=s.state==='upcoming'?renderPre(s):s.state==='active'?renderActive(s):s.state==='postponed'?renderPostponed(s):renderEnded(s);
    Modal.create('modal-class',titleHtml,stBanner+body,meta.footer,'modal-tabbed modal-lg');
  };

  /* ── STATE TRANSITIONS ────────────────────────────────── */
  window.calStartClass = function(id) {
    const s=DB.sessions.find(x=>x.id===id); if(!s) return;
    s.studentNames.forEach(n=>{if(!s.attendance[n]) s.attendance[n]='present';});
    s.state='active'; s.startedAt=new Date().toTimeString().slice(0,5);
    Modal.close('modal-class');
    showToast(`Class started ▶ ${Utils.subjectLabel(s)}`,'success');
    if(window.calTab) calTab(window.calCurrentView||'week',document.querySelector('#view-calendar .tab.active'));
    setTimeout(()=>openClassModal(id),100);
  };

  window.calEndClass = function(id) {
    const s=DB.sessions.find(x=>x.id===id); if(!s) return;
    s.state='ended'; s.endedAt=new Date().toTimeString().slice(0,5);
    s.studentNames.forEach(n=>{const a=s.attendance[n]||'present';if(a==='present'||a==='absent') s.summaries[n]=s.summaries[n]||{text:'',sent:false};});
    Modal.close('modal-class');
    showToast(`Class ended · Write summaries for ${Utils.subjectLabel(s)}`,'info');
    setTimeout(()=>openClassModal(id),100);
  };

  window.calCloseClass = function(id) {
    showToast('Class closed ✓ · All summaries submitted','success');
    Modal.close('modal-class');
  };

  /* ── TOGGLE SUMMARY ROW (collapsible) ─────────────────── */
  window.calToggleSummary = function(rowId) {
    const el = document.getElementById(rowId+'-content');
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };

  /* ── TOGGLE CLASS OVERFLOW MENU ───────────────────────── */
  window.calToggleClassMenu = function(id) {
    const m = document.getElementById('cmenu-'+id);
    if (!m) return;
    const open = m.style.display === 'block';
    document.querySelectorAll('[id^="cmenu-"]').forEach(x=>x.style.display='none');
    if (!open) m.style.display = 'block';
  };

  /* ── AI SUGGEST ALL SUMMARIES ─────────────────────────── */
  window.calAiSuggestAll = function(id) {
    const s = DB.sessions.find(x=>x.id===id); if(!s) return;
    let count = 0;
    s.studentNames.forEach(n => {
      const att = s.attendance[n]||'present';
      if(['leave','leave_over','reschedule','transfer'].includes(att)) return;
      if(s.summaries[n]?.sent) return;
      if(!s.summaries[n]) s.summaries[n] = {};
      if(!s.summaries[n].text) {
        s.summaries[n].text = `Today in ${Utils.subjectLabel(s)}, ${n.split(' ')[0]} showed good focus and participation. Key concepts were reviewed and understood.`;
        count++;
      }
    });
    if(!count){showToast('All summaries already have content','info');return;}
    showToast(`AI suggested ${count} summaries — review before sending`,'info');
    setTimeout(()=>openClassModal(id),100);
  };

  window.calDeleteClass = function(id) {
    const s=DB.sessions.find(x=>x.id===id); if(!s) return;
    const label=Utils.subjectLabel(s);
    const grpCount=s.classGroupId?DB.sessions.filter(x=>x.classGroupId===s.classGroupId).length:1;
    const grpNote=grpCount>1
      ?`<div style="margin-top:8px;font-size:12px;padding:8px 10px;background:var(--md-warning-container);
          border-radius:6px;color:var(--md-on-warning-container)">
          ${UI.icon('warning','sm')} This class has <strong>${grpCount} sessions</strong> in the same group.
          Only this session will be deleted.</div>`:''
    Modal.create('modal-delete-class',`${UI.icon('delete','sm')} Delete Class`,
      `<div class="modal-section">
        <div style="font-size:14px;color:var(--md-on-surface)">
          Delete <strong>${label}</strong> on <strong>${s.date}</strong>?
        </div>
        <div style="margin-top:6px;font-size:12px" class="text-muted">This action cannot be undone.</div>
        ${grpNote}
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-delete-class')">Cancel</button>
       <button class="btn btn-danger" onclick="calConfirmDelete('${id}')">
         ${UI.icon('delete','sm')} Delete</button>`
    );
  };

  window.calConfirmDelete = function(id) {
    const s=DB.sessions.find(x=>x.id===id); if(!s) return;
    const i=DB.sessions.findIndex(x=>x.id===id);
    if(i!==-1) DB.sessions.splice(i,1);
    if(window.addNotification) addNotification({
      type:'admin', icon:'delete_forever',
      text:`Class ${Utils.subjectLabel(s)} on ${s.date} was deleted by Admin`,
      link:'calendar',
    });
    Modal.close('modal-delete-class');
    Modal.close('modal-class');
    showToast('Class deleted','info');
    if(window.calTab) calTab(window.calCurrentView||'week',document.querySelector('#view-calendar .tab.active'));
  };

  /* ── STUDENT MANAGEMENT ───────────────────────────────── */
  window.calRemoveStudent = function(sessionId, name) {
    const s=DB.sessions.find(x=>x.id===sessionId); if(!s) return;
    s.studentNames=s.studentNames.filter(n=>n!==name);
    delete s.attendance[name]; delete s.summaries[name];
    Modal.close('modal-class');
    showToast(`${name} removed`,'info');
    setTimeout(()=>openClassModal(sessionId),100);
  };

  window.calAddStudentToClass = function(sessionId) {
    const s=DB.sessions.find(x=>x.id===sessionId); if(!s) return;
    const avail=DB.students.filter(x=>!s.studentNames.includes(x.name));
    Modal.create('modal-add-student',`${UI.icon('person_add','sm')} Add Student`,`
      <div class="modal-section">
        <div class="text-muted" style="font-size:12px;margin-bottom:12px">
          ${UI.icon('info','sm')} <strong>${Utils.subjectLabel(s)}</strong> · ${s.date} · ${s.room}
          · <span class="badge ${s.studentNames.length>=6?'badge-red':'badge-green'}" style="font-size:10px">${s.studentNames.length}/6</span>
        </div>
        ${avail.length?avail.map(x=>{const m=smeta(x.name);return `<label style="display:flex;align-items:center;gap:10px;padding:8px 12px;
            border:1px solid var(--md-outline-variant);border-radius:8px;cursor:pointer;margin-bottom:6px;
            transition:background .15s" onmouseover="this.style.background='var(--md-surface-low)'" onmouseout="this.style.background=''">
          <input type="checkbox" id="add-${x.name.replace(/\s+/g,'_')}" style="width:14px;height:14px;accent-color:var(--md-primary)">
          <div class="avatar" style="width:28px;height:28px;font-size:11px;flex-shrink:0">${x.name[0]}</div>
          <div style="flex:1">
            <div style="font-weight:500;font-size:13px">${x.name}</div>
            <div class="text-muted" style="font-size:11px">${m.family} · <span class="badge ${m.cls}" style="font-size:9px">${m.left} left</span></div>
          </div></label>`;}).join(''):UI.emptyState('group','No students available','All students already in this class')}
        <div style="margin-top:10px;border-top:1px solid var(--md-outline-variant);padding-top:10px">
          <label class="settings-label">Or type name manually</label>
          <input class="settings-input" id="add-manual" placeholder="Enter name…" style="font-size:12px">
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-add-student')">Cancel</button>
       <button class="btn btn-primary" onclick="calConfirmAddStudent('${sessionId}')">＋ Add to Class</button>`
    );
  };

  window.calConfirmAddStudent = function(sessionId) {
    const s=DB.sessions.find(x=>x.id===sessionId); if(!s) return;
    const added=[];
    DB.students.forEach(x=>{
      const cb=document.getElementById(`add-${x.name.replace(/\s+/g,'_')}`);
      if(cb?.checked&&!s.studentNames.includes(x.name)){
        s.studentNames.push(x.name); s.attendance[x.name]='present'; added.push(x.name);
      }
    });
    const manual=document.getElementById('add-manual')?.value?.trim();
    if(manual&&!s.studentNames.includes(manual)){s.studentNames.push(manual);s.attendance[manual]='present';added.push(manual);}
    Modal.close('modal-add-student');
    if(added.length){
      if(!s.studentMeta) s.studentMeta={};
      added.forEach(n=>{if(!s.studentMeta[n]) s.studentMeta[n]={type:'new',note:'Added by Admin',approvedBy:'Admin',dismissed:false};});
      if(window.addNotification) addNotification({
        type:'new_student',recipientRole:'teacher',
        title:`New student added: ${added.join(', ')}`,
        text:`${Utils.subjectLabel(s)} · ${s.date}`,time:'Just now',sessionId,read:false,
      });
      showToast(`Added: ${added.join(', ')}`,'success');
      setTimeout(()=>openClassModal(sessionId),100);
    } else showToast('No students selected','info');
  };

})();
