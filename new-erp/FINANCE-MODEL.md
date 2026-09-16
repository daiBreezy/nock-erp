# NockERP — Finance Model (Master Reference)

> รวมทุกอย่างเรื่อง Finance ไว้ที่เดียว · อ่านไฟล์นี้ก่อนแก้ระบบ Finance เสมอ
> อัปเดตล่าสุด: 7 Jul 2026 · ประวัติการ build: [CHANGELOG.md](CHANGELOG.md)
> โค้ด: `js/data-finance.js` (window.FIN) · `js/data-finance-settings.js` (⭐ config แยกจาก Academy — §19) ·
> `js/fin-dashboard.js` · `fin-expenses.js` · `fin-requests.js` · `fin-reimburse.js` · `fin-recurring.js` · `fin-reports.js` ·
> `fin-settings.js` / `fin-settings-approval.js` / `fin-settings-accounts.js` / `fin-settings-permissions.js`

---

## 1. ระบบนี้คืออะไร (scope)

**Finance = ระบบ "Expense & Cash Control"** — คุมการ **ใช้จ่าย + เงินสดหมุนเวียน** ของบริษัท
**ไม่ใช่** ระบบบัญชี/งบกำไรขาดทุน และ **ไม่ใช่** ระบบรายได้ (ค่าเรียน = โลกของ Billing)

แยกระบบจาก Academy ผ่าน **app-rail** (ClickUp 2-tier nav: Academy / Finance / HR-soon)

---

## 2. บัญชี (2 accounts)

| บัญชี | ในระบบนี้ไหม | หมายเหตุ |
|---|---|---|
| **บัญชีรับ (Invoice income)** | ❌ นอก scope | ค่าเรียนเข้าที่นี่ = Billing ดูแล · ระบบนี้**ไม่ต้องรู้ยอด**เลย |
| **CBA — บัญชีจ่าย (Central Bank Account)** | ✅ focus | บัญชีจ่ายจริง (salary/rent/ซื้อของ/เติม petty) · ยอด/runway = ของจริง |
| **Petty float (ต่อสาขา)** | ✅ | เงินสดในมือแต่ละสาขา |

- **CBA เติมเงินยังไง?** = โอนก้อนจากบัญชีรับ ("Funding") — ไม่ใช่ต่อ invoice · (logic Funding ยัง park)
- **"Income vs Outcome"** ในระบบนี้ = กระแสเงินของบัญชีจ่าย **ไม่ใช่กำไรบริษัท**

---

## 3. Transaction Type (chip) — `FIN.txnType(e)`

ทุกแถวใน ledger ตอบ 2 มิติ: **Type (มาจาก flow ไหน)** × **Source (กระเป๋าไหน: Petty/Central)**

| Type | สี | = e.type / source | Category เสริม |
|---|---|---|---|
| **Record** | เทา | usage + petty (Admin ลง log) | Transport/Teaching/… |
| **Direct Paid** | ฟ้า | usage + central (จาก request) | Equipment/… |
| **Reimburse** | ชมพู | reimbursement | ค่าที่สำรอง |
| **Recurring** | teal | rental + utility + salary | Rent / Salary / Utilities |
| **Top-up** | amber | received (เติม petty) | — (ซ่อน) |
| **Income** | เขียว | income (รายได้จริง non-invoice) | — (ซ่อน) |

- Category = "ค่าอะไร" · ซ่อนสำหรับ Top-up/Income (Type บอกแล้ว)
- **Paid to จำเป็นเฉพาะจ่ายให้ staff** (Reimburse/Salary) · vendor อยู่ใน Description (ไม่มี vendor field แยก)
- Ledger column "Recorded by" = **คนที่บันทึก/ยื่นเสมอ** (createdBy) — ไม่มี vendor ปน

---

## 4. Petty imprest (locked)

- ทุกสาขา **budget คงที่ 10,000** · remaining = 10,000 − ใช้เดือนนี้
- **สิ้นเดือนส่วนกลางเติมกลับให้เต็ม 10,000 เสมอ**
- `FIN.pettyBudget()` / `pettyUsed(branch,ym)` / `pettyRemaining(branch)` (real ledger ถ้ามี · else synthetic สำหรับเทียบ period)

---

## 5. Money flows + Request lifecycle

### 5 flow หลัก
| Flow | ใครสร้าง | อนุมัติ (in-app) | จ่ายจาก |
|---|---|---|---|
| **Record (Expense log)** | Admin | ❌ ไม่ต้อง (log ล้วน) | Petty (จ่ายไปแล้ว) |
| **Direct Paid (Request)** | ครู/Admin | **Gate ตาม tier** → 1–3k Mgr · 3–5k AreaMgr · 5k+ Dir/SA | Central (CBA) |
| **Reimburse** | Staff (ทุก role incl Teacher) | Admin review → **Have petty?** Yes=Admin จ่าย petty · No=escalate Dir/SA | Petty หรือ Central |
| **Petty Top-up (Request)** | Admin | SA / Director | Central → Petty |
| **Recurring / Salary** | Admin | Director (recurring) · Salary=KBank external | Central |

### Central Payout Engine (Direct Paid / Top-up / Reimburse-central ใช้ร่วมกัน)
```
Admin: Create Request
 → Approve (in-app · SA หรือ Director คนเดียวพอ · ทั้งคู่เห็นได้ · Direct Paid ใช้ tier gate)
   → status "Awaiting transfer"   ← [KBiz: SA สร้าง → Director อนุมัติ = external ระบบไม่แตะ]
     → SA: Upload slip → status "Paid" (ระบบ post เงินออกจริง)
       → (Direct Paid) Admin: Upload Tax Invoice → status "Closed"
```
- **In-app มีแค่:** Create Request · Approve · Upload slip · Upload tax inv · track status
- **maker-checker (2 คน) อยู่บน KBiz เท่านั้น** · in-app อนุมัติคนเดียวพอ
- States: `pending → approved → paid → closed` (+ `rejected`)
- Reimburse light path (มี petty): Admin review → จ่าย petty → upload evidence → paid (ไม่แตะ KBiz)

### กฎอนุมัติสำคัญ
- **Tier = "endorsement gate" ของ Direct Paid เท่านั้น** (ตรวจความจำเป็นก่อนซื้อ) ไม่ใช่อำนาจเงินสุดท้าย
- Reimburse **ไม่มี tier gate** (จ่ายไปแล้ว · Admin review พอ) · ของใหญ่ควรผลักไป Direct Paid
- Reimburse reject = **remark บังคับ** · approve = remark optional
- Reimburse payslip = บังคับ (tax invoice optional)

---

## 6. Roles & Visibility

- `FIN.visibleBranches(user)` — Director/Special = ทุกสาขา · Area Mgr = สาขาในพื้นที่ · Mgr/Admin = สาขาตัวเอง · Teacher = —
- `FIN.canApproveReq` (budget=tier · petty_topup=Dir/SA) · `FIN.canTransfer` (Dir/SA) · `FIN.isReimApprover` (admin+)
- **Special Admin** = live เช็คจาก `CURRENT_USER.specialAdmin` (Director-equivalent) · staff flag = data สำหรับ appoint UI (อนาคต)
- **Teacher** เปิด Finance ได้เห็น**เฉพาะเมนู Reimbursement + คำขอตัวเอง** (app.js `applyFinanceNavGate`)

---

## 7. UI structure

**Nav (Option A): 5 เมนู** — Overview · Expenses · Reimbursement · Recurring · Reports (Requests ยุบเข้า Expenses)

