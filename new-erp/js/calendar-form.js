/* ============================================================
   calendar-form.js — Create/Edit Class + Summary Actions
   Depends on calendar-class.js (openClassModal is window global)
   ============================================================ */
(function () {

  /* ── SESSION TYPE (spec LOGIC-SPEC-10 §0) ─────────────────
     Learning หัก+summary · Test/Interview/Other ไม่หัก ไม่ summary */
  const SESSION_TYPES = [
    { id:'learning',  label:'Learning · สอนปกติ',       color:'blue',   consume:true,  summary:true  },
    { id:'test',      label:'Test · วัดระดับ',           color:'purple', consume:false, summary:false },
    { id:'interview', label:'Interview · คุยผู้ปกครอง',   color:'teal',   consume:false, summary:false },
    { id:'other',     label:'Other · อื่นๆ',             color:'gray',   consume:false, summary:false },
  ];
  window.SESSION_TYPES = SESSION_TYPES;
  window.sessionTypeMeta = t => SESSION_TYPES.find(x => x.id === (t||'learning')) || SESSION_TYPES[0];
  /* badge เฉพาะ non-learning (learning = default ไม่ต้องรก) */
  window.sessionTypeBadge = function(t){
    const m = window.sessionTypeMeta(t);
    return m.id === 'learning' ? '' : UI.badge(m.label.split(' · ')[0], m.color);
  };
  /* seed: mark 2 upcoming sessions เป็น test/interview เพื่อโชว์ (ครั้งเดียว) */
  (function seedTypes(){
    const up = (DB.sessions||[]).filter(s=>s.state==='upcoming');
    if (up[0] && !up[0].sessionType) up[0].sessionType = 'test';
    if (up[1] && !up[1].sessionType) up[1].sessionType = 'interview';
  })();

  /* ── SUMMARY ACTIONS ──────────────────────────────────── */
  window.calSaveDraft = function(sessionId, name) {
    const s=DB.sessions.find(x=>x.id===sessionId); if(!s) return;
    const ta=document.getElementById(`sum-${sessionId}-${name.replace(/\s/g,'_')}`); if(!ta) return;
    if(!s.summaries[name]) s.summaries[name]={text:'',sent:false};
    s.summaries[name].text=ta.value;
    showToast('Draft saved','success');
  };

  window.calSubmitSummary = function(sessionId, name) {
    const s=DB.sessions.find(x=>x.id===sessionId); if(!s) return;
    const ta=document.getElementById(`sum-${sessionId}-${name.replace(/\s/g,'_')}`);
    const text=ta?.value?.trim()||'';
    if(!text){showToast('Please write a summary first','warning');return;}
    /* ครู submit → รอ Admin/Manager approve ก่อนส่ง Parent */
    s.summaries[name]={text,submitted:true,sent:false};
    showToast('Submitted — waiting for Admin/Manager approval','info');
    Modal.close('modal-class');
    setTimeout(()=>{
      openClassModal(sessionId);
      const rowId=`sumrow-${sessionId}-${name.replace(/\s+/g,'_')}`;
      setTimeout(()=>{ if(window.calToggleSummary) calToggleSummary(rowId); },150);
    },100);
  };

  /* Admin/Manager approve รายคน (ใน Class Modal) */
  window.calApproveSummary = function(sessionId, name) {
    const s=DB.sessions.find(x=>x.id===sessionId); if(!s) return;
    const sum=s.summaries[name];
    if(!sum||!sum.submitted||sum.sent) return;
    sum.sent=true; sum.approvedBy='Admin Nock';
    showToast(`Approved & sent to ${name.split(' ')[0]}'s parent ✓`,'success');
    if(window.refreshSummaries) refreshSummaries();
    Modal.close('modal-class');
    setTimeout(()=>openClassModal(sessionId),80);
  };

  /* Approve ทุกคนที่ submit แล้ว + ปิด class ถ้า summary ครบ */
  window.calApproveAll = function(sessionId) {
    const s=DB.sessions.find(x=>x.id===sessionId); if(!s) return;
    let n=0;
    Object.values(s.summaries).forEach(sum=>{
      if(sum&&sum.submitted&&!sum.sent){sum.sent=true;sum.approvedBy='Admin Nock';n++;}
    });
    if(window.refreshSummaries) refreshSummaries();
    if(window._calAllSumsDone&&_calAllSumsDone(s)){
      showToast(`Approved ${n} summaries ✓ · Class closed`,'success');
      Modal.close('modal-class');
    } else {
      showToast(`Approved ${n} summaries ✓ — ยังมี summary ที่ครูยังไม่ submit`,'warning');
      Modal.close('modal-class');
      setTimeout(()=>openClassModal(sessionId),80);
    }
  };

  /* ครูดึงกลับมาแก้ก่อน Admin approve */
  window.calRecallSummary = function(sessionId, name) {
    const s=DB.sessions.find(x=>x.id===sessionId); if(!s||!s.summaries[name]) return;
    if(s.summaries[name].sent){showToast('Sent แล้ว — แก้ไม่ได้','warning');return;}
    s.summaries[name].submitted=false;
    showToast('Recalled — กลับเป็น draft แล้ว','info');
    Modal.close('modal-class');
    setTimeout(()=>openClassModal(sessionId),80);
  };

  /* ── DOW CHIP SELECTOR ────────────────────────────────── */
  const DOW = [
    {n:1,l:'Mon'},{n:2,l:'Tue'},{n:3,l:'Wed'},
    {n:4,l:'Thu'},{n:5,l:'Fri'},{n:6,l:'Sat'},{n:0,l:'Sun'},
  ];

  function dowSelector(preset=[]) {
    return `<div class="dow-chips" id="cf-dow-wrap">
      ${DOW.map(d=>`<label class="dow-chip${preset.includes(d.n)?' active':''}" id="dc-${d.n}">
        <input type="checkbox" name="cf-dow" value="${d.n}"
          ${preset.includes(d.n)?'checked':''}
          onchange="cfDowToggle(${d.n},this.checked)"
          style="display:none">
        ${d.l}
      </label>`).join('')}
    </div>`;
  }

  window.cfDowToggle = function(n, checked) {
    const lbl = document.getElementById('dc-'+n);
    if (lbl) lbl.classList.toggle('active', checked);
  };

  function readSelectedDays() {
    return [...document.querySelectorAll('input[name="cf-dow"]:checked')]
      .map(x => parseInt(x.value));
  }

  /* ── SESSION DATE GENERATOR ───────────────────────────── */
  function generateSessionDates(days) {
    const today = new Date(); today.setHours(0,0,0,0);
    const results = [], counts = {};
    for (let i = 0; i <= 70; i++) {
      const d = new Date(today); d.setDate(today.getDate() + i);
      const dow = d.getDay();
      if (!days.includes(dow)) continue;
      counts[dow] = (counts[dow]||0) + 1;
      if (counts[dow] > 8) continue;
      const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,'0'), dd=String(d.getDate()).padStart(2,'0');
      results.push(`${y}-${m}-${dd}`);
    }
    return results.sort();
  }

  /* ── CLASS FORM HTML ──────────────────────────────────── */
  function classForm(p={}) {
    const slots = CONST.TIME_SLOTS.filter(t=>t.type==='class');
    return `<div class="modal-section">
      <div style="padding:10px 12px;background:var(--md-warning-container);border:1px solid var(--md-warning);
          border-radius:8px;margin-bottom:14px;font-size:12px;color:var(--md-on-warning-container)">
        ${UI.icon('info','sm')} ระบบสร้าง Class <strong>8 weeks</strong> ข้างหน้าอัตโนมัติ — ถ้าไม่ Delete จะสร้างต่อทุก 8 สัปดาห์
      </div>
      <div class="settings-group"><label class="settings-label">Class Name</label>
        <input class="settings-input" type="text" id="cf-classname"
          value="${p.className||''}" placeholder="ตั้งชื่อ Class หรือ ให้ระบบ Default ชื่อตามวิชา และเกรด ที่เลือก"
          data-user-edited="${p.className?'1':''}"
          oninput="this.dataset.userEdited='1'"></div>
      <div class="settings-group">
        <label class="settings-label">Date — เลือกวันที่ต้องการสร้าง Class นี้</label>
        ${dowSelector(p.days||[])}
        <div class="settings-hint">Creates 8 sessions per selected day (next 70 days)</div>
      </div>
      <div class="settings-row">
        <div class="settings-group"><label class="settings-label">Subject — เลือกวิชา</label>
          <select class="settings-input" id="cf-subject" onchange="cfAutoName()">
            <option value="">Select Subject</option>
            ${Utils.subjectsFor().map(x=>`<option ${p.subject===x?'selected':''}>${x}</option>`).join('')}
          </select></div>
        <div class="settings-group"><label class="settings-label">Teacher — เลือกครู</label>
          <select class="settings-input" id="cf-teacher" onchange="cfAutoName()">
            <option value="">Select Teacher</option>
            ${CONST.TEACHERS.map(t=>`<option ${p.teacher===t?'selected':''}>${t}</option>`).join('')}
          </select></div>
      </div>
      <div class="settings-row">
        <div class="settings-group"><label class="settings-label">Grade — เลือกชั้นเรียนสำหรับ Class นี้</label>
          <select class="settings-input" id="cf-grade" onchange="cfAutoName()">
            <option value="">Select Grade</option>
            ${CONST.GRADES.map(g=>`<option ${p.grade===g?'selected':''}>${g}</option>`).join('')}
          </select></div>
        <div class="settings-group"><label class="settings-label">Time — เลือกเวลาสำหรับ Class นี้</label>
          <select class="settings-input" id="cf-time">
            ${slots.map(t=>`<option value="${t.id}" ${p.slotId===t.id?'selected':''}>${t.start}–${t.end}</option>`).join('')}
          </select></div>
      </div>
      <div class="settings-group"><label class="settings-label">Class Type — ประเภท session</label>
        <select class="settings-input" id="cf-type" onchange="cfTypeHint()">
          ${SESSION_TYPES.map(t=>`<option value="${t.id}" ${(p.sessionType||'learning')===t.id?'selected':''}>${t.label}</option>`).join('')}
        </select>
        <div class="settings-hint" id="cf-type-hint"></div></div>
    </div>`;
  }

  function readForm() {
    return {
      className: (document.getElementById('cf-classname')?.value||'').trim(),
      days:      readSelectedDays(),
      slotId:    parseInt(document.getElementById('cf-time')?.value)||0,
      subject:   document.getElementById('cf-subject')?.value||'',
      grade:     document.getElementById('cf-grade')?.value||'',
      teacher:   document.getElementById('cf-teacher')?.value||'',
      sessionType: document.getElementById('cf-type')?.value||'learning',
    };
  }

  /* hint ใต้ Type: บอกพฤติกรรม (หัก/summary) */
  window.cfTypeHint = function(){
    const el = document.getElementById('cf-type-hint'); if(!el) return;
    const m = window.sessionTypeMeta(document.getElementById('cf-type')?.value);
    el.textContent = m.consume
      ? 'หักชั่วโมง + ต้องเขียน summary'
      : 'ไม่หักชั่วโมง · ไม่ต้องเขียน summary';
  };

  /* ── CREATE CLASS ─────────────────────────────────────── */
  window.openCreateClass = function(opts={}) {
    const preset = opts.date ? [new Date(opts.date+'T12:00:00').getDay()] : [];
    Modal.create('modal-create-class',`${UI.icon('add_circle','sm')} Create New Class`,
      classForm({ days: preset, slotId: opts.slotId??0, teacher: opts.teacher||'' }),
      `<button class="btn btn-secondary" onclick="Modal.close('modal-create-class')">Cancel</button>
       <button class="btn btn-primary" onclick="calConfirmCreate()">
         ${UI.icon('check','sm')} Create Class</button>`
    );
  };
  // alias for old callers
  window.calOpenCreateClass = window.openCreateClass;

  window.calConfirmCreate = function() {
    const f = readForm();
    if (!f.subject) { showToast('Please select a Subject','warning'); return; }
    if (!f.teacher) { showToast('Please select a Teacher','warning'); return; }
    if (!f.days.length) { showToast('Select at least one day of week','warning'); return; }
    const dates = generateSessionDates(f.days);
    if (!dates.length) { showToast('No sessions in the next 70 days','warning'); return; }
    const groupId = 'grp_' + Date.now();
    const branch  = CONST.BRANCHES[0];
    dates.forEach((date, i) => {
      DB.sessions.push({
        id: 'ns_' + Date.now() + '_' + i, date, slotId: f.slotId, col: 1,
        subject: f.subject, grade: f.grade, teacher: f.teacher, branch,
        state: 'upcoming', color: CONST.SUBJECT_COLOR[f.subject]||'blue',
        studentNames: [], attendance: {}, summaries: {},
        className: f.className, classGroupId: groupId, sessionType: f.sessionType||'learning',
      });
    });
    Modal.close('modal-create-class');
    const dc = f.days.length;
    showToast(`${dates.length} sessions created (${dc} day${dc>1?'s':''} × 8 wks) ✓`, 'success');
    if (window.calTab) calTab(window.calCurrentView||'week', document.querySelector('#view-calendar .tab.active'));
  };

  /* ── EDIT CLASS ───────────────────────────────────────── */
  window.openEditClass = function(id) {
    const s = DB.sessions.find(x=>x.id===id); if (!s) return;
    const preset = s.date ? [new Date(s.date+'T12:00:00').getDay()] : [];
    Modal.create('modal-edit-class',`${UI.icon('edit','sm')} Edit Class`,
      classForm({
        days: preset, slotId: s.slotId,
        subject: s.subject, grade: s.grade,
        teacher: s.teacher, className: s.className||'', sessionType: s.sessionType||'learning',
      }),
      `<button class="btn btn-secondary" onclick="Modal.close('modal-edit-class')">Cancel</button>
       <button class="btn btn-primary" onclick="calConfirmEdit('${id}')">
         ${UI.icon('check','sm')} Save</button>`
    );
  };

  window.calConfirmEdit = function(id) {
    const f = readForm(), s = DB.sessions.find(x=>x.id===id); if (!s) return;
    Object.assign(s, {
      slotId: f.slotId, subject: f.subject, grade: f.grade,
      teacher: f.teacher, className: f.className, sessionType: f.sessionType||'learning',
    });
    if (window.addNotification) addNotification({
      type: 'admin', icon: 'edit_calendar',
      text: `Class ${Utils.subjectLabel(s)} updated by Admin`,
      link: 'calendar',
    });
    Modal.close('modal-edit-class');
    showToast('Class updated ✓', 'success');
    if (window.calTab) calTab(window.calCurrentView||'week', document.querySelector('#view-calendar .tab.active'));
  };

  /* ── AUTO-GENERATE CLASS NAME ─────────────────────────── */
  window.cfAutoName = function() {
    const nameEl = document.getElementById('cf-classname');
    if (!nameEl || nameEl.dataset.userEdited) return;
    const subj    = document.getElementById('cf-subject')?.value;
    const grade   = document.getElementById('cf-grade')?.value;
    const teacher = document.getElementById('cf-teacher')?.value;
    if (!subj) return;
    let lbl = grade ? Utils.subjectLabel({subject:subj, grade}) : subj;
    if (teacher) lbl += ` — ${teacher}`;
    nameEl.value = lbl;
  };

})();
