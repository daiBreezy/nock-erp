/* ============================================================
   notifications.js — NockERP Notifications Module
   Generates alerts from DB: renewals, summaries, leads, tasks
   ============================================================ */
(function () {

  /* ── GENERATE NOTIFICATIONS FROM DB ──────────────────── */
  function buildNotifications() {
    const items = [];
    const now   = '2026-05-15';

    /* 1 & 2. Renewal alerts — urgent (1 left = red) + warning (2 left = yellow) */
    DB.students.filter(s=>s.status==='renewal').forEach(s => {
      const left     = Math.min(...(s.courses||[{left:99}]).map(c=>c.left));
      const isUrgent = left <= 1;
      if (isUrgent) {
        items.push({
          id:      `renew-urgent-${s.id}`,
          type:    'danger',
          icon:    '<span class="mdi" style="font-size:16px;color:var(--md-error)">priority_high</span>',
          title:   `Renewal · Urgent: ${s.name}`,
          text:    `เหลือ ${left} class เท่านั้น — ถ้าไม่ต่อจะหมดสัญญา`,
          time:    'เร่งด่วน',
          read:    false,
          action:  `openFollowUpModal('${s.name}')`,
          aLabel:  'Follow Up',
        });
        return; // urgent ไม่ต้องสร้าง warning ซ้ำ
      }
      // warning (2 left)
      {
      const left = Math.min(...(s.courses||[{left:99}]).map(c=>c.left));
      items.push({
        id:      `renew-${s.id}`,
        type:    'warning',
        icon:    '<span class="mdi" style="font-size:16px;color:var(--md-warning)">warning</span>',
        title:   `Renewal: ${s.name}`,
        text:    `เหลือ ${left} class — ควรติดต่อผู้ปกครองเพื่อต่อ package`,
        time:    'ภายใน 7 วัน',
        read:    false,
        action:  `openFollowUpModal('${s.name}')`,
        aLabel:  'Follow Up',
      });
      } // end warning block
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
        icon:    '<span class="mdi" style="font-size:16px;color:var(--md-warning)">edit_note</span>',
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
        icon:    '<span class="mdi" style="font-size:16px;color:var(--md-primary)">send</span>',
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
        icon:    '<span class="mdi" style="font-size:16px;color:var(--md-primary)">person_search</span>',
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
        icon:    '<span class="mdi" style="font-size:16px;color:var(--md-primary)">calendar_today</span>',
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
      icon:    '<span class="mdi" style="font-size:16px;color:var(--md-warning)">payments</span>',
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
    danger:  { border:'var(--md-error)',   bg:'var(--md-error-container)',   dot:'var(--md-error)',   badge:'badge-red'    },
    warning: { border:'var(--md-warning)', bg:'var(--md-warning-container)', dot:'var(--md-warning)', badge:'badge-yellow' },
    info:    { border:'var(--md-primary)', bg:'var(--md-primary-container)', dot:'var(--md-primary)', badge:'badge-blue'   },
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
    <div class="filter-chip" onclick="notifFilter('danger',this)"><span class="mdi mdi-sm" style="font-size:11px">priority_high</span> Urgent</div>
    <div class="filter-chip" onclick="notifFilter('warning',this)"><span class="mdi mdi-sm" style="font-size:11px">warning</span> Warning</div>
    <div class="filter-chip" onclick="notifFilter('info',this)"><span class="mdi mdi-sm" style="font-size:11px">info</span> Info</div>
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

    /* Update sidebar badge + notification bar */
    const badge = document.getElementById('badge-notifications');
    if (badge) {
      badge.textContent = unreadCount || '';
      badge.style.display = unreadCount ? '' : 'none';
    }
    const notiBar = document.querySelector('.sidebar-noti');
    const notiPulse = document.getElementById('noti-pulse');
    const notiSub = document.getElementById('noti-sub-text');
    if (notiBar) notiBar.classList.toggle('has-unread', unreadCount > 0);
    if (notiPulse) notiPulse.classList.toggle('active', unreadCount > 0);
    if (notiSub) notiSub.textContent = unreadCount > 0
      ? `${unreadCount} unread`
      : 'All caught up ✓';

    const container = document.getElementById('notif-list');
    if (!container) return;

    if (items.length === 0) {
      container.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:var(--md-on-surface-variant)">
        <div style="font-size:32px;margin-bottom:8px"><span class="mdi">notifications</span></div>No notifications</div>`;
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
            ${n.icon}
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
