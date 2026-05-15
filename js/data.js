/* ============================================================
   data.js — NockERP Global Data Store
   LOAD FIRST (before app.js) in index.html

   window.DB    — all mock data (students, families, staff…)
   window.CONST — shared constants (status meta, time slots…)
   ============================================================ */

/* ── STUDENTS ─────────────────────────────────────────────── */
const _students = [
  { id:'mia', name:'Mia Tanaka', age:9, branch:'Sukhumvit', family:'Tanaka Family',
    line:'@tanaka_mom', phone:'081-234-5678', enrollDate:'2026-02-01',
    teacher:'Kru Bee', status:'renewal',
    courses:[{name:'Eng (Active) ป.4',hours:48,used:46,left:2,price:14400}],
    schedule:[
      {date:'Tue 19 May',time:'10:30',room:'Room 1',teacher:'Kru Bee',status:'upcoming'},
      {date:'Thu 21 May',time:'10:30',room:'Room 1',teacher:'Kru Bee',status:'upcoming'},
    ],
    attendance:[
      {date:'Tue 13 May',course:'Eng (Active) ป.4',status:'present'},
      {date:'Thu 8 May', course:'Eng (Active) ป.4',status:'present'},
      {date:'Tue 6 May', course:'Eng (Active) ป.4',status:'leave'},
      {date:'Thu 1 May', course:'Eng (Active) ป.4',status:'present'},
      {date:'Tue 29 Apr',course:'Eng (Active) ป.4',status:'absent'},
      {date:'Thu 24 Apr',course:'Eng (Active) ป.4',status:'present'},
    ],
    invoices:[{id:'INV-2026-0032',date:'2026-02-01',amount:14400,status:'paid',course:'Eng (Active) ป.4 · 48h.'}],
    notes:[
      {type:'teacher',text:'Mia making great progress with reading comprehension. Recommend phonics workbook vol.2.',author:'Kru Bee',date:'13 May'},
      {type:'admin',  text:'Parent confirmed renewal interest — waiting for payment slip.',author:'Admin Nock',date:'13 May'},
    ]},

  { id:'tom', name:'Tom Chen', age:12, branch:'Sukhumvit', family:'Chen Family',
    line:'@chen_mom', phone:'082-345-6789', enrollDate:'2026-01-15',
    teacher:'Kru Cat', status:'active',
    courses:[{name:'Math ป.6',hours:36,used:22,left:14,price:10800}],
    schedule:[
      {date:'Tue 19 May',time:'15:00',room:'Room 2',teacher:'Kru Cat',status:'upcoming'},
      {date:'Thu 21 May',time:'15:00',room:'Room 2',teacher:'Kru Cat',status:'upcoming'},
      {date:'Sat 23 May',time:'10:00',room:'Room 2',teacher:'Kru Cat',status:'upcoming'},
    ],
    attendance:[
      {date:'Tue 13 May',course:'Math ป.6',status:'present'},
      {date:'Thu 8 May', course:'Math ป.6',status:'present'},
      {date:'Tue 6 May', course:'Math ป.6',status:'present'},
      {date:'Thu 1 May', course:'Math ป.6',status:'present'},
      {date:'Tue 29 Apr',course:'Math ป.6',status:'leave'},
      {date:'Thu 24 Apr',course:'Math ป.6',status:'present'},
    ],
    invoices:[{id:'INV-2026-0028',date:'2026-01-15',amount:10800,status:'paid',course:'Math ป.6 · 36h.'}],
    notes:[
      {type:'teacher',text:'Tom is strong in algebra but needs more practice with geometry proofs.',author:'Kru Cat',date:'6 May'},
    ]},

  { id:'ploy', name:'Ploy Srirak', age:10, branch:'Silom', family:'Srirak Family',
    line:'@srirak_mom', phone:'083-456-7890', enrollDate:'2026-01-20',
    teacher:'Kru Arm / Kru Eve', status:'active',
    courses:[
      {name:'Math ป.5', hours:24,used:6,left:18,price:7200},
      {name:'Thai ป.5', hours:24,used:6,left:18,price:7200},
    ],
    schedule:[
      {date:'Wed 14 May',time:'15:00',room:'Room 2',teacher:'Kru Arm',status:'upcoming'},
      {date:'Wed 14 May',time:'16:30',room:'Room 1',teacher:'Kru Eve',status:'upcoming'},
      {date:'Wed 21 May',time:'15:00',room:'Room 2',teacher:'Kru Arm',status:'upcoming'},
    ],
    attendance:[
      {date:'Wed 7 May', course:'Math ป.5',  status:'present'},
      {date:'Wed 7 May', course:'Thai ป.5',  status:'present'},
      {date:'Wed 30 Apr',course:'Math ป.5',  status:'present'},
      {date:'Wed 30 Apr',course:'Thai ป.5',  status:'leave'},
      {date:'Wed 23 Apr',course:'Math ป.5',  status:'present'},
      {date:'Wed 23 Apr',course:'Thai ป.5',  status:'present'},
    ],
    invoices:[
      {id:'INV-2026-0029',date:'2026-01-20',amount:7200,status:'paid',course:'Math ป.5 · 24h.'},
      {id:'INV-2026-0030',date:'2026-01-20',amount:7200,status:'paid',course:'Thai ป.5 · 24h.'},
    ],
    notes:[
      {type:'admin',text:'Parents requested schedule to stay on Wednesdays only.',author:'Admin Nock',date:'10 May'},
    ]},

  { id:'james', name:'James Wilson', age:11, branch:'Sukhumvit', family:'Wilson Family',
    line:'@wilson_dad', phone:'084-567-8901', enrollDate:'2026-03-01',
    teacher:'Kru Dan', status:'urgent',
    courses:[{name:'Science ป.5',hours:12,used:11,left:1,price:4800}],
    schedule:[
      {date:'Thu 14 May',time:'14:30',room:'Room 3',teacher:'Kru Dan',status:'upcoming'},
    ],
    attendance:[
      {date:'Tue 12 May',course:'Science ป.5',status:'present'},
      {date:'Thu 8 May', course:'Science ป.5',status:'present'},
      {date:'Tue 6 May', course:'Science ป.5',status:'absent'},
      {date:'Thu 1 May', course:'Science ป.5',status:'present'},
      {date:'Tue 29 Apr',course:'Science ป.5',status:'present'},
    ],
    invoices:[{id:'INV-2026-0041',date:'2026-03-01',amount:4800,status:'paid',course:'Science ป.5 · 12h.'}],
    notes:[
      {type:'teacher',text:'James missed last Tuesday without notice. Parent should be contacted re: renewal urgently.',author:'Kru Dan',date:'8 May'},
      {type:'admin',  text:'Called Wilson dad — will send payment slip by Friday.',author:'Admin Nock',date:'9 May'},
    ]},

  { id:'kevin', name:'Kevin Park', age:8, branch:'Silom', family:'Park Family',
    line:'@park_dad', phone:'085-678-9012', enrollDate:'2026-04-01',
    teacher:'Kru Bee', status:'active',
    courses:[{name:'Eng (Active) ป.4',hours:24,used:8,left:16,price:7200}],
    schedule:[
      {date:'Mon 18 May',time:'09:00',room:'Room 1',teacher:'Kru Bee',status:'upcoming'},
      {date:'Wed 20 May',time:'09:00',room:'Room 1',teacher:'Kru Bee',status:'upcoming'},
    ],
    attendance:[
      {date:'Mon 12 May',course:'Eng (Active) ป.4',status:'present'},
      {date:'Wed 7 May', course:'Eng (Active) ป.4',status:'present'},
      {date:'Mon 5 May', course:'Eng (Active) ป.4',status:'present'},
      {date:'Wed 30 Apr',course:'Eng (Active) ป.4',status:'leave'},
    ],
    invoices:[{id:'INV-2026-0048',date:'2026-04-01',amount:7200,status:'paid',course:'Eng (Active) ป.4 · 24h.'}],
    notes:[
      {type:'teacher',text:'Kevin is enthusiastic and picks up vocabulary fast. Consider level-up assessment soon.',author:'Kru Bee',date:'12 May'},
    ]},
];

