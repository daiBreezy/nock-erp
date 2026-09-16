/* ============================================================
   data.js — NockERP Global Data Store  (Rebuilt 28 May 2026)
   Single source of truth — every module reads from window.DB

   Cross-reference map:
     student.familyId          → families[].id
     family.studentIds[]       → students[].id
     conversation.familyId     → families[].id   (customers)
     conversation.leadId       → leads[].id       (pipeline)
     lead.convId               → conversations[].id
     invoice.studentId         → students[].id
     invoice.familyId          → families[].id
     invoice.leadId            → leads[].id       (pre-enrollment)
     receipt.invoiceId         → invoices[].id
     class.students[]          → mix: student.name for known, string for ghost
     session.studentNames[]    → same convention as class.students[]
   ============================================================ */

/* ── STUDENTS ─────────────────────────────────────────────── */
const _students = [

  { id:'mia', name:'Mia Tanaka', nick:'มีมี่', age:9, grade:'ป.4',
    branch:'Sukhumvit', familyId:'tanaka', classId:'cls-001',
    line:'@tanaka_mom', phone:'081-234-5678', enrollDate:'2026-02-01',
    teacher:'Kru Bee', status:'renewal',
    courses:[{courseId:'crs-003', name:'Eng (Active) ป.4', hours:48, used:46, left:2, price:14400}],
    schedule:[
      {date:'Thu 28 May', time:'10:00', room:'Room A', teacher:'Kru Bee', status:'ended'},
      {date:'Sat 30 May', time:'10:00', room:'Room A', teacher:'Kru Bee', status:'upcoming'},
    ],
    attendance:[
      {date:'Thu 28 May', course:'Eng (Active) ป.4', status:'present'},
      {date:'Wed 27 May', course:'Eng (Active) ป.4', status:'present'},
      {date:'Tue 26 May', course:'Eng (Active) ป.4', status:'present'},
      {date:'Thu 21 May', course:'Eng (Active) ป.4', status:'leave'},
      {date:'Wed 20 May', course:'Eng (Active) ป.4', status:'present'},
      {date:'Tue 19 May', course:'Eng (Active) ป.4', status:'absent'},
    ],
    invoices:[{id:'INV-2026-0032',date:'2026-02-01',amount:14400,status:'paid',course:'Eng (Active) ป.4 · 48h.'}],
    notes:[
      {type:'teacher', text:'Mia making great progress with reading comprehension. Recommend phonics vol.2.', author:'Kru Bee',    date:'27 May'},
      {type:'admin',   text:'Renewal invoice sent — parent confirmed transfer coming.',                       author:'Admin Nock', date:'26 May'},
    ]},

  { id:'tom', name:'Tom Chen', nick:'ทอม', age:12, grade:'ป.6',
    branch:'Sukhumvit', familyId:'chen', classId:'cls-002',
    line:'@chen_mom', phone:'082-345-6789', enrollDate:'2026-01-15',
    teacher:'Kru Cat', status:'active',
    courses:[{courseId:'crs-002', name:'Math ป.6', hours:48, used:34, left:14, price:14400}],
    schedule:[
      {date:'Thu 28 May', time:'15:00', room:'Room B', teacher:'Kru Cat', status:'upcoming'},
      {date:'Sat 30 May', time:'13:00', room:'Room B', teacher:'Kru Cat', status:'upcoming'},
    ],
    attendance:[
      {date:'Wed 27 May', course:'Math ป.6', status:'present'},
      {date:'Tue 26 May', course:'Math ป.6', status:'present'},
      {date:'Wed 20 May', course:'Math ป.6', status:'present'},
      {date:'Tue 19 May', course:'Math ป.6', status:'leave'},
      {date:'Wed 13 May', course:'Math ป.6', status:'present'},
      {date:'Tue 12 May', course:'Math ป.6', status:'present'},
    ],
    invoices:[{id:'INV-2026-0028',date:'2026-01-15',amount:14400,status:'paid',course:'Math ป.6 · 48h.'}],
    notes:[
      {type:'teacher', text:'Tom is strong in algebra but needs more practice with geometry proofs.', author:'Kru Cat', date:'27 May'},
    ]},

  { id:'ploy', name:'Ploy Srirak', nick:'พลอย', age:10, grade:'ป.5',
    branch:'Silom', familyId:'srirak', classId:'cls-006',
    line:'@srirak_mom', phone:'083-456-7890', enrollDate:'2026-01-20',
    teacher:'Kru Arm / Kru Eve', status:'active',
    courses:[
      {courseId:'crs-001', name:'Math ป.5', hours:24, used:6,  left:18, price:7200},
      {courseId:'crs-005', name:'Thai ป.5', hours:24, used:6,  left:18, price:7200},
    ],
    schedule:[
      {date:'Sat 30 May', time:'15:00', room:'Room A', teacher:'Kru Eve', status:'upcoming'},
      {date:'Mon 1 Jun',  time:'10:00', room:'Room B', teacher:'Kru Arm', status:'upcoming'},
    ],
    attendance:[
      {date:'Wed 27 May', course:'Thai ป.5',  status:'leave'},
      {date:'Wed 27 May', course:'Math ป.5',  status:'present'},
      {date:'Mon 25 May', course:'Thai ป.5',  status:'present'},
      {date:'Mon 25 May', course:'Math ป.5',  status:'present'},
      {date:'Wed 20 May', course:'Math ป.5',  status:'present'},
      {date:'Mon 19 May', course:'Thai ป.5',  status:'present'},
    ],
    invoices:[
      {id:'INV-2026-0029',date:'2026-01-20',amount:7200,status:'paid',course:'Math ป.5 · 24h.'},
      {id:'INV-2026-0030',date:'2026-01-20',amount:7200,status:'paid',course:'Thai ป.5 · 24h.'},
    ],
    notes:[
      {type:'admin', text:'Requested Wednesday-only schedule. Ploy enrolled in Math + Thai at Silom.', author:'Admin Nock', date:'10 May'},
    ]},

  { id:'james', name:'James Wilson', nick:'เจมส์', age:11, grade:'ป.5',
    branch:'Sukhumvit', familyId:'wilson', classId:'cls-004',
    line:'@wilson_dad', phone:'084-567-8901', enrollDate:'2026-03-01',
    teacher:'Kru Dan', status:'renewal',
    courses:[{courseId:'crs-004', name:'Science ป.5', hours:24, used:23, left:1, price:7200}],
    schedule:[
      {date:'Thu 28 May', time:'13:00', room:'Room C', teacher:'Kru Dan', status:'active'},
    ],
    attendance:[
      {date:'Wed 27 May', course:'Science ป.5', status:'present'},
      {date:'Tue 26 May', course:'Science ป.5', status:'present'},
      {date:'Mon 25 May', course:'Science ป.5', status:'absent'},
      {date:'Wed 20 May', course:'Science ป.5', status:'present'},
      {date:'Tue 19 May', course:'Science ป.5', status:'present'},
      {date:'Mon 18 May', course:'Science ป.5', status:'present'},
    ],
    invoices:[{id:'INV-2026-0041',date:'2026-03-01',amount:7200,status:'paid',course:'Science ป.5 · 24h.'}],
    notes:[
      {type:'teacher', text:'James missed Monday without notice. Renewal is URGENT — 1 session left.', author:'Kru Dan',    date:'26 May'},
      {type:'admin',   text:'Called Wilson dad — payment slip coming by Friday.',                      author:'Admin Nock', date:'26 May'},
    ]},

  { id:'kevin', name:'Kevin Park', nick:'เควิน', age:9, grade:'ป.4',
    branch:'Sukhumvit', familyId:'park', classId:'cls-001',
    line:'@park_dad', phone:'085-678-9012', enrollDate:'2026-04-01',
    teacher:'Kru Bee', status:'active',
    courses:[{courseId:'crs-003', name:'Eng (Active) ป.4', hours:24, used:8, left:16, price:7200}],
    schedule:[
      {date:'Thu 28 May', time:'10:00', room:'Room A', teacher:'Kru Bee', status:'ended'},
      {date:'Sat 30 May', time:'10:00', room:'Room A', teacher:'Kru Bee', status:'upcoming'},
    ],
    attendance:[
      {date:'Thu 28 May', course:'Eng (Active) ป.4', status:'present'},
      {date:'Wed 27 May', course:'Eng (Active) ป.4', status:'leave'},
      {date:'Tue 26 May', course:'Eng (Active) ป.4', status:'present'},
      {date:'Thu 21 May', course:'Eng (Active) ป.4', status:'present'},
      {date:'Wed 20 May', course:'Eng (Active) ป.4', status:'present'},
    ],
    invoices:[{id:'INV-2026-0048',date:'2026-04-01',amount:7200,status:'paid',course:'Eng (Active) ป.4 · 24h.'}],
    notes:[
      {type:'teacher', text:'Kevin is enthusiastic and picks up vocab fast. Consider level-up soon.', author:'Kru Bee', date:'27 May'},
    ]},

  /* ── NEW: Sora Park — Kevin's older sister ── */
  { id:'sora', name:'Sora Park', nick:'โซระ', age:12, grade:'ป.6',
    branch:'Sukhumvit', familyId:'park', classId:'cls-002',
    line:'@park_dad', phone:'085-678-9012', enrollDate:'2026-04-15',
    teacher:'Kru Cat', status:'active',
    courses:[{courseId:'crs-002', name:'Math ป.6', hours:24, used:16, left:8, price:7200}],
    schedule:[
      {date:'Thu 28 May', time:'15:00', room:'Room B', teacher:'Kru Cat', status:'upcoming'},
      {date:'Sat 30 May', time:'13:00', room:'Room B', teacher:'Kru Cat', status:'upcoming'},
    ],
    attendance:[
      {date:'Wed 27 May', course:'Math ป.6', status:'present'},
      {date:'Tue 26 May', course:'Math ป.6', status:'present'},
      {date:'Wed 20 May', course:'Math ป.6', status:'leave'},
      {date:'Tue 19 May', course:'Math ป.6', status:'present'},
      {date:'Wed 13 May', course:'Math ป.6', status:'present'},
    ],
    invoices:[{id:'INV-2026-0049',date:'2026-04-15',amount:7200,status:'paid',course:'Math ป.6 · 24h.'}],
    notes:[
      {type:'teacher', text:'Sora is Kevin\'s older sister. Very focused, strong in algebra.', author:'Kru Cat', date:'27 May'},
      {type:'admin',   text:'Park family enrolled both kids same day. Jin Park is the main contact.',  author:'Admin Nock', date:'15 Apr'},
    ]},

  /* ── Bundle student — Course Admission ม.1 (crs-006) ── */
  { id:'win', name:'Win Klahan', nick:'วิน', age:12, grade:'ม.1',
    branch:'Sukhumvit', familyId:'klahan', classId:'cls-007',
    line:'@klahan_mom', phone:'086-789-0123', enrollDate:'2026-04-04',
    teacher:'Kru Cat / Kru Bee / Kru Dan', status:'active',
    courses:[{courseId:'crs-006', name:'Course Admission ม.1', bundle:true, hours:8, used:5, left:3, price:13300}],
    schedule:[
      {date:'Sat 30 May', time:'10:00', room:'Room B', teacher:'Kru Cat', status:'upcoming'},
      {date:'Sat 30 May', time:'13:00', room:'Room A', teacher:'Kru Bee', status:'upcoming'},
      {date:'Sat 30 May', time:'15:00', room:'Room C', teacher:'Kru Dan', status:'upcoming'},
    ],
    attendance:[
      {date:'Sat 23 May', course:'Course Admission ม.1', status:'present'},
      {date:'Sat 16 May', course:'Course Admission ม.1', status:'present'},
      {date:'Sat 9 May',  course:'Course Admission ม.1', status:'absent'},
      {date:'Sat 2 May',  course:'Course Admission ม.1', status:'present'},
    ],
    invoices:[{id:'INV-2026-0050',date:'2026-04-04',amount:13300,status:'paid',course:'Course Admission ม.1 · 2 blocks'}],
    notes:[
      {type:'admin', text:'Bundle enrollment — 2 blocks paid + admission fee. No reschedule per bundle rules.', author:'Admin Nock', date:'4 Apr'},
    ]},
];

