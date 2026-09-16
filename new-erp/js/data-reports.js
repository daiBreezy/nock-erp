/* ============================================================
   data-reports.js — NockERP Reports Metrics Layer
   ------------------------------------------------------------
   Aggregate "fact table" รายเดือนต่อสาขา (pattern มาตรฐานของ BI:
   รายงานอ่านจากข้อมูลสรุป ไม่ไล่อ่าน transactional ทุกครั้ง)
   - 5 สาขา / 2 area · 2025 ครบ 12 เดือน + 2026 Jan–Jun (YTD)
   - seed แบบ deterministic (เลขเดิมทุกครั้ง) ผ่าน seeded RNG
   API: window.RD  (Reports Data)
   ============================================================ */
window.DB = window.DB || {};
(function () {

  /* ── BRANCH PROFILES ──────────────────────────────────── */
  const PROFILES = [
    { name:'Sukhumvit', area:'Bangkok', code:'BKK', rooms:3, rev:520000, stu:84, growth:0.06, attr:0.85 },
    { name:'Silom',     area:'Bangkok', code:'BKK', rooms:2, rev:310000, stu:53, growth:0.03, attr:0.82 },
    { name:'Bang-Na',   area:'Bangkok', code:'BKK', rooms:2, rev:180000, stu:35, growth:0.18, attr:0.80 },
    { name:'Sriracha',  area:'Eastern', code:'CBR', rooms:2, rev:150000, stu:30, growth:0.09, attr:0.83 },
    { name:'Pattaya',   area:'Eastern', code:'CBR', rooms:2, rev:120000, stu:24, growth:0.12, attr:0.78 },
  ];

  DB.areas = [
    { id:'area-bkk', name:'Bangkok', branches:['Sukhumvit','Silom','Bang-Na'] },
    { id:'area-est', name:'Eastern', branches:['Sriracha','Pattaya'] },
  ];
  DB.reportBranches = PROFILES.map(p => ({ name:p.name, area:p.area, code:p.code, rooms:p.rooms }));

  /* ── DETERMINISTIC RNG (seed = string) ───────────────────── */
  function rng(seedStr) {
    let s = 0;
    for (let i = 0; i < seedStr.length; i++) s = (s * 31 + seedStr.charCodeAt(i)) >>> 0;
    return () => { s = (s * 1103515245 + 12345) >>> 0; return (s >>> 8) / 16777216; };
  }
  const SEASON = [0.85,0.88,1.12,1.06,0.96,1.0,0.78,1.16,1.12,1.22,0.86,0.94]; // Jan..Dec

  /* months: 2025-01..12 + 2026-01..06 */
  const MONTHS = [];
  for (let m = 1; m <= 12; m++) MONTHS.push(`2025-${String(m).padStart(2,'0')}`);
  for (let m = 1; m <= 6;  m++) MONTHS.push(`2026-${String(m).padStart(2,'0')}`);

  /* ── GENERATE FACT ROWS ──────────────────────────────────── */
  const rows = [];
  PROFILES.forEach(p => {
    MONTHS.forEach(ym => {
      const [y, m] = ym.split('-').map(Number);
      const r = rng(p.name + ym);
      const yearFactor = y === 2026 ? (1 + p.growth) : 1;
      const season = SEASON[m - 1];

      const students = Math.round(p.stu * yearFactor * (0.95 + r() * 0.12));
      const revenue  = Math.round(p.rev * yearFactor * season * (0.9 + r() * 0.2) / 1000) * 1000;
      const newStudents = Math.round(students * (0.05 + r() * 0.07));
      const churn       = Math.round(students * (0.02 + r() * 0.045));
      const renewals    = Math.round(students * (0.07 + r() * 0.06));
      const sessions    = Math.round(students * (2.1 + r() * 0.7));
      const attEvents   = Math.round(sessions * (3 + r() * 2));
      const present     = Math.round(attEvents * (p.attr + r() * 0.06 - 0.03));
      const leave       = Math.round(attEvents * (0.04 + r() * 0.04));
      const absent      = Math.max(0, attEvents - present - leave);
      const conversions = newStudents;
      const leads       = Math.round(conversions / (0.24 + r() * 0.16));
      const capacity    = p.rooms * 6 * 4; // proxy: rooms × slots/day × days/wk
      const outstanding = Math.round(revenue * (0.05 + r() * 0.10) / 1000) * 1000; // ยังไม่จ่าย
      const discount    = Math.round(revenue * (0.03 + r() * 0.05) / 1000) * 1000; // ส่วนลดที่ให้ไป
      const lost        = Math.round(churn * (0.45 + r() * 0.3));                  // ลาออกจริง
      const paused      = Math.max(0, churn - lost);                                // pause ชั่วคราว

      rows.push({
        branch:p.name, area:p.area, ym, year:y, month:m,
        revenue, students, newStudents, churn, renewals, sessions,
        present, absent, leave, attEvents, leads, conversions, capacity,
        outstanding, discount, lost, paused,
      });
    });
  });
  DB.branchMonthly = rows;

  /* ── ACCESSORS (window.RD) ───────────────────────────────── */
  const SUM_FIELDS = ['revenue','students','newStudents','churn','renewals','sessions',
                      'present','absent','leave','attEvents','leads','conversions','capacity',
                      'outstanding','discount','lost','paused'];

  function branchesForArea(area) {
    const a = DB.areas.find(x => x.name === area);
    return a ? a.branches.slice() : [];
  }

  /* rows ที่อยู่ในชุดสาขา + ช่วง ym [start,end] (inclusive, string compare) */
  function filter(branches, ymStart, ymEnd) {
    return rows.filter(r =>
      (!branches || branches.includes(r.branch)) &&
      r.ym >= ymStart && r.ym <= ymEnd);
  }

  /* รวมเป็นก้อนเดียว (sum) — students/capacity = ใช้ค่าเฉลี่ยรายเดือน ไม่ใช่ sum */
  function aggregate(branches, ymStart, ymEnd) {
    const f = filter(branches, ymStart, ymEnd);
    const out = {}; SUM_FIELDS.forEach(k => out[k] = 0);
    f.forEach(r => SUM_FIELDS.forEach(k => out[k] += r[k]));
    /* metric แบบ "stock" (ไม่สะสม) → เฉลี่ยต่อเดือน */
    const months = new Set(f.map(r => r.ym)).size || 1;
    out.students = Math.round(out.students / months);
    out.capacity = Math.round(out.capacity / months);
    out._months = months;
    return derive(out);
  }

  /* ใส่ rate/derived metrics */
  function derive(a) {
    a.arpu        = a.students ? Math.round(a.revenue / a.students) : 0;
    a.net         = a.newStudents - a.churn;
    a.attRate     = a.attEvents ? Math.round(a.present / a.attEvents * 100) : 0;
    a.retention   = (a.renewals + a.churn) ? Math.round(a.renewals / (a.renewals + a.churn) * 100) : 0;
    a.convRate    = a.leads ? Math.round(a.conversions / a.leads * 100) : 0;
    a.utilization = a.capacity ? Math.round(a.students / a.capacity * 100) : 0;
    return a;
  }

  /* time series รายเดือนของ metric (สำหรับกราฟ) */
  function series(branches, ymStart, ymEnd, metric) {
    const byYm = {};
    filter(branches, ymStart, ymEnd).forEach(r => {
      byYm[r.ym] = (byYm[r.ym] || 0) + (r[metric] || 0);
    });
    return Object.keys(byYm).sort().map(ym => ({ ym, value: byYm[ym] }));
  }

  window.RD = {
    profiles: PROFILES, months: MONTHS,
    allBranches: () => PROFILES.map(p => p.name),
    branchesForArea, filter, aggregate, derive, series,
    SUM_FIELDS,
  };

})();
