/* placeholder.js — ใส่ empty state สำหรับ modules ที่ยังไม่ได้ build */
(function () {
  const placeholders = {
  };

  Object.entries(placeholders).forEach(([id, p]) => {
    const el = document.getElementById('view-' + id);
    if (!el) return;
    el.innerHTML = `
      <div class="page-header">
        <div><div class="page-title">${p.title}</div></div>
      </div>
      <div class="card" style="padding:60px 20px;text-align:center;color:var(--md-on-surface-variant)">
        <div style="font-size:48px;margin-bottom:16px">${p.icon}</div>
        <div style="font-size:15px;font-weight:600;color:var(--md-on-surface);margin-bottom:6px">${p.title}</div>
        <div style="font-size:13px">${p.desc}</div>
        <div style="margin-top:16px;font-size:12px;background:var(--md-surface-low);display:inline-block;padding:6px 14px;border-radius:20px;border:1px solid var(--md-outline-variant)"><span class="mdi mdi-sm">construction</span> Coming next sprint</div>
      </div>`;
  });
})();