/* ── FAMILIES ─────────────────────────────────────────────── */
const _families = [
  { id:'tanaka', name:'Tanaka Family', branch:'Sukhumvit', assignee:'Admin Nock', status:'active',
    totalPaid:14400, invoiceCount:1, lastContact:'Today 10:42', channel:'LINE', unreadCount:1,
    parents:[{role:'Mom',name:'Nami Tanaka',line:'@tanaka_mom',phone:'081-234-5678',email:'nami.tanaka@email.com',lineActive:true}],
    students:['Mia Tanaka'],
    notes:[{type:'admin',text:'Very responsive on LINE. Always pays on time. Mia is their only child enrolled.',author:'Admin Nock',date:'9 May'}]},

  { id:'wilson', name:'Wilson Family', branch:'Sukhumvit', assignee:'', status:'urgent',
    totalPaid:4800, invoiceCount:1, lastContact:'Today 09:15', channel:'LINE', unreadCount:1,
    parents:[
      {role:'Dad',name:'Ben Wilson', line:'@wilson_dad',phone:'082-345-6789',email:'ben.wilson@email.com', lineActive:true},
      {role:'Mom',name:'Sara Wilson',line:'',            phone:'082-345-6780',email:'',                    lineActive:false},
    ],
    students:['James Wilson'],
    notes:[{type:'admin',text:'Dad handles all communication. James has 1 class left — URGENT renewal needed.',author:'Admin Nock',date:'9 May'}]},

  { id:'chen', name:'Chen Family', branch:'Sukhumvit', assignee:'Kru Bee', status:'active',
    totalPaid:10800, invoiceCount:1, lastContact:'Yesterday', channel:'LINE', unreadCount:0,
    parents:[{role:'Mom',name:'Lisa Chen',line:'@chen_mom',phone:'083-456-7890',email:'lisa.chen@email.com',lineActive:true}],
    students:['Tom Chen'],
    notes:[{type:'admin',text:'Sent payment slip for INV-2026-0028. Tom attending regularly.',author:'Admin Nock',date:'5 May'}]},

  { id:'srirak', name:'Srirak Family', branch:'Silom', assignee:'Admin Nock', status:'active',
    totalPaid:14400, invoiceCount:2, lastContact:'Mon', channel:'LINE', unreadCount:0,
    parents:[{role:'Mom',name:'Wan Srirak',line:'@srirak_mom',phone:'084-567-8901',email:'wan.srirak@email.com',lineActive:true}],
    students:['Ploy Srirak'],
    notes:[{type:'admin',text:'Requested Wednesday-only schedule. Ploy enrolled in 2 subjects.',author:'Admin Nock',date:'10 May'}]},

  { id:'park', name:'Park Family', branch:'Silom', assignee:'', status:'active',
    totalPaid:7200, invoiceCount:1, lastContact:'Fri', channel:'LINE', unreadCount:0,
    parents:[{role:'Dad',name:'Jin Park',line:'@park_dad',phone:'085-678-9012',email:'jin.park@email.com',lineActive:true}],
    students:['Kevin Park'], notes:[]},
];

