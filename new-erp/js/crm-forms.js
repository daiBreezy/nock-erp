/* ============================================================
   crm-forms.js — Send Form Wizard (3-Step)
   Step 1: Form Type  |  Step 2: นักเรียน & Class  |  Step 3: Confirm & Send
   ไม่มี stage-gating — Admin เลือก Form type ได้อิสระ
   รองรับ multi-child + multi-subject + Admin suggest class ก่อนส่ง
   ============================================================ */
(function () {

/* ── HELPERS ─────────────────────────────────────────────── */
function genToken() { return 'tok_' + Math.random().toString(36).slice(2, 10); }
window._crmFormTypeLabel = function (t) {
  return t === 'enrollment' ? 'Enrollment Form' : t === 'trial' ? 'Trial Form' : 'Test Form';
};
function formTypeLabel(t) { return window._crmFormTypeLabel(t); }
function recommendFormType(stage) {
  if (['new','contacting'].includes(stage))        return 'test';
  if (['test_scheduled','tested'].includes(stage)) return 'trial';
  return 'enrollment';
}
function classTime(cls) {
  if (cls.startTime) {
    const [h, m] = cls.startTime.split(':').map(Number);
    const endH = h + (cls.duration || 2);
    return `${cls.startTime}–${String(endH).padStart(2,'0')}:${m||'00'}`;
  }
  const slot = (CONST.TIME_SLOTS || []).find(t => t.id === cls.slotId);
  return slot ? `${slot.start}–${slot.end}` : '—';
}
function getClasses(subject, grade, branch) {
  return (DB.classes || []).filter(c =>
    (!subject || c.subject === subject) &&
    (!grade   || c.grade   === grade)   &&
    (!branch  || c.branch  === branch)  &&
    c.status !== 'archived'
  );
}

/* ── STEP PROGRESS BAR ───────────────────────────────────── */
function _sfStepBar() {
  const labels = ['Form Type', 'นักเรียน & Class', 'Confirm & Send'];
  const cur = window._sf?.step || 1;
  return `<div style="display:flex;align-items:flex-start;margin-bottom:18px">
    ${labels.map((lbl, i) => {
      const n = i + 1, done = n < cur, active = n === cur;
      const bg   = (done || active) ? 'var(--md-primary)' : 'var(--md-outline-variant)';
      const clr  = (done || active) ? 'var(--md-on-primary)' : 'var(--md-on-surface-variant)';
      const line = done ? 'var(--md-primary)' : 'var(--md-outline-variant)';
      return `<div style="display:flex;align-items:flex-start;flex:1;min-width:0">
        <div style="display:flex;flex-direction:column;align-items:center;gap:3px;flex-shrink:0">
          <div style="width:26px;height:26px;border-radius:50%;background:${bg};color:${clr};
               display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">
            ${done ? UI.icon('check','sm') : n}</div>
          <span style="font-size:10px;font-weight:${active?'700':'400'};
                color:${active?'var(--md-primary)':'var(--md-on-surface-variant)'};
                white-space:nowrap;max-width:82px;text-align:center">${lbl}</span>
        </div>
        ${n < labels.length
          ? `<div style="flex:1;height:2px;background:${line};margin:0 3px;margin-top:12px"></div>`
          : ''}
      </div>`;
    }).join('')}
  </div>`;
}

/* ── STEP 1: FORM TYPE ───────────────────────────────────── */
function _sfStep1() {
  const lead = DB.leads.find(l => l.id === window._sf.leadId) || {};
  const sel  = window._sf.type;
  const rec  = recommendFormType(lead.stage || 'new');
  const subs = (DB.formSubmissions || []).filter(s => s.leadId === window._sf.leadId);

  const card = (t, icon, lbl, desc) => {
    const isSel = sel === t;
    const hasSub = subs.some(s => s.type === t);
    const last   = hasSub ? subs.filter(s => s.type === t).slice(-1)[0] : null;
    return `<div style="display:flex;align-items:stretch;cursor:pointer;
             border:2px solid ${isSel ? 'var(--md-primary)' : 'var(--md-outline-variant)'};
             border-radius:10px;overflow:hidden;transition:all .15s;
             background:${isSel ? 'var(--md-primary-container)' : 'var(--md-surface-lowest)'}"
             onclick="sfSelectType('${t}')">
      <div style="flex:1;padding:11px 13px;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:3px">
          ${UI.icon(icon,'sm')}
          <span style="font-size:13px;font-weight:600;color:var(--md-on-surface)">${lbl}</span>
          ${t === rec  ? `<span class="badge badge-blue"  style="font-size:9px;margin-left:auto">Recommended</span>` : ''}
          ${hasSub     ? `<span class="badge badge-green" style="font-size:9px;${t!==rec?'margin-left:auto':''}">${UI.icon('check_circle','sm')} Sent ${last?.submittedAt||''}</span>` : ''}
        </div>
        <div class="text-muted" style="font-size:11px">${desc}</div>
      </div>
      ${hasSub ? `<div style="display:flex;align-items:center;padding:0 10px;
          border-left:1px solid var(--md-outline-variant);flex-shrink:0">
        <button class="btn btn-secondary btn-sm" style="font-size:10px"
          onclick="event.stopPropagation();openFormHistoryModal('${t}','${window._sf.leadId}')">
          ${UI.icon('history','sm')} History</button></div>` : ''}
    </div>`;
  };

  return `${_sfStepBar()}
    <div class="modal-section" style="padding-top:0">
      <div class="modal-section-title">${UI.icon('assignment','sm')} เลือกประเภท Form</div>
      <div style="display:flex;flex-direction:column;gap:8px">
        ${card('test',       'assignment',           'Test Form',       'เก็บข้อมูล Family + Student · นัดวันทดสอบระดับ')}
        ${card('trial',      'assignment_turned_in', 'Trial Form',      'นัดเรียนทดลอง (Trial Class) · เลือกช่วงเวลาที่สะดวก')}
        ${card('enrollment', 'how_to_reg',           'Enrollment Form', 'สมัครเรียน full enrollment · หลายวิชาได้ · ชำระเงิน')}
      </div>
    </div>`;
}

/* ── STEP 2: STUDENTS & CLASSES (Enrollment) ─────────────── */
function _sfStep2Enrollment() {
  const lead     = DB.leads.find(l => l.id === window._sf.leadId) || {};
  const branch   = lead.branch || 'Sukhumvit';
  const students = window._sf.students;
  const pkgOpts  = Utils.packagesFor(branch).filter(p=>p.type==='hour').map(p =>
    `<option value="${p.hours}h">${p.hours}h · ${Utils.currency(p.price)}</option>`).join('');

  const subjectRow = (sub, si, subIdx) => {
    const clsList = getClasses(sub.subject, students[si].grade, branch);
    const selPkg  = sub.pkg || '24h';
    return `<div style="display:flex;gap:5px;align-items:center;padding:7px 8px;
             background:var(--md-surface-low);border-radius:7px;margin-bottom:5px">
      <select class="settings-input" style="flex:1.4;font-size:11px"
        onchange="sfSetSubject(${si},${subIdx},this.value)">
        <option value="">— Subject —</option>
        ${Utils.subjectsFor(branch).map(s =>
          `<option value="${s}" ${s===sub.subject?'selected':''}>${s}</option>`).join('')}
      </select>
      <select class="settings-input" style="flex:2;font-size:11px"
        onchange="sfSetClass(${si},${subIdx},this.value)">
        <option value="">— เลือก Class —</option>
        ${clsList.map(c => {
          const days = (CONST.DAYS_SHORT||[]).filter(d => c.days?.includes(d)).join('/');
          const spots = 6 - (c.students?.length || 0);
          return `<option value="${c.id}" ${c.id===sub.classId?'selected':''}>
            ${c.teacher} · ${days} · ${classTime(c)} · (${spots} ที่ว่าง)</option>`;
        }).join('')}
        ${!clsList.length ? `<option disabled>ไม่มี Class ว่าง</option>` : ''}
      </select>
      <select class="settings-input" style="width:68px;font-size:11px"
        onchange="sfSetPkg(${si},${subIdx},this.value)">
        ${['24h','48h','72h','96h'].map(p =>
          `<option value="${p}" ${p===selPkg?'selected':''}>${p}</option>`).join('')}
      </select>
      <button class="btn btn-secondary btn-sm" style="padding:4px 6px;flex-shrink:0"
        onclick="sfRemoveSubject(${si},${subIdx})">${UI.icon('close','sm')}</button>
    </div>`;
  };

  const studentCard = (stu, si) => `
    <div style="border:1px solid var(--md-outline-variant);border-radius:10px;
                padding:12px;margin-bottom:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <span style="font-size:12px;font-weight:700;color:var(--md-on-surface)">
          ${UI.icon('person','sm')} นักเรียนคนที่ ${si+1}</span>
        ${students.length > 1
          ? `<button class="btn btn-secondary btn-sm" style="padding:3px 7px"
              onclick="sfRemoveStudent(${si})">${UI.icon('close','sm')}</button>` : ''}
      </div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:2">
          <label class="settings-label">ชื่อนักเรียน</label>
          <input class="settings-input" placeholder="ชื่อ-นามสกุล" value="${stu.name||''}"
            oninput="window._sf.students[${si}].name=this.value" style="font-size:12px">
        </div>
        <div style="flex:1">
          <label class="settings-label">ระดับชั้น</label>
          <select class="settings-input" style="font-size:12px"
            onchange="sfSetGrade(${si},this.value)">
            <option value="">— Grade —</option>
            ${(CONST.GRADES||[]).map(g =>
              `<option value="${g}" ${g===stu.grade?'selected':''}>${g}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="font-size:10px;font-weight:700;color:var(--md-on-surface-variant);
                  text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">
        ${UI.icon('menu_book','sm')} วิชา + Class Suggestion
      </div>
      ${stu.subjects.map((sub, subIdx) => subjectRow(sub, si, subIdx)).join('')}
      <button class="btn btn-secondary btn-sm" style="width:100%;font-size:11px;margin-top:2px"
        onclick="sfAddSubject(${si})">
        ${UI.icon('add','sm')} เพิ่มวิชา
      </button>
    </div>`;

  return `${_sfStepBar()}
    <div class="modal-section" style="padding-top:0">
      <div class="modal-section-title">${UI.icon('group','sm')} นักเรียน + Class Suggestion</div>
      ${students.map((stu, si) => studentCard(stu, si)).join('')}
      <button class="btn btn-secondary" style="width:100%;font-size:12px"
        onclick="sfAddStudent()">
        ${UI.icon('person_add','sm')} เพิ่มนักเรียน
      </button>
    </div>`;
}

/* ── STEP 2: SIMPLE (Test / Trial) ──────────────────────── */
function _sfStep2Simple() {
  const lead = DB.leads.find(l => l.id === window._sf.leadId) || {};
  const stu  = window._sf.students[0] || {};
  const isTrial = window._sf.type === 'trial';
  const clsList = isTrial ? getClasses('', stu.grade||'', lead.branch||'Sukhumvit') : [];

  return `${_sfStepBar()}
    <div class="modal-section" style="padding-top:0">
      <div class="modal-section-title">${UI.icon('tune','sm')} ข้อมูลนักเรียน</div>
      <div style="display:flex;gap:8px;margin-bottom:10px">
        <div style="flex:2">
          <label class="settings-label">ชื่อนักเรียน</label>
          <input class="settings-input" placeholder="ชื่อ-นามสกุล" value="${stu.name||''}"
            oninput="window._sf.students[0].name=this.value">
        </div>
        <div style="flex:1">
          <label class="settings-label">ระดับชั้น</label>
          <select class="settings-input" onchange="sfSetGrade(0,this.value)">
            <option value="">— Grade —</option>
            ${(CONST.GRADES||[]).map(g =>
              `<option value="${g}" ${g===stu.grade?'selected':''}>${g}</option>`).join('')}
          </select>
        </div>
      </div>
      <div style="margin-bottom:10px">
        <label class="settings-label">${UI.icon('calendar_month','sm')} วันที่สะดวก</label>
        <input class="settings-input" placeholder="เช่น จ-พ 10:00–12:00"
          value="${window._sf.preferredSchedule||''}"
          oninput="window._sf.preferredSchedule=this.value">
      </div>
      ${isTrial ? `<div>
        <label class="settings-label">${UI.icon('class','sm')} Suggest Trial Class (optional)</label>
        <select class="settings-input" onchange="sfSetClass(0,0,this.value)">
          <option value="">— ไม่ระบุ —</option>
          ${clsList.map(c =>
            `<option value="${c.id}" ${c.id===stu.subjects?.[0]?.classId?'selected':''}>
              ${c.subject} ${c.grade} · ${c.teacher} · ${classTime(c)}
            </option>`).join('')}
        </select>
      </div>` : ''}
    </div>`;
}

function _sfStep2() {
  return window._sf.type === 'enrollment' ? _sfStep2Enrollment() : _sfStep2Simple();
}

/* ── STEP 3: CONFIRM & SEND ──────────────────────────────── */
function _sfStep3() {
  const lead     = DB.leads.find(l => l.id === window._sf.leadId) || {};
  const type     = window._sf.type;
  const students = window._sf.students;
  const icons    = { test:'assignment', trial:'assignment_turned_in', enrollment:'how_to_reg' };

  const stuRows = type === 'enrollment'
    ? students.map((stu, si) => {
        const subs = stu.subjects.filter(s => s.subject);
        return `<div style="padding:9px 11px;background:var(--md-surface-low);
                     border-radius:8px;margin-bottom:6px">
          <div style="font-size:12px;font-weight:700;margin-bottom:5px">
            ${UI.icon('person','sm')} ${stu.name || `นักเรียนคนที่ ${si+1}`} · ${stu.grade||'—'}</div>
          ${subs.length ? subs.map(s => {
            const cls = (DB.classes||[]).find(c => c.id === s.classId);
            return `<div class="text-muted" style="font-size:11px;margin-bottom:2px">
              ${UI.icon('menu_book','sm')} ${s.subject} · ${s.pkg}
              ${cls
                ? ` · ${cls.teacher} · ${classTime(cls)}`
                : ` · <span style="color:var(--md-error)">⚠️ ยังไม่เลือก Class</span>`}
            </div>`;
          }).join('') : `<div class="text-muted" style="font-size:11px">⚠️ ยังไม่เพิ่มวิชา</div>`}
        </div>`;
      }).join('')
    : `<div class="text-muted" style="font-size:12px;padding:8px">
        ${UI.icon('person','sm')} ${students[0]?.name || lead.name} · ${students[0]?.grade||'—'}
        ${window._sf.preferredSchedule
          ? `<br>${UI.icon('calendar_month','sm')} ${window._sf.preferredSchedule}` : ''}
      </div>`;

  return `${_sfStepBar()}
    <div class="modal-section" style="padding-top:0">
      <div class="modal-section-title">${UI.icon('summarize','sm')} Summary</div>
      <div style="display:flex;gap:10px;align-items:center;padding:10px 12px;
                  background:var(--md-surface-low);border-radius:9px;margin-bottom:10px">
        ${UI.icon(icons[type]||'assignment','md')}
        <div>
          <div style="font-size:13px;font-weight:700">${formTypeLabel(type)}</div>
          <div class="text-muted" style="font-size:11px">ส่งถึง: ${lead.name} · ${lead.branch||'Sukhumvit'}</div>
        </div>
      </div>
      ${stuRows}
    </div>
    <div class="modal-section">
      <div class="modal-section-title">${UI.icon('link','sm')} Form Link</div>
      <div style="display:flex;gap:6px;align-items:center">
        <input id="form-link-input" readonly placeholder="Click Generate…"
          style="flex:1;padding:7px 10px;border:1.5px solid var(--md-outline-variant);
                 border-radius:7px;font-size:11px;font-family:monospace;
                 background:var(--md-surface-low);color:var(--md-on-surface);outline:none">
        <button class="btn btn-secondary btn-sm" onclick="generateFormLink('${window._sf.leadId}')">
          ${UI.icon('link','sm')} Generate</button>
        <button class="btn btn-secondary btn-sm" onclick="copyFormLink()">
          ${UI.icon('content_copy','sm')}</button>
        <button class="btn btn-secondary btn-sm" onclick="openFormPreview()">
          ${UI.icon('preview','sm')}</button>
      </div>
      <div class="text-muted" style="font-size:10px;margin-top:4px">
        ${UI.icon('lock','sm')} Unique per submission · expires 7 days
      </div>
    </div>
    <div style="background:var(--md-warning-container);border:1px solid var(--md-warning);
                border-radius:8px;padding:10px 12px">
      <div style="font-size:11px;font-weight:700;color:var(--md-on-warning-container);margin-bottom:5px">
        ${UI.icon('bolt','sm')} Demo: Simulate Parent Submission</div>
      <div class="text-muted" style="font-size:11px;margin-bottom:7px;color:var(--md-on-warning-container)">
        จำลอง Parent กรอก Form และ Submit เพื่อทดสอบ flow</div>
      <button class="btn btn-sm" style="background:var(--md-warning);color:var(--md-on-warning);border:none"
        onclick="simulateFormSubmission('${window._sf.leadId}')">
        ${UI.icon('bolt','sm')} Simulate Parent Submission
      </button>
    </div>`;
}

/* ── BODY + FOOTER ────────────────────────────────────────── */
function _sfBody()   { const s = window._sf?.step||1; return s===1?_sfStep1():s===2?_sfStep2():_sfStep3(); }
function _sfFooter() {
  const s   = window._sf?.step || 1;
  const lid = window._sf?.leadId || '';
  if (s === 1) return `
    <button class="btn btn-secondary" onclick="Modal.close('modal-send-form')">Cancel</button>
    <button class="btn btn-primary" onclick="sfCheckAndNext()">Next ${UI.icon('arrow_forward','sm')}</button>`;
  if (s === 2) return `
    <button class="btn btn-secondary" onclick="sfGoTo(1)">${UI.icon('arrow_back','sm')} Back</button>
    <button class="btn btn-primary" onclick="sfCheckAndNext()">Next ${UI.icon('arrow_forward','sm')}</button>`;
  return `
    <button class="btn btn-secondary" onclick="sfGoTo(2)">${UI.icon('arrow_back','sm')} Back</button>
    <button class="btn btn-primary" onclick="sendFormViaLine('${lid}')">${UI.icon('send','sm')} Send via LINE →</button>`;
}

/* ── RE-RENDER ───────────────────────────────────────────── */
function _sfRender() {
  const body   = document.querySelector('#modal-send-form .modal-body');
  const footer = document.querySelector('#modal-send-form .modal-footer');
  if (!body || !footer) return;
  body.innerHTML   = _sfBody();
  footer.innerHTML = _sfFooter();
}

/* ── OPEN MODAL ──────────────────────────────────────────── */
window.openSendFormModal = function (leadId, defaultType) {
  const lead = DB.leads.find(l => l.id === leadId);
  if (!lead) return;
  const grade = lead.childGrade || window._inferLeadGrade?.(lead.age) || '';
  window._sf = {
    leadId, step: 1,
    type: defaultType || recommendFormType(lead.stage),
    preferredSchedule: '',
    students: [{
      id: 'stu-0', name: '', grade,
      subjects: lead.course ? [{ subject: lead.course, classId: '', pkg: '24h' }] : [],
    }],
  };
  Modal.create('modal-send-form',
    `${UI.icon('assignment','sm')} Send Form — ${lead.name}`,
    _sfBody(), _sfFooter(), 'modal-md');
};

/* ── STEPPER ─────────────────────────────────────────────── */
window.sfGoTo      = function (step) { if (window._sf) { window._sf.step = step; _sfRender(); } };
window.sfSelectType = function (type) { if (window._sf) { window._sf.type = type; _sfRender(); } };

window.sfCheckAndNext = function () {
  const sf = window._sf;
  if (!sf) return;
  if (sf.step === 1) {
    if (!sf.type) { showToast('Please select a form type', 'warning'); return; }
    sf.step = 2; _sfRender(); return;
  }
  if (sf.step === 2) {
    if (sf.type === 'enrollment') {
      const hasSubject = sf.students.some(s => s.subjects.some(sub => sub.subject));
      if (!hasSubject) { showToast('กรุณาเพิ่มวิชาอย่างน้อย 1 วิชา', 'warning'); return; }
    }
    sf.step = 3; _sfRender();
  }
};

/* ── STATE MUTATIONS ─────────────────────────────────────── */
window.sfAddStudent    = function () {
  window._sf.students.push({ id: 'stu-' + Date.now(), name:'', grade:'', subjects:[] });
  _sfRender();
};
window.sfRemoveStudent = function (i)             { window._sf.students.splice(i, 1); _sfRender(); };
window.sfAddSubject    = function (si)            {
  window._sf.students[si].subjects.push({ subject:'', classId:'', pkg:'24h' }); _sfRender();
};
window.sfRemoveSubject = function (si, subIdx)    { window._sf.students[si].subjects.splice(subIdx, 1); _sfRender(); };
window.sfSetGrade      = function (si, grade)     { window._sf.students[si].grade = grade; _sfRender(); };
window.sfSetSubject    = function (si, subIdx, v) {
  window._sf.students[si].subjects[subIdx].subject = v;
  window._sf.students[si].subjects[subIdx].classId = '';
  _sfRender();
};
window.sfSetClass      = function (si, subIdx, v) { window._sf.students[si].subjects[subIdx].classId = v; };
window.sfSetPkg        = function (si, subIdx, v) { window._sf.students[si].subjects[subIdx].pkg = v; };

/* ── GENERATE / COPY / PREVIEW LINK ─────────────────────── */
window.generateFormLink = function (leadId) {
  const type = window._sf?.type || 'test';
  const tok  = genToken();
  const url  = window.location.href.replace(/[^/]+$/, '') + `form.html?type=${type}&lead=${leadId}&token=${tok}`;
  const inp  = document.getElementById('form-link-input');
  if (inp) inp.value = url;
  (DB.formTokens = DB.formTokens || []).push({
    token: tok, type, leadId, sentBy: 'Admin Nock',
    branch: DB.leads.find(l=>l.id===leadId)?.branch || 'Sukhumvit',
    expiresAt: '2026-06-15', used: false,
  });
  showToast('Link generated ✓', 'success');
};
window.copyFormLink  = function () {
  const inp = document.getElementById('form-link-input');
  if (!inp?.value) { showToast('Generate a link first', 'warning'); return; }
  navigator.clipboard?.writeText(inp.value).catch(() => {});
  showToast('Link copied ✓', 'success');
};
window.openFormPreview = function () {
  const type = window._sf?.type || 'test';
  const lead = window._sf?.leadId || '';
  window.open(window.location.href.replace(/[^/]+$/, '') + `form.html?type=${type}&lead=${lead}&demo=1`, '_blank');
};

/* ── SEND VIA LINE ───────────────────────────────────────── */
window.sendFormViaLine = function (leadId) {
  const sf   = window._sf;
  const type = sf?.type || 'test';
  const lead = DB.leads.find(l => l.id === leadId);
  if (!lead) return;

  const tok = genToken();
  (DB.formTokens = DB.formTokens || []).push({
    token: tok, type, leadId, sentBy:'Admin Nock',
    branch: lead.branch || 'Sukhumvit',
    expiresAt: '2026-06-15', used: false,
    students: sf?.students || [],
  });

  // Update stage — ไม่มี hard gating, แค่ advance ไปข้างหน้า
  const stageMap = { test:'test_scheduled', trial:'trial_scheduled', enrollment:'payment_pending' };
  if (stageMap[type]) lead.stage = stageMap[type];
  window._refreshPipeline?.();

  Modal.close('modal-send-form');

  const conv = findOrCreateConv(lead);
  if (conv) {
    (DB.messages[conv.id] = DB.messages[conv.id] || []).push({
      type: 'staff',
      text: `${formTypeLabel(type)} ส่งให้แล้วนะครับ กรุณากรอกข้อมูลภายใน 7 วัน ขอบคุณครับ 🙏`,
      time: 'Now', sender: 'Admin Nock',
    });
    conv.preview = `${formTypeLabel(type)} sent`;
    conv.time    = 'Now';
  }
  window._refreshInboxList?.();
  showToast(`${formTypeLabel(type)} sent via LINE ✓`, 'success');
};

/* ── SIMULATE PARENT SUBMISSION ─────────────────────────── */
window.simulateFormSubmission = function (leadId) {
  const lead = DB.leads.find(l => l.id === leadId);
  if (!lead) return;
  const sf   = window._sf;
  const type = sf?.type || 'test';

  const subId = 'sub_' + Date.now();
  (DB.formSubmissions = DB.formSubmissions || []).push({
    id: subId, token: 'tok_sim', type, leadId, leadName: lead.name,
    status: 'pending', submittedAt: 'Just now',
    data: {
      family:   { parent1Name: lead.name + ' Parent', parent1Phone: lead.phone||'089-000-0000', parent1Line: lead.line||'' },
      students: sf?.students?.map(s => ({ name:s.name||lead.name, grade:s.grade, subjects:s.subjects }))
                || [{ name: lead.name, grade: sf?.students?.[0]?.grade, subject: lead.course }],
      payment:  type === 'enrollment' ? { method:'Bank Transfer', slipAttached:true } : null,
    },
  });

  lead.stage      = { test:'test_scheduled', trial:'trial_scheduled', enrollment:'payment_pending' }[type] || lead.stage;
  lead.formPending = true;
  window._refreshPipeline?.();

  const conv = findOrCreateConv(lead);
  if (conv) {
    conv.unread = true; conv.time = 'Just now';
    conv.preview = `${formTypeLabel(type)} submitted — pending review`;
    (DB.messages[conv.id] = DB.messages[conv.id] || []).push({
      type:'form_submission', subId, formType:type,
      text:`${formTypeLabel(type)} submitted — pending review`,
      time:'Just now', sender:'System',
    });
  }

  Modal.close('modal-send-form');
  window._refreshInboxList?.();
  const badge = document.getElementById('badge-inbox');
  if (badge) badge.textContent = DB.conversations.filter(c => c.unread).length || '';
  showToast(`${lead.name} submitted ${formTypeLabel(type)} · check Inbox ✓`, 'success');
};

/* ── FORM HISTORY MODAL ──────────────────────────────────── */
window.openFormHistoryModal = function (type, leadId) {
  const subs = (DB.formSubmissions||[]).filter(s => s.leadId === leadId && s.type === type);
  const stBadge = st => st==='approved'
    ? `<span class="badge badge-green">${UI.icon('check_circle','sm')} Approved</span>`
    : st==='cancelled'
    ? `<span class="badge badge-gray">${UI.icon('cancel','sm')} Cancelled</span>`
    : `<span class="badge badge-yellow">${UI.icon('pending_actions','sm')} Pending</span>`;
  Modal.create('modal-form-history',
    `${UI.icon('history','sm')} ${formTypeLabel(type)} History`,
    subs.length
      ? `<div style="display:flex;flex-direction:column;gap:8px">${subs.map(s => {
          const d = s.data || {};
          return `<div style="padding:10px 13px;border:1px solid var(--md-outline-variant);
                       border-radius:9px;background:var(--md-surface-lowest)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
              <span style="font-size:12px;font-weight:600">${s.submittedAt||'—'}</span>
              ${stBadge(s.status)}
            </div>
            ${d.students?.[0]?.grade
              ? `<div class="text-muted" style="font-size:11px">${UI.icon('school','sm')} ${d.students[0].grade}</div>` : ''}
            ${s.status==='pending'
              ? `<button class="btn btn-secondary btn-sm" style="margin-top:7px"
                   onclick="Modal.close('modal-form-history');openFormReviewModal('${s.id}')">
                   ${UI.icon('visibility','sm')} Review</button>` : ''}
          </div>`;
        }).join('')}</div>`
      : UI.emptyState('No history found.', 'history'),
    `<button class="btn btn-primary" onclick="Modal.close('modal-form-history')">Close</button>`,
    'modal-md');
};

/* ── FIND OR CREATE CONVERSATION ────────────────────────── */
function findOrCreateConv(lead) {
  if (!lead) return null;
  if (lead.convId) { const c = DB.conversations.find(c => c.id === lead.convId); if (c) return c; }
  const first = lead.name.replace(/\s*\(Lead\)\s*/i,'').split(' ')[0].toLowerCase();
  const fuzzy = DB.conversations.find(c =>
    c.name.toLowerCase().includes(first) || (c.student||'').toLowerCase().includes(first));
  if (fuzzy) { lead.convId = fuzzy.id; return fuzzy; }
  const newId = 'conv_' + lead.id;
  if (!DB.conversations.find(c => c.id === newId)) {
    DB.conversations.unshift({
      id: newId, name: lead.name.replace(/\s*\(Lead\)\s*/i,'').trim() + ' Family',
      branch: lead.branch || 'Sukhumvit', channel: 'LINE',
      unread: false, time: 'Now', assignee: 'Admin Nock', preview: 'New lead conversation',
    });
    DB.messages[newId] = [];
  }
  lead.convId = newId;
  return DB.conversations.find(c => c.id === newId);
}
window._crmFindConv = findOrCreateConv;

/* ── SEND FORM FROM INBOX ────────────────────────────────── */
window.openSendFormFromInbox = function (convId) {
  const conv = DB.conversations.find(c => c.id === convId);
  if (!conv) return;
  const first = (conv.student || conv.name).split(' ')[0].toLowerCase();
  const lead  = DB.leads.find(l =>
    l.convId === convId ||
    l.name.replace(/\s*\(Lead\)\s*/i,'').toLowerCase().includes(first));
  if (lead) openSendFormModal(lead.id);
  else showToast('No active lead found. Create a lead in CRM first.', 'info');
};

})();
