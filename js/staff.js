/* ============================================================
   staff.js — Staff Module: Roster + Staff Modal
   ============================================================ */
(function () {

  /* ── DATA ─────────────────────────────────────────────── */
  const staff = [
    {
      id:'arm', name:'Kru Arm', fullName:'Aranya Sombat', role:'Teacher', subject:'Math G5',
      branches:['Sukhumvit'], phone:'090-111-2222', line:'@kru_arm', email:'arm@nockacademy.com',
      status:'active', joinDate:'2024-06-01',
      schedule:[
        { day:'Mon', sessions:['Math G5 · 09:00 Rm1','Math G5 · 15:00 Rm2'] },
        { day:'Wed', sessions:['Math G5 · 15:00 Rm2'] },
        { day:'Thu', sessions:['Math G6 · 15:00 Rm2 (co-teach)'] },
      ],
      students:['Ploy Srirak'],
      thisWeekSessions:5, totalSessions:87, avgRating:4.8,
      notes:[
        { type:'admin', text:'Excellent at making abstract concepts visual. Students love her energy.', author:'Admin Nock', date:'1 May' },
      ],
    },
    {
      id:'bee', name:'Kru Bee', fullName:'Benyapa Rattana', role:'Teacher', subject:'English Reading',
      branches:['Sukhumvit'], phone:'090-222-3333', line:'@kru_bee', email:'bee@nockacademy.com',
      status:'active', joinDate:'2024-03-15',
      schedule:[
        { day:'Mon', sessions:['Eng Read · 09:00 Rm1'] },
        { day:'Tue', sessions:['Eng Read · 10:30 Rm1'] },
        { day:'Wed', sessions:['Eng Read · 10:30 Rm1'] },
        { day:'Thu', sessions:['Eng Read · 10:30 Rm1'] },
        { day:'Sat', sessions:['Eng Read · 09:00 Rm1','Math G6 · 10:00 Rm2'] },
      ],
      students:['Mia Tanaka','Kevin Park'],
      thisWeekSessions:7, totalSessions:142, avgRating:4.9,
      notes:[
        { type:'admin', text:'Top performer. Parents frequently request Kru Bee by name. Consider for senior teacher role.', author:'Admin Nock', date:'5 May' },
      ],
    },
    {
      id:'cat', name:'Kru Cat', fullName:'Chotika Panya', role:'Teacher', subject:'Math Grade 6',
      branches:['Sukhumvit'], phone:'090-333-4444', line:'@kru_cat', email:'cat@nockacademy.com',
      status:'active', joinDate:'2025-01-10',
      schedule:[
        { day:'Tue', sessions:['Math G6 · 15:00 Rm2'] },
        { day:'Wed', sessions:['Math G6 · 15:00 Rm2'] },
        { day:'Thu', sessions:['Math G6 · 15:00 Rm2'] },
        { day:'Sat', sessions:['Math G6 · 10:00 Rm2'] },
      ],
      students:['Tom Chen'],
      thisWeekSessions:4, totalSessions:63, avgRating:4.7,
      notes:[],
    },
    {
      id:'dan', name:'Kru Dan', fullName:'Danai Wongkham', role:'Teacher', subject:'Science',
      branches:['Sukhumvit','Silom'], phone:'090-444-5555', line:'@kru_dan', email:'dan@nockacademy.com',
      status:'active', joinDate:'2024-09-01',
      schedule:[
        { day:'Mon', sessions:['Science · 14:30 Rm3'] },
        { day:'Tue', sessions:['Science · 14:30 Rm3'] },
        { day:'Wed', sessions:['Science · 14:30 Rm3'] },
        { day:'Thu', sessions:['Science · 14:30 Rm3'] },
      ],
      students:['James Wilson'],
      thisWeekSessions:4, totalSessions:58, avgRating:4.6,
      notes:[
        { type:'admin', text:'Covers both branches. Check travel schedule to avoid double-booking.', author:'Admin Nock', date:'8 May' },
      ],
    },
    {
      id:'eve', name:'Kru Eve', fullName:'Evapha Chinarat', role:'Teacher', subject:'Thai Language',
      branches:['Silom'], phone:'090-555-6666', line:'@kru_eve', email:'eve@nockacademy.com',
      status:'active', joinDate:'2025-03-01',
      schedule:[
        { day:'Mon', sessions:['Thai Lang · 16:30 Rm1'] },
        { day:'Wed', sessions:['Thai Lang · 16:30 Rm1'] },
        { day:'Sat', sessions:['Thai Lang · 15:00 Rm1'] },
      ],
      students:['Ploy Srirak'],
      thisWeekSessions:3, totalSessions:34, avgRating:4.8,
      notes:[],
    },
    {
      id:'nock', name:'Admin Nock', fullName:'Nockacademy Admin', role:'Admin', subject:'—',
      branches:['Sukhumvit','Silom'], phone:'090-000-1111', line:'@admin_nock', email:'nock@nockacademy.com',
      status:'active', joinDate:'2024-01-01',
      schedule:[], students:[], thisWeekSessions:0, totalSessions:0, avgRating:null,
      notes:[],
    },
  ];

  const ROLE_META = {
    Teacher: { cls:'badge-blue',   label:'Teacher' },
    Admin:   { cls:'badge-purple', label:'Admin'   },
  };

  let searchVal = '', filterBranch = '', filterRole = 'all';

  /* ── SHELL HTML ───────────────────────────────────────── */
  document.getElementById('view-staff').innerHTML = `
  <div class="page-header">
    <div><div class="page-title">Staff</div><div class="page-sub">5 teachers · 1 admin</div></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-secondary btn-sm" onclick="showToast('Export coming soon','info')">Export</button>
      <button class="btn btn-primary btn-sm" onclick="showToast('Add staff coming soon','info')">＋ Add Staff</button>
    </div>
  </div>

  <!-- FILTER BAR -->
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
    <input type="text" id="staff-search" placeholder="Search name, subject…"
      style="border:1px solid #e5e7eb;border-radius:6px;padding:6px 10px;font-size:13px;outline:none;width:200px"
      oninput="staffSearch(this.value)">
    <div style="display:flex;gap:4px">
      ${['all','Teacher','Admin'].map(r =>
        `<div class="filter-chip ${r==='all'?'active':''}" style="font-size:11px;padding:3px 10px"
          onclick="staffRoleFilter('${r}',this)">${r==='all'?'All':r+'s'}</div>`
      ).join('')}
    </div>
    <select onchange="staffBranch(this.value)"
      style="border:1px solid #e5e7eb;border-radius:6px;padding:5px 8px;font-size:12px;outline:none;color:#374151;margin-left:auto">
      <option value="">All Branches</option>
      <option>Sukhumvit</option>
      <option>Silom</option>
    </select>
  </div>

  <!-- TABLE -->
  <div class="card" style="padding:0;overflow:hidden">
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Subject</th>
            <th>Branch(es)</th>
            <th>Students</th>
            <th>This Week</th>
            <th>Total Sessions</th>
            <th>Rating</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="staff-tbody"></tbody>
      </table>
    </div>
  </div>`;

  /* ── BUILD TABLE ──────────────────────────────────────── */
  function buildTable() {
    let list = staff.filter(s => {
      const q = searchVal.toLowerCase();
      const matchSearch = !q || s.name.toLowerCase().includes(q)
        || s.subject.toLowerCase().includes(q) || s.fullName.toLowerCase().includes(q);
      const matchBranch = !filterBranch || s.branches.includes(filterBranch);
      const matchRole   = filterRole === 'all' || s.role === filterRole;
      return matchSearch && matchBranch && matchRole;
    });

    document.getElementById('staff-tbody').innerHTML = list.map(s => {
      const rm = ROLE_META[s.role] || ROLE_META.Teacher;
      const stars = s.avgRating ? '⭐ ' + s.avgRating : '—';
      return `<tr>
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div class="avatar" style="width:28px;height:28px;font-size:10px">${s.name[0]}</div>
            <div>
              <strong style="cursor:pointer;color:#6366f1" onclick="openStaffModal('${s.id}')">${s.name}</strong>
              <div style="font-size:10px;color:#9ca3af">${s.fullName}</div>
            </div>
          </div>
        </td>
        <td><span class="badge ${rm.cls}">${rm.label}</span></td>
        <td style="font-size:12px">${s.subject}</td>
        <td style="font-size:12px">${s.branches.join(', ')}</td>
        <td style="font-size:12px;text-align:center">${s.students.length||'—'}</td>
        <td style="font-size:12px;text-align:center">${s.thisWeekSessions||'—'}</td>
        <td style="font-size:12px;text-align:center">${s.totalSessions||'—'}</td>
        <td style="font-size:12px">${stars}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openStaffModal('${s.id}')">View</button>
        </td>
      </tr>`;
    }).join('');
  }

  buildTable();

  window.staffSearch     = v  => { searchVal   = v;  buildTable(); };
  window.staffBranch     = v  => { filterBranch = v; buildTable(); };
  window.staffRoleFilter = (r, el) => {
    filterRole = r;
    document.querySelectorAll('#view-staff .filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    buildTable();
  };

  /* ── STAFF MODAL ──────────────────────────────────────── */
  window.openStaffModal = function(id) {
    const s = staff.find(x => x.id === id);
    if (!s) return;

    const body = `
    <!-- HEADER -->
    <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;background:#f9fafb;border-radius:8px;margin-bottom:16px">
      <div class="avatar" style="width:52px;height:52px;font-size:20px;flex-shrink:0">${s.name[0]}</div>
      <div style="flex:1">
        <div style="font-size:17px;font-weight:700;color:#1a1d23">${s.name}</div>
        <div style="font-size:12px;color:#6b7280">${s.fullName} · ${s.role} · ${s.branches.join(', ')}</div>
        <div style="margin-top:4px"><span class="badge ${ROLE_META[s.role]?.cls||'badge-blue'}">${s.role}</span>
          <span class="badge badge-green" style="margin-left:4px">Active</span></div>
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-secondary btn-sm" onclick="showToast('Calling ${s.phone}…','info')">📞 Call</button>
      </div>
    </div>

    <!-- TABS -->
    <div class="tabs" style="margin-bottom:0">
      <div class="tab active" onclick="staffTab('profile',this)">👤 Profile</div>
      <div class="tab"        onclick="staffTab('schedule',this)">📅 Schedule</div>
      <div class="tab"        onclick="staffTab('notes',this)">📝 Notes</div>
    </div>

    <!-- TAB: PROFILE -->
    <div id="sttab-profile" class="modal-section" style="padding-top:12px">
      <div class="info-grid">
        <div class="info-item"><div class="label">Full Name</div>${s.fullName}</div>
        <div class="info-item"><div class="label">Subject</div>${s.subject}</div>
        <div class="info-item"><div class="label">LINE ID</div>${s.line}</div>
        <div class="info-item"><div class="label">Phone</div>${s.phone}</div>
        <div class="info-item"><div class="label">Email</div><span style="font-size:11px">${s.email}</span></div>
        <div class="info-item"><div class="label">Join Date</div>${s.joinDate}</div>
        <div class="info-item"><div class="label">Branch(es)</div>${s.branches.join(', ')}</div>
        <div class="info-item"><div class="label">Current Students</div>${s.students.join(', ')||'—'}</div>
      </div>
      ${s.role==='Teacher' ? `
      <div class="info-grid" style="margin-top:12px">
        <div class="info-item" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:22px;font-weight:700;color:#10b981">${s.thisWeekSessions}</div>
          <div style="font-size:11px;color:#6b7280">This Week</div>
        </div>
        <div class="info-item" style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:22px;font-weight:700;color:#6366f1">${s.totalSessions}</div>
          <div style="font-size:11px;color:#6b7280">Total Sessions</div>
        </div>
        <div class="info-item" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:22px;font-weight:700;color:#f59e0b">${s.avgRating||'—'}</div>
          <div style="font-size:11px;color:#6b7280">Avg Rating</div>
        </div>
        <div class="info-item" style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:10px;text-align:center">
          <div style="font-size:22px;font-weight:700;color:#7c3aed">${s.students.length}</div>
          <div style="font-size:11px;color:#6b7280">Active Students</div>
        </div>
      </div>` : ''}
    </div>

    <!-- TAB: SCHEDULE -->
    <div id="sttab-schedule" class="modal-section" style="display:none;padding-top:12px">
      <div class="modal-section-title">Weekly Schedule (This Week)</div>
      ${s.schedule.length ? s.schedule.map(d => `
      <div style="margin-bottom:10px">
        <div style="font-size:12px;font-weight:600;color:#6366f1;margin-bottom:4px">${d.day}</div>
        ${d.sessions.map(sess => `
        <div style="background:#f9fafb;border:1px solid #f3f4f6;border-radius:6px;padding:7px 10px;font-size:12px;margin-bottom:4px">
          📚 ${sess}
        </div>`).join('')}
      </div>`).join('')
      : '<div style="color:#9ca3af;font-size:13px;text-align:center;padding:20px">No sessions scheduled this week</div>'}
    </div>

    <!-- TAB: NOTES -->
    <div id="sttab-notes" class="modal-section" style="display:none;padding-top:12px">
      ${s.notes.length ? s.notes.map(n => `
      <div style="display:flex;gap:10px;margin-bottom:12px">
        <div class="avatar" style="width:28px;height:28px;font-size:10px;flex-shrink:0">${n.author[0]}</div>
        <div style="flex:1;background:#f9fafb;border-radius:8px;padding:10px;border:1px solid #f3f4f6">
          <div style="font-size:11px;color:#9ca3af;margin-bottom:4px">${n.author} · ${n.date}</div>
          <div style="font-size:13px;color:#374151">${n.text}</div>
        </div>
      </div>`).join('') : '<div style="color:#9ca3af;font-size:13px;text-align:center;padding:20px">No notes yet</div>'}
      <textarea id="staff-note-${s.id}" placeholder="Add a note…" rows="2"
        style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:8px;font-size:12px;resize:none;outline:none;box-sizing:border-box;margin-top:8px"></textarea>
      <div style="text-align:right;margin-top:6px">
        <button class="btn btn-primary btn-sm" onclick="saveStaffNote('${s.id}')">Save Note</button>
      </div>
    </div>`;

    Modal.create(`modal-staff-${s.id}`, `👤 ${s.name}`, body,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-staff-${s.id}')">Close</button>
       <button class="btn btn-secondary" onclick="showToast('Edit coming soon','info')">✏️ Edit</button>
       <button class="btn btn-primary" onclick="showToast('View full calendar coming soon','info')">📅 Full Schedule</button>`,
      'modal-lg'
    );
  };

  /* ── TAB SWITCH ───────────────────────────────────────── */
  window.staffTab = function(tab, el) {
    const modal = el.closest('.modal');
    if (!modal) return;
    modal.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    ['profile','schedule','notes'].forEach(t => {
      const p = modal.querySelector(`#sttab-${t}`);
      if (p) p.style.display = t === tab ? '' : 'none';
    });
  };

  /* ── SAVE NOTE ────────────────────────────────────────── */
  window.saveStaffNote = function(id) {
    const ta = document.getElementById(`staff-note-${id}`);
    if (!ta || !ta.value.trim()) return;
    const s = staff.find(x => x.id === id);
    s.notes.push({ type:'admin', text:ta.value.trim(), author:'Admin Nock', date:'Now' });
    showToast('Note saved ✓','success');
    Modal.close(`modal-staff-${id}`);
    openStaffModal(id);
  };

})();
