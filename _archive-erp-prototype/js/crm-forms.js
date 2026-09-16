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

/* Generate a mock bank-transfer slip SVG as data URL (ASCII-only for btoa safety) */
function _mockSlipDataUrl(amount) {
  const a   = Number(amount||7200).toLocaleString('en-US');
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
    + '<text x="20" y="258" fill="#059669" font-family="Arial,sans-serif" font-size="34" font-weight="800">'+a+'</text>'
    + '<text x="20" y="278" fill="#059669" font-family="Arial,sans-serif" font-size="13">THB</text>'
    + '<line x1="20" y1="294" x2="300" y2="294" stroke="#f3f4f6" stroke-width="1"/>'
    + '<text x="20" y="314" fill="#6b7280" font-family="Arial,sans-serif" font-size="11">Reference Number</text>'
    + '<text x="20" y="334" fill="#111827" font-family="Arial,sans-serif" font-size="12">'+ref+'</text>'
    + '<rect x="20" y="352" width="98" height="26" fill="#d1fae5" rx="4"/>'
    + '<text x="69" y="369" text-anchor="middle" fill="#065f46" font-family="Arial,sans-serif" font-size="11" font-weight="700">SUCCESSFUL</text>'
    + '<line x1="20" y1="393" x2="300" y2="393" stroke="#f3f4f6" stroke-width="1"/>'
    + '<text x="160" y="412" text-anchor="middle" fill="#d1d5db" font-family="Arial,sans-serif" font-size="9">NockERP Demo Slip</text>'
    + '</svg>';
  try { return 'data:image/svg+xml;base64,' + btoa(svg); } catch(e) { return ''; }
}

