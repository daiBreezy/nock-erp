/* courses.js — NockERP Courses Module
   DB.courses = canonical catalog · Enrollment stats derived from DB.students */
(function () {

  const catalog  = DB.courses;
  const pricing  = DB.branchPricing;
  const students = DB.students;

  let fBranch = 'all', fType = 'all', fSubject = 'all', fGrade = 'all', fPkg = 'all';
  let sortMode = 'used', searchVal = '';

  /* ── HELPERS ─────────────────────────────────────────────── */
  function _colorVar(name) {
    const key = Object.keys(CONST.SUBJECT_COLOR).find(k => name.startsWith(k)) || '';
    const varMap = { green:'var(--md-success)', yellow:'var(--md-warning)',
                     orange:'var(--md-tertiary)', blue:'var(--md-primary)', purple:'var(--md-secondary)' };
    return varMap[CONST.SUBJECT_COLOR[key]] || 'var(--md-primary)';
  }
  function _badgeKey(name) {
    const key = Object.keys(CONST.SUBJECT_COLOR).find(k => name.startsWith(k)) || '';
    return CONST.SUBJECT_COLOR[key] || 'blue';
  }
  function _priceFor(hours, branch) {
    return (pricing[branch] || {})['h'+hours] || 0;
  }
  function _courseBasePrice(course, branch) {
    // Bundle courses use billingBlockPrice, not package pricing
    if (course.courseType === 'bundle' || course.type === 'bundle') {
      return course.billingBlockPrice || 0;
    }
    // 3-tier lookup: course override → Settings Price Matrix → tier default
    return course.subjects.reduce((sum,s) =>
      sum + Utils.coursePrice({courseId:course.id, subject:s.subject, grade:s.grade, hours:s.hours, branch}), 0);
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
  ${UI.pageHeader('Courses', '<span id="courses-sub">Loading…</span>',
    `<div style="display:flex;gap:var(--sp-2)">
      <button class="btn btn-secondary btn-sm" onclick="openPricingModal()">${UI.icon('payments','sm')} Branch Pricing</button>
      <button class="btn btn-primary btn-sm" onclick="openCreateCourse()">${UI.icon('add','sm')} New Course</button>
    </div>`
  )}

  <div id="courses-kpi"></div>

  <div class="filter-bar">
    <input id="courses-search" class="form-input" placeholder="Search course…"
      style="width:200px;height:32px;font-size:var(--fs-label-md)"
      oninput="coursesSearch(this.value)">
    <div class="filter-chip active" data-cf="all"  onclick="courseFilter('all',this)">All Branches</div>
    ${CONST.BRANCHES.map(b=>`<div class="filter-chip" data-cf="${b}" onclick="courseFilter('${b}',this)">${b}</div>`).join('')}
    <div style="width:1px;background:var(--md-outline-variant);height:20px;margin:0 var(--sp-1)"></div>
    <div class="filter-chip active" data-ct="all"    onclick="courseTypeFilter('all',this)">All</div>
    <div class="filter-chip"        data-ct="single" onclick="courseTypeFilter('single',this)">Single</div>
    <div class="filter-chip"        data-ct="bundle" onclick="courseTypeFilter('bundle',this)">Bundle</div>
    <div style="width:1px;background:var(--md-outline-variant);height:20px;margin:0 var(--sp-1)"></div>
    <select id="crs-sort" class="form-input" style="height:32px;font-size:var(--fs-label-md);width:auto"
            onchange="courseSort(this.value)">
      <option value="used">Most Used</option>
      <option value="nameaz">Name A→Z</option>
      <option value="nameza">Name Z→A</option>
    </select>
  </div>
  <div class="filter-bar" style="margin-top:calc(var(--sp-2) * -1)">
    <div class="filter-chip active" data-cs="all" onclick="courseSubjFilter('all',this)">All Subjects</div>
    ${Utils.subjectsFor().map(s=>`<div class="filter-chip" data-cs="${s}" onclick="courseSubjFilter('${s}',this)">${s}</div>`).join('')}
    <div style="width:1px;background:var(--md-outline-variant);height:20px;margin:0 var(--sp-1)"></div>
    <div class="filter-chip active" data-cp="all" onclick="coursePkgFilter('all',this)">All Packages</div>
    ${(DB.packages||[]).filter(p=>p.type==='hour'&&p.active).map(p=>`<div class="filter-chip" data-cp="${p.hours}" onclick="coursePkgFilter(${p.hours},this)">${p.hours}h</div>`).join('')}
  </div>

  <div class="card">
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
    document.getElementById('courses-kpi').innerHTML = UI.kpiGrid([
      { icon:'menu_book',              label:'Total Courses',     value:k.total,    color:'',        sub:'In catalog'          },
      { icon:'book',                   label:'Single Subject',    value:k.singles,  color:'success', sub:'Subject courses'     },
      { icon:'collections_bookmark',   label:'Bundles',           value:k.bundles,  color:'tertiary',sub:'Multi-subject'       },
      { icon:'school',                 label:'Students Enrolled', value:k.enrolled, color:'',        sub:'Across all courses'  },
      { icon:'local_offer',            label:'Active Promotions', value:k.promos,
        color: k.promos ? 'warning' : 'success',
        sub: k.promos ? 'Discounts running' : 'No active promos' },
    ]);
    const grid = document.querySelector('#courses-kpi .kpi-grid');
    if (grid) grid.style.gridTemplateColumns = 'repeat(5,1fr)';
  }

  /* ── LIST TABLE ──────────────────────────────────────────── */
  function renderList() {
    let list = [...catalog];
    if (fBranch  !== 'all') list = list.filter(c => c.branches.includes(fBranch));
    if (fType    !== 'all') list = list.filter(c => c.type === fType);
    if (fSubject !== 'all') list = list.filter(c => c.subjects.some(s => s.subject === fSubject));
    if (fPkg     !== 'all') list = list.filter(c => c.subjects.some(s => String(s.hours) === String(fPkg)));
    if (searchVal) list = list.filter(c =>
      c.name.toLowerCase().includes(searchVal.toLowerCase()) ||
      c.subjects.some(s=>s.subject.toLowerCase().includes(searchVal.toLowerCase()))
    );
    if (sortMode === 'nameaz') list.sort((a,b)=>a.name.localeCompare(b.name));
    else if (sortMode === 'nameza') list.sort((a,b)=>b.name.localeCompare(a.name));
    else list.sort((a,b) => _enrolledStudents(b).length - _enrolledStudents(a).length);

    const sub = document.getElementById('courses-sub');
    if (sub) sub.textContent = `${list.length} course${list.length!==1?'s':''} in catalog`;

    const tbody = document.getElementById('courses-tbody');
    if (!tbody) return;

    if (!list.length) {
      tbody.innerHTML = `<tr><td colspan="8">${UI.emptyState('menu_book','No courses match','Try adjusting filters')}</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(c => {
      const colVar   = _colorVar(c.name);
      const enrolled = _enrolledStudents(c);
      const sVis     = c.subjects.slice(0,2);
      const sRest    = c.subjects.length - 2;

      const subStr = `<div style="display:flex;gap:var(--sp-1);align-items:center;flex-wrap:nowrap">
        ${sVis.map(s => UI.badge(`${s.subject} · ${s.hours}h`, _badgeKey(s.subject))).join('')}
        ${sRest>0 ? `<span onclick="event.stopPropagation();openCourseDetail('${c.id}')">${UI.badge('+'+sRest,'gray')}</span>` : ''}
      </div>`;

      const branchStr = Utils.chipList(c.branches.map(b=>({label:b,cls:'badge-blue'})), 2);

      const promo = c.promotions.find(p=>p.active);
      const isBundle = (c.courseType||c.type) === 'bundle';
      const priceStr = c.branches.map(b => {
        const base  = _courseBasePrice(c, b);
        const final = promo ? Math.round(base*(1-promo.discount/100)) : base;
        const suffix = isBundle ? '/block' : '';
        return `<div style="font-size:var(--fs-label-sm)"><span class="text-muted">${b}:</span> <strong>฿${final.toLocaleString()}</strong>${suffix}${promo?` <span class="text-success">(-${promo.discount}%)</span>`:''}</div>`;
      }).join('');

      const promoStr = c.promotions.filter(p=>p.active).map(p =>
        `<div style="font-size:var(--fs-label-sm)">${UI.badge(`-${p.discount}%`,'green')} ${p.name}${p.expiry?` <span class="text-muted">·${p.expiry}</span>`:''}</div>`
      ).join('') || `<span class="text-muted">—</span>`;

      return `<tr style="cursor:pointer" onclick="openCourseDetail('${c.id}')">
        <td>
          <div style="display:flex;align-items:center;gap:var(--sp-2)">
            <div style="width:4px;height:36px;background:${colVar};border-radius:2px;flex-shrink:0"></div>
            <div>
              <div style="font-weight:600;font-size:var(--fs-label-md);color:var(--md-on-surface)">${c.name}</div>
              ${c.suggestedTeacher?`<div class="text-muted" style="font-size:var(--fs-label-sm)">${c.suggestedTeacher}</div>`:''}
            </div>
          </div>
        </td>
        <td>${UI.badge((c.courseType||c.type)==='bundle'?'Bundle':'Single', (c.courseType||c.type)==='bundle'?'purple':'blue')}</td>
        <td>${subStr}</td>
        <td>${branchStr}</td>
        <td style="min-width:140px">${priceStr}</td>
        <td>
          <span style="font-size:var(--fs-label-md);font-weight:600;color:var(--md-on-surface)">${enrolled.length}</span>
          <span class="text-muted" style="font-size:var(--fs-label-sm)"> students</span>
        </td>
        <td>${promoStr}</td>
        <td onclick="event.stopPropagation()" style="white-space:nowrap">
          <button class="btn btn-secondary btn-sm" onclick="openCourseDetail('${c.id}')">View</button>
          ${Utils.moreMenu('crs-'+c.id,[{label:`${UI.icon('edit','sm')} Edit`,onclick:`openEditCourse('${c.id}')`}])}
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
  window.coursesSearch     = function(val) { searchVal = val; renderList(); };
  window.courseSubjFilter  = function(val, el) {
    fSubject = val;
    document.querySelectorAll('#view-courses [data-cs]').forEach(c=>c.classList.remove('active'));
    el.classList.add('active'); renderList();
  };
  window.coursePkgFilter   = function(val, el) {
    fPkg = val;
    document.querySelectorAll('#view-courses [data-cp]').forEach(c=>c.classList.remove('active'));
    el.classList.add('active'); renderList();
  };
  window.courseSort        = function(val) { sortMode = val; renderList(); };

  /* ── COURSE DETAIL MODAL ─────────────────────────────────── */
  window.openCourseDetail = function(id) {
    const c = catalog.find(x=>x.id===id);
    if (!c) return;
    const colVar   = _colorVar(c.name);
    const enrolled = _enrolledStudents(c);
    const promo    = c.promotions.find(p=>p.active);

    const pricingRows = c.branches.map(b => {
      const base=_courseBasePrice(c,b), fin=promo?Math.round(base*(1-promo.discount/100)):base;
      return `<div class="info-item"><div class="label">${b}</div>
        ${promo?`<span class="text-muted" style="text-decoration:line-through;font-size:var(--fs-label-sm)">฿${base.toLocaleString()}</span> `:''}
        <strong>฿${fin.toLocaleString()}</strong>${promo?` ${UI.badge(`-${promo.discount}%`,'green')}`:''}
      </div>`;
    }).join('');

    /* ⭐ ราคาเฉพาะ course นี้ (override ทับ Settings → Price Matrix) */
    const isBundleC = c.courseType==='bundle' || c.type==='bundle';
    const priceMatrix = isBundleC ? '' : `
      <div class="modal-section-title">Course Pricing <span class="text-muted" style="font-weight:400;font-size:11px">(default มาจาก Settings → Price Matrix — พิมพ์ทับ = ราคาเฉพาะ course นี้)</span></div>
      <div class="table-wrap" style="margin-bottom:var(--sp-4)"><table>
        <thead><tr><th>Package</th>${c.branches.map(b=>`<th>${b} (฿)</th>`).join('')}</tr></thead>
        <tbody>
          ${(DB.packages||[]).filter(p=>p.type==='hour'&&p.active).map(p=>{
            const pr=(c.prices||[]).find(x=>x.hours===p.hours);
            const s0=c.subjects[0]||{};
            return `<tr><td>${p.hours}h</td>
              ${c.branches.map(b=>{
                const eff = Utils.coursePrice({courseId:c.id, subject:s0.subject, grade:s0.grade, hours:p.hours, branch:b});
                const isOverride = !!pr;
                return `<td><input type="number" class="settings-input" style="width:96px;padding:4px 8px;font-size:12px;
                    font-weight:${isOverride?'600':'400'};color:${isOverride?'var(--md-on-surface)':'var(--md-on-surface-variant)'}"
                  value="${eff}" min="0"
                  onchange="crsSetMatrixPrice('${c.id}','${p.id}',${p.hours},'${b}',this.value)"></td>`;
              }).join('')}
            </tr>`;
          }).join('')}
        </tbody>
      </table></div>`;

    Modal.create(`modal-course-${id}`, `${UI.icon('menu_book')} ${c.name}`,
    `<div style="height:4px;background:${colVar};border-radius:4px;margin-bottom:var(--sp-4)"></div>
    <div style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-4);align-items:center">
      ${UI.badge(c.type==='bundle'?'Bundle':'Single Subject', c.type==='bundle'?'purple':'blue')}
      ${c.promotions.filter(p=>p.active).map(p=>`${UI.badge(`${UI.icon('local_offer','sm')} ${p.name} -${p.discount}%`,'green')}`).join('')}
    </div>
    <div class="modal-section-title">Subjects</div>
    <div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;margin-bottom:var(--sp-4)">
      ${c.subjects.map(s=>`<div style="border:1px solid var(--md-outline-variant);border-radius:var(--shape-md);
                                       padding:var(--sp-2) var(--sp-3);text-align:center">
        <div style="font-weight:600;font-size:var(--fs-label-md)">${s.subject} ${s.grade}</div>
        <div class="text-muted" style="font-size:var(--fs-label-sm)">${s.hours}h.</div>
      </div>`).join('')}
    </div>
    <div class="modal-section-title">Pricing</div>
    <div class="info-grid" style="margin-bottom:var(--sp-4)">${pricingRows}</div>
    ${priceMatrix}
    <div class="modal-section-title">Enrolled Students (${enrolled.length})</div>
    ${enrolled.length ? enrolled.map(s=>{
      const minLeft = Math.min(...s.courses.map(c=>c.left));
      const sm = CONST.STUDENT_STATUS[s.status];
      return `<div style="display:flex;align-items:center;justify-content:space-between;
                          padding:var(--sp-2) 0;border-bottom:1px solid var(--md-outline-variant)">
        <span class="text-primary" style="font-size:var(--fs-label-md);font-weight:500;cursor:pointer"
          onclick="Modal.close('modal-course-${id}');openStudentModal('${s.id}')">${s.name}</span>
        <div style="display:flex;gap:var(--sp-2)">
          <span class="text-muted" style="font-size:var(--fs-label-sm)">${minLeft} left</span>
          ${UI.badge(sm.label, (sm.cls||'badge-gray').replace('badge-',''))}
        </div>
      </div>`;
    }).join('') : UI.emptyState('school','No students enrolled yet')}
    ${c.promotions.length ? `<div class="modal-section-title" style="margin-top:var(--sp-4)">Promotions</div>
    ${c.promotions.map(p=>`<div style="display:flex;align-items:center;gap:var(--sp-2);
                                       padding:var(--sp-2) var(--sp-3);
                                       background:var(--md-surface-mid);border-radius:var(--shape-sm);
                                       margin-bottom:var(--sp-1);font-size:var(--fs-label-sm)">
      ${UI.badge(`-${p.discount}%`,'green')}
      <strong>${p.name}</strong>
      ${p.expiry?`<span class="text-muted">Expires ${p.expiry}</span>`:''}
      <span style="margin-left:auto">${UI.badge(p.active?'Active':'Inactive',p.active?'green':'gray')}</span>
    </div>`).join('')}` : ''}`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-course-${id}')">Close</button>
     <button class="btn btn-secondary" onclick="Modal.close('modal-course-${id}');openEditCourse('${id}')">${UI.icon('edit','sm')} Edit</button>`,
    'modal-lg');
  };

  /* ── CREATE COURSE MODAL ─────────────────────────────────── */
  window.openCreateCourse = function(editId) {
    window._crsEditId = editId || null;
    const ed = editId ? catalog.find(c=>c.id===editId) : null;
    const subjectOpts = Utils.subjectsFor().map(s=>`<option>${s}</option>`).join('');
    const gradeOpts   = CONST.GRADES.map(g=>`<option>${g}</option>`).join('');
    const branchCheck = (DB.branchSettings||[]).filter(b=>b.active!==false).map(b => b.branch).map(b =>
      `<label style="display:flex;align-items:center;gap:var(--sp-1);font-size:var(--fs-label-md);cursor:pointer">
        <input type="checkbox" value="${b}" class="new-course-branch" ${ed&&(ed.branches||[]).includes(b)?'checked':''}> ${b}
      </label>`
    ).join('');

    Modal.create('modal-create-course',
    ed ? `${UI.icon('edit')} Edit Course — ${ed.name}` : `${UI.icon('add')} New Course`,
    `<div style="display:flex;gap:0;margin-bottom:var(--sp-4);border:1px solid var(--md-outline-variant);border-radius:var(--shape-md);overflow:hidden">
      <button id="tab-single" onclick="crsToggleType('single')"
        style="flex:1;padding:var(--sp-2);font-size:var(--fs-label-md);font-weight:600;border:none;
               background:var(--md-primary);color:#fff;cursor:pointer">Single Subject</button>
      <button id="tab-bundle" onclick="crsToggleType('bundle')"
        style="flex:1;padding:var(--sp-2);font-size:var(--fs-label-md);font-weight:600;border:none;
               background:var(--md-surface);color:var(--md-on-surface-variant);cursor:pointer">Bundle</button>
    </div>

    <div id="crs-single-form">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);margin-bottom:var(--sp-3)">
        <div>
          <label class="settings-label">Subject</label>
          <select id="crs-subject" class="form-input" onchange="crsAutoName()">${subjectOpts}</select>
        </div>
        <div>
          <label class="settings-label">Grade</label>
          <select id="crs-grade" class="form-input" onchange="crsAutoName()">${gradeOpts}</select>
        </div>
      </div>
      <div style="margin-bottom:var(--sp-3)">
        <label class="settings-label">Course Name <span class="text-muted">(auto-generated, editable)</span></label>
        <input id="crs-name-single" type="text" class="form-input" value="Math ป.1">
      </div>
      <div style="margin-bottom:var(--sp-3)">
        <label class="settings-label">Hour Package</label>
        <div id="crs-hours-grid" style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--sp-2)">
          ${[24,48,72,96].map((h,i)=>`
          <label style="cursor:pointer">
            <input type="radio" name="crs-hours" value="${h}" ${i===0?'checked':''} onchange="crsUpdatePricing()">
            <div style="border:2px solid ${i===0?'var(--md-primary)':'var(--md-outline-variant)'};
                        border-radius:var(--shape-sm);padding:var(--sp-2);text-align:center;margin-top:var(--sp-1)"
                 id="crs-h-${h}">
              <div style="font-size:var(--fs-label-lg);font-weight:700;color:var(--md-on-surface)">${h}h</div>
            </div>
          </label>`).join('')}
        </div>
      </div>
    </div>

    <div id="crs-bundle-form" style="display:none">
      <div style="margin-bottom:var(--sp-3)">
        <label class="settings-label">Course Name <span class="text-error">*</span></label>
        <input id="crs-name-bundle" type="text" class="form-input" placeholder="e.g. สอบเข้า ม.1 Package">
      </div>
      <div style="margin-bottom:var(--sp-2)">
        <label class="settings-label">Subjects</label>
        <div id="bundle-subjects">${_bundleRowHtml()}</div>
        <button type="button" class="btn btn-secondary btn-sm" style="margin-top:var(--sp-1)"
          onclick="crsAddBundleRow()">${UI.icon('add','sm')} Add Subject</button>
      </div>
    </div>

    <div style="margin-bottom:var(--sp-3)">
      <label class="settings-label">Branches Offered</label>
      <div style="display:flex;gap:var(--sp-4);margin-top:var(--sp-1)">${branchCheck}</div>
    </div>
    <div style="margin-bottom:var(--sp-3)">
      <label class="settings-label">Suggested Teacher <span class="text-muted">(optional)</span></label>
      <select id="crs-teacher" class="form-input">
        <option value="">— Select teacher —</option>
        ${CONST.TEACHERS.map(t=>`<option>${t}</option>`).join('')}
      </select>
    </div>

    <div id="crs-pricing-preview" style="background:var(--md-surface-mid);border:1px solid var(--md-outline-variant);
         border-radius:var(--shape-sm);padding:var(--sp-2) var(--sp-3);margin-bottom:var(--sp-3)">
      <span class="text-muted" style="font-size:var(--fs-label-sm);font-weight:600">Pricing: </span>
      <span id="crs-pricing-values" style="font-size:var(--fs-label-md)"></span>
    </div>
    <div style="border-top:1px solid var(--md-outline-variant);padding-top:var(--sp-3)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--sp-2)">
        <label class="settings-label">Promotions</label>
        <button type="button" class="btn btn-secondary btn-sm" onclick="crsTogglePromo(this)">${UI.icon('add','sm')} Add Promo</button>
      </div>
      <div id="crs-promo-form" style="display:none;background:var(--md-surface-mid);border-radius:var(--shape-sm);
           padding:var(--sp-3);border:1px solid var(--md-outline-variant)">
        <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:var(--sp-2)">
          <div>
            <label class="settings-label">Name</label>
            <input id="crs-promo-name" type="text" class="form-input" placeholder="e.g. Early Bird">
          </div>
          <div>
            <label class="settings-label">Discount %</label>
            <input id="crs-promo-pct" type="number" class="form-input" min="1" max="50" value="10">
          </div>
          <div>
            <label class="settings-label">Expiry (optional)</label>
            <input id="crs-promo-expiry" type="date" class="form-input">
          </div>
        </div>
      </div>
    </div>`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-create-course')">Cancel</button>
     ${ed?`<button class="btn btn-secondary" onclick="crsDelete('${ed.id}')">${UI.icon('delete','sm')}</button>`:''}
     <button class="btn btn-primary" onclick="saveCourse()">${UI.icon('save','sm')} ${ed?'Update Course':'Save Course'}</button>`,
    'modal-lg');

    /* prefill ตอน edit */
    if (ed) {
      const isB = ed.type === 'bundle';
      crsToggleType(isB ? 'bundle' : 'single');
      const set = (id,v) => { const e=document.getElementById(id); if(e&&v!=null) e.value=v; };
      set(isB?'crs-name-bundle':'crs-name-single', ed.name);
      set('crs-teacher', ed.suggestedTeacher);
      if (!isB && ed.subjects?.[0]) {
        set('crs-subject', ed.subjects[0].subject);
        set('crs-grade',   ed.subjects[0].grade);
        const h = document.querySelector(`input[name="crs-hours"][value="${ed.subjects[0].hours}"]`);
        if (h) h.checked = true;
      }
      const p = (ed.promotions||[])[0];
      if (p) { set('crs-promo-name', p.name); set('crs-promo-pct', p.discount); set('crs-promo-expiry', p.expiry); }
    }
    crsAutoName();
    crsUpdatePricing();
  };
  window.crsDelete = function(id) {
    const i = catalog.findIndex(c=>c.id===id); if (i<0) return;
    const used = (DB.classes||[]).some(c=>c.courseId===id);
    if (used) return showToast('มีคลาสใช้คอร์สนี้อยู่ — ลบไม่ได้','warning');
    const name = catalog[i].name;
    catalog.splice(i,1);
    Modal.close('modal-create-course'); renderKPI(); renderList();
    showToast(`ลบคอร์ส "${name}" แล้ว`,'info');
  };

  window.crsToggleType = function(type) {
    document.getElementById('crs-single-form').style.display = type==='single' ? '' : 'none';
    document.getElementById('crs-bundle-form').style.display = type==='bundle' ? '' : 'none';
    document.getElementById('tab-single').style.background   = type==='single' ? 'var(--md-primary)'  : 'var(--md-surface)';
    document.getElementById('tab-single').style.color        = type==='single' ? '#fff'               : 'var(--md-on-surface-variant)';
    document.getElementById('tab-bundle').style.background   = type==='bundle' ? 'var(--md-secondary)': 'var(--md-surface)';
    document.getElementById('tab-bundle').style.color        = type==='bundle' ? '#fff'               : 'var(--md-on-surface-variant)';
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
        if (box) box.style.borderColor = h===hours ? 'var(--md-primary)' : 'var(--md-outline-variant)';
      });
    }
    const branches = [...document.querySelectorAll('.new-course-branch:checked')].map(el=>el.value);
    if (!branches.length) {
      preview.innerHTML = `<span class="text-muted">Select a branch to see pricing</span>`;
      return;
    }
    const subjSel  = document.getElementById('crs-subject')?.value || '';
    const gradeSel = document.getElementById('crs-grade')?.value || '';
    preview.innerHTML = branches.map(b => {
      const price = Utils.coursePrice({subject:subjSel, grade:gradeSel, hours, branch:b});
      return `<span style="margin-right:var(--sp-4)"><strong>${b}:</strong> ฿${price.toLocaleString()}</span>`;
    }).join('');
  };

  /* ⭐ Price Matrix editor — เขียนกลับ course.prices */
  window.crsSetMatrixPrice = function(courseId, packageId, hours, branch, value) {
    const c = DB.courses.find(x=>x.id===courseId); if(!c) return;
    const price = parseInt(value)||0;
    if (!c.prices) c.prices = [];
    let pr = c.prices.find(x=>x.hours===hours);
    if (!pr) { pr = {packageId, hours, price, overrides:{}}; c.prices.push(pr); }
    if (c.branches[0] === branch) pr.price = price;   // สาขาแรก = base price
    else {
      if (!pr.overrides) pr.overrides = {};
      if (price === pr.price) delete pr.overrides[branch];
      else pr.overrides[branch] = price;
    }
    showToast(`${c.name} · ${hours}h @ ${branch} = ${Utils.currency(price)} ✓`,'success');
  };

  function _bundleRowHtml() {
    const ss = Utils.subjectsFor().map(s=>`<option>${s}</option>`).join('');
    const gs = CONST.GRADES.map(g=>`<option>${g}</option>`).join('');
    const hs = (DB.packages||[]).filter(p=>p.type==='hour'&&p.active).map(p=>`<option value="${p.hours}">${p.hours}h</option>`).join('');
    return `<div class="bundle-row" style="display:grid;grid-template-columns:1fr 1fr auto;gap:var(--sp-2);margin-bottom:var(--sp-1)">
      <select class="form-input" style="font-size:var(--fs-label-sm)">${ss}</select>
      <select class="form-input" style="font-size:var(--fs-label-sm)">${gs}</select>
      <select class="form-input" style="font-size:var(--fs-label-sm)">${hs}</select>
    </div>`;
  }
  window.crsAddBundleRow = function() {
    const el = document.getElementById('bundle-subjects');
    if (el) el.insertAdjacentHTML('beforeend', _bundleRowHtml());
  };

  window.crsTogglePromo = function(btn) {
    const form = document.getElementById('crs-promo-form');
    const show = form.style.display === 'none';
    form.style.display = show ? '' : 'none';
    btn.innerHTML = show
      ? `${UI.icon('close','sm')} Remove Promo`
      : `${UI.icon('add','sm')} Add Promo`;
  };

  window.saveCourse = function() {
    const isBundle = document.getElementById('crs-bundle-form')?.style.display !== 'none';
    const name = isBundle
      ? document.getElementById('crs-name-bundle')?.value.trim()
      : document.getElementById('crs-name-single')?.value.trim();
    if (!name) { showToast('Course name is required','error'); return; }
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
    const data = { name, type:isBundle?'bundle':'single', subjects, branches,
      suggestedTeacher: document.getElementById('crs-teacher')?.value||'', promotions };
    const editId = window._crsEditId;
    if (editId) {
      Object.assign(catalog.find(c=>c.id===editId)||{}, data);
      showToast(`Course "${name}" updated ✓`, 'success');
    } else {
      catalog.push({ id:'crs-'+Date.now(), ...data, createdAt: new Date().toISOString().slice(0,10) });
      showToast(`Course "${name}" created ✓`, 'success');
    }
    window._crsEditId = null;
    Modal.close('modal-create-course');
    renderKPI(); renderList();
  };

  window.openEditCourse = function(id) { Modal.closeAll(); setTimeout(()=>openCreateCourse(id), 80); };

  /* ── BRANCH PRICING MODAL ────────────────────────────────── */
  window.openPricingModal = function() {
    const inp = (b,h,v) =>
      `<td><input type="number" value="${v}" id="price-${b}-${h}" class="form-input"
         style="width:80px;text-align:right"></td>`;
    const rows = CONST.BRANCHES.map(b => {
      const p = pricing[b]||{};
      return `<tr><td style="font-weight:600">${b}</td>${[24,48,72,96].map(h=>inp(b,h,p['h'+h]||0)).join('')}</tr>`;
    }).join('');
    Modal.create('modal-pricing',`${UI.icon('payments')} Branch Pricing`,
    `<p class="text-muted" style="font-size:var(--fs-label-sm);margin-bottom:var(--sp-4)">Base prices per hour package · per branch. Bundle = sum of subjects.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Branch</th><th>24h (฿)</th><th>48h (฿)</th><th>72h (฿)</th><th>96h (฿)</th></tr></thead>
      <tbody>${rows}</tbody>
    </table></div>`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-pricing')">Cancel</button>
     <button class="btn btn-primary" onclick="savePricing()">${UI.icon('save','sm')} Save Pricing</button>`,
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
