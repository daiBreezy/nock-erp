/* ============================================================
   course-end.js — Course End Summary
   Renders into #sum-ces-tab (Summaries view, "Course End" tab)

   Status flow: draft → pending_teacher → approved → sent
   - Teacher สร้างเอง  → draft → approved (ยืนยันเอง) → sent
   - Admin/Mgr สร้าง   → draft → pending_teacher → approved → sent
   - sent = immutable (read-only + PDF)
   Source: DB.courseEndSummaries · auto-draft เมื่อ enrollment หมด
   ============================================================ */
(function () {

  const CURRENT_USER = 'Admin Nock';   // prototype — no auth yet

  const STATUS_META = {
    draft:           { label:'Draft',           color:'gray'   },
    pending_teacher: { label:'Pending Teacher', color:'yellow' },
    approved:        { label:'Approved',        color:'blue'   },
    sent:            { label:'Sent',            color:'green'  },
  };

  let fStatus = 'all';

  /* ── AUTO-DRAFT: enrollment จบ → สร้าง draft อัตโนมัติ ──── */
  function autoDraft() {
    (DB.enrollments || []).forEach(enr => {
      if (enr.status !== 'active') return;
      const done = enr.enrollType === 'bundle'
        ? (enr.blockUsed || 0) >= (enr.blocksPaid || 0) * 4
        : enr.remainHours === 0;
      if (!done) return;
      if ((DB.courseEndSummaries || []).some(c => c.enrollmentId === enr.id)) return;
      const stu = DB.students.find(s => s.id === enr.studentId);
      const crs = DB.courses.find(c => c.id === enr.courseId);
      if (!stu) return;
      DB.courseEndSummaries.push({
        id: 'ces-' + Date.now(), studentId: stu.id, familyId: enr.familyId,
        enrollmentId: enr.id, courseId: enr.courseId,
        courseName: crs?.name || `${enr.subject} ${enr.grade}`,
        courseType: enr.enrollType === 'bundle' ? 'bundle' : 'regular',
        branch: enr.branch, createdBy: 'System', createdByRole: 'system',
        createdAt: new Date().toISOString().slice(0, 10),
        status: 'pending_teacher', teacher: enr.teacher, confirmedBy: null, sentAt: null,
        subjects: buildSubjectSections(stu, enr, crs),
      });
    });
  }

  /* ── Pull session summaries ของนักเรียน ต่อ subject ─────── */
  function pullSessionSums(name, subject) {
    return DB.sessions
      .filter(s => s.subject === subject && s.studentNames.includes(name) && s.summaries?.[name]?.text)
      .map(s => ({ date: s.date, text: s.summaries[name].text }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  function buildSubjectSections(stu, enr, crs) {
    if (enr.enrollType === 'bundle' && crs?.bundleSubjects?.length) {
      return crs.bundleSubjects.map(bs => ({
        subject: bs.subject, grade: bs.grade,
        teacher: DB.classes.find(c => c.courseId === crs.id && c.subject === bs.subject)?.teacher || enr.teacher,
        overall: '', strengths: '', improve: '',
        sessionSummaries: pullSessionSums(stu.name, bs.subject),
      }));
    }
    return [{
      subject: enr.subject, grade: enr.grade, teacher: enr.teacher,
      overall: '', strengths: '', improve: '',
      sessionSummaries: pullSessionSums(stu.name, enr.subject),
    }];
  }

  /* ── MAIN RENDER ──────────────────────────────────────── */
  window.renderCourseEnd = function () {
    autoDraft();
    const el = document.getElementById('sum-ces-tab');
    if (!el) return;
    const all = DB.courseEndSummaries || [];

    const cnt = k => all.filter(c => c.status === k).length;
    const kpi = UI.kpiGrid([
      { icon:'edit_note',     label:'Draft',           value:cnt('draft'),           color:'tertiary',
        sub:'Being written',        subColor:'up' },
      { icon:'pending_actions',label:'Pending Teacher', value:cnt('pending_teacher'),
        color:cnt('pending_teacher') ? 'warning' : 'success',
        sub:'Awaiting confirmation', subColor:cnt('pending_teacher') ? 'down' : 'up' },
      { icon:'verified',      label:'Approved',        value:cnt('approved'),        color:'primary',
        sub:'Ready to send',        subColor:'up' },
      { icon:'send',          label:'Sent',            value:cnt('sent'),            color:'success',
        sub:'Delivered to parents', subColor:'up' },
    ]);

    const chips = ['all','draft','pending_teacher','approved','sent'].map(k =>
      `<div class="filter-chip ${fStatus===k?'active':''}"
        onclick="cesFilter('${k}',this)">${k==='all'?'All':STATUS_META[k].label}</div>`).join('');

    let rows = fStatus === 'all' ? all : all.filter(c => c.status === fStatus);

    const table = !rows.length
      ? UI.card(UI.emptyState('workspace_premium','No course end summaries','Created automatically when a course finishes, or click New Summary'))
      : `<div class="card"><div class="table-wrap"><table>
          <thead><tr>
            <th>Student</th><th>Course</th><th>Type</th><th>Teacher</th>
            <th>Created</th><th>Status</th><th style="text-align:right">Actions</th>
          </tr></thead>
          <tbody>${rows.map(c => {
            const stu = DB.students.find(s => s.id === c.studentId);
            const m = STATUS_META[c.status] || STATUS_META.draft;
            return `<tr style="cursor:pointer" onclick="cesOpen('${c.id}')">
              <td><span class="text-primary" style="font-weight:500">${stu?.name || '—'}</span></td>
              <td>${c.courseName}</td>
              <td>${UI.badge(c.courseType === 'bundle' ? 'Bundle' : 'Regular', c.courseType === 'bundle' ? 'purple' : 'blue')}</td>
              <td>${c.teacher || '—'}</td>
              <td class="text-muted" style="font-size:12px">${c.createdAt} · ${c.createdBy}</td>
              <td>${UI.badge(m.label, m.color)}</td>
              <td style="text-align:right">
                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();cesOpen('${c.id}')">
                  ${UI.icon('visibility','sm')} View</button>
              </td>
            </tr>`;
          }).join('')}</tbody>
        </table></div></div>`;

    el.innerHTML = `
      ${kpi}
      <div class="filter-bar" style="margin:12px 0">
        ${chips}
        <div style="flex:1"></div>
        <button class="btn btn-primary btn-sm" onclick="cesCreate()">
          ${UI.icon('add','sm')} New Summary</button>
      </div>
      ${table}`;
  };

  window.cesFilter = function (k, el) {
    fStatus = k;
    document.querySelectorAll('#sum-ces-tab .filter-chip').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    renderCourseEnd();
  };

  /* ── DETAIL MODAL (document view) ─────────────────────── */
  window.cesOpen = function (id) {
    const c = (DB.courseEndSummaries || []).find(x => x.id === id); if (!c) return;
    const stu = DB.students.find(s => s.id === c.studentId);
    const fam = DB.families.find(f => f.id === c.familyId);
    const editable = c.status === 'draft' || c.status === 'pending_teacher';
    const m = STATUS_META[c.status];

    const sections = c.subjects.map((sec, i) => `
      <div style="border:1px solid var(--md-outline-variant);border-radius:10px;margin-bottom:12px;overflow:hidden">
        <div style="display:flex;align-items:center;gap:8px;padding:10px 14px;
                    background:var(--md-surface-mid);border-bottom:1px solid var(--md-outline-variant)">
          <span class="badge badge-${CONST.SUBJECT_COLOR[sec.subject]||'blue'}">${Utils.subjectLabel(sec.subject, sec.grade)}</span>
          <span class="text-muted" style="font-size:12px">${sec.teacher}</span>
        </div>
        <div style="padding:12px 14px">
          <label class="settings-label">Overall Progress</label>
          ${editable
            ? `<textarea class="settings-input" id="ces-ov-${i}" rows="2" style="resize:vertical">${sec.overall||''}</textarea>`
            : `<div style="font-size:13px;line-height:1.6;margin-bottom:8px">${sec.overall||'<span class="text-muted">—</span>'}</div>`}
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:8px">
            <div><label class="settings-label">Strengths</label>
              ${editable
                ? `<textarea class="settings-input" id="ces-st-${i}" rows="2" style="resize:vertical">${sec.strengths||''}</textarea>`
                : `<div style="font-size:12px;line-height:1.5">${sec.strengths||'<span class="text-muted">—</span>'}</div>`}</div>
            <div><label class="settings-label">To Improve</label>
              ${editable
                ? `<textarea class="settings-input" id="ces-im-${i}" rows="2" style="resize:vertical">${sec.improve||''}</textarea>`
                : `<div style="font-size:12px;line-height:1.5">${sec.improve||'<span class="text-muted">—</span>'}</div>`}</div>
          </div>
          ${sec.sessionSummaries?.length ? `
          <div style="margin-top:10px;border-top:1px dashed var(--md-outline-variant);padding-top:8px">
            <div class="text-muted" style="font-size:11px;font-weight:600;text-transform:uppercase;
                 letter-spacing:.05em;margin-bottom:6px">Session Summaries (${sec.sessionSummaries.length})</div>
            ${sec.sessionSummaries.map(ss => `
              <div style="display:flex;gap:10px;font-size:12px;margin-bottom:4px">
                <span class="text-muted" style="flex-shrink:0;width:84px">${ss.date}</span>
                <span>${ss.text}</span>
              </div>`).join('')}
          </div>` : ''}
        </div>
      </div>`).join('');

    const body = `
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
        ${UI.avatar((stu?.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2), 'md')}
        <div style="flex:1">
          <div style="font-weight:600">${stu?.name || '—'} <span class="text-muted" style="font-weight:400">· ${stu?.grade||''}</span></div>
          <div class="text-muted" style="font-size:12px">${c.courseName} · ${fam?.name || ''} · ${c.branch}</div>
        </div>
        ${UI.badge(m.label, m.color)}
      </div>
      ${c.status === 'sent'
        ? `<div style="padding:8px 12px;background:var(--md-success-container);border-radius:8px;
              font-size:12px;margin-bottom:12px;color:var(--md-success)">
            ${UI.icon('lock','sm')} Sent ${c.sentAt} · confirmed by ${c.confirmedBy} — immutable</div>`
        : c.status === 'pending_teacher'
        ? `<div style="padding:8px 12px;background:var(--md-warning-container);border-radius:8px;
              font-size:12px;margin-bottom:12px;color:var(--md-on-warning-container)">
            ${UI.icon('pending_actions','sm')} Created by ${c.createdBy} — waiting for ${c.teacher} to review & confirm</div>`
        : ''}
      ${sections}`;

    const btns = [`<button class="btn btn-secondary" onclick="Modal.close('modal-ces')">Close</button>`];
    if (c.status === 'approved' || c.status === 'sent')
      btns.push(`<button class="btn btn-secondary" onclick="cesPDF('${c.id}')">${UI.icon('picture_as_pdf','sm')} PDF</button>`);
    if (editable)
      btns.push(`<button class="btn btn-secondary" onclick="cesSave('${c.id}')">${UI.icon('save','sm')} Save Draft</button>`);
    if (c.status === 'draft' && c.createdByRole !== 'teacher')
      btns.push(`<button class="btn btn-primary" onclick="cesSubmitTeacher('${c.id}')">${UI.icon('send','sm')} Submit to Teacher</button>`);
    if (c.status === 'pending_teacher' || (c.status === 'draft' && c.createdByRole === 'teacher'))
      btns.push(`<button class="btn btn-primary" onclick="cesApprove('${c.id}')">${UI.icon('verified','sm')} Teacher Confirm</button>`);
    if (c.status === 'approved')
      btns.push(`<button class="btn btn-primary" onclick="cesSend('${c.id}')">${UI.icon('send','sm')} Send to Parent</button>`);

    Modal.create('modal-ces',
      `${UI.icon('workspace_premium','sm')} Course End Summary`,
      body, btns.join(''), 'modal-lg');
  };

  /* ── ACTIONS ──────────────────────────────────────────── */
  function saveFields(c) {
    c.subjects.forEach((sec, i) => {
      const ov = document.getElementById(`ces-ov-${i}`);
      const st = document.getElementById(`ces-st-${i}`);
      const im = document.getElementById(`ces-im-${i}`);
      if (ov) sec.overall   = ov.value.trim();
      if (st) sec.strengths = st.value.trim();
      if (im) sec.improve   = im.value.trim();
    });
  }
  const find = id => (DB.courseEndSummaries || []).find(x => x.id === id);

  window.cesSave = function (id) {
    const c = find(id); if (!c) return;
    saveFields(c);
    showToast('Draft saved ✓', 'success');
  };

  window.cesSubmitTeacher = function (id) {
    const c = find(id); if (!c) return;
    saveFields(c);
    c.status = 'pending_teacher';
    Modal.close('modal-ces');
    showToast(`Submitted — waiting for ${c.teacher} to confirm`, 'info');
    renderCourseEnd();
  };

  window.cesApprove = function (id) {
    const c = find(id); if (!c) return;
    saveFields(c);
    const missing = c.subjects.some(s => !s.overall);
    if (missing) { showToast('Fill Overall Progress for every subject first', 'warning'); return; }
    c.status = 'approved';
    c.confirmedBy = c.teacher;
    Modal.close('modal-ces');
    showToast(`Confirmed by ${c.teacher} ✓ — ready to send`, 'success');
    renderCourseEnd();
  };

  window.cesSend = function (id) {
    const c = find(id); if (!c) return;
    c.status = 'sent';
    c.sentAt = new Date().toISOString().slice(0, 10);
    /* ส่งเข้า Inbox thread ของครอบครัว */
    const conv = (DB.conversations || []).find(v => v.familyId === c.familyId);
    if (conv && DB.messages[conv.id]) {
      DB.messages[conv.id].push({
        type:'staff',
        text:`📄 Course End Summary — ${c.courseName} ส่งให้ผู้ปกครองแล้วครับ (confirmed by ${c.confirmedBy})`,
        time:'Today', sender: CURRENT_USER,
      });
      conv.preview = `📄 Course End Summary — ${c.courseName}`;
      conv.time = 'Today';
    }
    Modal.close('modal-ces');
    showToast('Sent to parent via Inbox ✓', 'success');
    renderCourseEnd();
  };

  /* ── PDF (print window) ───────────────────────────────── */
  window.cesPDF = function (id) {
    const c = find(id); if (!c) return;
    const stu = DB.students.find(s => s.id === c.studentId);
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><title>${c.courseName} — ${stu?.name}</title>
      <style>
        body{font-family:Inter,system-ui,sans-serif;max-width:680px;margin:32px auto;color:#1a1d23}
        h1{font-size:20px;margin-bottom:2px} .sub{color:#6b7280;font-size:13px;margin-bottom:20px}
        .sec{border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;margin-bottom:14px}
        .sec h2{font-size:14px;margin:0 0 8px} .lbl{font-size:11px;color:#6b7280;text-transform:uppercase;
        letter-spacing:.05em;margin:10px 0 2px} p{font-size:13px;line-height:1.6;margin:0}
        .ss{font-size:12px;color:#374151;margin:2px 0} .ss b{color:#6b7280;font-weight:500;margin-right:8px}
        .foot{margin-top:28px;font-size:12px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:12px}
      </style></head><body>
      <h1>Course End Summary</h1>
      <div class="sub">${stu?.name} · ${c.courseName} · ${c.branch} — Nock Academy</div>
      ${c.subjects.map(s => `<div class="sec">
        <h2>${Utils.subjectLabel(s.subject, s.grade)} — ${s.teacher}</h2>
        <div class="lbl">Overall Progress</div><p>${s.overall || '—'}</p>
        <div class="lbl">Strengths</div><p>${s.strengths || '—'}</p>
        <div class="lbl">To Improve</div><p>${s.improve || '—'}</p>
        ${s.sessionSummaries?.length ? `<div class="lbl">Session Summaries</div>
          ${s.sessionSummaries.map(x => `<div class="ss"><b>${x.date}</b>${x.text}</div>`).join('')}` : ''}
      </div>`).join('')}
      <div class="foot">Confirmed by ${c.confirmedBy || c.teacher} · ${c.sentAt ? 'Sent ' + c.sentAt : 'Status: ' + c.status} · Generated by NockERP</div>
      <script>window.print()<\/script></body></html>`);
    w.document.close();
  };

  /* ── CREATE (manual trigger) ──────────────────────────── */
  window.cesCreate = function () {
    const opts = (DB.enrollments || [])
      .filter(e => e.status === 'active')
      .filter(e => !(DB.courseEndSummaries || []).some(c => c.enrollmentId === e.id && c.status !== 'sent'))
      .map(e => {
        const stu = DB.students.find(s => s.id === e.studentId);
        const crs = DB.courses.find(c => c.id === e.courseId);
        const label = e.enrollType === 'bundle'
          ? `${stu?.name} — ${crs?.name} (Bundle)`
          : `${stu?.name} — ${e.subject} ${e.grade} (${e.remainHours}h left)`;
        return `<option value="${e.id}">${label}</option>`;
      }).join('');

    Modal.create('modal-ces-new',
      `${UI.icon('add_circle','sm')} New Course End Summary`,
      `<div class="modal-section">
        <div class="settings-group">
          <label class="settings-label">Enrollment</label>
          <select class="settings-input" id="ces-new-enr">
            <option value="">— Select student / course —</option>${opts}
          </select>
          <div class="settings-hint">ระบบดึง Session Summaries ของนักเรียนมาให้อัตโนมัติ — ครูต้อง confirm ก่อนส่งเสมอ</div>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-ces-new')">Cancel</button>
       <button class="btn btn-primary" onclick="cesConfirmCreate()">${UI.icon('add','sm')} Create Draft</button>`);
  };

  window.cesConfirmCreate = function () {
    const enrId = document.getElementById('ces-new-enr')?.value;
    if (!enrId) { showToast('Select an enrollment', 'warning'); return; }
    const enr = DB.enrollments.find(e => e.id === enrId); if (!enr) return;
    const stu = DB.students.find(s => s.id === enr.studentId);
    const crs = DB.courses.find(c => c.id === enr.courseId);
    const ces = {
      id: 'ces-' + Date.now(), studentId: stu.id, familyId: enr.familyId,
      enrollmentId: enr.id, courseId: enr.courseId,
      courseName: crs?.name || `${enr.subject} ${enr.grade}`,
      courseType: enr.enrollType === 'bundle' ? 'bundle' : 'regular',
      branch: enr.branch, createdBy: CURRENT_USER, createdByRole: 'admin',
      createdAt: new Date().toISOString().slice(0, 10),
      status: 'draft', teacher: enr.teacher?.split(' / ')[0] || enr.teacher,
      confirmedBy: null, sentAt: null,
      subjects: buildSubjectSections(stu, enr, crs),
    };
    DB.courseEndSummaries.push(ces);
    Modal.close('modal-ces-new');
    renderCourseEnd();
    showToast('Draft created — fill in teacher notes then submit', 'success');
    setTimeout(() => cesOpen(ces.id), 150);
  };

})();
