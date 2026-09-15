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
  director:     { label:'Director',    color:'#6366f1', bg:'#6366f115', border:'#6366f130' },
  area_manager: { label:'Area Mgr',    color:'#3b82f6', bg:'#3b82f615', border:'#3b82f630' },
  manager:      { label:'Manager',     color:'#10b981', bg:'#10b98115', border:'#10b98130' },
  admin:        { label:'Admin',       color:'#f59e0b', bg:'#f59e0b15', border:'#f59e0b30' },
  teacher:      { label:'Teacher',     color:'#8b5cf6', bg:'#8b5cf615', border:'#8b5cf630' },
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

  Modal.create('modal-switch', '⇄ Account & Preferences', `
    <!-- Profile -->
    <div style="display:flex;align-items:center;gap:12px;background:#f9fafb;
                border:1px solid #f3f4f6;border-radius:10px;padding:12px 14px;margin-bottom:4px">
      <div style="width:40px;height:40px;border-radius:50%;background:${ROLE_META[u.role]?.color||'#6366f1'};
                  color:#fff;font-size:16px;font-weight:700;display:flex;align-items:center;
                  justify-content:center;flex-shrink:0" id="switch-av">${u.initials}</div>
      <div>
        <div style="font-size:14px;font-weight:600;color:#1a1d23">${u.name}</div>
        <div style="font-size:12px;color:#6b7280;margin-top:1px">${u.email}</div>
      </div>
    </div>

    <div class="modal-section">
      <!-- Branch -->
      <div style="margin-bottom:16px">
        <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;
                    letter-spacing:.6px;margin-bottom:8px">🏫 Branch</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${branchBtns}</div>
      </div>
      <!-- Role -->
      <div>
        <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;
                    letter-spacing:.6px;margin-bottom:8px">👤 View as Role</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">${roleBtns}</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:8px;padding:8px 10px;
                    background:#f9fafb;border-radius:7px;border:1px solid #f3f4f6">
          💡 Switching role shows what that role can see (UI preview only)
        </div>
      </div>
    </div>`,

    `<button class="btn btn-secondary" onclick="Modal.close('modal-switch')">Close</button>
     <button class="btn btn-danger" style="margin-left:auto" onclick="logout()">🚪 Log Out</button>`,
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
  showToast(`Viewing as ${ROLE_META[role]?.label} ✓`, 'success');
};

window.logout = function () {
  Modal.closeAll();
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
  const colors = { info: '#6366f1', success: '#10b981', warning: '#f59e0b', error: '#ef4444' };
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
    if (!s) return { family: '—', left: '?', cls: 'badge-gray' };
    const left = Math.min(...s.courses.map(c => c.left));
    const cls  = left === 0 ? 'badge-gray'    // pause / sessions หมด
               : left <= 1 ? 'badge-red'      // renewal urgent (1 เหลือ)
               : left <= 2 ? 'badge-yellow'   // renewal warning (2 เหลือ)
               : 'badge-green';               // active
    return { family: s.family, left, cls };
  },

  /* ── Session helpers ── */
  sessionsFor:   name => DB.sessions.filter(s => s.studentNames.includes(name)),
  upcomingFor:   name => DB.sessions.filter(s => s.state === 'upcoming' && s.studentNames.includes(name)),
  shouldDeduct:  att  => CONST.ATTENDANCE_META[att]?.deduct ?? true,

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
};

// Shared bridge for the React shell and module-owned dialogs.
window.Modal = Modal;