- **Overview** = command center: KPI (Needs attention · Pending · Spend · Central Bank+runway) · Needs-attention alert cards (problem→impact→action) · **Branch petty list** (Budget/Used/Remaining + period chips MTD/MoM/QTD/QoQ/YTD/YoY) · Upcoming/forecast · Pending-approvals modal
- **Expenses** = ศูนย์รวม · **Tabs All / Pending**
  - *All* = week-grouped ledger · cols: Date · **Type** · Category · Description · Amount · Source · Recorded by · Location · Status(`upload→done`)
  - *Pending* = 4 stage: 1 รออนุมัติ · 2 อนุมัติแล้ว-รอโอน+สลิป · 3 Direct Paid-รอ tax inv · 4 เบิกคืน
  - **+ Record Usage** (log · ไม่มี Paid-to) · **+ New Request** → Direct Paid (invoice-first + mock AI autofill + เลขบัญชี/QR + note) / Petty Top-up
- **Reimbursement** = staff ยื่น + payslip · Admin ตรวจ+จ่าย (petty) · aging
- **Recurring** = Salary per-branch payee breakdown + Rent/Utilities + 6-mo forecast
- **Reports** = period chips · branch comparison · income vs outcome · category · forecast

---

## 8. Data layer (window.FIN + DB)

**DB:** `expenses` · `expenseRequests` · `reimbursements` · `recurringPayments` · `financeAccounts`

**Expense fields:** id, date, branch, type(usage/received/reimbursement/salary/rental/income), category, amount, paidTo, payeeType(staff/vendor), source(central/petty), note, docStatus(paper/nodoc/cashsale/none), docName/docDataUrl/docType, **flow(upload/done)**, **status(active/inactive)**, createdBy
> ⚠️ `e.status` = soft-delete (active/inactive) · `e.flow` = lifecycle (upload/done) — คนละตัว

**Request fields:** id, **kind(budget/petty_topup)**, payMethod(central/transfer), date, branch, category, amount, source, requestedBy, payTo(vendor), account, note, reason, tier, **status(pending/approved/paid/closed/rejected)**, approvedBy, slipName, paidDate, taxInvName

**Reimbursement fields:** id, date, branch, requestedBy, category, amount, reason, payslipName/DataUrl, taxInvoiceName/DataUrl, submittedDate, status(pending/paid/rejected), decidedBy, paidDate, remark

**Recurring fields:** id, type(salary/rental/utility), label, branch, dayOfMonth, amount | lines[]{staffId,name,role,amount}, payee(s), paidMonths[]

**FIN key fns:** txnType · balance/pettyBalance/pettyBudget/pettyUsed/pettyRemaining · ledger/balanceMap · approvalTier/tierLabel · visibleBranches/inScope/canApprove/canApproveReq/canTransfer/isReimApprover · addExpense · approve/reject/markTransferred/uploadReqTaxInv · awaitingTransferFor/awaitingTaxInvFor/pendingForUser/pendingReimFor · addReimbursement/payReimbursement/rejectReimbursement · recurringFor/recurringAmount/recurringStatus/forecast/staffForBranch · areaCode/payeeNick/daysSince/refreshBadges

---

## 9. สถานะ (built vs pending)

**✅ Built:** app-rail 2-tier · Overview command center + branch petty imprest list + period compare · Expenses (All+Type column / Pending 4-stage) · Record Usage · Direct Paid request (invoice-first + mock AI + account/QR + note) + tier gate + lifecycle flow B · Petty Top-up request · Reimbursement (petty, Admin) · Recurring (per-branch payroll+forecast) · Reports · roles/visibility · Teacher gate

**⏸️ Parked (ยังไม่ build):**
- Reimburse **Have-Petty? auto-branch + escalate-to-central** (ตอนนี้ทำแค่ petty path)
- **Funding** (CBA เติมจากบัญชีรับ) — logic ยังไม่นิ่ง
- Top-up หัก Central ให้ reconcile (ตกลงแล้วว่าถูก)
- **Manager gate** สำหรับ Direct Paid (เกณฑ์/บังคับ) — tier มีแล้วแต่ยังเป็น final-approve ไม่ใช่ endorse-then-central
- Batch approve · imprest auto-request เมื่อ petty ต่ำ · แยก role operator
- **AI OCR จริง** (ตอนนี้ mock) · **Import KBiz statement** (auto-match) — future integration (read-only, ไม่ move money)
- **Recurring rework** (variable + รวม INV ต่อสาขาเป็น 1 transaction) · **Salary automation**
- แสดง account/note ที่กรอกใน Direct Paid ที่ detail modal
- Special Admin appointment UI (Settings)

**⚠️ ข้อจำกัด demo:** finance data จริงมีแค่ เม.ย.–มิ.ย. 2026 → MoM/MTD/QTD/YTD บางส่วนจริง · QoQ/YoY = synthetic · AI = mock

---

---

## 10. Spec conformance backlog (2 Jul 2026)

> **Governance:** `GPT MD/FINANCE_DOMAIN_SPEC.md` = **single source of truth** · ChatGPT owns domain/UX/rules · Claude owns implementation
> ถ้า business logic ไม่ชัด/ขัด → อธิบาย + ถามก่อน · ไม่เดา · ไม่ silently change · ไม่ redesign workflow เอง

**Confirmed decisions (Q1–Q5 / A1–A2):**
- **Petty:** running balance (budget 10k) · สิ้นเดือน **ระบบ auto-สร้าง Petty Top-up request + notify SA** (Admin ไม่ต้องขอ) → SA approve+KBiz+Confirm ตามปกติ (**ไม่ auto-approve**)
- **Tier:** คงไว้เป็น **gate กรอง request** (1–3k Mgr · 3–5k AreaMgr · 5k+ Dir/SA)
- **Reimburse:** Admin สาขา = gate แรก · petty ไม่พอ → **Forward to SA** → ใช้ **central engine เดียวกับ Direct Paid/Top-up**
- **Editing:** แก้ได้แต่ **ต้องมี Activity Log** (ใคร/เมื่อไหร่/อะไร) · **Delete ห้ามเด็ดขาด**
- **Action button:** ปุ่ม**เดียว state-driven** (โชว์ปุ่มตาม stage: Approve → Confirm(payslip) → Upload Tax Inv)
- **Ledger:** สร้างหลัง **SA Confirm (upload payslip)** เท่านั้น · Record Usage → ทันที · **Request ≠ Ledger** (คนละ entity)
- **Reject** = failed approval (**remark บังคับ**) · **Cancel** = approved แล้วยกเลิก (**reason+remark บังคับ**)
- **Evidence:** รองรับ**หลายไฟล์** (receipt/tax inv/payslip/screenshot/image/pdf) · **Notification** ตาม workflow owner
- **Balance:** Dashboard = real-time · Reports = historical · สูตร petty = `Starting Budget − Record Usage − Reimburse(Petty) + Top-up`

**Build order (incremental):**
- **A ✅ (3 Jul 2026):** เอา Delete ออก (fxRemove ลบทิ้ง, เหลือ Inactivate) + เพิ่ม **Cancel** (FIN.cancel/canCancelReq —
  เฉพาะ status:'approved' ก่อน Confirm, reason+remark บังคับ) · **Reject remark บังคับ**ทุก request (FIN.reject) ·
  **ปุ่มเดียว state-driven** — รวม Approve/Reject/Transfer/Upload Tax Inv เดิม (แยกปุ่มต่อ block) เป็น modal เดียว `frOpen`
  (เหมือน `rbOpen` ของ Reimbursement) footer เปลี่ยนตาม status
- **B** (เติม flow ที่ขาด — ยังไม่เริ่ม): **Reimburse Forward-to-Central** · **Auto month-end petty refill + notify SA**
- **C** (audit & evidence — บางส่วน): **Activity Log ✅** (Requests panel, §12 — ยังไม่มีที่ Reimbursement) · **Evidence หลายไฟล์** ยังไม่เริ่ม · **Notification** ยังไม่เริ่ม

