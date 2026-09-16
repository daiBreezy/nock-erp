/* ============================================================
   student-profile.js — Unified Student / Customer Profile Modal
   Call from anywhere: openProfileModal(id_or_name)
   Backward compat: openStudentModal + openCustomerModal → openProfileModal
   ============================================================ */
(function () {

  /* ── DATA RESOLVER ────────────────────────────────────── */
  function resolve(identifier) {
    const stu  = DB.students.find(s => s.id === identifier)
              || DB.students.find(s => s.name === identifier);
    const cust = DB.customers?.find(c => c.name === (stu?.name || identifier))
              || DB.leads?.find(l => l.name === (stu?.name || identifier));
    return { stu, cust, name: stu?.name || cust?.name || identifier };
  }

  /* ── AVATAR COLOR (per-name) ──────────────────────────── */
  const AV_COLORS = [
    'var(--md-primary-container)',
    'var(--md-success-container)',
    'var(--md-warning-container)',
    'var(--md-error-container)',
    'var(--clr-grammar)',
    'var(--md-tertiary-container)',
    'var(--clr-science)',
  ];
  function avColor(n) {
    let h = 0;
    for (let i = 0; i < (n||'').length; i++) h = (h*31 + n.charCodeAt(i)) & 0xffff;
    return AV_COLORS[h % AV_COLORS.length];
  }

  /* ── PROFILE HEADER ───────────────────────────────────── */
  function buildHeader(stu, cust, name) {
    const sm     = stu ? CONST.STUDENT_STATUS[stu.status] : null;
    const badge  = sm
      ? UI.badge(sm.label, sm.cls.replace('badge-',''))
      : (cust?.status ? UI.badge(cust.status,'blue') : '');
    const branch  = stu?.branch  || cust?.branch  || '—';
    const teacher = stu?.teacher || cust?.teacher || '—';
    const family  = stu?.family  || cust?.family  || name;
    const phone   = stu?.phone   || cust?.phone   || '';
    const ageLine = stu?.age ? `Age ${stu.age} · ` : '';

    return `
    <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;
      background:var(--md-primary-container);border-radius:var(--shape-md);margin-bottom:4px">
      ${UI.avatar(name[0], 'lg', avColor(name))}
      <div style="flex:1;min-width:0">
        <div style="font-size:var(--fs-title-md);font-weight:700;color:var(--md-on-surface)">${name}</div>
        <div class="text-muted" style="font-size:var(--fs-body-sm);margin-top:2px">${ageLine}${branch}</div>
        <div style="margin-top:var(--sp-2);display:flex;gap:var(--sp-1);flex-wrap:wrap;align-items:center">
          ${badge}
          ${UI.badge(`${UI.icon('person','sm')} ${teacher}`, 'blue')}
        </div>
      </div>
      <div style="display:flex;gap:var(--sp-2);align-items:center;flex-shrink:0">
        <button class="btn btn-secondary btn-sm" onclick="openInboxFor('${family}')">
          ${UI.icon('chat','sm')} Chat</button>
        ${phone ? `<button class="btn btn-secondary btn-sm"
          onclick="showToast('Calling ${phone}…','info')">${UI.icon('call','sm')} Call</button>` : ''}
      </div>
    </div>`;
  }

  /* ── TAB: OVERVIEW ────────────────────────────────────── */
  function buildOverview(stu, cust) {
    const phone  = stu?.phone  || cust?.phone  || '—';
    const line   = stu?.line   || cust?.line   || '—';
    const family = stu?.family || cust?.family || '—';
    const branch = stu?.branch || cust?.branch || '—';
    const since  = stu?.enrollDate || cust?.since || '—';

    const DOW_TH = { Mon:'จ.', Tue:'อ.', Wed:'พ.', Thu:'พฤ.', Fri:'ศ.', Sat:'ส.', Sun:'อา.' };
    let quotas = '';
    if (stu?.courses?.length) {
      quotas = stu.courses.map(c => {
        const pct   = Math.round((c.used / c.hours) * 100);
        const color = c.left <= 2 ? 'error' : c.left <= 5 ? 'warning' : 'success';
        /* รอบเรียนต่อสัปดาห์ + ปุ่มปรับ (เคสเร่งก่อนสอบ) — มาจาก DB.enrollments จริง */
        const enr = (DB.enrollments||[]).find(e =>
          e.studentId === stu.id && e.courseId === c.courseId && e.status === 'active');
        let freq = '';
        if (enr && window.EnrollFreq) {
          const days  = EnrollFreq.daysOf(enr);
          const boost = enr.boost?.days?.length ? enr.boost : null;
          freq = `<div style="display:flex;align-items:center;gap:6px;margin-top:2px">
            <span class="text-muted" style="font-size:var(--fs-label-sm)">
              ${days.map(d=>DOW_TH[d]||d).join('+')} · สัปดาห์ละ ${days.length} ครั้ง</span>
            ${boost ? `<span class="badge badge-purple" style="font-size:9px">
              +${boost.days.map(d=>DOW_TH[d]||d).join('+')} ถึง ${CourseSched.fmtTH(boost.to)}</span>` : ''}
            <button class="btn btn-secondary btn-sm" style="margin-left:auto;padding:2px 8px"
              onclick="openFreqModal('${enr.id}')">${UI.icon('repeat','sm')} ปรับรอบ</button>
          </div>`;
        }
        return `<div style="margin-bottom:var(--sp-2)">
          <div style="display:flex;justify-content:space-between;
            font-size:var(--fs-body-sm);margin-bottom:var(--sp-1)">
            <strong>${c.name}</strong>
            <span class="text-muted">${c.used}/${c.hours}h ·
              <strong class="text-${color}">${c.left} left</strong></span>
          </div>
          ${UI.progress(pct, color)}
          ${freq}
        </div>`;
      }).join('');
    } else if (cust?.course) {
      const pct   = cust.total ? Math.round(((cust.total-(cust.remain||0))/cust.total)*100) : 0;
      const color = (cust.remain||0) <= 2 ? 'error' : 'success';
      quotas = `<div style="margin-bottom:var(--sp-2)">
        <div style="display:flex;justify-content:space-between;
          font-size:var(--fs-body-sm);margin-bottom:var(--sp-1)">
          <strong>${cust.course}</strong>
          <span class="text-${color}"><strong>${cust.remain||0} left</strong> / ${cust.total||0}</span>
        </div>
        ${UI.progress(pct, color)}
      </div>`;
    }

    let alert = '';
    if (stu?.status === 'renewal') {
      const minLeft  = Math.min(...stu.courses.map(c => c.left));
      const isUrgent = minLeft <= 1;
      alert = `
      <div style="display:flex;align-items:center;gap:var(--sp-3);padding:var(--sp-3);margin-top:var(--sp-3);
        background:var(--md-${isUrgent?'error':'warning'}-container);
        border:1px solid color-mix(in srgb, var(--md-${isUrgent?'error':'warning'}) 30%, transparent);
        border-radius:var(--shape-md)">
        ${UI.icon(isUrgent?'emergency':'warning', 'md')}
        <span style="font-size:var(--fs-body-sm);flex:1;
          color:var(--md-on-${isUrgent?'error':'warning'}-container)">
          <strong>${isUrgent?'URGENT:':'Notice:'}</strong>
          Only ${minLeft} class${minLeft===1?'':'es'} left — contact parent to renew.
        </span>
        <button class="btn btn-primary btn-sm" style="flex-shrink:0"
          onclick="openInboxFor('${stu.family}')">Contact Now</button>
      </div>`;
    }

    return `
    <div class="modal-section" style="padding-top:var(--sp-3)">
      ${UI.infoGrid([
        {label:'Phone',   value:phone},
        {label:'LINE',    value:line},
        {label:'Family',  value:`<span class="text-primary" style="cursor:pointer"
          onclick="showView('families')">${family}</span>`},
        {label:'Branch',  value:branch},
        {label:'Enrolled',value:since},
      ])}
      ${quotas ? `<div style="margin-top:var(--sp-4)">
        <div class="modal-section-title">Course Quota</div>${quotas}</div>` : ''}
      ${alert}
    </div>`;
  }

  /* ── TAB: SESSIONS ────────────────────────────────────── */
  function buildSessions(name) {
    const all      = DB.sessions.filter(s => s.studentNames.includes(name));
    const upcoming = all.filter(s => s.state !== 'ended').sort((a,b) => a.date.localeCompare(b.date));
    const past     = all.filter(s => s.state === 'ended').sort((a,b) => b.date.localeCompare(a.date)).slice(0,6);

    const stateIcon = s => s.state==='active'
      ? UI.icon('play_circle','sm')
      : s.state==='ended' ? UI.icon('check_circle','sm') : UI.icon('schedule','sm');

    const row = s => {
      const sh = CONST.SLOT_HOURS[s.slotId] || {};
      const dh = DB.dayHeaders.find(d => d.date === s.date);
      return `<tr>
        <td>${dh?.label||s.date}</td>
        <td class="text-muted">${sh.s||'—'}–${sh.e||'—'}</td>
        <td>${Utils.subjectLabel(s)}</td>
        <td>${s.teacher.replace(/Kru /g,'')}</td>
        <td>${s.room}</td>
        <td>${stateIcon(s)}</td>
      </tr>`;
    };
    const tbl = rows => `<table>
      <thead><tr><th>Date</th><th>Time</th><th>Subject</th><th>Teacher</th><th>Room</th><th></th></tr></thead>
      <tbody>${rows.map(row).join('')}</tbody></table>`;

    return `
    <div class="modal-section" style="padding-top:var(--sp-3)">
      <div class="modal-section-title">Upcoming Sessions (${upcoming.length})</div>
      ${upcoming.length ? tbl(upcoming) : UI.emptyState('schedule','No upcoming sessions','')}
    </div>
    ${past.length ? `<div class="modal-section">
      <div class="modal-section-title">Recent Past Sessions</div>${tbl(past)}
    </div>` : ''}`;
  }

  /* ── TAB: SUMMARIES ───────────────────────────────────────
     derived view — ดึงสดจาก session.summaries + DB.courseEndSummaries
     (ไม่เก็บซ้ำที่ student) ผ่าน Utils.summariesForStudent */
  function buildSummaries(name) {
    const { session, courseEnd } = Utils.summariesForStudent(name);

    const sumBadge = s => s.sent ? UI.badge('Sent','green')
      : s.submitted ? UI.badge('Awaiting','yellow')
      : s.text ? UI.badge('Draft','blue') : UI.badge('Not written','gray');

    const sessRow = s => `<tr>
      <td class="text-muted" style="white-space:nowrap">${s.date}</td>
      <td>${s.subject}</td>
      <td>${s.teacher.replace(/Kru /g,'')}</td>
      <td>${sumBadge(s)}</td>
      <td style="max-width:280px">${s.text
        ? s.text
        : '<span class="text-muted" style="opacity:.6">—</span>'}</td>
    </tr>`;

    const cesStatus = { draft:['Draft','gray'], pending_teacher:['Pending teacher','yellow'],
      approved:['Approved','blue'], sent:['Sent','green'] };
    const cesCard = c => {
      const [lbl,cl] = cesStatus[c.status] || [c.status,'gray'];
      return `<div class="card card-sm" style="margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
          <span style="font-weight:600;font-size:13px;flex:1">${c.courseName}</span>
          ${UI.badge(lbl,cl)}
        </div>
        <div class="text-muted" style="font-size:11px">
          ${UI.icon('person','sm')} ${c.teacher} · ${c.createdAt}
          ${c.courseType==='bundle'?' · '+UI.badge('Bundle','purple'):''}
        </div>
        ${(c.subjects||[]).map(sub=>`<div style="font-size:12px;margin-top:6px">
          <strong>${sub.subject} ${sub.grade}</strong> — ${sub.overall||''}</div>`).join('')}
      </div>`;
    };

    return `
    <div class="modal-section" style="padding-top:var(--sp-3)">
      <div class="modal-section-title">Session Summaries (${session.filter(s=>s.text).length})</div>
      ${session.length
        ? `<table><thead><tr><th>Date</th><th>Subject</th><th>Teacher</th><th>Status</th><th>Summary</th></tr></thead>
            <tbody>${session.map(sessRow).join('')}</tbody></table>`
        : UI.emptyState('edit_note','No session summaries yet','')}
    </div>
    <div class="modal-section">
      <div class="modal-section-title">Course End Summaries (${courseEnd.length})</div>
      ${courseEnd.length ? courseEnd.map(cesCard).join('')
        : UI.emptyState('workspace_premium','No course-end summaries yet','')}
    </div>`;
  }

  /* ── TAB: ATTENDANCE ──────────────────────────────────── */
  function buildAttendance(stu) {
    if (!stu?.attendance?.length) return `
    <div class="modal-section" style="padding-top:var(--sp-3)">
      ${UI.emptyState('fact_check','No attendance records','')}
    </div>`;

    const att = stu.attendance;
    const cnt = {};
    att.forEach(a => { cnt[a.status] = (cnt[a.status]||0)+1; });
    const AM = CONST.ATTENDANCE_META;

    return `
    <div class="modal-section" style="padding-top:var(--sp-3)">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--sp-2);margin-bottom:var(--sp-4)">
        ${[
          {label:'Present', v:cnt.present||0, color:'success'},
          {label:'Leave',   v:cnt.leave||0,   color:'warning'},
          {label:'Absent',  v:cnt.absent||0,  color:'error'},
          {label:'Total',   v:att.length,     color:''},
        ].map(x=>`<div class="card-outlined" style="text-align:center;padding:var(--sp-2)">
          <div style="font-size:var(--fs-headline-sm);font-weight:700;
            color:var(--md-${x.color||'primary'})">${x.v}</div>
          <div class="text-muted" style="font-size:var(--fs-label-sm)">${x.label}</div>
        </div>`).join('')}
      </div>
      <table>
        <thead><tr><th>Date</th><th>Course</th><th>Status</th><th>Note</th></tr></thead>
        <tbody>${att.map(a => {
          const am   = AM[a.status] || {};
          const note = a.status==='leave'
            ? `<span class="text-warning" style="font-size:var(--fs-label-sm)">No deduction</span>`
            : `<span class="text-${a.status==='absent'?'error':'success'}"
                style="font-size:var(--fs-label-sm)">Deducted</span>`;
          return `<tr>
            <td>${a.date}</td><td>${a.course}</td>
            <td>${UI.badge(am.label||a.status, (am.cls||'badge-gray').replace('badge-',''))}</td>
            <td>${note}</td></tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
  }

  /* ── TAB: PAYMENT ─────────────────────────────────────── */
  function buildPayment(stu, cust) {
    if (stu?.invoices?.length) {
      const totalPaid = stu.invoices.reduce((a,i)=>a+i.amount, 0);
      const totalH    = stu.courses.reduce((a,c)=>a+c.hours, 0);
      const usedH     = stu.courses.reduce((a,c)=>a+c.used,  0);
      const leftH     = stu.courses.reduce((a,c)=>a+c.left,  0);
      return `
      <div class="modal-section" style="padding-top:var(--sp-3)">
        ${UI.infoGrid([
          {label:'Total Paid',  value:`<strong>฿${totalPaid.toLocaleString()}</strong>`},
          {label:'Purchased',   value:`<strong>${totalH}h.</strong>`},
          {label:'Used',        value:`<strong>${usedH}h.</strong>`},
          {label:'Remaining',   value:`<strong class="${leftH<=2?'text-error':'text-success'}">${leftH}h.</strong>`},
        ])}
        <div class="modal-section-title" style="margin-top:var(--sp-4)">Invoice History</div>
        <table>
          <thead><tr><th>Invoice</th><th>Date</th><th>Course</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>${stu.invoices.map(inv=>`<tr>
            <td class="text-primary" style="font-size:var(--fs-label-sm)">${inv.id}</td>
            <td>${inv.date}</td><td>${inv.course}</td>
            <td>฿${inv.amount.toLocaleString()}</td>
            <td>${UI.badge('Paid','green')}</td>
          </tr>`).join('')}</tbody>
        </table>
        <div style="margin-top:var(--sp-3);text-align:right">
          <button class="btn btn-primary btn-sm"
            onclick="openNewInvoice('${stu?.id||''}')">
            ${UI.icon('add','sm')} New Invoice</button>
        </div>
      </div>`;
    }
    return `
    <div class="modal-section" style="padding-top:var(--sp-3)">
      ${UI.infoGrid([
        {label:'Package',   value:cust?.pkg||'—'},
        {label:'Revenue',   value:`<strong>฿${(cust?.revenue||0).toLocaleString()}</strong>`},
        {label:'Remaining', value:`<strong class="${(cust?.remain||0)<=2?'text-error':'text-success'}">${cust?.remain||'—'} sessions</strong>`},
        {label:'Until',     value:cust?.until||'—'},
      ])}
    </div>`;
  }

  /* ── TAB: NOTES ───────────────────────────────────────── */
  function buildNotes(stu, modalId) {
    const notes = stu?.notes || [];
    return `
    <div class="modal-section" style="padding-top:var(--sp-3)">
      ${notes.length === 0 ? UI.emptyState('edit_note','No notes yet','')
        : notes.map(n => `
        <div style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-3)">
          ${UI.avatar((n.author||'?')[0], 'sm', avColor(n.author||'?'))}
          <div style="flex:1;background:var(--md-surface-low);border-radius:var(--shape-sm);
            padding:var(--sp-2) var(--sp-3);border:1px solid var(--md-outline-variant)">
            <div class="text-muted" style="font-size:var(--fs-label-sm);margin-bottom:4px">
              ${UI.badge(n.type==='teacher'?'Teacher Note':'Admin Note', n.type==='teacher'?'blue':'gray')}
              ${n.author} · ${n.date}
            </div>
            <div style="font-size:var(--fs-body-sm);color:var(--md-on-surface)">${n.text}</div>
          </div>
        </div>`).join('')}
      <div style="margin-top:var(--sp-2)">
        <textarea id="pnote-${modalId}" class="form-input" placeholder="Add a note…" rows="2"
          style="width:100%;resize:none"></textarea>
        <div style="text-align:right;margin-top:var(--sp-2)">
          <button class="btn btn-primary btn-sm"
            onclick="saveProfileNote('${stu?.id||''}','${modalId}')">
            ${UI.icon('save','sm')} Save Note</button>
        </div>
      </div>
    </div>`;
  }

  /* ── TAB: TIMELINE ────────────────────────────────────── */
  function buildTimeline(stu, name) {
    return `
    <div class="modal-section" style="padding-top:var(--sp-3);padding-left:0;padding-right:0">
      <div style="padding:0 16px var(--sp-2)">
        <div class="modal-section-title">Activity Timeline</div>
        <div class="text-muted" style="font-size:var(--fs-label-sm)">All events · newest first</div>
      </div>
      <div style="max-height:420px;overflow-y:auto">
        ${Timeline.build(Timeline.fromStudent(stu, name))}
      </div>
    </div>`;
  }

  /* ── OPEN MODAL ───────────────────────────────────────── */
  window.openProfileModal = function (identifier) {
    const { stu, cust, name } = resolve(identifier);
    const mid = `profile-${(name||'x').replace(/[\s']/g,'-').toLowerCase()}`;

    const tabs = [
      ['overview',   'person',       'Overview'],
      ['sessions',   'calendar_month','Sessions'],
      ['summaries',  'edit_note',    'Summaries'],
      ['attendance', 'fact_check',   'Attendance'],
      ['payment',    'credit_card',  'Payment'],
      ['notes',      'edit_note',    'Notes'],
      ['timeline',   'history',      'Timeline'],
    ];

    const body = `
      ${buildHeader(stu, cust, name)}
      <div class="tabs" style="margin-bottom:0;margin-top:var(--sp-2)">
        ${tabs.map(([id,icon,lbl],i) =>
          `<div class="tab ${i===0?'active':''}" onclick="profileTab('${id}',this)">
            ${UI.icon(icon,'sm')} ${lbl}</div>`
        ).join('')}
      </div>
      <div style="height:420px;overflow-y:auto;border-top:1px solid var(--md-outline-variant)">
        <div id="ptab-overview">  ${buildOverview(stu, cust)}</div>
        <div id="ptab-sessions"   style="display:none">${buildSessions(name)}</div>
        <div id="ptab-summaries"  style="display:none">${buildSummaries(name)}</div>
        <div id="ptab-attendance" style="display:none">${buildAttendance(stu)}</div>
        <div id="ptab-payment"    style="display:none">${buildPayment(stu, cust)}</div>
        <div id="ptab-notes"      style="display:none">${buildNotes(stu, mid)}</div>
        <div id="ptab-timeline"   style="display:none">${buildTimeline(stu, name)}</div>
      </div>`;

    const family = stu?.family || cust?.family || name;
    Modal.create(`modal-${mid}`, `${UI.icon('person')} Student Profile`, body,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-${mid}')">Close</button>
       <button class="btn btn-secondary"
         onclick="openInboxFor('${family}');Modal.close('modal-${mid}')">
         ${UI.icon('chat','sm')} Chat</button>
       <button class="btn btn-primary"
         onclick="openNewInvoice('${stu?.id||''}')">
         ${UI.icon('autorenew','sm')} Renew</button>`,
      'modal-xl');
  };

  /* ── BACKWARD COMPAT ──────────────────────────────────── */
  window.openStudentModal  = id   => window.openProfileModal(id);
  window.openCustomerModal = name => window.openProfileModal(name);

  /* ── TAB SWITCH ───────────────────────────────────────── */
  window.profileTab = function (tab, el) {
    const modal = el.closest('.modal');
    if (!modal) return;
    modal.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    ['overview','sessions','summaries','attendance','payment','notes','timeline'].forEach(t => {
      const p = modal.querySelector(`#ptab-${t}`);
      if (p) p.style.display = t === tab ? '' : 'none';
    });
  };

  /* ── SAVE NOTE ────────────────────────────────────────── */
  window.saveProfileNote = function (stuId, mid) {
    const ta = document.getElementById(`pnote-${mid}`);
    if (!ta || !ta.value.trim()) return;
    const s = DB.students.find(x => x.id === stuId);
    if (s) s.notes.push({ type:'admin', text:ta.value.trim(), author:'Admin Nock', date:'Now' });
    showToast('Note saved ✓', 'success');
    Modal.close(`modal-${mid}`);
    window.openProfileModal(stuId || mid.replace('profile-',''));
  };

})();