/* ── FAMILIES ─────────────────────────────────────────────── */
const _families = [

  { id:'tanaka', name:'Tanaka Family', branch:'Sukhumvit',
    assignee:'Admin Nock', status:'renewal',
    studentIds:['mia'],
    totalPaid:14400, invoiceCount:1, lastContact:'Today 14:30', channel:'LINE', unreadCount:1,
    parents:[
      {role:'Mom', name:'Nami Tanaka', line:'@tanaka_mom', phone:'081-234-5678', email:'nami.tanaka@email.com', lineActive:true}
    ],
    notes:[{type:'admin', text:'Very responsive on LINE. Mia is their only child. Renewal invoice sent.', author:'Admin Nock', date:'26 May'}]},

  { id:'chen', name:'Chen Family', branch:'Sukhumvit',
    assignee:'Kru Cat', status:'active',
    studentIds:['tom'],
    totalPaid:14400, invoiceCount:1, lastContact:'Yesterday', channel:'LINE', unreadCount:0,
    parents:[
      {role:'Mom', name:'Lisa Chen', line:'@chen_mom', phone:'082-345-6789', email:'lisa.chen@email.com', lineActive:true}
    ],
    notes:[{type:'admin', text:'Tom attending regularly. Draft renewal invoice ready when needed.', author:'Admin Nock', date:'20 May'}]},

  { id:'srirak', name:'Srirak Family', branch:'Silom',
    assignee:'Admin Nock', status:'active',
    studentIds:['ploy'],
    totalPaid:14400, invoiceCount:2, lastContact:'Mon', channel:'LINE', unreadCount:0,
    parents:[
      {role:'Mom', name:'Wan Srirak', line:'@srirak_mom', phone:'083-456-7890', email:'wan.srirak@email.com', lineActive:true}
    ],
    notes:[{type:'admin', text:'Ploy enrolled in Math ป.5 + Thai ป.5. Wednesday-only schedule at Silom.', author:'Admin Nock', date:'10 May'}]},

  { id:'wilson', name:'Wilson Family', branch:'Sukhumvit',
    assignee:'Admin Nock', status:'renewal',
    studentIds:['james'],
    totalPaid:4800, invoiceCount:1, lastContact:'Today 09:15', channel:'LINE', unreadCount:1,
    parents:[
      {role:'Dad', name:'Ben Wilson',  line:'@wilson_dad', phone:'084-567-8901', email:'ben.wilson@email.com',  lineActive:true },
      {role:'Mom', name:'Sara Wilson', line:'',            phone:'084-567-8900', email:'',                      lineActive:false},
    ],
    notes:[{type:'admin', text:'Dad handles all comms. James has 1 session left — URGENT renewal needed.', author:'Admin Nock', date:'26 May'}]},

  { id:'park', name:'Park Family', branch:'Sukhumvit',
    assignee:'Admin Nock', status:'active',
    studentIds:['kevin', 'sora'],   /* ← 2 students in 1 family */
    ownedItems:['bk-dict'],         /* พี่น้องเคยซื้อ Dictionary แล้ว → invoice ไม่ต้องคิดซ้ำ */
    totalPaid:14400, invoiceCount:2, lastContact:'Tue', channel:'LINE', unreadCount:0,
    parents:[
      {role:'Dad', name:'Jin Park', line:'@park_dad', phone:'085-678-9012', email:'jin.park@email.com', lineActive:true}
    ],
    notes:[
      {type:'admin', text:'Jin Park enrolled 2 kids: Kevin ป.4 (Eng Active) + Sora ป.6 (Math). Both at Sukhumvit.', author:'Admin Nock', date:'15 Apr'}
    ]},

  { id:'klahan', name:'Klahan Family', branch:'Sukhumvit',
    assignee:'Admin Nock', status:'active',
    studentIds:['win'],
    totalPaid:13300, invoiceCount:1, lastContact:'Sat', channel:'LINE', unreadCount:0,
    parents:[
      {role:'Mom', name:'Nida Klahan', line:'@klahan_mom', phone:'086-789-0123', email:'nida.klahan@email.com', lineActive:true}
    ],
    notes:[{type:'admin', text:'Win enrolled in Course Admission ม.1 bundle (Sat · Math+Eng+Science). Paid 2 blocks + admission fee.', author:'Admin Nock', date:'4 Apr'}]},
];

/* ── STAFF ────────────────────────────────────────────────── */
const _staff = [

  { id:'arm', name:'Kru Arm', weeklyEffectiveLoad:18, fullName:'Aranya Sombat', nick:'อาม',
    image: null, defaultBranch:'Sukhumvit',
    roleAssignments:[
      { role:'teacher', branch:'Sukhumvit', days:['Mon','Tue','Wed','Thu','Fri'], subjects:['subj-math'] },
      { role:'teacher', branch:'Silom',     days:['Sat','Sun'],                  subjects:['subj-math'] },
    ],
    // backward compat
    roles:['teacher'], role:'Teacher', subjects:['subj-math'], grades:['g-p5','g-p6'],
    branches:['Sukhumvit','Silom'],
    phones:[{ label:'Work', number:'090-111-2222', isDefault:true }],
    phone:'090-111-2222', line:'@kru_arm', email:'arm@nockacademy.com',
    joinDate:'2024-06-01', status:'active',
    weeklyClassCount:6, thisWeekSessions:6, totalSessions:89,
    activeStudents:1, summaryPending:1,
    students:['Ploy Srirak'],
    notes:[{type:'admin', text:'Covers Math at both Sukhumvit + Silom. Excellent at visual explanation.', author:'Admin Nock', date:'1 May'}],
    logs:[
      {type:'student_added',  text:'Ploy Srirak added to Math ป.5 (Silom)',          date:'26 May 2026', by:'Admin Nock'},
      {type:'attendance',     text:'Attendance marked — Math ป.5 · Mon 25 May · 4 students', date:'25 May 2026', by:'Kru Arm'},
      {type:'summary_sent',   text:'Summary sent for Ploy Srirak → Srirak Family',   date:'25 May 2026', by:'Kru Arm'},
      {type:'summary_written',text:'Summary written — Math ป.5 · Sat 24 May',        date:'24 May 2026', by:'Kru Arm'},
      {type:'login',          text:'Logged in · iPad · Sukhumvit',                   date:'28 May 2026', by:'Kru Arm'},
    ]},

  { id:'bee', name:'Kru Bee', fullName:'Benyapa Rattana', weeklyEffectiveLoad:28, nick:'บี',
    image: null, defaultBranch:'Sukhumvit',
    roleAssignments:[
      { role:'teacher', branch:'Sukhumvit', days:['Tue','Wed','Thu','Sat'], subjects:['subj-eng-a','subj-eng'] },
    ],
    roles:['teacher'], role:'Teacher', subjects:['subj-eng-a','subj-eng'], grades:['g-p4','g-p5','g-p6'],
    branches:['Sukhumvit'],
    phones:[{ label:'Work', number:'090-222-3333', isDefault:true }, { label:'Personal', number:'081-555-7777' }],
    phone:'090-222-3333', line:'@kru_bee', email:'bee@nockacademy.com',
    joinDate:'2024-03-15', status:'active',
    weeklyClassCount:7, thisWeekSessions:7, totalSessions:146,
    activeStudents:2, summaryPending:2,
    students:['Mia Tanaka','Kevin Park'],
    notes:[{type:'admin', text:'Top performer. Parents request Kru Bee by name. Consider senior teacher.', author:'Admin Nock', date:'5 May'}],
    logs:[
      {type:'student_added',  text:'Kevin Park added to Eng (Active) ป.4',           date:'27 May 2026', by:'Admin Nock'},
      {type:'attendance',     text:'Attendance marked — Eng ป.4 · Thu 28 May · ended',date:'28 May 2026', by:'Kru Bee'},
      {type:'summary_written',text:'Summary written — Mia Tanaka · Thu 28 May',       date:'28 May 2026', by:'Kru Bee'},
      {type:'summary_sent',   text:'Summary sent for Mia Tanaka → Tanaka Family',     date:'27 May 2026', by:'Kru Bee'},
      {type:'login',          text:'Logged in · MacBook · Sukhumvit',                 date:'28 May 2026', by:'Kru Bee'},
    ]},

  { id:'cat', name:'Kru Cat', fullName:'Chotika Panya', weeklyEffectiveLoad:25, nick:'แคท',
    image: null, defaultBranch:'Sukhumvit',
    roleAssignments:[
      { role:'teacher', branch:'Sukhumvit', days:['Tue','Wed','Thu','Sat'], subjects:['subj-math'] },
    ],
    roles:['teacher'], role:'Teacher', subjects:['subj-math'], grades:['g-p6'],
    branches:['Sukhumvit'],
    phones:[{ label:'Work', number:'090-333-4444', isDefault:true }],
    phone:'090-333-4444', line:'@kru_cat', email:'cat@nockacademy.com',
    joinDate:'2025-01-10', status:'active',
    weeklyClassCount:5, thisWeekSessions:5, totalSessions:65,
    activeStudents:2, summaryPending:1,
    students:['Tom Chen','Sora Park'],
    notes:[],
    logs:[
      {type:'student_added',  text:'Sora Park added to Math ป.6',                   date:'20 May 2026', by:'Admin Nock'},
      {type:'attendance',     text:'Attendance marked — Math ป.6 · Wed 27 May',      date:'27 May 2026', by:'Kru Cat'},
      {type:'summary_written',text:'Summary written — Tom Chen · Wed 27 May',        date:'27 May 2026', by:'Kru Cat'},
      {type:'schedule_change',text:'Class rescheduled: Thu 15 May (Holiday) → Mon 18 May', date:'14 May 2026', by:'Admin Nock'},
      {type:'login',          text:'Logged in · iPhone · Sukhumvit',                 date:'27 May 2026', by:'Kru Cat'},
    ]},

  { id:'dan', name:'Kru Dan', fullName:'Danai Wongkham', weeklyEffectiveLoad:8, nick:'แดน',
    image: null, defaultBranch:'Sukhumvit',
    roleAssignments:[
      { role:'teacher', branch:'Sukhumvit', days:['Mon','Tue','Wed','Thu'], subjects:['subj-science'] },
      { role:'teacher', branch:'Silom',     days:['Sat'],                  subjects:['subj-science'] },
    ],
    roles:['teacher'], role:'Teacher', subjects:['subj-science'], grades:['g-p5','g-p6','g-m1','g-m2','g-m3'],
    branches:['Sukhumvit','Silom'],
    phones:[{ label:'Work', number:'090-444-5555', isDefault:true }],
    phone:'090-444-5555', line:'@kru_dan', email:'dan@nockacademy.com',
    joinDate:'2024-09-01', status:'active',
    weeklyClassCount:4, thisWeekSessions:4, totalSessions:60,
    activeStudents:1, summaryPending:1,
    students:['James Wilson'],
    notes:[{type:'admin', text:'Covers both branches. Check travel schedule to avoid double-booking.', author:'Admin Nock', date:'8 May'}],
    logs:[
      {type:'student_added',  text:'James Wilson added to Science ป.5',              date:'5 Mar 2026',  by:'Admin Nock'},
      {type:'attendance',     text:'Attendance marked — Science ป.5 · Thu 28 May (active)', date:'28 May 2026', by:'Kru Dan'},
      {type:'note_added',     text:'Admin Nock added a note: check travel schedule', date:'8 May 2026',  by:'Admin Nock'},
      {type:'login',          text:'Logged in · Android · Sukhumvit',                date:'28 May 2026', by:'Kru Dan'},
    ]},

  { id:'eve', name:'Kru Eve', fullName:'Evapha Chinarat', weeklyEffectiveLoad:9, nick:'อีฟ',
    image: null, defaultBranch:'Silom',
    roleAssignments:[
      { role:'teacher', branch:'Silom', days:['Mon','Wed','Sat'], subjects:['subj-thai'] },
    ],
    roles:['teacher'], role:'Teacher', subjects:['subj-thai'], grades:['g-p5','g-p6'],
    branches:['Silom'],
    phones:[{ label:'Work', number:'090-555-6666', isDefault:true }],
    phone:'090-555-6666', line:'@kru_eve', email:'eve@nockacademy.com',
    joinDate:'2025-03-01', status:'active',
    weeklyClassCount:3, thisWeekSessions:3, totalSessions:36,
    activeStudents:1, summaryPending:0,
    students:['Ploy Srirak'],
    notes:[],
    logs:[
      {type:'attendance',     text:'Attendance marked — Thai ป.5 · Wed 27 May',      date:'27 May 2026', by:'Kru Eve'},
      {type:'summary_sent',   text:'Summary sent for Ploy Srirak → Srirak Family',   date:'26 May 2026', by:'Kru Eve'},
      {type:'login',          text:'Logged in · iPad · Silom',                        date:'27 May 2026', by:'Kru Eve'},
    ]},

  { id:'nock', name:'Admin Nock', fullName:'Nockacademy Admin', nick:'น็อค',
    image: null, defaultBranch:'Sukhumvit',
    adminTier:'master',   // Master Admin: สร้าง Invoice+Receipt ได้ + signature
    signature: null,      // null = ยังไม่ได้ upload signature
    specialAdmin:true,    // Finance: Director-appointed — oversees ทุกสาขา + approve tier สูงสุด
    roleAssignments:[
      { role:'admin', branch:'Sukhumvit', days:['Mon','Tue','Wed','Thu','Fri'], subjects:[] },
      { role:'admin', branch:'Silom',     days:['Sat','Sun'],                   subjects:[] },
    ],
    roles:['admin'], role:'Admin', subjects:[], grades:[],
    branches:['Sukhumvit','Silom'],
    phones:[{ label:'Work', number:'090-000-1111', isDefault:true }],
    phone:'090-000-1111', line:'@admin_nock', email:'nock@nockacademy.com',
    joinDate:'2024-01-01', status:'active',
    weeklyClassCount:0, thisWeekSessions:0, totalSessions:0,
    activeStudents:0, summaryPending:0,
    students:[],
    notes:[],
    logs:[
      {type:'login',          text:'Logged in · MacBook Pro · Sukhumvit',             date:'28 May 2026', by:'Admin Nock'},
      {type:'student_added',  text:'Sora Park enrolled — Park Family',                date:'20 May 2026', by:'Admin Nock'},
      {type:'note_added',     text:'Added note to Kru Dan profile',                   date:'8 May 2026',  by:'Admin Nock'},
    ]},

  /* ── Director + Manager (role hierarchy demo) ── */
  { id:'nockceo', name:'Nock', fullName:'Nock Director', nick:'น็อค',
    image: null, defaultBranch:'Sukhumvit',
    roleAssignments:[
      { role:'director', branch:'Sukhumvit', days:[], subjects:[] },
      { role:'director', branch:'Silom',     days:[], subjects:[] },
    ],
    roles:['director'], role:'Director', subjects:[], grades:[],
    branches:['Sukhumvit','Silom'],
    phones:[{ label:'Work', number:'090-999-0000', isDefault:true }],
    phone:'090-999-0000', line:'@nock_director', email:'director@nockacademy.com',
    joinDate:'2024-01-01', status:'active',
    weeklyClassCount:0, thisWeekSessions:0, totalSessions:0, weeklyEffectiveLoad:0,
    activeStudents:0, summaryPending:0,
    students:[],
    notes:[],
    logs:[
      {type:'login', text:'Logged in · MacBook Pro · HQ', date:'28 May 2026', by:'Nock'},
    ]},

  { id:'mint', name:'Manager Mint', fullName:'Mintra Suwan', nick:'มิ้นท์',
    image: null, defaultBranch:'Sukhumvit',
    roleAssignments:[
      { role:'manager', branch:'Sukhumvit', days:['Mon','Tue','Wed','Thu','Fri','Sat'], subjects:[] },
    ],
    roles:['manager'], role:'Manager', subjects:[], grades:[],
    branches:['Sukhumvit'],
    phones:[{ label:'Work', number:'090-888-7777', isDefault:true }],
    phone:'090-888-7777', line:'@mgr_mint', email:'mint@nockacademy.com',
    joinDate:'2025-06-01', status:'active',
    weeklyClassCount:0, thisWeekSessions:0, totalSessions:0, weeklyEffectiveLoad:0,
    activeStudents:0, summaryPending:0,
    students:[],
    notes:[],
    logs:[
      {type:'login', text:'Logged in · iPad · Sukhumvit', date:'27 May 2026', by:'Manager Mint'},
    ]},
];

