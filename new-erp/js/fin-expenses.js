/* ============================================================
   fin-expenses.js — Finance ▸ Expenses (historical ledger — ONLY)
   Purpose: find/scan settled records. No approval workflow here —
   that's js/fin-requests.js. Record Usage stays here because it's
   an instant log-and-done action, not an operational request.
   ============================================================ */
(function () {

  const U = () => window.CURRENT_USER;
  let fSource='all', fBranch='all', fStatus='all', fCat='all', search='';

  const MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const inflow = e => e.type==='received' || e.type==='income';
  const sourceBadge = s => s==='central' ? `<span class="text-primary" style="font-weight:600">Central</span>` : `<span class="text-muted">Petty</span>`;
  const catBadge = id => { const c=FIN.CAT_MAP[id]; return UI.badge(c?c.short:id, c?c.color:'gray'); };
  function fmtK(n){ const g=n<0;n=Math.abs(n); const s=n>=1e6?`฿${(n/1e6).toFixed(2)}M`:n>=1e3?`฿${Math.round(n/1e3)}K`:`฿${Math.round(n)}`; return g?'−'+s:s; }
  function monthLabel(ym){ const [y,m]=ym.split('-').map(Number); return `${MONTHS[m-1]} ${y}`; }
  function weekOf(d){ return Math.ceil(parseInt(d.slice(8,10),10)/7); }

  document.getElementById('view-fin-expenses').innerHTML = `
    ${UI.pageHeader('Expenses','ประวัติรายจ่าย/รายรับที่บันทึกแล้ว',
      `<button class="btn btn-primary" onclick="fxUsage()">${UI.icon('add','sm')} Record Usage</button>`)}
    <div id="fx-kpi"></div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:var(--sp-2);flex-wrap:wrap">
      <div class="section-title" style="margin:0">Expense List</div>
      <div id="fx-filters"></div>
    </div>
    <div id="fx-batch-editor"></div>
    <div id="fx-body" style="margin-top:var(--sp-2)"></div>
    <div id="fx-drawer-root"></div>`;

  function initials(name){ return (name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(); }
  // "Paid to" = who/where the money went (vendor→store icon, staff→avatar+nickname)
  function personCell(e){
    if(!e.paidTo) return '<span class="text-muted">—</span>';
    if(e.payeeType==='vendor') return `<div style="display:flex;align-items:center;gap:9px">
      <div class="avatar avatar-sm" style="background:var(--md-surface-variant);color:var(--md-on-surface-variant)">${UI.icon('store','sm')}</div>
      <div><div style="font-weight:500">${e.paidTo}</div><div class="text-muted" style="font-size:var(--fs-label-sm)">Vendor</div></div></div>`;
    const nick=FIN.payeeNick(e.paidTo);
    return `<div style="display:flex;align-items:center;gap:9px">${UI.avatar(initials(e.paidTo),'sm')}
      <div><div style="font-weight:500">${e.paidTo}</div>${nick?`<div class="text-muted" style="font-size:var(--fs-label-sm)">${nick}</div>`:''}</div></div>`;
  }
  // "Request by" = who submitted the Direct Paid request this ledger entry came from
  // (via e.sourceRequestId) — "-" for plain logs that never went through a request
  // (Record Usage, Reimbursement, Recurring, Top-up). Kept as its own column per
  // Nock's call: legitimate info when it applies, dash when it doesn't — not hidden.
  function requestByCell(e){
    const r = e.sourceRequestId && DB.expenseRequests.find(x=>x.id===e.sourceRequestId);
    if(!r) return '<span class="text-muted">—</span>';
    return `<div style="display:flex;align-items:center;gap:9px">${UI.avatar(initials(r.requestedBy),'sm')}
      <div style="font-weight:500">${r.requestedBy}</div></div>`;
  }

  function visibleEntries(){
    const vb=FIN.visibleBranches(U());
    return DB.expenses.filter(e=> e.status!=='inactive' && vb.includes(e.branch));
  }
  function applyFilters(list){
    if(fSource!=='all') list=list.filter(e=>e.source===fSource);
    if(fBranch!=='all') list=list.filter(e=>e.branch===fBranch);
    if(fStatus!=='all') list=list.filter(e=>(e.flow||'done')===fStatus);
    if(fCat!=='all')    list=list.filter(e=>e.category===fCat);
    if(search){ const q=search.toLowerCase(); list=list.filter(e=>(e.note+e.category+(e.paidTo||'')+e.branch).toLowerCase().includes(q)); }
    return list;
  }

  /* ── KPI (context only — no "pending" concept on a history page) ── */
  function renderKPI(){
    const vb=FIN.visibleBranches(U());
    const ent=visibleEntries();
    const spend=ent.filter(e=>!inflow(e)&&e.date>='2026-05').reduce((s,e)=>s+e.amount,0);
    const petty=vb.reduce((s,b)=>s+FIN.pettyBalance(b),0);
    const showCentral=FIN.isSpecial(U())||U().role==='director'||U().role==='area_manager';
    const cards=[
      {icon:'payments',label:'Spend (recent)',value:fmtK(spend),color:'',sub:'Usage + bills'},
      {icon:'savings',label:'Petty Balance',value:fmtK(petty),color:petty<0?'error':'success',sub:petty<0?'Float negative':'Your branches'},
    ];
    if(showCentral) cards.push({icon:'account_balance',label:'Central Bank',value:fmtK(FIN.balance('central')),color:'tertiary',sub:'Company account'});
    const el=document.getElementById('fx-kpi');
    el.innerHTML=UI.kpiGrid(cards);
    const g=el.querySelector('.kpi-grid'); if(g) g.style.gridTemplateColumns=`repeat(${cards.length},1fr)`;
  }

  /* ── filters ── */
  function sel(id,label,opts,val){
    return `<select class="tc-select" onchange="${id}(this.value)">
      <option value="all">${label}</option>
      ${opts.map(o=>`<option value="${o.v}" ${o.v===val?'selected':''}>${o.l}</option>`).join('')}</select>`;
  }
  function renderFilters(){
    const box=document.getElementById('fx-filters');
    const vb=FIN.visibleBranches(U());
    box.innerHTML=`
      <div class="filter-bar" style="margin:0">
        <input type="text" class="form-input" style="height:32px;font-size:var(--fs-label-md);min-width:170px"
          placeholder="e.g. note, source…" oninput="fxSearch(this.value)">
        ${sel('fxFSource','Source',[{v:'central',l:'Central'},{v:'petty',l:'Petty'}],fSource)}
        ${sel('fxFBranch','Branch',vb.map(b=>({v:b,l:b})),fBranch)}
        ${sel('fxFStatus','Status',[{v:'upload',l:'Upload file'},{v:'done',l:'Done'}],fStatus)}
        ${sel('fxFCat','Category',FIN.CATEGORIES.map(c=>({v:c.id,l:c.short})),fCat)}
      </div>`;
  }

  /* ── cells ── */
  function statusCell(e){
    if((e.flow||'done')==='upload') return `<button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();fxOpen('${e.id}')">${UI.icon('upload_file','sm')} Upload file</button>`;
    return UI.badge('Done','green');
  }
  function locCell(e){ const code=FIN.areaCode(e.branch); return `<div>${e.branch}${code?`<div class="text-muted" style="font-size:var(--fs-label-sm)">${code}</div>`:''}</div>`; }

  /* ── week-grouped ledger ── */
  function renderLedger(){
    const list=applyFilters(visibleEntries());
    const groups={};
    list.forEach(e=>{ const k=e.date.slice(0,7)+'|'+weekOf(e.date); (groups[k]=groups[k]||[]).push(e); });
    const keys=Object.keys(groups).sort((a,b)=> b.split('|')[0].localeCompare(a.split('|')[0]) || (+b.split('|')[1])-(+a.split('|')[1]));
    if(!keys.length){ document.getElementById('fx-body').innerHTML=UI.emptyState('search_off','No expenses','Try a different filter, or record a usage'); return; }
    document.getElementById('fx-body').innerHTML = keys.map(k=>{
      const [ym,w]=k.split('|'); const rows=groups[k].sort((a,b)=>b.date.localeCompare(a.date));
      const totalIn=rows.filter(inflow).reduce((s,e)=>s+e.amount,0);
      const totalOut=rows.filter(e=>!inflow(e)).reduce((s,e)=>s+e.amount,0);
      const wid='fxwk-'+k.replace(/\W/g,'');
      const body=rows.map(e=>{
        const tt=FIN.txnType(e);
        const amtCls = e.type==='income'?'text-success':e.type==='received'?'text-primary':'text-error';
        const catCell = (e.type==='received'||e.type==='income')?'<span class="text-muted">—</span>':catBadge(e.category);
        return `<tr class="tr-click" onclick="fxOpen('${e.id}')">
        <td class="text-muted" style="white-space:nowrap">${parseInt(e.date.slice(8,10),10)} ${MONTHS[+e.date.slice(5,7)-1]} ${e.date.slice(2,4)}</td>
        <td>${UI.badge(tt.label, tt.color)}</td>
        <td>${catCell}</td>
        <td style="font-weight:500">${e.note}</td>
        <td style="text-align:right;font-weight:600" class="${amtCls}">${inflow(e)?'+':'−'}${Utils.currency(e.amount)}</td>
        <td>${sourceBadge(e.source)}</td>
        <td>${requestByCell(e)}</td>
        <td>${locCell(e)}</td>
        <td onclick="event.stopPropagation()">${statusCell(e)}</td>
      </tr>`;}).join('');
      return `<div style="margin-bottom:var(--sp-4)">
        <div style="display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:6px;cursor:pointer" onclick="fxToggleWeek('${wid}',this)">
          <div style="display:flex;align-items:baseline;gap:8px">
            <span class="fx-wk-chevron" style="display:inline-flex;transition:transform .15s">${UI.icon('expand_more','sm')}</span>
            <span style="font-weight:700">Week ${w}</span>
            <span class="text-muted" style="font-size:var(--fs-label-md)">${monthLabel(ym)} · ${rows.length} expense${rows.length!==1?'s':''}</span>
          </div>
          <div style="font-weight:600;font-size:var(--fs-label-md)">
            ${totalIn?`<span class="text-success">+${totalIn.toLocaleString()}</span> `:''}${totalOut?`<span class="text-error">−${totalOut.toLocaleString()}</span>`:''}
          </div>
        </div>
        <div id="${wid}" class="card"><div style="overflow-x:auto"><table style="margin:0">
          <thead><tr><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th style="text-align:right">Amount</th>
            <th>Source</th><th>Request by</th><th>Location</th><th style="text-align:right">Status</th></tr></thead>
          <tbody>${body}</tbody></table></div></div>
      </div>`;
    }).join('');
  }
  window.fxToggleWeek=function(wid, headerEl){
    const box=document.getElementById(wid); if(!box) return;
    const collapsed = box.style.display==='none';
    box.style.display = collapsed ? '' : 'none';
    const chev=headerEl.querySelector('.fx-wk-chevron'); if(chev) chev.style.transform = collapsed ? '' : 'rotate(-90deg)';
  };

  function renderAll(){
    renderKPI(); renderFilters(); renderLedger(); FIN.refreshBadges();
  }
  renderAll();
  window._refreshFinance = renderAll;

  window.fxSearch=v=>{search=v;renderLedger();};
  window.fxFSource=v=>{fSource=v;renderLedger();};
  window.fxFBranch=v=>{fBranch=v;renderLedger();};
  window.fxFStatus=v=>{fStatus=v;renderLedger();};
  window.fxFCat=v=>{fCat=v;renderLedger();};

  /* ── DETAIL — slide-over side panel (shared shell from js/fin-side-panel.js,
     same drawer used by Requests). 2 tabs matching Requests: Info (title/badges/
     note → Information → Files) and Logs (plain audit history) — see
     FINANCE-MODEL.md §17/§18. ── */
  let fxDrawerId=null, fxDrawerTab='info';
  function dateShort(d){ const dt=new Date(d+'T00:00:00'); return `${dt.getDate()} ${MONTHS[dt.getMonth()]} ${String(dt.getFullYear()).slice(2)}`; }
  const FX_LOG_LABEL = { created:'Created', edited:'Edited', inactivated:'Inactivated', document_added:'Document added',
    invoice_attached:'Invoice attached', payslip_attached:'Pay slip attached',
    tax_invoice_attached:'Tax invoice attached', ledger_created:'Ledger created' };

  function whatBlock(e){
    const f=e.flow||'done';
    return `<div style="font-size:var(--fs-title-sm);font-weight:700">${e.note||'—'}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${UI.badge(FIN.txnType(e).label,FIN.txnType(e).color)}${catBadge(e.category)}${f==='done'?UI.badge('Done','green'):UI.badge('Upload file','gray')}</div>
      <div class="text-muted" style="font-size:var(--fs-label-md);margin-top:8px">${e.branch} BKK · ${dateShort(e.date)} · ${e.createdBy}</div>`;
  }
  function informationSection(e){
    const hasPayment = e.acctName || e.acctNumber || e.promptPay;
    return `<div style="margin-top:var(--sp-3)">${FinPanel.card(`
      ${FinPanel.sectionLabel('Information')}
      <div style="display:flex;align-items:center;justify-content:space-between;gap:12px">
        <div><div class="label" style="font-size:var(--fs-label-sm);color:var(--md-on-surface-variant)">Paid to</div>${personCell(e)}</div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px">
        <div class="label" style="font-size:var(--fs-label-sm);color:var(--md-on-surface-variant)">Amount</div>
        <div style="font-weight:700" class="${inflow(e)?'text-success':''}">${inflow(e)?'+':'−'}${Utils.currency(e.amount)}</div>
      </div>`)}</div>
      <div style="margin-top:var(--sp-3)">${FinPanel.card(`
        ${FinPanel.sectionLabel('Payment')}<div>${e.source==='central'?'Central Bank':'Petty Cash'}</div>
        ${hasPayment ? FinPanel.fieldRow('Account name',e.acctName,e.acctName)+FinPanel.fieldRow('Account number',e.acctNumber,e.acctNumber)+FinPanel.fieldRow('PromptPay',e.promptPay,e.promptPay) : ''}`)}</div>`;
  }
  function filesSection(e){
    return `<div style="margin-top:var(--sp-3)">${FinPanel.card(`
      <div style="display:flex;align-items:center;justify-content:space-between">${FinPanel.sectionLabel('Files')}
        <label class="btn btn-secondary btn-sm" style="cursor:pointer">${UI.icon('add','sm')} Add More
          <input type="file" multiple accept="image/*,application/pdf" style="display:none" onchange="fxAddDocs('${e.id}',this)"></label>
      </div>
      ${(e.docs||[]).length ? FinPanel.docGallery(e.docs) : `<div class="text-muted" style="font-size:var(--fs-label-sm);margin-top:8px">${UI.icon('cloud_off','sm')} No documents yet</div>`}`)}
    </div>`;
  }
  function renderFxInfoTab(e){ return `${whatBlock(e)}${informationSection(e)}${filesSection(e)}`; }
  function renderFxLogsTab(e){
    const logs = (e.logs&&e.logs.length) ? e.logs : [{action:'created', by:e.createdBy, at:e.date}];
    return FinPanel.timeline(FinPanel.auditItems(logs, FX_LOG_LABEL));
  }
  function renderFxDrawer(){
    const e=DB.expenses.find(x=>x.id===fxDrawerId);
    if(!e){ fxCloseDrawer(); return ''; }
    const header = FinPanel.drawerHeader('Expense detail','receipt_long','fxCloseDrawer');
    const tabsHtml = FinPanel.tabStrip([{key:'info',label:'Info'},{key:'logs',label:'Logs'}], fxDrawerTab, 'fxSetTab');
    const body = `<div style="padding:var(--sp-4);overflow-y:auto;flex:1">${fxDrawerTab==='logs'?renderFxLogsTab(e):renderFxInfoTab(e)}</div>`;
    const footer = `<div style="padding:var(--sp-3) var(--sp-4);border-top:1px solid var(--md-outline-variant);display:flex;justify-content:flex-end;gap:8px;flex-shrink:0">
      <button class="btn btn-danger" onclick="fxInactivate('${e.id}')">${UI.icon('visibility_off','sm')} Inactivate</button>
      <button class="btn btn-primary" onclick="fxEdit('${e.id}')">${UI.icon('edit','sm')} Edit Expense</button>
    </div>`;
    return FinPanel.drawer(header+tabsHtml+body+footer, 'fxCloseDrawer', {width:440});
  }
  window.fxOpen=function(id){ fxDrawerId=id; fxDrawerTab='info'; document.getElementById('fx-drawer-root').innerHTML=renderFxDrawer(); };
  window.fxSetTab=function(t){ fxDrawerTab=t; document.getElementById('fx-drawer-root').innerHTML=renderFxDrawer(); };
  window.fxCloseDrawer=function(){ fxDrawerId=null; document.getElementById('fx-drawer-root').innerHTML=''; };
  window.fxAddDocs=function(id,input){
    const files=Array.from(input.files); if(!files.length) return;
    const e=DB.expenses.find(x=>x.id===id); if(!e) return;
    Promise.all(files.map(f=>new Promise(res=>{
      const r=new FileReader(); r.onload=ev=>res({name:f.name,dataUrl:ev.target.result,type:f.type}); r.readAsDataURL(f);
    }))).then(newDocs=>{
      e.docs=(e.docs||[]).concat(newDocs);
      if(e.docStatus==='none') e.docStatus='paper';
      if(e.flow==='upload') e.flow='done';
      FIN.logExpense(e,'document_added');
      document.getElementById('fx-drawer-root').innerHTML=renderFxDrawer();
      renderAll(); showToast('เพิ่มเอกสารแล้ว ✓','success');
    });
  };
  window.fxInactivate=function(id){ const e=DB.expenses.find(x=>x.id===id); if(!e)return; e.status='inactive'; FIN.logExpense(e,'inactivated'); fxCloseDrawer(); renderAll(); showToast('Entry inactivated','info'); };
  window.fxEdit=function(id){ fxCloseDrawer(); fxEditOne(id); };

  /* ── EDIT one existing record (correcting history — not a create flow,
     stays a simple single-row form) ── */
  function opts(arr,sel){ return arr.map(v=>{const val=v.value!=null?v.value:v,l=v.label!=null?v.label:v;return `<option value="${val}" ${val===sel?'selected':''}>${l}</option>`;}).join(''); }
  window.fxEditOne=function(editId){
    const e=DB.expenses.find(x=>x.id===editId); if(!e) return;
    const vb=FIN.visibleBranches(U());
    const cats=FIN.CATEGORIES.filter(c=>!['Received','Salary','Rental'].includes(c.id));
    Modal.create('modal-fx-edit',`${UI.icon('edit')} Edit Usage`,
    `<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3)">
      <div><label class="field-label">Type</label>
        <select id="fu-type" class="form-input" style="width:100%">
          <option value="usage" ${inflow(e)?'':'selected'}>Expense (จ่ายออก)</option>
          <option value="income" ${inflow(e)?'selected':''}>Income (รับเข้า)</option></select></div>
      <div><label class="field-label">Date</label><input type="date" id="fu-date" class="form-input" style="width:100%" value="${e.date}"></div>
      <div><label class="field-label">Branch</label><select id="fu-branch" class="form-input" style="width:100%">${opts(vb.map(b=>({value:b,label:b})),e.branch)}</select></div>
      <div><label class="field-label">Category</label><select id="fu-cat" class="form-input" style="width:100%">${opts(cats.map(c=>({value:c.id,label:c.short})),e.category)}</select></div>
      <div><label class="field-label">Amount (THB)</label><input type="number" id="fu-amt" class="form-input" style="width:100%" value="${e.amount}"></div>
      <div><label class="field-label">Budget source</label>
        <select id="fu-src" class="form-input" style="width:100%">
          <option value="petty" ${e.source==='petty'?'selected':''}>Petty Cash</option>
          <option value="central" ${e.source==='central'?'selected':''}>Central Bank</option></select></div>
     </div>
     <div style="margin-top:var(--sp-3)"><label class="field-label">Description <span class="text-muted">(ร้าน/vendor ใส่ตรงนี้)</span></label>
       <input type="text" id="fu-note" class="form-input" style="width:100%" value="${e.note.replace(/"/g,'&quot;')}" placeholder="e.g. Officemate — กระดาษ A4"></div>
     <div style="margin-top:var(--sp-3)"><label class="field-label">Document (ใบกำกับ/ใบเสร็จ)</label>
       <input type="file" id="fu-file" class="form-input" style="width:100%" accept="image/*,application/pdf"></div>`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-fx-edit')">Cancel</button>
     <button class="btn btn-primary" onclick="fuSaveEdit('${editId}')">${UI.icon('save','sm')} Save</button>`,'modal-lg');
  };
  window.fuSaveEdit=function(editId){
    const g=id=>document.getElementById(id);
    const type=g('fu-type').value, amt=parseFloat(g('fu-amt').value)||0, note=g('fu-note').value.trim();
    if(!amt){showToast('Enter an amount','error');return;}
    if(!note){showToast('Add a description','error');return;}
    const src=g('fu-src').value, file=g('fu-file').files[0];
    const finish=(durl,dtype)=>{
      const e=DB.expenses.find(x=>x.id===editId);
      const hasDoc = durl || (e.docs&&e.docs.length);
      const data={ date:g('fu-date').value, branch:g('fu-branch').value, category:g('fu-cat').value,
        amount:amt, source:src, note, type, flow: (type==='income'||hasDoc)?'done':'upload' };
      if(durl){ data.docs=(e.docs||[]).concat([{name:file.name,dataUrl:durl,type:dtype}]); data.docStatus='paper'; }
      Object.assign(e,data); FIN.logExpense(e,'edited'); showToast('Entry updated ✓','success');
      Modal.close('modal-fx-edit'); renderAll();
    };
    if(file){ const r=new FileReader(); r.onload=ev=>finish(ev.target.result,file.type); r.readAsDataURL(file); }
    else finish(null,null);
  };

  /* ── RECORD USAGE — inline batch editor (not a modal — expands right on the
     page, matching the same "no popup, work in place" pattern as the rest of
     Finance). Method A: drop many receipts, AI reads each into an editable
     row; Method B: manually add empty rows. One "Save all" with partial
     validation — ready rows save and drop out, the rest stay to fix. ── */
  let buSeq=0, buOpen=false;
  const buFiles={};   // rowId -> {name,dataUrl,type}
  const MOCK_VENDORS=['Officemate','Grab','Lotus','7-Eleven','Villa Market','Daiso'];
  const MOCK_CATS=['Teaching Materials and Supplies','Transportation and Travel','Others','Advertising and Marketing'];
  const MOCK_AMTS=[540,182,1120,95,320,760];
  function buMockExtract(i){
    const lowConfidence = i%3===1;   // simulate "not sure" → leave category blank on purpose
    return { note:MOCK_VENDORS[i%MOCK_VENDORS.length], category: lowConfidence?'':MOCK_CATS[i%MOCK_CATS.length], amount:MOCK_AMTS[i%MOCK_AMTS.length] };
  }
  window.fxUsage=function(){
    if(buOpen) return;   // already open — just let them keep working in it
    buOpen=true;
    const vb=FIN.visibleBranches(U());
    const cats=FIN.CATEGORIES.filter(c=>!['Received','Salary','Rental'].includes(c.id));
    window._buCats=cats; window._buBranches=vb;
    document.getElementById('fx-batch-editor').innerHTML = `
      <div class="card" style="padding:var(--sp-4);margin-bottom:var(--sp-3);border:1px solid var(--md-primary)">
        <div id="bu-drop" onclick="document.getElementById('bu-files').click()"
           ondragover="event.preventDefault();this.style.opacity=0.7" ondragleave="this.style.opacity=1"
           ondrop="event.preventDefault();this.style.opacity=1;buHandleFiles(event.dataTransfer.files)"
           style="border:2px dashed var(--md-primary);border-radius:12px;padding:18px;text-align:center;cursor:pointer;background:var(--md-primary-container)">
          <div style="font-weight:700">${UI.icon('cloud_upload')} Drag & Drop Document file (Multiple file)</div>
          <div class="text-muted" style="font-size:var(--fs-label-md);margin-top:4px">ระบบจะอ่านแต่ละไฟล์แล้วสร้างแถวให้อัตโนมัติ — ช่องที่ไม่มั่นใจจะเว้นว่างให้กรอกเอง</div>
        </div>
        <input type="file" id="bu-files" multiple style="display:none" accept="image/*,application/pdf" onchange="buHandleFiles(this.files)">
        <div style="overflow-x:auto;margin-top:var(--sp-3)"><table style="margin:0">
          <thead><tr><th>File</th><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th style="text-align:right">Amount</th><th>Source</th><th>Location</th><th>Status</th></tr></thead>
          <tbody id="bu-tbody"></tbody>
        </table></div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-top:var(--sp-3)">
          <span class="text-primary" style="cursor:pointer;font-weight:600" onclick="fxCancelUsage()">Cancel</span>
          <div style="display:flex;gap:8px;align-items:center">
            <span id="bu-summary" class="text-muted" style="font-size:var(--fs-label-sm);margin-right:4px"></span>
            <button class="btn btn-secondary" onclick="buAddRow()">${UI.icon('add','sm')} Add Row</button>
            <button class="btn btn-primary" onclick="buSaveAll()">${UI.icon('check','sm')} Save all</button>
          </div>
        </div>
      </div>`;
    buSeq=0; Object.keys(buFiles).forEach(k=>delete buFiles[k]);
    buAddRow(); // start with one empty row so Method B works with zero clicks too
  };
  window.fxCancelUsage=function(){ buOpen=false; document.getElementById('fx-batch-editor').innerHTML=''; };
  function buCatOpts(sel){ return `<option value="">Category</option>${opts(window._buCats.map(c=>({value:c.id,label:c.short})),sel)}`; }
  function buBranchOpts(sel){ return opts(window._buBranches.map(b=>({value:b,label:b})),sel||window._buBranches[0]); }
  function buFileCell(meta){
    if(!meta) return `<label style="cursor:pointer;color:var(--md-primary)" title="Attach file">${UI.icon('attach_file','sm')}<input type="file" style="display:none" accept="image/*,application/pdf" onchange="buAttach(0,this)"></label>`;
    if(meta.dataUrl && (meta.type||'').startsWith('image')) return `<img src="${meta.dataUrl}" style="width:32px;height:32px;object-fit:cover;border-radius:6px;border:1px solid var(--md-outline-variant)">`;
    return `<div title="${meta.name}">${UI.icon('description','sm')}</div>`;
  }
  function buRowTemplate(id, meta){
    const today=new Date().toISOString().slice(0,10);
    const fileCell = buFileCell(meta).replace('buAttach(0,', `buAttach(${id},`);
    return `<tr data-row-id="${id}">
      <td>${fileCell}</td>
      <td><input type="date" id="bu-date-${id}" class="form-input" style="width:130px" value="${today}" onchange="buUpdateStatus(${id})"></td>
      <td><select id="bu-type-${id}" class="form-input" style="width:110px" onchange="buUpdateStatus(${id})">
            <option value="usage" selected>Expense</option><option value="income">Income</option></select></td>
      <td><select id="bu-cat-${id}" class="form-input" style="width:140px" onchange="buUpdateStatus(${id})">${buCatOpts('')}</select></td>
      <td><input type="text" id="bu-note-${id}" class="form-input" style="width:100%;min-width:150px" placeholder="Description" oninput="buUpdateStatus(${id})"></td>
      <td><input type="number" id="bu-amt-${id}" class="form-input" style="width:100px;text-align:right" placeholder="Amount" oninput="buUpdateStatus(${id})"></td>
      <td><select id="bu-src-${id}" class="form-input" style="width:90px" onchange="buUpdateStatus(${id})">
            <option value="petty" selected>Petty</option><option value="central">Central</option></select></td>
      <td><select id="bu-branch-${id}" class="form-input" style="width:110px" onchange="buUpdateStatus(${id})">${buBranchOpts('')}</select></td>
      <td id="bu-status-${id}" style="white-space:nowrap"></td>
    </tr>`;
  }
  window.buAddRow=function(){
    const id=++buSeq;
    document.getElementById('bu-tbody').insertAdjacentHTML('beforeend', buRowTemplate(id));
    buUpdateStatus(id);
  };
  window.buHandleFiles=function(fileList){
    Array.from(fileList).forEach((f,i)=>{
      const id=++buSeq;
      document.getElementById('bu-tbody').insertAdjacentHTML('beforeend', buRowTemplate(id, {name:f.name}));
      const statusEl=document.getElementById('bu-status-'+id); if(statusEl) statusEl.innerHTML=UI.badge('Reading…','gray');
      const reader=new FileReader();
      reader.onload=ev=>{
        buFiles[id]={ name:f.name, dataUrl:ev.target.result, type:f.type };
        const cell=document.querySelector(`tr[data-row-id="${id}"] td:first-child`); if(cell) cell.innerHTML=buFileCell(buFiles[id]);
        setTimeout(()=>{   // mock AI extraction delay
          const mock=buMockExtract(i);
          const set=(elId,v)=>{ const el=document.getElementById(elId); if(el) el.value=v; };
          set('bu-note-'+id, mock.note); set('bu-cat-'+id, mock.category); set('bu-amt-'+id, mock.amount||'');
          buUpdateStatus(id);
        }, 500+i*250);
      };
      reader.readAsDataURL(f);
    });
  };
  window.buAttach=function(id,input){
    const f=input.files[0]; if(!f) return;
    const reader=new FileReader();
    reader.onload=ev=>{ buFiles[id]={name:f.name,dataUrl:ev.target.result,type:f.type};
      const cell=input.closest('td'); if(cell) cell.innerHTML=buFileCell(buFiles[id]);
      buUpdateStatus(id); };
    reader.readAsDataURL(f);
  };
  function buMissing(id){
    const amt=parseFloat(document.getElementById('bu-amt-'+id)?.value)||0;
    const cat=document.getElementById('bu-cat-'+id)?.value||'';
    const note=document.getElementById('bu-note-'+id)?.value.trim()||'';
    const missing=[];
    if(!note) missing.push('note'); if(!amt) missing.push('amt'); if(!cat) missing.push('cat');
    return missing;
  }
  const WARN_BORDER='2px solid var(--md-warning, #f59e0b)', OK_BORDER='';
  window.buUpdateStatus=function(id){
    const missing=buMissing(id);
    const mark=(field,key)=>{ const el=document.getElementById(`bu-${field}-${id}`); if(el) el.style.border = missing.includes(key)?WARN_BORDER:OK_BORDER; };
    mark('note','note'); mark('amt','amt'); mark('cat','cat');
    const el=document.getElementById('bu-status-'+id);
    if(el) el.innerHTML = missing.length
      ? `${UI.badge('Required','yellow')} <button onclick="buRemoveRow(${id})" title="Remove" style="background:none;border:none;cursor:pointer;vertical-align:middle;margin-left:4px;color:var(--md-on-surface-variant)">${UI.icon('close','sm')}</button>`
      : `${UI.badge('Ready','green')} <button onclick="buRemoveRow(${id})" title="Remove" style="background:none;border:none;cursor:pointer;vertical-align:middle;margin-left:4px;color:var(--md-on-surface-variant)">${UI.icon('close','sm')}</button>`;
    buUpdateSummary();
  };
  window.buRemoveRow=function(id){
    document.querySelector(`tr[data-row-id="${id}"]`)?.remove();
    delete buFiles[id];
    buUpdateSummary();
  };
  function buUpdateSummary(){
    const rows=Array.from(document.querySelectorAll('#bu-tbody tr'));
    const ready=rows.filter(tr=>!buMissing(tr.dataset.rowId).length).length;
    const el=document.getElementById('bu-summary');
    if(el) el.textContent = rows.length ? `${ready} ready · ${rows.length-ready} required` : 'No rows yet';
  }
  window.buSaveAll=function(){
    const rows=Array.from(document.querySelectorAll('#bu-tbody tr'));
    let saved=0, remain=0;
    rows.forEach(tr=>{
      const id=tr.dataset.rowId;
      if(buMissing(id).length){ remain++; return; }
      const file=buFiles[id];
      const data={ date:document.getElementById('bu-date-'+id).value, branch:document.getElementById('bu-branch-'+id).value,
        category:document.getElementById('bu-cat-'+id).value, amount:parseFloat(document.getElementById('bu-amt-'+id).value)||0,
        source:document.getElementById('bu-src-'+id).value, note:document.getElementById('bu-note-'+id).value.trim(),
        type:document.getElementById('bu-type-'+id).value, flow: file?'done':'upload', docStatus: file?'paper':'none' };
      if(file){ data.docDataUrl=file.dataUrl; data.docName=file.name; data.docType=file.type; }
      FIN.addExpense(data);
      tr.remove(); delete buFiles[id]; saved++;
    });
    buUpdateSummary();
    if(saved) renderAll();
    if(saved && !remain){ showToast(`บันทึกแล้ว ${saved} รายการ ✓`,'success'); fxCancelUsage(); }
    else if(saved){ showToast(`บันทึกแล้ว ${saved} รายการ · เหลือ ${remain} รายการที่ต้องกรอกให้ครบ`,'info'); }
    else { showToast('ยังไม่มีรายการที่พร้อมบันทึก — ตรวจข้อมูลที่ขาด','error'); }
  };

})();
