/* ============================================================
   app.js — NockERP Core: Navigation + Modal + Shared Utils
   ============================================================ */

/* ── VIEW TITLES ──────────────────────────────────────────── */
const VIEW_TITLES = {
  dashboard:'Dashboard', crm:'CRM', inbox:'Inbox', calendar:'Calendar',
  students:'Students', families:'Families', staff:'Staff',
  courses:'Courses', classes:'Classes', sessions:'Sessions',
  attendance:'Attendance', summaries:'Summaries',
  billing:'Billing', notifications:'Notifications', tasks:'Tasks',
  reports:'Reports', settings:'Settings', logs:'Logs & Timeline'
};

/* ── CURRENT USER ─────────────────────────────────────────── */
window.CURRENT_USER = {
  name:    'Admin Nock',
  initials:'N',
  email:   'nock@nockacademy.com',
  role:    'director',
  branch:  'Sukhumvit',
};

const ROLE_META = {
  director:     { label:'Director',    color:'var(--md-primary)',      bg:'var(--md-primary-container)',   border:'var(--md-primary)'   },
  area_manager: { label:'Area Mgr',    color:'var(--md-secondary)',    bg:'var(--md-secondary-container)', border:'var(--md-secondary)' },
  manager:      { label:'Manager',     color:'var(--md-success)',      bg:'var(--md-success-container)',   border:'var(--md-success)'   },
  admin:        { label:'Admin',       color:'var(--md-warning)',      bg:'var(--md-warning-container)',   border:'var(--md-warning)'   },
  teacher:      { label:'Teacher',     color:'var(--clr-on-grammar)',  bg:'var(--clr-grammar)',            border:'var(--clr-on-grammar)'},
};

function updateUserCard() {
  const u = window.CURRENT_USER;
  const rm = ROLE_META[u.role] || ROLE_META.admin;
  const av = document.getElementById('user-av');
  const nameEl = document.getElementById('user-name');
  const roleEl = document.getElementById('user-role-badge');
  const branchEl = document.getElementById('user-branch-text');
  if (av) { av.textContent = u.initials; av.style.background = rm.color; }
  if (nameEl) nameEl.textContent = u.name;
  if (roleEl) {
    roleEl.textContent = rm.label;
    roleEl.style.color = rm.color;
    roleEl.style.background = rm.bg;
    roleEl.style.borderColor = rm.border;
  }
  if (branchEl) branchEl.textContent = u.branch;
  // App-rail user avatar (user card moved to the rail)
  const railAv = document.getElementById('rail-av');
  const railRole = document.getElementById('rail-user-role');
  if (railAv) { railAv.textContent = u.initials || (u.name||'?').charAt(0); railAv.style.background = rm.color; }
  if (railRole) railRole.textContent = rm.label;
}

/* ── NAVIGATION ───────────────────────────────────────────── */
function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  const target = document.getElementById('view-' + id);
  if (target) target.classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.querySelector(`.nav-item[data-view="${id}"]`);
  if (navEl) navEl.classList.add('active');
  // highlight noti bar when viewing notifications
  document.querySelector('.sidebar-noti')?.classList.toggle('viewing', id === 'notifications');
  document.getElementById('content').scrollTop = 0;
}

// Wire sidebar nav items
document.querySelectorAll('.nav-item[data-view]').forEach(el => {
  el.addEventListener('click', () => showView(el.dataset.view));
});

/* ── SYSTEM SWITCHER (app rail: Academy / Finance / HR) ───── */
function switchSystem(sys) {
  document.querySelectorAll('.rail-item').forEach(r =>
    r.classList.toggle('active', r.dataset.sys === sys));
  const acad = document.getElementById('nav-academy');
  const fin  = document.getElementById('nav-finance');
  if (acad) acad.hidden = sys !== 'academy';
  if (fin)  fin.hidden  = sys !== 'finance';
  const sub = document.querySelector('.sidebar-logo .sub');
  if (sub) sub.textContent = sys === 'finance' ? 'Finance & Expense' : 'Education Operations';
  if (sys === 'finance') {
    applyFinanceNavGate();
    showView(financeLimited() ? 'fin-reimburse' : 'fin-dashboard');
  } else {
    showView('dashboard');
  }
}
window.switchSystem = switchSystem;

