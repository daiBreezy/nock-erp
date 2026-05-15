/* ============================================================
   notifications.js — NockERP Notifications Module
   Generates alerts from DB: renewals, summaries, leads, tasks
   ============================================================ */
(function () {

  /* ── GENERATE NOTIFICATIONS FROM DB ──────────────────── */
  function buildNotifications() {
    const items = [];
    const now   = '2026-05-15';

    /* 1. Urgent renewal alerts */
    DB.students.filter(s=>s.status==='urgent').forEach(s => {
      const left = Math.min(...(s.courses||[]).map(c=>c.left));
      items.push({
        id:      `renew-urgent-${s.id}`,
        type:    'danger',
        icon:    '🚨',
        title:   `URGENT: ${s.name}`,
        text:    `เหลือ ${left} class เท่านั้น — ถ้าไม่ต่อจะหมดสัญญา`,
        time:    'เร่งด่วน',
        read:    false,
        action:  `openFollowUpModal('${s.name}')`,
        aLabel:  'Follow Up',
      });
    });

    /* 2. Renewal pending */
    DB.students.filter(s=>s.status==='renewal').forEach(s => {
      const left = Math.min(...(s.courses||[]).map(c=>c.left));
      items.push({
        id:      `renew-${s.id}`,
        type:    'warning',
        icon:    '⚠️',
        title:   `Renewal: ${s.name}`,
        text:    `เหลือ ${left} class — ควรติดต่อผู้ปกครองเพื่อต่อ package`,
        time:    'ภายใน 7 วัน',
        read:    false,
        action:  `openFollowUpModal('${s.name}')`,
        aLabel:  'Follow Up',
      });
    });

    /* 3. Summaries not written */
    const pendingSumm = [];
    DB.sessions.forEach(s => {
      if (!s.summaries) return;
      Object.entries(s.summaries).forEach(([name, sum]) => {
        if (!sum.text) pendingSumm.push({ session:s, name });
      });
    });
    if (pendingSumm.length > 0) {
      items.push({
        id:      'summ-pending',
        type:    'warning',
        icon:    '📝',
        title:   `${pendingSumm.length} Summary Not Written`,
        text:    pendingSumm.map(p=>`${p.name} · ${p.session.subject}`).join(', '),
        time:    'ค้างอยู่',
        read:    false,
        action:  `showView('summaries')`,
        aLabel:  'Go to Summaries',
      });
    }

    /* 4. Summaries written but not sent */
    const readyToSend = [];
    DB.sessions.forEach(s => {
      if (!s.summaries) return;
      Object.entries(s.summaries).forEach(([name, sum]) => {
        if (sum.text && !sum.sent) readyToSend.push(name);
      });
    });
    if (readyToSend.length > 0) {
      items.push({
        id:      'summ-send',
        type:    'info',
        icon:    '📨',
        title:   `${readyToSend.length} Summary Ready to Send`,
        text:    `Written but not sent to parents: ${readyToSend.join(', ')}`,
        time:    'พร้อมส่ง',
        read:    false,
        action:  `showView('summaries')`,
        aLabel:  'Send Now',
      });
    }

    /* 5. New leads not contacted */
    const newLeads = (DB.leads||[]).filter(l=>l.stage==='new');
    if (newLeads.length > 0) {
      items.push({
        id:      'leads-new',
        type:    'info',
        icon:    '🎯',
        title:   `${newLeads.length} New Lead${newLeads.length>1?'s':''} Not Contacted`,
        text:    newLeads.map(l=>l.name).join(', '),
        time:    'รอการติดต่อ',
        read:    false,
        action:  `showView('crm')`,
        aLabel:  'Open CRM',
      });
    }

    /* 6. Today's sessions coming up */
    const todayDH = DB.dayHeaders.find(d=>d.isToday);
    const todaySess = todayDH ? DB.sessions.filter(s=>s.date===todayDH.date && s.state==='upcoming') : [];
    if (todaySess.length > 0) {
      const sh0 = CONST.SLOT_HOURS[todaySess[0].slotId]||{};
      items.push({
        id:      'today-sessions',
        type:    'info',
        icon:    '📅',
        title:   `${todaySess.length} Session${todaySess.length>1?'s':''} Today`,
        text:    `First: ${todaySess[0].subject} at ${sh0.s||'—'} · ${todaySess[0].room}`,
        time:    'วันนี้',
        read:    true,
        action:  `showView('sessions')`,
        aLabel:  'View Sessions',
      });
    }

    /* 7. Pending billing verification (mock) */
    items.push({
      id:      'billing-pending',
      type:    'warning',
      icon:    '💳',
      title:   'INV-2026-0051 รอ Verify',
      text:    'Tanaka Family ส่ง payment slip มา 18 ชม. — ยังไม่ได้ confirm',
      time:    '18 ชม. ที่แล้ว',
      read:    false,
      action:  `showView('billing')`,
      aLabel:  'Verify Invoice',
    });

    return items;
  }

  /* ── STATE ────────────────────────────────────────────── */
  let notifications = buildNotifications();
  let readSet = new Set();

  /* ── COLORS ───────────────────────────────────────────── */
  const TYPE_STYLE = {
    danger:  { border:'#ef4444', bg:'#fef2f2', dot:'#ef4444', badge:'badge-red'    },
    warning: { border:'#f59e0b', bg:'#fffbeb', dot:'#f59e0b', badge:'badge-yellow' },
    info:    { border:'#6366f1', bg:'#f5f3ff', dot:'#6366f1', badge:'badge-blue'   },
  };

  /* ── SHELL ────────────────────────────────────────────── */
  document.getElementById('view-notifications').innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Notifications</div>
      <div class="page-sub" id="notif-sub">Loading…</div>
    </div>
    <button class="btn btn-secondary btn-sm" onclick="markAllRead()">✓ Mark All Read</button>
  </div>

  <!-- Filter -->
  <div style="display:flex;gap:5px;margin-bottom:16px">
    <div class="filter-chip active" onclick="notifFilter('all',this)">All</div>
    <div class="filter-chip" onclick="notifFilter('unread',this)">Unread</div>
    <div class="filter-chip" onclick="notifFilter('danger',this)">🚨 Urgent</div>
    <div class="filter-chip" onclick="notifFilter('warning',this)">⚠️ Warning</div>
    <div class="filter-chip" onclick="notifFilter('info',this)">💡 Info</div>
  </div>

  <div id="notif-list"></div>`;

  /* ── RENDER ───────────────────────────────────────────── */
  let filterMode = 'all';

  function render() {
    let items = notifications;
    if (filterMode === 'unread') items = items.filter(n => !readSet.has(n.id));
    if (['danger','warning','info'].includes(filterMode)) items = items.filter(n=>n.type===filterMode);

    const unreadCount = notifications.filter(n=>!readSet.has(n.id)&&!n.read).length;
    const sub = document.getElementById('notif-sub');
    if (sub) sub.textContent = unreadCount > 0
      ? `${unreadCount} unread notification${unreadCount>1?'s':''}`
      : 'All caught up ✓';

    /* Update sidebar badge */
    const badge = document.getElementById('badge-notifications');
    if (badge) {
      badge.textContent = unreadCount || '';
      badge.style.display = unreadCount ? '' : 'none';
    }

    const container = document.getElementById('notif-list');
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:#9ca3af">
        <div style="font-size:32px;margin-bottom:8px">🔔</div>No notifications</div>`;
      return;
    }

    container.innerHTML = items.map(n => {
      const ts   = TYPE_STYLE[n.type] || TYPE_STYLE.info;
      const isRead = readSet.has(n.id) || n.read;
      return `
      <div id="notif-${n.id}" style="display:flex;gap:12px;padding:14px 16px;
            background:${isRead?'#fff':ts.bg};border:1px solid ${isRead?'#f3f4f6':ts.border};
            border-radius:10px;margin-bottom:10px;cursor:pointer;transition:all .15s"
           onclick="markRead('${n.id}')">
        <!-- Dot -->
        <div style="width:10px;height:10px;border-radius:50%;background:${isRead?'#e5e7eb':ts.dot};
                    flex-shrink:0;margin-top:5px"></div>
        <!-- Content -->
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
            <span style="font-size:16px">${n.icon}</span>
            <span style="font-size:13px;font-weight:${isRead?'500':'700'};color:#1a1d23">${n.title}</span>
            ${!isRead?`<span class="badge ${ts.badge}" style="font-size:9px">${n.type}</span>`:''}
          </div>
          <div style="font-size:12px;color:#6b7280;margin-bottom:5px;line-height:1.5">${n.text}</div>
          <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:10px;color:#9ca3af">${n.time}</span>
            <button class="btn btn-primary btn-sm" style="font-size:11px;padding:2px 8px"
                    onclick="event.stopPropagation();markRead('${n.id}');${n.action}">${n.aLabel}</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  /* ── ACTIONS ──────────────────────────────────────────── */
  window.markRead = function (id) {
    readSet.add(id);
    render();
  };

  window.markAllRead = function () {
    notifications.forEach(n => readSet.add(n.id));
    render();
    showToast('All notifications marked as read ✓', 'success');
  };

  window.notifFilter = function (mode, el) {
    filterMode = mode;
    document.querySelectorAll('#view-notifications .filter-chip').forEach(c=>c.classList.remove('active'));
    el.classList.add('active');
    render();
  };

  /* ── INIT ─────────────────────────────────────────────── */
  render();

})();
