/* ============================================================
   settings-catalog.js — Subjects, Grades, Packages
   ============================================================ */
(function () {

  /* ── SUBJECTS (branch scope — เปิด/ปิดจาก pool เท่านั้น) ──── */
  window.stRenderSubjects = function(bs) {
    const pool=DB.subjects||[], sel=bs?.subjects||[];
    return `<div style="max-width:920px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
        <div>
          <div style="font-size:17px;font-weight:600;margin-bottom:4px">Subjects — ${bs?.branch}</div>
          <div class="text-muted" style="font-size:13px">เลือกวิชาที่เปิดสอนในสาขานี้ · เพิ่ม/ลบวิชาทำที่ ${UI.icon('public','sm')} Global → Subjects Pool</div>
        </div>
      </div>
      <div>
        <div style="display:grid;grid-template-columns:1fr 72px 72px 40px;gap:0;
          border-bottom:1px solid var(--md-outline-variant);padding-bottom:6px;margin-bottom:2px">
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em" class="text-muted">Subject</div>
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;text-align:center" class="text-muted">Branch</div>
          <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;text-align:center" class="text-muted">Active</div>
          <div></div>
        </div>
        ${pool.map(subj=>{
          const e=sel.find(x=>x.subjectId===subj.id), inB=!!e;
          return `<div style="display:grid;grid-template-columns:1fr 72px 72px 40px;
            align-items:center;padding:10px 0;border-bottom:1px solid var(--md-outline-variant);
            opacity:${inB?1:0.55}">
            <div style="display:flex;align-items:center;gap:10px">
              <span class="badge badge-${subj.color||'blue'}" style="font-size:11px">${subj.name}</span>
              <span style="font-size:11px" class="text-muted">${subj.source==='default'?'Default':subj.source}</span>
            </div>
            <div style="text-align:center">
              <input type="checkbox" ${inB?'checked':''} style="accent-color:var(--md-primary);width:15px;height:15px;cursor:pointer"
                onchange="stToggleBranchSubject('${subj.id}',this.checked,'${bs?.branch}')">
            </div>
            <div style="text-align:center;${!inB?'pointer-events:none':''}">
              <input type="checkbox" ${inB&&e.active?'checked':''} style="accent-color:var(--md-primary);width:15px;height:15px;cursor:pointer"
                onchange="stToggleSubjectActive('${subj.id}',this.checked,'${bs?.branch}')">
            </div>
            <div></div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  };

  window.stToggleBranchSubject = function(subjectId, checked, branch) {
    const bs=window.stGetBS(branch); if(!bs) return;
    if(!bs.subjects) bs.subjects=[];
    if(checked&&!bs.subjects.find(x=>x.subjectId===subjectId)) bs.subjects.push({subjectId,active:true});
    else if(!checked) bs.subjects=bs.subjects.filter(x=>x.subjectId!==subjectId);
    stShowSection('subjects');
  };
  window.stToggleSubjectActive = function(subjectId, active, branch) {
    const bs=window.stGetBS(branch); if(!bs) return;
    const e=bs.subjects?.find(x=>x.subjectId===subjectId); if(e) e.active=active;
    stShowSection('subjects');
  };
  /* สีวิชา — swatch เลือกได้ทั้งตอนสร้างและแก้ทีหลัง */
  const SUBJ_COLORS = ['blue','green','orange','yellow','purple','red','teal','gray'];
  window._subjColor = 'blue';
  function colorSwatches(sel) {
    return `<div id="subj-swatches" style="display:flex;gap:7px;flex-wrap:wrap">
      ${SUBJ_COLORS.map(c=>`<span data-c="${c}" onclick="stPickSubjColor('${c}')"
        title="${c}" style="cursor:pointer;padding:4px 6px;border-radius:8px;
          border:2px solid ${c===sel?'var(--md-primary)':'transparent'};
          background:${c===sel?'var(--md-primary-container)':'transparent'};display:inline-flex">
        <span class="badge badge-${c}" style="font-size:10px;min-width:34px;text-align:center">Aa</span></span>`).join('')}
    </div>`;
  }
  window.stPickSubjColor = function(c) {
    window._subjColor = c;
    document.querySelectorAll('#subj-swatches [data-c]').forEach(el=>{
      const on = el.dataset.c===c;
      el.style.borderColor = on?'var(--md-primary)':'transparent';
      el.style.background  = on?'var(--md-primary-container)':'transparent';
    });
  };
  window.stAddSubject = function() {
    window._subjColor = 'blue';
    Modal.create('modal-add-subj',`${UI.icon('add_circle','sm')} Add Subject`,`
      <div class="modal-section">
        <div class="settings-group" style="margin-bottom:14px">
          <label class="settings-label">Subject Name</label>
          <input class="settings-input" id="new-subj-name" placeholder="e.g. Eng (Grammar)">
        </div>
        <div class="settings-group">
          <label class="settings-label" style="display:block;margin-bottom:7px">Color of Subject</label>
          ${colorSwatches('blue')}
          <div class="text-muted" style="font-size:10px;margin-top:7px">
            สีนี้ใช้ทั่วระบบ — Calendar / Sessions / Summaries / บิล</div>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-add-subj')">Cancel</button>
       <button class="btn btn-primary" onclick="stConfirmAddSubject()">Add Subject</button>`
    );
  };
  /* แก้สีวิชาที่มีอยู่แล้ว */
  window.stEditSubjColor = function(id) {
    const s = (DB.subjects||[]).find(x=>x.id===id); if(!s) return;
    window._subjColor = s.color||'blue';
    Modal.create('modal-edit-subj',`${UI.icon('palette','sm')} สีของ ${s.name}`,
      `<div class="modal-section">${colorSwatches(s.color||'blue')}</div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-edit-subj')">Cancel</button>
       <button class="btn btn-primary" onclick="stSaveSubjColor('${id}')">${UI.icon('check','sm')} บันทึกสี</button>`);
  };
  window.stSaveSubjColor = function(id) {
    const s = (DB.subjects||[]).find(x=>x.id===id); if(!s) return;
    s.color = window._subjColor;
    if (window.CONST?.SUBJECT_COLOR) CONST.SUBJECT_COLOR[s.name] = s.color;   // ให้ Calendar/Sessions เห็นทันที
    Modal.close('modal-edit-subj'); stShowSection('pool-subjects');
    showToast(`เปลี่ยนสี ${s.name} แล้ว ✓`,'success');
  };
  window.stConfirmAddSubject = function() {
    const name=document.getElementById('new-subj-name')?.value?.trim();
    const color=window._subjColor||'blue';
    if(!name){showToast('Enter subject name','warning');return;}
    if(DB.subjects.find(x=>x.name===name)){showToast('Subject already exists','warning');return;}
    /* Global scope = วิชากลาง (ทุกสาขาเลือกใช้ได้) · Branch scope = วิชาที่สาขาสร้างเอง */
    const src = window.ST_SCOPE==='global' ? 'default' : window.ST_BRANCH;
    DB.subjects.push({id:'subj-'+Date.now(),name,source:src,active:true,color});
    if (window.CONST?.SUBJECT_COLOR) CONST.SUBJECT_COLOR[name] = color;
    Modal.close('modal-add-subj');
    showToast(`"${name}" added ✓`,'success');
    stShowSection(window.ST_SCOPE==='global'?'pool-subjects':'subjects');
  };
  window.stRemoveSubject = function(id) {
    const i=DB.subjects?.findIndex(x=>x.id===id); if(i!==-1) DB.subjects.splice(i,1);
    showToast('Subject removed','info'); stShowSection('subjects');
  };

  /* ── GRADES ──────────────────────────────────────────────── */
  window.stRenderGrades = function(bs) {
    const pool=DB.gradesPool||[], sel=bs?.grades||[];
    const primary=pool.filter(g=>g.id.startsWith('g-p'));
    const middle =pool.filter(g=>g.id.startsWith('g-m'));
    return `<div style="max-width:560px">
      <div style="margin-bottom:18px">
        <div style="font-size:17px;font-weight:600;margin-bottom:4px">Grades</div>
        <div class="text-muted" style="font-size:13px">Select which grade levels this branch teaches</div>
      </div>

      <div style="margin-bottom:20px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;
          color:var(--md-on-surface-variant);margin-bottom:14px">Primary School</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${primary.map(g=>gradeCard(g,sel,bs)).join('')}
        </div>
      </div>

      <div>
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;
          color:var(--md-on-surface-variant);margin-bottom:14px">Middle School</div>
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          ${middle.map(g=>gradeCard(g,sel,bs)).join('')}
        </div>
      </div>

      <div class="text-muted" style="font-size:11px;margin-top:20px">
        ${UI.icon('info','sm')} Click to select · Click badge to toggle Active / Inactive
      </div>
    </div>`;
  };

  function gradeCard(g, sel, bs) {
    const e=sel.find(x=>x.gradeId===g.id), inB=!!e, active=inB&&e.active;
    const num=g.name.replace(/[^\d]/g,'');
    const border=!inB?'var(--md-outline-variant)':active?'var(--md-primary)':'var(--md-warning)';
    const bg=!inB?'var(--md-surface)':active?'var(--md-primary-container)':'var(--md-warning-container)';
    const col=!inB?'var(--md-on-surface-variant)':active?'var(--md-primary)':'var(--md-warning)';
    return `<div onclick="stToggleBranchGrade('${g.id}',${!inB},'${bs?.branch}')"
      style="width:76px;height:84px;border:2px solid ${border};border-radius:12px;
        display:flex;flex-direction:column;align-items:center;justify-content:center;
        cursor:pointer;transition:all .15s;background:${bg};user-select:none;gap:2px">
      <div style="font-size:26px;font-weight:700;line-height:1;color:${col}">${num}</div>
      <div style="font-size:10px;color:${col}">${g.name}</div>
      ${inB?`<div onclick="event.stopPropagation();stToggleGradeActive('${g.id}','${bs?.branch}')"
        style="font-size:9px;padding:1px 7px;border-radius:4px;margin-top:3px;
          background:${active?'var(--md-primary)':'var(--md-warning)'};color:#fff;cursor:pointer">
        ${active?'Active':'Inactive'}</div>`
      :`<div style="font-size:9px;color:var(--md-on-surface-variant)">—</div>`}
    </div>`;
  }

  window.stToggleBranchGrade = function(gradeId, checked, branch) {
    const bs=window.stGetBS(branch); if(!bs) return;
    if(!bs.grades) bs.grades=[];
    if(checked&&!bs.grades.find(x=>x.gradeId===gradeId)) bs.grades.push({gradeId,active:true});
    else if(!checked) bs.grades=bs.grades.filter(x=>x.gradeId!==gradeId);
    stShowSection('grades');
  };
  window.stToggleGradeActive = function(gradeId, branch) {
    const bs=window.stGetBS(branch); if(!bs) return;
    const e=bs.grades?.find(x=>x.gradeId===gradeId); if(e) e.active=!e.active;
    stShowSection('grades');
  };

  /* ── PACKAGES (branch scope) ─────────────────────────────── */
  /* bs.packageTypes = {hour:bool, week:bool} — เปิด type ที่สาขาขาย */
  function pkgTypes(bs){
    if(!bs.packageTypes) bs.packageTypes={ hour: bs.schoolType!=='Liclass', week:false, month: bs.schoolType==='Liclass' };
    if(bs.packageTypes.month===undefined) bs.packageTypes.month=false;
    return bs.packageTypes;
  }
  /* Hour/Week = มี package ย่อย · Month = ไม่มีไส้ใน (1 เดือน = วันที่ 1–30/31) */
  const PKG_TABS = [
    { key:'hour',  label:'Hour',  desc:'นับชั่วโมง · class มาตรฐาน 2h · โควตาลา = ชั่วโมง ÷ 8', hasItems:true },
    { key:'week',  label:'Week',  desc:'นับสัปดาห์ · class ยืดหยุ่น 30–90 นาที (ตารางประจำสัปดาห์)', hasItems:true },
    { key:'month', label:'Month', desc:'นับเป็นเดือนปฏิทิน — วันที่ 1 ถึงสิ้นเดือน (30/31)', hasItems:false },
  ];
  window._stPkgTab = window._stPkgTab || 'hour';
  window.stPkgTab = function(k){ window._stPkgTab=k; stShowSection('packages'); };
  window.stRenderPackages = function(bs) {
    const types=pkgTypes(bs);
    const tab=PKG_TABS.find(t=>t.key===window._stPkgTab)||PKG_TABS[0];
    const on=!!types[tab.key];
    const pool=(DB.packages||[]).filter(p=>p.type===tab.key);
    const sel=bs?.packages||[];
    const isLiclass = bs?.schoolType==='Liclass';

    /* หัว tab + master toggle ของ type นั้น */
    const head = `
      <div class="filter-bar" style="margin-bottom:16px">
        ${PKG_TABS.map(t=>`<div class="filter-chip ${t.key===tab.key?'active':''}" onclick="stPkgTab('${t.key}')">
          ${t.label}${types[t.key]?' ✓':''}</div>`).join('')}
      </div>
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:18px">
        ${window.stSwitch(on, `stTogglePkgType('${tab.key}','${bs?.branch}')`, on?'ปิด type นี้':'เปิด type นี้')}
        <div style="flex:1">
          <div style="font-weight:600">"${tab.label}" Packages Type${tab.key==='month'&&isLiclass?' <span class="text-muted" style="font-weight:400;font-size:11px">(Default for Liclass)</span>':''}</div>
          <div class="text-muted" style="font-size:11px">${tab.desc}</div>
        </div>
        ${on&&tab.hasItems?`<button class="btn btn-secondary btn-sm" onclick="stAddPkg('${tab.key}')">${UI.icon('add','sm')} Add Package</button>`:''}
      </div>`;

    /* Month = ไม่มี package ย่อย (Nock: 1 เดือน = วันที่ 1–30/31 · ไม่มี 1 Month/2 Months) */
    if (tab.key==='month') {
      return `<div style="max-width:920px">${head}
        ${!on?UI.emptyState('event_repeat','Month type ยังปิดอยู่','เปิด toggle ด้านบนเพื่อให้สาขานี้ขายแบบรายเดือน')
        :`<div style="background:var(--md-surface-low,#f5f6fa);border-radius:10px;padding:14px 16px;font-size:13px">
            ${UI.icon('info','sm')} <b>ไม่มี package ย่อยสำหรับ Month</b> — 1 รอบ = เดือนปฏิทิน (วันที่ 1 ถึงสิ้นเดือน)
            <div class="text-muted" style="font-size:11px;margin-top:6px">
              ไม่ต้องสร้าง 1 Month / 2 Months · นักเรียนจ่ายเป็นรายเดือน — ตั้งราคาต่อ Subject × Grade ด้านล่าง</div>
          </div>
          ${priceSection(bs,'month')}`}
      </div>`;
    }

    return `<div style="max-width:920px">${head}
      <div>
        ${!on?UI.emptyState('inventory_2',`${tab.label} type ยังปิดอยู่`,'เปิด toggle ด้านบนก่อน')
          :!pool.length?UI.emptyState('inventory_2','ยังไม่มี package','กด Add Package เพื่อสร้าง'):''}
        ${on?pool.map(pkg=>{
          const e=sel.find(x=>x.packageId===pkg.id), inB=!!e;
          return `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;
            border:1px solid var(--md-outline-variant);border-radius:10px;margin-bottom:8px;
            background:${inB?'var(--md-surface)':'var(--md-surface-lowest)'};opacity:${inB?1:0.6}">
            <span class="badge ${pkg.type==='hour'?'badge-blue':'badge-purple'}" style="font-size:10px;flex-shrink:0">${pkg.type}</span>
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:500">${pkg.name}</div>
              <div class="text-muted" style="font-size:11px">
                ${pkg.type==='hour'?`${pkg.hours}h · ${pkg.leaveQuota} leaves`:`${pkg.weeks||4} weeks · fixed schedule`} · global ${Utils.currency(pkg.price)}
              </div>
            </div>
            <label style="display:flex;flex-direction:column;gap:3px;${!inB?'opacity:.4;pointer-events:none':''}">
              <span style="font-size:9px" class="text-muted">Branch Price (฿)</span>
              <input type="number" class="settings-input" style="width:92px;font-size:12px;padding:4px 8px"
                value="${e?.price??pkg.price}" min="0"
                onchange="stSetPackagePrice('${pkg.id}',this.value,'${bs?.branch}')">
            </label>
            <label style="display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer">
              <span style="font-size:9px" class="text-muted">Branch</span>
              <input type="checkbox" ${inB?'checked':''} style="accent-color:var(--md-primary);width:15px;height:15px"
                onchange="stToggleBranchPackage('${pkg.id}',this.checked,'${bs?.branch}')">
            </label>
            <label style="display:flex;flex-direction:column;align-items:center;gap:3px;
              cursor:pointer;${!inB?'opacity:.4;pointer-events:none':''}">
              <span style="font-size:9px" class="text-muted">Active</span>
              <input type="checkbox" ${inB&&e.active?'checked':''} style="accent-color:var(--md-primary);width:15px;height:15px"
                onchange="stTogglePackageActive('${pkg.id}',this.checked,'${bs?.branch}')">
            </label>
          </div>`;
        }).join(''):''}
      </div>
      ${on?priceSection(bs, tab.key):''}
    </div>`;
  };

  /* ── PRICE SETTING — อยู่หน้าเดียวกับ Packages (Nock: มันคือเรื่องเดียวกัน) ──
     แสดง matrix ของ type ที่กำลังดูอยู่ (Hour = ราย 24/48/72/96h · Month = ราคา/เดือน) */
  function priceSection(bs, type) {
    return `<div style="border-top:1px solid var(--md-outline-variant);margin-top:22px;padding-top:18px">
      <div style="font-weight:600;margin-bottom:2px">Price setting</div>
      <div class="text-muted" style="font-size:11px;margin-bottom:14px">
        Reflect from Grades &amp; Subjects · ช่องว่าง = inherit ราคา tier · กรอก = ราคาเฉพาะสาขานี้</div>
      ${window.stRenderPriceMatrix ? stRenderPriceMatrix(bs, type) : '<div class="text-muted">—</div>'}
    </div>`;
  }

  /* ── PROMOTIONS (branch-level) — discount ตามยอดชั่วโมงรวม ───── */
  function stRenderPromotions(bs) {
    const list = bs.promotions || [];
    const ip = 'width:60px;font-size:12px;padding:4px 6px';
    const rows = list.map(p => `
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 12px;
        border:1px solid var(--md-outline-variant);border-radius:10px;margin-bottom:8px;
        ${p.active===false?'opacity:.55':''}">
        <span class="badge badge-purple" style="font-size:10px;flex-shrink:0">−${p.pct}%</span>
        <label style="display:flex;align-items:center;gap:5px;font-size:12px">เมื่อถึง
          <input type="number" min="1" value="${p.thresholdHours}" class="settings-input" style="${ip}"
            onchange="stSetPromo('${bs.branch}','${p.id}','thresholdHours',this.value)"> ชม.</label>
        <label style="display:flex;align-items:center;gap:5px;font-size:12px">ลด
          <input type="number" min="0" max="100" value="${p.pct}" class="settings-input" style="${ip}"
            onchange="stSetPromo('${bs.branch}','${p.id}','pct',this.value)"> %</label>
        <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer">
          <input type="checkbox" ${p.aggregate?'checked':''} style="accent-color:var(--md-primary)"
            onchange="stSetPromo('${bs.branch}','${p.id}','aggregate',this.checked)"> รวมหลาย course</label>
        <label style="display:flex;align-items:center;gap:5px;font-size:12px;cursor:pointer">
          <input type="checkbox" ${p.active!==false?'checked':''} style="accent-color:var(--md-primary)"
            onchange="stSetPromo('${bs.branch}','${p.id}','active',this.checked)"> เปิดใช้</label>
        <button class="btn btn-secondary btn-sm" style="margin-left:auto"
          onclick="stRemovePromotion('${bs.branch}','${p.id}')">${UI.icon('delete','sm')}</button>
      </div>`).join('');
    return `<div style="margin-top:28px">
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:4px" class="text-muted">Promotions</div>
      <div class="text-muted" style="font-size:12px;margin-bottom:10px">
        ส่วนลดตามยอดชั่วโมงรวมของการซื้อ — "รวมหลาย course" = รวม hours ข้าม course/bundle ได้ · เลือกเกณฑ์สูงสุดที่ถึง</div>
      ${list.length ? rows : `<div class="text-muted" style="font-size:12px;margin-bottom:8px">ยังไม่มีโปรโมชัน</div>`}
      <button class="btn btn-secondary btn-sm" style="margin-top:4px" onclick="stAddPromotion('${bs.branch}')">
        ${UI.icon('add','sm')} เพิ่มโปรโมชัน</button>
    </div>`;
  }

  window.stAddPromotion = function(branch) {
    const bs = window.stGetBS(branch); if (!bs) return;
    bs.promotions = bs.promotions || [];
    bs.promotions.push({ id:'promo-'+Date.now().toString(36), type:'discount_pct',
      thresholdHours:72, pct:10, aggregate:true, active:true });
    stShowSection('packages');
  };
  window.stSetPromo = function(branch, id, field, value) {
    const bs = window.stGetBS(branch); if (!bs) return;
    const p = (bs.promotions||[]).find(x => x.id === id); if (!p) return;
    if (field === 'thresholdHours' || field === 'pct') p[field] = parseInt(value) || 0;
    else p[field] = value;
    stShowSection('packages');
  };
  window.stRemovePromotion = function(branch, id) {
    const bs = window.stGetBS(branch); if (!bs) return;
    bs.promotions = (bs.promotions||[]).filter(x => x.id !== id);
    stShowSection('packages');
  };

  /* สร้าง package ใหม่เข้า pool กลาง (Hour/Week เท่านั้น — Month ไม่มีไส้ใน) */
  window.stAddPkg = function(type) {
    const isH = type==='hour';
    Modal.create('modal-st-addpkg', `${UI.icon('add','sm')} Add ${isH?'Hour':'Week'} Package`,
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div><label class="settings-label">${isH?'จำนวนชั่วโมง':'จำนวนสัปดาห์'} *</label>
          <input id="ap-n" type="number" class="settings-input" placeholder="${isH?'24':'4'}" min="1"></div>
        <div><label class="settings-label">ราคากลาง (฿)</label>
          <input id="ap-price" type="number" class="settings-input" placeholder="7200" min="0"></div>
      </div>
      <div class="settings-hint">${UI.icon('info','sm')} ${isH
        ? 'โควตาลาคิดอัตโนมัติ = ชั่วโมง ÷ 8 · class มาตรฐาน 2h'
        : 'สัปดาห์ = เรียนตามตารางประจำสัปดาห์ · ไม่นับชั่วโมง'} · สาขาปรับราคาเองได้ทีหลัง</div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-st-addpkg')">Cancel</button>
       <button class="btn btn-primary" onclick="stAddPkgSave('${type}')">${UI.icon('check','sm')} Add</button>`);
  };
  window.stAddPkgSave = function(type) {
    const n = +(document.getElementById('ap-n')?.value||0);
    const price = +(document.getElementById('ap-price')?.value||0);
    if (!n) return showToast('ใส่จำนวนก่อน','warning');
    const isH = type==='hour';
    const id = isH ? `pkg-${n}h` : `pkg-${n}w`;
    if ((DB.packages||[]).some(p=>p.id===id)) return showToast('มี package นี้อยู่แล้ว','warning');
    DB.packages.push(isH
      ? { id, type:'hour', name:`${n}h Package`, hours:n, price, leaveQuota:Math.floor(n/8), source:'custom', active:true }
      : { id, type:'week', name:`${n}-Week Course`, weeks:n, hours:0, price, leaveQuota:0, source:'custom', active:true });
    Modal.close('modal-st-addpkg');
    if (window.Sync) Sync.branchPricing();
    stShowSection('packages');
    showToast(`เพิ่ม ${isH?n+'h':n+' weeks'} package แล้ว ✓`,'success');
  };

  window.stTogglePkgType = function(key, branch) {
    const bs=window.stGetBS(branch); if(!bs) return;
    pkgTypes(bs)[key]=!pkgTypes(bs)[key];
    if(window.Sync) Sync.branchPricing();
    stShowSection('packages');
  };

  window.stToggleBranchPackage = function(packageId, checked, branch) {
    const bs=window.stGetBS(branch); if(!bs) return;
    if(!bs.packages) bs.packages=[];
    if(checked&&!bs.packages.find(x=>x.packageId===packageId)) bs.packages.push({packageId,active:true});
    else if(!checked) bs.packages=bs.packages.filter(x=>x.packageId!==packageId);
    if(window.Sync) Sync.branchPricing();
    stShowSection('packages');
  };
  window.stTogglePackageActive = function(packageId, active, branch) {
    const bs=window.stGetBS(branch); if(!bs) return;
    const e=bs.packages?.find(x=>x.packageId===packageId); if(e) e.active=active;
    if(window.Sync) Sync.branchPricing();
    stShowSection('packages');
  };
  /* Per-branch price override → flows to Billing/Invoice via Sync */
  window.stSetPackagePrice = function(packageId, value, branch) {
    const bs=window.stGetBS(branch); if(!bs) return;
    const e=bs.packages?.find(x=>x.packageId===packageId); if(!e) return;
    const price=parseInt(value)||0;
    const pkg=(DB.packages||[]).find(p=>p.id===packageId);
    if(pkg && price===pkg.price) delete e.price;   // same as global → no override
    else e.price=price;
    if(window.Sync) Sync.branchPricing();
    showToast(`Price updated — ${bs.branch} ✓`,'success');
  };
  window.stAddPackage = function() {
    Modal.create('modal-add-pkg',`${UI.icon('add_circle','sm')} Add Package`,`
      <div class="modal-section">
        <div class="settings-group" style="margin-bottom:12px">
          <label class="settings-label">Package Type</label>
          <select class="settings-input" id="new-pkg-type" onchange="stPkgTypeChange(this.value)">
            <option value="hour">Hour — นับชั่วโมง (class 2h มาตรฐาน)</option>
            <option value="week">Week — นับสัปดาห์ (Liclass: class 30/50/75/90 นาทีได้)</option>
          </select>
        </div>
        <div id="new-pkg-hours-row" class="settings-group" style="margin-bottom:12px">
          <label class="settings-label">Hours</label>
          <input class="settings-input" type="number" id="new-pkg-hours" placeholder="e.g. 36" min="1">
        </div>
        <div id="new-pkg-weeks-row" class="settings-group" style="margin-bottom:12px;display:none">
          <label class="settings-label">Weeks per Course</label>
          <input class="settings-input" type="number" id="new-pkg-weeks" value="4" min="1">
          <div class="settings-hint">เรียนตามตารางประจำสัปดาห์ของ Course จนครบ — หักโควต้าเป็นสัปดาห์</div>
        </div>
        <div class="settings-row" style="margin-bottom:0">
          <div class="settings-group">
            <label class="settings-label">Price (฿)</label>
            <input class="settings-input" type="number" id="new-pkg-price" placeholder="e.g. 10800">
          </div>
          <div class="settings-group">
            <label class="settings-label">Leave Quota</label>
            <input class="settings-input" type="number" id="new-pkg-leave" placeholder="e.g. 4">
          </div>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-add-pkg')">Cancel</button>
       <button class="btn btn-primary" onclick="stConfirmAddPackage()">Add Package</button>`
    );
  };
  window.stPkgTypeChange = function(type) {
    const hr=document.getElementById('new-pkg-hours-row');
    const wr=document.getElementById('new-pkg-weeks-row');
    if(hr) hr.style.display=type==='week'?'none':'';
    if(wr) wr.style.display=type==='week'?'':'none';
  };
  window.stConfirmAddPackage = function() {
    const type=document.getElementById('new-pkg-type')?.value||'hour';
    const hours=type==='hour'?parseInt(document.getElementById('new-pkg-hours')?.value)||0:0;
    const weeks=type==='week'?parseInt(document.getElementById('new-pkg-weeks')?.value)||4:0;
    const price=parseInt(document.getElementById('new-pkg-price')?.value)||0;
    const leaveQuota=parseInt(document.getElementById('new-pkg-leave')?.value)||0;
    if(type==='hour'&&!hours){showToast('Enter hours','warning');return;}
    if(!price){showToast('Enter price','warning');return;}
    const name=type==='hour'?`${hours}h Package`:`${weeks}-Week Course`;
    DB.packages.push({id:'pkg-'+Date.now(),type,name,hours,weeks,price,leaveQuota,source:window.ST_BRANCH,active:true});
    if(window.Sync) Sync.branchPricing();
    Modal.close('modal-add-pkg');
    showToast(`"${name}" added ✓`,'success');
    stShowSection('packages');
  };
  window.stRemovePackage = function(id) {
    const i=DB.packages?.findIndex(x=>x.id===id); if(i!==-1) DB.packages.splice(i,1);
    if(window.Sync) Sync.branchPricing();
    showToast('Package removed','info'); stShowSection('packages');
  };

  /* ════════════════════════════════════════════════════════
     GLOBAL SCOPE — pools ของทั้งบริษัท (Director เท่านั้น)
     ════════════════════════════════════════════════════════ */

  /* ── SUBJECTS POOL ───────────────────────────────────────── */
  window.stRenderPoolSubjects = function() {
    const pool=DB.subjects||[];
    const usedIn = id => (DB.branchSettings||[]).filter(b=>b.subjects?.some(x=>x.subjectId===id)).map(b=>b.branch);
    return `<div style="max-width:920px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
        <div>
          <div style="font-size:17px;font-weight:600;margin-bottom:4px">Subjects Pool</div>
          <div class="text-muted" style="font-size:13px">วิชาทั้งหมดของบริษัท — สาขาเลือกเปิดใช้จากที่นี่</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="stAddSubject()">${UI.icon('add','sm')} Add Subject</button>
      </div>
      ${pool.map(subj=>{
        const branches=usedIn(subj.id);
        return `<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;
          border:1px solid var(--md-outline-variant);border-radius:10px;margin-bottom:8px;background:var(--md-surface)">
          <span class="badge badge-${subj.color||'blue'}">${subj.name}</span>
          <span class="text-muted" style="font-size:11px;flex:1">
            ${subj.source==='default'?'Default':'สร้างโดย '+subj.source}
            · ใช้ใน: ${branches.length?branches.join(', '):'<span class="text-warning">ยังไม่มีสาขาเปิดใช้</span>'}
          </span>
          <button class="btn btn-secondary btn-sm" title="เปลี่ยนสี"
            onclick="stEditSubjColor('${subj.id}')">${UI.icon('palette','sm')}</button>
          ${subj.source!=='default'&&!branches.length
            ?`<button class="btn btn-secondary btn-sm" onclick="stRemoveSubject('${subj.id}')">${UI.icon('delete','sm')}</button>`
            :`<span class="text-muted" style="font-size:10px">${branches.length?UI.icon('lock','sm'):''}</span>`}
        </div>`;
      }).join('')}
      <div class="text-muted" style="font-size:11px;margin-top:12px">
        ${UI.icon('info','sm')} วิชาที่มีสาขาเปิดใช้อยู่จะลบไม่ได้ — ปิดที่สาขาก่อน
      </div>
    </div>`;
  };

  /* ── GRADES POOL ─────────────────────────────────────────── */
  window.stRenderPoolGrades = function() {
    const pool=DB.gradesPool||[];
    const group=(label,items)=>`
      <div style="margin-bottom:24px">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;
          color:var(--md-on-surface-variant);margin-bottom:10px">${label}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          ${items.map(g=>`<div onclick="stPoolToggleGrade('${g.id}')"
            style="padding:8px 16px;border:2px solid ${g.active?'var(--md-primary)':'var(--md-outline-variant)'};
              border-radius:10px;cursor:pointer;font-size:13px;font-weight:600;
              background:${g.active?'var(--md-primary-container)':'var(--md-surface-lowest)'};
              color:${g.active?'var(--md-primary)':'var(--md-on-surface-variant)'}">${g.name}</div>`).join('')}
        </div>
      </div>`;
    return `<div style="max-width:560px">
      <div style="margin-bottom:18px">
        <div style="font-size:17px;font-weight:600;margin-bottom:4px">Grades Pool</div>
        <div class="text-muted" style="font-size:13px">ระดับชั้นที่บริษัทรองรับ — คลิกเพื่อเปิด/ปิดทั้งระบบ</div>
      </div>
      ${group('Primary School', pool.filter(g=>g.id.startsWith('g-p')))}
      ${group('Middle / High School', pool.filter(g=>g.id.startsWith('g-m')))}
    </div>`;
  };
  window.stPoolToggleGrade = function(id) {
    const g=(DB.gradesPool||[]).find(x=>x.id===id); if(!g) return;
    g.active=!g.active; stShowSection('pool-grades');
  };

  /* ── PACKAGES & TIERS (global) ───────────────────────────── */
  window.stRenderPoolPackages = function() {
    const pool=DB.packages||[];
    const row=pkg=>`<div style="display:flex;align-items:center;gap:12px;padding:12px 14px;
        border:1px solid var(--md-outline-variant);border-radius:10px;margin-bottom:8px;background:var(--md-surface)">
      <span class="badge ${pkg.type==='hour'?'badge-blue':'badge-purple'}" style="font-size:10px">${pkg.type}</span>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500">${pkg.name}</div>
        <div class="text-muted" style="font-size:11px">
          ${pkg.type==='hour'?`${pkg.hours}h · leave quota ${pkg.leaveQuota}`:`${pkg.weeks||4} weeks · fixed schedule · class 30–90 นาที`}
        </div>
      </div>
      <label style="display:flex;flex-direction:column;gap:3px">
        <span style="font-size:9px" class="text-muted">Default Price (฿)</span>
        <input type="number" class="settings-input" style="width:100px;font-size:12px;padding:4px 8px"
          value="${pkg.price}" min="0" onchange="stSetGlobalPkgPrice('${pkg.id}',this.value)">
      </label>
      ${pkg.source!=='default'?`<button class="btn btn-secondary btn-sm" onclick="stRemovePackage('${pkg.id}')">${UI.icon('delete','sm')}</button>`:''}
    </div>`;
    return `<div style="max-width:920px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">
        <div>
          <div style="font-size:17px;font-weight:600;margin-bottom:4px">Packages & Tiers</div>
          <div class="text-muted" style="font-size:13px">นิยาม type + tier + ราคา default ทั้งบริษัท · สาขาเปิดใช้/override เองที่หน้าสาขา</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="stAddPackage()">${UI.icon('add','sm')} Add Package</button>
      </div>
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px" class="text-muted">Hour Tiers</div>
      ${pool.filter(p=>p.type==='hour').map(row).join('')}
      <div style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;margin:18px 0 8px" class="text-muted">Week (Liclass)</div>
      ${pool.filter(p=>p.type==='week').map(row).join('')||'<div class="text-muted" style="font-size:12px">ยังไม่มี — กด Add Package เลือก type Week</div>'}
    </div>`;
  };
  window.stSetGlobalPkgPrice = function(id, value) {
    const p=(DB.packages||[]).find(x=>x.id===id); if(!p) return;
    p.price=parseInt(value)||0;
    if(window.Sync) Sync.branchPricing();
    showToast(`${p.name} default = ${Utils.currency(p.price)} ✓ (สาขาที่ override ไว้ไม่เปลี่ยน)`,'success');
  };

  /* Price Matrix → js/settings-pricematrix.js (แยกไฟล์ — กฎ 500 บรรทัด) */

  /* ── INIT ────────────────────────────────────────────────── */
  /* Director/AreaMgr → Branch list ก่อน · role อื่น → เข้าสาขาตัวเอง (settings.js) */
  window.stRenderSettings();

})();
