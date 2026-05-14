/* placeholder.js — ใส่ empty state สำหรับ modules ที่ยังไม่ได้ build */
(function () {
  const placeholders = {
    notifications: { icon:'🔔', title:'Notifications', desc:'Notification center' },
    tasks:         { icon:'☑️', title:'Tasks',         desc:'Task management module' },
    families:      { icon:'👨‍👩‍👧', title:'Families',      desc:'Family & parent management' },
    staff:         { icon:'👤', title:'Staff',         desc:'Staff, roles & schedules' },
    courses:       { icon:'📖', title:'Courses',       desc:'Course catalog & packages' },
    classes:       { icon:'🏫', title:'Classes',       desc:'Class scheduling & transfers' },
    sessions:      { icon:'⏱️', title:'Sessions',      desc:'Session tracking & check-in' },
    attendance:    { icon:'✅', title:'Attendance',    desc:'Attendance logs & consumption' },
    summaries:     { icon:'📝', title:'Summaries',     desc:'Session summaries & AI assist' },
    logs:          { icon:'🕐', title:'Logs & Timeline', desc:'Full audit log & event history' },
  };

  Object.entries(placeholders).forEach(([id, p]) => {
    const el = document.getElementById('view-' + id);
    if (!el) return;
    el.innerHTML = `
      <div class="page-header">
        <div><div class="page-title">${p.title}</div></div>
      </div>
      <div class="card" style="padding:60px 20px;text-align:center;color:#9ca3af">
        <div style="font-size:48px;margin-bottom:16px">${p.icon}</div>
        <div style="font-size:15px;font-weight:600;color:#374151;margin-bottom:6px">${p.title}</div>
        <div style="font-size:13px">${p.desc}</div>
        <div style="margin-top:16px;font-size:12px;background:#f9fafb;display:inline-block;padding:6px 14px;border-radius:20px;border:1px solid #e5e7eb">🚧 Coming next sprint</div>
      </div>`;
  });
})();
