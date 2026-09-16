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
  let activeConv    = 'conv-tanaka';
  let filterType    = '';      // '' | 'customer' | 'lead' | 'contact'
  let filterRead    = '';      // '' | 'unread' | 'read'
  let filterAssign  = '';      // '' | 'mine' | 'unassigned' | staff name
  let infoPanelOpen = true;
  let fabOpen       = false;   // floating (+) menu state

  /* ── AVATAR ───────────────────────────────────────────── */
  const AV_COLORS = [
    'var(--md-primary)',     'var(--md-success)',
    'var(--md-warning)',     'var(--md-error)',
    'var(--clr-on-grammar)', 'var(--md-tertiary)',
    'var(--clr-on-science)', 'var(--md-secondary)',
    'var(--md-error)',       'var(--md-tertiary)',
  ];
  function avColor(name) {
    let h = 0;
    for (let i = 0; i < (name||'').length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
    return AV_COLORS[h % AV_COLORS.length];
  }
  function avatar(name, size = 36) {
    const s = Math.round(size * 0.38);
    return `<div style="width:${size}px;height:${size}px;border-radius:50%;
      background:${avColor(name)};color:var(--md-on-primary);font-size:${s}px;font-weight:600;
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
      <span class="mdi mdi-sm text-muted" style="font-size:14px;width:16px;flex-shrink:0">${icon}</span>
      <span class="text-muted" style="font-size:11px;min-width:56px">${label}</span>
      <span style="color:var(--md-on-surface);font-weight:500;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${value || '—'}</span>
    </div>`;
  }

  /* ── SHELL ────────────────────────────────────────────── */
  document.getElementById('view-inbox').innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Shared Inbox</div>
      <div class="page-sub" id="inbox-sub">Loading…</div>
    </div>
    <button class="btn btn-primary btn-sm" onclick="inboxCompose()">
      <span class="mdi mdi-sm">edit</span> Compose
    </button>
  </div>

  <div class="inbox-layout" id="inbox-layout">

    <!-- ── Panel 1: Conversation List ─────────────────── -->
    <div class="inbox-list">
      <div style="padding:10px 11px;border-bottom:1px solid var(--md-surface-mid);flex-shrink:0">
        <div style="display:flex;align-items:center;gap:6px;background:var(--md-surface-mid);
                    border:1px solid var(--md-outline-variant);border-radius:8px;padding:6px 10px">
          <span class="mdi mdi-sm text-muted" style="font-size:13px">search</span>
          <input placeholder="Search conversations…"
            style="border:none;background:transparent;font-size:12px;
                   outline:none;color:var(--md-on-surface);width:100%"
            oninput="filterInbox(this.value)">
        </div>
      </div>
      <div style="padding:6px 10px 7px;border-bottom:1px solid var(--md-surface-mid);
                  display:flex;flex-direction:column;gap:5px;flex-shrink:0">
        <select style="width:100%;border:1px solid var(--md-outline-variant);border-radius:7px;padding:4px 8px;
                       font-size:11px;outline:none;color:var(--md-on-surface);background:var(--md-surface-lowest);cursor:pointer"
                onchange="setInboxType(this.value)" id="inbox-filter-type">
          <option value="">All Types</option>
          <option value="customer">Customer</option>
          <option value="lead">Lead</option>
          <option value="contact">Contact</option>
        </select>
        <div style="display:flex;gap:5px">
          <select style="flex:1;border:1px solid var(--md-outline-variant);border-radius:7px;padding:4px 6px;
                         font-size:11px;outline:none;color:var(--md-on-surface);background:var(--md-surface-lowest);cursor:pointer"
                  onchange="setInboxRead(this.value)" id="inbox-filter-read">
            <option value="">All</option>
            <option value="unread">Unread</option>
            <option value="read">Read</option>
          </select>
          <select style="flex:1;border:1px solid var(--md-outline-variant);border-radius:7px;padding:4px 6px;
                         font-size:11px;outline:none;color:var(--md-on-surface);background:var(--md-surface-lowest);cursor:pointer"
                  onchange="setInboxAssign(this.value)" id="inbox-filter-assign">
            <option value="">All Staff</option>
            <option value="mine">Mine</option>
            <option value="unassigned">Unassigned</option>
            ${(CONST.STAFF_NAMES||[]).map(s=>`<option value="${s}">${s}</option>`).join('')}
          </select>
        </div>
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
      <div class="chat-input" style="position:relative">
        <!-- Floating (+) action menu -->
        <div id="chat-fab-menu" style="display:none;position:absolute;bottom:110px;left:14px;
          background:var(--md-surface-lowest);border:1px solid var(--md-outline-variant);
          border-radius:12px;box-shadow:var(--elev-3);padding:6px;min-width:180px;z-index:10">
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <!-- (+) FAB -->
          <button id="chat-fab-btn" onclick="toggleInboxFab()"
            style="width:36px;height:36px;border-radius:50%;border:1.5px solid var(--md-outline-variant);
                   background:var(--md-surface-mid);color:var(--md-on-surface-variant);
                   display:flex;align-items:center;justify-content:center;flex-shrink:0;
                   cursor:pointer;transition:all .15s;font-size:18px;font-weight:300">
            <span class="mdi mdi-sm">add</span>
          </button>
          <input type="text" id="chat-input-box"
            placeholder="Reply to parent… (// for internal note)"
            style="flex:1;padding:9px 13px;border:1.5px solid var(--md-outline-variant);border-radius:9px;
                   font-size:13px;outline:none;transition:all .15s;box-sizing:border-box"
            oninput="onInboxInput(this)"
            onkeydown="handleChatInput(event)">
          <button class="btn btn-primary btn-sm" onclick="sendMessage()"
                  style="white-space:nowrap;flex-shrink:0;height:38px;padding:0 14px">
            <span class="mdi mdi-sm">send</span> Send
          </button>
        </div><!-- end input row -->
        <div class="text-muted" style="font-size:10px">
          <span class="mdi mdi-sm" style="font-size:11px">tips_and_updates</span>
          Type <kbd style="background:var(--md-surface-mid);border:1px solid var(--md-outline-variant);border-radius:3px;
                           padding:0 4px;font-size:10px">//</kbd> for staff-only internal note
        </div>
      </div>
    </div>

    <!-- ── Panel 3: Info Panel ─────────────────────────── -->
    <div class="inbox-info" id="inbox-info-panel">
      <div id="inbox-info-content"
           class="text-muted" style="padding:48px 16px;text-align:center">
        <span class="mdi" style="font-size:36px;display:block;margin-bottom:8px;opacity:.4">person</span>
        <div style="font-size:13px">Select a conversation</div>
      </div>
    </div>

    <!-- Tablet backdrop (click to close info panel) -->
    <div class="inbox-overlay-backdrop" id="inbox-backdrop"
         onclick="closeInfoOverlay()"></div>

  </div>`;

  /* ── CONV TYPE HELPERS ────────────────────────────────── */
  function convType(c) {
    if (c.familyId) return 'customer';
    if (c.leadId)   return 'lead';
    return 'contact';
  }
  const TYPE_META = {
    customer: { label:'Customer', bg:'var(--md-success-container)',  color:'var(--md-on-success-container)' },
    lead:     { label:'Lead',     bg:'#fff0e6',                      color:'#d95f00' },
    contact:  { label:'Contact',  bg:'var(--md-surface-mid)',        color:'var(--md-on-surface-variant)' },
  };
  function typeBadge(c) {
    const tm = TYPE_META[convType(c)];
    return `<span style="font-size:9px;font-weight:700;border-radius:4px;padding:1px 5px;
      background:${tm.bg};color:${tm.color}">${tm.label}</span>`;
  }
  function convSubtitle(c) {
    if (c.familyId) {
      const fam = DB.families?.find(f => f.id === c.familyId);
      if (fam) {
        const names = (fam.studentIds||[]).map(id=>DB.students?.find(s=>s.id===id)?.name).filter(Boolean);
        return names.join(', ') || c.branch;
      }
    }
    if (c.leadId) {
      const lead = DB.leads?.find(l => l.id === c.leadId);
      if (lead) {
        const stage = CONST.LEAD_STAGES?.[lead.stage];
        return `${lead.subject||'—'} · ${lead.childGrade||''}`;
      }
    }
    return c.branch || '';
  }

  /* ── RENDER LIST ──────────────────────────────────────── */
  function renderList(search = '') {
    let convs = [...conversations];

    /* Type filter */
    if (filterType) convs = convs.filter(c => convType(c) === filterType);
    /* Read filter */
    if (filterRead === 'unread') convs = convs.filter(c => c.unread);
    if (filterRead === 'read')   convs = convs.filter(c => !c.unread);
    /* Assign filter */
    if (filterAssign === 'mine')        convs = convs.filter(c => c.assignee === 'Admin Nock');
    if (filterAssign === 'unassigned')  convs = convs.filter(c => !c.assignee);
    else if (filterAssign && filterAssign !== 'mine' && filterAssign !== 'unassigned')
      convs = convs.filter(c => c.assignee === filterAssign);

    if (search) convs = convs.filter(c =>
      (c.name + c.preview).toLowerCase().includes(search.toLowerCase()));

    const unread = conversations.filter(c => c.unread).length;
    const sub = document.getElementById('inbox-sub');
    if (sub) sub.textContent = unread > 0
      ? `${unread} unread conversation${unread > 1 ? 's' : ''}`
      : 'All caught up ✓';

    document.getElementById('inbox-list-items').innerHTML = convs.length === 0
      ? `<div class="text-muted" style="padding:28px;text-align:center;font-size:13px">No conversations found</div>`
      : convs.map(c => `
        <div class="inbox-item ${c.unread ? 'unread' : ''} ${c.id === activeConv ? 'active' : ''}"
             onclick="openConversation('${c.id}')"
             style="display:flex;gap:10px;padding:10px 12px;border-bottom:1px solid var(--md-surface-mid)">
          <div style="position:relative;flex-shrink:0">
            ${avatar(c.name, 38)}
            ${c.unread ? `<div style="position:absolute;top:-1px;right:-1px;width:9px;height:9px;
              background:var(--md-primary);border-radius:50%;border:2px solid var(--md-surface-lowest)"></div>` : ''}
          </div>
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:4px">
              <div style="font-size:13px;font-weight:${c.unread ? '700' : '500'};color:var(--md-on-surface);
                          overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${c.name}</div>
              <div class="text-muted" style="font-size:10px;flex-shrink:0">${c.time}</div>
            </div>
            <div style="display:flex;align-items:center;gap:5px;margin-top:3px">
              ${typeBadge(c)}
              ${chBadge(c.channel)}
              <span class="text-muted" style="font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1">
                ${convSubtitle(c)}
              </span>
            </div>
            <div class="text-muted" style="font-size:12px;margin-top:3px;
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
    const tm = TYPE_META[convType(conv)];
    document.getElementById('chat-header').innerHTML = `
      <!-- Contact identity -->
      <div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">
        <div style="position:relative;flex-shrink:0">
          ${avatar(conv.name, 36)}
          <div style="position:absolute;bottom:0;right:0;width:9px;height:9px;
            background:var(--md-success);border-radius:50%;border:2px solid var(--md-surface-lowest)"></div>
        </div>
        <div style="min-width:0">
          <div style="display:flex;align-items:center;gap:6px">
            <div style="font-size:14px;font-weight:600;color:var(--md-on-surface);line-height:1.3">${conv.name}</div>
            <span style="font-size:9px;font-weight:700;border-radius:4px;padding:1px 5px;
              background:${tm.bg};color:${tm.color}">${tm.label}</span>
          </div>
          <div class="text-muted" style="font-size:11px;display:flex;gap:5px;align-items:center;margin-top:2px">
            ${chBadge(conv.channel)}
            <span>${convSubtitle(conv)}</span>
            <span style="color:var(--md-outline-variant)">·</span>
            <span>${conv.branch}</span>
          </div>
        </div>
      </div>
      <!-- Info panel toggle only -->
      <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
        <button id="info-toggle-btn" onclick="toggleInfoPanel()"
                title="Contact info"
                style="width:32px;height:32px;border-radius:8px;
                       border:1px solid ${infoPanelOpen ? 'transparent' : 'var(--md-outline-variant)'};
                       background:${infoPanelOpen ? 'var(--md-primary-container)' : 'transparent'};
                       color:${infoPanelOpen ? 'var(--md-primary)' : 'var(--md-on-surface-variant)'};
                       display:flex;align-items:center;justify-content:center;
                       cursor:pointer;flex-shrink:0;transition:all .15s">
          <span class="mdi mdi-sm">info</span>
        </button>
      </div>`;
  }

  /* ── INFO PANEL: CARD helper ─────────────────────────── */
  function infoCard(icon, title, sub, onClick, extraRight = '') {
    return `
    <div style="display:flex;align-items:center;gap:9px;padding:9px 10px;margin-bottom:4px;
                background:var(--md-surface-low);border-radius:9px;
                ${onClick ? 'cursor:pointer;' : ''}transition:background .15s"
         ${onClick ? `onmouseover="this.style.background='var(--md-primary-container)'"
                     onmouseout="this.style.background='var(--md-surface-low)'"
                     onclick="${onClick}"` : ''}>
      <div style="width:34px;height:34px;border-radius:9px;background:var(--md-primary-container);
                  display:flex;align-items:center;justify-content:center;flex-shrink:0">
        <span class="mdi" style="font-size:16px;color:var(--md-primary)">${icon}</span>
      </div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;color:var(--md-on-surface)">${title}</div>
        ${sub ? `<div class="text-muted" style="font-size:11px;margin-top:2px">${sub}</div>` : ''}
      </div>
      ${extraRight || (onClick ? `<span class="mdi mdi-sm text-muted" style="font-size:13px">chevron_right</span>` : '')}
    </div>`;
  }

  /* ── RENDER INFO PANEL ────────────────────────────────── */
  function renderInfoPanel(conv) {
    const el = document.getElementById('inbox-info-content');
    if (!el) return;

    el.removeAttribute('style');
    el.style.cssText = 'display:flex;flex-direction:column;height:100%;overflow-y:auto;';

    /* ── Lookup via ID ── */
    const family   = conv.familyId ? DB.families?.find(f => f.id === conv.familyId) : null;
    const lead     = conv.leadId   ? DB.leads?.find(l => l.id === conv.leadId)      : null;
    const students = family
      ? (family.studentIds || []).map(id => DB.students?.find(s => s.id === id)).filter(Boolean)
      : [];
    const student = students[0] || null;

    /* ── Build Children section ─────────────────────────── */
    let childrenHTML = '';
    if (family) {
      /* Show enrolled students */
      const stuCards = students.map(st => {
        const sessLeft = (st.courses || []).reduce((a, c) => a + (c.left || 0), 0);
        const leftColor = sessLeft <= 1 ? 'var(--md-error)' : sessLeft <= 2 ? 'var(--md-warning)' : 'var(--md-success)';
        return `
        <div style="display:flex;align-items:center;gap:9px;padding:8px 10px;margin-bottom:4px;
                    background:var(--md-surface-low);border-radius:9px;cursor:pointer;transition:background .15s"
             onmouseover="this.style.background='var(--md-primary-container)'"
             onmouseout="this.style.background='var(--md-surface-low)'"
             onclick="openProfileModal('${st.name}')">
          ${avatar(st.name, 32)}
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:var(--md-on-surface)">${st.name}</div>
            <div class="text-muted" style="font-size:11px;margin-top:1px">${st.grade||''} · ${(st.courses||[]).map(c=>c.name.split(' ')[0]).join('/')}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px">
            <span class="badge badge-green" style="font-size:9px">Enrolled</span>
            <span style="font-size:10px;font-weight:700;color:${leftColor}">${sessLeft} left</span>
          </div>
        </div>`;
      }).join('');

      childrenHTML = `
      <div style="padding:12px 14px;border-bottom:1px solid var(--md-surface-mid)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div class="text-muted" style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.6px">Children</div>
          <button class="btn btn-secondary btn-sm" style="font-size:10px;height:22px;padding:0 8px;border-radius:5px"
                  onclick="openAddChildFromInbox('${conv.id}','${family.id}')">
            <span class="mdi mdi-sm" style="font-size:12px">add</span> Add Child
          </button>
        </div>
        ${stuCards || `<div class="text-muted" style="font-size:12px;text-align:center;padding:8px 0">No children enrolled</div>`}
      </div>`;

    } else if (lead) {
      /* Lead conversation — show prospect child info */
      const stageMeta = CONST.LEAD_STAGES?.[lead.stage] || {};
      childrenHTML = `
      <div style="padding:12px 14px;border-bottom:1px solid var(--md-surface-mid)">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div class="text-muted" style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.6px">Children</div>
        </div>
        <div style="display:flex;align-items:center;gap:9px;padding:8px 10px;
                    background:var(--md-surface-low);border-radius:9px;">
          ${avatar(lead.name, 32)}
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:600;color:var(--md-on-surface)">${lead.childGrade||'—'} · ${lead.subject||'—'}</div>
            <div class="text-muted" style="font-size:11px;margin-top:1px">${lead.branch||''}</div>
          </div>
          <span style="font-size:9px;font-weight:700;border-radius:4px;padding:1px 5px;
            background:${stageMeta.bg||'var(--md-primary-container)'};color:${stageMeta.color||'var(--md-primary)'}">${lead.stage||'new'}</span>
        </div>
      </div>`;
    }

    /* ── Build Family card ──────────────────────────────── */
    const familyCard = family ? `
    <div style="padding:12px 14px;border-bottom:1px solid var(--md-surface-mid)">
      <div class="text-muted" style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">Family</div>
      ${infoCard('family_restroom', family.name,
        `${family.branch} · ${(family.studentIds||[]).length} student${(family.studentIds||[]).length!==1?'s':''}`,
        `showView('families');setTimeout(()=>openFamilyModal('${family.id}'),80)`)}
    </div>` : '';

    /* ── Build CRM card ─────────────────────────────────── */
    const crmCard = lead ? `
    <div style="padding:12px 14px;border-bottom:1px solid var(--md-surface-mid)">
      <div class="text-muted" style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">CRM Lead</div>
      ${infoCard('person_search', lead.name, `${lead.subject||'—'} · ${lead.stage}`,
        `showView('crm');setTimeout(()=>openLeadModal('${lead.id}'),80)`)}
    </div>` : `
    <div style="padding:12px 14px;border-bottom:1px solid var(--md-surface-mid)">
      <div class="text-muted" style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px">CRM</div>
      ${infoCard('add_circle', 'Create Lead', 'Link this conversation to CRM',
        `openCreateLeadFromInbox('${conv.id}')`, '')}
    </div>`;

    el.innerHTML = `
      <!-- Sticky header -->
      <div style="padding:14px 14px 10px;border-bottom:1px solid var(--md-surface-mid);display:flex;
                  justify-content:space-between;align-items:center;flex-shrink:0;
                  position:sticky;top:0;background:var(--md-surface-lowest);z-index:1">
        <div style="font-size:12px;font-weight:600;color:var(--md-on-surface)">Contact Info</div>
        <button onclick="toggleInfoPanel()"
                style="width:26px;height:26px;border-radius:6px;border:none;background:transparent;
                       cursor:pointer;display:flex;align-items:center;justify-content:center"
                class="text-muted">
          <span class="mdi mdi-sm">close</span>
        </button>
      </div>

      <!-- Identity block -->
      <div style="padding:14px;border-bottom:1px solid var(--md-surface-mid)">
        <div style="display:flex;gap:11px;align-items:center;margin-bottom:10px">
          ${avatar(conv.name, 44)}
          <div style="min-width:0">
            <div style="font-size:14px;font-weight:600;color:var(--md-on-surface)">${conv.name}</div>
            <div style="display:flex;gap:5px;align-items:center;margin-top:4px">
              ${typeBadge(conv)}
              ${chBadge(conv.channel)}
              <span class="text-muted" style="font-size:10px">${conv.branch}</span>
            </div>
          </div>
        </div>
        ${family?.parents?.[0]?.phone ? metaRow('call', 'Phone', family.parents[0].phone) : ''}
        ${family?.parents?.[0]?.line  ? metaRow('chat', 'LINE', family.parents[0].line)  : ''}
        <div style="display:flex;align-items:center;gap:8px;padding:5px 0;font-size:12px">
          <span class="mdi mdi-sm text-muted" style="font-size:14px;width:16px;flex-shrink:0">badge</span>
          <span class="text-muted" style="font-size:11px;min-width:56px">Assignee</span>
          <select style="flex:1;border:1px solid var(--md-outline-variant);border-radius:6px;padding:3px 6px;
                         font-size:12px;outline:none;color:var(--md-on-surface);background:var(--md-surface-lowest);cursor:pointer;min-width:0"
                  onchange="assignConversation('${conv.id}',this.value)">
            <option value="">Unassigned</option>
            ${staffList.map(s => `<option ${s === conv.assignee ? 'selected' : ''}>${s}</option>`).join('')}
          </select>
        </div>
      </div>

      <!-- Children -->
      ${childrenHTML}

      <!-- Family card -->
      ${familyCard}

      <!-- CRM card -->
      ${crmCard}`;

    /* After render: update FAB menu for this conversation */
    _updateFab(conv, lead, student, family);
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
      btn.style.background = infoPanelOpen ? 'var(--md-primary-container)' : 'transparent';
      btn.style.color      = infoPanelOpen ? 'var(--md-primary)' : 'var(--md-on-surface-variant)';
    }
  };

  window.closeInfoOverlay = function () {
    infoPanelOpen = false;
    document.getElementById('inbox-info-panel')?.classList.remove('overlay-open');
    document.getElementById('inbox-backdrop')?.classList.remove('show');
    const btn = document.getElementById('info-toggle-btn');
    if (btn) { btn.style.background = 'transparent'; btn.style.color = 'var(--md-on-surface-variant)'; }
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
        `<div class="text-muted" style="flex:1;display:flex;flex-direction:column;align-items:center;
           justify-content:center;gap:8px">
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
        const statusBg    = sub?.status==='approved' ? 'var(--md-success-container)' : sub?.status==='pending' ? 'var(--md-primary-container)' : 'var(--md-surface-mid)';
        const statusColor = sub?.status==='approved' ? 'var(--md-on-success-container)' : sub?.status==='pending' ? 'var(--md-on-primary-container)' : 'var(--md-on-surface-variant)';
        const statusLabel = sub?.status==='approved' ? `${UI.icon('check_circle','sm')} Approved` : sub?.status==='pending' ? `${UI.icon('pending_actions','sm')} Pending Review` : 'Reviewed';
        return `
        <div style="display:flex;justify-content:center;margin:4px 0">
          <div style="background:${statusBg};border:1.5px solid var(--md-primary);border-radius:10px;
                      padding:11px 15px;max-width:82%;cursor:pointer;transition:filter .15s"
               onmouseover="this.style.filter='brightness(.97)'" onmouseout="this.style.filter=''"
               onclick="${sub?.status==='pending' ? `openFormReviewModal('${m.subId}')` : ''}">
            <div style="font-size:12px;font-weight:700;color:${statusColor};margin-bottom:4px">
              <span class="mdi mdi-sm">assignment</span> ${ftLabel} Form Submitted
            </div>
            <div class="text-muted" style="font-size:11px;margin-bottom:8px">
              ${sub ? sub.data.students?.map(s=>`${s.name} · ${s.subject} ${s.grade}`).join(', ') : '—'}
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
              <span style="font-size:10px;font-weight:600;color:${statusColor};background:${statusBg};
                           border:1px solid var(--md-primary);border-radius:4px;padding:2px 7px">${statusLabel}</span>
              ${sub?.status==='pending'
                ? `<button class="btn btn-primary btn-sm" style="font-size:11px"
                     onclick="event.stopPropagation();openFormReviewModal('${m.subId}')">Review →</button>`
                : `<span class="text-muted" style="font-size:10px">${m.time}</span>`}
            </div>
          </div>
        </div>`;
      }

      /* Invoice card — look up from DB.invoices by invoiceId */
      if (m.type === 'invoice_card') {
        const inv        = (DB.invoices||[]).find(i => i.id === (m.invoiceId || m.invId));
        const invId      = inv?.id      || m.invId      || '—';
        const courseName = inv?.course  || m.courseName || '—';
        const hours      = inv?.hours   || m.hours      || 0;
        const amount     = inv?.amount  || m.amount     || 0;
        const SM = {paid:'green',pending_verification:'yellow',sent:'blue',draft:'gray'};
        const sCls = SM[inv?.status] || 'gray';
        return `
        <div style="display:flex;justify-content:flex-end;margin:4px 0">
          <div style="max-width:300px;background:var(--md-surface-lowest);
                      border:1.5px solid var(--md-primary);border-radius:12px;padding:12px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <span class="mdi" style="font-size:18px;color:var(--md-primary)">receipt_long</span>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:700;color:var(--md-on-surface)">${invId}</div>
                <div style="display:flex;align-items:center;gap:5px;margin-top:2px">
                  ${UI.badge(inv?.status||'draft', sCls)}
                  <span class="text-muted" style="font-size:10px">${m.time}</span>
                </div>
              </div>
            </div>
            <div style="background:var(--md-primary-container);border-radius:7px;padding:8px 10px;margin-bottom:10px">
              <div style="font-size:12px;font-weight:600;color:var(--md-on-primary-container)">${courseName}</div>
              <div style="font-size:11px;color:var(--md-primary);margin-top:2px">
                ${hours}h · ฿${amount.toLocaleString()}
              </div>
            </div>
            <div style="display:flex;gap:6px">
              <button class="btn btn-primary btn-sm" style="flex:1;justify-content:center;font-size:11px"
                      onclick="openInvoicePreviewModal('${invId}')">
                ${UI.icon('visibility','sm')} Preview
              </button>
              <button class="btn btn-secondary btn-sm" style="font-size:11px"
                      onclick="copyInvoiceLink('${invId}')">
                ${UI.icon('link','sm')}
              </button>
            </div>
          </div>
        </div>`;
      }

      /* Receipt message */
      if (m.type === 'receipt') {
        return `
        <div style="display:flex;justify-content:flex-start;margin:4px 0">
          <div style="background:var(--md-success-container);border:1.5px solid var(--md-success);border-radius:10px;
                      padding:12px 14px;max-width:82%">
            <div style="font-size:11px;font-weight:700;color:var(--md-on-success-container);margin-bottom:8px;text-transform:uppercase;letter-spacing:.4px">
              <span class="mdi mdi-sm">receipt_long</span> Official Receipt
            </div>
            <div style="display:flex;gap:10px;align-items:flex-start">
              ${m.receiptDataUrl
                ? `<img src="${m.receiptDataUrl}" alt="receipt"
                         style="width:70px;border-radius:7px;border:1px solid var(--md-success);cursor:pointer;flex-shrink:0"
                         onclick="window.open(this.src,'_blank')" title="Click to view full receipt">`
                : ''}
              <div>
                <div style="font-size:13px;font-weight:700;color:var(--md-on-success-container)">${m.rcpId||'RCP-...'}</div>
                <div style="font-size:11px;color:var(--md-on-surface);margin-top:2px">${m.coursePkg||''}</div>
                <div style="font-size:14px;font-weight:800;color:var(--md-success);margin-top:4px">${m.amount ? Utils.currency(m.amount) : ''}</div>
                <div class="text-muted" style="font-size:10px;margin-top:4px">Invoice: ${m.invId||'INV-...'}</div>
              </div>
            </div>
            ${m.receiptDataUrl
              ? `<div style="margin-top:8px">
                   <a href="${m.receiptDataUrl}" download="${m.rcpId||'receipt'}.svg"
                      style="font-size:11px;color:var(--md-success);font-weight:600;text-decoration:none">
                     ↓ Download Receipt
                   </a>
                 </div>`
              : ''}
            <div class="text-muted" style="font-size:10px;margin-top:6px;text-align:right">${m.time}</div>
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
            <div class="text-muted" style="font-size:10px;text-align:right;margin-top:4px">
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
          <div class="text-muted" style="font-size:10px;margin-top:4px">${sender} · ${m.time}</div>
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

  /* ── COMPOSE — เริ่มบทสนทนาใหม่กับ family/lead ─────────── */
  window.inboxCompose = function () {
    const famOpts = (DB.families || []).map(f =>
      `<option value="fam:${f.id}">${f.name}${f.branch ? ' · ' + f.branch : ''}</option>`).join('');
    const leadOpts = (DB.leads || []).map(l =>
      `<option value="lead:${l.id}">${l.name || l.childName || 'Lead'} (Lead)</option>`).join('');
    Modal.create('modal-compose', `${UI.icon('edit','sm')} New Message`,
      `<div class="settings-group" style="margin-bottom:12px">
        <label class="settings-label">ถึง (Family / Lead)</label>
        <select id="cmp-to" class="settings-input">
          <optgroup label="Families">${famOpts}</optgroup>
          <optgroup label="Leads">${leadOpts}</optgroup>
        </select></div>
      <div class="settings-group" style="margin-bottom:12px">
        <label class="settings-label">ช่องทาง</label>
        <select id="cmp-channel" class="settings-input">
          <option>LINE</option><option>SMS</option><option>Email</option></select></div>
      <div class="settings-group">
        <label class="settings-label">ข้อความ</label>
        <textarea id="cmp-text" class="settings-input" rows="3" placeholder="พิมพ์ข้อความแรก…"></textarea></div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-compose')">Cancel</button>
       <button class="btn btn-primary" onclick="inboxComposeSend()">${UI.icon('send','sm')} ส่ง</button>`);
  };
  window.inboxComposeSend = function () {
    const to   = document.getElementById('cmp-to')?.value || '';
    const text = (document.getElementById('cmp-text')?.value || '').trim();
    const channel = document.getElementById('cmp-channel')?.value || 'LINE';
    if (!text) return showToast('พิมพ์ข้อความก่อน', 'warning');
    const [kind, id] = to.split(':');
    const fam  = kind === 'fam'  ? (DB.families||[]).find(f => f.id === id) : null;
    const lead = kind === 'lead' ? (DB.leads||[]).find(l => l.id === id) : null;
    const name = fam?.name || lead?.name || lead?.childName || 'New conversation';
    /* ถ้ามี conversation กับคนนี้อยู่แล้ว → ต่อในอันเดิม */
    let conv = conversations.find(c => (fam && c.familyId === id) || (lead && c.leadId === id));
    if (!conv) {
      conv = { id: 'conv-' + Date.now().toString(36), name,
        familyId: fam?.id || null, leadId: lead?.id || null,
        branch: fam?.branch || lead?.branch || (window.CURRENT_USER?.branch) || CONST.BRANCHES[0],
        channel, unread: false, time: 'Now', assignee: window.CURRENT_USER?.name || 'Admin', preview: text };
      conversations.unshift(conv);
    }
    (messages[conv.id] = messages[conv.id] || []).push({ type:'staff', text, time:'Now', sender: window.CURRENT_USER?.name || 'Admin' });
    conv.preview = text; conv.time = 'Now';
    Modal.close('modal-compose');
    openConversation(conv.id);
    showToast(`ส่งข้อความถึง ${name} แล้ว ✓`, 'success');
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
    if (conv) conv.preview = isNote ? 'Internal note' : cleanText;

    renderMessages(activeConv);
    renderList();
    showToast(isNote ? 'Internal note saved' : 'Message sent ✓', 'success');
  };

  /* ── FLOATING (+) FAB ────────────────────────────────── */
  function _updateFab(conv, lead, student, family) {
    const menu = document.getElementById('chat-fab-menu');
    if (!menu) return;
    const actions = [];
    if (family && student) {
      actions.push({ icon:'receipt_long', label:'Invoice List',
        onclick:`inboxOpenInvoiceList('${conv.id}')` });
      actions.push({ icon:'add_circle', label:'New Invoice',
        onclick:`openCreateInvoiceModal({studentId:'${student.id}',convId:'${conv.id}'})` });
      actions.push({ icon:'person', label:'View Profile',
        onclick:`openProfileModal('${student.name}')` });
    } else if (lead) {
      actions.push({ icon:'person_search', label:'View Lead',
        onclick:`showView('crm');setTimeout(()=>openLeadModal('${lead.id}'),80)` });
      actions.push({ icon:'receipt_long', label:'Create Invoice',
        onclick:`openCreateInvoiceModal({leadId:'${lead.id}',convId:'${conv.id}'})` });
    }
    actions.push({ icon:'assignment', label:'Send Form',
      onclick:`openSendFormFromInbox('${conv.id}')` });
    menu.innerHTML = actions.map(a => `
      <button onclick="closeFab();${a.onclick}"
        style="display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;border:none;
               border-radius:8px;background:transparent;font-size:12px;font-weight:500;
               color:var(--md-on-surface);cursor:pointer;text-align:left;transition:background .12s"
        onmouseover="this.style.background='var(--md-primary-container)'"
        onmouseout="this.style.background='transparent'">
        <span class="mdi mdi-sm" style="color:var(--md-primary)">${a.icon}</span>
        ${a.label}
      </button>`).join('');
  }

  window.toggleInboxFab = function() {
    fabOpen = !fabOpen;
    const menu = document.getElementById('chat-fab-menu');
    const btn  = document.getElementById('chat-fab-btn');
    if (menu) menu.style.display = fabOpen ? 'block' : 'none';
    if (btn)  btn.style.background = fabOpen ? 'var(--md-primary-container)' : 'var(--md-surface-mid)';
    if (btn)  btn.style.color = fabOpen ? 'var(--md-primary)' : 'var(--md-on-surface-variant)';
  };

  window.closeFab = function() {
    fabOpen = false;
    const menu = document.getElementById('chat-fab-menu');
    const btn  = document.getElementById('chat-fab-btn');
    if (menu) menu.style.display = 'none';
    if (btn)  { btn.style.background = 'var(--md-surface-mid)'; btn.style.color = 'var(--md-on-surface-variant)'; }
  };

  /* Close FAB when clicking outside */
  document.addEventListener('click', function(e) {
    if (fabOpen && !e.target.closest('#chat-fab-menu') && !e.target.closest('#chat-fab-btn')) {
      closeFab();
    }
  });

  /* ── ADD CHILD FROM INBOX ─────────────────────────────── */
  window.openAddChildFromInbox = function(convId, familyId) {
    const fam = DB.families?.find(f => f.id === familyId);
    /* เปิดฟอร์ม New Lead ของ CRM ต่อยอดจากครอบครัวนี้ (ผูก family + สาขาให้เลย) */
    if (typeof window.openLeadModal === 'function') {
      openLeadModal(null);
      setTimeout(() => {
        const setV = (id,v)=>{ const e=document.getElementById(id); if(e&&v) e.value=v; };
        setV('nl-line', fam?.lineId); setV('nl-branch', fam?.branch); setV('nl-phone', fam?.phone);
        document.getElementById('nl-name')?.focus();
      }, 80);
      showToast(`เพิ่มลูกใหม่ให้ ${fam?.name||'ครอบครัวนี้'} — กรอกชื่อเด็ก`, 'info');
    } else {
      showToast('เปิดหน้า CRM เพื่อเพิ่ม lead', 'info');
    }
  };

  /* ── FILTERS ──────────────────────────────────────────── */
  window.setInboxType   = function(val) { filterType   = val; renderList(); };
  window.setInboxRead   = function(val) { filterRead   = val; renderList(); };
  window.setInboxAssign = function(val) { filterAssign = val; renderList(); };

  window.filterInbox = function (val) { renderList(val); };

  window.assignConversation = function (id, staff) {
    const conv = conversations.find(c => c.id === id);
    if (conv) { conv.assignee = staff; renderList(); renderHeader(conv); }
    showToast(staff ? `Assigned to ${staff} ✓` : 'Unassigned', 'success');
  };

  /* ── EXTERNAL EVENT: inbox:open ───────────────────────── */
  document.addEventListener('inbox:open', e => {
    const t = conversations.find(c =>
      c.name === e.detail.name ||
      (e.detail.name && c.name.toLowerCase().includes(
        e.detail.name.split(' ')[0].toLowerCase())));
    if (t) openConversation(t.id);
  });

  window._refreshInboxList = function () { renderList(); };

  /* ── INVOICE LIST for Customer ────────────────────────── */
  window.inboxOpenInvoiceList = function(convId) {
    const conv    = conversations.find(c => c.id === convId);
    const family  = conv?.familyId ? DB.families?.find(f => f.id === conv.familyId) : null;
    if (!family) return;

    /* Show all invoices for this family (all students) */
    const studentIds = family.studentIds || [];
    const invList = (DB.invoices || []).filter(i =>
      i.familyId === family.id || studentIds.includes(i.studentId));

    const SM = {
      paid:{cls:'green',label:'Paid'}, pending_verification:{cls:'yellow',label:'Pending'},
      sent:{cls:'blue',label:'Sent'}, draft:{cls:'gray',label:'Draft'}
    };
    const rows = invList.length
      ? invList.map(inv => {
          const sm  = SM[inv.status] || SM.draft;
          const stN = DB.students?.find(s => s.id === inv.studentId)?.name || '—';
          return `<tr class="tr-click" onclick="openInvoicePreviewModal('${inv.id}')">
            <td style="font-weight:600;font-size:12px;color:var(--md-primary)">${inv.id}</td>
            <td style="font-size:12px">${stN}</td>
            <td style="font-size:12px">${inv.course}</td>
            <td style="font-weight:600;font-size:12px">฿${inv.amount.toLocaleString()}</td>
            <td>${UI.badge(sm.label, sm.cls)}</td>
            <td class="text-muted" style="font-size:11px">${inv.date}</td>
          </tr>`;
        }).join('')
      : `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--md-on-surface-variant)">No invoices yet</td></tr>`;

    const bodyHTML = `
      <table style="width:100%">
        <thead><tr>
          <th>Invoice #</th><th>Student</th><th>Course</th><th>Amount</th><th>Status</th><th>Date</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
    const footer = `
      <button class="btn btn-secondary" onclick="Modal.close('modal-inv-list')">Close</button>
      <button class="btn btn-primary btn-sm"
              onclick="Modal.close('modal-inv-list');openCreateInvoiceModal({familyId:'${family.id}',convId:'${convId}'})">
        ${UI.icon('add','sm')} New Invoice
      </button>`;
    Modal.create('modal-inv-list', `${UI.icon('receipt_long')} Invoices — ${family.name}`, bodyHTML, footer, 'modal-lg');
  };

  /* ── INIT ─────────────────────────────────────────────── */
  renderList();
  openConversation('conv-tanaka');

})();
