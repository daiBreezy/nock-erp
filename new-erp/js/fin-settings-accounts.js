/* ============================================================
   fin-settings-accounts.js — Finance ▸ Settings ▸ Petty Cash + Bank Accounts
   Petty Cash: one row per branch (DB.financePettyCash), no scope-switcher
   needed (unlike Academy Settings) — just a flat per-branch table.
   Bank Accounts: real company bank-account directory (DB.financeBankAccounts),
   additive to (not a replacement of) DB.financeAccounts' internal ledger-
   bucket keys. Exposes window.finRenderPettyCash()/finRenderBankAccounts()
   for fin-settings.js's router.
   ============================================================ */
(function () {

  const U = () => window.CURRENT_USER;

  /* ══════════ 4. PETTY CASH ══════════ */
  window.finRenderPettyCash = function () {
    const rows = DB.financePettyCash;
    const staffNames = (DB.staff||[]).filter(s=>s.status==='active').map(s=>s.name);
    const accts = DB.financeBankAccounts || [];
    return `<div>
      <div style="margin-bottom:20px">
        <div style="font-size:17px;font-weight:600;margin-bottom:4px">Petty Cash</div>
        <div class="text-muted" style="font-size:13px">ตั้งค่า petty cash แยกต่อสาขา</div>
      </div>
      <div style="overflow-x:auto"><table style="margin:0">
        <thead><tr><th>Branch</th><th style="text-align:right">Current Balance</th><th style="text-align:right">Min Balance</th>
          <th style="text-align:right">Default Top-up</th><th style="text-align:right">Reminder At</th><th>Responsible Staff</th><th>Default Account</th></tr></thead>
        <tbody>${rows.map((p,i)=>`<tr>
          <td><b>${p.branch}</b></td>
          <td style="text-align:right"><input type="number" class="settings-input" style="width:110px;text-align:right" value="${p.currentBalance}" onchange="finSetPettyField(${i},'currentBalance',parseFloat(this.value)||0)"></td>
          <td style="text-align:right"><input type="number" class="settings-input" style="width:100px;text-align:right" value="${p.minBalance}" onchange="finSetPettyField(${i},'minBalance',parseFloat(this.value)||0)"></td>
          <td style="text-align:right"><input type="number" class="settings-input" style="width:100px;text-align:right" value="${p.defaultTopupAmount}" onchange="finSetPettyField(${i},'defaultTopupAmount',parseFloat(this.value)||0)"></td>
          <td style="text-align:right"><input type="number" class="settings-input" style="width:100px;text-align:right" value="${p.autoReminderThreshold}" onchange="finSetPettyField(${i},'autoReminderThreshold',parseFloat(this.value)||0)"></td>
          <td><select class="settings-input" style="width:140px" onchange="finSetPettyField(${i},'responsibleStaff',this.value)">
            <option value="">—</option>
            ${staffNames.map(n=>`<option ${p.responsibleStaff===n?'selected':''}>${n}</option>`).join('')}
          </select></td>
          <td><select class="settings-input" style="width:170px" onchange="finSetPettyField(${i},'defaultAccountId',this.value)">
            <option value="">—</option>
            ${accts.map(a=>`<option value="${a.id}" ${p.defaultAccountId===a.id?'selected':''}>${a.bank} — ${a.accountName}</option>`).join('')}
          </select></td>
        </tr>`).join('')}</tbody></table></div>
      <div class="text-muted" style="font-size:12px;margin-top:12px">${UI.icon('info','sm')} Current Balance ที่นี่คือค่าตั้งต้น — ยอดจริงคำนวณสดจาก ledger ใน Expenses/Dashboard เสมอ</div>
    </div>`;
  };
  window.finSetPettyField = function (i, field, val) {
    DB.financePettyCash[i][field] = val;
    if (field !== 'currentBalance') finStShowSection('petty'); // avoid re-render stealing focus mid-typing balance
  };

  /* ══════════ 5. BANK ACCOUNTS ══════════ */
  window.finRenderBankAccounts = function () {
    const accts = DB.financeBankAccounts;
    const branches = ['', ...FIN.branches()];
    const USE_OPTS = ['transfer','topup','reimbursement'];
    return `<div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <div style="font-size:17px;font-weight:600;margin-bottom:4px">Bank Accounts</div>
          <div class="text-muted" style="font-size:13px">บัญชีธนาคารจริงของบริษัท — ใช้ quick-fill ตอนสร้าง Direct Paid request</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="finAddBankAccount()">${UI.icon('add','sm')} Add Account</button>
      </div>
      <div style="overflow-x:auto"><table style="margin:0">
        <thead><tr><th>Bank</th><th>Account Name</th><th>Account Number</th><th>PromptPay</th><th>Branch</th><th>Used For</th><th style="text-align:center">Status</th><th style="text-align:center">Default</th><th></th></tr></thead>
        <tbody>${accts.map((a,i)=>`<tr>
          <td>${a.bank}</td>
          <td>${a.accountName}</td>
          <td class="text-muted">${a.accountNumber}</td>
          <td class="text-muted">${a.promptPay||'—'}</td>
          <td>${a.branch||'<span class="text-muted">Company-wide</span>'}</td>
          <td>${USE_OPTS.filter(u=>(a.usedFor||[]).includes(u)).map(u=>UI.badge(u,'blue')).join(' ')}</td>
          <td style="text-align:center"><input type="checkbox" ${a.status==='active'?'checked':''} style="accent-color:var(--md-primary);width:15px;height:15px;cursor:pointer" onchange="finToggleBankStatus(${i},this.checked)"></td>
          <td style="text-align:center"><input type="radio" name="fin-bank-default" ${a.isDefault?'checked':''} style="accent-color:var(--md-primary);width:15px;height:15px;cursor:pointer" onchange="finSetDefaultBank(${i})"></td>
          <td style="text-align:right"><button class="btn btn-secondary btn-sm" onclick="finRemoveBankAccount(${i})">${UI.icon('delete','sm')}</button></td>
        </tr>`).join('')}</tbody></table></div>
    </div>`;
  };
  window.finToggleBankStatus = function (i, checked) { DB.financeBankAccounts[i].status = checked ? 'active' : 'inactive'; };
  window.finSetDefaultBank = function (i) {
    DB.financeBankAccounts.forEach((a, j) => { a.isDefault = j === i; });
    finStShowSection('bank');
  };
  window.finRemoveBankAccount = function (i) {
    DB.financeBankAccounts.splice(i, 1);
    showToast('Account removed', 'info'); finStShowSection('bank');
  };
  window.finAddBankAccount = function () {
    const branches = FIN.branches();
    Modal.create('modal-fin-add-bank', `${UI.icon('add_circle','sm')} Add Bank Account`, `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-3)">
        <div class="settings-group"><label class="settings-label">Bank</label><input class="settings-input" id="fb-bank" placeholder="e.g. Kasikornbank"></div>
        <div class="settings-group"><label class="settings-label">Account Name</label><input class="settings-input" id="fb-name" placeholder="e.g. Nock Academy Co., Ltd."></div>
        <div class="settings-group"><label class="settings-label">Account Number</label><input class="settings-input" id="fb-num" placeholder="e.g. 123-4-56789-0"></div>
        <div class="settings-group"><label class="settings-label">PromptPay</label><input class="settings-input" id="fb-pp" placeholder="e.g. 0812345678"></div>
        <div class="settings-group"><label class="settings-label">Branch</label>
          <select class="settings-input" id="fb-branch"><option value="">Company-wide</option>${branches.map(b=>`<option>${b}</option>`).join('')}</select></div>
        <div class="settings-group"><label class="settings-label">Used For</label>
          <div style="display:flex;gap:12px;padding-top:8px">
            ${['transfer','topup','reimbursement'].map(u=>`<label style="display:flex;align-items:center;gap:6px;font-size:13px">
              <input type="checkbox" class="fb-use" value="${u}" checked style="accent-color:var(--md-primary)"> ${u}</label>`).join('')}
          </div></div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-fin-add-bank')">Cancel</button>
       <button class="btn btn-primary" onclick="finConfirmAddBankAccount()">Add Account</button>`, 'modal-lg');
  };
  window.finConfirmAddBankAccount = function () {
    const bank = document.getElementById('fb-bank').value.trim();
    const accountName = document.getElementById('fb-name').value.trim();
    const accountNumber = document.getElementById('fb-num').value.trim();
    if (!bank || !accountName) { showToast('Enter bank + account name', 'warning'); return; }
    const usedFor = [...document.querySelectorAll('.fb-use:checked')].map(el => el.value);
    DB.financeBankAccounts.push({
      id: 'bank-' + Date.now(), bank, accountName, accountNumber,
      promptPay: document.getElementById('fb-pp').value.trim(),
      branch: document.getElementById('fb-branch').value || null,
      status: 'active', isDefault: false, usedFor,
    });
    Modal.close('modal-fin-add-bank'); showToast('Bank account added ✓', 'success'); finStShowSection('bank');
  };

})();
