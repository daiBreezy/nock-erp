/* ============================================================
   courses.js — NockERP Courses Module
   Course catalog built from CONST + live DB aggregation
   ============================================================ */
(function () {

  /* ── BUILD CATALOG FROM DB ────────────────────────────── */
  function buildCatalog() {
    const map = {};

    /* Seed subjects from CONST */
    CONST.SUBJECTS.forEach(sub => {
      map[sub] = { name: sub, students: [], sessions: [], teachers: new Set(), branches: new Set() };
    });

    /* Aggregate students */
    DB.students.forEach(s => {
      (s.courses || []).forEach(c => {
        const key = c.subject || c.name;
        if (!map[key]) map[key] = { name: key, students: [], sessions: [], teachers: new Set(), branches: new Set() };
        map[key].students.push({ name: s.name, enrolled: c.total || 0, left: c.left || 0, status: s.status });
        if (s.branch) map[key].branches.add(s.branch);
      });
    });

    /* Aggregate sessions */
    DB.sessions.forEach(s => {
      const key = s.subject;
      if (!key) return;
      if (!map[key]) map[key] = { name: key, students: [], sessions: [], teachers: new Set(), branches: new Set() };
      map[key].sessions.push(s);
      if (s.teacher) map[key].teachers.add(s.teacher);
      if (s.branch)  map[key].branches.add(s.branch);
    });

    return Object.values(map).filter(c => c.students.length > 0 || c.sessions.length > 0);
  }

  /* ── STATE ────────────────────────────────────────────── */
  let catalog = buildCatalog();
  let fBranch = 'all';
  let search  = '';

  /* ── SHELL ────────────────────────────────────────────── */
  document.getElementById('view-courses').innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Courses</div>
      <div class="page-sub" id="courses-sub">Loading…</div>
    </div>
    <button class="btn btn-primary btn-sm" onclick="openNewCourse()">＋ New Course</button>
  </div>

  <!-- KPI -->
  <div id="courses-kpi" class="kpi-grid mb-16" style="grid-template-columns:repeat(4,1fr)"></div>

  <!-- Filters -->
  <div style="display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
    <input id="courses-search" class="settings-input" style="width:200px;margin:0"
           placeholder="🔍 Search course…" oninput="coursesSearch(this.value)">
    <div class="filter-chip active" onclick="courseFilter('all',this)">All Branches</div>
    ${CONST.BRANCHES.map(b=>`<div class="filter-chip" onclick="courseFilter('${b}',this)">${b}</div>`).join('')}
  </div>

  <!-- Grid -->
  <div id="courses-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px"></div>`;

  /* ── KPI ──────────────────────────────────────────────── */
  function renderKPI() {
    const total    = catalog.length;
    const students = [...new Set(catalog.flatMap(c => c.students.map(s => s.name)))].length;
    const sessions = catalog.reduce((a, c) => a + c.sessions.length, 0);
    const teachers = [...new Set(catalog.flatMap(c => [...c.teachers]))].length;
    document.getElementById('courses-kpi').innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#ede9fe">📖</div>
        <div class="kpi-label">Courses</div>
        <div class="kpi-value">${total}</div>
        <div class="kpi-change up">Active catalog</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d1fae5">🎓</div>
        <div class="kpi-label">Students Enrolled</div>
        <div class="kpi-value">${students}</div>
        <div class="kpi-change up">Across all courses</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fef3c7">⏱️</div>
        <div class="kpi-label">Sessions Scheduled</div>
        <div class="kpi-value">${sessions}</div>
        <div class="kpi-change up">This week</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#e0f2fe">👩‍🏫</div>
        <div class="kpi-label">Teachers</div>
        <div class="kpi-value">${teachers}</div>
        <div class="kpi-change up">Assigned</div>
      </div>`;
  }

  /* ── RENDER GRID ──────────────────────────────────────── */
  function renderGrid() {
    let list = [...catalog];
    if (fBranch !== 'all') list = list.filter(c => c.branches.has(fBranch));
    if (search)            list = list.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

    const sub = document.getElementById('courses-sub');
    if (sub) sub.textContent = `${list.length} course${list.length !== 1 ? 's' : ''} in catalog`;

    const grid = document.getElementById('courses-grid');
    if (!grid) return;

    if (list.length === 0) {
      grid.innerHTML = `<div class="card" style="grid-column:1/-1;padding:40px;text-align:center;color:#9ca3af">
        <div style="font-size:32px;margin-bottom:8px">📖</div>No courses found</div>`;
      return;
    }

    grid.innerHTML = list.map(c => {
      const col  = CONST.SUBJECT_COLOR?.[c.name] || '#6366f1';
      const teachers = [...c.teachers].join(', ') || '—';
      const branches = [...c.branches].join(', ') || '—';
      const enrolled = c.students.length;
      const urgent   = c.students.filter(s => s.status === 'urgent').length;
      const renewal  = c.students.filter(s => s.status === 'renewal').length;
      const upcomSess = c.sessions.filter(s => s.state === 'upcoming').length;

      return `
      <div class="card" style="cursor:pointer;transition:box-shadow .15s" onclick="openCourseDetail('${c.name}')"
           onmouseover="this.style.boxShadow='0 4px 16px rgba(0,0,0,.1)'"
           onmouseout="this.style.boxShadow=''">
        <div style="height:5px;background:${col};border-radius:8px 8px 0 0;margin:-1px -1px 0"></div>
        <div class="card-body" style="padding:14px">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px">
            <div style="font-size:14px;font-weight:700;color:#1a1d23">${c.name}</div>
            <span class="badge" style="background:${col}22;color:${col};border:1px solid ${col}44">
              ${enrolled} student${enrolled !== 1 ? 's' : ''}
            </span>
          </div>
          <div style="font-size:11px;color:#6b7280;margin-bottom:10px;display:flex;flex-direction:column;gap:3px">
            <div>👩‍🏫 ${teachers}</div>
            <div>📍 ${branches}</div>
            <div>📅 ${upcomSess} upcoming session${upcomSess !== 1 ? 's' : ''}</div>
          </div>
          <!-- Students mini list -->
          <div style="border-top:1px solid #f3f4f6;padding-top:10px">
            ${c.students.slice(0, 3).map(s => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:3px 0">
              <span style="font-size:12px;color:#374151;cursor:pointer;font-weight:500"
                    onclick="event.stopPropagation();openProfileModal('${s.name}')">${s.name}</span>
              <span class="badge ${s.status === 'urgent' ? 'badge-red' : s.status === 'renewal' ? 'badge-yellow' : 'badge-green'}"
                    style="font-size:9px">${s.left} left</span>
            </div>`).join('')}
            ${c.students.length > 3 ? `<div style="font-size:11px;color:#9ca3af;margin-top:4px">+${c.students.length - 3} more</div>` : ''}
          </div>
          ${urgent > 0 || renewal > 0 ? `
          <div style="margin-top:8px;padding:6px 10px;background:#fef3c7;border-radius:6px;font-size:11px;color:#92400e">
            ${urgent > 0 ? `🚨 ${urgent} urgent` : ''} ${renewal > 0 ? `⚠️ ${renewal} renewal` : ''}
          </div>` : ''}
        </div>
      </div>`;
    }).join('');
  }

  /* ── DETAIL MODAL ─────────────────────────────────────── */
  window.openCourseDetail = function (name) {
    const c = catalog.find(x => x.name === name);
    if (!c) return;
    const col = CONST.SUBJECT_COLOR?.[name] || '#6366f1';

    Modal.create('modal-course-detail', `📖 ${name}`,
      `<div class="modal-section">
        <div class="modal-section-title">Enrolled Students (${c.students.length})</div>
        ${c.students.map(s => `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:8px 0;border-bottom:1px solid #f3f4f6">
          <span class="link-text" onclick="Modal.close('modal-course-detail');openProfileModal('${s.name}')"
                style="font-size:13px;font-weight:500;color:#6366f1;cursor:pointer">${s.name}</span>
          <div style="display:flex;gap:6px;align-items:center">
            <span style="font-size:11px;color:#6b7280">${s.enrolled}h total · ${s.left} left</span>
            <span class="badge ${s.status === 'urgent' ? 'badge-red' : s.status === 'renewal' ? 'badge-yellow' : 'badge-green'}"
                  style="font-size:9px">${s.status}</span>
          </div>
        </div>`).join('')}
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Teachers</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${[...c.teachers].map(t=>`<span class="badge badge-purple">${t}</span>`).join('') || '<span style="color:#9ca3af;font-size:13px">No teachers assigned</span>'}
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Branches</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${[...c.branches].map(b=>`<span class="badge badge-blue">${b}</span>`).join('') || '<span style="color:#9ca3af;font-size:13px">—</span>'}
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-course-detail')">Close</button>`,
      'sm'
    );
  };

  /* ── ACTIONS ──────────────────────────────────────────── */
  window.courseFilter = function (val, el) {
    fBranch = val;
    document.querySelectorAll('#view-courses .filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    renderGrid();
  };

  window.coursesSearch = function (val) {
    search = val;
    renderGrid();
  };

  window.openNewCourse = function () {
    showToast('Course creation coming soon', 'info');
  };

  /* ── INIT ─────────────────────────────────────────────── */
  renderKPI();
  renderGrid();

})();
