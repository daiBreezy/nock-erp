/* ============================================================
   js/data-finance-settings.js — Finance ▸ Settings data layer
   Self-contained — Finance owns ALL of its own configuration here.
   Never reads DB.branchSettings/DB.packages/etc (Academy Settings) —
   see FINANCE-MODEL.md §19 for the isolation mandate this satisfies.
   LOAD ORDER: after data-reports.js (needs DB.reportBranches for the
   branch list), BEFORE data-finance.js (which reads these tables
   instead of its own former hardcoded CATEGORIES/tierFor/PETTY_BUDGET).
   Owns: DB.financeGeneral / financeCategories / financeApprovalRules /
         financePettyCash / financeBankAccounts / financePaymentMethods /
         financeNumbering / financePermissions
   ============================================================ */
window.DB = window.DB || {};
(function () {
  'use strict';

  const FIN_BRANCHES = (DB.reportBranches && DB.reportBranches.length)
    ? DB.reportBranches.map(b => b.name)
    : (CONST.BRANCHES || ['Sukhumvit', 'Silom']);

  /* ── 1. GENERAL ───────────────────────────────────────────── */
  DB.financeGeneral = {
    currency: 'THB',
    currencySymbol: '฿',
    fiscalYearStartMonth: 1,          // 1=Jan
    defaultBranch: FIN_BRANCHES[0] || 'Sukhumvit',
    defaultTaxBehavior: 'none',       // 'inclusive' | 'exclusive' | 'none'
  };

  /* ── 2. CATEGORIES — replaces the CATEGORIES const that used to
     live inline in data-finance.js. Same shape (short/color/icon)
     the ledger badges already depend on, + active + defaultSource
     (which budget a new Record Usage entry defaults to). ── */
  DB.financeCategories = [
    { id:'Transportation and Travel',      short:'Transport', color:'blue',   icon:'commute',     active:true, defaultSource:'petty'   },
    { id:'Teaching Materials and Supplies',short:'Teaching',  color:'purple', icon:'menu_book',   active:true, defaultSource:'petty'   },
    { id:'Advertising and Marketing',      short:'Marketing', color:'orange', icon:'campaign',    active:true, defaultSource:'central' },
    { id:'Equipment',                      short:'Equipment', color:'teal',   icon:'chair',       active:true, defaultSource:'central' },
    { id:'Utilities',                      short:'Utilities', color:'yellow', icon:'bolt',        active:true, defaultSource:'central' },
    { id:'Others',                         short:'Others',    color:'gray',   icon:'category',    active:true, defaultSource:'petty'   },
    { id:'Salary',                         short:'Salary',    color:'green',  icon:'payments',    active:true, defaultSource:'central' },
    { id:'Rental',                         short:'Rent',      color:'green',  icon:'home_work',   active:true, defaultSource:'central' },
    { id:'Received',                       short:'Top-up',    color:'blue',   icon:'savings',     active:true, defaultSource:'central' },
    { id:'Income',                         short:'Income',    color:'green',  icon:'trending_up', active:true, defaultSource:'central' },
  ];

  /* ── 3. APPROVAL RULES — reproduces today's tierFor() 1k/3k/5k
     gate exactly (verified against js/data-finance.js tierFor before
     this migration) so behavior doesn't change, just becomes editable. ── */
  DB.financeApprovalRules = [
    { id:'gate-manager',      tier:'manager',      minAmount:1000, maxAmount:2999, branch:'all', approverRoles:['manager'],      requireMultiple:false },
    { id:'gate-area-manager', tier:'area_manager', minAmount:3000, maxAmount:4999, branch:'all', approverRoles:['area_manager'], requireMultiple:false },
    { id:'gate-director',     tier:'director',     minAmount:5000, maxAmount:null, branch:'all', approverRoles:['director'],     requireMultiple:false },
  ];

  /* ── 4. PETTY CASH — one row per branch. Seeded from today's flat
     PETTY_BUDGET=10000 so the imprest math stays identical after
     the swap to per-branch config. ── */
  const PETTY_STAFF = { Sukhumvit:'Admin Nock', Silom:'Manager Mint' };
  DB.financePettyCash = FIN_BRANCHES.map(b => ({
    branch: b,
    currentBalance: 10000,
    minBalance: 2000,
    defaultTopupAmount: 10000,
    autoReminderThreshold: 2000,
    responsibleStaff: PETTY_STAFF[b] || null,
    defaultAccountId: b === 'Sukhumvit' ? 'bank-002' : (b === 'Silom' ? 'bank-003' : 'bank-001'),
  }));

  /* ── 5. BANK ACCOUNTS — real directory. Additive: does NOT replace
     DB.financeAccounts (that's an internal ledger-bucket-key list,
     'central'/'petty-{branch}', used by FIN.balance()/ledger() — a
     different concept, left untouched). ── */
  DB.financeBankAccounts = [
    { id:'bank-001', bank:'Kasikornbank', accountName:'Nock Academy Co., Ltd.',   accountNumber:'123-4-56789-0', promptPay:'0812345678', branch:null,        status:'active', isDefault:true,  usedFor:['transfer','topup','reimbursement'] },
    { id:'bank-002', bank:'Krungsri',     accountName:'Nock Academy — Sukhumvit', accountNumber:'234-5-67890-1', promptPay:'',           branch:'Sukhumvit', status:'active', isDefault:false, usedFor:['topup'] },
    { id:'bank-003', bank:'Bangkok Bank', accountName:'Nock Academy — Silom',     accountNumber:'345-6-78901-2', promptPay:'',           branch:'Silom',     status:'active', isDefault:false, usedFor:['topup'] },
  ];

  /* ── 6. PAYMENT METHODS — replaces the 2 hardcoded <option>s in
     fin-requests.js rqOpenBudget() ('central'/'transfer'). ── */
  DB.financePaymentMethods = [
    { id:'central_transfer', name:'Central Transfer', active:true },
    { id:'petty_cash',       name:'Petty Cash',       active:true },
    { id:'cash',             name:'Cash',             active:true },
    { id:'corporate_card',   name:'Corporate Card',   active:true },
    { id:'promptpay',        name:'PromptPay',        active:true },
  ];

  /* ── 7. NUMBERING — formatted doc numbers (e.g. REQ-2026-00001) for
     NEW records only. Existing seed ids (req-001/exp-001 style, from
     FIN.nextId()) are untouched — this is a separate display field
     (e.g. r.number), not a replacement of the internal .id. ── */
  DB.financeNumbering = [
    { docType:'request',       prefix:'REQ',  padWidth:5, nextSeq:1 },
    { docType:'expense',       prefix:'EXP',  padWidth:5, nextSeq:1 },
    { docType:'reimbursement', prefix:'REIM', padWidth:5, nextSeq:1 },
    { docType:'recurring',     prefix:'REC',  padWidth:5, nextSeq:1 },
  ];

  /* ── 8. PERMISSIONS — Finance-specific capability flags per Academy
     role. Editable here, but NOT wired into the real authorization
     checks yet (FIN.canApprove/canApproveReq/canTransfer/isReimApprover
     still run on the original hardcoded ROLE_RANK logic in
     data-finance.js) — mirrors today's behavior, live enforcement is
     an explicit Phase 2 (confirmed with Nock, see FINANCE-MODEL.md §19). ── */
  DB.financePermissions = [
    { role:'director',     canApproveRequests:true,  canApprovePettyTopup:true,  canManageBankAccounts:true,  canEditSettings:true,  canViewReports:true  },
    { role:'area_manager', canApproveRequests:true,  canApprovePettyTopup:false, canManageBankAccounts:false, canEditSettings:false, canViewReports:true  },
    { role:'manager',      canApproveRequests:true,  canApprovePettyTopup:false, canManageBankAccounts:false, canEditSettings:false, canViewReports:false },
    { role:'admin',        canApproveRequests:false, canApprovePettyTopup:false, canManageBankAccounts:false, canEditSettings:false, canViewReports:false },
    { role:'teacher',      canApproveRequests:false, canApprovePettyTopup:false, canManageBankAccounts:false, canEditSettings:false, canViewReports:false },
  ];

})();
