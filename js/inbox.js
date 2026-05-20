/* ============================================================
   inbox.js — Shared Inbox Module
   Chat UI: avatar bubbles · channel badges · note mode
   ============================================================ */
(function () {

  /* ── DATA ─────────────────────────────────────────────── */
  const conversations = DB.conversations;
  const messages      = DB.messages;
  const staffList     = CONST.STAFF_NAMES;
  let activeConv = 'tanaka';
  let filterMode = 'all';

  /* ── AVATAR HELPERS ───────────────────────────────────── */
  const AV_COLORS = [
    '#6366f1','#10b981','#f59e0b','#ef4444','#8b5cf6',
    '#06b6d4','#f97316','#84cc16','#ec4899','#14b8a6',
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
    const c = {LINE:'#06c755',WhatsApp:'#25d366',Email:'#6366f1',SMS:'#f59e0b'}[ch] || '#9ca3af';
    return `<span style="font-size:9px;font-weight:700;color:#fff;background:${c};
      border-radius:4px;padding:1px 5px;letter-spacing:.3px">${ch||'?'}</span>`;
  }

  /* ── SHELL ────────────────────────────────────────────── */
  document.getElementById('view-inbox').innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Shared Inbox</div>
      <div class="page-sub" id="inbox-sub">Loading…</div>
    </div>
    <button class="btn btn-primary btn-sm" onclick="showToast('Compose coming soon','info')">＋ Compose</button>
  </div>

  <div class="inbox-layout">

    <!-- LEFT: Conversation list -->
    <div class="inbox-list">
      <div style="padding:10px 12px;border-bottom:1px solid #e5e7eb">
        <input placeholder="🔍  Search conversations…"
          style="width:100%;border:1px solid #e5e7eb;border-radius:7px;
                 padding:6px 10px;font-size:12px;outline:none;box-sizing:border-box"
          oninput="filterInbox(this.value)">
      </div>
      <div style="padding:8px 12px;border-bottom:1px solid #f3f4f6;display:flex;gap:5px">
        <div class="filter-chip active" style="font-size:11px;padding:3px 10px"
             onclick="setInboxFilter('all',this)">All</div>
        <div class="filter-chip" style="font-size:11px;padding:3px 10px"
             onclick="setInboxFilter('unread',this)">Unread</div>
        <div class="filter-chip" style="font-size:11px;padding:3px 10px"
             onclick="setInboxFilter('mine',this)">Mine</div>
      </div>
      <div id="inbox-list-items" style="overflow-y:auto;flex:1"></div>
    </div>

    <!-- RIGHT: Chat area -->
    <div class="chat-area">
      <div id="chat-header" class="chat-header"></div>
      <div id="chat-messages" class="chat-messages"></div>

      <!-- Note mode indicator -->
      <div id="note-banner" style="display:none;padding:5px 14px;
           background:#fef3c7;border-top:1px solid #fcd34d;
           font-size:11px;color:#92400e;flex-shrink:0">
        📎 Internal Note — only staff will see this
      </div>

      <!-- Input -->
      <div class="chat-input" style="flex-direction:column;gap:7px;padding:12px 14px">
        <div style="display:flex;gap:8px">
          <input type="text" id="chat-input-box"
            placeholder="Reply to parent… (start with // for internal note)"
            style="flex:1;padding:9px 13px;border:1.5px solid #e5e7eb;border-radius:9px;
                   font-size:13px;outline:none;transition:all .15s;box-sizing:border-box"
            oninput="onInboxInput(this)"
            onkeydown="handleChatInput(event)">
          <button class="btn btn-primary" onclick="sendMessage()" style="white-space:nowrap">
            Send ↵
          </button>
        </div>
        <div style="font-size:10px;color:#9ca3af">
          💡 Type <kbd style="background:#f3f4f6;border:1px solid #e5e7eb;
            border-radius:3px;padding:0 4px;font-size:10px">//</kbd>
          at the start to write a staff-only internal note
        </div>
      </div>
    </div>
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
      ? `<div style="padding:28px;text-align:center;color:#9ca3af;font-size:13px">
           No conversations found</div>`
      : convs.map(c => `
        <div class="inbox-item ${c.unread ? 'unread' : ''} ${c.id === activeConv ? 'active' : ''}"
             onclick="openConversation('${c.id}')"
             style="display:flex;gap:10px;padding:11px 13px;border-bottom:1px solid #f3f4f6">
          <!-- Avatar + unread dot -->
          <div style="position:relative;flex-shrink:0">
            ${avatar(c.name, 38)}
            ${c.unread
              ? `<div style="position:absolute;top:-1px;right:-1px;width:9px;height:9px;
                   background:#6366f1;border-radius:50%;border:2px solid #fff"></div>`
              : ''}
          </div>
          <!-- Text -->
          <div style="flex:1;min-width:0">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:4px">
              <div style="font-size:13px;font-weight:${c.unread ? '700' : '500'};
                          color:#1a1d23;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                ${c.name}
              </div>
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
            <div style="font-size:10px;margin-top:3px;
                        color:${c.assignee ? '#6366f1' : '#d1d5db'}">
              ${c.assignee ? `👤 ${c.assignee}` : 'Unassigned'}
            </div>
          </div>
        </div>`).join('');
  }

  /* ── RENDER CHAT HEADER ───────────────────────────────── */
  function renderHeader(conv) {
    document.getElementById('chat-header').innerHTML = `
      <!-- Avatar + name -->
      <div style="display:flex;align-items:center;gap:11px;flex:1;min-width:0">
        <div style="position:relative;flex-shrink:0">
          ${avatar(conv.name, 40)}
          <div style="position:absolute;bottom:1px;right:1px;width:10px;height:10px;
            background:#10b981;border-radius:50%;border:2px solid #fff"></div>
        </div>
        <div style="min-width:0">
          <div style="font-size:14px;font-weight:600;color:#1a1d23">${conv.name}</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:1px;display:flex;gap:6px;align-items:center">
            <span>${conv.student}</span>
            <span>·</span>
            <span>${conv.branch}</span>
            <span>·</span>
            ${chBadge(conv.channel)}
          </div>
        </div>
      </div>
      <!-- Actions -->
      <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
        <select style="border:1px solid #e5e7eb;border-radius:6px;padding:5px 8px;
                       font-size:12px;outline:none;color:#374151;background:#fff;cursor:pointer"
                onchange="assignConversation('${conv.id}',this.value)" title="Assign to">
          <option value="">Unassigned</option>
          ${staffList.map(s =>
            `<option ${s === conv.assignee ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
        ${(()=>{
          const linked = DB.leads.find(l => l.convId === conv.id);
          if (linked) {
            const meta = CONST.LEAD_STAGES[linked.stage] || {};
            return `<button class="btn btn-sm" style="background:${meta.bg||'#ede9fe'};color:${meta.color||'#6366f1'};border:1.5px solid ${meta.color||'#6366f1'}20;font-weight:600"
              onclick="showView('crm');setTimeout(()=>openLeadModal('${linked.id}'),80)" title="View lead in CRM">
              🎯 ${linked.name.split(' ')[0]}</button>`;
          }
          return `<button class="btn btn-primary btn-sm"
            onclick="openCreateLeadFromInbox('${conv.id}')">＋ Create Lead</button>`;
        })()}
        <button class="btn btn-secondary btn-sm"
                onclick="openSendFormFromInbox('${conv.id}')">📋 Send Form</button>
        <button class="btn btn-secondary btn-sm"
                onclick="openCustomerModal('${conv.student}')">👤 Profile</button>
      </div>`;
  }

  /* ── RENDER MESSAGES ──────────────────────────────────── */
  function renderMessages(id) {
    const conv = conversations.find(c => c.id === id);
    const msgs = (messages[id] || []);

    if (msgs.length === 0) {
      document.getElementById('chat-messages').innerHTML =
        `<div style="flex:1;display:flex;flex-direction:column;align-items:center;
           justify-content:center;gap:8px;color:#9ca3af">
           <div style="font-size:36px">💬</div>
           <div style="font-size:13px">Start the conversation</div>
         </div>`;
      return;
    }

    document.getElementById('chat-messages').innerHTML = msgs.map(m => {
      const isStaff    = m.type === 'staff';
      const isInternal = m.type === 'internal';
      const sender     = m.sender || (isStaff ? 'Admin Nock' : conv?.name || 'Parent');

      /* ── Form submission notification ── */
      if (m.type === 'form_submission') {
        const ft = m.formType;
        const ftLabel = ft==='enrollment'?'Enrollment':ft==='trial'?'Trial':'Test';
        const sub = (DB.formSubmissions||[]).find(s=>s.id===m.subId);
        const statusBg = sub?.status==='approved' ? '#dcfce7' : sub?.status==='pending' ? '#ede9fe' : '#f3f4f6';
        const statusColor = sub?.status==='approved' ? '#065f46' : sub?.status==='pending' ? '#4c1d95' : '#6b7280';
        const statusLabel = sub?.status==='approved' ? '✅ Approved' : sub?.status==='pending' ? '⏳ Pending Review' : 'Reviewed';
        return `
        <div style="display:flex;justify-content:center;margin:4px 0">
          <div style="background:${statusBg};border:1.5px solid #c4b5fd;border-radius:10px;
                      padding:11px 15px;max-width:82%;cursor:pointer;transition:all .15s"
               onmouseover="this.style.filter='brightness(.97)'" onmouseout="this.style.filter=''"
               onclick="${sub?.status==='pending'?`openFormReviewModal('${m.subId}')`:''}" >
            <div style="font-size:12px;font-weight:700;color:${statusColor};margin-bottom:4px">
              📋 ${ftLabel} Form Submitted
            </div>
            <div style="font-size:11px;color:#6b7280;margin-bottom:8px">
              ${sub ? sub.data.students?.map(s=>`${s.name} · ${s.subject} ${s.grade}`).join(', ') : '—'}
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
              <span style="font-size:10px;font-weight:600;color:${statusColor};background:${statusBg};
                           border:1px solid #c4b5fd;border-radius:4px;padding:2px 7px">${statusLabel}</span>
              ${sub?.status==='pending' ? `<button class="btn btn-primary btn-sm"
                onclick="event.stopPropagation();openFormReviewModal('${m.subId}')">Review →</button>` :
                `<span style="font-size:10px;color:#9ca3af">${m.time}</span>`}
            </div>
          </div>
        </div>`;
      }

      /* ── Internal note ── */
      if (isInternal) {
        return `
        <div style="display:flex;justify-content:center">
          <div style="background:#fef3c7;border:1.5px dashed #f59e0b;border-radius:9px;
                      padding:9px 13px;max-width:68%;font-size:12px;color:#92400e">
            📎 <strong>Internal Note</strong>
            <div style="margin-top:3px">${m.text.replace('📎 Note (Internal): ','')}</div>
            <div style="font-size:10px;color:#b45309;margin-top:5px;text-align:right">
              ${sender} · ${m.time}
            </div>
          </div>
        </div>`;
      }

      /* ── Staff message (right) ── */
      if (isStaff) {
        return `
        <div style="display:flex;justify-content:flex-end;align-items:flex-end;gap:8px">
          <div style="max-width:72%">
            <div style="background:#6366f1;color:#fff;border-radius:13px 13px 2px 13px;
                        padding:10px 13px;font-size:13px;line-height:1.55;word-break:break-word">
              ${m.text}
            </div>
            <div style="font-size:10px;color:#9ca3af;text-align:right;margin-top:4px">
              ${sender} · ${m.time}
            </div>
          </div>
          ${avatar(sender, 28)}
        </div>`;
      }

      /* ── Parent message (left) ── */
      return `
      <div style="display:flex;align-items:flex-end;gap:8px">
        ${avatar(conv?.name || 'P', 28)}
        <div style="max-width:72%">
          <div style="background:#f3f4f6;color:#1a1d23;border-radius:13px 13px 13px 2px;
                      padding:10px 13px;font-size:13px;line-height:1.55;word-break:break-word">
            ${m.text}
          </div>
          <div style="font-size:10px;color:#9ca3af;margin-top:4px">
            ${sender} · ${m.time}
          </div>
        </div>
      </div>`;
    }).join('');

    /* Scroll to bottom */
    const el = document.getElementById('chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
  }

  /* ── OPEN CONVERSATION ────────────────────────────────── */
  window.openConversation = function (id) {
    activeConv = id;
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;
    conv.unread = false;
    renderList();
    renderHeader(conv);
    renderMessages(id);
  };

  /* ── INPUT HANDLING ───────────────────────────────────── */
  window.onInboxInput = function (inp) {
    const note   = inp.value.startsWith('//');
    const banner = document.getElementById('note-banner');
    if (banner) banner.style.display = note ? '' : 'none';
    inp.style.borderColor = note ? '#f59e0b' : '#e5e7eb';
    inp.style.background  = note ? '#fffbeb' : '#fff';
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

    /* Reset input */
    inp.value            = '';
    inp.style.borderColor = '#e5e7eb';
    inp.style.background  = '#fff';
    const banner = document.getElementById('note-banner');
    if (banner) banner.style.display = 'none';

    /* Update list preview */
    const conv = conversations.find(c => c.id === activeConv);
    if (conv) conv.preview = isNote ? '📎 Internal note' : cleanText;

    renderMessages(activeConv);
    renderList();
    showToast(isNote ? '📎 Internal note saved' : 'Message sent ✓', 'success');
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
    if (conv) { conv.assignee = staff; renderList(); }
    showToast(staff ? `Assigned to ${staff} ✓` : 'Unassigned', 'success');
  };

  /* ── LISTEN FOR inbox:open FROM OTHER MODULES ─────────── */
  document.addEventListener('inbox:open', e => {
    const t = conversations.find(c =>
      c.name === e.detail.name || c.student === e.detail.name ||
      (e.detail.name && c.name.toLowerCase().includes(
        e.detail.name.split(' ')[0].toLowerCase())));
    if (t) openConversation(t.id);
  });

  /* ── GLOBAL REFRESH (for external modules) ───────────── */
  window._refreshInboxList = function () { renderList(); };

  /* ── INIT ─────────────────────────────────────────────── */
  renderList();
  openConversation('tanaka');

})();
