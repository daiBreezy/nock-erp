/* exports.js — shared real actions for buttons ที่เคยเป็น placeholder
   window.NockExport.csv / .text / .copy / .maps  — ใช้ทั่วทุกโมดูล */
(function () {
  function dl(blob, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
  }
  window.NockExport = {
    /* rows = array ของ object → ดาวน์โหลดไฟล์ CSV จริง */
    csv(filename, rows) {
      if (!rows || !rows.length) { showToast('No data to export', 'warning'); return; }
      const cols = [...new Set(rows.flatMap(r => Object.keys(r)))];
      const esc = v => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`;
      const body = [cols.join(',')].concat(rows.map(r => cols.map(c => esc(r[c])).join(','))).join('\r\n');
      dl(new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' }), filename);
      showToast(`Exported ${rows.length} rows → ${filename} ✓`, 'success');
    },
    text(filename, content) {
      dl(new Blob([content], { type: 'text/plain;charset=utf-8' }), filename);
      showToast(`Downloaded ${filename} ✓`, 'success');
    },
    copy(text) {
      const done = () => showToast('Copied to clipboard ✓', 'success');
      const fail = () => { showToast('คัดลอกไม่ได้ — ลองใหม่', 'warning'); };
      if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, fail);
      else fail();
    },
    /* เปิด Google Maps จริง จากลิสต์ที่อยู่ (waypoints) */
    maps(addresses, dest) {
      const wp = (addresses || []).filter(Boolean).map(encodeURIComponent).join('/');
      const d = encodeURIComponent(dest || 'โรงเรียน');
      window.open(`https://www.google.com/maps/dir/${wp}/${d}`, '_blank');
      showToast('เปิด Google Maps เส้นทาง ✓', 'success');
    },
  };
})();
