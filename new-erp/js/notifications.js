/* ============================================================
   notifications.js — NockERP Notifications Module
   ============================================================ */
(function () {

  /* ── TYPE META ────────────────────────────────────────── */
  const TYPE_META = {
    danger:  { icon:'priority_high', color:'var(--md-error)',   badge:'red',    border:'var(--md-error)',   bg:'var(--md-error-container)'   },
    warning: { icon:'warning',       color:'var(--md-warning)', badge:'yellow', border:'var(--md-warning)', bg:'var(--md-warning-container)' },
    info:    { icon:'info',          color:'var(--md-primary)', badge:'blue',   border:'var(--md-primary)', bg:'var(--md-primary-container)' },
  };

  /* ── GENERATE FROM DB ─────────────────────────────────── */
  function buildNotifications() {
    const items = [];

    /* Summaries awaiting Admin/Manager approval */
    let awaiting = 0;
    DB.sessions.forEach(s => Object.values(s.summaries||{}).forEach(sum => {
      if (sum.submitted && !sum.sent) awaiting++;
    }));
    if (awaiting) {
      items.push({ id:'sum-approval', type:'warning',
        iconName:'approval',
        title:'Summaries awaiting approval',
        text:`${awaiting} summary ที่ครู submit แล้ว — รอ Admin/Manager ตรวจก่อนส่ง Parent`,
        time:'วันนี้', read:false,
        action:`showView('summaries')`, aLabel:'Review' });
    }

    /* Renewal alerts */
    DB.students.filter(s => s.status==='renewal').forEach(s => {
      const left     = Math.min(...(s.courses||[{left:99}]).map(c=>c.left));
      const isUrgent = left <= 1;
      if (isUrgent) {
        items.push({ id:`renew-urgent-${s.id}`, type:'danger',
          iconName:'priority_high',
          title:`Renewal · Urgent: ${s.name}`,
          text:`เหลือ ${left} class เท่านั้น — ถ้าไม่ต่อจะหมดสัญญา`,
          time:'เร่งด่วน', read:false,
          action:`openFollowUpModal('${s.name}')`, aLabel:'Follow Up' });
        return;
      }
      items.push({ id:`renew-${s.id}`, type:'warning',
        iconName:'warning',
        title:`Renewal: ${s.name}`,
        text:`เหลือ ${left} class — ควรติดต่อผู้ปกครองเพื่อต่อ package`,
        time:'ภายใน 7 วัน', read:false,
        action:`openFollowUpModal('${s.name}')`, aLabel:'Follow Up' });
    });

    /* Summaries not written */
    const pendingSumm = [];
    DB.sessions.forEach(s => {
      if (!s.summaries) return;
      Object.entries(s.summaries).forEach(([name, sum]) => { if (!sum.text) pendingSumm.push({ s, name }); });
    });
    if (pendingSumm.length) items.push({ id:'summ-pending', type:'warning',
      iconName:'edit_note',
      title:`${pendingSumm.length} Summary Not Written`,
      text:pendingSumm.map(p=>`${p.name} · ${p.s.subject}`).join(', '),
      time:'ค้างอยู่', read:false,
      action:`showView('summaries')`, aLabel:'Go to Summaries' });

    /* Summaries ready to send */
    const readyToSend = [];
    DB.sessions.forEach(s => {
      if (!s.summaries) return;
      Object.entries(s.summaries).forEach(([name, sum]) => { if (sum.text&&!sum.sent) readyToSend.push(name); });
    });
    if (readyToSend.length) items.push({ id:'summ-send', type:'info',
      iconName:'send',
      title:`${readyToSend.length} Summary Ready to Send`,
      text:`Written but not sent to parents: ${readyToSend.join(', ')}`,
      time:'พร้อมส่ง', read:false,
      action:`showView('summaries')`, aLabel:'Send Now' });

    /* New leads */
    const newLeads = (DB.leads||[]).filter(l => l.stage==='new');
    if (newLeads.length) items.push({ id:'leads-new', type:'info',
      iconName:'person_search',
      title:`${newLeads.length} New Lead${newLeads.length>1?'s':''} Not Contacted`,
      text:newLeads.map(l=>l.name).join(', '),
      time:'รอการติดต่อ', read:false,
      action:`showView('crm')`, aLabel:'Open CRM' });

    /* Today's sessions */
    const todayDH   = DB.dayHeaders.find(d => d.isToday);
    const todaySess = todayDH ? DB.sessions.filter(s => s.date===todayDH.date && s.state==='upcoming') : [];
    if (todaySess.length) {
      const sh = CONST.SLOT_HOURS[todaySess[0].slotId]||{};
      items.push({ id:'today-sessions', type:'info',
        iconName:'calendar_today',
        title:`${todaySess.length} Session${todaySess.length>1?'s':''} Today`,
        text:`First: ${todaySess[0].subject} at ${sh.s||'—'} · ${todaySess[0].room}`,
        time:'วันนี้', read:true,
        action:`showView('sessions')`, aLabel:'View Sessions' });
    }

    /* Pending billing */
    items.push({ id:'billing-pending', type:'warning',
      iconName:'payments',
      title:'INV-2026-0051 รอ Verify',
      text:'Tanaka Family ส่ง payment slip มา 18 ชม. — ยังไม่ได้ confirm',
      time:'18 ชม. ที่แล้ว', read:false,
      action:`showView('billing')`, aLabel:'Verify Invoice' });

    return items;
  }

  /* ── STATE ────────────────────────────────────────────── */
  let notifications = buildNotifications();
  let readSet       = new Set();
  let filterMode    = 'all';

  /* ── RUNTIME PUSH API ─────────────────────────────────── */
  const TYPE_FROM_EVENT = { new_student:'info', class_postponed:'warning' };
  const ICON_FROM_EVENT = { new_student:'person_add', class_postponed:'pause_circle',
                            danger:'priority_high', warning:'warning', info:'info' };
  window.addNotification = function(n) {
    const type    = TYPE_FROM_EVENT[n.type] || n.type || 'info';
    const iconName= n.iconName || ICON_FROM_EVENT[n.type] || ICON_FROM_EVENT[type] || 'notifications';
    notifications.unshift({
      id:      n.id || ('noti-' + Date.now()),
      type,
      iconName,
      title:   n.title   || 'Notification',
      text:    n.text    || '',
      time:    n.time    || 'Just now',
      read:    n.read    ?? false,
      action:  n.action  || "showView('calendar')",
      aLabel:  n.aLabel  || 'View Calendar',
    });
    render();
  };

  /* ── SHELL ────────────────────────────────────────────── */
  document.getElementById('view-notifications').innerHTML = `
  ${UI.pageHeader('Notifications', '<span id="notif-sub">Loading…</span>',
    `<button class="btn btn-secondary btn-sm" onclick="markAllRead()">${UI.icon('done_all','sm')} Mark All Read</button>`
  )}

  ${UI.filterBar([
    { label:'All',     active:true,  onclick:"notifFilter('all',this)"     },
    { label:'Unread',  active:false, onclick:"notifFilter('unread',this)"  },
    { label:'Urgent',  active:false, onclick:"notifFilter('danger',this)"  },
    { label:'Warning', active:false, onclick:"notifFilter('warning',this)" },
    { label:'Info',    active:false, onclick:"notifFilter('info',this)"    },
  ])}

  <div id="notif-list"></div>`;

  /* ── RENDER ───────────────────────────────────────────── */
  function render() {
    let items = notifications;
    if (filterMode === 'unread') items = items.filter(n => !readSet.has(n.id) && !n.read);
    if (['danger','warning','info'].includes(filterMode)) items = items.filter(n => n.type===filterMode);

    const unreadCount = notifications.filter(n => !readSet.has(n.id) && !n.read).length;

    const sub = document.getElementById('notif-sub');
    if (sub) sub.textContent = unreadCount > 0
      ? `${unreadCount} unread notification${unreadCount>1?'s':''}`
      : 'All caught up';

    /* Sidebar badge */
    const badge = document.getElementById('badge-notifications');
    if (badge) { badge.textContent = unreadCount||''; badge.style.display = unreadCount ? '' : 'none'; }
    const notiPulse = document.getElementById('noti-pulse');
    const notiSub   = document.getElementById('noti-sub-text');
    if (notiPulse) notiPulse.classList.toggle('active', unreadCount > 0);
    if (notiSub)   notiSub.textContent = unreadCount > 0 ? `${unreadCount} unread` : 'All caught up';

    const container = document.getElementById('notif-list');
    if (!container) return;

    if (!items.length) {
      container.innerHTML = UI.card(UI.emptyState('notifications', 'No notifications', 'All caught up'));
      return;
    }

    container.innerHTML = items.map(n => {
      const tm     = TYPE_META[n.type] || TYPE_META.info;
      const isRead = readSet.has(n.id) || n.read;
      return `
      <div id="notif-${n.id}"
           style="display:flex;gap:var(--sp-3);padding:var(--sp-3) var(--sp-4);
                  background:${isRead ? 'var(--md-surface)' : tm.bg};
                  border:1px solid ${isRead ? 'var(--md-outline-variant)' : tm.border};
                  border-radius:var(--shape-md);margin-bottom:var(--sp-2);cursor:pointer;transition:all .15s"
           onclick="markRead('${n.id}')">
        <div style="width:10px;height:10px;border-radius:50%;flex-shrink:0;margin-top:5px;
                    background:${isRead ? 'var(--md-outline)' : tm.border}"></div>
        <div style="flex:1;min-width:0">
          <div style="display:flex;align-items:center;gap:var(--sp-2);margin-bottom:var(--sp-1)">
            <span style="color:${tm.color}">${UI.icon(n.iconName||tm.icon,'sm')}</span>
            <span style="font-size:var(--fs-label-lg);font-weight:${isRead?'500':'700'};
                         color:var(--md-on-surface)">${n.title}</span>
            ${!isRead ? UI.badge(n.type, tm.badge) : ''}
          </div>
          <div class="text-muted" style="font-size:var(--fs-body-sm);margin-bottom:var(--sp-2);line-height:1.5">${n.text}</div>
          <div style="display:flex;align-items:center;gap:var(--sp-2)">
            <span style="font-size:var(--fs-label-sm);color:var(--md-on-surface-variant)">${n.time}</span>
            <button class="btn btn-primary btn-sm"
                    onclick="event.stopPropagation();markRead('${n.id}');${n.action}">${n.aLabel}</button>
          </div>
        </div>
      </div>`;
    }).join('');
  }

  /* ── ACTIONS ──────────────────────────────────────────── */
  window.markRead = function (id) { readSet.add(id); render(); };

  window.markAllRead = function () {
    notifications.forEach(n => readSet.add(n.id));
    render();
    showToast('All notifications marked as read ✓', 'success');
  };

  window.notifFilter = function (mode, el) {
    filterMode = mode;
    document.querySelectorAll('#view-notifications .filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active');
    render();
  };

  /* ── INIT ─────────────────────────────────────────────── */
  render();

})();
