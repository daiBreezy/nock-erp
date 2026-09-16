/* ============================================================
   fin-reports.js — Finance ▸ Reports
   Branch comparison · income vs outcome (by month) · category mix
   · recurring forecast. Reads DB.expenses via FIN (scope-aware).
   ============================================================ */
(function () {

  const U = () => window.CURRENT_USER;
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const inflow = e => e.type === 'received' || e.type === 'income';
  let period = 'all';

  const COLORS = { blue:'#6366f1', green:'#10b981', orange:'#f97316', purple:'#8b5cf6',
                   teal:'#14b8a6', yellow:'#f59e0b', gray:'#9ca3af', red:'#ef4444' };
  function fmtK(n){ const neg=n<0; n=Math.abs(n);
    const s=n>=1e6?`฿${(n/1e6).toFixed(2)}M`:n>=1e3?`฿${Math.round(n/1e3)}K`:`฿${Math.round(n)}`; return neg?'−'+s:s; }
  function monthLabel(ym){ const [y,m]=ym.split('-').map(Number); return `${MONTHS[m-1]} ${String(y).slice(2)}`; }

  /* horizontal bar row */
  function barRow(label, value, max, color, valTxt) {
    const pct = max>0 ? Math.max(2, Math.round(value/max*100)) : 0;
    return `<div style="display:flex;align-items:center;gap:10px;padding:5px 0">
      <div style="width:120px;flex-shrink:0;font-size:var(--fs-label-md);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${label}</div>
      <div style="flex:1;background:var(--md-surface-mid);border-radius:6px;height:18px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${color||COLORS.blue};border-radius:6px"></div></div>
      <div style="width:84px;text-align:right;font-weight:600;font-size:var(--fs-label-md)">${valTxt!=null?valTxt:fmtK(value)}</div>
    </div>`;
  }

  function scopedEntries() {
    const vb = FIN.visibleBranches(U());
    let list = DB.expenses.filter(e => e.status!=='inactive' && vb.includes(e.branch));
    if (period !== 'all') list = list.filter(e => e.date.slice(0,7) === period);
    return list;
  }
  function monthsPresent() {
    const set = {};
    DB.expenses.forEach(e => { set[e.date.slice(0,7)] = 1; });
    return Object.keys(set).sort();
  }

  function render() {
    const vb = FIN.visibleBranches(U());
    const ent = scopedEntries();
    const out = ent.filter(e=>!inflow(e)).reduce((s,e)=>s+e.amount,0);
    const inc = ent.filter(e=>inflow(e)).reduce((s,e)=>s+e.amount,0);

    /* branch comparison */
    const byBranch = {};
    vb.forEach(b => byBranch[b] = { out:0, inc:0 });
    ent.forEach(e => { if(!byBranch[e.branch]) byBranch[e.branch]={out:0,inc:0};
      if (inflow(e)) byBranch[e.branch].inc += e.amount; else byBranch[e.branch].out += e.amount; });
    const branchRows = Object.keys(byBranch).sort((a,b)=>byBranch[b].out-byBranch[a].out);
    const maxBranch = Math.max(1, ...branchRows.map(b=>byBranch[b].out));
    const branchTable = branchRows.map(b => {
      const d = byBranch[b]; const net = d.inc - d.out;
      return `<tr>
        <td style="font-weight:500">${b}</td>
        <td style="text-align:right" class="text-error">−${Utils.currency(d.out)}</td>
        <td style="text-align:right" class="text-success">+${Utils.currency(d.inc)}</td>
        <td style="text-align:right;font-weight:600" class="${net<0?'text-error':'text-success'}">${net<0?'−':'+'}${Utils.currency(Math.abs(net))}</td>
        <td style="width:160px"><div style="background:var(--md-surface-mid);border-radius:6px;height:16px;overflow:hidden">
          <div style="width:${Math.max(2,Math.round(d.out/maxBranch*100))}%;height:100%;background:${COLORS.red};border-radius:6px"></div></div></td>
      </tr>`;
    }).join('');

    /* income vs outcome by month */
    const months = monthsPresent();
    const mData = months.map(ym => {
      const g = DB.expenses.filter(e=>e.status!=='inactive'&&vb.includes(e.branch)&&e.date.slice(0,7)===ym);
      return { ym, out:g.filter(e=>!inflow(e)).reduce((s,e)=>s+e.amount,0), inc:g.filter(e=>inflow(e)).reduce((s,e)=>s+e.amount,0) };
    });
    const maxM = Math.max(1, ...mData.map(m=>Math.max(m.out,m.inc)));
    const ivo = mData.map(m => `
      <div style="padding:6px 0">
        <div style="font-size:var(--fs-label-md);font-weight:600;margin-bottom:3px">${monthLabel(m.ym)}</div>
        ${barRow('Out', m.out, maxM, COLORS.red)}
        ${barRow('In',  m.inc, maxM, COLORS.green)}
      </div>`).join('');

    /* category mix (outflow only) */
    const byCat = {};
    ent.filter(e=>!inflow(e)).forEach(e => { byCat[e.category]=(byCat[e.category]||0)+e.amount; });
    const catRows = Object.keys(byCat).sort((a,b)=>byCat[b]-byCat[a]);
    const maxCat = Math.max(1, ...catRows.map(c=>byCat[c]));
    const catBars = catRows.map(c => { const m=FIN.CAT_MAP[c];
      return barRow(m?m.short:c, byCat[c], maxCat, COLORS[m?m.color:'gray']); }).join('')
      || `<div class="text-muted" style="padding:8px 0">No spend in this period</div>`;

    /* forecast */
    const fc = FIN.forecast(U(), 3);
    const fcTotal = fc.reduce((s,r)=>s+r.total,0);

    const periodChips = [{k:'all',l:'All'}].concat(months.map(m=>({k:m,l:monthLabel(m)})))
      .map(o=>`<div class="filter-chip ${period===o.k?'active':''}" onclick="frpPeriod('${o.k}')">${o.l}</div>`).join('');

    document.getElementById('view-fin-reports').innerHTML = `
      ${UI.pageHeader('Finance Reports', `${vb.length} branch(es) · ${period==='all'?'all periods':monthLabel(period)}`)}
      <div class="filter-bar">${periodChips}</div>
      <div id="frp-kpi" style="margin-top:var(--sp-2)"></div>

      <div class="card-grid" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:var(--sp-3);align-items:start">
        <div class="card"><div style="padding:var(--sp-4)">
          ${UI.sectionTitle(`${UI.icon('leaderboard','sm')} Branch comparison`)}
          <div style="overflow-x:auto"><table style="margin:0">
            <thead><tr><th>Branch</th><th style="text-align:right">Spend</th><th style="text-align:right">Income</th><th style="text-align:right">Net</th><th>Spend bar</th></tr></thead>
            <tbody>${branchTable||'<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--md-on-surface-variant)">No data</td></tr>'}</tbody>
          </table></div>
        </div></div>

        <div class="card"><div style="padding:var(--sp-4)">
          ${UI.sectionTitle(`${UI.icon('bar_chart','sm')} Income vs Outcome (by month)`)}
          ${ivo}
        </div></div>

        <div class="card"><div style="padding:var(--sp-4)">
          ${UI.sectionTitle(`${UI.icon('donut_small','sm')} Spend by category`)}
          ${catBars}
        </div></div>

        <div class="card"><div style="padding:var(--sp-4)">
          ${UI.sectionTitle(`${UI.icon('trending_up','sm')} Recurring forecast (3 mo)`, `<b>${Utils.currency(fcTotal)}</b>`)}
          ${fc.map(r=>barRow(monthLabel(r.ym), r.total, Math.max(...fc.map(x=>x.total)), COLORS.purple, Utils.currency(r.total))).join('')}
          <div class="text-muted" style="font-size:var(--fs-label-sm);margin-top:6px">Projected fixed costs (salary + rent + utilities).</div>
        </div></div>
      </div>`;

    const kel = document.getElementById('frp-kpi');
    kel.innerHTML = UI.kpiGrid([
      { icon:'trending_down', label:'Total Spend', value:fmtK(out), color: out?'error':'', sub: period==='all'?'All periods':monthLabel(period) },
      { icon:'trending_up', label:'Total Income', value:fmtK(inc), color:'success', sub:'Non-invoice in' },
      { icon:'account_balance_wallet', label:'Net', value:fmtK(inc-out), color: (inc-out)<0?'error':'success', sub:'Income − spend' },
      { icon:'store', label:'Branches', value:vb.length, color:'tertiary', sub:'In your scope' },
    ]);
    const g = kel.querySelector('.kpi-grid'); if (g) g.style.gridTemplateColumns = 'repeat(4,1fr)';
  }

  render();
  window._refreshFinReports = render;
  window.frpPeriod = function (k) { period = k; render(); };

})();
