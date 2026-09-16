/* bus-views.js — NockERP Bus Route: output views (route-based)
   1) brTimeline(routeId) — ภาพรวมเวลาทั้งเส้น
   2) brTrack(routeId)    — Live Tracking preview (รถวิ่งไล่จุด · simulate ▶)
   3) brSheet(routeId)    — Driver route sheet (เอกสารส่งคนขับ · Print/Download/Share)
   4) brPreview(routeId)  — เปิด Google Maps (external)
   อ่าน data ผ่าน window.BusRoute (expose จาก bus-route.js) */
(function () {

  const BR = () => window.BusRoute;
  const clean = a => String(a || '').replace(/<[^>]+>/g, '');
  const isDrop = r => r.kind === 'dropoff';

  /* ══════════════ 0) ROUTE TIMELINE ══════════════ */
  window.brTimeline = function (routeId) {
    const r = BR().route(routeId); if (!r) return;
    const v = BR().vehicle(r.vehicleId);
    const sched = BR().schedule(r); if (!sched) return showToast('ยังไม่มีนักเรียนในรอบนี้', 'warning');
    const hm = BR().min2hm, drop = isDrop(r);
    const startLabel = drop ? 'ออกจากโรงเรียน (เลิกเรียน)' : 'ออกจากจุดจอด';
    const endLabel   = drop ? 'ส่งคนสุดท้ายถึงบ้าน' : 'ถึงโรงเรียน (เวลาเรียน)';
    const endMin     = drop ? sched.stops[sched.stops.length - 1].arriveMin : sched.schoolMin;

    const leg = (mins, label) => `
      <div style="display:flex;align-items:center;gap:10px;padding:2px 0 2px 12px">
        <div style="width:2px;height:22px;background:var(--md-outline-variant);margin-left:11px"></div>
        <span class="text-muted" style="font-size:11px">${UI.icon('schedule','sm')} ${label || 'เดินทาง'} ${mins} นาที</span>
      </div>`;
    const node = (time, title, sub, kind) => `
      <div style="display:flex;align-items:flex-start;gap:12px">
        <div style="width:24px;height:24px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;
          font-size:11px;background:${kind === 'end' ? 'var(--md-primary,#6366f1)' : kind === 'start' ? '#1a1d23' : 'var(--md-success,#10b981)'};color:#fff">
          ${kind === 'end' ? UI.icon('flag','sm') : kind === 'start' ? UI.icon('home','sm') : UI.icon('check','sm')}</div>
        <div style="flex:1;padding-bottom:2px">
          <div style="display:flex;align-items:baseline;gap:8px">
            <b style="font-size:15px;font-variant-numeric:tabular-nums">${time}</b>
            <span style="font-weight:600;font-size:var(--fs-body-sm)">${title}</span></div>
          ${sub ? `<div class="text-muted" style="font-size:11px">${sub}</div>` : ''}
        </div>
      </div>`;

    const body = `
      <div style="display:flex;gap:16px;margin-bottom:16px">
        <div style="flex:1;background:var(--md-surface-low,#f5f6fa);border-radius:10px;padding:12px 14px">
          <div class="text-muted" style="font-size:10px">${startLabel}</div>
          <div style="font-weight:800;font-size:20px">${hm(sched.depotMin)}</div>
        </div>
        <div style="flex:1;background:var(--md-primary-container);border-radius:10px;padding:12px 14px">
          <div class="text-muted" style="font-size:10px">${endLabel}</div>
          <div style="font-weight:800;font-size:20px;color:var(--md-primary)">${hm(endMin)}</div>
        </div>
        <div style="flex:1;background:var(--md-surface-low,#f5f6fa);border-radius:10px;padding:12px 14px">
          <div class="text-muted" style="font-size:10px">รวมใช้เวลา</div>
          <div style="font-weight:800;font-size:20px">${sched.totalMin} <span style="font-size:12px">นาที</span></div>
        </div>
      </div>
      ${node(hm(sched.depotMin), startLabel, drop ? 'โรงเรียน' : v?.depot, 'start')}
      ${sched.stops.map((s, i) => leg(s.legMin, i === 0 ? (drop ? 'โรงเรียน→คนแรก' : 'จุดจอด→คนแรก (ไกลสุด)') : `จุด ${i}→${i + 1}`)
        + node(hm(s.arriveMin), `${i + 1}. ${s.name}`, `${UI.icon('place','sm')} ${s.addr} · ${s.dist} กม.`, drop && i === sched.stops.length - 1 ? 'end' : 'stop')).join('')}
      ${drop ? '' : leg(sched.schoolLeg, 'คนสุดท้าย→โรงเรียน') + node(hm(sched.schoolMin), endLabel, 'มาทันเวลาเรียน ✓', 'end')}
      <div class="text-muted" style="font-size:10px;margin-top:14px">
        ${UI.icon('info','sm')} เวลาเดินทางเป็นค่าประมาณจากระยะทาง (ยังไม่ต่อ Google Maps แบบ traffic-aware)</div>`;

    Modal.create('modal-br-timeline',
      `${UI.icon('timeline','sm')} ภาพรวมเวลา · ${r.name}`,
      body,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-br-timeline')">Close</button>
       <button class="btn btn-primary" onclick="brSheet('${routeId}')">${UI.icon('description','sm')} ตารางคนขับ</button>`,
      'modal-lg');
  };

  /* ══════════════ 1) LIVE TRACKING ══════════════ */
  let TRK = null;

  window.brTrack = function (routeId) {
    const r = BR().route(routeId); if (!r) return;
    const v = BR().vehicle(r.vehicleId);
    const running = BR().rt(routeId).status === 'running';
    TRK = { routeId, N: (r.stops || []).length, pos: running ? (BR().rt(routeId).pickedN || 0) : 0, arrived: false, playing: false, timer: null };
    Modal.create('modal-brtrack',
      `${UI.icon('my_location','sm')} Live Tracking · ${r.name} · ${v?.plate || ''}`,
      `<div id="brtrk-inner"></div>`,
      `<button class="btn btn-secondary" onclick="brTrackClose()">Close</button>
       <button class="btn btn-secondary" onclick="brPreview('${routeId}')">${UI.icon('map','sm')} เปิด Google Maps</button>
       <button class="btn btn-primary" onclick="brSheet('${routeId}')">${UI.icon('description','sm')} ตารางคนขับ</button>`,
      'modal-lg');
    renderTrack();
  };

  function renderTrack() {
    const el = document.getElementById('brtrk-inner'); if (!el || !TRK) return;
    const { routeId, N, pos, arrived } = TRK;
    const r = BR().route(routeId);
    const v = BR().vehicle(r.vehicleId);
    const sched = BR().schedule(r);
    const hm = BR().min2hm;
    const drop = isDrop(r);
    const cur = pos >= N ? null : r.stops[pos];
    const stTime = i => sched?.stops[i] ? hm(sched.stops[i].arriveMin) : '—';

    const depotNode = railNode({ dot:'done', icon:'home', title:`ออกจาก ${drop ? 'โรงเรียน' : v?.depot || 'จุดจอด'}`, sub: hm(sched.depotMin) });
    const stopNodes = r.stops.map((s, i) => {
      const state = i < pos ? 'done' : (i === pos && !arrived ? 'current' : 'pending');
      return railNode({
        dot:state, bus: state === 'current' && !arrived,
        title:s.name, sub:`${UI.icon('place','sm')} ${s.addr}`,
        right: state === 'done'
          ? `<span class="text-muted" style="font-size:var(--fs-body-sm)">${drop ? 'ส่งแล้ว' : 'รับแล้ว'}</span>`
          : `<b style="font-size:var(--fs-body-sm)">${stTime(i)}</b>`,
        badge: s.withParent ? UI.badge('+ผู้ปกครอง','purple') : '',
      });
    }).join('');
    const endMin = drop ? sched.stops[sched.stops.length - 1].arriveMin : sched.schoolMin;
    const schoolNode = drop ? '' : railNode({ dot: arrived ? 'done' : 'end', bus:arrived, icon:'school', title:'ถึงโรงเรียน', sub:hm(endMin), last:true });

    const pct = Math.round((pos / Math.max(N, 1)) * 100);
    const statusBox = arrived
      ? `<div style="text-align:center;padding:18px 0">
           <div style="font-size:34px">${UI.icon('flag','lg')}</div>
           <div style="font-weight:700;font-size:16px;margin-top:4px">${drop ? 'ส่งครบแล้ว' : 'ถึงโรงเรียนแล้ว'}</div>
           <div class="text-muted" style="font-size:var(--fs-body-sm)">${drop ? 'ส่ง' : 'รับ'}ครบ ${N} คน · จบรอบ</div></div>`
      : cur
        ? `<div style="padding:4px 0 8px">
             <div class="text-muted" style="font-size:var(--fs-body-sm)">${drop ? 'กำลังไปส่ง' : 'กำลังไปรับ'} (จุดที่ ${pos + 1}/${N})</div>
             <div style="font-weight:700;font-size:16px;margin:2px 0">${cur.name}</div>
             <div class="text-muted" style="font-size:var(--fs-body-sm)">${UI.icon('place','sm')} ${cur.addr}</div>
             <div style="margin-top:8px;display:flex;gap:16px">
               <div><div class="text-muted" style="font-size:11px">ETA</div><b>${stTime(pos)}</b></div>
               <div><div class="text-muted" style="font-size:11px">ระยะ</div><b>${cur.dist} กม.</b></div>
             </div></div>`
        : `<div style="text-align:center;padding:18px 0">
             <div style="font-weight:700">มุ่งหน้าโรงเรียน</div>
             <div class="text-muted" style="font-size:var(--fs-body-sm)">${drop ? 'ส่ง' : 'รับ'}ครบทุกคนแล้ว</div></div>`;

    const controls = `
      <div style="display:flex;gap:8px;margin-top:14px">
        <button class="btn ${TRK.playing ? 'btn-secondary' : 'btn-primary'} btn-sm" style="flex:1" onclick="brTrackToggle()">
          ${TRK.playing ? UI.icon('pause','sm') + ' หยุด' : UI.icon('play_arrow','sm') + ' จำลองการวิ่ง'}</button>
        <button class="btn btn-secondary btn-sm" onclick="brTrackStep()" ${arrived ? 'disabled' : ''}>${UI.icon('skip_next','sm')} จุดถัดไป</button>
        <button class="btn btn-secondary btn-sm" onclick="brTrackReset()">${UI.icon('replay','sm')}</button>
      </div>`;

    el.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding-bottom:12px;border-bottom:1px solid var(--md-outline-variant);margin-bottom:14px">
        ${UI.icon('directions_bus','lg')}
        <div style="flex:1">
          <div style="font-weight:700">${v?.driver || '—'} · ${UI.icon('call','sm')} ${v?.phone || '—'}</div>
          <div class="text-muted" style="font-size:var(--fs-body-sm)">${drop ? 'รอบส่ง · กลับบ้าน' : 'รอบรับ · มาโรงเรียน'} · ${r.branch}</div>
        </div>
        ${UI.badge(BR().STATUS[BR().rt(routeId).status][0], BR().STATUS[BR().rt(routeId).status][1])}
      </div>
      <div style="display:grid;grid-template-columns:1fr 300px;gap:20px">
        <div class="brtrk-rail">${depotNode}${stopNodes}${schoolNode}</div>
        <div>
          <div style="background:var(--md-surface-low,#f5f6fa);border-radius:12px;padding:14px">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
              <b style="font-size:var(--fs-body-sm)">ความคืบหน้า</b>
              <span class="text-muted" style="font-size:var(--fs-body-sm)">${pos}/${N} จุด · ${pct}%</span>
            </div>
            <div style="height:8px;background:var(--md-outline-variant);border-radius:99px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:var(--md-primary,#6366f1);border-radius:99px;transition:width .5s"></div>
            </div>
            ${statusBox}
            <div style="display:flex;justify-content:space-between;border-top:1px solid var(--md-outline-variant);padding-top:10px;margin-top:6px;font-size:var(--fs-body-sm)">
              <span class="text-muted">ที่นั่งใช้</span><b>${BR().seatUse(r)}/${v?.cap || '—'}</b>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:var(--fs-body-sm)">
              <span class="text-muted">ค่ารถรอบนี้</span><b>${Utils.currency(BR().feeOf(r))}</b>
            </div>
          </div>
          ${controls}
        </div>
      </div>`;
  }

  function railNode({ dot, bus, icon, title, sub, right, badge, last }) {
    const dotHtml = icon
      ? `<div class="brtrk-dot brtrk-${dot}">${UI.icon(icon,'sm')}</div>`
      : `<div class="brtrk-dot brtrk-${dot}">${dot === 'done' ? '✓' : ''}</div>`;
    return `
      <div class="brtrk-node ${last ? 'brtrk-last' : ''}">
        <div class="brtrk-line-col">${dotHtml}${bus ? `<div class="brtrk-bus">${UI.icon('directions_bus','sm')}</div>` : ''}</div>
        <div class="brtrk-content">
          <div style="display:flex;align-items:center;gap:6px">
            <b style="font-size:var(--fs-body-sm)">${title}</b>${badge || ''}
            <span style="margin-left:auto">${right || ''}</span>
          </div>
          ${sub ? `<div class="text-muted" style="font-size:var(--fs-body-sm)">${sub}</div>` : ''}
        </div>
      </div>`;
  }

  window.brTrackStep = function () {
    if (!TRK) return;
    if (TRK.pos < TRK.N) TRK.pos++;
    else if (!TRK.arrived) TRK.arrived = true;
    else return brTrackStop();
    syncRunning(); renderTrack();
    if (TRK.arrived) brTrackStop();
  };
  window.brTrackToggle = function () {
    if (!TRK) return;
    if (TRK.playing) return brTrackStop();
    if (TRK.arrived) brTrackReset();
    TRK.playing = true; TRK.timer = setInterval(window.brTrackStep, 1300); renderTrack();
  };
  function brTrackStop() { if (!TRK) return; TRK.playing = false; if (TRK.timer) { clearInterval(TRK.timer); TRK.timer = null; } renderTrack(); }
  window.brTrackReset = function () { if (!TRK) return; brTrackStop(); TRK.pos = 0; TRK.arrived = false; syncRunning(); renderTrack(); };
  window.brTrackClose = function () { brTrackStop(); Modal.close('modal-brtrack'); };

  function syncRunning() {
    const rt = BR().rt(TRK.routeId);
    if (rt.status !== 'running') return;
    rt.pickedN = TRK.pos;
    if (TRK.arrived) rt.status = 'completed';
    BR().rerender();
  }

  /* ══════════════ 2) DRIVER ROUTE SHEET ══════════════ */
  window.brSheet = function (routeId) {
    const r = BR().route(routeId); if (!r) return;
    const v = BR().vehicle(r.vehicleId);
    const sched = BR().schedule(r);
    const hm = BR().min2hm, drop = isDrop(r);
    const date = BR().state().date;
    const dLabel = new Date(date + 'T12:00:00').toLocaleDateString('th-TH', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    const depTime = sched ? hm(sched.depotMin) : r.anchor;
    const endTime = sched ? hm(drop ? sched.stops[sched.stops.length - 1].arriveMin : sched.schoolMin) : r.anchor;

    const bd = 'border:1px solid #d1d5db;padding:6px 8px';
    const rows = (r.stops || []).map((s, i) => `
      <tr>
        <td style="${bd};text-align:center;font-weight:700">${i + 1}</td>
        <td style="${bd};font-weight:700">${sched ? hm(sched.stops[i].arriveMin) : '—'}</td>
        <td style="${bd}">${clean(s.name)}${s.withParent ? ' <span style="font-size:10px;color:#8b5cf6">(+ผู้ปกครอง)</span>' : ''}<div style="font-size:11px;color:#6b7280">${s.grade}</div></td>
        <td style="${bd}">${clean(s.addr)}</td>
        <td style="${bd};text-align:center">${drop ? 'ส่ง' : 'รับ'}</td>
        <td style="${bd};text-align:center;color:#9ca3af">☐</td>
      </tr>`).join('');

    const sheet = `
      <div id="brsheet-doc">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1a1d23;padding-bottom:10px;margin-bottom:14px">
          <div>
            <div style="font-size:18px;font-weight:800">ตารางเดินรถรับ-ส่งนักเรียน</div>
            <div style="color:#6b7280;font-size:13px">Liclass · สาขา ${r.branch} · ${r.name}</div>
          </div>
          <div style="text-align:right;font-size:13px">
            <div><b>${drop ? 'รอบส่งกลับบ้าน' : 'รอบรับมาโรงเรียน'}${r.round > 1 ? ' · รอบ ' + r.round : ''}</b></div>
            <div style="color:#6b7280">${dLabel}</div>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;background:#f5f6fa;border-radius:8px;padding:10px 12px;margin-bottom:14px;font-size:13px">
          <div><div style="color:#6b7280;font-size:11px">รถ / ทะเบียน</div><b>${r.vehicleId} · ${v?.plate || '—'}</b></div>
          <div><div style="color:#6b7280;font-size:11px">คนขับ</div><b>${v?.driver || '—'}</b></div>
          <div><div style="color:#6b7280;font-size:11px">โทรฉุกเฉิน</div><b>${v?.phone || '—'}</b></div>
          <div><div style="color:#6b7280;font-size:11px">ที่นั่ง</div><b>${BR().seatUse(r)}/${v?.cap || '—'}</b></div>
        </div>
        <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:8px">
          <span>🏫 ${drop ? 'ออกจากโรงเรียน' : 'ออกจาก ' + (v?.depot || 'จุดจอด')} เวลา <b>${depTime}</b></span>
          <span>${drop ? 'ส่งคนสุดท้าย' : 'ถึงโรงเรียน'} <b>${endTime}</b></span>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead>
            <tr style="background:#eef0f4">
              <th style="border:1px solid #d1d5db;padding:6px;width:36px">ลำดับ</th>
              <th style="border:1px solid #d1d5db;padding:6px;width:56px">เวลา</th>
              <th style="border:1px solid #d1d5db;padding:6px;text-align:left">นักเรียน</th>
              <th style="border:1px solid #d1d5db;padding:6px;text-align:left">ที่อยู่</th>
              <th style="border:1px solid #d1d5db;padding:6px;width:52px">รับ/ส่ง</th>
              <th style="border:1px solid #d1d5db;padding:6px;width:44px">เช็ค</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:14px;padding-top:10px;border-top:1px dashed #d1d5db;font-size:12px;color:#6b7280">
          หมายเหตุ: โทรหาผู้ปกครองหากไม่พบนักเรียนภายใน 3 นาที · ขับขี่ปลอดภัย ให้เด็กคาดเข็มขัดทุกที่นั่ง<br>
          ผู้อนุมัติเส้นทาง: Admin สาขา ${r.branch} · วันที่ ${date}
        </div>
      </div>`;

    Modal.create('modal-brsheet',
      `${UI.icon('description','sm')} ตารางเดินรถ · ${r.name}`,
      sheet,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-brsheet')">Close</button>
       <button class="btn btn-secondary" onclick="brSheetDownload('${routeId}')">${UI.icon('download','sm')} Download</button>
       <button class="btn btn-secondary" onclick="brSheetShare('${routeId}')">${UI.icon('share','sm')} ส่งให้คนขับ</button>
       <button class="btn btn-primary" onclick="brSheetPrint()">${UI.icon('print','sm')} Print</button>`,
      'modal-lg');
  };

  window.brSheetPrint = function () {
    const doc = document.getElementById('brsheet-doc'); if (!doc) return;
    const w = window.open('', '_blank', 'width=820,height=1000');
    if (!w) { brToast('ป๊อปอัปถูกบล็อก — อนุญาต popup เพื่อพิมพ์'); return; }
    w.document.write(`<html><head><title>ตารางเดินรถ</title>
      <style>body{font-family:'Sarabun','Inter',system-ui,sans-serif;padding:28px;color:#1a1d23}</style>
      </head><body>${doc.innerHTML}</body></html>`);
    w.document.close(); w.focus();
    setTimeout(() => { w.print(); }, 350);
  };
  window.brSheetDownload = function (routeId) {
    const r = BR().route(routeId); const v = BR().vehicle(r.vehicleId); const sched = BR().schedule(r); const hm = BR().min2hm;
    const lines = (r.stops || []).map((s, i) => `${i + 1}. ${sched ? hm(sched.stops[i].arriveMin) : '—'}  ${clean(s.name)} (${isDrop(r) ? 'ส่ง' : 'รับ'})${s.withParent ? ' +ผู้ปกครอง' : ''}\n   ${clean(s.addr)}`);
    NockExport.text(`route-${r.id}-${BR().state().date}.txt`,
      `${r.name}\n${r.vehicleId} · ${v?.plate || ''} · คนขับ ${v?.driver || ''} · โทร ${v?.phone || ''}\n\n${lines.join('\n')}\n\nที่นั่ง ${BR().seatUse(r)}/${v?.cap || '—'}`);
  };
  window.brSheetShare = function (routeId) {
    const r = BR().route(routeId); const v = BR().vehicle(r.vehicleId);
    NockExport.copy(`ตารางเดินรถ ${r.name} คนขับ ${v?.driver || ''} วันที่ ${BR().state().date} — คัดลอกลิงก์แล้ว ส่งเข้า LINE คนขับได้เลย`);
    brToast(`ส่งตารางให้ ${v?.driver || 'คนขับ'} แล้ว (mock)`);
  };
  window.brPreview = function (routeId) {
    const r = BR().route(routeId); const v = BR().vehicle(r.vehicleId);
    const addrs = (r.stops || []).map(s => s.addr + (r.branch === 'Sriracha' ? ' ศรีราชา ชลบุรี' : ' กรุงเทพฯ'));
    NockExport.maps(addrs, v ? v.depot : 'โรงเรียน');
  };

})();