/* ── BRANCH PRICING ───────────────────────────────────────── */
const _branchPricing = {
  'Sukhumvit': { h24:7200,  h48:14400, h72:20160, h96:28800 },
  'Silom':     { h24:6600,  h48:13200, h72:18480, h96:26400 },
};

/* ── COURSES CATALOG ──────────────────────────────────────── */
const _courses = [
  /* ⭐ ราคา: ไม่ตั้ง prices ที่ course → ใช้ Settings → Price Matrix ของสาขา
     (course.prices = ชั้น override เฉพาะ course — ตั้งได้ตอนสร้าง/แก้ course) */
  { id:'crs-001', name:'Math ป.5', type:'single',
    subjects:[{subject:'Math', grade:'ป.5', hours:24}],
    suggestedTeacher:'Kru Arm', branches:['Sukhumvit','Silom'],
    promotions:[], createdAt:'2026-01-01' },

  { id:'crs-002', name:'Math ป.6', type:'single',
    subjects:[{subject:'Math', grade:'ป.6', hours:48}],
    suggestedTeacher:'Kru Cat', branches:['Sukhumvit'],
    promotions:[], createdAt:'2026-01-01' },

  { id:'crs-003', name:'Eng (Active) ป.4', type:'single',
    subjects:[{subject:'Eng (Active)', grade:'ป.4', hours:48}],
    suggestedTeacher:'Kru Bee', branches:['Sukhumvit'],
    promotions:[
      {id:'promo-1', name:'Early Enrollment', discount:10, expiry:'2026-07-31', active:true}
    ], createdAt:'2026-01-15' },

  { id:'crs-004', name:'Science ป.5', type:'single',
    subjects:[{subject:'Science', grade:'ป.5', hours:24}],
    suggestedTeacher:'Kru Dan', branches:['Sukhumvit','Silom'],
    promotions:[], createdAt:'2026-01-20' },

  { id:'crs-005', name:'Thai ป.5', type:'single',
    subjects:[{subject:'Thai', grade:'ป.5', hours:24}],
    suggestedTeacher:'Kru Eve', branches:['Silom'],
    promotions:[], createdAt:'2026-01-20' },

  { id:'crs-006', name:'Course Admission ม.1', courseType:'bundle',
    // Bundle-specific fields
    bundleStartDate:   '2026-04-01',
    bundleEndDate:     '2027-02-28',
    bundleDayOfWeek:   'Sat',          // legacy — ใช้ bundleDays แทน
    bundleDays:        ['Sat','Sun'],  // ⭐ Admin เปิดไว้ 2 รอบ — นักเรียนเลือกรอบเดียว (สัปดาห์ละครั้ง)
    bundleSubjects:[
      { subjectId:'subj-math',    subject:'Math',    grade:'ม.1', slotId:0 }, // 10:00-12:00
      { subjectId:'subj-eng',     subject:'Eng',     grade:'ม.1', slotId:1 }, // 13:00-15:00
      { subjectId:'subj-science', subject:'Science', grade:'ม.1', slotId:2 }, // 15:00-17:00
    ],
    // Billing: 1 block = 4 Saturdays = 8h/subject (2h slot × 4 classes)
    billingBlockSize:  4,      // class days per block
    billingBlockPrice: 5900,   // THB per block
    admissionFee:      1500,   // first-time enrollment only
    // Backward-compat fields (used by existing UI)
    type:'bundle',
    subjects:[
      {subject:'Math',    grade:'ม.1', hours:8},  // 8h = 1 block
      {subject:'Eng',     grade:'ม.1', hours:8},
      {subject:'Science', grade:'ม.1', hours:8},
    ],
    suggestedTeacher:'', branches:['Sukhumvit'],
    promotions:[], createdAt:'2026-02-01' },
];

