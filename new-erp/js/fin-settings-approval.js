/* ============================================================
   fin-settings-approval.js — Finance ▸ Settings ▸ Approval Rules
   Edits DB.financeApprovalRules (read by data-finance.js's tierFor()).
   Exposes window.finRenderApproval() for fin-settings.js's router.
   ============================================================ */
(function () {

  const TIER_LABEL = { manager:'Manager', area_manager:'Area Manager', director:'Director / Special Admin' };
  const ROLE_OPTS = ['manager','area_manager','director'];

  window.finRenderApproval = function () {
    const rules = DB.financeApprovalRules.slice().sort((a,b)=>a.minAmount-b.minAmount);
    const branches = ['all', ...FIN.branches()];
    return `<div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <div style="font-size:17px;font-weight:600;margin-bottom:4px">Approval Rules</div>
          <div class="text-muted" style="font-size:13px">Gate ตามยอดเงิน — ใครต้องอนุมัติ Direct Paid ที่ยอดเท่าไหร่</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="finAddApprovalRule()">${UI.icon('add','sm')} Add Gate</button>
      </div>
      <div style="overflow-x:auto"><table style="margin:0">
        <thead><tr><th>Tier</th><th>Min Amount</th><th>Max Amount</th><th>Branch</th><th>Approver Role</th><th style="text-align:center">Multiple Approvers</th><th></th></tr></thead>
        <tbody>${rules.map(r=>{
          const i = DB.financeApprovalRules.indexOf(r);
          return `<tr>
          <td><b>${TIER_LABEL[r.tier]||r.tier}</b></td>
          <td><input type="number" class="settings-input" style="width:100px" value="${r.minAmount}" onchange="finSetApprovalField(${i},'minAmount',parseFloat(this.value)||0)"></td>
          <td><input type="number" class="settings-input" style="width:100px" placeholder="ไม่จำกัด" value="${r.maxAmount==null?'':r.maxAmount}" onchange="finSetApprovalField(${i},'maxAmount',this.value===''?null:parseFloat(this.value))"></td>
          <td><select class="settings-input" style="width:130px" onchange="finSetApprovalField(${i},'branch',this.value)">
            ${branches.map(b=>`<option value="${b}" ${r.branch===b?'selected':''}>${b==='all'?'ทุกสาขา':b}</option>`).join('')}
          </select></td>
          <td><select class="settings-input" style="width:150px" onchange="finSetApprovalRole(${i},this.value)">
            ${ROLE_OPTS.map(role=>`<option value="${role}" ${(r.approverRoles||[])[0]===role?'selected':''}>${TIER_LABEL[role]}</option>`).join('')}
          </select></td>
          <td style="text-align:center"><input type="checkbox" ${r.requireMultiple?'checked':''} style="accent-color:var(--md-primary);width:15px;height:15px;cursor:pointer" onchange="finSetApprovalField(${i},'requireMultiple',this.checked)"></td>
          <td style="text-align:right"><button class="btn btn-secondary btn-sm" onclick="finRemoveApprovalRule(${i})">${UI.icon('delete','sm')}</button></td>
        </tr>`;}).join('')}
        </tbody></table></div>
      <div class="text-muted" style="font-size:12px;margin-top:12px">${UI.icon('info','sm')} Gate นี้คุมแค่ Direct Paid (ขอซื้อของ) — Reimbursement ไม่มี tier gate (Admin สาขาตรวจพอ)</div>
    </div>`;
  };
  window.finSetApprovalField = function (i, field, val) {
    DB.financeApprovalRules[i][field] = val;
    finStShowSection('approval');
  };
  window.finSetApprovalRole = function (i, role) {
    DB.financeApprovalRules[i].approverRoles = [role];
    finStShowSection('approval');
  };
  window.finRemoveApprovalRule = function (i) {
    DB.financeApprovalRules.splice(i, 1);
    showToast('Gate removed', 'info'); finStShowSection('approval');
  };
  window.finAddApprovalRule = function () {
    Modal.create('modal-fin-add-gate', `${UI.icon('add_circle','sm')} Add Approval Gate`, `
      <div class="settings-group" style="margin-bottom:12px">
        <label class="settings-label">Min Amount (THB)</label>
        <input type="number" class="settings-input" id="fag-min" placeholder="e.g. 5000">
      </div>
      <div class="settings-group">
        <label class="settings-label">Approver Role</label>
        <select class="settings-input" id="fag-role">
          ${['manager','area_manager','director'].map(r=>`<option value="${r}">${TIER_LABEL[r]}</option>`).join('')}
        </select>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-fin-add-gate')">Cancel</button>
       <button class="btn btn-primary" onclick="finConfirmAddApprovalRule()">Add Gate</button>`);
  };
  window.finConfirmAddApprovalRule = function () {
    const min = parseFloat(document.getElementById('fag-min').value) || 0;
    const role = document.getElementById('fag-role').value;
    DB.financeApprovalRules.push({
      id: 'gate-' + Date.now(), tier: role, minAmount: min, maxAmount: null,
      branch: 'all', approverRoles: [role], requireMultiple: false,
    });
    Modal.close('modal-fin-add-gate'); showToast('Gate added ✓', 'success'); finStShowSection('approval');
  };

})();