/* Escape XML special chars for safe SVG text content */
function _escXml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* Generate official Receipt SVG (Unicode-safe via encodeURIComponent) */
function _generateReceiptSvg(rec) {
  const invId   = _escXml(rec.invoiceId || (rec.id||'').replace('RCP','INV'));
  const rcpId   = _escXml(rec.id || '');
  const amt     = Number(rec.amount||0).toLocaleString('en-US');
  const course  = _escXml(rec.course||'');
  const student = _escXml(rec.student||'');
  const branch  = _escXml(rec.branch||'');
  const date    = _escXml(rec.paidAt || rec.date || '');
  const ref     = _escXml(rec.refNo||'');
  const method  = _escXml(rec.method||'Bank Transfer');
  const stamper = _escXml(rec.stampedBy||'Admin');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" font-family="Arial,sans-serif">
<rect width="400" height="500" fill="#fff" rx="4" stroke="#e5e7eb" stroke-width="1.5"/>
<rect width="400" height="68" fill="#4f46e5" rx="4"/>
<rect y="54" width="400" height="14" fill="#4f46e5"/>
<text x="20" y="28" fill="#fff" font-size="16" font-weight="bold">NockAcademy</text>
<text x="20" y="48" fill="#a5b4fc" font-size="10">Tutoring Center</text>
<text x="380" y="30" fill="#fff" font-size="17" font-weight="bold" text-anchor="end">RECEIPT</text>
<text x="380" y="50" fill="#a5b4fc" font-size="9" text-anchor="end">${rcpId}</text>
<text x="20" y="100" fill="#6b7280" font-size="10">Invoice Ref.</text><text x="190" y="100" fill="#374151" font-size="11" font-weight="600">${invId}</text>
<text x="20" y="120" fill="#6b7280" font-size="10">Date</text><text x="190" y="120" fill="#374151" font-size="11" font-weight="600">${date}</text>
<line x1="20" y1="134" x2="380" y2="134" stroke="#f3f4f6" stroke-width="1"/>
<text x="20" y="154" fill="#6b7280" font-size="10">Student</text><text x="190" y="154" fill="#111827" font-size="12" font-weight="700">${student}</text>
<text x="20" y="172" fill="#6b7280" font-size="10">Branch</text><text x="190" y="172" fill="#374151" font-size="11">${branch}</text>
<line x1="20" y1="186" x2="380" y2="186" stroke="#f3f4f6" stroke-width="1"/>
<text x="20" y="206" fill="#6b7280" font-size="10">Course</text><text x="190" y="206" fill="#374151" font-size="11" font-weight="600">${course}</text>
<text x="20" y="224" fill="#6b7280" font-size="10">Payment Method</text><text x="190" y="224" fill="#374151" font-size="11">${method}</text>
<text x="20" y="242" fill="#6b7280" font-size="10">Reference No.</text><text x="190" y="242" fill="#374151" font-size="11">${ref}</text>
<line x1="20" y1="258" x2="380" y2="258" stroke="#e5e7eb" stroke-width="1.5"/>
<text x="20" y="280" fill="#6b7280" font-size="11">Total Amount (THB)</text>
<text x="380" y="296" fill="#059669" font-size="30" font-weight="800" text-anchor="end">${amt}</text>
<line x1="20" y1="314" x2="380" y2="314" stroke="#e5e7eb" stroke-width="1.5"/>
<rect x="20" y="330" width="110" height="46" rx="6" fill="#dcfce7" stroke="#16a34a" stroke-width="2"/>
<text x="75" y="350" text-anchor="middle" fill="#15803d" font-size="13" font-weight="800">PAID</text>
<text x="75" y="367" text-anchor="middle" fill="#15803d" font-size="8">${date}</text>
<text x="145" y="347" fill="#6b7280" font-size="10">Approved by</text>
<text x="145" y="364" fill="#374151" font-size="11" font-weight="600">${stamper}</text>
<line x1="20" y1="394" x2="380" y2="394" stroke="#f3f4f6" stroke-width="1"/>
<text x="200" y="414" text-anchor="middle" fill="#9ca3af" font-size="9">Thank you for choosing NockAcademy</text>
<text x="200" y="430" text-anchor="middle" fill="#d1d5db" font-size="8">Official receipt generated by NockERP</text>
</svg>`;
}

function _receiptDataUrl(rec) {
  const svg = _generateReceiptSvg(rec);
  try { return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg))); }
  catch(e) { return ''; }
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
      payment: type === 'enrollment' ? { method: 'Bank Transfer', slipAttached: true, slipDataUrl: _mockSlipDataUrl(7200), slipName: 'payment_slip.jpg' } : null
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

  // Lazy-init mock slip for submissions that have slipAttached but no dataUrl yet
  if (isEnrollment && d.payment?.slipAttached && !d.payment?.slipDataUrl) {
    d.payment.slipDataUrl = _mockSlipDataUrl(d.course?.price || 7200);
    d.payment.slipName    = d.payment.slipName || 'payment_slip.jpg';
  }

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
      <div class="info-grid" style="margin-bottom:12px">
        <div class="info-item"><div class="label">Method</div>${d.payment?.method||'—'}</div>
        <div class="info-item"><div class="label">Amount Due</div><strong style="color:#059669">${d.course?.price ? Utils.currency(d.course.price) : '—'}</strong></div>
      </div>
      ${d.payment?.slipDataUrl ? `
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:9px;padding:12px;margin-bottom:10px">
        <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;margin-bottom:9px">📎 Payment Slip</div>
        <div style="display:flex;gap:12px;align-items:flex-start">
          <img src="${d.payment.slipDataUrl}" alt="payment slip"
               style="width:88px;border-radius:7px;border:1px solid #d1d5db;cursor:pointer;flex-shrink:0;box-shadow:0 1px 4px rgba(0,0,0,.08)"
               onclick="window.open(this.src,'_blank')" title="Click to view full size">
          <div style="flex:1">
            <div style="font-size:12px;font-weight:600;color:#1a1d23">${d.payment.slipName||'payment_slip.jpg'}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px">Bank Transfer · SCB</div>
            <div style="margin-top:9px;background:#dcfce7;border:1px solid #bbf7d0;border-radius:6px;padding:8px 10px">
              <div style="font-size:12px;font-weight:700;color:#065f46">🤖 System: Amount verified ✓</div>
              <div style="font-size:11px;color:#374151;margin-top:2px">Expected: <strong style="color:#059669">${d.course?.price ? Utils.currency(d.course.price) : '—'}</strong></div>
            </div>
          </div>
        </div>
      </div>
      <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:7px;padding:10px 13px;font-size:12px;color:#78350f;display:flex;align-items:center;gap:8px">
        <span style="font-size:15px;flex-shrink:0">👆</span>
        <div><strong>Admin — verify this slip visually</strong> before approving. Confirm transfer of <strong style="color:#059669">${d.course?.price ? Utils.currency(d.course.price) : '—'}</strong> to NockAcademy SCB 123-4-56789-0.</div>
      </div>` : `
      <div style="padding:6px 0"><span style="color:#ef4444;font-weight:600">❌ No payment slip attached</span></div>`}
    </div>` : ''}

    ${isEnrollment && sub.status === 'pending' ? `
    <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:9px;padding:12px 14px;margin-top:8px">
      <div style="font-size:11px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">📄 Invoice + Receipt — Preview</div>
      <div class="info-grid" style="margin-bottom:8px">
        <div class="info-item"><div class="label">Invoice No.</div>Auto-assigned on create</div>
        <div class="info-item"><div class="label">Course</div>${d.course?.name||'—'} · ${d.course?.hours||24}h.</div>
        <div class="info-item"><div class="label">Amount</div><strong style="color:#059669">${d.course?.price ? Utils.currency(d.course.price) : '—'}</strong></div>
        <div class="info-item"><div class="label">Status</div><span class="badge badge-green">PAID</span></div>
      </div>
      <div style="font-size:11px;color:#0284c7">Receipt (RCP-...) auto-sends to Parent via Inbox after creation.</div>
    </div>
    <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:10px 13px;margin-top:6px;font-size:12px;color:#92400e">
      Verify the payment slip above, then click <strong>Create Invoice &amp; Receipt</strong> to complete enrollment.
    </div>` : sub.status === 'pending' ? `
    <div style="background:#fef9c3;border:1px solid #fde68a;border-radius:8px;padding:10px 13px;margin-top:4px;font-size:12px;color:#92400e">
      Review the information above, then click <strong>Approve</strong> to confirm the appointment.
    </div>` : `
    <div style="background:#dcfce7;border:1px solid #86efac;border-radius:8px;padding:10px 13px;margin-top:4px;font-size:12px;color:#065f46">
      This form has been approved. Records have been created.
    </div>`}
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
  if (sub.type === 'enrollment') createInvoiceAndReceipt(subId);
  else approveFormSubmission(subId);
};

