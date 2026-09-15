/* ============================================================
   inbox.js — Shared Inbox v2
   3-panel: Contact list · Chat · Info panel (toggleable)
   Responsive: tablet → info panel slides in as overlay
   ============================================================ */
(function () {

  /* ── DATA ─────────────────────────────────────────────── */
  const conversations = DB.conversations;
  const messages      = DB.messages;
  const staffList     = CONST.STAFF_NAMES;
  let activeConv    = 'tanaka';
  let filterMode    = 'all';
  let infoPanelOpen = true;   // default: info panel open on desktop

  /* ── AVATAR ───────────────────────────────────────────── */
  const AV_COLORS = [
    '#2563eb','#146c2e','#7b5800','#ba1a1a','#4a4458',
    '#006876','#8c3a00','#4b6a00','#9b1a6a','#006c52',
  ];
  function avColor(name) {
    let h = 0;
    for (let i = 0; i < (name||'').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
    return AV_COLORS[h % AV_COLORS.length];
  }
  function avatar(name, size = 36) {
    const s = Math.round(size * 0.38);
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;
      background:${avColor(name)};color:#fff;font-size:${s}px;font-weight:600;
      display:flex;align-items:center;justify-content:center;
      flex-shrink:0;user-select:none">${(name||'?')[0].toUpperCase()}</div>`;
  }

  /* ── CHANNEL BADGE ────────────────────────────────────── */
  function chBadge(ch) {
    const c = {LINE:'#06c755',WhatsApp:'#25d366',Email:'var(--md-primary)',SMS:'var(--md-warning)'}[ch]
            || 'var(--md-on-surface-variant)';
    return `<span style="font-size:9px;font-weight:700;color:#fff;background:${c};
      border-radius:var(--shape-xs);padding:1px 5px;letter-spacing:.3px">${ch||'?'}</span>`;
  }

  /* ── META ROW (info panel) ────────────────────────────── */
  function metaRow(icon, label, value) {
    return `<div style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:12px">
      <span class="mdi mdi-sm" style="color:#9ca3af;font-size:14px;width:16px;flex-shrink:0">${icon}</span>
      <span style="color:#9ca3af;font-size:11px;min-width:56px">${label}</span>
      <span style="color:#374151;font-weight:500;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${value || '—'}</span>
    </div>`;
  }

  /* ── SHELL ────────────────────────────────────────────── */
  document.getElementById('view-inbox').innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Shared Inbox</div>
      <div class="page-sub" id="inbox-sub">Loading…</div>
    </div>
    <button class="btn btn-primary btn-sm"
            onclick="showToast('Compose coming soon','info')">
      <span class="mdi mdi-sm">edit</span> Compose
    </button>
  </div>

  <div class="inbox-layout" id="inbox-layout">

    <!-- ── Panel 1: Conversation List ─────────────────── -->
    <div class="inbox-list">
      <div style="padding:10px 11px;border-bottom:1px solid #f3f4f6;flex-shrink:0">
        <div style="display:flex;align-items:center;gap:6px;background:#f5f6fa;
                    border:1px solid #e5e7eb;border-radius:8px;padding:6px 10px">
          <span class="mdi mdi-sm" style="color:#9ca3af;font-size:13px">search</span>
          <input placeholder="Search conversations…"
            style="border:none;background:transparent;font-size:12px;
                   outline:none;color:#374151;width:100%"
            oninput="filterInbox(this.value)">
        </div>
      </div>
      <div style="padding:7px 10px;border-bottom:1px solid #f3f4f6;display:flex;gap:4px;flex-shrink:0">
        <div class="filter-chip active" style="font-size:11px;height:26px;padding:0 10px"
             onclick="setInboxFilter('all',this)">All</div>
        <div class="filter-chip" style="font-size:11px;height:26px;padding:0 10px"
             onclick="setInboxFilter('unread',this)">Unread</div>
        <div class="filter-chip" style="font-size:11px;height:26px;padding:0 10px"
             onclick="setInboxFilter('mine',this)">Mine</div>
      </div>
      <div id="inbox-list-items" style="overflow-y:auto;flex:1;min-height:0"></div>
    </div>

    <!-- ── Panel 2: Chat Area ──────────────────────────── -->
    <div class="chat-area">
      <div id="chat-header" class="chat-header"></div>
      <div id="chat-messages" class="chat-messages"></div>

      <!-- Note mode banner -->
      <div id="note-banner"
           style="display:none;padding:5px 14px;flex-shrink:0;align-items:center;gap:6px;
                  background:var(--md-warning-container);border-top:1px solid var(--md-warning);
                  font-size:11px;color:var(--md-on-warning-container)">
        <span class="mdi mdi-sm" style="font-size:13px">sticky_note_2</span>
        Internal Note — only staff will see this
      </div>

      <!-- Input area -->
      <div class="chat-input">
        <div style="display:flex;gap:8px">
          <input type="text" id="chat-input-box"
            placeholder="Reply to parent… (// for internal note)"
            style="flex:1;padding:9px 13px;border:1.5px solid #e5e7eb;border-radius:9px;
                   font-size:13px;outline:none;transition:all .15s;box-sizing:border-box"
            oninput="onInboxInput(this)"
            onkeydown="handleChatInput(event)">
          <button class="btn btn-primary btn-sm" onclick="sendMessage()"
                  style="white-space:nowrap;flex-shrink:0;height:38px;padding:0 14px">
            <span class="mdi mdi-sm">send</span> Send
          </button>
        </div>
        <div style="font-size:10px;color:#9ca3af">
          <span class="mdi mdi-sm" style="font-size:11px">tips_and_updates</span>
          Type <kbd style="background:#f3f4f6;border:1px solid #e5e7eb;border-radius:3px;
                           padding:0 4px;font-size:10px">//</kbd> for staff-only internal note
        </div>
      </div>
    </div>

    <!-- ── Panel 3: Info Panel ─────────────────────────── -->
    <div class="inbox-info" id="inbox-info-panel">
      <div id="inbox-info-content"
           style="padding:48px 16px;text-align:center;color:#9ca3af">
        <span class="mdi" style="font-size:36px;display:block;margin-bottom:8px;opacity:.4">person</span>
        <div style="font-size:13px">Select a conversation</div>
      </div>
    </div>

    <!-- Tablet backdrop (click to close info panel) -->
    <div class="inbox-overlay-backdrop" id="inbox-backdrop"
         onclick="closeInfoOverlay()"></div>

  </div>`;

  /* ── RENDER LIST ──────────────────────────────────────── */
  function renderList(search = '') {
    let convs = [...conversations];
    if (filterMode === 'unread') convs = convs.filter(c => c.unread);
    if (filterMode === 'mine')   convs = convs.filter(c => c.assignee === 'Admin Nock');
    if (search) convs = convs.filter(c =>
      (c.name + c.preview).toLowerCase().includes(search.toLowerCase()));

    const unread = conversations.filter(c => c.unread).length;
    const sub = document.getElementById('inbox-sub');
    if (sub) sub.textContent = unread > 0
      ? `${unread} unread conversation${unread > 1 ? 's' : ''}`
      : 'All caught up ✓';

    document.getElementById('inbox-list-items').innerHTML = convs.length === 0
      ? `<div style="padding:28px;text-align:center;color:#9ca3af;font-size:13px">No conversations found</div>`
      : convs.map(c => `
        <div class="inbox-item ${c.unread ? 'unread' : ''} ${c.id === activeConv ? 'active' : ''}"
             onclick="openConversation('${c.id}')"
             style="display:flex;gap:10px;padding:11px 13px;border-bottom:1px solid #f3f4f6">
          <div style="position:relative;flex-shrink:0">
            ${avatar(c.name, 38)}
            ${c.unread ? `<div style="position:absolute;top:-1px;right:-1px;width:9px;height:9px;
              background:var(--md-primary);border-radius:50%;border:2px solid #fff"></div>` : ''}
          </div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:4px">
              <div style="font-size:13px;font-weight:${c.unread ? '700' : '500'};color:#1a1d23;
                          overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name}</div>
              <div style="font-size:10px;color:#9ca3af;flex-shrink:0">${c.time}</div>
            </div>
            <div style="display:flex;align-items:center;gap:5px;margin-top:2px">
              ${chBadge(c.channel)}
              <span style="font-size:11px;color:#9ca3af">${c.branch || ''}</span>
            </div>
            <div style="font-size:12px;color:#9ca3af;margin-top:3px;
                        white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
              ${c.preview || ''}
            </div>
            <div style="font-size:10px;margin-top:3px;display:flex;align-items:center;gap:3px;
                        color:${c.assignee ? 'var(--md-primary)' : 'var(--md-outline-variant)'}">
              ${c.assignee
                ? `<span class="mdi mdi-sm" style="font-size:11px">person</span>${c.assignee}`
                : 'Unassigned'}
            </div>
          </div>
        </div>`).join('');
  }

  /* ── RENDER CHAT HEADER ───────────────────────────────── */
  function renderHeader(conv) {
    const linked = DB.leads.find(l => l.convId === conv.id);
    const meta   = linked ? (CONST.LEAD_STAGES[linked.stage] || {}) : null;

    document.getElementById('chat-header').innerHTML = `
      <!-- Contact identity -->
      <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
        <div style="position:relative;flex-shrink:0">
          ${avatar(conv.name, 36)}
          <div style="position:absolute;bottom:0;right:0;width:9px;height:9px;
            background:var(--md-success);border-radius:50%;border:2px solid #fff"></div>
        </div>
        <div style="min-width:0">
          <div style="font-size:14px;font-weight:600;color:#1a1d23;line-height:1.3">${conv.name}</div>
          <div style="font-size:11px;color:#9ca3af;display:flex;gap:5px;align-items:center;margin-top:2px">
            ${chBadge(conv.channel)}
            <span>${conv.student}</span>
            <span style="color:#d1d5db">·</span>
            <span>${conv.branch}</span>
          </div>
        </div>
      </div>
      <!-- Actions -->
      <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
        ${linked
          ? `<button class="btn btn-sm"
               style="background:${meta.bg||'#ede9fe'};color:${meta.color||'#6366f1'};
                      border:1.5px solid ${meta.color||'#6366f1'}30"
               onclick="showView('crm');setTimeout(()=>openLeadModal('${linked.id}'),80)">
               <span class="mdi mdi-sm">person_search</span> ${linked.name.split(' ')[0]}
             </button>`
          : `<button class="btn btn-secondary btn-sm"
               onclick="openCreateLeadFromInbox('${conv.id}')">
               <span class="mdi mdi-sm">add</span> Lead
             </button>`}
        <button class="btn btn-secondary btn-sm"
                onclick="openSendFormFromInbox('${conv.id}')">
          <span class="mdi mdi-sm">assignment</span> Form
        </button>
        <!-- Info panel toggle -->
        <button id="info-toggle-btn" onclick="toggleInfoPanel()"
                title="Contact info"
                style="width:32px;height:32px;border-radius:8px;
                       border:1px solid ${infoPanelOpen ? 'transparent' : '#e5e7eb'};
                       background:${infoPanelOpen ? 'var(--md-primary-container)' : 'transparent'};
                       color:${infoPanelOpen ? 'var(--md-primary)' : '#9ca3af'};
                       display:flex;align-items:center;justify-content:center;
                       cursor:pointer;flex-shrink:0;transition:all .15s">
          <span class="mdi mdi-sm">info</span>
        </button>
      </div>`;
  }

  /* ── RENDER INFO PANEL ────────────────────────────────── */
  function renderInfoPanel(conv) {
    const el = document.getElementById('inbox-info-content');
    if (!el) return;

    /* Reset placeholder style — give el a flex-column so margin-top:auto works on actions */
    el.removeAttribute('style');
    el.style.cssText = 'display:flex;flex-direction:column;height:100%;';

    const student = DB.students?.find(s => s.name === conv.student);
    const lead    = DB.leads?.find(l => l.convId === conv.id);
    const family  = DB.families?.find(f =>
      f.name === conv.name ||
      (f.students && f.students.some(s => s.name === conv.student)));

    const renewalBadge = student
      ? Utils.renewalStatus?.(student.id) || student.status
      : null;
    const badgeHTML = student
      ? Utils.statusBadge?.(student.status) || `<span class="badge badge-gray">${student.status}</span>`
      : '';

    el.innerHTML = `
      <!-- Header row: title + close on tablet -->
      <div style="padding:16px 14px;border-bottom:1px solid #f3f4f6;display:flex;
                  justify-content:space-between;align-items:center;flex-shrink:0;position:sticky;top:0;background:#fff;z-index:1">
        <div style="font-size:12px;font-weight:600;color:#374151">Contact Info</div>
        <button onclick="toggleInfoPanel()"
                style="width:26px;height:26px;border-radius:6px;border:none;background:transparent;
                       color:#9ca3af;cursor:pointer;display:flex;align-items:center;justify-content:center"
                class="btn-close-info">
          <span class="mdi mdi-sm">close</span>
        </button>
      </div>

      <!-- Contact identity -->
      <div style="padding:14px;border-bottom:1px solid #f3f4f6">
        <div style="display:flex;gap:11px;align-items:center">
          ${avatar(conv.name, 44)}
          <div style="min-width:0">
            <div style="font-size:14px;font-weight:600;color:#1a1d23">${conv.name}</div>
            <div style="display:flex;gap:5px;align-items:center;margin-top:4px">
              ${chBadge(conv.channel)}
              <span style="font-size:10px;color:#9ca3af">${conv.branch}</span>
            </div>
          </div>
        </div>
        <div style="margin-top:10px">
          ${metaRow('location_on', 'Branch', conv.branch)}
          ${family?.parents?.[0]?.phone ? metaRow('call', 'Phone', family.parents[0].phone) : ''}
          ${family?.parents?.[0]?.line  ? metaRow('chat', 'LINE', family.parents[0].line)  : ''}
          <!-- Assignee inline select -->
          <div style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:12px">
            <span class="mdi mdi-sm" style="color:#9ca3af;font-size:14px;width:16px;flex-shrink:0">badge</span>
            <span style="color:#9ca3af;font-size:11px;min-width:56px">Assignee</span>
            <select style="flex:1;border:1px solid #e5e7eb;border-radius:6px;padding:3px 6px;
                           font-size:12px;outline:none;color:#374151;background:#fff;cursor:pointer;min-width:0"
                    onchange="assignConversation('${conv.id}',this.value)">
              <option value="">Unassigned</option>
              ${staffList.map(s => `<option ${s === conv.assignee ? 'selected' : ''}>${s}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <!-- Linked Student -->
      ${student ? `
      <div style="padding:12px 14px;border-bottom:1px solid #f3f4f6">
        <div style="font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;
                    letter-spacing:.6px;margin-bottom:8px">Student</div>
        <div style="display:flex;align-items:center;gap:9px;padding:9px 10px;
                    background:#f8f9fb;border-radius:9px;cursor:pointer;transition:background .15s"
             onmouseover="this.style.background='#eff6ff'"
             onmouseout="this.style.background='#f8f9fb'"
             onclick="openProfileModal('${student.name}')">
          ${avatar(student.name, 34)}
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500;color:#1a1d23">${student.name}</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px">${student.grade || ''} · ${student.branch || ''}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
            ${badgeHTML}
            <span class="mdi mdi-sm" style="color:#9ca3af;font-size:13px">chevron_right</span>
          </div>
        </div>
        ${student.remainingSessions !== undefined ? `
        <div style="margin-top:8px;padding:7px 10px;background:#f8f9fb;border-radius:7px;
                    font-size:12px;display:flex;justify-content:space-between">
          <span style="color:#6b7280">Classes left</span>
          <span style="font-weight:700;color:${student.remainingSessions <= 1 ? 'var(--md-error)' : student.remainingSessions <= 2 ? 'var(--md-warning)' : '#1a1d23'}">
            ${student.remainingSessions}
          </span>
        </div>` : ''}
      </div>` : ''}

      <!-- CRM Lead -->
      ${lead ? `
      <div style="padding:12px 14px;border-bottom:1px solid #f3f4f6">
        <div style="font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;
                    letter-spacing:.6px;margin-bottom:8px">CRM Lead</div>
        <div style="display:flex;align-items:center;gap:9px;padding:9px 10px;
                    background:#f8f9fb;border-radius:9px;cursor:pointer;transition:background .15s"
             onmouseover="this.style.background='#eff6ff'"
             onmouseout="this.style.background='#f8f9fb'"
             onclick="showView('crm');setTimeout(()=>openLeadModal('${lead.id}'),80)">
          <div style="width:34px;height:34px;border-radius:9px;background:#ede9fe;
                      display:flex;align-items:center;justify-content:center;flex-shrink:0">
            <span class="mdi" style="font-size:16px;color:var(--md-primary)">person_search</span>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500;color:#1a1d23">${lead.name}</div>
            <div style="font-size:11px;color:#9ca3af;margin-top:2px">${lead.subject || '—'} · ${lead.stage}</div>
          </div>
          <span class="mdi mdi-sm" style="color:#9ca3af;font-size:13px">chevron_right</span>
        </div>
      </div>` : `
      <div style="padding:12px 14px;border-bottom:1px solid #f3f4f6">
        <div style="font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;
                    letter-spacing:.6px;margin-bottom:8px">CRM</div>
        <button class="btn btn-secondary btn-sm" style="width:100%;justify-content:center;font-size:12px"
                onclick="openCreateLeadFromInbox('${conv.id}')">
          <span class="mdi mdi-sm">add</span> Create Lead
        </button>
      </div>`}

      <!-- Quick actions — margin-top:auto pins this to the bottom of the flex column -->
      <div style="padding:12px 14px;margin-top:auto;border-top:1px solid #f3f4f6">
        <div style="font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;
                    letter-spacing:.6px;margin-bottom:8px">Actions</div>
        <div style="display:flex;flex-direction:column;gap:6px">
          <button class="btn btn-secondary btn-sm" style="justify-content:flex-start;font-size:12px"
                  onclick="openSendFormFromInbox('${conv.id}')">
            <span class="mdi mdi-sm">assignment</span> Send Form
          </button>
          ${student ? `
          <button class="btn btn-secondary btn-sm" style="justify-content:flex-start;font-size:12px"
                  onclick="openProfileModal('${student.name}')">
            <span class="mdi mdi-sm">person</span> View Profile
          </button>` : ''}
        </div>
      </div>`;
  }

  /* ── TOGGLE INFO PANEL ────────────────────────────────── */
  window.toggleInfoPanel = function () {
    infoPanelOpen = !infoPanelOpen;
    const layout   = document.getElementById('inbox-layout');
    const panel    = document.getElementById('inbox-info-panel');
    const backdrop = document.getElementById('inbox-backdrop');
    const btn      = document.getElementById('info-toggle-btn');
    const isTablet = window.innerWidth < 1100;

    if (isTablet) {
      panel.classList.toggle('overlay-open', infoPanelOpen);
      backdrop?.classList.toggle('show', infoPanelOpen);
    } else {
      layout?.classList.toggle('info-closed', !infoPanelOpen);
    }

    if (btn) {
      btn.style.background = infoPanelOpen ? '#ede9fe' : '#fff';
      btn.style.color      = infoPanelOpen ? 'var(--md-primary)' : '#9ca3af';
    }
  };

  window.closeInfoOverlay = function () {
    infoPanelOpen = false;
    document.getElementById('inbox-info-panel')?.classList.remove('overlay-open');
    document.getElementById('inbox-backdrop')?.classList.remove('show');
    const btn = document.getElementById('info-toggle-btn');
    if (btn) { btn.style.background = '#fff'; btn.style.color = '#9ca3af'; }
  };

  /* ── OPEN CONVERSATION ────────────────────────────────── */
  window.openConversation = function (id) {
    activeConv = id;
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    conv.unread = false;
    renderList();
    renderHeader(conv);
    renderMessages(id);
    renderInfoPanel(conv);
  };

  /* ── RENDER MESSAGES ──────────────────────────────────── */
  function renderMessages(id) {
    const conv = conversations.find(c => c.id === id);
    const msgs = messages[id] || [];

    if (msgs.length === 0) {
      document.getElementById('chat-messages').innerHTML =
        `<div style="flex:1;display:flex;flex-direction:column;align-items:center;
           justify-content:center;gap:8px;color:#9ca3af">
           <span class="mdi" style="font-size:36px;opacity:.4">chat</span>
           <div style="font-size:13px">Start the conversation</div>
         </div>`;
      return;
    }

    document.getElementById('chat-messages').innerHTML = msgs.map(m => {
      const isStaff    = m.type === 'staff';
      const isInternal = m.type === 'internal';
      const sender     = m.sender || (isStaff ? 'Admin Nock' : conv?.name || 'Parent');

      /* Form submission notification */
      if (m.type === 'form_submission') {
        const ft = m.formType;
        const ftLabel = ft==='enrollment'?'Enrollment':ft==='trial'?'Trial':'Test';
        const sub = (DB.formSubmissions||[]).find(s=>s.id===m.subId);
        const statusBg    = sub?.status==='approved' ? '#dcfce7' : sub?.status==='pending' ? '#ede9fe' : '#f3f4f6';
        const statusColor = sub?.status==='approved' ? '#065f46' : sub?.status==='pending' ? '#4c1d95' : '#6b7280';
        const statusLabel = sub?.status==='approved' ? '✅ Approved' : sub?.status==='pending' ? '⏳ Pending Review' : 'Reviewed';
        return `
        <div style="display:flex;justify-content:center;margin:4px 0">
          <div style="background:${statusBg};border:1.5px solid #c4b5fd;border-radius:10px;
                      padding:11px 15px;max-width:82%;cursor:pointer;transition:filter .15s"
               onmouseover="this.style.filter='brightness(.97)'" onmouseout="this.style.filter=''"
               onclick="${sub?.status==='pending' ? `openFormReviewModal('${m.subId}')` : ''}">
            <div style="font-size:12px;font-weight:700;color:${statusColor};margin-bottom:4px">
              <span class="mdi mdi-sm">assignment</span> ${ftLabel} Form Submitted
            </div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:8px">
              ${sub ? sub.data.students?.map(s=>`${s.name} · ${s.subject} ${s.grade}`).join(', ') : '—'}
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
              <span style="font-size:10px;font-weight:600;color:${statusColor};background:${statusBg};
                           border:1px solid #c4b5fd;border-radius:4px;padding:2px 7px">${statusLabel}</span>
              ${sub?.status==='pending'
                ? `<button class="btn btn-primary btn-sm" style="font-size:11px"
                     onclick="event.stopPropagation();openFormReviewModal('${m.subId}')">Review →</button>`
                : `<span style="font-size:10px;color:#9ca3af">${m.time}</span>`}
            </div>
          </div>
        </div>`;
      }

      /* Receipt message */
      if (m.type === 'receipt') {
        return `
        <div style="display:flex;justify-content:flex-start;margin:4px 0">
          <div style="background:#f0fdf4;border:1.5px solid #86efac;border-radius:10px;
                      padding:12px 14px;max-width:82%">
            <div style="font-size:11px;font-weight:700;color:#065f46;margin-bottom:8px;text-transform:uppercase;letter-spacing:.4px">
              <span class="mdi mdi-sm">receipt_long</span> Official Receipt
            </div>
            <div style="display:flex;gap:10px;align-items:flex-start">
              ${m.receiptDataUrl
                ? `<img src="${m.receiptDataUrl}" alt="receipt"
                         style="width:70px;border-radius:7px;border:1px solid #d1fae5;cursor:pointer;flex-shrink:0"
                         onclick="window.open(this.src,'_blank')" title="Click to view full receipt">`
                : ''}
              <div>
                <div style="font-size:13px;font-weight:700;color:#065f46">${m.rcpId||'RCP-...'}</div>
                <div style="font-size:11px;color:#374151;margin-top:2px">${m.coursePkg||''}</div>
                <div style="font-size:14px;font-weight:800;color:#059669;margin-top:4px">${m.amount ? Utils.currency(m.amount) : ''}</div>
                <div style="font-size:10px;color:#6b7280;margin-top:4px">Invoice: ${m.invId||'INV-...'}</div>
              </div>
            </div>
            ${m.receiptDataUrl
              ? `<div style="margin-top:8px">
                   <a href="${m.receiptDataUrl}" download="${m.rcpId||'receipt'}.svg"
                      style="font-size:11px;color:#059669;font-weight:600;text-decoration:none">
                     ↓ Download Receipt
                   </a>
                 </div>`
              : ''}
            <div style="font-size:10px;color:#9ca3af;margin-top:6px;text-align:right">${m.time}</div>
          </div>
        </div>`;
      }

      /* Internal note */
      if (isInternal) {
        return `
        <div style="display:flex;justify-content:center">
          <div style="background:var(--md-warning-container);border:1.5px dashed var(--md-warning);
                      border-radius:var(--shape-md);padding:9px 13px;max-width:70%;
                      font-size:12px;color:var(--md-on-warning-container)">
            <span class="mdi mdi-sm" style="font-size:13px;vertical-align:middle">sticky_note_2</span>
            <strong>Internal Note</strong>
            <div style="margin-top:3px">${m.text.replace('📎 Note (Internal): ','')}</div>
            <div style="font-size:10px;opacity:.7;margin-top:5px;text-align:right">
              ${sender} · ${m.time}
            </div>
          </div>
        </div>`;
      }

      /* Staff message (right) */
      if (isStaff) {
        return `
        <div style="display:flex;justify-content:flex-end;align-items:flex-end;gap:8px">
          <div style="max-width:72%">
            <div style="background:var(--md-primary);color:var(--md-on-primary);
                        border-radius:13px 13px 2px 13px;padding:10px 13px;
                        font-size:13px;line-height:1.55;word-break:break-word">
              ${m.text}
            </div>
            <div style="font-size:10px;color:#9ca3af;text-align:right;margin-top:4px">
              ${sender} · ${m.time}
            </div>
          </div>
          ${avatar(sender, 28)}
        </div>`;
      }

      /* Parent message (left) */
      return `
      <div style="display:flex;align-items:flex-end;gap:8px">
        ${avatar(conv?.name || 'P', 28)}
        <div style="max-width:72%">
          <div style="background:var(--md-surface-high);color:var(--md-on-surface);
                      border-radius:13px 13px 13px 2px;padding:10px 13px;
                      font-size:13px;line-height:1.55;word-break:break-word">
            ${m.text}
          </div>
          <div style="font-size:10px;color:#9ca3af;margin-top:4px">${sender} · ${m.time}</div>
        </div>
      </div>`;
    }).join('');

    const el = document.getElementById('chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  /* ── INPUT HANDLING ───────────────────────────────────── */
  window.onInboxInput = function (inp) {
    const note   = inp.value.startsWith('//');
    const banner = document.getElementById('note-banner');
    if (banner) banner.style.display = note ? 'flex' : 'none';
    inp.style.borderColor = note ? 'var(--md-warning)' : 'var(--md-outline-variant)';
    inp.style.background  = note ? 'var(--md-warning-container)' : 'var(--md-surface-lowest)';
  };

  window.handleChatInput = function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  window.sendMessage = function () {
    const inp  = document.getElementById('chat-input-box');
    const text = inp.value.trim();
    if (!text) return;
    const isNote    = text.startsWith('//');
    const cleanText = isNote ? text.slice(2).trim() : text;
    if (!cleanText) return;

    (messages[activeConv] = messages[activeConv] || []).push({
      type:   isNote ? 'internal' : 'staff',
      text:   cleanText,
      time:   'Now',
      sender: 'Admin Nock',
    });

    inp.value             = '';
    inp.style.borderColor = 'var(--md-outline-variant)';
    inp.style.background  = 'var(--md-surface-lowest)';
    const banner = document.getElementById('note-banner');
    if (banner) banner.style.display = 'none';

    const conv = conversations.find(c => c.id === activeConv);
    if (conv) conv.preview = isNote ? '📎 Internal note' : cleanText;

    renderMessages(activeConv);
    renderList();
    showToast(isNote ? 'Internal note saved' : 'Message sent ✓', 'success');
  };

  /* ── FILTERS ──────────────────────────────────────────── */
  window.setInboxFilter = function (mode, el) {
    filterMode = mode;
    document.querySelectorAll('#view-inbox .filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    renderList();
  };

  window.filterInbox = function (val) { renderList(val); };

  window.assignConversation = function (id, staff) {
    const conv = conversations.find(c => c.id === id);
    if (conv) { conv.assignee = staff; renderList(); renderHeader(conv); }
    showToast(staff ? `Assigned to ${staff} ✓` : 'Unassigned', 'success');
  };

  /* ── EXTERNAL EVENT: inbox:open ───────────────────────── */
  document.addEventListener('inbox:open', e => {
    const t = conversations.find(c =>
      c.name === e.detail.name || c.student === e.detail.name ||
      (e.detail.name && c.name.toLowerCase().includes(
        e.detail.name.split(' ')[0].toLowerCase())));
    if (t) openConversation(t.id);
  });

  window._refreshInboxList = function () { renderList(); };

  /* ── INIT ─────────────────────────────────────────────── */
  renderList();
  openConversation('tanaka');

})();
