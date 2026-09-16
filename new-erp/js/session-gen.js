/* ============================================================
   session-gen.js — NockERP Weekly Session Generation
   ------------------------------------------------------------
   สร้าง session ของสัปดาห์จาก Class templates (DB.classes)
   - generate เฉพาะนักเรียนที่ยังมี hours/blocks เหลือ
   - ข้าม holiday + ข้าม class ที่ไม่มีนักเรียนเหลือ
   - id เสถียร (gen-<monday>-<classId>-<col>) → regenerate ไม่ซ้ำ
   API: SessionGen.generateWeek(mondayStr, {commit})  →  {sessions, stats}
        SessionGen.weekDates(mondayStr)               →  [{date,col,dow,isHoliday}]
   ============================================================ */
window.SessionGen = (function () {

  const DOW = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  /* date string → {dow, col(1=Mon..7=Sun)} */
  function dowOf(dateStr) {
    const [y,m,d] = dateStr.split('-').map(Number);
    const g = new Date(y, m-1, d).getDay();      // 0=Sun..6=Sat
    return { dow: DOW[g], col: g === 0 ? 7 : g };
  }

  function addDays(dateStr, n) {
    const [y,m,d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m-1, d + n);
    const p = x => String(x).padStart(2,'0');
    return `${dt.getFullYear()}-${p(dt.getMonth()+1)}-${p(dt.getDate())}`;
  }

  function isHoliday(dateStr) {
    return (DB.holidays || []).some(h => h.date === dateStr);
  }

  /* 7 วันของสัปดาห์ เริ่มจาก mondayStr */
  function weekDates(mondayStr) {
    return Array.from({length:7}, (_,i) => {
      const date = addDays(mondayStr, i);
      const { dow, col } = dowOf(date);
      return { date, col, dow, isHoliday: isHoliday(date) };
    });
  }

  /* enrollment ที่ยัง "ใช้ได้" ของนักเรียนใน class นี้ (มี hours/blocks เหลือ) */
  function activeEnrollment(studentId, cls) {
    return (DB.enrollments || []).find(e => {
      if (e.studentId !== studentId || e.classId !== cls.id) return false;
      if (e.status === 'archived' || e.status === 'pending_payment') return false;
      if (e.enrollType === 'bundle') {
        const course = (DB.courses || []).find(c => c.id === e.courseId);
        const blockSize = course?.billingBlockSize || 4;
        return (e.blocksPaid * blockSize - e.blockUsed) > 0;
      }
      return (e.remainHours || 0) > 0;
    });
  }

  /* ⭐ นักเรียนคนนี้มาเรียนวันนี้ไหม
     คลาสอาจเปิด จ.+พ. แต่นักเรียนลง "สัปดาห์ละ 1 ครั้ง" (มาแค่ พ.) → ไม่ต้องขึ้นวันจันทร์
     enr.days = วันประจำ · enr.boost = เพิ่มรอบชั่วคราว (ช่วงก่อนสอบ) {days,from,to} */
  function attendsOn(enr, dayName, dateStr) {
    if (!enr) return true;                          // demo/ไม่มี enrollment → เหมือนเดิม
    const boost = enr.boost;
    if (boost && (boost.days||[]).includes(dayName)
        && (!boost.from || dateStr >= boost.from)
        && (!boost.to   || dateStr <= boost.to)) return true;
    if (!Array.isArray(enr.days) || !enr.days.length) return true;   // ใบเก่าไม่มี days = มาทุกวันของคลาส
    return enr.days.includes(dayName);
  }

  /* นักเรียนใน class ที่ควร generate (hours เหลือ + มาเรียนวันนั้น) */
  function eligibleStudents(cls, dayName, dateStr) {
    return (cls.students || []).filter(name => {
      const stud = Utils.studentByName(name);
      if (!stud) return true;                       // demo roster name → keep
      const enr = activeEnrollment(stud.id, cls);
      if (!enr) return false;                       // real student → ต้องมี enrollment ที่ยังเหลือ
      return dayName ? attendsOn(enr, dayName, dateStr) : true;
    });
  }

  /* สร้าง session ของสัปดาห์ (mondayStr = วันจันทร์ของสัปดาห์เป้าหมาย) */
  function generateWeek(mondayStr, opts) {
    opts = opts || {};
    const week  = weekDates(mondayStr);
    const byDow = {}; week.forEach(d => { byDow[d.dow] = d; });

    const out   = [];
    const stats = { classes:0, sessions:0, students:0, skipHoliday:0, skipEmpty:0 };

    (DB.classes || []).forEach(cls => {
      if (cls.status && cls.status !== 'active') return;
      stats.classes++;

      (cls.days || []).forEach(dayName => {
        const day = byDow[dayName];
        if (!day) return;
        if (day.isHoliday) { stats.skipHoliday++; return; }

        const students = eligibleStudents(cls, dayName, day.date);
        if (!students.length) { stats.skipEmpty++; return; }

        out.push({
          id:        `gen-${mondayStr}-${cls.id}-${day.col}`,
          date:      day.date,
          slotId:    cls.slotId,
          col:       day.col,
          subject:   cls.subject,
          grade:     cls.grade,
          teacher:   cls.teacher,
          room:      cls.room,
          branch:    cls.branch,
          color:     CONST.SUBJECT_COLOR[cls.subject] || '',
          state:     'upcoming',
          classId:   cls.id,
          courseId:  cls.courseId,
          ...(cls.bundleId ? { bundleId: cls.bundleId } : {}),
          studentNames: students,
          attendance:   {},
          summaries:    {},
          generated:    true,
        });
        stats.sessions++;
        stats.students += students.length;
      });
    });

    if (opts.commit) {
      /* ลบ session ที่เคย generate ของสัปดาห์นี้ทิ้งก่อน (กันซ้ำ) แล้วค่อย push */
      const prefix = `gen-${mondayStr}-`;
      for (let i = DB.sessions.length - 1; i >= 0; i--) {
        if (String(DB.sessions[i].id).startsWith(prefix)) DB.sessions.splice(i, 1);
      }
      out.forEach(s => DB.sessions.push(s));
      if (window.Sync && Sync.dayHeaders) Sync.dayHeaders();
    }

    return { sessions: out, stats, mondayStr };
  }

  return { weekDates, eligibleStudents, generateWeek };

})();
