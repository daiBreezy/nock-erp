/* ============================================================
   calendar.js — Calendar views, filters, navigation
   Class modal: see calendar-class.js
   ============================================================ */
(function () {

  /* ── TIME SLOTS (2-hr blocks + breaks) ───────────────── */
  const TIME_SLOTS = [
    { id:0, start:'10:00', end:'12:00', type:'class' },
    { id:'b1', start:'12:00', end:'13:00', type:'break', label:'🍱 Lunch Break' },
    { id:1, start:'13:00', end:'15:00', type:'class' },
    { id:2, start:'15:00', end:'17:00', type:'class' },
    { id:'b2', start:'17:00', end:'18:00', type:'break', label:'☕ Rest Break' },
    { id:3, start:'18:00', end:'20:00', type:'class' },
  ];
  const CLASS_SLOTS = TIME_SLOTS.filter(s => s.type === 'class');
  const SUBJECT_COLOR = { 'Math G5':'green','Math G6':'','Eng Read':'yellow','Science':'orange','Thai Lang':'green' };
  const TEACHERS = ['Kru Arm','Kru Bee','Kru Cat','Kru Dan','Kru Eve'];
  const SUBJECTS = ['Math G5','Math G6','Eng Read','Science','Thai Lang'];
  const GRADES   = ['G3','G4','G5','G6'];
  const ROOMS    = ['Room 1','Room 2','Room 3'];

  /* ── SESSIONS DATA ────────────────────────────────────── */
  // slotId:0=10-12, 1=13-15, 2=15-17, 3=18-20  |  col:1=Mon…7=Sun
  const sessions = [
    // Mon 11 — ended
    {id:'s1', date:'2026-05-11',slotId:0,col:1,subject:'Math G5', grade:'G5',teacher:'Kru Arm',room:'Room 1',color:'green', state:'ended',branch:'Sukhumvit',
     studentNames:['Ploy Srirak','Nat B','Jay C','Sam D'],
     attendance:{'Ploy Srirak':'present','Nat B':'present','Jay C':'leave','Sam D':'present'},
     summaries:{'Ploy Srirak':{text:'Fractions — great progress!',sent:true},'Nat B':{text:'',sent:false},'Sam D':{text:'',sent:false}}},
    {id:'s2', date:'2026-05-11',slotId:1,col:1,subject:'Science', grade:'G5',teacher:'Kru Dan',room:'Room 3',color:'orange',state:'ended',branch:'Sukhumvit',
     studentNames:['James Wilson'],attendance:{'James Wilson':'present'},
     summaries:{'James Wilson':{text:'Plant biology — engaged.',sent:true}}},
    {id:'s3', date:'2026-05-11',slotId:2,col:1,subject:'Thai Lang',grade:'G5',teacher:'Kru Eve',room:'Room 1',color:'green', state:'ended',branch:'Silom',
     studentNames:['Ploy Srirak','Pan G','Wan H'],attendance:{'Ploy Srirak':'present','Pan G':'absent','Wan H':'present'},
     summaries:{'Ploy Srirak':{text:'Thai vowels — excellent!',sent:true},'Pan G':{text:'',sent:false},'Wan H':{text:'',sent:false}}},
    // Tue 12 — ended
    {id:'s4', date:'2026-05-12',slotId:0,col:2,subject:'Eng Read',grade:'G4',teacher:'Kru Bee',room:'Room 1',color:'yellow',state:'ended',branch:'Sukhumvit',
     studentNames:['Mia Tanaka','Kevin Park','Leo E','Ava F','Max G'],
     attendance:{'Mia Tanaka':'present','Kevin Park':'present','Leo E':'present','Ava F':'leave','Max G':'present'},
     summaries:{'Mia Tanaka':{text:'Reading comprehension drills.',sent:true},'Kevin Park':{text:'Vocab expansion.',sent:true},'Leo E':{text:'',sent:false},'Max G':{text:'',sent:false}}},
    {id:'s5', date:'2026-05-12',slotId:1,col:2,subject:'Science', grade:'G5',teacher:'Kru Dan',room:'Room 3',color:'orange',state:'ended',branch:'Sukhumvit',
     studentNames:['James Wilson'],attendance:{'James Wilson':'absent'},summaries:{'James Wilson':{text:'',sent:false}}},
    {id:'s6', date:'2026-05-12',slotId:2,col:2,subject:'Math G6', grade:'G6',teacher:'Kru Cat',room:'Room 2',color:'',     state:'ended',branch:'Sukhumvit',
     studentNames:['Tom Chen','Amy B','Ben C','Cal D','Dan E','Eva F'],
     attendance:{'Tom Chen':'present','Amy B':'present','Ben C':'present','Cal D':'leave','Dan E':'present','Eva F':'present'},
     summaries:{'Tom Chen':{text:'Quadratics intro.',sent:true},'Amy B':{text:'',sent:false},'Ben C':{text:'',sent:false},'Dan E':{text:'',sent:false},'Eva F':{text:'',sent:false}}},
    // Wed 13 — today (mix)
    {id:'s7', date:'2026-05-13',slotId:0,col:3,subject:'Math G5', grade:'G5',teacher:'Kru Arm',room:'Room 2',color:'green', state:'ended',branch:'Sukhumvit',
     studentNames:['Ploy Srirak','Nat B','Jay C','Sam D'],
     attendance:{'Ploy Srirak':'present','Nat B':'present','Jay C':'present','Sam D':'present'},
     summaries:{'Ploy Srirak':{text:'',sent:false},'Nat B':{text:'',sent:false},'Jay C':{text:'',sent:false},'Sam D':{text:'',sent:false}}},
    {id:'s8', date:'2026-05-13',slotId:0,col:3,subject:'Eng Read',grade:'G4',teacher:'Kru Bee',room:'Room 1',color:'yellow',state:'ended',branch:'Sukhumvit',
     studentNames:['Mia Tanaka','Kevin Park','Leo E','Ava F','Max G'],
     attendance:{'Mia Tanaka':'present','Kevin Park':'leave','Leo E':'present','Ava F':'present','Max G':'present'},
     summaries:{'Mia Tanaka':{text:'',sent:false},'Leo E':{text:'',sent:false},'Ava F':{text:'',sent:false},'Max G':{text:'',sent:false}}},
    {id:'s9', date:'2026-05-13',slotId:1,col:3,subject:'Science', grade:'G5',teacher:'Kru Dan',room:'Room 3',color:'orange',state:'active',branch:'Sukhumvit',startedAt:'14:35',
     studentNames:['James Wilson'],attendance:{'James Wilson':'present'},summaries:{}},
    {id:'s10',date:'2026-05-13',slotId:2,col:3,subject:'Math G6', grade:'G6',teacher:'Kru Cat',room:'Room 2',color:'',     state:'upcoming',branch:'Sukhumvit',
     studentNames:['Tom Chen','Amy B','Ben C','Cal D','Dan E','Eva F'],attendance:{},summaries:{}},
    {id:'s11',date:'2026-05-13',slotId:2,col:3,subject:'Thai Lang',grade:'G5',teacher:'Kru Eve',room:'Room 1',color:'green', state:'upcoming',branch:'Silom',
     studentNames:['Ploy Srirak','Pan G','Wan H'],attendance:{},summaries:{}},
    // Thu 14
    {id:'s12',date:'2026-05-14',slotId:0,col:4,subject:'Eng Read',grade:'G4',teacher:'Kru Bee',room:'Room 1',color:'yellow',state:'upcoming',branch:'Sukhumvit',studentNames:['Mia Tanaka','Kevin Park','Leo E','Ava F','Max G'],attendance:{},summaries:{}},
    {id:'s13',date:'2026-05-14',slotId:1,col:4,subject:'Science', grade:'G5',teacher:'Kru Dan',room:'Room 3',color:'orange',state:'upcoming',branch:'Sukhumvit',studentNames:['James Wilson'],attendance:{},summaries:{}},
    {id:'s14',date:'2026-05-14',slotId:2,col:4,subject:'Math G6', grade:'G6',teacher:'Kru Cat',room:'Room 2',color:'',     state:'upcoming',branch:'Sukhumvit',studentNames:['Tom Chen','Amy B','Ben C','Cal D','Dan E','Eva F'],attendance:{},summaries:{}},
    // Sat 16
    {id:'s15',date:'2026-05-16',slotId:0,col:6,subject:'Eng Read',grade:'G4',teacher:'Kru Bee',room:'Room 1',color:'',     state:'upcoming',branch:'Sukhumvit',studentNames:['Mia Tanaka','Kevin Park','Leo E','Ava F'],attendance:{},summaries:{}},
    {id:'s16',date:'2026-05-16',slotId:1,col:6,subject:'Math G6', grade:'G6',teacher:'Kru Cat',room:'Room 2',color:'',     state:'upcoming',branch:'Sukhumvit',studentNames:['Tom Chen','Amy B','Ben C','Cal D','Dan E'],attendance:{},summaries:{}},
    {id:'s17',date:'2026-05-16',slotId:2,col:6,subject:'Thai Lang',grade:'G5',teacher:'Kru Eve',room:'Room 1',color:'green', state:'upcoming',branch:'Silom',studentNames:['Ploy Srirak','Pan G','Wan H'],attendance:{},summaries:{}},
  ];

  // Expose sessions globally for calendar-class.js
  window.calSessions = sessions;

  const dayHeaders = [
    { label:'Mon 11', date:'2026-05-11', isToday:false, isHoliday:false },
    { label:'Tue 12', date:'2026-05-12', isToday:false, isHoliday:false },
    { label:'Wed 13', date:'2026-05-13', isToday:true,  isHoliday:false },
    { label:'Thu 14', date:'2026-05-14', isToday:false, isHoliday:false },
    { label:'Fri 15', date:'2026-05-15', isToday:false, isHoliday:true  },
    { label:'Sat 16', date:'2026-05-16', isToday:false, isHoliday:false },
    { label:'Sun 17', date:'2026-05-17', isToday:false, isHoliday:false },
  ];

  /* ── FILTER STATE ─────────────────────────────────────── */
  let fTeacher='', fSubject='', fGrade='', fTime='', currentView='week', selectedDay='2026-05-13';

  function getFiltered() {
    return sessions.filter(s => {
      if (fTeacher && !s.teacher.includes(fTeacher)) return false;
      if (fSubject && s.subject !== fSubject)         return false;
      if (fGrade   && s.grade   !== fGrade)           return false;
      if (fTime==='morning'   && parseInt(s.slotId)>0)  return false;
      if (fTime==='afternoon' && s.slotId!==1)           return false;
      if (fTime==='evening'   && s.slotId<2)             return false;
      return true;
    });
  }

  /* ── SHELL HTML ───────────────────────────────────────── */
  document.getElementById('view-calendar').innerHTML = `
  <div class="page-header">
    <div><div class="page-title">Calendar</div><div class="page-sub" id="cal-sub">Week of 11–17 May 2026</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-secondary btn-sm" onclick="calNav(-1)">← Prev</button>
      <button class="btn btn-secondary btn-sm" onclick="calNav(0)">Today</button>
      <button class="btn btn-secondary btn-sm" onclick="calNav(1)">Next →</button>
      <button class="btn btn-secondary btn-sm" onclick="openCalSummary()">📊 Summary</button>
      <button class="btn btn-primary btn-sm" onclick="openCreateClass()">＋ Create Class</button>
    </div>
  </div>
  <div class="table-controls" style="margin-bottom:10px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;flex-wrap:wrap">
    <span class="ts-label">Filter:</span>
    <select class="tc-select" onchange="setCalFilter('teacher',this.value)">
      <option value="">All Teachers</option>${TEACHERS.map(t=>`<option>${t}</option>`).join('')}
    </select>
    <select class="tc-select" onchange="setCalFilter('subject',this.value)">
      <option value="">All Subjects</option>${SUBJECTS.map(s=>`<option>${s}</option>`).join('')}
    </select>
    <select class="tc-select" onchange="setCalFilter('grade',this.value)">
      <option value="">All Grades</option>${GRADES.map(g=>`<option>${g}</option>`).join('')}
    </select>
    <select class="tc-select" onchange="setCalFilter('time',this.value)">
      <option value="">All Times</option>
      <option value="morning">Morning (10–12)</option>
      <option value="afternoon">Afternoon (13–15)</option>
      <option value="evening">Evening (15+)</option>
    </select>
    <button class="btn btn-secondary btn-sm" onclick="clearCalFilters()">✕ Clear</button>
    <span id="cal-filter-count" style="margin-left:auto;font-size:11px;color:#9ca3af"></span>
  </div>
  <div id="holiday-banner" style="background:#fee2e2;border:1px solid #fca5a5;border-radius:8px;padding:8px 14px;margin-bottom:10px;font-size:13px;color:#991b1b;display:flex;align-items:center;gap:8px">
    🏖️ <strong>วันหยุด:</strong> ศุกร์ 15 May — วันวิสาขบูชา (ทุกสาขาหยุด)
    <button class="btn btn-sm" style="margin-left:auto;background:#fee2e2;border:1px solid #fca5a5;color:#991b1b;font-size:11px" onclick="this.closest('#holiday-banner').style.display='none'">✕</button>
  </div>
  <div class="tabs" style="margin-bottom:10px">
    <div class="tab active" onclick="calTab('week',this)">Week</div>
    <div class="tab" onclick="calTab('day',this)">Day</div>
    <div class="tab" onclick="calTab('month',this)">Month</div>
    <div class="tab" onclick="calTab('teacher',this)">Teacher</div>
    <div class="tab" onclick="calTab('list',this)">List</div>
    <div class="tab" onclick="calTab('year',this)">Year</div>
  </div>
  <div id="cal-view-container"></div>`;

  /* ── WEEK VIEW ────────────────────────────────────────── */
  function buildWeek() {
    const filtered = getFiltered();
    const lookup = {};
    filtered.forEach(s => { const k=`${s.slotId}-${s.col}`; (lookup[k]=lookup[k]||[]).push(s); });
    let h = '<div class="cal-fill"><div class="cal-days">';
    h += '<div class="cal-day-header" style="position:sticky;top:0;z-index:2"></div>';
    dayHeaders.forEach(d => {
      const cls = d.isToday?'today':d.isHoliday?'holiday':'';
      h += `<div class="cal-day-header ${cls}" style="position:sticky;top:0;z-index:2">${d.label}${d.isHoliday?' 🏖️':''}</div>`;
    });
    TIME_SLOTS.forEach(slot => {
      if (slot.type === 'break') {
        h += `<div class="cal-time break-row">${slot.start}</div>`;
        for (let i=0;i<7;i++) h += `<div class="cal-cell break-cell"><span style="font-size:9px;color:#9ca3af;padding:0 4px">${i===0?slot.label:''}</span></div>`;
        return;
      }
      h += `<div class="cal-time">${slot.start}<span class="end-time">${slot.end}</span></div>`;
      dayHeaders.forEach((d, di) => {
        const col = di+1, list = lookup[`${slot.id}-${col}`]||[];
        h += `<div class="cal-cell ${d.isHoliday?'holiday-col':''}">`;
        if (d.isHoliday && slot.id===0) h += `<div class="cal-event holiday-event">วันวิสาขบูชา</div>`;
        list.forEach(s => {
          const t = s.teacher.split(',').map(x=>x.trim().replace('Kru ','')).join('+');
          const dot = s.state==='active'?'🟢 ':s.state==='ended'?'✅ ':'';
          h += `<div class="cal-event ${s.color}" onclick="openClassModal('${s.id}')" title="${s.subject} · ${s.teacher}">
            ${dot}${s.subject} · ${s.room}
            <br><span style="font-size:9px;opacity:.8">👩‍🏫${t} · ${s.studentNames.length}👤</span>
          </div>`;
        });
        h += '</div>';
      });
    });
    h += '</div></div>';
    updateFilterCount(filtered.length);
    return h;
  }

  /* ── DAY VIEW ─────────────────────────────────────────── */
  function buildDay() {
    const d = dayHeaders.find(x=>x.date===selectedDay)||dayHeaders[2];
    const filtered = getFiltered().filter(s=>s.date===selectedDay);
    let h = `<div style="font-weight:600;color:#6366f1;margin-bottom:8px">${d.label} — ${d.isHoliday?'🏖️ วันหยุด':'${filtered.length} classes'}</div>`;
    h += '<div class="cal-fill"><div class="cal-day-grid">';
    TIME_SLOTS.forEach(slot => {
      if (slot.type==='break') {
        h += `<div class="cal-time break-row">${slot.start}</div><div class="cal-cell break-cell" style="border-right:none"><span style="font-size:10px;color:#9ca3af">${slot.label}</span></div>`;
        return;
      }
      const list = filtered.filter(s=>s.slotId===slot.id);
      h += `<div class="cal-time">${slot.start}<span class="end-time">${slot.end}</span></div>`;
      h += `<div class="cal-cell" style="height:110px;border-right:none">`;
      if (d.isHoliday) { if(slot.id===0) h += `<div class="cal-event holiday-event" style="display:inline-block">🏖️ วันวิสาขบูชา — วันหยุดราชการ</div>`; }
      else if (!list.length) h += `<span style="font-size:11px;color:#d1d5db">No class</span>`;
      list.forEach(s => {
        const dot = s.state==='active'?'🟢 ':s.state==='ended'?'✅ ':'📅 ';
        h += `<div class="cal-event ${s.color}" style="display:inline-block;margin:2px" onclick="openClassModal('${s.id}')">
          ${dot}${s.subject} · ${s.room} · ${s.teacher} · ${s.studentNames.length} students</div>`;
      });
      h += '</div>';
    });
    h += '</div></div>';
    updateFilterCount(filtered.length);
    return h;
  }

  /* ── MONTH VIEW ───────────────────────────────────────── */
  function buildMonth() {
    const filtered = getFiltered();
    const byDate = {};
    filtered.forEach(s => {
      if (!byDate[s.date]) byDate[s.date]={};
      byDate[s.date][s.subject] = (byDate[s.date][s.subject]||0)+1;
    });
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    let h = '<div class="cal-fill" style="overflow:auto"><div class="cal-month-grid">';
    days.forEach(d => h += `<div class="cal-month-head">${d}</div>`);
    const offset=4, dim=31; // May 2026: 1st = Fri (Mon-start offset=4)
    const total = Math.ceil((dim+offset)/7)*7;
    for (let i=0;i<total;i++) {
      const dn=i-offset+1;
      if (dn<1||dn>dim){ h+=`<div class="cal-month-cell other-month"><span class="cal-month-num">${dn>0&&dn<=dim?dn:''}</span></div>`; continue; }
      const ds=`2026-05-${String(dn).padStart(2,'0')}`;
      const isToday=ds==='2026-05-13', isHol=ds==='2026-05-15';
      const subjects = byDate[ds]||{};
      h += `<div class="cal-month-cell${isToday?' today':''}${isHol?' holiday':''}" onclick="selectDay('${ds}')">
        <span class="cal-month-num">${dn}${isHol?' 🏖️':''}</span>`;
      if (isHol) { h += `<div class="cal-event holiday-event" style="font-size:9px">วันวิสาขบูชา</div>`; }
      else {
        Object.entries(subjects).forEach(([subj, cnt]) => {
          const c = SUBJECT_COLOR[subj]||'';
          h += `<div class="cal-event ${c}" style="font-size:9px;padding:1px 4px">${subj}${cnt>1?` ×${cnt}`:''}</div>`;
        });
      }
      h += '</div>';
    }
    h += '</div></div>';
    updateFilterCount(filtered.length);
    return h;
  }

  /* ── TEACHER VIEW ─────────────────────────────────────── */
  function buildTeacher() {
    const filtered = getFiltered();
    let h = `<div class="cal-fill"><div class="cal-teacher-grid" style="grid-template-columns:70px repeat(${TEACHERS.length},1fr)">`;
    h += '<div class="cal-day-header"></div>';
    TEACHERS.forEach(t => h += `<div class="cal-day-header">${t}</div>`);
    TIME_SLOTS.forEach(slot => {
      if (slot.type==='break') {
        h += `<div class="cal-time break-row">${slot.start}</div>`;
        TEACHERS.forEach(()=>h+=`<div class="cal-cell break-cell"></div>`);
        return;
      }
      h += `<div class="cal-time">${slot.start}<span class="end-time">${slot.end}</span></div>`;
      TEACHERS.forEach(teacher => {
        const list = filtered.filter(s=>s.slotId===slot.id&&s.teacher.includes(teacher));
        h += '<div class="cal-cell">';
        list.forEach(s => {
          const dh = dayHeaders.find(d=>d.date===s.date);
          h += `<div class="cal-event ${s.color}" onclick="openClassModal('${s.id}')">${s.subject}<br><span style="font-size:9px">${dh?.label||s.date} · ${s.room}</span></div>`;
        });
        h += '</div>';
      });
    });
    h += '</div></div>';
    updateFilterCount(filtered.length);
    return h;
  }

  /* ── LIST VIEW ────────────────────────────────────────── */
  function buildList() {
    const filtered = getFiltered().sort((a,b)=>a.date.localeCompare(b.date)||a.slotId-b.slotId);
    const sCls = { upcoming:'badge-blue', active:'badge-green', ended:'badge-gray' };
    let h = `<div class="card" style="padding:0;overflow:hidden"><div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Time</th><th>Subject</th><th>Grade</th><th>Teacher</th><th>Room</th><th>Students</th><th>Status</th><th></th></tr></thead><tbody>`;
    filtered.forEach(s => {
      const dh = dayHeaders.find(x=>x.date===s.date);
      const ts = CLASS_SLOTS.find(c=>c.id===s.slotId);
      h += `<tr ${dh?.isHoliday?'style="background:#fff9f9"':''}>
        <td>${dh?.label||s.date}${dh?.isHoliday?' 🏖️':''}</td>
        <td style="font-size:11px">${ts?ts.start+'–'+ts.end:'—'}</td>
        <td>${s.subject}</td><td><span class="badge badge-gray">${s.grade}</span></td>
        <td style="font-size:12px">${s.teacher}</td><td style="font-size:12px">${s.room}</td>
        <td style="text-align:center">${s.studentNames.length}</td>
        <td><span class="badge ${sCls[s.state]||'badge-gray'}">${s.state}</span></td>
        <td><button class="btn btn-secondary btn-sm" onclick="openClassModal('${s.id}')">Open</button></td>
      </tr>`;
    });
    h += '</tbody></table></div></div>';
    updateFilterCount(filtered.length);
    return h;
  }

  /* ── YEAR VIEW ────────────────────────────────────────── */
  function buildYear() {
    const filtered = getFiltered();
    const cnt = {};
    filtered.forEach(s => cnt[s.date]=(cnt[s.date]||0)+1);
    const months=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const offsets=[3,0,0,3,4,0,2,5,1,3,6,1];
    const dims=[31,28,31,30,31,30,31,31,30,31,30,31];
    let h = '<div class="cal-year-grid">';
    months.forEach((mon, mi) => {
      h += `<div class="cal-mini-month"><div class="cal-mini-title">${mon} 2026</div><div class="cal-mini-grid">`;
      for (let i=0;i<offsets[mi];i++) h += '<div class="cal-mini-cell"></div>';
      for (let d=1;d<=dims[mi];d++) {
        const ds=`2026-${String(mi+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const n=cnt[ds]||0, isTod=ds==='2026-05-13', isHol=ds==='2026-05-15';
        const cls=isTod?'today-cell':isHol?'holiday-cell':n>=3?'has-many':n>0?'has-session':'';
        h += `<div class="cal-mini-cell ${cls}" title="${n?n+' classes':'no class'}" ${n?`onclick="selectDay('${ds}');calTab('day',document.querySelectorAll('#view-calendar .tab')[1])"`:''}>
          ${d}${n?`<span style="font-size:7px;display:block;line-height:1">${n}</span>`:''}
        </div>`;
      }
      h += '</div></div>';
    });
    h += '</div>';
    return h;
  }

  /* ── RENDER ───────────────────────────────────────────── */
  function render() {
    const c = document.getElementById('cal-view-container');
    if (!c) return;
    const fns = { week:buildWeek, day:buildDay, month:buildMonth, teacher:buildTeacher, list:buildList, year:buildYear };
    c.innerHTML = (fns[currentView]||buildWeek)();
  }

  function updateFilterCount(n) {
    const el=document.getElementById('cal-filter-count');
    if (el) el.textContent=`${n} session${n!==1?'s':''}`;
  }

  render();

  /* ── TAB + NAV ────────────────────────────────────────── */
  window.calTab = function(tab, el) {
    currentView = tab;
    document.querySelectorAll('#view-calendar .tab').forEach(t=>t.classList.remove('active'));
    if (el) el.classList.add('active');
    const labels={week:'Week of 11–17 May 2026',day:`Day View — ${selectedDay}`,month:'May 2026',teacher:'Teacher View — May 11–17',list:'All Sessions — May 2026',year:'Year 2026'};
    const el2=document.getElementById('cal-sub'); if(el2) el2.textContent=labels[tab]||'';
    render();
  };
  window.calNav = () => showToast('Week navigation coming soon','info');
  window.selectDay = function(ds) {
    selectedDay=ds;
    calTab('day',document.querySelectorAll('#view-calendar .tab')[1]);
  };
  window.setCalFilter = function(type,val) {
    ({teacher:v=>fTeacher=v,subject:v=>fSubject=v,grade:v=>fGrade=v,time:v=>fTime=v})[type]?.(val);
    render();
  };
  window.clearCalFilters = function() {
    fTeacher=fSubject=fGrade=fTime='';
    document.querySelectorAll('#view-calendar .tc-select').forEach(s=>s.value='');
    render();
  };

  /* ── SUMMARY MODAL ────────────────────────────────────── */
  window.openCalSummary = function() {
    const f=getFiltered();
    const noHol=f.filter(s=>!dayHeaders.find(d=>d.date===s.date)?.isHoliday);
    const tMap={};
    f.forEach(s=>s.teacher.split(',').forEach(t=>{const k=t.trim();tMap[k]=(tMap[k]||0)+1;}));
    const rows=f.map(s=>{
      const dh=dayHeaders.find(x=>x.date===s.date),ts=CLASS_SLOTS.find(c=>c.id===s.slotId),isH=dh?.isHoliday;
      return `<tr ${isH?'style="background:#fff9f9"':''}>
        <td>${dh?.label||s.date}${isH?' 🏖️':''}</td><td style="font-size:11px">${ts?ts.start+'–'+ts.end:''}</td>
        <td>${s.subject}</td><td>${s.teacher}</td><td style="text-align:center">${s.studentNames.length}</td>
        <td>${isH?'<span class="badge badge-red">Holiday!</span>':'<span class="badge badge-green">OK</span>'}</td></tr>`;
    }).join('');
    Modal.create('modal-cal-summary',`📊 Summary — ${currentView.charAt(0).toUpperCase()+currentView.slice(1)} View`,`
      <div class="modal-section">
        <div class="info-grid" style="margin-bottom:12px">
          <div class="info-item"><div class="label">Total Sessions</div><strong>${noHol.length}</strong></div>
          <div class="info-item"><div class="label">Est. Students</div><strong>${f.reduce((a,s)=>a+s.studentNames.length,0)}</strong></div>
          <div class="info-item"><div class="label">Teachers</div><strong>${Object.keys(tMap).length}</strong></div>
          <div class="info-item"><div class="label">Holiday Conflicts</div><span class="badge badge-red">Fri 15 May</span></div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px">
          ${Object.entries(tMap).map(([t,n])=>`<div style="background:#f5f3ff;border:1px solid #ddd6fe;border-radius:6px;padding:5px 10px;font-size:12px"><strong>${t}</strong>: ${n}</div>`).join('')}
        </div>
      </div>
      <div class="modal-section"><div class="modal-section-title">All Sessions</div>
        <div class="table-wrap"><table><thead><tr><th>Day</th><th>Time</th><th>Subject</th><th>Teacher</th><th>Students</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table></div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-cal-summary')">Close</button>
       <button class="btn btn-primary" onclick="showToast('Exporting…','info')">Export PDF</button>`,
      'modal-xl'
    );
  };

})();