// Teacher (and other non-finance roles) only get Reimbursement in the Finance system.
function financeLimited() { return window.CURRENT_USER.role === 'teacher'; }
function applyFinanceNavGate() {
  const limited = financeLimited();
  document.querySelectorAll('#nav-finance .nav-item').forEach(it => {
    it.style.display = (limited && it.dataset.view !== 'fin-reimburse') ? 'none' : '';
  });
  document.querySelectorAll('#nav-finance .nav-label').forEach(l => { l.style.display = limited ? 'none' : ''; });
}
window.applyFinanceNavGate = applyFinanceNavGate;

// Re-render all Finance views (called when role/branch context changes)
window._refreshFinanceViews = function () {
  ['_refreshFinDashboard', '_refreshFinance', '_refreshFinRequests', '_refreshFinReimburse', '_refreshFinRecurring', '_refreshFinReports', '_refreshFinSettings']
    .forEach(fn => { try { if (window[fn]) window[fn](); } catch (e) {} });
  if (window.FIN) FIN.refreshBadges();
  // re-apply Teacher gating; if finance is active and now limited, snap to Reimbursement
  const finNav = document.getElementById('nav-finance');
  if (finNav) {
    applyFinanceNavGate();
    if (!finNav.hidden && financeLimited()) {
      const active = document.querySelector('.view.active');
      if (!active || active.id !== 'view-fin-reimburse') showView('fin-reimburse');
    }
  }
};

/* ── MODAL MANAGER ────────────────────────────────────────── */
const Modal = {
  open(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
  },
  close(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
  },
  closeAll() {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  },
  // Inject a modal into #modals container and open it
  create(id, title, bodyHTML, footerHTML = '', size = '') {
    // remove existing if any
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = 'modal-overlay';
    el.id = id;
    el.innerHTML = `
      <div class="modal ${size}">
        <div class="modal-header">
          <div class="modal-title">${title}</div>
          <span class="modal-close" onclick="Modal.close('${id}')">✕</span>
        </div>
        <div class="modal-body">${bodyHTML}</div>
        ${footerHTML ? `<div class="modal-footer">${footerHTML}</div>` : ''}
      </div>`;
    el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
    document.getElementById('modals').appendChild(el);
    requestAnimationFrame(() => el.classList.add('open'));
  }
};

// Close modal when clicking overlay background (for static modals)
document.getElementById('modals').addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

/* ── FILTER CHIPS ─────────────────────────────────────────── */
function initFilterChips(container, onFilter) {
  container.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      if (chip.textContent.trim() === 'All') {
        container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      } else {
        container.querySelector('.filter-chip')?.classList.remove('active');
        chip.classList.toggle('active');
      }
      if (onFilter) onFilter();
    });
  });
}

/* ── TASK CHECK TOGGLE ────────────────────────────────────── */
function toggleTask(checkEl) {
  const isDone = checkEl.classList.toggle('done');
  checkEl.textContent = isDone ? '✓' : '';
  const textEl = checkEl.closest('.task-item')?.querySelector('.task-text');
  if (textEl) textEl.classList.toggle('done', isDone);
}

/* ── ATTENDANCE BUTTONS ───────────────────────────────────── */
function selectAtt(btn, type) {
  btn.closest('.att-btns').querySelectorAll('.att-btn').forEach(b => b.classList.remove('sel'));
  btn.classList.add('sel');
}

