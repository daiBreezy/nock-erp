/* ============================================================
   data-sync.js — Derived-Data Sync Layer
   LOAD ORDER: after data.js + data-settings.js, before modules

   Single sources of truth:
     DB.enrollments                → hours / blocks per student
     DB.packages + branchSettings  → pricing per branch
     DB.subjects + branchSettings  → subjects per branch
     DB.branchSettings.rooms       → room names per branch
     DB.holidays                   → calendar holiday flags

   Everything below REGENERATES legacy display caches
   (student.courses, customers.remain, branchPricing, …)
   so existing modules stay correct without rewrites.

   Call Sync.all() again after any Settings change.
   ============================================================ */
(function () {
  const Sync = {};

  /* ── Packages + branch overrides → DB.branchPricing ─────── */
  Sync.branchPricing = function () {
    (DB.branchSettings || []).forEach(bs => {
      const out = {};
      (bs.packages || []).forEach(sel => {
        const pkg = (DB.packages || []).find(p => p.id === sel.packageId);
        if (!pkg || pkg.type !== 'hour') return;
        out['h' + pkg.hours] = sel.price ?? pkg.price;
      });
      DB.branchPricing[bs.branch] = out;
    });
  };

  /* ── Enrollments → student.courses (display cache) ──────── */
  Sync.studentCourses = function () {
    DB.students.forEach(stu => {
      const enrs = (DB.enrollments || []).filter(e =>
        e.studentId === stu.id && e.status === 'active');
      if (!enrs.length) return;   // ghost/legacy student — keep as-is
      stu.courses = enrs.map(e => {
        const inv = (DB.invoices || []).find(i => i.id === e.invoiceId);
        const crs = (DB.courses  || []).find(c => c.id === e.courseId);
        if (e.enrollType === 'bundle') {
          const size  = crs?.billingBlockSize || 4;
          const total = (e.blocksPaid || 0) * size;          // class days paid
          const used  = e.blockUsed || 0;
          return { courseId: e.courseId, name: crs?.name || 'Bundle', bundle: true,
                   hours: total, used, left: total - used,
                   price: inv?.amount || 0 };
        }
        return { courseId: e.courseId, name: `${e.subject} ${e.grade}`,
                 hours: e.packageHours, used: e.usedHours, left: e.remainHours,
                 price: inv?.amount || 0 };
      });
    });
  };

  /* ── Enrollments → student.status (manual pause/archived wins) ── */
  Sync.studentStatus = function () {
    DB.students.forEach(stu => {
      if (stu.status === 'archived') return;
      if (stu.statusManual) return;                  // admin override flag
      const enrs = (DB.enrollments || []).filter(e =>
        e.studentId === stu.id && e.status === 'active');
      if (!enrs.length) return;
      const left = Math.min(...stu.courses.map(c => c.left));
      stu.status = left === 0 ? 'pause' : left <= 2 ? 'renewal' : 'active';
    });
  };

  /* ── Enrollments → DB.customers remain/total/status ─────── */
  Sync.customers = function () {
    (DB.customers || []).forEach(c => {
      const stu = DB.students.find(s => s.id === c.studentId);
      if (!stu || !stu.courses?.length) return;
      c.remain = Math.min(...stu.courses.map(x => x.left));
      c.total  = stu.courses.reduce((a, x) => a + x.hours, 0);
      c.status = stu.status;
      c.revenue = stu.courses.reduce((a, x) => a + (x.price || 0), 0);
    });
  };

  /* ── Paid invoices → family totals ──────────────────────── */
  Sync.familyTotals = function () {
    (DB.families || []).forEach(f => {
      const invs = (DB.invoices || []).filter(i => i.familyId === f.id);
      if (!invs.length) return;
      f.invoiceCount = invs.length;
      f.totalPaid    = invs.filter(i => i.status === 'paid')
                           .reduce((a, i) => a + i.amount, 0);
    });
  };

  /* ── Holidays → dayHeaders.isHoliday ────────────────────── */
  Sync.dayHeaders = function () {
    (DB.dayHeaders || []).forEach(dh => {
      const hol = (DB.holidays || []).find(h => h.active && h.date === dh.date);
      dh.isHoliday   = !!hol;
      dh.holidayName = hol?.name || null;
    });
  };

  Sync.all = function () {
    Sync.branchPricing();
    Sync.studentCourses();
    Sync.studentStatus();
    Sync.customers();
    Sync.familyTotals();
    Sync.dayHeaders();
  };

  window.Sync = Sync;
  Sync.all();
})();
