/* ============================================================
   fin-settings.js — Finance ▸ Settings (shell + General/Categories/
   Payment Methods/Numbering). Self-contained page, own left-nav +
   right-panel shell mirroring js/settings.js's shape (same CSS
   classes: .st-nav-item / settings-input / settings-label) but its
   own router (finStShowSection) — Finance Settings never reads or
   writes Academy's DB.branchSettings/DB.packages/etc.
   Other sections: fin-settings-approval.js (Approval Rules),
   fin-settings-accounts.js (Petty Cash + Bank Accounts),
   fin-settings-permissions.js (Permissions).
   See FINANCE-MODEL.md §19.
   ============================================================ */
(function () {

  window._finStSection = 'general';

  document.getElementById('view-fin-settings').innerHTML = `
    ${UI.pageHeader('Finance Settings', 'Configuration แยกจาก Academy Settings ทั้งหมด — Finance เป็นเจ้าของข้อมูลนี้เอง')}
    <div style="display:flex;border:1px solid var(--md-outline-variant);border-radius:12px;
      overflow:hidden;background:var(--md-surface);min-height:540px;margin-top:var(--sp-2)">
      <div style="width:200px;flex-shrink:0;border-right:1px solid var(--md-outline-variant);
        padding:12px 8px;background:var(--md-surface-lowest)" id="fin-st-nav"></div>
      <div id="fin-st-panel" style="flex:1;padding:28px 32px;min-width:0;
        overflow-y:auto;max-height:calc(100vh - 210px)"></div>
    </div>`;

  function navItem(section, icon, label) {
    const active = window._finStSection === section;
    return `<div class="st-nav-item" data-section="${section}" onclick="finStShowSection('${section}')"
      style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;
        cursor:pointer;margin-bottom:2px;font-size:13px;font-weight:500;transition:background .12s;
        background:${active?'var(--md-primary-container)':'transparent'};
        color:${active?'var(--md-primary)':'var(--md-on-surface-variant)'}">
      ${UI.icon(icon,'sm')}<span>${label}</span></div>`;
  }
  function renderNav() {
    document.getElementById('fin-st-nav').innerHTML = [
      navItem('general',     'home_work',      'General'),
      navItem('categories',  'category',       'Categories'),
      navItem('approval',    'approval',       'Approval Rules'),
      navItem('petty',       'savings',        'Petty Cash'),
      navItem('bank',        'account_balance','Bank Accounts'),
      navItem('payment',     'payments',       'Payment Methods'),
      navItem('numbering',   'tag',            'Numbering'),
      navItem('permissions', 'admin_panel_settings', 'Permissions'),
    ].join('');
  }

  window.finStShowSection = function (name) {
    window._finStSection = name;
    renderNav();
    const panel = document.getElementById('fin-st-panel'); if (!panel) return;
    switch (name) {
      case 'general':     panel.innerHTML = renderGeneral(); break;
      case 'categories':  panel.innerHTML = renderCategories(); break;
      case 'approval':    panel.innerHTML = window.finRenderApproval ? finRenderApproval() : ''; break;
      case 'petty':       panel.innerHTML = window.finRenderPettyCash ? finRenderPettyCash() : ''; break;
      case 'bank':        panel.innerHTML = window.finRenderBankAccounts ? finRenderBankAccounts() : ''; break;
      case 'payment':     panel.innerHTML = renderPaymentMethods(); break;
      case 'numbering':   panel.innerHTML = renderNumbering(); break;
      case 'permissions': panel.innerHTML = window.finRenderPermissions ? finRenderPermissions() : ''; break;
    }
  };

  /* ══════════ 1. GENERAL ══════════ */
  function renderGeneral() {
    const g = DB.financeGeneral;
    const branches = FIN.branches();
    const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `<div style="max-width:520px">
      <div style="font-size:17px;font-weight:600;margin-bottom:4px">General</div>
      <div class="text-muted" style="font-size:13px;margin-bottom:24px">ค่าตั้งต้นของระบบ Finance ทั้งหมด</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div><label class="settings-label">Currency</label>
          <select class="settings-input" id="fg-currency">
            ${['THB','USD','EUR'].map(c=>`<option ${g.currency===c?'selected':''}>${c}</option>`).join('')}
          </select></div>
        <div><label class="settings-label">Fiscal Year Start</label>
          <select class="settings-input" id="fg-fy">
            ${MONTHS.map((m,i)=>`<option value="${i+1}" ${g.fiscalYearStartMonth===i+1?'selected':''}>${m}</option>`).join('')}
          </select></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px">
        <div><label class="settings-label">Default Branch</label>
          <select class="settings-input" id="fg-branch">
            ${branches.map(b=>`<option ${g.defaultBranch===b?'selected':''}>${b}</option>`).join('')}
          </select></div>
        <div><label class="settings-label">Default Tax Behavior</label>
          <select class="settings-input" id="fg-tax">
            <option value="none" ${g.defaultTaxBehavior==='none'?'selected':''}>None</option>
            <option value="inclusive" ${g.defaultTaxBehavior==='inclusive'?'selected':''}>Tax Inclusive</option>
            <option value="exclusive" ${g.defaultTaxBehavior==='exclusive'?'selected':''}>Tax Exclusive</option>
          </select></div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="finSaveGeneral()">${UI.icon('save','sm')} Save</button>
    </div>`;
  }
  window.finSaveGeneral = function () {
    const g = DB.financeGeneral;
    g.currency = document.getElementById('fg-currency').value;
    g.fiscalYearStartMonth = parseInt(document.getElementById('fg-fy').value, 10);
    g.defaultBranch = document.getElementById('fg-branch').value;
    g.defaultTaxBehavior = document.getElementById('fg-tax').value;
    showToast('General settings saved ✓', 'success');
  };

  /* ══════════ 2. CATEGORIES ══════════ */
  function renderCategories() {
    const cats = DB.financeCategories;
    return `<div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <div style="font-size:17px;font-weight:600;margin-bottom:4px">Categories</div>
          <div class="text-muted" style="font-size:13px">หมวดค่าใช้จ่าย — ใช้ในทุก Expense/Request badge</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="finAddCategory()">${UI.icon('add','sm')} Add Category</button>
      </div>
      <div style="overflow-x:auto"><table style="margin:0">
        <thead><tr><th>Category</th><th>Color</th><th>Default source</th><th style="text-align:center">Active</th><th></th></tr></thead>
        <tbody>
        ${cats.map((c,i)=>`<tr>
          <td>${UI.badge(c.short, c.color)} <span class="text-muted" style="font-size:12px">${c.id}</span></td>
          <td><span class="badge badge-${c.color}" style="width:20px;height:20px;padding:0;display:inline-block"></span></td>
          <td><select class="settings-input" style="width:130px" onchange="finSetCatSource(${i},this.value)">
            <option value="petty" ${c.defaultSource==='petty'?'selected':''}>Petty</option>
            <option value="central" ${c.defaultSource==='central'?'selected':''}>Central</option>
          </select></td>
          <td style="text-align:center"><input type="checkbox" ${c.active?'checked':''} style="accent-color:var(--md-primary);width:15px;height:15px;cursor:pointer" onchange="finToggleCatActive(${i},this.checked)"></td>
          <td style="text-align:right"><button class="btn btn-secondary btn-sm" onclick="finRemoveCategory(${i})">${UI.icon('delete','sm')}</button></td>
        </tr>`).join('')}
        </tbody></table></div>
    </div>`;
  }
  window.finSetCatSource = function (i, val) { DB.financeCategories[i].defaultSource = val; showToast('Updated ✓','success'); };
  window.finToggleCatActive = function (i, val) { DB.financeCategories[i].active = val; };
  window.finRemoveCategory = function (i) {
    DB.financeCategories.splice(i, 1);
    showToast('Category removed', 'info'); finStShowSection('categories');
  };
  window.finAddCategory = function () {
    Modal.create('modal-fin-add-cat', `${UI.icon('add_circle','sm')} Add Category`, `
      <div class="settings-group" style="margin-bottom:12px">
        <label class="settings-label">Category Name</label>
        <input class="settings-input" id="fc-name" placeholder="e.g. Software Subscriptions">
      </div>
      <div class="settings-group" style="margin-bottom:12px">
        <label class="settings-label">Color</label>
        <select class="settings-input" id="fc-color">
          ${['blue','green','orange','yellow','purple','teal','gray','red'].map(c=>`<option>${c}</option>`).join('')}
        </select></div>
      <div class="settings-group">
        <label class="settings-label">Default Budget Source</label>
        <select class="settings-input" id="fc-source"><option value="petty">Petty</option><option value="central">Central</option></select>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-fin-add-cat')">Cancel</button>
       <button class="btn btn-primary" onclick="finConfirmAddCategory()">Add Category</button>`);
  };
  window.finConfirmAddCategory = function () {
    const name = document.getElementById('fc-name').value.trim();
    if (!name) { showToast('Enter a name', 'warning'); return; }
    if (DB.financeCategories.find(c => c.id === name)) { showToast('Category already exists', 'warning'); return; }
    DB.financeCategories.push({
      id: name, short: name, color: document.getElementById('fc-color').value,
      icon: 'category', active: true, defaultSource: document.getElementById('fc-source').value,
    });
    Modal.close('modal-fin-add-cat'); showToast(`"${name}" added ✓`, 'success'); finStShowSection('categories');
  };

  /* ══════════ 6. PAYMENT METHODS ══════════
     Configured here (add/remove/toggle), but not yet wired into the Direct
     Paid create form's own routing dropdown ('central'/'transfer') — that
     field carries specific KBiz-routing business logic (see data-finance.js
     markTransferred). Wiring these into a new field is a follow-up. */
  function renderPaymentMethods() {
    const methods = DB.financePaymentMethods;
    return `<div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <div style="font-size:17px;font-weight:600;margin-bottom:4px">Payment Methods</div>
          <div class="text-muted" style="font-size:13px">รายการวิธีจ่ายเงินที่ใช้ในระบบ Finance</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="finAddPaymentMethod()">${UI.icon('add','sm')} Add Method</button>
      </div>
      <div style="overflow-x:auto"><table style="margin:0">
        <thead><tr><th>Name</th><th style="text-align:center">Active</th><th></th></tr></thead>
        <tbody>${methods.map((m,i)=>`<tr>
          <td>${m.name}</td>
          <td style="text-align:center"><input type="checkbox" ${m.active?'checked':''} style="accent-color:var(--md-primary);width:15px;height:15px;cursor:pointer" onchange="finTogglePayMethodActive(${i},this.checked)"></td>
          <td style="text-align:right"><button class="btn btn-secondary btn-sm" onclick="finRemovePayMethod(${i})">${UI.icon('delete','sm')}</button></td>
        </tr>`).join('')}</tbody></table></div>
    </div>`;
  }
  window.finTogglePayMethodActive = function (i, val) { DB.financePaymentMethods[i].active = val; };
  window.finRemovePayMethod = function (i) { DB.financePaymentMethods.splice(i,1); showToast('Removed','info'); finStShowSection('payment'); };
  window.finAddPaymentMethod = function () {
    Modal.create('modal-fin-add-pm', `${UI.icon('add_circle','sm')} Add Payment Method`,
      `<div class="settings-group"><label class="settings-label">Name</label>
        <input class="settings-input" id="fpm-name" placeholder="e.g. Bank Draft"></div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-fin-add-pm')">Cancel</button>
       <button class="btn btn-primary" onclick="finConfirmAddPayMethod()">Add</button>`);
  };
  window.finConfirmAddPayMethod = function () {
    const name = document.getElementById('fpm-name').value.trim();
    if (!name) { showToast('Enter a name', 'warning'); return; }
    DB.financePaymentMethods.push({ id: name.toLowerCase().replace(/\s+/g,'_'), name, active: true });
    Modal.close('modal-fin-add-pm'); showToast(`"${name}" added ✓`, 'success'); finStShowSection('payment');
  };

  /* ══════════ 7. NUMBERING ══════════ */
  function renderNumbering() {
    const rows = DB.financeNumbering;
    const DOC_LABEL = { request:'Requests', expense:'Expenses', reimbursement:'Reimbursements', recurring:'Recurring' };
    const year = new Date().getFullYear();
    return `<div style="max-width:640px">
      <div style="font-size:17px;font-weight:600;margin-bottom:4px">Numbering</div>
      <div class="text-muted" style="font-size:13px;margin-bottom:20px">รูปแบบเลขที่เอกสาร — มีผลกับรายการที่สร้างใหม่เท่านั้น (ของเดิมไม่เปลี่ยน)</div>
      <div style="overflow-x:auto"><table style="margin:0">
        <thead><tr><th>Document</th><th>Prefix</th><th>Digits</th><th>Next</th><th>Preview</th></tr></thead>
        <tbody>${rows.map((n,i)=>`<tr>
          <td>${DOC_LABEL[n.docType]||n.docType}</td>
          <td><input class="settings-input" style="width:90px" value="${n.prefix}" onchange="finSetNumbering(${i},'prefix',this.value)"></td>
          <td><input type="number" class="settings-input" style="width:70px" value="${n.padWidth}" onchange="finSetNumbering(${i},'padWidth',parseInt(this.value,10)||5)"></td>
          <td><input type="number" class="settings-input" style="width:90px" value="${n.nextSeq}" onchange="finSetNumbering(${i},'nextSeq',parseInt(this.value,10)||1)"></td>
          <td class="text-muted" style="font-family:monospace">${n.prefix}-${year}-${String(n.nextSeq).padStart(n.padWidth,'0')}</td>
        </tr>`).join('')}</tbody></table></div>
    </div>`;
  }
  window.finSetNumbering = function (i, field, val) {
    DB.financeNumbering[i][field] = val;
    finStShowSection('numbering');
  };

  /* ── bootstrap ── */
  renderNav();
  finStShowSection(window._finStSection);
  window._refreshFinSettings = function () { renderNav(); finStShowSection(window._finStSection); };

})();