/* ── CLASSES ──────────────────────────────────────────────── */
const _classes = [

  // startTime + duration (h) = flexible ← new fields
  // slotId kept for legacy session/calendar compat
  { id:'cls-001', name:'Eng (Active) ป.4 – Sukhumvit (Kru Bee)',
    subject:'Eng (Active)', grade:'ป.4', teacher:'Kru Bee',
    branch:'Sukhumvit', room:'Room A', days:['Tue','Wed','Thu','Sat'],
    startTime:'10:00', duration:2, slotId:0, courseId:'crs-003',
    type:'group', students:['Mia Tanaka','Kevin Park','Leo E','Ava F'],
    status:'active', createdAt:'2026-02-01' },

  { id:'cls-002', name:'Math ป.6 – Sukhumvit (Kru Cat)',
    subject:'Math', grade:'ป.6', teacher:'Kru Cat',
    branch:'Sukhumvit', room:'Room B', days:['Tue','Wed','Thu','Sat'],
    startTime:'15:00', duration:2, slotId:2, courseId:'crs-002',
    type:'group', students:['Tom Chen','Sora Park','Amy B','Ben C','Cal D'],
    status:'active', createdAt:'2026-01-15' },

  { id:'cls-003', name:'Math ป.5 – Sukhumvit (Kru Arm)',
    subject:'Math', grade:'ป.5', teacher:'Kru Arm',
    branch:'Sukhumvit', room:'Room A', days:['Mon','Wed'],
    startTime:'10:00', duration:2, slotId:0, courseId:'crs-001',
    type:'group', students:['Nat B','Jay C','Sam D'],
    status:'active', createdAt:'2026-01-20' },

  { id:'cls-004', name:'Science ป.5 – Sukhumvit (Kru Dan)',
    subject:'Science', grade:'ป.5', teacher:'Kru Dan',
    branch:'Sukhumvit', room:'Room C', days:['Mon','Tue','Wed','Thu'],
    startTime:'13:00', duration:2, slotId:1, courseId:'crs-004',
    type:'group', students:['James Wilson','Hana Y'],
    status:'active', createdAt:'2026-03-01' },

  { id:'cls-005', name:'Thai ป.5 – Silom (Kru Eve)',
    subject:'Thai', grade:'ป.5', teacher:'Kru Eve',
    branch:'Silom', room:'Room A', days:['Mon','Wed','Sat'],
    startTime:'15:00', duration:2, slotId:2, courseId:'crs-005',
    type:'group', students:['Ploy Srirak','Wan H','Pan G'],
    status:'active', createdAt:'2026-01-20' },

  { id:'cls-006', name:'Math ป.5 – Silom (Kru Arm)',
    subject:'Math', grade:'ป.5', teacher:'Kru Arm',
    branch:'Silom', room:'Room B', days:['Mon','Wed'],
    startTime:'10:00', duration:2, slotId:0, courseId:'crs-001',
    type:'group', students:['Ploy Srirak','Rim K','Chai L'],
    status:'active', createdAt:'2026-01-20' },

  /* ── Bundle classes — crs-006 Course Admission ม.1 (Sat · fixed schedule) ── */
  { id:'cls-007', name:'Admission ม.1 · Math – Sukhumvit (Kru Cat)',
    subject:'Math', grade:'ม.1', teacher:'Kru Cat',
    branch:'Sukhumvit', room:'Room B', days:['Sat'],
    startTime:'10:00', duration:2, slotId:0, courseId:'crs-006', bundleId:'crs-006',
    type:'group', students:['Win Klahan'],
    status:'active', createdAt:'2026-04-01' },

  { id:'cls-008', name:'Admission ม.1 · Eng – Sukhumvit (Kru Bee)',
    subject:'Eng', grade:'ม.1', teacher:'Kru Bee',
    branch:'Sukhumvit', room:'Room A', days:['Sat'],
    startTime:'13:00', duration:2, slotId:1, courseId:'crs-006', bundleId:'crs-006',
    type:'group', students:['Win Klahan'],
    status:'active', createdAt:'2026-04-01' },

  { id:'cls-009', name:'Admission ม.1 · Science – Sukhumvit (Kru Dan)',
    subject:'Science', grade:'ม.1', teacher:'Kru Dan',
    branch:'Sukhumvit', room:'Room C', days:['Sat'],
    startTime:'15:00', duration:2, slotId:2, courseId:'crs-006', bundleId:'crs-006',
    type:'group', students:['Win Klahan'],
    status:'active', createdAt:'2026-04-01' },

  /* ── Bundle รอบที่ 2 — crs-006 (Sun) · นักเรียนเลือกรอบเดียวระหว่าง Sat/Sun ── */
  { id:'cls-010', name:'Admission ม.1 · Math – Sukhumvit (Kru Cat) · รอบอาทิตย์',
    subject:'Math', grade:'ม.1', teacher:'Kru Cat',
    branch:'Sukhumvit', room:'Room B', days:['Sun'],
    startTime:'10:00', duration:2, slotId:0, courseId:'crs-006', bundleId:'crs-006',
    type:'group', students:[],
    status:'active', createdAt:'2026-04-01' },

  { id:'cls-011', name:'Admission ม.1 · Eng – Sukhumvit (Kru Bee) · รอบอาทิตย์',
    subject:'Eng', grade:'ม.1', teacher:'Kru Bee',
    branch:'Sukhumvit', room:'Room A', days:['Sun'],
    startTime:'13:00', duration:2, slotId:1, courseId:'crs-006', bundleId:'crs-006',
    type:'group', students:[],
    status:'active', createdAt:'2026-04-01' },

  { id:'cls-012', name:'Admission ม.1 · Science – Sukhumvit (Kru Dan) · รอบอาทิตย์',
    subject:'Science', grade:'ม.1', teacher:'Kru Dan',
    branch:'Sukhumvit', room:'Room C', days:['Sun'],
    startTime:'15:00', duration:2, slotId:2, courseId:'crs-006', bundleId:'crs-006',
    type:'group', students:[],
    status:'active', createdAt:'2026-04-01' },
];

/* ── SESSIONS (Calendar) ──────────────────────────────────── */
/* slotId: 0=10:00-12:00 | 1=13:00-15:00 | 2=15:00-17:00 | 3=18:00-20:00
   col:    1=Mon … 7=Sun
   Week:   Mon 25 May – Sun 31 May 2026 | isToday = Thu 28 May               */
const _sessions = [

  /* ── MONDAY 25 May ─ ended ── */
  {id:'s01', date:'2026-05-25', slotId:0, col:1, subject:'Math',         grade:'ป.5', teacher:'Kru Arm', room:'Room B', color:'green',  state:'ended',  branch:'Silom',
   studentNames:['Ploy Srirak','Rim K','Chai L'],
   attendance:{'Ploy Srirak':'absent','Rim K':'present','Chai L':'present'},
   summaries:{'Ploy Srirak':{text:'',sent:false},'Rim K':{text:'Fractions — solid recall.',sent:true},'Chai L':{text:'',sent:false}}},

  {id:'s02', date:'2026-05-25', slotId:1, col:1, subject:'Science',      grade:'ป.5', teacher:'Kru Dan', room:'Room C', color:'orange', state:'ended',  branch:'Sukhumvit',
   studentNames:['James Wilson','Hana Y'],
   attendance:{'James Wilson':'absent','Hana Y':'present'},
   summaries:{'James Wilson':{text:'',sent:false},'Hana Y':{text:'Ecosystems intro — good focus.',sent:true}}},

  {id:'s03', date:'2026-05-25', slotId:2, col:1, subject:'Thai',         grade:'ป.5', teacher:'Kru Eve', room:'Room A', color:'green',  state:'ended',  branch:'Silom',
   studentNames:['Ploy Srirak','Wan H','Pan G'],
   attendance:{'Ploy Srirak':'present','Wan H':'present','Pan G':'leave'},
   summaries:{'Ploy Srirak':{text:'Thai idioms — great recall!',sent:true},'Wan H':{text:'',sent:false},'Pan G':{text:'',sent:false}}},

  /* ── TUESDAY 26 May ─ ended ── */
  {id:'s04', date:'2026-05-26', slotId:0, col:2, subject:'Eng (Active)', grade:'ป.4', teacher:'Kru Bee', room:'Room A', color:'yellow', state:'ended',  branch:'Sukhumvit',
   studentNames:['Mia Tanaka','Kevin Park','Leo E','Ava F'],
   attendance:{'Mia Tanaka':'present','Kevin Park':'present','Leo E':'present','Ava F':'leave'},
   summaries:{'Mia Tanaka':{text:'Reading drills — excellent pace.',sent:true},'Kevin Park':{text:'Vocab session — very motivated.',sent:true},'Leo E':{text:'',sent:false}}},

  {id:'s05', date:'2026-05-26', slotId:1, col:2, subject:'Science',      grade:'ป.5', teacher:'Kru Dan', room:'Room C', color:'orange', state:'ended',  branch:'Sukhumvit',
   studentNames:['James Wilson'],
   attendance:{'James Wilson':'present'},
   summaries:{'James Wilson':{text:'Plant biology — engaged, asked great questions.',sent:true}}},

  {id:'s06', date:'2026-05-26', slotId:2, col:2, subject:'Math',         grade:'ป.6', teacher:'Kru Cat', room:'Room B', color:'',       state:'ended',  branch:'Sukhumvit',
   studentNames:['Tom Chen','Sora Park','Amy B','Ben C','Cal D'],
   attendance:{'Tom Chen':'present','Sora Park':'present','Amy B':'present','Ben C':'leave','Cal D':'present'},
   summaries:{'Tom Chen':{text:'Quadratics — strong performance.',sent:true},'Sora Park':{text:'Factoring review — very focused.',sent:true},'Amy B':{text:'',sent:false},'Cal D':{text:'',sent:false}}},

  /* ── WEDNESDAY 27 May ─ ended ── */
  {id:'s07', date:'2026-05-27', slotId:0, col:3, subject:'Math',         grade:'ป.5', teacher:'Kru Arm', room:'Room B', color:'green',  state:'ended',  branch:'Silom',
   studentNames:['Ploy Srirak','Rim K','Chai L'],
   attendance:{'Ploy Srirak':'present','Rim K':'present','Chai L':'present'},
   summaries:{'Ploy Srirak':{text:'',sent:false},'Rim K':{text:'',sent:false},'Chai L':{text:'',sent:false}}},

  {id:'s08', date:'2026-05-27', slotId:0, col:3, subject:'Eng (Active)', grade:'ป.4', teacher:'Kru Bee', room:'Room A', color:'yellow', state:'ended',  branch:'Sukhumvit',
   studentNames:['Mia Tanaka','Kevin Park','Leo E','Ava F'],
   attendance:{'Mia Tanaka':'present','Kevin Park':'leave','Leo E':'present','Ava F':'present'},
   summaries:{'Mia Tanaka':{text:'',sent:false},'Leo E':{text:'',sent:false},'Ava F':{text:'',sent:false}}},

  {id:'s09', date:'2026-05-27', slotId:1, col:3, subject:'Science',      grade:'ป.5', teacher:'Kru Dan', room:'Room C', color:'orange', state:'ended',  branch:'Sukhumvit',
   studentNames:['James Wilson'],
   attendance:{'James Wilson':'present'},
   summaries:{'James Wilson':{text:'Chemical reactions — very curious today.',submitted:true,sent:false}}},

  {id:'s10', date:'2026-05-27', slotId:2, col:3, subject:'Math',         grade:'ป.6', teacher:'Kru Cat', room:'Room B', color:'',       state:'ended',  branch:'Sukhumvit',
   studentNames:['Tom Chen','Sora Park','Amy B','Ben C','Cal D'],
   attendance:{'Tom Chen':'present','Sora Park':'present','Amy B':'present','Ben C':'present','Cal D':'present'},
   summaries:{'Tom Chen':{text:'',sent:false},'Sora Park':{text:'',sent:false},'Amy B':{text:'',sent:false}}},

  {id:'s11', date:'2026-05-27', slotId:2, col:3, subject:'Thai',         grade:'ป.5', teacher:'Kru Eve', room:'Room A', color:'green',  state:'ended',  branch:'Silom',
   studentNames:['Ploy Srirak','Wan H','Pan G'],
   attendance:{'Ploy Srirak':'leave','Wan H':'present','Pan G':'present'},
   summaries:{'Ploy Srirak':{text:'',sent:false},'Wan H':{text:'',sent:false},'Pan G':{text:'',sent:false}}},

  /* ── THURSDAY 28 May ─ TODAY ── */
  {id:'s12', date:'2026-05-28', slotId:0, col:4, subject:'Eng (Active)', grade:'ป.4', teacher:'Kru Bee', room:'Room A', color:'yellow', state:'ended',  branch:'Sukhumvit',
   studentNames:['Mia Tanaka','Kevin Park','Leo E','Ava F'],
   attendance:{'Mia Tanaka':'present','Kevin Park':'present','Leo E':'present','Ava F':'present'},
   summaries:{'Mia Tanaka':{text:'',sent:false},'Kevin Park':{text:'',sent:false},'Leo E':{text:'',sent:false}}},

  {id:'s13', date:'2026-05-28', slotId:1, col:4, subject:'Science',      grade:'ป.5', teacher:'Kru Dan', room:'Room C', color:'orange', state:'active', branch:'Sukhumvit', startedAt:'13:05',
   studentNames:['James Wilson'],
   attendance:{'James Wilson':'present'},
   summaries:{}},

  {id:'s14', date:'2026-05-28', slotId:2, col:4, subject:'Math',         grade:'ป.6', teacher:'Kru Cat', room:'Room B', color:'',       state:'upcoming', branch:'Sukhumvit',
   studentNames:['Tom Chen','Sora Park','Amy B','Ben C'],
   attendance:{}, summaries:{}},

  /* ── SATURDAY 30 May ─ upcoming ── */
  {id:'s15', date:'2026-05-30', slotId:0, col:6, subject:'Eng (Active)', grade:'ป.4', teacher:'Kru Bee', room:'Room A', color:'yellow', state:'upcoming', branch:'Sukhumvit',
   studentNames:['Mia Tanaka','Kevin Park','Leo E','Ava F'],
   attendance:{}, summaries:{}},

  {id:'s16', date:'2026-05-30', slotId:1, col:6, subject:'Math',         grade:'ป.6', teacher:'Kru Cat', room:'Room B', color:'',       state:'upcoming', branch:'Sukhumvit',
   studentNames:['Tom Chen','Sora Park','Amy B'],
   attendance:{}, summaries:{}},

  {id:'s17', date:'2026-05-30', slotId:2, col:6, subject:'Thai',         grade:'ป.5', teacher:'Kru Eve', room:'Room A', color:'green',  state:'upcoming', branch:'Silom',
   studentNames:['Ploy Srirak','Wan H'],
   attendance:{}, summaries:{}},

  /* ── SATURDAY 30 May ─ Bundle: Course Admission ม.1 (crs-006) ── */
  {id:'s18', date:'2026-05-30', slotId:0, col:6, subject:'Math',    grade:'ม.1', teacher:'Kru Cat', room:'Room B', color:'green',  state:'upcoming', branch:'Sukhumvit',
   classId:'cls-007', bundleId:'crs-006',
   studentNames:['Win Klahan'],
   attendance:{}, summaries:{'Win Klahan':{text:'Algebra word problems — solid grasp, faster than last week.',submitted:true,sent:false}}},

  {id:'s19', date:'2026-05-30', slotId:1, col:6, subject:'Eng',     grade:'ม.1', teacher:'Kru Bee', room:'Room A', color:'blue',   state:'upcoming', branch:'Sukhumvit',
   classId:'cls-008', bundleId:'crs-006',
   studentNames:['Win Klahan'],
   attendance:{}, summaries:{'Win Klahan':{text:'Reading comprehension drill — needs more vocab review.',submitted:false,sent:false}}},

  {id:'s20', date:'2026-05-30', slotId:2, col:6, subject:'Science', grade:'ม.1', teacher:'Kru Dan', room:'Room C', color:'orange', state:'upcoming', branch:'Sukhumvit',
   classId:'cls-009', bundleId:'crs-006',
   studentNames:['Win Klahan'],
   attendance:{}, summaries:{'Win Klahan':{text:'States of matter experiment — engaged and asked great questions.',submitted:true,sent:true,approvedBy:'Admin Nock'}}},

  /* ── LICLASS DEMO — Fri 29 May · minute-based durations (startTime + durationMin) ──
     class ยืดหยุ่น 30/50/75/90 นาที · เริ่มเวลาไม่ตรง slot 2h เดิม
     slotId ใส่ไว้เพื่อ compat กับ week/teacher view · day view ใช้ startTime+durationMin */
  {id:'s21', date:'2026-05-29', slotId:0, col:5, startTime:'09:00', durationMin:90, subject:'Eng (Active)', grade:'ป.5', teacher:'Kru Eve', room:'Room A', color:'yellow', state:'upcoming', branch:'Silom', liclass:true,
   classId:null, courseId:null, studentNames:['Ploy Srirak','Wan H'], attendance:{}, summaries:{}},
  {id:'s22', date:'2026-05-29', slotId:0, col:5, startTime:'10:45', durationMin:50, subject:'Thai', grade:'ป.5', teacher:'Kru Eve', room:'Room A', color:'green', state:'upcoming', branch:'Silom', liclass:true,
   classId:null, courseId:null, studentNames:['Ploy Srirak'], attendance:{}, summaries:{}},
  {id:'s23', date:'2026-05-29', slotId:1, col:5, startTime:'13:30', durationMin:75, subject:'Eng (Grammar)', grade:'ป.6', teacher:'Kru Eve', room:'Room B', color:'purple', state:'upcoming', branch:'Silom', liclass:true,
   classId:null, courseId:null, studentNames:['Wan H','Pan G'], attendance:{}, summaries:{}},
];

