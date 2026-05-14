/* ============================================================
   inbox.js — Shared Inbox Module
   ============================================================ */
(function () {

  const conversations = [
    { id:'tanaka',  name:'Tanaka Family',  student:'Mia Tanaka',   branch:'Sukhumvit', channel:'LINE', unread:true,  time:'10:42', assignee:'Admin Nock', preview:'ขอบคุณมากค่ะ สรุปบทเรียนดีมาก…' },
    { id:'wilson',  name:'Wilson Family',  student:'James Wilson',  branch:'Sukhumvit', channel:'LINE', unread:true,  time:'09:15', assignee:'',           preview:'Hi, can we reschedule Tuesday\'s…' },
    { id:'chen',    name:'Chen Family',    student:'Tom Chen',      branch:'Sukhumvit', channel:'LINE', unread:true,  time:'Yesterday', assignee:'Kru Bee', preview:'Invoice attached. Please confirm…' },
    { id:'srirak',  name:'Srirak Family',  student:'Ploy Srirak',   branch:'Silom',     channel:'LINE', unread:false, time:'Mon',   assignee:'Admin Nock', preview:'Ploy will be absent this Thursday…' },
    { id:'romano',  name:'Romano Family',  student:'Luca Romano',   branch:'Silom',     channel:'LINE', unread:false, time:'Mon',   assignee:'',           preview:'Thank you for the trial session!' },
    { id:'park',    name:'Park Family',    student:'Kevin Park',    branch:'Silom',     channel:'LINE', unread:false, time:'Fri',   assignee:'',           preview:'When is the next class schedule?' },
  ];

  const messages = {
    tanaka: [
      { type:'parent', text:'สวัสดีค่ะ อยากสอบถามเรื่องตารางเรียนสัปดาห์หน้าค่ะ', time:'Mon 09:10', sender:'Tanaka Mom' },
      { type:'staff',  text:'สวัสดีครับคุณแม่ สัปดาห์หน้า Mia มีเรียนวันอังคาร และพฤหัสบดีครับ เวลา 10:30–12:00 ครับ', time:'Mon 09:25', sender:'Admin Nock' },
      { type:'parent', text:'ขอบคุณค่ะ แล้วสรุปบทเรียนส่งได้เมื่อไหร่คะ?', time:'Mon 10:00', sender:'Tanaka Mom' },
      { type:'internal', text:'📎 Note (Internal): Summary for last session pending — remind teacher to submit', time:'Mon 10:05', sender:'Admin Nock' },
      { type:'staff',  text:'คุณแม่ครับ สรุปบทเรียนจะส่งภายในวันนี้เลยครับ', time:'Mon 10:30', sender:'Admin Nock' },
      { type:'parent', text:'ขอบคุณมากค่ะ สรุปบทเรียนดีมากเลยนะคะ Mia ชอบมากค่ะ 🙏', time:'Today 10:42', sender:'Tanaka Mom' },
    ],
    wilson: [
      { type:'parent', text:'Hi, can we reschedule Tuesday\'s class? James has a doctor appointment.', time:'Today 09:15', sender:'Wilson Dad' },
    ],
    chen: [
      { type:'parent', text:'Please find the payment slip attached. Invoice #INV-2026-0049 confirmed.', time:'Yesterday', sender:'Chen Mom' },
    ],
    srirak: [
      { type:'parent', text:'สวัสดีค่ะ แจ้งว่า Ploy จะไม่มาเรียนวันพฤหัสนี้ค่ะ ขอ Leave ค่ะ', time:'Mon', sender:'Srirak Mom' },
    ],
    romano: [
      { type:'parent', text:'Thank you so much for the trial session! Luca really enjoyed it.', time:'Mon', sender:'Romano Dad' },
    ],
    park: [
      { type:'parent', text:'สวัสดีครับ อยากถามว่าตารางเรียนของ Kevin อาทิตย์หน้าเป็นยังไงบ้างครับ?', time:'Fri', sender:'Park Dad' },
    ],
  };

  const staffList = ['Admin Nock','Kru Arm','Kru Bee','Kru Cat','Kru Dan','Kru Eve'];
  let activeConv = 'tanaka';
  let filterMode = 'all';

  /* ── RENDER SHELL ─────────────────────────────────────── */
  document.getElementById('view-inbox').innerHTML = `
  <div class="page-header">
    <div><div class="page-title">Shared Inbox</div><div class="page-sub">3 unread conversations</div></div>
    <div style="display:flex;gap:8px">
      <button class="btn btn-secondary btn-sm">Filter</button>
      <button class="btn btn-primary btn-sm" onclick="showToast('Compose coming soon','info')">＋ Compose</button>
    </div>
  </div>
  <div class="inbox-layout">
    <!-- LEFT: Conversation List -->
    <div class="inbox-list">
      <div style="padding:10px 12px;border-bottom:1px solid #e5e7eb">
        <input type="text" placeholder="Search conversations…" style="width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:5px 8px;font-size:12px;outline:none" oninput="filterInbox(this.value)">
      </div>
      <div style="padding:8px 12px;border-bottom:1px solid #f3f4f6;display:flex;gap:4px">
        <div class="filter-chip active" style="font-size:11px;padding:3px 10px" onclick="setInboxFilter('all',this)">All</div>
        <div class="filter-chip" style="font-size:11px;padding:3px 10px" onclick="setInboxFilter('unread',this)">Unread</div>
        <div class="filter-chip" style="font-size:11px;padding:3px 10px" onclick="setInboxFilter('mine',this)">Mine</div>
      </div>
      <div id="inbox-list-items"></div>
    </div>
    <!-- RIGHT: Chat Area -->
    <div class="chat-area">
      <div class="chat-header" id="chat-header"></div>
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-input">
        <input type="text" id="chat-input-box" placeholder="Reply to parent… (type // for internal note)" onkeydown="handleChatInput(event)">
        <button class="btn btn-primary" onclick="sendMessage()">Send</button>
      </div>
    </div>
  </div>`;

  /* ── RENDER LIST ──────────────────────────────────────── */
  function renderList(searchVal = '') {
    let convs = conversations;
    if (filterMode === 'unread') convs = convs.filter(c => c.unread);
    if (filterMode === 'mine')   convs = convs.filter(c => c.assignee === 'Admin Nock');
    if (searchVal) convs = convs.filter(c => (c.name + c.preview).toLowerCase().includes(searchVal.toLowerCase()));

    document.getElementById('inbox-list-items').innerHTML = convs.map(c => `
      <div class="inbox-item ${c.unread ? 'unread' : ''} ${c.id === activeConv ? 'active' : ''}"
           onclick="openConversation('${c.id}')">
        <span class="inbox-time">${c.time}</span>
        <div class="inbox-name">${c.name}</div>
        <div class="inbox-preview">${c.preview}</div>
        <div class="inbox-assign-tag">
          ${c.assignee ? `👤 ${c.assignee}` : '<span style="color:#9ca3af">Unassigned</span>'}
        </div>
      </div>`).join('');
  }

  /* ── RENDER CHAT ──────────────────────────────────────── */
  function renderChat(id) {
    const conv = conversations.find(c => c.id === id);
    if (!conv) return;

    // Mark as read
    conv.unread = false;

    // Header
    document.getElementById('chat-header').innerHTML = `
      <div class="avatar" style="width:36px;height:36px;font-size:13px">${conv.name[0]}</div>
      <div style="flex:1">
        <div style="font-size:14px;font-weight:600">${conv.name}</div>
        <div style="font-size:11px;color:#9ca3af">${conv.student} · ${conv.branch} · ${conv.channel}</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <select style="border:1px solid #e5e7eb;border-radius:6px;padding:4px 8px;font-size:12px;outline:none;color:#374151"
                onchange="assignConversation('${id}',this.value)" title="Assign to">
          <option value="">Unassigned</option>
          ${staffList.map(s => `<option ${s===conv.assignee?'selected':''}>${s}</option>`).join('')}
        </select>
        <button class="btn btn-secondary btn-sm" onclick="openCustomerModal('${conv.student}')">👤 Profile</button>
        <button class="btn btn-secondary btn-sm" onclick="showView('tasks')">📋 Tasks</button>
      </div>`;

    // Messages
    const msgs = messages[id] || [];
    document.getElementById('chat-messages').innerHTML = msgs.map(m => `
      <div>
        <div class="msg ${m.type}">${m.text}
          <div class="msg-meta">${m.sender} · ${m.time}</div>
        </div>
      </div>`).join('');

    // Scroll to bottom
    const el = document.getElementById('chat-messages');
    el.scrollTop = el.scrollHeight;
  }

  /* ── PUBLIC FUNCTIONS ─────────────────────────────────── */
  window.openConversation = function (id) {
    activeConv = id;
    renderList();
    renderChat(id);
  };

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
    showToast(staff ? `Assigned to ${staff}` : 'Unassigned', 'success');
  };

  window.sendMessage = function () {
    const input = document.getElementById('chat-input-box');
    const text = input.value.trim();
    if (!text) return;
    const isInternal = text.startsWith('//');
    const cleanText = isInternal ? text.slice(2).trim() : text;
    const msgs = messages[activeConv] = messages[activeConv] || [];
    msgs.push({ type: isInternal ? 'internal' : 'staff', text: (isInternal ? '📎 Note (Internal): ' : '') + cleanText, time: 'Now', sender: 'Admin Nock' });
    input.value = '';
    renderChat(activeConv);
    showToast(isInternal ? 'Internal note saved' : 'Message sent ✓', 'success');
  };

  window.handleChatInput = function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  /* ── LISTEN FOR openInboxFor() FROM OTHER MODULES ─────── */
  document.addEventListener('inbox:open', e => {
    const target = conversations.find(c => c.name === e.detail.name || c.student === e.detail.name);
    if (target) openConversation(target.id);
  });

  /* ── INIT ─────────────────────────────────────────────── */
  renderList();
  renderChat('tanaka');

})();
