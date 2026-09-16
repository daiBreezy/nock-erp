/* ============================================================
   calendar-class.js — Class Modal: Pre / Active / Ended states
   Depends on: data.js (window.DB, window.CONST)
   ============================================================ */
(function () {

  /* ── DATA (from global DB) ────────────────────────────── */
  const TIME_SLOTS = CONST.TIME_SLOTS;
  function getSlot(id){ return TIME_SLOTS.find(s=>s.id===id); }

  /* ── HELPERS ──────────────────────────────────────────── */
  // Replaces static SMETA — always computed live from DB.students
  function smeta(name){ return Utils.studentMeta(name); }
  function allSumsDone(s){
    return s.studentNames.every(n=>{
      const att=s.attendance[n]||'present';
      if(att==='leave'||att==='reschedule'||att==='transfer') return true;
      return s.summaries[n]?.sent===true;
    });
  }
  function sumDueDate(s){ return s.endedAt ? '20 May 2026 (7 days)' : '—'; }

  /* ── STUDENT ROW (pre/active) ─────────────────────────── */
  function studentAttRow(s, name, showRemove) {
    const att     = s.attendance[name] || 'present';
    const m       = smeta(name);
    const stu     = DB.students.find(x => x.name === name);
    const course  = stu?.courses?.find(c => c.name?.startsWith(s.subject)) || stu?.courses?.[0];
    const leftNum = course?.left ?? m.left;
    const total   = course?.hours ? Math.round(course.hours / 2) : null;
    const count   = total ? `(${leftNum}/${total})` : `${leftNum} left`;
    const ne      = name.replace(/'/g, "\\'");
    const sid     = s.id.replace(/'/g, "\\'");
    const isMore  = ['leave','reschedule','transfer'].includes(att);
    const dropId  = `drop-${s.id}-${name.replace(/\s+/g,'_')}`;

    return `<div class="att-row" style="align-items:center;gap:8px">
      <div class="avatar" style="width:30px;height:30px;font-size:11px;flex-shrink:0">${name[0]}</div>
      <div style="flex:1;min-width:0;overflow:hidden">
        <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${name}</div>
        <div style="font-size:11px;color:#9ca3af;white-space:nowrap">${m.family} · <span class="badge ${m.cls}" style="font-size:9px;padding:1px 5px">${count}</span></div>
      </div>
      <div style="display:flex;gap:3px;flex-shrink:0;align-items:center">
        <button title="Present" onclick="calSetAttAndRefresh('${sid}','${ne}','present')"
          style="width:30px;height:28px;border-radius:6px;border:2px solid ${att==='present'?'#10b981':'#e5e7eb'};background:${att==='present'?'#d1fae5':'#fff'};color:${att==='present'?'#065f46':'#9ca3af'};font-size:13px;font-weight:700;cursor:pointer;transition:all .15s">✓</button>
        <button title="Absent" onclick="calSetAttAndRefresh('${sid}','${ne}','absent')"
          style="width:30px;height:28px;border-radius:6px;border:2px solid ${att==='absent'?'#ef4444':'#e5e7eb'};background:${att==='absent'?'#fee2e2':'#fff'};color:${att==='absent'?'#991b1b':'#9ca3af'};font-size:13px;font-weight:700;cursor:pointer;transition:all .15s">✗</button>
        <div style="position:relative">
          <button title="${isMore ? att : 'More'}" onclick="event.stopPropagation();toggleAttMore('${dropId}')"
            style="width:30px;height:28px;border-radius:6px;border:2px solid ${isMore?'#6366f1':'#e5e7eb'};background:${isMore?'#ede9fe':'#fff'};color:${isMore?'#4338ca':'#9ca3af'};font-size:10px;letter-spacing:2px;cursor:pointer;transition:all .15s">•••</button>
          <div id="${dropId}" class="att-more-drop" style="display:none;position:absolute;right:0;top:32px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.12);z-index:300;min-width:140px;overflow:hidden">
            <button onclick="calSetAttAndRefresh('${sid}','${ne}','leave')" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;border:none;cursor:pointer;font-size:12px;background:${att==='leave'?'#fef9c3':'#fff'};color:${att==='leave'?'#92400e':'#374151'};text-align:left">📋 Leave</button>
            <button onclick="calSetAttAndRefresh('${sid}','${ne}','reschedule')" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;border:none;cursor:pointer;font-size:12px;background:${att==='reschedule'?'#ede9fe':'#fff'};color:${att==='reschedule'?'#6366f1':'#374151'};text-align:left">🔄 Reschedule</button>
            <button onclick="calSetAttAndRefresh('${sid}','${ne}','transfer')" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;border:none;cursor:pointer;font-size:12px;background:${att==='transfer'?'#ede9fe':'#fff'};color:${att==='transfer'?'#6366f1':'#374151'};text-align:left">↔️ Transfer</button>
            ${showRemove ? `<div style="border-top:1px solid #f3f4f6"></div>
            <button onclick="calRemoveStudent('${sid}','${ne}')" style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;border:none;cursor:pointer;font-size:12px;background:#fff;color:#ef4444;text-align:left">✕ Remove</button>` : ''}
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ── SUMMARY ROW (ended) ──────────────────────────────── */
  function summaryRow(s, name) {
    const att = s.attendance[name]||'present';
    const m = smeta(name);
    const noSummary = att==='leave'||att==='reschedule'||att==='transfer';
    const sum = s.summaries[name]||{};
    const attBadgeCls = att==='present'?'badge-green':att==='absent'?'badge-red':att==='leave'?'badge-yellow':'badge-blue';
    const headerHtml = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <div class="avatar" style="width:28px;height:28px;font-size:10px;flex-shrink:0">${name[0]}</div>
      <div style="flex:1"><strong>${name}</strong> · <span class="badge ${attBadgeCls}" style="font-size:10px">${att}</span>
        <span style="font-size:11px;color:#9ca3af;margin-left:6px">${m.family}</span></div>
    </div>`;
    if (noSummary) return `<div class="att-row" style="flex-direction:column;align-items:stretch">${headerHtml}
      <div style="font-size:11px;color:#9ca3af;padding:4px 8px">No summary needed for ${att}</div></div>`;
    if (sum.sent) return `<div class="att-row" style="flex-direction:column;align-items:stretch">${headerHtml}
      <div class="summary-sent">✅ Summary sent to parent · ${sum.text?'"'+sum.text.slice(0,60)+(sum.text.length>60?'…':'')+'"':'—'}</div></div>`;
    const ta_id = `sum-${s.id}-${name.replace(/\s/g,'_')}`;
    return `<div class="att-row" style="flex-direction:column;align-items:stretch">
      ${headerHtml}
      <div class="summary-pending" style="margin-bottom:6px;font-size:11px">📝 Summary required (due: ${sumDueDate(s)})</div>
      <textarea class="summary-ta" id="${ta_id}" placeholder="Write today's lesson summary for ${name.split(' ')[0]}…">${sum.text||''}</textarea>
      <div style="display:flex;gap:6px;justify-content:flex-end;margin-top:6px">
        <button class="btn btn-secondary btn-sm" onclick="calSaveDraft('${s.id}','${name}')">💾 Save Draft</button>
        <button class="btn btn-primary btn-sm" onclick="calSubmitSummary('${s.id}','${name}')">📨 Submit &amp; Send</button>
      </div>
    </div>`;
  }

  /* ── PRE-CLASS BODY ───────────────────────────────────── */
  function renderPre(s) {
    const ts = getSlot(s.slotId);
    return `<div class="modal-section">
      <div class="info-grid">
        <div class="info-item"><div class="label">Subject</div><strong>${Utils.subjectLabel(s)}</strong></div>
        <div class="info-item"><div class="label">Time</div>${ts?ts.start+'–'+ts.end:'—'}</div>
        <div class="info-item"><div class="label">Teacher</div>${s.teacher}</div>
        <div class="info-item"><div class="label">Room / Branch</div>${s.room} · ${s.branch}</div>
        <div class="info-item"><div class="label">Grade</div><span class="badge badge-gray">${s.grade}</span></div>
        <div class="info-item"><div class="label">Students</div>${s.studentNames.length} enrolled</div>
      </div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title" style="display:flex;justify-content:space-between">
        <span>📋 Pre-class Check-In</span>
        <button class="btn btn-secondary btn-xs" onclick="calAddStudentToClass('${s.id}')">＋ Add Student</button>
      </div>
      ${s.studentNames.map(n=>studentAttRow(s,n,true)).join('')}
    </div>`;
  }

  /* ── ACTIVE-CLASS BODY ────────────────────────────────── */
  function renderActive(s) {
    const ts = getSlot(s.slotId);
    return `<div class="modal-section">
      <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;margin-bottom:12px">
        <span style="font-size:18px">🟢</span>
        <div><strong style="color:#065f46">Class In Progress</strong>
          <div style="font-size:12px;color:#6b7280">${Utils.subjectLabel(s)} · ${ts?ts.start+'–'+ts.end:''} · Started ${s.startedAt||'—'}</div>
        </div>
      </div>
      <div class="info-grid">
        <div class="info-item"><div class="label">Teacher</div>${s.teacher}</div>
        <div class="info-item"><div class="label">Room</div>${s.room} · ${s.branch}</div>
        <div class="info-item"><div class="label">Grade</div><span class="badge badge-gray">${s.grade}</span></div>
        <div class="info-item"><div class="label">Students</div>${s.studentNames.length}</div>
      </div>
    </div>
    <div class="modal-section">
      <div class="modal-section-title" style="display:flex;justify-content:space-between">
        <span>✅ Attendance</span>
        <button class="btn btn-secondary btn-xs" onclick="calAddStudentToClass('${s.id}')">＋ Add Student</button>
      </div>
      ${s.studentNames.map(n=>studentAttRow(s,n,true)).join('')}
    </div>`;
  }

  /* ── ENDED-CLASS BODY ─────────────────────────────────── */
  function renderEnded(s) {
    const ts = getSlot(s.slotId);
    const done = allSumsDone(s);
    const sentCount    = Object.values(s.summaries).filter(x=>x.sent).length;
    const totalRequired = s.studentNames.filter(n=>{const a=s.attendance[n]||'present';return a==='present'||a==='absent';}).length;

    /* Sort: pending/draft → no-summary-needed → sent (bottom) */
    const sorted = [...s.studentNames].sort((a,b) => {
      const rank = n => {
        const att = s.attendance[n]||'present';
        if (['leave','reschedule','transfer'].includes(att)) return 1;
        if (s.summaries[n]?.sent === true) return 2;
        return 0;
      };
      return rank(a) - rank(b);
    });

    return `<div class="modal-section" style="padding-bottom:6px">
      <div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f3f4f6;border-radius:8px;margin-bottom:6px">
        <span style="font-size:15px">✅</span>
        <div style="flex:1;min-width:0">
          <strong style="font-size:13px">Class Ended</strong>
          <div style="font-size:11px;color:#6b7280">${Utils.subjectLabel(s)} · ${ts?ts.start+'–'+ts.end:''} · ${s.branch}</div>
          <div style="font-size:11px;color:#ef4444;margin-top:1px">📝 Summaries: ${sentCount}/${totalRequired} sent · Deadline: ${sumDueDate(s)}</div>
        </div>
        ${done?`<span class="badge badge-green" style="flex-shrink:0;font-size:10px">All Done ✓</span>`:`<span class="badge badge-red" style="flex-shrink:0;font-size:10px">${totalRequired-sentCount} pending</span>`}
      </div>
      ${!done?`<div style="font-size:11px;color:#92400e;background:#fef9c3;border-radius:6px;padding:5px 10px;margin-bottom:6px">⚠️ Complete all summaries and submit to parents.</div>`:''}
    </div>
    <div class="modal-section">
      <div class="modal-section-title" style="font-size:12px;margin-bottom:6px">📝 Student Summaries</div>
      ${sorted.map(n=>summaryRow(s,n)).join('')}
    </div>`;
  }

  /* ── ATTENDANCE QUICK HELPERS ────────────────────────── */
  window.calSetAttAndRefresh = function(sessionId, name, type) {
    AttendancePicker.set(sessionId, name, type, null);
    Modal.close('modal-class');
    setTimeout(() => openClassModal(sessionId), 50);
  };

  window.toggleAttMore = function(dropId) {
    const drop = document.getElementById(dropId);
    if (!drop) return;
    const wasOpen = drop.style.display === 'block';
    document.querySelectorAll('.att-more-drop').forEach(d => d.style.display = 'none');
    if (!wasOpen) drop.style.display = 'block';
  };

  document.addEventListener('click', () => {
    document.querySelectorAll('.att-more-drop').forEach(d => d.style.display = 'none');
  });

  /* ── OPEN CLASS MODAL ─────────────────────────────────── */
  window.openClassModal = function(id) {
    const s = DB.sessions.find(x=>x.id===id);
    if (!s) return;
    const stateMeta = {
      upcoming:{ badge:'<span class="badge badge-blue">📅 Upcoming</span>',  footer:`
        <button class="btn btn-secondary" onclick="Modal.close('modal-class')">Close</button>
        <button class="btn btn-secondary" onclick="openEditClass('${id}')">✏️ Edit</button>
        <button class="btn btn-primary" onclick="calStartClass('${id}')">▶ Start Class</button>` },
      active:  { badge:'<span class="badge badge-green">🟢 In Progress</span>', footer:`
        <button class="btn btn-secondary" onclick="Modal.close('modal-class')">Close</button>
        <button class="btn btn-danger" onclick="calEndClass('${id}')">⏹ End Class</button>` },
      ended:   { badge:'<span class="badge badge-gray">✅ Ended</span>', footer:`
        <button class="btn btn-secondary" onclick="Modal.close('modal-class')">Close</button>
        <button class="btn btn-primary ${allSumsDone(s)?'':'btn-ghost'}" onclick="${allSumsDone(s)?`calCloseClass('${id}')`:`showToast('Complete all summaries first','warning')`}">
          ✓ Close Class ${allSumsDone(s)?'':'(summaries pending)'}
        </button>` },
    };
    const m = stateMeta[s.state];
    const body = (s.state==='upcoming'?renderPre:s.state==='active'?renderActive:renderEnded)(s);
    const ts = TIME_SLOTS.find(t=>t.id===s.slotId&&t.type==='class');
    Modal.create('modal-class',
      `📚 ${Utils.subjectLabel(s)} ${m.badge}`,
      body, m.footer, 'modal-tabbed modal-lg');
  };

  /* ── STATE TRANSITIONS ────────────────────────────────── */
  window.calStartClass = function(id) {
    const s = DB.sessions.find(x=>x.id===id);
    if (!s) return;
    // Default attendance to present for all
    s.studentNames.forEach(n=>{ if(!s.attendance[n]) s.attendance[n]='present'; });
    s.state='active';
    s.startedAt=new Date().toTimeString().slice(0,5);
    Modal.close('modal-class');
    showToast(`Class started ▶ ${Utils.subjectLabel(s)}`,'success');
    // Re-render calendar
    if (window.calTab) calTab(window.currentViewPublic||'week', document.querySelector('#view-calendar .tab.active'));
    setTimeout(()=>openClassModal(id),100);
  };

  window.calEndClass = function(id) {
    const s = DB.sessions.find(x=>x.id===id);
    if (!s) return;
    s.state='ended';
    s.endedAt=new Date().toTimeString().slice(0,5);
    // Initialize summaries for present/absent students
    s.studentNames.forEach(n=>{
      const att=s.attendance[n]||'present';
      if(att==='present'||att==='absent') s.summaries[n]=s.summaries[n]||{text:'',sent:false};
    });
    Modal.close('modal-class');
    showToast(`Class ended · Write summaries for ${Utils.subjectLabel(s)}`,'info');
    setTimeout(()=>openClassModal(id),100);
  };

  window.calCloseClass = function(id) {
    showToast('Class closed ✓ · All summaries submitted','success');
    Modal.close('modal-class');
  };

  /* ── ATTENDANCE ── delegated to AttendancePicker ─────── */
  /* calSetAtt is now defined globally in attendance-picker.js */

  window.calRemoveStudent = function(sessionId, name) {
    const s = DB.sessions.find(x=>x.id===sessionId);
    if (!s) return;
    s.studentNames=s.studentNames.filter(n=>n!==name);
    delete s.attendance[name];
    delete s.summaries[name];
    Modal.close('modal-class');
    showToast(`${name} removed from class`,'info');
    setTimeout(()=>openClassModal(sessionId),100);
  };

  /* ── SUMMARY ACTIONS ──────────────────────────────────── */
  window.calSaveDraft = function(sessionId, name) {
    const s=DB.sessions.find(x=>x.id===sessionId);
    if(!s) return;
    const key=`sum-${sessionId}-${name.replace(/\s/g,'_')}`;
    const ta=document.getElementById(key);
    if(!ta) return;
    if(!s.summaries[name]) s.summaries[name]={text:'',sent:false};
    s.summaries[name].text=ta.value;
    showToast('Draft saved','success');
  };

  window.calSubmitSummary = function(sessionId, name) {
    const s=DB.sessions.find(x=>x.id===sessionId);
    if(!s) return;
    const key=`sum-${sessionId}-${name.replace(/\s/g,'_')}`;
    const ta=document.getElementById(key);
    const text=ta?.value?.trim()||'';
    if(!text){ showToast('Please write a summary first','warning'); return; }
    s.summaries[name]={text,sent:true};
    showToast(`Summary sent to ${smeta(name).family} ✓`,'success');
    Modal.close('modal-class');
    setTimeout(()=>openClassModal(sessionId),100);
  };
  /* ── ADD STUDENT TO CLASS ─────────────────────────────── */
  window.calAddStudentToClass = function(sessionId) {
    const s=DB.sessions.find(x=>x.id===sessionId);
    if(!s) return;
    const all=['Mia Tanaka','Tom Chen','Ploy Srirak','James Wilson','Kevin Park'];
    const avail=all.filter(n=>!s.studentNames.includes(n));
    Modal.create('modal-add-student','＋ Add Student to Class',`
      <div class="modal-section">
        <div style="font-size:12px;color:#6b7280;margin-bottom:12px">
          Adding to: <strong>${Utils.subjectLabel(s)}</strong> · ${s.date} · ${s.room}
        </div>
        ${avail.length ? avail.map(n=>{
          const m=SMETA[n]||{family:'—',left:'?',cls:'badge-gray'};
          return `<div style="display:flex;align-items:center;gap:10px;padding:8px;border:1px solid #f3f4f6;border-radius:6px;margin-bottom:6px">
            <input type="checkbox" id="add-${n.replace(/\s/g,'_')}" style="width:14px;height:14px;accent-color:#6366f1">
            <div class="avatar" style="width:26px;height:26px;font-size:10px">${n[0]}</div>
            <div style="flex:1"><strong style="font-size:13px">${n}</strong>
              <div style="font-size:11px;color:#9ca3af">${m.family} · <span class="badge ${m.cls}" style="font-size:10px">${m.left} left</span></div>
            </div>
          </div>`;
        }).join('') : '<div style="color:#9ca3af;font-size:13px;text-align:center;padding:20px">All enrolled students already in this class</div>'}
        <div style="margin-top:10px;border-top:1px solid #f3f4f6;padding-top:10px">
          <input class="settings-input" id="add-manual-name" placeholder="Or type name manually…" style="font-size:12px">
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-add-student')">Cancel</button>
       <button class="btn btn-primary" onclick="calConfirmAddStudent('${sessionId}')">＋ Add to Class</button>`
    );
  };

  window.calConfirmAddStudent = function(sessionId) {
    const s=DB.sessions.find(x=>x.id===sessionId);
    if(!s) return;
    const added=[];
    ['Mia Tanaka','Tom Chen','Ploy Srirak','James Wilson','Kevin Park'].forEach(n=>{
      const cb=document.getElementById(`add-${n.replace(/\s/g,'_')}`);
      if(cb?.checked){ s.studentNames.push(n); s.attendance[n]='present'; added.push(n); }
    });
    const manual=document.getElementById('add-manual-name')?.value?.trim();
    if(manual&&!s.studentNames.includes(manual)){ s.studentNames.push(manual); s.attendance[manual]='present'; added.push(manual); }
    Modal.close('modal-add-student');
    if(added.length){ showToast(`Added: ${added.join(', ')}`,'success'); setTimeout(()=>openClassModal(sessionId),100); }
    else showToast('No students selected','info');
  };

  /* ── CREATE / EDIT CLASS ──────────────────────────────── */
  const TSLOTS=['10:00–12:00','13:00–15:00','15:00–17:00','18:00–20:00'];
  const SUBJECTS2=['Math G5','Math G6','Eng Read','Science','Thai Lang'];
  const TEACHERS2=['Kru Arm','Kru Bee','Kru Cat','Kru Dan','Kru Eve'];
  const ROOMS2=['Room 1','Room 2','Room 3'];

  function classForm(prefill={}) {
    return `<div class="modal-section">
      <div class="settings-row">
        <div class="settings-group"><label class="settings-label">Date</label>
          <input class="settings-input" type="date" value="${prefill.date||new Date().toISOString().slice(0,10)}"></div>
        <div class="settings-group"><label class="settings-label">Time Block</label>
          <select class="settings-input">${TSLOTS.map(t=>`<option ${prefill.time===t?'selected':''}>${t}</option>`).join('')}</select></div>
      </div>
      <div class="settings-row">
        <div class="settings-group"><label class="settings-label">Subject</label>
          <select class="settings-input"><option value="">— Select —</option>${SUBJECTS2.map(x=>`<option ${prefill.subject===x?'selected':''}>${x}</option>`).join('')}</select></div>
        <div class="settings-group"><label class="settings-label">Grade (avg)</label>
          <select class="settings-input"><option value="">— Select —</option>${['G3','G4','G5','G6'].map(g=>`<option ${prefill.grade===g?'selected':''}>${g}</option>`).join('')}</select></div>
      </div>
      <div class="settings-row">
        <div class="settings-group"><label class="settings-label">Teacher</label>
          <select class="settings-input"><option value="">— Select —</option>${TEACHERS2.map(t=>`<option ${prefill.teacher===t?'selected':''}>${t}</option>`).join('')}</select></div>
        <div class="settings-group"><label class="settings-label">Room</label>
          <select class="settings-input"><option value="">— Select —</option>${ROOMS2.map(r=>`<option ${prefill.room===r?'selected':''}>${r}</option>`).join('')}</select></div>
      </div>
      <div class="settings-row">
        <div class="settings-group"><label class="settings-label">Branch</label>
          <select class="settings-input"><option ${prefill.branch==='Sukhumvit'?'selected':''}>Sukhumvit</option><option ${prefill.branch==='Silom'?'selected':''}>Silom</option></select></div>
        <div class="settings-group"><label class="settings-label">Max Students</label>
          <input class="settings-input" type="number" value="${prefill.maxStudents||8}" min="1" max="20"></div>
      </div>
      <div class="settings-group"><label class="settings-label">Notes</label>
        <textarea class="settings-input" rows="2" style="resize:none" placeholder="Optional notes…"></textarea></div>
    </div>`;
  }

  window.openCreateClass = function(opts) {
    opts = opts || {};
    // Convert slotId → "HH:MM–HH:MM" string for the Time Block dropdown
    let timePrefill = '';
    if (opts.slotId !== undefined) {
      const ts = TIME_SLOTS.find(t => t.id === opts.slotId && t.type === 'class');
      if (ts) timePrefill = ts.start + '–' + ts.end;
    }
    Modal.create('modal-create-class','＋ Create Class', classForm({
      date:    opts.date    || '',
      time:    timePrefill,
      teacher: opts.teacher || '',
    }),
      `<button class="btn btn-secondary" onclick="Modal.close('modal-create-class')">Cancel</button>
       <button class="btn btn-primary" onclick="showToast('Class created ✓','success');Modal.close('modal-create-class')">✓ Create</button>`
    );
  };

  window.openEditClass = function(id) {
    const s=DB.sessions.find(x=>x.id===id);
    const ts=TIME_SLOTS.find(t=>t.id===s?.slotId&&t.type==='class');
    Modal.create('modal-edit-class','✏️ Edit Class', classForm({
      date:s?.date, time:ts?ts.start+'–'+ts.end:'', subject:s?.subject,
      grade:s?.grade, teacher:s?.teacher, room:s?.room, branch:s?.branch }),
      `<button class="btn btn-secondary" onclick="Modal.close('modal-edit-class')">Cancel</button>
       <button class="btn btn-primary" onclick="showToast('Saved ✓','success');Modal.close('modal-edit-class')">Save Changes</button>`
    );
  };

})();
