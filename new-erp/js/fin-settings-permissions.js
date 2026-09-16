/* ============================================================
   fin-settings-permissions.js — Finance ▸ Settings ▸ Permissions
   Edits DB.financePermissions (role × capability grid).
   ⚠️ Display/edit only this round — NOT yet wired into the real
   authorization checks (FIN.canApprove/canApproveReq/canTransfer/
   isReimApprover still run on the original ROLE_RANK logic in
   data-finance.js). Wiring this into live enforcement is an explicit
   Phase 2, confirmed with Nock — see FINANCE-MODEL.md §19. Rewiring
   those checks without a dedicated testing pass risks silently
   breaking the Requests approve/reject/transfer flow.
   Exposes window.finRenderPermissions() for fin-settings.js's router.
   ============================================================ */
(function () {

  const ROLE_LABEL = { director:'Director', area_manager:'Area Manager', manager:'Manager', admin:'Admin', teacher:'Teacher' };
  const CAPS = [
    { key:'canApproveRequests',    label:'Approve Direct Paid requests' },
    { key:'canApprovePettyTopup',  label:'Approve Petty Top-up' },
    { key:'canManageBankAccounts', label:'Manage Bank Accounts' },
    { key:'canEditSettings',       label:'Edit Finance Settings' },
    { key:'canViewReports',        label:'View Reports' },
  ];

  window.finRenderPermissions = function () {
    const rows = DB.financePermissions;
    return `<div>
      <div style="margin-bottom:8px">
        <div style="font-size:17px;font-weight:600;margin-bottom:4px">Permissions</div>
        <div class="text-muted" style="font-size:13px">Finance role/permission แยกจาก Academy — ตั้งค่าได้อิสระที่นี่</div>
      </div>
      <div class="card card-sm" style="background:var(--md-warning-container);border:1px solid var(--md-warning);margin-bottom:16px">
        ${UI.icon('info','sm')} <b>Preview เท่านั้นในตอนนี้</b> — ค่าที่แก้ที่นี่ยังไม่ถูกใช้ตรวจสิทธิ์จริงใน Requests/
        Reimbursement (ยังใช้ระดับตำแหน่งเดิมอยู่) จะต่อเข้าใช้งานจริงในเฟสถัดไป
      </div>
      <div style="overflow-x:auto"><table style="margin:0">
        <thead><tr><th>Role</th>${CAPS.map(c=>`<th style="text-align:center">${c.label}</th>`).join('')}</tr></thead>
        <tbody>${rows.map((r,i)=>`<tr>
          <td><b>${ROLE_LABEL[r.role]||r.role}</b></td>
          ${CAPS.map(c=>`<td style="text-align:center"><input type="checkbox" ${r[c.key]?'checked':''}
            style="accent-color:var(--md-primary);width:15px;height:15px;cursor:pointer"
            onchange="finSetPermission(${i},'${c.key}',this.checked)"></td>`).join('')}
        </tr>`).join('')}</tbody></table></div>
    </div>`;
  };
  window.finSetPermission = function (i, key, val) {
    DB.financePermissions[i][key] = val;
    showToast('Saved (preview only — not yet enforced)', 'info');
  };

})();
