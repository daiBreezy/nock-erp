/* ============================================================
   staff-profile.js — Staff Info Modal (4 tabs)
   Info · Schedule (Teacher only) · Note · Log
   ============================================================ */
(function () {

  const DAYS  = CONST.DAYS_SHORT || ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  /* current month for schedule nav — per staff modal */
  let _schedYear = new Date().getFullYear();
  let _schedMonth = new Date().getMonth(); // 0-based
  let _schedStaffId = '';

  const LOG_META = {
    login:           { icon:'login',          color:'var(--md-on-surface-variant)' },
    student_added:   { icon:'person_add',     color:'var(--md-primary)'            },
    student_removed: { icon:'person_remove',  color:'var(--md-error)'              },
    attendance:      { icon:'fact_check',     color:'var(--md-success)'            },
    summary_written: { icon:'edit_note',      color:'var(--md-warning)'            },
    summary_sent:    { icon:'send',           color:'var(--md-success)'            },
    note_added:      { icon:'sticky_note_2',  color:'var(--clr-on-grammar)'        },
    schedule_change: { icon:'calendar_month', color:'var(--md-warning)'            },
    default:         { icon:'radio_button_unchecked', color:'var(--md-on-surface-variant)' },
  };

  /* ── HELPERS ──────────────────────────────────────────────── */
  function isTeacher(s) {
    return window._staffIsTeacher ? window._staffIsTeacher(s)
      : (s.roleAssignments||s.roles||[s.role]).some(r =>
          (typeof r==='string'?r:r?.role||'').toLowerCase()==='teacher');
  }

  function subjBadges(ids) {
    return (ids||[]).map(id => {
      const s = (DB.subjects||[]).find(x => x.id === id);
      return s ? UI.badge(s.name, s.color||'blue') : '';
    }).filter(Boolean).join(' ');
  }

  /* summary pending check for a session */
  function sessHasPendingSummary(sess) {
    if (sess.state !== 'ended') return false;
    const sums = sess.summaries || {};
    return Object.values(sums).some(v => !v.sent);
  }

  /* ── TAB: INFO ────────────────────────────────────────────── */
  function tabInfo(s) {
    const wl  = isTeacher(s) && window._staffWorkloadInfo ? window._staffWorkloadInfo(s) : null;
    const rbs = window._staffRoleBadges ? window._staffRoleBadges(s) : '';
    const ras = s.roleAssignments || [];

    const avatarEl = s.image
      ? `<img src="${s.image}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;flex-shrink:0">`
      : `<div style="width:48px;height:48px;border-radius:50%;background:var(--md-primary-container);
                     display:flex;align-items:center;justify-content:center;
                     font-size:20px;font-weight:700;color:var(--md-primary);flex-shrink:0">
           ${(s.nick||s.name||'?')[0].toUpperCase()}
         </div>`;

    return `
    <div style="font-size:11px;font-weight:700;color:var(--md-on-surface-variant);
                text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;
                display:flex;justify-content:space-between;align-items:center">
      General Information
      <button class="btn btn-secondary btn-sm" style="font-size:11px"
        onclick="Modal.close('modal-staff-${s.id}');openEditStaffModal('${s.id}')">
        ${UI.icon('edit','sm')}
      </button>
    </div>

    <div style="display:flex;align-items:center;gap:12px;padding:12px;
                background:var(--md-surface-mid);border-radius:10px;margin-bottom:14px">
      ${avatarEl}
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
          <span style="font-size:14px;font-weight:700;color:var(--md-on-surface)">${s.name}</span>
          ${s.defaultBranch ? `<span style="font-size:11px;padding:2px 7px;border-radius:10px;background:var(--md-surface-lowest);color:var(--md-on-surface-variant)">${s.defaultBranch}</span>` : ''}
          ${s.status==='active' ? UI.badge('Active','green') : UI.badge('Inactive','gray')}
          ${s.adminTier==='master' ? UI.badge('Master Admin','purple') : ''}
          ${wl ? UI.badge(wl.label,'green') : ''}
        </div>
        <div style="font-size:11px;color:var(--md-on-surface-variant);margin-top:2px">${s.fullName||''}</div>
      </div>
      ${(s.phones||[]).length ? `<a href="tel:${s.phones[0].number}" style="text-decoration:none">
        <div style="width:36px;height:36px;border-radius:50%;background:var(--md-primary-container);
                    display:flex;align-items:center;justify-content:center;cursor:pointer">
          ${UI.icon('call','sm')}
        </div></a>` : ''}
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px 16px;margin-bottom:14px;font-size:12px">
      ${s.defaultBranch?`<div style="display:flex;align-items:center;gap:6px">${UI.icon('location_on','sm')}<span>${s.defaultBranch}</span></div>`:''}
      ${s.joinDate?`<div style="display:flex;align-items:center;gap:6px">${UI.icon('calendar_today','sm')}<span>${s.joinDate}</span></div>`:''}
      ${s.line?`<div style="display:flex;align-items:center;gap:6px">${UI.icon('chat','sm')}<span>${s.line}</span></div>`:''}
      ${s.email?`<div style="display:flex;align-items:center;gap:6px;color:var(--md-primary)">${UI.icon('mail','sm')}<span>${s.email}</span></div>`:''}
      ${(s.phones||[]).map(p=>`
        <div style="display:flex;align-items:center;gap:6px">
          ${UI.icon('phone','sm')}<span>${p.number}</span>
          <span style="font-size:10px;padding:1px 5px;border-radius:8px;background:var(--md-surface-mid)">${p.label}</span>
          ${p.isDefault?`<span style="font-size:10px;color:var(--md-primary);font-weight:600">default</span>`:''}
        </div>`).join('')}
    </div>

    <div style="font-size:11px;font-weight:700;color:var(--md-on-surface-variant);
                text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;
                display:flex;justify-content:space-between;align-items:center">
      Role
      <button class="btn btn-secondary btn-sm" style="font-size:11px"
        onclick="Modal.close('modal-staff-${s.id}');openEditStaffModal('${s.id}')">
        ${UI.icon('edit','sm')}
      </button>
    </div>

    ${s.adminTier === 'master' ? `
    <div style="font-size:11px;font-weight:700;color:var(--md-on-surface-variant);
                text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;margin-top:4px;
                display:flex;justify-content:space-between;align-items:center">
      ${UI.icon('draw','sm')} Digital Signature
      <button class="btn btn-secondary btn-sm" style="font-size:11px"
        onclick="document.getElementById('sp-sig-inp-${s.id}').click()">
        ${s.signature ? 'Change' : 'Upload'}
      </button>
    </div>
    <div style="padding:12px;border:1.5px dashed var(--md-outline-variant);border-radius:8px;
                margin-bottom:14px;text-align:center;min-height:60px;
                display:flex;align-items:center;justify-content:center">
      ${s.signature
        ? `<img src="${s.signature}" style="max-height:50px;max-width:200px;object-fit:contain">`
        : `<span class="text-muted" style="font-size:12px">${UI.icon('draw','sm')} No signature uploaded</span>`}
    </div>
    <input type="file" id="sp-sig-inp-${s.id}" accept="image/*" style="display:none"
      onchange="spUploadSignature('${s.id}',this)">
    ` : ''}

    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px">
      ${ras.length === 0 ? `<span class="text-muted" style="font-size:12px">No roles assigned</span>` :
        ras.map((ra,i) => {
          const rm  = CONST.ROLE_META[ra.role] || {};
          const allSubjIds = [...new Set(ras.filter(r=>r.role==='teacher').flatMap(r=>r.subjects||[]))];
          return `
          <div style="padding:10px;border-radius:8px;border:1.5px solid var(--md-outline-variant)">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
              <span style="font-size:10px;font-weight:700;color:var(--md-on-surface-variant)">${i+1}</span>
              ${rm.cls ? UI.badge(rm.label||ra.role, rm.cls.replace('badge-','')) : ''}
            </div>
            <div style="font-size:12px;font-weight:600;color:var(--md-on-surface);margin-bottom:4px">${ra.branch}</div>
            <div style="font-size:10px;color:var(--md-on-surface-variant);margin-bottom:${ra.role==='teacher'&&ra.subjects?.length?'6':'0'}px">
              Working Date<br>
              <span style="font-weight:600;color:var(--md-on-surface)">${
                (ra.days||[]).length ? ra.days.map(d=>d.slice(0,2)).join(' · ') : '—'
              }</span>
            </div>
            ${ra.role==='teacher'&&ra.subjects?.length ? `
            <div style="font-size:10px;color:var(--md-on-surface-variant)">
              Subject<br>
              <div style="margin-top:2px;display:flex;flex-wrap:wrap;gap:2px">${subjBadges(ra.subjects)}</div>
            </div>` : ''}
          </div>`;
        }).join('')}
    </div>`;
  }

  /* ── TAB: SCHEDULE ────────────────────────────────────────── */
  function tabSchedule(s) {
    if (!isTeacher(s)) return `
      <div style="padding:24px 0">
        ${UI.emptyState('calendar_month','No schedule','Schedule is only available for Teacher role.')}
      </div>`;

    _schedStaffId = s.id;
    return _renderScheduleContent(s);
  }

  function _renderScheduleContent(s) {
    const year  = _schedYear;
    const month = _schedMonth;
    const monthName = `${MONTHS[month]} ${year}`;

    /* Get all sessions for this teacher in this month */
    const mySessions = (DB.sessions||[]).filter(sess => {
      if (!sess.date) return false;
      const [sy, sm] = sess.date.split('-').map(Number);
      return sy === year && (sm-1) === month && sess.teacher?.includes(s.name);
    });

    /* Group by ISO week (Mon-Sun), then by date */
    function weekKey(dateStr) {
      const d = new Date(dateStr);
      const day = d.getDay() || 7;
      const mon = new Date(d); mon.setDate(d.getDate() - day + 1);
      return mon.toISOString().slice(0,10);
    }

    const weekMap = {};
    mySessions.forEach(sess => {
      const wk = weekKey(sess.date);
      if (!weekMap[wk]) weekMap[wk] = {};
      if (!weekMap[wk][sess.date]) weekMap[wk][sess.date] = [];
      weekMap[wk][sess.date].push(sess);
    });

    const weekKeys = Object.keys(weekMap).sort();

    const wl = window._staffWorkloadInfo ? window._staffWorkloadInfo(s) : null;

    return `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <button onclick="staffSchedNav(-1,'${s.id}')"
        style="width:32px;height:32px;border:1.5px solid var(--md-outline-variant);border-radius:8px;
               background:transparent;cursor:pointer;font-size:16px">&lt;</button>
      <span style="font-size:14px;font-weight:700;color:var(--md-on-surface)">${monthName}</span>
      <button onclick="staffSchedNav(1,'${s.id}')"
        style="width:32px;height:32px;border:1.5px solid var(--md-outline-variant);border-radius:8px;
               background:transparent;cursor:pointer;font-size:16px">&gt;</button>
    </div>

    ${wl ? `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;margin-bottom:12px;
                         border-radius:8px;background:var(--md-surface-mid)">
      ${UI.icon('bar_chart','sm')}
      <span style="font-size:12px;font-weight:600">${wl.actual} / ${wl.max} classes this week</span>
      <span style="margin-left:auto">${UI.badge(wl.label+' '+wl.pct+'%', wl.cls)}</span>
    </div>` : ''}

    ${weekKeys.length === 0
      ? `<div style="padding:24px 0;text-align:center" class="text-muted">No sessions in ${monthName}</div>`
      : weekKeys.map(wk => {
          const weekDates = Object.keys(weekMap[wk]).sort();
          const wkEnd = new Date(wk); wkEnd.setDate(wkEnd.getDate()+6);
          const wkLabel = `${new Date(wk).getDate()} ${MONTHS[new Date(wk).getMonth()]} – ${wkEnd.getDate()} ${MONTHS[wkEnd.getMonth()]}`;
          const totalClasses = weekDates.reduce((a,d)=>a+weekMap[wk][d].length,0);

          return `
          <div style="margin-bottom:14px">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
              <span style="font-size:12px;font-weight:700;color:var(--md-on-surface)">${wkLabel}</span>
              <span class="text-muted" style="font-size:10px">${totalClasses} class${totalClasses!==1?'es':''}</span>
            </div>
            ${weekDates.map(date => {
              const d = new Date(date);
              const dayLabel = DAYS[d.getDay()===0?6:d.getDay()-1]||'';
              const sessions = weekMap[wk][date];
              return `
              <div style="margin-bottom:8px">
                <div style="font-size:11px;font-weight:600;color:var(--md-on-surface-variant);
                            margin-bottom:4px;padding-left:4px">
                  ${dayLabel} ${d.getDate()} ${MONTHS[d.getMonth()]}
                </div>
                ${sessions.map(sess => {
                  const sh      = CONST.SLOT_HOURS[sess.slotId] || {};
                  const pending = sessHasPendingSummary(sess);
                  const COLOR   = { green:'var(--md-success)', yellow:'var(--md-warning)',
                                    orange:'var(--clr-on-science)', blue:'var(--md-primary)',
                                    purple:'var(--clr-on-grammar)', '':'var(--md-primary)' };
                  const strip   = COLOR[sess.color] || COLOR[''];
                  return `
                  <div class="tr-click" onclick="openClassModal && openClassModal('${sess.id}')"
                    style="display:flex;align-items:center;gap:10px;padding:8px 10px;
                           border-radius:8px;border:1.5px solid var(--md-outline-variant);
                           margin-bottom:5px;background:${sess.state==='active'?'var(--md-success-container)':'var(--md-surface-lowest)'}">
                    <div style="width:3px;height:36px;border-radius:2px;background:${strip};flex-shrink:0"></div>
                    <div style="flex:1;min-width:0">
                      <div style="font-size:12px;font-weight:600;color:var(--md-on-surface)">
                        ${sess.subject} ${sess.grade}
                      </div>
                      <div style="font-size:10px;color:var(--md-on-surface-variant)">
                        ${sh.s||'—'}–${sh.e||'—'} · ${sess.room} · ${sess.branch}
                        · ${(sess.studentNames||[]).length} students
                      </div>
                    </div>
                    ${pending ? `<span style="font-size:10px;padding:2px 7px;border-radius:10px;
                      background:var(--md-warning-container);color:var(--md-warning);
                      font-weight:600;white-space:nowrap">Summary pending</span>` : ''}
                    ${UI.icon('chevron_right','sm')}
                  </div>`;
                }).join('')}
              </div>`;
            }).join('')}
          </div>`;
        }).join('')}`;
  }

  function getSpContent(staffId) {
    const modal = document.getElementById(`modal-staff-${staffId}`);
    return (modal ? modal.querySelector('#sp-tab-content') : null)
           || document.getElementById('sp-tab-content');
  }

  window.staffSchedNav = function(dir, staffId) {
    _schedMonth += dir;
    if (_schedMonth > 11) { _schedMonth = 0; _schedYear++; }
    if (_schedMonth < 0)  { _schedMonth = 11; _schedYear--; }
    const s = DB.staff.find(x => x.id === staffId);
    const content = getSpContent(staffId);
    if (s && content) content.innerHTML = _renderScheduleContent(s);
  };

  /* ── TAB: NOTES ───────────────────────────────────────────── */
  function tabNotes(s) {
    const notes = s.notes || [];
    return `
    <div id="sp-notes-list" style="margin-bottom:14px">
      ${notes.length === 0
        ? `<div class="text-muted" style="font-size:12px;padding:8px 0">No notes yet</div>`
        : notes.map(n => `
          <div style="padding:10px 12px;border-radius:8px;margin-bottom:8px;
                      background:${n.type==='teacher'?'var(--md-warning-container)':'var(--md-surface-mid)'}">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px">
              ${UI.icon(n.type==='teacher'?'school':'admin_panel_settings','sm')}
              <span style="font-size:11px;font-weight:600">${n.author||'—'}</span>
              <span class="text-muted" style="font-size:10px;margin-left:auto">${n.date||''}</span>
            </div>
            <div style="font-size:12px;line-height:1.5">${n.text}</div>
          </div>`).join('')}
    </div>
    <div style="padding-top:12px;border-top:1px solid var(--md-outline-variant)">
      <div style="font-size:11px;font-weight:600;color:var(--md-on-surface-variant);
                  text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">Add Note</div>
      <textarea id="sp-note-input"
        style="width:100%;min-height:72px;border:1.5px solid var(--md-outline-variant);border-radius:8px;
               padding:8px 10px;font-size:12px;font-family:inherit;resize:vertical;
               background:var(--md-surface);color:var(--md-on-surface)"
        placeholder="Write a note about this staff member…"></textarea>
      <div style="text-align:right;margin-top:6px">
        <button class="btn btn-primary btn-sm" onclick="saveStaffNote('${s.id}')">
          ${UI.icon('save','sm')} Save Note
        </button>
      </div>
    </div>`;
  }

  /* ── TAB: LOG ─────────────────────────────────────────────── */
  function tabLog(s) {
    const logs = [...(s.logs||[])].reverse();
    if (!logs.length) return `<div style="padding:16px 0">
      ${UI.emptyState('history','No activity logged','Events will appear here as they happen.')}
    </div>`;
    return `<div>
      ${logs.map((e,i) => {
        const meta = LOG_META[e.type] || LOG_META.default;
        return `
        <div style="display:flex;gap:10px;padding:9px 0;
                    ${i<logs.length-1?'border-bottom:1px solid var(--md-outline-variant)':''}">
          <div style="width:28px;height:28px;border-radius:50%;flex-shrink:0;
                      background:var(--md-surface-mid);display:flex;align-items:center;justify-content:center">
            <span class="material-symbols-rounded" style="font-size:14px;color:${meta.color}">${meta.icon}</span>
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;color:var(--md-on-surface);line-height:1.4">${e.text}</div>
            <div style="font-size:10px;color:var(--md-on-surface-variant);margin-top:2px">
              ${e.date} &nbsp;·&nbsp; ${e.by||'—'}
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  /* ── MODAL ────────────────────────────────────────────────── */
  window.openStaffModal = function(id) {
    const s = DB.staff.find(x => x.id === id);
    if (!s) { showToast('Staff not found','warning'); return; }
    _schedYear = new Date().getFullYear();
    _schedMonth = new Date().getMonth();
    _schedStaffId = id;

    const teacher = isTeacher(s);
    const tabs = teacher
      ? ['info','schedule','notes','log']
      : ['info','notes','log'];
    const LABELS = { info:'Info', schedule:'Schedule', notes:'Notes', log:'Log' };
    const ICONS  = { info:'person', schedule:'calendar_month', notes:'sticky_note_2', log:'history' };

    const tabBar = `
    <div style="position:sticky;top:-16px;z-index:10;background:var(--md-surface-lowest);
                margin:-16px -24px 16px;padding:12px 16px 0;
                border-bottom:1px solid var(--md-outline-variant);">
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        ${tabs.map((t,i) => `
          <button id="spi-tab-${id}-${t}" onclick="staffInfoTab('${t}','${id}')"
            style="display:flex;align-items:center;gap:4px;padding:6px 12px;border-radius:20px;
                   font-size:12px;font-weight:600;cursor:pointer;border:1.5px solid;transition:all .12s;
                   ${i===0
                     ? 'background:var(--md-primary);color:#fff;border-color:var(--md-primary)'
                     : 'background:transparent;color:var(--md-on-surface-variant);border-color:var(--md-outline-variant)'}">
            ${UI.icon(ICONS[t],'sm')} ${LABELS[t]}
            ${t==='notes'&&(s.notes||[]).length?`<span style="background:rgba(255,255,255,.2);border-radius:8px;padding:0 4px;font-size:10px">${(s.notes||[]).length}</span>`:''}
            ${t==='log'&&(s.logs||[]).length?`<span style="background:rgba(255,255,255,.2);border-radius:8px;padding:0 4px;font-size:10px">${(s.logs||[]).length}</span>`:''}
          </button>`).join('')}
      </div>
    </div>
    <div id="sp-tab-content">${tabInfo(s)}</div>`;

    Modal.create(`modal-staff-${id}`, `${UI.icon('badge','sm')} Staff Info.`,
      tabBar,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-staff-${id}')">Close</button>
       <button class="btn btn-primary" onclick="Modal.close('modal-staff-${id}');openEditStaffModal('${id}')">
         ${UI.icon('edit','sm')} Edit
       </button>`,
      'modal-lg');
  };

  window.staffInfoTab = function(tab, staffId) {
    const s = DB.staff.find(x => x.id === staffId); if (!s) return;
    const tabs = isTeacher(s) ? ['info','schedule','notes','log'] : ['info','notes','log'];
    tabs.forEach(t => {
      const btn = document.getElementById(`spi-tab-${staffId}-${t}`);
      if (!btn) return;
      const on = t === tab;
      btn.style.background  = on ? 'var(--md-primary)' : 'transparent';
      btn.style.color       = on ? '#fff' : 'var(--md-on-surface-variant)';
      btn.style.borderColor = on ? 'var(--md-primary)' : 'var(--md-outline-variant)';
    });
    const content = getSpContent(staffId);
    if (!content) return;
    if (tab === 'info')     content.innerHTML = tabInfo(s);
    if (tab === 'schedule') content.innerHTML = tabSchedule(s);
    if (tab === 'notes')    content.innerHTML = tabNotes(s);
    if (tab === 'log')      content.innerHTML = tabLog(s);
  };

  window.spUploadSignature = function(id, inp) {
    if (!inp.files?.[0]) return;
    const s = DB.staff.find(x => x.id === id); if (!s) return;
    const reader = new FileReader();
    reader.onload = e => {
      s.signature = e.target.result;
      // Re-render info tab to show the uploaded signature
      const content = getSpContent(id);
      if (content) content.innerHTML = tabInfo(s);
      showToast('Signature saved ✓', 'success');
    };
    reader.readAsDataURL(inp.files[0]);
  };

  window.saveStaffNote = function(id) {
    const s      = DB.staff.find(x => x.id === id);
    const modal  = document.getElementById(`modal-staff-${id}`);
    const inp    = (modal ? modal.querySelector('#sp-note-input') : null) || document.getElementById('sp-note-input');
    const text   = inp?.value?.trim();
    if (!s || !text) { showToast('Write something first','warning'); return; }
    const note = { type:'admin', text, author:'Admin Nock',
      date: new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short'}) };
    (s.notes = s.notes||[]).unshift(note);
    (s.logs  = s.logs ||[]).push({ type:'note_added', text:'Note added by Admin Nock', date:note.date, by:'Admin Nock' });
    const content = getSpContent(id);
    if (content) content.innerHTML = tabNotes(s);
    showToast('Note saved ✓','success');
  };

})();