/* ── STAFF ────────────────────────────────────────────────── */
const _staff = [
  { id:'arm', name:'Kru Arm', fullName:'Aranya Sombat',   role:'Teacher', subject:'Math ป.5 / ป.6',
    branches:['Sukhumvit'], phone:'090-111-2222', line:'@kru_arm', email:'arm@nockacademy.com',
    status:'active', joinDate:'2024-06-01', thisWeekSessions:5, totalSessions:87,  avgRating:4.8,
    students:['Ploy Srirak'],
    schedule:[{day:'Mon',sessions:['Math ป.5 · 09:00 Rm1','Math ป.5 · 15:00 Rm2']},{day:'Wed',sessions:['Math ป.5 · 15:00 Rm2']},{day:'Thu',sessions:['Math ป.6 · 15:00 Rm2 (co-teach)']}],
    notes:[{type:'admin',text:'Excellent at making abstract concepts visual. Students love her energy.',author:'Admin Nock',date:'1 May'}]},

  { id:'bee', name:'Kru Bee', fullName:'Benyapa Rattana',  role:'Teacher', subject:'Eng (Active) / Eng',
    branches:['Sukhumvit'], phone:'090-222-3333', line:'@kru_bee', email:'bee@nockacademy.com',
    status:'active', joinDate:'2024-03-15', thisWeekSessions:7, totalSessions:142, avgRating:4.9,
    students:['Mia Tanaka','Kevin Park'],
    schedule:[{day:'Mon',sessions:['Eng (Active) · 09:00 Rm1']},{day:'Tue',sessions:['Eng (Active) · 10:30 Rm1']},{day:'Wed',sessions:['Eng (Active) · 10:30 Rm1']},{day:'Thu',sessions:['Eng (Active) · 10:30 Rm1']},{day:'Sat',sessions:['Eng (Active) · 09:00 Rm1','Math ป.6 · 10:00 Rm2']}],
    notes:[{type:'admin',text:'Top performer. Parents frequently request Kru Bee by name. Consider for senior teacher role.',author:'Admin Nock',date:'5 May'}]},

  { id:'cat', name:'Kru Cat', fullName:'Chotika Panya',    role:'Teacher', subject:'Math',
    branches:['Sukhumvit'], phone:'090-333-4444', line:'@kru_cat', email:'cat@nockacademy.com',
    status:'active', joinDate:'2025-01-10', thisWeekSessions:4, totalSessions:63,  avgRating:4.7,
    students:['Tom Chen'],
    schedule:[{day:'Tue',sessions:['Math ป.6 · 15:00 Rm2']},{day:'Wed',sessions:['Math ป.6 · 15:00 Rm2']},{day:'Thu',sessions:['Math ป.6 · 15:00 Rm2']},{day:'Sat',sessions:['Math ป.6 · 10:00 Rm2']}],
    notes:[]},

  { id:'dan', name:'Kru Dan', fullName:'Danai Wongkham',   role:'Teacher', subject:'Science',
    branches:['Sukhumvit','Silom'], phone:'090-444-5555', line:'@kru_dan', email:'dan@nockacademy.com',
    status:'active', joinDate:'2024-09-01', thisWeekSessions:4, totalSessions:58,  avgRating:4.6,
    students:['James Wilson'],
    schedule:[{day:'Mon',sessions:['Science · 14:30 Rm3']},{day:'Tue',sessions:['Science · 14:30 Rm3']},{day:'Wed',sessions:['Science · 14:30 Rm3']},{day:'Thu',sessions:['Science · 14:30 Rm3']}],
    notes:[{type:'admin',text:'Covers both branches. Check travel schedule to avoid double-booking.',author:'Admin Nock',date:'8 May'}]},

  { id:'eve', name:'Kru Eve', fullName:'Evapha Chinarat',  role:'Teacher', subject:'Thai',
    branches:['Silom'], phone:'090-555-6666', line:'@kru_eve', email:'eve@nockacademy.com',
    status:'active', joinDate:'2025-03-01', thisWeekSessions:3, totalSessions:34,  avgRating:4.8,
    students:['Ploy Srirak'],
    schedule:[{day:'Mon',sessions:['Thai · 16:30 Rm1']},{day:'Wed',sessions:['Thai · 16:30 Rm1']},{day:'Sat',sessions:['Thai · 15:00 Rm1']}],
    notes:[]},

  { id:'nock', name:'Admin Nock', fullName:'Nockacademy Admin', role:'Admin', subject:'—',
    branches:['Sukhumvit','Silom'], phone:'090-000-1111', line:'@admin_nock', email:'nock@nockacademy.com',
    status:'active', joinDate:'2024-01-01', thisWeekSessions:0, totalSessions:0, avgRating:null,
    students:[], schedule:[], notes:[]},
];

