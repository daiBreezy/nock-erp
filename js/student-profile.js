/* ============================================================
   student-profile.js — Unified Student / Customer Profile Modal
   Replaces: openStudentModal (students.js) + openCustomerModal (crm.js)
   Call from anywhere: openProfileModal(id_or_name)
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

  /* ── AVATAR ───────────────────────────────────────────── */
  const AV_COLORS = ['#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316'];
  function avColor(n) {
    let h = 0;
    for (let i = 0; i < (n||'').length; i++) h = (h*31 + n.charCodeAt(i)) & 0xffff;
    return AV_COLORS[h % AV_COLORS.length];
  }
  function avatar(name, size = 48) {
    const fs = Math.round(size * 0.38);
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;
      background:${avColor(name)};color:#fff;font-size:${fs}px;font-weight:700;
      display:flex;align-items:center;justify-content:center;flex-shrink:0">
      ${(name||'?')[0].toUpperCase()}</div>`;
  }

  /* ── PROFILE HEADER ───────────────────────────────────── */
  function buildHeader(stu, cust, name) {
    const sm      = stu ? CONST.STUDENT_STATUS[stu.status] : null;
    const badge   = sm  ? `<span class="badge ${sm.cls}">${sm.label}</span>`
                        : (cust?.status ? `<span class="badge badge-blue">${cust.status}</span>` : '');
    const branch  = stu?.branch   || cust?.branch  || '—';
    const teacher = stu?.teacher  || cust?.teacher || '—';
    const family  = stu?.family   || cust?.family  || name;
    const phone   = stu?.phone    || cust?.phone   || '';
    const ageLine = stu?.age ? `Age ${stu.age} · ` : '';

    return `
    <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;
                background:linear-gradient(135deg,#f5f3ff 0%,#ede9fe 100%);
                border-radius:10px;margin-bottom:4px">
      ${avatar(name, 52)}
      <div style="flex:1;min-width:0">
        <div style="font-size:18px;font-weight:700;color:#1a1d23">${name}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px">${ageLine}${branch}</div>
        <div style="margin-top:6px;display:flex;gap:5px;flex-wrap:wrap">
          ${badge}
          <span style="font-size:10px;background:#dbeafe;color:#1d4ed8;border-radius:10px;
                        padding:1px 8px;font-weight:500">👩‍🏫 ${teacher}</span>
        </div>
      </div>
      <div style="display:flex;flex-direction:row;gap:6px;align-items:center;flex-shrink:0">
        <button class="btn btn-secondary btn-sm" onclick="openInboxFor('${family}')">💬 Chat</button>
        ${phone ? `<button class="btn btn-secondary btn-sm" onclick="showToast('Calling ${phone}…','info')">📞 Call</button>` : ''}
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

    /* Course quota bars */
    let quotas = '';
    if (stu?.courses?.length) {
      quotas = stu.courses.map(c => {
        const pct   = Math.round((c.used / c.hours) * 100);
        const color = c.left <= 2 ? '#ef4444' : c.left <= 5 ? '#f59e0b' : '#10b981';
        return `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
            <strong>${c.name}</strong>
            <span>${c.used}/${c.hours}h · <strong style="color:${color}">${c.left} left</strong></span>
          </div>
          <div style="background:#f3f4f6;border-radius:4px;height:7px">
            <div style="background:${color};width:${pct}%;height:7px;border-radius:4px;transition:width .4s"></div>
          </div>
        </div>`;
      }).join('');
    } else if (cust?.course) {
      const pct   = cust.total ? Math.round(((cust.total-(cust.remain||0))/cust.total)*100) : 0;
      const color = (cust.remain||0) <= 2 ? '#ef4444' : '#10b981';
      quotas = `
      <div style="margin-bottom:10px">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
          <strong>${cust.course}</strong>
          <span><strong style="color:${color}">${cust.remain||0} left</strong> / ${cust.total||0}</span>
        </div>
        <div style="background:#f3f4f6;border-radius:4px;height:7px">
          <div style="background:${color};width:${pct}%;height:7px;border-radius:4px"></div>
        </div>
      </div>`;
    }

    /* Renewal alert */
    let alert = '';
    if (stu && stu.status === 'renewal') {
      const minLeft  = Math.min(...stu.courses.map(c => c.left));
      const isUrgent = minLeft <= 1;
      alert = `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 14px;margin-top:12px;
        background:${isUrgent?'#fef2f2':'#fffbeb'};
        border:1px solid ${isUrgent?'#fecaca':'#fde68a'};border-radius:8px">
        <span style="font-size:16px;flex-shrink:0">${isUrgent?'🚨':'⚠️'}</span>
        <span style="font-size:12px;flex:1;color:${isUrgent?'#991b1b':'#92400e'}">
          <strong>${isUrgent?'URGENT:':'Notice:'}</strong>
          Only ${minLeft} class${minLeft===1?'':'es'} left — contact parent to renew.
        </span>
        <button class="btn btn-sm btn-primary" style="flex-shrink:0"
                onclick="openInboxFor('${stu.family}')">Contact Now</button>
      </div>`;
    }

    return `
    <div class="modal-section" style="padding-top:12px">
      <div class="info-grid">
        <div class="info-item"><div class="label">Phone</div>${phone}</div>
        <div class="info-item"><div class="label">LINE</div>${line}</div>
        <div class="info-item"><div class="label">Family</div>
          <span style="color:#6366f1;cursor:pointer" onclick="showView('families')">${family}</span>
        </div>
        <div class="info-item"><div class="label">Branch</div>${branch}</div>
        <div class="info-item"><div class="label">Enrolled</div>${since}</div>
      </div>
      ${quotas ? `<div style="margin-top:14px"><div class="modal-section-title">Course Quota</div>${quotas}</div>` : ''}
      ${alert}
    </div>`;
  }

  /* ── TAB: SESSIONS (live from DB) ─────────────────────── */
  function buildSessions(name) {
    const all      = DB.sessions.filter(s => s.studentNames.includes(name));
    const upcoming = all.filter(s => s.state !== 'ended').sort((a,b) => a.date.localeCompare(b.date));
    const past     = all.filter(s => s.state === 'ended').sort((a,b) => b.date.localeCompare(a.date)).slice(0,6);

    const row = s => {
      const sh = CONST.SLOT_HOURS[s.slotId] || {};
      const dh = DB.dayHeaders.find(d => d.date === s.date);
      const dot = s.state==='active'?'🟢':s.state==='ended'?'✅':'📅';
      return `<tr>
        <td>${dh?.label||s.date}</td>
        <td style="font-size:11px">${sh.s||'—'}–${sh.e||'—'}</td>
        <td>${Utils.subjectLabel(s)}</td>
        <td style="font-size:11px">${s.teacher.replace(/Kru /g,'')}</td>
        <td>${s.room}</td>
        <td>${dot}</td>
      </tr>`;
    };

    const table = rows => `<div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Time</th><th>Subject</th><th>Teacher</th><th>Room</th><th></th></tr></thead>
      <tbody>${rows.map(row).join('')}</tbody>
    </table></div>`;

    return `
    <div class="modal-section" style="padding-top:12px">
      <div class="modal-section-title">Upcoming Sessions (${upcoming.length})</div>
      ${upcoming.length ? table(upcoming) : '<div style="color:#9ca3af;font-size:13px;padding:8px 0">No upcoming sessions</div>'}
    </div>
    ${past.length ? `
    <div class="modal-section">
      <div class="modal-section-title">Recent Past Sessions</div>
      ${table(past)}
    </div>` : ''}`;
  }

  /* ── TAB: ATTENDANCE ──────────────────────────────────── */
  function buildAttendance(stu) {
    if (!stu?.attendance?.length) return `
    <div class="modal-section" style="padding-top:12px">
      <div style="color:#9ca3af;font-size:13px;padding:8px 0">No attendance records</div>
    </div>`;

    const att = stu.attendance;
    const cnt = {};
    att.forEach(a => { cnt[a.status] = (cnt[a.status]||0)+1; });
    const AM = CONST.ATTENDANCE_META;

    const statCard = (lbl, val, color, bg, border) =>
      `<div style="flex:1;background:${bg};border:1px solid ${border};border-radius:8px;padding:10px;text-align:center">
        <div style="font-size:20px;font-weight:700;color:${color}">${val}</div>
        <div style="font-size:11px;color:#6b7280">${lbl}</div>
      </div>`;

    return `
    <div class="modal-section" style="padding-top:12px">
      <div style="display:flex;gap:10px;margin-bottom:14px">
        ${statCard('Present', cnt.present||0, '#10b981','#f0fdf4','#bbf7d0')}
        ${statCard('Leave',   cnt.leave||0,   '#f59e0b','#fffbeb','#fde68a')}
        ${statCard('Absent',  cnt.absent||0,  '#ef4444','#fef2f2','#fecaca')}
        ${statCard('Total',   att.length,     '#6366f1','#f5f3ff','#ddd6fe')}
      </div>
      <div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>Course</th><th>Status</th><th>Note</th></tr></thead>
        <tbody>
          ${att.map(a => {
            const am   = AM[a.status] || {};
            const note = a.status==='leave' ? '<span style="color:#f59e0b;font-size:11px">No deduction</span>'
                       : '<span style="color:' + (a.status==='absent'?'#ef4444':'#10b981') + ';font-size:11px">Deducted</span>';
            return `<tr>
              <td>${a.date}</td><td>${a.course}</td>
              <td><span class="badge ${am.cls||''}">${am.label||a.status}</span></td>
              <td>${note}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>
    </div>`;
  }

  /* ── TAB: PAYMENT ─────────────────────────────────────── */
  function buildPayment(stu, cust) {
    if (stu?.invoices?.length) {
      const totalPaid  = stu.invoices.reduce((a,i) => a+i.amount, 0);
      const totalH     = stu.courses.reduce((a,c) => a+c.hours, 0);
      const usedH      = stu.courses.reduce((a,c) => a+c.used,  0);
      const leftH      = stu.courses.reduce((a,c) => a+c.left,  0);
      return `
      <div class="modal-section" style="padding-top:12px">
        <div class="info-grid" style="margin-bottom:14px">
          <div class="info-item"><div class="label">Total Paid</div><strong>฿${totalPaid.toLocaleString()}</strong></div>
          <div class="info-item"><div class="label">Purchased</div><strong>${totalH}h.</strong></div>
          <div class="info-item"><div class="label">Used</div><strong>${usedH}h.</strong></div>
          <div class="info-item"><div class="label">Remaining</div>
            <strong style="color:${leftH<=2?'#ef4444':'#10b981'}">${leftH}h.</strong></div>
        </div>
        <div class="modal-section-title">Invoice History</div>
        <div class="table-wrap"><table>
          <thead><tr><th>Invoice</th><th>Date</th><th>Course</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            ${stu.invoices.map(inv=>`<tr>
              <td style="font-size:11px;color:#6366f1">${inv.id}</td>
              <td>${inv.date}</td><td style="font-size:12px">${inv.course}</td>
              <td>฿${inv.amount.toLocaleString()}</td>
              <td><span class="badge badge-green">Paid</span></td>
            </tr>`).join('')}
          </tbody>
        </table></div>
        <div style="margin-top:12px;text-align:right">
          <button class="btn btn-primary btn-sm" onclick="showToast('Renewal invoice coming soon','info')">＋ New Invoice</button>
        </div>
      </div>`;
    }
    return `
    <div class="modal-section" style="padding-top:12px">
      <div class="info-grid">
        <div class="info-item"><div class="label">Package</div>${cust?.pkg||'—'}</div>
        <div class="info-item"><div class="label">Revenue</div><strong>฿${(cust?.revenue||0).toLocaleString()}</strong></div>
        <div class="info-item"><div class="label">Remaining</div>
          <strong style="color:${(cust?.remain||0)<=2?'#ef4444':'#10b981'}">${cust?.remain||'—'} sessions</strong></div>
        <div class="info-item"><div class="label">Until</div>${cust?.until||'—'}</div>
      </div>
    </div>`;
  }

  /* ── TAB: NOTES ───────────────────────────────────────── */
  function buildNotes(stu, modalId) {
    const notes = stu?.notes || [];
    return `
    <div class="modal-section" style="padding-top:12px">
      ${notes.length === 0
        ? '<div style="color:#9ca3af;font-size:13px;padding:8px 0">No notes yet</div>'
        : notes.map(n => `
          <div style="display:flex;gap:10px;margin-bottom:12px">
            <div class="avatar" style="width:30px;height:30px;font-size:11px;flex-shrink:0">${(n.author||'?')[0]}</div>
            <div style="flex:1;background:#f9fafb;border-radius:8px;padding:10px;border:1px solid #f3f4f6">
              <div style="font-size:11px;color:#9ca3af;margin-bottom:4px">
                <span class="badge ${n.type==='teacher'?'badge-blue':'badge-gray'}" style="font-size:10px">
                  ${n.type==='teacher'?'Teacher':'Admin'} Note
                </span>
                ${n.author} · ${n.date}
              </div>
              <div style="font-size:13px;color:#374151">${n.text}</div>
            </div>
          </div>`).join('')}
      <div style="margin-top:10px">
        <textarea id="pnote-${modalId}" placeholder="Add a note…" rows="2"
          style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:8px;
                 font-size:12px;resize:none;outline:none;box-sizing:border-box"></textarea>
        <div style="text-align:right;margin-top:6px">
          <button class="btn btn-primary btn-sm" onclick="saveProfileNote('${stu?.id||''}','${modalId}')">Save Note</button>
        </div>
      </div>
    </div>`;
  }

  /* ── TAB: TIMELINE ───────────────────────────────────── */
  function buildTimeline(stu, name) {
    const events = Timeline.fromStudent(stu, name);
    return `
    <div class="modal-section" style="padding-top:12px;padding-left:0;padding-right:0">
      <div style="padding:0 16px 8px">
        <div class="modal-section-title">Activity Timeline</div>
        <div style="font-size:11px;color:#9ca3af">All events · newest first</div>
      </div>
      <div style="max-height:420px;overflow-y:auto">
        ${Timeline.build(events)}
      </div>
    </div>`;
  }

  /* ── OPEN MODAL ───────────────────────────────────────── */
  window.openProfileModal = function (identifier) {
    const { stu, cust, name } = resolve(identifier);
    const mid = `profile-${(name||'x').replace(/[\s']/g,'-').toLowerCase()}`;

    const tabs = [
      ['overview',   '📋 Overview'],
      ['sessions',   '📅 Sessions'],
      ['attendance', '✅ Attendance'],
      ['payment',    '💰 Payment'],
      ['notes',      '📝 Notes'],
      ['timeline',   '⏱️ Timeline'],
    ];

    const body = `
      ${buildHeader(stu, cust, name)}
      <div class="tabs" style="margin-bottom:0;margin-top:10px">
        ${tabs.map(([id,lbl],i) =>
          `<div class="tab ${i===0?'active':''}" onclick="profileTab('${id}',this)">${lbl}</div>`
        ).join('')}
      </div>
      <div style="height:420px;overflow-y:auto;border-top:1px solid #f3f4f6">
        <div id="ptab-overview">  ${buildOverview(stu, cust)}</div>
        <div id="ptab-sessions"   style="display:none">${buildSessions(name)}</div>
        <div id="ptab-attendance" style="display:none">${buildAttendance(stu)}</div>
        <div id="ptab-payment"    style="display:none">${buildPayment(stu, cust)}</div>
        <div id="ptab-notes"      style="display:none">${buildNotes(stu, mid)}</div>
        <div id="ptab-timeline"   style="display:none">${buildTimeline(stu, name)}</div>
      </div>`;

    const family = stu?.family || cust?.family || name;
    Modal.create(`modal-${mid}`, `👤 Student Profile`, body,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-${mid}')">Close</button>
       <button class="btn btn-secondary" onclick="openInboxFor('${family}');Modal.close('modal-${mid}')">💬 Chat</button>
       <button class="btn btn-primary" onclick="showToast('Renewal flow coming soon','info')">🔄 Renew</button>`,
      'modal-xl');
  };

  /* ── BACKWARD COMPAT — redirect all old callers ───────── */
  window.openStudentModal  = id   => window.openProfileModal(id);
  window.openCustomerModal = name => window.openProfileModal(name);

  /* ── TAB SWITCH ───────────────────────────────────────── */
  window.profileTab = function (tab, el) {
    const modal = el.closest('.modal');
    if (!modal) return;
    modal.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    ['overview','sessions','attendance','payment','notes','timeline'].forEach(t => {
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
