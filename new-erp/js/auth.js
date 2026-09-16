/* ============================================================
   auth.js — Authorize (prototype)
   กฎ: Admin เพิ่ม Staff บนหน้า Staff เท่านั้น → เฉพาะ email ที่อยู่ใน DB.staff
       และสถานะ active ถึงจะ login เข้าระบบได้
   role/สาขา ที่เห็นหลัง login = มาจาก roleAssignments ของ staff คนนั้น
   ⚠️ prototype: ไม่มี backend/password จริง — เป็น gate จำลองเพื่อลองใช้ flow
   ============================================================ */
(function () {

  const KEY = 'nockerp_session';

  /* ── ค้นหา staff จาก email ─────────────────────────────────── */
  function findStaff(email) {
    const e = String(email || '').trim().toLowerCase();
    if (!e) return null;
    return (DB.staff || []).find(s => (s.email || '').trim().toLowerCase() === e) || null;
  }
  /* role สูงสุดที่ staff คนนี้มี (ใช้เป็น role หลักตอน login) */
  const RANK = ['teacher', 'admin', 'manager', 'area_manager', 'director'];
  function topRole(s) {
    const roles = (s.roleAssignments || []).map(r => r.role);
    return RANK.slice().reverse().find(r => roles.includes(r)) || (s.roles || [])[0] || 'teacher';
  }
  function branchesOf(s) {
    return [...new Set((s.roleAssignments || []).map(r => r.branch).filter(Boolean))];
  }

  /* ── SESSION ──────────────────────────────────────────────── */
  window.Auth = {
    login(email) {
      const s = findStaff(email);
      if (!s) return { ok:false, reason:'ไม่พบอีเมลนี้ในระบบ — ให้ Admin เพิ่มคุณในหน้า Staff ก่อน' };
      if (s.status && s.status !== 'active') return { ok:false, reason:'บัญชีนี้ถูกปิดใช้งาน — ติดต่อ Admin' };
      const role = topRole(s), brs = branchesOf(s);
      Object.assign(window.CURRENT_USER, {
        staffId: s.id,
        name: s.name,
        initials: (s.nick || s.name || '?').charAt(0),
        email: s.email,
        role,
        branch: s.defaultBranch || brs[0] || CONST.BRANCHES[0],
        branches: brs,
        adminTier: s.adminTier || null,
        specialAdmin: !!s.specialAdmin,
      });
      try { sessionStorage.setItem(KEY, s.email); } catch (e) {}
      return { ok:true, staff:s, role };
    },
    logout() {
      try { sessionStorage.removeItem(KEY); } catch (e) {}
      location.reload();
    },
    restore() {
      let e = null;
      try { e = sessionStorage.getItem(KEY); } catch (err) {}
      return e ? this.login(e) : { ok:false };
    },
    /* รายชื่อที่ login ได้ — สำหรับ quick-pick ใน prototype */
    eligible() {
      return (DB.staff || [])
        .filter(s => s.email && (!s.status || s.status === 'active'))
        .map(s => ({ id:s.id, name:s.name, email:s.email, role:topRole(s), branches:branchesOf(s) }));
    },
  };

  /* ── LOGIN SCREEN ─────────────────────────────────────────── */
  function roleBadge(r) {
    const m = { director:'blue', area_manager:'purple', manager:'green', admin:'yellow', teacher:'gray' };
    return UI.badge((window.ROLE_META?.[r]?.label) || r, m[r] || 'gray');
  }
  window.authShowLogin = function () {
    const list = Auth.eligible();
    const el = document.createElement('div');
    el.id = 'auth-screen';
    el.style.cssText = `position:fixed;inset:0;z-index:9999;background:var(--md-surface,#f5f6fa);
      display:flex;align-items:center;justify-content:center;padding:24px;overflow-y:auto`;
    el.innerHTML = `
      <div style="width:100%;max-width:420px">
        <div style="text-align:center;margin-bottom:22px">
          <div style="width:52px;height:52px;border-radius:14px;background:var(--md-primary,#6366f1);color:#fff;
            display:flex;align-items:center;justify-content:center;margin:0 auto 12px;font-size:22px;font-weight:800">N</div>
          <div style="font-size:20px;font-weight:700">NockERP</div>
          <div class="text-muted" style="font-size:12px">เข้าสู่ระบบด้วยอีเมลที่ Admin เพิ่มไว้ในหน้า Staff</div>
        </div>
        <div style="background:var(--md-surface-lowest,#fff);border:1px solid var(--md-outline-variant);
          border-radius:14px;padding:20px">
          <label class="settings-label">อีเมล</label>
          <input id="auth-email" class="settings-input" placeholder="you@nockacademy.com"
            onkeydown="if(event.key==='Enter')authDoLogin()" style="margin-bottom:6px">
          <div id="auth-err" class="text-error" style="font-size:11px;min-height:15px;margin-bottom:8px"></div>
          <button class="btn btn-primary" style="width:100%" onclick="authDoLogin()">
            ${UI.icon('login','sm')} เข้าสู่ระบบ</button>
          <div style="border-top:1px solid var(--md-outline-variant);margin:16px 0 12px"></div>
          <div class="text-muted" style="font-size:11px;margin-bottom:8px">
            ${UI.icon('info','sm')} Prototype — กดเลือกบัญชีเพื่อเข้าใช้ได้เลย (${list.length} คนที่ Admin เพิ่มไว้)</div>
          <div style="max-height:230px;overflow-y:auto">
            ${list.map(u=>`
              <div onclick="authDoLogin('${u.email}')"
                style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;cursor:pointer"
                onmouseover="this.style.background='var(--md-surface-variant,#eef0f4)'"
                onmouseout="this.style.background=''">
                <div style="width:30px;height:30px;border-radius:50%;background:var(--md-primary-container);
                  color:var(--md-primary);display:flex;align-items:center;justify-content:center;
                  font-weight:700;font-size:12px;flex-shrink:0">${(u.name||'?').charAt(0)}</div>
                <div style="flex:1;min-width:0">
                  <div style="font-size:12px;font-weight:600">${u.name}</div>
                  <div class="text-muted" style="font-size:10px">${u.email}${u.branches.length?' · '+u.branches.join(', '):''}</div>
                </div>
                ${roleBadge(u.role)}
              </div>`).join('')}
          </div>
        </div>
      </div>`;
    document.body.appendChild(el);
    setTimeout(()=>document.getElementById('auth-email')?.focus(), 60);
  };

  window.authDoLogin = function (email) {
    const e = email || document.getElementById('auth-email')?.value;
    const res = Auth.login(e);
    const err = document.getElementById('auth-err');
    if (!res.ok) { if (err) err.textContent = res.reason; return; }
    document.getElementById('auth-screen')?.remove();
    if (window.updateUserCard) updateUserCard();
    if (window.applyRoleGate) applyRoleGate();
    showToast(`ยินดีต้อนรับ ${res.staff.name} (${window.ROLE_META?.[res.role]?.label||res.role})`, 'success');
  };
  window.authLogout = function () { Auth.logout(); };

  /* ── ROLE GATE — ซ่อนเมนูที่ role นี้เข้าไม่ได้ ────────────── */
  const MENU_BY_ROLE = {
    teacher: ['dashboard','calendar','sessions','attendance','summaries','students','inbox','notifications','tasks'],
    admin:   ['dashboard','crm','inbox','calendar','students','families','courses','classes','sessions',
              'attendance','summaries','bus-route','inventory','billing','tasks','notifications'],
  };
  window.applyRoleGate = function () {
    const role = window.CURRENT_USER?.role;
    const allow = MENU_BY_ROLE[role];
    document.querySelectorAll('#nav-academy .nav-item[data-view]').forEach(it => {
      it.style.display = (allow && !allow.includes(it.dataset.view)) ? 'none' : '';
    });
    /* Settings = Director เท่านั้น (ตาม permission matrix) */
    const st = document.querySelector('#nav-academy .nav-item[data-view="settings"]');
    if (st) st.style.display = role === 'director' ? '' : 'none';
    if (window.applyFinanceNavGate) applyFinanceNavGate();
  };

  /* ── BOOT ─────────────────────────────────────────────────── */
  window.addEventListener('load', () => {
    if (window.AUTH_DISABLED) return;                 // ปิด gate ชั่วคราวได้เวลา dev
    const r = Auth.restore();
    if (r.ok) { if (window.updateUserCard) updateUserCard(); applyRoleGate(); }
    else authShowLogin();
  });

})();