/* ── NAVIGATE TO INBOX FOR A CONTACT ─────────────────────── */
function openInboxFor(name) {
  showView('inbox');
  // inbox.js listens for this event to highlight the right conversation
  document.dispatchEvent(new CustomEvent('inbox:open', { detail: { name } }));
}

/* ── GLOBAL SEARCH ────────────────────────────────────────── */
document.getElementById('global-search').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.value.trim()) {
    showToast(`Searching "${e.target.value.trim()}"…`, 'info');
  }
});

/* ── SWITCH MODAL ─────────────────────────────────────────── */
window.openSwitchModal = function () {
  const u = window.CURRENT_USER;
  const branches = CONST.BRANCHES || ['Sukhumvit', 'Silom'];

  const branchBtns = branches.map(b => `
    <button class="switch-opt-btn ${u.branch===b?'active':''}"
      onclick="switchBranch('${b}',this)">${b}</button>`).join('');

  const roleBtns = Object.entries(ROLE_META).map(([key, rm]) => `
    <button class="switch-opt-btn ${u.role===key?'active':''}"
      style="${u.role===key?`background:${rm.bg};color:${rm.color};border-color:${rm.border}`:''}"
      onclick="switchRole('${key}',this,'${rm.color}','${rm.bg}','${rm.border}')">${rm.label}</button>`
  ).join('');

  Modal.create('modal-switch', `${UI.icon('manage_accounts')} Account & Preferences`, `
    <!-- Profile -->
    <div style="display:flex;align-items:center;gap:12px;background:var(--md-surface-low);
                border:1px solid var(--md-outline-variant);border-radius:10px;padding:12px 14px;margin-bottom:4px">
      <div style="width:40px;height:40px;border-radius:50%;background:${ROLE_META[u.role]?.color||'var(--md-primary)'};
                  color:var(--md-on-primary);font-size:16px;font-weight:700;display:flex;align-items:center;
                  justify-content:center;flex-shrink:0" id="switch-av">${u.initials}</div>
      <div>
        <div style="font-size:14px;font-weight:600;color:var(--md-on-surface)">${u.name}</div>
        <div style="font-size:12px;color:var(--md-on-surface-variant);margin-top:1px">${u.email}</div>
      </div>
    </div>

    <div class="modal-section">
      <!-- Branch -->
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:600;color:var(--md-on-surface-variant);text-transform:uppercase;
                    letter-spacing:.6px;margin-bottom:8px">${UI.icon('corporate_fare','sm')} Branch</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${branchBtns}</div>
      </div>
      <!-- Role -->
      <div>
        <div style="font-size:11px;font-weight:600;color:var(--md-on-surface-variant);text-transform:uppercase;
                    letter-spacing:.6px;margin-bottom:8px">${UI.icon('manage_accounts','sm')} View as Role</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${roleBtns}</div>
        <div style="font-size:11px;color:var(--md-on-surface-variant);margin-top:8px;padding:8px 10px;
                    background:var(--md-surface-low);border-radius:7px;border:1px solid var(--md-outline-variant)">
          ${UI.icon('info','sm')} Switching role shows what that role can see (UI preview only)
        </div>
      </div>
    </div>`,

    `<button class="btn btn-secondary" onclick="Modal.close('modal-switch')">Close</button>
     <button class="btn btn-danger" style="margin-left:auto" onclick="logout()">${UI.icon('logout','sm')} Log Out</button>`,
    'modal-sm');
};

window.switchBranch = function (branch, btn) {
  window.CURRENT_USER.branch = branch;
  btn.closest('.modal-body').querySelectorAll('.switch-opt-btn').forEach((b, i, arr) => {
    // only reset branch buttons (first group)
    if (b.closest('[style*="flex-wrap"]') === btn.closest('[style*="flex-wrap"]')) b.classList.remove('active');
  });
  btn.classList.add('active');
  updateUserCard();
  if (window._refreshFinanceViews) window._refreshFinanceViews();
  showToast(`Branch: ${branch} ✓`, 'success');
};