/* ── SESSIONS (Calendar) ──────────────────────────────────── */
// slotId: 0=10-12, 1=13-15, 2=15-17, 3=18-20 | col: 1=Mon…7=Sun
const _sessions = [
  {id:'s1', date:'2026-05-11',slotId:0,col:1,subject:'Math', grade:'ป.5',teacher:'Kru Arm',room:'Room 1',color:'green', state:'ended',  branch:'Sukhumvit',
   studentNames:['Ploy Srirak','Nat B','Jay C','Sam D'],
   attendance:{'Ploy Srirak':'present','Nat B':'present','Jay C':'leave','Sam D':'present'},
   summaries:{'Ploy Srirak':{text:'Fractions — great progress!',sent:true},'Nat B':{text:'',sent:false},'Sam D':{text:'',sent:false}}},
  {id:'s2', date:'2026-05-11',slotId:1,col:1,subject:'Science', grade:'ป.5',teacher:'Kru Dan',room:'Room 3',color:'orange',state:'ended',  branch:'Sukhumvit',
   studentNames:['James Wilson'],attendance:{'James Wilson':'present'},
   summaries:{'James Wilson':{text:'Plant biology — engaged.',sent:true}}},
  {id:'s3', date:'2026-05-11',slotId:2,col:1,subject:'Thai',grade:'ป.5',teacher:'Kru Eve',room:'Room 1',color:'green', state:'ended',  branch:'Silom',
   studentNames:['Ploy Srirak','Pan G','Wan H'],attendance:{'Ploy Srirak':'present','Pan G':'absent','Wan H':'present'},
   summaries:{'Ploy Srirak':{text:'Thai vowels — excellent!',sent:true},'Pan G':{text:'',sent:false},'Wan H':{text:'',sent:false}}},
  {id:'s4', date:'2026-05-12',slotId:0,col:2,subject:'Eng (Active)',grade:'ป.4',teacher:'Kru Bee',room:'Room 1',color:'yellow',state:'ended',  branch:'Sukhumvit',
   studentNames:['Mia Tanaka','Kevin Park','Leo E','Ava F','Max G'],
   attendance:{'Mia Tanaka':'present','Kevin Park':'present','Leo E':'present','Ava F':'leave','Max G':'present'},
   summaries:{'Mia Tanaka':{text:'Reading comprehension drills.',sent:true},'Kevin Park':{text:'Vocab expansion.',sent:true},'Leo E':{text:'',sent:false},'Max G':{text:'',sent:false}}},
  {id:'s5', date:'2026-05-12',slotId:1,col:2,subject:'Science', grade:'ป.5',teacher:'Kru Dan',room:'Room 3',color:'orange',state:'ended',  branch:'Sukhumvit',
   studentNames:['James Wilson'],attendance:{'James Wilson':'absent'},summaries:{'James Wilson':{text:'',sent:false}}},
  {id:'s6', date:'2026-05-12',slotId:2,col:2,subject:'Math', grade:'ป.6',teacher:'Kru Cat',room:'Room 2',color:'',     state:'ended',  branch:'Sukhumvit',
   studentNames:['Tom Chen','Amy B','Ben C','Cal D','Dan E','Eva F'],
   attendance:{'Tom Chen':'present','Amy B':'present','Ben C':'present','Cal D':'leave','Dan E':'present','Eva F':'present'},
   summaries:{'Tom Chen':{text:'Quadratics intro.',sent:true},'Amy B':{text:'',sent:false},'Ben C':{text:'',sent:false},'Dan E':{text:'',sent:false},'Eva F':{text:'',sent:false}}},
  {id:'s7', date:'2026-05-13',slotId:0,col:3,subject:'Math', grade:'ป.5',teacher:'Kru Arm',room:'Room 2',color:'green', state:'ended',  branch:'Sukhumvit',
   studentNames:['Ploy Srirak','Nat B','Jay C','Sam D'],
   attendance:{'Ploy Srirak':'present','Nat B':'present','Jay C':'present','Sam D':'present'},
   summaries:{'Ploy Srirak':{text:'',sent:false},'Nat B':{text:'',sent:false},'Jay C':{text:'',sent:false},'Sam D':{text:'',sent:false}}},
  {id:'s8', date:'2026-05-13',slotId:0,col:3,subject:'Eng (Active)',grade:'ป.4',teacher:'Kru Bee',room:'Room 1',color:'yellow',state:'ended',  branch:'Sukhumvit',
   studentNames:['Mia Tanaka','Kevin Park','Leo E','Ava F','Max G'],
   attendance:{'Mia Tanaka':'present','Kevin Park':'leave','Leo E':'present','Ava F':'present','Max G':'present'},
   summaries:{'Mia Tanaka':{text:'',sent:false},'Leo E':{text:'',sent:false},'Ava F':{text:'',sent:false},'Max G':{text:'',sent:false}}},
  {id:'s9', date:'2026-05-13',slotId:1,col:3,subject:'Science', grade:'ป.5',teacher:'Kru Dan',room:'Room 3',color:'orange',state:'active', branch:'Sukhumvit',startedAt:'14:35',
   studentNames:['James Wilson'],attendance:{'James Wilson':'present'},summaries:{}},
  {id:'s10',date:'2026-05-13',slotId:2,col:3,subject:'Math', grade:'ป.6',teacher:'Kru Cat',room:'Room 2',color:'',     state:'upcoming',branch:'Sukhumvit',
   studentNames:['Tom Chen','Amy B','Ben C','Cal D','Dan E','Eva F'],attendance:{},summaries:{}},
  {id:'s11',date:'2026-05-13',slotId:2,col:3,subject:'Thai',grade:'ป.5',teacher:'Kru Eve',room:'Room 1',color:'green', state:'upcoming',branch:'Silom',
   studentNames:['Ploy Srirak','Pan G','Wan H'],attendance:{},summaries:{}},
  {id:'s12',date:'2026-05-14',slotId:0,col:4,subject:'Eng (Active)',grade:'ป.4',teacher:'Kru Bee',room:'Room 1',color:'yellow',state:'upcoming',branch:'Sukhumvit',studentNames:['Mia Tanaka','Kevin Park','Leo E','Ava F','Max G'],attendance:{},summaries:{}},
  {id:'s13',date:'2026-05-14',slotId:1,col:4,subject:'Science', grade:'ป.5',teacher:'Kru Dan',room:'Room 3',color:'orange',state:'upcoming',branch:'Sukhumvit',studentNames:['James Wilson'],attendance:{},summaries:{}},
  {id:'s14',date:'2026-05-14',slotId:2,col:4,subject:'Math', grade:'ป.6',teacher:'Kru Cat',room:'Room 2',color:'',     state:'upcoming',branch:'Sukhumvit',studentNames:['Tom Chen','Amy B','Ben C','Cal D','Dan E','Eva F'],attendance:{},summaries:{}},
  {id:'s15',date:'2026-05-16',slotId:0,col:6,subject:'Eng (Active)',grade:'ป.4',teacher:'Kru Bee',room:'Room 1',color:'',     state:'upcoming',branch:'Sukhumvit',studentNames:['Mia Tanaka','Kevin Park','Leo E','Ava F'],attendance:{},summaries:{}},
  {id:'s16',date:'2026-05-16',slotId:1,col:6,subject:'Math', grade:'ป.6',teacher:'Kru Cat',room:'Room 2',color:'',     state:'upcoming',branch:'Sukhumvit',studentNames:['Tom Chen','Amy B','Ben C','Cal D','Dan E'],attendance:{},summaries:{}},
  {id:'s17',date:'2026-05-16',slotId:2,col:6,subject:'Thai',grade:'ป.5',teacher:'Kru Eve',room:'Room 1',color:'green', state:'upcoming',branch:'Silom',studentNames:['Ploy Srirak','Pan G','Wan H'],attendance:{},summaries:{}},
];

