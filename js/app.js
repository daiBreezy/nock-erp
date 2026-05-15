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

/* ── NAVIGATION ───────────────────────────────────────────── */
function showView(id) {
  // hide all views
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  // show target
  const target = document.getElementById('view-' + id);
  if (target) target.classList.add('active');
  // update sidebar active state
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.querySelector(`.nav-item[data-view="${id}"]`);
  if (navEl) navEl.classList.add('active');
  // update topnav title
  document.getElementById('topnav-title').textContent = VIEW_TITLES[id] || id;
  // scroll content to top
  document.getElementById('content').scrollTop = 0;
}

// Wire sidebar nav items
document.querySelectorAll('.nav-item[data-view]').forEach(el => {
  el.addEventListener('click', () => showView(el.dataset.view));
});

// Wire topnav action buttons (notifications, tasks)
document.querySelectorAll('#topnav .icon-btn[data-view]').forEach(el => {
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

/* ── GLOBAL SEARCH (basic UX) ────────────────────────────── */
document.getElementById('global-search').addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.value.trim()) {
    // Future: real search. For now show toast.
    showToast(`Searching "${e.target.value.trim()}"…`, 'info');
  }
});

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
    const left = Utils.classesLeft(studentId);
    return left <= 1 ? 'urgent' : left <= 2 ? 'renewal' : 'active';
  },
  // Get meta for student (used in Calendar class modal roster)
  studentMeta(name) {
    const s = DB.students.find(x => x.name === name);
    if (!s) return { family: '—', left: '?', cls: 'badge-gray' };
    const left = Math.min(...s.courses.map(c => c.left));
    const cls  = left <= 1 ? 'badge-red' : left <= 2 ? 'badge-yellow' : 'badge-green';
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
  statusBadge(status) {
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
