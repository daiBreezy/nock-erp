/* ============================================================
   attendance.js — NockERP Attendance Module
   ============================================================ */
(function () {

  /* ── BUILD AGGREGATE RECORDS ──────────────────────────── */
  function buildAttendance() {
    const rows = [];
    DB.students.forEach(s => {
      (s.attendance || []).forEach(a => {
        rows.push({
          studentId: s.id,
          student:   s.name,
          family:    s.family,
          branch:    s.branch,
          course:    a.course,
          date:      a.date,
          status:    a.status,
          deducted:  Utils.shouldDeduct(a.status),
        });
      });
    });
    rows.sort((a,b) => b.date.localeCompare(a.date));
    return rows;
  }

  /* ── STATE ────────────────────────────────────────────── */
  let allAtt   = buildAttendance();
  let fStatus  = 'all';
  let fStudent = '';
  let fSearch  = '';

  /* ── SHELL ────────────────────────────────────────────── */
  document.getElementById('view-attendance').innerHTML = `
  ${UI.pageHeader('Attendance', '<span id="att-sub">Loading…</span> · consumption &amp; history report',
    `<button class="btn btn-primary btn-sm" onclick="showView('sessions')">${UI.icon('how_to_reg','sm')} Take attendance in Sessions</button>`
  )}

  <div id="att-kpi"></div>

  <div class="card mb-16">
    <div class="card-body">
      ${UI.sectionTitle('Class Consumption by Student')}
      <div id="att-consumption" style="display:flex;gap:12px;flex-wrap:wrap"></div>
    </div>
  </div>

  ${UI.filterBar([
    { type:'search', placeholder:'Search student, course…', id:'att-search', oninput:"attFilter('search',this.value)" },
    { label:'All',     active:true,  onclick:"attFilter('status','all',this)"     },
    { label:'Present', active:false, onclick:"attFilter('status','present',this)" },
    { label:'Leave',   active:false, onclick:"attFilter('status','leave',this)"   },
    { label:'Absent',  active:false, onclick:"attFilter('status','absent',this)"  },
    { type:'select', onchange:"attFilter('student',this.value)", options:[
        { value:'', label:'All Students', selected:true },
        ...DB.students.map(s => ({ value:s.name, label:s.name })),
    ]},
  ])}

  <div style="display:flex;align-items:center;gap:8px;margin:4px 2px 10px">
    <span style="font-size:13px;font-weight:600">${UI.icon('history','sm')} Attendance History</span>
    <span class="text-muted" style="font-size:11px">— audit log across all sessions · เช็คชื่อจริงทำที่ Sessions</span>
  </div>

  ${UI.table(
    [
      { label:'Date',     width:'90px'  },
      { label:'Student'               },
      { label:'Course'                },
      { label:'Branch',   width:'100px'},
      { label:'Status',   width:'110px'},
      { label:'Deducted', width:'90px' },
    ],
    null,
    { emptyMsg:'No records yet', tbodyId:'att-tbody' }
  )}`;

  /* ── RENDER KPI ───────────────────────────────────────── */
  function renderKPI() {
    const cnt = { present:0, leave:0, absent:0, reschedule:0 };
    allAtt.forEach(a => { cnt[a.status] = (cnt[a.status]||0) + 1; });
    const total    = allAtt.length;
    const deducted = allAtt.filter(a => a.deducted).length;
    const rate     = total ? Math.round((cnt.present / total) * 100) : 0;

    document.getElementById('att-kpi').innerHTML = UI.kpiGrid([
      { icon:'check_circle',  label:'Present',       value:cnt.present, color:'success',  sub:`${rate}% rate`,         subColor:'up'   },
      { icon:'event_busy',    label:'Leave',         value:cnt.leave,   color:'warning',  sub:'No deduction'                           },
      { icon:'cancel',        label:'Absent',        value:cnt.absent,  color:'error',    sub:'Class deducted',        subColor:'down' },
      { icon:'trending_down', label:'Total Deducted',value:deducted,    color:'tertiary', sub:`of ${total} records`                    },
    ]);
  }

  /* ── RENDER CONSUMPTION ───────────────────────────────── */
  function renderConsumption() {
    const el = document.getElementById('att-consumption');
    if (!el) return;

    el.innerHTML = DB.students.map(s => {
      const totalH = (s.courses||[]).reduce((a,c) => a+c.hours, 0);
      const usedH  = (s.courses||[]).reduce((a,c) => a+c.used,  0);
      const leftH  = (s.courses||[]).reduce((a,c) => a+c.left,  0);
      const pct    = totalH ? Math.round((usedH / totalH) * 100) : 0;
      const colKey = leftH<=1 ? 'error' : leftH<=3 ? 'warning' : 'success';
      const colVar = `var(--md-${colKey})`;
      const sm     = CONST.STUDENT_STATUS[s.status] || {};

      return `
      <div style="flex:1;min-width:150px;background:var(--md-surface-mid);
                  border:1px solid var(--md-outline-variant);border-radius:var(--shape-md);
                  padding:var(--sp-3);cursor:pointer"
           onclick="openProfileModal('${s.id}')">
        <div style="font-size:var(--fs-label-lg);font-weight:600;
                    color:var(--md-on-surface);margin-bottom:var(--sp-1)">${s.name}</div>
        <div class="text-muted" style="font-size:var(--fs-label-sm);margin-bottom:var(--sp-2)">
          ${usedH}h used / ${totalH}h total
        </div>
        ${UI.progress(pct, colKey)}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:var(--sp-2)">
          <span style="font-size:var(--fs-label-sm);font-weight:700;color:${colVar}">${leftH}h left</span>
          ${UI.badge(sm.label||s.status, (sm.cls||'badge-gray').replace('badge-',''))}
        </div>
      </div>`;
    }).join('');
  }

  /* ── RENDER TABLE ─────────────────────────────────────── */
  function renderTable() {
    let rows = [...allAtt];
    if (fStatus  !== 'all') rows = rows.filter(r => r.status  === fStatus);
    if (fStudent)           rows = rows.filter(r => r.student === fStudent);
    if (fSearch) {
      const q = fSearch.toLowerCase();
      rows = rows.filter(r => (r.student+r.course+r.date).toLowerCase().includes(q));
    }

    const sub = document.getElementById('att-sub');
    if (sub) sub.textContent = `${rows.length} record${rows.length!==1?'s':''}`;

    const tbody = document.getElementById('att-tbody');
    if (!tbody) return;

    if (!rows.length) {
      tbody.innerHTML = `<tr><td colspan="6">${UI.emptyState('search_off','No records found')}</td></tr>`;
      return;
    }

    tbody.innerHTML = rows.map(r => {
      const am  = CONST.ATTENDANCE_META[r.status] || {};
      return `<tr>
        <td class="text-muted" style="font-size:var(--fs-label-sm)">${r.date}</td>
        <td>
          <span class="text-primary" style="cursor:pointer;font-weight:500"
                onclick="openProfileModal('${r.studentId||r.student}')">${r.student}</span>
        </td>
        <td style="font-size:var(--fs-label-sm)">${r.course}</td>
        <td class="text-muted" style="font-size:var(--fs-label-sm)">${r.branch}</td>
        <td>${UI.badge(am.label||r.status, (am.cls||'badge-gray').replace('badge-',''))}</td>
        <td>${r.deducted
          ? `<span class="text-error" style="font-size:var(--fs-label-sm);font-weight:500">−1 class</span>`
          : `<span class="text-muted">—</span>`}
        </td>
      </tr>`;
    }).join('');
  }

  /* ── FILTER HANDLER ───────────────────────────────────── */
  window.attFilter = function (key, val, el) {
    if (key==='status') {
      fStatus = val;
      document.querySelectorAll('#view-attendance .filter-chip').forEach(c=>c.classList.remove('active'));
      if (el) el.classList.add('active');
    }
    if (key==='student') fStudent = val;
    if (key==='search')  fSearch  = val;
    renderTable();
  };

  /* ── INIT ─────────────────────────────────────────────── */
  renderKPI();
  renderConsumption();
  renderTable();

})();
