/* ============================================================
   crm-review.js — Form Review · Approve · Edit · Cancel
   Depends on crm-forms.js (_crmFindConv, _crmFormTypeLabel)
   ============================================================ */
(function () {

function formTypeLabel(t) { return window._crmFormTypeLabel?.(t) || 'Form'; }
function findConv(lead)    { return window._crmFindConv?.(lead) || null; }

/* ── MOCK SLIP SVG ───────────────────────────────────────── */
function _mockSlipDataUrl(amount) {
  const a   = Number(amount || 7200).toLocaleString('en-US');
  const ref = 'NCK' + String(Date.now()).slice(-8);
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="430">'
    + '<rect width="320" height="430" fill="#fff" rx="4" stroke="#d1d5db" stroke-width="1.5"/>'
    + '<rect width="320" height="64" fill="#006633" rx="4"/><rect y="50" width="320" height="14" fill="#006633"/>'
    + '<text x="160" y="33" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="15" font-weight="bold">SCB Transfer Receipt</text>'
    + '<text x="160" y="52" text-anchor="middle" fill="#a3d9a5" font-family="Arial,sans-serif" font-size="10">Siam Commercial Bank</text>'
    + '<text x="20" y="90" fill="#6b7280" font-family="Arial,sans-serif" font-size="11">Date &amp; Time</text>'
    + '<text x="20" y="110" fill="#111827" font-family="Arial,sans-serif" font-size="13" font-weight="600">22 May 2026  08:44 AM</text>'
    + '<line x1="20" y1="124" x2="300" y2="124" stroke="#f3f4f6" stroke-width="1"/>'
    + '<text x="20" y="144" fill="#6b7280" font-family="Arial,sans-serif" font-size="11">Transfer To Account</text>'
    + '<text x="20" y="164" fill="#111827" font-family="Arial,sans-serif" font-size="13" font-weight="600">123-4-56789-0</text>'
    + '<text x="20" y="182" fill="#374151" font-family="Arial,sans-serif" font-size="12">NockAcademy Co., Ltd.</text>'
    + '<line x1="20" y1="197" x2="300" y2="197" stroke="#f3f4f6" stroke-width="1"/>'
    + '<text x="20" y="218" fill="#6b7280" font-family="Arial,sans-serif" font-size="11">Amount (Baht)</text>'
    + '<text x="20" y="258" fill="#059669" font-family="Arial,sans-serif" font-size="34" font-weight="800">' + a + '</text>'
    + '<text x="20" y="278" fill="#059669" font-family="Arial,sans-serif" font-size="13">THB</text>'
    + '<line x1="20" y1="294" x2="300" y2="294" stroke="#f3f4f6" stroke-width="1"/>'
    + '<text x="20" y="314" fill="#6b7280" font-family="Arial,sans-serif" font-size="11">Reference Number</text>'
    + '<text x="20" y="334" fill="#111827" font-family="Arial,sans-serif" font-size="12">' + ref + '</text>'
    + '<rect x="20" y="352" width="98" height="26" fill="#d1fae5" rx="4"/>'
    + '<text x="69" y="369" text-anchor="middle" fill="#065f46" font-family="Arial,sans-serif" font-size="11" font-weight="700">SUCCESSFUL</text>'
    + '<line x1="20" y1="393" x2="300" y2="393" stroke="#f3f4f6" stroke-width="1"/>'
    + '<text x="160" y="412" text-anchor="middle" fill="#d1d5db" font-family="Arial,sans-serif" font-size="9">NockERP Demo Slip</text>'
    + '</svg>';
  try { return 'data:image/svg+xml;base64,' + btoa(svg); } catch (e) { return ''; }
}
window._crmMockSlip = _mockSlipDataUrl;

/* ── SCHEDULE SECTION (used in review modal) ─────────────── */
function _scheduleHtml(sub) {
  const d         = sub.data || {};
  const sessionId = d.schedule?.sessionId;
  const isPending = sub.status === 'pending';
  const isCancelled = sub.status === 'cancelled';
  const bg = isCancelled
    ? 'var(--md-surface-low)' : 'var(--md-success-container)';
  const border = isCancelled
    ? 'var(--md-outline-variant)' : 'var(--md-success)';

  return `
    <div class="modal-section">
      <div class="modal-section-title">${UI.icon('calendar_month','sm')} Chosen Schedule</div>
      <div style="background:${bg};border:1px solid ${border};border-radius:8px;padding:10px 13px">
        <div style="font-size:13px;font-weight:600;color:var(--md-on-surface)">
          ${isCancelled
            ? `<span class="text-muted"><s>${d.schedule?.label || '—'}</s></span>`
            : (d.schedule?.label || '—')}
        </div>
        ${d.schedule?.teacher
          ? `<div class="text-muted" style="font-size:11px;margin-top:3px">
               ${UI.icon('person','sm')} ${d.schedule.teacher} · ${d.schedule.room || ''}
             </div>` : ''}
        ${!isCancelled ? `
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:9px">
          ${sessionId
            ? `<button class="btn btn-secondary btn-sm"
                 onclick="viewSessionOnCalendar('${sessionId}')">
                 ${UI.icon('calendar_month','sm')} View on Calendar
               </button>` : ''}
          ${isPending
            ? `<button class="btn btn-secondary btn-sm"
                 onclick="editScheduleInline('${sub.id}')">
                 ${UI.icon('edit_calendar','sm')} Edit Schedule
               </button>
               <button class="btn btn-secondary btn-sm" style="color:var(--md-error)"
                 onclick="cancelSchedule('${sub.id}')">
                 ${UI.icon('event_busy','sm')} Cancel Schedule
               </button>` : `
            <button class="btn btn-secondary btn-sm" style="color:var(--md-error)"
              onclick="cancelSchedule('${sub.id}')">
              ${UI.icon('event_busy','sm')} Cancel Schedule
            </button>`}
        </div>` : `
        <div style="margin-top:7px;font-size:11px;color:var(--md-on-surface-variant)">
          ${UI.icon('cancel','sm')} Schedule cancelled
        </div>`}
      </div>
    </div>`;
}

/* ── FORM REVIEW MODAL ───────────────────────────────────── */
window.openFormReviewModal = function (subId) {
  const sub = (DB.formSubmissions || []).find(s => s.id === subId);
  if (!sub) { showToast('Submission not found', 'error'); return; }
  const lead = DB.leads.find(l => l.id === sub.leadId) || {};
  const isEnrollment = sub.type === 'enrollment';
  const d = sub.data || {};

  // Lazy-init mock slip
  if (isEnrollment && d.payment?.slipAttached && !d.payment?.slipDataUrl) {
    d.payment.slipDataUrl = _mockSlipDataUrl(d.course?.price || 7200);
    d.payment.slipName    = d.payment.slipName || 'payment_slip.jpg';
  }

  const statusBadge = sub.status === 'approved'
    ? `<span class="badge badge-green" style="font-size:11px;margin-left:8px">${UI.icon('check_circle','sm')} Approved</span>`
    : sub.status === 'cancelled'
    ? `<span class="badge badge-gray" style="font-size:11px;margin-left:8px">${UI.icon('cancel','sm')} Cancelled</span>`
    : `<span class="badge badge-yellow" style="font-size:11px;margin-left:8px">${UI.icon('pending_actions','sm')} Pending Review</span>`;

  const title = `${UI.icon('assignment','sm')} ${sub.type === 'enrollment' ? 'Enrollment' : sub.type === 'trial' ? 'Trial' : 'Test'} Form Review ${statusBadge}`;

  Modal.create('modal-form-review', title, `
    <div style="display:flex;gap:10px;align-items:center;padding:11px 0;
                border-bottom:1px solid var(--md-outline-variant);margin-bottom:4px">
      ${UI.icon('person','xl')}
      <div>
        <div style="font-size:14px;font-weight:700;color:var(--md-on-surface)">${sub.leadName}</div>
        <div class="text-muted" style="font-size:11px">Submitted: ${sub.submittedAt} · via NockERP Form</div>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">${UI.icon('family_restroom','sm')} Family Info</div>
      <div class="info-grid" id="form-family-view">
        <div class="info-item"><div class="label">Parent Name</div>${d.family?.parent1Name || '—'}</div>
        <div class="info-item"><div class="label">Phone</div>${d.family?.parent1Phone || '—'}</div>
        <div class="info-item"><div class="label">LINE ID</div>${d.family?.parent1Line || '—'}</div>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">${UI.icon('school','sm')} Student(s)</div>
      <div class="info-grid">
        ${(d.students || []).map(s => `
          <div class="info-item"><div class="label">Name</div><strong>${s.name}</strong></div>
          <div class="info-item"><div class="label">Grade</div>${s.grade || '—'}</div>
          <div class="info-item"><div class="label">Subject</div>${s.subject || '—'}</div>
          ${isEnrollment ? `<div class="info-item"><div class="label">Hours</div>${s.courseHours}h.</div>` : ''}
        `).join('')}
      </div>
    </div>

    ${_scheduleHtml(sub)}

    ${isEnrollment ? `
    <div class="modal-section">
      <div class="modal-section-title">${UI.icon('inventory_2','sm')} Course &amp; Package</div>
      <div class="info-grid">
        <div class="info-item"><div class="label">Course</div>${d.course?.name || '—'}</div>
        <div class="info-item"><div class="label">Hours</div>${d.course?.hours || '—'}h.</div>
        <div class="info-item"><div class="label">Price</div><strong style="color:var(--md-success)">${d.course?.price ? Utils.currency(d.course.price) : '—'}</strong></div>
      </div>
    </div>

    <div class="modal-section">
      <div class="modal-section-title">${UI.icon('credit_card','sm')} Payment</div>
      <div class="info-grid" style="margin-bottom:12px">
        <div class="info-item"><div class="label">Method</div>${d.payment?.method || '—'}</div>
        <div class="info-item"><div class="label">Amount Due</div><strong style="color:var(--md-success)">${d.course?.price ? Utils.currency(d.course.price) : '—'}</strong></div>
      </div>
      ${d.payment?.slipDataUrl ? `
      <div style="background:var(--md-surface-low);border:1px solid var(--md-outline-variant);border-radius:9px;padding:12px;margin-bottom:10px">
        <div style="font-size:10px;font-weight:700;color:var(--md-on-surface-variant);text-transform:uppercase;letter-spacing:.6px;margin-bottom:9px">
          ${UI.icon('attach_file','sm')} Payment Slip
        </div>
        <div style="display:flex;gap:12px;align-items:flex-start">
          <img src="${d.payment.slipDataUrl}" alt="payment slip"
               style="width:88px;border-radius:7px;border:1px solid var(--md-outline-variant);cursor:pointer;flex-shrink:0"
               onclick="window.open(this.src,'_blank')" title="Click to view full size">
          <div style="flex:1">
            <div style="font-size:12px;font-weight:600;color:var(--md-on-surface)">${d.payment.slipName || 'payment_slip.jpg'}</div>
            <div class="text-muted" style="font-size:11px;margin-top:2px">Bank Transfer · SCB</div>
            <div style="margin-top:9px;background:var(--md-success-container);border:1px solid var(--md-success);border-radius:6px;padding:8px 10px">
              <div style="font-size:12px;font-weight:700;color:var(--md-on-success-container)">${UI.icon('smart_toy','sm')} System: Amount verified</div>
              <div style="font-size:11px;margin-top:2px">Expected: <strong style="color:var(--md-success)">${d.course?.price ? Utils.currency(d.course.price) : '—'}</strong></div>
            </div>
          </div>
        </div>
      </div>
      <div style="background:var(--md-warning-container);border:1px solid var(--md-warning);border-radius:7px;
                  padding:10px 13px;font-size:12px;color:var(--md-on-warning-container);display:flex;align-items:center;gap:8px">
        ${UI.icon('touch_app','sm')}
        <div><strong>Admin — verify this slip visually</strong> before approving. Confirm transfer of
        <strong style="color:var(--md-success)">${d.course?.price ? Utils.currency(d.course.price) : '—'}</strong>
        to NockAcademy SCB 123-4-56789-0.</div>
      </div>` : `
      <div style="padding:6px 0">
        <span class="text-error" style="font-weight:600">${UI.icon('cancel','sm')} No payment slip attached</span>
      </div>`}
    </div>` : ''}

    ${isEnrollment && sub.status === 'pending' ? `
    <div style="background:var(--md-primary-container);border:1px solid var(--md-primary);border-radius:9px;padding:12px 14px;margin-top:8px">
      <div style="font-size:11px;font-weight:700;color:var(--md-on-primary-container);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">
        ${UI.icon('receipt','sm')} Invoice + Receipt — Preview
      </div>
      <div class="info-grid" style="margin-bottom:8px">
        <div class="info-item"><div class="label">Invoice No.</div>Auto-assigned on create</div>
        <div class="info-item"><div class="label">Course</div>${d.course?.name || '—'} · ${d.course?.hours || 24}h.</div>
        <div class="info-item"><div class="label">Amount</div><strong style="color:var(--md-success)">${d.course?.price ? Utils.currency(d.course.price) : '—'}</strong></div>
        <div class="info-item"><div class="label">Status</div><span class="badge badge-green">PAID</span></div>
      </div>
      <div style="font-size:11px;color:var(--md-on-primary-container)">Receipt (RCP-...) auto-sends to Parent via Inbox after creation.</div>
    </div>
    <div style="background:var(--md-warning-container);border:1px solid var(--md-warning);border-radius:8px;padding:10px 13px;margin-top:6px;font-size:12px;color:var(--md-on-warning-container)">
      Verify the payment slip above, then click <strong>Create Invoice &amp; Receipt</strong> to complete enrollment.
    </div>` : sub.status === 'pending' ? `
    <div style="background:var(--md-warning-container);border:1px solid var(--md-warning);border-radius:8px;padding:10px 13px;margin-top:4px;font-size:12px;color:var(--md-on-warning-container)">
      Review the information above, then click <strong>Approve</strong> to confirm the appointment.
    </div>` : sub.status === 'approved' ? `
    <div style="background:var(--md-success-container);border:1px solid var(--md-success);border-radius:8px;padding:10px 13px;margin-top:4px;font-size:12px;color:var(--md-on-success-container)">
      This form has been approved. Records have been created.
    </div>` : ''}
  `,
  sub.status === 'pending'
    ? `<button class="btn btn-secondary" onclick="Modal.close('modal-form-review')">Close</button>
       <button class="btn btn-secondary" onclick="editFormSubmission('${subId}')">Edit</button>
       ${isEnrollment
         ? `<button class="btn btn-primary" onclick="createInvoiceAndReceipt('${subId}')">Create Invoice &amp; Receipt</button>`
         : `<button class="btn btn-primary" onclick="approveFormSubmission('${subId}')">Approve</button>`}`
    : `<button class="btn btn-primary" onclick="Modal.close('modal-form-review')">Close</button>`,
  'modal-lg');
};

/* ── VIEW SESSION ON CALENDAR ────────────────────────────── */
window.viewSessionOnCalendar = function (sessionId) {
  Modal.close('modal-form-review');
  showView('calendar');
  setTimeout(() => {
    if (window.openClassModal) window.openClassModal(sessionId);
  }, 350);
};

/* ── EDIT SCHEDULE INLINE ────────────────────────────────── */
window.editScheduleInline = function (subId) {
  const sub = (DB.formSubmissions || []).find(s => s.id === subId);
  if (!sub) return;
  const d       = sub.data || {};
  const subject = d.students?.[0]?.subject || '';
  const grade   = d.students?.[0]?.grade   || '';

  const upcoming = DB.sessions
    .filter(s => s.state === 'upcoming' && (!subject || s.subject === subject))
    .slice(0, 20);

  const schedSection = document.getElementById('edit-schedule-section');
  if (schedSection) { schedSection.remove(); }

  // Insert schedule picker after schedule section
  const reviewBody = document.querySelector('#modal-form-review .modal-body');
  if (!reviewBody) return;

  const picker = document.createElement('div');
  picker.id = 'edit-schedule-section';
  picker.style.cssText = 'margin:0 0 8px;padding:12px 14px;background:var(--md-surface-low);border:1.5px solid var(--md-primary);border-radius:9px';
  picker.innerHTML = `
    <div style="font-size:11px;font-weight:700;color:var(--md-primary);margin-bottom:10px;text-transform:uppercase;letter-spacing:.5px">
      ${UI.icon('edit_calendar','sm')} Change Schedule
    </div>
    <label class="settings-label">Select New Session</label>
    <select class="settings-input" id="edit-schedule-id" style="margin-bottom:8px">
      <option value="">— Keep current schedule —</option>
      ${upcoming.map(s => {
        const slot = CONST.TIME_SLOTS.find(t => t.id === s.slotId);
        return `<option value="${s.id}">${Utils.subjectLabel(s)} · ${slot ? slot.start + '–' + slot.end : '—'} · ${s.date} · ${s.teacher} · ${s.branch}</option>`;
      }).join('')}
    </select>
    <div style="display:flex;gap:6px">
      <button class="btn btn-secondary btn-sm" onclick="document.getElementById('edit-schedule-section').remove()">Cancel</button>
      <button class="btn btn-primary btn-sm" onclick="saveScheduleChange('${subId}')">
        ${UI.icon('check','sm')} Apply Schedule Change
      </button>
    </div>`;

  // Insert before last divider/section
  const sections = reviewBody.querySelectorAll('.modal-section');
  const lastSection = sections[sections.length - 1];
  if (lastSection) reviewBody.insertBefore(picker, lastSection);
  else reviewBody.appendChild(picker);
};

window.saveScheduleChange = function (subId) {
  const sub = (DB.formSubmissions || []).find(s => s.id === subId);
  if (!sub) return;
  const newId = document.getElementById('edit-schedule-id')?.value;
  if (!newId) {
    document.getElementById('edit-schedule-section')?.remove();
    showToast('Schedule unchanged', 'info');
    return;
  }
  const s    = DB.sessions.find(x => x.id === newId);
  const slot = s ? CONST.TIME_SLOTS.find(t => t.id === s.slotId) : null;
  if (!sub.data) sub.data = {};
  sub.data.schedule = {
    label:     `${s.date} · ${slot ? slot.start + '–' + slot.end : '—'} · ${s.teacher}`,
    teacher:   s.teacher, room: s.room, sessionId: s.id, date: s.date,
  };
  Modal.close('modal-form-review');
  setTimeout(() => openFormReviewModal(subId), 100);
  showToast('Schedule updated ✓', 'success');
};

/* ── CANCEL SCHEDULE ─────────────────────────────────────── */
window.cancelSchedule = function (subId) {
  const sub  = (DB.formSubmissions || []).find(s => s.id === subId);
  if (!sub) return;
  const lead = DB.leads.find(l => l.id === sub.leadId);
  const d    = sub.data || {};

  // Remove student from session if present
  if (d.schedule?.sessionId) {
    const sess = DB.sessions.find(x => x.id === d.schedule.sessionId);
    if (sess) sess.studentNames = sess.studentNames.filter(n => n !== sub.leadName);
  }

  // Revert lead stage
  const revert = {
    test:  { test_scheduled: 'contacting', tested: 'tested' },
    trial: { trial_scheduled: 'tested',    trialed: 'trialed' },
  };
  if (lead && revert[sub.type]?.[lead.stage]) {
    lead.stage = revert[sub.type][lead.stage];
  }
  if (lead) lead.formPending = false;

  // Mark submission as cancelled
  sub.status = 'cancelled';

  // Notify inbox
  const conv = findConv(lead);
  if (conv) {
    (DB.messages[conv.id] = DB.messages[conv.id] || []).push({
      type: 'staff',
      text: `ขออภัยนะครับ ขอยกเลิกนัด ${d.schedule?.label || ''} ครับ หากต้องการนัดใหม่ แจ้งได้เลยนะครับ 🙏`,
      time: 'Now', sender: 'Admin Nock',
    });
    conv.preview = 'Schedule cancelled';
    conv.time    = 'Now';
  }

  window._refreshPipeline?.();
  window._refreshInboxList?.();
  Modal.close('modal-form-review');
  showToast('Schedule cancelled · inbox message sent ✓', 'success');
};

/* ── EDIT SUBMISSION (Family Info) ──────────────────────── */
window.editFormSubmission = function (subId) {
  const sub = (DB.formSubmissions || []).find(s => s.id === subId);
  if (!sub) return;
  const d = sub.data || {};

  const fv = document.getElementById('form-family-view');
  if (fv) {
    fv.innerHTML = `
      <div class="info-item">
        <div class="label">Parent Name</div>
        <input class="settings-input" id="edit-p1name" value="${d.family?.parent1Name || ''}">
      </div>
      <div class="info-item">
        <div class="label">Phone</div>
        <input class="settings-input" id="edit-p1phone" value="${d.family?.parent1Phone || ''}">
      </div>
      <div class="info-item">
        <div class="label">LINE ID</div>
        <input class="settings-input" id="edit-p1line" value="${d.family?.parent1Line || ''}">
      </div>`;
  }

  const footer = document.querySelector('#modal-form-review .modal-footer');
  if (footer) {
    footer.innerHTML = `
      <button class="btn btn-secondary" onclick="Modal.close('modal-form-review')">Cancel</button>
      <button class="btn btn-primary" onclick="saveEditAndApprove('${subId}')">
        ${UI.icon('check_circle','sm')} Save &amp; Approve
      </button>`;
  }
  showToast('Fields are now editable', 'info');
};

window.saveEditAndApprove = function (subId) {
  const sub = (DB.formSubmissions || []).find(s => s.id === subId);
  if (!sub) return;
  if (!sub.data) sub.data = {};
  if (!sub.data.family) sub.data.family = {};
  const p1n  = document.getElementById('edit-p1name')?.value;
  const p1ph = document.getElementById('edit-p1phone')?.value;
  const p1ln = document.getElementById('edit-p1line')?.value;
  if (p1n)  sub.data.family.parent1Name  = p1n;
  if (p1ph) sub.data.family.parent1Phone = p1ph;
  if (p1ln) sub.data.family.parent1Line  = p1ln;
  if (sub.type === 'enrollment') createInvoiceAndReceipt(subId);
  else approveFormSubmission(subId);
};

/* ── APPROVE (Test / Trial) ──────────────────────────────── */
window.approveFormSubmission = function (subId) {
  const sub = (DB.formSubmissions || []).find(s => s.id === subId);
  if (!sub) return;
  if (sub.type === 'enrollment') { createInvoiceAndReceipt(subId); return; }

  const lead    = DB.leads.find(l => l.id === sub.leadId);
  const d       = sub.data || {};
  const isTrial = sub.type === 'trial';

  sub.status = 'approved';
  if (lead) { lead.formPending = false; lead.stage = isTrial ? 'trialed' : 'tested'; }

  const conv = findConv(lead);
  if (conv) {
    conv.preview = isTrial ? `Trial confirmed · ${d.schedule?.label || ''}` : 'Test appointment confirmed';
    conv.time    = 'Now';
    (DB.messages[conv.id] = DB.messages[conv.id] || []).push({
      type: 'staff',
      text: isTrial
        ? `Trial confirmed! ${d.schedule?.label || ''} — see you there!`
        : `Test appointment confirmed! ${d.schedule?.label || ''} — see you there!`,
      time: 'Now', sender: 'Admin Nock',
    });
  }

  if (isTrial && lead && window.addNotification) {
    window.addNotification({
      type: 'action', iconName: 'notifications_active',
      title: `Follow up: ${lead.name}`,
      text:  `Trial confirmed (${d.schedule?.label || ''}). Send Enrollment Form now!`,
      time: 'Just now', read: false,
      action: `openLeadModal('${lead.id}')`, aLabel: 'Open Lead →',
    });
  }

  window._refreshPipeline?.();
  Modal.close('modal-form-review');
  showToast(
    isTrial
      ? `Trial confirmed for ${lead?.name || 'Lead'} · Follow-up sent ✓`
      : `Test appointment confirmed for ${lead?.name || 'Lead'} ✓`,
    'success');
};

})();