/* ── CRM LEADS ────────────────────────────────────────────── */
/* id ขึ้นต้น 'lead-' ป้องกัน conflict กับ student id       */
const _leads = [

  /* Active pipeline — ครบทุก stage */
  {id:'lead-noon',     name:'Noon Charoenwong', childGrade:'ป.3', course:'Math',         source:'Line OA',  stage:'new',             daysAgo:1, assignee:'Admin Nock', line:'@noon_mom',  phone:'089-100-1001', convId:'conv-noon'},
  {id:'lead-wiroj',    name:'Wiroj Buakaw',     childGrade:'ป.6', course:'Eng (Active)', source:'Walk-in',  stage:'contacting',      daysAgo:3, assignee:'Admin Nock', line:'@wiroj_dad', phone:'089-100-1002', convId:'conv-wiroj'},
  {id:'lead-patchara', name:'Patchara Somjai',  childGrade:'ป.5', course:'Science',      source:'Website',  stage:'test_scheduled',  daysAgo:2, assignee:'Kru Dan',    line:'@pat_mom',   phone:'089-100-1003', convId:'conv-patchara', schedDate:'31 May 10:00'},
  {id:'lead-lena',     name:'Lena Fischer',     childGrade:'ป.4', course:'Eng (Active)', source:'Referral', stage:'trialed',         daysAgo:5, assignee:'Kru Bee',    line:'@lena_mom',  phone:'089-100-1004', convId:'conv-lena'},
  {id:'lead-ben',      name:'Ben Nakamura',     childGrade:'ป.4', course:'Eng (Active)', source:'Referral', stage:'payment_pending', daysAgo:2, assignee:'Admin Nock', line:'@ben_dad',   phone:'089-100-1005', convId:'conv-ben'},

  /* Archived */
  {id:'lead-chris', name:'Chris Baker', childGrade:'ป.5', course:'Math ป.5',  source:'Website',  stage:'archived', daysAgo:20, assignee:'', line:'', phone:'', archivedFrom:'test'},
  {id:'lead-anna',  name:'Anna White',  childGrade:'ป.3', course:'English',   source:'Walk-in',  stage:'archived', daysAgo:14, assignee:'', line:'', phone:'', archivedFrom:'contacting'},
];

/* ── CRM CUSTOMERS ────────────────────────────────────────── */
const _customers = [
  {studentId:'mia',   familyId:'tanaka', name:'Mia Tanaka',   family:'Tanaka Family', branch:'Sukhumvit', course:'Eng (Active) ป.4', pkg:'Eng (Active) ป.4 · 48h.', teacher:'Kru Bee', schedule:'Tue/Wed/Thu/Sat 10:00', remain:2,  total:48, since:'Feb 2026', until:'Jun 2026', status:'renewal', phone:'081-234-5678', line:'@tanaka_mom', revenue:14400},
  {studentId:'tom',   familyId:'chen',   name:'Tom Chen',     family:'Chen Family',   branch:'Sukhumvit', course:'Math ป.6',         pkg:'Math ป.6 · 48h.',         teacher:'Kru Cat', schedule:'Tue/Wed/Thu/Sat 15:00', remain:14, total:48, since:'Jan 2026', until:'Sep 2026', status:'active',  phone:'082-345-6789', line:'@chen_mom',   revenue:14400},
  {studentId:'ploy',  familyId:'srirak', name:'Ploy Srirak',  family:'Srirak Family', branch:'Silom',     course:'Math ป.5 + Thai ป.5', pkg:'Math 24h + Thai 24h',  teacher:'Kru Arm / Kru Eve', schedule:'Mon/Wed Silom', remain:18, total:48, since:'Jan 2026', until:'Aug 2026', status:'active', phone:'083-456-7890', line:'@srirak_mom', revenue:14400},
  {studentId:'james', familyId:'wilson', name:'James Wilson', family:'Wilson Family', branch:'Sukhumvit', course:'Science ป.5',       pkg:'Science ป.5 · 24h.',      teacher:'Kru Dan', schedule:'Mon–Thu 13:00',        remain:1,  total:24, since:'Mar 2026', until:'May 2026', status:'renewal', phone:'084-567-8901', line:'@wilson_dad', revenue:7200},
  {studentId:'kevin', familyId:'park',   name:'Kevin Park',   family:'Park Family',   branch:'Sukhumvit', course:'Eng (Active) ป.4', pkg:'Eng (Active) ป.4 · 24h.', teacher:'Kru Bee', schedule:'Tue/Wed/Thu/Sat 10:00', remain:16, total:24, since:'Apr 2026', until:'Jul 2026', status:'active',  phone:'085-678-9012', line:'@park_dad',   revenue:7200},
  {studentId:'sora',  familyId:'park',   name:'Sora Park',    family:'Park Family',   branch:'Sukhumvit', course:'Math ป.6',         pkg:'Math ป.6 · 24h.',         teacher:'Kru Cat', schedule:'Tue/Wed/Thu/Sat 15:00', remain:8,  total:24, since:'Apr 2026', until:'Jul 2026', status:'active',  phone:'085-678-9012', line:'@park_dad',   revenue:7200},
  {studentId:'win',   familyId:'klahan', name:'Win Klahan',   family:'Klahan Family', branch:'Sukhumvit', course:'Course Admission ม.1', pkg:'Bundle · 2 blocks',   teacher:'Kru Cat / Kru Bee / Kru Dan', schedule:'Sat 10:00–17:00', remain:3, total:8, since:'Apr 2026', until:'Feb 2027', status:'active', phone:'086-789-0123', line:'@klahan_mom', revenue:13300},
];

/* ── INBOX CONVERSATIONS ──────────────────────────────────── */
/*  familyId  → ลูกค้า (enrolled) — ดึง family+students จาก DB
    leadId    → Lead ใน pipeline   — ดึง lead stage จาก DB       */
const _conversations = [

  /* ── Customers ─────────────────── */
  {id:'conv-tanaka',   name:'Tanaka Family', familyId:'tanaka',  leadId:null,           branch:'Sukhumvit', channel:'LINE', unread:true,  time:'Today 14:30',  assignee:'Admin Nock', preview:'ขอบคุณค่ะ invoice ได้รับแล้ว กำลังโอนค่ะ…'},
  {id:'conv-wilson',   name:'Wilson Family', familyId:'wilson',  leadId:null,           branch:'Sukhumvit', channel:'LINE', unread:true,  time:'Today 09:15',  assignee:'Admin Nock', preview:"Hi, can we reschedule Thursday's class?"},
  {id:'conv-chen',     name:'Chen Family',   familyId:'chen',    leadId:null,           branch:'Sukhumvit', channel:'LINE', unread:false, time:'Yesterday',    assignee:'Kru Cat',    preview:'Tom did great on the algebra quiz!'},
  {id:'conv-srirak',   name:'Srirak Family', familyId:'srirak',  leadId:null,           branch:'Silom',     channel:'LINE', unread:false, time:'Mon',          assignee:'Admin Nock', preview:'Ploy จะไม่มาเรียนวันพุธสัปดาห์หน้าค่ะ'},
  {id:'conv-park',     name:'Park Family',   familyId:'park',    leadId:null,           branch:'Sukhumvit', channel:'LINE', unread:false, time:'Tue',          assignee:'Admin Nock', preview:'ขอบคุณครับ Sora และ Kevin ชอบมากเลยครับ'},

  /* ── Leads ─────────────────────── */
  {id:'conv-noon',     name:'Noon Charoenwong', familyId:null,  leadId:'lead-noon',     branch:'Sukhumvit', channel:'LINE', unread:true,  time:'Today 11:25',  assignee:'Admin Nock', preview:'สนใจเรียน Math ให้ลูกสาวอายุ 8 ขวบค่ะ…'},
  {id:'conv-wiroj',    name:'Wiroj Buakaw',     familyId:null,  leadId:'lead-wiroj',    branch:'Sukhumvit', channel:'LINE', unread:false, time:'Yesterday',    assignee:'Admin Nock', preview:'ราคาคอร์ส Eng (Active) เป็นยังไงบ้างครับ'},
  {id:'conv-patchara', name:'Patchara Somjai',  familyId:null,  leadId:'lead-patchara', branch:'Sukhumvit', channel:'LINE', unread:true,  time:'Today 09:00',  assignee:'Kru Dan',    preview:'ยืนยันนัด Test วันเสาร์นี้ 10:00 ค่ะ'},
  {id:'conv-lena',     name:'Lena Fischer',     familyId:null,  leadId:'lead-lena',     branch:'Sukhumvit', channel:'LINE', unread:false, time:'2d ago',       assignee:'Kru Bee',    preview:'Loved the trial! Ready to enroll 🎉'},
  {id:'conv-ben',      name:'Ben Nakamura',     familyId:null,  leadId:'lead-ben',      branch:'Sukhumvit', channel:'LINE', unread:true,  time:'Today 14:10',  assignee:'Admin Nock', preview:'ได้รับ Invoice แล้วครับ จะโอนพรุ่งนี้นะครับ'},
];