/* ── CRM LEADS ────────────────────────────────────────────── */
const _leads = [
  {id:'sarah', name:'Sarah Mitchell', course:'Eng (Active)', age:9,  source:'Referred',  stage:'new',        daysAgo:1,  assignee:'Admin Nock', line:'@sarah_mom', phone:'089-111-2222'},
  {id:'arjun', name:'Arjun Patel',    course:'Math ป.4',    age:10, source:'Website',    stage:'new',        daysAgo:3,  assignee:'',           line:'@arjun_dad', phone:'089-333-4444'},
  {id:'emma',  name:'Emma Liu',       course:'Science',          age:12, source:'Walk-in',    stage:'new',        daysAgo:5,  assignee:'Admin Nock', line:'',           phone:'089-555-6666'},
  {id:'kevin', name:'Kevin Park (Lead)',course:'Thai',  age:8,  source:'Referral',   stage:'contacting', daysAgo:4,  assignee:'Kru Eve',    line:'@park_mom',  phone:'089-777-8888'},
  {id:'nadia', name:'Nadia Sorokin',  course:'Math ป.5',    age:11, source:'Website',    stage:'contacting', daysAgo:6,  assignee:'Admin Nock', line:'@nadia_mom', phone:'089-999-0000'},
  {id:'ben',   name:'Ben Torres',     course:'English',          age:7,  source:'Referral',   stage:'contacting', daysAgo:2,  assignee:'',           line:'',           phone:'089-111-3333'},
  {id:'lily',  name:'Lily Wang',      course:'Science',          age:13, source:'Website',    stage:'test',       daysAgo:7,  assignee:'Kru Dan',    line:'@lily_mom',  phone:'089-222-4444', schedDate:'16 May 10:30'},
  {id:'daan',  name:'Daan Smits',     course:'Math ป.6',    age:12, source:'Referral',   stage:'test',       daysAgo:5,  assignee:'Kru Cat',    line:'@daan_dad',  phone:'089-333-5555', schedDate:'17 May 09:00'},
  {id:'hana',  name:'Hana Yamamoto',  course:'Eng (Active)',  age:9,  source:'Referral',   stage:'trial',      daysAgo:3,  assignee:'Kru Bee',    line:'@hana_mom',  phone:'089-444-6666', schedDate:'15 May 10:30'},
  {id:'luca',  name:'Luca Romano',    course:'Thai',    age:11, source:'Walk-in',    stage:'trial',      daysAgo:2,  assignee:'Kru Eve',    line:'@luca_dad',  phone:'089-555-7777', schedDate:'18 May 13:00'},
  {id:'chris', name:'Chris Baker',    course:'Math ป.5',          age:11, source:'Website',    stage:'archived',   daysAgo:20, assignee:'',           line:'',           phone:'', archivedFrom:'test'},
  {id:'anna',  name:'Anna White',     course:'English',          age:8,  source:'Walk-in',    stage:'archived',   daysAgo:14, assignee:'',           line:'',           phone:'', archivedFrom:'contacting'},
];

