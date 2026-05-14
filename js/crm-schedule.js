/* ============================================================
   crm-schedule.js — CRM: Schedule Appointment Calendar Modal
   ============================================================ */
(function () {

  /* ── MODULE STATE ─────────────────────────────────────── */
  let currentLeadId = null;
  let selectedSlot  = null;  // { sessionId, slotId, col, isNew }
  let apptType      = 'test'; // 'test' | 'trial'

  const CLASS_SLOTS   = CONST.TIME_SLOTS.filter(s => s.type === 'class');
  const SLOT_HOURS    = CONST.SLOT_HOURS;
  const SUBJECT_COLOR_MAP = {
    'Math G5':'#10b981','Math G6':'#6366f1',
    'Eng Read':'#f59e0b','Science':'#f97316','Thai Lang':'#8b5cf6',
  };

  /* ── OPEN MODAL ───────────────────────────────────────── */
  window.scheduleAppointmentModal = function (leadId) {
    currentLeadId = leadId;
    selectedSlot  = null;
    apptType      = 'test';

    const lead = DB.leads.find(l => l.id === leadId) || {};

    Modal.create('modal-schedule', '📅 Schedule Appointment',
      buildHTML(lead),
      `<button class="btn btn-secondary" onclick="Modal.close('modal-schedule')">Cancel</button>
       <button class="btn btn-primary" id="sched-confirm-btn" disabled onclick="confirmAppt()">📅 Confirm & Send to Chat</button>`,
      'modal-xl');

    renderSchedGrid();
  };

  /* ── LEFT + RIGHT PANEL HTML ──────────────────────────── */
  function buildHTML(lead) {
    const subjectOpts = CONST.SUBJECTS.map(s =>
      `<option value="${s}" ${s === lead.course ? 'selected' : ''}>${s}</option>`
    ).join('');
    const teacherOpts = CONST.TEACHERS.map(t =>
      `<option>${t}</option>`
    ).join('');
    const roomOpts = CONST.ROOMS.map(r =>
      `<option>${r}</option>`
    ).join('');

    return `
    <div style="display:flex;height:530px;margin:-20px -20px -20px;gap:0">

      <!-- ══ LEFT PANEL ══════════════════════════════════ -->
      <div style="width:280px;flex-shrink:0;border-right:1px solid #e5e7eb;padding:16px;overflow-y:auto;display:flex;flex-direction:column;gap:12px">

        <!-- Lead info -->
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:10px">
          <div style="font-size:13px;font-weight:600;color:#1a1d23">${lead.name || 'New Lead'}</div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px">${lead.course || '—'} · Age ${lead.age || '—'}</div>
          ${lead.schedDate ? `<div style="font-size:11px;color:#f59e0b;margin-top:4px">📅 Last: ${lead.schedDate}</div>` : ''}
        </div>

        <!-- Appointment type -->
        <div>
          <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Appointment Type</div>
          <div style="display:flex;gap:6px">
            <button id="appt-test-btn"  class="btn btn-primary btn-sm"   style="flex:1" onclick="setSchedType('test',this)">🎯 Test</button>
            <button id="appt-trial-btn" class="btn btn-secondary btn-sm" style="flex:1" onclick="setSchedType('trial',this)">🎓 Trial</button>
          </div>
        </div>

        <!-- Subject filter -->
        <div>
          <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Subject</div>
          <select class="settings-input" id="sched-subj" onchange="renderSchedGrid()">
            <option value="">— All Subjects —</option>
            ${subjectOpts}
          </select>
        </div>

        <!-- Compat toggle -->
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;color:#374151">
          <input type="checkbox" id="sched-compat-chk" checked onchange="renderSchedGrid()">
          Highlight compatible classes
        </label>

        <!-- Selected slot card -->
        <div id="sched-slot-box" style="display:none;background:#f0f0ff;border:1px solid #c7d2fe;border-radius:8px;padding:12px">
          <div style="font-size:11px;font-weight:600;color:#6366f1;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Selected Slot</div>
          <div id="sched-slot-detail" style="font-size:12px;color:#374151;line-height:2"></div>
        </div>

        <!-- New class form (shown only when empty slot is picked) -->
        <div id="sched-new-form" style="display:none">
          <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">New Class Details</div>
          <div style="display:flex;flex-direction:column;gap:8px">
            <div>
              <label style="font-size:11px;color:#6b7280">Teacher</label>
              <select class="settings-input" id="sched-teacher" style="margin-top:3px">${teacherOpts}</select>
            </div>
            <div>
              <label style="font-size:11px;color:#6b7280">Room</label>
              <select class="settings-input" id="sched-room" style="margin-top:3px">${roomOpts}</select>
            </div>
            <div>
              <label style="font-size:11px;color:#6b7280">Branch</label>
              <select class="settings-input" id="sched-branch" style="margin-top:3px">
                ${CONST.BRANCHES.map(b => `<option>${b}</option>`).join('')}
              </select>
            </div>
          </div>
        </div>

        <!-- Notes to parent -->
        <div>
          <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Message to Parent</div>
          <textarea id="sched-notes" class="settings-input" rows="3"
            placeholder="e.g. Please arrive 10 min early…"
            style="resize:none;font-size:12px"></textarea>
        </div>

        <!-- Legend -->
        <div style="margin-top:auto;padding-top:10px;border-top:1px solid #f3f4f6">
          <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Legend</div>
          <div style="font-size:11px;color:#6b7280;display:flex;flex-direction:column;gap:5px">
            <div style="display:flex;align-items:center;gap:7px">
              <div style="width:14px;height:14px;background:#e0e7ff;border:2px solid #6366f1;border-radius:3px;flex-shrink:0"></div>Selected
            </div>
            <div style="display:flex;align-items:center;gap:7px">
              <div style="width:14px;height:14px;background:#d1fae5;border:2px solid #10b981;border-radius:3px;flex-shrink:0"></div>Compatible class
            </div>
            <div style="display:flex;align-items:center;gap:7px">
              <div style="width:14px;height:14px;background:#dbeafe;border:1px solid #93c5fd;border-radius:3px;flex-shrink:0"></div>Existing class
            </div>
            <div style="display:flex;align-items:center;gap:7px">
              <div style="width:14px;height:14px;background:#f9fafb;border:1px dashed #d1d5db;border-radius:3px;flex-shrink:0"></div>Empty (click to book)
            </div>
          </div>
        </div>

      </div>

      <!-- ══ RIGHT PANEL: Calendar ═══════════════════════ -->
      <div style="flex:1;display:flex;flex-direction:column;overflow:hidden">

        <!-- Calendar title bar -->
        <div style="padding:10px 16px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
          <div style="font-size:13px;font-weight:600;color:#1a1d23">
            Week of 11–17 May 2026
          </div>
          <div style="font-size:11px;color:#9ca3af">
            Click existing class to <strong>join</strong> · Click empty slot to <strong>create new</strong>
          </div>
        </div>

        <!-- Grid -->
        <div style="flex:1;overflow:auto;padding:10px 12px">
          <table id="sched-cal" style="width:100%;border-collapse:collapse;table-layout:fixed;min-width:600px">
            <thead id="sched-cal-head"></thead>
            <tbody id="sched-cal-body"></tbody>
          </table>
        </div>

      </div>
    </div>`;
  }

  /* ── RENDER CALENDAR GRID ─────────────────────────────── */
  window.renderSchedGrid = function () {
    const days     = DB.dayHeaders;
    const sessions = DB.sessions;
    const subj     = (document.getElementById('sched-subj')?.value || '').trim();
    const compat   = document.getElementById('sched-compat-chk')?.checked ?? true;

    /* ── Header row ── */
    const headEl = document.getElementById('sched-cal-head');
    if (!headEl) return;
    headEl.innerHTML = `<tr>
      <th style="width:78px;font-size:11px;color:#9ca3af;font-weight:500;padding:6px 4px;text-align:left;border-right:1px solid #f3f4f6">Time</th>
      ${days.map(d => {
        const todayStyle  = d.isToday   ? 'color:#6366f1;font-weight:700' : 'color:#374151;font-weight:600';
        const holidayTag  = d.isHoliday ? ' <span style="font-size:10px">🔴</span>' : '';
        return `<th style="font-size:12px;${todayStyle};padding:8px 4px;text-align:center;border-left:1px solid #f3f4f6">
          ${d.label}${holidayTag}
        </th>`;
      }).join('')}
    </tr>`;

    /* ── Body rows (one per class slot) ── */
    const bodyEl = document.getElementById('sched-cal-body');
    bodyEl.innerHTML = CLASS_SLOTS.map(slot => {
      const sh        = SLOT_HOURS[slot.id] || {};
      const timeLabel = sh.s ? `${sh.s}<br><span style="color:#9ca3af">–${sh.e}</span>` : `Slot ${slot.id}`;

      const cells = days.map((day, dayIdx) => {
        const sess = sessions.find(s => s.slotId === slot.id && s.col === dayIdx);

        /* ── Existing session block ── */
        if (sess) {
          const isSelected = !selectedSlot?.isNew && selectedSlot?.sessionId === sess.id;
          const isCompat   = compat && subj && sess.subject === subj;
          let bg, bdr;
          if      (isSelected) { bg = '#e0e7ff'; bdr = '2px solid #6366f1'; }
          else if (isCompat)   { bg = '#d1fae5'; bdr = '2px solid #10b981'; }
          else                 { bg = '#dbeafe'; bdr = '1px solid #93c5fd'; }

          return `<td style="padding:3px;vertical-align:top;border-left:1px solid #f3f4f6">
            <div onclick="pickExisting('${sess.id}',${slot.id},${dayIdx})"
                 style="background:${bg};border:${bdr};border-radius:6px;padding:6px;cursor:pointer;min-height:60px;transition:box-shadow .15s"
                 onmouseover="this.style.boxShadow='0 2px 6px rgba(99,102,241,.2)'"
                 onmouseout="this.style.boxShadow=''">
              <div style="font-size:11px;font-weight:700;color:#1a1d23;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${sess.subject}</div>
              <div style="font-size:10px;color:#6b7280;margin-top:1px">${sess.teacher}</div>
              <div style="font-size:10px;color:#9ca3af">${sess.studentNames.length} student${sess.studentNames.length !== 1 ? 's' : ''}</div>
              ${isSelected ? `<div style="font-size:10px;color:#6366f1;font-weight:600;margin-top:2px">✓ Join this</div>` : ''}
              ${isCompat && !isSelected ? `<div style="font-size:10px;color:#10b981;font-weight:600;margin-top:2px">✓ Compatible</div>` : ''}
            </div>
          </td>`;
        }

        /* ── Empty slot ── */
        const isSelEmpty = selectedSlot?.isNew && selectedSlot.slotId === slot.id && selectedSlot.col === dayIdx;
        if (isSelEmpty) {
          return `<td style="padding:3px;vertical-align:top;border-left:1px solid #f3f4f6">
            <div onclick="pickEmpty(${slot.id},${dayIdx})"
                 style="background:#e0e7ff;border:2px solid #6366f1;border-radius:6px;padding:6px;cursor:pointer;min-height:60px;display:flex;align-items:center;justify-content:center">
              <span style="font-size:11px;font-weight:600;color:#6366f1">✓ New class</span>
            </div>
          </td>`;
        }
        return `<td style="padding:3px;vertical-align:top;border-left:1px solid #f3f4f6">
          <div onclick="pickEmpty(${slot.id},${dayIdx})"
               style="background:#f9fafb;border:1px dashed #d1d5db;border-radius:6px;padding:6px;cursor:pointer;min-height:60px;display:flex;align-items:center;justify-content:center;color:#d1d5db;font-size:22px;transition:all .15s"
               onmouseover="this.style.background='#f0f0ff';this.style.borderColor='#a5b4fc';this.style.color='#a5b4fc'"
               onmouseout="this.style.background='#f9fafb';this.style.borderColor='#d1d5db';this.style.color='#d1d5db'">＋</div>
        </td>`;
      }).join('');

      return `<tr style="border-top:1px solid #f3f4f6">
        <td style="font-size:11px;color:#6b7280;padding:6px 4px;text-align:left;vertical-align:middle;border-right:1px solid #f3f4f6;white-space:nowrap">${timeLabel}</td>
        ${cells}
      </tr>`;
    }).join('');
  };

  /* ── PICK EXISTING SESSION ────────────────────────────── */
  window.pickExisting = function (sessionId, slotId, col) {
    selectedSlot = { sessionId, slotId, col, isNew: false };
    const sess = DB.sessions.find(s => s.id === sessionId);
    if (!sess) return;
    const sh  = SLOT_HOURS[slotId] || {};
    const day = DB.dayHeaders[col] || {};

    document.getElementById('sched-slot-box').style.display  = '';
    document.getElementById('sched-new-form').style.display  = 'none';
    document.getElementById('sched-slot-detail').innerHTML = `
      <div>📅 <strong>${day.label || ''}</strong></div>
      <div>⏰ ${sh.s || '—'} – ${sh.e || '—'}</div>
      <div>📚 ${sess.subject}</div>
      <div>👩‍🏫 ${sess.teacher}</div>
      <div>🚪 ${sess.room}</div>
      <div>👥 ${sess.studentNames.length} current student${sess.studentNames.length !== 1 ? 's' : ''}</div>
      <div style="margin-top:6px;color:#10b981;font-weight:600">✓ Student will join this class</div>
    `;
    document.getElementById('sched-confirm-btn').disabled = false;
    renderSchedGrid();
  };

  /* ── PICK EMPTY SLOT ──────────────────────────────────── */
  window.pickEmpty = function (slotId, col) {
    selectedSlot = { sessionId: null, slotId, col, isNew: true };
    const sh   = SLOT_HOURS[slotId] || {};
    const day  = DB.dayHeaders[col] || {};
    const subj = document.getElementById('sched-subj')?.value || '—';

    document.getElementById('sched-slot-box').style.display  = '';
    document.getElementById('sched-new-form').style.display  = '';
    document.getElementById('sched-slot-detail').innerHTML = `
      <div>📅 <strong>${day.label || ''}</strong></div>
      <div>⏰ ${sh.s || '—'} – ${sh.e || '—'}</div>
      <div>📚 ${subj}</div>
      <div style="margin-top:6px;color:#6366f1;font-weight:600">✦ New class will be created</div>
    `;
    document.getElementById('sched-confirm-btn').disabled = false;
    renderSchedGrid();
  };

  /* ── SET APPOINTMENT TYPE ─────────────────────────────── */
  window.setSchedType = function (type, btn) {
    apptType = type;
    document.getElementById('appt-test-btn') .className = 'btn btn-secondary btn-sm';
    document.getElementById('appt-trial-btn').className = 'btn btn-secondary btn-sm';
    btn.className = 'btn btn-primary btn-sm';
  };

  /* ── CONFIRM APPOINTMENT ──────────────────────────────── */
  window.confirmAppt = function () {
    if (!selectedSlot) return;
    const lead = DB.leads.find(l => l.id === currentLeadId);
    if (!lead) return;

    const sh         = SLOT_HOURS[selectedSlot.slotId] || {};
    const day        = DB.dayHeaders[selectedSlot.col]  || {};
    const notes      = (document.getElementById('sched-notes')?.value || '').trim();
    const subj       = document.getElementById('sched-subj')?.value || lead.course || 'Class';
    const typeLabel  = apptType === 'test' ? 'Test Session' : 'Trial Class';

    let sessSubject = subj, sessTeacher = CONST.TEACHERS[0], sessRoom = CONST.ROOMS[0];

    if (!selectedSlot.isNew) {
      /* Join existing session */
      const sess = DB.sessions.find(s => s.id === selectedSlot.sessionId);
      if (sess) {
        if (!sess.studentNames.includes(lead.name)) sess.studentNames.push(lead.name);
        sessSubject = sess.subject;
        sessTeacher = sess.teacher;
        sessRoom    = sess.room;
      }
    } else {
      /* Create new session */
      sessTeacher = document.getElementById('sched-teacher')?.value || CONST.TEACHERS[0];
      sessRoom    = document.getElementById('sched-room')?.value    || CONST.ROOMS[0];
      const branch= document.getElementById('sched-branch')?.value  || 'Sukhumvit';
      DB.sessions.push({
        id:           'sess-' + Date.now(),
        subject:      subj,
        grade:        '',
        teacher:      sessTeacher,
        room:         sessRoom,
        branch,
        color:        '',
        slotId:       selectedSlot.slotId,
        col:          selectedSlot.col,
        date:         day.date || '',
        studentNames: [lead.name],
        state:        'upcoming',
        sessionType:  apptType,
        attendance:   {},
        summaries:    {},
      });
    }

    /* Update lead stage & schedDate */
    lead.stage     = apptType;
    lead.schedDate = `${day.label || ''} ${sh.s || ''}–${sh.e || ''}`.trim();

    /* Build inbox message HTML */
    const lines = [
      `📅 <strong>Appointment Scheduled</strong>`,
      `<strong>${typeLabel}</strong> for ${lead.name}`,
      `📚 Subject: ${sessSubject}`,
      `👩‍🏫 Teacher: ${sessTeacher}`,
      `📅 ${day.label || '—'} &nbsp; ⏰ ${sh.s || '—'}–${sh.e || '—'}`,
      `🚪 Room: ${sessRoom}`,
      notes ? `<br>💬 ${notes}` : '',
      `<br><em style="color:#9ca3af;font-size:11px">Please reply to confirm, or contact us to reschedule.</em>`,
    ].filter(Boolean).join('<br>');

    _pushApptToInbox(lead, lines, typeLabel);

    /* Refresh CRM pipeline */
    if (typeof window._refreshPipeline === 'function') window._refreshPipeline();

    Modal.close('modal-schedule');
    Modal.close('modal-lead');
    showToast(`📅 ${typeLabel} scheduled & sent to ${lead.name}'s chat ✓`, 'success');
  };

  /* ── PUSH MESSAGE TO INBOX ────────────────────────────── */
  function _pushApptToInbox(lead, html, typeLabel) {
    /* Find existing conversation by lead name */
    let conv = DB.conversations.find(c =>
      c.name    === lead.name ||
      c.student === lead.name ||
      (lead.name && c.name.toLowerCase().includes(lead.name.split(' ')[0].toLowerCase()))
    );

    if (!conv) {
      /* Create new conversation thread */
      conv = {
        id:       'conv-' + lead.id,
        name:     lead.name,
        student:  lead.name,
        channel:  'LINE',
        branch:   'Sukhumvit',
        assignee: lead.assignee || '',
        preview:  `📅 ${typeLabel} scheduled`,
        time:     'Now',
        unread:   false,
      };
      DB.conversations.unshift(conv);
      DB.messages[conv.id] = [];
    }

    (DB.messages[conv.id] = DB.messages[conv.id] || []).push({
      type:   'staff',
      text:   html,
      time:   'Now',
      sender: lead.assignee || 'Admin Nock',
    });

    conv.preview = `📅 ${typeLabel} scheduled`;
    conv.time    = 'Now';
  }

})();
