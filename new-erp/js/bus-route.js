/* bus-route.js — NockERP Bus Route Module (Liclass only)
   Spec: LOGIC-SPEC-15-bus-route.md
   Model: DB.busRoutes[] — Route = คัน × รอบ × (รับ/ส่ง) × วัน × stops(ordered)
     kind:'pickup'|'dropoff' · round:N (หลายรอบ/วันได้) · days[] · anchor(เวลาถึง/ออกโรงเรียน)
     stop = { id, studentId, name, grade, addr, dist, withParent }
   Tabs: Daily · Weekly (ตารางเดินรถทั้งสัปดาห์) · Routes (CRUD + drag&drop) · Vehicles
   Scope: Liclass = Sriracha + Thonglor เท่านั้น (Nock academy ยังไม่มีรถ)
   Self-contained mock (prototype) */
(function () {

  /* ── SEED: Vehicles (Liclass) ─────────────────────────────── */
  const VEHICLES = [
    { id:'SR-01', branch:'Sriracha', plate:'756',  driver:'น้าเอื้อง', phone:'081-234-5678', cap:10, depot:'สาขาศรีราชา' },
    { id:'SR-02', branch:'Sriracha', plate:'1719', driver:'น้าเบ้ง',   phone:'082-345-6789', cap:10, depot:'สาขาศรีราชา' },
    { id:'TL-01', branch:'Thonglor', plate:'2210', driver:'น้าสมชาย',  phone:'083-456-7890', cap:10, depot:'สาขาทองหล่อ' },
  ];
  const BRANCHES = ['Sriracha', 'Thonglor'];
  const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const DOW_TH = { Mon:'จ', Tue:'อ', Wed:'พ', Thu:'พฤ', Fri:'ศ', Sat:'ส', Sun:'อา' };
  const FEE_PER_TRIP = 100;
  const TODAY = '2026-06-26';   // ศุกร์

  /* ── SEED: Routes ─────────────────────────────────────────── */
  let _sid = 0;
  const slug = n => String(n).replace(/\s|\(|\)/g, '').slice(0, 12) + (++_sid);
  const stop = (name, grade, addr, dist, withParent) =>
    ({ id: 'bs' + (++_sid), studentId: slug(name), name, grade, addr, dist, withParent: !!withParent });
  const rev = arr => arr.slice().reverse().map(s => ({ ...s, id: 'bs' + (++_sid) }));

  const sr1 = [
    stop('ณัฐกิจ บุญเจริญ (โจ้)', 'ป.3', '71/793 หมู่บ้านสปริง ต.สุรศักดิ์', 14.2),
    stop('เมธาวี ศรีสะอาด (นัท)', 'ป.2', '7/072 ถ.สุขุมวิท ต.บางพระ', 11.5, true),
    stop('สหัสวัส โมลีกุล (บาส)', 'ป.3', '393 ถ.เก้ากิโล ต.หนองขาม', 8.1),
    stop('เกตุทอง มโนแก้ว (จ๊าบ)', 'ป.4', '502 ซ.เทศบาล ต.ศรีราชา', 4.6),
    stop('วาวา ทุติยะ (วาวา)', 'ป.3', '943 ถ.สายเก้า ต.สุรศักดิ์', 2.3),
  ];
  const sr2 = [
    stop('พัสกร กังไพเราะ (เอฟ)', 'ป.3', '150 ต.บึง อ.ศรีราชา', 16.8),
    stop('ณัฏฐกิตติ์ ศรีสำอาง (ออม)', 'ป.2', '88 ต.บ่อวิน อ.ศรีราชา', 12.0),
    stop('เต้ยฬุน นาคยูนกส (เต้ยฬุน)', 'ป.4', '219 ซ.พัฒนา ต.สุรศักดิ์', 6.4),
  ];
  const tl1 = [
    stop('ปุณณภา วงศ์สว่าง (ปุ๊ก)', 'ป.5', '55 ซ.ทองหล่อ 10 แขวงคลองตัน', 9.7),
    stop('กันตพงศ์ ไชยวุฒิ (กัน)', 'ม.1', '129 ซ.สุขุมวิท 49 แขวงคลองตัน', 5.1, true),
  ];
  const wk = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  const DEFAULT_ROUTES = [
    { id:'rt-sr1-am',  name:'สายเหนือ · รับเช้า',       branch:'Sriracha', vehicleId:'SR-01', kind:'pickup',  round:1, days:wk,                     anchor:'08:00', stops:sr1 },
    { id:'rt-sr1-am2', name:'สายเหนือ · รับเช้า รอบ 2', branch:'Sriracha', vehicleId:'SR-01', kind:'pickup',  round:2, days:['Mon','Wed','Fri'],     anchor:'09:00', stops:[
        stop('ธนกร แซ่ลี้ (กร)', 'ป.4', '210 ต.สุรศักดิ์ อ.ศรีราชา', 10.4),
        stop('อริสา ดีมาก (มีมี่)', 'ป.2', '77 ถ.เก้ากิโล ต.หนองขาม', 5.5),
      ] },
    { id:'rt-sr1-pm',  name:'สายเหนือ · ส่งเย็น',       branch:'Sriracha', vehicleId:'SR-01', kind:'dropoff', round:1, days:wk,                     anchor:'15:30', stops:rev(sr1) },
    { id:'rt-sr2-am',  name:'สายใต้ · รับเช้า',         branch:'Sriracha', vehicleId:'SR-02', kind:'pickup',  round:1, days:wk,                     anchor:'08:00', stops:sr2 },
    { id:'rt-sr2-pm',  name:'สายใต้ · ส่งเย็น',         branch:'Sriracha', vehicleId:'SR-02', kind:'dropoff', round:1, days:wk,                     anchor:'15:30', stops:rev(sr2) },
    { id:'rt-tl1-am',  name:'ทองหล่อ · รับเช้า',        branch:'Thonglor', vehicleId:'TL-01', kind:'pickup',  round:1, days:['Tue','Thu','Sat'],     anchor:'08:00', stops:tl1 },
    { id:'rt-tl1-pm',  name:'ทองหล่อ · ส่งเย็น',        branch:'Thonglor', vehicleId:'TL-01', kind:'dropoff', round:1, days:['Tue','Thu','Sat'],     anchor:'15:30', stops:rev(tl1) },
  ];
  window.DB && (DB.busRoutes = DB.busRoutes || DEFAULT_ROUTES);
  window.DB && (DB.busRoster = DB.busRoster || []);
  const ROUTES = () => (window.DB?.busRoutes) || DEFAULT_ROUTES;

  /* runtime per-DAY per-ROUTE: RT[date][routeId] = {status,pickedN,sub} */
  const RT = {};
  function rtOf(routeId) {
    (RT[S.date] = RT[S.date] || {});
    return (RT[S.date][routeId] = RT[S.date][routeId] || { status:'pending', pickedN:0, sub:null });
  }

  let S = { date:TODAY, branch:'Sriracha', tab:'daily', weekMon:mondayOf(TODAY) };

  /* ── TIME/DATE HELPERS ────────────────────────────────────── */
  const hm2min = t => { const [h, m] = String(t || '08:00').split(':').map(Number); return h * 60 + (m || 0); };
  const min2hm = m => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, '0')}:${String(((m % 60) + 60) % 60).padStart(2, '0')}`;
  const dowOf = d => DOW[new Date(d + 'T12:00:00').getDay()];
  const fmtDate = d => new Date(d + 'T12:00:00').toLocaleDateString('th-TH', { weekday:'short', day:'numeric', month:'short', year:'numeric' });
  const fmtShort = d => new Date(d + 'T12:00:00').toLocaleDateString('th-TH', { day:'numeric', month:'short' });
  function mondayOf(d) { const dt = new Date(d + 'T12:00:00'); const g = (dt.getDay() + 6) % 7; dt.setDate(dt.getDate() - g); return dt.toISOString().slice(0, 10); }
  function addDays(d, n) { const dt = new Date(d + 'T12:00:00'); dt.setDate(dt.getDate() + n); return dt.toISOString().slice(0, 10); }
  const gv = id => (document.getElementById(id)?.value || '').trim();

  /* ── SCHEDULE ENGINE ──────────────────────────────────────── */
  const legMinutes = (a, b) => Math.max(3, Math.round(Math.abs((a || 0) - (b || 0)) * 2.5 + 3));
  function computeSchedule(route) {
    const list = route?.stops || []; if (!list.length) return null;
    const dwell = 3;
    const depotLeg  = Math.round((list[0].dist || 6) * 2.2 + 4);
    const schoolLeg = Math.round((list[list.length - 1].dist || 3) * 2.2 + 4);
    const legs = [depotLeg];
    for (let i = 1; i < list.length; i++) legs.push(legMinutes(list[i - 1].dist, list[i].dist));
    if (route.kind === 'dropoff') {
      const start = hm2min(route.anchor || '15:30');
      let t = start + schoolLeg;
      const stops = list.map((s, i) => { if (i > 0) t += legs[i] + dwell; return { ...s, arriveMin:t, legMin: i === 0 ? schoolLeg : legs[i] }; });
      return { depotMin:start, schoolMin:start, totalMin:t - start, schoolLeg, legs, stops, evening:true };
    }
    const schoolMin = hm2min(route.anchor || '08:00');
    const arr = new Array(list.length);
    arr[list.length - 1] = schoolMin - schoolLeg;
    for (let i = list.length - 2; i >= 0; i--) arr[i] = arr[i + 1] - legs[i + 1] - dwell;
    const stops = list.map((s, i) => ({ ...s, arriveMin:arr[i], legMin:legs[i] }));
    const depotMin = stops[0].arriveMin - depotLeg;
    return { depotMin, schoolMin, totalMin: schoolMin - depotMin, schoolLeg, legs, stops };
  }

  /* ── SELECTORS ────────────────────────────────────────────── */
  const routeById = id => ROUTES().find(r => r.id === id);
  const vehicle = id => VEHICLES.find(v => v.id === id);
  const vehiclesIn = b => VEHICLES.filter(v => v.branch === b);
  const routesFor = b => ROUTES().filter(r => r.branch === b)
    .sort((a, b2) => a.vehicleId.localeCompare(b2.vehicleId) || a.kind.localeCompare(b2.kind) || a.round - b2.round);
  const routesForDay = (date, b) => routesFor(b).filter(r => (r.days || []).includes(dowOf(date)));
  const seatUse = route => (route?.stops || []).reduce((n, s) => n + 1 + (s.withParent ? 1 : 0), 0);
  const feeOf = route => (route?.stops || []).reduce((n, s) => n + FEE_PER_TRIP + (s.withParent ? FEE_PER_TRIP : 0), 0);

  const STATUS = { pending:['Pending','yellow'], approved:['Approved','green'], running:['กำลังวิ่ง','blue'], completed:['เสร็จแล้ว','gray'] };
  const kindBadge = k => k === 'pickup' ? UI.badge('รับ', 'blue') : UI.badge('ส่ง', 'orange');
  const kindIcon = k => k === 'pickup' ? 'login' : 'logout';
  const daysChips = days => DOW.slice(1).concat('Sun').filter(d => (days || []).includes(d))
    .map(d => `<span class="br-day">${DOW_TH[d]}</span>`).join('');

  /* ── SHELL ────────────────────────────────────────────────── */
  document.getElementById('view-bus-route').innerHTML = `
  ${UI.pageHeader('Bus Route',
    '<span>Liclass · จัดสายรถ · ตารางเดินรถรับ-ส่ง · Approve รายวัน → ส่งคนขับ</span>',
    `<button class="btn btn-primary btn-sm" onclick="brEditRoute()">${UI.icon('add','sm')} สร้าง Route</button>`
  )}
  <div class="filter-bar">
    <div class="filter-chip active" id="brtab-daily"  onclick="brTab('daily')">${UI.icon('today','sm')} Daily</div>
    <div class="filter-chip"        id="brtab-week"   onclick="brTab('week')">${UI.icon('date_range','sm')} Weekly</div>
    <div class="filter-chip"        id="brtab-routes" onclick="brTab('routes')">${UI.icon('route','sm')} Routes</div>
    <div class="filter-chip"        id="brtab-vehicles" onclick="brTab('vehicles')">${UI.icon('directions_bus','sm')} Vehicles</div>
    <div style="width:1px;background:var(--md-outline-variant);height:20px;margin:0 6px"></div>
    <select class="tc-select" id="br-branch-sel" onchange="brSetBranch(this.value)">
      ${BRANCHES.map(b => `<option value="${b}">${b} (${vehiclesIn(b).length} คัน)</option>`).join('')}
    </select>
  </div>
  <div id="br-body"></div>`;

  /* ══════════════ TAB: DAILY ══════════════ */
  /* คิวเดินรถ — เรียงตามเวลาออกเดินทางเร็วสุดก่อน (ข้ามคัน)
     pickup = ออกจากจุดจอด · dropoff = ออกจากโรงเรียน (ทั้งคู่ = sched.depotMin) */
  function dailyQueue() {
    return routesForDay(S.date, S.branch)
      .map(r => { const sched = computeSchedule(r); return { r, sched, dep: sched ? sched.depotMin : 9999 }; })
      .sort((a, b) => a.dep - b.dep);
  }
  function renderDaily() {
    const queue = dailyQueue();
    const routes = queue.map(q => q.r);
    const pax = routes.reduce((n, r) => n + seatUse(r), 0);
    const appr = routes.filter(r => ['approved','running','completed'].includes(rtOf(r.id).status)).length;

    const kpi = UI.kpiGrid([
      { icon:'route',    label:'รอบวันนี้',      value:routes.length, sub:`${S.branch} · ${DOW_TH[dowOf(S.date)]}` },
      { icon:'groups',   label:'ที่นั่งใช้',      value:pax,           sub:'รวมผู้ปกครองที่พ่วง' },
      { icon:'directions_bus', label:'รถวิ่ง',   value:new Set(routes.map(r => r.vehicleId)).size, sub:`มี ${vehiclesIn(S.branch).length} คัน` },
      { icon:'task_alt', label:'Approved',       value:`${appr}/${routes.length}`, sub: appr === routes.length && routes.length ? 'ครบแล้ว' : 'รอ approve', color: appr === routes.length && routes.length ? 'success' : 'warning' },
    ]);

    const controls = `
    <div class="filter-bar" style="margin-top:12px">
      <button class="btn btn-secondary btn-sm" onclick="brSetDate(-1)">${UI.icon('chevron_left','sm')}</button>
      <div class="tc-select" style="display:inline-flex;align-items:center;gap:6px;padding:0 12px;min-width:190px;justify-content:center">
        ${UI.icon('calendar_month','sm')} <b>${fmtDate(S.date)}</b></div>
      <button class="btn btn-secondary btn-sm" onclick="brSetDate(1)">${UI.icon('chevron_right','sm')}</button>
      ${S.date !== TODAY ? `<button class="btn btn-secondary btn-sm" onclick="brToday()">Today</button>` : ''}
      <div style="flex:1"></div>
      ${routes.length ? `<button class="btn btn-primary btn-sm" onclick="brApproveAll()">${UI.icon('send','sm')} Approve &amp; Send (ทั้งวัน)</button>` : ''}
    </div>`;

    const body = routes.length
      ? renderQueue(queue) + `<div style="display:grid;gap:16px;margin-top:16px">${routes.map(r => `<div id="br-card-${r.id}">${renderRouteOpsCard(r)}</div>`).join('')}</div>`
      : UI.emptyState('event_busy', 'ไม่มีรอบรถวันนี้', `วัน${DOW_TH[dowOf(S.date)]}ไม่มี Route ที่ตั้งไว้ในสาขา ${S.branch}`);

    document.getElementById('br-body').innerHTML = kpi + controls + body;
  }

  /* คิวเดินรถวันนี้ — เวลาออก | สาย/โซน | คัน | รับ/ส่ง (เรียงเร็วสุดก่อน) */
  function renderQueue(queue) {
    const rows = queue.map((q, i) => {
      const { r, sched, dep } = q;
      const v = vehicle(r.vehicleId);
      const st = rtOf(r.id);
      const [slabel, scolor] = STATUS[st.status];
      const next = queue.slice(0, i).every(x => ['completed'].includes(rtOf(x.r.id).status)) && st.status !== 'completed';
      return `<tr class="br-q-row ${st.status === 'completed' ? 'br-q-done' : ''}" onclick="brJumpCard('${r.id}')" title="ไปที่การ์ด ${r.name}">
        <td class="br-q-time"><b>${sched ? min2hm(dep) : '—'}</b>${next ? `<span class="br-q-next">ถัดไป</span>` : ''}</td>
        <td>${r.name}${r.round > 1 ? ' ' + UI.badge('รอบ ' + r.round, 'purple') : ''}</td>
        <td>${UI.icon('directions_bus','sm')} <b>${r.vehicleId}</b> · ${v?.driver || '—'}</td>
        <td style="text-align:center">${UI.icon(kindIcon(r.kind),'sm')} ${kindBadge(r.kind)}</td>
        <td style="text-align:center">${seatUse(r)} ที่</td>
        <td style="text-align:center">${UI.badge(slabel, scolor)}</td>
      </tr>`;
    }).join('');
    return `<div class="section-title" style="margin-top:18px">${UI.icon('list_alt','sm')} คิวเดินรถวันนี้ <span class="text-muted" style="font-weight:400;font-size:var(--fs-body-sm)">· เรียงตามเวลาออกเดินทางเร็วสุดก่อน</span></div>
      <div style="overflow-x:auto"><table class="br-queue-table">
        <thead><tr><th>ออกเดินทาง</th><th style="text-align:left">สาย / โซน</th><th style="text-align:left">คัน</th><th style="text-align:center">รับ/ส่ง</th><th style="text-align:center">ที่นั่ง</th><th style="text-align:center">สถานะ</th></tr></thead>
        <tbody>${rows}</tbody>
      </table></div>`;
  }

  /* การ์ดปฏิบัติการรายรอบ (Daily) — schedule + stops + approve/track */
  function renderRouteOpsCard(route) {
    const v = vehicle(route.vehicleId);
    const rt = rtOf(route.id);
    const used = seatUse(route);
    const [slabel, scolor] = STATUS[rt.status];
    const editable = rt.status === 'pending' || rt.status === 'approved';
    const sched = computeSchedule(route);
    const over = v && used > v.cap;

    const rows = (route.stops || []).map((s, i) => stopRowOps(route, s, i, sched, editable)).join('') ||
      `<tr><td colspan="5" class="text-muted" style="padding:12px;text-align:center">ยังไม่มีนักเรียนในรอบนี้</td></tr>`;

    /* เพิ่มนักเรียน = ปุ่มซ้ายในแถวเดียวกับ footer (แก้ได้ตอน pending/approved) */
    const addBtn = editable ? `<button class="btn btn-secondary btn-sm" onclick="brAddStop('${route.id}')">${UI.icon('person_add','sm')} เพิ่มนักเรียน</button>` : '';
    let footer = '';
    if (rt.status === 'pending') {
      footer = `${addBtn}
        <button class="btn btn-secondary btn-sm" onclick="brTrack('${route.id}')">${UI.icon('near_me','sm')} Preview</button>
        <button class="btn btn-secondary btn-sm" onclick="brTimeline('${route.id}')">${UI.icon('timeline','sm')} เวลา</button>
        <div style="flex:1"></div>
        <button class="btn btn-primary btn-sm" onclick="brApprove('${route.id}')">${UI.icon('task_alt','sm')} Approve รอบนี้</button>`;
    } else if (rt.status === 'approved') {
      footer = `${addBtn}
        <button class="btn btn-secondary btn-sm" onclick="brSheet('${route.id}')">${UI.icon('description','sm')} ตารางคนขับ</button>
        <button class="btn btn-secondary btn-sm" onclick="brTrack('${route.id}')">${UI.icon('near_me','sm')} Preview</button>
        <div style="flex:1"></div>
        <button class="btn btn-primary btn-sm" onclick="brStart('${route.id}')">${UI.icon('play_arrow','sm')} เริ่มวิ่ง</button>`;
    } else if (rt.status === 'running') {
      footer = `<button class="btn btn-secondary btn-sm" onclick="brTrack('${route.id}')">${UI.icon('my_location','sm')} Live Tracking</button>
        <button class="btn btn-secondary btn-sm" onclick="brSheet('${route.id}')">${UI.icon('description','sm')} ตารางคนขับ</button>
        <div style="flex:1"></div>
        ${rt.pickedN < used
          ? `<button class="btn btn-primary btn-sm" onclick="brPickNext('${route.id}')">${UI.icon('check','sm')} ${route.kind === 'dropoff' ? 'ส่ง' : 'รับ'}คนถัดไป (${rt.pickedN + 1}/${used})</button>`
          : `<button class="btn btn-primary btn-sm" onclick="brComplete('${route.id}')">${UI.icon('flag','sm')} จบรอบ</button>`}`;
    } else {
      footer = `<div class="text-muted" style="font-size:var(--fs-body-sm)">${UI.icon('check_circle','sm')} รอบนี้เสร็จแล้ว · ครบ ${used} ที่นั่ง</div>`;
    }

    return UI.card(`<div class="br-card-pad">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px">
          ${UI.icon('directions_bus','lg')}
          <div>
            <div style="font-weight:700">${route.name} ${kindBadge(route.kind)} ${route.round > 1 ? UI.badge('รอบ ' + route.round, 'purple') : ''} ${UI.badge(slabel, scolor)}</div>
            <div class="text-muted" style="font-size:var(--fs-body-sm)">
              ${route.vehicleId} · ทะเบียน ${v?.plate || '—'} · ${UI.icon('person','sm')} ${v?.driver || '—'} · ${UI.icon('call','sm')} ${v?.phone || '—'}</div>
          </div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700${over ? ';color:var(--md-error)' : ''}">${used}/${v?.cap || '—'} ที่นั่ง</div>
          <div class="text-muted" style="font-size:var(--fs-body-sm)">${over ? 'เกินความจุ!' : 'ว่าง ' + ((v?.cap || 0) - used)}</div>
        </div>
      </div>
      ${sched ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--md-surface-low,#f5f6fa);border-radius:8px;padding:8px 12px;margin-bottom:8px;font-size:var(--fs-body-sm)">
        <span>${UI.icon(route.kind === 'dropoff' ? 'school' : 'home','sm')} <b>${route.kind === 'dropoff' ? 'ออกจากโรงเรียน' : 'ออกจากจุดจอด'} ${min2hm(sched.depotMin)}</b>
          <span class="text-muted"> · ${route.kind === 'dropoff' ? 'ส่งคนสุดท้าย' : 'ถึงโรงเรียน'} ${min2hm(route.kind === 'dropoff' ? sched.stops[sched.stops.length - 1].arriveMin : sched.schoolMin)}</span></span>
        <button class="btn btn-secondary btn-sm" onclick="brTimeline('${route.id}')">${UI.icon('timeline','sm')} ภาพรวมเวลา</button>
      </div>` : ''}
      <table class="br-stop-table"><tbody>${rows}</tbody></table>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px">${footer}</div>
    </div>`);
  }

  function stopRowOps(route, s, i, sched, editable) {
    const rt = rtOf(route.id);
    const picked = i < rt.pickedN;
    const cs = sched?.stops[i];
    const dragAttrs = editable ? `draggable="true" ondragstart="brDragStart(event,'${route.id}',${i})" ondragover="brDragOver(event)" ondrop="brDrop(event,'${route.id}',${i})" ondragend="brDragEnd(event)"` : '';
    return `
    <tr class="br-stop-row" data-idx="${i}" ${dragAttrs} style="${picked ? 'opacity:.5;' : ''}${editable ? 'cursor:grab;' : ''}">
      <td class="br-lead">${editable ? `<span class="br-grip" title="ลากเพื่อสลับลำดับ">${UI.icon('drag_indicator','sm')}</span>` : ''}<span class="br-seq" style="${picked ? 'background:var(--md-success,#10b981)' : ''}">${picked ? '✓' : (i + 1)}</span></td>
      <td>
        <div style="font-weight:600">${s.name}
          ${s.withParent ? `<span class="badge badge-purple" style="font-size:9px;margin-left:4px" title="พ่วงผู้ปกครอง (+1 ที่นั่ง)">${UI.icon('escalator_warning','sm')} +ผู้ปกครอง</span>` : ''}
          ${s.fromInvoice ? `<span class="badge badge-green" style="font-size:9px;margin-left:4px">${UI.icon('receipt_long','sm')} จากบิล</span>` : ''}</div>
        <div class="text-muted" style="font-size:var(--fs-body-sm)">${UI.icon('place','sm')} ${s.addr}</div>
      </td>
      <td style="width:56px">${UI.badge(s.grade, 'gray')}</td>
      <td style="width:74px;white-space:nowrap">${cs ? `<b>${min2hm(cs.arriveMin)}</b>` : '—'}<div class="text-muted" style="font-size:10px">${cs ? cs.legMin + ' น' : ''}</div></td>
      <td style="width:36px;text-align:right">${editable ? `<span class="br-ord br-del" title="เอาออก" onclick="brRemoveStop('${route.id}',${i})">${UI.icon('close','sm')}</span>` : ''}</td>
    </tr>`;
  }

  /* ══════════════ TAB: WEEKLY (ตารางเดินรถทั้งสัปดาห์) ══════════════ */
  function renderWeek() {
    const routes = routesFor(S.branch);
    const days = Array.from({ length: 7 }, (_, i) => addDays(S.weekMon, i));

    const controls = `
    <div class="filter-bar" style="margin-top:12px">
      <button class="btn btn-secondary btn-sm" onclick="brSetWeek(-1)">${UI.icon('chevron_left','sm')}</button>
      <div class="tc-select" style="display:inline-flex;align-items:center;gap:6px;padding:0 12px;min-width:210px;justify-content:center">
        ${UI.icon('date_range','sm')} <b>${fmtShort(days[0])} – ${fmtShort(days[6])}</b></div>
      <button class="btn btn-secondary btn-sm" onclick="brSetWeek(1)">${UI.icon('chevron_right','sm')}</button>
      <button class="btn btn-secondary btn-sm" onclick="brThisWeek()">สัปดาห์นี้</button>
    </div>
    <div class="text-muted" style="font-size:11px;margin:8px 0 0">
      ${UI.icon('info','sm')} คลิกช่องเพื่อเปิดรอบนั้นในวันนั้น (Daily) · ${kindBadge('pickup')} รับ · ${kindBadge('dropoff')} ส่ง</div>`;

    if (!routes.length) {
      document.getElementById('br-body').innerHTML = controls + UI.emptyState('route', 'ยังไม่มี Route', `สาขา ${S.branch} ยังไม่มีสายรถ — กด "สร้าง Route"`);
      return;
    }

    const head = `<tr>
      <th style="text-align:left;min-width:200px">Route</th>
      ${days.map((d, i) => `<th style="text-align:center;${d === S.date ? 'background:var(--md-primary-container)' : ''}">
        <div>${DOW_TH[DOW.slice(1).concat('Sun')[i]]}</div>
        <div class="text-muted" style="font-weight:400;font-size:10px">${fmtShort(d)}</div></th>`).join('')}
    </tr>`;

    const rows = routes.map(r => {
      const v = vehicle(r.vehicleId);
      const sched = computeSchedule(r);
      const t = sched ? min2hm(sched.depotMin) : '—';
      const cells = days.map(d => {
        if (!(r.days || []).includes(dowOf(d))) return `<td class="br-wk-empty"></td>`;
        const st = (RT[d] && RT[d][r.id]) || { status:'pending' };
        const [, sc] = STATUS[st.status];
        return `<td class="br-wk-cell br-wk-${r.kind}" onclick="BusRoute.goDay('${d}')" title="${r.name} · ${fmtDate(d)}">
          <div class="br-wk-time">${t}</div>
          <div class="br-wk-count">${seatUse(r)} ที่</div>
          <span class="br-wk-dot br-dot-${sc}"></span>
        </td>`;
      }).join('');
      return `<tr>
        <td style="text-align:left">
          <div style="font-weight:600">${r.name} ${kindBadge(r.kind)}${r.round > 1 ? ' ' + UI.badge('รอบ ' + r.round, 'purple') : ''}</div>
          <div class="text-muted" style="font-size:11px">${r.vehicleId} · ${v?.driver || '—'} · ⚓ ${r.anchor}</div>
        </td>${cells}</tr>`;
    }).join('');

    document.getElementById('br-body').innerHTML = controls +
      `<div style="overflow-x:auto;margin-top:16px"><table class="br-week-table">${head}${rows}</table></div>`;
  }

  /* ══════════════ TAB: ROUTES (CRUD + drag&drop) ══════════════ */
  function renderRoutes() {
    const routes = routesFor(S.branch);
    const header = UI.sectionTitle(`Routes · ${S.branch}`,
      `<button class="btn btn-primary btn-sm" onclick="brEditRoute()">${UI.icon('add','sm')} สร้าง Route</button>`);
    if (!routes.length) {
      document.getElementById('br-body').innerHTML = header + UI.emptyState('route', 'ยังไม่มี Route', 'สร้างสายรถแรกของสาขานี้');
      return;
    }
    const cards = routes.map(renderRouteEditCard).join('');
    document.getElementById('br-body').innerHTML = header +
      `<div class="text-muted" style="font-size:var(--fs-body-sm);margin-bottom:12px">${UI.icon('info','sm')} ลากแถว (${UI.icon('drag_indicator','sm')}) เพื่อจัดลำดับจุดรับ-ส่ง · ลำดับนี้คือลำดับที่รถวิ่งจริง</div>` +
      `<div style="display:grid;gap:16px">${cards}</div>`;
  }

  function renderRouteEditCard(route) {
    const v = vehicle(route.vehicleId);
    const used = seatUse(route);
    const over = v && used > v.cap;
    const rows = (route.stops || []).map((s, i) => `
      <tr class="br-stop-row" data-idx="${i}" draggable="true"
          ondragstart="brDragStart(event,'${route.id}',${i})" ondragover="brDragOver(event)"
          ondrop="brDrop(event,'${route.id}',${i})" ondragend="brDragEnd(event)" style="cursor:grab">
        <td class="br-lead"><span class="br-grip">${UI.icon('drag_indicator','sm')}</span><span class="br-seq">${i + 1}</span></td>
        <td><div style="font-weight:600">${s.name}
            ${s.withParent ? `<span class="badge badge-purple" style="font-size:9px;margin-left:4px">${UI.icon('escalator_warning','sm')} +ผู้ปกครอง</span>` : ''}</div>
          <div class="text-muted" style="font-size:var(--fs-body-sm)">${UI.icon('place','sm')} ${s.addr} · ${s.dist} กม.</div></td>
        <td style="width:56px">${UI.badge(s.grade, 'gray')}</td>
        <td style="width:96px;text-align:right">
          <span class="br-ord" title="${s.withParent ? 'เอาผู้ปกครองออก' : 'พ่วงผู้ปกครอง'}" onclick="brToggleParent('${route.id}',${i})">${UI.icon(s.withParent ? 'person_remove' : 'escalator_warning','sm')}</span>
          <span class="br-ord br-del" title="เอาออก" onclick="brRemoveStop('${route.id}',${i})">${UI.icon('close','sm')}</span>
        </td>
      </tr>`).join('') || `<tr><td colspan="4" class="text-muted" style="padding:12px;text-align:center">ยังไม่มีนักเรียน — กด "เพิ่มนักเรียน"</td></tr>`;

    return UI.card(`<div class="br-card-pad">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px">
        <div>
          <div style="font-weight:700;font-size:15px">${route.name} ${kindBadge(route.kind)} ${route.round > 1 ? UI.badge('รอบ ' + route.round, 'purple') : ''}</div>
          <div class="text-muted" style="font-size:var(--fs-body-sm);margin-top:2px">
            ${UI.icon('directions_bus','sm')} ${route.vehicleId} · ${v?.driver || '—'} · ${UI.icon('schedule','sm')} ${route.kind === 'dropoff' ? 'ออกโรงเรียน' : 'ถึงโรงเรียน'} ${route.anchor}</div>
          <div style="margin-top:6px;display:flex;align-items:center;gap:4px">${daysChips(route.days) || '<span class="text-muted" style="font-size:11px">ยังไม่เลือกวัน</span>'}</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:700${over ? ';color:var(--md-error)' : ''}">${used}/${v?.cap || '—'} ที่นั่ง</div>
          <div style="margin-top:6px;display:flex;gap:6px;justify-content:flex-end">
            <button class="btn btn-secondary btn-sm" onclick="brEditRoute('${route.id}')">${UI.icon('edit','sm')}</button>
            <button class="btn btn-secondary btn-sm" onclick="brDeleteRoute('${route.id}')">${UI.icon('delete','sm')}</button>
          </div>
        </div>
      </div>
      <table class="br-stop-table"><tbody>${rows}</tbody></table>
      <button class="btn btn-secondary btn-sm" style="margin-top:10px" onclick="brAddStop('${route.id}')">${UI.icon('person_add','sm')} เพิ่มนักเรียน</button>
    </div>`);
  }

  /* ══════════════ TAB: VEHICLES ══════════════ */
  function renderVehicles() {
    const cols = [
      { label:'รหัส' }, { label:'ทะเบียน' }, { label:'สาขา' }, { label:'คนขับ' },
      { label:'เบอร์โทร' }, { label:'ที่นั่ง', align:'center' }, { label:'จุดจอด' }, { label:'', align:'right' },
    ];
    const rows = VEHICLES.map(v => `<tr>
      <td><b>${v.id}</b></td><td>${v.plate}</td><td>${UI.badge(v.branch,'blue')}</td>
      <td>${v.driver}</td><td>${UI.icon('call','sm')} ${v.phone}</td>
      <td style="text-align:center">${v.cap}+1</td><td>${v.depot}</td>
      <td style="text-align:right"><button class="btn btn-secondary btn-sm" onclick="brEditVehicle('${v.id}')">${UI.icon('edit','sm')}</button></td>
    </tr>`).join('');
    document.getElementById('br-body').innerHTML = `
      ${UI.sectionTitle('รถทั้งหมด (Liclass)', `<button class="btn btn-primary btn-sm" onclick="brEditVehicle()">${UI.icon('add','sm')} เพิ่มรถ</button>`)}
      ${UI.table(cols, rows)}
      <div class="text-muted" style="font-size:var(--fs-body-sm);margin-top:12px">
        ${UI.icon('info','sm')} ความจุมาตรฐาน 10 นักเรียน + คนขับ = 11 ที่ · คนขับเป็น vendor (หัก WHT ค่าเช่ารถ)</div>`;
  }

  /* ── ROUTER ───────────────────────────────────────────────── */
  function renderBody() {
    if (S.tab === 'daily') renderDaily();
    else if (S.tab === 'week') renderWeek();
    else if (S.tab === 'routes') renderRoutes();
    else renderVehicles();
  }

  /* ── NAV ACTIONS ──────────────────────────────────────────── */
  window.brTab = function (t) {
    S.tab = t;
    ['daily','week','routes','vehicles'].forEach(x => document.getElementById('brtab-' + x)?.classList.toggle('active', x === t));
    renderBody();
  };
  window.brSetBranch = function (b) { S.branch = b; renderBody(); };
  window.brSetDate = function (delta) { S.date = addDays(S.date, delta); renderBody(); };
  window.brToday = function () { S.date = TODAY; renderBody(); };
  window.brSetWeek = function (delta) { S.weekMon = addDays(S.weekMon, delta * 7); renderBody(); };
  window.brThisWeek = function () { S.weekMon = mondayOf(TODAY); renderBody(); };
  window.brJumpCard = function (routeId) {
    const el = document.getElementById('br-card-' + routeId); if (!el) return;
    el.scrollIntoView({ behavior:'smooth', block:'center' });
    el.classList.add('br-card-flash');
    setTimeout(() => el.classList.remove('br-card-flash'), 1200);
  };

  /* ── DRAG & DROP (reorder stops) ──────────────────────────── */
  let DRAG = null;   // { routeId, from }
  window.brDragStart = function (e, routeId, i) {
    DRAG = { routeId, from:i };
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', String(i)); } catch (_) {}
    e.currentTarget.classList.add('br-dragging');
  };
  window.brDragOver = function (e) {
    e.preventDefault(); e.dataTransfer.dropEffect = 'move';
    const row = e.currentTarget;
    document.querySelectorAll('.br-drop-over').forEach(x => x.classList.remove('br-drop-over'));
    row.classList.add('br-drop-over');
  };
  window.brDrop = function (e, routeId, to) {
    e.preventDefault();
    document.querySelectorAll('.br-drop-over').forEach(x => x.classList.remove('br-drop-over'));
    if (!DRAG || DRAG.routeId !== routeId || DRAG.from === to) return;
    const route = routeById(routeId); if (!route) return;
    const [moved] = route.stops.splice(DRAG.from, 1);
    route.stops.splice(to, 0, moved);
    rtOf(routeId).status = 'pending';
    DRAG = null;
    renderBody();
    brToast('จัดลำดับใหม่แล้ว · route กลับเป็น Pending');
  };
  window.brDragEnd = function () {
    document.querySelectorAll('.br-dragging,.br-drop-over').forEach(x => x.classList.remove('br-dragging','br-drop-over'));
    DRAG = null;
  };

  /* ── STOP ACTIONS ─────────────────────────────────────────── */
  window.brRemoveStop = function (routeId, i) {
    const route = routeById(routeId); if (!route) return;
    const s = route.stops[i]; if (!s) return;
    route.stops.splice(i, 1);
    rtOf(routeId).status = 'pending';
    renderBody(); brToast(`เอา ${s.name.split(' ')[0]} ออกจาก ${route.name} แล้ว`);
  };
  window.brToggleParent = function (routeId, i) {
    const route = routeById(routeId); const s = route?.stops[i]; if (!s) return;
    s.withParent = !s.withParent;
    renderBody(); brToast(`${s.name.split(' ')[0]} ${s.withParent ? 'พ่วงผู้ปกครอง (+1 ที่นั่ง)' : 'เอาผู้ปกครองออก'}`);
  };

  /* Add student — roster suggestion + manual + พ่วงผู้ปกครอง */
  window.brAddStop = function (routeId) {
    const route = routeById(routeId); if (!route) return;
    const v = vehicle(route.vehicleId);
    const used = seatUse(route), full = v && used >= v.cap;
    /* candidates: roster (บิลจ่ายแล้ว) ของสาขานี้ ที่ยังไม่อยู่ใน route */
    const inNames = new Set((route.stops || []).map(s => s.name));
    const cands = (window.DB?.busRoster || [])
      .filter(r => r.branch === route.branch && !inNames.has(r.student))
      .filter((r, idx, arr) => arr.findIndex(x => x.student === r.student) === idx);
    const candOpts = cands.map((r, i) => `<option value="${i}">${r.student} — ${r.addr || 'ไม่มีที่อยู่'}</option>`).join('');
    window._brCands = cands;

    Modal.create('modal-braddstop',
      `${UI.icon('person_add','sm')} เพิ่มนักเรียน · ${route.name}`,
      `${full ? `<div style="padding:10px 12px;background:var(--md-warning-container,#fef3c7);border-radius:8px;font-size:var(--fs-body-sm);margin-bottom:12px">
          ${UI.icon('warning','sm')} รอบนี้เต็มแล้ว (${used}/${v.cap}) — เพิ่มได้ แต่ควรแยกอีกรอบ</div>` : ''}
      ${cands.length ? `<div class="settings-group"><label class="settings-label">เลือกจากนักเรียนที่จ่ายค่ารถแล้ว (จากบิล)</label>
        <select id="as-cand" class="settings-input" onchange="brAddFillCand(this.value)">
          <option value="">— กรอกเอง —</option>${candOpts}</select></div>` : ''}
      <div class="settings-group"><label class="settings-label">ชื่อนักเรียน *</label>
        <input id="as-name" class="settings-input" placeholder="เช่น ณิชา ใจดี (นิ)"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div><label class="settings-label">เกรด</label><input id="as-grade" class="settings-input" placeholder="ป.3"></div>
        <div><label class="settings-label">ระยะ (กม.)</label><input id="as-dist" type="number" step="0.1" class="settings-input" placeholder="6.0"></div>
      </div>
      <div class="settings-group"><label class="settings-label">ที่อยู่</label>
        <input id="as-addr" class="settings-input" placeholder="บ้านเลขที่ ถนน ตำบล"></div>
      <label style="display:flex;align-items:center;gap:8px;font-size:var(--fs-body-sm);cursor:pointer">
        <input type="checkbox" id="as-parent"> ${UI.icon('escalator_warning','sm')} พ่วงผู้ปกครองไปด้วย (+1 ที่นั่ง)</label>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-braddstop')">Cancel</button>
       <button class="btn btn-primary" onclick="brAddStopSave('${routeId}')">${UI.icon('add','sm')} เพิ่มเข้ารอบ</button>`);
    setTimeout(() => document.getElementById('as-name')?.focus(), 60);
  };
  window.brAddFillCand = function (idx) {
    const c = (window._brCands || [])[+idx]; if (!c) return;
    document.getElementById('as-name').value = c.student || '';
    document.getElementById('as-grade').value = c.grade || '';
    document.getElementById('as-addr').value = c.addr || '';
  };
  window.brAddStopSave = function (routeId) {
    const route = routeById(routeId); if (!route) return;
    const name = gv('as-name'); if (!name) return brToast('กรอกชื่อนักเรียนก่อน');
    const dist = parseFloat(gv('as-dist')) || (3 + Math.round(Math.random() * 10));
    route.stops.push({
      id:'bs' + (++_sid), studentId:slug(name), name,
      grade:gv('as-grade') || '—', addr:gv('as-addr') || '—', dist,
      withParent: document.getElementById('as-parent')?.checked || false,
    });
    rtOf(routeId).status = 'pending';
    Modal.close('modal-braddstop');
    renderBody(); brToast(`เพิ่ม ${name.split(' ')[0]} เข้า ${route.name} แล้ว`);
  };

  /* ── ROUTE CRUD ───────────────────────────────────────────── */
  window.brEditRoute = function (routeId) {
    const r = routeId ? routeById(routeId) : null;
    const branch = r?.branch || S.branch;
    const vs = vehiclesIn(branch);
    Modal.create('modal-br-route',
      `${UI.icon(r ? 'edit' : 'add','sm')} ${r ? 'แก้ไข Route' : 'สร้าง Route ใหม่'}`,
      `<div class="settings-group"><label class="settings-label">ชื่อสาย *</label>
        <input id="rt-name" class="settings-input" value="${r?.name || ''}" placeholder="เช่น สายเหนือ · รับเช้า"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div><label class="settings-label">สาขา</label>
          <select id="rt-branch" class="settings-input" onchange="brRouteBranchChange(this.value)">
            ${BRANCHES.map(b => `<option ${branch === b ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
        <div><label class="settings-label">รถ</label>
          <select id="rt-vehicle" class="settings-input">
            ${vs.map(v => `<option value="${v.id}" ${r?.vehicleId === v.id ? 'selected' : ''}>${v.id} · ${v.driver}</option>`).join('')}</select></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
        <div><label class="settings-label">ประเภท</label>
          <select id="rt-kind" class="settings-input">
            <option value="pickup" ${r?.kind === 'pickup' ? 'selected' : ''}>รับ (Pickup)</option>
            <option value="dropoff" ${r?.kind === 'dropoff' ? 'selected' : ''}>ส่ง (Dropoff)</option>
          </select></div>
        <div><label class="settings-label">รอบที่</label>
          <input id="rt-round" type="number" min="1" class="settings-input" value="${r?.round || 1}"></div>
        <div><label class="settings-label" id="rt-anchor-lbl">${(r?.kind || 'pickup') === 'dropoff' ? 'ออกโรงเรียน' : 'ถึงโรงเรียน'}</label>
          <input id="rt-anchor" type="time" class="settings-input" value="${r?.anchor || '08:00'}"></div>
      </div>
      <div class="settings-group"><label class="settings-label">วันที่วิ่ง</label>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${DOW.slice(1).concat('Sun').map(d => `
            <label class="br-day-pick"><input type="checkbox" class="rt-day" value="${d}" ${(r?.days || []).includes(d) ? 'checked' : ''}> ${DOW_TH[d]}</label>`).join('')}
        </div></div>
      <div class="settings-hint">${UI.icon('info','sm')} 1 คันมีได้หลายรอบ/วัน (รับรอบ1, รับรอบ2, ส่งรอบ1…) · แต่ละรอบเป็น Route แยก</div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-br-route')">Cancel</button>
       <button class="btn btn-primary" onclick="brSaveRoute('${routeId || ''}')">${UI.icon('check','sm')} บันทึก</button>`);
    document.getElementById('rt-kind')?.addEventListener('change', e => {
      document.getElementById('rt-anchor-lbl').textContent = e.target.value === 'dropoff' ? 'ออกโรงเรียน' : 'ถึงโรงเรียน';
    });
  };
  window.brRouteBranchChange = function (b) {
    const vs = vehiclesIn(b);
    document.getElementById('rt-vehicle').innerHTML = vs.map(v => `<option value="${v.id}">${v.id} · ${v.driver}</option>`).join('');
  };
  window.brSaveRoute = function (routeId) {
    const name = gv('rt-name'); if (!name) return brToast('ใส่ชื่อสายก่อน');
    const days = [...document.querySelectorAll('.rt-day:checked')].map(c => c.value);
    const data = {
      name, branch:gv('rt-branch'), vehicleId:gv('rt-vehicle'),
      kind:gv('rt-kind'), round:+gv('rt-round') || 1, anchor:gv('rt-anchor') || '08:00', days,
    };
    const r = routeId ? routeById(routeId) : null;
    if (r) Object.assign(r, data);
    else ROUTES().push({ id:'rt-' + Date.now().toString(36), stops:[], ...data });
    S.branch = data.branch;
    document.getElementById('br-branch-sel') && (document.getElementById('br-branch-sel').value = data.branch);
    Modal.close('modal-br-route');
    if (S.tab === 'daily' || S.tab === 'vehicles') brTab('routes'); else renderBody();
    brToast(`${r ? 'บันทึก' : 'สร้าง'} Route "${name}" แล้ว`);
  };
  window.brDeleteRoute = function (routeId) {
    const r = routeById(routeId); if (!r) return;
    if (!confirm(`ลบ Route "${r.name}"?`)) return;
    const arr = ROUTES(); arr.splice(arr.indexOf(r), 1);
    renderBody(); brToast(`ลบ Route "${r.name}" แล้ว`);
  };

  /* ── OPS ACTIONS ──────────────────────────────────────────── */
  window.brApprove = function (routeId) { rtOf(routeId).status = 'approved'; renderBody(); const r = routeById(routeId); brToast(`Approve "${r?.name || 'รอบ'}" แล้ว`); };
  window.brApproveAll = function () {
    const pend = routesForDay(S.date, S.branch).filter(r => rtOf(r.id).status === 'pending');
    if (!pend.length) return brToast('ทุกรอบวันนี้ approve แล้ว');
    pend.forEach(r => rtOf(r.id).status = 'approved');
    renderBody(); brToast(`Approve & Send ${pend.length} รอบทั้งวัน · ส่งคนขับแล้ว`);
  };
  window.brStart = function (routeId) { const rt = rtOf(routeId); rt.status = 'running'; rt.pickedN = 0; renderBody(); brToast('เริ่มออกวิ่งแล้ว'); };
  window.brPickNext = function (routeId) { rtOf(routeId).pickedN++; renderBody(); };
  window.brComplete = function (routeId) { rtOf(routeId).status = 'completed'; renderBody(); brToast('จบรอบแล้ว'); };

  /* ── VEHICLE CRUD ─────────────────────────────────────────── */
  window.brEditVehicle = function (vid) {
    const v = vid ? vehicle(vid) : null;
    Modal.create('modal-br-veh',
      `${UI.icon(v ? 'edit' : 'add','sm')} ${v ? 'แก้ไขรถ ' + v.id : 'เพิ่มรถ'}`,
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div><label class="settings-label">รหัสรถ *</label>
          <input id="bv-id" class="settings-input" value="${v?.id || ''}" ${v ? 'disabled' : ''} placeholder="SR-03"></div>
        <div><label class="settings-label">ทะเบียน</label>
          <input id="bv-plate" class="settings-input" value="${v?.plate || ''}" placeholder="756"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div><label class="settings-label">คนขับ</label>
          <input id="bv-driver" class="settings-input" value="${v?.driver || ''}" placeholder="น้าเอื้อง"></div>
        <div><label class="settings-label">เบอร์โทร (ฉุกเฉิน)</label>
          <input id="bv-phone" class="settings-input" value="${v?.phone || ''}" placeholder="081-234-5678"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div><label class="settings-label">สาขา</label>
          <select id="bv-branch" class="settings-input">
            ${BRANCHES.map(b => `<option ${v?.branch === b ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
        <div><label class="settings-label">ที่นั่ง (นักเรียน)</label>
          <input id="bv-cap" type="number" min="1" class="settings-input" value="${v?.cap ?? 10}"></div>
      </div>
      <div class="settings-group"><label class="settings-label">จุดจอด (depot)</label>
        <input id="bv-depot" class="settings-input" value="${v?.depot || ''}" placeholder="สาขาศรีราชา"></div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-br-veh')">Cancel</button>
       ${v ? `<button class="btn btn-secondary" onclick="brDeleteVehicle('${v.id}')">${UI.icon('delete','sm')}</button>` : ''}
       <button class="btn btn-primary" onclick="brSaveVehicle('${vid || ''}')">${UI.icon('check','sm')} บันทึก</button>`);
  };
  window.brSaveVehicle = function (vid) {
    const id = vid || gv('bv-id');
    if (!id) return brToast('ใส่รหัสรถก่อน');
    if (!vid && VEHICLES.some(x => x.id === id)) return brToast('มีรหัสรถนี้แล้ว');
    const data = { plate:gv('bv-plate'), driver:gv('bv-driver'), phone:gv('bv-phone'),
      branch:gv('bv-branch'), cap:+gv('bv-cap') || 10, depot:gv('bv-depot') };
    if (vid) Object.assign(vehicle(vid), data);
    else VEHICLES.push({ id, ...data });
    Modal.close('modal-br-veh'); renderBody(); brToast(`${vid ? 'บันทึก' : 'เพิ่ม'}รถ ${id} แล้ว`);
  };
  window.brDeleteVehicle = function (vid) {
    if (ROUTES().some(r => r.vehicleId === vid)) return brToast('มี Route ใช้รถคันนี้อยู่ — ย้าย/ลบ Route ก่อน');
    const i = VEHICLES.findIndex(x => x.id === vid); if (i < 0) return;
    VEHICLES.splice(i, 1);
    Modal.close('modal-br-veh'); renderBody(); brToast(`ลบรถ ${vid} แล้ว`);
  };

  window.brToast = function (msg) {
    let t = document.getElementById('br-toast');
    if (!t) { t = document.createElement('div'); t.id = 'br-toast'; t.className = 'br-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('show');
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2200);
  };

  /* ── expose to bus-views.js / bus-report.js ── */
  window.BusRoute = {
    vehicle, vehiclesIn, allVehicles: () => VEHICLES.slice(),
    route: routeById, routesFor, routesForDay,
    schedule: computeSchedule,
    seatUse, feeOf, FEE_PER_TRIP,
    rt: rtOf,
    rtForDate: (date, routeId) => (RT[date] && RT[date][routeId]) || { status:'pending', pickedN:0, sub:null },
    state: () => S, TODAY, STATUS, fmtDate, min2hm, dowOf, DOW_TH,
    rerender: renderBody,
    goDay: date => { S.date = date; brTab('daily'); },
  };

  renderBody();
})();
