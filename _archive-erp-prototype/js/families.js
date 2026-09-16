/* ============================================================
   families.js — Families Module: List + Family Modal
   ============================================================ */
(function () {

  const families    = DB.families;
  const students    = DB.students;
  const STATUS_META = CONST.FAMILY_STATUS;

  let searchVal = '', filterBranch = '';

  /* ── HELPERS ─────────────────────────────────────────────── */
  // Derive family status from its students
  function _famStatus(f) {
    const recs = students.filter(s => f.students.includes(s.name));
    if (!recs.length) return 'archived';
    if (recs.some(s => s.status === 'active'))   return 'active';
    if (recs.some(s => s.status === 'renewal'))  return 'renewal';
    if (recs.every(s => s.status === 'pause'))   return 'pause';
    return 'archived';
  }

  function _primaryParent(f) {
    const idx = f.primaryParentIndex ?? 0;
    return f.parents[idx] || f.parents[0];
  }

  function _totalRevenue() {
    return families.reduce((sum, f) => sum + f.totalPaid, 0);
  }

  function _kpi() {
    const active    = families.filter(f => _famStatus(f) === 'active').length;
    const renewal   = families.filter(f => _famStatus(f) === 'renewal').length;
    const urgent    = families.filter(f => {
      const recs = students.filter(s => f.students.includes(s.name));
      return recs.some(s => s.status==='renewal' && Math.min(...s.courses.map(c=>c.left)) <= 1);
    }).length;
    const unread    = families.filter(f => f.unreadCount > 0).length;
    const unassigned= families.filter(f => !f.assignee).length;
    const multiStu  = families.filter(f => f.students.length >= 2).length;
    return { active, renewal, urgent, revenue: _totalRevenue(), unread, unassigned, multiStu };
  }

  /* ── RENDER SHELL ────────────────────────────────────────── */
  function renderShell() {
    const k = _kpi();
    document.getElementById('view-families').innerHTML = `
    <div class="page-header">
      <div>
        <div class="page-title">Families</div>
        <div class="page-sub" id="fam-count-sub">${families.length} families · ${students.filter(s=>s.status!=='archived').length} students</div>
      </div>
      <button class="btn btn-secondary btn-sm" onclick="showToast('Export coming soon','info')">Export</button>
    </div>

    <!-- KPI CARDS -->
    <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:14px">
      <div class="card" style="padding:12px 14px">
        <div style="font-size:20px;font-weight:700;color:#10b981">${k.active}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:1px">Active</div>
      </div>
      <div class="card" style="padding:12px 14px;${k.urgent?'border-color:#ef4444':''}">
        <div style="font-size:20px;font-weight:700;color:${k.urgent?'#ef4444':'#f59e0b'}">${k.renewal}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:1px">
          Renewal${k.urgent?` <span style="color:#ef4444;font-weight:600">(${k.urgent}🚨)</span>`:''}
        </div>
      </div>
      <div class="card" style="padding:12px 14px">
        <div style="font-size:17px;font-weight:700;color:#1a1d23">฿${(k.revenue/1000).toFixed(0)}K</div>
        <div style="font-size:11px;color:#6b7280;margin-top:1px">Revenue</div>
      </div>
      <div class="card" style="padding:12px 14px;${k.unread?'border-color:#6366f1':''}">
        <div style="font-size:20px;font-weight:700;color:${k.unread?'#6366f1':'#9ca3af'}">${k.unread}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:1px">Unread</div>
      </div>
      <div class="card" style="padding:12px 14px;${k.unassigned?'border-color:#f59e0b':''}">
        <div style="font-size:20px;font-weight:700;color:${k.unassigned?'#f59e0b':'#9ca3af'}">${k.unassigned}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:1px">Unassigned</div>
      </div>
      <div class="card" style="padding:12px 14px">
        <div style="font-size:20px;font-weight:700;color:#6366f1">${k.multiStu}</div>
        <div style="font-size:11px;color:#6b7280;margin-top:1px">Multi-Student</div>
      </div>
    </div>

    <!-- FILTER BAR -->
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:center">
      <input type="text" id="fam-search" placeholder="Search family, student, LINE…"
        style="border:1px solid #e5e7eb;border-radius:6px;padding:6px 10px;font-size:13px;outline:none;width:230px"
        oninput="famSearch(this.value)">
      <select onchange="famBranch(this.value)"
        style="border:1px solid #e5e7eb;border-radius:6px;padding:5px 8px;font-size:12px;outline:none;color:#374151">
        <option value="">All Branches</option>
        <option>Sukhumvit</option>
        <option>Silom</option>
      </select>
      <div style="margin-left:auto;font-size:12px;color:#9ca3af" id="fam-count"></div>
    </div>

    <!-- TABLE -->
    <div class="card" style="padding:0;overflow:hidden">
      <div class="table-wrap">
        <table id="fam-table">
          <thead>
            <tr>
              <th>Family</th>
              <th>Parents</th>
              <th>Students</th>
              <th>Branch</th>
              <th>Total Paid</th>
              <th>Last Contact</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody id="fam-tbody"></tbody>
        </table>
      </div>
    </div>`;
  }

  /* ── BUILD TABLE ─────────────────────────────────────────── */
  function buildTable() {
    let list = families.filter(f => {
      const q = searchVal.toLowerCase();
      const matchSearch = !q || f.name.toLowerCase().includes(q)
        || f.students.some(s => s.toLowerCase().includes(q))
        || f.parents.some(p => (p.line||'').toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
      const matchBranch = !filterBranch || f.branch === filterBranch;
      return matchSearch && matchBranch;
    });

    const countEl = document.getElementById('fam-count');
    if (countEl) countEl.textContent = `${list.length} families`;

    document.getElementById('fam-tbody').innerHTML = list.map(f => {
      const status  = _famStatus(f);
      const sm      = STATUS_META[status] || STATUS_META.active;
      const primary = _primaryParent(f);
      const unreadBadge = f.unreadCount > 0
        ? `<span style="background:#ef4444;color:#fff;border-radius:10px;padding:1px 6px;font-size:10px;margin-left:4px">${f.unreadCount}</span>` : '';
      const parentStr = f.parents.map(p =>
        `<div style="font-size:11px">${p.name} <span class="badge badge-gray" style="font-size:9px">${p.role}</span>${(f.primaryParentIndex??0)===f.parents.indexOf(p)?` <span style="color:#10b981;font-size:9px">★</span>`:''}</div>`
      ).join('');
      const stuStr = f.students.map(sName => {
        const stu = students.find(s => s.name === sName);
        const col  = stu ? (STATUS_META[stu.status]?.cls||'badge-gray') : 'badge-gray';
        return `<span style="color:#6366f1;cursor:pointer;font-size:12px" onclick="openStudentModal('${stu?.id||''}')">${sName}</span>`;
      }).join('<span style="color:#d1d5db"> · </span>');
      return `<tr style="cursor:pointer" onclick="openFamilyModal('${f.id}')">
        <td><strong style="color:var(--md-primary)">${f.name}</strong></td>
        <td>${parentStr}</td>
        <td>${stuStr}</td>
        <td style="font-size:12px">${f.branch}</td>
        <td style="font-size:13px;font-weight:600">฿${f.totalPaid.toLocaleString()}</td>
        <td style="font-size:12px">${f.lastContact}${unreadBadge}
          <div style="font-size:10px;color:#9ca3af">${f.channel}</div>
        </td>
        <td><span class="badge ${sm.cls}">${sm.label}</span></td>
        <td onclick="event.stopPropagation()" style="white-space:nowrap">
          <button class="chat-btn" onclick="openInboxFor('${f.name}')" title="Inbox">💬</button>
          <button class="chat-btn" onclick="openFamilyModal('${f.id}')" title="View">✏️</button>
        </td>
      </tr>`;
    }).join('');
  }

  renderShell();
  buildTable();

  /* ── SEARCH / FILTER ─────────────────────────────────────── */
  window.famSearch = v => { searchVal = v; buildTable(); };
  window.famBranch = v => { filterBranch = v; buildTable(); };

  /* ── FAMILY MODAL ────────────────────────────────────────── */
  window.openFamilyModal = function(id) {
    const f = families.find(x => x.id === id);
    if (!f) return;
    const status = _famStatus(f);
    const sm     = STATUS_META[status] || STATUS_META.active;
    const primary = _primaryParent(f);
    const famStudents = students.filter(s => f.students.includes(s.name));
    const famInvoices = famStudents.flatMap(s => s.invoices.map(inv => ({...inv, student: s.name})));
    const famTotal    = famStudents.reduce((sum,s) => sum + s.invoices.reduce((a,i)=>a+i.amount,0), 0);

    const body = `
    <!-- HEADER -->
    <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;background:#f9fafb;border-radius:8px;margin-bottom:16px;border:1px solid #f3f4f6">
      <div class="avatar" style="width:52px;height:52px;font-size:20px;flex-shrink:0">${f.name[0]}</div>
      <div style="flex:1">
        <div style="font-size:17px;font-weight:700;color:#1a1d23">${f.name}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:2px">
          ${f.branch} · ${f.students.length} student${f.students.length!==1?'s':''}
          ${f.unreadCount>0?`· <span style="color:#ef4444">${f.unreadCount} unread</span>`:''}
        </div>
        <div style="margin-top:6px;display:flex;gap:6px;align-items:center">
          <span class="badge ${sm.cls}">${sm.label}</span>
          ${f.assignee?`<span style="font-size:11px;color:#9ca3af">Assignee: ${f.assignee}</span>`
            :`<span style="font-size:11px;color:#f59e0b">⚠️ Unassigned</span>`}
        </div>
      </div>
      <div style="text-align:right">
        <div style="font-size:18px;font-weight:700;color:#1a1d23">฿${famTotal.toLocaleString()}</div>
        <div style="font-size:10px;color:#9ca3af;margin-bottom:8px">Total Paid</div>
        <div style="display:flex;gap:6px;justify-content:flex-end">
          <button class="btn btn-primary btn-sm" onclick="openInboxFor('${f.name}')">💬 Message</button>
          <button class="btn btn-secondary btn-sm" onclick="showToast('Calling ${primary.phone}…','info')">📞</button>
        </div>
      </div>
    </div>

    <!-- KPI STRIP -->
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">
      ${famStudents.map(s => {
        const minLeft = Math.min(...s.courses.map(c=>c.left));
        const col = s.status==='active'?'#10b981':s.status==='renewal'?(minLeft<=1?'#ef4444':'#f59e0b'):'#9ca3af';
        const totalH = s.courses.reduce((a,c)=>a+c.hours,0);
        const usedH  = s.courses.reduce((a,c)=>a+c.used, 0);
        return `<div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px">
          <div style="font-size:12px;font-weight:600;color:#1a1d23;margin-bottom:4px">${s.name}${s.nick?` <span style="color:#9ca3af;font-weight:400">(${s.nick})</span>`:''}</div>
          <div style="font-size:10px;color:#9ca3af;margin-bottom:6px">${s.courses.map(c=>c.name).join(' · ')}</div>
          <div style="display:flex;align-items:center;justify-content:space-between">
            <span style="font-size:11px;color:#6b7280">${usedH}/${totalH}h.</span>
            <span style="font-size:14px;font-weight:700;color:${col}">${minLeft} left</span>
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- TABS -->
    <div class="tabs" style="margin-bottom:0">
      <div class="tab active" onclick="famTab('overview',this)">Overview</div>
      <div class="tab"        onclick="famTab('billing',this)">Billing</div>
      <div class="tab"        onclick="famTab('notes',this)">Notes</div>
      <div class="tab"        onclick="famTab('timeline',this)">Timeline</div>
    </div>

    <!-- OVERVIEW: Parents + Family Info -->
    <div id="ftab-overview" class="modal-section" style="padding-top:14px">
      <div class="modal-section-title" style="margin-bottom:10px">Parents / Guardians</div>
      ${f.parents.map((p, idx) => {
        const isPrimary = (f.primaryParentIndex ?? 0) === idx;
        return `<div style="background:#f9fafb;border:1px solid ${isPrimary?'#10b981':'#f3f4f6'};border-radius:8px;padding:12px;margin-bottom:8px">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
            <div class="avatar" style="width:28px;height:28px;font-size:10px">${p.name[0]}</div>
            <strong style="font-size:13px">${p.name}</strong>
            <span class="badge badge-gray" style="font-size:10px">${p.role}</span>
            ${isPrimary?'<span class="badge badge-green" style="font-size:10px">★ Primary</span>':''}
            ${p.lineActive?'<span class="badge badge-blue" style="font-size:10px">LINE Active</span>':''}
            ${!isPrimary?`<button class="btn btn-secondary btn-sm" style="margin-left:auto;font-size:10px"
              onclick="setFamPrimary('${f.id}',${idx})">Set Primary</button>`:''}
          </div>
          <div class="info-grid">
            ${p.line  ?`<div class="info-item"><div class="label">LINE</div>${p.line}</div>`:''}
            ${p.phone ?`<div class="info-item"><div class="label">Phone</div>${p.phone}</div>`:''}
            ${p.email ?`<div class="info-item"><div class="label">Email</div><span style="font-size:11px">${p.email}</span></div>`:''}
          </div>
        </div>`;
      }).join('')}
      <div class="info-grid" style="margin-top:10px">
        <div class="info-item"><div class="label">Branch</div>${f.branch}</div>
        <div class="info-item"><div class="label">Assignee</div>${f.assignee||'<span style="color:#f59e0b">Unassigned</span>'}</div>
        <div class="info-item"><div class="label">Last Contact</div>${f.lastContact}</div>
        <div class="info-item"><div class="label">Channel</div>${f.channel}</div>
      </div>
      <div class="modal-section-title" style="margin:14px 0 10px">Enrolled Students</div>
      ${famStudents.map(s => {
        const ssm = CONST.STUDENT_STATUS[s.status];
        return `<div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:#f9fafb;border-radius:8px;margin-bottom:8px;border:1px solid #f3f4f6">
          <div class="avatar" style="width:34px;height:34px;font-size:13px">${s.name[0]}</div>
          <div style="flex:1">
            <div style="font-weight:600;font-size:13px">${s.name}${s.nick?` <span style="color:#9ca3af;font-weight:400;font-size:11px">(${s.nick})</span>`:''}</div>
            <div style="font-size:11px;color:#9ca3af">${s.courses.map(c=>c.name).join(' · ')} · ${s.branch}</div>
          </div>
          <span class="badge ${ssm.cls}">${ssm.label}</span>
          <button class="btn btn-secondary btn-sm" onclick="openStudentModal('${s.id}')">View Profile</button>
        </div>`;
      }).join('')}
    </div>

    <!-- BILLING -->
    <div id="ftab-billing" class="modal-section" style="display:none;padding-top:14px">
      <div class="info-grid" style="margin-bottom:14px">
        <div class="info-item"><div class="label">Total Paid</div><strong>฿${famTotal.toLocaleString()}</strong></div>
        <div class="info-item"><div class="label">Invoices</div><strong>${famInvoices.length}</strong></div>
        <div class="info-item"><div class="label">Students</div>${famStudents.length}</div>
        <div class="info-item"><div class="label">Last Payment</div>${famInvoices[famInvoices.length-1]?.date||'—'}</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <div class="modal-section-title" style="margin-bottom:0">Invoice History</div>
        <button class="btn btn-primary btn-sm" style="font-size:11px"
          onclick="openNewInvoice()">＋ New Invoice</button>
      </div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Ref #</th><th>Student</th><th>Date</th><th>Course</th><th>Amount</th><th>Status</th><th></th></tr></thead>
          <tbody>
            ${famInvoices.map(inv=>`<tr>
              <td style="font-size:11px;color:#6366f1;font-weight:600">${inv.id}</td>
              <td style="font-size:12px">${inv.student}</td>
              <td style="font-size:12px">${inv.date}</td>
              <td style="font-size:12px">${inv.course}</td>
              <td>฿${inv.amount.toLocaleString()}</td>
              <td><span class="badge badge-green">Paid</span></td>
              <td style="white-space:nowrap">
                <button class="btn btn-secondary btn-sm" style="font-size:10px"
                  onclick="openDocPreview('${inv.id}','invoice')">📄 INV</button>
              </td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- NOTES -->
    <div id="ftab-notes" class="modal-section" style="display:none;padding-top:14px">
      ${f.notes.length ? f.notes.map(n=>`
      <div style="display:flex;gap:10px;margin-bottom:12px">
        <div class="avatar" style="width:28px;height:28px;font-size:10px;flex-shrink:0">${n.author[0]}</div>
        <div style="flex:1;background:#f9fafb;border-radius:8px;padding:10px;border:1px solid #f3f4f6">
          <div style="font-size:11px;color:#9ca3af;margin-bottom:4px">${n.author} · ${n.date}</div>
          <div style="font-size:13px;color:#374151">${n.text}</div>
        </div>
      </div>`).join('') : '<div style="color:#9ca3af;font-size:13px;text-align:center;padding:20px 0">No notes yet</div>'}
      <textarea id="fam-note-${f.id}" placeholder="Add a note…" rows="2"
        style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:8px;font-size:12px;resize:none;outline:none;box-sizing:border-box;margin-top:8px"></textarea>
      <div style="text-align:right;margin-top:6px">
        <button class="btn btn-primary btn-sm" onclick="saveFamNote('${f.id}')">Save Note</button>
      </div>
    </div>

    <!-- TIMELINE -->
    <div id="ftab-timeline" class="modal-section" style="display:none;padding:14px 0 0">
      <div style="font-size:11px;color:#9ca3af;margin-bottom:8px">All students · newest first</div>
      <div style="max-height:400px;overflow-y:auto">
        ${Timeline.build(Timeline.fromFamily(f))}
      </div>
    </div>`;

    Modal.create(`modal-family-${f.id}`, `👨‍👩‍👧 ${f.name}`, body,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-family-${f.id}')">Close</button>
       <button class="btn btn-secondary" onclick="showToast('Edit coming soon','info')">✏️ Edit</button>
       <button class="btn btn-primary" onclick="openInboxFor('${f.name}');Modal.close('modal-family-${f.id}')">💬 Open Inbox</button>`,
      'modal-lg'
    );
  };

  /* ── TAB SWITCH ──────────────────────────────────────────── */
  window.famTab = function(tab, el) {
    const modal = el.closest('.modal');
    if (!modal) return;
    modal.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    ['overview','billing','notes','timeline'].forEach(t => {
      const p = modal.querySelector(`#ftab-${t}`);
      if (p) p.style.display = t===tab ? '' : 'none';
    });
  };

  /* ── SET PRIMARY CONTACT ─────────────────────────────────── */
  window.setFamPrimary = function(id, idx) {
    const f = families.find(x => x.id === id);
    if (!f) return;
    f.primaryParentIndex = idx;
    showToast(`${f.parents[idx].name} set as Primary Contact ✓`, 'success');
    Modal.close(`modal-family-${id}`);
    openFamilyModal(id);
  };

  /* ── SAVE NOTE ───────────────────────────────────────────── */
  window.saveFamNote = function(id) {
    const ta = document.getElementById(`fam-note-${id}`);
    if (!ta || !ta.value.trim()) return;
    const f = families.find(x => x.id === id);
    f.notes.push({ type:'admin', text:ta.value.trim(), author:'Admin Nock', date:'Now' });
    showToast('Note saved ✓', 'success');
    Modal.close(`modal-family-${id}`);
    openFamilyModal(id);
  };

})();
