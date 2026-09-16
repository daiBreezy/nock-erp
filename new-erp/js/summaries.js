/* ============================================================
   summaries.js — NockERP Summaries Module
   ============================================================ */
(function () {

  /* ── BUILD SUMMARY LIST ───────────────────────────────── */
  function buildSummaries() {
    const rows = [];
    DB.sessions.forEach(s => {
      if (!s.summaries || !Object.keys(s.summaries).length) return;
      const sh = CONST.SLOT_HOURS[s.slotId] || {};
      Object.entries(s.summaries).forEach(([name, sum]) => {
        rows.push({
          sessionId: s.id,
          date:      s.date,
          subject:   Utils.subjectLabel(s),
          teacher:   s.teacher,
          student:   name,
          text:      sum.text || '',
          sent:      sum.sent || false,
          submitted: sum.submitted || false,
          time:      sh.s ? `${sh.s}–${sh.e}` : '—',
          room:      s.room,
          branch:    s.branch,
        });
      });
    });
    rows.sort((a,b) => b.date.localeCompare(a.date));
    return rows;
  }

  /* ── STATE ────────────────────────────────────────────── */
  let allSums  = buildSummaries();
  let fSent    = 'all';
  let fCourse  = '';
  let fSubject = '';
  let fGrade   = '';
  let fTeacher = '';
  let fSearch  = '';
  let fSort    = 'desc';   // desc = ใหม่→เก่า (default) · asc = เก่า→ใหม่
  let _focusSearch = false;

  /* ── HELPERS ──────────────────────────────────────────── */
  const _WD = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const _MO = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  function dayLabel(dateStr) {
    const [y,m,d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m-1, d);
    const dh = DB.dayHeaders && DB.dayHeaders.find(h => h.date === dateStr);
    const today = dh && dh.isToday ? ' (Today)' : '';
    return `${_WD[dt.getDay()]} ${d} ${_MO[m-1]}${today}`;
  }
  function isBundleCourse(courseId) {
    const c = DB.courses && DB.courses.find(x => x.id === courseId);
    return !!(c && c.courseType === 'bundle');
  }

  /* ── SHELL ────────────────────────────────────────────── */
  document.getElementById('view-summaries').innerHTML = `
  ${UI.pageHeader('Summaries', '<span id="sum-sub">Loading…</span>',
    `<button class="btn btn-secondary btn-sm" onclick="openCourseSummary()">${UI.icon('auto_awesome','sm')} Course Summary</button>
     <button class="btn btn-secondary btn-sm" onclick="showView('sessions')">${UI.icon('schedule','sm')} Sessions</button>`
  )}

  <div class="tabs" style="margin-bottom:16px" id="sum-tabs">
    <div class="tab active" onclick="sumTab('session',this)">${UI.icon('edit_note','sm')} Session Summaries</div>
    <div class="tab"        onclick="sumTab('ces',this)">${UI.icon('workspace_premium','sm')} Course End</div>
  </div>

  <div id="sum-session-tab">
    <div id="sum-kpi"></div>

    <div id="sum-filters"></div>

    <div id="sum-list"></div>
  </div>
  <div id="sum-ces-tab" style="display:none"></div>`;

  /* ── TAB SWITCH ───────────────────────────────────────── */
  window.sumTab = function (tab, el) {
    document.querySelectorAll('#sum-tabs .tab').forEach(t => t.classList.remove('active'));
    if (el) el.classList.add('active');
    document.getElementById('sum-session-tab').style.display = tab==='session' ? '' : 'none';
    document.getElementById('sum-ces-tab').style.display     = tab==='ces'     ? '' : 'none';
    if (tab==='ces' && window.renderCourseEnd) renderCourseEnd();
  };

  /* ── RENDER KPI ───────────────────────────────────────── */
  function renderKPI() {
    const sent     = allSums.filter(s => s.sent).length;
    const approval = allSums.filter(s => !s.sent && s.submitted).length;
    const draft    = allSums.filter(s => !s.sent && !s.submitted && s.text).length;
    const empty    = allSums.filter(s => !s.text).length;

    document.getElementById('sum-kpi').innerHTML = UI.kpiGrid([
      { icon:'send',           label:'Sent to Parents',   value:sent,
        color:'success',  sub:'Approved & delivered',              subColor:'up'                        },
      { icon:'approval',       label:'Awaiting Approval', value:approval,
        color: approval ? 'warning' : 'success',
        sub: approval ? 'Admin/Manager review' : 'Queue clear',    subColor: approval ? 'down' : 'up'   },
      { icon:'pending_actions',label:'Teacher Draft',     value:draft,
        color:'tertiary', sub:'Written, not submitted',            subColor:'up'                        },
      { icon:'edit_note',      label:'Not Written Yet',   value:empty,
        color: empty ? 'error' : 'success',
        sub: empty ? 'Needs teacher input' : 'All written',        subColor: empty ? 'down' : 'up'      },
    ]);
  }

  /* ── RENDER LIST — card grid จัดกลุ่มตาม class session ─────
     กฎ layout: จอกว้าง = grid ไหลซ้าย→ขวา · ไม่มี CTA บนการ์ด
     ทุก action อยู่ใน Class Modal (คลิกการ์ดเพื่อเข้าไปดูก่อน) */
  function buildGroups() {
    return DB.sessions
      .filter(s => s.summaries && Object.keys(s.summaries).length)
      .map(s => {
        const sh = CONST.SLOT_HOURS[s.slotId] || {};
        const students = Object.entries(s.summaries).map(([name, sum]) => ({
          name, text: sum.text||'', submitted: sum.submitted||false, sent: sum.sent||false }));
        const cid = s.courseId || s.bundleId;
        return {
          id: s.id, subject: Utils.subjectLabel(s), date: s.date,
          subjectBase: s.subject, grade: s.grade, courseId: cid,
          isBundle: isBundleCourse(cid),
          time: sh.s ? `${sh.s}–${sh.e}` : '—', room: s.room,
          teacher: s.teacher, branch: s.branch, students,
          sent:     students.filter(x => x.sent).length,
          awaiting: students.filter(x => !x.sent && x.submitted).length,
          draft:    students.filter(x => !x.sent && !x.submitted && x.text).length,
          empty:    students.filter(x => !x.sent && !x.text).length,
        };
      })
      .sort((a,b) => b.date.localeCompare(a.date));
  }

  /* apply ทุก filter ยกเว้น status (ใช้คำนวณ chip counts ด้วย) — AND กันทั้งหมด */
  function applyBase(groups) {
    if (fCourse)  groups = groups.filter(g => g.courseId === fCourse);
    if (fSubject) groups = groups.filter(g => g.subjectBase === fSubject);
    if (fGrade)   groups = groups.filter(g => g.grade === fGrade);
    if (fTeacher) groups = groups.filter(g => g.teacher.includes(fTeacher));
    if (fSearch) {
      const q = fSearch.toLowerCase();
      groups = groups.filter(g =>
        (g.subject + g.teacher + g.students.map(x=>x.name).join(' ')).toLowerCase().includes(q));
    }
    return groups;
  }

  /* ── RENDER FILTER BAR (rebuild ทุกครั้งเพื่ออัปเดต chip counts) ── */
  function renderFilters() {
    const base = applyBase(buildGroups());
    const c = {
      awaiting: base.reduce((n,g) => n + g.awaiting, 0),
      draft:    base.reduce((n,g) => n + g.draft, 0),
      empty:    base.reduce((n,g) => n + g.empty, 0),
      sent:     base.reduce((n,g) => n + g.sent, 0),
    };
    const courseOpts  = (DB.courses || []).map(co => ({ value:co.id, label:co.name, selected:co.id===fCourse }));
    const subjectOpts = (Utils.subjectsFor() || []).map(s => ({ value:s, label:s, selected:s===fSubject }));
    const gradeOpts   = (CONST.GRADES || []).map(g => ({ value:g, label:g, selected:g===fGrade }));
    const teacherOpts = (CONST.TEACHERS || []).map(t => ({ value:t, label:t, selected:t===fTeacher }));

    const el = document.getElementById('sum-filters');
    if (!el) return;
    el.innerHTML = UI.filterBar([
      { type:'search', placeholder:'Search student, subject, teacher…', id:'sum-search', value:fSearch, oninput:"sumFilter('search',this.value)" },
      { type:'select', onchange:"sumFilter('course',this.value)",  options:[{ value:'', label:'All Courses',  selected:!fCourse  }, ...courseOpts ] },
      { type:'select', onchange:"sumFilter('subject',this.value)", options:[{ value:'', label:'All Subjects', selected:!fSubject }, ...subjectOpts] },
      { type:'select', onchange:"sumFilter('grade',this.value)",   options:[{ value:'', label:'All Grades',   selected:!fGrade   }, ...gradeOpts  ] },
      { type:'select', onchange:"sumFilter('teacher',this.value)", options:[{ value:'', label:'All Teachers', selected:!fTeacher }, ...teacherOpts] },
      { label:'All',                          active:fSent==='all',      onclick:"sumFilter('sent','all',this)"      },
      { label:`Awaiting (${c.awaiting})`,     active:fSent==='approval', onclick:"sumFilter('sent','approval',this)" },
      { label:`Draft (${c.draft})`,           active:fSent==='pending',  onclick:"sumFilter('sent','pending',this)"  },
      { label:`Not Written (${c.empty})`,     active:fSent==='empty',    onclick:"sumFilter('sent','empty',this)"    },
      { label:`Sent (${c.sent})`,             active:fSent==='sent',     onclick:"sumFilter('sent','sent',this)"     },
      { type:'select', onchange:"sumFilter('sort',this.value)", options:[
          { value:'desc', label:'ใหม่→เก่า', selected:fSort==='desc' },
          { value:'asc',  label:'เก่า→ใหม่', selected:fSort==='asc'  },
      ]},
    ]);
    const inp = document.getElementById('sum-search');
    if (inp) {
      inp.value = fSearch;
      if (_focusSearch) { inp.focus(); inp.value = ''; inp.value = fSearch; }  // caret → end
    }
    _focusSearch = false;
  }

  function cardHTML(g) {
    const badges = [
      g.awaiting ? UI.badge(`${g.awaiting} awaiting`, 'yellow') : '',
      g.draft    ? UI.badge(`${g.draft} draft`, 'blue') : '',
      g.empty    ? UI.badge(`${g.empty} not written`, 'red') : '',
      g.sent     ? UI.badge(`${g.sent} sent`, 'green') : '',
    ].filter(Boolean).join(' ');
    const names = g.students.map(x => x.name.split(' ')[0]).join(', ');
    const bundleTag = g.isBundle ? UI.badge('Bundle', 'purple') : '';
    return `
    <div class="card" onclick="openClassModal('${g.id}')"
      style="cursor:pointer;padding:14px 16px;transition:border-color .12s"
      onmouseover="this.style.borderColor='var(--md-primary)'"
      onmouseout="this.style.borderColor=''">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="font-size:14px;font-weight:600;flex:1">${g.subject}</span>
        ${bundleTag}
        <span class="text-muted" style="font-size:16px;line-height:1">›</span>
      </div>
      <div class="text-muted" style="font-size:11px;margin-bottom:10px">
        ${g.time} · ${g.teacher}
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:8px">${badges}</div>
      <div class="text-muted" style="font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${UI.icon('group','sm')} ${names}
      </div>
    </div>`;
  }

  function renderList() {
    renderFilters();
    let groups = applyBase(buildGroups());
    if (fSent === 'approval') groups = groups.filter(g => g.awaiting > 0);
    if (fSent === 'pending')  groups = groups.filter(g => g.draft > 0);
    if (fSent === 'empty')    groups = groups.filter(g => g.empty > 0);
    if (fSent === 'sent')     groups = groups.filter(g => g.sent === g.students.length);

    groups.sort((a,b) => fSort==='asc' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date));

    const sub = document.getElementById('sum-sub');
    if (sub) sub.textContent = `${groups.length} class${groups.length===1?'':'es'} · ${allSums.length} summaries`;

    const container = document.getElementById('sum-list');
    if (!container) return;
    if (!groups.length) {
      container.innerHTML = UI.card(UI.emptyState('edit_note', 'No classes match', 'Try adjusting your filters'));
      return;
    }

    /* จัดกลุ่มตามวัน — มีหัวคั่นต่อวัน */
    const byDay = [];
    groups.forEach(g => {
      let d = byDay.find(x => x.date === g.date);
      if (!d) { d = { date:g.date, items:[] }; byDay.push(d); }
      d.items.push(g);
    });

    container.innerHTML = byDay.map(d => `
      <div style="display:flex;align-items:center;gap:8px;margin:18px 0 10px">
        <span style="font-size:12px;font-weight:600;color:var(--md-on-surface-variant)">${dayLabel(d.date)}</span>
        <span class="text-muted" style="font-size:11px">· ${d.items.length} class${d.items.length===1?'':'es'}</span>
        <span style="flex:1;height:1px;background:var(--md-outline-variant)"></span>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:12px">
        ${d.items.map(cardHTML).join('')}
      </div>`).join('');
  }

  /* refresh จากภายนอก (Class Modal approve แล้วเรียกกลับ) */
  window.refreshSummaries = function () {
    allSums = buildSummaries();
    renderKPI(); renderList();
  };

  /* ── APPROVE / REJECT (Admin ทุกคน + Manager) ─────────── */
  window.approveSummary = function (sessionId, name) {
    const s = DB.sessions.find(x => x.id === sessionId);
    if (!s || !s.summaries[name]) return;
    s.summaries[name].sent = true;
    s.summaries[name].approvedBy = 'Admin Nock';   // prototype current user
    allSums = buildSummaries();
    renderKPI(); renderList();
    showToast(`Approved & sent to ${name.split(' ')[0]}'s parent ✓`, 'success');
  };
  window.rejectSummary = function (sessionId, name) {
    const s = DB.sessions.find(x => x.id === sessionId);
    if (!s || !s.summaries[name]) return;
    s.summaries[name].submitted = false;           // กลับไปเป็น draft ของครู
    allSums = buildSummaries();
    renderKPI(); renderList();
    showToast(`Sent back to ${s.teacher} for revision`, 'info');
  };
  window.sendSummary = window.approveSummary;       // legacy alias

  /* ── FILTER HANDLER ───────────────────────────────────── */
  window.sumFilter = function (key, val) {
    if (key==='sent')    fSent    = val;
    if (key==='course')  fCourse  = val;
    if (key==='subject') fSubject = val;
    if (key==='grade')   fGrade   = val;
    if (key==='teacher') fTeacher = val;
    if (key==='search') { fSearch = val; _focusSearch = true; }
    if (key==='sort')    fSort    = val;
    renderList();
  };

  /* ── INIT ─────────────────────────────────────────────── */
  renderKPI();
  renderList();

})();