/* ── MESSAGES (per conversation) ─────────────────────────── */
const _messages = {

  /* ── Customers ── */
  'conv-tanaka': [
    {type:'parent',       text:'สวัสดีค่ะ อยากสอบถาม Invoice ค่ะ',                                                              time:'Mon 10:00',    sender:'Tanaka Mom'},
    {type:'staff',        text:'สวัสดีครับ นี่คือ Invoice สำหรับ Renewal ของ Mia ครับ',                                         time:'Mon 10:15',    sender:'Admin Nock'},
    {type:'invoice_card', invoiceId:'INV-2026-0055',                                                                              time:'Mon 10:15',    sender:'Admin Nock'},
    {type:'parent',       text:'ขอบคุณค่ะ กำลังดูรายละเอียดอยู่ค่ะ',                                                           time:'Mon 14:00',    sender:'Tanaka Mom'},
    {type:'parent',       text:'ขอบคุณค่ะ invoice ได้รับแล้ว กำลังโอนค่ะ',                                                     time:'Today 14:30',  sender:'Tanaka Mom'},
  ],

  'conv-wilson': [
    {type:'staff',  text:'สวัสดีครับ James เหลือ 1 session แล้วครับ ขอแนะนำ Renewal ก่อนหมดเลยนะครับ',                          time:'Mon 09:00',    sender:'Admin Nock'},
    {type:'parent', text:"Hi, James has a doctor appointment Thursday next week. Can we reschedule?",                             time:'Today 09:15',  sender:'Wilson Dad'},
  ],

  'conv-chen': [
    {type:'parent', text:'Tom did great on the algebra quiz at school! Thank you Kru Cat!',                                       time:'Yesterday',    sender:'Chen Mom'},
    {type:'staff',  text:'ยินดีมากครับ Tom ตั้งใจเรียนมากเลยครับ 🎉',                                                          time:'Yesterday',    sender:'Kru Cat'},
  ],

  'conv-srirak': [
    {type:'parent', text:'สวัสดีค่ะ แจ้งว่า Ploy จะไม่มาเรียนวันพุธสัปดาห์หน้าค่ะ ขอ Leave ค่ะ',                             time:'Mon',          sender:'Srirak Mom'},
    {type:'staff',  text:'ขอบคุณที่แจ้งนะครับ รับทราบแล้ว จะจัดการให้เลยครับ',                                                time:'Mon',          sender:'Admin Nock'},
  ],

  'conv-park': [
    {type:'parent', text:'สวัสดีครับ ขอถามตารางเรียนสัปดาห์หน้าของ Kevin กับ Sora ครับ',                                       time:'Tue 09:00',    sender:'Park Dad'},
    {type:'staff',  text:'สวัสดีครับ Kevin เรียน Thu/Sat 10:00 · Sora เรียน Thu/Sat 15:00 นะครับ',                             time:'Tue 09:20',    sender:'Admin Nock'},
    {type:'parent', text:'ขอบคุณครับ Sora และ Kevin ชอบมากเลยครับ',                                                            time:'Tue 10:00',    sender:'Park Dad'},
  ],

  /* ── Leads ── */
  'conv-noon': [
    {type:'parent', text:'สวัสดีค่ะ สนใจเรียน Math ให้ลูกสาวอายุ 8 ขวบค่ะ ตอนนี้อยู่ ป.3 ค่ะ',                               time:'Today 11:10',  sender:'Noon'},
    {type:'staff',  text:'สวัสดีครับ คุณ Noon ยินดีต้อนรับครับ! มีคอร์ส Math ป.3 ที่ Sukhumvit อยากทราบรายละเอียดไหมครับ?',  time:'Today 11:20',  sender:'Admin Nock'},
    {type:'parent', text:'สนใจค่ะ มีทดลองเรียนไหมคะ?',                                                                        time:'Today 11:25',  sender:'Noon'},
  ],

  'conv-wiroj': [
    {type:'parent', text:'สวัสดีครับ ลูกชายอยู่ ป.6 สนใจ Eng (Active) ครับ',                                                   time:'3d ago 14:00', sender:'Wiroj'},
    {type:'staff',  text:'สวัสดีครับ! คอร์ส Eng (Active) ป.6 เริ่ม 24h. ที่ 7,200 บาทครับ มีหลายแพ็กเกจครับ',                 time:'3d ago 14:30', sender:'Admin Nock'},
    {type:'parent', text:'โอเคครับ ราคา 48h. เท่าไหร่ครับ?',                                                                  time:'2d ago 09:00', sender:'Wiroj'},
    {type:'staff',  text:'48h. ราคา 14,400 บาทครับ ขอส่ง Test Form ให้กรอกก่อนนะครับ 📋',                                     time:'2d ago 09:20', sender:'Admin Nock'},
    {type:'parent', text:'ราคาคอร์ส Eng (Active) เป็นยังไงบ้างครับ',                                                           time:'Yesterday',    sender:'Wiroj'},
  ],

  'conv-patchara': [
    {type:'parent',          text:'สนใจคอร์ส Science ป.5 ค่ะ ลูกชายอยากสอบเข้า ม.1 ค่ะ',                                     time:'3d ago',       sender:'Patchara'},
    {type:'staff',           text:'ยินดีมากครับ! ส่ง Test Form ให้กรอกก่อนนะครับ เพื่อประเมินระดับครับ',                     time:'3d ago',       sender:'Kru Dan'},
    {type:'form_submission', subId:'sub_002', formType:'test', text:'📋 Test Form submitted',                                  time:'2d ago',       sender:'System'},
    {type:'staff',           text:'ขอบคุณครับ! นัด Test วันเสาร์ 31 พ.ค. เวลา 10:00 น. ได้เลยไหมครับ?',                     time:'Yesterday',    sender:'Admin Nock'},
    {type:'parent',          text:'ยืนยันนัด Test วันเสาร์นี้ 10:00 ค่ะ',                                                    time:'Today 09:00',  sender:'Patchara'},
  ],

  'conv-lena': [
    {type:'parent',          text:"Hi! My daughter (Grade 4) is interested in Eng (Active) class.",                             time:'5d ago',       sender:'Lena'},
    {type:'staff',           text:"Hello! Let's do a quick assessment first — I'll send a Test Form! 📋",                      time:'5d ago',       sender:'Kru Bee'},
    {type:'form_submission', subId:'sub_003', formType:'test', text:'📋 Test Form submitted',                                  time:'4d ago',       sender:'System'},
    {type:'staff',           text:'Great result! She placed at intermediate level 🎉 Want to try a trial class this Sunday?',  time:'3d ago',       sender:'Kru Bee'},
    {type:'parent',          text:'Yes please! We are very excited!',                                                           time:'3d ago',       sender:'Lena'},
    {type:'staff',           text:'Trial scheduled: Sunday 1 Jun at 10:00 with Kru Bee — see you then! 📅',                   time:'2d ago',       sender:'Admin Nock'},
    {type:'parent',          text:'Loved the trial! Ready to enroll 🎉',                                                       time:'2d ago',       sender:'Lena'},
  ],

  'conv-ben': [
    {type:'parent',          text:'สวัสดีครับ ลูกชาย ป.4 เคยเรียน Eng ที่อื่นมาแล้ว สนใจ Eng (Active) ครับ',                 time:'3d ago',       sender:'Ben'},
    {type:'staff',           text:'ยินดีต้อนรับครับ! ให้ลอง Trial ก่อนนะครับ ส่ง Trial Form ให้เลยครับ 📋',                   time:'3d ago',       sender:'Admin Nock'},
    {type:'form_submission', subId:'sub_004', formType:'trial', text:'📋 Trial Form submitted',                                time:'3d ago',       sender:'System'},
    {type:'staff',           text:'Trial เมื่อวาน น้องเก่งมากเลยครับ! นี่คือ Invoice สำหรับ Enrollment ครับ',                 time:'Yesterday',    sender:'Admin Nock'},
    {type:'invoice_card',    invoiceId:'INV-2026-0057',                                                                        time:'Yesterday',    sender:'Admin Nock'},
    {type:'parent',          text:'ได้รับ Invoice แล้วครับ จะโอนพรุ่งนี้นะครับ',                                              time:'Today 14:10',  sender:'Ben'},
  ],
};

/* ── FORM TOKENS ──────────────────────────────────────────── */
const _formTokens = [
  {token:'tok_pat03', type:'test',  leadId:'lead-patchara', sentBy:'Admin Nock', branch:'Sukhumvit', expiresAt:'2026-06-04', used:true},
  {token:'tok_len04', type:'trial', leadId:'lead-lena',     sentBy:'Kru Bee',    branch:'Sukhumvit', expiresAt:'2026-06-04', used:true},
  {token:'tok_ben05', type:'trial', leadId:'lead-ben',      sentBy:'Admin Nock', branch:'Sukhumvit', expiresAt:'2026-06-04', used:true},
  {token:'tok_noon06',type:'test',  leadId:'lead-noon',     sentBy:'Admin Nock', branch:'Sukhumvit', expiresAt:'2026-06-04', used:false},
];

/* ── FORM SUBMISSIONS ─────────────────────────────────────── */
const _formSubmissions = [
  {id:'sub_002', token:'tok_pat03', type:'test',  leadId:'lead-patchara', leadName:'Patchara Somjai', status:'approved', submittedAt:'26 May',
   data:{students:[{name:"น้องโอ๊ต", grade:'ป.5', subject:'Science'}]}},
  {id:'sub_003', token:'tok_len04', type:'trial', leadId:'lead-lena',     leadName:'Lena Fischer',    status:'approved', submittedAt:'24 May',
   data:{students:[{name:"Lena's daughter", grade:'ป.4', subject:'Eng (Active)'}]}},
  {id:'sub_004', token:'tok_ben05', type:'trial', leadId:'lead-ben',      leadName:'Ben Nakamura',    status:'approved', submittedAt:'27 May',
   data:{students:[{name:"น้องเคน", grade:'ป.4', subject:'Eng (Active)'}]}},
];

/* ── CALENDAR CONFIG ──────────────────────────────────────── */
/* Week: Mon 25 May – Sun 31 May 2026 | Today = Thu 28 May    */
const _dayHeaders = [
  {label:'Mon 25', date:'2026-05-25', isToday:false, isHoliday:false},
  {label:'Tue 26', date:'2026-05-26', isToday:false, isHoliday:false},
  {label:'Wed 27', date:'2026-05-27', isToday:false, isHoliday:false},
  {label:'Thu 28', date:'2026-05-28', isToday:true,  isHoliday:false},
  {label:'Fri 29', date:'2026-05-29', isToday:false, isHoliday:false},
  {label:'Sat 30', date:'2026-05-30', isToday:false, isHoliday:false},
  {label:'Sun 31', date:'2026-05-31', isToday:false, isHoliday:false},
];

/* ── INVOICES (Central Pool) ──────────────────────────────── */
/*  studentId  = null  → pre-enrollment (lead ยังไม่ enroll)
    leadId     = null  → enrolled student                      */
