/* ============================================================
   js/data-finance.js — NockERP Finance / Expense data layer
   Self-contained module (mirrors data-reports.js → window.RD).
   Owns: DB.expenses · DB.expenseRequests · DB.financeAccounts
         · DB.recurringPayments
   Reads shared: DB.staff · DB.areas · DB.reportBranches · CONST.BRANCHES
   Exposes: window.FIN
   Model (from "Liclass BKK petty cash and expense" sheet):
     - each branch runs a PETTY CASH float (top-up via 'received',
       balance decrements per usage, may go negative)
     - CENTRAL bank pays salary / rent / large purchases directly
     - reimbursements = staff fronted cash, owed back
   ============================================================ */
(function () {
  'use strict';

  const CENTRAL_OPENING = 1500000;   // company bank opening balance

  /* ── Finance branch universe (5 branches from report layer) ── */
  const FIN_BRANCHES = (DB.reportBranches && DB.reportBranches.length)
    ? DB.reportBranches.map(b => b.name)
    : (CONST.BRANCHES || ['Sukhumvit', 'Silom']);

  /* ── Category + document meta ─────────────────────────────── */
  // Categories now live in js/data-finance-settings.js (DB.financeCategories,
  // editable via Finance ▸ Settings ▸ Categories) — this file just reads them.
  const CATEGORIES = DB.financeCategories;
  const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

  const DOC = {
    paper:    { label:'Paper',     color:'green'  },
    cashsale: { label:'Cash Sale', color:'blue'   },
    nodoc:    { label:'No Doc',    color:'yellow' },
    none:     { label:'—',         color:'gray'   },
  };

  /* ── ACCOUNTS ─────────────────────────────────────────────── */
  DB.financeAccounts = [
    { key:'central', scope:'company', label:'Central Bank Account' },
    ...FIN_BRANCHES.map(b => ({ key:'petty-' + b, scope:'branch', branch:b, label:b + ' Petty Cash' })),
  ];

  /* ── SEED LEDGER (mirrors the spreadsheet) ────────────────── */
  // helper to keep seed terse
  let _seq = 0;
  const E = (date, branch, type, category, amount, paidTo, source, docStatus, note, posted) =>
    ({ id:'exp-' + String(++_seq).padStart(3,'0'), date, branch, type, category,
       amount, paidTo, source, docStatus, docName: docStatus==='paper'?'receipt.pdf':null,
       note, posted: posted !== false, status:'active', createdBy:'Admin Nock' });

  DB.expenses = [
    /* ── Sukhumvit petty float — April 2026 (the sheet) ── */
    E('2026-04-23','Sukhumvit','received','Received',5000,'Pin','petty','none','Transfers to Pin\'s bank account', false),
    E('2026-04-23','Sukhumvit','usage','Transportation and Travel',28,'Pin','petty','nodoc','Home Place to Gateway Ekkamai (office supplies)'),
    E('2026-04-23','Sukhumvit','usage','Teaching Materials and Supplies',3210,'Pin','petty','paper','Officemate (School Supplies)'),
    E('2026-04-23','Sukhumvit','usage','Others',75,'Pin','petty','paper','Max Value (Small Trash Bag)'),
    E('2026-04-23','Sukhumvit','usage','Others',89,'Pin','petty','paper','Home Pro (Clear Box)'),
    E('2026-04-24','Sukhumvit','usage','Advertising and Marketing',300,'Pin','petty','cashsale','Villa Market (Brochure)'),
    E('2026-04-24','Sukhumvit','usage','Others',262,'Pin','petty','paper','Villa Market (Detergent, Sponge, Cups)'),
    E('2026-04-30','Sukhumvit','usage','Teaching Materials and Supplies',682,'Pin','petty','paper','Officemate (School Supplies)'),
    E('2026-04-30','Sukhumvit','usage','Teaching Materials and Supplies',480,'Pin','petty','paper','Daiso (School Supplies)'),
    E('2026-04-30','Sukhumvit','usage','Others',378,'Pin','petty','nodoc','Shopee (Alcohol for cleaning)'),
    E('2026-04-30','Sukhumvit','received','Received',5000,'Pin','petty','none','Transfers to Pin\'s bank account', false),
    E('2026-05-01','Sukhumvit','usage','Teaching Materials and Supplies',1614.98,'Pin','petty','paper','Officemate (Paper A3 + A4)'),
    E('2026-05-04','Sukhumvit','usage','Others',95,'Pin','petty','paper','Villa Market (Toilet Paper)'),
    E('2026-05-04','Sukhumvit','usage','Teaching Materials and Supplies',1191.03,'Pin','petty','paper','Officemate (Book End, Tissue)'),

    /* ── Silom petty float ── */
    E('2026-04-25','Silom','received','Received',4000,'Nok','petty','none','Petty cash top-up', false),
    E('2026-04-26','Silom','usage','Teaching Materials and Supplies',1280,'Nok','petty','paper','B2S (worksheets, folders)'),
    E('2026-04-28','Silom','usage','Others',340,'Nok','petty','paper','Lotus (pantry supplies)'),
    E('2026-05-02','Silom','usage','Advertising and Marketing',520,'Nok','petty','cashsale','Flyer print run'),
    E('2026-05-06','Silom','usage','Transportation and Travel',180,'Nok','petty','nodoc','Grab — bank errand'),

    /* ── Bang-Na petty float (area demo) ── */
    E('2026-04-29','Bang-Na','received','Received',3000,'Aom','petty','none','Petty cash top-up', false),
    E('2026-05-03','Bang-Na','usage','Teaching Materials and Supplies',890,'Aom','petty','paper','Officemate (supplies)'),
    E('2026-05-07','Bang-Na','usage','Others',150,'Aom','petty','nodoc','Cleaning supplies'),

    /* ── June (current month) petty spend — burn story ── */
    E('2026-06-05','Sukhumvit','usage','Teaching Materials and Supplies',650,'Pin','petty','paper','Officemate (June supplies)'),
    E('2026-06-12','Sukhumvit','usage','Others',420,'Pin','petty','nodoc','Pantry & cleaning'),
    E('2026-06-08','Silom','usage','Transportation and Travel',260,'Nok','petty','nodoc','Grab — bank errand'),
    E('2026-06-03','Bang-Na','usage','Equipment',1280,'Aom','petty','paper','Standing fans x2'),
    E('2026-06-15','Bang-Na','usage','Teaching Materials and Supplies',1650,'Aom','petty','paper','Bulk worksheets + binding'),
    E('2026-06-20','Bang-Na','usage','Others',520,'Aom','petty','nodoc','Extra cleaning + supplies'),
    E('2026-06-18','Sukhumvit','usage','Equipment',8500,'AC Vendor','central','paper','Air purifier x2'),
    E('2026-06-22','Silom','usage','Marketing',1500,'Nok','petty','none','Facebook ads boost'),

    /* ── CENTRAL bank — salary / rent / income ── */
    E('2026-05-01','Sukhumvit','rental','Rental',45000,'Landlord','central','paper','Office rent — Sukhumvit (May)'),
    E('2026-05-01','Silom','rental','Rental',38000,'Landlord','central','paper','Office rent — Silom (May)'),
    E('2026-05-25','Sukhumvit','salary','Salary',185000,'Payroll','central','paper','Staff payroll — May 2026 (8 staff)'),
    E('2026-05-10','Sukhumvit','income','Income',12000,'Walk-in','central','cashsale','Holiday workshop revenue'),
    E('2026-05-18','Silom','usage','Equipment',6800,'Vendor','central','paper','Projector replacement (approved)'),
    E('2026-06-14','Silom','reimbursement','Others',350,'Kru Eve','petty','paper','Reimbursement — Kru Eve (open house snacks)'),
  ];

  /* ── ENRICH: flow lifecycle (upload→pending→done) + payee type ──
     NOTE: e.status stays 'active'|'inactive' (soft delete). Lifecycle = e.flow */
  const VENDOR_RE = /landlord|vendor|payroll|ais|mea|walk-in/i;
  DB.expenses.forEach(e => {
    if (!e.payeeType) e.payeeType = VENDOR_RE.test(e.paidTo || '') ? 'vendor' : 'staff';
    if (!e.flow) e.flow = 'done';   // seeded = already settled
  });
  // demo lifecycle: Expense = log → flow มีแค่ upload (ยังไม่แนบเอกสาร) / done (แนบแล้ว)
  (DB.expenses.find(e => e.note === 'Facebook ads boost')   || {}).flow = 'upload';   // เพิ่งสร้าง ยังไม่แนบไฟล์

  // ── Documents: e.docs[] is the source of truth (supports multiple files) —
  // normalize legacy single-doc fields (docName/docDataUrl/docType) into it once,
  // so every expense (seed or new) can be rendered the same way.
  DB.expenses.forEach(e => {
    if (!e.docs) e.docs = (e.docDataUrl || e.docName) ? [{ name:e.docName||'receipt.pdf', dataUrl:e.docDataUrl||null, type:e.docType||null }] : [];
    if (!e.logs) e.logs = [{ action:'created', by:e.createdBy, at:e.date }];
  });
  function logExpense(e, action, by) {
    (e.logs = e.logs || []).push({ action, by: by || (window.CURRENT_USER||{}).name || 'System',
      at: new Date().toISOString().slice(0,16).replace('T',' ') });
  }

  /* ── SEED REQUESTS (approval workflow demo) ───────────────── */
  let _rq = 0;
  const R = (date, branch, category, amount, source, requestedBy, reason, status, approvedBy) => {
    const tier = tierFor(amount);
    return { id:'req-' + String(++_rq).padStart(3,'0'), kind:'budget', payMethod:'central',
             date, branch, category, amount,
             source, requestedBy, reason, tier, status: status || 'pending',
             approvedBy: approvedBy || null, docName:null };
  };
  // Thresholds now live in DB.financeApprovalRules (Finance ▸ Settings ▸ Approval
  // Rules, editable) instead of hardcoded here — same 1k/3k/5k gate by default.
  function tierFor(amount) {
    const rules = (DB.financeApprovalRules || []).slice().sort((a, b) => a.minAmount - b.minAmount);
    const hit = rules.find(r => amount >= r.minAmount && (r.maxAmount == null || amount <= r.maxAmount));
    return hit ? hit.tier : 'none';
  }

  DB.expenseRequests = [
    R('2026-06-22','Sukhumvit','Teaching Materials and Supplies',2500,'central','Manager Mint','Whiteboard + marker set for Room C'),
    R('2026-06-24','Silom','Equipment',3500,'central','Admin Nok','Desk Table x2 for new admin desks'),
    R('2026-06-25','Bang-Na','Equipment',4200,'central','Admin Aom','Television for lobby (parent waiting area)'),
    R('2026-06-26','Sukhumvit','Equipment',6000,'central','Manager Mint','Air conditioner repair — main hall'),
    R('2026-06-20','Silom','Others',1800,'central','Admin Nok','Signage refresh','approved','Manager Mint'),
  ];
  // Budget Request pay-method demo + Petty Cash Requests (Admin ขอเติม petty → Director/SA approve)
  (DB.expenseRequests.find(r => r.reason.indexOf('Television') > -1) || {}).payMethod = 'transfer';
  DB.expenseRequests.push(
    { id:'req-'+String(++_rq).padStart(3,'0'), kind:'petty_topup', payMethod:'transfer', date:'2026-06-27', branch:'Bang-Na',
      category:'Received', amount:5000, source:'central', requestedBy:'Admin Aom', reason:'เติม petty cash สาขา (หมด)', tier:'director', status:'pending', approvedBy:null, docName:null },
    { id:'req-'+String(++_rq).padStart(3,'0'), kind:'petty_topup', payMethod:'transfer', date:'2026-06-23', branch:'Sukhumvit',
      category:'Received', amount:5000, source:'central', requestedBy:'Manager Mint', reason:'เติม petty cash ประจำเดือน', tier:'director', status:'pending', approvedBy:null, docName:null }
  );

  /* ── Retrofit legacy Direct-Paid seed expenses with a real backing Request +
     full 3-stage document/log trail. These 2 expenses were hand-authored before
     the Request↔Expense linkage (§15/§16) existed, so they only ever had 1
     generic "receipt.pdf" — inconsistent with their own "Direct Paid" badge,
     which implies the full Invoice→Transfer→Tax-Invoice lifecycle. No dataUrl
     on the backfilled docs (filename only) — matches how the rest of this
     seed already represents old paper receipts (no live preview, just a name). ── */
  function backfillDirectPaidSeed(note, opts) {
    const e = DB.expenses.find(x => x.note === note);
    if (!e) return;
    const paidDate = e.date;
    const r = {
      id: nextId('req', DB.expenseRequests), kind:'budget', payMethod:'central',
      date: opts.reqDate, branch:e.branch, category:e.category, amount:e.amount,
      source:'central', requestedBy:opts.requestedBy, payTo:e.paidTo,
      docName:opts.invoiceName, docDataUrl:null, docType:null,
      reason:e.note, tier:tierFor(e.amount), status:'closed', approvedBy:opts.approvedBy,
      slipName:opts.slipName, slipDataUrl:null, slipType:null, transferredBy:opts.transferredBy, paidDate,
      taxInvName:opts.taxInvName, taxInvDataUrl:null, taxInvType:null, taxInvBy:opts.taxInvBy,
      generatedExpenseId:e.id,
    };
    DB.expenseRequests.push(r);
    e.sourceRequestId = r.id;
    e.docs = [
      { name:opts.invoiceName, dataUrl:null, type:null, label:'Invoice' },
      { name:opts.slipName,    dataUrl:null, type:null, label:'Transfer slip' },
      { name:opts.taxInvName,  dataUrl:null, type:null, label:'Tax invoice' },
    ];
    e.logs = [
      { action:'invoice_attached',     by:opts.requestedBy,   at:opts.reqDate },
      { action:'payslip_attached',     by:opts.transferredBy, at:paidDate },
      { action:'tax_invoice_attached', by:opts.taxInvBy,      at:opts.taxDate },
      { action:'ledger_created',       by:opts.taxInvBy,      at:opts.taxDate },
    ];
  }
  backfillDirectPaidSeed('Air purifier x2', {
    reqDate:'2026-06-15', requestedBy:'Manager Mint', approvedBy:'Nock', transferredBy:'Admin Nock', taxInvBy:'Admin Nock',
    invoiceName:'invoice-acvendor-airpurifier.pdf', slipName:'kbiz-slip-20260618.jpg', taxInvName:'tax-invoice-acvendor.pdf', taxDate:'2026-06-19',
  });
  backfillDirectPaidSeed('Projector replacement (approved)', {
    reqDate:'2026-05-14', requestedBy:'Admin Nok', approvedBy:'Nock', transferredBy:'Admin Nock', taxInvBy:'Admin Nock',
    invoiceName:'invoice-vendor-projector.pdf', slipName:'kbiz-slip-20260518.jpg', taxInvName:'tax-invoice-vendor-projector.pdf', taxDate:'2026-05-19',
  });

  /* ── SEED RECURRING (salary = per-branch payee lines) ─────── */
  const SALARY_BY_ROLE = { teacher:28000, admin:24000, manager:38000, area_manager:55000 };
  function staffRole(s) { return (s.roles && s.roles[0]) || String(s.role || '').toLowerCase(); }
  function salaryTemplates() {
    const byBranch = {};
    (DB.staff || []).forEach(s => {
      const amt = SALARY_BY_ROLE[staffRole(s)];
      if (!amt || s.status !== 'active') return;
      const br = s.defaultBranch || (s.branches || [])[0];
      if (!br) return;
      (byBranch[br] = byBranch[br] || []).push({ staffId:s.id, name:s.name, role:staffRole(s), amount:amt });
    });
    return Object.keys(byBranch).map(br => ({
      id: 'rec-sal-' + br.toLowerCase().replace(/[^a-z0-9]/g, ''),
      type:'salary', label:'Staff Payroll', branch:br, dayOfMonth:25,
      lines: byBranch[br], paidMonths:['2026-05','2026-06'],
    }));
  }
  DB.recurringPayments = [
    ...salaryTemplates(),
    { id:'rec-rent-skv',  type:'rental',  label:'Office Rent',          branch:'Sukhumvit', payee:'Landlord — Sukhumvit', amount:45000, dayOfMonth:1, paidMonths:['2026-05','2026-06'] },
    { id:'rec-rent-slm',  type:'rental',  label:'Office Rent',          branch:'Silom',     payee:'Landlord — Silom',     amount:38000, dayOfMonth:1, paidMonths:['2026-05','2026-06'] },
    { id:'rec-rent-bna',  type:'rental',  label:'Office Rent',          branch:'Bang-Na',   payee:'Landlord — Bang-Na',   amount:32000, dayOfMonth:1, paidMonths:['2026-06'] },
    { id:'rec-util-skv',  type:'utility', label:'Internet & Utilities', branch:'Sukhumvit', payee:'AIS / MEA',            amount:6500,  dayOfMonth:5, paidMonths:['2026-06'] },
  ];

  /* ── SEED REIMBURSEMENTS (staff fronted cash → claim back) ── */
  // Any role (incl. Teacher) can create · approve = Director/Special only · paid from Central Bank
  DB.reimbursements = [
    { id:'reim-001', date:'2026-06-24', branch:'Sukhumvit', requestedBy:'Kru Bee', requestedRole:'teacher',
      category:'Teaching Materials and Supplies', amount:1240, reason:'Flash cards + printer ink for class',
      payslipName:'payslip-bee.jpg', payslipDataUrl:null, taxInvoiceName:'tax-bee.pdf', taxInvoiceDataUrl:null,
      submittedDate:'2026-06-24', status:'pending', decidedBy:null, paidDate:null, remark:null },
    { id:'reim-002', date:'2026-06-17', branch:'Sukhumvit', requestedBy:'Admin Nock', requestedRole:'teacher',
      category:'Transportation and Travel', amount:480, reason:'Taxi to district office (document errand)',
      payslipName:'slip-grab.jpg', payslipDataUrl:null, taxInvoiceName:null, taxInvoiceDataUrl:null,
      submittedDate:'2026-06-17', status:'pending', decidedBy:null, paidDate:null, remark:null },
    { id:'reim-003', date:'2026-06-10', branch:'Silom', requestedBy:'Kru Eve', requestedRole:'teacher',
      category:'Others', amount:350, reason:'Snacks for parent open house',
      payslipName:'slip-eve.jpg', payslipDataUrl:null, taxInvoiceName:'tax-eve.pdf', taxInvoiceDataUrl:null,
      submittedDate:'2026-06-12', status:'paid', decidedBy:'Admin Nock', paidDate:'2026-06-14', remark:'Verified slip — approved' },
    { id:'reim-004', date:'2026-06-08', branch:'Sukhumvit', requestedBy:'Kru Cat', requestedRole:'teacher',
      category:'Others', amount:900, reason:'Lunch', payslipName:'slip-cat.jpg', payslipDataUrl:null,
      taxInvoiceName:null, taxInvoiceDataUrl:null, submittedDate:'2026-06-09', status:'rejected',
      decidedBy:'Admin Nock', paidDate:null, remark:'Personal meal — not a company expense' },
    // forwarded → branch admin escalated to Central (amount over their comfort) — now Director/Special acts
    { id:'reim-005', date:'2026-06-20', branch:'Bang-Na', requestedBy:'Admin Aom', requestedRole:'admin',
      category:'Equipment', amount:6800, reason:'Emergency AC compressor part (paid cash to on-site tech)',
      payTo:'Aom Suksawat', payBank:'KBank', payAcctNumber:'123-4-56789-0', payPromptPay:'08x-xxx-1234',
      payslipName:'slip-aom.jpg', payslipDataUrl:null, taxInvoiceName:'tax-aom.pdf', taxInvoiceDataUrl:null,
      submittedDate:'2026-06-21', status:'forwarded', forwardedBy:'Manager Mint',
      forwardReason:'Amount too high', forwardedDate:'2026-06-22',
      decidedBy:null, paidDate:null, remark:null },
  ];

  /* ── BALANCE ENGINE ───────────────────────────────────────── */
  function signed(e) {
    if (e.status === 'inactive') return 0;
    return (e.type === 'received' || e.type === 'income') ? e.amount : -e.amount;
  }
  function pettyBalance(branch) {
    return DB.expenses
      .filter(e => e.branch === branch && e.source === 'petty')
      .reduce((s, e) => s + signed(e), 0);
  }
  /* ── Imprest petty: budget ต่อสาขา (Finance ▸ Settings ▸ Petty Cash → defaultTopupAmount,
     editable) · สิ้นเดือนเติมกลับให้เต็มเสมอ ── */
  function _rngF(seed){ let s=0; for(let i=0;i<seed.length;i++) s=(s*31+seed.charCodeAt(i))>>>0;
    return ()=>{ s=(s*1103515245+12345)>>>0; return (s>>>8)/16777216; }; }
  function pettyOut(branch, ym) {   // petty เงินออกจริงจาก ledger ของเดือนนั้น
    return DB.expenses.filter(e => e.branch===branch && e.source==='petty' && e.status!=='inactive'
      && (e.type==='usage'||e.type==='reimbursement') && e.date.slice(0,7)===ym)
      .reduce((s,e)=>s+e.amount,0);
  }
  function pettyUsed(branch, ym) {   // ใช้จริงถ้ามี · ไม่มีข้อมูล = synthetic (deterministic) สำหรับเทียบ period
    const real = pettyOut(branch, ym);
    if (real > 0) return Math.round(real);
    const r = _rngF(branch + ym); return Math.round((2500 + r()*6500)/100)*100;   // 2,500–9,000
  }
  function pettyBudget(branch) {
    const p = (DB.financePettyCash || []).find(x => x.branch === branch);
    return p ? p.defaultTopupAmount : 10000;
  }
  function pettyRemaining(branch) { return pettyBudget(branch) - pettyUsed(branch, '2026-06'); }

  /* ── Transaction TYPE (flow origin) — ใช้ร่วมทุกหน้า ── */
  function txnType(e) {
    switch (e.type) {
      case 'income':        return { label:'Income',      color:'green' };
      case 'received':      return { label:'Top-up',      color:'amber' };
      case 'reimbursement': return { label:'Reimburse',   color:'pink'  };
      case 'salary':
      case 'rental':
      case 'utility':       return { label:'Recurring',   color:'teal'  };
      default:              return e.source === 'central'
        ? { label:'Direct Paid', color:'blue' }
        : { label:'Record',      color:'gray' };
    }
  }
  function balance(key) {
    if (key === 'central') {
      return CENTRAL_OPENING + DB.expenses
        .filter(e => e.source === 'central')
        .reduce((s, e) => s + signed(e), 0);
    }
    if (key && key.startsWith('petty-')) return pettyBalance(key.slice(6));
    return 0;
  }
  /* petty entries for a branch, ascending, with running balanceAfter */
  function ledger(branch) {
    const rows = DB.expenses
      .filter(e => e.branch === branch && e.source === 'petty')
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
    let run = 0;
    return rows.map(e => { run += signed(e); return { ...e, balanceAfter: run }; });
  }
  /* balanceAfter for any single entry (petty only; central → null) */
  function balanceMap() {
    const map = {};
    FIN_BRANCHES.forEach(b => ledger(b).forEach(e => { map[e.id] = e.balanceAfter; }));
    return map;
  }

  /* ── ROLES / SCOPE ────────────────────────────────────────── */
  function staffByName(name) {
    return (DB.staff || []).find(s => s.name === name) || null;
  }
  // Live permission reads CURRENT_USER.specialAdmin only, so the role switcher can
  // simulate a downgraded role without inheriting the appointed person's powers.
  // (DB.staff[].specialAdmin remains the appointment source for the future Settings UI.)
  function isSpecial(user) {
    return !!(user && user.specialAdmin);
  }
  const ROLE_RANK = { teacher:0, admin:1, manager:2, area_manager:3, director:4 };
  function effRank(user) {
    if (isSpecial(user)) return 4;
    return ROLE_RANK[user && user.role] || 0;
  }
  function userArea(user) {
    const a = (DB.areas || []).find(x => (x.branches || []).includes(user && user.branch));
    return a ? a.name : null;
  }
  function areaBranches(area) {
    const a = (DB.areas || []).find(x => x.name === area);
    return a ? a.branches.slice() : [];
  }
  function visibleBranches(user) {
    if (isSpecial(user) || (user && user.role === 'director')) return FIN_BRANCHES.slice();
    if (user && user.role === 'area_manager') {
      const ab = areaBranches(userArea(user));
      return ab.filter(b => FIN_BRANCHES.includes(b));
    }
    return [user && user.branch].filter(Boolean);
  }
  function inScope(user, branch) {
    return visibleBranches(user).includes(branch);
  }
  const TIER_RANK = { none:0, manager:2, area_manager:3, director:4 };
  function canApprove(user, req) {
    if (!req || req.status !== 'pending') return false;
    if (!inScope(user, req.branch)) return false;
    return effRank(user) >= (TIER_RANK[req.tier] || 0);
  }
  const TIER_LABEL = {
    none:'No approval', manager:'Manager', area_manager:'Area Manager', director:'Director / Special Admin',
  };

  /* ── MUTATIONS ────────────────────────────────────────────── */
  function nextId(prefix, arr) {
    const max = (arr || []).reduce((m, x) => {
      const n = parseInt(String(x.id).split('-').pop(), 10);
      return isNaN(n) ? m : Math.max(m, n);
    }, 0);
    return prefix + '-' + String(max + 1).padStart(3, '0');
  }
  // Formatted display number (e.g. REQ-2026-00001) per Finance ▸ Settings ▸
  // Numbering — a separate field from the internal .id (nextId above), so
  // existing seed records keep their plain req-XXX/exp-XXX ids untouched;
  // only newly-created records get a .number stamped this way.
  function nextDocNumber(docType) {
    const cfg = (DB.financeNumbering || []).find(n => n.docType === docType);
    if (!cfg) return null;
    const year = new Date().getFullYear();
    const number = `${cfg.prefix}-${year}-${String(cfg.nextSeq).padStart(cfg.padWidth, '0')}`;
    cfg.nextSeq += 1;
    return number;
  }
  function addExpense(obj) {
    const e = Object.assign({
      id: nextId('exp', DB.expenses), number: nextDocNumber('expense'), status:'active', posted:false,
      docStatus:'none', docName:null, docs:[], createdBy:(window.CURRENT_USER||{}).name || 'System',
    }, obj);
    if (!e.docs.length && (e.docDataUrl || e.docName)) e.docs = [{ name:e.docName, dataUrl:e.docDataUrl||null, type:e.docType||null }];
    logExpense(e, 'created', e.createdBy);
    DB.expenses.unshift(e);
    return e;
  }
  // petty-cash requests can only be approved by Director / Special Admin (draws from Central via KBiz)
  function canApproveReq(user, r) {
    if (!r || r.status !== 'pending') return false;
    if (r.kind === 'petty_topup')
      return (isSpecial(user) || (user && user.role === 'director')) && inScope(user, r.branch);
    return canApprove(user, r);
  }
  // Approve (in-app) = endorse only → status 'approved' (awaiting KBiz transfer). Does NOT post money.
  function approve(reqId, user, remark) {
    const r = DB.expenseRequests.find(x => x.id === reqId);
    if (!canApproveReq(user, r)) return null;
    r.status = 'approved';
    r.approvedBy = (user || {}).name || 'Approver';
    // separate key from reject/cancel's r.remark so a later cancel doesn't erase the approval note
    if (remark && remark.trim()) r.approveRemark = remark.trim();
    refreshBadges();
    return r;
  }
  // Reject = failed approval — remark required (spec: Reject vs Cancel)
  function reject(reqId, user, remark) {
    const r = DB.expenseRequests.find(x => x.id === reqId);
    if (!canApproveReq(user, r)) return null;
    if (!remark || !remark.trim()) return 'remark_required';
    r.status = 'rejected';
    r.approvedBy = (user || {}).name || 'Approver';
    r.remark = remark.trim();
    refreshBadges();
    return r;
  }
  // Cancel = approved previously but cancelled later, before SA Confirm/Ledger — reason+remark required
  // Same authority as the approval it reverses (tier gate for budget · Dir/SA for petty top-up)
  function canCancelReq(user, r) {
    if (!r || r.status !== 'approved') return false;
    if (!inScope(user, r.branch)) return false;
    if (r.kind === 'petty_topup') return isSpecial(user) || (user && user.role === 'director');
    return effRank(user) >= (TIER_RANK[r.tier] || 0);
  }
  function cancel(reqId, user, reason, remark) {
    const r = DB.expenseRequests.find(x => x.id === reqId);
    if (!canCancelReq(user, r)) return null;
    if (!reason || !reason.trim() || !remark || !remark.trim()) return 'reason_remark_required';
    r.status = 'cancelled';
    r.cancelReason = reason.trim();
    r.remark = remark.trim();
    r.cancelledBy = (user || {}).name || 'Approver';
    refreshBadges();
    return r;
  }
  // After KBiz transfer done (external) → SA uploads slip → post money + status 'paid'
  function canTransfer(user, r) {
    return r && r.status === 'approved' &&
      (isSpecial(user) || (user && user.role === 'director')) && inScope(user, r.branch);
  }
  // Direct Paid (kind:'budget'): money moves here (Confirm/Transferred), but per Nock's
  // 6 Jul 2026 decision the Expense/ledger entry itself is created later, at
  // uploadReqTaxInv (after Tax Invoice → Closed) — ledger should reflect a fully
  // documented spend, not just a transfer. Petty Top-up has no Tax Invoice step, so
  // it keeps creating its ledger entry here, unchanged.
  function markTransferred(reqId, user, slipName, slipDataUrl, slipType) {
    const r = DB.expenseRequests.find(x => x.id === reqId);
    if (!canTransfer(user, r)) return null;
    const today = new Date().toISOString().slice(0,10);
    if (r.kind === 'petty_topup') {
      addExpense({ date:today, branch:r.branch, type:'received', category:'Received', amount:r.amount,
        paidTo:r.requestedBy, payeeType:'staff', source:'petty', flow:'done', docStatus:'none',
        note:'Petty cash top-up (' + r.id + ')' });
    }
    r.slipName = slipName || null;
    r.slipDataUrl = slipDataUrl || null;
    r.slipType = slipType || null;
    r.transferredBy = (user || {}).name || null;
    r.paidDate = today;
    r.status = 'paid';               // Direct Paid → ยังต้อง tax inv → 'closed' (Ledger สร้างตอนนั้น)
    refreshBadges();
    return r;
  }
  function uploadReqTaxInv(reqId, user, name, dataUrl, type) {
    const r = DB.expenseRequests.find(x => x.id === reqId);
    if (!r || r.status !== 'paid' || r.kind !== 'budget') return null;
    const today = new Date().toISOString().slice(0,10);
    r.taxInvName = name || 'tax-invoice.pdf';
    r.taxInvDataUrl = dataUrl || null;
    r.taxInvType = type || null;
    r.taxInvBy = (user || {}).name || null;
    r.status = 'closed';
    // Completed → create the Expense now, carrying every piece of user-entered
    // evidence forward (invoice at submission, transfer slip at Confirm, tax
    // invoice just now) so none of it vanishes once the request becomes a ledger entry.
    const docs = [];
    if (r.docDataUrl || r.docName) docs.push({ name:r.docName||'invoice', dataUrl:r.docDataUrl||null, type:r.docType||null, label:'Invoice' });
    if (r.slipName || r.slipDataUrl) docs.push({ name:r.slipName||'transfer-slip', dataUrl:r.slipDataUrl||null, type:r.slipType||null, label:'Transfer slip' });
    docs.push({ name:r.taxInvName, dataUrl:r.taxInvDataUrl||null, type:r.taxInvType||null, label:'Tax invoice' });
    const e = addExpense({ date:r.paidDate || today, branch:r.branch, type:'usage',
      category:r.category, amount:r.amount, paidTo:r.payTo || '', payeeType:'vendor', source:'central', flow:'done',
      docStatus:'paper', docs,
      acctName:r.acctName||null, acctNumber:r.acctNumber||null, promptPay:r.promptPay||null,
      sourceRequestId:r.id,
      note:r.reason + (r.payMethod === 'transfer' ? ' (โอนเข้าสาขา)' : ' (Central จ่ายตรง)') + ' · ' + r.id });
    // The Expense object only comes into existence now (at Close), but its documents
    // were attached at 3 different real moments before that — replay those moments
    // with their actual dates instead of leaving one generic "created today" log line.
    e.logs = [];
    if (r.docDataUrl || r.docName) e.logs.push({ action:'invoice_attached', by:r.requestedBy, at:r.date });
    if (r.slipDataUrl || r.slipName) e.logs.push({ action:'payslip_attached', by:r.transferredBy || 'SA/Director', at:r.paidDate });
    e.logs.push({ action:'tax_invoice_attached', by:r.taxInvBy || (user||{}).name || 'Admin', at:today });
    e.logs.push({ action:'ledger_created', by:r.taxInvBy || (user||{}).name || 'Admin', at:today });
    r.generatedExpenseId = e.id;
    return r;
  }
  function awaitingTransferFor(user) {
    const vb = visibleBranches(user);
    return DB.expenseRequests.filter(r => r.status === 'approved' && vb.includes(r.branch));
  }
  function awaitingTaxInvFor(user) {
    const vb = visibleBranches(user);
    return DB.expenseRequests.filter(r => r.status === 'paid' && r.kind === 'budget' && vb.includes(r.branch));
  }
  /* ── REQUESTS workspace grouping — by "whose turn is it", not internal stage ──
     Needs your action = this user can approve / transfer / upload tax-inv right now.
     Awaiting others = still in flight (pending/approved) but not actionable by this user.
     History = terminal states (closed/rejected/cancelled). */
  function actionableRequestsFor(user) {
    const vb = visibleBranches(user);
    return DB.expenseRequests.filter(r => vb.includes(r.branch) && (
      (r.status === 'pending'  && canApproveReq(user, r)) ||
      (r.status === 'approved' && canTransfer(user, r)) ||
      (r.status === 'paid'     && r.kind === 'budget')
    ));
  }
  function awaitingOthersFor(user) {
    const vb = visibleBranches(user);
    const mine = new Set(actionableRequestsFor(user).map(r => r.id));
    return DB.expenseRequests.filter(r => vb.includes(r.branch) &&
      (r.status === 'pending' || r.status === 'approved') && !mine.has(r.id));
  }
  function requestHistoryFor(user) {
    const vb = visibleBranches(user);
    return DB.expenseRequests.filter(r => vb.includes(r.branch) &&
      (r.status === 'closed' || r.status === 'rejected' || r.status === 'cancelled'));
  }
  /* ── RECURRING helpers ────────────────────────────────────── */
  const NOW_YM = '2026-06', NOW_DAY = 29;
  function ymAddS(ym, d) {
    const [y, m] = ym.split('-').map(Number);
    const idx = y * 12 + (m - 1) + d;
    return `${Math.floor(idx/12)}-${String(idx%12+1).padStart(2,'0')}`;
  }
  function recurringAmount(t) {
    return t.type === 'salary' ? (t.lines || []).reduce((s, l) => s + l.amount, 0) : t.amount;
  }
  function recurringStatus(t, ym) {
    ym = ym || NOW_YM;
    if ((t.paidMonths || []).includes(ym)) return 'paid';
    return NOW_DAY >= t.dayOfMonth ? 'due' : 'scheduled';
  }
  function recurringFor(user) {
    const vb = visibleBranches(user);
    return DB.recurringPayments.filter(t => !t.branch || vb.includes(t.branch));
  }
  function forecast(user, n) {
    n = n || 6;
    const list = recurringFor(user);
    const salary = list.filter(t => t.type === 'salary').reduce((s, t) => s + recurringAmount(t), 0);
    const other  = list.filter(t => t.type !== 'salary').reduce((s, t) => s + recurringAmount(t), 0);
    const out = [];
    for (let i = 1; i <= n; i++) out.push({ ym: ymAddS(NOW_YM, i), salary, other, total: salary + other });
    return out;
  }
  /* ── REIMBURSEMENT (staff fronted cash → claim back) ──────── */
  const NOW_DATE = '2026-06-29';
  function daysSince(d) {
    const ms = new Date(NOW_DATE) - new Date(d);
    return Math.max(0, Math.round(ms / 86400000));
  }
  // approver/payer = Admin and above (pays from the branch's Petty Cash)
  function isReimApprover(user) { return effRank(user) >= ROLE_RANK.admin; }
  // Central approver = Director / Special Admin — handles claims a branch admin forwarded up
  // (pays back from the Central Bank instead of branch Petty)
  function isReimCentralApprover(user) { return isSpecial(user) || (user && user.role === 'director'); }
  function reimbursementsFor(user) {
    if (isReimApprover(user)) {
      const vb = visibleBranches(user);
      return DB.reimbursements.filter(r => vb.includes(r.branch));   // branch scope
    }
    return DB.reimbursements.filter(r => r.requestedBy === (user && user.name));  // own only
  }
  function pendingReimFor(user) { return reimbursementsFor(user).filter(r => r.status === 'pending'); }
  // "whose turn is it" — pending → branch admin in scope · forwarded → Central approver.
  // Drives the reim badge + the Reimbursement page's action-count so a forwarded claim
  // stops nagging the branch admin and starts nagging Central.
  function reimActionableFor(user) {
    return reimbursementsFor(user).filter(r =>
      (r.status === 'pending'   && isReimApprover(user) && inScope(user, r.branch)) ||
      (r.status === 'forwarded' && isReimCentralApprover(user)));
  }
  // Branch admin escalates a pending claim to Central (reason required) — e.g. amount too high
  function forwardReimbursement(id, user, reason) {
    const r = DB.reimbursements.find(x => x.id === id);
    if (!r || r.status !== 'pending') return null;
    if (!isReimApprover(user) || !inScope(user, r.branch)) return null;
    if (!reason || !reason.trim()) return 'reason_required';
    r.status = 'forwarded'; r.forwardedBy = user.name; r.forwardReason = reason.trim();
    r.forwardedDate = new Date().toISOString().slice(0,10);
    refreshBadges(); return r;
  }
  function addReimbursement(obj) {
    const r = Object.assign({
      id: nextId('reim', DB.reimbursements), number: nextDocNumber('reimbursement'), status:'pending',
      submittedDate: new Date().toISOString().slice(0,10),
      requestedBy: (window.CURRENT_USER||{}).name, requestedRole: (window.CURRENT_USER||{}).role,
      decidedBy:null, paidDate:null, remark:null,
    }, obj);
    DB.reimbursements.unshift(r); refreshBadges(); return r;
  }
  // pay/reject work on both a normal pending claim (branch admin · from Petty) and a
  // forwarded claim (Central approver · from Central Bank). `slip` = optional payback
  // transfer proof {name,dataUrl,type}.
  function reimActor(user, r) {
    if (r.status === 'forwarded') return isReimCentralApprover(user) ? 'central' : null;
    if (r.status === 'pending')   return (isReimApprover(user) && inScope(user, r.branch)) ? 'petty' : null;
    return null;
  }
  function payReimbursement(id, user, remark, slip) {
    const r = DB.reimbursements.find(x => x.id === id);
    if (!r) return null;
    const src = reimActor(user, r);            // 'petty' | 'central' | null(not allowed)
    if (!src) return null;
    r.status = 'paid'; r.decidedBy = user.name;
    r.paidDate = new Date().toISOString().slice(0,10); r.remark = (remark||'').trim() || null;
    if (slip) { r.paybackSlipName = slip.name; r.paybackSlipDataUrl = slip.dataUrl; r.paybackSlipType = slip.type; }
    // auto-post ledger entry — Petty − (branch) or Central Bank − (forwarded)
    addExpense({ date:r.paidDate, branch:r.branch, type:'reimbursement', category:r.category,
      amount:r.amount, paidTo:r.requestedBy, payeeType:'staff', source:src, flow:'done',
      docStatus: r.taxInvoiceName ? 'paper' : 'nodoc',
      note:'Reimbursement — ' + r.requestedBy + ' (' + r.reason + ')' + (src==='central' ? ' · via Central' : '') });
    refreshBadges(); return r;
  }
  function rejectReimbursement(id, user, remark) {
    const r = DB.reimbursements.find(x => x.id === id);
    if (!r || !reimActor(user, r)) return null;
    if (!remark || !remark.trim()) return 'remark_required';   // reject must have a remark
    r.status = 'rejected'; r.decidedBy = user.name; r.remark = remark.trim();
    refreshBadges(); return r;
  }

  /* ── EXPENSE flow helpers (Expenses list status) ─────────── */
  function areaCode(branch) {
    const b = (DB.reportBranches || []).find(x => x.name === branch);
    return b ? b.code : '';
  }
  function payeeNick(name) {
    const s = (DB.staff || []).find(x => x.name === name);
    return s ? (s.nick || '') : '';
  }
  // Expense = log only (no approval). flow = 'upload' (no doc) | 'done' (has doc).

  // staff of a branch with default salary (for the salary create modal)
  function staffForBranch(branch) {
    return (DB.staff || [])
      .filter(s => s.status === 'active' && SALARY_BY_ROLE[staffRole(s)] &&
                   (s.defaultBranch === branch || (s.branches || []).includes(branch)))
      .map(s => ({ staffId:s.id, name:s.name, role:staffRole(s), amount:SALARY_BY_ROLE[staffRole(s)] }));
  }

  /* ── BADGE (pending requests count for current user) ──────── */
  function pendingForUser(user) {
    return DB.expenseRequests.filter(r =>
      r.status === 'pending' && inScope(user, r.branch));
  }
  function refreshBadges() {
    const el = document.getElementById('badge-fin-requests');
    if (el) {
      const n = actionableRequestsFor(window.CURRENT_USER).length;
      el.textContent = n; el.style.display = n ? '' : 'none';
    }
    const rel = document.getElementById('badge-fin-reim');
    if (rel) {
      const n = reimActionableFor(window.CURRENT_USER).length;
      rel.textContent = n; rel.style.display = n ? '' : 'none';
    }
  }

  /* ── EXPOSE ───────────────────────────────────────────────── */
  window.FIN = {
    CATEGORIES, CAT_MAP, DOC, CENTRAL_OPENING,
    branches: () => FIN_BRANCHES.slice(),
    accounts: () => DB.financeAccounts.slice(),
    balance, pettyBalance, ledger, balanceMap,
    approvalTier: tierFor, tierLabel: t => TIER_LABEL[t] || t,
    isSpecial, effRank, userArea, visibleBranches, inScope, canApprove, canApproveReq,
    addExpense, logExpense, approve, reject, canCancelReq, cancel, nextId, nextDocNumber,
    canTransfer, markTransferred, uploadReqTaxInv, awaitingTransferFor, awaitingTaxInvFor,
    actionableRequestsFor, awaitingOthersFor, requestHistoryFor,
    pettyBudget, pettyUsed, pettyRemaining, txnType,
    pendingForUser, refreshBadges,
    recurringAmount, recurringStatus, recurringFor, forecast, staffForBranch,
    daysSince, isReimApprover, isReimCentralApprover, reimbursementsFor, pendingReimFor,
    reimActionableFor, reimActor, forwardReimbursement,
    addReimbursement, payReimbursement, rejectReimbursement,
    areaCode, payeeNick,
  };

  // initial badge paint (after DOM ready / module load)
  if (document.readyState !== 'loading') refreshBadges();
  else document.addEventListener('DOMContentLoaded', refreshBadges);

})();
