/* classes.js — NockERP Classes Module
   DB.classes = canonical class records (Teacher × Time × Day)
   Stats enriched from DB.sessions */
(function () {

  const classes  = DB.classes;
  const students = DB.students;
  const sessions = DB.sessions;

  let fBranch = 'all', fTeacher = 'all', searchVal = '';

  /* ── HELPERS ─────────────────────────────────────────────── */
  function _colorVar(sub) {
    const map = { green:'var(--md-success)', yellow:'var(--md-warning)', orange:'var(--md-tertiary)',
                  blue:'var(--md-primary)', purple:'var(--md-secondary)' };
    return map[CONST.SUBJECT_COLOR?.[sub]] || 'var(--md-primary)';
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

  /* ── SHELL ───────────────────────────────────────────────── */
  document.getElementById('view-classes').innerHTML = `
  ${UI.pageHeader('Classes', '<span id="classes-sub">Loading…</span>',
    `<button class="btn btn-primary btn-sm" onclick="openCreateClass()">${UI.icon('add','sm')} New Class</button>`
  )}

  <div id="classes-kpi"></div>

  <div class="filter-bar">
    <input class="form-input" placeholder="Search class, teacher, course…"
      style="width:230px;height:32px;font-size:var(--fs-label-md)"
      oninput="clsSearch(this.value)">
    <div class="filter-chip active" data-cb="all" onclick="clsFilter('branch','all',this)">All Branches</div>
    ${CONST.BRANCHES.map(b=>`<div class="filter-chip" data-cb="${b}" onclick="clsFilter('branch','${b}',this)">${b}</div>`).join('')}
    <div style="width:1px;background:var(--md-outline-variant);height:20px;margin:0 var(--sp-1)"></div>
    <div class="filter-chip active" data-ct="all" onclick="clsFilter('teacher','all',this)">All Teachers</div>
    ${CONST.TEACHERS.map(t=>`<div class="filter-chip" data-ct="${t}" onclick="clsFilter('teacher','${t}',this)">${t.replace('Kru ','')}</div>`).join('')}
  </div>

  <div class="card">
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

  /* ── RENDER KPI ──────────────────────────────────────────── */
  function renderKPI() {
    const k = _kpi();
    document.getElementById('classes-kpi').innerHTML = UI.kpiGrid([
      { icon:'class',     label:'Active Classes',  value:k.active,    color:'',        sub:'Currently running',     subColor:'up'                    },
      { icon:'school',    label:'Students',         value:k.students,  color:'success', sub:'Across all classes',    subColor:'up'                    },
      { icon:'badge',     label:'Teachers',         value:k.teachers,  color:'tertiary',sub:'Assigned to classes',   subColor:'up'                    },
      { icon:'autorenew', label:'Renewal Urgent',   value:k.urgentStu, color: k.urgentStu ? 'error' : 'success',
        sub: k.urgentStu ? 'Need follow-up today' : 'All good', subColor: k.urgentStu ? 'down' : 'up' },
    ]);
  }

  /* ── RENDER LIST ─────────────────────────────────────────── */
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

    const tbody = document.getElementById('classes-tbody');
    if (!tbody) return;

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="8">${UI.emptyState('class','No classes match','Try adjusting the filters')}</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(cls => {
      const colVar    = _colorVar(cls.subject);
      const classSess = _classSessions(cls);
      const upcoming  = classSess.filter(s=>s.state==='upcoming').length;
      const done      = classSess.filter(s=>s.state==='ended').length;
      const stuWithIssues = cls.students.filter(n => {
        const s = students.find(x=>x.name===n);
        return s && s.status==='renewal' && Math.min(...s.courses.map(c=>c.left))<=1;
      }).length;
      const schedStr = `${cls.days.join('/')} · ${_slotLabel(cls.slotId)}`;
      return `<tr style="cursor:pointer" onclick="openClassDetail('${cls.id}')">
        <td>
          <div style="display:flex;align-items:center;gap:var(--sp-2)">
            <div style="width:4px;height:36px;background:${colVar};border-radius:2px;flex-shrink:0"></div>
            <div>
              <div style="font-weight:600;font-size:var(--fs-label-md);color:var(--md-on-surface)">${cls.subject} ${cls.grade}</div>
              <div class="text-muted" style="font-size:var(--fs-label-sm)">${cls.name}</div>
            </div>
          </div>
        </td>
        <td style="font-size:var(--fs-label-md)">${cls.teacher}</td>
        <td class="text-muted" style="font-size:var(--fs-label-sm)">${schedStr}</td>
        <td style="font-size:var(--fs-label-sm)">${cls.branch} · <span class="text-muted">${cls.room}</span></td>
        <td>
          <div style="display:flex;gap:var(--sp-1);align-items:center;flex-wrap:nowrap">
            ${cls.students.slice(0,3).map(n=>{
              const s=students.find(x=>x.name===n);
              const c2=s&&s.status==='renewal'&&Math.min(...s.courses.map(c=>c.left))<=1?'red':s&&s.status==='renewal'?'yellow':'blue';
              return UI.badge(n.split(' ')[0], c2);
            }).join('')}
            ${cls.students.length>3 ? UI.badge(`+${cls.students.length-3}`, 'gray') : ''}
          </div>
          ${stuWithIssues>0?`<div class="text-error" style="font-size:var(--fs-label-sm);margin-top:var(--sp-1)">${UI.icon('priority_high','sm')} ${stuWithIssues}</div>`:''}
        </td>
        <td style="font-size:var(--fs-label-sm)">
          ${UI.badge(`${upcoming} upcoming`, 'blue')}
          ${UI.badge(`${done} done`, 'green')}
        </td>
        <td>${UI.badge(cls.status==='active'?'Active':'Archived', cls.status==='active'?'green':'gray')}</td>
        <td onclick="event.stopPropagation()">
          <button class="btn btn-secondary btn-sm" style="font-size:var(--fs-label-sm)"
            onclick="openClassDetail('${cls.id}')">View</button>
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
    const colVar = _colorVar(cls.subject);
    const sess = _classSessions(cls).slice(0,6);
    const stuRows = cls.students.map(n => {
      const s = students.find(x=>x.name===n);
      if (!s) return `<div style="font-size:var(--fs-label-md);padding:var(--sp-2) 0;
                        border-bottom:1px solid var(--md-outline-variant)">${n}</div>`;
      const minLeft = Math.min(...s.courses.map(c=>c.left));
      const sm = CONST.STUDENT_STATUS[s.status];
      return `<div style="display:flex;align-items:center;justify-content:space-between;
                          padding:var(--sp-2) 0;border-bottom:1px solid var(--md-outline-variant)">
        <span class="text-primary" style="font-size:var(--fs-label-md);font-weight:500;cursor:pointer"
          onclick="Modal.close('modal-class-${id}');openStudentModal('${s.id}')">${s.name}${s.nick?` <span class="text-muted" style="font-size:var(--fs-label-sm)">(${s.nick})</span>`:''}</span>
        <div style="display:flex;gap:var(--sp-2);align-items:center">
          <span class="text-muted" style="font-size:var(--fs-label-sm)">${minLeft} left</span>
          ${UI.badge(sm.label, (sm.cls||'badge-gray').replace('badge-',''))}
        </div>
      </div>`;
    }).join('');
    const sessRows = sess.map(s => {
      const dh = DB.dayHeaders.find(d=>d.date===s.date);
      const stateColor = s.state==='upcoming'?'blue':s.state==='active'?'green':'gray';
      return `<div style="display:flex;justify-content:space-between;align-items:center;
                          font-size:var(--fs-label-sm);padding:var(--sp-1) 0;
                          border-bottom:1px solid var(--md-outline-variant)">
        <span>${dh?dh.label+' '+s.date:s.date}</span>
        <span class="text-muted">${_slotLabel(s.slotId)}</span>
        ${UI.badge(s.state, stateColor)}
      </div>`;
    }).join('');

    Modal.create(`modal-class-${id}`, `${UI.icon('class')} ${cls.subject} ${cls.grade}`,
    `<div style="height:4px;background:${colVar};border-radius:4px;margin-bottom:var(--sp-3)"></div>
    <div class="info-grid" style="margin-bottom:var(--sp-3)">
      <div class="info-item"><div class="label">Teacher</div>${cls.teacher}</div>
      <div class="info-item"><div class="label">Schedule</div>${cls.days.join('/')} · ${_slotLabel(cls.slotId)}</div>
      <div class="info-item"><div class="label">Branch · Room</div>${cls.branch} · ${cls.room}</div>
      <div class="info-item"><div class="label">Students</div>${cls.students.length} / 6 <span class="text-muted" style="font-size:var(--fs-label-sm)">(soft limit)</span></div>
    </div>
    <div class="modal-section-title">Students (${cls.students.length})</div>
    ${stuRows || UI.emptyState('school', 'No students assigned')}
    <div style="margin-top:var(--sp-2);margin-bottom:var(--sp-4)">
      <button class="btn btn-secondary btn-sm" onclick="openAssignStudent('${id}')">${UI.icon('person_add','sm')} Assign Student</button>
    </div>
    <div class="modal-section-title">Recent Sessions</div>
    ${sessRows || UI.emptyState('calendar_today', 'No sessions yet')}`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-class-${id}')">Close</button>
     <button class="btn btn-secondary" onclick="Modal.close('modal-class-${id}');setTimeout(()=>openCreateClass('${id}'),80)">${UI.icon('edit','sm')} Edit</button>`,
    'modal-lg');
  };

  /* ── ASSIGN STUDENT ──────────────────────────────────────── */
  window.openAssignStudent = function(clsId) {
    const cls = classes.find(x=>x.id===clsId);
    if (!cls) return;
    const suggestions = students.filter(s =>
      s.courses.some(c=>c.name.includes(cls.subject)&&c.name.includes(cls.grade)&&c.left>0) &&
      !cls.students.includes(s.name) &&
      s.status !== 'archived'
    ).sort((a,b)=>{
      const aLeft=Math.min(...a.courses.map(c=>c.left));
      const bLeft=Math.min(...b.courses.map(c=>c.left));
      return bLeft-aLeft;
    });

    Modal.create('modal-assign-stu',
    `${UI.icon('person_add')} Assign Student to Class`,
    `<div class="text-muted" style="font-size:var(--fs-label-sm);margin-bottom:var(--sp-3)">
      Suggested students for <strong>${cls.subject} ${cls.grade}</strong> · ${cls.branch}
    </div>
    ${suggestions.length ? suggestions.map(s=>{
      const minLeft=Math.min(...s.courses.map(c=>c.left));
      const sm=CONST.STUDENT_STATUS[s.status];
      return `<div style="display:flex;align-items:center;justify-content:space-between;
                          padding:var(--sp-2) var(--sp-3);
                          border:1px solid var(--md-outline-variant);
                          border-radius:var(--shape-sm);margin-bottom:var(--sp-2)">
        <div>
          <div style="font-weight:500;font-size:var(--fs-label-md)">${s.name}${s.nick?` (${s.nick})`:''}</div>
          <div class="text-muted" style="font-size:var(--fs-label-sm)">${s.branch} · ${minLeft} sessions left</div>
        </div>
        <div style="display:flex;gap:var(--sp-2);align-items:center">
          ${UI.badge(sm.label, (sm.cls||'badge-gray').replace('badge-',''))}
          <button class="btn btn-primary btn-sm"
            onclick="confirmAssign('${clsId}','${s.id}')">Assign</button>
        </div>
      </div>`;
    }).join('') : UI.emptyState('school','No matching students available')}`,
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
  window.openCreateClass = function(editId) {
    window._clsEditId = editId || null;
    const ed = editId ? classes.find(c=>c.id===editId) : null;
    const defBranch = CONST.BRANCHES[0];
    const dayOpts  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const slotOpts = Object.entries(CONST.SLOT_HOURS||{}).map(([id,h])=>
      `<option value="${id}">${h.s}–${h.e}</option>`).join('');
    const courseOpts = DB.courses.map(c=>`<option value="${c.id}">${c.name}</option>`).join('');

    Modal.create('modal-create-class',
    ed ? `${UI.icon('edit')} Edit Class — ${ed.name}` : `${UI.icon('add')} New Class`,
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);margin-bottom:var(--sp-3)">
      <div>
        <label class="settings-label">Course</label>
        <select id="cls-course" class="form-input" onchange="clsAutoFill()">
          <option value="">— Select course —</option>
          ${courseOpts}
        </select>
      </div>
      <div>
        <label class="settings-label">Teacher</label>
        <select id="cls-teacher" class="form-input" onchange="clsAutoName()">
          <option value="">— Select teacher —</option>
          ${CONST.TEACHERS.map(t=>`<option>${t}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="settings-label">Branch</label>
        <select id="cls-branch" class="form-input" onchange="clsBranchChanged()">
          ${CONST.BRANCHES.map(b=>`<option>${b}</option>`).join('')}
        </select>
      </div>
      <div>
        <label class="settings-label">Room</label>
        <select id="cls-room" class="form-input">
          ${Utils.roomsFor(defBranch).map(r=>`<option>${r}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="margin-bottom:var(--sp-3)">
      <label class="settings-label">Days <span class="text-muted">(เฉพาะวันเปิดทำการของสาขา)</span></label>
      <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-top:var(--sp-1)">
        ${dayOpts.map(d=>`<label id="cls-day-lbl-${d}" style="cursor:pointer;display:flex;align-items:center;gap:4px;font-size:var(--fs-label-md)">
          <input type="checkbox" value="${d}" class="cls-day" onchange="clsAutoName()"> ${d}
        </label>`).join('')}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);margin-bottom:var(--sp-3)">
      <div>
        <label class="settings-label">Time Slot</label>
        <select id="cls-slot" class="form-input">${slotOpts}</select>
      </div>
      <div>
        <label class="settings-label">Class Type</label>
        <select id="cls-type" class="form-input">
          ${(window.SESSION_TYPES||[{id:'learning',label:'Learning · สอนปกติ'}]).map(t=>`<option value="${t.id}">${t.label}</option>`).join('')}
        </select>
      </div>
    </div>
    <div>
      <label class="settings-label">Class Name <span class="text-muted">(auto-generated, editable)</span></label>
      <input id="cls-name" type="text" class="form-input"
        placeholder="Auto-fill after selecting course, days, teacher…">
    </div>`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-create-class')">Cancel</button>
     <button class="btn btn-primary" onclick="saveClass()">${UI.icon(ed?'save':'add','sm')} ${ed?'Update Class':'Create Class'}</button>`,
    'sm');
    /* prefill ตอน edit — set branch ก่อนแล้วค่อย sync rooms/days */
    if (ed) {
      const set=(id,v)=>{const e=document.getElementById(id); if(e&&v!=null) e.value=v;};
      set('cls-branch', ed.branch);
      clsBranchChanged();
      set('cls-course', ed.courseId); set('cls-teacher', ed.teacher);
      set('cls-room', ed.room); set('cls-slot', ed.slotId);
      set('cls-type', ed.sessionType||'learning'); set('cls-name', ed.name);
      (ed.days||[]).forEach(d=>{
        const cb=document.getElementById('cls-day-lbl-'+d)?.querySelector('input');
        if(cb) cb.checked = true;
      });
    } else {
      clsBranchChanged();   // sync rooms + open days to default branch
    }
  };

  /* Branch changed → reload rooms + disable closed days (Settings-driven) */
  window.clsBranchChanged = function() {
    const branch = document.getElementById('cls-branch')?.value || CONST.BRANCHES[0];
    const roomEl = document.getElementById('cls-room');
    if (roomEl) roomEl.innerHTML = Utils.roomsFor(branch).map(r=>`<option>${r}</option>`).join('');
    const open = Utils.openDays(branch);
    ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].forEach(d=>{
      const lbl = document.getElementById('cls-day-lbl-'+d); if(!lbl) return;
      const cb  = lbl.querySelector('input');
      const closed = !open.includes(d);
      lbl.style.opacity = closed ? .35 : 1;
      lbl.style.pointerEvents = closed ? 'none' : '';
      if (closed && cb) { cb.checked = false; }
    });
    clsAutoName();
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

    if (!name)         { showToast('Enter a class name','error'); return; }
    if (!teacher)      { showToast('Select a teacher','error');   return; }
    if (!days.length)  { showToast('Select at least one day','error'); return; }

    const data = {
      name,
      subject:  course?.subjects[0]?.subject||'',
      grade:    course?.subjects[0]?.grade||'',
      teacher, branch, room, days, slotId, courseId: cid||'',
      sessionType: document.getElementById('cls-type')?.value||'learning',
    };
    const editId = window._clsEditId;
    if (editId) {
      const cls = classes.find(c=>c.id===editId);
      Object.assign(cls||{}, data);
      window._clsEditId = null;
      Modal.close('modal-create-class');
      renderKPI(); renderList();
      showToast(`Class "${name}" updated ✓`, 'success');
      return;
    }
    const newCls = { id:'cls-'+Date.now(), status:'active', ...data,
      students: [], createdAt: new Date().toISOString().slice(0,10) };
    classes.push(newCls);
    showToast(`Class "${name}" created ✓`, 'success');
    Modal.close('modal-create-class');
    renderKPI(); renderList();
    setTimeout(() => openAssignStudent(newCls.id), 300);
  };

})();
