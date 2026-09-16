/* ============================================================
   reports.js — NockERP Reports (Executive / Multi-branch BI)
   อ่านจาก metrics layer (DB.branchMonthly via window.RD)
   - Scope (Company/Area/Branch) · Time engine (Period × Compare)
   - Overview (rollup) · Compare (leaderboard + per-student + benchmark)
   - Financial/Students/Acquisition/Courses/Operations = chunk 2–3
   ============================================================ */
(function () {

  const NOW = '2026-06';                 // "today" = 16 Jun 2026
  const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  /* ── STATE ────────────────────────────────────────────── */
  let scope     = { kind:'company', key:'' };   // company | area | branch
  let periodKey = 'ytd';
  let compareKey= 'yoy';                          // none | prev | yoy
  let perStudent= false;                          // Compare lens toggle
  let compareRank = '';                            // Compare spotlight metric
  let activeTab = 'overview';

  /* ── TIME ENGINE ──────────────────────────────────────── */
  function rng(seedStr) {
    let s = 0; for (let i=0;i<seedStr.length;i++) s=(s*31+seedStr.charCodeAt(i))>>>0;
    return () => { s=(s*1103515245+12345)>>>0; return (s>>>8)/16777216; };
  }
  function ymAdd(ym, d) {
    const [y,m] = ym.split('-').map(Number);
    const idx = y*12 + (m-1) + d;
    return `${Math.floor(idx/12)}-${String(idx%12+1).padStart(2,'0')}`;
  }
  function ymLen(a, b) {                           // inclusive month count
    const [ay,am] = a.split('-').map(Number), [by,bm] = b.split('-').map(Number);
    return (by*12+bm) - (ay*12+am) + 1;
  }
  function periodRange(key) {
    const [Y,M] = NOW.split('-').map(Number);
    const qStart = Math.floor((M-1)/3)*3 + 1;
    switch (key) {
      case 'this_month': return { s:NOW, e:NOW, gran:'month', label:'This month' };
      case 'last_month': { const p=ymAdd(NOW,-1); return { s:p, e:p, gran:'month', label:'Last month' }; }
      case 'this_q':     return { s:`${Y}-${String(qStart).padStart(2,'0')}`, e:NOW, gran:'quarter', label:'This quarter' };
      case 'last_q':     { const s=ymAdd(`${Y}-${String(qStart).padStart(2,'0')}`,-3); return { s, e:ymAdd(s,2), gran:'quarter', label:'Last quarter' }; }
      case 'ytd':        return { s:`${Y}-01`, e:NOW, gran:'ytd', label:'Year to date' };
      case 'last_year':  return { s:'2025-01', e:'2025-12', gran:'year', label:'Last year (2025)' };
      case 'last3':      return { s:ymAdd(NOW,-2), e:NOW, gran:'multi', label:'Last 3 months' };
      case 'last6':      return { s:ymAdd(NOW,-5), e:NOW, gran:'multi', label:'Last 6 months' };
      case 'last12':     return { s:ymAdd(NOW,-11), e:NOW, gran:'multi', label:'Last 12 months' };
      default:           return { s:`${Y}-01`, e:NOW, gran:'ytd', label:'Year to date' };
    }
  }
  function compareRange(pr, mode) {
    if (mode === 'none') return null;
    const len = ymLen(pr.s, pr.e);
    if (mode === 'yoy') return { s:ymAdd(pr.s,-12), e:ymAdd(pr.e,-12) };
    return { s:ymAdd(pr.s,-len), e:ymAdd(pr.e,-len) };  // prev period
  }
  function deltaLabel(gran, mode) {
    if (mode === 'none') return '';
    if (mode === 'yoy')  return 'YoY';
    return gran==='month' ? 'MoM' : gran==='quarter' ? 'QoQ' : gran==='year'||gran==='ytd' ? 'YoY' : 'vs prev';
  }

  /* ── SCOPE → branch list ──────────────────────────────── */
  function scopeBranches() {
    if (scope.kind === 'branch') return [scope.key];
    if (scope.kind === 'area')   return RD.branchesForArea(scope.key);
    if (scope.kind === 'compare') return scope.key ? RD.branchesForArea(scope.key) : RD.allBranches();
    return RD.allBranches();
  }
  function scopeLabel() {
    if (scope.kind === 'branch') return scope.key;
    if (scope.kind === 'area')   return `Area: ${scope.key}`;
    if (scope.kind === 'compare') return scope.key ? `⚖️ เทียบใน ${scope.key}` : '⚖️ เทียบทุกสาขา';
    return 'ทั้งบริษัท';
  }
  const isCompareMode = () => scope.kind === 'compare';

  /* ── FORMAT ───────────────────────────────────────────── */
  function fmtMoney(n) {
    if (n >= 1e6) return `฿${(n/1e6).toFixed(2)}M`;
    if (n >= 1e3) return `฿${Math.round(n/1e3)}K`;
    return `฿${Math.round(n).toLocaleString()}`;
  }
  function deltaPct(cur, prev) {
    if (!prev) return null;
    return Math.round((cur - prev) / prev * 100);
  }
  function deltaTag(cur, prev, lbl, goodUp) {
    const d = deltaPct(cur, prev);
    if (d === null) return '';
    goodUp = goodUp !== false;
    const good = goodUp ? d >= 0 : d <= 0;
    const color = d === 0 ? 'var(--md-on-surface-variant)' : good ? 'var(--md-success)' : 'var(--md-error)';
    const arrow = d > 0 ? '▲' : d < 0 ? '▼' : '·';
    return `<span style="color:${color};font-size:11px;font-weight:600">${arrow} ${Math.abs(d)}% ${lbl}</span>`;
  }

  /* ── VISUAL HELPERS ───────────────────────────────────── */
  function donut(segs, centerTop, centerBottom, size) {
    size = size || 118;
    const c = size/2, r = c - 8, circ = 2*Math.PI*r, sw = Math.round(size*0.11);
    const total = segs.reduce((s,x)=>s+x.value,0) || 1;
    let off = 0;
    const arcs = segs.map(s => {
      const len = s.value/total*circ;
      const el = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${sw}"
        stroke-dasharray="${len} ${circ-len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${c} ${c})"
        stroke-linecap="butt"/>`;
      off += len; return el;
    }).join('');
    return `<svg viewBox="0 0 ${size} ${size}" style="width:${size}px;height:${size}px;flex-shrink:0">
      <circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="var(--md-surface-mid)" stroke-width="${sw}"/>
      ${arcs}
      <text x="${c}" y="${c-1}" text-anchor="middle" font-size="${(size*0.19).toFixed(0)}" font-weight="700" fill="var(--md-on-surface)">${centerTop}</text>
      <text x="${c}" y="${(c+size*0.13).toFixed(0)}" text-anchor="middle" font-size="${(size*0.075).toFixed(0)}" fill="var(--md-on-surface-variant)">${centerBottom}</text>
    </svg>`;
  }
  /* grouped 2-series monthly bar (cur vs compare) + y-axis gridlines/labels */
  function groupedBar(cur, cmp, labels) {
    const max = Math.max(...cur, ...(cmp||[]), 1);
    const H = 210, ticks = [1,0.75,0.5,0.25,0];
    return `
    <div style="display:flex;gap:6px">
      <div style="width:48px;height:${H}px;position:relative;flex-shrink:0">
        ${ticks.map(t=>`<div style="position:absolute;right:4px;top:${((1-t)*H-6).toFixed(0)}px;font-size:9px;color:var(--md-on-surface-variant)">${fmtMoney(max*t)}</div>`).join('')}
      </div>
      <div style="flex:1;position:relative;height:${H}px">
        ${ticks.map(t=>`<div style="position:absolute;left:0;right:0;top:${((1-t)*H).toFixed(0)}px;border-top:1px solid var(--md-surface-mid)"></div>`).join('')}
        <div style="position:absolute;inset:0;display:flex;align-items:flex-end;gap:6px">
          ${cur.map((v,i)=>`<div style="flex:1;display:flex;align-items:flex-end;justify-content:center;gap:2px;height:100%">
            <div title="${labels[i]}: ${fmtMoney(v)}" style="width:42%;height:${(v/max*100).toFixed(1)}%;min-height:2px;background:var(--md-primary);border-radius:3px 3px 0 0"></div>
            ${cmp?`<div title="${labels[i]} (cmp): ${fmtMoney(cmp[i]||0)}" style="width:42%;height:${((cmp[i]||0)/max*100).toFixed(1)}%;min-height:2px;background:var(--md-primary-container);border-radius:3px 3px 0 0"></div>`:''}
          </div>`).join('')}
        </div>
      </div>
    </div>
    <div style="display:flex;gap:6px;margin-top:3px">
      <div style="width:48px;flex-shrink:0"></div>
      <div style="flex:1;display:flex;gap:6px">${labels.map(l=>`<span style="flex:1;text-align:center;font-size:9px;color:var(--md-on-surface-variant)">${l}</span>`).join('')}</div>
    </div>`;
  }
  function heatBg(v, min, max) {
    if (max === min) return 'transparent';
    const t = (v - min) / (max - min);
    return `rgba(99,102,241,${(0.06 + 0.26*t).toFixed(3)})`;
  }

  /* ── SHELL ────────────────────────────────────────────── */
  const TAB_DEFS = [
    ['overview',   'bar_chart',     'Overview'],
    ['financial',  'payments',      'Financial'],
    ['students',   'school',        'Students'],
    ['acquisition','person_search', 'Acquisition'],
    ['courses',    'menu_book',     'Courses'],
    ['operations', 'tune',          'Operations'],
  ];

  function scopeOptions() {
    const mgr = window.ST_ROLE === 'manager';
    let html = `<option value="company:">🏢 ทั้งบริษัท (rollup)</option>`;
    if (!mgr) html += `<option value="compare:">⚖️ เทียบทุกสาขา</option>`;
    (DB.areas||[]).forEach(a => {
      html += `<option value="area:${a.name}">🗺️ Area: ${a.name}</option>`;
      if (!mgr) html += `<option value="compare:${a.name}">⚖️ เทียบใน ${a.name}</option>`;
    });
    RD.allBranches().forEach(b => html += `<option value="branch:${b}">🏫 ${b}</option>`);
    return html;
  }

  document.getElementById('view-reports').innerHTML = `
  ${UI.pageHeader('Reports', `<span id="rep-sub">…</span>`,
    `<select id="rep-scope" class="tc-select" style="margin-right:8px" onchange="repSetScope(this.value)">${scopeOptions()}</select>
     <button class="btn btn-secondary btn-sm" onclick="NockExport.csv('report-branches.csv', (window.RD&&RD.branches?RD.branches:CONST.BRANCHES.map(b=>({branch:b}))).map(b=>typeof b==='string'?{branch:b}:b))">${UI.icon('upload','sm')} Export</button>`
  )}

  <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:14px">
    <select id="rep-period" class="tc-select" onchange="repSet('period',this.value)">
      <option value="this_month">This month</option>
      <option value="last_month">Last month</option>
      <option value="this_q">This quarter</option>
      <option value="last_q">Last quarter</option>
      <option value="ytd" selected>Year to date</option>
      <option value="last_year">Last year (2025)</option>
      <option value="last3">Last 3 months</option>
      <option value="last6">Last 6 months</option>
      <option value="last12">Last 12 months</option>
    </select>
    <span class="text-muted" style="font-size:12px">เทียบกับ</span>
    <select id="rep-compare" class="tc-select" onchange="repSet('compare',this.value)">
      <option value="none">ไม่เทียบ</option>
      <option value="prev">ช่วงก่อนหน้า</option>
      <option value="yoy" selected>ปีที่แล้ว (YoY)</option>
    </select>
    <span id="rep-range-label" class="text-muted" style="font-size:11px;margin-left:auto"></span>
  </div>

  <div class="tabs" style="margin-bottom:var(--sp-4)">
    ${TAB_DEFS.filter(t => !(t[0]==='compare' && window.ST_ROLE==='manager'))   /* Manager ไม่เห็น Compare */
      .map((t,i)=>`<div class="tab ${i===0?'active':''}" onclick="reportTab('${t[0]}',this)">${UI.icon(t[1],'sm')} ${t[2]}</div>`).join('')}
  </div>
  <div id="rep-body"></div>`;

  /* ── OVERVIEW ─────────────────────────────────────────── */
  function buildOverview() {
    const br = scopeBranches();
    const pr = periodRange(periodKey);
    const cmp = compareRange(pr, compareKey);
    const cur = RD.aggregate(br, pr.s, pr.e);
    const prev = cmp ? RD.aggregate(br, cmp.s, cmp.e) : null;
    const dl = deltaLabel(pr.gran, compareKey);

    const kpi = (icon,label,val,curV,prevV,goodUp) => `
      <div class="card" style="padding:16px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span style="width:34px;height:34px;border-radius:9px;background:var(--md-primary-container);
            display:flex;align-items:center;justify-content:center;color:var(--md-primary)">${UI.icon(icon,'sm')}</span>
          <span class="text-muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em">${label}</span>
        </div>
        <div style="font-size:24px;font-weight:700">${val}</div>
        <div style="margin-top:2px">${prevV!=null?deltaTag(curV,prevV,dl,goodUp):'<span class="text-muted" style="font-size:11px">—</span>'}</div>
      </div>`;

    /* Revenue snapshot — แต่ละ horizon เทียบ "ช่วงก่อนหน้าของตัวเอง" (delta สอดคล้องในตัว) */
    const horizons = [
      ['this_month','This month'], ['last3','Last 3M'], ['last6','Last 6M'],
      ['ytd','YTD'], ['last_year','Last year'],
    ];
    const strip = horizons.map(([k,lbl]) => {
      const p = periodRange(k), c = compareRange(p,'prev');   // เทียบช่วงก่อนหน้าของแต่ละการ์ดเอง
      const a = RD.aggregate(br, p.s, p.e).revenue;
      const b = c ? RD.aggregate(br, c.s, c.e).revenue : 0;
      return `<div class="card" style="padding:12px 14px;min-width:150px;flex:1">
        <div class="text-muted" style="font-size:11px">${lbl}</div>
        <div style="font-size:18px;font-weight:700;margin:2px 0">${fmtMoney(a)}</div>
        ${deltaTag(a,b,deltaLabel(p.gran,'prev'))}
      </div>`;
    }).join('');

    /* revenue monthly series across selected range */
    const months = []; let m = pr.s; while (m <= pr.e) { months.push(m); m = ymAdd(m,1); }
    const curSeries = months.map(ym => RD.aggregate(br, ym, ym).revenue);
    const cmpSeries = cmp ? months.map(ym => RD.aggregate(br, ymAdd(ym, compareKey==='yoy'?-12:-(ymLen(pr.s,pr.e))), ymAdd(ym, compareKey==='yoy'?-12:-(ymLen(pr.s,pr.e)))).revenue) : null;
    const monLabels = months.map(ym => MONTH_LABELS[parseInt(ym.split('-')[1])-1]);

    /* attendance donut */
    const attSeg = [
      { label:'Present', value:cur.present, color:'var(--md-success)' },
      { label:'Leave',   value:cur.leave,   color:'var(--md-warning)' },
      { label:'Absent',  value:cur.absent,  color:'var(--md-error)' },
    ];

    /* branch contribution (revenue share) */
    const contrib = br.map(b => ({ b, rev:RD.aggregate([b], pr.s, pr.e).revenue }))
      .sort((a,b)=>b.rev-a.rev);
    const contribMax = Math.max(...contrib.map(c=>c.rev),1);
    const contribTotal = contrib.reduce((s,x)=>s+x.rev,0) || 1;

    return `
    <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:14px">
      ${kpi('payments','Revenue',fmtMoney(cur.revenue),cur.revenue,prev?.revenue)}
      ${kpi('school','Students (avg)',cur.students,cur.students,prev?.students)}
      ${kpi('event','Sessions',cur.sessions.toLocaleString(),cur.sessions,prev?.sessions)}
      ${kpi('trending_up','Attendance',`${cur.attRate}%`,cur.attRate,prev?.attRate)}
      ${attentionCard()}
    </div>

    <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:var(--md-on-surface-variant);margin-bottom:6px">Revenue snapshot <span style="text-transform:none;font-weight:400">· เทียบช่วงก่อนหน้าของแต่ละช่วง</span></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">${strip}</div>

    <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:14px;margin-bottom:14px">
      <div class="card"><div class="card-header"><div class="card-title">${UI.icon('payments','sm')} Revenue ${cmp?`· <span style="color:var(--md-primary)">●</span> ${pr.label} <span style="color:var(--md-primary-container)">●</span> ${compareKey==='yoy'?'ปีที่แล้ว':'ช่วงก่อน'}`:`· ${pr.label}`}</div></div>
        <div class="card-body">${groupedBar(curSeries, cmpSeries, monLabels)}</div></div>
      <div class="card"><div class="card-header"><div class="card-title">${UI.icon('check_circle','sm')} Attendance Breakdown</div></div>
        <div class="card-body" style="display:flex;align-items:center;justify-content:center;gap:28px;min-height:200px">
          ${donut(attSeg, `${cur.attRate}%`, 'Present', 168)}
          <div style="flex:1;max-width:240px">
            ${attSeg.map(s=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:14px">
              <span style="width:11px;height:11px;border-radius:3px;background:${s.color}"></span>
              <span style="flex:1">${s.label}</span><strong>${s.value.toLocaleString()}</strong>
              <span class="text-muted" style="font-size:11px;width:36px;text-align:right">${Math.round(s.value/(cur.attEvents||1)*100)}%</span></div>`).join('')}
          </div>
        </div></div>
    </div>

    <div class="card"><div class="card-header"><div class="card-title">${UI.icon('store','sm')} Revenue by Branch · ${pr.label}</div></div>
      <div class="card-body">
        ${contrib.map(c=>barRow(c.b, `${fmtMoney(c.rev)} · ${Math.round(c.rev/contribTotal*100)}%`,
          Math.round(c.rev/contribMax*100), { onclick:`repDrillBranch('${c.b}')`, vw:128 })).join('')}
      </div></div>`;
  }

  /* ── COMPARE ──────────────────────────────────────────── */
  function buildCompare() {
    const br = scopeBranches();
    const pr = periodRange(periodKey);
    const cmp = compareRange(pr, compareKey);
    const dl = deltaLabel(pr.gran, compareKey);

    const data = br.map(b => ({
      b, cur:RD.aggregate([b], pr.s, pr.e),
      prev: cmp ? RD.aggregate([b], cmp.s, cmp.e) : null,
    }));
    const companyCur = RD.aggregate(br, pr.s, pr.e);

    /* column sets: Absolute vs Per-student */
    const cols = perStudent
      ? [['ARPU','arpu',v=>fmtMoney(v),true],['Retention%','retention',v=>v+'%',true],
         ['Conv%','convRate',v=>v+'%',true],['Attendance%','attRate',v=>v+'%',true],['Utilization%','utilization',v=>v+'%',true]]
      : [['Revenue','revenue',v=>fmtMoney(v),true],['Students','students',v=>v,true],
         ['Net +/-','net',v=>(v>=0?'+':'')+v,true],['Sessions','sessions',v=>v.toLocaleString(),true],['Attendance%','attRate',v=>v+'%',true]];

    /* per-column min/max for heatmap */
    const ranges = {}; cols.forEach(([,key]) => {
      const vals = data.map(d=>d.cur[key]); ranges[key] = { min:Math.min(...vals), max:Math.max(...vals) };
    });

    /* benchmark = ค่าเฉลี่ยต่อสาขา (additive หาร N · rate ใช้ค่ารวมบริษัทซึ่งเป็น weighted-avg อยู่แล้ว) */
    const ADDITIVE = ['revenue','students','net','sessions'];
    const benchmark = key => ADDITIVE.includes(key) ? Math.round(companyCur[key]/data.length) : companyCur[key];

    const rankBranches = [...data].sort((a,b)=>b.cur.revenue-a.cur.revenue);

    const headerCells = cols.map(([lbl])=>`<th style="text-align:right;padding:8px 12px">${lbl}</th>`).join('');
    const bodyRows = [...data].sort((a,b)=>b.cur[cols[0][1]]-a.cur[cols[0][1]]).map((d,i)=>`
      <tr>
        <td style="padding:8px 12px;font-weight:600">
          <span style="color:var(--md-on-surface-variant);font-size:11px">#${i+1}</span>
          <span class="text-primary" style="cursor:pointer;margin-left:6px" onclick="repDrillBranch('${d.b}')">${d.b}</span>
        </td>
        ${cols.map(([,key,fmt,goodUp])=>{
          const v = d.cur[key];
          return `<td style="text-align:right;padding:8px 12px;background:${heatBg(v,ranges[key].min,ranges[key].max)}">
            <div style="font-weight:600">${fmt(v)}</div>
            ${d.prev?`<div style="font-size:10px">${deltaTag(v,d.prev[key],dl,goodUp)}</div>`:''}
          </td>`;
        }).join('')}
      </tr>`).join('');

    const benchCells = cols.map(([,key,fmt])=>`<td style="text-align:right;padding:8px 12px;font-weight:700;color:var(--md-primary)">${fmt(benchmark(key))}</td>`).join('');

    /* ranking spotlight — เลือก metric ได้ (default = คอลัมน์แรกของชุดที่กำลังดู) */
    const rankCol = cols.find(c=>c[1]===compareRank) || cols[0];
    const rankKey = rankCol[1], rankFmt = rankCol[2], rankLbl = rankCol[0];
    const rankMax = Math.max(...data.map(d=>d.cur[rankKey]),1);
    const benchVal = benchmark(rankKey);
    const rankSelect = `<select class="tc-select" onchange="repSetRank(this.value)" style="margin-left:auto">
      ${cols.map(c=>`<option value="${c[1]}" ${c[1]===rankKey?'selected':''}>${c[0]}</option>`).join('')}</select>`;

    return `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <div style="font-size:13px;color:var(--md-on-surface-variant)">เทียบ ${br.length} สาขา · ${pr.label}</div>
      <label style="margin-left:auto;display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
        <input type="checkbox" ${perStudent?'checked':''} onchange="repTogglePerStudent(this.checked)"
          style="accent-color:var(--md-primary)"> Per-student / % (ดู "เก่ง" ไม่ใช่ "ใหญ่")
      </label>
    </div>

    <div class="card" style="margin-bottom:14px;overflow-x:auto">
      <table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="border-bottom:1px solid var(--md-outline-variant)">
          <th style="text-align:left;padding:8px 12px">สาขา</th>${headerCells}
        </tr></thead>
        <tbody>${bodyRows}
          <tr style="border-top:2px solid var(--md-outline-variant);background:var(--md-surface-mid)">
            <td style="padding:8px 12px;font-weight:700">${UI.icon('flag','sm')} ค่าเฉลี่ย/สาขา</td>${benchCells}
          </tr>
        </tbody>
      </table>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
      <div class="card"><div class="card-header" style="gap:8px"><div class="card-title">${UI.icon('leaderboard','sm')} อันดับ</div>${rankSelect}</div>
        <div class="card-body">
          ${rankBranches.sort((a,b)=>b.cur[rankKey]-a.cur[rankKey]).map(d=>
            barRow(d.b, rankFmt(d.cur[rankKey]), Math.round(d.cur[rankKey]/rankMax*100), { bench:Math.round(benchVal/rankMax*100), vw:84 })).join('')}
          <div class="text-muted" style="font-size:10px;margin-top:4px">เส้นแดง = ค่าเฉลี่ย/สาขา · เลือก metric ที่จะจัดอันดับได้ ↑</div>
        </div></div>

      <div class="card"><div class="card-header"><div class="card-title">${UI.icon('donut_small','sm')} สัดส่วน Revenue (contribution)</div></div>
        <div class="card-body" style="display:flex;align-items:center;gap:18px">
          ${donut(data.map((d,i)=>({label:d.b,value:d.cur.revenue,color:`hsl(${238 - i*26},70%,${60+i*4}%)`})), br.length, 'สาขา')}
          <div style="flex:1">
            ${[...data].sort((a,b)=>b.cur.revenue-a.cur.revenue).map((d,i)=>`<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;font-size:12px">
              <span style="width:10px;height:10px;border-radius:3px;background:hsl(${238 - i*26},70%,${60+i*4}%)"></span>
              <span style="flex:1">${d.b}</span><strong>${Math.round(d.cur.revenue/companyCur.revenue*100)}%</strong></div>`).join('')}
          </div>
        </div></div>
    </div>`;
  }

  /* shared: KPI card + monthly revenue series for a branch-set/period */
  function kpiCard(icon,label,val,curV,prevV,dl,goodUp) {
    return `<div class="card" style="padding:16px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="width:34px;height:34px;border-radius:9px;background:var(--md-primary-container);
          display:flex;align-items:center;justify-content:center;color:var(--md-primary)">${UI.icon(icon,'sm')}</span>
        <span class="text-muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em">${label}</span>
      </div>
      <div style="font-size:24px;font-weight:700">${val}</div>
      <div style="margin-top:2px">${prevV!=null?deltaTag(curV,prevV,dl,goodUp):'<span class="text-muted" style="font-size:11px">—</span>'}</div>
    </div>`;
  }
  function monthlySeries(br, pr, metric) {
    const months = []; let m = pr.s; while (m <= pr.e) { months.push(m); m = ymAdd(m,1); }
    return { months, values: months.map(ym => RD.aggregate(br, ym, ym)[metric]),
             labels: months.map(ym => MONTH_LABELS[parseInt(ym.split('-')[1])-1]) };
  }
  /* shared compact bar row: label │ bar(fill) │ value (ประหยัดแนวตั้งกว่า label-บน-bar) */
  function barRow(label, value, pct, opts) {
    opts = opts || {};
    const color = opts.color || 'var(--md-primary)';
    const lw = opts.lw || 104, vw = opts.vw || 104;
    const lab = opts.onclick
      ? `<span class="text-primary" style="cursor:pointer;width:${lw}px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" onclick="${opts.onclick}">${label}</span>`
      : `<span style="width:${lw}px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${label}</span>`;
    return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;font-size:13px">
      ${lab}
      <div style="flex:1;background:var(--md-surface-mid);border-radius:4px;height:7px;position:relative">
        <div style="background:${color};width:${Math.max(0,Math.min(100,pct))}%;height:7px;border-radius:4px"></div>
        ${opts.bench!=null?`<div title="benchmark" style="position:absolute;top:-2px;left:${Math.min(100,opts.bench)}%;width:2px;height:11px;background:var(--md-error)"></div>`:''}
      </div>
      <strong style="width:${vw}px;text-align:right;flex-shrink:0">${value}</strong>
    </div>`;
  }
  function branchBars(br, pr, metric, fmt) {
    const rows = br.map(b => ({ b, v:RD.aggregate([b], pr.s, pr.e)[metric] })).sort((a,b)=>b.v-a.v);
    const max = Math.max(...rows.map(r=>r.v),1);
    return rows.map(r => barRow(r.b, fmt(r.v), Math.round(r.v/max*100), { onclick:`repDrillBranch('${r.b}')` })).join('');
  }

  /* ── FINANCIAL ────────────────────────────────────────── */
  function buildFinancial() {
    const br = scopeBranches(), pr = periodRange(periodKey), cmp = compareRange(pr, compareKey);
    const cur = RD.aggregate(br, pr.s, pr.e), prev = cmp ? RD.aggregate(br, cmp.s, cmp.e) : null;
    const dl = deltaLabel(pr.gran, compareKey);
    const s = monthlySeries(br, pr, 'revenue');
    const cmpVals = cmp ? s.months.map(ym => RD.aggregate(br, ymAdd(ym, compareKey==='yoy'?-12:-ymLen(pr.s,pr.e)), ymAdd(ym, compareKey==='yoy'?-12:-ymLen(pr.s,pr.e))).revenue) : null;

    /* Family LTV (จากข้อมูลจริง DB.invoices/families) */
    const fam = (DB.families||[]).map(f => {
      const invs = (DB.invoices||[]).filter(i => i.familyId === f.id);
      const spend = invs.reduce((a,i)=>a+(i.amount||0),0);
      const since = invs.map(i=>i.date).filter(Boolean).sort()[0];
      const kids  = (DB.students||[]).filter(st=>st.familyId===f.id).length;
      const months = since ? ymLen(since.slice(0,7), NOW) : 0;
      return { name:f.name, spend, since, kids, n:invs.length, months };
    }).filter(f=>f.spend>0).sort((a,b)=>b.spend-a.spend).slice(0,8);

    return `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px">
      ${kpiCard('payments','Revenue',fmtMoney(cur.revenue),cur.revenue,prev?.revenue,dl)}
      ${kpiCard('account_balance_wallet','Outstanding (ค้างจ่าย)',fmtMoney(cur.outstanding),cur.outstanding,prev?.outstanding,dl,false)}
      ${kpiCard('sell','Discount ที่ให้',fmtMoney(cur.discount),cur.discount,prev?.discount,dl,false)}
      ${kpiCard('person','ARPU (ต่อนักเรียน)',fmtMoney(cur.arpu),cur.arpu,prev?.arpu,dl)}
    </div>
    <div style="display:grid;grid-template-columns:1.6fr 1fr;gap:14px;margin-bottom:14px">
      <div class="card"><div class="card-header"><div class="card-title">${UI.icon('payments','sm')} Revenue trend · ${pr.label}</div></div>
        <div class="card-body">${groupedBar(s.values, cmpVals, s.labels)}</div></div>
      <div class="card"><div class="card-header"><div class="card-title">${UI.icon('store','sm')} Revenue by Branch</div></div>
        <div class="card-body">${branchBars(br, pr, 'revenue', fmtMoney)}</div></div>
    </div>
    <div class="card"><div class="card-header"><div class="card-title">${UI.icon('diversity_3','sm')} Top Families (Loyalty / LTV)</div></div>
      <div class="card-body" style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">
        <thead><tr style="border-bottom:1px solid var(--md-outline-variant)">
          <th style="text-align:left;padding:8px 12px">Family</th>
          <th style="text-align:right;padding:8px 12px">Total spend</th>
          <th style="text-align:right;padding:8px 12px">Invoices</th>
          <th style="text-align:right;padding:8px 12px">Students</th>
          <th style="text-align:right;padding:8px 12px">Tenure</th>
        </tr></thead><tbody>
        ${fam.map((f,i)=>`<tr>
          <td style="padding:8px 12px"><span style="color:var(--md-on-surface-variant);font-size:11px">#${i+1}</span> <strong>${f.name}</strong></td>
          <td style="text-align:right;padding:8px 12px;font-weight:600">${fmtMoney(f.spend)}</td>
          <td style="text-align:right;padding:8px 12px">${f.n}</td>
          <td style="text-align:right;padding:8px 12px">${f.kids}</td>
          <td style="text-align:right;padding:8px 12px">${f.months} mo</td>
        </tr>`).join('')}
        </tbody></table></div></div>`;
  }

  /* ── STUDENTS / RETENTION ─────────────────────────────── */
  function buildStudents2() {
    const br = scopeBranches(), pr = periodRange(periodKey), cmp = compareRange(pr, compareKey);
    const cur = RD.aggregate(br, pr.s, pr.e), prev = cmp ? RD.aggregate(br, cmp.s, cmp.e) : null;
    const dl = deltaLabel(pr.gran, compareKey);

    /* net adds — flow ล้วน (New/Churn รวมตลอด period) ไม่ปน stock snapshot */
    const flowMax = Math.max(cur.newStudents, cur.churn, 1);
    const bar = (label,val,color,pct)=>`<div style="margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;font-size:13px"><span>${label}</span><strong style="color:${color}">${val}</strong></div>
      <div style="background:var(--md-surface-mid);border-radius:4px;height:8px;margin-top:3px">
        <div style="background:${color};width:${pct}%;height:8px;border-radius:4px"></div></div></div>`;

    /* monthly new vs churn */
    const sNew = monthlySeries(br, pr, 'newStudents'), sChurn = monthlySeries(br, pr, 'churn');

    /* cohort retention (model) */
    const curve = [100,89,81,75,70,66];
    const cohorts = [];
    for (let c=0;c<6;c++){ const start=ymAdd(NOW,-(5-c)); const rr=rng('coh'+start);
      cohorts.push({ ym:start, vals: curve.map((v,i)=> i<=(5-c) ? Math.min(100, Math.round(v*(0.95+rr()*0.08))) : null) }); }

    return `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px">
      ${kpiCard('school','Active students',cur.students,cur.students,prev?.students,dl)}
      ${kpiCard('person_add','New',cur.newStudents,cur.newStudents,prev?.newStudents,dl)}
      ${kpiCard('person_off','Churn (lost+pause)',cur.churn,cur.churn,prev?.churn,dl,false)}
      ${kpiCard('autorenew','Retention',`${cur.retention}%`,cur.retention,prev?.retention,dl)}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div class="card"><div class="card-header"><div class="card-title">${UI.icon('trending_up','sm')} Net growth · ${pr.label}</div></div>
        <div class="card-body">
          ${barRow('+ New (เข้าใหม่)', '+'+cur.newStudents, Math.round(cur.newStudents/flowMax*100), { color:'var(--md-success)', lw:120 })}
          ${barRow('− Churn (ออก)', '−'+cur.churn, Math.round(cur.churn/flowMax*100), { color:'var(--md-error)', lw:120 })}
          <div style="border-top:1px solid var(--md-outline-variant);margin-top:8px;padding-top:8px;font-size:14px;display:flex;justify-content:space-between">
            <span style="font-weight:600">Net adds</span><strong style="color:${cur.net>=0?'var(--md-success)':'var(--md-error)'}">${cur.net>=0?'+':''}${cur.net}</strong></div>
          <div class="text-muted" style="font-size:10px;margin-top:4px">รวมตลอด ${pr.label} · เทียบ ${dl} ${prev?`(${deltaPct(cur.net,prev.net)>=0?'+':''}${deltaPct(cur.net,prev.net)}%)`:''}</div>
        </div></div>
      <div class="card"><div class="card-header"><div class="card-title">${UI.icon('person_off','sm')} Churn split</div></div>
        <div class="card-body" style="display:flex;align-items:center;gap:18px">
          ${donut([{label:'Lost',value:cur.lost,color:'var(--md-error)'},{label:'Paused',value:cur.paused,color:'var(--md-warning)'}], cur.churn, 'Churn')}
          <div style="flex:1">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;font-size:13px"><span style="width:10px;height:10px;border-radius:3px;background:var(--md-error)"></span><span style="flex:1">Lost (ลาออก)</span><strong>${cur.lost}</strong></div>
            <div style="display:flex;align-items:center;gap:8px;font-size:13px"><span style="width:10px;height:10px;border-radius:3px;background:var(--md-warning)"></span><span style="flex:1">Paused (พักชั่วคราว)</span><strong>${cur.paused}</strong></div>
          </div>
        </div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1.4fr;gap:14px">
      <div class="card"><div class="card-header"><div class="card-title">${UI.icon('autorenew','sm')} Retention by Branch</div></div>
        <div class="card-body">${branchBars(br, pr, 'retention', v=>v+'%')}</div></div>
      <div class="card"><div class="card-header"><div class="card-title">${UI.icon('grid_on','sm')} Cohort retention <span class="text-muted" style="font-size:11px">(model)</span></div></div>
        <div class="card-body" style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px;text-align:center">
          <thead><tr><th style="text-align:left;padding:5px 8px">Cohort</th>${['M0','M1','M2','M3','M4','M5'].map(h=>`<th style="padding:5px 8px">${h}</th>`).join('')}</tr></thead>
          <tbody>${cohorts.map(c=>`<tr>
            <td style="text-align:left;padding:5px 8px;color:var(--md-on-surface-variant)">${c.ym}</td>
            ${c.vals.map(v=> v==null?`<td style="padding:5px 8px"></td>`:`<td style="padding:5px 8px;background:rgba(99,102,241,${(0.05+v/100*0.3).toFixed(2)});border-radius:3px">${v}%</td>`).join('')}
          </tr>`).join('')}</tbody>
        </table>
        <div class="text-muted" style="font-size:10px;margin-top:6px">% นักเรียนที่ยังอยู่ หลังสมัครครบ N เดือน</div>
        </div></div>
    </div>`;
  }

  /* ── ACQUISITION (CRM) ────────────────────────────────── */
  function buildAcquisition() {
    const br = scopeBranches(), pr = periodRange(periodKey), cmp = compareRange(pr, compareKey);
    const cur = RD.aggregate(br, pr.s, pr.e), prev = cmp ? RD.aggregate(br, cmp.s, cmp.e) : null;
    const dl = deltaLabel(pr.gran, compareKey);
    const rr = rng('acq' + pr.s + br.join());

    const SRC = [['Line OA',0.34],['Referral',0.24],['Website',0.18],['Walk-in',0.14],['Facebook',0.10]];
    const sources = SRC.map(([name,w]) => {
      const leads = Math.round(cur.leads * w * (0.88 + rr()*0.24));
      const conv  = Math.round(leads * (0.20 + rr()*0.24));
      return { name, leads, conv, rate: leads ? Math.round(conv/leads*100) : 0 };
    }).sort((a,b)=>b.leads-a.leads);
    const maxLeads = Math.max(...sources.map(s=>s.leads),1);

    const stages = [['Leads',cur.leads],['Contacted',Math.round(cur.leads*0.78)],
      ['Tested',Math.round(cur.leads*0.54)],['Trial',Math.round(cur.leads*0.39)],['Enrolled',cur.conversions]];
    const velDays = 8 + Math.round(rr()*7);

    return `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px">
      ${kpiCard('person_search','Leads',cur.leads,cur.leads,prev?.leads,dl)}
      ${kpiCard('swap_horiz','Conversion',`${cur.convRate}%`,cur.convRate,prev?.convRate,dl)}
      ${kpiCard('groups','New customers',cur.conversions,cur.conversions,prev?.conversions,dl)}
      ${kpiCard('schedule','Avg lead→customer',`${velDays} วัน`,velDays,prev?velDays+2:null,dl,false)}
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div class="card"><div class="card-header"><div class="card-title">${UI.icon('campaign','sm')} รู้จักเราผ่านช่องทางไหน <span class="text-muted" style="font-size:11px">(model)</span></div></div>
        <div class="card-body">
          ${sources.map(s=>barRow(s.name, `${s.leads} · ${s.rate}%`, Math.round(s.leads/maxLeads*100), { vw:96 })).join('')}
        </div></div>
      <div class="card"><div class="card-header"><div class="card-title">${UI.icon('filter_alt','sm')} Funnel · Lead → Customer</div></div>
        <div class="card-body">
          ${stages.map((st,i)=>{ const pct=Math.round(st[1]/(stages[0][1]||1)*100);
            const drop = i>0 ? Math.round((1-st[1]/(stages[i-1][1]||1))*100) : 0;
            return `<div style="margin-bottom:10px">
              <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px">
                <span>${st[0]}</span><span><strong>${st[1]}</strong> ${i>0?`<span class="text-muted" style="font-size:11px">−${drop}%</span>`:''}</span></div>
              <div style="background:var(--md-surface-mid);border-radius:4px;height:10px">
                <div style="background:${i===stages.length-1?'var(--md-success)':'var(--md-primary)'};width:${pct}%;height:10px;border-radius:4px"></div></div></div>`;
          }).join('')}
        </div></div>
    </div>`;
  }

  /* ── COURSES (course/bundle/package) ──────────────────── */
  function buildCourses() {
    const br = scopeBranches(), pr = periodRange(periodKey);
    const cur = RD.aggregate(br, pr.s, pr.e);
    const rr = rng('crs' + pr.s + br.join());
    const unitsTotal = cur.newStudents + cur.renewals;

    /* Package popularity — units vs value */
    const TIERS = [['24h',0.40,7200],['48h',0.25,14400],['72h',0.17,21600],['96h',0.18,28800]];
    const pkgs = TIERS.map(([name,w,price]) => {
      const units = Math.round(unitsTotal * w * (0.9 + rr()*0.2));
      return { name, units, revenue: units*price };
    });
    const pkgUnitMax = Math.max(...pkgs.map(p=>p.units),1);
    const pkgRevMax  = Math.max(...pkgs.map(p=>p.revenue),1);
    const pkgRevTot  = pkgs.reduce((s,p)=>s+p.revenue,0)||1;

    /* Subject revenue (model) + bundle allocation note */
    const SUBJ = [['Math',0.30],['Eng (Active)',0.25],['Science',0.18],['Eng',0.15],['Thai',0.07],['Eng (Grammar)',0.05]];
    const subjRev = SUBJ.map(([name,w])=>({ name, rev:Math.round(cur.revenue*w*(0.92+rr()*0.16)/1000)*1000 })).sort((a,b)=>b.rev-a.rev);
    const subjMax = Math.max(...subjRev.map(s=>s.rev),1);

    /* Package × Grade-level cross-tab (units) */
    const GRADES = ['ป.4','ป.5','ป.6','ม.1'];
    const grid = GRADES.map(g => ({ g, cells: TIERS.map(([t]) => Math.round(unitsTotal/GRADES.length * (0.05+rr()*0.5))) }));
    const gridMax = Math.max(...grid.flatMap(r=>r.cells),1);

    return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div class="card"><div class="card-header"><div class="card-title">${UI.icon('inventory_2','sm')} Package ขายดี — Volume vs Value</div></div>
        <div class="card-body"><table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="border-bottom:1px solid var(--md-outline-variant)">
            <th style="text-align:left;padding:6px 10px">Package</th><th style="text-align:right;padding:6px 10px">Units</th>
            <th style="text-align:right;padding:6px 10px">Revenue</th><th style="text-align:right;padding:6px 10px">% mix</th></tr></thead>
          <tbody>${pkgs.map(p=>`<tr>
            <td style="padding:6px 10px;font-weight:600">${p.name}</td>
            <td style="text-align:right;padding:6px 10px;background:${heatBg(p.units,0,pkgUnitMax)}">${p.units}</td>
            <td style="text-align:right;padding:6px 10px;background:${heatBg(p.revenue,0,pkgRevMax)}">${fmtMoney(p.revenue)}</td>
            <td style="text-align:right;padding:6px 10px">${Math.round(p.revenue/pkgRevTot*100)}%</td></tr>`).join('')}
          </tbody></table>
          <div class="text-muted" style="font-size:10px;margin-top:6px">ก้อนเล็กขายเยอะ(units) · ก้อนใหญ่ทำเงินสุด(value) → ใช้เลือกขนาด package ตอนออกคอร์ส</div>
        </div></div>
      <div class="card"><div class="card-header"><div class="card-title">${UI.icon('menu_book','sm')} Subject engine (revenue) <span class="text-muted" style="font-size:11px">(รวม bundle เกลี่ยตามชั่วโมง)</span></div></div>
        <div class="card-body">
          ${subjRev.map(s=>barRow(s.name, fmtMoney(s.rev), Math.round(s.rev/subjMax*100), { lw:96 })).join('')}
          <div class="text-muted" style="font-size:10px;margin-top:4px">เช่น Bundle ม.1 (13,300฿ · Math+Eng+Science อย่างละ 8h) → เกลี่ยวิชาละ ~4,433฿</div>
        </div></div>
    </div>
    <div class="card"><div class="card-header"><div class="card-title">${UI.icon('grid_on','sm')} Package × Grade — ขนาดไหนขายดีกับเกรดไหน (units)</div></div>
      <div class="card-body" style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px;text-align:center">
        <thead><tr><th style="text-align:left;padding:6px 10px">Grade \\ Package</th>${TIERS.map(([t])=>`<th style="padding:6px 10px">${t}</th>`).join('')}</tr></thead>
        <tbody>${grid.map(r=>`<tr><td style="text-align:left;padding:6px 10px;font-weight:600">${r.g}</td>
          ${r.cells.map(v=>`<td style="padding:6px 10px;background:${heatBg(v,0,gridMax)};border-radius:3px">${v}</td>`).join('')}</tr>`).join('')}
        </tbody></table></div></div>`;
  }

  /* ── OPERATIONS ───────────────────────────────────────── */
  let opSubject = '', opGrade = '';
  function buildOperations() {
    const br = scopeBranches(), pr = periodRange(periodKey);

    /* teacher health — effectiveLoad จาก live sessions (Σ students/คลาส/สัปดาห์) */
    const load = {};
    DB.sessions.forEach(s => s.teacher.split(',').map(t=>t.trim()).forEach(t => {
      load[t] = (load[t]||0) + (s.studentNames?.length || 0);
    }));
    const teachers = Object.entries(load).sort((a,b)=>b[1]-a[1]);
    const loadMax = Math.max(...teachers.map(t=>t[1]),1);
    const band = v => v>30 ? ['Danger','var(--md-error)'] : v>20 ? ['Warning','var(--md-warning)'] : ['Healthy','var(--md-success)'];
    const dist = { Healthy:0, Warning:0, Danger:0 };
    teachers.forEach(([,v]) => dist[band(v)[0]]++);

    /* demand heatmap จาก live sessions: dow × slot, ผลรวม students */
    const SLOTS = Object.keys(CONST.SLOT_HOURS);
    const DOW = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const cells = {};
    DB.sessions.forEach(s => {
      if (opSubject && s.subject !== opSubject) return;
      if (opGrade && s.grade !== opGrade) return;
      const [y,m,d] = s.date.split('-').map(Number);
      const g = new Date(y,m-1,d).getDay(); const dow = g===0?'Sun':DOW[g-1];
      const k = `${s.slotId}|${dow}`;
      cells[k] = (cells[k]||0) + (s.studentNames?.length||0);
    });
    const cellMax = Math.max(...Object.values(cells),1);
    const subjOpts = Utils.subjectsFor();

    /* utilization by branch from RD */
    return `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px">
      <div class="card"><div class="card-header"><div class="card-title">${UI.icon('groups','sm')} Teacher health (effectiveLoad)</div></div>
        <div class="card-body">
          <div style="display:flex;gap:8px;margin-bottom:12px">
            ${Object.entries(dist).map(([k,n])=>{ const c=k==='Danger'?'var(--md-error)':k==='Warning'?'var(--md-warning)':'var(--md-success)';
              return `<div style="flex:1;text-align:center;padding:8px;border-radius:8px;background:var(--md-surface-mid)">
                <div style="font-size:20px;font-weight:700;color:${c}">${n}</div><div style="font-size:11px;color:var(--md-on-surface-variant)">${k}</div></div>`;}).join('')}
          </div>
          ${teachers.map(([t,v])=>{ const [lbl,c]=band(v);
            return barRow(t, `${v} · ${lbl}`, Math.round(v/loadMax*100), { color:c, vw:118 }); }).join('')}
        </div></div>
      <div class="card"><div class="card-header"><div class="card-title">${UI.icon('store','sm')} Utilization by Branch</div></div>
        <div class="card-body">${branchBars(br, pr, 'utilization', v=>v+'%')}
          <div class="text-muted" style="font-size:10px;margin-top:4px">นักเรียน ÷ capacity (room×slot×วัน)</div></div></div>
    </div>
    <div class="card"><div class="card-header" style="flex-wrap:wrap;gap:8px">
        <div class="card-title">${UI.icon('local_fire_department','sm')} Demand Heatmap · วัน × เวลา (จำนวนนักเรียน)</div>
        <div style="display:flex;gap:6px;margin-left:auto">
          <select class="tc-select" onchange="repOpFilter('subject',this.value)">
            <option value="">ทุกวิชา</option>${subjOpts.map(s=>`<option ${opSubject===s?'selected':''}>${s}</option>`).join('')}</select>
          <select class="tc-select" onchange="repOpFilter('grade',this.value)">
            <option value="">ทุกเกรด</option>${CONST.GRADES.map(g=>`<option ${opGrade===g?'selected':''}>${g}</option>`).join('')}</select>
        </div></div>
      <div class="card-body" style="overflow-x:auto">
        <table style="border-collapse:collapse;font-size:12px;text-align:center;width:100%">
          <thead><tr><th style="padding:5px 8px"></th>${DOW.map(d=>`<th style="padding:5px 8px">${d}</th>`).join('')}</tr></thead>
          <tbody>${SLOTS.map(sl=>{ const sh=CONST.SLOT_HOURS[sl];
            return `<tr><td style="text-align:left;padding:5px 8px;color:var(--md-on-surface-variant);white-space:nowrap">${sh.s}–${sh.e}</td>
              ${DOW.map(d=>{ const v=cells[`${sl}|${d}`]||0;
                return `<td title="${d} ${sh.s}: ${v} students" style="padding:8px;background:${v?`rgba(239,68,68,${(0.12+v/cellMax*0.6).toFixed(2)})`:'transparent'};border-radius:4px;font-weight:${v?'600':'400'};color:${v?'var(--md-on-surface)':'var(--md-outline)'}">${v||'·'}</td>`;}).join('')}</tr>`;}).join('')}
          </tbody></table>
        <div class="text-muted" style="font-size:10px;margin-top:6px">สีเข้ม = traffic เยอะ → วัน/เวลาที่ต้องเตรียมครู+ห้องมากสุด</div>
      </div></div>`;
  }
  window.repOpFilter = function(key,val){ if(key==='subject')opSubject=val; if(key==='grade')opGrade=val; render(); };

  /* ── NEEDS ATTENTION ──────────────────────────────────── */
  function collectAlerts() {
    const br = scopeBranches(), pr = periodRange(periodKey);
    const company = RD.aggregate(br, pr.s, pr.e);
    const avgRev = company.revenue / br.length;
    const alerts = [];

    br.forEach(b => {
      const a = RD.aggregate([b], pr.s, pr.e);
      if (a.revenue < avgRev * 0.7) alerts.push({ ic:'trending_down', c:'var(--md-error)', t:`${b} revenue ต่ำกว่าค่าเฉลี่ย ${Math.round((1-a.revenue/avgRev)*100)}%` });
      if (a.attRate < 78)           alerts.push({ ic:'event_busy', c:'var(--md-warning)', t:`${b} attendance ${a.attRate}% (ต่ำกว่าเป้า 80%)` });
      if (a.outstanding > a.revenue*0.12) alerts.push({ ic:'account_balance_wallet', c:'var(--md-warning)', t:`${b} ค้างจ่าย ${fmtMoney(a.outstanding)} สูง` });
    });
    const atRisk = (DB.students||[]).filter(s => s.status==='renewal').length;
    if (atRisk) alerts.push({ ic:'warning', c:'var(--md-error)', t:`${atRisk} นักเรียนใกล้หมดชั่วโมง (renewal) — ติดตามด่วน` });
    const load = {};
    DB.sessions.forEach(s => s.teacher.split(',').map(t=>t.trim()).forEach(t => load[t]=(load[t]||0)+(s.studentNames?.length||0)));
    Object.entries(load).filter(([,v])=>v>30).forEach(([t,v]) => alerts.push({ ic:'groups', c:'var(--md-error)', t:`${t} load ${v} (danger zone)` }));
    return alerts;
  }

  /* KPI card สำหรับ Needs Attention — โชว์จำนวน + กดเปิด modal */
  function attentionCard() {
    const n = collectAlerts().length;
    const c = n ? 'var(--md-error)' : 'var(--md-success)';
    return `<div class="card" style="padding:16px;cursor:pointer;border-left:3px solid ${c}"
      onclick="repShowAlerts()" title="กดเพื่อดูรายละเอียด">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <span style="width:34px;height:34px;border-radius:9px;background:${n?'var(--md-error-container)':'var(--md-success-container)'};
          display:flex;align-items:center;justify-content:center;color:${c}">${UI.icon('priority_high','sm')}</span>
        <span class="text-muted" style="font-size:11px;text-transform:uppercase;letter-spacing:.04em">Needs Attention</span>
      </div>
      <div style="font-size:24px;font-weight:700;color:${c}">${n}</div>
      <div style="margin-top:2px;font-size:11px" class="${n?'text-primary':'text-muted'}">${n?'กดเพื่อดูรายละเอียด →':'ทุกอย่างปกติ'}</div>
    </div>`;
  }

  window.repShowAlerts = function () {
    const a = collectAlerts();
    const body = a.length
      ? `<div style="display:flex;flex-direction:column;gap:8px">
          ${a.map(x=>`<div style="display:flex;align-items:flex-start;gap:10px;font-size:13px;padding:10px 12px;background:var(--md-surface-mid);border-radius:8px">
            <span style="color:${x.c};flex-shrink:0;margin-top:1px">${UI.icon(x.ic,'sm')}</span><span>${x.t}</span></div>`).join('')}</div>`
      : UI.emptyState('check_circle','ไม่มีรายการที่ต้องสนใจ','ทุกอย่างปกติดี');
    Modal.create('modal-rep-alerts', `${UI.icon('priority_high')} Needs Attention (${a.length})`, body,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-rep-alerts')">ปิด</button>`);
  };

  /* ── RENDER ───────────────────────────────────────────── */
  function render() {
    const pr = periodRange(periodKey);
    const cmp = compareRange(pr, compareKey);
    const sub = document.getElementById('rep-sub');
    if (sub) sub.textContent = `${scopeLabel()} · ${pr.label}`;
    const rl = document.getElementById('rep-range-label');
    if (rl) rl.textContent = `${pr.s} → ${pr.e}` + (cmp?`  vs  ${cmp.s} → ${cmp.e}`:'');

    const body = document.getElementById('rep-body');
    if (!body) return;
    /* compare mode (จาก scope) → Overview กลายเป็น leaderboard เทียบสาขา */
    if (isCompareMode() && activeTab === 'overview') { body.innerHTML = buildCompare(); return; }
    if (activeTab === 'overview')        body.innerHTML = buildOverview();
    else if (activeTab === 'compare')    body.innerHTML = buildCompare();
    else if (activeTab === 'financial')  body.innerHTML = buildFinancial();
    else if (activeTab === 'students')   body.innerHTML = buildStudents2();
    else if (activeTab === 'acquisition')body.innerHTML = buildAcquisition();
    else if (activeTab === 'courses')    body.innerHTML = buildCourses();
    else if (activeTab === 'operations') body.innerHTML = buildOperations();
  }

  window.reportTab = function (tab, el) {
    activeTab = tab;
    document.querySelectorAll('#view-reports .tab').forEach(t=>t.classList.remove('active'));
    if (el) el.classList.add('active');
    render();
  };
  window.repSet = function (key, val) {
    if (key === 'period')  periodKey = val;
    if (key === 'compare') compareKey = val;
    render();
  };
  window.repSetScope = function (val) {
    const [kind, key] = val.split(':');
    scope = { kind, key: key || '' };
    render();
  };
  window.repTogglePerStudent = function (on) { perStudent = on; compareRank = ''; render(); };
  window.repSetRank = function (k) { compareRank = k; render(); };
  window.repDrillBranch = function (b) {
    scope = { kind:'branch', key:b };
    const sel = document.getElementById('rep-scope'); if (sel) sel.value = `branch:${b}`;
    reportTab('overview', document.querySelector('#view-reports .tab'));
  };

  /* ── INIT ─────────────────────────────────────────────── */
  render();

})();
