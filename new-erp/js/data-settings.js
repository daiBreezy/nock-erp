/* ============================================================
   data-settings.js — Settings Data Store
   Subjects, Grades, Packages (global pool + branch selections)
   Regular Hours, Special Schedules, Holidays, Branch Info
   LOAD ORDER: immediately after data.js
   ============================================================ */

/* ── GLOBAL SUBJECT POOL ──────────────────────────────────── */
const _subjects = [
  {id:'subj-eng',     name:'Eng',           source:'default',    active:true, color:'blue'  },
  {id:'subj-math',    name:'Math',          source:'default',    active:true, color:'green' },
  {id:'subj-science', name:'Science',       source:'default',    active:true, color:'orange'},
  {id:'subj-thai',    name:'Thai',          source:'default',    active:true, color:'green' },
  {id:'subj-eng-a',   name:'Eng (Active)',  source:'Sukhumvit',  active:true, color:'yellow'},
  {id:'subj-eng-g',   name:'Eng (Grammar)', source:'Sukhumvit',  active:true, color:'purple'},
];

/* ── GLOBAL GRADE POOL ────────────────────────────────────── */
const _gradesPool = [
  {id:'g-p1',name:'ป.1',source:'default',active:true},
  {id:'g-p2',name:'ป.2',source:'default',active:true},
  {id:'g-p3',name:'ป.3',source:'default',active:true},
  {id:'g-p4',name:'ป.4',source:'default',active:true},
  {id:'g-p5',name:'ป.5',source:'default',active:true},
  {id:'g-p6',name:'ป.6',source:'default',active:true},
  {id:'g-m1',name:'ม.1',source:'default',active:true},
  {id:'g-m2',name:'ม.2',source:'default',active:true},
  {id:'g-m3',name:'ม.3',source:'default',active:true},
  {id:'g-m4',name:'ม.4',source:'default',active:true},
  {id:'g-m5',name:'ม.5',source:'default',active:true},
  {id:'g-m6',name:'ม.6',source:'default',active:true},
];

/* ── GLOBAL PACKAGE POOL ──────────────────────────────────── */
const _packages = [
  {id:'pkg-24h', type:'hour',    name:'24h Package',  hours:24, price:7200,  leaveQuota:3,  source:'default', active:true},
  {id:'pkg-48h', type:'hour',    name:'48h Package',  hours:48, price:14400, leaveQuota:6,  source:'default', active:true},
  {id:'pkg-72h', type:'hour',    name:'72h Package',  hours:72, price:20160, leaveQuota:9,  source:'default', active:true},
  {id:'pkg-96h', type:'hour',    name:'96h Package',  hours:96, price:28800, leaveQuota:12, source:'default', active:true},
  /* Week type — Liclass: เรียนตามตารางประจำสัปดาห์ (class 30/50/75/90 นาทีได้)
     consumption = สัปดาห์ · ไม่นับชั่วโมง · ยังไม่เปิดใช้ในสาขา Nockacademy */
  {id:'pkg-4w',  type:'week',    name:'4-Week Course', weeks:4, hours:0, price:5200, leaveQuota:0, source:'default', active:true},
];