/* ── CRM CUSTOMERS ────────────────────────────────────────── */
const _customers = [
  {name:'Mia Tanaka',   family:'Tanaka Family', branch:'Sukhumvit', course:'Eng (Active) ป.4', pkg:'Eng (Active) ป.4 · 48h.', teacher:'Kru Bee',         schedule:'Tue/Thu 10:30',  remain:2,  total:48, since:'Jan 2026', until:'Jun 2026', status:'renewal', phone:'089-100-0001', line:'@tanaka_mom', revenue:51000},
  {name:'Tom Chen',     family:'Chen Family',   branch:'Sukhumvit', course:'Math ป.6',         pkg:'Math ป.6 · 36h.',         teacher:'Kru Cat',         schedule:'Tue/Thu 15:00',  remain:14, total:36, since:'Mar 2026', until:'Aug 2026', status:'active',  phone:'089-100-0002', line:'@chen_dad',   revenue:18000},
  {name:'Ploy Srirak',  family:'Srirak Family', branch:'Silom',     course:'Math ป.5 + Thai ป.5', pkg:'Math ป.5 · 24h. + Thai ป.5 · 24h.', teacher:'Kru Arm / Kru Eve', schedule:'Wed multi', remain:18, total:48, since:'Nov 2025', until:'Jul 2026', status:'active', phone:'089-100-0003', line:'@srirak_mom', revenue:33000},
  {name:'James Wilson', family:'Wilson Family',  branch:'Sukhumvit', course:'Science ป.5',      pkg:'Science ป.5 · 12h.',      teacher:'Kru Dan',         schedule:'Tue/Thu 14:30',  remain:1,  total:12, since:'Feb 2026', until:'May 2026', status:'urgent',  phone:'089-100-0004', line:'@wilson_dad', revenue:11000},
  {name:'Kevin Park',   family:'Park Family',    branch:'Sukhumvit', course:'Eng (Active) ป.4', pkg:'Eng (Active) ป.4 · 24h.', teacher:'Kru Bee',         schedule:'Mon/Wed 10:30',  remain:16, total:24, since:'Apr 2026', until:'Jul 2026', status:'active',  phone:'089-100-0005', line:'@park_mom',   revenue:4200},
];

