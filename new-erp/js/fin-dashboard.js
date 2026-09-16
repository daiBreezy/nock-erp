/* ============================================================
   fin-dashboard.js — Finance ▸ Dashboard (command center)
   (renamed from fin-overview.js — same file, same behavior, per
   Nock's IA expansion request, see FINANCE-MODEL.md §19)
   Answers: what needs action now · what's coming · what's already
   wrong + impact · which branch is burning. Wayfinding to every menu.
   ============================================================ */
(function () {

  const U = () => window.CURRENT_USER;
  const CUR = '2026-06', PREV = '2026-05';
  const inflow = e => e.type === 'received' || e.type === 'income';
  const FIXED = ['salary', 'rental'];
  function fmtK(n){ const neg=n<0; n=Math.abs(n);
    const s=n>=1e6?`฿${(n/1e6).toFixed(2)}M`:n>=1e3?`฿${Math.round(n/1e3)}K`:`฿${Math.round(n)}`; return neg?'−'+s:s; }
  function monthLabel(ym){ const M=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const [y,m]=ym.split('-').map(Number); return `${M[m-1]} ${String(y).slice(2)}`; }

  /* operational (discretionary) spend for a branch+month — excludes salary/rent */
  function spendOps(branch, ym) {
    return DB.expenses.filter(e => e.status!=='inactive' && e.branch===branch &&
      e.date.slice(0,7)===ym && !inflow(e) && FIXED.indexOf(e.type)<0)
      .reduce((s,e)=>s+e.amount,0);
  }
  function deltaPct(cur, prev) {
    if (!prev) return cur>0 ? 100 : 0;
    return Math.round((cur-prev)/prev*100);
  }

  /* period comparison engine (petty imprest usage) */
  let ovPeriod = 'MoM';
  function periodMonths(key) {
    const yms = (y, a, b) => { const o=[]; for(let m=a;m<=b;m++) o.push(y+'-'+String(m).padStart(2,'0')); return o; };
    switch (key) {
      case 'MTD': return { cur:['2026-06'], prev:['2026-05'], curL:'Jun (MTD)', prevL:'May' };
      case 'MoM': return { cur:['2026-06'], prev:['2026-05'], curL:'Jun', prevL:'May' };
      case 'QTD': return { cur:yms(2026,4,6), prev:yms(2026,1,3), curL:'Q2 (QTD)', prevL:'Q1' };
      case 'QoQ': return { cur:yms(2026,4,6), prev:yms(2026,1,3), curL:'Q2', prevL:'Q1' };
      case 'YTD': return { cur:yms(2026,1,6), prev:yms(2025,1,6), curL:'2026 YTD', prevL:'2025' };
      case 'YoY': return { cur:yms(2026,1,6), prev:yms(2025,1,6), curL:'2026', prevL:'2025' };
      default:    return { cur:['2026-06'], prev:['2026-05'], curL:'Jun', prevL:'May' };
    }
  }
  const sumUsed = (branch, months) => months.reduce((s,ym)=>s+FIN.pettyUsed(branch,ym),0);
  window.ovSetPeriod = function (k) { ovPeriod = k; render(); };

  function render() {
    const vb = FIN.visibleBranches(U());
    const central = FIN.balance('central');
    const recur = FIN.recurringFor(U());
    const monthlyFixed = recur.reduce((s,t)=>s+FIN.recurringAmount(t),0);
    const runway = monthlyFixed>0 ? central/monthlyFixed : Infinity;

    const pendReq  = FIN.actionableRequestsFor(U());
    const pendReim = FIN.pendingReimFor(U());
    const reimOldest = pendReim.reduce((m,r)=>Math.max(m, FIN.daysSince(r.submittedDate)),0);

    /* per-branch stats */
    const stats = vb.map(b => {
      const cur = spendOps(b, CUR), prev = spendOps(b, PREV);
      const float = FIN.pettyBalance(b), d = deltaPct(cur, prev);
      let status, color;
      if (float < 0)        { status='Top-up needed'; color='red'; }
      else if (d > 50 && cur > 1000) { status='Burning'; color='red'; }
      else if (float < 800) { status='Low float'; color='yellow'; }
      else                  { status='Healthy'; color='green'; }
      return { b, cur, prev, d, float, status, color };
    }).sort((a,b)=> rank(b)-rank(a));
    function rank(s){ return (s.float<0?100:0) + (s.d>50?40:0) + (s.float<800?10:0) + s.cur/100000; }

    const spendThis = vb.reduce((s,b)=>s+spendOps(b,CUR),0);
    const spendPrev = vb.reduce((s,b)=>s+spendOps(b,PREV),0);
    const spendDelta = deltaPct(spendThis, spendPrev);

    /* ── ALERTS (problem · impact · action) ── */
    const alerts = [];
    stats.filter(s=>s.float<0).forEach(s=> alerts.push({ sev:'high', icon:'savings',
      title:`${s.b} · petty float ติดลบ ${Utils.currency(s.float)}`,
      impact:'สาขาจ่ายเงินสดประจำวันไม่ได้ — ต้องเติม (top-up) ด่วน',
      label:'เติมเงิน', act:`showView('fin-requests')` }));
    if (pendReim.length) alerts.push({ sev: reimOldest>7?'high':'med', icon:'request_quote',
      title:`${pendReim.length} คำขอเบิกคืนรอจ่าย (เก่าสุด ${reimOldest} วัน)`,
      impact:'พนักงานสำรองจ่ายไปแล้วยังไม่ได้เงินคืน — รออนุมัติ',
      label:'ไปจัดการ', act:`showView('fin-reimburse')` });
    if (pendReq.length) alerts.push({ sev:'med', icon:'approval',
      title:`${pendReq.length} คำขอรอดำเนินการ`,
      impact:'การจัดซื้อถูกบล็อกจนกว่าจะอนุมัติ/โอน/ปิดรายการ',
      label:'ไปจัดการ', act:`showView('fin-requests')` });
    stats.filter(s=>s.float>=0 && s.d>50 && s.cur>1000).forEach(s=> alerts.push({ sev:'med', icon:'local_fire_department',
      title:`${s.b} · ใช้จ่ายพุ่ง ▲${s.d}% จากเดือนก่อน`,
      impact:'อัตราการใช้เงินสูงผิดปกติ ควรตรวจว่าใช้กับอะไร',
      label:'ดู Reports', act:`showView('fin-reports')` }));
    if (isFinite(runway) && runway < 4 && (FIN.isSpecial(U())||U().role==='director'||U().role==='area_manager'))
      alerts.push({ sev:'high', icon:'account_balance',
        title:`Central Bank เหลือพอจ่ายคงที่ ~${runway.toFixed(1)} เดือน`,
        impact:'ถ้าไม่เติมเงิน/ลดค่าใช้จ่าย เงินจะไม่พอจ่ายเงินเดือน+ค่าเช่า',
        label:'ดูแผน', act:`showView('fin-recurring')` });
    const dueRecur = recur.filter(t => FIN.recurringStatus(t)==='due');
    dueRecur.forEach(t => alerts.push({ sev:'info', icon:'event',
      title:`${t.label}${t.branch?' · '+t.branch:''} ฿${FIN.recurringAmount(t).toLocaleString()} ถึงกำหนดจ่าย`,
      impact:'ครบกำหนดจ่ายแล้ว ตรวจสอบว่าจ่ายเรียบร้อย',
      label:'ดู Recurring', act:`showView('fin-recurring')` }));
    const SEVRANK = { high:3, med:2, info:1 };
    alerts.sort((a,b)=>SEVRANK[b.sev]-SEVRANK[a.sev]);

    const SEVCLR = { high:'var(--md-error)', med:'var(--md-warning)', info:'var(--md-primary)' };
    const alertHtml = alerts.length ? alerts.map(a => `
      <div class="card card-sm" style="display:flex;align-items:center;gap:12px;border-left:3px solid ${SEVCLR[a.sev]}">
        <span style="color:${SEVCLR[a.sev]};flex-shrink:0">${UI.icon(a.icon)}</span>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600">${a.title}</div>
          <div class="text-muted" style="font-size:var(--fs-label-sm)">${UI.icon('arrow_right_alt','sm')} ${a.impact}</div>
        </div>
        <button class="btn btn-secondary btn-sm" style="flex-shrink:0" onclick="${a.act}">${a.label}</button>
      </div>`).join('')
      : `<div class="card card-sm" style="display:flex;align-items:center;gap:10px;border-left:3px solid var(--md-success)">
          <span style="color:var(--md-success)">${UI.icon('check_circle')}</span>
          <div style="font-weight:600">ทุกอย่างเรียบร้อย — ไม่มีอะไรต้องรีบจัดการ</div></div>`;

    /* ── branch list — imprest (Budget / Used / Remaining, per-branch since
       Finance ▸ Settings ▸ Petty Cash) + period compare ── */
    const pm = periodMonths(ovPeriod);
    const branchRows = vb.map(b => {
      const budget = FIN.pettyBudget(b);
      const used = sumUsed(b, pm.cur), prevUsed = sumUsed(b, pm.prev);
      const d = deltaPct(used, prevUsed);
      const remain = budget - FIN.pettyUsed(b, CUR);   // remaining = เดือนนี้เสมอ (imprest)
      const dtxt = `${d>0?'▲':d<0?'▼':''} ${Math.abs(d)}%`;
      const dcls = d>0 ? 'text-error' : d<0 ? 'text-success' : 'text-muted';
      const rcls = remain<0 ? 'text-error' : remain<budget*0.2 ? 'text-warning' : '';
      return `<tr class="tr-click" onclick="showView('fin-reports')">
        <td style="font-weight:500">${b}</td>
        <td style="text-align:right" class="text-muted">${Utils.currency(budget)}</td>
        <td style="text-align:right;font-weight:600">${Utils.currency(used)}</td>
        <td style="text-align:right" class="${dcls}">${dtxt}</td>
        <td style="text-align:right;font-weight:600" class="${rcls}">${Utils.currency(remain)}</td>
      </tr>`;
    }).join('');
    const periodChips = ['MTD','MoM','QTD','QoQ','YTD','YoY']
      .map(k=>`<div class="filter-chip ${ovPeriod===k?'active':''}" onclick="ovSetPeriod('${k}')">${k}</div>`).join('');

    /* ── upcoming / forecast ── */
    const fc = FIN.forecast(U(), 3);
    const upcoming = recur.slice().sort((a,b)=>a.dayOfMonth-b.dayOfMonth).slice(0,4).map(t => {
      const st = FIN.recurringStatus(t);
      const c = st==='paid'?'green':st==='due'?'red':'yellow';
      return `<div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--md-outline-variant)">
        <div style="min-width:0"><div style="font-weight:500">${t.label}${t.branch?' · '+t.branch:''}</div>
          <div class="text-muted" style="font-size:var(--fs-label-sm)">day ${t.dayOfMonth} / month</div></div>
        <div style="text-align:right;flex-shrink:0"><div style="font-weight:600">${Utils.currency(FIN.recurringAmount(t))}</div>
          <div style="margin-top:2px">${UI.badge(st, c)}</div></div>
      </div>`;
    }).join('');

    /* ── render ── */
    document.getElementById('view-fin-dashboard').innerHTML = `
      ${UI.pageHeader('Finance Dashboard',
        `${vb.length} branch(es) · ${U().role==='director'||FIN.isSpecial(U())?'company-wide':U().role==='area_manager'?'your area':'your branch'}`,
        `<button class="btn btn-primary" onclick="showView('fin-requests')">${UI.icon('approval','sm')} Open Requests</button>`)}
      <div id="ov-kpi"></div>

      ${UI.sectionTitle(`${UI.icon('priority_high','sm')} ต้องจัดการ / Needs attention`)}
      <div style="display:flex;flex-direction:column;gap:var(--sp-2)">${alertHtml}</div>

      <div class="card-grid" style="display:grid;grid-template-columns:1.3fr 1fr;gap:var(--sp-3);align-items:start;margin-top:var(--sp-4)">
        <div>
          ${UI.sectionTitle(`${UI.icon('store','sm')} Branch petty — budget / used / remaining`,
            `<span class="text-muted" style="font-size:var(--fs-label-sm)">${pm.curL} vs ${pm.prevL}</span>`)}
          <div class="filter-bar" style="margin:0 0 var(--sp-2)">${periodChips}</div>
          <div class="card"><div style="overflow-x:auto"><table style="margin:0">
            <thead><tr><th>Branch</th><th style="text-align:right">Budget</th><th style="text-align:right">Used (${pm.curL})</th><th style="text-align:right">vs ${pm.prevL}</th><th style="text-align:right">Remaining</th></tr></thead>
            <tbody>${branchRows}</tbody></table></div></div>
          <div class="text-muted" style="font-size:var(--fs-label-sm);margin-top:6px">${UI.icon('info','sm')} Imprest: budget ต่อสาขาตั้งค่าได้ที่ Settings → Petty Cash · สิ้นเดือนส่วนกลางเติมกลับให้เต็มเสมอ</div>
        </div>
        <div>
          ${UI.sectionTitle(`${UI.icon('event_upcoming','sm')} กำลังจะมา / Upcoming`, `<span class="text-muted" style="font-size:var(--fs-label-sm)">3-mo: ${fmtK(fc.reduce((s,r)=>s+r.total,0))}</span>`)}
          <div class="card"><div style="padding:var(--sp-3) var(--sp-4)">${upcoming}
            <div style="display:flex;justify-content:space-between;padding-top:8px;margin-top:2px;font-size:var(--fs-label-md)">
              <span class="text-muted">Fixed cost / month</span><span style="font-weight:700">${Utils.currency(monthlyFixed)}</span></div>
          </div></div>
        </div>
      </div>`;

    /* KPI cards */
    const pendTotal = pendReq.length + pendReim.length;
    const runwayTxt = isFinite(runway) ? `~${runway.toFixed(1)} mo runway` : 'no fixed cost';
    const showCentral = FIN.isSpecial(U()) || U().role==='director' || U().role==='area_manager';
    const cards = [
      { icon:'priority_high', label:'Needs attention', value:alerts.length, color: alerts.length?'error':'success',
        sub: alerts.length?'รายการด่วน':'All clear' },
      { icon:'approval', label:'Pending approvals', value:pendTotal, color: pendTotal?'warning':'success',
        sub:`${pendReq.length} req · ${pendReim.length} reimb` },
      { icon:'trending_down', label:`Spend ${monthLabel(CUR)}`, value:fmtK(spendThis),
        color: spendDelta>0?'error':'', sub:`${spendDelta>0?'▲':spendDelta<0?'▼':''} ${Math.abs(spendDelta)}% vs ${monthLabel(PREV)}`, subColor: spendDelta>0?'down':'up' },
    ];
    if (showCentral) cards.push({ icon:'account_balance', label:'Central Bank', value:fmtK(central),
      color: (isFinite(runway)&&runway<4)?'error':'tertiary', sub: runwayTxt, subColor:(isFinite(runway)&&runway<4)?'down':'' });
    const kel = document.getElementById('ov-kpi');
    kel.innerHTML = UI.kpiGrid(cards);
    const g = kel.querySelector('.kpi-grid'); if (g) g.style.gridTemplateColumns = `repeat(${cards.length},1fr)`;
    // "Pending approvals" KPI navigates straight to the workspace where the work
    // actually gets done — no parallel mini-review UI living here too (one canonical place).
    const kc = kel.querySelectorAll('.kpi-card');
    if (kc[1]) { kc[1].style.cursor='pointer'; kc[1].onclick = function(){ showView('fin-requests'); }; }
  }

  render();
  window._refreshFinDashboard = render;

})();
