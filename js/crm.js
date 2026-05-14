/* ============================================================
   crm.js — CRM Module: Stats + Pipeline + Customers
   ============================================================ */
(function () {

  /* ── DATA ─────────────────────────────────────────────── */
  const customers = [
    { name:'Mia Tanaka',   family:'Tanaka Family', branch:'Sukhumvit', course:'English Reading', pkg:'Eng Active:48h.', remain:2,  total:48, since:'Jan 2026', until:'Jun 2026', status:'renewal' },
    { name:'Tom Chen',     family:'Chen Family',   branch:'Sukhumvit', course:'Math Grade 6',    pkg:'Math:24h.',       remain:14, total:20, since:'Mar 2026', until:'Aug 2026', status:'active'  },
    { name:'Ploy Srirak',  family:'Srirak Family', branch:'Silom',     course:'Math G5 + Thai',  pkg:'Math:24h. Thai:20h.', remain:18, total:44, since:'Nov 2025', until:'Jul 2026', status:'active' },
    { name:'James Wilson', family:'Wilson Family',  branch:'Sukhumvit', course:'Science',          pkg:'Sci:20h.',        remain:1,  total:20, since:'Feb 2026', until:'May 2026', status:'urgent'  },
    { name:'Kevin Park',   family:'Park Family',    branch:'Silom',     course:'Thai Language',    pkg:'Thai:20h.',       remain:9,  total:10, since:'Apr 2026', until:'Jul 2026', status:'active'  },
  ];

  let sortCol = '', sortDir = 1, showArchived = false;

  /* ── MAIN HTML ────────────────────────────────────────── */
  document.getElementById('view-crm').innerHTML = `
  <div class="page-header">
    <div><div class="page-title">CRM</div><div class="page-sub">87 customers · 11 leads in pipeline</div></div>
    <button class="btn btn-primary" onclick="openLeadModal()">＋ New Lead</button>
  </div>

  <!-- STATS -->
  <div class="crm-stats">
    <div class="crm-stat-card" onclick="switchCrmTab('customers')">
      <div class="crm-stat-val">87</div><div class="crm-stat-lbl">Total Customers</div>
      <div class="crm-stat-sub">+5 new this month</div>
    </div>
    <div class="crm-stat-card" onclick="switchCrmTab('leads')">
      <div class="crm-stat-val">11</div><div class="crm-stat-lbl">Active Leads</div>
      <div class="crm-stat-sub">+3 this week</div>
    </div>
    <div class="crm-stat-card">
      <div class="crm-stat-val">6</div><div class="crm-stat-lbl">Renewal Pending</div>
      <div class="crm-stat-sub down">Action required</div>
    </div>
    <div class="crm-stat-card">
      <div class="crm-stat-val">68%</div><div class="crm-stat-lbl">Conversion Rate</div>
      <div class="crm-stat-sub">↑ 5% MoM</div>
    </div>
    <div class="crm-stat-card">
      <div class="crm-stat-val">฿124.5K</div><div class="crm-stat-lbl">Revenue (May)</div>
      <div class="crm-stat-sub">↑ 12% MoM</div>
    </div>
  </div>

  <!-- TABS -->
  <div class="tabs">
    <div class="tab active" id="crm-tab-leads" onclick="switchCrmTab('leads')">Leads</div>
    <div class="tab" id="crm-tab-customers" onclick="switchCrmTab('customers')">Customers</div>
  </div>

  <!-- LEADS PANEL -->
  <div id="crm-leads">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <div style="display:flex;gap:6px;flex-wrap:wrap" id="lead-filter-chips">
        <div class="filter-chip active" onclick="crmLeadFilter(this,'all')">All</div>
        <div class="filter-chip" onclick="crmLeadFilter(this,'new')">New Lead</div>
        <div class="filter-chip" onclick="crmLeadFilter(this,'contacting')">Contacting</div>
        <div class="filter-chip" onclick="crmLeadFilter(this,'test')">Test</div>
        <div class="filter-chip" onclick="crmLeadFilter(this,'trial')">Trial</div>
      </div>
      <div style="display:flex;gap:8px">
        <input type="text" class="tc-search" placeholder="Search leads…" style="width:180px" oninput="filterLeadCards(this.value)">
        <button class="btn btn-secondary btn-sm" id="arch-btn" onclick="toggleArchivedLeads()">Show Archived</button>
      </div>
    </div>

    <div class="pipeline">
      <div class="pipeline-col">
        <div class="pipeline-header">New Lead <span class="pipeline-count">3</span></div>
        <div class="lead-card" onclick="openLeadModal('Sarah Mitchell','English Reading','New Lead')">
          <div class="lead-name">Sarah Mitchell</div><div class="lead-meta">English Reading · Age 9</div>
          <div class="lead-tags"><span class="badge badge-blue">Referred</span></div>
        </div>
        <div class="lead-card" onclick="openLeadModal('Arjun Patel','Math Grade 4','New Lead')">
          <div class="lead-name">Arjun Patel</div><div class="lead-meta">Math Grade 4 · Age 10</div>
          <div class="lead-tags"><span class="badge badge-purple">Website</span></div>
        </div>
        <div class="lead-card" onclick="openLeadModal('Emma Liu','Science','New Lead')">
          <div class="lead-name">Emma Liu</div><div class="lead-meta">Science · Age 12</div>
          <div class="lead-tags"><span class="badge badge-gray">Walk-in</span></div>
        </div>
      </div>
      <div class="pipeline-col">
        <div class="pipeline-header">Contacting <span class="pipeline-count">3</span></div>
        <div class="lead-card" onclick="openLeadModal('Kevin Park','Thai Language','Contacting')">
          <div class="lead-name">Kevin Park</div><div class="lead-meta">Thai Language · Age 8</div>
          <div class="lead-tags"><span class="badge badge-yellow">Called</span></div>
        </div>
        <div class="lead-card" onclick="openLeadModal('Nadia Sorokin','Math Grade 5','Contacting')">
          <div class="lead-name">Nadia Sorokin</div><div class="lead-meta">Math Grade 5 · Age 11</div>
          <div class="lead-tags"><span class="badge badge-yellow">LINE</span></div>
        </div>
        <div class="lead-card" onclick="openLeadModal('Ben Torres','English','Contacting')">
          <div class="lead-name">Ben Torres</div><div class="lead-meta">English · Age 7</div>
          <div class="lead-tags"><span class="badge badge-yellow">Called</span></div>
        </div>
      </div>
      <div class="pipeline-col">
        <div class="pipeline-header">Interested (Test) <span class="pipeline-count">2</span></div>
        <div class="lead-card" onclick="openLeadModal('Lily Wang','Science','Interested (Test)')">
          <div class="lead-name">Lily Wang</div><div class="lead-meta">Science · Age 13</div>
          <div class="lead-tags"><span class="badge badge-orange">Test: 16 May</span></div>
        </div>
        <div class="lead-card" onclick="openLeadModal('Daan Smits','Math Grade 6','Interested (Test)')">
          <div class="lead-name">Daan Smits</div><div class="lead-meta">Math Grade 6 · Age 12</div>
          <div class="lead-tags"><span class="badge badge-orange">Test: 17 May</span></div>
        </div>
      </div>
      <div class="pipeline-col">
        <div class="pipeline-header">Interested (Trial) <span class="pipeline-count">2</span></div>
        <div class="lead-card" onclick="openLeadModal('Hana Yamamoto','English Reading','Interested (Trial)')">
          <div class="lead-name">Hana Yamamoto</div><div class="lead-meta">English Reading · Age 9</div>
          <div class="lead-tags"><span class="badge badge-purple">Trial: 15 May</span></div>
        </div>
        <div class="lead-card" onclick="openLeadModal('Luca Romano','Thai Language','Interested (Trial)')">
          <div class="lead-name">Luca Romano</div><div class="lead-meta">Thai Language · Age 11</div>
          <div class="lead-tags"><span class="badge badge-purple">Trial: 18 May</span></div>
        </div>
      </div>
    </div>

    <!-- ARCHIVED -->
    <div id="archived-section" style="display:none;margin-top:12px">
      <div class="card">
        <div class="card-header"><div class="card-title" style="color:#9ca3af">🗄️ Archived Leads</div></div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;padding:12px">
          <div class="lead-card archived" onclick="openLeadModal('Chris Baker','Math G5','Archived (Test)')">
            <div class="lead-name" style="color:#6b7280">Chris Baker</div>
            <div class="lead-meta">Math Grade 5 · Age 11</div>
            <div class="lead-tags"><span class="badge badge-gray">Archived (Test)</span></div>
          </div>
          <div class="lead-card archived" onclick="openLeadModal('Anna White','English','Archived (Contacting)')">
            <div class="lead-name" style="color:#6b7280">Anna White</div>
            <div class="lead-meta">English · Age 8</div>
            <div class="lead-tags"><span class="badge badge-gray">Archived (Contacting)</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- CUSTOMERS PANEL -->
  <div id="crm-customers" style="display:none">
    <div class="card">
      <div class="table-controls">
        <input type="text" class="tc-search" id="cust-search" placeholder="Search… (boolean: term AND term)" oninput="renderCustomers()">
        <select class="tc-select" id="cust-status" onchange="renderCustomers()">
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="renewal">Renewal Pending</option>
          <option value="urgent">Urgent</option>
        </select>
        <select class="tc-select" id="cust-branch" onchange="renderCustomers()">
          <option value="all">All Branches</option>
          <option value="Sukhumvit">Sukhumvit</option>
          <option value="Silom">Silom</option>
        </select>
        <div style="margin-left:auto"><button class="btn btn-secondary btn-sm" onclick="showToast('Exporting…','info')">Export CSV</button></div>
      </div>
      <div class="table-wrap">
        <table id="cust-table">
          <thead><tr>
            <th onclick="sortCustomers('name')">Name</th>
            <th onclick="sortCustomers('family')">Family</th>
            <th onclick="sortCustomers('branch')">Branch</th>
            <th>Course [Package]</th>
            <th onclick="sortCustomers('remain')">Remaining</th>
            <th onclick="sortCustomers('since')">Since – Until</th>
            <th onclick="sortCustomers('status')">Status</th>
            <th></th>
          </tr></thead>
          <tbody id="cust-tbody"></tbody>
        </table>
      </div>
    </div>
  </div>`;

  /* ── FUNCTIONS ────────────────────────────────────────── */
  window.switchCrmTab = function (tab) {
    document.getElementById('crm-leads').style.display     = tab === 'leads'     ? '' : 'none';
    document.getElementById('crm-customers').style.display = tab === 'customers' ? '' : 'none';
    document.getElementById('crm-tab-leads').classList.toggle('active',     tab === 'leads');
    document.getElementById('crm-tab-customers').classList.toggle('active', tab === 'customers');
    if (tab === 'customers') renderCustomers();
  };

  window.toggleArchivedLeads = function () {
    showArchived = !showArchived;
    document.getElementById('archived-section').style.display = showArchived ? '' : 'none';
    document.getElementById('arch-btn').textContent = showArchived ? 'Hide Archived' : 'Show Archived';
  };

  window.crmLeadFilter = function (el, stage) {
    document.querySelectorAll('#lead-filter-chips .filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    showToast('Filter: ' + el.textContent, 'info');
  };

  window.filterLeadCards = function (val) {
    document.querySelectorAll('.lead-card:not(.archived)').forEach(card => {
      card.style.display = (!val || card.textContent.toLowerCase().includes(val.toLowerCase())) ? '' : 'none';
    });
  };

  function statusBadge(s) {
    return { active:'<span class="badge badge-green">Active</span>', renewal:'<span class="badge badge-yellow">Renewal Pending</span>', urgent:'<span class="badge badge-red">1 class left</span>' }[s] || '<span class="badge badge-gray">Inactive</span>';
  }

  window.renderCustomers = function () {
    const search  = (document.getElementById('cust-search')?.value  || '').toLowerCase();
    const statusF = document.getElementById('cust-status')?.value  || 'all';
    const branchF = document.getElementById('cust-branch')?.value  || 'all';

    let rows = customers.filter(c => {
      if (statusF !== 'all' && c.status !== statusF) return false;
      if (branchF !== 'all' && c.branch !== branchF) return false;
      if (search) {
        const terms = search.split(' and ').map(t => t.trim());
        const hay = (c.name + c.family + c.course + c.branch).toLowerCase();
        return terms.every(t => hay.includes(t));
      }
      return true;
    });

    if (sortCol) rows.sort((a, b) => {
      let av = a[sortCol], bv = b[sortCol];
      if (typeof av === 'string') { av = av.toLowerCase(); bv = bv.toLowerCase(); }
      return av < bv ? -sortDir : av > bv ? sortDir : 0;
    });

    document.getElementById('cust-tbody').innerHTML = rows.map(c => {
      const pct = Math.round(c.remain / c.total * 100);
      const col = c.remain <= 2 ? '#ef4444' : c.remain <= 5 ? '#f59e0b' : '#10b981';
      return `<tr class="tr-click" onclick="openCustomerModal('${c.name}')">
        <td><strong>${c.name}</strong>
          <button class="chat-btn" onclick="event.stopPropagation();openInboxFor('${c.family}')" title="Chat">💬</button></td>
        <td>${c.family}</td>
        <td>${c.branch}</td>
        <td><span class="pill">${c.pkg}</span></td>
        <td><strong style="color:${col}">${c.remain}</strong> <span style="color:#9ca3af;font-size:11px">/ ${c.total} (${pct}%)</span></td>
        <td style="font-size:12px;color:#6b7280">${c.since} – ${c.until}</td>
        <td>${statusBadge(c.status)}</td>
        <td><button class="btn btn-primary btn-xs" onclick="event.stopPropagation();openCustomerModal('${c.name}')">View</button></td>
      </tr>`;
    }).join('');
  };

  window.sortCustomers = function (col) {
    sortDir = (sortCol === col) ? sortDir * -1 : 1;
    sortCol = col;
    document.querySelectorAll('#cust-table th').forEach(th => th.classList.remove('sort-asc','sort-desc'));
    const idx = ['name','family','branch','','remain','since','status'].indexOf(col);
    if (idx >= 0) {
      const th = document.querySelectorAll('#cust-table th')[idx];
      if (th) th.classList.add(sortDir === 1 ? 'sort-asc' : 'sort-desc');
    }
    renderCustomers();
  };

  window.openLeadModal = function (name='New Lead', course='', stage='New Lead') {
    const stages = ['New Lead','Contacting','Interested (Test)','Interested (Trial)'];
    Modal.create('modal-lead', `🎯 Lead — ${name}`, `
      <div class="modal-section">
        <div class="info-grid">
          <div class="info-item"><div class="label">Name</div>${name}</div>
          <div class="info-item"><div class="label">Course Interest</div>${course || '—'}</div>
          <div class="info-item"><div class="label">Stage</div><span class="badge badge-blue">${stage}</span></div>
          <div class="info-item"><div class="label">Source</div>Referral</div>
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Move to Stage</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${stages.map(s => `<button class="btn ${s===stage?'btn-primary':'btn-secondary'} btn-sm" onclick="showToast('Moved to ${s} ✓','success')">${s}</button>`).join('')}
          <button class="btn btn-ghost btn-sm" style="color:#9ca3af" onclick="showToast('Lead archived','info');Modal.close('modal-lead')">Archive</button>
        </div>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Add Note</div>
        <textarea class="settings-input" rows="3" placeholder="บันทึกการติดต่อ…" style="resize:vertical"></textarea>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Timeline</div>
        <div class="timeline-item" style="padding:6px 0">
          <div class="tl-dot" style="background:#6366f1"></div>
          <div class="tl-content"><div class="tl-text">Lead created</div><div class="tl-time">Today 09:00</div></div>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-lead')">Close</button>
       <button class="btn btn-primary" onclick="showToast('Task created ✓','success');Modal.close('modal-lead')">＋ Create Task</button>`,
      'modal-lg');
  };

  window.openCustomerModal = function (name) {
    const c = customers.find(x => x.name === name) || {};
    Modal.create('modal-customer', `👤 ${name}`, `
      <div style="display:flex;gap:14px;align-items:flex-start;margin-bottom:16px">
        <div class="profile-avatar">${name[0]}</div>
        <div style="flex:1">
          <div class="profile-name">${name}</div>
          <div class="profile-meta">${c.family||''} · ${c.branch||''}</div>
          <div class="profile-tags" style="margin-top:8px">${statusBadge(c.status)}<span class="badge badge-blue" style="margin-left:4px">LINE: Active</span></div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="openInboxFor('${c.family}')">💬 Chat</button>
      </div>
      <div class="modal-section">
        <div class="modal-section-title">Enrollment</div>
        <div class="info-grid">
          <div class="info-item"><div class="label">Course</div>${c.course}</div>
          <div class="info-item"><div class="label">Package</div><span class="pill">${c.pkg}</span></div>
          <div class="info-item"><div class="label">Remaining</div>
            <strong style="color:${c.remain<=2?'#ef4444':'#10b981'}">${c.remain} / ${c.total}</strong></div>
          <div class="info-item"><div class="label">Period</div>${c.since} – ${c.until}</div>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-customer')">Close</button>
       <button class="btn btn-primary" onclick="openFollowUpModal('${name}');Modal.close('modal-customer')">📞 Follow Up</button>`,
      'modal-lg');
  };

})();
