/* ============================================================
   families.js — Families Module: List + Family Modal
   ============================================================ */
(function () {

  /* ── DATA (from global DB) ────────────────────────────── */
  const families   = DB.families;
  const STATUS_META = CONST.FAMILY_STATUS;

  let searchVal = '', filterBranch = '';

  /* ── SHELL HTML ───────────────────────────────────────── */
  document.getElementById('view-families').innerHTML = `
  <div class="page-header">
    <div><div class="page-title">Families</div><div class="page-sub">5 families · 5 students</div></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-secondary btn-sm" onclick="showToast('Export coming soon','info')">Export</button>
      <button class="btn btn-primary btn-sm" onclick="showToast('Add family coming soon','info')">＋ Add Family</button>
    </div>
  </div>

  <!-- FILTER BAR -->
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center">
    <input type="text" id="fam-search" placeholder="Search family, student, LINE…"
      style="border:1px solid #e5e7eb;border-radius:6px;padding:6px 10px;font-size:13px;outline:none;width:220px"
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
            <th>Students</th>
            <th>Branch</th>
            <th>Primary Contact</th>
            <th>Last Message</th>
            <th>Assignee</th>
            <th>Total Paid</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="fam-tbody"></tbody>
      </table>
    </div>
  </div>`;

  /* ── BUILD TABLE ──────────────────────────────────────── */
  function buildTable() {
    let list = families.filter(f => {
      const q = searchVal.toLowerCase();
      const matchSearch = !q || f.name.toLowerCase().includes(q)
        || f.students.some(s => s.toLowerCase().includes(q))
        || f.parents.some(p => p.line.toLowerCase().includes(q) || p.name.toLowerCase().includes(q));
      const matchBranch = !filterBranch || f.branch === filterBranch;
      return matchSearch && matchBranch;
    });

    document.getElementById('fam-count').textContent = `${list.length} families`;
    document.getElementById('fam-tbody').innerHTML = list.map(f => {
      const sm = STATUS_META[f.status] || STATUS_META.active;
      const primary = f.parents[0];
      const unreadBadge = f.unreadCount > 0
        ? `<span style="background:#ef4444;color:#fff;border-radius:10px;padding:1px 6px;font-size:10px;margin-left:4px">${f.unreadCount}</span>` : '';
      return `<tr>
        <td>
          <strong style="cursor:pointer;color:#6366f1" onclick="openFamilyModal('${f.id}')">${f.name}</strong>
        </td>
        <td style="font-size:12px">${f.students.map(s =>
          `<span style="cursor:pointer;color:#6366f1" onclick="openStudentByName('${s}')">${s}</span>`
        ).join(', ')}</td>
        <td style="font-size:12px">${f.branch}</td>
        <td style="font-size:12px">${primary.name}<br><span style="color:#9ca3af">${primary.line||primary.phone}</span></td>
        <td style="font-size:12px">${f.lastContact}${unreadBadge}<br><span style="color:#9ca3af;font-size:11px">${f.channel}</span></td>
        <td style="font-size:12px">${f.assignee||'<span style="color:#9ca3af">Unassigned</span>'}</td>
        <td style="font-size:12px">฿${f.totalPaid.toLocaleString()}</td>
        <td><span class="badge ${sm.cls}">${sm.label}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openFamilyModal('${f.id}')">View</button>
          <button class="chat-btn" onclick="openInboxFor('${f.name}')" title="Open in Inbox">💬</button>
        </td>
      </tr>`;
    }).join('');
  }

  buildTable();

  /* ── SEARCH / FILTER ──────────────────────────────────── */
  window.famSearch = v => { searchVal = v; buildTable(); };
  window.famBranch = v => { filterBranch = v; buildTable(); };

  /* ── OPEN STUDENT LINK ────────────────────────────────── */
  window.openStudentByName = function(name) {
    showView('students');
    // slight delay so students view renders, then open modal by name match
    setTimeout(() => {
      document.getElementById('stu-search').value = name;
      stuSearch(name);
    }, 100);
  };

  /* ── FAMILY MODAL ─────────────────────────────────────── */
  window.openFamilyModal = function(id) {
    const f = families.find(x => x.id === id);
    if (!f) return;

    const body = `
    <!-- HEADER -->
    <div style="display:flex;align-items:center;gap:14px;padding:14px 18px;background:#f9fafb;border-radius:8px;margin-bottom:16px">
      <div class="avatar" style="width:52px;height:52px;font-size:20px;flex-shrink:0">${f.name[0]}</div>
      <div style="flex:1">
        <div style="font-size:17px;font-weight:700;color:#1a1d23">${f.name}</div>
        <div style="font-size:12px;color:#6b7280">${f.branch} · ${f.students.length} student${f.students.length>1?'s':''}</div>
        <div style="margin-top:4px"><span class="badge ${STATUS_META[f.status]?.cls||'badge-green'}">${STATUS_META[f.status]?.label||'Active'}</span></div>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:flex-end">
        <button class="btn btn-primary btn-sm" onclick="openInboxFor('${f.name}')">💬 Message</button>
        <button class="btn btn-secondary btn-sm" onclick="showToast('Calling ${f.parents[0]?.phone}…','info')">📞 Call</button>
      </div>
    </div>

    <!-- TABS -->
    <div class="tabs" style="margin-bottom:0">
      <div class="tab active" onclick="famTab('profile',this)">👤 Profile</div>
      <div class="tab"        onclick="famTab('students',this)">🎓 Students</div>
      <div class="tab"        onclick="famTab('notes',this)">📝 Notes</div>
    </div>

    <!-- TAB: PROFILE -->
    <div id="ftab-profile" class="modal-section" style="padding-top:12px">
      <div class="modal-section-title">Parents / Guardians</div>
      ${f.parents.map(p => `
      <div style="background:#f9fafb;border:1px solid #f3f4f6;border-radius:8px;padding:12px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
          <div class="avatar" style="width:28px;height:28px;font-size:10px">${p.name[0]}</div>
          <strong style="font-size:13px">${p.name}</strong>
          <span class="badge badge-gray" style="font-size:10px">${p.role}</span>
          ${p.lineActive ? '<span class="badge badge-green" style="font-size:10px">LINE Active</span>' : ''}
        </div>
        <div class="info-grid">
          ${p.line  ? `<div class="info-item"><div class="label">LINE ID</div>${p.line}</div>` : ''}
          ${p.phone ? `<div class="info-item"><div class="label">Phone</div>${p.phone}</div>` : ''}
          ${p.email ? `<div class="info-item"><div class="label">Email</div><span style="font-size:11px">${p.email}</span></div>` : ''}
        </div>
      </div>`).join('')}
      <div class="info-grid" style="margin-top:8px">
        <div class="info-item"><div class="label">Branch</div>${f.branch}</div>
        <div class="info-item"><div class="label">Assignee</div>${f.assignee||'<span style="color:#9ca3af">Unassigned</span>'}</div>
        <div class="info-item"><div class="label">Total Paid</div><strong>฿${f.totalPaid.toLocaleString()}</strong></div>
        <div class="info-item"><div class="label">Invoices</div>${f.invoiceCount} invoice${f.invoiceCount!==1?'s':''}</div>
      </div>
    </div>

    <!-- TAB: STUDENTS -->
    <div id="ftab-students" class="modal-section" style="display:none;padding-top:12px">
      <div class="modal-section-title">Enrolled Students</div>
      ${f.students.map(sName => `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 14px;background:#f9fafb;border-radius:8px;margin-bottom:8px;border:1px solid #f3f4f6">
        <div class="avatar" style="width:34px;height:34px;font-size:13px">${sName[0]}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13px">${sName}</div>
          <div style="font-size:11px;color:#9ca3af">${f.branch}</div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="openStudentByName('${sName}');Modal.close('modal-family-${f.id}')">View Profile</button>
      </div>`).join('')}
    </div>

    <!-- TAB: NOTES -->
    <div id="ftab-notes" class="modal-section" style="display:none;padding-top:12px">
      ${f.notes.length ? f.notes.map(n => `
      <div style="display:flex;gap:10px;margin-bottom:12px">
        <div class="avatar" style="width:28px;height:28px;font-size:10px;flex-shrink:0">${n.author[0]}</div>
        <div style="flex:1;background:#f9fafb;border-radius:8px;padding:10px;border:1px solid #f3f4f6">
          <div style="font-size:11px;color:#9ca3af;margin-bottom:4px">${n.author} · ${n.date}</div>
          <div style="font-size:13px;color:#374151">${n.text}</div>
        </div>
      </div>`).join('') : '<div style="color:#9ca3af;font-size:13px;text-align:center;padding:20px">No notes yet</div>'}
      <textarea id="fam-note-${f.id}" placeholder="Add a note…" rows="2"
        style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:8px;font-size:12px;resize:none;outline:none;box-sizing:border-box;margin-top:8px"></textarea>
      <div style="text-align:right;margin-top:6px">
        <button class="btn btn-primary btn-sm" onclick="saveFamNote('${f.id}')">Save Note</button>
      </div>
    </div>`;

    Modal.create(`modal-family-${f.id}`, `👨‍👩‍👧 ${f.name}`, body,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-family-${f.id}')">Close</button>
       <button class="btn btn-secondary" onclick="showToast('Edit coming soon','info')">✏️ Edit</button>
       <button class="btn btn-primary" onclick="openInboxFor('${f.name}');Modal.close('modal-family-${f.id}')">💬 Open Inbox</button>`,
      'modal-lg'
    );
  };

  /* ── TAB SWITCH ───────────────────────────────────────── */
  window.famTab = function(tab, el) {
    const modal = el.closest('.modal');
    if (!modal) return;
    modal.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    ['profile','students','notes'].forEach(t => {
      const p = modal.querySelector(`#ftab-${t}`);
      if (p) p.style.display = t === tab ? '' : 'none';
    });
  };

  /* ── SAVE NOTE ────────────────────────────────────────── */
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