/* ── INBOX ────────────────────────────────────────────────── */
const _conversations = [
  {id:'tanaka', name:'Tanaka Family', student:'Mia Tanaka',   branch:'Sukhumvit', channel:'LINE', unread:true,  time:'10:42',     assignee:'Admin Nock', preview:'ขอบคุณมากค่ะ สรุปบทเรียนดีมาก…'},
  {id:'wilson', name:'Wilson Family', student:'James Wilson',  branch:'Sukhumvit', channel:'LINE', unread:true,  time:'09:15',     assignee:'',           preview:"Hi, can we reschedule Tuesday's…"},
  {id:'chen',   name:'Chen Family',   student:'Tom Chen',      branch:'Sukhumvit', channel:'LINE', unread:true,  time:'Yesterday', assignee:'Kru Bee',    preview:'Invoice attached. Please confirm…'},
  {id:'srirak', name:'Srirak Family', student:'Ploy Srirak',   branch:'Silom',     channel:'LINE', unread:false, time:'Mon',       assignee:'Admin Nock', preview:'Ploy will be absent this Thursday…'},
  {id:'romano', name:'Romano Family', student:'Luca Romano',   branch:'Silom',     channel:'LINE', unread:false, time:'Mon',       assignee:'',           preview:'Thank you for the trial session!'},
  {id:'park',   name:'Park Family',   student:'Kevin Park',    branch:'Silom',     channel:'LINE', unread:false, time:'Fri',       assignee:'',           preview:'When is the next class schedule?'},
];

const _messages = {
  tanaka:[
    {type:'parent',   text:'สวัสดีค่ะ อยากสอบถามเรื่องตารางเรียนสัปดาห์หน้าค่ะ',                                                time:'Mon 09:10',    sender:'Tanaka Mom'},
    {type:'staff',    text:'สวัสดีครับคุณแม่ สัปดาห์หน้า Mia มีเรียนวันอังคาร และพฤหัสบดีครับ เวลา 10:30–12:00 ครับ',          time:'Mon 09:25',    sender:'Admin Nock'},
    {type:'parent',   text:'ขอบคุณค่ะ แล้วสรุปบทเรียนส่งได้เมื่อไหร่คะ?',                                                       time:'Mon 10:00',    sender:'Tanaka Mom'},
    {type:'internal', text:'📎 Note (Internal): Summary for last session pending — remind teacher to submit',                     time:'Mon 10:05',    sender:'Admin Nock'},
    {type:'staff',    text:'คุณแม่ครับ สรุปบทเรียนจะส่งภายในวันนี้เลยครับ',                                                     time:'Mon 10:30',    sender:'Admin Nock'},
    {type:'parent',   text:'ขอบคุณมากค่ะ สรุปบทเรียนดีมากเลยนะคะ Mia ชอบมากค่ะ 🙏',                                             time:'Today 10:42',  sender:'Tanaka Mom'},
  ],
  wilson: [{type:'parent', text:"Hi, can we reschedule Tuesday's class? James has a doctor appointment.", time:'Today 09:15', sender:'Wilson Dad'}],
  chen:   [{type:'parent', text:'Please find the payment slip attached. Invoice #INV-2026-0049 confirmed.', time:'Yesterday', sender:'Chen Mom'}],
  srirak: [{type:'parent', text:'สวัสดีค่ะ แจ้งว่า Ploy จะไม่มาเรียนวันพฤหัสนี้ค่ะ ขอ Leave ค่ะ', time:'Mon', sender:'Srirak Mom'}],
  romano: [{type:'parent', text:'Thank you so much for the trial session! Luca really enjoyed it.', time:'Mon', sender:'Romano Dad'}],
  park:   [{type:'parent', text:'สวัสดีครับ อยากถามว่าตารางเรียนของ Kevin อาทิตย์หน้าเป็นยังไงบ้างครับ?', time:'Fri', sender:'Park Dad'}],
};

