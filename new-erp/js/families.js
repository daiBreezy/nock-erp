/* ============================================================
   families.js — Families Module: List + Family Modal
   ============================================================ */
(function () {

  const families    = DB.families;
  const students    = DB.students;
  const STATUS_META = CONST.FAMILY_STATUS;

  let searchVal = '', filterBranch = '';

  /* ── HELPERS ─────────────────────────────────────────────── */
  function _famStudents(f) {
    return students.filter(s => (f.studentIds || []).includes(s.id));
  }

  function _famStatus(f) {
    const recs = _famStudents(f);
    if (!recs.length) return 'archived';
    if (recs.some(s => s.status === 'active'))  return 'active';
    if (recs.some(s => s.status === 'renewal')) return 'renewal';
    if (recs.every(s => s.status === 'pause'))  return 'pause';
    return 'archived';
  }

  function _primaryParent(f) {
    return f.parents[f.primaryParentIndex ?? 0] || f.parents[0];
  }

  function _kpi() {
    const active  = families.filter(f => _famStatus(f) === 'active').length;
    const renewal = families.filter(f => _famStatus(f) === 'renewal').length;
    const urgent  = families.filter(f => {
      const recs = _famStudents(f);
      return recs.some(s => s.status==='renewal' && Math.min(...s.courses.map(c=>c.left)) <= 1);
    }).length;
    const revenue    = families.reduce((sum,f) => sum + f.totalPaid, 0);
    const unread     = families.filter(f => f.unreadCount > 0).length;
    const multiStu   = families.filter(f => (f.studentIds||[]).length >= 2).length;
    return { active, renewal, urgent, revenue, unread, multiStu };
  }

  /* ── RENDER SHELL ────────────────────────────────────────── */
  function renderShell() {
    const k = _kpi();
    document.getElementById('view-families').innerHTML = `

    ${UI.pageHeader('Families',
      `<span id="fam-count-sub">${families.length} families · ${students.filter(s=>s.status!=='archived').length} students</span>`,
      `<button class="btn btn-secondary btn-sm" onclick="NockExport.csv('families.csv', DB.families.map(f=>({name:f.name,students:(f.students||[]).length,phone:f.phone||'',branch:f.branch||''})))">
        ${UI.icon('download','sm')} Export</button>`
    )}

    ${UI.kpiGrid([
      { icon:'family_restroom', label:'Active',       value:k.active,  color:'success' },
      { icon:'autorenew',       label:'Renewal',      value:k.renewal,
        color:k.urgent?'error':'warning', sub:k.urgent?`${k.urgent} urgent`:'', subColor:k.urgent?'down':'' },
      { icon:'payments',        label:'Revenue Total',value:`฿${(k.revenue/1000).toFixed(0)}K`, color:'tertiary' },
      { icon:'mark_unread_chat_alt', label:'Unread Messages', value:k.unread,
        color:k.unread?'':'', sub:k.multiStu?`${k.multiStu} multi-student`:'', subColor:'' },
    ])}

    ${UI.filterBar([
      { type:'search', placeholder:'Search family, student, LINE…', id:'fam-search', oninput:'famSearch(this.value)' },
      { type:'select', onchange:'famBranch(this.value)', options:[
        { value:'',          label:'All Branches', selected:true },
        { value:'Sukhumvit', label:'Sukhumvit' },
        { value:'Silom',     label:'Silom' },
      ]},
    ])}

    <!-- TABLE -->
    <div class="card">
      <table id="fam-table">
        <thead><tr>
          <th>Family</th><th>Primary Parent</th><th>Students</th>
          <th>Branch</th><th>Total Paid</th><th>Last Contact</th><th>Status</th><th></th>
        </tr></thead>
        <tbody id="fam-tbody"></tbody>
      </table>
    </div>`;
  }

  /* ── BUILD TABLE ─────────────────────────────────────────── */
  function buildTable() {
    let list = families.filter(f => {
      const q = searchVal.toLowerCase();
      const matchSearch = !q || f.name.toLowerCase().includes(q)
        || (f.studentIds||[]).some(id => { const stu=students.find(s=>s.id===id); return stu?.name.toLowerCase().includes(q); })
        || f.parents.some(p => (p.line||'').toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
      return matchSearch && (!filterBranch || f.branch === filterBranch);
    });

    document.getElementById('fam-tbody').innerHTML = list.map(f => {
      const status  = _famStatus(f);
      const sm      = STATUS_META[status] || STATUS_META.active;
      const pp      = _primaryParent(f);
      const unreadBadge = f.unreadCount > 0 ? UI.badge(f.unreadCount,'red') : '';
      const parentStr = `
        <div style="font-weight:500">${pp.name}</div>
        <div class="text-muted" style="font-size:var(--fs-label-sm)">
          ${pp.role}${f.parents.length > 1
            ? ` · <span class="text-primary" style="cursor:pointer"
                onclick="event.stopPropagation();openFamilyModal('${f.id}')">+${f.parents.length-1} more</span>`
            : ''}</div>`;
      const stuStr = (f.studentIds||[]).map(sid => {
        const stu = students.find(s => s.id === sid);
        return stu ? `<span class="text-primary" style="cursor:pointer"
          onclick="event.stopPropagation();openStudentModal('${stu.id}')">${stu.name}</span>` : '';
      }).filter(Boolean).join('<span class="text-muted"> · </span>');
      return `<tr class="tr-click" onclick="openFamilyModal('${f.id}')">
        <td><strong class="text-primary">${f.name}</strong></td>
        <td>${parentStr}</td>
        <td>${stuStr}</td>
        <td>${f.branch}</td>
        <td style="font-weight:600">฿${f.totalPaid.toLocaleString()}</td>
        <td>${f.lastContact} ${unreadBadge}
          <div class="text-muted" style="font-size:var(--fs-label-sm)">${f.channel}</div>
        </td>
        <td>${UI.badge(sm.label, sm.cls.replace('badge-',''))}</td>
        <td onclick="event.stopPropagation()" style="white-space:nowrap">
          <button class="btn btn-secondary btn-sm" onclick="openFamilyModal('${f.id}')">
            ${UI.icon('visibility','sm')} View</button>
          ${UI.moreMenu('fam-'+f.id,[{label:`${UI.icon('chat','sm')} Message`,onclick:`openInboxFor('${f.name}')`}])}
        </td>
      </tr>`;
    }).join('');
  }

  renderShell(); buildTable();

  window.famSearch = v => { searchVal=v; buildTable(); };
  window.famBranch = v => { filterBranch=v; buildTable(); };

  /* ── FAMILY MODAL ────────────────────────────────────────── */
  window.openFamilyModal = function(id) {
    const f = families.find(x => x.id === id);
    if (!f) return;
    const status      = _famStatus(f);
    const sm          = STATUS_META[status] || STATUS_META.active;
    const primary     = _primaryParent(f);
    const famStudents = _famStudents(f);
    const famInvoices = famStudents.flatMap(s => (s.invoices||[]).map(inv => ({...inv, student:s.name})));
    const famTotal    = famStudents.reduce((sum,s) => sum + (s.invoices||[]).reduce((a,i)=>a+i.amount,0), 0);

    const body = `
    <!-- HEADER -->
    <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;
      background:var(--md-surface-low);border-radius:var(--shape-md);
      margin-bottom:var(--sp-4);border:1px solid var(--md-outline-variant)">
      ${UI.avatar(f.name[0],'lg')}
      <div style="flex:1">
        <div style="font-size:var(--fs-title-md);font-weight:700;color:var(--md-on-surface)">${f.name}</div>
        <div class="text-muted" style="font-size:var(--fs-body-sm);margin-top:2px">
          ${f.branch} · ${(f.studentIds||[]).length} student${(f.studentIds||[]).length!==1?'s':''}
          ${f.unreadCount>0?`· <span class="text-error">${f.unreadCount} unread</span>`:''}
        </div>
        <div style="margin-top:var(--sp-2);display:flex;gap:6px;align-items:center">
          ${UI.badge(sm.label, sm.cls.replace('badge-',''))}
          ${f.assignee
            ? `<span class="text-muted" style="font-size:var(--fs-label-sm)">Assignee: ${f.assignee}</span>`
            : `<span class="text-warning" style="font-size:var(--fs-label-sm)">${UI.icon('warning','sm')} Unassigned</span>`}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:var(--fs-headline-sm);font-weight:700;color:var(--md-on-surface)">฿${famTotal.toLocaleString()}</div>
        <div class="text-muted" style="font-size:var(--fs-label-sm);margin-bottom:var(--sp-2)">Total Paid</div>
        <div style="display:flex;gap:6px;justify-content:flex-end">
          <button class="btn btn-primary btn-sm" onclick="openInboxFor('${f.name}')">
            ${UI.icon('chat','sm')} Message</button>
          <button class="btn btn-secondary btn-sm" onclick="showToast('Calling ${primary.phone}…','info')">
            ${UI.icon('call','sm')}</button>
        </div>
      </div>
    </div>

    <!-- STUDENT STRIP -->
    <div style="display:grid;grid-template-columns:repeat(${Math.min(famStudents.length,4)},1fr);
      gap:var(--sp-2);margin-bottom:var(--sp-4)">
      ${famStudents.map(s => {
        const minLeft = Math.min(...s.courses.map(c=>c.left));
        const col = s.status==='active'?'var(--md-success)':s.status==='renewal'
          ?(minLeft<=1?'var(--md-error)':'var(--md-warning)'):'var(--md-on-surface-variant)';
        const totalH = s.courses.reduce((a,c)=>a+c.hours,0);
        const usedH  = s.courses.reduce((a,c)=>a+c.used, 0);
        return `<div class="card-outlined" style="padding:var(--sp-2) var(--sp-3)">
          <div style="font-weight:600;margin-bottom:2px">${s.name}${s.nick?` <span class="text-muted" style="font-weight:400">(${s.nick})</span>`:''}</div>
          <div class="text-muted" style="font-size:var(--fs-label-sm);margin-bottom:var(--sp-1)">${s.courses.map(c=>c.name).join(' · ')}</div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span class="text-muted" style="font-size:var(--fs-label-sm)">${usedH}/${totalH}h.</span>
            <span style="font-size:var(--fs-title-sm);font-weight:700;color:${col}">${minLeft} left</span>
          </div>
        </div>`;
      }).join('')}
    </div>

    <div class="tabs" style="margin-bottom:0">
      <div class="tab active" onclick="famTab('overview',this)">Overview</div>
      <div class="tab"        onclick="famTab('billing',this)">Billing</div>
      <div class="tab"        onclick="famTab('notes',this)">Notes</div>
      <div class="tab"        onclick="famTab('timeline',this)">Timeline</div>
    </div>

    <!-- OVERVIEW -->
    <div id="ftab-overview" class="modal-section" style="padding-top:var(--sp-4)">
      <div class="modal-section-title">Parents / Guardians</div>
      ${f.parents.map((p,idx) => {
        const isPrimary = (f.primaryParentIndex ?? 0) === idx;
        return `<div class="card-outlined" style="margin-bottom:var(--sp-2);
          ${isPrimary?'border-color:var(--md-success)':''}">
          <div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-2)">
            ${UI.avatar(p.name[0],'sm')}
            <strong>${p.name}</strong>
            ${UI.badge(p.role,'gray')}
            ${isPrimary?UI.badge('★ Primary','green'):''}
            ${p.lineActive?UI.badge('LINE Active','blue'):''}
            ${!isPrimary?`<button class="btn btn-secondary btn-sm" style="margin-left:auto"
              onclick="setFamPrimary('${f.id}',${idx})">Set Primary</button>`:''}
          </div>
          ${UI.infoGrid([
            p.line  ? {label:'LINE',  value:p.line}  : null,
            p.phone ? {label:'Phone', value:p.phone} : null,
            p.email ? {label:'Email', value:`<span style="font-size:var(--fs-label-sm)">${p.email}</span>`} : null,
          ].filter(Boolean))}
        </div>`;
      }).join('')}
      ${UI.infoGrid([
        {label:'Branch',       value:f.branch},
        {label:'Assignee',     value:f.assignee||`<span class="text-warning">Unassigned</span>`},
        {label:'Last Contact', value:f.lastContact},
        {label:'Channel',      value:f.channel},
      ])}
      <div class="modal-section-title" style="margin-top:var(--sp-4)">Enrolled Students</div>
      ${famStudents.map(s => {
        const ssm = CONST.STUDENT_STATUS[s.status];
        return `<div style="display:flex;align-items:center;gap:var(--sp-3);padding:var(--sp-2) var(--sp-3);
          background:var(--md-surface-low);border-radius:var(--shape-sm);margin-bottom:var(--sp-2);
          border:1px solid var(--md-outline-variant)">
          ${UI.avatar(s.name[0],'md')}
          <div style="flex:1">
            <div style="font-weight:600">${s.name}${s.nick?` <span class="text-muted">(${s.nick})</span>`:''}</div>
            <div class="text-muted" style="font-size:var(--fs-label-sm)">${s.courses.map(c=>c.name).join(' · ')} · ${s.branch}</div>
          </div>
          ${UI.badge(ssm.label, ssm.cls.replace('badge-',''))}
          <button class="btn btn-secondary btn-sm" onclick="openStudentModal('${s.id}')">View Profile</button>
        </div>`;
      }).join('')}
    </div>

    <!-- BILLING -->
    <div id="ftab-billing" class="modal-section" style="display:none;padding-top:var(--sp-4)">
      ${UI.infoGrid([
        {label:'Total Paid',   value:`<strong>฿${famTotal.toLocaleString()}</strong>`},
        {label:'Invoices',     value:`<strong>${famInvoices.length}</strong>`},
        {label:'Students',     value:famStudents.length},
        {label:'Last Payment', value:famInvoices[famInvoices.length-1]?.date||'—'},
      ])}
      ${UI.sectionTitle('Invoice History',
        `<button class="btn btn-primary btn-sm" onclick="openNewInvoice()">
          ${UI.icon('add','sm')} New Invoice</button>`
      )}
      <table><thead><tr>
        <th>Ref #</th><th>Student</th><th>Date</th><th>Course</th><th>Amount</th><th>Status</th><th></th>
      </tr></thead>
        <tbody>${famInvoices.map(inv=>`<tr>
          <td class="text-primary" style="font-weight:600;font-size:var(--fs-label-sm)">${inv.id}</td>
          <td>${inv.student}</td><td>${inv.date}</td><td>${inv.course}</td>
          <td style="font-weight:600">฿${inv.amount.toLocaleString()}</td>
          <td>${UI.badge('Paid','green')}</td>
          <td><button class="btn btn-secondary btn-sm"
            onclick="openDocPreview('${inv.id}','invoice')">${UI.icon('receipt_long','sm')} INV</button></td>
        </tr>`).join('')}</tbody>
      </table>
    </div>

    <!-- NOTES -->
    <div id="ftab-notes" class="modal-section" style="display:none;padding-top:var(--sp-4)">
      ${f.notes.length ? f.notes.map(n=>`
      <div style="display:flex;gap:var(--sp-2);margin-bottom:var(--sp-3)">
        ${UI.avatar(n.author[0],'sm')}
        <div style="flex:1;background:var(--md-surface-low);border-radius:var(--shape-sm);
          padding:var(--sp-2) var(--sp-3);border:1px solid var(--md-outline-variant)">
          <div class="text-muted" style="font-size:var(--fs-label-sm);margin-bottom:4px">
            ${n.author} · ${n.date}</div>
          <div style="font-size:var(--fs-body-sm)">${n.text}</div>
        </div>
      </div>`).join('') : UI.emptyState('note','No notes yet','')}
      <textarea id="fam-note-${f.id}" class="form-input" placeholder="Add a note…" rows="2"
        style="width:100%;resize:none;margin-top:var(--sp-2)"></textarea>
      <div style="text-align:right;margin-top:var(--sp-2)">
        <button class="btn btn-primary btn-sm" onclick="saveFamNote('${f.id}')">
          ${UI.icon('save','sm')} Save Note</button>
      </div>
    </div>

    <!-- TIMELINE -->
    <div id="ftab-timeline" class="modal-section" style="display:none;padding-top:var(--sp-4)">
      <div class="text-muted" style="font-size:var(--fs-label-sm);margin-bottom:var(--sp-2)">All students · newest first</div>
      <div style="max-height:400px;overflow-y:auto">${Timeline.build(Timeline.fromFamily(f))}</div>
    </div>`;

    Modal.create(`modal-family-${f.id}`, `${UI.icon('family_restroom')} ${f.name}`, body,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-family-${f.id}')">Close</button>
       <button class="btn btn-secondary" onclick="famEdit('${f.id}')">${UI.icon('edit','sm')} Edit</button>
       <button class="btn btn-primary" onclick="openInboxFor('${f.name}');Modal.close('modal-family-${f.id}')">
         ${UI.icon('chat','sm')} Open Inbox</button>`,
      'modal-lg');
  };

  /* ── EDIT FAMILY ──────────────────────────────────────────
     แก้ชื่อ/สาขา/ผู้ดูแล + ผู้ปกครองแต่ละคน (ชื่อ/บทบาท/โทร/LINE) */
  window.famEdit = function(id) {
    const f = families.find(x=>x.id===id); if (!f) return;
    Modal.close(`modal-family-${id}`);
    const branchOpts = (DB.branchSettings||[]).map(b=>b.branch);
    const staffOpts  = [...new Set((DB.staff||[]).map(s=>s.name))];
    const parentRow = (p,i)=>`
      <div class="fe-parent" style="border:1px solid var(--md-outline-variant);border-radius:8px;padding:10px 12px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
          <span style="font-size:11px;font-weight:700;color:var(--md-on-surface-variant)">ผู้ปกครอง ${i+1}</span>
          <button class="btn btn-secondary btn-sm" onclick="this.closest('.fe-parent').remove()">${UI.icon('close','sm')}</button>
        </div>
        <div style="display:grid;grid-template-columns:1fr 90px;gap:8px;margin-bottom:8px">
          <input class="settings-input fe-p-name" value="${p.name||''}" placeholder="ชื่อ-นามสกุล">
          <input class="settings-input fe-p-role" value="${p.role||''}" placeholder="Mom/Dad">
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <input class="settings-input fe-p-phone" value="${p.phone||''}" placeholder="เบอร์โทร">
          <input class="settings-input fe-p-line" value="${p.line||''}" placeholder="@lineid">
        </div>
      </div>`;
    Modal.create('modal-fam-edit', `${UI.icon('edit','sm')} แก้ไข ${f.name}`,
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div><label class="settings-label">ชื่อครอบครัว</label>
          <input id="fe-name" class="settings-input" value="${f.name||''}"></div>
        <div><label class="settings-label">สาขา</label>
          <select id="fe-branch" class="settings-input">${branchOpts.map(b=>`<option ${f.branch===b?'selected':''}>${b}</option>`).join('')}</select></div>
      </div>
      <div class="settings-group" style="margin-bottom:14px"><label class="settings-label">ผู้ดูแล (Assignee)</label>
        <select id="fe-assignee" class="settings-input">${staffOpts.map(s=>`<option ${f.assignee===s?'selected':''}>${s}</option>`).join('')}</select></div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <span class="settings-label" style="margin:0">ผู้ปกครอง</span>
        <button class="btn btn-secondary btn-sm" onclick="famEditAddParent()">${UI.icon('add','sm')} เพิ่ม</button>
      </div>
      <div id="fe-parents">${(f.parents||[]).map(parentRow).join('')}</div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-fam-edit')">Cancel</button>
       <button class="btn btn-primary" onclick="famEditSave('${id}')">${UI.icon('save','sm')} บันทึก</button>`);
    window._famEditParentRow = parentRow;
  };
  window.famEditAddParent = function() {
    const c = document.getElementById('fe-parents'); if(!c) return;
    c.insertAdjacentHTML('beforeend', window._famEditParentRow({}, c.children.length));
  };
  window.famEditSave = function(id) {
    const f = families.find(x=>x.id===id); if(!f) return;
    const g = i => document.getElementById(i)?.value.trim();
    const name = g('fe-name'); if(!name) return showToast('ใส่ชื่อครอบครัว','warning');
    f.name = name; f.branch = g('fe-branch'); f.assignee = g('fe-assignee');
    f.parents = [...document.querySelectorAll('#fe-parents .fe-parent')].map(row=>({
      name:  row.querySelector('.fe-p-name')?.value.trim()||'',
      role:  row.querySelector('.fe-p-role')?.value.trim()||'',
      phone: row.querySelector('.fe-p-phone')?.value.trim()||'',
      line:  row.querySelector('.fe-p-line')?.value.trim()||'',
      lineActive:true,
    })).filter(p=>p.name);
    Modal.close('modal-fam-edit');
    if (typeof buildTable === 'function') buildTable();
    showToast(`บันทึก ${name} แล้ว ✓`,'success');
    setTimeout(()=>openFamilyModal(id), 80);
  };

  window.famTab = function(tab,el) {
    const modal = el.closest('.modal');
    if (!modal) return;
    modal.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
    el.classList.add('active');
    ['overview','billing','notes','timeline'].forEach(t => {
      const p = modal.querySelector(`#ftab-${t}`);
      if (p) p.style.display = t===tab?'':'none';
    });
  };

  window.setFamPrimary = function(id,idx) {
    const f = families.find(x=>x.id===id);
    if (!f) return;
    f.primaryParentIndex = idx;
    showToast(`${f.parents[idx].name} set as Primary Contact ✓`,'success');
    Modal.close(`modal-family-${id}`);
    openFamilyModal(id);
  };

  window.saveFamNote = function(id) {
    const ta = document.getElementById(`fam-note-${id}`);
    if (!ta||!ta.value.trim()) return;
    const f = families.find(x=>x.id===id);
    f.notes.push({type:'admin',text:ta.value.trim(),author:'Admin Nock',date:'Now'});
    showToast('Note saved ✓','success');
    Modal.close(`modal-family-${id}`);
    openFamilyModal(id);
  };

})();