---

## 11. Finance UX Constitution — workflow restructure (3 Jul 2026)

> Governance: Finance = operational tool to cut workload for Admin/Manager/**Special Admin**, not a database viewer.
> Optimize for SA first (busiest role, repeats Approve→KBiz→Confirm→Tax-Inv all day). Screens = one purpose each ·
> tables = index only · detail pages = workspace, ordered by how the money decision is actually made, not by DB schema.

**Nav split (Expenses ≠ Requests, per constitution rule 2):**
- **Expenses** (`js/fin-expenses.js`) → historical ledger **only**. Week-grouped table, search/filter, + Record Usage
  (instant log, no approval lifecycle). No tabs, no "New Request" button, no approval UI — moved out entirely.
- **Requests** (`js/fin-requests.js`, new nav item + `badge-fin-requests`) → SA's operational workspace for
  Direct Paid + Petty Top-up. Default tab **"Needs your action"** = whatever this user can approve/confirm-transfer/
  upload-tax-invoice right now, sorted oldest-first (not grouped by internal stage taxonomy) · **"Awaiting others"**
  = in-flight but blocked on someone else (visibility only) · **"History"** = closed/rejected/cancelled.
  `FIN.actionableRequestsFor/awaitingOthersFor/requestHistoryFor(user)` drive the three tabs.
- **Reimbursement** stays a separate page (unchanged nav) — different approver (Admin, paid from branch petty),
  different job; folding it into Requests would dilute SA's queue with work that isn't tier-gated.
- **Overview** no longer duplicates the review UI (`ovApprovals` modal removed) — "Pending approvals" KPI and the
  "Needs attention" alerts navigate straight into `fin-requests` / `fin-reimburse` instead of opening a parallel modal.

**Request Detail (`frOpen`) reordered to match the money decision, not the DB schema:**
what (category+reason) → who gets paid + amount → payment method + account/PromptPay (with **copy button** —
cuts the KBiz retyping SA does on every request) → invoice evidence (**now a real stored preview**, `docDataUrl`
captured at Direct Paid submission the same way Reimbursement already stores payslips — not just a filename) →
de-emphasized routing metadata (requested by / gate / note) → **Activity** audit trail last.

**Cancel is inline, not a second modal** (`frOpen(id,'cancel')` swaps the same modal's body/footer in place) —
previously opened a separate `modal-fr-cancel`, which violated "never force another modal."

---

## 12. Finance UX Refactor — master-detail + batch entry (3 Jul 2026, later same day)

> Follow-up to §11: not a visual pass — a click/speed workflow rebuild aimed at Finance-officer throughput
> (processing many transactions/day). Tables = index only · Detail = side panel, not a modal · batch, not one-at-a-time.

**Requests (`js/fin-requests.js`) rebuilt as master-detail, no modal:**
- Two-column layout: list (~60%) + a permanent `#rq-panel` side panel (~38%, sticky). Click a row → panel re-renders
  in place immediately — no `Modal.create`/`Modal.close`, no reopen animation. Row stays highlighted while selected.
- List columns tightened per tab: **Needs your action** = Date/Type/Branch/Amount/Requested by/**Needs**(action verb)/
  **Status**/→ · **Awaiting others** swaps Needs→**Waiting on** · **History** swaps Needs→**Result**+**Decided by**.
- `↑`/`↓` keyboard nav moves the row selection (never bound to a destructive action — approve/reject/cancel stay
  deliberate clicks, not keystrokes).
- Cancel confirmation is inline within the same panel (`renderPanel('cancel')`), not a second popup.
- Panel field order now literally follows the money decision: **what** (category+reason) → **who/amount** (Vendor +
  Amount, each with its own copy button) → **how** (Payment method, **Account name / Account number / PromptPay as
  three separate fields**, each with a copy button — was one free-text `account` string) → **invoice** (real preview)
  → **note** → de-emphasized **Requester/Approval** → [state-driven action] → **Activity Log** (always rendered,
  vertical timeline: Requested → Approved → Transferred → Invoice Uploaded → Completed, or the Rejected/Cancelled
  branch — each step shows who/what/when so the whole story reads in one glance, replacing the old flat "Activity"
  info-grid). `r.approveRemark` is now separate from `r.remark` (reject/cancel) so an approval note survives a later
  cancel instead of being overwritten.
- Data model: `expenseRequests[].account` → split into `.acctName` / `.acctNumber` / `.promptPay`. Create-form
  (`rqOpenBudget`) has three matching fields.

**Expenses (`js/fin-expenses.js`) — Record Usage rebuilt as a batch editor:**
- `+ Record Usage` opens one editor (`modal-fx-batch`, `modal-xl`) supporting many rows at once, no reopening:
  - **Method A** — drag/drop or multi-select receipts → each file is read (mock AI, `buMockExtract`) into its own
    editable row (Date/Description/Category/Amount/Branch/Source). Low-confidence fields (simulated) are left blank
    rather than guessed, flagged "Need category" etc.
  - **Method B** — `+ Add Row` appends a blank row for typing manually; both methods share the same table.
  - **Save All** does partial validation: rows that are "Ready" save via `FIN.addExpense` and drop out of the table;
    rows still missing a field stay for the user to fix. Modal only auto-closes when nothing remains.
- Editing an *existing* historical record is a separate, simple single-row flow now (`fxEditOne`, was the old
  `fxUsage(editId)`) — batch UI is only for creating new entries.

---

## 13. Expense detail → slide-over panel + multi-doc + Logs (3 Jul 2026, evening)

> Reference: user-provided mockup. Applies the same "no modal" pattern from §12 to Expenses' detail view,
> plus two new structural pieces: multi-document gallery and a per-record audit Logs tab.

