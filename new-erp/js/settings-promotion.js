/* ============================================================
   settings-promotion.js — Settings ▸ Promotion (เมนูแยกของตัวเอง)
   ส่วนลดผูกกับ "Package" (ตาม mockup) — ต่างจาก promo เดิมที่คิดจาก threshold ชั่วโมง
   promo เดิม (type:'discount_pct') ยังอยู่และ Utils.applyPromotion ยังใช้ได้ปกติ
   ============================================================ */
(function () {

  /* ประเภทตาม mockup — #1/#2/#3/Others เผื่อ Nock นิยามเพิ่มทีหลัง */
  const P_TYPES = [
    { k:'pct',    label:'Discount (%)' },
    { k:'amount', label:'Discount (Amount)' },
    { k:'p1',     label:'Promotion #1' },
    { k:'p2',     label:'Promotion #2' },
    { k:'p3',     label:'Promotion #3' },
    { k:'other',  label:'Others' },
  ];
  const tLabel = k => (P_TYPES.find(t=>t.k===k)||{}).label || k;
  const gv = id => (document.getElementById(id)?.value || '').trim();
  const isNew = p => !!p.kind;                       // promo แบบใหม่ (ผูก package)
  const pkgName = id => (DB.packages||[]).find(p=>p.id===id)?.name || '—';
  const fmtD = d => d ? new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'2-digit'}) : '';
  let _pType = 'pct';

  /* ── PAGE ─────────────────────────────────────────────────── */
  window.stRenderPromotionPage = function(bs) {
    const list = (bs.promotions||[]);
    const cards = list.map((p,i) => isNew(p) ? newCard(bs,p,i) : legacyCard(bs,p,i)).join('');
    return `<div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div>
          <div style="font-weight:600">Promotion</div>
          <div class="text-muted" style="font-size:11px">Setup Promotion — ส่วนลดของสาขา ${bs.branch}</div>
        </div>
        <button class="btn btn-primary btn-sm" onclick="stPromoModal('${bs.branch}')">${UI.icon('add','sm')} Add Promotion</button>
      </div>
      ${list.length
        ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:10px">${cards}</div>`
        : UI.emptyState('sell','ยังไม่มีโปรโมชัน','กด Add Promotion เพื่อสร้าง')}
    </div>`;
  };

  /* การ์ดแบบใหม่ (ตาม mockup) */
  function newCard(bs, p, i) {
    const off = p.active === false;
    const disc = p.kind==='pct' ? `-${p.pct}%` : p.kind==='amount' ? `${(p.amount||0).toLocaleString()}.-` : '—';
    return `<div style="border:1.5px solid ${off?'var(--md-outline-variant)':'var(--md-primary)'};border-radius:10px;
      padding:10px 12px;background:${off?'var(--md-surface)':'var(--md-primary-container)'};${off?'opacity:.7':''}">
      <div style="display:flex;align-items:flex-start;gap:8px;margin-bottom:6px">
        <input type="checkbox" ${off?'':'checked'} style="accent-color:var(--md-primary);width:15px;height:15px;margin-top:2px"
          onchange="stPromoSet('${bs.branch}','${p.id}','active',this.checked)">
        <div style="flex:1;min-width:0">
          <div class="text-muted" style="font-size:10px">${tLabel(p.kind)}</div>
          <div style="font-weight:600;font-size:13px">${p.name||'—'}</div>
        </div>
        <span class="br-ord" title="แก้ไข" onclick="stPromoModal('${bs.branch}','${p.id}')">${UI.icon('edit','sm')}</span>
      </div>
      <div style="display:flex;gap:14px;margin-bottom:6px">
        <div><div class="text-muted" style="font-size:9px">Package</div>
          <div style="font-size:12px;font-weight:600">${pkgName(p.packageId)}</div></div>
        <div><div class="text-muted" style="font-size:9px">Discount</div>
          <div style="font-size:12px;font-weight:600">${disc}</div></div>
      </div>
      ${p.statedTotal?`<div style="font-size:10px;display:flex;align-items:center;gap:3px">${UI.icon('check','sm')} The total amount received is as stated.</div>`:''}
      <div class="text-muted" style="font-size:10px;display:flex;align-items:center;gap:3px">
        ${UI.icon(p.start?'event':'all_inclusive','sm')} ${p.start?`${fmtD(p.start)} → ${p.end?fmtD(p.end):'—'}`:'No End date'}</div>
    </div>`;
  }

  /* การ์ดของ promo เดิม (threshold ชั่วโมง) — ยังใช้กับบิลอยู่ ไม่ลบทิ้ง */
  function legacyCard(bs, p) {
    return `<div style="border:1.5px dashed var(--md-outline-variant);border-radius:10px;padding:10px 12px;${p.active===false?'opacity:.6':''}">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
        <input type="checkbox" ${p.active!==false?'checked':''} style="accent-color:var(--md-primary);width:15px;height:15px"
          onchange="stSetPromo('${bs.branch}','${p.id}','active',this.checked)">
        <span class="badge badge-purple" style="font-size:10px">−${p.pct}%</span>
        <span style="margin-left:auto">
          <span class="br-ord br-del" title="ลบ" onclick="stRemovePromotion('${bs.branch}','${p.id}')">${UI.icon('delete','sm')}</span></span>
      </div>
      <div style="font-size:12px;font-weight:600">ซื้อครบ ${p.thresholdHours} ชม.</div>
      <div class="text-muted" style="font-size:10px">แบบเดิม (คิดจากยอดชั่วโมง)${p.aggregate?' · รวมหลาย course':''}</div>
    </div>`;
  }

  /* ── CREATE / EDIT MODAL ──────────────────────────────────── */
  window.stPromoModal = function(branch, id) {
    const bs = window.stGetBS(branch); if(!bs) return;
    const p = id ? (bs.promotions||[]).find(x=>x.id===id) : null;
    _pType = p?.kind || 'pct';
    Modal.create('modal-st-promo',
      `${UI.icon(p?'edit':'settings','sm')} ${p?'Edit':'Create'} Promotion`,
      `<div style="font-weight:600;font-size:13px">Promotion Type</div>
      <div class="text-muted" style="font-size:11px;margin-bottom:8px">เลือก Type เพื่อแสดง Field ที่เหมาะสมตาม Promotion ที่เลือก</div>
      <div id="pm-types" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
        ${P_TYPES.map(t=>`<label id="pm-t-${t.k}" data-on="${t.k===_pType?'1':'0'}" onclick="stPromoType('${t.k}')"
          style="padding:5px 11px;border-radius:16px;cursor:pointer;font-size:11px;font-weight:500;
            border:1.5px solid ${t.k===_pType?'var(--md-primary)':'var(--md-outline-variant)'};
            background:${t.k===_pType?'var(--md-primary-container)':'transparent'};
            color:${t.k===_pType?'var(--md-primary)':'var(--md-on-surface-variant)'}">
          ${t.k===_pType?'✓ ':''}${t.label}</label>`).join('')}
      </div>
      <div class="settings-group"><label class="settings-label">Promotion Name (*Optional)</label>
        <input id="pm-name" class="settings-input" value="${p?.name||''}" placeholder="Ex. 'Special Discount for summer', 'Promo!'…"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div><label class="settings-label">Package</label>
          <select id="pm-pkg" class="settings-input">
            ${(DB.packages||[]).map(k=>`<option value="${k.id}" ${p?.packageId===k.id?'selected':''}>${k.name}</option>`).join('')}
          </select></div>
        <div id="pm-val-wrap"></div>
      </div>
      <label id="pm-stated-row" style="display:flex;align-items:center;gap:8px;padding:9px 11px;border-radius:8px;
        cursor:pointer;font-size:12px;margin-bottom:14px;background:${p?.statedTotal?'#fef3c7':'var(--md-surface-variant,#f1f1f4)'}">
        <input type="checkbox" id="pm-stated" ${p?.statedTotal?'checked':''} style="accent-color:var(--md-primary);width:15px;height:15px"
          onchange="document.getElementById('pm-stated-row').style.background=this.checked?'#fef3c7':'var(--md-surface-variant,#f1f1f4)'">
        <span style="color:${p?.statedTotal?'#92400e':'var(--md-on-surface-variant)'}">The total amount received is as stated.</span>
      </label>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <span style="font-weight:600;font-size:13px">Duration Period</span>
        <span class="text-muted" style="font-size:11px">Optional</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;border:1px solid var(--md-outline-variant);border-radius:8px;padding:8px 10px">
        ${UI.icon('schedule','sm')}
        <input type="date" id="pm-start" class="settings-input" style="border:none;flex:1;font-size:12px" value="${p?.start||''}">
        <span class="text-muted">→</span>
        <input type="date" id="pm-end" class="settings-input" style="border:none;flex:1;font-size:12px" value="${p?.end||''}">
      </div>
      <div class="text-muted" style="font-size:10px;margin-top:5px">เว้นว่าง = No End date (ใช้ตลอด)</div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-st-promo')">Cancel</button>
       <label style="display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;cursor:pointer">
         <input type="checkbox" id="pm-active" ${p?(p.active!==false?'checked':''):'checked'} style="width:15px;height:15px"> Active</label>
       ${id?`<button class="btn btn-secondary" onclick="stPromoDelete('${branch}','${id}')">${UI.icon('delete','sm')}</button>`:''}
       <button class="btn btn-primary" onclick="stPromoSave('${branch}','${id||''}')">
         ${UI.icon('check','sm')} ${p?'Save':'Create Promotion'}</button>`);
    stPromoType(_pType, p);
  };

  /* เปลี่ยน type → เปลี่ยน field ค่า (%, จำนวนเงิน หรือไม่มี) */
  window.stPromoType = function(k, p) {
    _pType = k;
    document.querySelectorAll('#pm-types label').forEach(el=>{
      const on = el.id === `pm-t-${k}`;
      el.dataset.on = on?'1':'0';
      el.style.borderColor = on?'var(--md-primary)':'var(--md-outline-variant)';
      el.style.background  = on?'var(--md-primary-container)':'transparent';
      el.style.color       = on?'var(--md-primary)':'var(--md-on-surface-variant)';
      el.textContent = (on?'✓ ':'') + tLabel(el.id.replace('pm-t-',''));
    });
    const w = document.getElementById('pm-val-wrap'); if(!w) return;
    const cur = p || {};
    w.innerHTML = k==='pct'
      ? `<label class="settings-label">Discount</label>
         <input id="pm-val" class="settings-input" value="${cur.pct!=null?'-'+cur.pct+'%':''}" placeholder="-20%">`
      : k==='amount'
      ? `<label class="settings-label">Amount</label>
         <input id="pm-val" class="settings-input" value="${cur.amount!=null?cur.amount:''}" placeholder="1,000.-">`
      : `<label class="settings-label">รายละเอียด</label>
         <input id="pm-val" class="settings-input" value="${cur.note||''}" placeholder="อธิบายเงื่อนไข">`;
  };

  window.stPromoSave = function(branch, id) {
    const bs = window.stGetBS(branch); if(!bs) return;
    bs.promotions = bs.promotions || [];
    const raw = gv('pm-val');
    const rec = {
      kind: _pType,
      name: gv('pm-name') || tLabel(_pType),
      packageId: gv('pm-pkg'),
      statedTotal: !!document.getElementById('pm-stated')?.checked,
      active: !!document.getElementById('pm-active')?.checked,
      start: gv('pm-start') || null,
      end: gv('pm-end') || null,
    };
    if (_pType==='pct')      rec.pct = Math.abs(parseFloat(raw.replace(/[^0-9.]/g,''))) || 0;
    else if (_pType==='amount') rec.amount = Math.abs(parseFloat(raw.replace(/[^0-9.]/g,''))) || 0;
    else rec.note = raw;
    if (rec.start && rec.end && rec.start > rec.end) return showToast('วันเริ่มต้องก่อนวันสิ้นสุด','warning');

    if (id) Object.assign(bs.promotions.find(x=>x.id===id)||{}, rec);
    else bs.promotions.push({ id:'promo-'+Date.now().toString(36), ...rec });
    Modal.close('modal-st-promo');
    stShowSection('promotion');
    showToast(`${id?'บันทึก':'สร้าง'}โปรโมชัน ${rec.name} ✓`,'success');
  };
  window.stPromoSet = function(branch, id, field, val) {
    const bs = window.stGetBS(branch); if(!bs) return;
    const p = (bs.promotions||[]).find(x=>x.id===id); if(!p) return;
    p[field] = val; stShowSection('promotion');
  };
  window.stPromoDelete = function(branch, id) {
    const bs = window.stGetBS(branch); if(!bs) return;
    bs.promotions = (bs.promotions||[]).filter(x=>x.id!==id);
    Modal.close('modal-st-promo'); stShowSection('promotion');
    showToast('ลบโปรโมชันแล้ว','info');
  };

})();
