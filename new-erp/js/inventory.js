/* inventory.js — NockERP Inventory Module (LOGIC-SPEC-14)
   หนังสือ/ของ = stock item จริง (ราคา · grade coverage · supplier · stock)
   Book fee บน Invoice จะดึงจากที่นี่ (integration = follow-up)
   Self-contained mock (prototype) */
(function () {

  /* ── SEED ITEMS ───────────────────────────────────────────── */
  const ITEMS = [
    { id: 'bk-math', type: 'Book', sub: 'Learning Book', name: 'Math Workbook (ประถม)', subject: 'Math',
      grades: ['ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'], price: 350, stock: 42, branch: 'Sukhumvit', status: 'Active',
      supplier: { name: 'สนพ. เลิร์นสมาร์ท', addr: 'เขตจตุจักร กรุงเทพฯ', moq: 20, unit: 'เล่ม', unitPrice: 180 }, lastOrder: '2026-05-10',
      moves: [{ date: '2026-05-10', type: 'restock', qty: 30, note: 'สั่งซื้อรอบ MOQ' }, { date: '2026-05-22', type: 'sale-invoice', qty: -8, note: 'ผูกบิล INV' }] },
    { id: 'bk-eng', type: 'Book', sub: 'Learning Book', name: 'English Active Book', subject: 'Eng (Active)',
      grades: ['ป.1', 'ป.2', 'ป.3', 'ป.4', 'ป.5', 'ป.6'], price: 420, stock: 4, branch: 'Sukhumvit', status: 'Active',
      supplier: { name: 'Cambridge Press TH', addr: 'เขตวัฒนา กรุงเทพฯ', moq: 25, unit: 'เล่ม', unitPrice: 240 }, lastOrder: '2026-04-02',
      moves: [{ date: '2026-04-02', type: 'restock', qty: 25, note: 'สั่งซื้อ' }, { date: '2026-05-18', type: 'sale-invoice', qty: -21, note: 'ผูกบิลหลายใบ' }] },
    { id: 'bk-sci', type: 'Book', sub: 'Learning Book', name: 'Science Explorer', subject: 'Science',
      grades: ['ป.3', 'ป.4', 'ป.5', 'ป.6'], price: 390, stock: 0, branch: 'Sukhumvit', status: 'Active',
      supplier: { name: 'สนพ. เลิร์นสมาร์ท', addr: 'เขตจตุจักร กรุงเทพฯ', moq: 20, unit: 'เล่ม', unitPrice: 200 }, lastOrder: '2026-03-15',
      moves: [{ date: '2026-03-15', type: 'restock', qty: 20, note: 'สั่งซื้อ' }, { date: '2026-05-20', type: 'sale-invoice', qty: -20, note: 'ขายหมด' }] },
    { id: 'dict-eng', type: 'Book', sub: 'Dictionary', name: 'Oxford Advanced Dictionary', subject: 'Eng',
      grades: ['ป.4', 'ป.5', 'ป.6', 'ม.1', 'ม.2', 'ม.3'], price: 590, stock: 15, branch: 'Sukhumvit', status: 'Active',
      supplier: { name: 'Oxford TH', addr: 'เขตปทุมวัน กรุงเทพฯ', moq: 10, unit: 'เล่ม', unitPrice: 380 }, lastOrder: '2026-05-01', moves: [] },
    { id: 'txt-gram', type: 'Book', sub: 'Text Book', name: 'Grammar Essentials', subject: 'Eng (Grammar)',
      grades: ['ม.1', 'ม.2', 'ม.3'], price: 450, stock: 8, branch: 'Silom', status: 'Active',
      supplier: { name: 'Cambridge Press TH', addr: 'เขตวัฒนา กรุงเทพฯ', moq: 20, unit: 'เล่ม', unitPrice: 250 }, lastOrder: '2026-04-20', moves: [] },
    { id: 'kit-bag', type: 'Supply', sub: 'Giveaway', name: 'NockAcademy Tote Bag', subject: '—',
      grades: [], price: 0, stock: 120, branch: 'Sukhumvit', status: 'Active',
      supplier: { name: 'PrintPro', addr: 'เขตบางนา กรุงเทพฯ', moq: 100, unit: 'ใบ', unitPrice: 45 }, lastOrder: '2026-05-05', moves: [] },
  ];

  const WARN = 5;
  const stockState = it => it.stock <= 0 ? ['Out of stock', 'red'] : it.stock <= WARN ? ['Warning', 'yellow'] : ['In stock', 'green'];
  const MOVE_META = {
    'restock': ['เติมสต็อก', 'add_circle', 'green'], 'sale-invoice': ['ขายผ่านบิล', 'receipt_long', 'blue'],
    'sale-standalone': ['ขายแยก', 'sell', 'purple'], 'giveaway': ['แจก', 'redeem', 'orange'],
  };
  const gradeLabel = g => !g.length ? '—' : g.length >= 4 ? `${g[0]}–${g[g.length - 1]} (${g.length})` : g.join(', ');

  let S = { type: 'all', branch: 'all', status: 'all', q: '' };
  const branches = [...new Set(ITEMS.map(i => i.branch))];
  const item = id => ITEMS.find(i => i.id === id);
  const gv = id => (document.getElementById(id)?.value || '').trim();

  function filtered() {
    return ITEMS.filter(i =>
      (S.type === 'all' || i.type === S.type) &&
      (S.branch === 'all' || i.branch === S.branch) &&
      (S.status === 'all' || stockState(i)[0] === S.status) &&
      (!S.q || (i.name + i.subject + i.sub).toLowerCase().includes(S.q.toLowerCase())));
  }

  /* ── RENDER ───────────────────────────────────────────────── */
  function render() {
    const warn = ITEMS.filter(i => i.stock > 0 && i.stock <= WARN).length;
    const out = ITEMS.filter(i => i.stock <= 0).length;
    const value = ITEMS.reduce((n, i) => n + i.stock * i.price, 0);

    const kpi = UI.kpiGrid([
      { icon: 'inventory_2', label: 'Inventory Items', value: ITEMS.length, sub: `${branches.length} สาขา` },
      { icon: 'warning', label: 'Warning (≤' + WARN + ')', value: warn, sub: 'ควรสั่งเพิ่ม', color: warn ? 'warning' : 'success' },
      { icon: 'error', label: 'Out of Stock', value: out, sub: out ? 'ใส่บิลไม่ได้' : 'ครบ', color: out ? 'error' : 'success' },
      { icon: 'payments', label: 'มูลค่าสต็อก', value: Utils.currency(value), sub: 'ราคาขาย × คงเหลือ', color: 'tertiary' },
    ]);

    const rows = filtered().map(i => {
      const [sl, sc] = stockState(i);
      return `<tr class="tr-click" onclick="invDetail('${i.id}')">
        <td><b>${i.name}</b><div class="text-muted" style="font-size:11px">${i.sub}</div></td>
        <td>${UI.badge(i.type, i.type === 'Book' ? 'blue' : 'purple')}</td>
        <td>${i.subject}</td>
        <td class="text-muted" style="font-size:var(--fs-body-sm)">${gradeLabel(i.grades)}</td>
        <td style="text-align:right">${i.price ? Utils.currency(i.price) : '<span class="text-muted">แจก</span>'}</td>
        <td style="text-align:center"><b>${i.stock}</b></td>
        <td style="text-align:center">${UI.badge(sl, sc)}</td>
        <td class="text-muted" style="font-size:var(--fs-body-sm)">${i.branch}</td>
      </tr>`;
    }).join('');

    const cols = [
      { label: 'Item' }, { label: 'Type' }, { label: 'Subject' }, { label: 'Grades' },
      { label: 'Price', align: 'right' }, { label: 'Stock', align: 'center' }, { label: 'Stock status', align: 'center' }, { label: 'Location' },
    ];

    document.getElementById('view-inventory').innerHTML = `
      ${UI.pageHeader('Inventory', '<span>หนังสือ & สต็อก · ตัดสต็อกเมื่อยืนยันการจ่าย · ผูก Book fee บนบิล</span>',
        `<button class="btn btn-primary btn-sm" onclick="invAdd()">${UI.icon('add', 'sm')} เพิ่ม Item</button>`)}
      ${kpi}
      ${UI.filterBar([
        { type: 'search', placeholder: 'ค้นหา item, subject…', oninput: 'invSearch(this.value)' },
        { label: 'ทั้งหมด', active: true, onclick: "invFilter('type','all',this)" },
        { label: 'Book', onclick: "invFilter('type','Book',this)" },
        { label: 'Supply', onclick: "invFilter('type','Supply',this)" },
      ])}
      <div class="filter-bar" style="margin-top:8px">
        <select class="tc-select" onchange="invSet('branch',this.value)">
          <option value="all">ทุกสาขา</option>${branches.map(b => `<option value="${b}">${b}</option>`).join('')}
        </select>
        <select class="tc-select" onchange="invSet('status',this.value)">
          <option value="all">ทุกสถานะสต็อก</option><option value="In stock">In stock</option>
          <option value="Warning">Warning</option><option value="Out of stock">Out of stock</option>
        </select>
      </div>
      ${UI.table(cols, rows || '', { emptyMsg: 'ไม่พบ item' })}`;
  }

  /* ── DETAIL MODAL ─────────────────────────────────────────── */
  window.invDetail = function (id) {
    const i = item(id); if (!i) return;
    const [sl, sc] = stockState(i);
    const moves = (i.moves || []).slice().reverse();
    const movesHtml = moves.length ? moves.map(m => {
      const [ml, mi, mc] = MOVE_META[m.type] || [m.type, 'circle', 'gray'];
      return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--md-outline-variant)">
        <div style="width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;background:var(--md-surface-variant,#eef0f4)">${UI.icon(mi, 'sm')}</div>
        <div style="flex:1"><div style="font-weight:600;font-size:var(--fs-body-sm)">${ml} ${UI.badge((m.qty > 0 ? '+' : '') + m.qty, mc)}</div>
          <div class="text-muted" style="font-size:11px">${m.date}${m.note ? ' · ' + m.note : ''}</div></div>
      </div>`;
    }).join('') : `<div class="text-muted" style="font-size:var(--fs-body-sm);padding:8px 0">ยังไม่มีความเคลื่อนไหว</div>`;

    Modal.create('modal-inv-detail',
      `${UI.icon(i.type === 'Book' ? 'menu_book' : 'inventory_2', 'sm')} ${i.name}`,
      `<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div>
          <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
            ${UI.badge(i.type, i.type === 'Book' ? 'blue' : 'purple')}${UI.badge(i.sub, 'gray')}${UI.badge(sl, sc)}
            ${UI.badge(i.status, i.status === 'Active' ? 'green' : 'gray')}
          </div>
          ${UI.infoGrid([
            { label: 'Subject', value: i.subject },
            { label: 'Grades', value: gradeLabel(i.grades) },
            { label: 'Selling Price', value: i.price ? Utils.currency(i.price) : 'แจก (0)' },
            { label: 'Location', value: i.branch },
            { label: 'คงเหลือ', value: `<b>${i.stock}</b> ${i.supplier.unit}` },
            { label: 'Last Order', value: i.lastOrder || '—' },
          ])}
          <div class="section-title" style="font-size:var(--fs-body-sm);margin-top:14px">Supplier</div>
          <div style="background:var(--md-surface-low,#f5f6fa);border-radius:8px;padding:10px 12px;font-size:var(--fs-body-sm)">
            <div style="font-weight:600">${i.supplier.name}</div>
            <div class="text-muted">${i.supplier.addr}</div>
            <div class="text-muted" style="margin-top:4px">MOQ ${i.supplier.moq} ${i.supplier.unit} · ต้นทุน ${Utils.currency(i.supplier.unitPrice)}/${i.supplier.unit}</div>
          </div>
          <button class="btn btn-secondary btn-sm" style="margin-top:10px;width:100%" onclick="invRestock('${i.id}')">
            ${UI.icon('local_shipping', 'sm')} Reorder (+${i.supplier.moq} ${i.supplier.unit})</button>
        </div>
        <div>
          <div class="section-title" style="font-size:var(--fs-body-sm)">ปรับสต็อก (ตัดเมื่อยืนยันจ่าย)</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
            <button class="btn btn-secondary btn-sm" onclick="invMove('${i.id}','sale-invoice',-1)">${UI.icon('receipt_long', 'sm')} ขายผ่านบิล −1</button>
            <button class="btn btn-secondary btn-sm" onclick="invMove('${i.id}','sale-standalone',-1)">${UI.icon('sell', 'sm')} ขายแยก −1</button>
            <button class="btn btn-secondary btn-sm" onclick="invMove('${i.id}','giveaway',-1)">${UI.icon('redeem', 'sm')} แจก −1</button>
          </div>
          <div class="section-title" style="font-size:var(--fs-body-sm)">Stock Movements</div>
          <div id="inv-moves">${movesHtml}</div>
        </div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-inv-detail')">Close</button>
       <button class="btn btn-secondary" onclick="invAdd('${i.id}')">${UI.icon('edit', 'sm')} Edit</button>`,
      'modal-lg');
  };

  /* ── STOCK ACTIONS ────────────────────────────────────────── */
  function applyMove(i, type, qty, note) {
    i.stock = Math.max(-99, i.stock + qty);
    (i.moves = i.moves || []).push({ date: new Date().toISOString().slice(0, 10), type, qty, note: note || '' });
    if (type === 'restock') i.lastOrder = new Date().toISOString().slice(0, 10);
  }
  window.invMove = function (id, type, qty) {
    const i = item(id); if (!i) return;
    if (qty < 0 && i.stock <= 0) { showToast('สต็อกหมดแล้ว — ตัดไม่ได้ (จะติดลบ)', 'warning'); }
    applyMove(i, type, qty);
    invDetail(id); render();
    const [ml] = MOVE_META[type];
    showToast(`${ml} ${i.name} · คงเหลือ ${i.stock}`, i.stock <= 0 ? 'warning' : 'info');
  };
  window.invRestock = function (id) {
    const i = item(id); if (!i) return;
    applyMove(i, 'restock', i.supplier.moq, `Reorder MOQ ${i.supplier.moq}`);
    invDetail(id); render();
    showToast(`สั่งซื้อ ${i.name} +${i.supplier.moq} · คงเหลือ ${i.stock}`, 'success');
  };

  /* ── ADD / EDIT ───────────────────────────────────────────── */
  window.invAdd = function (id) {
    const e = id ? item(id) : null;
    const subjects = ['Math', 'Eng', 'Eng (Active)', 'Eng (Grammar)', 'Science', 'Thai', '—'];
    Modal.create('modal-inv-add',
      `${UI.icon(e ? 'edit' : 'add', 'sm')} ${e ? 'แก้ไข' : 'เพิ่ม'} Item`,
      `<div class="settings-group"><label class="settings-label">ชื่อ Item *</label>
        <input id="iv-name" class="settings-input" value="${e?.name || ''}" placeholder="เช่น Math Workbook"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div><label class="settings-label">Type</label><select id="iv-type" class="settings-input">
          <option ${e?.type === 'Book' ? 'selected' : ''}>Book</option><option ${e?.type === 'Supply' ? 'selected' : ''}>Supply</option></select></div>
        <div><label class="settings-label">Sub type</label>
          <input id="iv-sub" class="settings-input" value="${e?.sub || ''}" placeholder="Learning Book / Dictionary / Giveaway"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
        <div><label class="settings-label">Subject</label><select id="iv-subject" class="settings-input">
          ${subjects.map(s => `<option ${e?.subject === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div><label class="settings-label">Grades (คั่นด้วย ,)</label>
          <input id="iv-grades" class="settings-input" value="${(e?.grades || []).join(',')}" placeholder="ป.2,ป.3,ป.4"></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
        <div><label class="settings-label">Price</label><input id="iv-price" type="number" class="settings-input" value="${e?.price ?? ''}"></div>
        <div><label class="settings-label">Stock</label><input id="iv-stock" type="number" class="settings-input" value="${e?.stock ?? ''}"></div>
        <div><label class="settings-label">Branch</label><select id="iv-branch" class="settings-input">
          ${branches.map(b => `<option ${e?.branch === b ? 'selected' : ''}>${b}</option>`).join('')}</select></div>
      </div>
      <div class="section-title" style="font-size:var(--fs-body-sm)">Supplier</div>
      <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:12px">
        <div><label class="settings-label">ชื่อ Supplier</label><input id="iv-sup" class="settings-input" value="${e?.supplier?.name || ''}"></div>
        <div><label class="settings-label">MOQ</label><input id="iv-moq" type="number" class="settings-input" value="${e?.supplier?.moq ?? ''}"></div>
        <div><label class="settings-label">ต้นทุน/หน่วย</label><input id="iv-uprice" type="number" class="settings-input" value="${e?.supplier?.unitPrice ?? ''}"></div>
      </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-inv-add')">Cancel</button>
       <button class="btn btn-primary" onclick="invSave('${id || ''}')">${UI.icon('save', 'sm')} บันทึก</button>`,
      'modal-lg');
  };
  window.invSave = function (id) {
    const name = gv('iv-name'); if (!name) return showToast('กรอกชื่อ Item', 'warning');
    const data = {
      name, type: gv('iv-type'), sub: gv('iv-sub') || '—', subject: gv('iv-subject'),
      grades: gv('iv-grades') ? gv('iv-grades').split(',').map(s => s.trim()).filter(Boolean) : [],
      price: +gv('iv-price') || 0, stock: +gv('iv-stock') || 0, branch: gv('iv-branch'), status: 'Active',
      supplier: { name: gv('iv-sup') || '—', addr: '', moq: +gv('iv-moq') || 0, unit: 'เล่ม', unitPrice: +gv('iv-uprice') || 0 },
    };
    if (id) { Object.assign(item(id), data); }
    else { ITEMS.unshift({ id: 'iv-' + Date.now().toString(36), lastOrder: null, moves: [], ...data }); }
    Modal.close('modal-inv-add'); render();
    showToast(`บันทึก ${name} ✓`, 'success');
  };

  /* ── FILTER ACTIONS ───────────────────────────────────────── */
  window.invSearch = function (v) { S.q = v; render(); };
  window.invSet = function (k, v) { S[k] = v; render(); };
  window.invFilter = function (k, v, el) {
    S[k] = v;
    el.parentElement.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
    el.classList.add('active'); render();
  };

  /* ── PUBLIC API — Billing ดึง Book fee จากที่นี่ (spec 14) ──── */
  window.Inventory = {
    all: () => ITEMS.slice(),
    item: id => item(id),
    /* หนังสือที่ตรง subject + ครอบ grade + สาขา · ตัดตัวที่ปิดใช้งานออก
       out of stock ยังคืนมาแต่ติดธง outOfStock (spec §33: เลือกใส่บิลไม่ได้ + แจ้ง Admin) */
    booksFor(subject, grade, branch) {
      return ITEMS.filter(i =>
        i.type === 'Book' && i.status !== 'Inactive' &&
        i.subject === subject &&
        (!grade || !i.grades.length || i.grades.includes(grade)) &&
        (!branch || i.branch === branch)
      ).map(i => ({
        id: i.id, name: i.name, price: i.price, sub: i.sub,
        type: i.sub === 'Dictionary' ? 'dictionary' : 'learning',
        stock: i.stock, outOfStock: i.stock <= 0,
      }));
    },
    /* ตัดสต็อกตอนยืนยันการจ่ายแล้ว (spec §32) */
    consume(id, qty, note) {
      const i = item(id); if (!i) return false;
      applyMove(i, 'sale-invoice', -Math.abs(qty || 1), note || 'ผูกบิล');
      if (document.getElementById('view-inventory')?.innerHTML) render();
      return true;
    },
  };

  render();
})();
