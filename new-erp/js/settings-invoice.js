/* ============================================================
   settings-invoice.js — Invoice Settings Panel
   Global (Director only): Company Header + Bank Accounts Pool
   Per Branch: Bank selection (radio), QR, numbering, VAT, terms
   ============================================================ */
(function () {

  /* ── HELPERS ──────────────────────────────────────────────── */
  function getGlobal()   { return DB.invoiceSettings.global; }
  function getBranch(b)  {
    const key = b || window.ST_BRANCH;
    if (!DB.invoiceSettings.branches[key]) DB.invoiceSettings.branches[key] = {};
    return DB.invoiceSettings.branches[key];
  }
  function isDirector()  { return window.ST_ROLE === 'director'; }
  function masterAdmin(branch) {
    return (DB.staff||[]).find(s =>
      s.adminTier === 'master' && (s.branches||[]).includes(branch||window.ST_BRANCH)
    ) || (DB.staff||[]).find(s => s.adminTier === 'master');
  }

  // Auto-pick bank account based on branch school type
  function autoPickBank(bs) {
    const pool  = getGlobal().bankAccounts || [];
    const type  = bs?.schoolType || 'Nockacademy';
    if (type === 'Liclass') return pool.find(a => a.brand === 'Liclass')?.id;
    if (type === 'Nockacademy') return pool.find(a => a.brand.startsWith('NA School'))?.id;
    return pool[0]?.id;
  }

  function sectionLabel(title, sub, isGlobal) {
    return `<div style="margin-bottom:18px">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:3px">
        <span style="font-size:15px;font-weight:700;color:var(--md-on-surface)">${title}</span>
        ${isGlobal ? `<span style="font-size:10px;padding:2px 8px;border-radius:8px;
          background:var(--md-surface-mid);color:var(--md-on-surface-variant);font-weight:600">
          ทุกสาขา</span>` : ''}
      </div>
      ${sub ? `<div class="text-muted" style="font-size:12px">${sub}</div>` : ''}
    </div>`;
  }

  /* ── MAIN RENDER ──────────────────────────────────────────── */
  window.stRenderInvoice = function(bs) {
    const branch = window.ST_BRANCH;
    return `<div style="max-width:920px">
      ${renderCompanyHeader()}
      <div style="border-top:1px solid var(--md-outline-variant);margin:28px 0"></div>
      ${renderBankSection(bs, branch)}
      <div style="border-top:1px solid var(--md-outline-variant);margin:28px 0"></div>
      ${renderBranchInvoice(branch, bs)}
    </div>`;
  };

  /* ── SECTION 1: Company Header ────────────────────────────── */
  function renderCompanyHeader() {
    const g    = getGlobal();
    const edit = isDirector();
    return `
    ${sectionLabel('Company Header', 'แสดงบน Invoice + Receipt ทุกใบ ทุกสาขา', true)}

    <div id="inv-header-view">
      ${companyHeaderPreview(g, edit)}
    </div>`;
  }

  function companyHeaderPreview(g, edit) {
    return `
    <div style="border:1.5px solid var(--md-outline-variant);border-radius:10px;
                padding:20px 24px;background:#fff;position:relative">
      ${edit ? `<button class="btn btn-secondary btn-sm"
        style="position:absolute;top:12px;right:12px;font-size:11px"
        onclick="invToggleHeaderEdit(true)">${UI.icon('edit','sm')} Edit</button>` : ''}

      <div style="display:flex;align-items:flex-start;gap:16px">
        <!-- Logo -->
        <div style="width:100px;height:64px;flex-shrink:0;display:flex;align-items:center;
                    justify-content:center;border-radius:6px;overflow:hidden;
                    background:${g.logoUrl?'transparent':'var(--md-surface-low)'}">
          ${g.logoUrl
            ? `<img src="${g.logoUrl}" style="max-width:100%;max-height:100%;object-fit:contain">`
            : `<div style="text-align:center">${UI.icon('image','sm')}<div class="text-muted" style="font-size:10px;margin-top:2px">No Logo</div></div>`}
        </div>

        <!-- Company Info -->
        <div style="flex:1;min-width:0">
          <div style="font-weight:700;font-size:15px;color:var(--md-on-surface)">${g.companyNameTH}</div>
          <div style="font-weight:600;font-size:13px;color:var(--md-on-surface)">${g.companyNameEN}</div>
          <div style="font-size:11px;color:var(--md-on-surface-variant);margin-top:4px;line-height:1.5">
            ${g.addressTH}<br>${g.addressEN}
          </div>
          <div style="font-size:11px;color:var(--md-on-surface-variant);margin-top:4px">
            Tax ID: <span style="font-family:monospace;font-weight:600">${g.taxId}</span>
          </div>
        </div>
      </div>

      ${!edit ? `<div class="text-muted" style="font-size:11px;margin-top:12px;padding-top:10px;
        border-top:1px solid var(--md-outline-variant)">
        ${UI.icon('lock','sm')} เฉพาะ Director เท่านั้นที่แก้ไขได้
      </div>` : ''}
    </div>`;
  }

  function companyHeaderEditForm(g) {
    return `
    <div style="border:1.5px solid var(--md-primary);border-radius:10px;padding:20px 24px;background:#fff">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <span style="font-size:13px;font-weight:600;color:var(--md-primary)">
          ${UI.icon('edit','sm')} Editing Company Header
        </span>
        <button class="btn btn-secondary btn-sm" style="font-size:11px"
          onclick="invToggleHeaderEdit(false)">Cancel</button>
      </div>

      <div style="display:grid;grid-template-columns:110px 1fr;gap:16px;align-items:start;margin-bottom:14px">
        <!-- Logo upload -->
        <div>
          <label class="settings-label">Logo</label>
          <div id="inv-logo-preview" onclick="document.getElementById('inv-logo-inp').click()"
            style="width:100px;height:64px;border:2px dashed var(--md-outline-variant);border-radius:8px;
                   display:flex;align-items:center;justify-content:center;cursor:pointer;
                   background:var(--md-surface-low);overflow:hidden;margin-top:6px">
            ${g.logoUrl
              ? `<img src="${g.logoUrl}" style="max-width:100%;max-height:100%;object-fit:contain">`
              : `${UI.icon('add_photo_alternate','sm')}`}
          </div>
          <input type="file" id="inv-logo-inp" accept="image/*" style="display:none"
            onchange="invLogoChange(this)">
          ${g.logoUrl ? `<button onclick="invClearLogo()"
            style="font-size:10px;color:var(--md-error);background:none;border:none;cursor:pointer;margin-top:4px">
            Remove</button>` : ''}
        </div>

        <div style="display:flex;flex-direction:column;gap:10px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <div><label class="settings-label">ชื่อบริษัท (TH)</label>
              <input class="settings-input" id="inv-co-nameth" value="${g.companyNameTH}"></div>
            <div><label class="settings-label">Company Name (EN)</label>
              <input class="settings-input" id="inv-co-nameen" value="${g.companyNameEN}"></div>
          </div>
          <div><label class="settings-label">Tax ID</label>
            <input class="settings-input" id="inv-co-taxid" value="${g.taxId}"
              style="font-family:monospace;letter-spacing:.04em"></div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        <div><label class="settings-label">ที่อยู่ (TH)</label>
          <textarea class="settings-input" id="inv-co-addth" rows="3" style="resize:vertical">${g.addressTH}</textarea></div>
        <div><label class="settings-label">Address (EN)</label>
          <textarea class="settings-input" id="inv-co-adden" rows="3" style="resize:vertical">${g.addressEN}</textarea></div>
      </div>

      <div style="display:flex;gap:8px">
        <button class="btn btn-primary btn-sm" onclick="invSaveGlobal()">
          ${UI.icon('save','sm')} Save
        </button>
        <button class="btn btn-secondary btn-sm" onclick="invToggleHeaderEdit(false)">Cancel</button>
      </div>
    </div>`;
  }

  window.invToggleHeaderEdit = function(editing) {
    const wrap = document.getElementById('inv-header-view');
    if (!wrap) return;
    const g = getGlobal();
    wrap.innerHTML = editing ? companyHeaderEditForm(g) : companyHeaderPreview(g, true);
  };

  window.invLogoChange = function(inp) {
    if (!inp.files?.[0]) return;
    const reader = new FileReader();
    reader.onload = e => {
      getGlobal().logoUrl = e.target.result;
      const prev = document.getElementById('inv-logo-preview');
      if (prev) prev.innerHTML = `<img src="${e.target.result}" style="max-width:100%;max-height:100%;object-fit:contain">`;
    };
    reader.readAsDataURL(inp.files[0]);
  };

  window.invClearLogo = function() {
    getGlobal().logoUrl = null;
    invToggleHeaderEdit(true);
  };

  window.invSaveGlobal = function() {
    const g = getGlobal();
    g.companyNameTH = document.getElementById('inv-co-nameth')?.value.trim() || g.companyNameTH;
    g.companyNameEN = document.getElementById('inv-co-nameen')?.value.trim() || g.companyNameEN;
    g.taxId         = document.getElementById('inv-co-taxid')?.value.trim()  || g.taxId;
    g.addressTH     = document.getElementById('inv-co-addth')?.value.trim()  || g.addressTH;
    g.addressEN     = document.getElementById('inv-co-adden')?.value.trim()  || g.addressEN;
    showToast('Company info saved ✓', 'success');
    invToggleHeaderEdit(false);
  };

  /* ── SECTION 2: Bank Accounts ─────────────────────────────── */
  function renderBankSection(bs, branch) {
    const g    = getGlobal();
    const bset = getBranch(branch);
    const pool = g.bankAccounts || [];
    const branchBS = (DB.branchSettings||[]).find(b => b.branch === branch) || {};

    // Auto-pick based on school type if not set yet
    if (!bset.bankAccountId && pool.length) bset.bankAccountId = autoPickBank(bs) || pool[0].id;

    return `
    ${sectionLabel('Bank Accounts', 'เลือกบัญชีที่ใช้รับชำระสำหรับสาขานี้', true)}

    <div id="inv-bank-radios" style="margin-bottom:12px">
      ${pool.length
        ? pool.map(a => bankRadioCard(a, a.id === bset.bankAccountId, branch)).join('')
        : `<div class="text-muted" style="font-size:13px;padding:12px 0">ยังไม่มีบัญชีธนาคาร</div>`}
    </div>

    ${isDirector() ? `<button class="btn btn-secondary btn-sm" onclick="invAddBank()">
      ${UI.icon('add','sm')} Add Bank Account
    </button>` : ''}

    <!-- LINE QR from Branch Info -->
    <div style="margin-top:20px;padding:12px 14px;border-radius:8px;
                background:var(--md-surface-mid);border:1px solid var(--md-outline-variant)">
      <div style="display:flex;align-items:center;gap:12px">
        ${branchBS.lineQR
          ? `<img src="${branchBS.lineQR}" style="width:64px;height:64px;object-fit:contain;
               border-radius:6px;border:1px solid var(--md-outline-variant);flex-shrink:0">`
          : `<div style="width:64px;height:64px;border:2px dashed var(--md-outline-variant);
               border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;
               background:var(--md-surface-low)">${UI.icon('qr_code','sm')}</div>`}
        <div>
          <div style="font-size:12px;font-weight:600;margin-bottom:2px">LINE QR Code (${branch})</div>
          <div class="text-muted" style="font-size:11px">
            ${branchBS.lineQR
              ? 'QR พร้อมแสดงบน Invoice ✅'
              : 'ยังไม่ได้ upload —'}
            <a href="javascript:void(0)" onclick="stShowSection('info')"
              style="color:var(--md-primary);text-decoration:none;font-size:11px">
              ${branchBS.lineQR ? ' Change' : ' ไปที่ Branch Info → Upload QR'}
            </a>
          </div>
        </div>
      </div>
    </div>`;
  }

  function bankRadioCard(a, selected, branch) {
    // "Default" accounts → Director only can edit/remove
    // Branch-specific accounts → branch admin can also edit/remove
    const canEdit = a.createdBy === 'default'
      ? isDirector()
      : isDirector() || a.createdBy === (branch || window.ST_BRANCH);

    const creatorBadge = a.createdBy === 'default'
      ? `<span style="font-size:10px;padding:1px 7px;border-radius:8px;
           background:var(--md-surface-mid);color:var(--md-on-surface-variant);font-weight:600">Default</span>`
      : `<span style="font-size:10px;padding:1px 7px;border-radius:8px;
           background:var(--md-primary-container);color:var(--md-primary);font-weight:600">${a.createdBy}</span>`;

    const qrThumb = a.qrCodeUrl
      ? `<div style="text-align:center;flex-shrink:0">
           <img src="${a.qrCodeUrl}" style="width:44px;height:44px;object-fit:contain;
             border-radius:4px;border:1px solid var(--md-outline-variant);display:block">
           <div style="font-size:9px;margin-top:2px" class="text-muted">QR</div>
         </div>`
      : '';

    const moreBtn = canEdit
      ? `<div onclick="event.preventDefault();event.stopPropagation()" style="flex-shrink:0">
           ${UI.moreMenu('bank-more-'+a.id, [
             { label: `${UI.icon('edit','sm')} Edit`,
               onclick: `invEditBank('${a.id}')` },
             { label: `<span style="color:var(--md-error)">${UI.icon('delete','sm')} Remove</span>`,
               onclick: `invDeleteBank('${a.id}')` },
           ])}
         </div>`
      : '';

    return `<label style="display:flex;align-items:center;gap:12px;padding:14px;
        margin-bottom:8px;border-radius:10px;cursor:pointer;
        border:1.5px solid ${selected?'var(--md-primary)':'var(--md-outline-variant)'};
        background:${selected?'var(--md-primary-container)':'var(--md-surface-lowest)'}">
      <input type="radio" name="inv-bank-sel" value="${a.id}" ${selected?'checked':''}
        style="width:16px;height:16px;accent-color:var(--md-primary);flex-shrink:0"
        onchange="invSelectBank('${a.id}','${branch||window.ST_BRANCH}')">
      <div style="width:36px;height:36px;border-radius:8px;background:var(--md-primary-container);
                  display:flex;align-items:center;justify-content:center;flex-shrink:0">
        ${UI.icon('account_balance','sm')}
      </div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px">
          <span style="font-weight:600;font-size:13px;color:var(--md-on-surface)">${a.brand}</span>
          ${creatorBadge}
        </div>
        <div class="text-muted" style="font-size:11px">${a.bankName} · ${a.bankBranch}</div>
        <div style="font-size:11px;font-family:monospace;color:var(--md-on-surface)">${a.accountNo} · ${a.accountName}</div>
      </div>
      ${qrThumb}
      ${moreBtn}
    </label>`;
  }

  window.invSelectBank = function(bankId, branch) {
    getBranch(branch).bankAccountId = bankId;
    const pool = getGlobal().bankAccounts || [];
    const wrap = document.getElementById('inv-bank-radios');
    if (wrap) wrap.innerHTML = pool.map(a => bankRadioCard(a, a.id === bankId, branch)).join('');
  };

  /* ── SECTION 3: Branch Invoice Settings ───────────────────── */
  /* ── helpers: floating-label field + ตัวอย่างเลขที่ ────────── */
  const invToday = () => {
    const d = new Date();
    return String(d.getFullYear()+543).slice(-2) + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  };
  function numField(label, id, val, w) {
    return `<div style="position:relative">
      <span style="position:absolute;top:-6px;left:8px;background:var(--md-surface);padding:0 4px;font-size:9px;
        color:var(--md-on-surface-variant);white-space:nowrap;z-index:1">${label}</span>
      <input class="settings-input" id="${id}" value="${val}" oninput="invNumPreview()"
        style="width:${w}px;font-family:monospace;text-align:center;padding:9px 6px">
    </div>`;
  }
  function invNumExample(b) {
    return `${b.invDate||invToday()}${b.invType||'02'}${b.invBranchCode||'01'}${String(b.invoiceRunning||2).padStart(3,'0')}`;
  }
  window.invNumPreview = function() {
    const g = id => (document.getElementById(id)?.value||'').trim();
    const el = document.getElementById('inv-num-ex');
    if (el) el.textContent = `${g('inv-br-date')}${g('inv-br-type')}${g('inv-br-bcode')}${g('inv-br-run')}`;
  };

  /* ── ค่าธรรมเนียมต่อสาขา (ตาม mockup) ─────────────────────────
     Traveling = ต่อ Course (pickup/sent back เลือกแยกได้)
     Entry fee = ต่อ Lifetime (เก็บครั้งเดียวตลอด)
     End course test = ต่อ Course */
  const FEES = [
    { k:'traveling', label:'Traveling fee',   desc:'ตั้งค่าการเดินทาง /Course', dual:true },
    { k:'entry',     label:'Entry fee',       desc:'ค่าแรกเข้า /Lifetime' },
    { k:'endTest',   label:'End course test', desc:'ค่าสอบจบ Course /Course' },
  ];
  function feeCfg(bset, k) {
    bset.fees = bset.fees || {};
    if (!bset.fees[k]) bset.fees[k] = k==='traveling'
      ? { on:true, pickup:{on:true,cost:100}, sentBack:{on:false,cost:100} }
      : { on:true, cost: k==='entry'?3000:1500 };
    return bset.fees[k];
  }
  function costField(label, id, val, chkId, checked) {
    return `<div style="position:relative;flex:1;max-width:200px">
      <span style="position:absolute;top:-6px;left:9px;background:var(--md-surface);padding:0 4px;font-size:9px;
        color:var(--md-on-surface-variant);z-index:1">${label}</span>
      <div style="display:flex;align-items:center;gap:8px;border:1px solid var(--md-outline-variant);
        border-radius:8px;padding:0 10px;height:42px;background:var(--md-surface)">
        ${chkId?`<input type="checkbox" id="${chkId}" ${checked?'checked':''}
          style="accent-color:var(--md-primary);width:15px;height:15px;flex-shrink:0">`:''}
        <input class="settings-input" id="${id}" type="number" min="0" value="${val}"
          style="border:none;flex:1;padding:0;font-weight:600;background:none">
      </div>
    </div>`;
  }
  function renderFees(branch, bset) {
    return `<div style="border-top:1px solid var(--md-outline-variant);padding-top:16px;margin-bottom:20px">
      ${FEES.map(f=>{
        const c = feeCfg(bset, f.k);
        return `<div style="display:flex;align-items:center;gap:14px;margin-bottom:14px;${c.on?'':'opacity:.55'}">
          ${window.stSwitch(c.on, `invToggleFee('${branch}','${f.k}')`, c.on?'ปิด':'เปิด')}
          <div style="width:150px;flex-shrink:0">
            <div style="font-weight:600;font-size:13px">${f.label}</div>
            <div class="text-muted" style="font-size:11px">${f.desc}</div>
          </div>
          ${f.dual
            ? `${costField('Pickup cost','inv-fee-pickup',c.pickup.cost,'inv-fee-pickup-on',c.pickup.on)}
               ${costField('Sent back cost','inv-fee-sent',c.sentBack.cost,'inv-fee-sent-on',c.sentBack.on)}`
            : costField('Cost (฿)', `inv-fee-${f.k}`, c.cost)}
        </div>`;
      }).join('')}
      <div class="text-muted" style="font-size:10px">
        ${UI.icon('info','sm')} ค่าเหล่านี้จะถูกดึงไปเป็น line บน Invoice ตอนสร้างบิล · Entry fee เก็บครั้งเดียวต่อนักเรียน</div>
    </div>`;
  }
  window.invToggleFee = function(branch, k) {
    const bset = getBranch(branch); const c = feeCfg(bset, k);
    invSaveFees(branch);                 // เก็บค่าที่พิมพ์ค้างก่อน re-render
    c.on = !c.on;
    stShowSection('invoice');
  };
  /* อ่านค่า fee จาก DOM กลับเข้า settings */
  window.invSaveFees = function(branch) {
    const bset = getBranch(branch); if (!bset) return;
    const num = id => { const v = document.getElementById(id)?.value; return v===undefined?undefined:(+v||0); };
    const chk = id => document.getElementById(id)?.checked;
    const t = feeCfg(bset,'traveling');
    if (num('inv-fee-pickup')!==undefined) t.pickup.cost   = num('inv-fee-pickup');
    if (num('inv-fee-sent')  !==undefined) t.sentBack.cost = num('inv-fee-sent');
    if (chk('inv-fee-pickup-on')!==undefined) t.pickup.on   = chk('inv-fee-pickup-on');
    if (chk('inv-fee-sent-on')  !==undefined) t.sentBack.on = chk('inv-fee-sent-on');
    if (num('inv-fee-entry')  !==undefined) feeCfg(bset,'entry').cost   = num('inv-fee-entry');
    if (num('inv-fee-endTest')!==undefined) feeCfg(bset,'endTest').cost = num('inv-fee-endTest');
  };

  function renderBranchInvoice(branch, bs) {
    const bset = getBranch(branch);
    const ma   = masterAdmin(branch);

    return `
    ${sectionLabel(`Invoice Settings — ${branch}`, 'ตั้งค่าเฉพาะสาขานี้', false)}

    <!-- Invoice Number Format — 4 ช่อง (ตาม mockup): YYMMDD – Type – Branch – Run no. -->
    <div style="display:grid;grid-template-columns:220px 1fr;gap:16px;align-items:start;margin-bottom:18px">
      <div>
        <div style="font-weight:600">Invoice number format</div>
        <div class="text-muted" style="font-size:11px">Ex. <span id="inv-num-ex" style="font-family:monospace">${invNumExample(bset)}</span></div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        ${numField('YY/MM/DD','inv-br-date', bset.invDate||invToday(), 78)}
        <span class="text-muted">–</span>
        ${numField('Type','inv-br-type', bset.invType||'02', 52)}
        <span class="text-muted">–</span>
        ${numField('Branch','inv-br-bcode', bset.invBranchCode||'01', 58)}
        <span class="text-muted">–</span>
        ${numField('Run no.','inv-br-run', String(bset.invoiceRunning||2).padStart(3,'0'), 62)}
      </div>
    </div>

    <div style="display:grid;grid-template-columns:220px 1fr;gap:16px;align-items:center;margin-bottom:18px">
      <div>
        <div style="font-weight:600">VAT</div>
        <div class="text-muted" style="font-size:11px">ต่อสาขา</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-sm ${(bset.vatRate||0)===0?'btn-primary':'btn-secondary'}"
          data-vat="0" onclick="invSetVAT(0,'${branch}')">0% (Exempt)</button>
        <button class="btn btn-sm ${bset.vatRate===7?'btn-primary':'btn-secondary'}"
          data-vat="7" onclick="invSetVAT(7,'${branch}')">7%</button>
      </div>
    </div>

    <!-- Due Date -->
    <div style="margin-bottom:16px">
      <label class="settings-label">Due Date</label>
      <div style="display:flex;align-items:center;gap:8px;margin-top:6px">
        <span class="text-muted" style="font-size:13px">ภายใน</span>
        <input class="settings-input" id="inv-br-due" type="number"
          value="${bset.dueDateOffset||14}" min="0" max="90" style="width:64px;text-align:center">
        <span class="text-muted" style="font-size:13px">วัน นับจากวันที่ออก Invoice</span>
      </div>
    </div>

    <!-- Memo -->
    <div style="margin-bottom:16px">
      <label class="settings-label">Memo / หมายเหตุ (แสดงบน Invoice)</label>
      <textarea class="settings-input" id="inv-br-memo" rows="3" maxlength="250"
        oninput="document.getElementById('inv-memo-cnt').textContent=250-this.value.length"
        style="resize:vertical;margin-top:6px">${bset.memo||''}</textarea>
      <div class="text-muted" style="font-size:10px;text-align:right;margin-top:2px">
        <span id="inv-memo-cnt">${250-(bset.memo||'').length}</span></div>
    </div>

    ${renderFees(branch, bset)}

    <!-- Signature -->
    <div style="padding:12px 14px;border-radius:8px;background:var(--md-surface-mid);
                border:1px solid var(--md-outline-variant);margin-bottom:20px">
      <div style="display:flex;align-items:center;gap:10px">
        ${UI.icon('draw','sm')}
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600">Authorized Signature</div>
          <div class="text-muted" style="font-size:11px">
            ${ma
              ? `ดึงจาก Master Admin — <strong>${ma.name}</strong>
                 ${ma.signature?'✅ Signature ready':'⚠️ ยังไม่ได้ upload — ไปที่ Staff → Edit → Master Admin'}`
              : '⚠️ ยังไม่มี Master Admin ของสาขานี้'}
          </div>
        </div>
        ${ma?.signature ? `<img src="${ma.signature}"
          style="max-height:40px;max-width:120px;object-fit:contain">` : ''}
      </div>
    </div>

    <button class="btn btn-primary btn-sm" onclick="invSaveBranch('${branch}')">
      ${UI.icon('save','sm')} Save Branch Settings
    </button>`;
  }

  /* ── BANK MODAL (Add / Edit) ──────────────────────────────── */
  window.invAddBank = function() { _openBankModal(null); };
  window.invEditBank = function(id) {
    const a = getGlobal().bankAccounts.find(x => x.id === id);
    if (a) _openBankModal(a);
  };
  window.invDeleteBank = function(id) {
    const pool = getGlobal().bankAccounts;
    const idx  = pool.findIndex(x => x.id === id);
    if (idx < 0) return;
    pool.splice(idx, 1);
    document.getElementById(`bm-row-${id}`)?.remove();
    showToast('Bank account removed', 'success');
    stShowSection('invoice');
  };

  function _openBankModal(existing) {
    const isEdit = !!existing;
    const a = existing || {
      id:'bank-'+Date.now(), brand:'', bankName:'', bankBranch:'',
      accountNo:'', accountName:'', accountType:'savings', qrCodeUrl: null,
    };
    let _modalQR = a.qrCodeUrl;

    Modal.create('modal-bank-account', isEdit?`${UI.icon('edit','sm')} Edit Bank Account`:`${UI.icon('add','sm')} Add Bank Account`, `
      <div style="display:flex;flex-direction:column;gap:12px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><label class="settings-label">Brand / ชื่อที่ใช้ระบุ *</label>
            <input class="settings-input" id="bk-brand" value="${a.brand}" placeholder="เช่น Liclass, NA School"></div>
          <div><label class="settings-label">Account Type</label>
            <select class="settings-input" id="bk-type">
              <option value="savings"  ${a.accountType==='savings'?'selected':''}>Savings (ออมทรัพย์)</option>
              <option value="current"  ${a.accountType==='current'?'selected':''}>Current (กระแสรายวัน)</option>
            </select></div>
        </div>
        <div><label class="settings-label">ชื่อธนาคาร *</label>
          <input class="settings-input" id="bk-name" value="${a.bankName}" placeholder="เช่น ธนาคารกรุงศรีอยุธยา"></div>
        <div><label class="settings-label">สาขาธนาคาร</label>
          <input class="settings-input" id="bk-branch" value="${a.bankBranch}" placeholder="เช่น Robinson Sriracha Sub Br"></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
          <div><label class="settings-label">เลขบัญชี *</label>
            <input class="settings-input" id="bk-no" value="${a.accountNo}"
              placeholder="xxx-x-xxxxx" style="font-family:monospace"></div>
          <div><label class="settings-label">ชื่อบัญชี *</label>
            <input class="settings-input" id="bk-accname" value="${a.accountName}"></div>
        </div>

        <!-- QR Code -->
        <div>
          <label class="settings-label">QR Code (PromptPay / LINE Pay)</label>
          <div style="display:flex;align-items:center;gap:12px;margin-top:6px">
            <div id="bk-qr-preview" onclick="document.getElementById('bk-qr-inp').click()"
              style="width:72px;height:72px;border:2px dashed var(--md-outline-variant);
                     border-radius:8px;display:flex;align-items:center;justify-content:center;
                     cursor:pointer;background:var(--md-surface-low);overflow:hidden;flex-shrink:0">
              ${a.qrCodeUrl
                ? `<img src="${a.qrCodeUrl}" style="width:100%;height:100%;object-fit:contain">`
                : `<div style="text-align:center">${UI.icon('qr_code','sm')}<div style="font-size:9px;margin-top:2px" class="text-muted">Upload QR</div></div>`}
            </div>
            <div>
              <input type="file" id="bk-qr-inp" accept="image/*" style="display:none"
                onchange="invBankModalQRChange(this)">
              <button class="btn btn-secondary btn-sm"
                onclick="document.getElementById('bk-qr-inp').click()">
                ${UI.icon('upload','sm')} ${a.qrCodeUrl?'Change QR':'Upload QR'}
              </button>
              ${a.qrCodeUrl?`<button class="btn btn-secondary btn-sm"
                style="margin-top:6px;color:var(--md-error)" onclick="invBankModalClearQR()">
                Remove QR</button>`:''}
            </div>
          </div>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-bank-account')">Cancel</button>
       <button class="btn btn-primary" onclick="invSaveBankModal('${a.id}',${isEdit})">
         ${isEdit?'Update':'Add Account'}
       </button>`
    );

    // Store QR state in closure via a shared key
    window._bankModalQR = a.qrCodeUrl || null;
  }

  window.invBankModalQRChange = function(inp) {
    if (!inp.files?.[0]) return;
    const reader = new FileReader();
    reader.onload = e => {
      window._bankModalQR = e.target.result;
      const prev = document.getElementById('bk-qr-preview');
      if (prev) prev.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:contain">`;
    };
    reader.readAsDataURL(inp.files[0]);
  };

  window.invBankModalClearQR = function() {
    window._bankModalQR = null;
    const prev = document.getElementById('bk-qr-preview');
    if (prev) prev.innerHTML = `<div style="text-align:center">${UI.icon('qr_code','sm')}<div style="font-size:9px;margin-top:2px" class="text-muted">Upload QR</div></div>`;
  };

  window.invSaveBankModal = function(id, isEdit) {
    const pool = getGlobal().bankAccounts;
    const brand    = document.getElementById('bk-brand')?.value.trim();
    const bankName = document.getElementById('bk-name')?.value.trim();
    const accountNo= document.getElementById('bk-no')?.value.trim();
    const accName  = document.getElementById('bk-accname')?.value.trim();
    if (!brand||!accountNo||!accName) { showToast('กรุณากรอกข้อมูลที่จำเป็น (*)','warning'); return; }
    const data = {
      id, brand, bankName,
      bankBranch:  document.getElementById('bk-branch')?.value.trim() || '',
      accountNo, accountName: accName,
      accountType: document.getElementById('bk-type')?.value || 'savings',
      qrCodeUrl:   window._bankModalQR || null,
    };
    if (isEdit) {
      const idx = pool.findIndex(x => x.id === id);
      if (idx >= 0) pool[idx] = data;
    } else {
      pool.push(data);
    }
    window._bankModalQR = null;
    Modal.close('modal-bank-account');
    showToast(isEdit?'Bank account updated ✓':'Bank account added ✓','success');
    stShowSection('invoice');
  };

  /* ── BRANCH ACTIONS ───────────────────────────────────────── */
  window.invSetVAT = function(rate, branch) {
    getBranch(branch).vatRate = rate;
    document.querySelectorAll('[data-vat]').forEach(b => {
      const on = Number(b.dataset.vat) === rate;
      b.className = `btn btn-sm ${on?'btn-primary':'btn-secondary'}`;
    });
  };

  window.invSaveBranch = function(branch) {
    const bset = getBranch(branch);
    // Bank account from radio
    const radio = document.querySelector('input[name="inv-bank-sel"]:checked');
    if (radio) bset.bankAccountId = radio.value;
    const gv = id => document.getElementById(id)?.value?.trim();
    /* เลขที่เอกสาร 4 ส่วน: YYMMDD – Type – Branch – Run no. */
    bset.invDate        = gv('inv-br-date')  || bset.invDate;
    bset.invType        = gv('inv-br-type')  || bset.invType;
    bset.invBranchCode  = gv('inv-br-bcode') || bset.invBranchCode;
    bset.invoiceRunning = parseInt(gv('inv-br-run') || bset.invoiceRunning);
    bset.invoicePrefix  = `${bset.invDate||''}${bset.invType||''}${bset.invBranchCode||''}`;  // legacy field
    bset.dueDateOffset  = parseInt(gv('inv-br-due') || bset.dueDateOffset);
    bset.memo           = document.getElementById('inv-br-memo')?.value ?? bset.memo;
    invSaveFees(branch);
    showToast(`Invoice settings saved — ${branch} ✓`,'success');
  };

})();