/* ── APPROVE SUBMISSION (Test / Trial only) ──────────────── */
window.approveFormSubmission = function (subId) {
  const sub = (DB.formSubmissions||[]).find(s => s.id === subId);
  if (!sub) return;
  if (sub.type === 'enrollment') { createInvoiceAndReceipt(subId); return; }

  const lead    = DB.leads.find(l => l.id === sub.leadId);
  const d       = sub.data||{};
  const isTrial = sub.type === 'trial';

  sub.status = 'approved';
  if (lead) {
    lead.formPending = false;
    lead.stage = isTrial ? 'trialed' : 'tested';
  }

  const conv = DB.conversations.find(c =>
    c.name.toLowerCase().includes((lead?.name||'').split(' ')[0].toLowerCase()));
  if (conv) {
    conv.preview = isTrial
      ? `Trial confirmed · ${d.schedule?.label||''}`
      : `Test appointment confirmed`;
    conv.time = 'Now';
    (DB.messages[conv.id] = DB.messages[conv.id]||[]).push({
      type:'staff',
      text: isTrial
        ? `Trial confirmed! ${d.schedule?.label||''} — see you there!`
        : `Test appointment confirmed! ${d.schedule?.label||''} — see you there!`,
      time:'Now', sender:'Admin Nock'
    });
  }

  if (isTrial && lead) {
    const notif = {
      id: 'notif_' + Date.now(), type: 'action',
      title: `Follow up with ${lead.name}`,
      message: `Trial confirmed (${d.schedule?.label||''}). Send Enrollment Form now!`,
      time: 'Just now', read: false, link: 'crm',
      action: `openLeadModal('${lead?.id||''}')`, label: 'Open Lead →',
    };
    if (Array.isArray(DB.notifications)) DB.notifications.unshift(notif);
    const nb = document.getElementById('badge-notifications');
    if (nb) nb.textContent = (DB.notifications||[]).filter(n=>!n.read).length || '';
  }

  window._refreshPipeline?.();
  Modal.close('modal-form-review');
  showToast(
    isTrial
      ? `Trial confirmed for ${lead?.name||'Lead'} · Follow-up sent ✓`
      : `Test appointment confirmed for ${lead?.name||'Lead'} ✓`,
    'success'
  );
};