const _invoices = [
  /* Paid — original enrollments */
  {id:'INV-2026-0028', studentId:'tom',   familyId:'chen',   leadId:null,      courseId:'crs-002',
   course:'Math ป.6 · 48h.',          hours:48, amount:14400, date:'2026-01-15', status:'paid',                createdFrom:'enrollment',   branch:'Sukhumvit'},
  {id:'INV-2026-0029', studentId:'ploy',  familyId:'srirak', leadId:null,      courseId:'crs-001',
   course:'Math ป.5 · 24h.',          hours:24, amount:7200,  date:'2026-01-20', status:'paid',                createdFrom:'enrollment',   branch:'Silom'},
  {id:'INV-2026-0030', studentId:'ploy',  familyId:'srirak', leadId:null,      courseId:'crs-005',
   course:'Thai ป.5 · 24h.',          hours:24, amount:7200,  date:'2026-01-20', status:'paid',                createdFrom:'enrollment',   branch:'Silom'},
  {id:'INV-2026-0032', studentId:'mia',   familyId:'tanaka', leadId:null,      courseId:'crs-003',
   course:'Eng (Active) ป.4 · 48h.',  hours:48, amount:14400, date:'2026-02-01', status:'paid',                createdFrom:'enrollment',   branch:'Sukhumvit'},
  {id:'INV-2026-0041', studentId:'james', familyId:'wilson', leadId:null,      courseId:'crs-004',
   course:'Science ป.5 · 24h.',       hours:24, amount:7200,  date:'2026-03-01', status:'paid',                createdFrom:'enrollment',   branch:'Sukhumvit'},
  {id:'INV-2026-0048', studentId:'kevin', familyId:'park',   leadId:null,      courseId:'crs-003',
   course:'Eng (Active) ป.4 · 24h.',  hours:24, amount:7200,  date:'2026-04-01', status:'paid',                createdFrom:'enrollment',   branch:'Sukhumvit'},
  {id:'INV-2026-0049', studentId:'sora',  familyId:'park',   leadId:null,      courseId:'crs-002',
   course:'Math ป.6 · 24h.',          hours:24, amount:7200,  date:'2026-04-15', status:'paid',                createdFrom:'enrollment',   branch:'Sukhumvit'},
  {id:'INV-2026-0050', studentId:'win',   familyId:'klahan', leadId:null,      courseId:'crs-006',
   course:'Course Admission ม.1 · 2 blocks', blocks:2, admissionFee:1500, amount:13300, date:'2026-04-04', status:'paid', createdFrom:'enrollment', branch:'Sukhumvit'},

  /* Active — renewal / pending */
  {id:'INV-2026-0055', studentId:'mia',   familyId:'tanaka', leadId:null,      courseId:'crs-003',
   course:'Eng (Active) ป.4 · 48h.',  hours:48, amount:14400, date:'2026-05-26', status:'pending_verification', createdFrom:'inbox',        branch:'Sukhumvit'},
  {id:'INV-2026-0056', studentId:'tom',   familyId:'chen',   leadId:null,      courseId:'crs-002',
   course:'Math ป.6 · 48h.',          hours:48, amount:14400, date:'2026-05-27', status:'draft',               createdFrom:'billing',       branch:'Sukhumvit'},

  /* Pre-enrollment — lead ยังไม่ enroll */
  {id:'INV-2026-0057', studentId:null,    familyId:null,     leadId:'lead-ben', courseId:'crs-003',
   course:'Eng (Active) ป.4 · 24h.',  hours:24, amount:7200,  date:'2026-05-27', status:'sent',                createdFrom:'inbox',         branch:'Sukhumvit'},

  /* Auto-draft — renewal urgent */
  {id:'INV-2026-0058', studentId:'james', familyId:'wilson', leadId:null,      courseId:'crs-004',
   course:'Science ป.5 · 24h.',       hours:24, amount:7200,  date:'2026-05-28', status:'draft',               createdFrom:'auto_renewal',  branch:'Sukhumvit'},

  /* Multi-line — ซื้อหลาย course ครั้งเดียว · รวม 72h → โปร −15% (line items demo) */
  {id:'INV-2026-0059', studentId:'ploy',  familyId:'srirak', leadId:null,      courseId:null,
   course:'Math ป.5 + Thai ป.5 + Eng ป.5 · 72h.', hours:72,
   lines:[
     {desc:'Math ป.5 · 24h.',  hours:24, amount:7200},
     {desc:'Thai ป.5 · 24h.',  hours:24, amount:7200},
     {desc:'Eng ป.5 · 24h.',   hours:24, amount:7200},
   ],
   discount:{label:'Promotion −15% (72h+)', amount:3240},
   amount:18360, date:'2026-05-28', status:'draft', createdFrom:'billing', branch:'Silom'},
];

/* ── RECEIPTS (Central Pool) ──────────────────────────────── */
const _receipts = [
  {id:'RCP-2026-0028', invoiceId:'INV-2026-0028', studentId:'tom',   familyId:'chen',   amount:14400, paidAt:'15 Jan 2026', stampedBy:'Admin Nock', branch:'Sukhumvit', method:'Bank Transfer', refNo:'NCK202601150001'},
  {id:'RCP-2026-0029', invoiceId:'INV-2026-0029', studentId:'ploy',  familyId:'srirak', amount:7200,  paidAt:'20 Jan 2026', stampedBy:'Admin Nock', branch:'Silom',     method:'Bank Transfer', refNo:'NCK202601200001'},
  {id:'RCP-2026-0030', invoiceId:'INV-2026-0030', studentId:'ploy',  familyId:'srirak', amount:7200,  paidAt:'20 Jan 2026', stampedBy:'Admin Nock', branch:'Silom',     method:'Bank Transfer', refNo:'NCK202601200002'},
  {id:'RCP-2026-0032', invoiceId:'INV-2026-0032', studentId:'mia',   familyId:'tanaka', amount:14400, paidAt:'1 Feb 2026',  stampedBy:'Admin Nock', branch:'Sukhumvit', method:'Bank Transfer', refNo:'NCK202602010001'},
  {id:'RCP-2026-0041', invoiceId:'INV-2026-0041', studentId:'james', familyId:'wilson', amount:7200,  paidAt:'1 Mar 2026',  stampedBy:'Admin Nock', branch:'Sukhumvit', method:'Bank Transfer', refNo:'NCK202603010001'},
  {id:'RCP-2026-0048', invoiceId:'INV-2026-0048', studentId:'kevin', familyId:'park',   amount:7200,  paidAt:'1 Apr 2026',  stampedBy:'Admin Nock', branch:'Sukhumvit', method:'Bank Transfer', refNo:'NCK202604010001'},
  {id:'RCP-2026-0049', invoiceId:'INV-2026-0049', studentId:'sora',  familyId:'park',   amount:7200,  paidAt:'15 Apr 2026', stampedBy:'Admin Nock', branch:'Sukhumvit', method:'Bank Transfer', refNo:'NCK202604150001'},
  {id:'RCP-2026-0050', invoiceId:'INV-2026-0050', studentId:'win',   familyId:'klahan', amount:13300, paidAt:'4 Apr 2026',  stampedBy:'Admin Nock', branch:'Sukhumvit', method:'Bank Transfer', refNo:'NCK202604040001'},
];

/* ── COURSE END SUMMARIES ─────────────────────────────────── */
/* Status flow: draft → pending_teacher → approved → sent (immutable)
   Teacher confirmation required เสมอ:
     Teacher สร้างเอง  → draft → approved (ตัวเองยืนยัน) → sent
     Admin/Mgr สร้าง  → draft → pending_teacher → approved → sent  */
const _courseEndSummaries = [

  /* Admin สร้าง — รอ Kru Dan ยืนยัน */
  { id:'ces-001', studentId:'james', familyId:'wilson', enrollmentId:'enr-005', courseId:'crs-004',
    courseName:'Science ป.5 · 24h', courseType:'regular', branch:'Sukhumvit',
    createdBy:'Admin Nock', createdByRole:'admin', createdAt:'2026-05-27',
    status:'pending_teacher', teacher:'Kru Dan', confirmedBy:null, sentAt:null,
    subjects:[
      { subject:'Science', grade:'ป.5', teacher:'Kru Dan',
        overall:'James completed 23 of 24 hours with consistent progress. Strong curiosity in biology and chemistry topics throughout the course.',
        strengths:'Asks excellent questions · connects concepts to daily life quickly',
        improve:'Needs more practice writing structured lab reports',
        sessionSummaries:[
          {date:'2026-05-26', text:'Plant biology — engaged, asked great questions.'},
          {date:'2026-05-27', text:'Chemical reactions — very curious today.'},
        ] },
    ] },

  /* Teacher สร้างเอง (Bundle — แยก section ต่อ subject ใน 1 document) */
  { id:'ces-002', studentId:'win', familyId:'klahan', enrollmentId:'enr-009', courseId:'crs-006',
    courseName:'Course Admission ม.1 · Block 1–2', courseType:'bundle', branch:'Sukhumvit',
    createdBy:'Kru Cat', createdByRole:'teacher', createdAt:'2026-05-28',
    status:'draft', teacher:'Kru Cat', confirmedBy:null, sentAt:null,
    subjects:[
      { subject:'Math', grade:'ม.1', teacher:'Kru Cat',
        overall:'Win shows solid algebra foundations across the first two blocks. Ready for entrance-exam level problems.',
        strengths:'Fast mental arithmetic · neat working steps',
        improve:'Word problems — translate Thai problem statements into equations',
        sessionSummaries:[
          {date:'2026-05-23', text:'Linear equations review — confident.'},
          {date:'2026-05-16', text:'Fractions & ratios — minor slips, self-corrected.'},
        ] },
      { subject:'Eng', grade:'ม.1', teacher:'Kru Bee',
        overall:'Reading comprehension improving steadily. Vocabulary on track for admission level.',
        strengths:'Strong vocab retention',
        improve:'Grammar — tense consistency in writing',
        sessionSummaries:[
          {date:'2026-05-23', text:'Reading drills — good inference skills.'},
        ] },
      { subject:'Science', grade:'ม.1', teacher:'Kru Dan',
        overall:'Good grasp of core physics and biology concepts for entrance exam scope.',
        strengths:'Diagram interpretation',
        improve:'Memorising formula units',
        sessionSummaries:[
          {date:'2026-05-23', text:'Force & motion — solved all practice items.'},
        ] },
    ] },

  /* ส่งแล้ว — immutable */
  { id:'ces-003', studentId:'mia', familyId:'tanaka', enrollmentId:'enr-001', courseId:'crs-003',
    courseName:'Eng (Active) ป.4 · 48h', courseType:'regular', branch:'Sukhumvit',
    createdBy:'Kru Bee', createdByRole:'teacher', createdAt:'2026-05-27',
    status:'sent', teacher:'Kru Bee', confirmedBy:'Kru Bee', sentAt:'2026-05-28',
    subjects:[
      { subject:'Eng (Active)', grade:'ป.4', teacher:'Kru Bee',
        overall:'Mia completed the 48-hour course with excellent progress in reading and speaking. Recommend continuing to phonics vol.2 in the next enrollment.',
        strengths:'Reading comprehension · confident speaking',
        improve:'Spelling of irregular words',
        sessionSummaries:[
          {date:'2026-05-26', text:'Reading drills — excellent pace.'},
          {date:'2026-05-28', text:'Speaking practice — confident, clear pronunciation.'},
        ] },
    ] },
];

