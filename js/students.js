/* ============================================================
   students.js — Students Module: List + Student Modal
   ============================================================ */
(function () {

  const students    = DB.students;
  const STATUS_META = CONST.STUDENT_STATUS;
  const ATT_META    = CONST.ATTENDANCE_META;

  let sortCol = 'name', sortAsc = true, filterStatus = 'all', searchVal = '', stuBranchVal = '';

  /* ── HELPERS ─────────────────────────────────────────────── */
  function _kpi() {
    const all      = students.filter(s => s.status !== 'archived');
    const active   = all.filter(s => s.status === 'active').length;
    const renewal  = all.filter(s => s.status === 'renewal').length;
    const pause    = all.filter(s => s.status === 'pause').length;
    const urgent   = all.filter(s => s.status === 'renewal' && Math.min(...s.courses.map(c=>c.left)) <= 1).length;
    const revenue  = students.reduce((sum,s) => sum + s.invoices.reduce((a,i)=>a+i.amount,0), 0);
    const now      = new Date();
    const newMonth = students.filter(s => {
      const d = new Date(s.enrollDate);
      return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth();
    }).length;
    const expiring = all.filter(s => s.status!=='pause' && Math.min(...s.courses.map(c=>c.left)) <= 2).length;
    return { active, renewal, pause, urgent, revenue, newMonth, expiring };
  }

  function _famId(familyName) {
    const f = (DB.families||[]).find(f => f.name === familyName);
    return f ? f.id : '';
  }

  function _subjectColor(name) {
    for (const key of Object.keys(CONST.SUBJECT_COLOR)) {
      if (name.startsWith(key)) return CONST.SUBJECT_COLOR[key];
    }
    return 'gray';
  }

  function _subjectTags() {
    const map = {};
    students.forEach(s => {
      if (s.status === 'archived' || s.status === 'pause') return;
      s.courses.forEach(c => {
        const m = c.name.match(/^(.+?)\s+[ปม]\.\d/);
        const sub = m ? m[1].trim() : c.name;
        map[sub] = (map[sub]||0) + 1;
      });
    });
    return map;
  }

  /* ── RENDER SHELL ────────────────────────────────────────── */
  function renderShell() {
    const k    = _kpi();
    const tags = _subjectTags();

    document.getElementById('view-students').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Students</div>
        <div class="page-sub" id="stu-count-sub">${students.filter(s=>s.status!=='archived').length} students enrolled</div>
      </div>
      <button class="btn btn-secondary btn-sm">Export</button>
    </div>

    <!-- KPI CARDS -->
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:14px">
      <div class="card" style="padding:12px 14px;cursor:pointer" onclick="stuFilter('active',document.querySelector('[data-sf=active]'))">
        <div style="font-size:20px;font-weight:700;color:#10b981">${k.active}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:1px">Active</div>
      </div>
      <div class="card" style="padding:12px 14px;cursor:pointer;${k.urgent?'border-color:#ef4444':''}"
           onclick="stuFilter('renewal',document.querySelector('[data-sf=renewal]'))">
        <div style="font-size:20px;font-weight:700;color:${k.urgent?'#ef4444':'#f59e0b'}">${k.renewal}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:1px">
          Renewal${k.urgent?` <span style="color:#ef4444;font-weight:600">(${k.urgent}🚨)</span>`:''}
        </div>
      </div>
      <div class="card" style="padding:12px 14px;cursor:pointer"
           onclick="stuFilter('pause',document.querySelector('[data-sf=pause]'))">
        <div style="font-size:20px;font-weight:700;color:#9ca3af">${k.pause}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:1px">Pause</div>
      </div>
      <div class="card" style="padding:12px 14px">
        <div style="font-size:17px;font-weight:700;color:#1a1d23">฿${(k.revenue/1000).toFixed(0)}K</div>
        <div style="font-size:11px;color:#6b7280;margin-top:1px">Revenue</div>
      </div>
      <div class="card" style="padding:12px 14px">
        <div style="font-size:20px;font-weight:700;color:#6366f1">${k.newMonth}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:1px">New This Month</div>
      </div>
      <div class="card" style="padding:12px 14px;${k.expiring?'border-color:#f59e0b;background:#fffbeb':''}">
        <div style="font-size:20px;font-weight:700;color:#f59e0b">${k.expiring}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:1px">Expiring Soon</div>
      </div>
    </div>

    <!-- SUBJECT TAGS -->
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
      <span style="font-size:11px;color:#9ca3af;margin-right:2px">Subjects:</span>
      ${Object.entries(tags).map(([sub,cnt]) =>
        `<span class="badge badge-${_subjectColor(sub)}" style="font-size:11px">${sub} · ${cnt}</span>`
      ).join('')}
    </div>

    <!-- FILTER BAR -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
      <input type="text" id="stu-search" placeholder="Search name, nickname, course…"
        style="border:1px solid #e5e7eb;border-radius:6px;padding:6px 10px;font-size:13px;outline:none;width:230px"
        oninput="stuSearch(this.value)">
      <div style="display:flex;gap:4px">
        ${['all','active','renewal','pause','archived'].map(s =>
          `<div class="filter-chip ${s==='all'?'active':''}" data-sf="${s}"
            style="font-size:11px;padding:3px 10px"
            onclick="stuFilter('${s}',this)">${s==='all'?'All':STATUS_META[s]?.label||s}</div>`
        ).join('')}
      </div>
      <select onchange="stuBranchFilter(this.value)"
        style="border:1px solid #e5e7eb;border-radius:6px;padding:5px 8px;font-size:12px;outline:none;color:#374151;margin-left:auto">
        <option value="">All Branches</option>
        <option>Sukhumvit</option>
        <option>Silom</option>
      </select>
    </div>

    <!-- TABLE -->
    <div class="card" style="padding:0;overflow:hidden">
      <div class="table-wrap">
        <table id="stu-table">
          <thead>
            <tr>
              <th onclick="stuSort('name')" style="cursor:pointer">Full Name <span id="sort-name"></span></th>
              <th>Nickname</th>
              <th>Family</th>
              <th>Branch</th>
              <th>Course(s)</th>
              <th onclick="stuSort('left')" style="cursor:pointer">Classes <span id="sort-left"></span></th>
              <th>Teacher</th>
              <th onclick="stuSort('status')" style="cursor:pointer">Status <span id="sort-status"></span></th>
              <th></th>
            </tr>
          </thead>
          <tbody id="stu-tbody"></tbody>
        </table>
      </div>
    </div>`;
  }

  /* ── BUILD TABLE ─────────────────────────────────────────── */
  function buildTable() {
    let list = students.filter(s => {
      const matchStatus = filterStatus === 'all' || s.status === filterStatus;
      const matchBranch = !stuBranchVal || s.branch === stuBranchVal;
      const q = searchVal.toLowerCase();
      const matchSearch = !q ||
        s.name.toLowerCase().includes(q) ||
        (s.nick||'').toLowerCase().includes(q) ||
        s.branch.toLowerCase().includes(q) ||
        s.courses.some(c => c.name.toLowerCase().includes(q)) ||
        s.teacher.toLowerCase().includes(q);
      return matchStatus && matchBranch && matchSearch;
    });

    list.sort((a, b) => {
      let av, bv;
      if (sortCol === 'name')   { av = a.name;  bv = b.name; }
      if (sortCol === 'left')   { av = Math.min(...a.courses.map(c=>c.left)); bv = Math.min(...b.courses.map(c=>c.left)); }
      if (sortCol === 'status') { av = a.status; bv = b.status; }
      if (av < bv) return sortAsc ? -1 : 1;
      if (av > bv) return sortAsc ?  1 : -1;
      return 0;
    });

    const sub = document.getElementById('stu-count-sub');
    if (sub) sub.textContent = `${list.length} student${list.length!==1?'s':''} shown`;

    document.getElementById('stu-tbody').innerHTML = list.map(s => {
      const sm      = STATUS_META[s.status];
      const usedH   = s.courses.reduce((a,c)=>a+c.used,  0);
      const totalH  = s.courses.reduce((a,c)=>a+c.hours, 0);
      const minLeft = Math.min(...s.courses.map(c=>c.left));
      const leftCls = minLeft <= 1 ? 'badge-red' : minLeft <= 2 ? 'badge-yellow' : 'badge-green';
      const courses = s.courses.map(c =>
        `<span class="badge badge-${_subjectColor(c.name)}" style="font-size:10px">${c.name.replace(/\s+[ปม]\.\d/,'')}</span>`
      ).join(' ');
      return `<tr style="cursor:pointer" onclick="openStudentModal('${s.id}')">
        <td><strong style="color:var(--md-primary)">${s.name}</strong></td>
        <td style="font-size:12px;color:#6b7280">${s.nick||'—'}</td>
        <td><span class="link-text" onclick="event.stopPropagation();openFamilyModal('${_famId(s.family)}')" style="font-size:12px;color:#6366f1;cursor:pointer">${s.family}</span></td>
        <td style="font-size:12px">${s.branch}</td>
        <td style="font-size:11px">${courses}</td>
        <td><span class="badge ${leftCls}">${usedH}/${totalH}h</span></td>
        <td style="font-size:12px">${s.teacher}</td>
        <td><span class="badge ${sm.cls}">${sm.label}</span></td>
        <td onclick="event.stopPropagation()" style="white-space:nowrap">
          <button class="chat-btn" onclick="openInboxFor('${s.family}')" title="Message family">💬</button>
          <button class="chat-btn" onclick="openStudentModal('${s.id}')" title="Edit">✏️</button>
        </td>
      </tr>`;
    }).join('');

    ['name','left','status'].forEach(col => {
      const el = document.getElementById(`sort-${col}`);
      if (el) el.textContent = sortCol===col ? (sortAsc?'↑':'↓') : '';
    });
  }

  renderShell();
  buildTable();

  /* ── FILTER / SORT ───────────────────────────────────────── */
  window.stuSearch       = function(v) { searchVal = v; buildTable(); };
  window.stuBranchFilter = function(v) { stuBranchVal = v; buildTable(); };
  window.stuFilter = function(mode, el) {
    filterStatus = mode;
    document.querySelectorAll('#view-students .filter-chip').forEach(c => c.classList.remove('active'));
    if (el) el.classList.add('active');
    buildTable();
  };
  window.stuSort = function(col) {
    if (sortCol===col) sortAsc = !sortAsc; else { sortCol=col; sortAsc=true; }
    buildTable();
  };

  /* ── STUDENT MODAL ───────────────────────────────────────── */
  window.openStudentModal = function(id) {
    const s = students.find(x => x.id === id);
    if (!s) return;
    const sm      = STATUS_META[s.status];
    const totalH  = s.courses.reduce((a,c)=>a+c.hours,0);
    const usedH   = s.courses.reduce((a,c)=>a+c.used, 0);
    const leftH   = s.courses.reduce((a,c)=>a+c.left, 0);
    const totalPaid = s.invoices.reduce((a,i)=>a+i.amount,0);
    const attCounts = {present:0,leave:0,absent:0};
    s.attendance.forEach(a => { attCounts[a.status]=(attCounts[a.status]||0)+1; });
    const nextS = (s.schedule||[]).find(sc=>sc.status==='upcoming');

    const body = `
    <!-- HEADER -->
    <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;background:#f9fafb;border-radius:8px;margin-bottom:16px;border:1px solid #f3f4f6">
      <div class="avatar" style="width:52px;height:52px;font-size:20px;flex-shrink:0">${s.name[0]}</div>
      <div style="flex:1">
        <div style="font-size:17px;font-weight:700;color:#1a1d23">
          ${s.name}${s.nick?` <span style="font-size:13px;font-weight:400;color:#9ca3af">(${s.nick})</span>`:''}
        </div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px">
          Age ${s.age} · ${s.branch} ·
          <span style="color:#6366f1;cursor:pointer" onclick="openFamilyModal('${_famId(s.family)}')">
            ${s.family} →
          </span>
        </div>
        <div style="margin-top:6px;display:flex;gap:6px;align-items:center">
          <span class="badge ${sm.cls}">${sm.label}</span>
          <span style="font-size:11px;color:#9ca3af">Enrolled ${s.enrollDate}</span>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:700;color:#1a1d23">฿${totalPaid.toLocaleString()}</div>
        <div style="font-size:10px;color:#9ca3af;margin-bottom:8px">Total Paid</div>
        <div style="display:flex;gap:6px;justify-content:flex-end">
          <button class="btn btn-secondary btn-sm" onclick="openInboxFor('${s.family}')">💬</button>
          <button class="btn btn-secondary btn-sm" onclick="showToast('Calling…','info')">📞</button>
        </div>
      </div>
    </div>

    <!-- TABS -->
    <div class="tabs" style="margin-bottom:0">
      <div class="tab active" onclick="stuTab('overview',this)">Overview</div>
      <div class="tab"        onclick="stuTab('sessions',this)">Sessions</div>
      <div class="tab"        onclick="stuTab('attendance',this)">Attendance</div>
      <div class="tab"        onclick="stuTab('payment',this)">Payment</div>
      <div class="tab"        onclick="stuTab('notes',this)">Notes</div>
    </div>

    <!-- OVERVIEW -->
    <div id="stab-overview" class="modal-section" style="padding-top:14px">
      <div class="info-grid" style="margin-bottom:16px">
        <div class="info-item"><div class="label">LINE ID</div>${s.line||'—'}</div>
        <div class="info-item"><div class="label">Phone</div>${s.phone}</div>
        <div class="info-item"><div class="label">Branch</div>${s.branch}</div>
        <div class="info-item"><div class="label">Total Enrolled</div>
          <strong>${totalH}h. · ${s.courses.length} course${s.courses.length>1?'s':''}</strong>
        </div>
      </div>
      <div class="modal-section-title" style="margin-bottom:10px">Course Quota</div>
      ${s.courses.map(c => {
        const pct    = Math.round((c.used/c.hours)*100);
        const col    = c.left<=1?'#ef4444':c.left<=2?'#f59e0b':'#10b981';
        const subCol = _subjectColor(c.name);
        return `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:14px;margin-bottom:10px">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
            <div>
              <div style="margin-bottom:4px"><span class="badge badge-${subCol}" style="font-size:10px">${c.name.split(' ')[0]}</span></div>
              <div style="font-weight:600;font-size:14px;color:#1a1d23">${c.name}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:26px;font-weight:700;line-height:1;color:${col}">${c.left}</div>
              <div style="font-size:10px;color:#9ca3af">sessions left</div>
            </div>
          </div>
          <div style="background:#f3f4f6;border-radius:4px;height:5px;margin-bottom:10px">
            <div style="background:${col};width:${pct}%;height:5px;border-radius:4px;transition:.3s"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:11px">
            <div><div style="color:#9ca3af">Used</div><strong>${c.used}/${c.hours}h.</strong></div>
            <div><div style="color:#9ca3af">Next session</div><strong>${nextS?nextS.date:'—'}</strong></div>
            <div><div style="color:#9ca3af">Teacher</div><strong>${s.teacher}</strong></div>
          </div>
          ${c.left<=2?`<div style="margin-top:10px;padding-top:10px;border-top:1px solid #f3f4f6;display:flex;align-items:center;gap:8px">
            <span style="font-size:11px;color:${c.left<=1?'#ef4444':'#f59e0b'};font-weight:500">
              ${c.left<=1?'🚨 Urgent:':'⚠️'} ${c.left} session${c.left===1?'':'s'} remaining
            </span>
            <button class="btn btn-primary btn-sm" style="margin-left:auto;font-size:11px"
              onclick="showToast('Renewal flow coming soon','info')">🔄 Renew Now</button>
          </div>`:''}
        </div>`;
      }).join('')}
    </div>

    <!-- SESSIONS -->
    <div id="stab-sessions" class="modal-section" style="display:none;padding-top:14px">
      <div class="modal-section-title">Upcoming Sessions</div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Time</th><th>Room</th><th>Teacher</th><th>Status</th></tr></thead>
          <tbody>
            ${(s.schedule||[]).map(sc=>`<tr>
              <td>${sc.date}</td><td>${sc.time}</td><td>${sc.room}</td>
              <td>${sc.teacher}</td>
              <td><span class="badge badge-blue">${sc.status}</span></td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- ATTENDANCE -->
    <div id="stab-attendance" class="modal-section" style="display:none;padding-top:14px">
      <div style="display:flex;gap:10px;margin-bottom:14px">
        ${[
          {label:'Present',v:attCounts.present||0,bg:'#f0fdf4',border:'#bbf7d0',color:'#10b981'},
          {label:'Leave',  v:attCounts.leave||0,  bg:'#fffbeb',border:'#fde68a',color:'#f59e0b'},
          {label:'Absent', v:attCounts.absent||0, bg:'#fef2f2',border:'#fecaca',color:'#ef4444'},
          {label:'Total',  v:s.attendance.length, bg:'#f5f3ff',border:'#ddd6fe',color:'#6366f1'},
        ].map(x=>`<div style="flex:1;background:${x.bg};border:1px solid ${x.border};border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:20px;font-weight:700;color:${x.color}">${x.v}</div>
          <div style="font-size:11px;color:#6b7280">${x.label}</div>
        </div>`).join('')}
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Course</th><th>Status</th><th>Note</th></tr></thead>
          <tbody>
            ${s.attendance.map(a=>{
              const am   = ATT_META[a.status];
              const note = a.status==='leave'?'<span style="color:#f59e0b;font-size:11px">No deduction</span>'
                         : a.status==='absent'?'<span style="color:#ef4444;font-size:11px">Deducted</span>'
                         : '<span style="color:#10b981;font-size:11px">Deducted</span>';
              return `<tr><td>${a.date}</td><td style="font-size:12px">${a.course}</td>
                <td><span class="badge ${am.cls}">${am.label}</span></td>
                <td>${note}</td></tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- PAYMENT -->
    <div id="stab-payment" class="modal-section" style="display:none;padding-top:14px">
      <div class="info-grid" style="margin-bottom:14px">
        <div class="info-item"><div class="label">Total Paid</div><strong>฿${totalPaid.toLocaleString()}</strong></div>
        <div class="info-item"><div class="label">Hours Purchased</div><strong>${totalH}h.</strong></div>
        <div class="info-item"><div class="label">Hours Used</div><strong>${usedH}h.</strong></div>
        <div class="info-item"><div class="label">Hours Remaining</div>
          <strong style="color:${leftH<=2?'#ef4444':'#10b981'}">${leftH}h.</strong>
        </div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div class="modal-section-title" style="margin-bottom:0">Invoice & Receipt History</div>
        <button class="btn btn-primary btn-sm" style="font-size:11px"
          onclick="openNewInvoice('${s.id}')">＋ New Invoice</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Ref #</th><th>Date</th><th>Course</th><th>Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${s.invoices.map(inv=>`<tr>
              <td style="font-size:11px;color:#6366f1;font-weight:600">${inv.id}</td>
              <td style="font-size:12px">${inv.date}</td>
              <td style="font-size:12px">${inv.course}</td>
              <td>฿${inv.amount.toLocaleString()}</td>
              <td><span class="badge badge-green">Paid</span></td>
              <td style="white-space:nowrap">
                <button class="btn btn-secondary btn-sm" style="font-size:10px"
                  onclick="openDocPreview('${inv.id}','invoice')">📄 INV</button>
                ${inv.payslip?`<button class="btn btn-secondary btn-sm" style="font-size:10px;margin-left:2px"
                  onclick="openDocPreview('${inv.id}','receipt')">🧾 RCP</button>`:''}
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- NOTES -->
    <div id="stab-notes" class="modal-section" style="display:none;padding-top:14px">
      ${s.notes.map(n=>`
      <div style="display:flex;gap:10px;margin-bottom:12px">
        <div class="avatar" style="width:30px;height:30px;font-size:11px;flex-shrink:0">${n.author[0]}</div>
        <div style="flex:1;background:#f9fafb;border-radius:8px;padding:10px;border:1px solid #f3f4f6">
          <div style="font-size:11px;color:#9ca3af;margin-bottom:4px">
            <span class="badge ${n.type==='teacher'?'badge-blue':'badge-gray'}" style="font-size:10px">
              ${n.type==='teacher'?'Teacher':'Admin'}
            </span>
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

    Modal.create(`modal-student-${s.id}`,
      `👤 ${s.name}${s.nick?` (${s.nick})`:''}`,
      body,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-student-${s.id}')">Close</button>
       <button class="btn btn-secondary" onclick="showToast('Edit student coming soon','info')">✏️ Edit</button>`,
      'modal-lg'
    );
  };

  /* ── TAB SWITCH ──────────────────────────────────────────── */
  window.stuTab = function(tab, el) {
    const modal = el.closest('.modal');
    if (!modal) return;
    modal.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    ['overview','sessions','attendance','payment','notes'].forEach(t => {
      const p = modal.querySelector(`#stab-${t}`);
      if (p) p.style.display = t===tab ? '' : 'none';
    });
  };

  /* ── SAVE NOTE ───────────────────────────────────────────── */
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
