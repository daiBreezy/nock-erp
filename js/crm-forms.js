/* ============================================================
   crm-forms.js — CRM Form System
   Send Form modal · Form Review modal · Approve / Edit flow
   ============================================================ */
(function () {

/* ── HELPERS ─────────────────────────────────────────────── */
function genToken() {
  return 'tok_' + Math.random().toString(36).slice(2, 10);
}
function formTypeLabel(t) {
  return t === 'enrollment' ? 'Enrollment Form' : t === 'trial' ? 'Trial Form' : 'Test Form';
}
function recommendFormType(stage) {
  if (['new','contacting'].includes(stage)) return 'test';
  if (['test_scheduled','tested'].includes(stage)) return 'trial';
  return 'enrollment';
}

/* ── SEND FORM MODAL (Admin → Parent) ───────────────────── */
window.openSendFormModal = function (leadId, defaultType) {
  const lead = DB.leads.find(l => l.id === leadId);
  if (!lead) return;
  const recommended = defaultType || recommendFormType(lead.stage);

  Modal.create('modal-send-form', `📋 Send Form — ${lead.name}`, `
    <div class="modal-section">
      <div class="modal-section-title">Select Form Type</div>
      <div style="display:flex;flex-direction:column;gap:8px" id="form-type-options">

        <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 13px;
               border:2px solid ${recommended==='test'?'#6366f1':'#e5e7eb'};border-radius:9px;cursor:pointer;
               background:${recommended==='test'?'#f5f3ff':'#fff'};transition:all .15s"
               id="ftype-test" onclick="selectFormType('test')">
          <input type="radio" name="ftype" value="test" ${recommended==='test'?'checked':''} style="margin-top:2px;accent-color:#6366f1">
          <div>
            <div style="font-weight:600;font-size:13px;color:#1a1d23">📋 Test Form</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px">เก็บข้อมูล Family + Student · นัดวันทดสอบระดับ</div>
          </div>
          ${recommended==='test'?'<span style="margin-left:auto;font-size:10px;background:#6366f1;color:#fff;border-radius:4px;padding:2px 7px;height:fit-content">Recommended</span>':''}
        </label>

        <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 13px;
               border:2px solid ${recommended==='trial'?'#6366f1':'#e5e7eb'};border-radius:9px;cursor:pointer;
               background:${recommended==='trial'?'#f5f3ff':'#fff'};transition:all .15s"
               id="ftype-trial" onclick="selectFormType('trial')">
          <input type="radio" name="ftype" value="trial" ${recommended==='trial'?'checked':''} style="margin-top:2px;accent-color:#6366f1">
          <div>
            <div style="font-weight:600;font-size:13px;color:#1a1d23">📋 Trial Form</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px">นัดเรียนทดลอง (Trial Class) · เลือกช่วงเวลาที่สะดวก</div>
          </div>
          ${recommended==='trial'?'<span style="margin-left:auto;font-size:10px;background:#6366f1;color:#fff;border-radius:4px;padding:2px 7px;height:fit-content">Recommended</span>':''}
        </label>

        <label style="display:flex;align-items:flex-start;gap:10px;padding:10px 13px;
               border:2px solid ${recommended==='enrollment'?'#6366f1':'#e5e7eb'};border-radius:9px;cursor:pointer;
               background:${recommended==='enrollment'?'#f5f3ff':'#fff'};transition:all .15s"
               id="ftype-enrollment" onclick="selectFormType('enrollment')">
          <input type="radio" name="ftype" value="enrollment" ${recommended==='enrollment'?'checked':''} style="margin-top:2px;accent-color:#6366f1">
          <div>
            <div style="font-weight:600;font-size:13px;color:#1a1d23">📝 Enrollment Form</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px">สมัครเรียน full enrollment · เลือก Course · ชำระเงิน · แนบสลิป</div>
          </div>
          ${recommended==='enrollment'?'<span style="margin-left:auto;font-size:10px;background:#6366f1;color:#fff;border-radius:4px;padding:2px 7px;height:fit-content">Recommended</span>':''}
        </label>

      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">Branch</div>
      <div style="font-size:13px;color:#374151">📍 Sukhumvit Branch</div>
    </div>

    <div class="modal-section" id="form-link-section" style="display:none">
      <div class="modal-section-title">Form Link</div>
      <div style="display:flex;gap:6px;align-items:center">
        <input id="form-link-input" readonly
          style="flex:1;padding:8px 11px;border:1.5px solid #e5e7eb;border-radius:7px;
                 font-size:12px;font-family:monospace;background:#f9fafb;color:#374151;outline:none">
        <button class="btn btn-secondary btn-sm" onclick="copyFormLink()" title="Copy link">Copy 📋</button>
        <button class="btn btn-secondary btn-sm" onclick="openFormPreview()" title="Preview form">Preview 👁</button>
      </div>
      <div style="font-size:11px;color:#9ca3af;margin-top:5px">
        🔒 Unique link · expires in 7 days · valid for this lead only
      </div>
    </div>

    <div class="modal-section" style="background:#fff8e1;border-radius:8px;padding:11px 13px;border:1px solid #fde68a">
      <div style="font-size:11px;font-weight:700;color:#92400e;margin-bottom:7px">⚡ Demo: Simulate Parent Submission</div>
      <div style="font-size:11px;color:#78350f;margin-bottom:9px">
        กด Generate Link ก่อน แล้วกด Simulate เพื่อจำลอง Parent กรอก Form และ Submit
      </div>
      <button class="btn btn-sm" style="background:#f59e0b;color:#fff;border:none"
        onclick="simulateFormSubmission('${leadId}')">
        ⚡ Simulate Parent Submission
      </button>
    </div>`,

  `<button class="btn btn-secondary" onclick="Modal.close('modal-send-form')">Cancel</button>
   <button class="btn btn-secondary btn-sm" onclick="generateFormLink('${leadId}')">🔗 Generate Link</button>
   <button class="btn btn-primary" onclick="sendFormViaLine('${leadId}')">Send via LINE →</button>`,
  'modal-md');

  // Store current lead id for use by inner functions
  window._sendFormLeadId = leadId;
  window._sendFormType = recommended;
};

window.selectFormType = function (type) {
  window._sendFormType = type;
  ['test','trial','enrollment'].forEach(t => {
    const el = document.getElementById('ftype-'+t);
    if (!el) return;
    el.style.borderColor = t === type ? '#6366f1' : '#e5e7eb';
    el.style.background  = t === type ? '#f5f3ff' : '#fff';
  });
};

window.generateFormLink = function (leadId) {
  const type = window._sendFormType || 'test';
  const tok  = genToken();
  const url  = `file://${window.location.pathname.replace('index.html','').replace(/[^/]+$/,'')}form.html?type=${type}&lead=${leadId}&token=${tok}`;
  const inp  = document.getElementById('form-link-input');
  if (inp) inp.value = url;
  const sec = document.getElementById('form-link-section');
  if (sec) sec.style.display = '';
  // Save token to DB
  (DB.formTokens = DB.formTokens||[]).push({
    token: tok, type, leadId, sentBy:'Admin Nock', branch:'Sukhumvit',
    expiresAt:'2026-05-27', used:false
  });
  showToast('Link generated ✓', 'success');
};

window.copyFormLink = function () {
  const inp = document.getElementById('form-link-input');
  if (!inp) return;
  navigator.clipboard?.writeText(inp.value).catch(()=>{});
  showToast('Link copied to clipboard ✓', 'success');
};

window.openFormPreview = function () {
  const type = window._sendFormType || 'test';
  const lead = window._sendFormLeadId || '';
  // Build relative path from current page
  const base = window.location.href.replace(/[^/]+$/, '');
  window.open(`${base}form.html?type=${type}&lead=${lead}&demo=1`, '_blank');
};

window.sendFormViaLine = function (leadId) {
  const type = window._sendFormType || 'test';
  const lead = DB.leads.find(l => l.id === leadId);
  Modal.close('modal-send-form');

  // Update lead stage
  if (lead) {
    if (type === 'test' && ['new','contacting'].includes(lead.stage))  lead.stage = 'test_scheduled';
    else if (type === 'trial' && ['tested'].includes(lead.stage))       lead.stage = 'trial_scheduled';
    else if (type === 'enrollment' && ['trialed'].includes(lead.stage)) lead.stage = 'payment_pending';
  }
  window._refreshPipeline?.();

  // Add message to linked conversation (find or create)
  const conv = findOrCreateConv(lead);
  if (conv) {
    (DB.messages[conv.id] = DB.messages[conv.id]||[]).push({
      type:'staff',
      text:`📋 ${formTypeLabel(type)} ส่งให้แล้วนะครับ กรุณากรอกข้อมูลภายใน 7 วัน ขอบคุณครับ 🙏`,
      time:'Now', sender:'Admin Nock',
    });
    conv.preview = `📋 ${formTypeLabel(type)} sent`;
    conv.time = 'Now';
    const badge = document.getElementById('badge-inbox');
    if (badge) badge.textContent = DB.conversations.filter(c=>c.unread).length || '';
    window._refreshInboxList?.();
  }

  showToast(`📋 ${formTypeLabel(type)} sent${conv ? ' · see Inbox' : ''} ✓`, 'success');
};

/* ── SIMULATE PARENT SUBMISSION (Demo) ──────────────────── */
window.simulateFormSubmission = function (leadId) {
  const lead = DB.leads.find(l => l.id === leadId);
  if (!lead) return;
  const type = window._sendFormType || 'test';

  // Create submission
  const subId = 'sub_' + Date.now();
  const sub = {
    id: subId,
    token: 'tok_sim',
    type,
    leadId,
    leadName: lead.name,
    status: 'pending',
    submittedAt: 'Just now',
    data: {
      family: { parent1Name: lead.name.replace(/\s\w+$/,'')+ ' Parent', parent1Phone: lead.phone||'089-000-0000', parent1Line: lead.line||'' },
      students: [{ name: lead.name, grade: 'ป.5', subject: lead.course, courseHours: 24 }],
      schedule: { label: 'Wed 27 May 2026, 13:00–15:00', teacher: 'Kru Eve', room: 'Room 1' },
      course: { name: `${lead.course} ป.5`, hours: 24, price: 7200 },
      payment: type === 'enrollment' ? { method: 'Bank Transfer', slipAttached: true } : null
    }
  };
  (DB.formSubmissions = DB.formSubmissions||[]).push(sub);

  // Update lead stage
  const stageMap = { test:'test_scheduled', trial:'trial_scheduled', enrollment:'payment_pending' };
  lead.stage = stageMap[type] || lead.stage;
  lead.formPending = true;

  // Notify linked conversation (find or create)
  const conv = findOrCreateConv(lead);
  if (conv) {
    conv.unread = true;
    conv.time = 'Just now';
    conv.preview = `📋 ${formTypeLabel(type)} submitted — pending review`;
    (DB.messages[conv.id] = DB.messages[conv.id]||[]).push({
      type:'form_submission', subId, formType:type,
      text:`📋 ${formTypeLabel(type)} submitted — pending review`,
      time:'Just now', sender:'System',
    });
  }

  Modal.close('modal-send-form');
  window._refreshPipeline?.();
  window._refreshInboxList?.();

  // Update inbox badge
  const unread = DB.conversations.filter(c => c.unread).length;
  const badge = document.getElementById('badge-inbox');
  if (badge) badge.textContent = unread || '';

  showToast(`⚡ ${lead.name} submitted ${formTypeLabel(type)} · check Inbox ✓`, 'success');
};

/* ── FORM REVIEW MODAL (Admin reviews submission) ────────── */
window.openFormReviewModal = function (subId) {
  const sub = (DB.formSubmissions||[]).find(s => s.id === subId);
  if (!sub) { showToast('Submission not found','error'); return; }
  const lead = DB.leads.find(l => l.id === sub.leadId)||{};
  const isEnrollment = sub.type === 'enrollment';
  const d = sub.data||{};

  const statusHtml = sub.status === 'approved'
    ? `<span style="background:#dcfce7;color:#065f46;font-size:11px;font-weight:700;
         border-radius:5px;padding:3px 9px;margin-left:8px">✅ Approved</span>`
    : `<span style="background:#fef3c7;color:#d97706;font-size:11px;font-weight:700;
         border-radius:5px;padding:3px 9px;margin-left:8px">⏳ Pending Review</span>`;

  Modal.create('modal-form-review', `📋 ${sub.type==='enrollment'?'Enrollment':sub.type==='trial'?'Trial':'Test'} Form Review ${statusHtml}`, `

    <div style="display:flex;gap:10px;align-items:center;padding:11px 0;border-bottom:1px solid #f3f4f6;margin-bottom:4px">
      <div style="font-size:28px">👤</div>
      <div>
        <div style="font-size:14px;font-weight:700;color:#1a1d23">${sub.leadName}</div>
        <div style="font-size:11px;color:#6b7280">Submitted: ${sub.submittedAt} · via NockERP Form</div>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">👨‍👩‍👧 Family Info</div>
      <div class="info-grid" id="form-family-view">
        <div class="info-item"><div class="label">Parent Name</div>${d.family?.parent1Name||'—'}</div>
        <div class="info-item"><div class="label">Phone</div>${d.family?.parent1Phone||'—'}</div>
        <div class="info-item"><div class="label">LINE ID</div>${d.family?.parent1Line||'—'}</div>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">🎓 Student(s)</div>
      <div class="info-grid">
        ${(d.students||[]).map(s=>`
          <div class="info-item"><div class="label">Name</div><strong>${s.name}</strong></div>
          <div class="info-item"><div class="label">Grade</div>${s.grade||'—'}</div>
          <div class="info-item"><div class="label">Subject</div>${s.subject||'—'}</div>
          ${isEnrollment ? `<div class="info-item"><div class="label">Hours</div>${s.courseHours}h.</div>` : ''}
        `).join('')}
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">📅 Chosen Schedule</div>
      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px 13px">
        <div style="font-size:13px;font-weight:600;color:#065f46">${d.schedule?.label||'—'}</div>
        ${d.schedule?.teacher ? `<div style="font-size:11px;color:#6b7280;margin-top:4px">Teacher: ${d.schedule.teacher} · ${d.schedule.room||''}</div>` : ''}
      </div>
    </div>

    ${isEnrollment ? `
    <div class="modal-section">
      <div class="modal-section-title">📦 Course & Package</div>
      <div class="info-grid">
        <div class="info-item"><div class="label">Course</div>${d.course?.name||'—'}</div>
        <div class="info-item"><div class="label">Hours</div>${d.course?.hours||'—'}h.</div>
        <div class="info-item"><div class="label">Price</div><strong style="color:#059669">${d.course?.price ? Utils.currency(d.course.price) : '—'}</strong></div>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">💳 Payment</div>
      <div class="info-grid">
        <div class="info-item"><div class="label">Method</div>${d.payment?.method||'—'}</div>
        <div class="info-item"><div class="label">Slip</div>
          ${d.payment?.slipAttached
            ? `<span style="color:#059669;font-weight:600">✅ Attached</span>`
            : `<span style="color:#ef4444;font-weight:600">❌ Not attached</span>`}
        </div>
      </div>
    </div>` : ''}

    ${sub.status === 'pending' ? `
    <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:10px 13px;margin-top:4px;font-size:12px;color:#92400e">
      💡 Review the information above. Click <strong>Approve</strong> to create records automatically,
      or <strong>Edit</strong> to adjust before approving.
    </div>` : `
    <div style="background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:10px 13px;margin-top:4px;font-size:12px;color:#065f46">
      ✅ This form has been approved. Records have been created.
    </div>`}
  `,

  sub.status === 'pending'
    ? `<button class="btn btn-secondary" onclick="Modal.close('modal-form-review')">Close</button>
       <button class="btn btn-secondary" onclick="editFormSubmission('${subId}')">✏️ Edit</button>
       <button class="btn btn-primary" onclick="approveFormSubmission('${subId}')">✅ Approve & Enroll</button>`
    : `<button class="btn btn-primary" onclick="Modal.close('modal-form-review')">Close</button>`,
  'modal-lg');
};

/* ── EDIT SUBMISSION ─────────────────────────────────────── */
window.editFormSubmission = function (subId) {
  const sub = (DB.formSubmissions||[]).find(s => s.id === subId);
  if (!sub) return;
  const d = sub.data||{};

  // Replace the family-view section with editable fields inline
  const fv = document.getElementById('form-family-view');
  if (fv) {
    fv.innerHTML = `
      <div class="info-item">
        <div class="label">Parent Name</div>
        <input class="settings-input" id="edit-p1name" value="${d.family?.parent1Name||''}">
      </div>
      <div class="info-item">
        <div class="label">Phone</div>
        <input class="settings-input" id="edit-p1phone" value="${d.family?.parent1Phone||''}">
      </div>
      <div class="info-item">
        <div class="label">LINE ID</div>
        <input class="settings-input" id="edit-p1line" value="${d.family?.parent1Line||''}">
      </div>`;
  }

  // Replace footer buttons
  const footer = document.querySelector('#modal-form-review .modal-footer');
  if (footer) {
    footer.innerHTML = `
      <button class="btn btn-secondary" onclick="Modal.close('modal-form-review')">Cancel</button>
      <button class="btn btn-primary" onclick="saveEditAndApprove('${subId}')">💾 Save & Approve</button>`;
  }
  showToast('Fields are now editable','info');
};

window.saveEditAndApprove = function (subId) {
  const sub = (DB.formSubmissions||[]).find(s => s.id === subId);
  if (!sub) return;
  if (!sub.data) sub.data = {};
  if (!sub.data.family) sub.data.family = {};
  const p1n   = document.getElementById('edit-p1name')?.value;
  const p1ph  = document.getElementById('edit-p1phone')?.value;
  const p1ln  = document.getElementById('edit-p1line')?.value;
  if (p1n)  sub.data.family.parent1Name  = p1n;
  if (p1ph) sub.data.family.parent1Phone = p1ph;
  if (p1ln) sub.data.family.parent1Line  = p1ln;
  approveFormSubmission(subId);
};

/* ── APPROVE SUBMISSION ──────────────────────────────────── */
window.approveFormSubmission = function (subId) {
  const sub = (DB.formSubmissions||[]).find(s => s.id === subId);
  if (!sub) return;
  const lead = DB.leads.find(l => l.id === sub.leadId);
  const d = sub.data||{};
  const isEnrollment = sub.type === 'enrollment';

  // Mark submission approved
  sub.status = 'approved';
  if (lead) { lead.formPending = false; lead.stage = 'enrolled'; }

  // Update inbox message
  const conv = DB.conversations.find(c =>
    c.name.toLowerCase().includes((lead?.name||'').split(' ')[0].toLowerCase()));
  if (conv) {
    conv.preview = `✅ ${sub.type==='enrollment'?'Enrollment':'Form'} approved`;
    conv.time = 'Now';
    (DB.messages[conv.id] = DB.messages[conv.id]||[]).push({
      type:'staff',
      text: isEnrollment
        ? `✅ ยืนยันการสมัครเรียนแล้วครับ! ${(d.students||[]).map(s=>s.name).join(', ')} ได้รับการลงทะเบียน ${d.course?.name||''} เรียบร้อยแล้ว 🎉`
        : `✅ นัดหมายได้รับการยืนยันแล้วครับ ${d.schedule?.label||''} 📅`,
      time:'Now', sender:'Admin Nock'
    });
  }

  // If enrollment → create customer record
  if (isEnrollment && lead) {
    const existing = DB.customers.find(c => c.name === lead.name);
    if (!existing) {
      DB.customers.push({
        name: lead.name,
        family: (d.family?.parent1Name||lead.name) + ' Family',
        branch: 'Sukhumvit',
        course: d.course?.name||lead.course,
        pkg: `${d.course?.name||lead.course} · ${d.course?.hours||24}h.`,
        teacher: d.schedule?.teacher||'TBD',
        schedule: d.schedule?.label?.replace('Every ','').replace(' 2026','').replace(', 13:00–15:00','')||'TBD',
        remain: d.course?.hours||24,
        total:  d.course?.hours||24,
        since: 'May 2026', until: 'Nov 2026',
        status: 'active',
        phone:  d.family?.parent1Phone||lead.phone||'',
        line:   d.family?.parent1Line||lead.line||'',
        revenue: d.course?.price||7200,
      });
    }
  }

  // Re-render pipeline
  window._refreshPipeline?.();
  Modal.close('modal-form-review');

  const msg = isEnrollment
    ? `${lead?.name||'Lead'} enrolled! Student record + Invoice created ✓`
    : `${lead?.name||'Lead'} appointment confirmed ✓`;
  showToast(msg, 'success');
};

/* ── FIND OR CREATE CONVERSATION FOR A LEAD ─────────────── */
function findOrCreateConv(lead) {
  if (!lead) return null;
  // 1. Direct link via convId
  if (lead.convId) {
    const c = DB.conversations.find(c => c.id === lead.convId);
    if (c) return c;
  }
  // 2. Fuzzy: match first name against conversation name or student
  const firstName = lead.name.replace(/\s*\(Lead\)\s*/i,'').split(' ')[0].toLowerCase();
  const fuzzy = DB.conversations.find(c =>
    c.name.toLowerCase().includes(firstName) ||
    (c.student||'').toLowerCase().includes(firstName));
  if (fuzzy) { lead.convId = fuzzy.id; return fuzzy; }
  // 3. Create new conversation
  const newId = 'conv_' + lead.id;
  if (!DB.conversations.find(c => c.id === newId)) {
    const cleanName = lead.name.replace(/\s*\(Lead\)\s*/i,'').trim();
    DB.conversations.unshift({
      id: newId, name: cleanName + ' Family', student: cleanName,
      branch: 'Sukhumvit', channel: 'LINE', unread: false,
      time: 'Now', assignee: 'Admin Nock', preview: 'New lead conversation',
    });
    DB.messages[newId] = [];
  }
  lead.convId = newId;
  return DB.conversations.find(c => c.id === newId);
}

/* ── SEND FORM FROM INBOX ────────────────────────────────── */
window.openSendFormFromInbox = function (convId) {
  const conv = DB.conversations.find(c => c.id === convId);
  if (!conv) return;
  // Find lead by convId back-link or fuzzy
  const firstName = (conv.student || conv.name).split(' ')[0].toLowerCase();
  const lead = DB.leads.find(l =>
    l.convId === convId ||
    l.name.replace(/\s*\(Lead\)\s*/i,'').toLowerCase().includes(firstName));
  if (lead) {
    openSendFormModal(lead.id);
  } else {
    showToast('No active lead found. Create a lead in CRM first.', 'info');
  }
};

})();