/* ── BRANCH SETTINGS ──────────────────────────────────────── */
// Per-branch: info + subject/grade/package selections + hours
const _branchSettings = [
  {
    branch:     'Sukhumvit',
    schoolType: 'Nockacademy',
    phone:      ['02-111-1111'],
    email:      'sukhumvit@nockacademy.com',
    address:    '123 Sukhumvit Rd, Bangkok 10110',
    lineId:     '@nock-sukhumvit',
    lineToken:  '',
    lineQR:     null,    // upload via Settings → Branch Info
    /* Rooms — named per branch, editable in Settings → Branch Info
       Single source of truth: sessions/classes/schedule pickers read from here */
    rooms:      ['Room A','Room B','Room C'],
    socialMedia:[
      {platform:'Facebook',  url:'https://facebook.com/nockacademy'},
      {platform:'Instagram', url:'https://instagram.com/nockacademy'},
    ],

    // Informational only — does NOT affect Calendar
    openClose:[
      {dow:0,label:'Sun',open:false},
      {dow:1,label:'Mon',open:false},
      {dow:2,label:'Tue',open:true, start:'10:00',end:'20:00'},
      {dow:3,label:'Wed',open:true, start:'10:00',end:'20:00'},
      {dow:4,label:'Thu',open:true, start:'10:00',end:'20:00'},
      {dow:5,label:'Fri',open:true, start:'10:00',end:'20:00'},
      {dow:6,label:'Sat',open:true, start:'08:00',end:'20:00'},
    ],

    // Base calendar — Calendar uses these slots; breaks BLOCK scheduling
    regularHours:[
      {dow:0,label:'Sun',open:false,slots:[],breaks:[]},
      {dow:1,label:'Mon',open:false,slots:[],breaks:[]},
      {dow:2,label:'Tue',open:true, slots:[{start:'10:00',end:'20:00'}],
        breaks:[{start:'12:00',end:'13:00',label:'Lunch'},{start:'17:00',end:'18:00',label:'Break'}]},
      {dow:3,label:'Wed',open:true, slots:[{start:'10:00',end:'20:00'}],
        breaks:[{start:'12:00',end:'13:00',label:'Lunch'},{start:'17:00',end:'18:00',label:'Break'}]},
      {dow:4,label:'Thu',open:true, slots:[{start:'10:00',end:'20:00'}],
        breaks:[{start:'12:00',end:'13:00',label:'Lunch'},{start:'17:00',end:'18:00',label:'Break'}]},
      {dow:5,label:'Fri',open:true, slots:[{start:'10:00',end:'20:00'}],
        breaks:[{start:'12:00',end:'13:00',label:'Lunch'},{start:'17:00',end:'18:00',label:'Break'}]},
      {dow:6,label:'Sat',open:true, slots:[{start:'08:00',end:'20:00'}],
        breaks:[{start:'12:00',end:'13:00',label:'Lunch'},{start:'15:00',end:'15:30',label:'Break'}]},
    ],

    // Event overrides — override regularHours for a date range
    specialSchedules:[
      {id:'ss-001',name:'Summer Hours',startDate:'2026-04-01',endDate:'2026-07-31',
       priority:'medium',active:false,
       days:[
         {dow:2,slots:[{start:'08:00',end:'20:00'}]},
         {dow:3,slots:[{start:'08:00',end:'20:00'}]},
         {dow:4,slots:[{start:'08:00',end:'20:00'}]},
         {dow:5,slots:[{start:'08:00',end:'20:00'}]},
       ]},
    ],

    // Branch selections from global pool
    subjects:[
      {subjectId:'subj-eng',     active:true },
      {subjectId:'subj-math',    active:true },
      {subjectId:'subj-science', active:true },
      {subjectId:'subj-eng-a',   active:true },
      {subjectId:'subj-eng-g',   active:false},
    ],
    grades:[
      {gradeId:'g-p4', active:true},
      {gradeId:'g-p5', active:true},
      {gradeId:'g-p6', active:true},
      {gradeId:'g-m1', active:true},
    ],
    packages:[
      /* price omitted → use global DB.packages price */
      {packageId:'pkg-24h', active:true},
      {packageId:'pkg-48h', active:true},
      {packageId:'pkg-72h', active:true},
      {packageId:'pkg-96h', active:true},
    ],
    /* Package types ที่สาขาขาย (Settings → Packages) */
    packageTypes:{ hour:true, week:false },
    /* ⭐ Price Matrix: 'Subject|Grade|Hours' → ราคา (ไม่มี key = inherit tier default) */
    priceMatrix:{
      'Math|ป.5|48':       13900,
      'Math|ป.6|24':       7500,
      'Science|ป.5|24':    7800,
      'Science|ป.5|48':    15400,
    },
    /* ⭐ Promotions (สาขาจัดเอง) — discount ตามยอดชั่วโมงรวมของธุรกรรม
       aggregate:true = รวม hours ข้าม course/bundle ได้ · เลือกเกณฑ์สูงสุดที่ถึง */
    promotions:[
      {id:'promo-sk1', type:'discount_pct', thresholdHours:72, pct:10, aggregate:true, active:true},
      {id:'promo-sk2', type:'discount_pct', thresholdHours:96, pct:15, aggregate:true, active:true},
    ],
  },
  {
    branch:     'Silom',
    schoolType: 'Nockacademy',
    phone:      ['02-222-2222'],
    email:      'silom@nockacademy.com',
    address:    '456 Silom Rd, Bangkok 10500',
    lineId:     '@nock-silom',
    lineToken:  '',
    lineQR:     null,
    rooms:      ['Room A','Room B'],
    socialMedia:[],

    openClose:[
      {dow:0,label:'Sun',open:false},
      {dow:1,label:'Mon',open:false},
      {dow:2,label:'Tue',open:false},
      {dow:3,label:'Wed',open:true, start:'10:00',end:'20:00'},
      {dow:4,label:'Thu',open:true, start:'10:00',end:'20:00'},
      {dow:5,label:'Fri',open:true, start:'10:00',end:'20:00'},
      {dow:6,label:'Sat',open:true, start:'08:00',end:'20:00'},
    ],

    regularHours:[
      {dow:0,label:'Sun',open:false,slots:[],breaks:[]},
      {dow:1,label:'Mon',open:false,slots:[],breaks:[]},
      {dow:2,label:'Tue',open:false,slots:[],breaks:[]},
      {dow:3,label:'Wed',open:true, slots:[{start:'10:00',end:'20:00'}],
        breaks:[{start:'12:00',end:'13:00',label:'Lunch'},{start:'17:00',end:'18:00',label:'Break'}]},
      {dow:4,label:'Thu',open:true, slots:[{start:'10:00',end:'20:00'}],
        breaks:[{start:'12:00',end:'13:00',label:'Lunch'},{start:'17:00',end:'18:00',label:'Break'}]},
      {dow:5,label:'Fri',open:true, slots:[{start:'10:00',end:'20:00'}],
        breaks:[{start:'12:00',end:'13:00',label:'Lunch'},{start:'17:00',end:'18:00',label:'Break'}]},
      {dow:6,label:'Sat',open:true, slots:[{start:'08:00',end:'20:00'}],
        breaks:[{start:'12:00',end:'13:00',label:'Lunch'},{start:'15:00',end:'15:30',label:'Break'}]},
    ],

    specialSchedules:[],

    subjects:[
      {subjectId:'subj-math',    active:true },
      {subjectId:'subj-thai',    active:true },
      {subjectId:'subj-science', active:false},
    ],
    grades:[
      {gradeId:'g-p5', active:true},
      {gradeId:'g-p6', active:true},
    ],
    packages:[
      /* price = per-branch override (Silom cheaper than global) */
      {packageId:'pkg-24h', active:true, price:6600},
      {packageId:'pkg-48h', active:true, price:13200},
      {packageId:'pkg-72h', active:true, price:18480},
      {packageId:'pkg-96h', active:true, price:26400},
    ],
    packageTypes:{ hour:true, week:false },
    priceMatrix:{
      'Science|ป.5|24':    7200,
      'Science|ป.5|48':    14200,
    },
    promotions:[
      {id:'promo-sl1', type:'discount_pct', thresholdHours:72, pct:15, aggregate:true, active:true},
      {id:'promo-sl2', type:'discount_pct', thresholdHours:96, pct:20, aggregate:true, active:true},
    ],
  },
];