/* ── CALENDAR CONFIG ──────────────────────────────────────── */
const _dayHeaders = [
  {label:'Mon 11', date:'2026-05-11', isToday:false, isHoliday:false},
  {label:'Tue 12', date:'2026-05-12', isToday:false, isHoliday:false},
  {label:'Wed 13', date:'2026-05-13', isToday:true,  isHoliday:false},
  {label:'Thu 14', date:'2026-05-14', isToday:false, isHoliday:false},
  {label:'Fri 15', date:'2026-05-15', isToday:false, isHoliday:true },
  {label:'Sat 16', date:'2026-05-16', isToday:false, isHoliday:false},
  {label:'Sun 17', date:'2026-05-17', isToday:false, isHoliday:false},
];

/* ── CONSTANTS ────────────────────────────────────────────── */
const _const = {
  STUDENT_STATUS: {
    active:   {label:'Active',          cls:'badge-green' },
    renewal:  {label:'Renewal Pending', cls:'badge-yellow'},
    urgent:   {label:'URGENT Renewal',  cls:'badge-red'   },
    inactive: {label:'Inactive',        cls:'badge-gray'  },
  },
  ATTENDANCE_META: {
    present:    {label:'Present',    cls:'badge-green',  deduct:true },
    leave:      {label:'Leave',      cls:'badge-yellow', deduct:false},
    absent:     {label:'Absent',     cls:'badge-red',    deduct:true },
    reschedule: {label:'Reschedule', cls:'badge-blue',   deduct:false},
    transfer:   {label:'Transfer',   cls:'badge-purple', deduct:false},
  },
  LEAD_STAGES: {
    new:        {label:'New Lead',           color:'#6366f1', bg:'#ede9fe'},
    contacting: {label:'Contacting',         color:'#f59e0b', bg:'#fef3c7'},
    test:       {label:'Interested (Test)',  color:'#f97316', bg:'#ffedd5'},
    trial:      {label:'Interested (Trial)', color:'#8b5cf6', bg:'#f5f3ff'},
    archived:   {label:'Archived',           color:'#9ca3af', bg:'#f3f4f6'},
  },
  ROLE_META: {
    Teacher: {cls:'badge-blue',   label:'Teacher'},
    Admin:   {cls:'badge-purple', label:'Admin'  },
  },
  FAMILY_STATUS: {
    active:  {cls:'badge-green',  label:'Active' },
    urgent:  {cls:'badge-red',    label:'Urgent' },
    pending: {cls:'badge-yellow', label:'Pending'},
  },
  SUBJECT_COLOR: {'Eng':'blue','Math':'green','Science':'orange','Thai':'green','Eng (Active)':'yellow','Eng (Grammar)':'purple'},
  TIME_SLOTS: [
    {id:0,   start:'10:00', end:'12:00', type:'class'},
    {id:'b1',start:'12:00', end:'13:00', type:'break', label:'🍱 Lunch Break'},
    {id:1,   start:'13:00', end:'15:00', type:'class'},
    {id:2,   start:'15:00', end:'17:00', type:'class'},
    {id:'b2',start:'17:00', end:'18:00', type:'break', label:'☕ Rest Break'},
    {id:3,   start:'18:00', end:'20:00', type:'class'},
  ],
  SLOT_HOURS: {0:{s:'10:00',e:'12:00'}, 1:{s:'13:00',e:'15:00'}, 2:{s:'15:00',e:'17:00'}, 3:{s:'18:00',e:'20:00'}},
  BREAK_HOURS: {'12:00':'🍱 Lunch Break', '17:00':'☕ Rest Break'},
  TIME_HOURS:  ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00'],
  TEACHERS:    ['Kru Arm','Kru Bee','Kru Cat','Kru Dan','Kru Eve'],
  STAFF_NAMES: ['Admin Nock','Kru Arm','Kru Bee','Kru Cat','Kru Dan','Kru Eve'],
  SUBJECTS:    ['Eng','Math','Science','Thai','Eng (Active)','Eng (Grammar)'],
  GRADES:      ['ป.1','ป.2','ป.3','ป.4','ป.5','ป.6','ม.1','ม.2','ม.3'],
  ROOMS:       ['Room 1','Room 2','Room 3'],
  BRANCHES:    ['Sukhumvit','Silom'],
};

/* ── EXPOSE GLOBALS ───────────────────────────────────────── */
window.DB = {
  students:      _students,
  families:      _families,
  staff:         _staff,
  sessions:      _sessions,
  leads:         _leads,
  customers:     _customers,
  conversations: _conversations,
  messages:      _messages,
  dayHeaders:    _dayHeaders,
};
window.CONST = _const;
// Legacy alias — calendar-class.js used window.calSessions
window.calSessions = _sessions;