**`js/fin-expenses.js` — `fxOpen` now opens a slide-over drawer** (`#fx-drawer-root`, fixed-position panel + backdrop,
420px, closes on backdrop/✕) instead of `Modal.create`. Tabs: **Info** (workspace) / **Logs** (audit trail, reuses
the vertical-timeline visual from §12's Activity Log). Info tab order: title+badges → branch/date/recorded-by →
Paid to (avatar or vendor icon, via `personCell`) → Amount → **Payment** card (Method + Account name/number/PromptPay
when present, each with a copy button, reusing `frCopy` from fin-requests.js) → **Document file** gallery (multi-doc
thumbnails + "+ Add More", not a single-file replace) → Inactivate/Edit Expense actions.

**Data model:**
- `e.docs[]` replaces the single `docDataUrl/docName/docType` fields as the source of truth (legacy fields
  auto-migrated into `docs[]` on load and in `addExpense`, so old seed data still renders). `fxAddDocs` appends
  (supports multiple files at once) rather than replacing.
- `e.logs[]` — audit trail per expense (`created`/`edited`/`inactivated`/`document_added`), written by
  `FIN.logExpense(e, action, by)`. Auto-logs `created` inside `addExpense`.
- `FIN.markTransferred` now carries the originating Direct Paid request's `acctName/acctNumber/promptPay` and its
  invoice + transfer slip into the settled Expense's `docs[]` — that info no longer disappears once a request
  becomes a ledger entry (ties back to §11's "preserve all user-entered info").

**Ledger table** gained a **Request by** column (avatar+nickname for staff, store icon for vendor — via the same
`personCell` used in the drawer) and a per-week **+/− total with a collapse chevron** (`fxToggleWeek`), matching the
reference. This makes the table 9 columns wide, intentionally overriding the earlier "≤8 columns" guideline from
§11 since the user supplied an explicit visual reference to match.

**Known simplification vs the reference mockup:** no bank-logo/name lookup (just shows the raw account text),
no "Detail"/chevron navigation to a vendor or staff profile page (none exists yet), and no separate "Note" field
distinct from the description (would have duplicated the title — skipped per "never duplicate information").

---

## 14. Record Usage → inline batch editor, not a modal (3 Jul 2026, evening)

> Reference: user-provided mockup. Same "no popup" principle as §12/§13 — clicking **+ Record Usage** now expands
> the batch editor **inline on the Expenses page itself** (`#fx-batch-editor`, between the filter bar and the
> ledger) instead of opening `Modal.create`. Collapses back via the **Cancel** text-link or after a full save.

**`js/fin-expenses.js`:**
- Batch row columns now match the reference exactly: File · Date · **Type** (Expense/Income, new — was implicit
  'usage' before) · Category · Description · Amount · Source · Location · Status.
- **Inline validation styling** — Category/Description/Amount inputs get a warning-colored border directly on the
  field when empty (`buUpdateStatus` sets `style.border`), not just a text label off to the side.
- Status simplified to two states matching the mockup: **Ready** (green) / **Required** (amber) — replacing the
  earlier per-field "Need category"/"Need amount" text (still same underlying `buMissing()` check, just simpler
  badge language since the border highlight on the field itself now shows *which* one).
- File cell shows a real 32×32 image thumbnail once a receipt is read (was icon+filename text before).
- `fxUsage()` is idempotent (no-op if already open) instead of stacking; `fxCancelUsage()` collapses the section.

---

## 15. Architecture Refactor proposal (3 Jul 2026, decided 6 Jul 2026) — ยังไม่ build

> Full spec (จาก ChatGPT) เก็บไว้ที่ `GPT MD/FINANCE_DOMAIN_SPEC.md` § ADDENDUM · ที่นี่สรุปเฉพาะ gap เทียบกับโค้ดจริง

**ยืนยันแล้วว่าตรงกับที่มีอยู่แล้ว (ไม่ต้องแก้):**
- Request ≠ Expense แยก entity กันจริง (ไฟล์แยก, ไม่มี approval state บน Expense) ✅
- One-click copy ปุ่มครบ (Vendor/Amount/Account/PromptPay) ✅
- Request type ต่างกันแชร์ layout เดียว ต่างแค่ Information section — ทำแล้วผ่าน `r.kind` conditional ✅
- Bulk Record Usage (AI extract หลายไฟล์ + fallback Add Row) — ทำแล้ว ขาดแค่ field "Receipt Number" (เล็กน้อย)

**สิ่งที่ spec ใหม่เสนอ — Nock **override 2 จุด** ตอน build จริง (6 Jul 2026, ดูรายละเอียดใน §17):**
- ~~Panel pattern ของ Expense ต้องเป็น persistent split-panel เหมือน Requests~~ → **กลับด้าน**: Nock สั่งให้ **Requests เปลี่ยนมาเป็น overlay drawer แบบ Expense เดิมแทน** (ตาราง 100% width เสมอ, คลิกแถว→drawer สไลด์เข้า) — ไม่ใช่ persistent split-panel ทั้งคู่
- ~~ตัดคอลัมน์ "Request by" ออกจากตาราง Expense~~ → **ไม่ตัด**: Nock ยืนยันให้เก็บคอลัมน์นี้ไว้ แค่แก้ logic ให้ถูก (โชว์ชื่อผู้ยื่น request จริงถ้ามี ไม่ใช่ paidTo, "—" ถ้าเป็น log ธรรมดา) — ข้อมูลนี้มีประโยชน์ ไม่ใช่ leak
- ต้องมี **Side Panel component เดียวที่ใช้ร่วมกัน** ทั้ง Request/Expense — **ทำแล้ว** ✅ `js/fin-side-panel.js → window.FinPanel` (ดู §17)
- **Workflow component แยกจาก Audit** — **ทำแล้ว** ✅ ทั้งคู่ใช้ `FinPanel.timeline()` renderer เดียวกัน คนละ data (ไม่ได้ฝัง action ปุ่มในตัว step ตามที่ addendum เสนอ — ปุ่ม action ยังอยู่ใน section "Actions" แยกต่างหากถัดจาก Audit เพื่อความเรียบง่าย)
- ตาราง Request/Expense: ปรับคอลัมน์ตาม spec ใหม่ — **ยังไม่ทำ** (Branch/Description ของ Request table ยังต้อง confirm กับ Director/AreaMgr ก่อน)
- ต้องมี **bidirectional link Request↔Expense** จริง (field `sourceRequestId`/`generatedExpenseId`) — **มี field แล้ว** (built ตอนย้าย ledger timing §15 ข้อ 4) แต่ยังไม่มี click-through UI ระหว่าง 2 หน้า

**✅ ตัดสินใจแล้ว (6 Jul 2026 — Nock confirm):**
1. **Ledger สร้างตอนไหน → "Complete หลัง Tax Invoice"** — **override ของเดิม**: FINANCE_DOMAIN_SPEC.md ต้นฉบับ + build ปัจจุบันสร้าง Expense/Ledger ตอน **SA Confirm** (ก่อน Tax Invoice) แต่ Nock ยืนยันให้ย้ายไปสร้างตอน **Completed (หลัง Admin upload Tax Invoice)** แทน
   - Direct Paid lifecycle เดิม: `pending → approved → paid(=Confirm,สร้าง ledger ณ จุดนี้) → closed(=Tax Invoice)`
   - lifecycle ใหม่ตามตัดสินใจนี้: `pending → approved → paid(=Confirm/Transferred, **ยังไม่มี ledger**) → closed(=Tax Invoice uploaded → **สร้าง Expense ตรงนี้**)`
   - กระทบเฉพาะ **Direct Paid** (Petty Top-up ไม่ผ่าน Tax Invoice — ต้องคุยแยกว่านับ ledger ตอนไหน เพราะไม่มี step "Completed" แบบเดียวกัน — ดู open question ด้านล่าง)
   - Reimbursement ไม่กระทบ (แยก flow อยู่แล้ว ตามข้อ 2)
2. **Reimbursement ผนวกเป็น Request type ที่ 3 ไหม → "แยก Page"** — คงของเดิมไว้ **ไม่ merge**: `DB.reimbursements` แยกตาราง, `js/fin-reimburse.js` แยกหน้า, approver คนละคน (Admin สาขา ไม่ใช่ SA/Director) เหมือนเดิมทุกอย่าง — ส่วน addendum ที่เสนอรวมเข้า unified Request entity **ไม่ทำ**

**✅ Open question ตอบแล้ว (6 Jul 2026):** Petty Top-up **สร้าง ledger ตอน paid/Confirm เหมือนเดิม** (ไม่เปลี่ยน) — เพราะไม่มี Tax Invoice/Completed step ให้รอแบบ Direct Paid · **เปลี่ยนเฉพาะ Direct Paid** ตามข้อ 1 เท่านั้น

**Build order (ปลดล็อกแล้ว หลังตัดสินใจข้อ 1-2):**
1. ~~Decide ข้อ 1-2~~ ✅ เสร็จ 6 Jul 2026
2. ~~ตอบ open question (Petty Top-up ledger timing)~~ ✅ เสร็จ 6 Jul 2026 — คงเดิม
3. ~~แก้ bug slip/tax-invoice ไม่เก็บไฟล์จริง~~ ✅ เสร็จ 6 Jul 2026 — `frConfirmSave`/`frTaxInvSave` อ่านเป็น dataURL แล้ว
4. ~~ย้ายจุดสร้าง Expense ใน Direct Paid จาก `markTransferred`(paid) → `uploadReqTaxInv`(closed)~~ ✅ เสร็จ 6 Jul 2026
   — พร้อม `e.sourceRequestId`/`r.generatedExpenseId` (bidirectional link เริ่มต้น) · ทดสอบผ่าน preview แล้ว
5. ~~สร้าง shared Side Panel component + Workflow component~~ ✅ เสร็จ 6 Jul 2026 — ดู §17 (`js/fin-side-panel.js`)
6. ~~ย้าย Requests/Expenses ไปใช้ component ร่วม~~ ✅ เสร็จ 6 Jul 2026 — ทั้งคู่เป็น drawer เดียวกันแล้ว (link `sourceRequestId`/`generatedExpenseId` มี field แต่ยังไม่มีปุ่ม click-through ระหว่างหน้า)
7. ปรับคอลัมน์ตารางทั้งสองฝั่งตาม spec ใหม่ — **บางส่วน**: Expense "Request by" **ไม่ตัด** (Nock override, ดู §17) · Request table (ตัด Branch/เพิ่ม Description) — **ยังไม่ทำ** ต้อง confirm กับ Director/AreaMgr ก่อน

---

## 16. Document timeline — cumulative display + labeled gallery + log backfill (6 Jul 2026, follow-up to §15)

> Trigger: Nock เปิด Expense detail ("Air purifier x2" seed record) เจอ Document file section โชว์ไฟล์เดียว
> ทั้งที่ workflow จริงมีเอกสาร 3 จุดเวลา (Invoice ตอนสร้าง Request → Pay slip ตอน SA Confirm → Tax Invoice ตอน Close)
> — วิเคราะห์แล้วพบว่า record นั้นเป็น seed เก่าที่ไม่เคยผ่าน Request flow เลย (ถูกต้องแล้วที่มี 1 ไฟล์) แต่ประเด็นจริงคือ
> แม้ Expense ที่เพิ่ง generate จาก Request จริง (หลัง §15 ข้อ 4) จะมี `docs[]` ครบ 3 ไฟล์พร้อม `label` กำกับ (Invoice/
> Transfer slip/Tax invoice) UI ก็ยังไม่เอา label มาแสดง — เห็นเป็น photo grid ไม่มีชื่อ ต้องเปิดทีละไฟล์ถึงจะรู้ว่าอันไหนคืออะไร

**3 จุดที่แก้ (ตาม workflow วิเคราะห์ที่ Nock confirm ก่อน build):**
1. **Request panel (`js/fin-requests.js`)** — เดิม invoice block โชว์แค่ "Invoice" ตัวเดียวตลอดชีวิต request แม้สถานะ
   จะไปไกลกว่านั้นแล้ว (paid/closed มี pay slip/tax invoice เพิ่มมาแต่ไม่เคยโผล่ที่ panel นี้เลย) → เปลี่ยนเป็น
   `documentsBlock(r)` โชว์**สะสมตามสถานะจริง**: pending/approved → เห็นแค่ Invoice · paid → เพิ่ม Pay slip
   (preview จริง ไม่ใช่แค่ชื่อไฟล์ text ใน Activity Log เหมือนเดิม) · closed → เพิ่ม Tax invoice ครบ 3 ช่อง
   `docPreview()` = helper ทั่วไป (ใช้แทน `docPrevReq` เดิมที่รองรับแค่ invoice ตัวเดียว)
2. **Expense gallery (`js/fin-expenses.js` `docThumb`)** — โชว์ caption ใต้ thumbnail ตาม `d.label` ถ้ามี (เรียงตาม
   ลำดับที่เกิดจริงเพราะ `docs[]` insert ตามลำดับ workflow อยู่แล้ว: Invoice → Transfer slip → Tax invoice → ไฟล์
   manual ที่แนบทีหลังไม่มี label ต่อท้ายเหมือนเดิม ไม่กระทบของเก่า)
3. **Logs tab backfill (`FIN.uploadReqTaxInv` ใน data-finance.js)** — ปัญหา: Expense เพิ่งถูกสร้างตอน Close (ตาม §15
   ข้อ 4) ทำให้ `e.logs[]` มีแค่ event `created` วันเดียว ทั้งที่จริงมี 3 เหตุการณ์เกิดก่อนหน้านั้นแล้วคนละวันคนละคน
   → เขียนทับ `e.logs[]` ด้วยประวัติจริงตอนสร้าง Expense: `invoice_attached`(by `r.requestedBy`, at `r.date`, ถ้ามี
   invoice) → `payslip_attached`(by `r.transferredBy`, at `r.paidDate`, ถ้ามี slip) → `tax_invoice_attached`(by
   ผู้ upload, at วันนี้) → `ledger_created`(at วันนี้) · เพิ่ม field ใหม่ `r.transferredBy` (เซ็ตใน `markTransferred`)
   และ `r.taxInvBy` (เซ็ตใน `uploadReqTaxInv`, param `user` ใหม่) เพื่อรู้ว่าใครทำแต่ละ stage — เดิมไม่มี field พวกนี้เลย
   `uploadReqTaxInv` signature เปลี่ยนจาก `(reqId,name,dataUrl,type)` → `(reqId,user,name,dataUrl,type)`

**ทดสอบผ่าน preview แล้ว:** Confirm Transfer → Request panel โชว์ Pay slip เพิ่ม (Invoice ยังว่างถ้าไม่มี) → Upload
Tax Invoice → History tab โชว์ครบ 3 ช่อง, Expense gallery โชว์ caption "Transfer slip"/"Tax invoice" ใต้แต่ละไฟล์,
Logs tab โชว์ `Pay slip attached → Tax invoice attached → Ledger created` พร้อมวันที่จริง (ไม่มี `invoice_attached`
เพราะ request ทดสอบนี้ไม่มี invoice แนบมาแต่แรก — ถูกต้องตามดีไซน์ "ไม่โชว์สิ่งที่ไม่เกิดขึ้นจริง")

**Follow-up เดียวกัน (เจอทันทีตอน Nock ทดสอบซ้ำ):** 2 seed expenses เก่า ("Air purifier x2" Sukhumvit, "Projector
replacement (approved)" Silom) มี badge "Direct Paid" แต่ไม่เคยมี request จริงผูกอยู่เบื้องหลังเลย (hand-authored
ก่อน §15/§16) → ยังมีแค่เอกสารเดียว "receipt.pdf" ทั้งที่ badge บอกว่าผ่าน full lifecycle — **retrofit ทั้งคู่**ด้วย
`backfillDirectPaidSeed()` ใน data-finance.js: สร้าง `DB.expenseRequests` closed request ผูกจริง (`sourceRequestId`/
`generatedExpenseId`) + เขียน `e.docs[]`/`e.logs[]` ใหม่ให้ครบ 3 ไฟล์ + 4 log event พร้อมวันที่/ผู้ทำสมจริง (ไม่มี
dataUrl จริง แค่ชื่อไฟล์ — เข้ากับสไตล์ seed เดิมที่เป็น "paper receipt ไม่มีรูปจริง") ทดสอบผ่าน preview แล้ว เห็นครบ
ทั้ง Expense drawer (3 ไฟล์+label, Logs 4 event) และ Requests→History (req-008/req-009 ใหม่).

---

## 17. Shared Side Panel component + Workflow/Audit split (6 Jul 2026, later same day)

> Trigger: Nock เห็น Requests panel (persistent split, §12) แล้วถามว่า "ทำไมไม่เหมือน Expense page" — เข้าใจผิดทิศทาง
> ไปตอนแรก (นึกว่า addendum spec §15 บอกให้ Expense เปลี่ยนมาเป็นแบบ Requests) แต่ Nock ต้องการ**ทิศทางตรงข้าม**:
> ทั้งคู่ควรเป็น**ตาราง 100% width + คลิกแถว→Side modal/drawer** (แบบ Expense เดิม) ไม่ใช่ persistent split-panel —
> เป็นการ **override ADDENDUM spec ข้อ panel-pattern โดยตรง** (Nock ตัดสินใจสุดท้าย ตาม governance ใน §10)

**ตัดสินใจสำคัญ 2 ข้อระหว่างวิเคราะห์ (Nock confirm ก่อน build):**
1. **Layout ทิศทางที่ถูกต้อง = กลับด้านจาก spec เดิม** — Requests เปลี่ยนจาก master-detail (list 60%+panel sticky 38%,
   §12) → **ตาราง 100% + drawer overlay** (เหมือน Expense) แทน ไม่ใช่ Expense เปลี่ยนไปเป็นแบบ Requests
2. **คอลัมน์ "Request by" ของ Expense ledger — ไม่ตัดออก** (spec ใหม่เสนอให้ตัดเพราะ "leak ที่มา") Nock: ถ้ามาจาก
   request จริงก็ควรโชว์ชื่อผู้ยื่น ไม่ใช่ปิดบัง แค่ต้องแก้ logic — เดิมคอลัมน์นี้ (จาก §13) ใช้ `personCell(e.paidTo)`
   ผิดความหมาย (โชว์ "จ่ายให้ใคร" ไม่ใช่ "ใครขอ") → แก้เป็น `requestByCell(e)`: lookup `e.sourceRequestId →
   DB.expenseRequests.requestedBy` ถ้ามี, ไม่งั้นโชว์ "—" (log ธรรมดาไม่มี request เบื้องหลัง)

**Build (ทั้งหมดเสร็จ 6 Jul 2026):**
- **`js/fin-side-panel.js` (ใหม่) → `window.FinPanel`** — shared component ระหว่าง 2 หน้า: `drawer()`/`drawerHeader()`
  (slide-over shell เดียวกัน) · `topMeta()`/`sectionLabel()`/`card()`/`fieldRow()`/`copyBtn()` (ย้าย `frCopy` มาไว้ที่นี่
  แทนที่จะประกาศใน fin-requests.js) · `docTile()`/`docGallery()` (thumbnail grid มี label, ใช้ empty-state
  dashed tile ถ้าเอกสาร stage นั้นยังไม่มา) · `timeline()`/`auditItems()` (renderer เดียวใช้ทั้ง Workflow และ Audit —
  ดูข้อถัดไป) · โหลดใน index.html ก่อน `fin-overview.js` (ต้องมาก่อน fin-requests/fin-expenses)
- **`js/fin-requests.js` rewrite** — ตารางกลับไป 100% width (ตัด flex 60/38 wrapper ออก), คลิกแถว → `frOpen(id)`
  เปิด drawer แทน `rqSelect(id)` เดิมที่ mutate panel ในที่ · `↑`/`↓` เลื่อน drawer ไปแถวถัดไป (ไม่ใช่แค่ highlight
  แถวเฉยๆ แบบเดิม) · drawer sections ตาม spec ใหม่: **Overview**(topMeta+what) → **Information**(vendor/amount/
  payment/note/requester) → **Workflow**(`timelineSteps(r)` เดิม แต่ผ่าน `FinPanel.timeline()`) → **Files**
  (`fileItems(r)` cumulative ตาม status → `FinPanel.docGallery()`) → **Audit**(`auditLogsForRequest(r)` — event
  เดียวคือ "Request submitted" เพราะ Request ยังไม่มี free-edit feature ให้ log อย่างอื่น ไม่ fabricate ข้อมูล) →
  **Actions**(ปุ่ม state-driven เดิม, ย้ายมาอยู่ท้ายสุดตาม section order ของ spec)
- **`js/fin-expenses.js` rewrite** — เอา Info/Logs **tabs ออกทั้งหมด** เปลี่ยนเป็น scroll ต่อเนื่องเดียว (เหมือน
  Requests): **Overview**(topMeta+title) → **Information**(paid to/amount/payment) → **Files**(`FinPanel.docGallery`
  แทน `docThumb` เดิม) → **Audit**(`FinPanel.timeline`+`auditItems` แทน `renderFxLogs` เดิม) — ไม่มี Workflow section
  (Expense ไม่มี approval lifecycle ของตัวเอง) · `requestByCell(e)` แก้ตามข้อ 2 ด้านบน
- **Workflow vs Audit แยกจริงตาม addendum** — เดิม Requests มีแค่ Activity Log ผสม 2 หน้าที่ (progress + history)
  ตอนนี้แยกชัด: Workflow = fixed step (Requested→Approved→Transferred→Invoice Uploaded→Completed) done/current/
  upcoming/bad · Audit = flat history (`{action,by,at}[]`) — ใช้ renderer เดียวกัน (`FinPanel.timeline`) เพื่อไม่ให้
  โค้ดซ้ำ แต่ data คนละที่มา คนละความหมาย — **simplification เดียวจาก addendum เต็มรูปแบบ:** ปุ่ม action ไม่ได้ฝัง
  อยู่ใน step ปัจจุบันของ Workflow (ตามที่ addendum เสนอ) ยังคงเป็น section "Actions" แยกต่างหากท้ายสุด — ง่ายกว่า
  และ Nock ไม่ได้ทักท้วงจุดนี้ตอน confirm scope

**ทดสอบผ่าน preview ครบ:** Requests table 100% + คลิกแถว→drawer (Overview/Information/Workflow/Files/Audit/Actions
ครบ) · Approve flow ทำงานถูกต้อง (drawer re-render ในที่หลัง action) · Cancel inline mode ยังทำงาน · Expense drawer
section เดียวกัน (ไม่มี tab) โชว์ 3 ไฟล์+label+Audit 4 event ครบ (จาก §16) · ledger "Request by" โชว์ "Manager Mint"
สำหรับ record ที่มาจาก request จริง และ "—" สำหรับ Record Usage ธรรมดา — ตรงตามที่ Nock ต้องการ

**ยังไม่ทำ (ค้างจาก §15):** click-through link ระหว่าง Request↔Expense (field มีแล้ว แต่ยังไม่มีปุ่ม "View source
request" / "View generated expense" ใน 2 drawer) · ปรับคอลัมน์ Request table (ตัด Branch/เพิ่ม Description —
ต้อง confirm กับ Director/AreaMgr ก่อน เพราะดูหลายสาขาอาจอยากเห็น Branch)

> ⚠️ **Superseded ทันทีวันเดียวกันโดย §18** — layout 6-section (Overview/Information/Workflow/Files/Audit/Actions
> แยกกัน, ไม่มี tabs) ด้านบนคือ draft แรกที่ผมตีความจาก text spec เอง ก่อน Nock ส่ง mockup รูปจริงมาให้ดู §18 คือ
> เวอร์ชันที่ build จริงตอนนี้ (มี Info/Logs tabs กลับมา, Workflow+Files รวมเป็นช่องเดียว) — อย่าอ้างอิง layout
> ใน §17 นี้เป็นของจริงในโค้ด ให้ดู §18 แทน

---

## 18. Mockup-driven rebuild — Info/Logs tabs + merged "Workflow & File upload" (6 Jul 2026, later same day)

> Trigger: Nock ส่ง mockup 6 สถานะของ "Direct paid Request detail" panel มาให้ดู (Create Request → Approve →
> Upload Pay slip → Pay slip already upload → Upload Tax INV → Tax INV already upload & Complete) — ชัดเจนกว่า
> text spec เดิมมาก และต่างจาก §17 ที่เพิ่ง build ไปหลายจุด ต้อง rebuild ตาม mockup นี้เป็นของจริง

**สิ่งที่ mockup บอกต่างจาก §17 (draft แรก):**
1. **Info | Logs tabs กลับมา** — §17 เอา tabs ออกคิดว่า spec อยากได้ scroll เดียว ผิด — mockup ยืนยัน tabs:
   **Info** = เนื้อหาทำงาน, **Logs** = audit history (สิ่งที่ §17 เรียก "Audit" section ย้ายไปเป็น content ของ tab
   "Logs" แทน ไม่ใช่ section ในหน้าเดียวกับ Info)
2. **Workflow + Files รวมเป็นช่องเดียว "Workflow & File upload"** — ไม่แยก 2 section แต่ละ step (Requested →
   Approved → Transferred → Invoice Uploaded → Completed) มีปุ่ม/thumbnail อัปโหลดไฟล์ฝังอยู่ในแถวนั้นเลย —
   ตรงกับที่ ADDENDUM spec เดิมเคยเสนอไว้ ("current step มี inline action") ที่ §17 เลือกไม่ทำเพราะคิดว่าซับซ้อนเกิน
3. **ปุ่มล่างสุดปุ่มเดียว เปลี่ยนข้อความตามสถานะ**: Approve/Reject → Confirm upload → Confirm upload & Complete
   (ของเดิมมีอยู่แล้วในเชิง logic แค่ layout เปลี่ยน)
4. **ปุ่ม Confirm upload ต้อง disabled จนกว่าจะแนบไฟล์** (เทาไม่มีไฟล์ → ฟ้า/เขียวเมื่อแนบแล้ว) — ของเดิม (§17)
   ปล่อยให้กด confirm ได้แม้ไม่แนบไฟล์เลย (ทำ pay slip/tax invoice กลายเป็น optional ทั้งที่ไม่ควรเป็น) → แก้เป็น
   **บังคับแนบไฟล์เสมอ** สำหรับ 2 step นี้
5. **ตัด section header "Overview/Information" ออก** เหลือแค่ title → badges → meta → note ตรงๆ ไม่มีป้ายกำกับ
   ครอบ (ตัด `FinPanel.topMeta` ออกจากทั้ง 2 หน้า — ไม่ได้ลบ function เผื่อใช้ที่อื่นในอนาคต)
6. **ตัดแถว "Vendor" แยกออก** — Nock ยืนยัน: "ไม่มีการจ่ายเข้าบัญชีคนกลาง แต่เป็นการจ่ายตรงหา Vendor เท่านั้น"
   หมายความว่า Vendor **คือ** Payment account อยู่แล้ว ไม่ต้องมี 2 แถวซ้ำกัน — Payment method card เหลือ
   Amount/Payment(=`r.payTo||r.acctName`)/Account number/PromptPay

**Build:**
- **`js/fin-side-panel.js`** — `timeline()` เพิ่ม support `item.extra` (HTML ใดๆ วางชิดขวาในแถวเดียวกับ label/caption
  — ใช้สำหรับปุ่มอัปโหลด/thumbnail ที่ฝังใน Workflow step) · เพิ่ม `FinPanel.tabStrip(tabs, active, onClickFn)`
  ใช้ร่วมกันทั้ง 2 หน้าสำหรับ tab strip Info/Logs
- **`js/fin-requests.js` rebuild** — `drawerTab` state (info/logs) · `whatBlock(r)` = title+badges+meta+note
  ไม่มี section label ครอบ · `paymentSection(r)` ตัด Vendor row, รวม payTo เข้า "Payment" field · **`workflowFileSteps(r)`**
  = `timelineSteps(r)` เดิม + แนบ `extra` (upload control หรือ thumbnail) เข้า step "Transferred"/"Invoice Uploaded"
  ตามสถานะปัจจุบัน · `uploadControl(inputId)` = ปุ่มสี่เหลี่ยม dashed คลิกเลือกไฟล์ → `frFilePicked(inputId)` preview
  thumbnail สด + toggle ปุ่ม footer (`#fr-action-btn`) disabled/enabled · `frConfirmSave`/`frTaxInvSave` เปลี่ยนจาก
  "ไม่มีไฟล์ก็ยอมให้ผ่าน" เป็น **บังคับมีไฟล์เสมอ** (toast error ถ้าไม่มี — ปกติกดไม่ได้อยู่แล้วเพราะปุ่ม disabled
  แต่กันไว้เผื่อเรียกตรง) · Logs tab = `auditLogsForRequest(r)` เดิมจาก §17 (ยังไม่เปลี่ยน content แค่ย้ายที่อยู่)
- **`js/fin-expenses.js` rebuild** — Info/Logs tabs กลับมา (`fxDrawerTab`) · `whatBlock(e)` เหมือน Request (title→
  badges→meta ไม่มี topMeta) · Information + Files section ยังอยู่ใต้ tab Info (ไม่มี Workflow เพราะ Expense ไม่มี
  approval lifecycle) · Audit ย้ายไป tab Logs (`renderFxLogsTab`) แทนที่จะเป็น section ในหน้าเดียว

**ทดสอบผ่าน preview ครบทุก state ตรงกับ mockup:** pending(Reject/Approve) → approved-no-file(Confirm upload
disabled, upload icon dashed บน step Transferred) → approved-file-attached(thumbnail preview + ปุ่มฟ้า enabled)
→ paid(Confirm upload & Complete disabled, upload icon บน step Invoice Uploaded) → paid-file-attached(ปุ่มเขียว
enabled) → closed(ทุก step เขียวหมด thumbnail ทั้งคู่โชว์ ไม่มีปุ่ม action) · Logs tab แยกออกจาก Info ถูกต้อง ·
Expense drawer เปลี่ยนมาใช้ tabs เดียวกัน ทดสอบผ่านแล้วเช่นกัน (ไม่มี error, revert seed data กลับหลังทดสอบครบ)

---

## 19. Finance IA expansion — Dashboard rename + Settings module (7 Jul 2026)

> Trigger: Nock คุยกับ GPT เรื่อง Finance IA ที่ยังขาด สรุปว่าขาด 2 อย่าง — **Dashboard** (entry point ชัดเจน) และ
> **Settings** (Finance ไม่เคยมีหน้า config ของตัวเองเลย ทุกอย่าง hardcode อยู่ใน data-finance.js) · สั่งสถาปัตยกรรม
> ชัดเจน: **Finance Settings ต้องแยกจาก Academy Settings เด็ดขาด** — ไม่อ่าน `DB.branchSettings`/`DB.packages`/ฯลฯ
> ของ Academy เลย เป็นเจ้าของ config ตัวเองทั้งหมด — วางแผนผ่าน Plan Mode ก่อน build (ดู plan ที่ approve แล้ว)

**IA ใหม่:** Dashboard(rename จาก Overview) · Expenses · Requests · Reimbursement · Recurring · Reports · **Settings**(ใหม่)
— nav-finance เพิ่ม section "System" (mirror Academy's SYSTEM section) เก็บ Settings ไว้

**1. Dashboard rename (mechanical):** `js/fin-overview.js` → `js/fin-dashboard.js` · `view-fin-overview`→`view-fin-dashboard`
· `_refreshFinOverview`→`_refreshFinDashboard` · อัปเดต index.html (nav item/view div/script tag) + app.js
(`switchSystem`/`_refreshFinanceViews`) ทุกจุด — ไม่มี logic เปลี่ยน แค่ id/label/filename

**2. `js/data-finance-settings.js` (ใหม่)** — โหลดก่อน `data-finance.js` (ต้องมาก่อนเพราะ data-finance.js อ่านตารางนี้ตอน
seed) เป็นเจ้าของ config ทั้งหมด 8 กลุ่ม:
- `DB.financeGeneral` — currency/fiscalYearStartMonth/defaultBranch/defaultTaxBehavior (เก็บไว้ ยังไม่มีจุดอื่นในระบบ
  อ่านค่านี้ไปคำนวณอะไร — เป็น config เปล่าๆ รอ consumer ในอนาคต)
- `DB.financeCategories` — **ย้ายมาจาก** `CATEGORIES` const เดิมใน data-finance.js (เพิ่ม field `active`+`defaultSource`)
  data-finance.js อ่านตัวนี้แทนที่จะ hardcode เอง — `CAT_MAP` derive จากตารางนี้
- `DB.financeApprovalRules` — **ย้ายมาจาก** `tierFor()`'s hardcoded 1000/3000/5000 — seed ให้ behavior เดิมทุกประการ
  (verify แล้ว: `FIN.approvalTier(2999)==='manager'`, `(3000)==='area_manager'`, `(5000)==='director'` เหมือนเดิม)
- `DB.financePettyCash` — **ย้ายมาจาก** `PETTY_BUDGET=10000` flat constant → ตอนนี้ 1 แถวต่อสาขา (currentBalance/
  minBalance/defaultTopupAmount/autoReminderThreshold/responsibleStaff/defaultAccountId) `pettyBudget(branch)`
  เปลี่ยนจาก no-arg เป็น per-branch lookup (`= defaultTopupAmount` ของสาขานั้น) — แก้ call site เดียวใน
  fin-dashboard.js ที่เคยคำนวณ budget ครั้งเดียวนอก loop ให้ย้ายเข้าไปใน `.map(b=>...)` แทน
- `DB.financeBankAccounts` — **ใหม่ทั้งหมด** ไม่ทับ `DB.financeAccounts` เดิม (คนละ concept — financeAccounts คือ
  internal ledger-bucket-key list `central`/`petty-{branch}` ที่ `FIN.balance()`/`ledger()` ใช้ ไม่ใช่บัญชีจริง)
  ไดเรกทอรีบัญชีธนาคารจริงของบริษัท ใช้เป็น **quick-fill picker** ตอนสร้าง Direct Paid request (`rqFillBankAccount`,
  เติมช่อง acctName/acctNumber/promptPay ที่มีอยู่แล้ว ไม่ล็อกฟิลด์ ยังแก้ไขเองได้)
- `DB.financePaymentMethods` — สร้าง CRUD settings แล้ว (Central Transfer/Petty Cash/Cash/Corporate Card/PromptPay)
  **แต่ยังไม่ wire เข้า Requests' `rq-pay` dropdown** — field `r.payMethod` เดิม ('central'/'transfer') ผูกกับ
  business logic ใน `markTransferred` (note text "(โอนเข้าสาขา)"/"(Central จ่ายตรง)") อยู่แล้ว เปลี่ยนตอนนี้เสี่ยง
  พังของเดิม — ตั้งใจปล่อยให้เป็นแค่ config ที่ยังไม่มี consumer ไปก่อน (บอกตรงๆ ไม่ silently skip)
- `DB.financeNumbering` — เลขที่เอกสารแบบ `PREFIX-YEAR-PADDEDSEQ` (ตาม pattern เดิมของ `INV-2026-0050` ใน
  billing.js) ต่อ 4 doc type (request/expense/reimbursement/recurring) `FIN.nextDocNumber(docType)` เพิ่มใหม่
  (เพิ่ม field `.number` แยกจาก `.id` เดิม — ของเก่า `req-001`/`exp-001` ไม่โดนเปลี่ยน มีแค่ record ใหม่ที่ได้ `.number`)
  wire เข้าแล้วที่: Request create (`rqSave`/`ftSave`), `addExpense`, `addReimbursement`, Recurring create
  (`fin-recurring.js` ทั้ง 2 จุด) — Request drawer โชว์ `.number` เป็นบรรทัดแรกเหนือ title แล้ว
- `DB.financePermissions` — role×capability grid (Director/AreaMgr/Manager/Admin/Teacher × 5 capability) —
  **⚠️ preview/edit เท่านั้น ยังไม่ต่อเข้า authorization จริง** (`FIN.canApprove`/`canApproveReq`/`canTransfer`/
  `isReimApprover` ยังรันด้วย `ROLE_RANK`/`effRank()` เดิมทั้งหมด) — Nock ยืนยันแล้วว่ารอบนี้ทำแค่ UI+data model
  พอ เพราะ authorization logic เพิ่งถูก build+test ในเซสชันนี้เอง (approve/reject/transfer flow) เสี่ยงพังถ้าต่อสาย
  จริงโดยไม่มี testing pass แยกต่างหาก — **Phase 2 เป็น session ในอนาคต**

**3. Settings UI (4 ไฟล์ใหม่, mirror pattern จาก `settings.js`/`settings-catalog.js`):**
- `js/fin-settings.js` — shell (left-nav `.st-nav-item` + `#fin-st-panel`, router `finStShowSection`) + General/
  Categories/Payment Methods/Numbering
- `js/fin-settings-approval.js` — Approval Rules (gate list, editable ทุกช่อง + Add Gate)
- `js/fin-settings-accounts.js` — Petty Cash (ตารางแถวต่อสาขา ไม่มี scope-switcher แบบ Academy) + Bank Accounts
  (list เต็ม พร้อม default-account radio + used-for badges)
- `js/fin-settings-permissions.js` — Permissions grid พร้อม banner เตือนชัดเจนว่า preview only

CRUD pattern (add/remove/toggle) ทุกจุด copy มาจาก `settings-catalog.js`'s `stAddSubject`/`stConfirmAddSubject`/
`stRemoveSubject` (Modal.create สำหรับ add, direct array mutation, re-render ผ่าน section router)

**ทดสอบผ่าน preview ครบ:** nav ใหม่โชว์ Dashboard/Expenses/Requests/Reimbursement/Recurring/Reports/Settings ·
ทั้ง 8 section ของ Settings render + CRUD ทำงาน (เพิ่ม/ลบ/toggle) · regression: `tierFor` boundary values ตรงเป๊ะ
กับก่อน refactor · สร้าง Direct Paid request ใหม่ได้ `REQ-2026-00001` ถูกต้อง (ของเก่ายัง `req-XXX` เหมือนเดิม) ·
Bank Account quick-fill เติมช่องถูกต้อง · Teacher nav gate ยังซ่อน Settings ให้ Teacher เหมือนเมนูอื่นถูกต้อง

**ยังไม่ทำ (บอกตรงๆ ไม่ silently skip):**
- Permissions → ยังไม่ wire เข้า authorization จริง (Phase 2)
- Payment Methods → ยังไม่มี consumer ใช้จริง (Requests ยัง hardcode 'central'/'transfer' เหมือนเดิม)
- `defaultTaxBehavior`/`fiscalYearStartMonth` → เก็บ config ไว้ ยังไม่มีจุดคำนวณไหนอ่านค่านี้

---

*Base locked: 29 Jun 2026 · consolidated 2 Jul 2026 · governance + spec-conformance backlog 2 Jul 2026 · กลุ่ม A built 3 Jul 2026 · UX Constitution workflow split 3 Jul 2026 · master-detail + batch entry 3 Jul 2026 · Expense slide-over + multi-doc + Logs 3 Jul 2026 · Record Usage inline editor 3 Jul 2026 · Architecture refactor proposal pending 3 Jul 2026 · §15 decisions 1-2 confirmed by Nock + ledger-timing move built 6 Jul 2026 · §16 document timeline + log backfill built 6 Jul 2026 · §17 shared Side Panel (superseded) 6 Jul 2026 · §18 mockup-driven rebuild (Info/Logs tabs + merged Workflow&Files) built 6 Jul 2026 · §19 IA expansion (Dashboard rename + Settings module) built 7 Jul 2026*
