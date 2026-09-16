/* ============================================================
   settings-pricematrix.js — Price Matrix (branch scope)
   Subject × Grade × Tier · bs.priceMatrix = {'Subject|Grade|Hours': price}

   Scale design (worst case 10 วิชา × 12 เกรด × 8 tiers = 960 ช่อง):
   - Filter: Subject chips + Level (ประถม/มัธยม) + "Overrides only"
   - Accordion ต่อวิชา — default เปิดเฉพาะวิชาที่มีราคา explicit
   - Sticky คอลัมน์แรก + table-wrap scroll แนวนอนเมื่อ tier เยอะ
   - แก้ราคา = update ช่องเดียว ไม่ re-render ทั้งหน้า (scroll ไม่เด้ง)
   LOAD ORDER: after settings-catalog.js
   ============================================================ */
(function () {

  let SUBJ='all', LEVEL='all', ONLY=false;
  const OPEN={};   // per-subject accordion override

  function gradesFor(bs) {
    let gs=(bs?.grades||[]).filter(g=>g.active)
      .map(g=>(DB.gradesPool||[]).find(x=>x.id===g.gradeId)).filter(g=>g&&g.active);
    if(LEVEL==='p') gs=gs.filter(g=>g.id.startsWith('g-p'));
    if(LEVEL==='m') gs=gs.filter(g=>g.id.startsWith('g-m'));
    return gs;
  }
  function ovCount(mx, subj, grades, tiers) {
    return grades.reduce((n,g)=>n+tiers.filter(t=>mx[`${subj}|${g.name}|${t.hours}`]!=null).length,0);
  }
  function isOpen(subj, hasOv, total) {
    if (SUBJ!=='all') return true;          // กรองวิชาเดียว = เปิดเสมอ
    if (OPEN[subj]!=null) return OPEN[subj];
    if (total<=3) return true;              // วิชาน้อย = เปิดหมด
    return hasOv;                           // เยอะ = เปิดเฉพาะที่มี override
  }

  /* type = 'hour' | 'week' | 'month' — เรียกจาก Packages (หน้าเดียวกัน)
     month = ไม่มี package ย่อย → คอลัมน์เดียว "ราคา/เดือน" */
  window.stRenderPriceMatrix = function(bs, type) {
    type = type || 'hour';
    const tiers = type==='month'
      ? [{ id:'pkg-month', name:'ราคา/เดือน', hours:'M', price:0 }]
      : Utils.packagesFor(bs?.branch).filter(p=>p.type===type);
    const subjects=Utils.subjectsFor(bs?.branch);
    const grades=gradesFor(bs);
    if(!tiers.length||!subjects.length)
      return UI.emptyState('payments','ยังตั้งราคาไม่ได้', type==='month'
        ? 'เปิด Subjects / Grades ของสาขาก่อน'
        : `เปิด Subjects / Grades และสร้าง ${type} package ก่อน`);
    const mx=bs.priceMatrix||(bs.priceMatrix={});
    const showSubjects = SUBJ==='all' ? subjects : subjects.filter(s=>s===SUBJ);

    const chip=(label,active,onclick)=>`<div class="filter-chip ${active?'active':''}" onclick="${onclick}">${label}</div>`;

    const sections = showSubjects.map(subj=>{
      const cnt=ovCount(mx,subj,grades,tiers);
      const open=isOpen(subj,cnt>0,subjects.length);
      let rows=grades;
      const head=`<div onclick="stMxToggle('${subj.replace(/'/g,"\\'")}')"
        style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;
          background:var(--md-surface-lowest);border-bottom:1px solid var(--md-outline-variant);user-select:none">
        <span style="font-size:13px;transform:rotate(${open?90:0}deg);transition:transform .12s;display:inline-block">›</span>
        <span class="badge badge-${CONST.SUBJECT_COLOR[subj]||'blue'}">${subj}</span>
        <span class="text-muted" style="font-size:11px;flex:1">${rows.length} เกรด × ${tiers.length} tiers</span>
        ${cnt?UI.badge(`${cnt} ราคาเฉพาะ`,'blue'):`<span class="text-muted" style="font-size:10px">inherit ทั้งหมด</span>`}
      </div>`;
      if(!open) return `<div style="border:1px solid var(--md-outline-variant);border-radius:10px;margin-bottom:8px;overflow:hidden">${head}</div>`;

      const body=`<div class="table-wrap"><table style="min-width:${120+tiers.length*100}px">
        <thead><tr>
          <th style="min-width:110px;position:sticky;left:0;background:var(--md-surface);z-index:1">Grade</th>
          ${tiers.map(t=>`<th style="text-align:right">${t.hours}h<br>
            <span class="text-muted" style="font-weight:400;font-size:10px">฿${t.price.toLocaleString()}</span></th>`).join('')}
        </tr></thead>
        <tbody>
          ${rows.map(g=>{
            const cells=tiers.map(t=>{
              const key=`${subj}|${g.name}|${t.hours}`;
              const v=mx[key];
              if(ONLY && v==null) return `<td style="text-align:right"><span class="text-muted" style="font-size:11px">—</span></td>`;
              return `<td style="text-align:right">
                <input type="number" min="0" placeholder="${t.price}" value="${v??''}"
                  onchange="stSetMatrix('${bs.branch}','${subj.replace(/'/g,"\\'")}','${g.name}',${t.hours},this.value,this)"
                  style="width:84px;padding:4px 8px;font-size:12px;text-align:right;
                    border:1px solid var(--md-outline-variant);border-radius:6px;background:var(--md-surface);
                    font-weight:${v!=null?'600':'400'};
                    color:${v!=null?'var(--md-on-surface)':'var(--md-on-surface-variant)'}">
              </td>`;
            }).join('');
            return `<tr><td style="font-size:12px;position:sticky;left:0;background:var(--md-surface);z-index:1">${g.name}</td>${cells}</tr>`;
          }).join('')}
        </tbody>
      </table></div>`;
      return `<div style="border:1px solid var(--md-outline-variant);border-radius:10px;margin-bottom:8px;overflow:hidden">${head}${body}</div>`;
    }).join('');

    const totalOv=Object.keys(mx).length;
    /* หัวข้ออยู่ที่ Packages แล้ว (embedded) — โชว์แค่บรรทัดสรุปสั้นๆ */
    return `<div>
      <div class="text-muted" style="font-size:11px;margin-bottom:10px">
        ตั้งราคาเองแล้ว ${totalOv} ช่อง · ลบค่าทิ้ง = กลับไป inherit</div>
      <div class="filter-bar" style="margin-bottom:12px;flex-wrap:wrap">
        ${chip('All Subjects',SUBJ==='all',"stMxFilter('subj','all')")}
        ${subjects.map(s=>chip(s,SUBJ===s,`stMxFilter('subj','${s.replace(/'/g,"\\'")}')`)).join('')}
        <div style="width:1px;background:var(--md-outline-variant);height:20px;margin:0 4px"></div>
        ${chip('ทุกระดับ',LEVEL==='all',"stMxFilter('level','all')")}
        ${chip('ประถม',LEVEL==='p',"stMxFilter('level','p')")}
        ${chip('มัธยม',LEVEL==='m',"stMxFilter('level','m')")}
        <div style="width:1px;background:var(--md-outline-variant);height:20px;margin:0 4px"></div>
        ${chip(`${UI.icon('filter_alt','sm')} เฉพาะที่ตั้งราคาเอง`,ONLY,"stMxFilter('only')")}
      </div>
      ${grades.length?sections:UI.emptyState('school','ไม่มีเกรดในระดับนี้','สาขานี้ไม่ได้เปิดเกรดในระดับที่เลือก')}
    </div>`;
  };

  window.stMxFilter = function(kind, val) {
    if(kind==='subj')  SUBJ=val;
    if(kind==='level') LEVEL=val;
    if(kind==='only')  ONLY=!ONLY;
    stShowSection('pricematrix');
  };
  window.stMxToggle = function(subj) {
    const bs=window.stGetBS();
    const tiers=Utils.packagesFor(bs?.branch).filter(p=>p.type==='hour');
    const cnt=ovCount(bs?.priceMatrix||{},subj,gradesFor(bs),tiers);
    OPEN[subj]=!isOpen(subj,cnt>0,Utils.subjectsFor(bs?.branch).length);
    stShowSection('pricematrix');
  };

  /* แก้ราคา — update เฉพาะช่อง ไม่ re-render (scroll ไม่เด้ง) */
  window.stSetMatrix = function(branch, subject, grade, hours, value, el) {
    const bs=window.stGetBS(branch); if(!bs) return;
    if(!bs.priceMatrix) bs.priceMatrix={};
    const key=`${subject}|${grade}|${hours}`;
    const v=parseInt(value);
    const tierDefault=Utils.pkgPrice(branch, hours);
    const explicit=!(!value||isNaN(v)||v===tierDefault);
    if(explicit) bs.priceMatrix[key]=v;
    else         delete bs.priceMatrix[key];
    if(el){
      el.value=explicit?v:'';
      el.style.fontWeight=explicit?'600':'400';
      el.style.color=explicit?'var(--md-on-surface)':'var(--md-on-surface-variant)';
    }
    showToast(explicit
      ? `${subject} ${grade} ${hours}h @ ${branch} = ${Utils.currency(v)} ✓`
      : `${subject} ${grade} ${hours}h → inherit (${Utils.currency(tierDefault)})`,
      explicit?'success':'info');
  };

})();
