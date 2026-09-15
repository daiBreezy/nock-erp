/* classes.js — NockERP Classes Module
   DB.classes = canonical class records (Teacher × Time × Day)
   Stats enriched from DB.sessions */
(function () {

  const classes  = DB.classes;
  const students = DB.students;
  const sessions = DB.sessions;

  let fBranch = 'all', fTeacher = 'all', searchVal = '';

  /* ── HELPERS ─────────────────────────────────────────────── */
  function _color(sub) {
    const hex={green:'#10b981',yellow:'#f59e0b',orange:'#f97316',blue:'#6366f1',purple:'#8b5cf6'};
    return hex[CONST.SUBJECT_COLOR?.[sub]] || '#6366f1';
  }
  function _slotLabel(id) {
    const sh = CONST.SLOT_HOURS?.[id]||{};
    return sh.s ? `${sh.s}–${sh.e}` : (id||'—');
  }
  function _classSessions(cls) {
    return sessions.filter(s =>
      s.subject===cls.subject && s.grade===cls.grade &&
      s.teacher===cls.teacher && s.branch===cls.branch
    );
  }
  function _kpi() {
    const active    = classes.filter(c=>c.status==='active').length;
    const stuSet    = new Set(classes.flatMap(c=>c.students));
    const teachSet  = new Set(classes.map(c=>c.teacher));
    const urgentStu = students.filter(s=>s.status==='renewal'&&Math.min(...s.courses.map(c=>c.left))<=1).length;
    return { active, students: stuSet.size, teachers: teachSet.size, urgentStu };
  }
  function _autoName(cls) {
    return `${cls.subject} ${cls.grade} – ${cls.days.join('/')} (${cls.teacher})`;
  }

  /* ── SHELL ───────────────────────────────────────────────── */
  document.getElementById('view-classes').innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Classes</div>
      <div class="page-sub" id="classes-sub">Loading…</div>
    </div>
    <button class="btn btn-primary btn-sm" onclick="openCreateClass()">＋ New Class</button>
  </div>

  <!-- KPI -->
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:14px">
    <div class="card" style="padding:12px 14px">
      <div style="font-size:20px;font-weight:700;color:#6366f1" id="kpi-classes">—</div>
      <div style="font-size:11px;color:#6b7280;margin-top:1px">Active Classes</div>
    </div>
    <div class="card" style="padding:12px 14px">
      <div style="font-size:20px;font-weight:700;color:#10b981" id="kpi-cls-stu">—</div>
      <div style="font-size:11px;color:#6b7280;margin-top:1px">Students</div>
    </div>
    <div class="card" style="padding:12px 14px">
      <div style="font-size:20px;font-weight:700;color:#8b5cf6" id="kpi-cls-tch">—</div>
      <div style="font-size:11px;color:#6b7280;margin-top:1px">Teachers</div>
    </div>
    <div class="card" style="padding:12px 14px" id="kpi-urgent-card">
      <div style="font-size:20px;font-weight:700;color:#f59e0b" id="kpi-cls-urgent">—</div>
      <div style="font-size:11px;color:#6b7280;margin-top:1px">Renewal Urgent</div>
    </div>
  </div>

  <!-- FILTERS -->
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
    <input placeholder="Search class, teacher, course…"
      style="border:1px solid #e5e7eb;border-radius:6px;padding:6px 10px;font-size:13px;outline:none;width:230px"
      oninput="clsSearch(this.value)">
    <div style="display:flex;gap:4px">
      <div class="filter-chip active" data-cb="all"  onclick="clsFilter('branch','all',this)">All Branches</div>
      ${CONST.BRANCHES.map(b=>`<div class="filter-chip" data-cb="${b}" onclick="clsFilter('branch','${b}',this)">${b}</div>`).join('')}
    </div>
    <div style="display:flex;gap:4px">
      <div class="filter-chip active" data-ct="all"  onclick="clsFilter('teacher','all',this)">All Teachers</div>
      ${CONST.TEACHERS.map(t=>`<div class="filter-chip" data-ct="${t}" onclick="clsFilter('teacher','${t}',this)">${t.replace('Kru ','')}</div>`).join('')}
    </div>
  </div>

  <!-- TABLE -->
  <div class="card" style="padding:0;overflow:hidden">
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Class</th>
            <th>Teacher</th>
            <th>Schedule</th>
            <th>Branch · Room</th>
            <th>Students</th>
            <th>Sessions</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="classes-tbody"></tbody>
      </table>
    </div>
  </div>`;

  /* ── RENDER ──────────────────────────────────────────────── */
  function renderKPI() {
    const k = _kpi();
    document.getElementById('kpi-classes').textContent   = k.active;
    document.getElementById('kpi-cls-stu').textContent   = k.students;
    document.getElementById('kpi-cls-tch').textContent   = k.teachers;
    document.getElementById('kpi-cls-urgent').textContent= k.urgentStu;
    const uc = document.getElementById('kpi-urgent-card');
    if (uc && k.urgentStu > 0) uc.style.borderColor = '#ef4444';
  }

  function renderList() {
    let list = [...classes];
    if (fBranch  !== 'all') list = list.filter(c=>c.branch===fBranch);
    if (fTeacher !== 'all') list = list.filter(c=>c.teacher===fTeacher);
    if (searchVal) list = list.filter(c=>
      c.name.toLowerCase().includes(searchVal) ||
      c.teacher.toLowerCase().includes(searchVal) ||
      `${c.subject} ${c.grade}`.toLowerCase().includes(searchVal)
    );

    const sub = document.getElementById('classes-sub');
    if (sub) sub.textContent = `${list.length} class${list.length!==1?'es':''}`;

    document.getElementById('classes-tbody').innerHTML = list.map(cls => {
      const col      = _color(cls.subject);
      const classSess= _classSessions(cls);
      const upcoming = classSess.filter(s=>s.state==='upcoming').length;
      const done     = classSess.filter(s=>s.state==='ended').length;
      const stuWithIssues = cls.students.filter(n => {
        const s = students.find(x=>x.name===n);
        return s && s.status==='renewal' && Math.min(...s.courses.map(c=>c.left))<=1;
      }).length;
      const schedStr = `${cls.days.join('/')} · ${_slotLabel(cls.slotId)}`;
      return `<tr style="cursor:pointer" onclick="openClassDetail('${cls.id}')">
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:4px;height:36px;background:${col};border-radius:2px;flex-shrink:0"></div>
            <div>
              <div style="font-weight:600;font-size:13px;color:#1a1d23">${cls.subject} ${cls.grade}</div>
              <div style="font-size:10px;color:#9ca3af">${cls.name}</div>
            </div>
          </div>
        </td>
        <td style="font-size:13px">${cls.teacher}</td>
        <td style="font-size:12px;color:#6b7280">${schedStr}</td>
        <td style="font-size:12px">${cls.branch} · <span style="color:#9ca3af">${cls.room}</span></td>
        <td>
          <div style="display:flex;gap:3px;flex-wrap:wrap">
            ${cls.students.slice(0,4).map(n=>{
              const s=students.find(x=>x.name===n);
              const col2=s&&s.status==='renewal'&&Math.min(...s.courses.map(c=>c.left))<=1?'badge-red':s&&s.status==='renewal'?'badge-yellow':'badge-blue';
              return `<span class="badge ${col2}" style="font-size:9px">${n.split(' ')[0]}</span>`;
            }).join('')}
            ${cls.students.length>4?`<span class="badge badge-gray" style="font-size:9px">+${cls.students.length-4}</span>`:''}
          </div>
          ${stuWithIssues>0?`<div style="font-size:10px;color:#ef4444;margin-top:2px">🚨 ${stuWithIssues} urgent</div>`:''}
        </td>
        <td style="font-size:12px">
          <span class="badge badge-blue" style="font-size:9px">${upcoming} upcoming</span>
          <span class="badge badge-green" style="font-size:9px;margin-left:4px">${done} done</span>
        </td>
        <td><span class="badge ${cls.status==='active'?'badge-green':'badge-gray'}">${cls.status==='active'?'Active':'Archived'}</span></td>
        <td onclick="event.stopPropagation()">
          <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="openClassDetail('${cls.id}')">View</button>
        </td>
      </tr>`;
    }).join('');
  }

  renderKPI();
  renderList();

  /* ── FILTERS ─────────────────────────────────────────────── */
  window.clsSearch = function(v) { searchVal=v.toLowerCase(); renderList(); };
  window.clsFilter = function(type, val, el) {
    if (type==='branch') {
      fBranch=val;
      document.querySelectorAll('[data-cb]').forEach(c=>c.classList.remove('active'));
    } else {
      fTeacher=val;
      document.querySelectorAll('[data-ct]').forEach(c=>c.classList.remove('active'));
    }
    el.classList.add('active');
    renderList();
  };

  /* ── CLASS DETAIL MODAL ──────────────────────────────────── */
  window.openClassDetail = function(id) {
    const cls  = classes.find(x=>x.id===id);
    if (!cls) return;
    const col  = _color(cls.subject);
    const sess = _classSessions(cls).slice(0,6);
    const stuRows = cls.students.map(n => {
      const s = students.find(x=>x.name===n);
      if (!s) return `<div style="font-size:13px;padding:6px 0;border-bottom:1px solid #f3f4f6">${n}</div>`;
      const minLeft = Math.min(...s.courses.map(c=>c.left));
      const sm = CONST.STUDENT_STATUS[s.status];
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f3f4f6">
        <span style="font-size:13px;font-weight:500;color:#6366f1;cursor:pointer"
          onclick="Modal.close('modal-class-${id}');openStudentModal('${s.id}')">${s.name}${s.nick?` <span style="color:#9ca3af;font-size:11px">(${s.nick})</span>`:''}</span>
        <div style="display:flex;gap:6px;align-items:center">
          <span style="font-size:11px;color:#9ca3af">${minLeft} left</span>
          <span class="badge ${sm.cls}" style="font-size:9px">${sm.label}</span>
        </div>
      </div>`;
    }).join('');
    const sessRows = sess.map(s => {
      const dh = DB.dayHeaders.find(d=>d.date===s.date);
      return `<div style="display:flex;justify-content:space-between;font-size:12px;padding:5px 0;border-bottom:1px solid #f3f4f6">
        <span>${dh?dh.label+' '+s.date:s.date}</span>
        <span style="color:#6b7280">${_slotLabel(s.slotId)}</span>
        <span class="badge ${s.state==='upcoming'?'badge-blue':s.state==='active'?'badge-green':'badge-gray'}" style="font-size:9px">${s.state}</span>
      </div>`;
    }).join('');

    Modal.create(`modal-class-${id}`,`🏫 ${cls.subject} ${cls.grade}`,
    `<div style="height:4px;background:${col};border-radius:4px;margin-bottom:14px"></div>
    <div class="info-grid" style="margin-bottom:14px">
      <div class="info-item"><div class="label">Teacher</div>${cls.teacher}</div>
      <div class="info-item"><div class="label">Schedule</div>${cls.days.join('/')} · ${_slotLabel(cls.slotId)}</div>
      <div class="info-item"><div class="label">Branch · Room</div>${cls.branch} · ${cls.room}</div>
      <div class="info-item"><div class="label">Students</div>${cls.students.length} / 6 <span style="color:#9ca3af;font-size:11px">(soft limit)</span></div>
    </div>
    <div class="modal-section-title">Students (${cls.students.length})</div>
    ${stuRows}
    <div style="margin-top:10px;margin-bottom:16px">
      <button class="btn btn-secondary btn-sm" onclick="openAssignStudent('${id}')">＋ Assign Student</button>
    </div>
    <div class="modal-section-title">Recent Sessions</div>
    ${sessRows||'<div style="color:#9ca3af;font-size:12px;padding:8px 0">No sessions yet</div>'}`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-class-${id}')">Close</button>
     <button class="btn btn-secondary" onclick="showToast('Edit class coming soon','info')">✏️ Edit</button>`,
    'modal-lg');
  };

  /* ── ASSIGN STUDENT ──────────────────────────────────────── */
  window.openAssignStudent = function(clsId) {
    const cls = classes.find(x=>x.id===clsId);
    if (!cls) return;
    // Suggest: students with matching subject+grade, not already in this class, still have hours
    const suggestions = students.filter(s =>
      s.courses.some(c=>c.name.includes(cls.subject)&&c.name.includes(cls.grade)&&c.left>0) &&
      !cls.students.includes(s.name) &&
      s.status !== 'archived'
    ).sort((a,b)=>{
      const aLeft=Math.min(...a.courses.map(c=>c.left));
      const bLeft=Math.min(...b.courses.map(c=>c.left));
      return bLeft-aLeft;
    });

    Modal.create('modal-assign-stu','＋ Assign Student to Class',
    `<div style="font-size:12px;color:#6b7280;margin-bottom:12px">
      Suggested students for <strong>${cls.subject} ${cls.grade}</strong> · ${cls.branch}
    </div>
    ${suggestions.length ? suggestions.map(s=>{
      const minLeft=Math.min(...s.courses.map(c=>c.left));
      const sm=CONST.STUDENT_STATUS[s.status];
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border:1px solid #e5e7eb;border-radius:6px;margin-bottom:6px">
        <div>
          <div style="font-weight:500;font-size:13px">${s.name}${s.nick?` (${s.nick})`:''}</div>
          <div style="font-size:11px;color:#9ca3af">${s.branch} · ${minLeft} sessions left</div>
        </div>
        <div style="display:flex;gap:6px;align-items:center">
          <span class="badge ${sm.cls}" style="font-size:9px">${sm.label}</span>
          <button class="btn btn-primary btn-sm" style="font-size:11px"
            onclick="confirmAssign('${clsId}','${s.id}')">Assign</button>
        </div>
      </div>`;
    }).join('') : '<div style="color:#9ca3af;font-size:13px;text-align:center;padding:20px">No matching students available</div>'}`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-assign-stu')">Cancel</button>`,
    'sm');
  };

  window.confirmAssign = function(clsId, stuId) {
    const cls = classes.find(x=>x.id===clsId);
    const stu = students.find(x=>x.id===stuId);
    if (!cls||!stu) return;
    if (cls.students.length >= 6) {
      if (!confirm(`Class already has ${cls.students.length} students (soft limit 6). Add anyway?`)) return;
    }
    cls.students.push(stu.name);
    showToast(`${stu.name} assigned to ${cls.subject} ${cls.grade} ✓`, 'success');
    Modal.close('modal-assign-stu');
    Modal.close(`modal-class-${clsId}`);
    renderList(); renderKPI();
    openClassDetail(clsId);
  };

  /* ── CREATE CLASS MODAL ──────────────────────────────────── */
  window.openCreateClass = function() {
    const dayOpts   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const slotOpts  = Object.entries(CONST.SLOT_HOURS||{}).map(([id,h])=>
      `<option value="${id}">${h.s}–${h.e}</option>`).join('');
    const courseOpts= DB.courses.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');

    Modal.create('modal-create-class','＋ New Class',
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
      <div>
        <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px">Course</label>
        <select id="cls-course" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:7px 10px;font-size:13px;outline:none"
          onchange="clsAutoFill()">
          <option value="">— Select course —</option>
          ${courseOpts}
        </select>
      </div>
      <div>
        <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px">Teacher</label>
        <select id="cls-teacher" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:7px 10px;font-size:13px;outline:none"
          onchange="clsAutoName()">
          <option value="">— Select teacher —</option>
          ${CONST.TEACHERS.map(t=>`<option>${t}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px">Branch</label>
        <select id="cls-branch" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:7px 10px;font-size:13px;outline:none">
          ${CONST.BRANCHES.map(b=>`<option>${b}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px">Room</label>
        <select id="cls-room" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:7px 10px;font-size:13px;outline:none">
          ${CONST.ROOMS.map(r=>`<option>${r}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="margin-bottom:12px">
      <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:6px">Days</label>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${dayOpts.map(d=>`<label style="cursor:pointer;display:flex;align-items:center;gap:4px;font-size:13px">
          <input type="checkbox" value="${d}" class="cls-day" onchange="clsAutoName()"> ${d}
        </label>`).join('')}
      </div>
    </div>
    <div style="margin-bottom:12px">
      <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px">Time Slot</label>
      <select id="cls-slot" style="border:1px solid #e5e7eb;border-radius:6px;padding:7px 10px;font-size:13px;outline:none;width:100%">
        ${slotOpts}
      </select>
    </div>
    <div>
      <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px">Class Name <span style="color:#9ca3af">(auto-generated, editable)</span></label>
      <input id="cls-name" type="text" placeholder="Auto-fill after selecting course, days, teacher…"
        style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:7px 10px;font-size:13px;outline:none;box-sizing:border-box">
    </div>`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-create-class')">Cancel</button>
     <button class="btn btn-primary" onclick="saveClass()">Create Class</button>`,
    'sm');
  };

  window.clsAutoFill = function() {
    const cid = document.getElementById('cls-course')?.value;
    const c   = DB.courses.find(x=>x.id===cid);
    if (!c) return;
    const teachEl = document.getElementById('cls-teacher');
    if (teachEl && c.suggestedTeacher) teachEl.value = c.suggestedTeacher;
    clsAutoName();
  };

  window.clsAutoName = function() {
    const cid     = document.getElementById('cls-course')?.value;
    const course  = DB.courses.find(x=>x.id===cid);
    const teacher = document.getElementById('cls-teacher')?.value||'';
    const days    = [...document.querySelectorAll('.cls-day:checked')].map(el=>el.value);
    if (!course||!days.length||!teacher) return;
    const el = document.getElementById('cls-name');
    if (el) el.value = `${course.name} – ${days.join('/')} (${teacher})`;
  };

  window.saveClass = function() {
    const name    = document.getElementById('cls-name')?.value.trim();
    const cid     = document.getElementById('cls-course')?.value;
    const teacher = document.getElementById('cls-teacher')?.value;
    const branch  = document.getElementById('cls-branch')?.value;
    const room    = document.getElementById('cls-room')?.value;
    const days    = [...document.querySelectorAll('.cls-day:checked')].map(el=>el.value);
    const slotId  = parseInt(document.getElementById('cls-slot')?.value||0);
    const course  = DB.courses.find(x=>x.id===cid);

    if (!name)    { showToast('Enter a class name','error'); return; }
    if (!teacher) { showToast('Select a teacher','error');   return; }
    if (!days.length) { showToast('Select at least one day','error'); return; }

    const newCls = {
      id: 'cls-'+Date.now(), name, status:'active',
      subject:  course?.subjects[0]?.subject||'',
      grade:    course?.subjects[0]?.grade||'',
      teacher, branch, room, days, slotId, courseId: cid||'',
      students: [], createdAt: new Date().toISOString().slice(0,10),
    };
    classes.push(newCls);
    showToast(`Class "${name}" created ✓`, 'success');
    Modal.close('modal-create-class');
    renderKPI(); renderList();
    // Auto-open assign student
    setTimeout(() => openAssignStudent(newCls.id), 300);
  };

})();
