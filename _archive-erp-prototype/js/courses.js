/* courses.js — NockERP Courses Module
   DB.courses = canonical catalog · Enrollment stats derived from DB.students */
(function () {

  const catalog  = DB.courses;
  const pricing  = DB.branchPricing;
  const students = DB.students;

  let fBranch = 'all', fType = 'all', searchVal = '';

  /* ── HELPERS ─────────────────────────────────────────────── */
  function _color(name) {
    const key = Object.keys(CONST.SUBJECT_COLOR).find(k => name.startsWith(k)) || '';
    const hex = {green:'#10b981',yellow:'#f59e0b',orange:'#f97316',blue:'#6366f1',purple:'#8b5cf6'};
    return hex[CONST.SUBJECT_COLOR[key]] || '#6366f1';
  }

  function _priceFor(hours, branch) {
    return (pricing[branch] || {})['h'+hours] || 0;
  }

  function _courseBasePrice(course, branch) {
    return course.subjects.reduce((sum,s) => sum + _priceFor(s.hours, branch), 0);
  }

  function _enrolledStudents(course) {
    const subjectNames = course.subjects.map(s => `${s.subject} ${s.grade}`);
    return students.filter(st =>
      st.courses.some(c => subjectNames.includes(c.name))
    );
  }

  function _kpi() {
    const total   = catalog.length;
    const singles = catalog.filter(c=>c.type==='single').length;
    const bundles = catalog.filter(c=>c.type==='bundle').length;
    const promos  = catalog.reduce((n,c)=>n+c.promotions.filter(p=>p.active).length, 0);
    const enrolled = new Set(catalog.flatMap(c=>_enrolledStudents(c).map(s=>s.id))).size;
    return { total, singles, bundles, promos, enrolled };
  }

  /* ── SHELL ───────────────────────────────────────────────── */
  document.getElementById('view-courses').innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Courses</div>
      <div class="page-sub" id="courses-sub">Loading…</div>
    </div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-secondary btn-sm" onclick="openPricingModal()">💰 Branch Pricing</button>
      <button class="btn btn-primary btn-sm" onclick="openCreateCourse()">＋ New Course</button>
    </div>
  </div>

  <!-- KPI -->
  <div id="courses-kpi" style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:14px"></div>

  <!-- FILTERS -->
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
    <input id="courses-search" placeholder="Search course…"
      style="border:1px solid #e5e7eb;border-radius:6px;padding:6px 10px;font-size:13px;outline:none;width:200px"
      oninput="coursesSearch(this.value)">
    <div style="display:flex;gap:4px">
      <div class="filter-chip active" data-cf="all"  onclick="courseFilter('all',this)">All Branches</div>
      ${CONST.BRANCHES.map(b=>`<div class="filter-chip" data-cf="${b}" onclick="courseFilter('${b}',this)">${b}</div>`).join('')}
    </div>
    <div style="display:flex;gap:4px;margin-left:8px">
      <div class="filter-chip active" data-ct="all"    onclick="courseTypeFilter('all',this)">All</div>
      <div class="filter-chip"        data-ct="single" onclick="courseTypeFilter('single',this)">Single</div>
      <div class="filter-chip"        data-ct="bundle" onclick="courseTypeFilter('bundle',this)">Bundle</div>
    </div>
  </div>

  <!-- LIST TABLE -->
  <div class="card" style="padding:0;overflow:hidden">
    <div class="table-wrap">
      <table id="courses-table">
        <thead>
          <tr>
            <th>Course</th>
            <th>Type</th>
            <th>Subjects</th>
            <th>Branches</th>
            <th>Pricing</th>
            <th>Enrolled</th>
            <th>Promotions</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="courses-tbody"></tbody>
      </table>
    </div>
  </div>`;

  /* ── KPI ─────────────────────────────────────────────────── */
  function renderKPI() {
    const k = _kpi();
    document.getElementById('courses-kpi').innerHTML = `
      <div class="card" style="padding:12px 14px">
        <div style="font-size:20px;font-weight:700;color:#6366f1">${k.total}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:1px">Total Courses</div>
      </div>
      <div class="card" style="padding:12px 14px">
        <div style="font-size:20px;font-weight:700;color:#10b981">${k.singles}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:1px">Single Subject</div>
      </div>
      <div class="card" style="padding:12px 14px">
        <div style="font-size:20px;font-weight:700;color:#8b5cf6">${k.bundles}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:1px">Bundle</div>
      </div>
      <div class="card" style="padding:12px 14px">
        <div style="font-size:20px;font-weight:700;color:#1a1d23">${k.enrolled}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:1px">Students Enrolled</div>
      </div>
      <div class="card" style="padding:12px 14px;${k.promos?'border-color:#f59e0b':''}">
        <div style="font-size:20px;font-weight:700;color:#f59e0b">${k.promos}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:1px">Active Promotions</div>
      </div>`;
  }

  /* ── LIST TABLE ──────────────────────────────────────────── */
  function renderList() {
    let list = [...catalog];
    if (fBranch !== 'all') list = list.filter(c => c.branches.includes(fBranch));
    if (fType  !== 'all')  list = list.filter(c => c.type === fType);
    if (searchVal)         list = list.filter(c => c.name.toLowerCase().includes(searchVal.toLowerCase())
      || c.subjects.some(s=>s.subject.toLowerCase().includes(searchVal.toLowerCase())));

    const sub = document.getElementById('courses-sub');
    if (sub) sub.textContent = `${list.length} course${list.length!==1?'s':''} in catalog`;

    document.getElementById('courses-tbody').innerHTML = list.map(c => {
      const col        = _color(c.name);
      const enrolled   = _enrolledStudents(c);
      const subStr     = c.subjects.map(s =>
        `<span class="badge" style="background:${_color(s.subject)}22;color:${_color(s.subject)};border:1px solid ${_color(s.subject)}33;font-size:10px">${s.subject} ${s.grade} · ${s.hours}h</span>`
      ).join(' ');
      const branchStr  = c.branches.map(b =>
        `<span class="badge badge-blue" style="font-size:10px">${b}</span>`
      ).join(' ');
      const priceStr   = c.branches.map(b => {
        const base  = _courseBasePrice(c, b);
        const promo = c.promotions.find(p=>p.active);
        const final = promo ? Math.round(base*(1-promo.discount/100)) : base;
        return `<div style="font-size:11px"><span style="color:#9ca3af">${b}:</span> <strong>฿${final.toLocaleString()}</strong>${promo?`<span style="color:#10b981"> (-${promo.discount}%)</span>`:''}</div>`;
      }).join('');
      const promoStr   = c.promotions.filter(p=>p.active).map(p =>
        `<div style="font-size:11px"><span class="badge badge-green" style="font-size:9px">-${p.discount}%</span> ${p.name}${p.expiry?` <span style="color:#9ca3af">·${p.expiry}</span>`:''}</div>`
      ).join('') || '<span style="color:#d1d5db;font-size:11px">—</span>';

      return `<tr style="cursor:pointer" onclick="openCourseDetail('${c.id}')">
        <td>
          <div style="display:flex;align-items:center;gap:8px">
            <div style="width:4px;height:36px;background:${col};border-radius:2px;flex-shrink:0"></div>
            <div>
              <div style="font-weight:600;font-size:13px;color:#1a1d23">${c.name}</div>
              ${c.suggestedTeacher?`<div style="font-size:11px;color:#9ca3af">${c.suggestedTeacher}</div>`:''}
            </div>
          </div>
        </td>
        <td><span class="badge ${c.type==='bundle'?'badge-purple':'badge-blue'}" style="font-size:10px">${c.type==='bundle'?'Bundle':'Single'}</span></td>
        <td>${subStr}</td>
        <td>${branchStr}</td>
        <td style="min-width:140px">${priceStr}</td>
        <td>
          <span style="font-size:13px;font-weight:600;color:#1a1d23">${enrolled.length}</span>
          <span style="font-size:11px;color:#9ca3af"> students</span>
        </td>
        <td>${promoStr}</td>
        <td onclick="event.stopPropagation()" style="white-space:nowrap">
          <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="openCourseDetail('${c.id}')">View</button>
          <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="openEditCourse('${c.id}')">✏️</button>
        </td>
      </tr>`;
    }).join('');
  }

  renderKPI();
  renderList();

  /* ── FILTERS ─────────────────────────────────────────────── */
  window.courseFilter = function(val, el) {
    fBranch = val;
    document.querySelectorAll('#view-courses [data-cf]').forEach(c=>c.classList.remove('active'));
    el.classList.add('active');
    renderList();
  };
  window.courseTypeFilter = function(val, el) {
    fType = val;
    document.querySelectorAll('#view-courses [data-ct]').forEach(c=>c.classList.remove('active'));
    el.classList.add('active');
    renderList();
  };
  window.coursesSearch = function(val) { searchVal = val; renderList(); };

  /* ── COURSE DETAIL MODAL ─────────────────────────────────── */
  window.openCourseDetail = function(id) {
    const c = catalog.find(x=>x.id===id);
    if (!c) return;
    const col      = _color(c.name);
    const enrolled = _enrolledStudents(c);
    const promo    = c.promotions.find(p=>p.active);

    const pricingRows = c.branches.map(b => {
      const base=_courseBasePrice(c,b), fin=promo?Math.round(base*(1-promo.discount/100)):base;
      return `<div class="info-item"><div class="label">${b}</div>
        ${promo?`<span style="font-size:11px;text-decoration:line-through;color:#9ca3af">฿${base.toLocaleString()}</span> `:''}
        <strong>฿${fin.toLocaleString()}</strong>${promo?` <span class="badge badge-green" style="font-size:9px">-${promo.discount}%</span>`:''}
      </div>`;
    }).join('');

    Modal.create(`modal-course-${id}`, `📖 ${c.name}`,
    `<div style="height:4px;background:${col};border-radius:4px;margin-bottom:16px"></div>
    <div style="display:flex;gap:8px;margin-bottom:16px;align-items:center">
      <span class="badge ${c.type==='bundle'?'badge-purple':'badge-blue'}">${c.type==='bundle'?'Bundle':'Single Subject'}</span>
      ${c.promotions.filter(p=>p.active).map(p=>`<span class="badge badge-green">🏷 ${p.name} -${p.discount}%</span>`).join('')}
    </div>
    <div class="modal-section-title">Subjects</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
      ${c.subjects.map(s=>`<div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px 14px;text-align:center">
        <div style="font-weight:600;font-size:13px">${s.subject} ${s.grade}</div>
        <div style="font-size:11px;color:#9ca3af">${s.hours}h.</div>
      </div>`).join('')}
    </div>
    <div class="modal-section-title">Pricing</div>
    <div class="info-grid" style="margin-bottom:16px">${pricingRows}</div>
    <div class="modal-section-title">Enrolled Students (${enrolled.length})</div>
    ${enrolled.length ? enrolled.map(s=>{
      const minLeft = Math.min(...s.courses.map(c=>c.left));
      const sm = CONST.STUDENT_STATUS[s.status];
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6">
        <span style="font-size:13px;font-weight:500;color:#6366f1;cursor:pointer"
          onclick="Modal.close('modal-course-${id}');openStudentModal('${s.id}')">${s.name}</span>
        <div style="display:flex;gap:6px">
          <span style="font-size:11px;color:#9ca3af">${minLeft} left</span>
          <span class="badge ${sm.cls}" style="font-size:9px">${sm.label}</span>
        </div>
      </div>`;
    }).join('') : '<div style="color:#9ca3af;font-size:13px;text-align:center;padding:16px">No students enrolled yet</div>'}
    ${c.promotions.length ? `<div class="modal-section-title" style="margin-top:16px">Promotions</div>
    ${c.promotions.map(p=>`<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f0fdf4;border-radius:6px;margin-bottom:6px;font-size:12px">
      <span class="badge badge-green">-${p.discount}%</span>
      <strong>${p.name}</strong>
      ${p.expiry?`<span style="color:#9ca3af">Expires ${p.expiry}</span>`:''}
      <span class="badge ${p.active?'badge-green':'badge-gray'}" style="font-size:9px;margin-left:auto">${p.active?'Active':'Inactive'}</span>
    </div>`).join('')}` : ''}`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-course-${id}')">Close</button>
     <button class="btn btn-secondary" onclick="Modal.close('modal-course-${id}');openEditCourse('${id}')">✏️ Edit</button>`,
    'modal-lg');
  };

  /* ── CREATE COURSE MODAL ─────────────────────────────────── */
  window.openCreateCourse = function() {
    const subjectOpts = CONST.SUBJECTS.map(s=>`<option>${s}</option>`).join('');
    const gradeOpts   = CONST.GRADES.map(g=>`<option>${g}</option>`).join('');
    const branchCheck = CONST.BRANCHES.map(b =>
      `<label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer"><input type="checkbox" value="${b}" class="new-course-branch"> ${b}</label>`
    ).join('');

    Modal.create('modal-create-course','＋ New Course',
    `<!-- TYPE TOGGLE -->
    <div style="display:flex;gap:0;margin-bottom:16px;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
      <button id="tab-single" onclick="crsToggleType('single')"
        style="flex:1;padding:8px;font-size:13px;font-weight:600;border:none;background:#6366f1;color:#fff;cursor:pointer">Single Subject</button>
      <button id="tab-bundle" onclick="crsToggleType('bundle')"
        style="flex:1;padding:8px;font-size:13px;font-weight:600;border:none;background:#fff;color:#6b7280;cursor:pointer">Bundle</button>
    </div>

    <!-- SINGLE FORM -->
    <div id="crs-single-form">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div>
          <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px">Subject</label>
          <select id="crs-subject" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:7px 10px;font-size:13px;outline:none"
            onchange="crsAutoName()">
            ${subjectOpts}
          </select>
        </div>
        <div>
          <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px">Grade</label>
          <select id="crs-grade" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:7px 10px;font-size:13px;outline:none"
            onchange="crsAutoName()">
            ${gradeOpts}
          </select>
        </div>
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px">Course Name <span style="color:#9ca3af">(auto-generated, editable)</span></label>
        <input id="crs-name-single" type="text" value="Math ป.1"
          style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:7px 10px;font-size:13px;outline:none;box-sizing:border-box">
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:6px">Hour Package</label>
        <div id="crs-hours-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">
          ${[24,48,72,96].map((h,i)=>`
          <label style="cursor:pointer">
            <input type="radio" name="crs-hours" value="${h}" ${i===0?'checked':''} onchange="crsUpdatePricing()">
            <div style="border:2px solid ${i===0?'#6366f1':'#e5e7eb'};border-radius:6px;padding:8px;text-align:center;margin-top:4px" id="crs-h-${h}">
              <div style="font-size:14px;font-weight:700;color:#1a1d23">${h}h</div>
            </div>
          </label>`).join('')}
        </div>
      </div>
    </div>

    <!-- BUNDLE FORM -->
    <div id="crs-bundle-form" style="display:none">
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px">Course Name <span style="color:#ef4444">*</span></label>
        <input id="crs-name-bundle" type="text" placeholder="e.g. สอบเข้า ม.1 Package"
          style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:7px 10px;font-size:13px;outline:none;box-sizing:border-box">
      </div>
      <div style="margin-bottom:8px">
        <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:6px">Subjects</label>
        <div id="bundle-subjects">${_bundleRowHtml()}</div>
        <button type="button" class="btn btn-secondary btn-sm" style="margin-top:4px" onclick="crsAddBundleRow()">＋ Add Subject</button>
      </div>
    </div>

    <!-- SHARED FIELDS -->
    <div style="margin-bottom:12px">
      <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:6px">Branches Offered</label>
      <div style="display:flex;gap:16px">${branchCheck}</div>
    </div>
    <div style="margin-bottom:12px">
      <label style="font-size:12px;color:#6b7280;display:block;margin-bottom:4px">Suggested Teacher <span style="color:#9ca3af">(optional)</span></label>
      <select id="crs-teacher" style="border:1px solid #e5e7eb;border-radius:6px;padding:7px 10px;font-size:13px;outline:none;width:100%">
        <option value="">— Select teacher —</option>
        ${CONST.TEACHERS.map(t=>`<option>${t}</option>`).join('')}
      </select>
    </div>

    <div id="crs-pricing-preview" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:8px 14px;margin-bottom:12px">
      <span style="font-size:11px;color:#6b7280;font-weight:600">Pricing: </span>
      <span id="crs-pricing-values" style="font-size:12px;color:#374151"></span>
    </div>
    <div style="border-top:1px solid #f3f4f6;padding-top:12px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <label style="font-size:12px;color:#6b7280;font-weight:600">Promotions</label>
        <button type="button" class="btn btn-secondary btn-sm" onclick="crsTogglePromo(this)">＋ Add Promo</button>
      </div>
      <div id="crs-promo-form" style="display:none;background:#f9fafb;border-radius:8px;padding:12px;border:1px solid #f3f4f6">
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px">
          <div>
            <label style="font-size:11px;color:#9ca3af;display:block;margin-bottom:2px">Name</label>
            <input id="crs-promo-name" type="text" placeholder="e.g. Early Bird"
              style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:6px 8px;font-size:12px;outline:none;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:11px;color:#9ca3af;display:block;margin-bottom:2px">Discount %</label>
            <input id="crs-promo-pct" type="number" min="1" max="50" value="10"
              style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:6px 8px;font-size:12px;outline:none;box-sizing:border-box">
          </div>
          <div>
            <label style="font-size:11px;color:#9ca3af;display:block;margin-bottom:2px">Expiry (optional)</label>
            <input id="crs-promo-expiry" type="date"
              style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:6px 8px;font-size:12px;outline:none;box-sizing:border-box">
          </div>
        </div>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-create-course')">Cancel</button>
     <button class="btn btn-primary" onclick="saveCourse()">Save Course</button>`,
    'modal-lg');

    crsAutoName();
    crsUpdatePricing();
  };

  window.crsToggleType = function(type) {
    document.getElementById('crs-single-form').style.display = type==='single' ? '' : 'none';
    document.getElementById('crs-bundle-form').style.display = type==='bundle' ? '' : 'none';
    document.getElementById('tab-single').style.background   = type==='single' ? '#6366f1' : '#fff';
    document.getElementById('tab-single').style.color        = type==='single' ? '#fff'    : '#6b7280';
    document.getElementById('tab-bundle').style.background   = type==='bundle' ? '#8b5cf6' : '#fff';
    document.getElementById('tab-bundle').style.color        = type==='bundle' ? '#fff'    : '#6b7280';
    crsUpdatePricing();
  };


  window.crsAutoName = function() {
    const sub   = document.getElementById('crs-subject')?.value || '';
    const grade = document.getElementById('crs-grade')?.value   || '';
    const el    = document.getElementById('crs-name-single');
    if (el) el.value = `${sub} ${grade}`;
    crsUpdatePricing();
  };

  window.crsUpdatePricing = function() {
    const preview = document.getElementById('crs-pricing-values');
    if (!preview) return;
    const isBundle = document.getElementById('crs-bundle-form')?.style.display !== 'none';
    let hours = 24;
    if (!isBundle) {
      const checked = document.querySelector('input[name="crs-hours"]:checked');
      hours = checked ? parseInt(checked.value) : 24;
      [24,48,72,96].forEach(h => {
        const box = document.getElementById(`crs-h-${h}`);
        if (box) box.style.borderColor = h===hours ? '#6366f1' : '#e5e7eb';
      });
    }
    const branches = [...document.querySelectorAll('.new-course-branch:checked')].map(el=>el.value);
    if (!branches.length) {
      preview.innerHTML = '<span style="color:#9ca3af">Select a branch to see pricing</span>';
      return;
    }
    preview.innerHTML = branches.map(b => {
      const price = _priceFor(hours, b);
      return `<span style="margin-right:16px"><strong>${b}:</strong> ฿${price.toLocaleString()}</span>`;
    }).join('');
  };

  function _bundleRowHtml() {
    const ss = CONST.SUBJECTS.map(s=>`<option>${s}</option>`).join('');
    const gs = CONST.GRADES.map(g=>`<option>${g}</option>`).join('');
    const hs = [24,48,72,96].map(h=>`<option value="${h}">${h}h</option>`).join('');
    const sel = x=>`<select style="border:1px solid #e5e7eb;border-radius:6px;padding:6px 8px;font-size:12px;outline:none">${x}</select>`;
    return `<div class="bundle-row" style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;margin-bottom:6px">${sel(ss)}${sel(gs)}${sel(hs)}</div>`;
  }
  window.crsAddBundleRow = function() {
    const el = document.getElementById('bundle-subjects');
    if (el) el.insertAdjacentHTML('beforeend', _bundleRowHtml());
  };

  window.crsTogglePromo = function(btn) {
    const form = document.getElementById('crs-promo-form');
    const show = form.style.display === 'none';
    form.style.display = show ? '' : 'none';
    btn.textContent    = show ? '✕ Remove Promo' : '＋ Add Promo';
  };

  window.saveCourse = function() {
    const isBundle = document.getElementById('crs-bundle-form')?.style.display !== 'none';
    const name = isBundle
      ? document.getElementById('crs-name-bundle')?.value.trim()
      : document.getElementById('crs-name-single')?.value.trim();
    if (!name) { showToast('Course name is required','error'); return; }
    if (isBundle && !document.getElementById('crs-name-bundle')?.value.trim()) {
      showToast('Bundle course requires a name','error'); return;
    }
    const branches = [...document.querySelectorAll('.new-course-branch:checked')].map(el=>el.value);
    if (!branches.length) { showToast('Select at least one branch','error'); return; }

    const subjects = [];
    if (!isBundle) {
      const h = parseInt(document.querySelector('input[name="crs-hours"]:checked')?.value||24);
      subjects.push({ subject:document.getElementById('crs-subject').value, grade:document.getElementById('crs-grade').value, hours:h });
    } else {
      document.querySelectorAll('#bundle-subjects .bundle-row').forEach(row => {
        const sels = row.querySelectorAll('select');
        subjects.push({ subject:sels[0].value, grade:sels[1].value, hours:parseInt(sels[2].value) });
      });
    }
    const promoName  = document.getElementById('crs-promo-name')?.value.trim();
    const promotions = promoName ? [{
      id:'promo-'+Date.now(), name:promoName,
      discount: parseInt(document.getElementById('crs-promo-pct')?.value||10),
      expiry:   document.getElementById('crs-promo-expiry')?.value || null, active:true,
    }] : [];
    catalog.push({ id:'crs-'+Date.now(), name, type:isBundle?'bundle':'single', subjects, branches,
      suggestedTeacher: document.getElementById('crs-teacher')?.value||'', promotions,
      createdAt: new Date().toISOString().slice(0,10) });
    showToast(`Course "${name}" created ✓`, 'success');
    Modal.close('modal-create-course');
    renderKPI(); renderList();
  };

  window.openEditCourse = function(id) { showToast('Edit course coming soon', 'info'); };

  /* ── BRANCH PRICING MODAL ────────────────────────────────── */
  window.openPricingModal = function() {
    const inp = (b,h,v) => `<td><input type="number" value="${v}" id="price-${b}-${h}" style="width:80px;border:1px solid #e5e7eb;border-radius:6px;padding:5px 8px;font-size:13px;outline:none;text-align:right"></td>`;
    const rows = CONST.BRANCHES.map(b => {
      const p = pricing[b]||{};
      return `<tr><td style="font-weight:600">${b}</td>${[24,48,72,96].map(h=>inp(b,h,p['h'+h]||0)).join('')}</tr>`;
    }).join('');
    Modal.create('modal-pricing','💰 Branch Pricing',
    `<p style="font-size:12px;color:#6b7280;margin-bottom:16px">Base prices per hour package · per branch. Bundle = sum of subjects.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Branch</th><th>24h (฿)</th><th>48h (฿)</th><th>72h (฿)</th><th>96h (฿)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-pricing')">Cancel</button>
     <button class="btn btn-primary" onclick="savePricing()">Save Pricing</button>`,
    'sm');
  };

  window.savePricing = function() {
    CONST.BRANCHES.forEach(b => {
      if (!pricing[b]) pricing[b] = {};
      [24,48,72,96].forEach(h => { pricing[b]['h'+h] = parseInt(document.getElementById(`price-${b}-${h}`)?.value||0); });
    });
    showToast('Pricing saved ✓', 'success');
    Modal.close('modal-pricing');
    renderList();
  };

})();