window.switchRole = function (role, btn, color, bg, border) {
  window.CURRENT_USER.role = role;
  const group = btn.closest('div[style*="flex-wrap"]');
  group?.querySelectorAll('.switch-opt-btn').forEach(b => {
    b.classList.remove('active');
    b.style.background = ''; b.style.color = ''; b.style.borderColor = '';
  });
  btn.classList.add('active');
  btn.style.background = bg; btn.style.color = color; btn.style.borderColor = border;
  // update switch-av color
  const av = document.getElementById('switch-av');
  if (av) av.style.background = color;
  updateUserCard();
  if (window._refreshFinanceViews) window._refreshFinanceViews();
  showToast(`Viewing as ${ROLE_META[role]?.label} ✓`, 'success');
};

window.logout = function () {
  Modal.closeAll();
  if (window.Auth) return Auth.logout();      // เคลียร์ session → กลับไปหน้า login
  window.location.href = 'signin.html';
};

/* ── INIT USER CARD ───────────────────────────────────────── */
(function () {
  // Restore user from signin.html session
  try {
    const stored = sessionStorage.getItem('erp_user');
    if (stored) {
      const u = JSON.parse(stored);
      if (u.name) Object.assign(window.CURRENT_USER, u);
    }
  } catch (e) {}
  updateUserCard();
})();

