/* ============================================================
   students.js — Students Module: List + Rich Student Modal
   ============================================================ */
(function () {

  /* ── DATA (from global DB) ────────────────────────────── */
  const students   = DB.students;
  const STATUS_META = CONST.STUDENT_STATUS;
  const ATT_META    = CONST.ATTENDANCE_META;

  let sortCol = 'name', sortAsc = true, filterStatus = 'all', searchVal = '';

  /* ── SHELL HTML ───────────────────────────────────────── */
  document.getElementById('view-students').innerHTML = `
  <div class="page-header">
    <div><div class="page-title">Students</div><div class="page-sub">5 active students</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-secondary btn-sm">Export</button>
      <button class="btn btn-primary btn-sm" onclick="showToast('Add student coming soon','info')">＋ Add Student</button>
    </div>
  </div>

  <!-- FILTER BAR -->
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
    <input type="text" id="stu-search" placeholder="Search name, course, branch…"
      style="border:1px solid #e5e7eb;border-radius:6px;padding:6px 10px;font-size:13px;outline:none;width:220px"
      oninput="stuSearch(this.value)">
    <div style="display:flex;gap:4px">
      ${['all','active','renewal','urgent','inactive'].map(s =>
        `<div class="filter-chip ${s==='all'?'active':''}" style="font-size:11px;padding:3px 10px"
          onclick="stuFilter('${s}',this)">${s==='all'?'All':STATUS_META[s]?.label||s}</div>`
      ).join('')}
    </div>
    <select id="stu-branch-filter" onchange="stuBranchFilter(this.value)"
      style="border:1px solid #e5e7eb;border-radius:6px;padding:5px 8px;font-size:12px;outline:none;color:#374151;margin-left:auto">
      <option value="">All Branches</option>
      <option>Sukhumvit</option>
      <option>Silom</option>
    </select>
  </div>

  <!-- STUDENT TABLE -->
  <div class="card" style="padding:0;overflow:hidden">
    <div class="table-wrap">
      <table id="stu-table">
        <thead>
          <tr>
            <th onclick="stuSort('name')"  style="cursor:pointer">Student <span id="sort-name"></span></th>
            <th onclick="stuSort('age')"   style="cursor:pointer">Age <span id="sort-age"></span></th>
            <th>Branch</th>
            <th>Course(s)</th>
            <th onclick="stuSort('left')"  style="cursor:pointer">Classes Left <span id="sort-left"></span></th>
            <th>Teacher</th>
            <th onclick="stuSort('status')" style="cursor:pointer">Status <span id="sort-status"></span></th>
            <th></th>
          </tr>
        </thead>
        <tbody id="stu-tbody"></tbody>
      </table>
    </div>
  </div>`;

  /* ── BUILD TABLE ──────────────────────────────────────── */
  function buildTable() {
    let list = students.filter(s => {
      const matchStatus = filterStatus === 'all' || s.status === filterStatus;
      const matchBranch = !stuBranchVal || s.branch === stuBranchVal;
      const q = searchVal.toLowerCase();
      const matchSearch = !q ||
        s.name.toLowerCase().includes(q) ||
        s.branch.toLowerCase().includes(q) ||
        s.courses.some(c => c.name.toLowerCase().includes(q)) ||
        s.teacher.toLowerCase().includes(q);
      return matchStatus && matchBranch && matchSearch;
    });

    list.sort((a, b) => {
      let av, bv;
      if (sortCol === 'name')   { av = a.name;   bv = b.name; }
      if (sortCol === 'age')    { av = a.age;     bv = b.age; }
      if (sortCol === 'left')   { av = Math.min(...a.courses.map(c=>c.left)); bv = Math.min(...b.courses.map(c=>c.left)); }
      if (sortCol === 'status') { av = a.status;  bv = b.status; }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ?  1 : -1;
      return 0;
    });

    document.getElementById('stu-tbody').innerHTML = list.map(s => {
      const sm = STATUS_META[s.status];
      const minLeft = Math.min(...s.courses.map(c => c.left));
      const leftCls = minLeft <= 1 ? 'badge-red' : minLeft <= 2 ? 'badge-yellow' : 'badge-green';
      const courseStr = s.courses.map(c => `[${c.name}:${c.hours}h.]`).join(' ');
      return `<tr>
        <td><strong style="cursor:pointer;color:#6366f1" onclick="openStudentModal('${s.id}')">${s.name}</strong></td>
        <td>${s.age}</td>
        <td>${s.branch}</td>
        <td style="font-size:12px">${courseStr}</td>
        <td><span class="badge ${leftCls}">${minLeft} left</span></td>
        <td style="font-size:12px">${s.teacher}</td>
        <td><span class="badge ${sm.cls}">${sm.label}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openStudentModal('${s.id}')">View</button>
          <button class="chat-btn" onclick="openInboxFor('${s.family}')" title="Message family">💬</button>
        </td>
      </tr>`;
    }).join('');

    // Update sort indicators
    ['name','age','left','status'].forEach(col => {
      const el = document.getElementById(`sort-${col}`);
      if (el) el.textContent = sortCol === col ? (sortAsc ? ' ↑' : ' ↓') : '';
    });
  }

  let stuBranchVal = '';
  buildTable();

  /* ── FILTER / SORT HANDLERS ───────────────────────────── */
  window.stuSearch = function(v) { searchVal = v; buildTable(); };
  window.stuBranchFilter = function(v) { stuBranchVal = v; buildTable(); };
  window.stuFilter = function(mode, el) {
    filterStatus = mode;
    document.querySelectorAll('#view-students .filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    buildTable();
  };
  window.stuSort = function(col) {
    if (sortCol === col) sortAsc = !sortAsc; else { sortCol = col; sortAsc = true; }
    buildTable();
  };

  /* ── STUDENT MODAL ────────────────────────────────────── */
  window.openStudentModal = function(id) {
    const s = students.find(x => x.id === id);
    if (!s) return;
    const sm = STATUS_META[s.status];

    const totalClasses = s.courses.reduce((a,c) => a+c.hours, 0);
    const usedClasses  = s.courses.reduce((a,c) => a+c.used,  0);
    const leftClasses  = s.courses.reduce((a,c) => a+c.left,  0);
    const totalPaid    = s.invoices.reduce((a,i) => a+i.amount, 0);

    // Attendance stats
    const attCounts = { present:0, leave:0, absent:0 };
    s.attendance.forEach(a => { attCounts[a.status] = (attCounts[a.status]||0)+1; });
    const attTotal = s.attendance.length;

    const body = `
    <!-- PROFILE HEADER -->
    <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;background:#f9fafb;border-radius:8px;margin-bottom:16px">
      <div class="avatar" style="width:52px;height:52px;font-size:20px;flex-shrink:0">${s.name[0]}</div>
      <div style="flex:1">
        <div style="font-size:17px;font-weight:700;color:#1a1d23">${s.name}</div>
        <div style="font-size:12px;color:#6b7280">Age ${s.age} · ${s.branch} ·
          <span style="cursor:pointer;color:#6366f1" onclick="showView('families')">${s.family}</span>
        </div>
        <div style="margin-top:4px"><span class="badge ${sm.cls}">${sm.label}</span></div>
      </div>
      <div style="text-align:right;font-size:12px;color:#6b7280">
        <div>Enrolled: ${s.enrollDate}</div>
        <div>Teacher: ${s.teacher}</div>
        <div style="margin-top:6px;display:flex;gap:6px;justify-content:flex-end">
          <button class="btn btn-secondary btn-sm" onclick="openInboxFor('${s.family}')">💬 Message</button>
          <button class="btn btn-secondary btn-sm" onclick="showToast('Calling ${s.phone}…','info')">📞 Call</button>
        </div>
      </div>
    </div>

    <!-- TABS -->
    <div class="tabs" style="margin-bottom:0">
      <div class="tab active" onclick="stuTab('overview',this)">📋 Overview</div>
      <div class="tab"        onclick="stuTab('schedule',this)">📅 Schedule</div>
      <div class="tab"        onclick="stuTab('attendance',this)">✅ Attendance</div>
      <div class="tab"        onclick="stuTab('payment',this)">💰 Payment</div>
      <div class="tab"        onclick="stuTab('notes',this)">📝 Notes</div>
    </div>

    <!-- TAB: OVERVIEW -->
    <div id="stab-overview" class="modal-section" style="padding-top:12px">
      <div class="info-grid">
        <div class="info-item"><div class="label">LINE ID</div>${s.line||'—'}</div>
        <div class="info-item"><div class="label">Phone</div>${s.phone}</div>
        <div class="info-item"><div class="label">Branch</div>${s.branch}</div>
        <div class="info-item"><div class="label">Enroll Date</div>${s.enrollDate}</div>
      </div>
      <div style="margin-top:14px">
        <div class="modal-section-title">Course Quota</div>
        ${s.courses.map(c => {
          const pct = Math.round((c.used/c.hours)*100);
          const barCls = c.left <= 2 ? '#ef4444' : c.left <= 5 ? '#f59e0b' : '#10b981';
          return `<div style="margin-bottom:10px">
            <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
              <strong>${c.name}</strong>
              <span>${c.used}/${c.hours}h used · <strong style="color:${barCls}">${c.left} left</strong></span>
            </div>
            <div style="background:#f3f4f6;border-radius:4px;height:6px">
              <div style="background:${barCls};width:${pct}%;height:6px;border-radius:4px"></div>
            </div>
          </div>`;
        }).join('')}
      </div>
      ${s.status === 'urgent' || s.status === 'renewal' ? `
      <div class="alert-item alert-bar ${s.status==='urgent'?'danger':'warning'}" style="margin-top:12px">
        ${s.status==='urgent' ? '🚨' : '⚠️'}
        <span><strong>${s.status==='urgent'?'URGENT:':'Notice:'}</strong>
        Only ${leftClasses} class${leftClasses===1?'':'es'} remaining — contact parent to renew.</span>
        <button class="btn btn-sm btn-primary" style="margin-left:auto" onclick="openInboxFor('${s.family}')">Contact Now</button>
      </div>` : ''}
    </div>

    <!-- TAB: SCHEDULE -->
    <div id="stab-schedule" class="modal-section" style="display:none;padding-top:12px">
      <div class="modal-section-title">Upcoming Sessions</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Time</th><th>Course</th><th>Room</th><th>Teacher</th></tr></thead>
          <tbody>
            ${s.schedule.map(sc => `<tr>
              <td>${sc.date}</td><td>${sc.time}</td>
              <td>${s.courses[0]?.name||''}</td>
              <td>${sc.room}</td><td>${sc.teacher}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB: ATTENDANCE -->
    <div id="stab-attendance" class="modal-section" style="display:none;padding-top:12px">
      <div style="display:flex;gap:12px;margin-bottom:14px">
        <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:20px;font-weight:700;color:#10b981">${attCounts.present||0}</div>
          <div style="font-size:11px;color:#6b7280">Present</div>
        </div>
        <div style="flex:1;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:20px;font-weight:700;color:#f59e0b">${attCounts.leave||0}</div>
          <div style="font-size:11px;color:#6b7280">Leave</div>
        </div>
        <div style="flex:1;background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:20px;font-weight:700;color:#ef4444">${attCounts.absent||0}</div>
          <div style="font-size:11px;color:#6b7280">Absent</div>
        </div>
        <div style="flex:1;background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:20px;font-weight:700;color:#6366f1">${attTotal}</div>
          <div style="font-size:11px;color:#6b7280">Total</div>
        </div>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Course</th><th>Status</th><th>Note</th></tr></thead>
          <tbody>
            ${s.attendance.map(a => {
              const am = ATT_META[a.status];
              const note = a.status==='absent' ? '<span style="color:#ef4444;font-size:11px">Deducted</span>'
                         : a.status==='leave'  ? '<span style="color:#f59e0b;font-size:11px">No deduction</span>'
                         : '<span style="color:#10b981;font-size:11px">Deducted</span>';
              return `<tr>
                <td>${a.date}</td>
                <td>${a.course}</td>
                <td><span class="badge ${am.cls}">${am.label}</span></td>
                <td>${note}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB: PAYMENT -->
    <div id="stab-payment" class="modal-section" style="display:none;padding-top:12px">
      <div class="info-grid" style="margin-bottom:14px">
        <div class="info-item"><div class="label">Total Paid</div><strong>฿${totalPaid.toLocaleString()}</strong></div>
        <div class="info-item"><div class="label">Classes Purchased</div><strong>${totalClasses}h.</strong></div>
        <div class="info-item"><div class="label">Classes Used</div><strong>${usedClasses}h.</strong></div>
        <div class="info-item"><div class="label">Classes Remaining</div>
          <strong style="color:${leftClasses<=2?'#ef4444':'#10b981'}">${leftClasses}h.</strong>
        </div>
      </div>
      <div class="modal-section-title">Invoice History</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Invoice</th><th>Date</th><th>Course</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            ${s.invoices.map(inv => `<tr>
              <td style="font-size:11px;color:#6366f1">${inv.id}</td>
              <td>${inv.date}</td>
              <td style="font-size:12px">${inv.course}</td>
              <td>฿${inv.amount.toLocaleString()}</td>
              <td><span class="badge badge-green">Paid</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div style="margin-top:12px;text-align:right">
        <button class="btn btn-primary btn-sm" onclick="showToast('Renewal invoice coming soon','info')">＋ New Invoice</button>
      </div>
    </div>

    <!-- TAB: NOTES -->
    <div id="stab-notes" class="modal-section" style="display:none;padding-top:12px">
      ${s.notes.map(n => `
      <div style="display:flex;gap:10px;margin-bottom:12px">
        <div class="avatar" style="width:30px;height:30px;font-size:11px;flex-shrink:0">${n.author[0]}</div>
        <div style="flex:1;background:#f9fafb;border-radius:8px;padding:10px;border:1px solid #f3f4f6">
          <div style="font-size:11px;color:#9ca3af;margin-bottom:4px">
            <span class="badge ${n.type==='teacher'?'badge-blue':'badge-gray'}" style="font-size:10px">${n.type==='teacher'?'Teacher Note':'Admin Note'}</span>
            ${n.author} · ${n.date}
          </div>
          <div style="font-size:13px;color:#374151">${n.text}</div>
        </div>
      </div>`).join('')}
      <div style="margin-top:8px">
        <textarea id="new-note-${s.id}" placeholder="Add a note…" rows="2"
          style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:8px;font-size:12px;resize:none;outline:none;box-sizing:border-box"></textarea>
        <div style="text-align:right;margin-top:6px">
          <button class="btn btn-primary btn-sm" onclick="saveStudentNote('${s.id}')">Save Note</button>
        </div>
      </div>
    </div>`;

    Modal.create(`modal-student-${s.id}`, `👤 ${s.name}`, body,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-student-${s.id}')">Close</button>
       <button class="btn btn-secondary" onclick="showToast('Edit student coming soon','info')">✏️ Edit</button>
       <button class="btn btn-primary" onclick="showToast('Renewal flow coming soon','info')">🔄 Renew</button>`,
      'modal-lg'
    );
  };

  /* ── TAB SWITCH ───────────────────────────────────────── */
  window.stuTab = function(tab, el) {
    const modal = el.closest('.modal');
    if (!modal) return;
    modal.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    ['overview','schedule','attendance','payment','notes'].forEach(t => {
      const panel = modal.querySelector(`#stab-${t}`);
      if (panel) panel.style.display = t === tab ? '' : 'none';
    });
  };

  /* ── SAVE NOTE ────────────────────────────────────────── */
  window.saveStudentNote = function(id) {
    const ta = document.getElementById(`new-note-${id}`);
    if (!ta || !ta.value.trim()) return;
    const s = students.find(x => x.id === id);
    s.notes.push({ type:'admin', text:ta.value.trim(), author:'Admin Nock', date:'Now' });
    showToast('Note saved ✓','success');
    Modal.close(`modal-student-${id}`);
    openStudentModal(id);
  };

})();
