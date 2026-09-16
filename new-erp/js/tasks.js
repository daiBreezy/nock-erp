/* ============================================================
   tasks.js — NockERP Tasks Module
   ============================================================ */
(function () {

  /* ── GENERATE TASKS FROM DB ───────────────────────────── */
  function buildTasks() {
    const aiLabel     = `${UI.icon('smart_toy','sm')} AI`;
    const sysLabel    = `${UI.icon('build','sm')} System`;
    const adminLabel  = `${UI.icon('admin_panel_settings','sm')} Admin`;
    const tasks       = [];

    /* Renewal follow-ups */
    DB.students.filter(s => s.status==='renewal').forEach(s => {
      const left     = Math.min(...(s.courses||[{left:99}]).map(c=>c.left));
      const isUrgent = left <= 1;
      tasks.push(isUrgent
        ? { id:`fu-${s.id}`,    done:false, priority:'urgent',
            text:`Follow up — ${s.name}`,
            sub:`${left} class left · ${s.family}`,
            source:'ai', sourceLabel:aiLabel, due:'Today',
            action:`openFollowUpModal('${s.name}')`, aLabel:'Follow Up' }
        : { id:`renew-${s.id}`, done:false, priority:'warning',
            text:`Renewal reminder — ${s.name}`,
            sub:`${left} classes left · contact ${s.family}`,
            source:'system', sourceLabel:sysLabel, due:'This week',
            action:`openFollowUpModal('${s.name}')`, aLabel:'Follow Up' }
      );
    });

    /* Pending invoice */
    tasks.push({ id:'inv-verify', done:false, priority:'warning',
      text:'Verify INV-2026-0051 — Tanaka Family',
      sub:'Payment slip received via LINE · ฿14,400',
      source:'ai', sourceLabel:aiLabel, due:'Today',
      action:`showView('billing')`, aLabel:'Go to Billing' });

    /* Summaries not written */
    let pendingSumm = 0;
    DB.sessions.forEach(s => {
      if (s.summaries) Object.values(s.summaries).forEach(sum => { if (!sum.text) pendingSumm++; });
    });
    if (pendingSumm > 0) tasks.push({ id:'summ-write', done:false, priority:'normal',
      text:`Write ${pendingSumm} session summar${pendingSumm===1?'y':'ies'}`,
      sub:'Teachers have pending summaries to complete',
      source:'system', sourceLabel:sysLabel, due:'Today',
      action:`showView('summaries')`, aLabel:'Write Now' });

    /* Ready-to-send summaries */
    let readySumm = 0;
    DB.sessions.forEach(s => {
      if (s.summaries) Object.values(s.summaries).forEach(sum => { if (sum.text&&!sum.sent) readySumm++; });
    });
    if (readySumm > 0) tasks.push({ id:'summ-send', done:false, priority:'normal',
      text:`Send ${readySumm} summar${readySumm===1?'y':'ies'} to parents`,
      sub:'Written summaries waiting to be sent via LINE',
      source:'system', sourceLabel:sysLabel, due:'Today',
      action:`showView('summaries')`, aLabel:'Send Now' });

    /* New leads */
    const newLeads = (DB.leads||[]).filter(l => l.stage==='new');
    if (newLeads.length) tasks.push({ id:'leads-contact', done:false, priority:'normal',
      text:`Contact ${newLeads.length} new lead${newLeads.length>1?'s':''}`,
      sub:newLeads.map(l=>l.name).join(', '),
      source:'system', sourceLabel:sysLabel, due:'This week',
      action:`showView('crm')`, aLabel:'Open CRM' });

    /* Static admin tasks */
    tasks.push(
      { id:'schedule-june', done:false, priority:'normal',
        text:'Prepare June class schedule',
        sub:'Confirm rooms and teachers for all branches',
        source:'admin', sourceLabel:adminLabel, due:'20 May' },
      { id:'invoice-chen', done:false, priority:'normal',
        text:'Send renewal invoice — Chen Family',
        sub:'Math G6 · 36h · ฿10,800',
        source:'admin', sourceLabel:adminLabel, due:'Tomorrow' },
      { id:'trial-confirm', done:true, priority:'normal',
        text:'Confirm trial class — Hana Yamamoto',
        sub:'English Reading · 15 May 10:30',
        source:'admin', sourceLabel:adminLabel, due:'Done' },
    );

    return tasks;
  }

  /* ── STATE ────────────────────────────────────────────── */
  let tasks = buildTasks();
  let fShow = 'pending';
  let fPrio = 'all';

  /* ── SHELL ────────────────────────────────────────────── */
  document.getElementById('view-tasks').innerHTML = `
  ${UI.pageHeader('Tasks', '<span id="tasks-sub">Loading…</span>',
    `<button class="btn btn-primary btn-sm" onclick="openAddTask()">${UI.icon('add','sm')} Add Task</button>`
  )}

  <div id="tasks-kpi"></div>

  <div class="filter-bar">
    <div class="filter-chip"         onclick="taskFilter('show','all',this)">All</div>
    <div class="filter-chip active"  onclick="taskFilter('show','pending',this)">${UI.icon('pending_actions','sm')} Pending</div>
    <div class="filter-chip"         onclick="taskFilter('show','done',this)">${UI.icon('task_alt','sm')} Done</div>
    <div style="width:1px;background:var(--md-outline-variant);height:20px;margin:0 var(--sp-1)"></div>
    <div class="filter-chip active"  onclick="taskFilter('prio','all',this)">All Priority</div>
    <div class="filter-chip"         onclick="taskFilter('prio','urgent',this)">${UI.icon('priority_high','sm')} Urgent</div>
    <div class="filter-chip"         onclick="taskFilter('prio','warning',this)">${UI.icon('warning','sm')} Warning</div>
  </div>

  <div class="card">
    <div id="tasks-list"></div>
  </div>`;

  /* ── RENDER KPI ───────────────────────────────────────── */
  function renderKPI() {
    const pending = tasks.filter(t => !t.done).length;
    const urgent  = tasks.filter(t => !t.done && t.priority==='urgent').length;
    const done    = tasks.filter(t =>  t.done).length;

    document.getElementById('tasks-kpi').innerHTML = UI.kpiGrid([
      { icon:'pending_actions', label:'Pending',   value:pending,
        color: pending ? 'warning' : 'success',
        sub:`${urgent} urgent`, subColor: urgent ? 'down' : '' },
      { icon:'priority_high',   label:'Urgent',    value:urgent,
        color: urgent ? 'error' : 'success',
        sub:'Need action today', subColor: urgent ? 'down' : 'up' },
      { icon:'task_alt',        label:'Completed', value:done,
        color:'success', sub:`of ${tasks.length} total`, subColor:'up' },
    ]);
    const grid = document.querySelector('#tasks-kpi .kpi-grid');
    if (grid) grid.style.gridTemplateColumns = 'repeat(3,1fr)';
  }

  /* ── RENDER LIST ──────────────────────────────────────── */
  function renderList() {
    let list = [...tasks];
    if (fShow === 'pending') list = list.filter(t => !t.done);
    if (fShow === 'done')    list = list.filter(t =>  t.done);
    if (fPrio !== 'all')     list = list.filter(t => t.priority === fPrio);

    const pOrd = { urgent:0, warning:1, normal:2 };
    list.sort((a,b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (pOrd[a.priority]||2) - (pOrd[b.priority]||2);
    });

    const sub = document.getElementById('tasks-sub');
    if (sub) sub.textContent = `${tasks.filter(t=>!t.done).length} pending · ${tasks.filter(t=>t.done).length} done`;

    const container = document.getElementById('tasks-list');
    if (!container) return;

    if (!list.length) {
      container.innerHTML = UI.emptyState('task_alt', 'All caught up!', 'No tasks match the current filter');
      return;
    }

    const PRIO_COLOR = { urgent:'var(--md-error)', warning:'var(--md-warning)', normal:'transparent' };

    container.innerHTML = list.map(t => `
      <div class="task-item" style="border-left:3px solid ${t.done ? 'transparent' : PRIO_COLOR[t.priority]||'transparent'}">
        <div class="task-check ${t.done?'done':''}" onclick="toggleTaskItem('${t.id}')">
          ${t.done ? UI.icon('check','sm') : ''}
        </div>
        <div class="task-info">
          <div class="task-text ${t.done?'done':''}">${t.text}</div>
          ${t.sub ? `<div class="task-sub">${t.sub}</div>` : ''}
        </div>
        <div class="task-right">
          <span class="task-source ${t.source||'system'}">${t.sourceLabel || UI.icon('build','sm')}</span>
          <span class="task-due ${t.due==='Today'&&!t.done?'urgent':''}">${t.due||''}</span>
          ${t.action && !t.done
            ? `<button class="btn btn-secondary btn-sm" style="font-size:var(--fs-label-sm);padding:2px var(--sp-2)"
                 onclick="${t.action}">${t.aLabel}</button>`
            : ''}
        </div>
      </div>`).join('');
  }

  /* ── ACTIONS ──────────────────────────────────────────── */
  window.toggleTaskItem = function (id) {
    const t = tasks.find(x => x.id===id);
    if (t) t.done = !t.done;
    renderKPI(); renderList();
    showToast(t?.done ? 'Task done ✓' : 'Task reopened', 'success');
  };

  window.taskFilter = function (key, val, el) {
    const chips = document.querySelectorAll('#view-tasks .filter-chip');
    if (key === 'show') {
      fShow = val;
      [0,1,2].forEach(i => chips[i]?.classList.remove('active'));
    }
    if (key === 'prio') {
      fPrio = val;
      [3,4,5].forEach(i => chips[i]?.classList.remove('active'));
    }
    el.classList.add('active');
    renderList();
  };

  window.openAddTask = function () {
    Modal.create('modal-add-task', `${UI.icon('add')} New Task`,
      `<div class="modal-section">
        <div class="settings-group"><label class="settings-label">Task</label>
          <input id="new-task-text" class="settings-input" placeholder="What needs to be done?" autofocus></div>
        <div class="settings-row" style="margin-top:var(--sp-3)">
          <div class="settings-group"><label class="settings-label">Priority</label>
            <select id="new-task-prio" class="settings-input">
              <option value="normal">Normal</option>
              <option value="warning">Warning</option>
              <option value="urgent">Urgent</option>
            </select></div>
          <div class="settings-group"><label class="settings-label">Due</label>
            <select id="new-task-due" class="settings-input">
              <option>Today</option><option>Tomorrow</option>
              <option>This week</option><option>Next week</option>
            </select></div>
        </div>
        <div class="settings-group" style="margin-top:var(--sp-3)">
          <label class="settings-label">Note (optional)</label>
          <input id="new-task-sub" class="settings-input" placeholder="Extra details…">
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-add-task')">Cancel</button>
       <button class="btn btn-primary" onclick="addTask()">${UI.icon('add','sm')} Add Task</button>`
    );
  };

  window.addTask = function () {
    const text = document.getElementById('new-task-text')?.value.trim();
    if (!text) { showToast('Please enter a task', 'warning'); return; }
    tasks.unshift({
      id:`manual-${Date.now()}`, done:false,
      priority: document.getElementById('new-task-prio')?.value || 'normal',
      text,
      sub:  document.getElementById('new-task-sub')?.value || '',
      source:'admin', sourceLabel:`${UI.icon('admin_panel_settings','sm')} Admin`,
      due:  document.getElementById('new-task-due')?.value || 'Today',
    });
    Modal.close('modal-add-task');
    renderKPI(); renderList();
    showToast('Task added ✓', 'success');
  };

  /* ── INIT ─────────────────────────────────────────────── */
  renderKPI(); renderList();

})();