/* ── CREATE INVOICE + RECEIPT (Enrollment) ───────────────── */
window.createInvoiceAndReceipt = function (subId) {
  const sub = (DB.formSubmissions||[]).find(s => s.id === subId);
  if (!sub) return;
  const lead = DB.leads.find(l => l.id === sub.leadId);
  if (!lead) return;
  const d = sub.data||{};

  // Ensure slip data exists
  if (d.payment?.slipAttached && !d.payment?.slipDataUrl) {
    d.payment.slipDataUrl = _mockSlipDataUrl(d.course?.price || 7200);
    d.payment.slipName    = d.payment.slipName || 'payment_slip.jpg';
  }

  // IDs + shared metadata
  const suffix     = String(Date.now()).slice(-4);
  const invId      = 'INV-2026-' + suffix;
  const rcpId      = 'RCP-2026-' + suffix;
  const refNo      = 'NCK' + String(Date.now()).slice(-8);
  const dateStr    = '22 May 2026';
  const branch     = lead.branch || d.schedule?.branch || 'Sukhumvit';
  const familyName = (d.family?.parent1Name
    ? d.family.parent1Name.replace(/\s+(Dad|Mom|Parent|คุณพ่อ|คุณแม่)$/i,'').trim() + ' Family'
    : lead.name.split(' ').slice(-1)[0] + ' Family');
  const coursePkg  = `${d.course?.name || lead.course} · ${d.course?.hours || 24}h.`;

  // Invoice
  const invoice = {
    id:      invId,
    date:    dateStr,
    student: lead.name,
    family:  familyName,
    branch,
    course:  d.course?.name || lead.course,
    hours:   d.course?.hours || 24,
    amount:  d.course?.price || 7200,
    method:  d.payment?.method || 'Bank Transfer',
    status:  'paid',
    payslip: {
      dataUrl: d.payment?.slipDataUrl || '',
      name:    d.payment?.slipName || 'payment_slip.jpg',
      refNo,
      paidAt:  dateStr,
    }
  };

  // Receipt = Invoice + PAID stamp
  const receipt = {
    id:        rcpId,
    invoiceId: invId,
    student:   invoice.student,
    family:    invoice.family,
    branch:    invoice.branch,
    course:    coursePkg,
    amount:    invoice.amount,
    method:    invoice.method,
    paidAt:    dateStr,
    refNo,
    stampedBy: 'Admin Nock',
  };
  receipt.dataUrl = _receiptDataUrl(receipt);

  // Mark submission
  sub.status    = 'approved';
  sub.invoiceId = invId;
  sub.receiptId = rcpId;
  if (lead) { lead.formPending = false; lead.stage = 'enrolled'; }

  // ── Customer record ──────────────────────────────────────
  if (!DB.customers.find(c => c.name === lead.name)) {
    DB.customers.push({
      name:     lead.name,
      family:   familyName,
      branch,
      course:   invoice.course,
      pkg:      coursePkg,
      teacher:  d.schedule?.teacher || 'TBD',
      schedule: (d.schedule?.label||'TBD').replace(/Every\s+/i,'').replace(/\s+\d{4}/,'').replace(/, \d{2}:\d{2}.*/,''),
      remain:   invoice.hours,
      total:    invoice.hours,
      since:    'May 2026', until: 'Nov 2026',
      status:   'active',
      phone:    d.family?.parent1Phone || lead.phone || '',
      line:     d.family?.parent1Line  || lead.line  || '',
      revenue:  invoice.amount,
    });
  }

  // ── Student record ───────────────────────────────────────
  const existingStu = DB.students.find(s => s.name === lead.name);
  if (!existingStu) {
    DB.students.push({
      id: 'stu_' + lead.id, name: lead.name, age: lead.age || 0,
      branch, family: familyName,
      line:  d.family?.parent1Line  || lead.line  || '',
      phone: d.family?.parent1Phone || lead.phone || '',
      enrollDate: '2026-05-22',
      teacher: d.schedule?.teacher || 'TBD',
      status: 'active',
      courses: [{ name: invoice.course, hours: invoice.hours, used: 0, left: invoice.hours, price: invoice.amount }],
      schedule: [], attendance: [],
      invoices: [{ ...invoice }],
      receipts: [{ ...receipt }],
      notes: [{ type:'admin', text:`Enrolled via CRM · ${invoice.course} · ${invId}`, author:'Admin Nock', date:'22 May' }],
    });
  } else {
    (existingStu.invoices = existingStu.invoices||[]).push({ ...invoice });
    (existingStu.receipts = existingStu.receipts||[]).push({ ...receipt });
  }

  // ── Family record ────────────────────────────────────────
  if (!DB.families.find(f => f.name === familyName)) {
    DB.families.push({
      id: 'fam_' + lead.id, name: familyName, branch,
      assignee: 'Admin Nock', status: 'active',
      totalPaid: invoice.amount, invoiceCount: 1,
      lastContact: 'Today', channel: lead.line ? 'LINE' : 'Phone', unreadCount: 0,
      parents: [{ role:'Parent', name: d.family?.parent1Name||'',
        line: d.family?.parent1Line||lead.line||'', phone: d.family?.parent1Phone||lead.phone||'',
        email:'', lineActive: !!(d.family?.parent1Line||lead.line) }],
      students: [lead.name],
      notes: [{ type:'admin', text:`Enrolled ${invoice.course} · from CRM`, author:'Admin Nock', date:'22 May' }],
    });
  }

  // ── Send Receipt to Inbox ────────────────────────────────
  const conv = findOrCreateConv(lead);
  if (conv) {
    conv.unread  = true;
    conv.time    = 'Now';
    conv.preview = `${invId} issued — receipt sent`;
    (DB.messages[conv.id] = DB.messages[conv.id]||[]).push(
      { type:'staff',
        text:`Enrollment confirmed! ${lead.name} is now enrolled in ${invoice.course}. Receipt attached below.`,
        time:'Now', sender:'Admin Nock' },
      { type:'receipt', invId, rcpId,
        receiptDataUrl: receipt.dataUrl,
        amount: invoice.amount, coursePkg,
        time:'Now', sender:'System' }
    );
  }

  window._refreshPipeline?.();
  window._refreshInboxList?.();
  const ub = document.getElementById('badge-inbox');
  if (ub) ub.textContent = DB.conversations.filter(c=>c.unread).length || '';

  Modal.close('modal-form-review');
  showToast(`${invId} + ${rcpId} created & sent to ${lead.name} ✓`, 'success');
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
