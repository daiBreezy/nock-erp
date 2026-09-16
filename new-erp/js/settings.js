/* ============================================================
   settings.js — Shell + General nav + Branch Info panel
   settings-hours.js   → Scheduling (Op Hours / Special / Holidays)
   settings-catalog.js → Subjects, Grades, Packages
   settings-system.js  → System tab
   ============================================================ */
(function () {

  /* ── SESSION ─────────────────────────────────────────────── */
  window.ST_ROLE    = 'director';
  window.ST_BRANCH  = 'Sukhumvit';
  window.ST_SCOPE   = 'branch';     // 'global' | 'branch'
  window._stSection = 'info';
  window.ST_VIEW    = null;         // 'list' | 'branch' — Director/AreaMgr เห็น list ก่อน

  window.stGetBS = function(branch) {
    return DB.branchSettings?.find(b=>b.branch===(branch||window.ST_BRANCH))
        || DB.branchSettings?.[0];
  };
  function canSeeBranches() {
    return window.ST_ROLE==='director'||window.ST_ROLE==='area_manager';
  }

  /* ── BRANCH SCOPE ตาม role ────────────────────────────────
     Director = ทุกสาขา · Area Manager = เฉพาะ area ที่ดูแล · อื่นๆ = สาขาตัวเอง */
  function myAreas() {
    const u = window.CURRENT_USER || {};
    const brs = (u.branches && u.branches.length) ? u.branches : [window.ST_BRANCH];
    const areas = new Set();
    brs.forEach(b => { const bs = DB.branchSettings?.find(x=>x.branch===b); if (bs?.area) areas.add(bs.area); });
    return areas;
  }
  window.stMyBranches = function() {
    const all = DB.branchSettings || [];
    if (window.ST_ROLE === 'director') return all;
    if (window.ST_ROLE === 'area_manager') { const a = myAreas(); return all.filter(b => a.has(b.area)); }
    return all.filter(b => b.branch === window.ST_BRANCH);
  };
  /* toggle switch ใช้ร่วม (branch list · scheduling) */
  window.stSwitch = function(on, onclick, title) {
    return `<button class="nk-switch ${on?'on':''}" title="${title||''}"
      onclick="event.stopPropagation();${onclick}"><span class="knob">${on?'✓':'✕'}</span></button>`;
  };

  /* นับ staff จริงต่อสาขา จาก roleAssignments */
  function roleCounts(branch) {
    const c = { teacher:0, admin:0, manager:0, area_manager:0 };
    (DB.staff || []).forEach(s => (s.roleAssignments || []).forEach(ra => {
      if (ra.branch === branch && c[ra.role] !== undefined) c[ra.role]++;
    }));
    return c;
  }

  /* ── ROOT RENDER — list หรือ branch page ─────────────────── */
  window.stRenderSettings = function() {
    if (!canSeeBranches()) window.ST_VIEW = 'branch';
    if (!window.ST_VIEW) window.ST_VIEW = 'list';
    document.getElementById('view-settings').innerHTML =
      window.ST_VIEW === 'list' ? branchListHtml() : branchPageHtml();
    if (window.ST_VIEW === 'branch') {
      const t = document.querySelector('#st-tabs .tab.active');
      if (t && t.dataset.tab === 'system' && window.renderSystemTab) renderSystemTab();
      else stRenderGeneral();
    }
  };

  /* ── BRANCH LIST (landing สำหรับ Director / Area Manager) ── */
  function branchListHtml() {
    const list = stMyBranches();
    const isDir = window.ST_ROLE === 'director';
    const cards = list.map(b => {
      const c = roleCounts(b.branch);
      const badges = [
        c.teacher ? UI.badge(`Teacher: ${c.teacher}`, 'green') : '',
        c.admin ? UI.badge(`Admin: ${c.admin}`, 'blue') : '',
        c.manager ? UI.badge(`Manager: ${c.manager}`, 'yellow') : '',
        c.area_manager ? UI.badge(`Area MGR: ${c.area_manager}`, 'red') : '',
      ].filter(Boolean).join(' ')
        || `<span class="text-muted" style="font-size:11px">ยังไม่มี staff ในสาขานี้</span>`;
      const off = !b.active;
      return `<div class="st-branch-card" onclick="stOpenBranch('${b.branch}')"
        style="display:flex;align-items:center;gap:14px;padding:12px 14px;border:1px solid var(--md-outline-variant);
          border-radius:12px;margin-bottom:8px;cursor:pointer;background:var(--md-surface);${off?'opacity:.55':''}">
        <div style="width:38px;height:38px;border-radius:9px;flex-shrink:0;display:flex;align-items:center;justify-content:center;
          background:${b.schoolType==='Liclass'?'#fde8ee':'var(--md-primary-container)'};
          color:${b.schoolType==='Liclass'?'#e11d63':'var(--md-primary)'}">${UI.icon('storefront','sm')}</div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600">${b.branch}</div>
          <div class="text-muted" style="font-size:11px;margin-bottom:4px">${b.schoolType} School · ${b.area||'—'}</div>
          <div style="display:flex;gap:4px;flex-wrap:wrap">${badges}</div>
        </div>
        ${stSwitch(b.active, `stToggleBranch('${b.branch}')`, off?'เปิดสาขา':'ปิดสาขา')}
        ${UI.icon('chevron_right','sm')}
      </div>`;
    }).join('') || `<div class="text-muted" style="padding:24px;text-align:center">ไม่มีสาขาที่คุณดูแล</div>`;

    return `
    <div class="page-header">
      <div>
        <div class="page-title">${UI.icon('settings','sm')} Settings</div>
        <div class="page-sub">${isDir?'ทุกสาขา':'สาขาที่คุณดูแล'} · ${list.length} สาขา</div>
      </div>
      <button class="btn btn-primary btn-sm" onclick="stAddBranch()">${UI.icon('add','sm')} Add Branch</button>
    </div>
    ${isDir ? `<div onclick="stOpenGlobal()" style="display:flex;align-items:center;gap:12px;padding:12px 14px;
        border:1px solid var(--md-primary);border-radius:12px;margin-bottom:14px;cursor:pointer;
        background:var(--md-primary-container)">
        <div style="width:38px;height:38px;border-radius:9px;display:flex;align-items:center;justify-content:center;
          background:var(--md-primary);color:#fff">${UI.icon('public','sm')}</div>
        <div style="flex:1">
          <div style="font-weight:600;color:var(--md-primary)">Global — ค่ากลางทุกสาขา</div>
          <div class="text-muted" style="font-size:11px">Subjects Pool · Grades · Packages & Tiers · Holidays</div>
        </div>
        ${UI.icon('chevron_right','sm')}
      </div>` : ''}
    <div class="section-title" style="font-size:var(--fs-body-sm)">Branch list</div>
    ${cards}`;
  }

  /* ── BRANCH PAGE (เข้าไปในสาขา) ──────────────────────────── */
  function branchPageHtml() {
    const isG = window.ST_SCOPE === 'global';
    const back = canSeeBranches()
      ? `<button class="btn btn-secondary btn-sm" onclick="stBackToList()" title="กลับไป Branch list">${UI.icon('arrow_back','sm')}</button>`
      : '';
    return `
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:10px">
        ${back}
        <div>
          <div class="page-title">${UI.icon('settings','sm')} Settings</div>
          <div class="page-sub">${isG ? 'Global — ทุกสาขา' : window.ST_BRANCH}</div>
        </div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <div id="st-branch-wrap"></div>
        <button class="btn btn-primary btn-sm" onclick="stSaveAll()">${UI.icon('save','sm')} Save All</button>
      </div>
    </div>
    <div class="tabs" style="margin-bottom:16px" id="st-tabs">
      <div class="tab active" data-tab="general" onclick="stTab('general',this)">${UI.icon('home_work','sm')} General</div>
      <div class="tab"        data-tab="system"  onclick="stTab('system',this)">${UI.icon('tune','sm')} System</div>
    </div>
    <div id="stab-general"></div>
    <div id="stab-system" style="display:none"></div>`;
  }

  /* ── LIST ACTIONS ─────────────────────────────────────────── */
  window.stOpenBranch = function(branch) {
    window.ST_SCOPE = 'branch'; window.ST_BRANCH = branch;
    window._stSection = 'info'; window.ST_VIEW = 'branch';
    stRenderSettings();
  };
  window.stOpenGlobal = function() {
    window.ST_SCOPE = 'global'; window._stSection = 'pool-subjects'; window.ST_VIEW = 'branch';
    stRenderSettings();
  };
  window.stBackToList = function() { window.ST_VIEW = 'list'; stRenderSettings(); };
  window.stToggleBranch = function(branch) {
    const b = stGetBS(branch); if (!b) return;
    b.active = !b.active; stRenderSettings();
    showToast(`${branch} → ${b.active?'Active':'Inactive'}`, b.active?'success':'warning');
  };
  window.stAddBranch = function() {
    const areas = [...new Set((DB.branchSettings||[]).map(b=>b.area).filter(Boolean))];
    Modal.create('modal-st-addbranch', `${UI.icon('add_business','sm')} Add Branch`,
      `<div class="settings-group"><label class="settings-label">ชื่อสาขา *</label>
        <input id="ab-name" class="settings-input" placeholder="เช่น Rama 9"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div><label class="settings-label">School</label><select id="ab-school" class="settings-input">
          <option>Nockacademy</option><option>Liclass</option></select></div>
        <div><label class="settings-label">Area</label><select id="ab-area" class="settings-input">
          ${areas.map(a=>`<option>${a}</option>`).join('')}</select></div>
      </div>
      <div class="settings-group"><label class="settings-label">ที่อยู่</label>
        <input id="ab-addr" class="settings-input" placeholder="ที่อยู่สาขา"></div>
      <div class="settings-hint">${UI.icon('info','sm')} สร้างแล้วตั้งค่า Scheduling / Subjects / Packages ต่อในสาขาได้เลย</div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-st-addbranch')">Cancel</button>
       <button class="btn btn-primary" onclick="stAddBranchSave()">${UI.icon('check','sm')} Create Branch</button>`);
  };
  window.stAddBranchSave = function() {
    const name = (document.getElementById('ab-name')?.value||'').trim();
    if (!name) return showToast('ใส่ชื่อสาขาก่อน','warning');
    if (DB.branchSettings.some(b=>b.branch===name)) return showToast('มีสาขาชื่อนี้แล้ว','warning');
    const school = document.getElementById('ab-school')?.value || 'Nockacademy';
    const area   = document.getElementById('ab-area')?.value || 'Bangkok';
    const addr   = (document.getElementById('ab-addr')?.value||'').trim();
    DB.branchSettings.push(window._mkBranchRecord({ branch:name, schoolType:school, area, address:addr }));
    Modal.close('modal-st-addbranch'); stRenderSettings();
    showToast(`สร้างสาขา ${name} แล้ว ✓`, 'success');
  };

  /* ── SCOPE DROPDOWN — Global (Director) + Branches ────────
     เปลี่ยนค่า = ทั้งหน้าเปลี่ยน (เมนูซ้าย + panel) ตาม scope  */
  function renderBranchDropdown() {
    const wrap=document.getElementById('st-branch-wrap'); if(!wrap) return;
    if(!canSeeBranches()){wrap.innerHTML='';return;}
    const isG = window.ST_SCOPE==='global';
    wrap.innerHTML=`<select class="settings-input" style="min-width:170px;font-size:13px"
        onchange="stSwitchScope(this.value)">
      ${window.ST_ROLE==='director'
        ? `<option value="__global__" ${isG?'selected':''}>🌐 Global — ทุกสาขา</option>
           <option disabled>──────────</option>`:''}
      ${stMyBranches().map(b=>`<option value="${b.branch}" ${!isG&&b.branch===window.ST_BRANCH?'selected':''}>${b.branch}${b.active?'':' (ปิด)'}</option>`).join('')}
    </select>`;
  }
  window.stSwitchScope = function(val) {
    if (val==='__global__') {
      window.ST_SCOPE='global';
      window._stSection='pool-subjects';
    } else {
      const wasGlobal = window.ST_SCOPE==='global';
      window.ST_SCOPE='branch';
      window.ST_BRANCH=val;
      if (wasGlobal) window._stSection='info';
    }
    stRenderSettings();   // re-render ทั้งหน้า (header sub เปลี่ยนตาม scope)
  };
  window.stSwitchBranch = function(branch) { stSwitchScope(branch); };   // legacy alias

  /* ── TAB SWITCH ──────────────────────────────────────────── */
  window.stTab = function(tab, el) {
    ['general','system'].forEach(t=>{
      const p=document.getElementById(`stab-${t}`);
      if(p) p.style.display=t===tab?'':'none';
    });
    document.querySelectorAll('#st-tabs .tab').forEach(t=>t.classList.remove('active'));
    el.classList.add('active');
    if(tab==='general') stRenderGeneral();
    if(tab==='system'&&window.renderSystemTab) renderSystemTab();
  };

  /* ── NAV ITEM HELPER ─────────────────────────────────────── */
  function navItem(section, icon, label) {
    const active=window._stSection===section;
    return `<div class="st-nav-item" data-section="${section}" onclick="stShowSection('${section}')"
      style="display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;
        cursor:pointer;margin-bottom:2px;font-size:13px;font-weight:500;transition:background .12s;
        background:${active?'var(--md-primary-container)':'transparent'};
        color:${active?'var(--md-primary)':'var(--md-on-surface-variant)'}">
      ${UI.icon(icon,'sm')}<span>${label}</span></div>`;
  }

  /* ── GENERAL TAB ORCHESTRATOR ────────────────────────────── */
  window.stRenderGeneral = function() {
    renderBranchDropdown();
    const el=document.getElementById('stab-general'); if(!el) return;
    const isG = window.ST_SCOPE==='global';

    /* เมนูซ้าย — คนละชุดตาม scope */
    const nav = isG ? `
        ${navItem('pool-subjects','menu_book','Subjects Pool')}
        ${navItem('pool-grades','school','Grades Pool')}
        ${navItem('pool-packages','inventory_2','Packages & Tiers')}
        ${navItem('holidays','beach_access','Holidays')}`
      : `
        ${navItem('info','business','Branch Info')}
        ${navItem('scheduling','schedule','Scheduling')}
        ${navItem('subjects','menu_book','Subjects')}
        ${navItem('grades','school','Grades')}
        ${navItem('packages','inventory_2','Packages')}
        ${navItem('invoice','receipt_long','Invoice')}
        ${navItem('promotion','sell','Promotion')}`;

    el.innerHTML=`
    ${isG ? `<div style="display:flex;align-items:center;gap:8px;padding:9px 14px;margin-bottom:12px;
        background:var(--md-warning-container);border:1px solid var(--md-warning);border-radius:10px;
        font-size:13px;color:var(--md-on-warning-container)">
        ${UI.icon('public','sm')} <strong>กำลังแก้ค่ากลาง</strong> — มีผลกับทุกสาขา (Director เท่านั้น)</div>`:''}
    <div style="display:flex;border:1px solid var(--md-outline-variant);border-radius:12px;
      overflow:hidden;background:var(--md-surface);min-height:540px">
      <div style="width:192px;flex-shrink:0;border-right:1px solid var(--md-outline-variant);
        padding:12px 8px;background:var(--md-surface-lowest)">
        ${nav}
      </div>
      <div id="st-panel" style="flex:1;padding:20px 22px;min-width:0;
        overflow-y:auto;max-height:calc(100vh - 210px)"></div>
    </div>`;
    stShowSection(window._stSection||(isG?'pool-subjects':'info'));
  };

  /* ── SECTION ROUTER ──────────────────────────────────────── */
  window.stShowSection = function(name) {
    window._stSection=name;
    document.querySelectorAll('.st-nav-item').forEach(el=>{
      const on=el.dataset.section===name;
      el.style.background=on?'var(--md-primary-container)':'transparent';
      el.style.color=on?'var(--md-primary)':'var(--md-on-surface-variant)';
    });
    const panel=document.getElementById('st-panel'); if(!panel) return;
    const bs=window.stGetBS();
    switch(name){
      /* ── Branch scope ── */
      case 'info':        panel.innerHTML=stRenderBasicInfo(bs); break;
      case 'scheduling':  panel.innerHTML=window.stRenderScheduling?stRenderScheduling(bs):''; break;
      case 'subjects':    panel.innerHTML=window.stRenderSubjects?stRenderSubjects(bs):''; break;
      case 'grades':      panel.innerHTML=window.stRenderGrades?stRenderGrades(bs):''; break;
      case 'packages':    panel.innerHTML=window.stRenderPackages?stRenderPackages(bs):''; break;
      /* pricematrix ยุบเข้า Packages แล้ว (Nock: มันคือเรื่องเดียวกัน) — เก็บ case ไว้กัน link เก่าพัง */
      case 'pricematrix': window._stSection='packages'; panel.innerHTML=window.stRenderPackages?stRenderPackages(bs):''; break;
      case 'promotion':   panel.innerHTML=window.stRenderPromotionPage?stRenderPromotionPage(bs):''; break;
      case 'invoice':     panel.innerHTML=window.stRenderInvoice?stRenderInvoice(bs):'<div class="text-muted">Loading…</div>'; break;
      /* ── Global scope ── */
      case 'pool-subjects': panel.innerHTML=window.stRenderPoolSubjects?stRenderPoolSubjects():''; break;
      case 'pool-grades':   panel.innerHTML=window.stRenderPoolGrades?stRenderPoolGrades():''; break;
      case 'pool-packages': panel.innerHTML=window.stRenderPoolPackages?stRenderPoolPackages():''; break;
      case 'holidays':      panel.innerHTML=window.stRenderSchedContent
                              ? `<div style="margin-bottom:16px"><div style="font-size:17px;font-weight:600">Holidays</div>
                                 <div class="text-muted" style="font-size:13px">Company-wide — ทุกสาขาใช้ร่วมกัน</div></div>`
                                + stRenderSchedContent('holidays', bs)
                              : ''; break;
    }
  };

  /* ── BASIC INFO ──────────────────────────────────────────── */
  /* ── ROOMS ────────────────────────────────────────────────
     room = string (เดิม) หรือ {name,active} — normalize ให้รองรับทั้งคู่ */
  window.stRoomObj = r => (typeof r === 'string' ? { name:r, active:true } : { name:r.name||'', active:r.active!==false });
  function stRoomList(bs) {
    const rooms = (Array.isArray(bs?.rooms)?bs.rooms:[]).map(stRoomObj);
    return rooms.map((r,i)=>`
      <div class="st-room-row" style="display:flex;align-items:center;gap:8px;margin-bottom:8px;${r.active?'':'opacity:.55'}">
        <span style="width:22px;height:22px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;
          background:var(--md-surface-variant,#eef0f4);font-size:11px;font-weight:700">${i+1}</span>
        <div style="position:relative;flex:1;max-width:280px">
          <span style="position:absolute;top:-6px;left:9px;background:var(--md-surface);padding:0 4px;font-size:10px;
            color:var(--md-on-surface-variant)">Room ${i+1}</span>
          <input class="settings-input st-room-name" data-active="${r.active?'1':'0'}" value="${r.name}"
            placeholder="e.g. Apple Room" style="width:100%">
        </div>
        ${stSwitch(r.active, `stToggleRoom(${i})`, r.active?'ปิดห้องนี้':'เปิดห้องนี้')}
        <button class="btn btn-secondary btn-sm" onclick="stRemoveRoom(this)" title="ลบห้อง">${UI.icon('remove','sm')}</button>
      </div>`).join('') || `<div class="text-muted" style="font-size:11px;margin-bottom:8px">ยังไม่มีห้อง</div>`;
  }
  window.stToggleRoom = function(i) {
    const bs = stGetBS(); if (!bs) return;
    stSyncRooms();                                  // เก็บชื่อที่พิมพ์ค้างไว้ก่อน
    const r = stRoomObj(bs.rooms[i]); r.active = !r.active; bs.rooms[i] = r;
    const list = document.getElementById('st-rooms-list'); if (list) list.innerHTML = stRoomList(bs);
  };
  /* อ่านชื่อห้องจาก input กลับเข้า bs.rooms (กันค่าหายตอน re-render) */
  window.stSyncRooms = function() {
    const bs = stGetBS(); if (!bs) return;
    const inputs = [...document.querySelectorAll('.st-room-name')];
    if (!inputs.length) return;
    bs.rooms = inputs.map(inp => ({ name: inp.value.trim(), active: inp.dataset.active !== '0' })).filter(r => r.name);
  };

  /* ── LOCATION (ตาม mockup: Current Location · Address 1/2 · lat/long · map) ── */
  function stLocationBlock(bs) {
    const loc = bs.location || (bs.location = { addr1: bs.address||'', addr2:'', lat:'', lng:'' });
    const mapQ = encodeURIComponent(loc.lat && loc.lng ? `${loc.lat},${loc.lng}` : (loc.addr1 || bs.branch));
    return `<div style="margin-bottom:20px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
        <div><div style="font-weight:600">Location</div>
          <div class="text-muted" style="font-size:11px">Optional</div></div>
        <button class="btn btn-secondary btn-sm" onclick="stCurrentLocation()">${UI.icon('my_location','sm')} Current Location</button>
      </div>
      <div style="display:grid;grid-template-columns:1fr 200px;gap:12px;margin-top:10px">
        <div>
          <div class="settings-group"><label class="settings-label">Address 1</label>
            <input class="settings-input" id="st-addr1" value="${loc.addr1||''}" placeholder="123 Sukhumvit Rd, Bangkok"></div>
          <div class="settings-group"><label class="settings-label">Address 2</label>
            <input class="settings-input" id="st-addr2" value="${loc.addr2||''}" placeholder="อาคาร / ชั้น / ห้อง"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
            <div><label class="settings-label">Latitude</label>
              <input class="settings-input" id="st-lat" value="${loc.lat||''}" placeholder="13.7367"></div>
            <div><label class="settings-label">Longitude</label>
              <input class="settings-input" id="st-lng" value="${loc.lng||''}" placeholder="100.5602"></div>
          </div>
        </div>
        <div onclick="stOpenMap()" title="เปิดใน Google Maps"
          style="border:1px solid var(--md-outline-variant);border-radius:10px;overflow:hidden;cursor:pointer;
            background:var(--md-surface-variant,#eef0f4);display:flex;flex-direction:column;align-items:center;
            justify-content:center;gap:6px;min-height:150px">
          ${UI.icon('location_on','lg')}
          <div class="text-muted" style="font-size:10px;text-align:center;padding:0 8px">${decodeURIComponent(mapQ)}</div>
          <span class="text-primary" style="font-size:10px;font-weight:600">เปิดแผนที่</span>
        </div>
      </div>
    </div>`;
  }
  window.stOpenMap = function() {
    const lat=document.getElementById('st-lat')?.value.trim(), lng=document.getElementById('st-lng')?.value.trim();
    const a1=document.getElementById('st-addr1')?.value.trim();
    const q = (lat&&lng) ? `${lat},${lng}` : (a1 || window.ST_BRANCH);
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(q)}`, '_blank');
  };
  window.stCurrentLocation = function() {
    if (!navigator.geolocation) return showToast('เบราว์เซอร์ไม่รองรับ geolocation','warning');
    showToast('กำลังขอตำแหน่ง…','info');
    navigator.geolocation.getCurrentPosition(
      p => {
        const lat=document.getElementById('st-lat'), lng=document.getElementById('st-lng');
        if(lat) lat.value = p.coords.latitude.toFixed(6);
        if(lng) lng.value = p.coords.longitude.toFixed(6);
        showToast('ใส่พิกัดปัจจุบันแล้ว ✓','success');
      },
      () => showToast('ขอตำแหน่งไม่สำเร็จ — กรอกเองได้','warning'));
  };

  window.stRenderBasicInfo = function(bs) {
    const phones=bs?.phone||[''];
    return `<div style="max-width:920px">
      <div style="margin-bottom:18px">
        <div style="font-size:17px;font-weight:600;margin-bottom:4px">Branch Information</div>
        <div class="text-muted" style="font-size:13px">Core details and contact for ${bs?.branch||'this branch'}</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div><label class="settings-label">School Type</label>
          <select class="settings-input" id="st-schooltype">
            <option ${bs?.schoolType==='Nockacademy'?'selected':''}>Nockacademy</option>
            <option ${bs?.schoolType==='Liclass'?'selected':''}>Liclass</option>
          </select></div>
        <div><label class="settings-label">Branch Name</label>
          <input class="settings-input" id="st-branchname" value="${bs?.branch||''}"></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div><label class="settings-label">Email</label>
          <input class="settings-input" type="email" id="st-email" value="${bs?.email||''}"></div>
        <div></div>
      </div>

      <div style="border-top:1px solid var(--md-outline-variant);padding-top:20px;margin-bottom:24px">
        <label class="settings-label" style="margin-bottom:4px;display:block">Rooms</label>
        <div class="text-muted" style="font-size:11px;margin-bottom:10px">
          ตั้งชื่อห้องของสาขานี้ — Calendar / Classes / Schedule ใช้รายชื่อนี้ทันที
        </div>
        <div id="st-rooms-list">${stRoomList(bs)}</div>
        <button class="btn btn-secondary btn-sm" onclick="stAddRoom()">${UI.icon('add','sm')} Add Room</button>
      </div>

      ${stLocationBlock(bs)}

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
        <div><label class="settings-label">LINE ID (Branch)</label>
          <input class="settings-input" id="st-lineid" value="${bs?.lineId||''}"></div>
        <div><label class="settings-label">LINE Token (API)</label>
          <input class="settings-input" type="password" id="st-linetoken" placeholder="••••••••••••"></div>
      </div>

      <div style="margin-bottom:24px">
        <label class="settings-label" style="display:block;margin-bottom:8px">LINE QR Code</label>
        <div style="display:flex;align-items:center;gap:12px">
          <div id="st-lineqr-preview" onclick="document.getElementById('st-lineqr-inp').click()"
            style="width:80px;height:80px;border:2px dashed var(--md-outline-variant);border-radius:8px;
                   display:flex;align-items:center;justify-content:center;cursor:pointer;
                   background:var(--md-surface-low);overflow:hidden;flex-shrink:0">
            ${bs?.lineQR
              ? `<img src="${bs.lineQR}" style="width:100%;height:100%;object-fit:contain">`
              : `<div style="text-align:center">${UI.icon('qr_code','sm')}<div style="font-size:10px;margin-top:2px" class="text-muted">LINE QR</div></div>`}
          </div>
          <div>
            <input type="file" id="st-lineqr-inp" accept="image/*" style="display:none"
              onchange="stLineQRChange(this)">
            <button class="btn btn-secondary btn-sm"
              onclick="document.getElementById('st-lineqr-inp').click()">
              ${UI.icon('upload','sm')} ${bs?.lineQR ? 'Change QR' : 'Upload QR'}
            </button>
            <div class="text-muted" style="font-size:11px;margin-top:6px">
              แสดงบน Invoice · เชื่อมกับ Settings → Invoice อัตโนมัติ
            </div>
            ${bs?.lineQR ? `<button onclick="stClearLineQR()"
              style="font-size:11px;color:var(--md-error);background:none;border:none;cursor:pointer;margin-top:4px">
              Remove QR</button>` : ''}
          </div>
        </div>
      </div>

      <div style="border-top:1px solid var(--md-outline-variant);padding-top:20px;margin-bottom:24px">
        <label class="settings-label" style="margin-bottom:10px;display:block">Phone Numbers</label>
        <div id="st-phones">${phones.map((p,i)=>`
          <div style="display:flex;gap:8px;margin-bottom:8px">
            <input class="settings-input" value="${p}" placeholder="+66-xx-xxx-xxxx" style="flex:1">
            ${i>0?`<button class="btn btn-secondary btn-sm" onclick="stRemovePhone(this)">${UI.icon('close','sm')}</button>`:''}
          </div>`).join('')}</div>
        <button class="btn btn-secondary btn-sm" onclick="stAddPhone()">${UI.icon('add','sm')} Add Phone</button>
      </div>

      <div style="border-top:1px solid var(--md-outline-variant);padding-top:20px">
        <label class="settings-label" style="margin-bottom:10px;display:block">Social Media</label>
        <div id="st-social">${(bs?.socialMedia||[]).map(s=>`
          <div style="display:flex;gap:8px;margin-bottom:8px">
            <select class="settings-input" style="width:130px;flex-shrink:0">
              ${['Facebook','Instagram','TikTok','YouTube','Twitter','Line'].map(p=>`<option ${s.platform===p?'selected':''}>${p}</option>`).join('')}
            </select>
            <input class="settings-input" value="${s.url}" placeholder="https://..." style="flex:1">
            <button class="btn btn-secondary btn-sm" onclick="stRemoveSocial(this)">${UI.icon('close','sm')}</button>
          </div>`).join('')}</div>
        <button class="btn btn-secondary btn-sm" onclick="stAddSocial()">${UI.icon('add','sm')} Add Social Media</button>
      </div>
    </div>`;
  };

  /* ── LINE QR HANDLERS ───────────────────────────────────── */
  window.stLineQRChange = function(inp) {
    if (!inp.files?.[0]) return;
    const bs = window.stGetBS();
    const reader = new FileReader();
    reader.onload = e => {
      if (bs) bs.lineQR = e.target.result;
      const prev = document.getElementById('st-lineqr-preview');
      if (prev) prev.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:contain">`;
      showToast('LINE QR uploaded ✓ — ใช้ได้ใน Settings → Invoice', 'success');
    };
    reader.readAsDataURL(inp.files[0]);
  };
  window.stClearLineQR = function() {
    const bs = window.stGetBS();
    if (bs) bs.lineQR = null;
    stShowSection('info');
  };

  /* ── MISC ACTIONS ────────────────────────────────────────── */
  window.stAddPhone = function() {
    const c=document.getElementById('st-phones'); if(!c) return;
    const d=document.createElement('div'); d.style.cssText='display:flex;gap:8px;margin-bottom:8px';
    d.innerHTML=`<input class="settings-input" placeholder="+66-xx-xxx-xxxx" style="flex:1">
      <button class="btn btn-secondary btn-sm" onclick="stRemovePhone(this)">${UI.icon('close','sm')}</button>`;
    c.appendChild(d);
  };
  window.stRemovePhone  = function(btn) { btn.closest('div').remove(); };
  window.stAddSocial = function() {
    const c=document.getElementById('st-social'); if(!c) return;
    const d=document.createElement('div'); d.style.cssText='display:flex;gap:8px;margin-bottom:8px';
    d.innerHTML=`<select class="settings-input" style="width:130px;flex-shrink:0">
      ${['Facebook','Instagram','TikTok','YouTube','Twitter','Line'].map(p=>`<option>${p}</option>`).join('')}</select>
      <input class="settings-input" placeholder="https://..." style="flex:1">
      <button class="btn btn-secondary btn-sm" onclick="stRemoveSocial(this)">${UI.icon('close','sm')}</button>`;
    c.appendChild(d);
  };
  window.stRemoveSocial = function(btn) { btn.closest('div').remove(); };

  /* ── ROOMS (named per branch — single source for whole app) ── */
  window.stAddRoom = function() {
    const bs=stGetBS(); if(!bs) return;
    stSyncRooms();
    (bs.rooms = bs.rooms || []).push({ name:'', active:true });
    const list=document.getElementById('st-rooms-list'); if(list) list.innerHTML=stRoomList(bs);
    document.querySelectorAll('.st-room-name')[bs.rooms.length-1]?.focus();
  };
  window.stRemoveRoom = function(btn) {
    const bs=stGetBS(); if(!bs) return;
    const row=btn.closest('.st-room-row'); const rows=[...document.querySelectorAll('.st-room-row')];
    const i=rows.indexOf(row); if(i<0) return;
    stSyncRooms();
    bs.rooms.splice(i,1);
    const list=document.getElementById('st-rooms-list'); if(list) list.innerHTML=stRoomList(bs);
  };

  /* ── SAVE ALL — เขียนกลับ DB.branchSettings จริง + sync ───── */
  window.stSaveAll = function() {
    const bs = window.stGetBS();
    if (bs && window._stSection === 'info') {
      const v = id => document.getElementById(id)?.value;
      if (v('st-schooltype')) bs.schoolType = v('st-schooltype');
      if (v('st-email')   !== undefined) bs.email   = v('st-email');
      if (v('st-lineid')  !== undefined) bs.lineId  = v('st-lineid');
      /* Location (mockup): Address 1/2 + lat/long · address เดิม = addr1 (module อื่นยังอ่าน bs.address) */
      bs.location = bs.location || {};
      if (v('st-addr1') !== undefined) { bs.location.addr1 = v('st-addr1'); bs.address = v('st-addr1'); }
      if (v('st-addr2') !== undefined) bs.location.addr2 = v('st-addr2');
      if (v('st-lat')   !== undefined) bs.location.lat   = v('st-lat');
      if (v('st-lng')   !== undefined) bs.location.lng   = v('st-lng');
      stSyncRooms();
      const phones = [...document.querySelectorAll('#st-phones input')]
        .map(i => i.value.trim()).filter(Boolean);
      if (phones.length) bs.phone = phones;
    }
    if (window.Sync) Sync.all();
    showToast('Settings saved ✓ — มีผลทั่วระบบแล้ว','success');
  };

  // stRenderGeneral() called at bottom of settings-catalog.js

})();
