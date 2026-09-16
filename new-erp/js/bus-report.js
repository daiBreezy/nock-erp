/* bus-report.js — NockERP Bus Route: Week View + Route Summary Report
   Week View: ภาพรวมทั้งสัปดาห์ (คัน × วัน) · คลิกช่อง → เปิด Daily วันนั้น
   Report   : Route Summary (spec §79) — คัน·วัน·รอบ·คน·ระยะ·เวลา·ค่ารถ + KPI + CSV
   อ่าน data ผ่าน window.BusRoute */
(function () {

  const BR = () => window.BusRoute;
  const DOW = ['จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส', 'อา'];
  const SERVICE = [0, 1, 2, 3, 4]; // จ–ศ (เสาร์-อาทิตย์ หยุด)

  /* Monday ของสัปดาห์ที่มี date */
  function weekDays(date) {
    const d = new Date(date + 'T12:00:00');
    const dow = (d.getDay() + 6) % 7;
    const mon = new Date(d); mon.setDate(d.getDate() - dow);
    return [0, 1, 2, 3, 4, 5, 6].map(i => {
      const x = new Date(mon); x.setDate(mon.getDate() + i);
      return x.toISOString().slice(0, 10);
    });
  }
  /* สถิติ 1 คัน 1 วัน (roster = template · ระยะ/เวลา = mock จากจำนวนจุด) */
  function dayStat(date, vid) {
    const stops = BR().rawStops(vid);
    const pax = stops.length;
    const maxDist = stops.reduce((m, s) => Math.max(m, s.dist || 0), 0);
    const distKm = +((maxDist * 2) || 0).toFixed(1);      // ไป-กลับ depot↔ไกลสุด
    const durMin = pax ? 25 + pax * 6 : 0;                 // base + ต่อจุด
    return { pax, distKm, durMin, fee: BR().feeOf(vid), status: BR().rtForDate(date, vid).status };
  }
  const fmtDur = m => { const h = Math.floor(m / 60), mm = m % 60; return h ? `${h} ชม${mm ? ' ' + mm + ' น' : ''}` : `${m} น`; };

  /* ══════════════ WEEK VIEW ══════════════ */
  window.renderBusWeek = function () {
    const S = BR().state();
    const vs = BR().vehiclesIn(S.branch);
    const days = weekDays(S.date);
    const wkPax = SERVICE.reduce((n, i) => n + vs.reduce((a, v) => a + dayStat(days[i], v.id).pax, 0), 0);

    const head = `<tr>
      <th style="text-align:left;min-width:120px">คัน / วัน</th>
      ${days.map((d, i) => {
        const isSvc = SERVICE.includes(i), sel = d === S.date;
        const dd = new Date(d + 'T12:00:00').getDate();
        return `<th style="text-align:center;${sel ? 'background:var(--md-primary,#6366f1);color:#fff;border-radius:8px 8px 0 0' : isSvc ? '' : 'opacity:.4'}">
          ${DOW[i]}<div style="font-size:11px;font-weight:400">${dd}</div></th>`;
      }).join('')}
    </tr>`;

    const body = vs.map(v => `<tr>
      <td style="font-weight:700">${UI.icon('directions_bus', 'sm')} ${v.id}
        <div class="text-muted" style="font-size:11px;font-weight:400">${v.driver}</div></td>
      ${days.map((d, i) => {
        if (!SERVICE.includes(i)) return `<td style="text-align:center;color:#c4c7cc">หยุด</td>`;
        const st = dayStat(d, v.id);
        const [, sc] = BR().STATUS[st.status];
        return `<td style="text-align:center;cursor:pointer" onclick="BusRoute.goDay('${d}')" title="เปิด Daily ${d}">
          <div style="display:inline-flex;flex-direction:column;align-items:center;gap:3px;padding:6px 4px;border-radius:8px" onmouseover="this.style.background='var(--md-surface-variant,#eef0f4)'" onmouseout="this.style.background=''">
            <b>${st.pax}</b>
            <span style="font-size:10px" class="text-muted">☀ ${st.pax} · 🌙 ${st.pax}</span>
            <span class="badge badge-${sc}" style="font-size:9px;padding:1px 5px">${st.status === 'pending' ? 'รอ' : st.status === 'approved' ? '✓' : st.status === 'running' ? 'วิ่ง' : 'จบ'}</span>
          </div></td>`;
      }).join('')}
    </tr>`).join('');

    document.getElementById('br-body').innerHTML = `
      <div class="filter-bar" style="margin-top:12px">
        <button class="btn btn-secondary btn-sm" onclick="brSetDate(-7)">${UI.icon('chevron_left', 'sm')}</button>
        <div class="tc-select" style="display:inline-flex;align-items:center;gap:6px;padding:0 12px;min-width:220px;justify-content:center">
          ${UI.icon('date_range', 'sm')} <b>${BR().fmtDate(days[0])} – ${BR().fmtDate(days[4])}</b></div>
        <button class="btn btn-secondary btn-sm" onclick="brSetDate(7)">${UI.icon('chevron_right', 'sm')}</button>
        <button class="btn btn-secondary btn-sm" onclick="brToday()">Today</button>
      </div>
      <div class="text-muted" style="font-size:var(--fs-body-sm);margin:12px 0 8px">
        ${UI.icon('info', 'sm')} คลิกช่องวัน → เปิด Daily Operations วันนั้น · ☀ รอบเช้า(รับ) · 🌙 รอบเย็น(ส่ง) · เสาร์-อาทิตย์ หยุด</div>
      <div class="card" style="overflow-x:auto"><table><thead>${head}</thead><tbody>${body}</tbody></table></div>
      <div class="text-muted" style="font-size:var(--fs-body-sm);margin-top:12px">
        รวมเที่ยวรับ-ส่งสัปดาห์นี้ (จ–ศ): <b class="text-primary">${wkPax * 2}</b> คน-เที่ยว · ${vs.length} คัน</div>`;
  };

  /* ══════════════ ROUTE SUMMARY REPORT ══════════════ */
  window.renderBusReport = function () {
    const S = BR().state();
    const vs = BR().vehiclesIn(S.branch);
    const days = weekDays(S.date).filter((_, i) => SERVICE.includes(i));

    /* rows: ต่อคัน ต่อวัน (รวม 2 รอบ) */
    const recs = [];
    days.forEach(d => vs.forEach(v => {
      const st = dayStat(d, v.id);
      if (st.pax) recs.push({ date: d, v, ...st });
    }));

    const trips = recs.length * 2;                            // เช้า+เย็น
    const paxTrips = recs.reduce((n, r) => n + r.pax * 2, 0);
    const totalFee = recs.reduce((n, r) => n + r.fee, 0);
    const totalDur = recs.reduce((n, r) => n + r.durMin * 2, 0);
    const avgPax = trips ? (paxTrips / trips).toFixed(1) : 0;
    const avgDur = trips ? Math.round(totalDur / trips) : 0;

    const kpi = UI.kpiGrid([
      { icon: 'route', label: 'เที่ยววิ่ง (สัปดาห์)', value: trips, sub: `${recs.length} คัน-วัน × 2 รอบ` },
      { icon: 'groups', label: 'คน-เที่ยว', value: paxTrips, sub: `เฉลี่ย ${avgPax}/รอบ` },
      { icon: 'schedule', label: 'เวลาเฉลี่ย/รอบ', value: fmtDur(avgDur), sub: `รวม ${fmtDur(totalDur)}` },
      { icon: 'payments', label: 'ค่ารถรวม', value: Utils.currency(totalFee), sub: 'จ–ศ', color: 'success' },
    ]);

    const cols = [
      { label: 'วันที่' }, { label: 'คัน' }, { label: 'คนขับ' },
      { label: 'รอบ', align: 'center' }, { label: 'เช้า', align: 'center' }, { label: 'เย็น', align: 'center' },
      { label: 'ระยะ/วัน', align: 'right' }, { label: 'เวลา/รอบ', align: 'right' }, { label: 'ค่ารถ/วัน', align: 'right' },
    ];
    const rows = recs.map(r => `<tr onclick="BusRoute.goDay('${r.date}')" style="cursor:pointer">
      <td>${new Date(r.date + 'T12:00:00').toLocaleDateString('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })}</td>
      <td><b>${r.v.id}</b></td><td>${r.v.driver}</td>
      <td style="text-align:center">2</td>
      <td style="text-align:center">${r.pax}</td>
      <td style="text-align:center">${r.pax}</td>
      <td style="text-align:right">${(r.distKm * 2).toFixed(1)} กม.</td>
      <td style="text-align:right">${fmtDur(r.durMin)}</td>
      <td style="text-align:right">${Utils.currency(r.fee)}</td>
    </tr>`).join('');

    /* per-vehicle insight (avg duration) */
    const byV = vs.map(v => {
      const rr = recs.filter(r => r.v.id === v.id);
      const dur = rr.length ? Math.round(rr.reduce((n, r) => n + r.durMin, 0) / rr.length) : 0;
      const pax = rr.length ? (rr.reduce((n, r) => n + r.pax, 0) / rr.length).toFixed(1) : 0;
      return { v, dur, pax, days: rr.length };
    }).sort((a, b) => b.dur - a.dur);
    const slowest = byV[0];

    document.getElementById('br-body').innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin:12px 0">
        <div class="text-muted" style="font-size:var(--fs-body-sm)">
          ${UI.icon('history', 'sm')} Route Summary · ${BR().fmtDate(days[0])} – ${BR().fmtDate(days[days.length - 1])} · เก็บเป็นประวัติเพื่อปรับปรุงการจัดรถ</div>
        <button class="btn btn-secondary btn-sm" onclick="brReportCsv()">${UI.icon('download', 'sm')} Export CSV</button>
      </div>
      ${kpi}
      ${slowest ? `<div style="background:var(--md-surface-low,#f5f6fa);border-radius:10px;padding:12px 14px;margin-top:14px;font-size:var(--fs-body-sm)">
        ${UI.icon('lightbulb', 'sm')} <b>Insight:</b> ${slowest.v.id} (${slowest.v.driver}) ใช้เวลาต่อรอบนานสุด ~${fmtDur(slowest.dur)} · เฉลี่ย ${slowest.pax} คน/รอบ — พิจารณาแบ่งโซน/รอบถ้าคนเยอะขึ้น</div>` : ''}
      <div class="section-title" style="margin-top:20px">รายวัน (คัน × วัน)</div>
      <div style="overflow-x:auto">${UI.table(cols, rows)}</div>`;
  };

  window.brReportCsv = function () {
    const S = BR().state();
    const vs = BR().vehiclesIn(S.branch);
    const days = weekDays(S.date).filter((_, i) => SERVICE.includes(i));
    const rows = [];
    days.forEach(d => vs.forEach(v => {
      const st = dayStat(d, v.id);
      if (st.pax) rows.push({
        date: d, vehicle: v.id, driver: v.driver, rounds: 2,
        pax_morning: st.pax, pax_evening: st.pax,
        distance_km: (st.distKm * 2).toFixed(1), duration_per_round: st.durMin, fee_thb: st.fee,
      });
    }));
    NockExport.csv(`bus-route-summary-${days[0]}.csv`, rows);
  };

})();
