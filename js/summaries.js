/* ============================================================
   summaries.js — NockERP Summaries Module
   Shows session summaries per student, pending vs sent
   ============================================================ */
(function () {

  /* ── BUILD SUMMARY LIST FROM DB ──────────────────────── */
  function buildSummaries() {
    const rows = [];
    DB.sessions.forEach(s => {
      if (!s.summaries || Object.keys(s.summaries).length === 0) return;
      const sh = CONST.SLOT_HOURS[s.slotId] || {};
      Object.entries(s.summaries).forEach(([name, sum]) => {
        rows.push({
          sessionId: s.id,
          date:      s.date,
          subject:   s.subject,
          teacher:   s.teacher,
          student:   name,
          text:      sum.text || '',
          sent:      sum.sent || false,
          time:      sh.s ? `${sh.s}–${sh.e}` : '—',
          room:      s.room,
          branch:    s.branch,
          state:     s.state,
        });
      });
    });
    rows.sort((a,b) => b.date.localeCompare(a.date));
    return rows;
  }

  /* ── STATE ────────────────────────────────────────────── */
  let allSums  = buildSummaries();
  let fSent    = 'all';  // all | pending | sent
  let fTeacher = '';
  let fSearch  = '';

  /* ── SHELL ────────────────────────────────────────────── */
  document.getElementById('view-summaries').innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Summaries</div>
      <div class="page-sub" id="sum-sub">Loading…</div>
    </div>
    <button class="btn btn-secondary btn-sm" onclick="showView('sessions')">⏱️ Sessions</button>
  </div>

  <!-- KPI -->
  <div id="sum-kpi" class="kpi-grid mb-16" style="grid-template-columns:repeat(3,1fr)"></div>

  <!-- Filter bar -->
  <div class="card mb-16" style="padding:12px 16px">
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
      <input id="sum-search" placeholder="🔍 Student, subject, teacher…"
        style="flex:1;min-width:150px;border:1px solid #e5e7eb;border-radius:7px;
               padding:7px 11px;font-size:12px;outline:none"
        oninput="sumFilter('search',this.value)">
      <div style="display:flex;gap:4px">
        <div class="filter-chip active" onclick="sumFilter('sent','all',this)">All</div>
        <div class="filter-chip" onclick="sumFilter('sent','pending',this)">⏳ Pending</div>
        <div class="filter-chip" onclick="sumFilter('sent','sent',this)">✅ Sent</div>
      </div>
      <select style="border:1px solid #e5e7eb;border-radius:6px;padding:6px 8px;
                     font-size:12px;outline:none;background:#fff"
              onchange="sumFilter('teacher',this.value)">
        <option value="">All Teachers</option>
        ${CONST.TEACHERS.map(t=>`<option value="${t}">${t}</option>`).join('')}
      </select>
    </div>
  </div>

  <!-- Summary cards -->
  <div id="sum-list"></div>`;

  /* ── RENDER KPI ───────────────────────────────────────── */
  function renderKPI() {
    const sent    = allSums.filter(s => s.sent);
    const pending = allSums.filter(s => !s.sent && s.text);
    const empty   = allSums.filter(s => !s.text);

    document.getElementById('sum-kpi').innerHTML = `
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#d1fae5">📨</div>
        <div class="kpi-label">Sent to Parents</div>
        <div class="kpi-value" style="color:#10b981">${sent.length}</div>
        <div class="kpi-change up">Completed summaries</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fef3c7">⏳</div>
        <div class="kpi-label">Ready to Send</div>
        <div class="kpi-value" style="color:${pending.length>0?'#f59e0b':'#10b981'}">${pending.length}</div>
        <div class="kpi-change ${pending.length>0?'down':'up'}">
          ${pending.length>0?'Written but not sent':'All sent ✓'}
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon" style="background:#fee2e2">📝</div>
        <div class="kpi-label">Not Written Yet</div>
        <div class="kpi-value" style="color:${empty.length>0?'#ef4444':'#10b981'}">${empty.length}</div>
        <div class="kpi-change ${empty.length>0?'down':'up'}">
          ${empty.length>0?'Needs teacher input':'All written ✓'}
        </div>
      </div>`;
  }

  /* ── RENDER LIST ──────────────────────────────────────── */
  function renderList() {
    let rows = [...allSums];
    if (fSent === 'pending') rows = rows.filter(r => !r.sent);
    if (fSent === 'sent')    rows = rows.filter(r =>  r.sent);
    if (fTeacher) rows = rows.filter(r => r.teacher.includes(fTeacher));
    if (fSearch) {
      const q = fSearch.toLowerCase();
      rows = rows.filter(r => (r.student+r.subject+r.teacher).toLowerCase().includes(q));
    }

    const sub = document.getElementById('sum-sub');
    if (sub) sub.textContent = `${rows.length} summar${rows.length===1?'y':'ies'}`;

    const container = document.getElementById('sum-list');
    if (!container) return;

    if (rows.length === 0) {
      container.innerHTML = `<div class="card" style="padding:40px;text-align:center;color:#9ca3af">
        <div style="font-size:32px;margin-bottom:8px">📝</div>No summaries match</div>`;
      return;
    }

    container.innerHTML = rows.map(r => {
      const hasText = !!r.text;
      const statusIcon  = r.sent ? '✅' : hasText ? '⏳' : '📝';
      const statusLabel = r.sent ? 'Sent' : hasText ? 'Ready to Send' : 'Not Written';
      const statusCls   = r.sent ? 'badge-green' : hasText ? 'badge-yellow' : 'badge-red';

      return `
      <div class="card mb-16" style="padding:0;overflow:hidden">
        <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;
                    background:#f9fafb;border-bottom:1px solid #f3f4f6">
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600;color:#1a1d23">
              ${r.subject}
              <span class="badge ${statusCls}" style="font-size:9px;margin-left:5px">${statusIcon} ${statusLabel}</span>
            </div>
            <div style="font-size:11px;color:#6b7280;margin-top:2px">
              ${r.date} · ${r.time} · ${r.room} · ${r.teacher.replace(/Kru /g,'Kru ')}
            </div>
          </div>
          <div style="font-size:13px;font-weight:500;color:#374151">
            <span style="cursor:pointer;color:#6366f1"
                  onclick="openProfileModal('${r.student}')">${r.student}</span>
          </div>
        </div>
        <div style="padding:12px 16px">
          ${hasText
            ? `<div style="font-size:13px;color:#374151;line-height:1.6;background:#f9fafb;
                            border-radius:7px;padding:10px 12px;border:1px solid #f3f4f6">${r.text}</div>`
            : `<div style="font-size:12px;color:#9ca3af;font-style:italic;padding:4px 0">
                 No summary written yet</div>`}
        </div>
        ${!r.sent ? `
        <div style="padding:10px 16px;border-top:1px solid #f3f4f6;display:flex;gap:8px;justify-content:flex-end">
          <button class="btn btn-secondary btn-sm"
                  onclick="openClassModal && openClassModal('${r.sessionId}')">✏️ Edit Summary</button>
          ${hasText ? `<button class="btn btn-primary btn-sm"
                  onclick="sendSummary('${r.sessionId}','${r.student}')">📨 Send to Parent</button>` : ''}
        </div>` : ''}
      </div>`;
    }).join('');
  }

  /* ── SEND SUMMARY ─────────────────────────────────────── */
  window.sendSummary = function (sessionId, name) {
    const s = DB.sessions.find(x => x.id === sessionId);
    if (!s || !s.summaries[name]) return;
    s.summaries[name].sent = true;
    allSums = buildSummaries();
    renderKPI();
    renderList();
    showToast(`Summary sent to ${name.split(' ')[0]}'s parent ✓`, 'success');
  };

  /* ── FILTER HANDLER ───────────────────────────────────── */
  window.sumFilter = function (key, val, el) {
    if (key==='sent')    { fSent    = val;
      document.querySelectorAll('#view-summaries .filter-chip').forEach(c=>c.classList.remove('active'));
      if(el) el.classList.add('active'); }
    if (key==='teacher') fTeacher = val;
    if (key==='search')  fSearch  = val;
    renderList();
  };

  /* ── INIT ─────────────────────────────────────────────── */
  renderKPI();
  renderList();

})();
