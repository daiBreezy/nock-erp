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
    const all     = students.filter(s => s.status !== 'archived');
    const active  = all.filter(s => s.status === 'active').length;
    const renewal = all.filter(s => s.status === 'renewal').length;
    const pause   = all.filter(s => s.status === 'pause').length;
    const urgent  = all.filter(s => s.status === 'renewal' &&
      Math.min(...s.courses.map(c=>c.left)) <= 1).length;
    const revenue = students.reduce((sum,s) => sum + s.invoices.reduce((a,i)=>a+i.amount,0), 0);
    const now = new Date();
    const newMonth = students.filter(s => {
      const d = new Date(s.enrollDate);
      return d.getFullYear()===now.getFullYear() && d.getMonth()===now.getMonth();
    }).length;
    const expiring = all.filter(s =>
      s.status!=='pause' && Math.min(...s.courses.map(c=>c.left)) <= 2).length;
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

    ${UI.pageHeader('Students',
      `<span id="stu-count-sub">${students.filter(s=>s.status!=='archived').length} students enrolled</span>`,
      `<button class="btn btn-secondary btn-sm">${UI.icon('download','sm')} Export</button>`
    )}

    ${UI.kpiGrid([
      { icon:'check_circle', label:'Active',       value:k.active,
        color:'success', sub:k.newMonth>0?`+${k.newMonth} this month`:'', subColor:'up' },
      { icon:'autorenew',    label:'Renewal',      value:k.renewal,
        color:k.urgent?'error':'warning',
        sub:k.urgent?`${k.urgent} urgent`:'', subColor:k.urgent?'down':'' },
      { icon:'pause_circle', label:'On Pause',     value:k.pause, color:'' },
      { icon:'payments',     label:'Revenue Total',value:`฿${(k.revenue/1000).toFixed(0)}K`,
        color:'tertiary',
        sub:k.expiring>0?`${k.expiring} expiring soon`:'', subColor:k.expiring>0?'down':'' },
    ])}

    <!-- SUBJECT TAGS -->
    <div class="filter-bar" style="margin-bottom:12px">
      <span style="font-size:var(--fs-label-sm);color:var(--md-on-surface-variant);padding:0 4px">Subjects:</span>
      ${Object.entries(tags).map(([sub,cnt]) =>
        `<span class="badge badge-${_subjectColor(sub)}">${sub} · ${cnt}</span>`
      ).join('')}
    </div>

    ${UI.filterBar([
      { type:'search', placeholder:'Search name, nickname, course…',
        id:'stu-search', oninput:"stuSearch(this.value)" },
      { label:'All',      active:true,  onclick:"stuFilter('all',this)" },
      { label:'Active',   active:false, onclick:"stuFilter('active',this)" },
      { label:'Renewal',  active:false, onclick:"stuFilter('renewal',this)" },
      { label:'Pause',    active:false, onclick:"stuFilter('pause',this)" },
      { label:'Archived', active:false, onclick:"stuFilter('archived',this)" },
      { type:'select', onchange:'stuBranchFilter(this.value)', options:[
        { value:'',           label:'All Branches', selected:true },
        { value:'Sukhumvit',  label:'Sukhumvit' },
        { value:'Silom',      label:'Silom' },
      ]},
    ])}

    <!-- TABLE -->
    <div class="card">
      <table id="stu-table">
        <thead><tr>
          <th onclick="stuSort('name')">Full Name <span id="sort-name"></span></th>
          <th>Nickname</th><th>Family</th><th>Branch</th>
          <th>Course(s)</th>
          <th onclick="stuSort('left')">Classes <span id="sort-left"></span></th>
          <th>Teacher</th>
          <th onclick="stuSort('status')">Status <span id="sort-status"></span></th>
          <th></th>
        </tr></thead>
        <tbody id="stu-tbody"></tbody>
      </table>
    </div>`;
  }

  /* ── BUILD TABLE ─────────────────────────────────────────── */
  function buildTable() {
    let list = students.filter(s => {
      const matchStatus = filterStatus === 'all' || s.status === filterStatus;
      const matchBranch = !stuBranchVal || s.branch === stuBranchVal;
      const q = searchVal.toLowerCase();
      const matchSearch = !q || s.name.toLowerCase().includes(q) ||
        (s.nick||'').toLowerCase().includes(q) || s.branch.toLowerCase().includes(q) ||
        s.courses.some(c => c.name.toLowerCase().includes(q)) ||
        s.teacher.toLowerCase().includes(q);
      return matchStatus && matchBranch && matchSearch;
    });

    list.sort((a,b) => {
      let av, bv;
      if (sortCol==='name')   { av=a.name;  bv=b.name; }
      if (sortCol==='left')   { av=Math.min(...a.courses.map(c=>c.left)); bv=Math.min(...b.courses.map(c=>c.left)); }
      if (sortCol==='status') { av=a.status; bv=b.status; }
      if (av<bv) return sortAsc?-1:1; if (av>bv) return sortAsc?1:-1; return 0;
    });

    const sub = document.getElementById('stu-count-sub');
    if (sub) sub.textContent = `${list.length} student${list.length!==1?'s':''} shown`;

    document.getElementById('stu-tbody').innerHTML = list.map(s => {
      const sm      = STATUS_META[s.status];
      const usedH   = s.courses.reduce((a,c)=>a+c.used,  0);
      const totalH  = s.courses.reduce((a,c)=>a+c.hours, 0);
      const minLeft = Math.min(...s.courses.map(c=>c.left));
      const leftCls = minLeft<=1?'badge-red':minLeft<=2?'badge-yellow':'badge-green';
      const courses = Utils.chipList(
        s.courses.map(c=>({label:c.name.replace(/\s+[ปม]\.\d/,''),cls:'badge-'+_subjectColor(c.name)})), 1);
      return `<tr class="tr-click" onclick="openStudentModal('${s.id}')">
        <td><strong class="text-primary">${s.name}</strong></td>
        <td class="text-muted">${s.nick||'—'}</td>
        <td><span class="text-primary" style="cursor:pointer"
          onclick="event.stopPropagation();openFamilyModal('${_famId(s.family)}')">${s.family}</span></td>
        <td>${s.branch}</td>
        <td>${courses}</td>
        <td><span class="badge ${leftCls}">${usedH}/${totalH}h</span></td>
        <td>${s.teacher}</td>
        <td>${UI.badge(sm.label, sm.cls.replace('badge-',''))}</td>
        <td onclick="event.stopPropagation()" style="white-space:nowrap">
          <button class="btn btn-secondary btn-sm"
            onclick="openStudentModal('${s.id}')">${UI.icon('edit','sm')} Edit</button>
          ${UI.moreMenu('stu-'+s.id,[{label:`${UI.icon('chat','sm')} Message`,onclick:`openInboxFor('${s.family}')`}])}
        </td>
      </tr>`;
    }).join('');

    ['name','left','status'].forEach(col => {
      const el = document.getElementById(`sort-${col}`);
      if (el) el.textContent = sortCol===col?(sortAsc?'↑':'↓'):'';
    });
  }

  renderShell();
  buildTable();

  window.stuSearch       = function(v) { searchVal=v; buildTable(); };
  window.stuBranchFilter = function(v) { stuBranchVal=v; buildTable(); };
  window.stuFilter = function(mode,el) {
    filterStatus = mode;
    document.querySelectorAll('#view-students .filter-chip').forEach(c=>c.classList.remove('active'));
    if (el) el.classList.add('active');
    buildTable();
  };
  window.stuSort = function(col) {
    if (sortCol===col) sortAsc=!sortAsc; else { sortCol=col; sortAsc=true; }
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
    <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;
      background:var(--md-surface-low);border-radius:var(--shape-md);
      margin-bottom:var(--sp-4);border:1px solid var(--md-outline-variant)">
      ${UI.avatar(s.name[0],'lg')}
      <div style="flex:1">
        <div style="font-size:var(--fs-title-md);font-weight:700;color:var(--md-on-surface)">
          ${s.name}${s.nick?` <span class="text-muted" style="font-weight:400">(${s.nick})</span>`:''}
        </div>
        <div class="text-muted" style="font-size:var(--fs-body-sm);margin-top:2px">
          Age ${s.age} · ${s.branch} ·
          <span class="text-primary" style="cursor:pointer"
            onclick="openFamilyModal('${_famId(s.family)}')">${s.family} →</span>
        </div>
        <div style="margin-top:var(--sp-2);display:flex;gap:6px;align-items:center">
          ${UI.badge(sm.label, sm.cls.replace('badge-',''))}
          <span class="text-muted" style="font-size:var(--fs-label-sm)">Enrolled ${s.enrollDate}</span>
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:var(--fs-headline-sm);font-weight:700;color:var(--md-on-surface)">
          ฿${totalPaid.toLocaleString()}</div>
        <div class="text-muted" style="font-size:var(--fs-label-sm);margin-bottom:var(--sp-2)">Total Paid</div>
        <div style="display:flex;gap:6px;justify-content:flex-end">
          <button class="btn btn-secondary btn-sm" onclick="openInboxFor('${s.family}')">
            ${UI.icon('chat','sm')}</button>
          <button class="btn btn-secondary btn-sm" onclick="showToast('Calling…','info')">
            ${UI.icon('call','sm')}</button>
        </div>
      </div>
    </div>

    <div class="tabs" style="margin-bottom:0">
      <div class="tab active" onclick="stuTab('overview',this)">Overview</div>
      <div class="tab"        onclick="stuTab('sessions',this)">Sessions</div>
      <div class="tab"        onclick="stuTab('attendance',this)">Attendance</div>
      <div class="tab"        onclick="stuTab('payment',this)">Payment</div>
      <div class="tab"        onclick="stuTab('notes',this)">Notes</div>
    </div>

    <!-- OVERVIEW -->
    <div id="stab-overview" class="modal-section" style="padding-top:var(--sp-4)">
      ${UI.infoGrid([
        {label:'LINE ID', value:s.line||'—'},
        {label:'Phone',   value:s.phone},
        {label:'Branch',  value:s.branch},
        {label:'Total Enrolled', value:`<strong>${totalH}h. · ${s.courses.length} course${s.courses.length>1?'s':''}</strong>`},
      ])}
      <div class="modal-section-title" style="margin-top:var(--sp-4)">Course Quota</div>
      ${s.courses.map(c => {
        const pct    = Math.round((c.used/c.hours)*100);
        const col    = c.left<=1?'var(--md-error)':c.left<=2?'var(--md-warning)':'var(--md-success)';
        const subCol = _subjectColor(c.name);
        return `<div class="card-outlined" style="margin-bottom:var(--sp-2)">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:var(--sp-2)">
            <div>
              ${UI.badge(c.name.split(' ')[0], subCol)}
              <div style="font-weight:600;font-size:var(--fs-body-md);color:var(--md-on-surface);margin-top:4px">
                ${c.name}</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:var(--fs-headline-sm);font-weight:700;line-height:1;color:${col}">${c.left}</div>
              <div class="text-muted" style="font-size:var(--fs-label-sm)">sessions left</div>
            </div>
          </div>
          ${UI.progress(pct, c.left<=1?'error':c.left<=2?'warning':'success')}
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sp-2);
            font-size:var(--fs-label-sm);margin-top:var(--sp-2)">
            <div><div class="text-muted">Used</div><strong>${c.used}/${c.hours}h.</strong></div>
            <div><div class="text-muted">Next session</div><strong>${nextS?nextS.date:'—'}</strong></div>
            <div><div class="text-muted">Teacher</div><strong>${s.teacher}</strong></div>
          </div>
          ${c.left<=2?`<div style="margin-top:var(--sp-3);padding-top:var(--sp-3);
            border-top:1px solid var(--md-outline-variant);display:flex;align-items:center;gap:var(--sp-2)">
            <span style="font-size:var(--fs-label-sm);color:${col};font-weight:500">
              ${c.left<=1?UI.icon('priority_high','sm')+' Urgent:':UI.icon('warning','sm')} ${c.left} session${c.left===1?'':'s'} remaining
            </span>
            <button class="btn btn-primary btn-sm" style="margin-left:auto"
              onclick="openNewInvoice()">
              ${UI.icon('autorenew','sm')} Renew Now</button>
          </div>`:''}
        </div>`;
      }).join('')}
    </div>

    <!-- SESSIONS -->
    <div id="stab-sessions" class="modal-section" style="display:none;padding-top:var(--sp-4)">
      <div class="modal-section-title">Upcoming Sessions</div>
      <table><thead><tr><th>Date</th><th>Time</th><th>Room</th><th>Teacher</th><th>Status</th></tr></thead>
        <tbody>${(s.schedule||[]).map(sc=>`<tr>
          <td>${sc.date}</td><td>${sc.time}</td><td>${sc.room}</td><td>${sc.teacher}</td>
          <td>${UI.badge(sc.status,'blue')}</td>
        </tr>`).join('')}</tbody>
      </table>
    </div>

    <!-- ATTENDANCE -->
    <div id="stab-attendance" class="modal-section" style="display:none;padding-top:var(--sp-4)">
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:var(--sp-2);margin-bottom:var(--sp-4)">
        ${[
          {label:'Present',v:attCounts.present||0,color:'success'},
          {label:'Leave',  v:attCounts.leave||0,  color:'warning'},
          {label:'Absent', v:attCounts.absent||0, color:'error'},
          {label:'Total',  v:s.attendance.length, color:''},
        ].map(x=>`<div class="card-outlined" style="text-align:center;padding:var(--sp-2)">
          <div style="font-size:var(--fs-headline-sm);font-weight:700;
            color:var(--md-${x.color||'primary'})">${x.v}</div>
          <div class="text-muted" style="font-size:var(--fs-label-sm)">${x.label}</div>
        </div>`).join('')}
      </div>
      <table><thead><tr><th>Date</th><th>Course</th><th>Status</th><th>Note</th></tr></thead>
        <tbody>${s.attendance.map(a=>{
          const am   = ATT_META[a.status];
          const note = a.status==='leave'  ? `<span class="text-warning" style="font-size:11px">No deduction</span>`
                     : a.status==='absent' ? `<span class="text-error"   style="font-size:11px">Deducted</span>`
                     :                       `<span class="text-success"  style="font-size:11px">Deducted</span>`;
          return `<tr><td>${a.date}</td><td>${a.course}</td>
            <td>${UI.badge(am.label, am.cls.replace('badge-',''))}</td><td>${note}</td></tr>`;
        }).join('')}</tbody>
      </table>
    </div>

    <!-- PAYMENT -->
    <div id="stab-payment" class="modal-section" style="display:none;padding-top:var(--sp-4)">
      ${UI.infoGrid([
        {label:'Total Paid',       value:`<strong>฿${totalPaid.toLocaleString()}</strong>`},
        {label:'Hours Purchased',  value:`<strong>${totalH}h.</strong>`},
        {label:'Hours Used',       value:`<strong>${usedH}h.</strong>`},
        {label:'Hours Remaining',  value:`<strong class="${leftH<=2?'text-error':'text-success'}">${leftH}h.</strong>`},
      ])}
      ${UI.sectionTitle('Invoice & Receipt History',
        `<button class="btn btn-primary btn-sm" onclick="openNewInvoice('${s.id}')">
          ${UI.icon('add','sm')} New Invoice</button>`
      )}
      <table><thead><tr><th>Ref #</th><th>Date</th><th>Course</th><th>Amount</th><th>Status</th><th></th></tr></thead>
        <tbody>${s.invoices.map(inv=>`<tr>
          <td class="text-primary" style="font-weight:600;font-size:var(--fs-label-sm)">${inv.id}</td>
          <td>${inv.date}</td><td>${inv.course}</td>
          <td>฿${inv.amount.toLocaleString()}</td>
          <td>${UI.badge('Paid','green')}</td>
          <td style="white-space:nowrap">
            <button class="btn btn-secondary btn-sm"
              onclick="openDocPreview('${inv.id}','invoice')">${UI.icon('receipt_long','sm')} INV</button>
            ${inv.payslip?`<button class="btn btn-secondary btn-sm" style="margin-left:2px"
              onclick="openDocPreview('${inv.id}','receipt')">${UI.icon('receipt','sm')} RCP</button>`:''}
          </td>
        </tr>`).join('')}</tbody>
      </table>
    </div>

    <!-- NOTES -->
    <div id="stab-notes" class="modal-section" style="display:none;padding-top:var(--sp-4)">
      ${s.notes.map(n=>`
      <div style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-3)">
        ${UI.avatar(n.author[0],'sm')}
        <div style="flex:1;background:var(--md-surface-low);border-radius:var(--shape-sm);
          padding:var(--sp-2) var(--sp-3);border:1px solid var(--md-outline-variant)">
          <div class="text-muted" style="font-size:var(--fs-label-sm);margin-bottom:4px">
            ${UI.badge(n.type==='teacher'?'Teacher':'Admin', n.type==='teacher'?'blue':'gray')}
            ${n.author} · ${n.date}
          </div>
          <div style="font-size:var(--fs-body-sm);color:var(--md-on-surface)">${n.text}</div>
        </div>
      </div>`).join('')}
      <div style="margin-top:var(--sp-2)">
        <textarea id="new-note-${s.id}" class="form-input" placeholder="Add a note…" rows="2"
          style="width:100%;resize:none"></textarea>
        <div style="text-align:right;margin-top:var(--sp-2)">
          <button class="btn btn-primary btn-sm"
            onclick="saveStudentNote('${s.id}')">${UI.icon('save','sm')} Save Note</button>
        </div>
      </div>
    </div>`;

    Modal.create(`modal-student-${s.id}`,
      `${UI.icon('person')} ${s.name}${s.nick?` (${s.nick})`:''}`, body,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-student-${s.id}')">Close</button>
       <button class="btn btn-secondary" onclick="showToast('Edit student coming soon','info')">
         ${UI.icon('edit','sm')} Edit</button>`,
      'modal-lg');
  };

  window.stuTab = function(tab,el) {
    const modal = el.closest('.modal');
    if (!modal) return;
    modal.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    el.classList.add('active');
    ['overview','sessions','attendance','payment','notes'].forEach(t => {
      const p = modal.querySelector(`#stab-${t}`);
      if (p) p.style.display = t===tab?'':'none';
    });
  };

  window.saveStudentNote = function(id) {
    const ta = document.getElementById(`new-note-${id}`);
    if (!ta||!ta.value.trim()) return;
    const s = students.find(x=>x.id===id);
    s.notes.push({type:'admin',text:ta.value.trim(),author:'Admin Nock',date:'Now'});
    showToast('Note saved ✓','success');
    Modal.close(`modal-student-${id}`);
    openStudentModal(id);
  };

})();