/* ── TOAST NOTIFICATION ───────────────────────────────────── */
function showToast(message, type = 'info') {
  const colors = { info: 'var(--md-primary)', success: 'var(--md-success)', warning: 'var(--md-warning)', error: 'var(--md-error)' };
  const t = document.createElement('div');
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${colors[type]};color:#fff;
    padding:10px 18px;border-radius:10px;font-size:13px;font-weight:500;z-index:9999;
    box-shadow:0 4px 20px rgba(0,0,0,.2);transition:opacity .3s`;
  t.textContent = message;
  document.body.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 300); }, 2500);
}

/* ── SHARED DATE / CURRENCY HELPERS ──────────────────────── */
function formatDate(d) {
  return new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }).format(d);
}
function formatCurrency(amount) {
  return '฿' + Number(amount).toLocaleString('th-TH');
}

/* ── UTILS — Business Logic (requires data.js loaded first) ─ */
window.Utils = {
  /* ── Lookups ── */
  student:      id   => DB.students.find(s => s.id === id),
  studentByName:name => DB.students.find(s => s.name === name),
  family:       id   => DB.families.find(f => f.id === id),
  familyByName: name => DB.families.find(f => f.name === name),
  staffById:    id   => DB.staff.find(s => s.id === id),
  lead:         id   => DB.leads.find(l => l.id === id),
  session:      id   => DB.sessions.find(s => s.id === id),

  /* ── Invoice line items ──
     รองรับ invoice แบบ multi-line (lines[]) + fallback ใบเก่า (course string เดียว)
     line = {desc, amount, hours?} · discount = {label, amount} | null */
  invoiceLines: inv => (inv.lines && inv.lines.length)
    ? inv.lines
    : [{ desc: inv.course, amount: inv.amount, hours: inv.hours }],
  invoiceSubtotal: inv => Utils.invoiceLines(inv).reduce((s,l) => s + (l.amount||0), 0),
  invoiceHours:    inv => Utils.invoiceLines(inv).reduce((s,l) => s + (l.hours||0), 0),

  /* ── Student helpers ── */
  classesLeft(studentId) {
    const s = DB.students.find(x => x.id === studentId);
    return s ? Math.min(...s.courses.map(c => c.left)) : 0;
  },
  totalClassesLeft(studentId) {
    const s = DB.students.find(x => x.id === studentId);
    return s ? s.courses.reduce((a, c) => a + c.left, 0) : 0;
  },
  renewalStatus(studentId) {
    const s = DB.students.find(x => x.id === studentId);
    if (!s) return 'active';
    // Manual overrides (pause/archived) take priority
    if (s.status === 'pause' || s.status === 'archived') return s.status;
    const left = Math.min(...s.courses.map(c => c.left));
    if (left === 0) return 'pause';    // auto-pause: sessions หมดแล้ว
    if (left <= 2)  return 'renewal';  // 1 left = red visual, 2 left = yellow visual
    return 'active';
  },
  // Get meta for student (used in Calendar class modal roster)
  studentMeta(name) {
    const s = DB.students.find(x => x.name === name);
    if (!s) return { family: '—', left: '?', cls: 'badge-gray', grade: '' };
    const left = Math.min(...s.courses.map(c => c.left));
    const cls  = left === 0 ? 'badge-gray'    // pause / sessions หมด
               : left <= 1 ? 'badge-red'      // renewal urgent (1 เหลือ)
               : left <= 2 ? 'badge-yellow'   // renewal warning (2 เหลือ)
               : 'badge-green';               // active
    const fam = DB.families.find(f => f.id === s.familyId);
    return { family: fam?.name || '—', left, cls, grade: s.grade||'' };
  },

  /* ── Session helpers ── */
  sessionsFor:   name => DB.sessions.filter(s => s.studentNames.includes(name)),

  /* Summaries ของนักเรียน — derived view (ไม่เก็บซ้ำที่ student · ดึงสดจากต้นทาง)
     session summary = source ที่ session.summaries[name] · course-end = DB.courseEndSummaries */
  summariesForStudent(name) {
    const stu = DB.students.find(s => s.name === name);
    const session = DB.sessions
      .filter(s => (s.summaries || {})[name])
      .map(s => {
        const sum = s.summaries[name];
        return { sessionId:s.id, date:s.date, subject:Utils.subjectLabel(s), teacher:s.teacher,
          text:sum.text || '', sent:!!sum.sent, submitted:!!sum.submitted, state:s.state };
      })
      .sort((a,b) => b.date.localeCompare(a.date));
    const courseEnd = (DB.courseEndSummaries || [])
      .filter(c => stu && c.studentId === stu.id)
      .sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));
    return { session, courseEnd };
  },
  upcomingFor:   name => DB.sessions.filter(s => s.state === 'upcoming' && s.studentNames.includes(name)),
  shouldDeduct:  att  => CONST.ATTENDANCE_META[att]?.deduct ?? true,

  /* ── Settings-driven catalogs ──────────────────────────────
     Single source: DB.subjects / DB.packages / DB.branchSettings
     ใช้พวกนี้แทน CONST.SUBJECTS / CONST.ROOMS / DB.branchPricing
     เพื่อให้การแก้ใน Settings มีผลทั่วระบบทันที                */
  branchSettingsFor: branch => (DB.branchSettings || []).find(b => b.branch === branch),

  // Subject names — active in branch (no branch → all active in pool)
  subjectsFor(branch) {
    if (!branch) return (DB.subjects || []).filter(s => s.active).map(s => s.name);
    const bs = this.branchSettingsFor(branch);
    if (!bs) return this.subjectsFor();
    return (bs.subjects || []).filter(x => x.active)
      .map(x => (DB.subjects || []).find(s => s.id === x.subjectId))
      .filter(s => s && s.active).map(s => s.name);
  },

  // Packages enabled for branch, with per-branch price override applied
  packagesFor(branch) {
    const pool = (DB.packages || []).filter(p => p.active);
    const bs   = this.branchSettingsFor(branch);
    if (!bs) return pool;
    return (bs.packages || []).filter(x => x.active)
      .map(x => {
        const p = pool.find(pp => pp.id === x.packageId);
        return p ? Object.assign({}, p, { price: x.price ?? p.price }) : null;
      }).filter(Boolean);
  },
  pkgPrice(branch, hours) {
    const p = this.packagesFor(branch).find(p => p.hours === hours);
    return p ? p.price : ((DB.branchPricing[branch] || {})['h' + hours] || 0);
  },

  /* ── Price lookup — 3 ชั้น (เฉพาะเจาะจง → กว้าง) ──────────
     1. course.prices       = override เฉพาะ course (ตั้งตอนสร้าง/แก้ course)
     2. bs.priceMatrix      = Settings → Price Matrix (Subject|Grade|Hours ต่อสาขา)
     3. pkgPrice            = ราคา default ของ tier (global + branch override) */
  coursePrice({ courseId, subject, grade, hours, branch }) {
    let crs = courseId ? (DB.courses || []).find(c => c.id === courseId) : null;
    if (!crs && subject) crs = (DB.courses || []).find(c =>
      c.subjects?.some(s => s.subject === subject && (!grade || s.grade === grade)));
    /* 1. per-course override */
    const pr = crs?.prices?.find(p => p.hours === hours);
    if (pr) return (pr.overrides || {})[branch] ?? pr.price;
    /* 2. branch price matrix (Settings) */
    const subj = subject || crs?.subjects?.[0]?.subject;
    const gr   = grade   || crs?.subjects?.[0]?.grade;
    const v    = this.branchSettingsFor(branch)?.priceMatrix?.[`${subj}|${gr}|${hours}`];
    if (v != null) return v;
    /* 3. tier default */
    return this.pkgPrice(branch, hours);
  },

  /* ── Promotion engine ──
     คิดส่วนลดจากยอดชั่วโมงรวมของธุรกรรม (lines[]) ตาม branch promotions
     aggregate:true → รวม hours ข้าม line ได้ · false → ต้องมี line เดียวถึงเกณฑ์
     เลือกเกณฑ์ "สูงสุดที่ถึง" (ดีกับลูกค้า) · คืน {discount:{label,amount}|null, subtotal, total}
     Utils.applyPromotion({ lines, branch })  หรือ  ({ lines, branch, promos }) */
  applyPromotion({ lines, branch, promos, date }) {
    lines = lines || [];
    const subtotal   = lines.reduce((s, l) => s + (l.amount || 0), 0);
    const totalHours = lines.reduce((s, l) => s + (l.hours  || 0), 0);
    const maxLineHrs = lines.reduce((m, l) => Math.max(m, l.hours || 0), 0);
    const all = (promos || this.branchSettingsFor(branch)?.promotions || [])
      .filter(p => p.active !== false);

    /* อยู่ในช่วง Duration Period ไหม (เว้นว่าง = ใช้ตลอด) */
    const today = date || new Date().toISOString().slice(0, 10);
    const inRange = p => (!p.start || p.start <= today) && (!p.end || p.end >= today);

    const cands = [];

    /* (1) โปรผูก Package (Settings ▸ Promotion) — ตรงกับ line ที่ซื้อ package นั้น */
    all.filter(p => p.kind && inRange(p)).forEach(p => {
      const hit = lines.filter(l => l.packageId && l.packageId === p.packageId);
      if (!hit.length) return;
      const base = hit.reduce((s, l) => s + (l.amount || 0), 0);
      if (p.kind === 'pct'    && p.pct)    cands.push({ amount: Math.round(base * p.pct / 100), label: `${p.name} −${p.pct}%`, id: p.id });
      if (p.kind === 'amount' && p.amount) cands.push({ amount: Math.min(p.amount, base),        label: `${p.name} −${this.currency(p.amount)}`, id: p.id });
    });

    /* (2) โปรแบบเดิม — คิดจากยอดชั่วโมงรวม */
    all.filter(p => p.type === 'discount_pct' && !p.kind)
      .filter(p => (p.aggregate ? totalHours : maxLineHrs) >= p.thresholdHours)
      .forEach(p => cands.push({
        amount: Math.round(subtotal * p.pct / 100),
        label: `Promotion −${p.pct}% (${p.thresholdHours}h+)`, id: p.id,
      }));

    if (!cands.length) return { discount: null, subtotal, total: subtotal };

    /* ส่วนลดมากสุดชนะ (ดีกับลูกค้า) — ไม่ stack กัน */
    const best = cands.sort((a, b) => b.amount - a.amount)[0];
    return {
      discount: { label: best.label, amount: best.amount, promoId: best.id },
      subtotal,
      total: subtotal - best.amount,
    };
  },

  /* ── Fee ต่อสาขา (Settings ▸ Invoice) ──
     คืน fee ที่เปิดใช้ พร้อมราคา — Billing เอาไปทำ line บนบิล
     Utils.branchFees('Sukhumvit') → {traveling:{on,pickup:{on,cost},sentBack:{..}}, entry:{on,cost}, endTest:{on,cost}} */
  branchFees(branch) {
    const b = (window.DB?.invoiceSettings?.branches || {})[branch || CONST.BRANCHES[0]] || {};
    const f = b.fees || {};
    return {
      traveling: f.traveling || { on:false, pickup:{on:false,cost:0}, sentBack:{on:false,cost:0} },
      entry:     f.entry     || { on:false, cost:0 },
      endTest:   f.endTest   || { on:false, cost:0 },
    };
  },
  /* เคยเก็บค่าแรกเข้าไปแล้วหรือยัง (Entry fee = /Lifetime · ครั้งเดียวต่อนักเรียน) */
  entryFeeCharged(studentId) {
    return (window.DB?.invoices || []).some(inv =>
      inv.studentId === studentId && (inv.lines || []).some(l => l.feeKind === 'entry'));
  },

  // Room names for branch (Settings → Branch Info)
  /* room เก็บได้ทั้ง string (เดิม) และ {name,active} (Settings ▸ Branch Info)
     คืนเฉพาะห้องที่เปิดใช้ — ห้องที่ปิดจะไม่โผล่ใน Calendar/Classes picker */
  roomsFor(branch) {
    const bs = this.branchSettingsFor(branch);
    if (!bs || !Array.isArray(bs.rooms) || !bs.rooms.length) return CONST.ROOMS;
    const names = bs.rooms
      .map(r => (typeof r === 'string' ? { name:r, active:true } : r))
      .filter(r => r && r.active !== false && r.name)
      .map(r => r.name);
    return names.length ? names : CONST.ROOMS;
  },

  // Operating days for branch e.g. ['Tue','Wed','Thu','Fri','Sat']
  openDays(branch) {
    const bs = this.branchSettingsFor(branch);
    if (!bs) return CONST.DAYS_SHORT;
    return (bs.regularHours || []).filter(d => d.open).map(d => d.label);
  },

  /* ── Enrollment helpers (DB.enrollments = source of truth) ── */
  enrollmentsFor: studentId => (DB.enrollments || []).filter(e => e.studentId === studentId),
  leaveQuota:     enr => Math.floor((enr.packageHours || 0) / 8),   // hours ÷ 8

  /* ── Format helpers ── */
  currency: amt => '฿' + Number(amt).toLocaleString('th-TH'),
  daysLabel: d  => d === 0 ? 'Today' : d === 1 ? '1 day ago' : `${d} days ago`,

  /* ── Badge HTML helpers ── */
  // sessionsLeft optional: ถ้า renewal + 1 เหลือ → badge แดง (urgent visual)
  statusBadge(status, sessionsLeft = null) {
    if (status === 'renewal' && sessionsLeft !== null && sessionsLeft <= 1) {
      return `<span class="badge badge-red">Renewal · Urgent!</span>`;
    }
    const m = CONST.STUDENT_STATUS[status] || CONST.STUDENT_STATUS.active;
    return `<span class="badge ${m.cls}">${m.label}</span>`;
  },
  attBadge(status) {
    const m = CONST.ATTENDANCE_META[status] || { cls:'badge-gray', label: status };
    return `<span class="badge ${m.cls}">${m.label}</span>`;
  },
  leadStageBadge(stage) {
    const m = CONST.LEAD_STAGES[stage] || {};
    return `<span class="badge" style="background:${m.bg};color:${m.color}">${m.label}</span>`;
  },

  /* ── Subject + Grade label ──
     Input: session object, or (subject, grade) strings
     Output: 'Math ป.5', 'Eng Active ป.4', 'Science ป.5' etc. */
  subjectLabel(sessionOrSubject, grade) {
    if (typeof sessionOrSubject === 'object') {
      const g = sessionOrSubject.grade || '';
      return g ? `${sessionOrSubject.subject} ${g}` : sessionOrSubject.subject;
    }
    return grade ? `${sessionOrSubject} ${grade}` : sessionOrSubject;
  },

  /* ── Table UI: chip list with overflow count ──────────────
     chips: [{label, cls, style?}] or string[]
     max:   how many chips to show before "+N" */
  chipList(chips, max) {
    max = max || 2;
    if (!chips || !chips.length) return '<span class="text-muted">—</span>';
    const vis  = chips.slice(0, max);
    const rest = chips.length - max;
    const html = vis.map(c => typeof c === 'string'
      ? `<span class="badge badge-blue" style="font-size:10px;white-space:nowrap">${c}</span>`
      : `<span class="badge ${c.cls||'badge-blue'}" style="font-size:10px;white-space:nowrap${c.style?';'+c.style:''}">${c.label}</span>`
    ).join('');
    const more = rest > 0
      ? `<span class="badge badge-gray" style="font-size:10px;white-space:nowrap">+${rest}</span>`
      : '';
    return `<div style="display:flex;gap:3px;align-items:center;flex-wrap:nowrap">${html}${more}</div>`;
  },

  /* ── Table UI: primary CTA + "⋯" overflow menu ───────────
     id:      unique string (row id)
     actions: [{label, onclick}]                            */
  moreMenu(id, actions) {
    const mid   = 'mm-' + id;
    const items = actions.map(a =>
      `<button style="display:block;width:100%;padding:6px 12px;font-size:12px;text-align:left;
        background:none;border:none;cursor:pointer;color:var(--md-on-surface);border-radius:4px;white-space:nowrap"
        onmouseover="this.style.background='var(--md-surface-mid)'"
        onmouseout="this.style.background=''"
        onclick="event.stopPropagation();${a.onclick};Utils.closeMenus()">${a.label}</button>`
    ).join('');
    return `<div style="position:relative;display:inline-block;vertical-align:middle">
      <button class="btn btn-secondary btn-sm"
        style="padding:0 7px;font-size:15px;line-height:1;letter-spacing:1px;vertical-align:middle"
        onclick="event.stopPropagation();Utils.toggleMenu('${mid}')">⋯</button>
      <div id="${mid}" data-menu="true"
        style="display:none;position:absolute;right:0;top:calc(100% + 2px);background:var(--md-surface-lowest);
          border:1px solid var(--md-outline-variant);border-radius:8px;
          box-shadow:0 8px 24px rgba(0,0,0,.12);z-index:999;min-width:130px;padding:4px">
        ${items}
      </div>
    </div>`;
  },
  toggleMenu(id) {
    const el = document.getElementById(id);
    if (!el) return;
    const open = el.style.display !== 'none';
    Utils.closeMenus();
    if (!open) el.style.display = 'block';
  },
  closeMenus() {
    document.querySelectorAll('[data-menu="true"]').forEach(function(m) { m.style.display = 'none'; });
  },
};

/* ── CLOSE ALL MORE-MENUS ON OUTSIDE CLICK ───────────────── */
document.addEventListener('click', function() { if (window.Utils) Utils.closeMenus(); });