/* ── BRANCH FACTORY ───────────────────────────────────────────
   สาขาที่เหลือ (จาก Branch list จริง) — ใช้ default แล้ว override เฉพาะที่ต่าง
   ⚠️ CONST.BRANCHES ยังเป็น 2 สาขาที่มี mock data เต็ม (Sukhumvit/Silom)
      สาขาที่เพิ่มที่นี่ = ตั้งค่าได้ใน Settings แต่ยังไม่มี session/class seed */
function _mkBranch(o) {
  const hours = (open, start, end) => ({ dow:open.dow, label:open.label, open:open.open,
    slots: open.open ? [{start,end}] : [], breaks: open.open ? [{start:'12:00',end:'13:00',label:'Lunch'}] : [] });
  const week = [
    {dow:0,label:'Sun',open:true},{dow:1,label:'Mon',open:false},{dow:2,label:'Tue',open:true},
    {dow:3,label:'Wed',open:true},{dow:4,label:'Thu',open:true},{dow:5,label:'Fri',open:true},{dow:6,label:'Sat',open:true},
  ];
  return Object.assign({
    branch: o.branch, schoolType: o.schoolType, area: o.area, active: o.active !== false,
    phone:[o.phone||'02-000-0000'], email:`${o.branch.toLowerCase().replace(/\s+/g,'')}@${(o.schoolType||'na').toLowerCase()}.com`,
    address:o.address||`${o.branch}`, lineId:`@${o.branch.toLowerCase().replace(/\s+/g,'-')}`, lineToken:'', lineQR:null,
    rooms:o.rooms||['Room A','Room B'], socialMedia:[],
    openClose: week.map(d=>({dow:d.dow,label:d.label,open:d.open,start:'10:00',end:'19:00'})),
    regularHours: week.map(d=>hours(d,'10:00','19:00')),
    specialSchedules:[],
    subjects:[{subjectId:'subj-eng',active:true},{subjectId:'subj-math',active:true},{subjectId:'subj-science',active:true}],
    grades:[{gradeId:'g-p4',active:true},{gradeId:'g-p5',active:true},{gradeId:'g-p6',active:true}],
    packages:[{packageId:'pkg-24h',active:true},{packageId:'pkg-48h',active:true}],
    packageTypes:{ hour:true, week:false, month:false },
    priceMatrix:{}, promotions:[],
  }, o.extra || {});
}

