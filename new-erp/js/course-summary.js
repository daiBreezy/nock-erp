/* course-summary.js — Parent-facing Course Summary
   Spec: LOGIC-SPEC-11 (design proposal)
   - ดาว = input ครู (ต่อ skill dimension ต่อวิชา) → ระดับ Developing/Proficient/Strong (output พ่อแม่)
   - AI รวบ session summaries → Overall/To Improve/Strengths → ครู Overwrite/Confirm
   - แสดง "การเติบโต" (เทรนด์ต้น→ปลาย) ไม่ใช่เลขเดี่ยว · Text = ตัวสินค้า
   Self-contained mock (prototype spec) */
(function () {

  /* skill dimensions ต่อวิชา (ตั้งใน Settings ได้จริงในอนาคต) */
  const SUBJECT_SKILLS = {
    'Math':          ['ตรรกะ', 'การคำนวณ', 'การแก้โจทย์'],
    'Science':       ['ความเข้าใจหลักการ', 'การวิเคราะห์', 'การทดลอง'],
    'Eng':           ['การอ่าน', 'ไวยากรณ์', 'การพูด'],
    'Eng (Active)':  ['การฟัง', 'การพูด', 'ความมั่นใจ'],
    'Thai':          ['การอ่าน', 'การเขียน', 'ความเข้าใจ'],
    _default:        ['ความเข้าใจ', 'การนำไปใช้', 'การมีส่วนร่วม'],
  };
  const skillsFor = subj => SUBJECT_SKILLS[subj] || SUBJECT_SKILLS._default;

  /* ระดับจากดาวเฉลี่ย */
  function level(avg) {
    if (avg >= 4)   return { label:'Strong',     color:'green'  };
    if (avg >= 2.8) return { label:'Proficient', color:'blue'   };
    return             { label:'Developing', color:'yellow' };
  }
  function trend(early, recent) {
    const d = recent - early;
    if (d >= 0.4)  return { icon:'trending_up',   color:'var(--md-success,#10b981)', label:'ดีขึ้น' };
    if (d <= -0.4) return { icon:'trending_down', color:'var(--md-error,#ef4444)',   label:'ลดลง'  };
    return             { icon:'trending_flat', color:'var(--md-on-surface-variant,#6b7280)', label:'คงที่' };
  }

  /* ── MOCK: sessions + ดาวต่อ skill (trending up) ──────────── */
  function mockData(student, subject) {
    const skills = skillsFor(subject);
    const dates = ['3 มิ.ย.', '10 มิ.ย.', '17 มิ.ย.', '24 มิ.ย.', '1 ก.ค.', '8 ก.ค.'];
    const notes = [
      'ทบทวนสมการเชิงเส้น — เข้าใจดี',
      'เศษส่วน & อัตราส่วน — พลาดเล็กน้อย แก้เองได้',
      'โจทย์ปัญหา — แปลโจทย์ไทยเป็นสมการได้',
      'ทดสอบย่อย — ทำได้เกินครึ่ง',
      'เรขาคณิตเบื้องต้น — ตั้งใจดี',
      'ทบทวนรวม — พร้อมสอบระดับถัดไป',
    ];
    /* ดาวไต่ขึ้นตามคาบ */
    const sessions = dates.map((d, i) => {
      const base = 2.4 + i * 0.42;   // 2.4 → ~4.5
      const stars = {};
      skills.forEach((sk, k) => stars[sk] = Math.max(1, Math.min(5, Math.round((base + (k - 1) * 0.3) * 2) / 2)));
      return { date: d, note: notes[i], stars, avg: skills.reduce((a, sk) => a + stars[sk], 0) / skills.length };
    });
    return { skills, sessions };
  }

  const S = {};   // open-state

  window.openCourseSummary = function (student, subject) {
    student = student || 'ณัฐกิจ บุญเจริญ (โจ้)';
    subject = subject || 'Math';
    const grade = 'ป.6';
    const d = mockData(student, subject);
    S.compiled = false; S.sent = false; S.student = student; S.subject = subject; S.grade = grade; S.data = d;
    Modal.create('modal-course-summary',
      `${UI.icon('workspace_premium','sm')} Course Summary — ${student}`,
      renderBody(), renderFooter(), 'modal-lg');
  };

  function attendancePct(d) { return Math.round((d.sessions.length / (d.sessions.length + 1)) * 100); }

  function renderBody() {
    const d = S.data;
    const first = d.sessions[0], last = d.sessions[d.sessions.length - 1];

    /* skill growth rows (ต้น→ปลาย) */
    const skillRows = d.skills.map((sk, k) => {
      const early = d.sessions.slice(0, 3).reduce((a, s) => a + s.stars[sk], 0) / 3;
      const recent = d.sessions.slice(-3).reduce((a, s) => a + s.stars[sk], 0) / 3;
      const lv = level(recent), tr = trend(early, recent);
      const pct = Math.round(recent / 5 * 100);
      return `
      <div style="display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--md-outline-variant)">
        <div style="width:130px;font-weight:600;font-size:13px">${sk}</div>
        <div style="flex:1">
          <div class="progress"><div class="progress-fill ${lv.color==='green'?'success':lv.color==='yellow'?'warning':''}" style="width:${pct}%"></div></div>
        </div>
        ${UI.badge(lv.label, lv.color)}
        <span style="display:inline-flex;align-items:center;gap:3px;font-size:12px;color:${tr.color};width:70px">
          ${UI.icon(tr.icon,'sm')} ${tr.label}</span>
      </div>`;
    }).join('');

    /* session evidence */
    const sessRows = d.sessions.map(s => `
      <div style="display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid var(--md-outline-variant)">
        <div><b style="font-size:12px">${s.date}</b> <span class="text-muted" style="font-size:12px">· ${s.note}</span></div>
        <div style="color:var(--md-warning,#f59e0b);font-size:12px;white-space:nowrap">${'★'.repeat(Math.round(s.avg))}${'☆'.repeat(5-Math.round(s.avg))}</div>
      </div>`).join('');

    const textBlock = (label, id, val) => `
      <div style="margin-bottom:12px">
        <div style="font-weight:600;font-size:13px;margin-bottom:4px">${label}</div>
        ${S.compiled && !S.sent
          ? `<textarea class="settings-input" id="${id}" rows="2" style="resize:none">${val}</textarea>`
          : `<div style="font-size:13px;color:var(--md-on-surface-variant);background:var(--md-surface-low);padding:8px 12px;border-radius:8px">${val}</div>`}
      </div>`;

    return `
    <div class="modal-section">
      <div style="display:flex;gap:16px;flex-wrap:wrap;padding:10px 14px;background:var(--md-surface-low);border-radius:10px;margin-bottom:16px">
        <div><div class="text-muted" style="font-size:11px">วิชา</div><div style="font-weight:700">${Utils.subjectLabel(S.subject, S.grade)}</div></div>
        <div><div class="text-muted" style="font-size:11px">ช่วงเรียน</div><div style="font-weight:700">มิ.ย.–ก.ค. 2026 · ${d.sessions.length} คาบ</div></div>
        <div><div class="text-muted" style="font-size:11px">มาเรียน</div><div style="font-weight:700">${attendancePct(d)}%</div></div>
        ${S.sent ? UI.badge('ส่งผู้ปกครองแล้ว','green') : S.compiled ? UI.badge('รอครูยืนยัน','yellow') : ''}
      </div>

      ${!S.compiled ? `
        <div style="text-align:center;padding:28px 16px">
          <div style="margin-bottom:10px">${UI.icon('auto_awesome','xl')}</div>
          <div style="font-weight:600;margin-bottom:4px">ให้ AI รวบ session summaries เป็นภาพรวม</div>
          <div class="text-muted" style="font-size:13px;margin-bottom:16px">AI รวบจากที่ครูเขียนไว้แล้ว · ครูตรวจ/แก้ก่อนส่ง</div>
          <button class="btn btn-primary" onclick="csCompile()">${UI.icon('auto_awesome','sm')} Compile with AI</button>
        </div>
        <div class="section-title" style="margin-top:8px">คาบเรียน (${d.sessions.length})</div>
        ${sessRows}
      ` : `
        <div class="section-title">พัฒนาการทักษะ (ต้น → ปลายคอร์ส)</div>
        ${skillRows}
        <div style="height:16px"></div>
        ${textBlock('ภาพรวมพัฒนาการ', 'cs-overall', 'พัฒนาการดีขึ้นต่อเนื่อง เข้าใจพื้นฐานพีชคณิต 2 บทแรกได้มั่นคง พร้อมสำหรับโจทย์ระดับสอบเข้า')}
        ${textBlock('จุดแข็ง', 'cs-strength', 'คิดเลขในใจเร็ว ทำงานเป็นขั้นตอนเรียบร้อย')}
        ${textBlock('สิ่งที่ควรพัฒนา', 'cs-improve', 'โจทย์ปัญหา — การแปลโจทย์ภาษาไทยเป็นสมการ')}
        ${textBlock('ก้าวต่อไป', 'cs-next', 'แนะนำต่อคอร์สโจทย์ปัญหาเข้มข้น ก่อนสอบเข้า ม.1')}
        <div class="section-title" style="margin-top:8px">หลักฐาน — คาบเรียน (${d.sessions.length})</div>
        ${sessRows}
        <div style="margin-top:14px;padding:10px 14px;background:var(--md-primary-container);border-radius:10px;font-size:12px;color:var(--md-on-primary-container)">
          ${UI.icon('info','sm')} ตัวเลข/กราฟช่วยให้เห็นภาพ · แต่รายละเอียดจากครูคือหัวใจ
        </div>
      `}
    </div>`;
  }

  function renderFooter() {
    if (S.sent) return `<button class="btn btn-secondary" onclick="Modal.close('modal-course-summary')">Close</button>`;
    if (!S.compiled) return `<button class="btn btn-secondary" onclick="Modal.close('modal-course-summary')">Cancel</button>`;
    return `
      <button class="btn btn-secondary" onclick="Modal.close('modal-course-summary')">Save Draft</button>
      <button class="btn btn-primary" onclick="csSend()">${UI.icon('send','sm')} Confirm & Send to Parent</button>`;
  }

  function rerender() {
    const m = document.getElementById('modal-course-summary'); if (!m) return;
    m.querySelector('.modal-body').innerHTML = renderBody();
    m.querySelector('.modal-footer').innerHTML = renderFooter();
  }

  window.csCompile = function () {
    const btn = event?.target?.closest('button');
    if (btn) { btn.disabled = true; btn.innerHTML = `${UI.icon('hourglass_empty','sm')} AI กำลังรวบ…`; }
    setTimeout(() => { S.compiled = true; rerender(); showToast('AI รวบ summary แล้ว · ครูตรวจ/แก้ได้', 'success'); }, 700);
  };
  window.csSend = function () {
    S.sent = true; rerender(); showToast('ส่ง Course Summary ให้ผู้ปกครองแล้ว ✓', 'success');
  };

})();
