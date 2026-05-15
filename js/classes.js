/* ============================================================
   classes.js — NockERP Classes Module
   Recurring class groups: who attends which session slot
   ============================================================ */
(function () {

  /* ── BUILD CLASS GROUPS FROM DB ───────────────────────── */
  function buildGroups() {
    const map = {}; // key = "subject|teacher|slotId|branch"

    DB.sessions.forEach(s => {
      if (!s.teacher || !s.subject) return;
      const key = `${s.subject}|${s.grade||''}|${s.teacher}|${s.slotId}|${s.branch}`;
      if (!map[key]) {
        map[key] = {
          id:       key,
          subject:  s.subject,
          grade:    s.grade || '',
          teacher:  s.teacher,
          slotId:   s.slotId,
          branch:   s.branch,
          room:     s.room,
          sessions: [],
          students: new Set(),
        };
      }
      map[key].sessions.push(s);
      Object.keys(s.attendance || {}).forEach(n => map[key].students.add(n));
    });

    return Object.values(map);
  }

  /* ── HELPERS ──────────────────────────────────────────── */
  function slotLabel(slotId) {
    const sh = CONST.SLOT_HOURS?.[slotId] || {};
    return sh.s ? `${sh.s} – ${sh.e}` : slotId || '—';
  }

  function dayLabel(slotId) {
    /* Derive day from sessions if possible */
    const group = groups.find(g => g.slotId === slotId);
    if (!group) return '';
    const sess = group.sessions[0];
    if (!sess) return '';
    const dh = DB.dayHeaders.find(d => d.date === sess.date);
    return dh ? dh.label : '';
  }

  /* ── STATE ────────────────────────────────────────────── */
  let groups  = buildGroups();
  let fBranch = 'all';
  let fTeach  = 'all';

  /* ── SHELL ────────────────────────────────────────────── */
  document.getElementById('view-classes').innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Classes</div>
      <div class="page-sub" id="classes-sub">Loading…</div>
    </div>
    <button class="btn btn-primary btn-sm" onclick="showToast('Schedule new class coming soon','info')">＋ New Class</button>
  </div>

  <!-- KPI -->
  <div id="classes-kpi" class="kpi-grid mb-16" style="grid-template-columns:repeat(4,1fr)"></div>

  <!-- Filters -->
  <div style="display:flex;gap:6px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
    <div class="filter-chip active" onclick="classFilter('branch','all',this)">All Branches</div>
    ${CONST.BRANCHES.map(b=>`<div class="filter-chip" onclick="classFilter('branch','${b}',this)">${b}</div>`).join('')}
    <div style="width:1px;background:#e5e7eb;height:20px;margin:0 4px"></div>
    <div class="filter-chip active" onclick="classFilter('teacher','all',this)">All Teachers</div>
    ${CONST.TEACHERS.map(t=>`<div class="filter-chip" onclick="classFilter('teacher','${t}',this)">${t}</div>`).join('')}
  </div>

  <!-- Table -->
  <div class="card">
    <div id="classes-table"></div>
  </div>`;

  /* ── KPI ──────────────────────────────────────────────── */
  function renderKPI() {
    const total    = groups.length;
    const students = [...new Set(groups.flatMap(g => [...g.students]))].length;
    const branches = [...new Set(groups.map(g => g.branch))].length;
    const teachers = [...new Set(groups.map(g => g.teacher))].length;
    document.getElementById('classes-kpi').innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#ede9fe">🏫</div>
        <div class="kpi-label">Class Groups</div>
        <div class="kpi-value">${total}</div>
        <div class="kpi-change up">Recurring slots</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d1fae5">🎓</div>
        <div class="kpi-label">Students</div>
        <div class="kpi-value">${students}</div>
        <div class="kpi-change up">Unique students</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fef3c7">👩‍🏫</div>
        <div class="kpi-label">Teachers</div>
        <div class="kpi-value">${teachers}</div>
        <div class="kpi-change up">Active</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#e0f2fe">📍</div>
        <div class="kpi-label">Branches</div>
        <div class="kpi-value">${branches}</div>
        <div class="kpi-change up">Locations</div>
      </div>`;
  }

  /* ── RENDER TABLE ─────────────────────────────────────── */
  function renderTable() {
    let list = [...groups];
    if (fBranch !== 'all') list = list.filter(g => g.branch === fBranch);
    if (fTeach  !== 'all') list = list.filter(g => g.teacher === fTeach);

    const sub = document.getElementById('classes-sub');
    if (sub) sub.textContent = `${list.length} class group${list.length !== 1 ? 's' : ''}`;

    const container = document.getElementById('classes-table');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `<div style="padding:40px;text-align:center;color:#9ca3af">
        <div style="font-size:32px;margin-bottom:8px">🏫</div>No class groups found</div>`;
      return;
    }

    container.innerHTML = `
    <table class="table">
      <thead><tr>
        <th>Course</th>
        <th>Teacher</th>
        <th>Time Slot</th>
        <th>Room · Branch</th>
        <th>Students</th>
        <th>Sessions</th>
        <th></th>
      </tr></thead>
      <tbody>
        ${list.map(g => {
          const col = CONST.SUBJECT_COLOR?.[g.subject] || '#6366f1';
          const stuArr = [...g.students];
          const upcoming = g.sessions.filter(s => s.state === 'upcoming').length;
          const done     = g.sessions.filter(s => s.state === 'done').length;
          return `
          <tr style="cursor:pointer" onclick="openClassGroup('${encodeURIComponent(g.id)}')">
            <td>
              <div style="display:flex;align-items:center;gap:8px">
                <div style="width:4px;height:32px;border-radius:2px;background:${col};flex-shrink:0"></div>
                <span style="font-size:13px;font-weight:600;color:#1a1d23">${Utils.subjectLabel(g.subject, g.grade)}</span>
              </div>
            </td>
            <td style="font-size:13px;color:#374151">${g.teacher}</td>
            <td style="font-size:12px;color:#6b7280">${slotLabel(g.slotId)}</td>
            <td style="font-size:12px;color:#6b7280">${g.room || '—'} · ${g.branch || '—'}</td>
            <td>
              <div style="display:flex;gap:4px;flex-wrap:wrap">
                ${stuArr.slice(0,3).map(n=>`<span class="badge badge-blue" style="font-size:9px">${n.split(' ')[0]}</span>`).join('')}
                ${stuArr.length > 3 ? `<span class="badge badge-gray" style="font-size:9px">+${stuArr.length-3}</span>` : ''}
              </div>
            </td>
            <td>
              <div style="font-size:11px;color:#374151">
                <span class="badge badge-blue" style="font-size:9px">${upcoming} upcoming</span>
                <span class="badge badge-green" style="font-size:9px;margin-left:4px">${done} done</span>
              </div>
            </td>
            <td>
              <button class="btn btn-secondary btn-sm" style="font-size:11px"
                      onclick="event.stopPropagation();openClassGroup('${encodeURIComponent(g.id)}')">Detail</button>
            </td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>`;
  }

  /* ── DETAIL MODAL ─────────────────────────────────────── */
  window.openClassGroup = function (encodedId) {
    const id = decodeURIComponent(encodedId);
    const g  = groups.find(x => x.id === id);
    if (!g) return;
    const col = CONST.SUBJECT_COLOR?.[g.subject] || '#6366f1';
    const stuArr = [...g.students];

    const sessRows = g.sessions.slice(0, 8).map(s => {
      const dh = DB.dayHeaders.find(d => d.date === s.date);
      const dateLabel = dh ? `${dh.label} ${dh.date}` : s.date;
      const stateColor = s.state === 'upcoming' ? '#6366f1' : s.state === 'ongoing' ? '#10b981' : '#9ca3af';
      return `
      <div style="display:flex;justify-content:space-between;align-items:center;
                  padding:7px 0;border-bottom:1px solid #f3f4f6;font-size:12px">
        <span style="color:#374151">${dateLabel}</span>
        <span style="color:#6b7280">${slotLabel(s.slotId)}</span>
        <span style="color:${stateColor};font-weight:600;text-transform:capitalize">${s.state}</span>
      </div>`;
    }).join('');

    Modal.create('modal-class-group', `🏫 ${Utils.subjectLabel(g.subject, g.grade)} — Class Group`,
      `<div class="modal-section">
        <div class="modal-section-title">Class Info</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:13px">
          <div><span style="color:#9ca3af">Teacher</span><br><strong>${g.teacher}</strong></div>
          <div><span style="color:#9ca3af">Time Slot</span><br><strong>${slotLabel(g.slotId)}</strong></div>
          <div><span style="color:#9ca3af">Room</span><br><strong>${g.room || '—'}</strong></div>
          <div><span style="color:#9ca3af">Branch</span><br><strong>${g.branch || '—'}</strong></div>
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Enrolled Students (${stuArr.length})</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${stuArr.map(n => `
          <span class="badge badge-blue" style="cursor:pointer;font-size:12px;padding:4px 10px"
                onclick="Modal.close('modal-class-group');openProfileModal('${n}')">${n}</span>`).join('')}
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Sessions (${g.sessions.length} total)</div>
        ${sessRows}
        ${g.sessions.length > 8 ? `<div style="font-size:11px;color:#9ca3af;padding-top:6px">…and ${g.sessions.length-8} more</div>` : ''}
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-class-group')">Close</button>
       <button class="btn btn-primary" onclick="Modal.close('modal-class-group');showView('sessions')" >View Sessions</button>`,
      'sm'
    );
  };

  /* ── FILTER ───────────────────────────────────────────── */
  window.classFilter = function (key, val, el) {
    if (key === 'branch') {
      fBranch = val;
      /* clear branch chips */
      const chips = document.querySelectorAll('#view-classes .filter-chip');
      const branchCount = CONST.BRANCHES.length + 1; // +1 for "All"
      for (let i = 0; i < branchCount; i++) chips[i]?.classList.remove('active');
    } else {
      fTeach = val;
      /* clear teacher chips */
      const chips = document.querySelectorAll('#view-classes .filter-chip');
      const branchCount = CONST.BRANCHES.length + 1;
      for (let i = branchCount + 1; i < chips.length; i++) chips[i]?.classList.remove('active');
    }
    el.classList.add('active');
    renderTable();
  };

  /* ── INIT ─────────────────────────────────────────────── */
  renderKPI();
  renderTable();

})();