window._mkBranchRecord = _mkBranch;   // Settings → Add Branch ใช้สร้าง record ใหม่

/* Branch list จริง (Liclass + Nockacademy) */
_branchSettings.push(
  _mkBranch({ branch:'Thonglor',     schoolType:'Liclass',     area:'Bangkok', address:'Thonglor, Bangkok',
              extra:{ packageTypes:{ hour:false, week:false, month:true } } }),
  _mkBranch({ branch:'Sriracha (Liclass)',  schoolType:'Liclass', area:'Eastern', address:'Sriracha, Chonburi',
              extra:{ packageTypes:{ hour:false, week:false, month:true } } }),
  _mkBranch({ branch:'Sriracha',     schoolType:'Nockacademy', area:'Eastern', address:'Sriracha, Chonburi' }),
  _mkBranch({ branch:'Pattaya',      schoolType:'Nockacademy', area:'Eastern', address:'Pattaya, Chonburi' }),
  _mkBranch({ branch:'Ban Bueng',    schoolType:'Nockacademy', area:'Eastern', address:'Ban Bueng, Chonburi' }),
  _mkBranch({ branch:'Venture Park', schoolType:'Nockacademy', area:'Bangkok', address:'Venture Park, Bangkok' }),
  _mkBranch({ branch:'Bang-Na',      schoolType:'Nockacademy', area:'Bangkok', address:'Bang-Na, Bangkok', active:false }),
);
/* สาขาเดิม 2 ตัว — เติม field ใหม่ให้ครบ (area/active/month type) */
_branchSettings[0].area='Bangkok'; _branchSettings[0].active=true; _branchSettings[0].packageTypes.month=false;
_branchSettings[1].area='Bangkok'; _branchSettings[1].active=true; _branchSettings[1].packageTypes.month=false;

/* ── HOLIDAYS ─────────────────────────────────────────────── */
// Director-managed · applies to all branches of matching schoolType
// schoolType: 'all' | 'Nockacademy' | 'Liclass'
const _holidays = [
  {id:'hol-001',name:"New Year's Day",         date:'2026-01-01',schoolType:'all',active:true},
  {id:'hol-002',name:'Makha Bucha Day',         date:'2026-03-03',schoolType:'all',active:true},
  {id:'hol-003',name:'Chakri Memorial Day',     date:'2026-04-06',schoolType:'all',active:true},
  {id:'hol-004',name:'Songkran (Day 1)',         date:'2026-04-13',schoolType:'all',active:true},
  {id:'hol-005',name:'Songkran (Day 2)',         date:'2026-04-14',schoolType:'all',active:true},
  {id:'hol-006',name:'Songkran (Day 3)',         date:'2026-04-15',schoolType:'all',active:true},
  {id:'hol-007',name:'Labour Day',              date:'2026-05-01',schoolType:'all',active:true},
  {id:'hol-008',name:'Coronation Day',          date:'2026-05-04',schoolType:'all',active:true},
  {id:'hol-009',name:'Visakha Bucha Day',       date:'2026-05-31',schoolType:'all',active:true},
  {id:'hol-010',name:'Asanha Bucha Day',        date:'2026-07-29',schoolType:'all',active:true},
  {id:'hol-011',name:'Buddhist Lent Day',       date:'2026-07-30',schoolType:'all',active:true},
  {id:'hol-012',name:"Queen's Birthday",        date:'2026-08-12',schoolType:'all',active:true},
  {id:'hol-013',name:"Late King's Memorial Day",date:'2026-10-13',schoolType:'all',active:true},
  {id:'hol-014',name:'Chulalongkorn Day',       date:'2026-10-23',schoolType:'all',active:true},
  {id:'hol-015',name:"King's Birthday",         date:'2026-12-05',schoolType:'all',active:true},
  {id:'hol-016',name:'Constitution Day',        date:'2026-12-10',schoolType:'all',active:true},
  {id:'hol-017',name:"New Year's Eve",          date:'2026-12-31',schoolType:'all',active:true},
];

/* ── EXTEND window.DB ─────────────────────────────────────── */
Object.assign(window.DB, {
  subjects:       _subjects,
  gradesPool:     _gradesPool,
  packages:       _packages,
  branchSettings: _branchSettings,
  holidays:       _holidays,
});
