/* ============================================================
   staff.js — Staff Roster + Create / Edit Form (2-tab)
   Profile view modal → staff-profile.js
   ============================================================ */
(function () {

  const staff = DB.staff;
  let searchVal = '', filterBranch = '', filterRole = 'all', sortBy = 'name';
  let _sfImage = null, _sfPhones = [], _sfRoles = [], _currentModalId = '';

  const DAYS = CONST.DAYS_SHORT || ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const ROLE_OPTS = [
    { key:'teacher',      label:'Teacher'      },
    { key:'admin',        label:'Admin'        },
    { key:'manager',      label:'Manager'      },
    { key:'area_manager', label:'Area Manager' },
    { key:'director',     label:'Director'     },
  ];

  /* ── HELPERS ──────────────────────────────────────────────── */
  function workloadInfo(s) {
    const cap  = CONST.STAFF_CAPACITY;
    // effectiveLoad = Σ(students per session this week)
    // Uses pre-computed weeklyEffectiveLoad from data, or falls back to class count
    const load = s.weeklyEffectiveLoad ?? (s.weeklyClassCount || s.thisWeekSessions || 0);
    const classes = s.weeklyClassCount || s.thisWeekSessions || 0;
    const avgPerClass = classes > 0 ? Math.round(load / classes) : 0;
    const warnLoad   = cap.warnLoad   || 20;
    const dangerLoad = cap.dangerLoad || 30;
    const pct  = dangerLoad > 0 ? Math.round(load / dangerLoad * 100) : 0;
    let cls, label;
    if (load <= warnLoad)   { cls = 'green';  label = 'Healthy'; }
    else if (load <= dangerLoad) { cls = 'yellow'; label = 'Warning'; }
    else                    { cls = 'red';    label = 'Danger';  }
    return { load, classes, avgPerClass, pct, cls, label };
  }

  function roleBadges(s) {
    const roles = s.roleAssignments?.map(r => r.role) || s.roles || [s.role];
    const badges = [...new Set(roles)].map(r => {
      const rm = CONST.ROLE_META[r] || CONST.ROLE_META[r?.charAt(0).toUpperCase()+r?.slice(1)] || {};
      return rm.cls ? UI.badge(rm.label||r, rm.cls.replace('badge-','')) : '';
    }).filter(Boolean);
    // Master Admin gets an extra badge
    if (s.adminTier === 'master') badges.push(UI.badge('Master','purple'));
    return badges.join(' ');
  }

  function subjBadgesFor(ids) {
    return (ids||[]).map(id => {
      const s = (DB.subjects||[]).find(x => x.id === id);
      return s ? UI.badge(s.name, s.color||'blue') : '';
    }).filter(Boolean).join(' ');
  }

  function gradeRangeLabel(ids) {
    const pool = DB.gradesPool || [];
    const idxs = (ids||[]).map(id => pool.findIndex(g => g.id === id)).filter(i => i >= 0).sort((a,b)=>a-b);
    if (!idxs.length) return '';
    if (idxs.length === 1) return pool[idxs[0]]?.name || '';
    return `${pool[idxs[0]]?.name}–${pool[idxs[idxs.length-1]]?.name}`;
  }

  function isTeacher(s) {
    return (s.roleAssignments||s.roles||[s.role]).some(r =>
      (typeof r === 'string' ? r : r?.role || '').toLowerCase() === 'teacher');
  }

  // Scope form element lookups to the currently-open modal to avoid
  // duplicate-ID collisions when a previous modal is still in the DOM.
  function getFormEl(id) {
    const modal = _currentModalId ? document.getElementById(_currentModalId) : null;
    return (modal ? modal.querySelector('#' + id) : null) || document.getElementById(id);
  }

  /* ── KPI ──────────────────────────────────────────────────── */
  function kpiCounts() {
    const teachers  = staff.filter(s => isTeacher(s));
    const atRisk    = teachers.filter(s => workloadInfo(s).pct > 80);
    const totalPend = staff.reduce((a, s) => a + (s.summaryPending || 0), 0);
    return { total: staff.length, teachers: teachers.length, atRisk: atRisk.length, summaryPending: totalPend };
  }

  /* ── SHELL ────────────────────────────────────────────────── */
  function renderShell() {
    const k = kpiCounts();
    document.getElementById('view-staff').innerHTML = `
    ${UI.pageHeader('Staff', `<span id="staff-sub">${staff.length} staff members</span>`,
      `<button class="btn btn-secondary btn-sm" onclick="NockExport.csv('staff.csv', DB.staff.map(s=>({name:s.name,role:s.role,adminTier:s.adminTier||'',branch:(s.branches||[s.branch]).join('|'),subjects:(s.subjects||[]).join('|')})))">${UI.icon('download','sm')} Export</button>
       <button class="btn btn-primary btn-sm" onclick="openAddStaffModal()">${UI.icon('person_add','sm')} Add Staff</button>`
    )}
    ${UI.kpiGrid([
      { icon:'badge',           label:'Total Staff',    value:k.total,          color:'' },
      { icon:'school',          label:'Teachers',       value:k.teachers,       color:'tertiary' },
      { icon:'warning',         label:'At Risk (>80%)', value:k.atRisk,
        color: k.atRisk > 0 ? 'error' : '',
        sub: k.atRisk > 0 ? 'Danger or Burnout' : 'All healthy', subColor: k.atRisk > 0 ? 'down' : 'up' },
      { icon:'pending_actions', label:'Summary Pending', value:k.summaryPending,
        color: k.summaryPending > 0 ? 'warning' : '',
        sub: k.summaryPending > 0 ? 'Needs attention' : 'All done', subColor: k.summaryPending > 0 ? 'down' : 'up' },
    ])}
    ${UI.filterBar([
      { type:'search', placeholder:'Search name, subject, email…', id:'staff-search', oninput:'staffSearch(this.value)' },
      { label:'All',     active:true,  onclick:"staffRole('all',this)"     },
      { label:'Teacher', active:false, onclick:"staffRole('teacher',this)" },
      { label:'Admin',   active:false, onclick:"staffRole('admin',this)"   },
      { label:'Manager', active:false, onclick:"staffRole('manager',this)" },
      { type:'select', onchange:'staffBranch(this.value)', options:[
        { value:'', label:'All Branches', selected:true },
        ...CONST.BRANCHES.map(b => ({ value:b, label:b })),
      ]},
      { type:'select', onchange:'staffSort(this.value)', options:[
        { value:'name',     label:'Sort: Name',    selected:true },
        { value:'joinDate', label:'Sort: Join Date' },
        { value:'sessions', label:'Sort: Sessions'  },
      ]},
    ])}
    <div class="card">
      <table>
        <thead><tr>
          <th>Name</th><th>Role(s) / Branch</th>
          <th>Subjects</th><th style="text-align:center">Workload</th><th></th>
        </tr></thead>
        <tbody id="staff-tbody"></tbody>
      </table>
    </div>`;
  }

  /* ── TABLE ────────────────────────────────────────────────── */
  function buildTable() {
    let list = staff.filter(s => {
      const q     = searchVal.toLowerCase();
      const roles = (s.roleAssignments||[]).map(r => r.role.toLowerCase());
      const matchSearch = !q
        || s.name.toLowerCase().includes(q)
        || (s.fullName||'').toLowerCase().includes(q)
        || (s.email||'').toLowerCase().includes(q)
        || (s.subjects||[]).some(id => { const sj = (DB.subjects||[]).find(x=>x.id===id); return sj?.name.toLowerCase().includes(q); });
      const matchBranch = !filterBranch
        || (s.roleAssignments||[]).some(r => r.branch === filterBranch);
      const matchRole = filterRole === 'all' || roles.includes(filterRole)
        || (s.roles||[s.role]).some(r=>(r||'').toLowerCase()===filterRole);
      return matchSearch && matchBranch && matchRole;
    });

    list.sort((a,b) => {
      if (sortBy === 'joinDate')  return (b.joinDate||'').localeCompare(a.joinDate||'');
      if (sortBy === 'sessions')  return (b.totalSessions||0) - (a.totalSessions||0);
      return a.name.localeCompare(b.name);
    });

    const sub = document.getElementById('staff-sub');
    if (sub) sub.textContent = `${list.length} staff member${list.length!==1?'s':''}`;

    document.getElementById('staff-tbody').innerHTML = list.length === 0
      ? `<tr><td colspan="5" style="text-align:center;padding:28px" class="text-muted">No staff found</td></tr>`
      : list.map(s => {
          const teacher = isTeacher(s);
          const wl      = teacher ? workloadInfo(s) : null;
          const branches = [...new Set((s.roleAssignments||[]).map(r=>r.branch))].join(', ')
            || (s.branches||[]).join(', ');
          // Collect all subjects across role assignments
          const allSubjIds = [...new Set((s.roleAssignments||[]).flatMap(r=>r.subjects||[]))];
          const avatarEl = s.image
            ? `<div style="width:34px;height:34px;border-radius:50%;overflow:hidden;flex-shrink:0">
                 <img src="${s.image}" style="width:100%;height:100%;object-fit:cover"></div>`
            : UI.avatar((s.nick||s.name)[0], 'sm');

          return `<tr class="tr-click" onclick="openStaffModal('${s.id}')">
            <td>
              <div style="display:flex;align-items:center;gap:9px">
                ${avatarEl}
                <div>
                  <div style="font-weight:600;color:var(--md-primary);font-size:13px">${s.name}</div>
                  <div class="text-muted" style="font-size:10px">${s.fullName||''}${s.nick?` · "${s.nick}"`:''}</div>
                </div>
              </div>
            </td>
            <td>
              <div>${roleBadges(s)||'—'}</div>
              <div class="text-muted" style="font-size:10px;margin-top:2px">${branches}</div>
            </td>
            <td>
              ${teacher
                ? `<div>${subjBadgesFor(allSubjIds)||'—'}</div>
                   ${s.grades?.length ? `<div class="text-muted" style="font-size:10px;margin-top:2px">${gradeRangeLabel(s.grades)}</div>` : ''}`
                : `<span class="text-muted" style="font-size:12px">—</span>`}
            </td>
            <td style="text-align:center">
              ${wl
                ? `<div style="font-size:12px;font-weight:600">${wl.classes}/wk · avg ${wl.avgPerClass}</div>
                   ${UI.badge(wl.label+' '+wl.load, wl.cls)}`
                : `<span class="text-muted" style="font-size:12px">—</span>`}
            </td>
            <td onclick="event.stopPropagation()">
              <button class="btn btn-secondary btn-sm" onclick="openStaffModal('${s.id}')">
                ${UI.icon('visibility','sm')} View
              </button>
            </td>
          </tr>`;
        }).join('');
  }

  renderShell(); buildTable();
  window.staffSearch = v   => { searchVal=v;    buildTable(); };
  window.staffBranch = v   => { filterBranch=v; buildTable(); };
  window.staffSort   = v   => { sortBy=v;       buildTable(); };
  window.staffRole   = (r,el) => {
    filterRole = r;
    document.querySelectorAll('#view-staff .filter-chip').forEach(c=>c.classList.remove('active'));
    el.classList.add('active'); buildTable();
  };

  /* ── FORM HELPERS ─────────────────────────────────────────── */
  function phoneRow(p, i) {
    return `<div id="sf-phone-row-${i}" style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
      <select class="settings-input" id="sf-phone-label-${i}" style="width:110px;flex-shrink:0">
        <option ${p.label==='Work'?'selected':''}>Work</option>
        <option ${p.label==='Personal'?'selected':''}>Personal</option>
        <option ${p.label==='Other'?'selected':''}>Other</option>
      </select>
      <input class="settings-input" id="sf-phone-num-${i}" value="${p.number||''}"
        placeholder="088-888-8888" style="flex:1">
      ${i===0?`<span style="font-size:10px;color:var(--md-primary);font-weight:600;min-width:48px">default</span>`
             :`<button onclick="staffRemovePhone(${i})" style="width:28px;height:28px;border:1px solid var(--md-outline-variant);
               border-radius:6px;background:transparent;cursor:pointer;color:var(--md-error);font-size:16px;flex-shrink:0">×</button>`}
    </div>`;
  }

  /* Director / Area Manager = ดูแลหลายสาขา → เลือก branch แบบ multi
     (เก็บลง data เป็น 1 roleAssignment ต่อสาขา ตอน save — model เดิมไม่เปลี่ยน) */
  const isMultiRole = r => r === 'director' || r === 'area_manager';
  const allBranches = () => (DB.branchSettings || []).filter(b => b.active !== false);
  const cssId = s => String(s).replace(/[^a-zA-Z0-9]/g, '_');

  function roleCard(ra, i) {
    const isT = (ra.role||'') === 'teacher';
    const isMulti = isMultiRole(ra.role||'');
    return `
    <div id="sf-role-card-${i}" style="border:1.5px solid var(--md-outline-variant);border-radius:10px;padding:14px;margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-size:11px;font-weight:700;color:var(--md-on-surface-variant)">${i+1}</span>
        <button onclick="staffRemoveRole(${i})" style="width:26px;height:26px;border:none;border-radius:6px;
          background:var(--md-error-container);cursor:pointer;color:var(--md-error);font-size:16px;line-height:1">×</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div>
          <label class="settings-label">Role</label>
          <select class="settings-input" id="sf-ra-role-${i}" onchange="staffRoleCardChange(${i})">
            ${ROLE_OPTS.map(r=>`<option value="${r.key}" ${ra.role===r.key?'selected':''}>${r.label}</option>`).join('')}
          </select>
        </div>
        <div id="sf-ra-branch-wrap-${i}">
          ${isMulti
            ? `<label class="settings-label">Branches ที่ดูแล <span class="text-muted">(เลือกได้หลายสาขา)</span></label>
               <div style="display:flex;gap:5px;flex-wrap:wrap;padding-top:2px">
                 ${(() => {
                   const sel = ra.branches || [ra.branch];
                   const isAll = ra.allBranches || allBranches().every(b=>sel.includes(b.branch));
                   return `<label id="sf-ra-br-${i}-__all__" data-on="${isAll?'1':'0'}"
                     style="padding:4px 10px;border-radius:16px;cursor:pointer;font-size:11px;font-weight:700;
                       border:1.5px solid ${isAll?'var(--md-primary)':'var(--md-outline-variant)'};
                       background:${isAll?'var(--md-primary-container)':'transparent'};
                       color:${isAll?'var(--md-primary)':'var(--md-on-surface-variant)'};transition:all .12s"
                     onclick="staffRaAllBranchToggle(${i},this)">${UI.icon('public','sm')} All Branch</label>
                   <span style="width:1px;background:var(--md-outline-variant);margin:0 3px"></span>`;
                 })()}
                 ${allBranches().map(b=>{
                   const sel = ra.branches || [ra.branch];
                   const on = ra.allBranches || sel.includes(b.branch);
                   return `<label id="sf-ra-br-${i}-${cssId(b.branch)}" data-on="${on?'1':'0'}"
                     style="padding:4px 10px;border-radius:16px;cursor:pointer;font-size:11px;font-weight:500;
                       border:1.5px solid ${on?'var(--md-primary)':'var(--md-outline-variant)'};
                       background:${on?'var(--md-primary-container)':'transparent'};
                       color:${on?'var(--md-primary)':'var(--md-on-surface-variant)'};transition:all .12s"
                     onclick="staffRaBranchToggle(this,${i})">${b.branch}</label>`;
                 }).join('')}
               </div>`
            : `<label class="settings-label">Branch</label>
               <select class="settings-input" id="sf-ra-branch-${i}">
                 ${allBranches().map(b=>`<option ${ra.branch===b.branch?'selected':''}>${b.branch}</option>`).join('')}
               </select>`}
        </div>
      </div>
      <div style="margin-bottom:${isT?'10px':'0'};${isMulti?'display:none':''}" id="sf-ra-days-${i}">
        <label class="settings-label" style="display:block;margin-bottom:5px">Working Days</label>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${DAYS.map(d => {
            const on = (ra.days||[]).includes(d);
            return `<label id="sf-ra-day-${i}-${d}"
              style="width:34px;height:28px;display:flex;align-items:center;justify-content:center;
                border:1.5px solid ${on?'var(--md-primary)':'var(--md-outline-variant)'};border-radius:5px;
                cursor:pointer;font-size:11px;font-weight:600;
                background:${on?'var(--md-primary-container)':''};
                color:${on?'var(--md-primary)':'var(--md-on-surface-variant)'};transition:all .12s"
              onclick="staffRaDayToggle(${i},'${d}',this)">${d.slice(0,2)}</label>`;
          }).join('')}
        </div>
      </div>
      <div id="sf-ra-subj-${i}" style="${!isT?'display:none':''}">
        <label class="settings-label" style="display:block;margin-top:10px;margin-bottom:5px">Subjects</label>
        <div style="display:flex;gap:5px;flex-wrap:wrap">
          ${(DB.subjects||[]).map(subj => {
            const on = (ra.subjects||[]).includes(subj.id);
            return `<label id="sf-ra-subj-chip-${i}-${subj.id}"
              style="padding:4px 10px;border-radius:16px;cursor:pointer;font-size:11px;
                border:1.5px solid ${on?'var(--md-primary)':'var(--md-outline-variant)'};
                background:${on?'var(--md-primary-container)':''};transition:all .12s"
              onclick="staffRaSubjToggle(${i},'${subj.id}',this)">
              <span class="badge badge-${subj.color||'blue'}" style="font-size:10px">${subj.name}</span>
            </label>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  }

  function staffInfoBody(s) {
    _sfImage  = s?.image || null;
    _sfPhones = s?.phones?.length ? [...s.phones] : [{ label:'Work', number:'', isDefault:true }];
    return `
    <div style="text-align:center;margin-bottom:16px">
      <div id="sf-avatar" onclick="document.getElementById('sf-img-inp').click()"
        style="width:64px;height:64px;border-radius:50%;margin:0 auto 8px;overflow:hidden;
               background:var(--md-primary-container);cursor:pointer;display:flex;
               align-items:center;justify-content:center;font-size:24px;font-weight:700;
               color:var(--md-primary);border:2px dashed var(--md-outline-variant)">
        ${s?.image ? `<img src="${s.image}" style="width:100%;height:100%;object-fit:cover">` : (s?.nick||s?.name||'+')?.[0]?.toUpperCase()||'+'}
      </div>
      <input type="file" id="sf-img-inp" accept="image/*" style="display:none" onchange="staffFormImageChange(this)">
      <div style="font-size:11px;color:var(--md-primary);cursor:pointer;font-weight:500"
        onclick="document.getElementById('sf-img-inp').click()">Upload Image</div>
      <div class="text-muted" style="font-size:10px">upload file only under 5mb.</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div><label class="settings-label">Full name *</label>
        <input class="settings-input" id="sf-name" value="${s?.name||''}" placeholder="Ex. Kru Arm"></div>
      <div><label class="settings-label">Nick name</label>
        <input class="settings-input" id="sf-nick" value="${s?.nick||''}" placeholder="Ex. อาม"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div><label class="settings-label">Full Legal Name</label>
        <input class="settings-input" id="sf-fullname" value="${s?.fullName||''}" placeholder="Ex. Aranya Sombat"></div>
      <div><label class="settings-label">Default Branch</label>
        <select class="settings-input" id="sf-default-branch">
          ${CONST.BRANCHES.map(b=>`<option ${(s?.defaultBranch||'Sukhumvit')===b?'selected':''}>${b}</option>`).join('')}
        </select>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
      <div><label class="settings-label">LINE ID</label>
        <input class="settings-input" id="sf-line" value="${s?.line||''}" placeholder="@kru_xxx"></div>
      <div><label class="settings-label">Join date</label>
        <input class="settings-input" type="date" id="sf-joindate"
          value="${s?.joinDate||new Date().toISOString().slice(0,10)}"></div>
    </div>
    <div style="margin-bottom:10px">
      <label class="settings-label">Email</label>
      <input class="settings-input" type="email" id="sf-email" value="${s?.email||''}" placeholder="Ex. kru@nockacademy.com">
    </div>
    <div>
      <label class="settings-label" style="display:block;margin-bottom:6px">Phone</label>
      <div id="sf-phones-wrap">${_sfPhones.map((p,i)=>phoneRow(p,i)).join('')}</div>
      <button class="btn btn-secondary btn-sm" style="font-size:11px" onclick="staffAddPhone()">
        ${UI.icon('add','sm')} Add more
      </button>
    </div>`;
  }

  /* โหลด: ยุบ assignment ของ role เดียวกัน (director/area_manager) ให้เหลือการ์ดเดียว + branches[] */
  function collapseRoles(list) {
    const out = [];
    list.forEach(r => {
      if (!isMultiRole(r.role)) { out.push({ ...r }); return; }
      const hit = out.find(x => x.role === r.role);
      if (hit) { if (!hit.branches.includes(r.branch)) hit.branches.push(r.branch); hit.allBranches = hit.allBranches || !!r.allBranches; }
      else out.push({ ...r, branches: [r.branch], allBranches: !!r.allBranches });
    });
    return out;
  }
  function staffRolesBody(s) {
    _sfRoles = s?.roleAssignments?.length ? collapseRoles(s.roleAssignments)
      : [{ role:'teacher', branch:allBranches()[0]?.branch, days:[], subjects:[] }];
    return `
    <div style="display:flex;justify-content:flex-end;margin-bottom:12px">
      <button class="btn btn-secondary btn-sm" onclick="staffAddRole()">
        ${UI.icon('add','sm')} Add more Role
      </button>
    </div>
    <div id="sf-roles-wrap">${_sfRoles.map((ra,i)=>roleCard(ra,i)).join('')}</div>`;
  }

  /* ── FORM HANDLERS ────────────────────────────────────────── */
  window.staffFormImageChange = function(inp) {
    if (!inp.files?.[0]) return;
    const reader = new FileReader();
    reader.onload = e => {
      _sfImage = e.target.result;
      const av = document.getElementById('sf-avatar');
      if (av) av.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover">`;
    };
    reader.readAsDataURL(inp.files[0]);
  };

  window.staffAddPhone = function() {
    _sfPhones.push({ label:'Work', number:'' });
    const wrap = getFormEl('sf-phones-wrap');
    if (wrap) wrap.insertAdjacentHTML('beforeend', phoneRow(_sfPhones[_sfPhones.length-1], _sfPhones.length-1));
  };
  window.staffRemovePhone = function(i) {
    _sfPhones.splice(i,1);
    getFormEl(`sf-phone-row-${i}`)?.remove();
  };

  window.staffAddRole = function() {
    _sfRoles.push({ role:'teacher', branch:allBranches()[0]?.branch, days:[], subjects:[] });
    const wrap = getFormEl('sf-roles-wrap');
    if (wrap) wrap.insertAdjacentHTML('beforeend', roleCard(_sfRoles[_sfRoles.length-1], _sfRoles.length-1));
  };
  window.staffRemoveRole = function(i) {
    _sfRoles.splice(i,1);
    getFormEl(`sf-role-card-${i}`)?.remove();
  };
  window.staffRoleCardChange = function(i) {
    const sel = getFormEl(`sf-ra-role-${i}`)?.value || 'teacher';
    /* เก็บค่าที่กรอกไว้ก่อน แล้ว re-render การ์ดใบนี้ (branch single ↔ multi) */
    _sfRoles[i] = { ..._sfRoles[i], ...readRoleCard(i), role: sel };
    const card = document.getElementById(`sf-role-card-${i}`);
    if (card) card.outerHTML = roleCard(_sfRoles[i], i);
  };
  function paintChip(el, on) {
    el.dataset.on = on ? '1' : '0';
    el.style.borderColor = on ? 'var(--md-primary)' : 'var(--md-outline-variant)';
    el.style.background  = on ? 'var(--md-primary-container)' : 'transparent';
    el.style.color       = on ? 'var(--md-primary)' : 'var(--md-on-surface-variant)';
  }
  window.staffRaBranchToggle = function(el, i) {
    paintChip(el, el.dataset.on !== '1');
    /* ถ้าเลิกเลือกสาขาใดสาขาหนึ่ง → All Branch ต้องดับ · ถ้าครบทุกสาขา → All ติดเอง */
    if (i !== undefined) syncAllChip(i);
  };
  /* All Branch = ครอบทุกสาขา (รวมสาขาที่เปิดใหม่ทีหลัง) */
  window.staffRaAllBranchToggle = function(i, el) {
    const turnOn = el.dataset.on !== '1';
    paintChip(el, turnOn);
    allBranches().forEach(b => {
      const c = getFormEl(`sf-ra-br-${i}-${cssId(b.branch)}`);
      if (c) paintChip(c, turnOn);
    });
  };
  function syncAllChip(i) {
    const all = getFormEl(`sf-ra-br-${i}-__all__`); if (!all) return;
    const every = allBranches().every(b => getFormEl(`sf-ra-br-${i}-${cssId(b.branch)}`)?.dataset.on === '1');
    paintChip(all, every);
  }
  /* อ่านค่าจากการ์ด 1 ใบ */
  function readRoleCard(i) {
    const role = getFormEl(`sf-ra-role-${i}`)?.value || 'teacher';
    const days = DAYS.filter(d => {
      const el = getFormEl(`sf-ra-day-${i}-${d}`);
      return el && (el.style.borderColor.includes('primary') || el.style.background.includes('container'));
    });
    const subjects = role === 'teacher'
      ? (DB.subjects||[]).filter(sj => {
          const el = getFormEl(`sf-ra-subj-chip-${i}-${sj.id}`);
          return el && (el.style.borderColor.includes('primary') || el.style.background.includes('container'));
        }).map(sj => sj.id)
      : [];
    if (isMultiRole(role)) {
      const branches = allBranches().map(b=>b.branch).filter(b => {
        const el = getFormEl(`sf-ra-br-${i}-${cssId(b)}`);
        return el && el.dataset.on === '1';
      });
      const allOn = getFormEl(`sf-ra-br-${i}-__all__`)?.dataset.on === '1';
      return { role, branches, allBranches: allOn, branch: branches[0] || allBranches()[0]?.branch, days, subjects };
    }
    return { role, branch: getFormEl(`sf-ra-branch-${i}`)?.value || allBranches()[0]?.branch, days, subjects };
  }
  window.staffRaDayToggle = function(i, day, el) {
    const on = el.style.borderColor.includes('primary') || el.style.background.includes('container');
    el.style.borderColor = !on ? 'var(--md-primary)' : 'var(--md-outline-variant)';
    el.style.background  = !on ? 'var(--md-primary-container)' : '';
    el.style.color       = !on ? 'var(--md-primary)' : 'var(--md-on-surface-variant)';
  };
  window.staffRaSubjToggle = function(i, subjId, el) {
    const on = el.style.borderColor.includes('primary') || el.style.background.includes('container');
    el.style.borderColor = !on ? 'var(--md-primary)' : 'var(--md-outline-variant)';
    el.style.background  = !on ? 'var(--md-primary-container)' : '';
  };

  /* ── FORM TAB SWITCH ──────────────────────────────────────── */
  window.staffFormTab = function(tab, modalId, staffId) {
    _currentModalId = modalId;
    /* สลับ display เท่านั้น — ห้าม re-render ทับ (ไม่งั้นฟิลด์อีก tab หลุดจาก DOM แล้วเซฟไม่ได้) */
    const paneInfo = getFormEl('sf-pane-info'), paneRole = getFormEl('sf-pane-role');
    if (paneInfo) paneInfo.style.display = tab === 'info' ? '' : 'none';
    if (paneRole) paneRole.style.display = tab === 'info' ? 'none' : '';
    ['sf-tab-info','sf-tab-role'].forEach(id => {
      const btn = getFormEl(id);
      if (!btn) return;
      const on = (id === 'sf-tab-info' && tab === 'info') || (id === 'sf-tab-role' && tab === 'role');
      btn.style.background  = on ? 'var(--md-primary)' : 'transparent';
      btn.style.color       = on ? '#fff' : 'var(--md-on-surface-variant)';
      btn.style.borderColor = on ? 'var(--md-primary)' : 'var(--md-outline-variant)';
    });
    // For create form: update confirm button
    const btn = getFormEl('sf-confirm-btn');
    if (btn && !staffId) {
      btn.textContent = tab === 'role' ? '✓ Create Staff' : 'Next →';
      btn.onclick = tab === 'role' ? confirmAddStaff : () => staffFormTab('role', modalId, null);
    }
  };

  /* ── COLLECT ──────────────────────────────────────────────── */
  function collectForm() {
    const name = getFormEl('sf-name')?.value.trim();
    if (!name) { showToast('Enter staff name','warning'); return null; }

    const phones = _sfPhones.map((_,i) => ({
      label:     getFormEl(`sf-phone-label-${i}`)?.value || 'Work',
      number:    getFormEl(`sf-phone-num-${i}`)?.value.trim() || '',
      isDefault: i === 0,
    })).filter(p => p.number);

    /* multi-branch role (Director/Area Manager) → แตกเป็น 1 assignment ต่อสาขา */
    const roleAssignments = _sfRoles.flatMap((_,i) => {
      const c = readRoleCard(i);
      if (isMultiRole(c.role)) {
        const brs = (c.branches && c.branches.length) ? c.branches : [c.branch].filter(Boolean);
        /* allBranches:true = ครอบสาขาที่เปิดใหม่ในอนาคตด้วย (ไม่ใช่แค่ snapshot รายชื่อวันนี้) */
        return brs.map(b => ({ role:c.role, branch:b, allBranches:!!c.allBranches, days:[], subjects:[] }));
      }
      return [{ role:c.role, branch:c.branch, days:c.days, subjects:c.subjects }];
    });

    const allSubjects = [...new Set(roleAssignments.flatMap(r=>r.subjects))];
    const allBranches = [...new Set(roleAssignments.map(r=>r.branch))];

    return {
      name, nick: getFormEl('sf-nick')?.value.trim()||'',
      fullName:      getFormEl('sf-fullname')?.value.trim()||'',
      defaultBranch: getFormEl('sf-default-branch')?.value||CONST.BRANCHES[0],
      line:          getFormEl('sf-line')?.value.trim()||'',
      joinDate:      getFormEl('sf-joindate')?.value||'',
      email:         getFormEl('sf-email')?.value.trim()||'',
      image: _sfImage,
      phones, roleAssignments,
      // backward compat
      roles:    [...new Set(roleAssignments.map(r=>r.role))],
      role:     roleAssignments[0]?.role?.charAt(0).toUpperCase()+roleAssignments[0]?.role?.slice(1)||'',
      branches: allBranches, subjects: allSubjects,
      phone: phones[0]?.number||'',
    };
  }

  /* ── FORM SHELL ───────────────────────────────────────────── */
  function staffFormShell(s, modalId) {
    const isEdit = !!s;
    const tabBar = `
    <div style="display:flex;gap:6px;margin-bottom:16px">
      <button id="sf-tab-info" onclick="staffFormTab('info','${modalId}','${s?.id||''}')"
        style="padding:6px 16px;border-radius:20px;border:1.5px solid var(--md-primary);
               background:var(--md-primary);color:#fff;font-size:12px;font-weight:600;cursor:pointer">
        ${isEdit?'':'✓'} Info
      </button>
      <button id="sf-tab-role" onclick="staffFormTab('role','${modalId}','${s?.id||''}')"
        style="padding:6px 16px;border-radius:20px;border:1.5px solid var(--md-outline-variant);
               background:transparent;color:var(--md-on-surface-variant);font-size:12px;font-weight:600;cursor:pointer">
        Role
      </button>
    </div>
    <div id="sf-tab-content">
      <div id="sf-pane-info">${staffInfoBody(s)}</div>
      <div id="sf-pane-role" style="display:none">${staffRolesBody(s)}</div>
    </div>`;
    return tabBar;
  }

  window.openAddStaffModal = function() {
    _currentModalId = 'modal-add-staff';
    _sfRoles = [{ role:'teacher', branch:CONST.BRANCHES[0], days:[], subjects:[] }];
    Modal.create('modal-add-staff', `${UI.icon('person_add','sm')} Add Staff`,
      staffFormShell(null, 'modal-add-staff'),
      `<button class="btn btn-secondary" onclick="Modal.close('modal-add-staff')">Close</button>
       <button class="btn btn-primary" id="sf-confirm-btn" onclick="staffFormTab('role','modal-add-staff',null)">Next →</button>`,
      'modal-lg');
  };

  window.confirmAddStaff = function() {
    const d = collectForm(); if (!d) return;
    DB.staff.push({
      id:'staff-'+Date.now(), ...d, status:'active',
      weeklyClassCount:0, thisWeekSessions:0, totalSessions:0,
      activeStudents:0, summaryPending:0, students:[], notes:[], logs:[],
    });
    Modal.close('modal-add-staff');
    showToast(`${d.name} added ✓`,'success');
    buildTable();
  };

  window.openEditStaffModal = function(id) {
    _currentModalId = 'modal-edit-staff';
    const s = staff.find(x=>x.id===id); if (!s) return;
    _sfRoles = s.roleAssignments?.length ? collapseRoles(s.roleAssignments)
      : [{ role:'teacher', branch:allBranches()[0]?.branch, days:[], subjects:[] }];
    // Admin staff: show Master Admin toggle in footer
    const isMasterAdminToggle = (s.roles||[s.role]).some(r=>(r||'').toLowerCase()==='admin')
      ? `<label style="display:flex;align-items:center;gap:6px;font-size:12px;font-weight:600;cursor:pointer"
           title="Master Admin: สร้าง Invoice+Receipt ได้ + Digital Signature">
           <input type="checkbox" id="sf-master-chk" ${s.adminTier==='master'?'checked':''}
             style="width:16px;height:16px"> Master
         </label>` : '';
    Modal.create('modal-edit-staff', `${UI.icon('edit','sm')} Edit — ${s.name}`,
      staffFormShell(s, 'modal-edit-staff'),
      `<button class="btn btn-secondary" onclick="Modal.close('modal-edit-staff')">Cancel</button>
       ${isMasterAdminToggle}
       <label style="display:flex;align-items:center;gap:8px;font-size:12px;font-weight:600;cursor:pointer">
         <input type="checkbox" id="sf-active-chk" ${s.status==='active'?'checked':''}
           style="width:16px;height:16px"> Active
       </label>
       <button class="btn btn-primary" onclick="confirmEditStaff('${id}')">Update</button>`,
      'modal-lg');
  };

  window.confirmEditStaff = function(id) {
    const s = staff.find(x=>x.id===id); if (!s) return;
    const d = collectForm(); if (!d) return;
    const activeChk  = getFormEl('sf-active-chk');
    const masterChk  = getFormEl('sf-master-chk');
    Object.assign(s, d, {
      status:    activeChk?.checked ? 'active' : 'inactive',
      adminTier: masterChk !== null ? (masterChk?.checked ? 'master' : 'normal') : s.adminTier,
    });
    Modal.close('modal-edit-staff');
    showToast('Staff updated ✓','success');
    buildTable();
  };

  /* ── EXPOSE FOR staff-profile.js ─────────────────────────── */
  window._staffWorkloadInfo = workloadInfo;
  window._staffRoleBadges   = roleBadges;
  window._staffIsTeacher    = isTeacher;

})();
