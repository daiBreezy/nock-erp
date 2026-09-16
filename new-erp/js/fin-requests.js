/* ============================================================
   fin-requests.js — Finance ▸ Requests (processing queue)
   Table stays 100% width (index only) — click a row → a Side Panel
   drawer slides in from the right (shared shell from js/fin-side-panel.js,
   same visual language as Expenses' drawer). Drawer has 2 tabs:
   Info (title/badges/note → Payment method → Workflow & File upload,
   with the file-upload control embedded right on the current step)
   and Logs (plain audit history). See FINANCE-MODEL.md §17/§18 for why
   this replaced both the earlier persistent split-panel (§12) and the
   short-lived separate Workflow/Files sections (§17 first draft).
   Reimbursement is a separate page — different approver, different job.
   Direct Paid always pays the vendor directly (no intermediary account),
   so there's no standalone "Vendor" row — the Payment field IS the vendor.
   ============================================================ */
(function () {

  const U = () => window.CURRENT_USER;
  let tab='action';         // action | others | history (list tabs)
  let selectedId=null;      // id of the request currently open in the drawer (null = closed)
  let drawerTab='info';     // info | logs (drawer tabs)

  const catBadge = id => { const c=FIN.CAT_MAP[id]; return UI.badge(c?c.short:id, c?c.color:'gray'); };
  const kindLabel = r => r.kind==='petty_topup' ? 'Petty top-up' : 'Direct Paid';
  const kindBadge = r => UI.badge(kindLabel(r), r.kind==='petty_topup'?'teal':'blue');
  const STATUS_SHORT = { pending:'Pending', approved:'Approved', paid:'Paid', closed:'Closed', rejected:'Rejected', cancelled:'Cancelled' };
  const STATUS_COLOR = r => r.status==='rejected'?'red':r.status==='cancelled'?'gray':r.status==='closed'?'green':r.status==='paid'?'teal':r.status==='approved'?'blue':'yellow';
  const statusBadge = r => UI.badge(STATUS_SHORT[r.status]||r.status, STATUS_COLOR(r));
  // status badge with "days waiting" suffix while still in flight — matches the aging shown in the list
  function statusAgingBadge(r){
    const inFlight = r.status==='pending' || r.status==='approved' || r.status==='paid';
    const label = inFlight ? `${STATUS_SHORT[r.status]||r.status} · ${FIN.daysSince(r.date)}d` : (STATUS_SHORT[r.status]||r.status);
    return UI.badge(label, STATUS_COLOR(r));
  }
  function opts(arr,sel){ return arr.map(v=>{const val=v.value!=null?v.value:v,l=v.label!=null?v.label:v;return `<option value="${val}" ${val===sel?'selected':''}>${l}</option>`;}).join(''); }

  document.getElementById('view-fin-requests').innerHTML = `
    ${UI.pageHeader('Requests','Direct Paid + Petty Top-up ที่ต้องอนุมัติ/ดำเนินการ',
      `<button class="btn btn-primary" onclick="rqNew()">${UI.icon('add','sm')} New Request</button>`)}
    <div id="rq-kpi"></div>
    <div class="tabs" style="margin-top:var(--sp-2)">
      <div id="rq-tab-action" class="tab active" onclick="rqTab('action')">Needs your action <span id="rq-action-n"></span></div>
      <div id="rq-tab-others" class="tab" onclick="rqTab('others')">Awaiting others</div>
      <div id="rq-tab-history" class="tab" onclick="rqTab('history')">History</div>
    </div>
    <div id="rq-list" style="margin-top:var(--sp-2)"></div>
    <div id="rq-drawer-root"></div>`;

  function actionList(){ return FIN.actionableRequestsFor(U()).sort((a,b)=>a.date.localeCompare(b.date)); }
  function othersList(){ return FIN.awaitingOthersFor(U()).sort((a,b)=>a.date.localeCompare(b.date)); }
  function historyList(){ return FIN.requestHistoryFor(U()).sort((a,b)=>b.date.localeCompare(a.date)); }
  function currentList(){ return tab==='action' ? actionList() : tab==='others' ? othersList() : historyList(); }

  /* ── KPI — action-oriented, not a database summary ── */
  function renderKPI(){
    const action=actionList(), others=othersList();
    const oldest=action.reduce((m,r)=>Math.max(m,FIN.daysSince(r.date)),0);
    const cards=[
      {icon:'bolt',label:'Needs your action',value:action.length,color:action.length?'warning':'success',sub:action.length?'Tap to review':'All clear'},
      {icon:'hourglass_top',label:'Oldest waiting',value:action.length?oldest+'d':'—',color:oldest>5?'error':'',sub:'Days since submitted'},
      {icon:'visibility',label:'Awaiting others',value:others.length,color:'',sub:'ไม่ใช่คิวของคุณ'},
    ];
    const el=document.getElementById('rq-kpi');
    el.innerHTML=UI.kpiGrid(cards);
    const g=el.querySelector('.kpi-grid'); if(g) g.style.gridTemplateColumns=`repeat(${cards.length},1fr)`;
  }

  /* ── plain-language "what does this need right now" ── */
  function stageLabel(r){
    if(r.status==='pending')  return 'Approve';
    if(r.status==='approved') return 'Confirm transfer';
    if(r.status==='paid' && r.kind==='budget') return 'Upload tax invoice';
    return '—';
  }
  function waitingOnLabel(r){
    if(r.status==='pending')  return FIN.tierLabel(r.tier)+' approval';
    if(r.status==='approved') return 'SA/Director transfer';
    return '—';
  }
  const decidedBy = r => r.status==='cancelled' ? (r.cancelledBy||'—') : (r.approvedBy||'—');

  /* ── LIST (index only — just enough to pick the next task) ── */
  function rowHtml(r, extraCellsHtml){
    const sel = r.id===selectedId;
    return `<tr class="tr-click" style="${sel?'background:var(--md-primary-container)':''}" onclick="frOpen('${r.id}')">
      <td class="text-muted" style="white-space:nowrap">${r.date.slice(5)}${tab==='action'?` <span class="text-error">(${FIN.daysSince(r.date)}d)</span>`:''}</td>
      <td>${kindBadge(r)}</td><td>${r.branch}</td>
      <td style="text-align:right;font-weight:600">${Utils.currency(r.amount)}</td>
      <td>${r.requestedBy}</td>
      ${extraCellsHtml(r)}
      <td style="text-align:center;color:var(--md-on-surface-variant)">${UI.icon('chevron_right','sm')}</td>
    </tr>`;
  }
  function renderList(){
    const rows=currentList();
    if(selectedId && !rows.find(r=>r.id===selectedId)) selectedId=null;
    if(!rows.length){
      document.getElementById('rq-list').innerHTML = UI.emptyState(
        tab==='action'?'check_circle':tab==='others'?'visibility_off':'history',
        tab==='action'?'All clear':tab==='others'?'Nothing in flight':'No history yet',
        tab==='action'?'ไม่มีคำขอที่ต้องดำเนินการตอนนี้':tab==='others'?'ไม่มีคำขออื่นค้างอยู่':'ยังไม่มีคำขอที่จบแล้ว');
      return;
    }
    let thead, body;
    if(tab==='action'){
      thead=`<th>Date</th><th>Type</th><th>Branch</th><th style="text-align:right">Amount</th><th>Requested by</th><th>Needs</th><th>Status</th><th></th>`;
      body=rows.map(r=>rowHtml(r, r=>`<td>${UI.badge(stageLabel(r),'blue')}</td><td>${statusBadge(r)}</td>`)).join('');
    } else if(tab==='others'){
      thead=`<th>Date</th><th>Type</th><th>Branch</th><th style="text-align:right">Amount</th><th>Requested by</th><th>Waiting on</th><th>Status</th><th></th>`;
      body=rows.map(r=>rowHtml(r, r=>`<td class="text-muted">${waitingOnLabel(r)}</td><td>${statusBadge(r)}</td>`)).join('');
    } else {
      thead=`<th>Date</th><th>Type</th><th>Branch</th><th style="text-align:right">Amount</th><th>Requested by</th><th>Result</th><th>Decided by</th><th></th>`;
      body=rows.map(r=>rowHtml(r, r=>`<td>${statusBadge(r)}</td><td class="text-muted">${decidedBy(r)}</td>`)).join('');
    }
    document.getElementById('rq-list').innerHTML = `<div class="card"><div style="overflow-x:auto"><table style="margin:0">
      <thead><tr>${thead}</tr></thead><tbody>${body}</tbody></table></div></div>`;
  }

  function renderAll(){
    renderKPI();
    ['action','others','history'].forEach(t=>document.getElementById('rq-tab-'+t).classList.toggle('active', tab===t));
    const n=actionList().length; const nEl=document.getElementById('rq-action-n'); if(nEl) nEl.textContent=n?`(${n})`:'';
    renderList();
    document.getElementById('rq-drawer-root').innerHTML = selectedId ? renderDrawer() : '';
    FIN.refreshBadges();
  }

  /* ── Workflow — fixed named steps for this request's kind, current step
     highlighted. Request-only (Expense has no approval lifecycle). ── */
  function timelineSteps(r){
    if(r.status==='rejected') return [
      {label:'Requested', state:'done', caption:`${r.requestedBy} · ${r.date}`},
      {label:'Rejected',  state:'bad',  caption:`${r.approvedBy||''}${r.remark?' — '+r.remark:''}`},
    ];
    if(r.status==='cancelled') return [
      {label:'Requested', state:'done', caption:`${r.requestedBy} · ${r.date}`},
      {label:'Approved',  state:'done', caption:r.approvedBy?`by ${r.approvedBy}`:''},
      {label:'Cancelled', state:'bad',  caption:`${r.cancelledBy?'by '+r.cancelledBy:''}${r.cancelReason?' — '+r.cancelReason:''}${r.remark?' ('+r.remark+')':''}`},
    ];
    const isBudget=r.kind==='budget';
    const idxMap = isBudget ? {pending:0,approved:1,paid:2,closed:4} : {pending:0,approved:1,paid:2};
    const reached = idxMap[r.status] ?? 0;
    const steps = isBudget ? [
      {label:'Requested',       caption:`${r.requestedBy} · ${r.date}`},
      {label:'Approved',        caption:r.approvedBy?`by ${r.approvedBy}${r.approveRemark?' — '+r.approveRemark:''}`:''},
      {label:'Transferred',     caption:r.transferredBy?`by ${r.transferredBy}`:''},
      {label:'Invoice Uploaded',caption:r.taxInvBy?`by ${r.taxInvBy}`:''},
      {label:'Completed',       caption:''},
    ] : [
      {label:'Requested', caption:`${r.requestedBy} · ${r.date}`},
      {label:'Approved',  caption:r.approvedBy?`by ${r.approvedBy}${r.approveRemark?' — '+r.approveRemark:''}`:''},
      {label:'Completed', caption:r.transferredBy?`by ${r.transferredBy}`:''},
    ];
    return steps.map((s,i)=>({...s, state: i<=reached?'done': i===reached+1?'current':'upcoming'}));
  }
  // Audit (Logs tab) — generic historical events, separate from Workflow's fixed-step
  // progress. Requests have no free-edit feature today, so the only honest event is
  // the submission itself — not fabricated, just not much to show yet.
  const REQ_AUDIT_LABELS = { request_created:'Request submitted' };
  function auditLogsForRequest(r){ return [{ action:'request_created', by:r.requestedBy, at:r.date }]; }

  /* ── inline file-upload control embedded on the Workflow step itself
     (matches the reference mockup — no separate "Files" section). Shows a
     small dashed upload button while the step is actionable-and-empty, a
     small thumbnail once a file exists (either just picked or from history). ── */
  function fileThumbSmall(dataUrl,type,name){
    if(dataUrl && (type||'').startsWith('image')) return `<div style="width:40px;height:40px;border-radius:8px;overflow:hidden;flex-shrink:0;cursor:pointer" onclick="window.open('${dataUrl}','_blank')" title="${name||''}"><img src="${dataUrl}" style="width:100%;height:100%;object-fit:cover;display:block"></div>`;
    return `<div style="width:40px;height:40px;border:1px solid var(--md-outline-variant);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;color:var(--md-on-surface-variant)" title="${name||''}">${UI.icon('description','sm')}</div>`;
  }
  function uploadControl(inputId){
    return `<label style="cursor:pointer;flex-shrink:0" title="Attach file">
      <div id="${inputId}-preview" style="width:40px;height:40px;border:1.5px dashed var(--md-primary);border-radius:8px;display:flex;align-items:center;justify-content:center;color:var(--md-primary)">${UI.icon('upload','sm')}</div>
      <input type="file" id="${inputId}" style="display:none" accept="image/*,application/pdf" onchange="frFilePicked('${inputId}')">
    </label>`;
  }
  // Attach the inline upload control (actionable) or a read-only thumbnail (already
  // attached / viewed by someone who can't act) onto whichever step needs it right now.
  function workflowFileSteps(r){
    const steps=timelineSteps(r);
    if(r.kind!=='budget') return steps;
    const xferIdx=steps.findIndex(s=>s.label==='Transferred');
    const taxIdx=steps.findIndex(s=>s.label==='Invoice Uploaded');
    if(xferIdx>-1){
      if(r.status==='approved' && FIN.canTransfer(U(),r)) steps[xferIdx].extra=uploadControl('fr-slip');
      else if(r.slipDataUrl||r.slipName) steps[xferIdx].extra=fileThumbSmall(r.slipDataUrl,r.slipType,r.slipName);
    }
    if(taxIdx>-1){
      if(r.status==='paid') steps[taxIdx].extra=uploadControl('fr-tax');
      else if(r.taxInvDataUrl||r.taxInvName) steps[taxIdx].extra=fileThumbSmall(r.taxInvDataUrl,r.taxInvType,r.taxInvName);
    }
    return steps;
  }
  // Toggle the footer's primary action button on/off based on whether the file this
  // step needs has actually been picked yet (mirrors the reference mockup's
  // grayed-out → colored button once a file is attached) + live-preview the thumbnail.
  window.frFilePicked=function(inputId){
    const input=document.getElementById(inputId); const f=input && input.files[0];
    const preview=document.getElementById(inputId+'-preview');
    if(f && preview){
      if(f.type.startsWith('image')){
        const rd=new FileReader(); rd.onload=ev=>{ preview.innerHTML=`<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:8px;display:block">`; }; rd.readAsDataURL(f);
      } else preview.innerHTML=UI.icon('description','sm');
    }
    const btn=document.getElementById('fr-action-btn'); if(btn) btn.disabled=!f;
  };

  /* ── DRAWER — Info tab (title/badges/note → Payment method → Workflow &
     File upload) + Logs tab (plain audit history). ── */
  function whatBlock(r){
    return `${r.number ? `<div class="text-muted" style="font-size:var(--fs-label-sm);font-family:monospace">${r.number}</div>` : ''}
      <div style="font-size:var(--fs-title-sm);font-weight:600">${r.reason}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">${kindBadge(r)}${catBadge(r.category)}${statusAgingBadge(r)}</div>
      <div class="text-muted" style="font-size:var(--fs-label-md);margin-top:8px">${r.branch} BKK · ${r.date} · ${r.requestedBy}</div>
      ${r.note ? `<div class="text-muted" style="font-size:var(--fs-label-sm);margin-top:4px">${r.note}</div>` : ''}`;
  }
  // Direct Paid always pays the vendor directly (no intermediary account) — Payment
  // IS the vendor identity, so there's no separate "Vendor" row (Nock, 6 Jul 2026).
  function paymentSection(r){
    if(r.kind!=='budget') return `<div style="margin-top:var(--sp-3)">${FinPanel.card(
      FinPanel.sectionLabel('Payment method')+FinPanel.fieldRow('Amount', Utils.currency(r.amount), r.amount))}</div>`;
    return `<div style="margin-top:var(--sp-3)">${FinPanel.card(`
      ${FinPanel.sectionLabel('Payment method')}
      ${FinPanel.fieldRow('Amount', Utils.currency(r.amount), r.amount)}
      ${FinPanel.fieldRow('Payment', r.payTo || r.acctName, r.payTo || r.acctName)}
      ${FinPanel.fieldRow('Account number', r.acctNumber, r.acctNumber)}
      ${FinPanel.fieldRow('PromptPay', r.promptPay, r.promptPay)}`)}</div>`;
  }
  function workflowFileSection(r){
    return `<div style="margin-top:var(--sp-3)">${FinPanel.card(FinPanel.sectionLabel('Workflow & File upload')+FinPanel.timeline(workflowFileSteps(r)))}</div>`;
  }
  function renderInfoTab(r){
    return `${whatBlock(r)}${paymentSection(r)}${workflowFileSection(r)}`;
  }
  function renderLogsTab(r){
    return FinPanel.timeline(FinPanel.auditItems(auditLogsForRequest(r), REQ_AUDIT_LABELS));
  }

  function actionsFooter(r, mode){
    const canAct=FIN.canApproveReq(U(),r), canXfer=FIN.canTransfer(U(),r), canCancel=FIN.canCancelReq(U(),r);
    if(mode==='cancel'){
      return `<div style="margin-top:var(--sp-3)">
        <p class="text-muted" style="font-size:var(--fs-body-sm);margin-bottom:var(--sp-3)">คำขอนี้อนุมัติไปแล้วแต่ยังไม่จ่ายเงิน — ยกเลิกได้ ต้องระบุเหตุผล + หมายเหตุ</p>
        <label class="field-label">Cancel reason</label>
        <input type="text" id="fc-reason" class="form-input" style="width:100%" placeholder="e.g. ไม่จำเป็นแล้ว / เปลี่ยนแผน">
        <div style="margin-top:var(--sp-3)"><label class="field-label">Remark</label>
          <textarea id="fc-remark" class="form-input" style="width:100%;min-height:56px" placeholder="รายละเอียดเพิ่มเติม…"></textarea></div>
        <div style="display:flex;gap:8px;margin-top:var(--sp-3)">
          <button class="btn btn-secondary" style="flex:1" onclick="frOpen('${r.id}')">${UI.icon('arrow_back','sm')} Back</button>
          <button class="btn btn-danger" style="flex:1" onclick="frCancelSave('${r.id}')">${UI.icon('cancel','sm')} Confirm Cancel</button>
        </div>
      </div>`;
    }
    if(r.status==='pending' && canAct){
      return `<div style="margin-top:var(--sp-3)"><label class="field-label">Remark <span class="text-muted">(required to reject · optional to approve)</span></label>
        <textarea id="fr-remark" class="form-input" style="width:100%;min-height:56px" placeholder="Reason / note…"></textarea></div>
        <div style="display:flex;gap:8px;margin-top:var(--sp-3)">
          <button class="btn btn-danger" style="flex:1" onclick="frRejectSave('${r.id}')">${UI.icon('close','sm')} Reject</button>
          <button class="btn btn-primary" style="flex:1" onclick="frApproveSave('${r.id}')">${UI.icon('check','sm')} Approve</button>
        </div>`;
    }
    if(r.status==='approved' && canXfer){
      return `<div style="display:flex;gap:8px;margin-top:var(--sp-3)">
        ${canCancel?`<button class="btn btn-danger" style="flex:1" onclick="frOpen('${r.id}','cancel')">${UI.icon('cancel','sm')} Cancel Request</button>`:''}
        <button id="fr-action-btn" class="btn btn-primary" style="flex:1" disabled onclick="frConfirmSave('${r.id}')">${UI.icon('check','sm')} Confirm upload</button>
      </div>`;
    }
    if(r.status==='approved' && canCancel){
      return `<button class="btn btn-danger" style="width:100%;margin-top:var(--sp-3)" onclick="frOpen('${r.id}','cancel')">${UI.icon('cancel','sm')} Cancel Request</button>`;
    }
    if(r.status==='approved'){
      return `<div class="text-muted" style="font-size:var(--fs-label-sm);margin-top:var(--sp-3)">รอ SA/Director โอน + แนบสลิป</div>`;
    }
    if(r.status==='paid' && r.kind==='budget'){
      return `<button id="fr-action-btn" class="btn btn-primary" style="width:100%;margin-top:var(--sp-3)" disabled onclick="frTaxInvSave('${r.id}')">${UI.icon('check','sm')} Confirm upload & Complete</button>`;
    }
    return ''; // Complete / History = read only, no action buttons ("never show irrelevant buttons")
  }

  function renderDrawer(mode){
    if(!selectedId) return '';
    const r=DB.expenseRequests.find(x=>x.id===selectedId);
    if(!r) return '';
    const header = FinPanel.drawerHeader(`${kindLabel(r)} Request detail`,'approval','frClose');
    const tabsHtml = FinPanel.tabStrip([{key:'info',label:'Info'},{key:'logs',label:'Logs'}], drawerTab, 'frSetTab');
    const content = drawerTab==='logs' ? renderLogsTab(r) : renderInfoTab(r);
    const body = `<div style="padding:var(--sp-4);overflow-y:auto;flex:1">${content}${drawerTab==='info'?actionsFooter(r,mode):''}</div>`;
    return FinPanel.drawer(header+tabsHtml+body, 'frClose', {width:460});
  }

  window.frOpen=function(id, mode){
    selectedId=id; drawerTab='info';
    renderList();
    document.getElementById('rq-drawer-root').innerHTML = renderDrawer(mode);
  };
  window.frSetTab=function(t){
    drawerTab=t;
    document.getElementById('rq-drawer-root').innerHTML = renderDrawer();
  };
  window.frClose=function(){
    selectedId=null;
    document.getElementById('rq-drawer-root').innerHTML='';
    renderList();
  };

  window.frApproveSave=function(id){
    const remark=(document.getElementById('fr-remark')?.value||'');
    const r=FIN.approve(id,U(),remark);
    if(!r){ showToast('Not authorized','error'); return; }
    renderAll(); if(window._refreshFinDashboard) window._refreshFinDashboard();
    showToast(`${r.id} อนุมัติแล้ว → รอโอน KBiz`,'success');
  };
  window.frRejectSave=function(id){
    const remark=(document.getElementById('fr-remark')?.value||'');
    const r=FIN.reject(id,U(),remark);
    if(r==='remark_required'){ showToast('A remark is required to reject','error'); return; }
    if(!r){ showToast('Not authorized','error'); return; }
    renderAll(); if(window._refreshFinDashboard) window._refreshFinDashboard();
    showToast(`${r.id} rejected`,'info');
  };
  // Stage 2 — SA แนบสลิป KBiz → post money + Paid (slip stored as a real file, not just a filename)
  window.frConfirmSave=function(id){
    const f=document.getElementById('fr-slip')?.files[0];
    if(!f){ showToast('แนบสลิปโอนก่อน','error'); return; }
    const rd=new FileReader();
    rd.onload=ev=>{
      const r=FIN.markTransferred(id,U(), f.name, ev.target.result, f.type);
      if(!r){ showToast('Not authorized','error'); return; }
      renderAll(); if(window._refreshFinDashboard) window._refreshFinDashboard();
      showToast(`${r.id} จ่ายแล้ว ✓${r.kind==='budget'?' — รอ tax invoice':''}`,'success');
    };
    rd.readAsDataURL(f);
  };
  // Cancel — approved-but-not-yet-paid request · reason+remark required (before Ledger/Confirm)
  window.frCancelSave=function(id){
    const reason=document.getElementById('fc-reason').value.trim();
    const remark=document.getElementById('fc-remark').value.trim();
    const r=FIN.cancel(id,U(),reason,remark);
    if(r==='reason_remark_required'){ showToast('Cancel reason and remark are both required','error'); return; }
    if(!r){ showToast('Not authorized','error'); return; }
    renderAll(); if(window._refreshFinDashboard) window._refreshFinDashboard();
    showToast(`${r.id} cancelled`,'info');
  };
  // Stage 3 — Direct Paid: Admin upload tax invoice → Closed (Ledger/Expense created here now)
  window.frTaxInvSave=function(id){
    const f=document.getElementById('fr-tax')?.files[0];
    if(!f){ showToast('แนบ tax invoice ก่อน','error'); return; }
    const rd=new FileReader();
    rd.onload=ev=>{
      const r=FIN.uploadReqTaxInv(id, U(), f.name, ev.target.result, f.type);
      if(!r){ showToast('ต้องแนบเอกสาร','error'); return; }
      renderAll();
      showToast(`${r.id} ปิดรายการ (Closed) ✓ — บันทึกลง Ledger แล้ว`,'success');
    };
    rd.readAsDataURL(f);
  };

  /* ── NEW REQUEST chooser → Direct Paid / Petty top-up ── */
  window.rqNew=function(){
    Modal.create('modal-rq-new',`${UI.icon('approval')} New Request`,
    `<p class="text-muted" style="font-size:var(--fs-body-sm);margin-bottom:var(--sp-3)">เลือกประเภทคำขอ</p>
     <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3)">
       <button class="card card-sm" style="text-align:left;cursor:pointer;border:1px solid var(--md-outline-variant)" onclick="Modal.close('modal-rq-new');rqOpenBudget()">
         <div style="font-weight:700">${UI.icon('shopping_cart','sm')} Direct Paid</div>
         <div class="text-muted" style="font-size:var(--fs-label-sm);margin-top:4px">ขอซื้อของ/จ่าย vendor ก่อนจ่าย (gate ตาม tier)</div></button>
       <button class="card card-sm" style="text-align:left;cursor:pointer;border:1px solid var(--md-outline-variant)" onclick="Modal.close('modal-rq-new');rqOpenTopup()">
         <div style="font-weight:700">${UI.icon('savings','sm')} Petty Cash Top-up</div>
         <div class="text-muted" style="font-size:var(--fs-label-sm);margin-top:4px">ขอเติมเงินสดสาขา (Director/SA อนุมัติ)</div></button>
     </div>`,'');
  };

  /* ── DIRECT PAID request modal ── */
  window.rqOpenBudget=function(){
    const vb=FIN.visibleBranches(U());
    const cats=FIN.CATEGORIES.filter(c=>!['Received','Income','Salary','Rental'].includes(c.id));
    const today=new Date().toISOString().slice(0,10);
    Modal.create('modal-rq-budget',`${UI.icon('shopping_cart')} Direct Paid — Request`,
    `<!-- Invoice upload = เด่นสุด · ระบบอ่าน (AI) แล้ว auto-fill -->
     <div id="rq-drop" onclick="document.getElementById('rq-file').click()"
       style="border:2px dashed var(--md-primary);border-radius:12px;padding:20px;text-align:center;cursor:pointer;background:var(--md-primary-container)">
       <div style="font-size:var(--fs-title-sm);font-weight:700">${UI.icon('document_scanner')} อัปโหลด Invoice</div>
       <div class="text-muted" style="font-size:var(--fs-label-md);margin-top:4px">ระบบจะอ่านเอกสารแล้วกรอกช่องด้านล่างให้อัตโนมัติ (แก้ไขได้)</div>
       <div id="rq-fname" style="margin-top:6px;font-size:var(--fs-label-md);font-weight:600"></div>
     </div>
     <input type="file" id="rq-file" style="display:none" accept="image/*,application/pdf" onchange="rqReadInvoice(this)">
     <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3);margin-top:var(--sp-3)">
      <div><label class="field-label">Date</label><input type="date" id="rq-date" class="form-input" style="width:100%" value="${today}"></div>
      <div><label class="field-label">Branch</label><select id="rq-branch" class="form-input" style="width:100%">${opts(vb.map(b=>({value:b,label:b})),vb[0])}</select></div>
      <div><label class="field-label">Category</label><select id="rq-cat" class="form-input" style="width:100%">${opts(cats.map(c=>({value:c.id,label:c.short})),cats[0].id)}</select></div>
      <div><label class="field-label">Amount (THB)</label><input type="number" id="rq-amt" class="form-input" style="width:100%" oninput="rqTier()"></div>
      <div><label class="field-label">Vendor (Paid to)</label><input type="text" id="rq-payto" class="form-input" style="width:100%" placeholder="e.g. IKEA"></div>
      <div><label class="field-label">Pay method</label>
        <select id="rq-pay" class="form-input" style="width:100%">
          <option value="central">Central จ่ายตรง</option><option value="transfer">โอนเข้าสาขา แล้วสาขาจ่าย</option></select></div>
     </div>
     <div class="text-muted" style="font-size:var(--fs-label-sm);margin-top:var(--sp-3)">${UI.icon('account_balance','sm')} รายละเอียดบัญชีสำหรับ SA โอน KBiz</div>
     ${(DB.financeBankAccounts||[]).length ? `<div style="margin-top:var(--sp-2)"><label class="field-label">Quick-fill จากบัญชีที่บันทึกไว้ (Settings → Bank Accounts)</label>
      <select class="form-input" style="width:100%" onchange="rqFillBankAccount(this.value)">
        <option value="">— เลือกบัญชี (ไม่บังคับ) —</option>
        ${DB.financeBankAccounts.filter(a=>a.status==='active').map(a=>`<option value="${a.id}">${a.bank} — ${a.accountName}${a.branch?' ('+a.branch+')':''}</option>`).join('')}
      </select></div>` : ''}
     <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:var(--sp-3);margin-top:var(--sp-2)">
      <div><label class="field-label">Account name</label><input type="text" id="rq-acctname" class="form-input" style="width:100%" placeholder="e.g. IKEA (Thailand) Co."></div>
      <div><label class="field-label">Account number</label><input type="text" id="rq-acctnum" class="form-input" style="width:100%" placeholder="e.g. 123-4-56789-0 (KBank)"></div>
      <div><label class="field-label">PromptPay</label><input type="text" id="rq-promptpay" class="form-input" style="width:100%" placeholder="e.g. 08x-xxx-xxxx"></div>
     </div>
     <div style="margin-top:var(--sp-3)"><label class="field-label">Reason / รายละเอียด</label><input type="text" id="rq-reason" class="form-input" style="width:100%" placeholder="ขอซื้ออะไร เพื่ออะไร"></div>
     <div style="margin-top:var(--sp-3)"><label class="field-label">Note / Remark (เพิ่มเติม)</label><textarea id="rq-note" class="form-input" style="width:100%;min-height:56px" placeholder="หมายเหตุเพิ่มเติม (ถ้ามี)"></textarea></div>
     <div id="rq-tier" style="margin-top:var(--sp-3)"></div>`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-rq-budget')">Cancel</button>
     <button class="btn btn-primary" onclick="rqSave()">${UI.icon('send','sm')} Submit Request</button>`,'modal-lg');
    rqTier();
  };
  // Quick-fill payment fields from a saved Bank Account (Settings → Bank Accounts) —
  // just pre-fills the free-text fields below, doesn't lock them (still editable/overridable).
  window.rqFillBankAccount=function(id){
    if(!id) return;
    const a=(DB.financeBankAccounts||[]).find(x=>x.id===id); if(!a) return;
    const set=(elId,v)=>{ const el=document.getElementById(elId); if(el) el.value=v||''; };
    set('rq-acctname', a.accountName); set('rq-acctnum', a.accountNumber); set('rq-promptpay', a.promptPay);
  };
  // Mock AI: อ่าน invoice → auto-fill (prototype จำลอง · จริงต้องต่อ OCR/AI backend)
  window.rqReadInvoice=function(input){
    const f=input.files[0]; if(!f) return;
    document.getElementById('rq-fname').textContent = `${UI.icon('description','sm')} ${f.name}`;
    const drop=document.getElementById('rq-drop'); if(drop) drop.innerHTML=`<div style="font-weight:700">${UI.icon('autorenew')} กำลังอ่านเอกสาร…</div>`;
    setTimeout(()=>{   // จำลองการอ่าน
      const set=(id,v)=>{ const el=document.getElementById(id); if(el&&!el.value) el.value=v; };
      set('rq-payto','IKEA (Thailand)'); set('rq-amt','10000');
      set('rq-acctname','IKEA (Thailand) Co., Ltd.'); set('rq-acctnum','123-4-56789-0 (KBank)');
      const cat=document.getElementById('rq-cat'); if(cat) cat.value='Equipment';
      set('rq-reason','Desk & Chair x15');
      if(drop) drop.innerHTML=`<div style="font-weight:700;color:var(--md-success)">${UI.icon('check_circle')} อ่าน invoice แล้ว</div>
        <div class="text-muted" style="font-size:var(--fs-label-md);margin-top:4px">${f.name} · กรอกให้อัตโนมัติแล้ว — ตรวจสอบ/แก้ไขด้านล่าง</div>`;
      rqTier(); showToast('อ่าน invoice แล้ว (จำลอง) — ตรวจสอบค่าที่กรอกให้','info');
    }, 700);
  };
  window.rqTier=function(){
    const amt=parseFloat(document.getElementById('rq-amt')?.value)||0; const box=document.getElementById('rq-tier'); if(!box)return;
    const tier=FIN.approvalTier(amt);
    box.innerHTML = tier==='none'
      ? `<div class="text-muted" style="font-size:var(--fs-label-md)">${UI.icon('info','sm')} ต่ำกว่า ฿1,000 — จ่าย petty ได้เลย ไม่ต้อง request</div>`
      : `<div class="card card-sm" style="background:var(--md-primary-container)">${UI.icon('approval','sm')} ต้องอนุมัติโดย <b>${FIN.tierLabel(tier)}</b></div>`;
  };
  // saves the uploaded invoice as a real previewable file (dataURL) — not just a filename,
  // so whoever approves later can actually see it without leaving the app
  window.rqSave=function(){
    const amt=parseFloat(document.getElementById('rq-amt').value)||0;
    const reason=document.getElementById('rq-reason').value.trim();
    if(!amt){showToast('Enter an amount','error');return;}
    if(!reason){showToast('Add a reason','error');return;}
    const file=document.getElementById('rq-file').files[0];
    const finish=(durl,dtype,dname)=>{
      DB.expenseRequests.unshift({ id:FIN.nextId('req',DB.expenseRequests), number:FIN.nextDocNumber('request'), kind:'budget',
        payMethod:document.getElementById('rq-pay').value, date:document.getElementById('rq-date').value,
        branch:document.getElementById('rq-branch').value, category:document.getElementById('rq-cat').value,
        amount:amt, source:'central', requestedBy:U().name, payTo:document.getElementById('rq-payto').value.trim(),
        acctName:document.getElementById('rq-acctname').value.trim(),
        acctNumber:document.getElementById('rq-acctnum').value.trim(),
        promptPay:document.getElementById('rq-promptpay').value.trim(),
        note:document.getElementById('rq-note').value.trim(),
        reason, tier:FIN.approvalTier(amt), status:'pending', approvedBy:null,
        docName:dname||null, docDataUrl:durl||null, docType:dtype||null });
      Modal.close('modal-rq-budget'); tab='action'; selectedId=null; renderAll();
      showToast('Direct Paid request submitted ✓','success');
    };
    if(file){ const r=new FileReader(); r.onload=ev=>finish(ev.target.result,file.type,file.name); r.readAsDataURL(file); }
    else finish(null,null,null);
  };

  /* ── PETTY CASH TOP-UP request ── */
  window.rqOpenTopup=function(){
    const vb=FIN.visibleBranches(U());
    Modal.create('modal-rq-topup',`${UI.icon('savings')} Request Petty Cash`,
    `<p class="text-muted" style="font-size:var(--fs-body-sm);margin-bottom:var(--sp-3)">ขอเติมเงินสด petty cash ของสาขา — ส่งให้ Director/Special Admin อนุมัติ</p>
     <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3)">
      <div><label class="field-label">Branch</label><select id="ft-branch" class="form-input" style="width:100%">${opts(vb.map(b=>({value:b,label:b})),vb[0])}</select></div>
      <div><label class="field-label">Amount (THB)</label><input type="number" id="ft-amt" class="form-input" style="width:100%" value="5000"></div>
     </div>
     <div style="margin-top:var(--sp-3)"><label class="field-label">Reason</label><input type="text" id="ft-reason" class="form-input" style="width:100%" value="เติม petty cash สาขา"></div>`,
    `<button class="btn btn-secondary" onclick="Modal.close('modal-rq-topup')">Cancel</button>
     <button class="btn btn-primary" onclick="ftSave()">${UI.icon('send','sm')} Submit Request</button>`);
  };
  window.ftSave=function(){
    const amt=parseFloat(document.getElementById('ft-amt').value)||0;
    if(!amt){showToast('Enter an amount','error');return;}
    DB.expenseRequests.unshift({ id:FIN.nextId('req',DB.expenseRequests), number:FIN.nextDocNumber('request'), kind:'petty_topup', payMethod:'transfer',
      date:new Date().toISOString().slice(0,10), branch:document.getElementById('ft-branch').value,
      category:'Received', amount:amt, source:'central', requestedBy:U().name,
      reason:document.getElementById('ft-reason').value.trim()||'เติม petty cash สาขา',
      tier:'director', status:'pending', approvedBy:null, docName:null });
    Modal.close('modal-rq-topup'); tab='action'; selectedId=null; renderAll();
    showToast('ส่งคำขอเติม petty cash → รอ Director/SA อนุมัติ','info');
  };

  /* ── bootstrap ── */
  renderAll();
  window._refreshFinRequests = renderAll;
  window.rqTab=function(t){ tab=t; selectedId=null; renderAll(); };

  // keyboard nav: ↑/↓ moves the open drawer to the adjacent row (never bound to
  // a destructive action — approving/rejecting stay deliberate clicks)
  document.addEventListener('keydown', e => {
    const view = document.getElementById('view-fin-requests');
    if (!view || !view.classList.contains('active')) return;
    if (e.target && ['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    if (e.key!=='ArrowDown' && e.key!=='ArrowUp') return;
    const rows=currentList(); if(!rows.length) return;
    const i=rows.findIndex(r=>r.id===selectedId);
    const next = e.key==='ArrowDown' ? Math.min(rows.length-1,(i<0?0:i+1)) : Math.max(0,(i<0?0:i-1));
    frOpen(rows[next].id);
    e.preventDefault();
  });

})();
