/* ============================================================
   crm-schedule.js — CRM: Schedule Appointment Modal
   Calendar rendering → CalendarWidget.renderDay / renderWeek
   col convention: 1-indexed (1=Mon … 7=Sun), same as DB.sessions
   ============================================================ */
(function () {

  /* ── MODULE STATE ─────────────────────────────────────── */
  let currentLeadId  = null;
  let selectedSlot   = null;   // { sessionId, slotId, col, isNew, date?, teacher? }
  let apptType       = 'test';
  let panelCollapsed = false;
  let viewMode       = 'day';          // 'day' | 'week'
  let selectedDate   = '2026-05-14';   // active date in day view
  let weekOffset     = 0;              // weeks offset from current week

  /* ── DATE HELPERS ─────────────────────────────────────── */
  const _MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const _DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const TODAY   = '2026-05-14';

  function _mondayOf(dateStr) {
    const d   = new Date(dateStr);
    const dow = d.getDay() === 0 ? 6 : d.getDay() - 1;  // 0=Mon…6=Sun
    d.setDate(d.getDate() - dow);
    return d;
  }

  function generateWeekHeaders(offset) {
    const mon = new Date(_mondayOf(TODAY));
    mon.setDate(mon.getDate() + offset * 7);
    const headers = [];
    for (let i = 0; i < 7; i++) {
      const d       = new Date(mon);
      d.setDate(mon.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      const label   = `${_DAYS[d.getDay()]} ${d.getDate()} ${_MONTHS[d.getMonth()]}`;
      headers.push({
        date:      dateStr,
        label,
        isToday:   dateStr === TODAY,
        isHoliday: dateStr === '2026-05-15',   // Visakha Bucha
      });
    }
    return headers;
  }

  function weekLabel(offset) {
    const h = generateWeekHeaders(offset);
    const f = new Date(h[0].date), l = new Date(h[6].date);
    if (f.getMonth() === l.getMonth()) {
      return `${f.getDate()}–${l.getDate()} ${_MONTHS[f.getMonth()]} ${f.getFullYear()}`;
    }
    return `${f.getDate()} ${_MONTHS[f.getMonth()]} – ${l.getDate()} ${_MONTHS[l.getMonth()]} ${l.getFullYear()}`;
  }

  function dateLabel(dateStr) {
    const d = new Date(dateStr);
    if (dateStr === TODAY) return `Today, ${d.getDate()} ${_MONTHS[d.getMonth()]}`;
    return `${_DAYS[d.getDay()]} ${d.getDate()} ${_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  }

  function _navLabel() {
    return viewMode === 'day' ? dateLabel(selectedDate) : weekLabel(weekOffset);
  }

  function _dateToCol(dateStr) {
    const dow = new Date(dateStr).getDay();  // 0=Sun
    return dow === 0 ? 7 : dow;              // 1=Mon … 7=Sun
  }

  /* ── OPEN MODAL ───────────────────────────────────────── */
  window.scheduleAppointmentModal = function (leadId) {
    currentLeadId  = leadId;
    selectedSlot   = null;
    apptType       = 'test';
    panelCollapsed = false;
    viewMode       = 'day';
    selectedDate   = TODAY;
    weekOffset     = 0;

    const lead = DB.leads.find(l => l.id === leadId) || {};

    Modal.create('modal-schedule', `${UI.icon('event_available')} Schedule Appointment`,
      buildHTML(lead),
      `<button class="btn btn-secondary" onclick="Modal.close('modal-schedule')">Cancel</button>
       <button class="btn btn-primary" id="sched-confirm-btn" disabled onclick="confirmAppt()">${UI.icon('send','sm')} Confirm & Send to Chat</button>`,
      'modal-xl');

    renderSchedGrid();
  };

  /* ── MODAL HTML ───────────────────────────────────────── */
  function buildHTML(lead) {
    const roomOpts   = Utils.roomsFor(lead?.branch || 'Sukhumvit').map(r => `<option>${r}</option>`).join('');
    const branchOpts = CONST.BRANCHES.map(b => `<option>${b}</option>`).join('');

    return `
    <div style="display:flex;height:580px;margin:-20px -20px -20px;gap:0">

      <!-- ══ LEFT PANEL (collapsible) ════════════════════ -->
      <div id="sched-panel"
           style="width:230px;flex-shrink:0;border-right:1px solid var(--md-outline-variant);
                  overflow:hidden;transition:width .2s ease;background:var(--md-surface-lowest)">
        <div style="width:230px;padding:14px 14px 0;display:flex;flex-direction:column;gap:10px">

          <!-- Lead info -->
          <div style="background:var(--md-surface-low);border:1px solid var(--md-outline-variant);border-radius:8px;padding:10px">
            <div style="font-size:13px;font-weight:600;color:var(--md-on-surface)">${lead.name || 'New Lead'}</div>
            <div class="text-muted" style="font-size:11px;margin-top:1px">${lead.course || '—'} · Age ${lead.age || '—'}</div>
            ${lead.course ? `<div style="font-size:10px;color:var(--md-success);margin-top:4px">✓ Auto-highlighting ${lead.course}</div>` : ''}
          </div>

          <!-- Appointment type -->
          <div>
            <div class="text-muted" style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;margin-bottom:7px">Appointment Type</div>
            <div style="display:flex;gap:6px">
              <button id="appt-test-btn"  class="btn btn-primary btn-sm"   style="flex:1" onclick="setSchedType('test',this)">${UI.icon('science','sm')} Test</button>
              <button id="appt-trial-btn" class="btn btn-secondary btn-sm" style="flex:1" onclick="setSchedType('trial',this)">${UI.icon('school','sm')} Trial</button>
            </div>
          </div>

          <!-- Notes (collapsible) -->
          <div>
            <div onclick="toggleSchedNotes(this)"
                 style="display:flex;justify-content:space-between;align-items:center;cursor:pointer;
                        padding:4px 0;border-top:1px solid var(--md-outline-variant)">
              <span class="text-muted" style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase">Notes to Parent</span>
              <span id="sched-notes-icon" class="text-muted" style="font-size:10px">▼</span>
            </div>
            <div id="sched-notes-wrap" style="display:none;margin-top:6px">
              <textarea id="sched-notes" class="settings-input" rows="3"
                placeholder="e.g. Please arrive 10 min early…"
                style="resize:none;font-size:12px"></textarea>
            </div>
          </div>

          <!-- Legend -->
          <div style="margin-top:auto;padding:10px 0 14px">
            <div class="text-muted" style="font-size:10px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;margin-bottom:8px">Legend</div>
            <div class="text-muted" style="font-size:11px;display:flex;flex-direction:column;gap:5px">
              <div style="display:flex;align-items:center;gap:7px">
                <div style="width:12px;height:12px;background:var(--md-primary-container);border:2px solid var(--md-primary);border-radius:3px;flex-shrink:0"></div>Selected
              </div>
              <div style="display:flex;align-items:center;gap:7px">
                <div style="width:12px;height:12px;background:var(--md-success-container);border:2px solid var(--md-success);border-radius:3px;flex-shrink:0"></div>Compatible
              </div>
              <div style="display:flex;align-items:center;gap:7px">
                <div style="width:12px;height:12px;background:var(--md-primary-container);border:1px solid var(--md-primary);border-radius:3px;flex-shrink:0"></div>Existing class
              </div>
              <div style="display:flex;align-items:center;gap:7px">
                <div style="width:12px;height:12px;background:var(--md-surface-low);border:1px dashed var(--md-outline-variant);border-radius:3px;flex-shrink:0"></div>Empty (＋ new)
              </div>
            </div>
          </div>

        </div>
      </div>

      <!-- ══ RIGHT PANEL: Calendar ════════════════════════ -->
      <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">

        <!-- Nav bar: collapse · ← date → · Today · [Day][Week] -->
        <div style="padding:8px 14px;border-bottom:1px solid var(--md-outline-variant);
                    display:flex;align-items:center;gap:6px;flex-shrink:0">

          <!-- Collapse toggle -->
          <button onclick="toggleSchedPanel()" title="Toggle panel" id="sched-panel-toggle"
                  style="width:26px;height:26px;border:1px solid var(--md-outline-variant);border-radius:5px;
                         background:var(--md-surface-low);font-size:11px;cursor:pointer;flex-shrink:0;
                         display:flex;align-items:center;justify-content:center;padding:0">◀</button>

          <!-- Date / week navigation -->
          <div style="display:flex;align-items:center;gap:3px">
            <button onclick="schedNav(-1)"
                    style="width:26px;height:26px;border:1px solid var(--md-outline-variant);border-radius:5px;
                           background:var(--md-surface-low);font-size:13px;cursor:pointer;
                           display:flex;align-items:center;justify-content:center;padding:0">←</button>
            <span id="sched-nav-label"
                  style="font-size:13px;font-weight:600;color:var(--md-on-surface);
                         min-width:170px;text-align:center;white-space:nowrap">
              ${dateLabel(TODAY)}
            </span>
            <button onclick="schedNav(1)"
                    style="width:26px;height:26px;border:1px solid var(--md-outline-variant);border-radius:5px;
                           background:var(--md-surface-low);font-size:13px;cursor:pointer;
                           display:flex;align-items:center;justify-content:center;padding:0">→</button>
          </div>

          <!-- Today shortcut -->
          <button onclick="schedGoToday()"
                  style="height:26px;padding:0 9px;border:1px solid var(--md-outline-variant);border-radius:5px;
                         background:var(--md-surface-low);font-size:11px;cursor:pointer;color:var(--md-on-surface-variant);
                         white-space:nowrap">Today</button>

          <!-- View tabs -->
          <div style="margin-left:auto;display:flex;gap:4px">
            <button id="sched-tab-day"  class="btn btn-primary btn-sm"   onclick="setSchedView('day')">Day</button>
            <button id="sched-tab-week" class="btn btn-secondary btn-sm" onclick="setSchedView('week')">Week</button>
          </div>
        </div>

        <!-- Context hint bar -->
        <div id="sched-hint"
             style="padding:5px 14px;background:var(--md-surface-low);border-bottom:1px solid var(--md-surface-mid);
                    font-size:10px;flex-shrink:0" class="text-muted">
          ${UI.icon('touch_app','sm')} Day view — Click <strong>＋</strong> on an empty slot to <strong>create a new class</strong>
        </div>

        <!-- Selected slot banner (hidden until selection) -->
        <div id="sched-sel-bar"
             style="display:none;background:var(--md-primary-container);border-bottom:1px solid var(--md-primary);
                    padding:8px 14px;flex-shrink:0">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
            <div id="sched-sel-info" style="font-size:12px;color:var(--md-on-surface);display:flex;gap:14px;flex-wrap:wrap"></div>
            <button onclick="clearSchedSlot()"
                    class="text-muted" style="font-size:11px;background:none;border:none;cursor:pointer">✕ Clear</button>
          </div>
        </div>

        <!-- New class form bar (day view, empty slot picked) -->
        <div id="sched-new-form"
             style="display:none;background:var(--md-surface-low);border-bottom:1px solid var(--md-outline-variant);
                    padding:8px 14px;flex-shrink:0">
          <div class="text-muted" style="font-size:10px;font-weight:700;letter-spacing:.8px;
                      text-transform:uppercase;margin-bottom:7px">New Class Details</div>
          <div style="display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap">
            <div>
              <label class="text-muted" style="font-size:11px;display:block;margin-bottom:3px">Room</label>
              <select class="settings-input" id="sched-room" style="width:auto">${roomOpts}</select>
            </div>
            <div>
              <label class="text-muted" style="font-size:11px;display:block;margin-bottom:3px">Branch</label>
              <select class="settings-input" id="sched-branch" style="width:auto">${branchOpts}</select>
            </div>
          </div>
        </div>

        <!-- Calendar grid -->
        <div id="sched-cal-container" style="flex:1;overflow:auto;padding:8px"></div>

      </div>
    </div>`;
  }

  /* ── PANEL TOGGLE ─────────────────────────────────────── */
  window.toggleSchedPanel = function () {
    panelCollapsed = !panelCollapsed;
    const panel  = document.getElementById('sched-panel');
    const toggle = document.getElementById('sched-panel-toggle');
    if (!panel) return;
    panel.style.width  = panelCollapsed ? '0' : '230px';
    panel.style.border = panelCollapsed ? 'none' : '';
    if (toggle) toggle.textContent = panelCollapsed ? '▶' : '◀';
    setTimeout(renderSchedGrid, 220);
  };

  /* ── NOTES TOGGLE ─────────────────────────────────────── */
  window.toggleSchedNotes = function () {
    const wrap = document.getElementById('sched-notes-wrap');
    const icon = document.getElementById('sched-notes-icon');
    if (!wrap) return;
    const open = wrap.style.display === 'none';
    wrap.style.display = open ? '' : 'none';
    if (icon) icon.textContent = open ? '▲' : '▼';
  };

  /* ── NAVIGATION ───────────────────────────────────────── */
  window.schedNav = function (dir) {
    if (viewMode === 'day') {
      const d = new Date(selectedDate);
      d.setDate(d.getDate() + dir);
      selectedDate = d.toISOString().split('T')[0];
    } else {
      weekOffset += dir;
    }
    _updateNavLabel();
    renderSchedGrid();
  };

  window.schedGoToday = function () {
    selectedDate = TODAY;
    weekOffset   = 0;
    _updateNavLabel();
    renderSchedGrid();
  };

  window.setSchedView = function (mode) {
    if (viewMode === mode) return;
    viewMode = mode;

    if (mode === 'week') {
      /* Sync weekOffset so the shown week contains selectedDate */
      const selMon = _mondayOf(selectedDate);
      const todMon = _mondayOf(TODAY);
      weekOffset   = Math.round((selMon - todMon) / (7 * 24 * 60 * 60 * 1000));
    } else {
      /* Switching to day: land on Monday of the current week view */
      selectedDate = generateWeekHeaders(weekOffset)[0].date;
    }

    const dayBtn  = document.getElementById('sched-tab-day');
    const weekBtn = document.getElementById('sched-tab-week');
    if (dayBtn)  dayBtn.className  = mode === 'day'  ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';
    if (weekBtn) weekBtn.className = mode === 'week' ? 'btn btn-primary btn-sm' : 'btn btn-secondary btn-sm';

    const hint = document.getElementById('sched-hint');
    if (hint) {
      hint.innerHTML = mode === 'day'
        ? `${UI.icon('touch_app','sm')} Day view — Click <strong>＋</strong> on an empty slot to <strong>create a new class</strong>`
        : `${UI.icon('touch_app','sm')} Week view — Click an <strong>existing class</strong> to join it`;
    }

    _updateNavLabel();
    renderSchedGrid();
  };

  function _updateNavLabel() {
    const lbl = document.getElementById('sched-nav-label');
    if (lbl) lbl.textContent = _navLabel();
  }

  /* ── RENDER CALENDAR ──────────────────────────────────── */
  window.renderSchedGrid = function () {
    const el = document.getElementById('sched-cal-container');
    if (!el) return;

    const lead   = DB.leads.find(l => l.id === currentLeadId) || {};
    const hlSubj = lead.course || '';

    if (viewMode === 'day') {
      CalendarWidget.renderDay(el, selectedDate, {
        selectable:      true,
        selectedSlot:    selectedSlot,
        onClickSession:  _pickExisting,
        onClickEmptyDay: _pickEmptyDay,
      });
    } else {
      CalendarWidget.renderWeek(el, {
        dayHeaders:       generateWeekHeaders(weekOffset),
        selectable:       false,        /* week view = join only, no new class */
        highlightSubject: hlSubj,
        selectedSlot:     selectedSlot,
        onClickSession:   _pickExisting,
      });
    }
  };

  /* ── PICK EXISTING SESSION (both views) ───────────────── */
  function _pickExisting(sessionId, slotId, col) {
    const sess = DB.sessions.find(s => s.id === sessionId);
    if (!sess) return;

    selectedSlot = { sessionId, slotId, col, isNew: false, date: sess.date };

    const sh     = CONST.SLOT_HOURS[slotId] || {};
    const dayLbl = sess.date ? dateLabel(sess.date)
                 : (generateWeekHeaders(weekOffset)[col - 1] || {}).label || '';

    _showSelBar([
      `${UI.icon('event','sm')} <strong>${dayLbl}</strong>`,
      `${UI.icon('schedule','sm')} ${sh.s || '—'}–${sh.e || '—'}`,
      `${UI.icon('menu_book','sm')} ${Utils.subjectLabel(sess)}`,
      `${UI.icon('person','sm')} ${sess.teacher}`,
      `${UI.icon('meeting_room','sm')} ${sess.room}`,
      `<span style="color:var(--md-success);font-weight:600">${UI.icon('check_circle','sm')} Join this class</span>`,
    ]);
    document.getElementById('sched-new-form').style.display = 'none';
    document.getElementById('sched-confirm-btn').disabled   = false;
    renderSchedGrid();
  }

  /* ── PICK EMPTY SLOT — Day view only ─────────────────── */
  function _pickEmptyDay(slotId, date, teacher) {
    selectedSlot = {
      sessionId: null,
      slotId,
      col:     _dateToCol(date),
      isNew:   true,
      date,
      teacher,
    };

    const sh   = CONST.SLOT_HOURS[slotId] || {};
    const lead = DB.leads.find(l => l.id === currentLeadId) || {};

    _showSelBar([
      `${UI.icon('event','sm')} <strong>${dateLabel(date)}</strong>`,
      `${UI.icon('schedule','sm')} ${sh.s || '—'}–${sh.e || '—'}`,
      `${UI.icon('person','sm')} ${teacher}`,
      `${UI.icon('menu_book','sm')} ${lead.course || '—'}`,
      `<span style="color:var(--md-primary);font-weight:600">${UI.icon('add_circle','sm')} New class will be created</span>`,
    ]);
    document.getElementById('sched-new-form').style.display = '';
    document.getElementById('sched-confirm-btn').disabled   = false;
    renderSchedGrid();
  }

  function _dateToCol(dateStr) {
    const dow = new Date(dateStr).getDay();  // 0=Sun
    return dow === 0 ? 7 : dow;              // 1=Mon … 7=Sun
  }

  function _showSelBar(parts) {
    const bar  = document.getElementById('sched-sel-bar');
    const info = document.getElementById('sched-sel-info');
    if (!bar || !info) return;
    bar.style.display = '';
    info.innerHTML    = parts.map(p => `<span>${p}</span>`).join('');
  }

  /* ── CLEAR SELECTION ──────────────────────────────────── */
  window.clearSchedSlot = function () {
    selectedSlot = null;
    document.getElementById('sched-sel-bar').style.display  = 'none';
    document.getElementById('sched-new-form').style.display = 'none';
    document.getElementById('sched-confirm-btn').disabled   = true;
    renderSchedGrid();
  };

  /* ── SET APPOINTMENT TYPE ─────────────────────────────── */
  window.setSchedType = function (type, btn) {
    apptType = type;
    document.getElementById('appt-test-btn') .className = 'btn btn-secondary btn-sm';
    document.getElementById('appt-trial-btn').className = 'btn btn-secondary btn-sm';
    btn.className = 'btn btn-primary btn-sm';
  };

  /* ── CONFIRM & SEND TO CHAT ───────────────────────────── */
  window.confirmAppt = function () {
    if (!selectedSlot) return;
    const lead = DB.leads.find(l => l.id === currentLeadId);
    if (!lead) return;

    const sh        = CONST.SLOT_HOURS[selectedSlot.slotId] || {};
    const notes     = (document.getElementById('sched-notes')?.value || '').trim();
    const subj      = lead.course || 'Class';
    const typeLabel = apptType === 'test' ? 'Test Session' : 'Trial Class';

    let sessSubject = subj;
    let sessTeacher = selectedSlot.teacher || CONST.TEACHERS[0];
    let sessRoom    = Utils.roomsFor(lead?.branch || 'Sukhumvit')[0] || 'Room A';
    let sessDate    = selectedSlot.date || '';
    let dayLbl      = sessDate ? dateLabel(sessDate) : '';

    if (!selectedSlot.isNew) {
      /* Join existing session */
      const sess = DB.sessions.find(s => s.id === selectedSlot.sessionId);
      if (sess) {
        if (!sess.studentNames.includes(lead.name)) sess.studentNames.push(lead.name);
        sessSubject = sess.subject;
        sessTeacher = sess.teacher;
        sessRoom    = sess.room;
        sessDate    = sess.date || sessDate;
        dayLbl      = sessDate ? dateLabel(sessDate) : dayLbl;
      }
    } else {
      /* Create new session */
      sessRoom     = document.getElementById('sched-room')?.value   || sessRoom;
      const branch = document.getElementById('sched-branch')?.value || 'Sukhumvit';
      DB.sessions.push({
        id: 'sess-' + Date.now(), subject: subj, grade: '',
        teacher: sessTeacher, room: sessRoom, branch,
        color: '', slotId: selectedSlot.slotId, col: selectedSlot.col,
        date: sessDate, studentNames: [lead.name],
        state: 'upcoming', sessionType: apptType,
        attendance: {}, summaries: {},
      });
    }

    lead.stage     = apptType;
    lead.schedDate = `${dayLbl} ${sh.s || ''}–${sh.e || ''}`.trim();

    const lines = [
      `${UI.icon('event_available','sm')} <strong>Appointment Scheduled</strong>`,
      `<strong>${typeLabel}</strong> for ${lead.name}`,
      `${UI.icon('menu_book','sm')} Subject: ${sessSubject}`,
      `${UI.icon('person','sm')} Teacher: ${sessTeacher}`,
      `${UI.icon('event','sm')} ${dayLbl || '—'} &nbsp; ${UI.icon('schedule','sm')} ${sh.s || '—'}–${sh.e || '—'}`,
      `${UI.icon('meeting_room','sm')} Room: ${sessRoom}`,
      notes ? `<br>${UI.icon('chat','sm')} ${notes}` : '',
      `<br><em style="color:var(--md-on-surface-variant);font-size:11px">Please reply to confirm, or contact us to reschedule.</em>`,
    ].filter(Boolean).join('<br>');

    _pushToInbox(lead, lines, typeLabel);
    if (typeof window._refreshPipeline === 'function') window._refreshPipeline();

    Modal.close('modal-schedule');
    Modal.close('modal-lead');
    showToast(`${typeLabel} scheduled & sent to ${lead.name}'s chat ✓`, 'success');
  };

  /* ── PUSH TO INBOX ────────────────────────────────────── */
  function _pushToInbox(lead, html, typeLabel) {
    let conv = DB.conversations.find(c =>
      c.name    === lead.name ||
      c.student === lead.name ||
      (lead.name && c.name.toLowerCase().includes(lead.name.split(' ')[0].toLowerCase()))
    );
    if (!conv) {
      conv = {
        id: 'conv-' + lead.id, name: lead.name, student: lead.name,
        channel: 'LINE', branch: 'Sukhumvit', assignee: lead.assignee || '',
        preview: `${typeLabel} scheduled`, time: 'Now', unread: false,
      };
      DB.conversations.unshift(conv);
      DB.messages[conv.id] = [];
    }
    (DB.messages[conv.id] = DB.messages[conv.id] || []).push({
      type: 'staff', text: html, time: 'Now',
      sender: lead.assignee || 'Admin Nock',
    });
    conv.preview = `${typeLabel} scheduled`;
    conv.time    = 'Now';
  }

})();
