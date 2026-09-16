/* ============================================================
   settings-hours.js — Scheduling: Operating Hours, Special, Holidays
   ============================================================ */
(function () {

  const DOW=[{dow:1,l:'Monday',s:'Mon'},{dow:2,l:'Tuesday',s:'Tue'},
             {dow:3,l:'Wednesday',s:'Wed'},{dow:4,l:'Thursday',s:'Thu'},
             {dow:5,l:'Friday',s:'Fri'},{dow:6,l:'Saturday',s:'Sat'},
             {dow:0,l:'Sunday',s:'Sun'}];
  window._stSchedTab = window._stSchedTab || 'hours';
  window._stRHDay    = window._stRHDay    ?? 1;

  /* ── SCHEDULING SECTION ──────────────────────────────────── */
  window.stRenderScheduling = function(bs) {
    const tabs=[
      {key:'hours',   icon:'schedule',       label:'Operating'},
      {key:'special', icon:'event_note',      label:'Special'},
      {key:'holidays',icon:'calendar_month',  label:'Holidays'},
    ];
    return `<div>
      <div class="filter-bar" style="margin-bottom:18px">
        ${tabs.map(t=>{
          const on=window._stSchedTab===t.key;
          return `<div class="filter-chip ${on?'active':''}" onclick="stSwitchSchedTab('${t.key}')">
            ${UI.icon(t.icon,'sm')} ${t.label}</div>`;
        }).join('')}
      </div>
      <div id="st-sched-panel">${stRenderSchedContent(window._stSchedTab||'hours',bs)}</div>
    </div>`;
  };

  window.stSwitchSchedTab = function(key) {
    window._stSchedTab=key;
    /* Global scope: Holidays render เดี่ยวๆ ผ่าน section router */
    if (window.ST_SCOPE==='global') { stShowSection('holidays'); return; }
    const bs=window.stGetBS();
    const panel=document.getElementById('st-panel');
    if(panel) panel.innerHTML=stRenderScheduling(bs);
  };

  window.stRenderSchedContent = stRenderSchedContentFn;
  function stRenderSchedContentFn(key, bs) { return stRenderSchedContent(key, bs); }

  function stRenderSchedContent(key, bs) {
    switch(key){
      case 'hours':    return stRenderOperatingHours(bs);
      case 'special':  return window.stRenderSpecialSchedules(bs);
      case 'holidays': return window.stRenderCalendarHolidays(bs);
      default: return '';
    }
  }

  /* ── OPERATING HOURS — side-panel layout ─────────────────── */
  /* ── OPERATING SCHEDULE — แถวเดียวจบต่อวัน ───────────────────
     ≡ drag เรียงลำดับ · Open/Close time · toggle เปิด-ปิด
     วันที่ปิด = จาง + ตกไปอยู่ล่างสุดอัตโนมัติ */
  const TIME_OPTS = (() => {
    const out = [];
    for (let h = 6; h <= 23; h++) for (const m of ['00', '30']) out.push(`${String(h).padStart(2, '0')}:${m}`);
    return out;
  })();
  const timeField = (label, val, onchange, dis) => `
    <div style="position:relative;flex:1;max-width:170px">
      <span style="position:absolute;top:-6px;left:9px;background:var(--md-surface);padding:0 4px;font-size:10px;
        color:var(--md-on-surface-variant);z-index:1">${label}</span>
      <div style="display:flex;align-items:center;gap:5px;border:1px solid var(--md-outline-variant);
        border-radius:8px;padding:0 8px;height:42px;background:var(--md-surface);${dis?'opacity:.5':''}">
        ${UI.icon('schedule','sm')}
        <select ${dis?'disabled':''} onchange="${onchange}"
          style="flex:1;border:none;background:none;font-size:13px;font-weight:600;outline:none;cursor:${dis?'default':'pointer'}">
          ${TIME_OPTS.map(t=>`<option ${t===val?'selected':''}>${t}</option>`).join('')}
        </select>
      </div>
    </div>`;

  function stRenderOperatingHours(bs) {
    const rh = bs?.regularHours || [];
    /* เปิดก่อน (ตามลำดับใน array) → ปิดต่อท้าย */
    const ordered = [...rh.filter(d => d.open), ...rh.filter(d => !d.open)];
    const rows = ordered.map(day => {
      const d = DOW.find(x => x.dow === day.dow) || { l: day.label };
      const sl = (day.slots && day.slots[0]) || { start: '09:00', end: '18:00' };
      const off = !day.open;
      return `<div class="st-day-row" draggable="${off?'false':'true'}" data-dow="${day.dow}"
        ondragstart="stRHDragStart(event,${day.dow})" ondragover="stRHDragOver(event)" ondrop="stRHDrop(event,${day.dow})"
        style="display:flex;align-items:center;gap:14px;padding:12px 14px;border:1px solid var(--md-outline-variant);
          border-radius:12px;margin-bottom:8px;background:${off?'var(--md-surface-variant,#f3f2f7)':'var(--md-surface)'}">
        <span style="cursor:${off?'default':'grab'};color:var(--md-on-surface-variant);${off?'opacity:.4':''}"
          title="${off?'เปิดวันนี้ก่อนถึงจะจัดลำดับได้':'ลากเพื่อจัดลำดับ'}">${UI.icon('drag_indicator','sm')}</span>
        <div style="width:110px;font-weight:600;${off?'opacity:.55':''}">${d.l}</div>
        ${timeField('Open time',  sl.start, `stRHTime(${day.dow},'start',this.value)`, off)}
        ${timeField('Close time', sl.end,   `stRHTime(${day.dow},'end',this.value)`,   off)}
        ${window.stSwitch(day.open, `stRHToggle(${day.dow},${!day.open})`, day.open?'ปิดวันนี้':'เปิดวันนี้')}
      </div>`;
    }).join('');

    return `<div>
      <div style="margin-bottom:6px;font-size:16px;font-weight:600">Operating Schedule</div>
      <div class="text-muted" style="font-size:13px;margin-bottom:16px">Setup your Branch Operating Schedule</div>
      <div id="st-rh-list">${rows}</div>
      <div class="text-muted" style="font-size:11px;margin-top:10px">
        ${UI.icon('info','sm')} ลาก ≡ เพื่อจัดลำดับวัน · วันที่ปิดจะตกไปอยู่ล่างสุด · Calendar ใช้เวลานี้เป็นกรอบการจัดคลาส</div>
    </div>`;
  }

  function stRenderDayEditor(day, dow) {
    const d=DOW.find(x=>x.dow===dow);
    return `<div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div style="font-size:16px;font-weight:600">${d?.l||''}</div>
        <label style="display:flex;align-items:center;gap:8px;cursor:pointer">
          <input type="checkbox" ${day.open?'checked':''} style="accent-color:var(--md-primary);width:16px;height:16px"
            onchange="stRHToggle(${dow},this.checked)">
          <span style="font-size:13px">${day.open?'Open':'Closed'}</span>
        </label>
      </div>
      ${day.open ? `
        <div style="margin-bottom:20px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
            color:var(--md-on-surface-variant);margin-bottom:10px">Time Slots</div>
          ${(day.slots||[]).map(sl=>`
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
              <input type="time" value="${sl.start}"
                style="width:112px;font-size:13px;border:1px solid var(--md-outline-variant);
                  border-radius:8px;padding:7px 10px;background:var(--md-surface)">
              <span class="text-muted" style="font-size:12px">to</span>
              <input type="time" value="${sl.end}"
                style="width:112px;font-size:13px;border:1px solid var(--md-outline-variant);
                  border-radius:8px;padding:7px 10px;background:var(--md-surface)">
            </div>`).join('')}
        </div>
        <div style="margin-bottom:20px">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;
            color:var(--md-on-surface-variant);margin-bottom:10px">
            Breaks <span style="font-weight:400;font-style:italic;text-transform:none">(block scheduling)</span>
          </div>
          ${(day.breaks||[]).map(br=>`
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
              <input type="time" value="${br.start}"
                style="width:112px;font-size:13px;border:1px solid var(--md-outline-variant);
                  border-radius:8px;padding:7px 10px;background:var(--md-warning-container)">
              <span class="text-muted" style="font-size:12px">to</span>
              <input type="time" value="${br.end}"
                style="width:112px;font-size:13px;border:1px solid var(--md-outline-variant);
                  border-radius:8px;padding:7px 10px;background:var(--md-warning-container)">
              <span style="font-size:11px;color:var(--md-warning)">${br.label}</span>
            </div>`).join('')}
          <button class="btn btn-secondary btn-sm" onclick="stRHAddBreak(${dow})">
            ${UI.icon('add','sm')} Add Break</button>
        </div>
        <div style="border-top:1px solid var(--md-outline-variant);padding-top:16px">
          <div style="font-size:11px;color:var(--md-on-surface-variant);margin-bottom:8px">Copy this schedule to:</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-secondary btn-sm" onclick="stRHCopy(${dow},'weekdays')">Weekdays</button>
            <button class="btn btn-secondary btn-sm" onclick="stRHCopy(${dow},'weekend')">Weekend</button>
          </div>
        </div>
      ` : `<div class="text-muted" style="font-size:13px;padding-top:4px">
        This day is marked as closed. Toggle on to configure hours.
      </div>`}
    </div>`;
  }

  window.stRHSelectDay = function(dow) {
    window._stRHDay=dow;
    const bs=window.stGetBS();
    const panel=document.getElementById('st-panel');
    if(panel) panel.innerHTML=stRenderScheduling(bs);
  };
  window.stRHToggle = function(dow, open) {
    const bs=window.stGetBS(); if(!bs) return;
    const day=bs.regularHours?.find(x=>x.dow===dow);
    if(day){
      day.open=open;
      if(open&&(!day.slots||!day.slots.length)) day.slots=[{start:'10:00',end:'20:00'}];
      /* ปิด → ย้ายไปท้าย array (ให้ตกไปอยู่ล่างสุด · ลำดับวันเปิดคงเดิม) */
      if(!open){ const i=bs.regularHours.indexOf(day); bs.regularHours.splice(i,1); bs.regularHours.push(day); }
    }
    const panel=document.getElementById('st-panel');
    if(panel) panel.innerHTML=stRenderScheduling(bs);
  };
  /* แก้เวลาเปิด/ปิดจากแถว */
  window.stRHTime = function(dow, which, val) {
    const bs=window.stGetBS(); if(!bs) return;
    const day=bs.regularHours?.find(x=>x.dow===dow); if(!day) return;
    if(!day.slots||!day.slots.length) day.slots=[{start:'09:00',end:'18:00'}];
    day.slots[0][which]=val;
    if(day.slots[0].start >= day.slots[0].end) showToast('เวลาปิดต้องหลังเวลาเปิด','warning');
  };
  /* ── DRAG REORDER ─────────────────────────────────────────── */
  let _dragDow = null;
  window.stRHDragStart = function(e, dow) { _dragDow = dow; e.dataTransfer.effectAllowed='move'; };
  window.stRHDragOver  = function(e) { e.preventDefault(); e.dataTransfer.dropEffect='move'; };
  window.stRHDrop = function(e, targetDow) {
    e.preventDefault();
    const bs=window.stGetBS(); if(!bs||_dragDow===null||_dragDow===targetDow) return;
    const rh=bs.regularHours;
    const from=rh.findIndex(d=>d.dow===_dragDow), to=rh.findIndex(d=>d.dow===targetDow);
    if(from<0||to<0) return;
    const [moved]=rh.splice(from,1); rh.splice(to,0,moved);
    _dragDow=null;
    const panel=document.getElementById('st-panel');
    if(panel) panel.innerHTML=stRenderScheduling(bs);
  };
  window.stRHAddBreak = function(dow) {
    const bs=window.stGetBS(); if(!bs) return;
    const day=bs.regularHours?.find(x=>x.dow===dow);
    if(day) day.breaks.push({start:'12:00',end:'13:00',label:'Break'});
    const panel=document.getElementById('st-panel');
    if(panel) panel.innerHTML=stRenderScheduling(bs);
  };
  window.stRHCopy = function(fromDow, target) {
    const bs=window.stGetBS(); if(!bs) return;
    const src=bs.regularHours?.find(x=>x.dow===fromDow); if(!src||!src.open) return;
    const targets=(target==='weekdays'?[1,2,3,4,5]:[0,6]).filter(d=>d!==fromDow);
    targets.forEach(dow=>{
      const d=bs.regularHours?.find(x=>x.dow===dow);
      if(d){d.open=src.open;d.slots=JSON.parse(JSON.stringify(src.slots));d.breaks=JSON.parse(JSON.stringify(src.breaks));}
    });
    showToast(`Copied to ${target} ✓`,'success');
    const panel=document.getElementById('st-panel');
    if(panel) panel.innerHTML=stRenderScheduling(bs);
  };

  /* ── SPECIAL SCHEDULES ───────────────────────────────────── */
  window.stRenderSpecialSchedules = function(bs) {
    const ss=bs?.specialSchedules||[];
    const pCls={low:'badge-blue',medium:'badge-yellow',high:'badge-red'};
    return `<div style="max-width:920px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <div style="font-size:14px;font-weight:600">Special Schedules</div>
          <div class="text-muted" style="font-size:12px">Override regular hours for a date range</div>
        </div>
        <button class="btn btn-secondary btn-sm" onclick="stAddSpecial()">${UI.icon('add','sm')} Add Period</button>
      </div>
      ${ss.length ? ss.map(s=>`
        <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;
          border:1px solid var(--md-outline-variant);border-radius:10px;margin-bottom:8px">
          <div style="width:36px;height:36px;border-radius:8px;background:var(--md-primary-container);
            color:var(--md-primary);display:flex;align-items:center;justify-content:center;flex-shrink:0">
            ${UI.icon('event')}</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:600">${s.name}</div>
            <div style="font-size:11px" class="text-muted">${s.startDate} → ${s.endDate}</div>
          </div>
          <span class="badge ${pCls[s.priority]||'badge-blue'}" style="font-size:10px">${s.priority}</span>
          <label style="display:flex;align-items:center;gap:6px;font-size:12px;cursor:pointer">
            <input type="checkbox" ${s.active?'checked':''} style="accent-color:var(--md-primary)"
              onchange="stToggleSpecial('${s.id}',this.checked)"> Active
          </label>
          <button class="btn btn-secondary btn-sm" onclick="stEditSpecial('${s.id}')">${UI.icon('edit','sm')}</button>
        </div>`).join('')
      : UI.emptyState('event_note','No special schedules','Add summer hours, holiday closures, or extended nights')}
    </div>`;
  };
  window.stToggleSpecial = function(id, active) {
    const bs=window.stGetBS();
    const s=bs?.specialSchedules?.find(x=>x.id===id); if(s) s.active=active;
  };
  window.stAddSpecial = function() {
    Modal.create('modal-add-special',`${UI.icon('event_note','sm')} Add Special Schedule`,`
      <div class="modal-section">
        <div class="settings-group" style="margin-bottom:12px">
          <label class="settings-label">Schedule Name</label>
          <input class="settings-input" id="sp-name" placeholder="e.g. Summer Hours">
        </div>
        <div class="settings-row" style="margin-bottom:12px">
          <div class="settings-group"><label class="settings-label">Start Date</label>
            <input class="settings-input" type="date" id="sp-start"></div>
          <div class="settings-group"><label class="settings-label">End Date</label>
            <input class="settings-input" type="date" id="sp-end"></div>
        </div>
        <div class="settings-group">
          <label class="settings-label">Priority</label>
          <select class="settings-input" id="sp-priority">
            <option value="low">Low</option><option value="medium" selected>Medium</option>
            <option value="high">High</option>
          </select>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-add-special')">Cancel</button>
       <button class="btn btn-primary" onclick="stConfirmAddSpecial()">Add Schedule</button>`
    );
  };
  window.stConfirmAddSpecial = function() {
    const name=document.getElementById('sp-name')?.value?.trim();
    const startDate=document.getElementById('sp-start')?.value;
    const endDate=document.getElementById('sp-end')?.value;
    const priority=document.getElementById('sp-priority')?.value||'medium';
    if(!name||!startDate||!endDate){showToast('Fill all fields','warning');return;}
    const bs=window.stGetBS(); if(!bs) return;
    if(!bs.specialSchedules) bs.specialSchedules=[];
    bs.specialSchedules.push({id:'ss-'+Date.now(),name,startDate,endDate,priority,active:true,days:[]});
    Modal.close('modal-add-special');
    showToast(`"${name}" added ✓`,'success');
    stSwitchSchedTab('special');
  };
  window.stEditSpecial = function() { showToast('Edit special schedule — coming soon','info'); };

  /* ── HOLIDAYS ────────────────────────────────────────────── */
  /* วันหยุดที่มีผลกับสาขานี้ = ตรง schoolType + (global หรือ ผูกสาขานี้) */
  window.stHolidaysFor = function(schoolType, branch) {
    return (DB.holidays||[]).filter(h =>
      (h.schoolType==='all' || h.schoolType===schoolType) &&
      (h.global !== false || !h.branch || h.branch===branch));
  };
  window.stRenderCalendarHolidays = function(bs) {
    const schoolType=bs?.schoolType||'Nockacademy';
    const now=new Date(), y=now.getFullYear(), m=now.getMonth();
    const hols=stHolidaysFor(schoolType, bs?.branch);
    return `<div style="max-width:920px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
        <div>
          <div style="font-size:14px;font-weight:600">Academic Calendar</div>
          <div class="text-muted" style="font-size:12px">Holidays affect all sessions company-wide</div>
        </div>
        ${window.ST_ROLE==='director'?`<button class="btn btn-secondary btn-sm" onclick="stAddHoliday()">${UI.icon('add','sm')} Add Holiday</button>`:''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div id="st-mini-cal">${stMiniCal(y,m,hols)}</div>
        <div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
            <div style="font-size:13px;font-weight:600">Holidays ${y}</div>
            <select class="settings-input" style="width:100px;font-size:12px"
              onchange="stHolFilter(this.value,${y},'${schoolType}')">
              <option value="all">All year</option>
              ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((mn,i)=>`<option value="${i}">${mn}</option>`).join('')}
            </select>
          </div>
          <div id="st-hol-list" style="max-height:300px;overflow-y:auto">
            ${stRenderHolList(hols.filter(h=>h.date.startsWith(y)),schoolType)}
          </div>
        </div>
      </div>
    </div>`;
  };
  window.stMiniCal = function(year, month, hols) {
    const days=['Su','Mo','Tu','We','Th','Fr','Sa'];
    const first=new Date(year,month,1).getDay(), total=new Date(year,month+1,0).getDate();
    const holDates=new Set((hols||[]).filter(h=>h.active).map(h=>h.date));
    const mn=['January','February','March','April','May','June','July','August','September','October','November','December'];
    let cells=''; for(let i=0;i<first;i++) cells+='<div></div>';
    for(let d=1;d<=total;d++){
      const iso=`${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const isH=holDates.has(iso);
      cells+=`<div onclick="stCalDayClick('${iso}')" style="width:28px;height:28px;display:flex;align-items:center;
        justify-content:center;border-radius:50%;font-size:12px;cursor:pointer;
        ${isH?'background:var(--md-error-container);color:var(--md-error);font-weight:700':''}">${d}</div>`;
    }
    return `<div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
        <button class="btn btn-secondary btn-sm" onclick="stCalNav(-1,${year},${month})" style="padding:0 10px">${UI.icon('chevron_left','sm')}</button>
        <strong style="font-size:13px">${mn[month]} ${year}</strong>
        <button class="btn btn-secondary btn-sm" onclick="stCalNav(1,${year},${month})" style="padding:0 10px">${UI.icon('chevron_right','sm')}</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,28px);gap:4px;justify-content:center">
        ${days.map(d=>`<div style="width:28px;text-align:center;font-size:10px;font-weight:600;
          color:var(--md-on-surface-variant)">${d}</div>`).join('')}
        ${cells}
      </div>
    </div>`;
  };
  function stRenderHolList(hols, schoolType) {
    if(!hols.length) return `<div class="text-muted" style="font-size:12px;padding:8px">No holidays</div>`;
    return hols.sort((a,b)=>a.date.localeCompare(b.date)).map(h=>`
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--md-outline-variant)">
        <div style="width:40px;height:36px;border-radius:8px;background:var(--md-error-container);
          display:flex;flex-direction:column;align-items:center;justify-content:center;flex-shrink:0">
          <div style="font-size:9px;color:var(--md-error);font-weight:600">${h.date.slice(5,7)}/${h.date.slice(8,10)}</div>
          <div style="font-size:8px;color:var(--md-error)">${new Date(h.date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short'})}</div>
        </div>
        <div style="flex:1;min-width:0;${h.active===false?'opacity:.5':''}">
          <div style="font-size:12px;font-weight:500">${h.name}
            ${h.endDate?`<span class="text-muted" style="font-weight:400">→ ${h.endDate.slice(5)}</span>`:''}</div>
          <div style="font-size:10px" class="text-muted">
            ${h.global===false&&h.branch ? `เฉพาะ ${h.branch}` : (h.school||(h.schoolType==='all'?'All':h.schoolType))}
            ${h.roles&&!h.roles.includes('All') ? ' · '+h.roles.join(', ') : ''}
            ${h.active===false?' · ปิดอยู่':''}</div>
        </div>
        ${window.ST_ROLE==='director'?`<button class="btn btn-secondary btn-sm" style="padding:0 8px"
          onclick="stAddHoliday('','${h.id}')">${UI.icon('edit','sm')}</button>`:''}
      </div>`).join('');
  }
  window.stCalNav = function(dir, year, month) {
    let m=month+dir, y=year;
    if(m<0){m=11;y--;} if(m>11){m=0;y++;}
    const bs=window.stGetBS();
    const st=bs?.schoolType||'Nockacademy';
    const hols=(DB.holidays||[]).filter(h=>h.schoolType==='all'||h.schoolType===st);
    document.getElementById('st-mini-cal').innerHTML=stMiniCal(y,m,hols);
  };
  window.stHolFilter = function(val, year, schoolType) {
    let hols=(DB.holidays||[]).filter(h=>h.schoolType==='all'||h.schoolType===schoolType);
    hols=val==='all'?hols.filter(h=>h.date.startsWith(year)):hols.filter(h=>h.date.startsWith(`${year}-${String(Number(val)+1).padStart(2,'0')}`));
    document.getElementById('st-hol-list').innerHTML=stRenderHolList(hols,schoolType);
  };
  window.stCalDayClick = function(iso) {
    if(window.ST_ROLE!=='director'){showToast('Only Director can manage holidays','warning');return;}
    stAddHoliday(iso);
  };
  /* ── HOLIDAY LEAVE (ตาม mockup) ────────────────────────────
     scope: schoolType (All / NA School / NA App / Liclass)
          + roles ที่หยุด (All / Area Manager / Manager / Admin / Teacher)
          + Single date หรือ Date range
          + Global = ทุกสาขา · ไม่ติ๊ก = เฉพาะสาขาที่กำลังตั้งค่า */
  const HOL_SCHOOLS = ['All','NA School','NA App','Liclass'];
  const HOL_ROLES   = ['All','Area Manager','Manager','Admin','Teacher'];
  let _holDraft = null;

  function chipRow(items, sel, fn, id) {
    return `<div id="${id}" style="display:flex;gap:6px;flex-wrap:wrap">
      ${items.map(v=>`<label data-v="${v}" onclick="${fn}('${v}')"
        style="padding:5px 11px;border-radius:16px;cursor:pointer;font-size:11px;font-weight:500;
          border:1.5px solid ${sel.includes(v)?'var(--md-primary)':'var(--md-outline-variant)'};
          background:${sel.includes(v)?'var(--md-primary-container)':'transparent'};
          color:${sel.includes(v)?'var(--md-primary)':'var(--md-on-surface-variant)'}">${v}</label>`).join('')}
    </div>`;
  }
  function paintChips(id, sel) {
    document.querySelectorAll(`#${id} label`).forEach(el=>{
      const on = sel.includes(el.dataset.v);
      el.style.borderColor = on?'var(--md-primary)':'var(--md-outline-variant)';
      el.style.background  = on?'var(--md-primary-container)':'transparent';
      el.style.color       = on?'var(--md-primary)':'var(--md-on-surface-variant)';
    });
  }
  window.stHolSchool = function(v) { _holDraft.school = v; paintChips('hol-schools',[v]); };
  window.stHolRole = function(v) {
    if (v==='All') _holDraft.roles = ['All'];
    else {
      const r = _holDraft.roles.filter(x=>x!=='All');
      _holDraft.roles = r.includes(v) ? r.filter(x=>x!==v) : [...r, v];
      if (!_holDraft.roles.length) _holDraft.roles = ['All'];
    }
    paintChips('hol-roles', _holDraft.roles);
  };
  window.stHolMode = function(m) {
    _holDraft.mode = m; paintChips('hol-mode',[m]);
    const e = document.getElementById('hol-end-wrap');
    if (e) e.style.display = m==='Date range' ? '' : 'none';
  };

  window.stAddHoliday = function(date='', id=null) {
    const h = id ? (DB.holidays||[]).find(x=>x.id===id) : null;
    _holDraft = {
      school: h?.school || 'All',
      roles:  h?.roles  || ['All'],
      mode:   h?.endDate ? 'Date range' : 'Single date',
    };
    const bs = window.stGetBS();
    Modal.create('modal-add-holiday',
      `${UI.icon('event_busy','sm')} Holiday Leave`,
      `<div class="text-muted" style="font-size:11px;margin-bottom:12px">Setup the Holiday date</div>
      ${chipRow(HOL_SCHOOLS, [_holDraft.school], 'stHolSchool', 'hol-schools')}
      <div class="settings-group" style="margin:14px 0">
        <label class="settings-label">Holiday name</label>
        <input class="settings-input" id="hol-name" value="${h?.name||''}" placeholder="Type Holiday name">
      </div>
      <div class="settings-label" style="margin-bottom:6px">Which roles does this holiday apply to?</div>
      ${chipRow(HOL_ROLES, _holDraft.roles, 'stHolRole', 'hol-roles')}
      <div style="margin:14px 0 8px">${chipRow(['Single date','Date range'], [_holDraft.mode], 'stHolMode', 'hol-mode')}</div>
      <div style="display:flex;gap:10px;align-items:center">
        <div style="flex:1"><label class="settings-label">Start</label>
          <input class="settings-input" type="date" id="hol-date" value="${h?.date||date}"></div>
        <div style="flex:1;${_holDraft.mode==='Date range'?'':'display:none'}" id="hol-end-wrap">
          <label class="settings-label">End</label>
          <input class="settings-input" type="date" id="hol-end" value="${h?.endDate||''}"></div>
      </div>
      <label style="display:flex;align-items:flex-start;gap:9px;cursor:pointer;margin-top:16px;
        padding:10px 12px;border-radius:8px;background:var(--md-surface-variant,#f1f1f4)">
        <input type="checkbox" id="hol-global" ${h ? (h.global!==false?'checked':'') : 'checked'}
          style="accent-color:var(--md-primary);width:15px;height:15px;margin-top:2px">
        <span><b style="font-size:12px">Global</b>
          <div class="text-muted" style="font-size:11px">This holiday will reflect to all Branch</div>
          <div class="text-muted" style="font-size:10px">ไม่ติ๊ก = หยุดเฉพาะสาขา ${bs?.branch||'นี้'}</div></span>
      </label>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-add-holiday')">Cancel</button>
       ${id?`<button class="btn btn-secondary" onclick="stDeleteHoliday('${id}');Modal.close('modal-add-holiday')">${UI.icon('delete','sm')}</button>`:''}
       <label style="display:flex;align-items:center;gap:7px;font-size:12px;font-weight:600;cursor:pointer">
         <input type="checkbox" id="hol-active" ${h ? (h.active!==false?'checked':'') : 'checked'} style="width:15px;height:15px"> Active</label>
       <button class="btn btn-primary" onclick="stConfirmAddHoliday('${id||''}')">${UI.icon('check','sm')} Save</button>`);
  };
  window.stConfirmAddHoliday = function(id) {
    const gv = i => document.getElementById(i)?.value;
    const date = gv('hol-date'), name = (gv('hol-name')||'').trim();
    if(!date||!name){showToast('ใส่ชื่อและวันที่ก่อน','warning');return;}
    const end = _holDraft.mode==='Date range' ? gv('hol-end') : null;
    if (end && end < date) { showToast('วันสิ้นสุดต้องหลังวันเริ่ม','warning'); return; }
    const bs = window.stGetBS();
    const isGlobal = !!document.getElementById('hol-global')?.checked;
    const rec = {
      name, date, endDate: end || null,
      school: _holDraft.school,
      /* schoolType = field เดิมที่ตัวกรอง/Calendar ใช้ — map จาก school ให้เข้ากันได้ */
      schoolType: _holDraft.school==='All' ? 'all' : (_holDraft.school==='Liclass' ? 'Liclass' : 'Nockacademy'),
      roles: _holDraft.roles,
      global: isGlobal,
      branch: isGlobal ? null : (bs?.branch||null),
      active: !!document.getElementById('hol-active')?.checked,
    };
    if (id) Object.assign((DB.holidays||[]).find(x=>x.id===id)||{}, rec);
    else DB.holidays.push({ id:'hol-'+Date.now(), ...rec });
    if(window.Sync) Sync.dayHeaders();
    Modal.close('modal-add-holiday');
    showToast(`${id?'บันทึก':'เพิ่ม'}วันหยุด "${name}" ✓`,'success');
    stSwitchSchedTab('holidays');
  };
  window.stEditHoliday = function(id) {
    const h=DB.holidays?.find(x=>x.id===id); if(!h) return;
    Modal.create('modal-edit-holiday',`${UI.icon('edit','sm')} Edit Holiday`,`
      <div class="modal-section">
        <div class="settings-group" style="margin-bottom:12px">
          <label class="settings-label">Date</label>
          <input class="settings-input" type="date" id="hol-date" value="${h.date}">
        </div>
        <div class="settings-group" style="margin-bottom:12px">
          <label class="settings-label">Name</label>
          <input class="settings-input" id="hol-name" value="${h.name}">
        </div>
        <div class="settings-group">
          <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
            <input type="checkbox" id="hol-active" ${h.active?'checked':''} style="accent-color:var(--md-primary)">
            Active (show on calendar)
          </label>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-edit-holiday')">Cancel</button>
       <button class="btn btn-danger" onclick="stDeleteHoliday('${id}')">${UI.icon('delete','sm')}</button>
       <button class="btn btn-primary" onclick="stSaveHoliday('${id}')">Save</button>`
    );
  };
  window.stSaveHoliday = function(id) {
    const h=DB.holidays?.find(x=>x.id===id); if(!h) return;
    h.date=document.getElementById('hol-date')?.value||h.date;
    h.name=document.getElementById('hol-name')?.value?.trim()||h.name;
    h.active=document.getElementById('hol-active')?.checked;
    if(window.Sync) Sync.dayHeaders();
    Modal.close('modal-edit-holiday');
    showToast('Holiday updated ✓','success');
    stSwitchSchedTab('holidays');
  };
  window.stDeleteHoliday = function(id) {
    const i=DB.holidays?.findIndex(x=>x.id===id); if(i!==-1) DB.holidays.splice(i,1);
    if(window.Sync) Sync.dayHeaders();
    Modal.close('modal-edit-holiday');
    showToast('Holiday removed','info');
    stSwitchSchedTab('holidays');
  };

})();
