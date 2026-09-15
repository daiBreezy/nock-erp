/* ============================================================
   reports.js — NockERP Reports Module
   All charts rendered from DB live data using CSS bar charts
   ============================================================ */
(function () {

  /* ── COMPUTE ALL METRICS ──────────────────────────────── */

  /* Revenue by month from all student invoices */
  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun',
                        'Jul','Aug','Sep','Oct','Nov','Dec'];
  const revenueByMonth = Array(12).fill(0);
  DB.students.forEach(s => (s.invoices||[]).forEach(inv => {
    const m = parseInt((inv.date||'').split('-')[1]) - 1;
    if (m >= 0 && m < 12) revenueByMonth[m] += inv.amount || 0;
  }));

  /* Attendance counts */
  const attCnt = { present:0, leave:0, absent:0, reschedule:0 };
  DB.students.forEach(s => (s.attendance||[]).forEach(a => {
    attCnt[a.status] = (attCnt[a.status]||0) + 1;
  }));
  const attTotal = Object.values(attCnt).reduce((s,v)=>s+v,0);

  /* Student status breakdown */
  const stuStatus = { active:0, renewal:0, pause:0, archived:0 };
  DB.students.forEach(s => { stuStatus[s.status] = (stuStatus[s.status]||0)+1; });

  /* Sessions per subject */
  const subjCount = {};
  DB.sessions.forEach(s => { subjCount[s.subject] = (subjCount[s.subject]||0)+1; });
  const topSubjects = Object.entries(subjCount)
    .sort((a,b)=>b[1]-a[1]).slice(0,6);

  /* Lead stage funnel */
  const stageCnt = {};
  (DB.leads||[]).forEach(l => { stageCnt[l.stage] = (stageCnt[l.stage]||0)+1; });
  const LEAD_ORDER = ['new','contacting','test','trial'];
  const leadFunnel = LEAD_ORDER.map(s => ({ stage:s, count: stageCnt[s]||0 }));

  /* Teachers session load */
  const teachLoad = {};
  DB.sessions.forEach(s => {
    s.teacher.split(',').map(t=>t.trim()).forEach(t => {
      teachLoad[t] = (teachLoad[t]||0)+1;
    });
  });

  /* ── CHART HELPERS ────────────────────────────────────── */
  function barChart(values, labels, color) {
    const max = Math.max(...values, 1);
    return `
    <div class="report-chart">
      ${values.map((v,i) => `
        <div style="flex:1;display:flex;flex-direction:column;align-items:center;
                    gap:2px;height:100%;justify-content:flex-end">
          <div style="font-size:9px;color:#6b7280;font-weight:600">${v>0?v:''}</div>
          <div class="bar ${color}" style="height:${Math.round((v/max)*100)}%;width:100%;
               border-radius:4px 4px 0 0;min-height:${v>0?4:1}px" title="${labels[i]}: ${v}"></div>
        </div>`).join('')}
    </div>
    <div class="bar-labels">${labels.map(l=>`<span>${l}</span>`).join('')}</div>`;
  }

  function statRow(label, value, color, pct) {
    return `
    <div style="margin-bottom:10px">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
        <span style="color:#374151">${label}</span>
        <strong style="color:${color}">${value}</strong>
      </div>
      <div style="background:#f3f4f6;border-radius:4px;height:8px">
        <div style="background:${color};width:${pct}%;height:8px;border-radius:4px;transition:width .4s"></div>
      </div>
    </div>`;
  }

  /* ── ACTIVE TAB STATE ─────────────────────────────────── */
  let activeTab = 'overview';

  /* ── SHELL ────────────────────────────────────────────── */
  document.getElementById('view-reports').innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Reports</div>
      <div class="page-sub">Data from DB · May 2026</div>
    </div>
    <button class="btn btn-secondary btn-sm" onclick="showToast('Export coming soon','info')"><span class="mdi mdi-sm">upload</span> Export</button>
  </div>

  <!-- Tabs -->
  <div class="tabs" style="margin-bottom:16px">
    <div class="tab active"    onclick="reportTab('overview',this)"><span class="mdi mdi-sm">bar_chart</span> Overview</div>
    <div class="tab"           onclick="reportTab('revenue',this)"><span class="mdi mdi-sm">payments</span> Revenue</div>
    <div class="tab"           onclick="reportTab('students',this)"><span class="mdi mdi-sm">school</span> Students</div>
    <div class="tab"           onclick="reportTab('attendance',this)"><span class="mdi mdi-sm">check_circle</span> Attendance</div>
    <div class="tab"           onclick="reportTab('crm',this)"><span class="mdi mdi-sm">person_search</span> CRM</div>
  </div>

  <!-- Tab panels -->
  <div id="rtab-overview"></div>
  <div id="rtab-revenue"    style="display:none"></div>
  <div id="rtab-students"   style="display:none"></div>
  <div id="rtab-attendance" style="display:none"></div>
  <div id="rtab-crm"        style="display:none"></div>`;

  /* ── OVERVIEW TAB ─────────────────────────────────────── */
  function buildOverview() {
    const totalRev   = revenueByMonth.reduce((s,v)=>s+v,0);
    const attRate    = attTotal ? Math.round((attCnt.present/attTotal)*100) : 0;
    const activeStu  = DB.students.filter(s=>['active','renewal'].includes(s.status)).length;
    const totalSess  = DB.sessions.length;

    return `
    <!-- Top KPIs -->
    <div class="kpi-grid mb-16" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi-card">
        <div class="kpi-icon success"><span class="mdi">payments</span></div>
        <div class="kpi-label">Total Revenue</div>
        <div class="kpi-value">฿${totalRev.toLocaleString()}</div>
        <div class="kpi-change up">All invoices paid</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon tertiary"><span class="mdi">school</span></div>
        <div class="kpi-label">Active Students</div>
        <div class="kpi-value">${activeStu}</div>
        <div class="kpi-change up">In system</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon"><span class="mdi">calendar_today</span></div>
        <div class="kpi-label">Total Sessions</div>
        <div class="kpi-value">${totalSess}</div>
        <div class="kpi-change up">This week</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon warning"><span class="mdi">trending_up</span></div>
        <div class="kpi-label">Attendance Rate</div>
        <div class="kpi-value">${attRate}%</div>
        <div class="kpi-change ${attRate>=80?'up':'down'}">
          ${attCnt.present} present of ${attTotal}
        </div>
      </div>
    </div>

    <div class="report-grid">
      <!-- Revenue trend -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="mdi mdi-sm">payments</span> Revenue by Month</div>
        </div>
        <div class="card-body">
          ${barChart(revenueByMonth, MONTH_LABELS, 'green')}
        </div>
      </div>

      <!-- Attendance breakdown -->
      <div class="card">
        <div class="card-header"><div class="card-title"><span class="mdi mdi-sm">check_circle</span> Attendance Breakdown</div></div>
        <div class="card-body">
          ${statRow('Present', attCnt.present, 'var(--md-success)', attTotal?Math.round(attCnt.present/attTotal*100):0)}
          ${statRow('Leave',   attCnt.leave,   'var(--md-warning)', attTotal?Math.round(attCnt.leave/attTotal*100):0)}
          ${statRow('Absent',  attCnt.absent,  'var(--md-error)',   attTotal?Math.round(attCnt.absent/attTotal*100):0)}
          ${attCnt.reschedule>0?statRow('Reschedule', attCnt.reschedule, 'var(--clr-on-grammar)', attTotal?Math.round(attCnt.reschedule/attTotal*100):0):''}
        </div>
      </div>

      <!-- Sessions per subject -->
      <div class="card">
        <div class="card-header"><div class="card-title"><span class="mdi mdi-sm">menu_book</span> Sessions by Subject</div></div>
        <div class="card-body">
          ${barChart(topSubjects.map(s=>s[1]), topSubjects.map(s=>s[0].split(' ').slice(0,2).join(' ')), '')}
        </div>
      </div>

      <!-- Teacher load -->
      <div class="card">
        <div class="card-header"><div class="card-title"><span class="mdi mdi-sm">person</span> Sessions by Teacher</div></div>
        <div class="card-body">
          ${Object.entries(teachLoad).map(([t,n]) => {
            const max = Math.max(...Object.values(teachLoad));
            return statRow(t, `${n} sessions`, 'var(--md-primary)', Math.round(n/max*100));
          }).join('')}
        </div>
      </div>
    </div>`;
  }

  /* ── REVENUE TAB ──────────────────────────────────────── */
  function buildRevenue() {
    const allInvoices = [];
    DB.students.forEach(s => (s.invoices||[]).forEach(inv => {
      allInvoices.push({ ...inv, student:s.name, family:s.family });
    }));
    allInvoices.sort((a,b)=>b.date.localeCompare(a.date));
    const total = allInvoices.reduce((s,i)=>s+i.amount,0);

    return `
    <div class="kpi-grid mb-16" style="grid-template-columns:repeat(3,1fr)">
      <div class="kpi-card">
        <div class="kpi-icon success"><span class="mdi">payments</span></div>
        <div class="kpi-label">Total Revenue</div>
        <div class="kpi-value">฿${total.toLocaleString()}</div>
        <div class="kpi-change up">${allInvoices.length} invoices</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon warning"><span class="mdi">calendar_today</span></div>
        <div class="kpi-label">This Month (May)</div>
        <div class="kpi-value">฿${revenueByMonth[4].toLocaleString()}</div>
        <div class="kpi-change up">Invoices paid</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-icon tertiary"><span class="mdi">bar_chart</span></div>
        <div class="kpi-label">Avg per Invoice</div>
        <div class="kpi-value">฿${allInvoices.length?Math.round(total/allInvoices.length).toLocaleString():0}</div>
        <div class="kpi-change up">Per enrollment</div>
      </div>
    </div>
    <div class="card mb-16">
      <div class="card-header"><div class="card-title"><span class="mdi mdi-sm">payments</span> Revenue by Month (2026)</div></div>
      <div class="card-body">
        ${barChart(revenueByMonth, MONTH_LABELS, 'green')}
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Invoice History</div></div>
      <div class="table-wrap"><table>
        <thead><tr><th>Invoice</th><th>Student</th><th>Family</th><th>Course</th><th>Amount</th><th>Date</th></tr></thead>
        <tbody>
          ${allInvoices.map(inv=>`<tr>
            <td style="font-size:11px;color:var(--md-primary);font-weight:600">${inv.id}</td>
            <td><span style="cursor:pointer;color:var(--md-primary)" onclick="openProfileModal('${inv.student}')">${inv.student}</span></td>
            <td style="font-size:12px;color:#6b7280">${inv.family}</td>
            <td style="font-size:12px">${inv.course}</td>
            <td style="font-weight:600">฿${inv.amount.toLocaleString()}</td>
            <td style="font-size:12px;color:#6b7280">${inv.date}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`;
  }

  /* ── STUDENTS TAB ─────────────────────────────────────── */
  function buildStudents() {
    const STATUS_COLORS = {active:'var(--md-success)',renewal:'var(--md-warning)',pause:'var(--md-on-surface-variant)',archived:'#9ca3af'};
    const total = DB.students.length;

    return `
    <div class="kpi-grid mb-16" style="grid-template-columns:repeat(4,1fr)">
      ${Object.entries(stuStatus).map(([st,n]) => {
        const sm = CONST.STUDENT_STATUS[st] || {};
        return `<div class="kpi-card">
          <div class="kpi-label">${sm.label||st}</div>
          <div class="kpi-value" style="color:${STATUS_COLORS[st]||'#374151'}">${n}</div>
          <div class="kpi-change">of ${total} students</div>
        </div>`;
      }).join('')}
    </div>
    <div class="report-grid">
      <div class="card">
        <div class="card-header"><div class="card-title">Student Status Distribution</div></div>
        <div class="card-body">
          ${Object.entries(stuStatus).map(([st,n]) => {
            const sm = CONST.STUDENT_STATUS[st] || {};
            return statRow(sm.label||st, n, STATUS_COLORS[st]||'#374151', total?Math.round(n/total*100):0);
          }).join('')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Class Consumption</div></div>
        <div class="card-body">
          ${DB.students.map(s => {
            const totalH = (s.courses||[]).reduce((a,c)=>a+c.hours,0);
            const usedH  = (s.courses||[]).reduce((a,c)=>a+c.used, 0);
            const leftH  = (s.courses||[]).reduce((a,c)=>a+c.left, 0);
            const pct    = totalH ? Math.round(usedH/totalH*100) : 0;
            const color  = leftH<=1?'var(--md-error)':leftH<=3?'var(--md-warning)':'var(--md-success)';
            return `<div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
                <span style="cursor:pointer;color:var(--md-primary)" onclick="openProfileModal('${s.id}')">${s.name}</span>
                <span style="color:${color};font-weight:600">${leftH}h left</span>
              </div>
              <div style="background:#f3f4f6;border-radius:4px;height:6px">
                <div style="background:${color};width:${pct}%;height:6px;border-radius:4px"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  }

  /* ── ATTENDANCE TAB ───────────────────────────────────── */
  function buildAttendance() {
    const attRate = attTotal ? Math.round(attCnt.present/attTotal*100) : 0;
    const deducted = DB.students.reduce((s,stu) =>
      s + (stu.attendance||[]).filter(a=>Utils.shouldDeduct(a.status)).length, 0);

    /* Per-student attendance rates */
    const stuAttStats = DB.students.map(s => {
      const att = s.attendance||[];
      const p   = att.filter(a=>a.status==='present').length;
      const tot = att.length;
      return { name:s.name, id:s.id, p, tot,
               rate: tot ? Math.round(p/tot*100) : 0 };
    }).sort((a,b)=>b.rate-a.rate);

    return `
    <div class="kpi-grid mb-16" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi-card">
        <div class="kpi-label">Overall Rate</div>
        <div class="kpi-value" style="color:${attRate>=80?'var(--md-success)':'var(--md-error)'}">${attRate}%</div>
        <div class="kpi-change ${attRate>=80?'up':'down'}">Target: 80%+</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Present</div>
        <div class="kpi-value" style="color:var(--md-success)">${attCnt.present}</div>
        <div class="kpi-change up">of ${attTotal} total</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Absent</div>
        <div class="kpi-value" style="color:var(--md-error)">${attCnt.absent}</div>
        <div class="kpi-change down">Class deducted</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Total Deducted</div>
        <div class="kpi-value">${deducted}</div>
        <div class="kpi-change">classes consumed</div>
      </div>
    </div>
    <div class="report-grid">
      <div class="card">
        <div class="card-header"><div class="card-title">Attendance by Status</div></div>
        <div class="card-body">
          ${barChart(
            [attCnt.present, attCnt.leave, attCnt.absent, attCnt.reschedule||0],
            ['Present','Leave','Absent','Reschedule'], '')}
        </div>
      </div>
      <div class="card">
        <div class="card-header"><div class="card-title">Attendance Rate by Student</div></div>
        <div class="card-body">
          ${stuAttStats.map(s => {
            const color = s.rate>=80?'var(--md-success)':s.rate>=60?'var(--md-warning)':'var(--md-error)';
            return `<div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
                <span style="cursor:pointer;color:var(--md-primary)" onclick="openProfileModal('${s.id}')">${s.name}</span>
                <span style="color:${color};font-weight:600">${s.rate}% (${s.p}/${s.tot})</span>
              </div>
              <div style="background:#f3f4f6;border-radius:4px;height:6px">
                <div style="background:${color};width:${s.rate}%;height:6px;border-radius:4px"></div>
              </div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;
  }

  /* ── CRM TAB ──────────────────────────────────────────── */
  function buildCRM() {
    const leads    = DB.leads || [];
    const custs    = DB.customers || [];
    const newL     = leads.filter(l=>l.stage==='new').length;
    const archived = leads.filter(l=>l.stage==='archived').length;

    return `
    <div class="kpi-grid mb-16" style="grid-template-columns:repeat(4,1fr)">
      <div class="kpi-card">
        <div class="kpi-label">Total Leads</div>
        <div class="kpi-value">${leads.length}</div>
        <div class="kpi-change">${newL} new</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Active Pipeline</div>
        <div class="kpi-value" style="color:var(--md-primary)">${leads.filter(l=>l.stage!=='archived').length}</div>
        <div class="kpi-change up">In funnel</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Customers (Enrolled)</div>
        <div class="kpi-value" style="color:var(--md-success)">${custs.length}</div>
        <div class="kpi-change up">Converted</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Archived</div>
        <div class="kpi-value" style="color:var(--md-on-surface-variant)">${archived}</div>
        <div class="kpi-change">Not converted</div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">Lead Funnel by Stage</div></div>
      <div class="card-body">
        ${leadFunnel.map(f => {
          const pct = leads.length ? Math.round(f.count/leads.length*100) : 0;
          const STAGE_META = CONST.LEAD_STAGES?.[f.stage] || {};
          return statRow(STAGE_META.label||f.stage, `${f.count} leads`, 'var(--md-primary)', pct);
        }).join('')}
      </div>
    </div>`;
  }

  /* ── RENDER TABS ──────────────────────────────────────── */
  const TABS = {
    overview:   buildOverview,
    revenue:    buildRevenue,
    students:   buildStudents,
    attendance: buildAttendance,
    crm:        buildCRM,
  };

  function renderTab(name) {
    Object.keys(TABS).forEach(t => {
      const el = document.getElementById(`rtab-${t}`);
      if (!el) return;
      if (t === name) {
        if (!el.dataset.built) { el.innerHTML = TABS[t](); el.dataset.built = '1'; }
        el.style.display = '';
      } else {
        el.style.display = 'none';
      }
    });
  }

  window.reportTab = function (tab, el) {
    activeTab = tab;
    document.querySelectorAll('#view-reports .tab').forEach(t=>t.classList.remove('active'));
    el.classList.add('active');
    renderTab(tab);
  };

  /* ── INIT ─────────────────────────────────────────────── */
  renderTab('overview');

})();
