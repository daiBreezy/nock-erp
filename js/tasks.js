/* ============================================================
   tasks.js — NockERP Tasks Module
   Auto-generates tasks from DB + manual task list
   ============================================================ */
(function () {

  /* ── GENERATE TASKS FROM DB ───────────────────────────── */
  function buildTasks() {
    const tasks = [];

    /* Renewal follow-ups — urgent (1 left = red) + warning (2 left) */
    DB.students.filter(s=>s.status==='renewal').forEach(s => {
      const left     = Math.min(...(s.courses||[{left:99}]).map(c=>c.left));
      const isUrgent = left <= 1;
      if (isUrgent) {
        tasks.push({ id:`fu-${s.id}`, done:false, priority:'urgent',
          text:`Follow up — ${s.name}`,
          sub: `${left} class left · ${s.family}`,
          source:'ai', sourceLabel:'🤖 AI', due:'Today',
          action:`openFollowUpModal('${s.name}')`, aLabel:'Follow Up' });
        return;
      }
      // warning (2 left)
      {
      const left2 = Math.min(...(s.courses||[{left:99}]).map(c=>c.left));
      tasks.push({ id:`renew-${s.id}`, done:false, priority:'warning',
        text:`Renewal reminder — ${s.name}`,
        sub: `${left2} classes left · contact ${s.family}`,
        source:'system', sourceLabel:'🔧 System', due:'This week',
        action:`openFollowUpModal('${s.name}')`, aLabel:'Follow Up' });
      } // end warning block
    });

    /* Pending invoice verification */
    tasks.push({ id:'inv-verify', done:false, priority:'warning',
      text:'Verify INV-2026-0051 — Tanaka Family',
      sub: 'Payment slip received via LINE · ฿14,400',
      source:'ai', sourceLabel:'🤖 AI', due:'Today',
      action:`showView('billing')`, aLabel:'Go to Billing' });

    /* Summaries not written */
    let pendingSumm = 0;
    DB.sessions.forEach(s => {
      if (s.summaries) Object.values(s.summaries).forEach(sum => { if(!sum.text) pendingSumm++; });
    });
    if (pendingSumm > 0) {
      tasks.push({ id:'summ-write', done:false, priority:'normal',
        text:`Write ${pendingSumm} session summary`,
        sub: 'Teachers have pending summaries to complete',
        source:'system', sourceLabel:'🔧 System', due:'Today',
        action:`showView('summaries')`, aLabel:'Write Now' });
    }

    /* Ready-to-send summaries */
    let readySumm = 0;
    DB.sessions.forEach(s => {
      if (s.summaries) Object.values(s.summaries).forEach(sum => { if(sum.text&&!sum.sent) readySumm++; });
    });
    if (readySumm > 0) {
      tasks.push({ id:'summ-send', done:false, priority:'normal',
        text:`Send ${readySumm} summary to parents`,
        sub: 'Written summaries waiting to be sent via LINE',
        source:'system', sourceLabel:'🔧 System', due:'Today',
        action:`showView('summaries')`, aLabel:'Send Now' });
    }

    /* New leads not contacted */
    const newLeads = (DB.leads||[]).filter(l=>l.stage==='new');
    if (newLeads.length) {
      tasks.push({ id:'leads-contact', done:false, priority:'normal',
        text:`Contact ${newLeads.length} new lead${newLeads.length>1?'s':''}`,
        sub: newLeads.map(l=>l.name).join(', '),
        source:'system', sourceLabel:'🔧 System', due:'This week',
        action:`showView('crm')`, aLabel:'Open CRM' });
    }

    /* Static admin tasks */
    tasks.push(
      { id:'schedule-june', done:false, priority:'normal',
        text:'Prepare June class schedule',
        sub: 'Confirm rooms and teachers for all branches',
        source:'admin', sourceLabel:'⚙️ Admin', due:'20 May' },
      { id:'invoice-chen', done:false, priority:'normal',
        text:'Send renewal invoice — Chen Family',
        sub: 'Math G6 · 36h · ฿10,800',
        source:'admin', sourceLabel:'⚙️ Admin', due:'Tomorrow' },
      { id:'trial-confirm', done:true, priority:'normal',
        text:'Confirm trial class — Hana Yamamoto',
        sub: 'English Reading · 15 May 10:30',
        source:'admin', sourceLabel:'⚙️ Admin', due:'Done' },
    );

    return tasks;
  }

  /* ── STATE ────────────────────────────────────────────── */
  let tasks  = buildTasks();
  let fShow  = 'pending'; // pending | done | all
  let fPrio  = 'all';

  /* ── SHELL ────────────────────────────────────────────── */
  document.getElementById('view-tasks').innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Tasks</div>
      <div class="page-sub" id="tasks-sub">Loading…</div>
    </div>
    <button class="btn btn-primary btn-sm" onclick="openAddTask()">＋ Add Task</button>
  </div>

  <!-- KPI -->
  <div id="tasks-kpi" class="kpi-grid mb-16" style="grid-template-columns:repeat(3,1fr)"></div>

  <!-- Filters -->
  <div style="display:flex;gap:5px;margin-bottom:16px;flex-wrap:wrap;align-items:center">
    <div class="filter-chip" onclick="taskFilter('show','all',this)">All</div>
    <div class="filter-chip active" onclick="taskFilter('show','pending',this)"><span class="mdi mdi-sm" style="font-size:11px">pending_actions</span> Pending</div>
    <div class="filter-chip" onclick="taskFilter('show','done',this)"><span class="mdi mdi-sm" style="font-size:11px">task_alt</span> Done</div>
    <div style="width:1px;background:var(--md-outline-variant);height:20px;margin:0 4px"></div>
    <div class="filter-chip active" onclick="taskFilter('prio','all',this)">All Priority</div>
    <div class="filter-chip" onclick="taskFilter('prio','urgent',this)"><span class="mdi mdi-sm" style="font-size:11px">priority_high</span> Urgent</div>
    <div class="filter-chip" onclick="taskFilter('prio','warning',this)"><span class="mdi mdi-sm" style="font-size:11px">warning</span> Warning</div>
  </div>

  <!-- Task list -->
  <div class="card">
    <div id="tasks-list"></div>
  </div>`;

  /* ── RENDER KPI ───────────────────────────────────────── */
  function renderKPI() {
    const pending = tasks.filter(t=>!t.done).length;
    const urgent  = tasks.filter(t=>!t.done&&t.priority==='urgent').length;
    const done    = tasks.filter(t=>t.done).length;
    document.getElementById('tasks-kpi').innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon warning"><span class="mdi">pending_actions</span></div>
        <div class="kpi-label">Pending</div>
        <div class="kpi-value" style="color:${pending>0?'var(--md-warning)':'var(--md-success)'}">${pending}</div>
        <div class="kpi-change ${pending>0?'down':'up'}">${urgent} urgent</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon error"><span class="mdi">priority_high</span></div>
        <div class="kpi-label">Urgent</div>
        <div class="kpi-value" style="color:${urgent>0?'var(--md-error)':'var(--md-success)'}">${urgent}</div>
        <div class="kpi-change ${urgent>0?'down':'up'}">Need action today</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon success"><span class="mdi">task_alt</span></div>
        <div class="kpi-label">Completed</div>
        <div class="kpi-value" style="color:var(--md-success)">${done}</div>
        <div class="kpi-change up">of ${tasks.length} total</div>
      </div>`;
  }

  /* ── RENDER LIST ──────────────────────────────────────── */
  function renderList() {
    let list = [...tasks];
    if (fShow === 'pending') list = list.filter(t=>!t.done);
    if (fShow === 'done')    list = list.filter(t=> t.done);
    if (fPrio !== 'all')     list = list.filter(t=>t.priority===fPrio);

    /* Sort: urgent first, then warning, then normal; done last */
    const pOrd = {urgent:0,warning:1,normal:2};
    list.sort((a,b)=> {
      if (a.done !== b.done) return a.done?1:-1;
      return (pOrd[a.priority]||2)-(pOrd[b.priority]||2);
    });

    const sub = document.getElementById('tasks-sub');
    if (sub) sub.textContent = `${list.filter(t=>!t.done).length} pending · ${list.filter(t=>t.done).length} done`;

    const container = document.getElementById('tasks-list');
    if (!container) return;

    if (list.length === 0) {
      container.innerHTML = `<div style="padding:40px;text-align:center;color:var(--md-on-surface-variant)">
        <div style="font-size:32px;margin-bottom:8px"><span class="mdi">task_alt</span></div>All caught up!</div>`;
      return;
    }

    const PRIO_COLOR = {urgent:'var(--md-error)',warning:'var(--md-warning)',normal:'transparent'};

    container.innerHTML = list.map(t => `
      <div class="task-item" style="border-left:3px solid ${t.done?'transparent':PRIO_COLOR[t.priority]||'transparent'}">
        <div class="task-check ${t.done?'done':''}" onclick="toggleTaskItem('${t.id}')">
          ${t.done?'✓':''}
        </div>
        <div class="task-info">
          <div class="task-text ${t.done?'done':''}">${t.text}</div>
          ${t.sub?`<div class="task-sub">${t.sub}</div>`:''}
        </div>
        <div class="task-right">
          <span class="task-source ${t.source||'system'}">${t.sourceLabel||'🔧'}</span>
          <span class="task-due ${t.due==='Today'&&!t.done?'urgent':''}">${t.due||''}</span>
          ${t.action&&!t.done?`<button class="btn btn-secondary btn-sm" style="font-size:11px;padding:2px 8px"
            onclick="${t.action}">${t.aLabel}</button>`:''}
        </div>
      </div>`).join('');
  }

  /* ── ACTIONS ──────────────────────────────────────────── */
  window.toggleTaskItem = function (id) {
    const t = tasks.find(x=>x.id===id);
    if (t) t.done = !t.done;
    renderKPI(); renderList();
    showToast(t?.done?'Task done ✓':'Task reopened','success');
  };

  window.taskFilter = function (key, val, el) {
    if (key==='show') {
      fShow = val;
      const chips = document.querySelectorAll('#view-tasks .filter-chip');
      [0,1,2].forEach(i => chips[i]?.classList.remove('active'));
      el.classList.add('active');
    }
    if (key==='prio') {
      fPrio = val;
      const chips = document.querySelectorAll('#view-tasks .filter-chip');
      [3,4,5].forEach(i => chips[i]?.classList.remove('active'));
      el.classList.add('active');
    }
    renderList();
  };

  window.openAddTask = function () {
    Modal.create('modal-add-task','＋ New Task',
      `<div class="modal-section">
        <div class="settings-group"><label class="settings-label">Task</label>
          <input id="new-task-text" class="settings-input" placeholder="What needs to be done?"></div>
        <div class="settings-row" style="margin-top:12px">
          <div class="settings-group"><label class="settings-label">Priority</label>
            <select id="new-task-prio" class="settings-input">
              <option value="normal">Normal</option>
              <option value="warning">⚠️ Warning</option>
              <option value="urgent">🚨 Urgent</option>
            </select></div>
          <div class="settings-group"><label class="settings-label">Due</label>
            <select id="new-task-due" class="settings-input">
              <option>Today</option><option>Tomorrow</option>
              <option>This week</option><option>Next week</option>
            </select></div>
        </div>
        <div class="settings-group" style="margin-top:12px"><label class="settings-label">Note (optional)</label>
          <input id="new-task-sub" class="settings-input" placeholder="Extra details…"></div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-add-task')">Cancel</button>
       <button class="btn btn-primary" onclick="addTask()">＋ Add Task</button>`
    );
  };

  window.addTask = function () {
    const text = document.getElementById('new-task-text')?.value.trim();
    if (!text) { showToast('Please enter a task','warning'); return; }
    tasks.unshift({
      id: `manual-${Date.now()}`, done:false,
      priority: document.getElementById('new-task-prio')?.value||'normal',
      text,
      sub:  document.getElementById('new-task-sub')?.value||'',
      source:'admin', sourceLabel:'⚙️ Admin',
      due:  document.getElementById('new-task-due')?.value||'Today',
    });
    Modal.close('modal-add-task');
    renderKPI(); renderList();
    showToast('Task added ✓','success');
  };

  /* ── INIT ─────────────────────────────────────────────── */
  renderKPI(); renderList();

  /* Sync filter chip initial state */
  const chips = document.querySelectorAll('#view-tasks .filter-chip');
  if (chips[3]) chips[3].classList.add('active'); // "All Priority"

})();