/* ── CONSTANTS ────────────────────────────────────────────── */
const _const = {
  STUDENT_STATUS: {
    active:   {label:'Active',   cls:'badge-green' },
    renewal:  {label:'Renewal',  cls:'badge-yellow'},
    pause:    {label:'Pause',    cls:'badge-gray'  },
    archived: {label:'Archived', cls:'badge-gray'  },
  },
  ATTENDANCE_META: {
    present:    {label:'Present',          cls:'badge-green',  deduct:true },
    leave:      {label:'Leave',            cls:'badge-yellow', deduct:false},
    leave_over: {label:'Leave (Overquota)',cls:'badge-orange', deduct:true },
    absent:     {label:'Absent',           cls:'badge-red',    deduct:true },
    reschedule: {label:'Reschedule',       cls:'badge-blue',   deduct:false},
    transfer:   {label:'Transfer',         cls:'badge-purple', deduct:false},
  },
  LEAD_STAGES: {
    new:             {label:'New Lead',        color:'var(--md-primary)',            bg:'var(--md-primary-container)'},
    contacting:      {label:'Contacting',      color:'var(--md-warning)',            bg:'var(--md-warning-container)'},
    test_scheduled:  {label:'Test Scheduled',  color:'var(--clr-on-grammar)',        bg:'var(--clr-grammar)'},
    tested:          {label:'Tested',          color:'var(--md-warning)',            bg:'var(--md-warning-container)'},
    trial_scheduled: {label:'Trial Scheduled', color:'var(--md-success)',            bg:'var(--md-success-container)'},
    trialed:         {label:'Trialed',         color:'var(--md-success)',            bg:'var(--md-success-container)'},
    payment_pending: {label:'Payment Pending', color:'var(--md-error)',              bg:'var(--md-error-container)'},
    enrolled:        {label:'Enrolled ✓',      color:'var(--md-success)',            bg:'var(--md-success-container)'},
    archived:        {label:'Archived',        color:'var(--md-on-surface-variant)', bg:'var(--md-surface-mid)'},
  },
  ROLE_META: {
    teacher:      {cls:'badge-blue',   label:'Teacher'     },
    admin:        {cls:'badge-purple', label:'Admin'       },
    manager:      {cls:'badge-green',  label:'Manager'     },
    area_manager: {cls:'badge-orange', label:'Area Manager'},
    director:     {cls:'badge-red',    label:'Director'    },
    // Backward compat (capitalized)
    Teacher:      {cls:'badge-blue',   label:'Teacher'     },
    Admin:        {cls:'badge-purple', label:'Admin'       },
  },
  STAFF_CAPACITY: {
    classesPerDay:4, daysPerWeek:5, weeklyMax:20, monthlyMax:100,
    // effectiveLoad thresholds: Σ(students per session per week)
    warnLoad:20,    // yellow ≥ 21
    dangerLoad:30,  // red > 30
  },
  STAFF_ROLES: ['teacher','admin','manager','area_manager','director'],
  DAYS_SHORT: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
  FAMILY_STATUS: {
    active:   {cls:'badge-green',  label:'Active'  },
    renewal:  {cls:'badge-yellow', label:'Renewal' },
    pause:    {cls:'badge-gray',   label:'Pause'   },
    archived: {cls:'badge-gray',   label:'Archived'},
  },
  SUBJECT_COLOR: {
    'Eng':'blue', 'Math':'green', 'Science':'orange',
    'Thai':'green', 'Eng (Active)':'yellow', 'Eng (Grammar)':'purple',
  },
  TIME_SLOTS: [
    {id:0,   start:'10:00', end:'12:00', type:'class'},
    {id:'b1',start:'12:00', end:'13:00', type:'break', label:'Lunch Break'},
    {id:1,   start:'13:00', end:'15:00', type:'class'},
    {id:2,   start:'15:00', end:'17:00', type:'class'},
    {id:'b2',start:'17:00', end:'18:00', type:'break', label:'Rest Break'},
    {id:3,   start:'18:00', end:'20:00', type:'class'},
  ],
  SLOT_HOURS:  {0:{s:'10:00',e:'12:00'}, 1:{s:'13:00',e:'15:00'}, 2:{s:'15:00',e:'17:00'}, 3:{s:'18:00',e:'20:00'}},
  BREAK_HOURS: {'12:00':'Lunch Break', '17:00':'Rest Break'},
  TIME_HOURS:  ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'],
  TEACHERS:    ['Kru Arm','Kru Bee','Kru Cat','Kru Dan','Kru Eve'],
  STAFF_NAMES: ['Admin Nock','Kru Arm','Kru Bee','Kru Cat','Kru Dan','Kru Eve'],
  SUBJECTS:    ['Eng','Math','Science','Thai','Eng (Active)','Eng (Grammar)'],
  GRADES:      ['ป.1','ป.2','ป.3','ป.4','ป.5','ป.6','ม.1','ม.2','ม.3','ม.4','ม.5','ม.6'],
  ROOMS:       ['Room A','Room B','Room C'],
  BRANCHES:    ['Sukhumvit','Silom'],
};

/* ── EXPOSE GLOBALS ───────────────────────────────────────── */
/* ── INVOICE SETTINGS ─────────────────────────────────────── */
const _invoiceSettings = {
  // ─── Global (same across ALL branches) ──────────────────
  global: {
    logoUrl:       null,                          // base64 | URL
    companyNameTH: 'บริษัท นอค อะคาเดมี จำกัด',
    companyNameEN: 'Nock Academy Co., Ltd.',
    addressTH:     '123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพฯ 10110',
    addressEN:     '123 Sukhumvit Rd, Khlong Toei, Bangkok 10110',
    taxId:         '0-1053-56789-01-2',
    // Bank accounts pool — all branches pick from here
    bankAccounts: [
      { id:'bank-1', brand:'Liclass',   createdBy:'default', qrCodeUrl:null,
        bankName:'ธนาคารกรุงศรีอยุธยา', bankBranch:'Robinson Sriracha Sub Br',
        accountNo:'526-1-00866-3', accountName:'Liclass Education co., ltd.',
        accountType:'current' },
      { id:'bank-2', brand:'NA School', createdBy:'default', qrCodeUrl:null,
        bankName:'ธนาคารกสิกรไทย', bankBranch:'สาขาอโศก',
        accountNo:'069-2-85432-1', accountName:'Nock Academy Co., Ltd.',
        accountType:'savings' },
      { id:'bank-3', brand:'NA App',    createdBy:'default', qrCodeUrl:null,
        bankName:'ธนาคารไทยพาณิชย์', bankBranch:'สาขาสุขุมวิท',
        accountNo:'142-3-67891-5', accountName:'Nock Academy App Co., Ltd.',
        accountType:'savings' },
    ],
  },
  // ─── Per Branch ──────────────────────────────────────────
  branches: {
    'Sukhumvit': {
      bankAccountId:   'bank-1',
      qrCodeUrl:       null,
      invoicePrefix:   '2605',
      invoiceRunning:  32,
      vatRate:         0,
      dueDateOffset:   14,
      memo:            'กรุณาชำระเงินภายในวันที่กำหนด หากมีข้อสงสัยกรุณาติดต่อสาขา',
      /* rooms + operating days/hours moved to DB.branchSettings (single source) */
    },
    'Silom': {
      bankAccountId:   'bank-1',
      qrCodeUrl:       null,
      invoicePrefix:   '2605',
      invoiceRunning:  1,
      vatRate:         0,
      dueDateOffset:   14,
      memo:            'กรุณาชำระเงินภายในวันที่กำหนด หากมีข้อสงสัยกรุณาติดต่อสาขา',
      /* rooms + operating days/hours moved to DB.branchSettings (single source) */
    },
  },
};

/* ── ENROLLMENTS ─────────────────────────────────────────── */
/* Separate collection — 1 record per student per subject
   Invoice created FIRST → status:'pending_payment'
   After payment confirmed → status:'active'                  */
const _enrollments = [
  { id:'enr-001', studentId:'mia',   familyId:'tanaka', courseId:'crs-003', classId:'cls-001',
    subject:'Eng (Active)', grade:'ป.4', packageHours:48, usedHours:46, remainHours:2,
    leaveUsed:1,
    status:'active', invoiceId:'INV-2026-0032', branch:'Sukhumvit',
    startDate:'2026-02-01', teacher:'Kru Bee' },

  { id:'enr-002', studentId:'tom',   familyId:'chen',   courseId:'crs-002', classId:'cls-002',
    subject:'Math', grade:'ป.6', packageHours:48, usedHours:34, remainHours:14,
    leaveUsed:1,
    status:'active', invoiceId:'INV-2026-0028', branch:'Sukhumvit',
    startDate:'2026-01-15', teacher:'Kru Cat' },

  { id:'enr-003', studentId:'ploy',  familyId:'srirak', courseId:'crs-001', classId:'cls-006',
    subject:'Math', grade:'ป.5', packageHours:24, usedHours:6, remainHours:18,
    leaveUsed:0,
    status:'active', invoiceId:'INV-2026-0029', branch:'Silom',
    startDate:'2026-01-20', teacher:'Kru Arm' },

  { id:'enr-004', studentId:'ploy',  familyId:'srirak', courseId:'crs-005', classId:'cls-005',
    subject:'Thai', grade:'ป.5', packageHours:24, usedHours:6, remainHours:18,
    leaveUsed:1,
    status:'active', invoiceId:'INV-2026-0030', branch:'Silom',
    startDate:'2026-01-20', teacher:'Kru Eve' },

  { id:'enr-005', studentId:'james', familyId:'wilson', courseId:'crs-004', classId:'cls-004',
    subject:'Science', grade:'ป.5', packageHours:24, usedHours:23, remainHours:1,
    leaveUsed:0,
    status:'active', invoiceId:'INV-2026-0041', branch:'Sukhumvit',
    startDate:'2026-03-01', teacher:'Kru Dan' },

  { id:'enr-006', studentId:'kevin', familyId:'park',   courseId:'crs-003', classId:'cls-001',
    subject:'Eng (Active)', grade:'ป.4', packageHours:24, usedHours:8, remainHours:16,
    leaveUsed:1,
    status:'active', invoiceId:'INV-2026-0048', branch:'Sukhumvit',
    startDate:'2026-04-01', teacher:'Kru Bee' },

  /* Sora — previously missing from enrollments */
  { id:'enr-007', studentId:'sora',  familyId:'park',   courseId:'crs-002', classId:'cls-002',
    subject:'Math', grade:'ป.6', packageHours:24, usedHours:16, remainHours:8,
    leaveUsed:1,
    status:'active', invoiceId:'INV-2026-0049', branch:'Sukhumvit',
    startDate:'2026-04-15', teacher:'Kru Cat' },

  /* Mia renewal — invoice sent, awaiting payment (new enrollment per renewal rule) */
  { id:'enr-008', studentId:'mia',   familyId:'tanaka', courseId:'crs-003', classId:'cls-001',
    subject:'Eng (Active)', grade:'ป.4', packageHours:48, usedHours:0, remainHours:48,
    leaveUsed:0,
    status:'pending_payment', invoiceId:'INV-2026-0055', branch:'Sukhumvit',
    startDate:null, teacher:'Kru Bee' },

  /* Win — Bundle enrollment (block billing: blocksPaid × billingBlockSize class days) */
  { id:'enr-009', studentId:'win',   familyId:'klahan', courseId:'crs-006', classId:'cls-007',
    enrollType:'bundle', blocksPaid:2, blockUsed:5,   /* 5 of 8 class days used */
    admissionFeePaid:true,
    status:'active', invoiceId:'INV-2026-0050', branch:'Sukhumvit',
    startDate:'2026-04-04', teacher:'Kru Cat / Kru Bee / Kru Dan' },
];

window.DB = {
  students:        _students,
  families:        _families,
  staff:           _staff,
  branchPricing:   _branchPricing,
  courses:         _courses,
  classes:         _classes,
  sessions:        _sessions,
  enrollments:     _enrollments,
  leads:           _leads,
  customers:       _customers,
  conversations:   _conversations,
  messages:        _messages,
  dayHeaders:      _dayHeaders,
  formTokens:      _formTokens,
  formSubmissions: _formSubmissions,
  invoices:        _invoices,
  receipts:        _receipts,
  invoiceSettings: _invoiceSettings,
  courseEndSummaries: _courseEndSummaries,
};
window.CONST = _const;
window.calSessions = _sessions;   // legacy alias for calendar-class.js
