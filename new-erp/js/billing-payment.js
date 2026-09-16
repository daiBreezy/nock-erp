/* ============================================================
   billing-payment.js — ยืนยันการจ่ายเงิน (LOGIC-SPEC-01 PART E)

   ขั้นตอนจริงของ Admin (Nock ยืนยัน 23 Jul 2026):
     1. ผู้ปกครองส่งสลิปมาทาง LINE
     2. Admin แนบสลิปเข้าระบบ           → status 'pending' (มีสลิป · ยังไม่ยืนยันเงินเข้า)
     3. Admin เปิด KBiz เช็ค statement   → นอกระบบ
     4. Admin กด Confirm Paid            → status 'paid' + ตัดสต็อก + ส่งเด็กเข้าคลาส

   ⭐ เด็กเข้าคลาสได้ก็ต่อเมื่อ "เห็นเงินใน statement แล้ว" เท่านั้น
   Void: ทุกสถานะก่อน paid ยกเลิกได้ — เก็บใบเก่าไว้ + เหตุผลบังคับ
   ============================================================ */
(function () {

  const src   = id => window.Billing?.src(id) || (DB.invoices||[]).find(i=>i.id===id);
  const today = () => new Date().toISOString().slice(0,10);
  const esc   = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  const who   = () => window.CURRENT_USER?.name || 'Admin';
  const refresh = () => window.Billing?.refresh();

  /* audit trail ต่อใบ — ใครทำอะไรเมื่อไหร่ (ตรวจย้อนได้) */
  function log(inv, action, detail) {
    (inv.history = inv.history || []).push({ action, detail:detail||'', by:who(), at:new Date().toISOString() });
  }

  /* ── 2. แนบสลิป ─────────────────────────────────────────── */
  window.billingUploadSlip = function(id) {
    const inv = src(id); if (!inv) return;
    Modal.create('modal-slip', `${UI.icon('upload_file')} แนบสลิปการโอน · ${inv.id}`,
      `<div class="text-muted" style="font-size:12px;margin-bottom:12px">
         ${UI.icon('info','sm')} ผู้ปกครองส่งสลิปมาทาง LINE → แนบเข้าระบบเพื่อเก็บเป็นหลักฐาน
         <br>ขั้นนี้ <b>ยังไม่ใช่การยืนยันเงินเข้า</b> — ต้องเช็ค statement ใน KBiz ก่อนถึงจะกด Confirm Paid ได้</div>

       <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
         <div><label class="field-label">วันที่โอน</label>
           <input type="date" id="sl-date" class="form-input" style="width:100%" value="${today()}"></div>
         <div><label class="field-label">ยอดที่โอน</label>
           <input type="number" id="sl-amt" class="form-input" style="width:100%" value="${inv.amount||0}"></div>
       </div>
       <div style="margin-bottom:12px"><label class="field-label">ช่องทาง</label>
         <select id="sl-method" class="form-input" style="width:100%">
           <option ${inv.method==='Transfer'?'selected':''}>Transfer</option>
           <option ${inv.method==='QR Code'?'selected':''}>QR Code</option>
           <option ${inv.method==='Cash'?'selected':''}>Cash</option>
         </select></div>

       <label class="field-label">ไฟล์สลิป</label>
       <label for="sl-file" class="bp-drop" id="sl-drop">
         ${UI.icon('add_photo_alternate','lg')}
         <div style="font-size:12px;margin-top:4px">คลิกเพื่อเลือกไฟล์สลิป (รูป/PDF)</div>
       </label>
       <input type="file" id="sl-file" accept="image/*,.pdf" style="display:none"
         onchange="bpSlipPreview(this)">
       <div id="sl-prev"></div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-slip')">Cancel</button>
       <button class="btn btn-primary" onclick="bpSaveSlip('${id}')">
         ${UI.icon('check','sm')} บันทึกสลิป → รอตรวจ statement</button>`);
  };

  let _slipData = null, _slipName = '';
  window.bpSlipPreview = function(input) {
    const f = input.files?.[0]; if (!f) return;
    _slipName = f.name;
    const box = document.getElementById('sl-prev');
    const rd  = new FileReader();
    rd.onload = e => {
      _slipData = e.target.result;
      box.innerHTML = f.type.startsWith('image/')
        ? `<img src="${_slipData}" class="bp-thumb"><div class="text-muted" style="font-size:11px">${esc(f.name)}</div>`
        : `<div class="bp-file">${UI.icon('description','sm')} ${esc(f.name)}</div>`;
      const d = document.getElementById('sl-drop'); if (d) d.style.display = 'none';
    };
    rd.readAsDataURL(f);
  };

  window.bpSaveSlip = function(id) {
    const inv = src(id); if (!inv) return;
    const method = document.getElementById('sl-method')?.value || 'Transfer';
    if (method !== 'Cash' && !_slipData) { showToast('แนบไฟล์สลิปก่อน (เงินสดไม่ต้อง)','error'); return; }
    inv.payslip = {
      dataUrl:_slipData||'', name:_slipName||'(เงินสด)',
      transferDate: document.getElementById('sl-date')?.value || today(),
      amount: Number(document.getElementById('sl-amt')?.value || inv.amount),
      method, uploadedBy: who(), uploadedAt: today(),
    };
    inv.method = method;
    inv.status = 'pending';
    log(inv, 'slip_uploaded', `${method} · ${Utils.currency(inv.payslip.amount)}`);
    _slipData = null; _slipName = '';
    Modal.close('modal-slip');
    refresh();
    showToast('บันทึกสลิปแล้ว — เช็ค statement ใน KBiz แล้วกลับมากด Confirm Paid','success');
  };

  window.billingViewSlip = function(id) {
    const inv = src(id); const p = inv?.payslip;
    if (!p) { showToast('ยังไม่มีสลิป','error'); return; }
    Modal.create('modal-slipview', `${UI.icon('image')} สลิป · ${inv.id}`,
      `${p.dataUrl ? `<img src="${p.dataUrl}" style="max-width:100%;border-radius:8px">`
        : `<div class="bp-file">${UI.icon('payments','sm')} ${esc(p.name)}</div>`}
       <div class="text-muted" style="font-size:12px;margin-top:10px">
         โอน ${esc(p.transferDate)} · ${Utils.currency(p.amount)} · ${esc(p.method)}<br>
         แนบโดย ${esc(p.uploadedBy)} เมื่อ ${esc(p.uploadedAt)}</div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-slipview')">Close</button>`);
  };

  /* ══ STATEMENT MATCHING — ผูกบิลกับเงินเข้าจริงใน KBiz ══════
     เดิม: Admin เปิด KBiz ดูเอง แล้วพิมพ์เลข ref มือ (หรือไม่พิมพ์) → ตรวจย้อนไม่ได้
     ตอนนี้: ระบบไล่หา statement ที่น่าจะใช่ให้ → Admin กดเลือก → ผูก 2 ทางกับบิล
     1 statement ใช้ได้กับบิลเดียว (จับคู่แล้วหายจากรายการของบิลอื่น) */
  let _stmtPick = null, _stmtManual = false, _stmtQ = '';

  function stmtRow(inv, s) {
    const on   = _stmtPick === s.id;
    const diff = s._diff || 0;
    const tag  = s._exact
      ? `<span class="badge badge-green" style="font-size:9px">ยอดตรง</span>`
      : `<span class="badge badge-yellow" style="font-size:9px">ต่าง ${diff>0?'+':'−'}${Utils.currency(Math.abs(diff))}</span>`;
    return `<label class="bp-stmt${on?' on':''}">
      <input type="radio" name="cp-stmt" ${on?'checked':''} onchange="bpPickStmt('${inv.id}','${s.id}')">
      <span style="flex:1;min-width:0">
        <div style="display:flex;gap:8px;align-items:center">
          <b style="font-size:12px;font-family:monospace">${esc(s.ref)}</b>${tag}
          ${s._dayDiff>2?`<span class="text-muted" style="font-size:10px">ห่าง ${s._dayDiff} วัน</span>`:''}
        </div>
        <div class="text-muted" style="font-size:11px">
          ${esc(s.date)} ${esc(s.time)} · ${esc(s.payerName)} ${esc(s.payerAcct)} · ${esc(s.account)}</div>
      </span>
      <b style="font-size:13px;white-space:nowrap">${Utils.currency(s.amount)}</b>
    </label>`;
  }

  function stmtSection(inv) {
    const isCash = (inv.payslip?.method || inv.method) === 'Cash';
    if (isCash) {
      _stmtPick = 'CASH';
      return `<div class="bp-check">${UI.icon('payments','sm')}
        <b>เงินสด</b> — ไม่มีรายการใน statement · รับเงินที่เคาน์เตอร์แล้วบันทึกเป็น petty cash</div>`;
    }
    const linked = window.Bank?.forInvoice(inv.id);
    if (linked) {
      _stmtPick = linked.id;
      return `<div class="bp-check">
        ${UI.icon('link','sm')} จับคู่กับ <b style="font-family:monospace">${esc(linked.ref)}</b>
        · ${esc(linked.date)} ${esc(linked.time)} · ${Utils.currency(linked.amount)}
        <button class="btn btn-secondary btn-sm" style="margin-left:auto"
          onclick="bpUnlinkStmt('${inv.id}')">เปลี่ยน</button></div>`;
    }
    const cands = window.Bank?.candidatesFor(inv, { q:_stmtQ }) || [];
    return `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
        <b style="font-size:13px">${UI.icon('account_balance','sm')} จับคู่กับ statement KBiz</b>
        <span class="badge badge-red" style="font-size:9px">บังคับ</span>
        <button class="btn btn-secondary btn-sm" style="margin-left:auto"
          onclick="bpSyncStmt('${inv.id}')">${UI.icon('sync','sm')} ดึงรายการใหม่</button>
      </div>
      <input class="form-input" style="width:100%;margin-bottom:6px" placeholder="ค้นหา เลข ref / ชื่อผู้โอน / ยอด…"
        value="${esc(_stmtQ)}" oninput="bpSearchStmt('${inv.id}', this.value)">
      ${cands.length ? `<div class="bp-stmt-list">${cands.map(s=>stmtRow(inv,s)).join('')}</div>`
        : `<div class="cs-box cs-warn">${UI.icon('search_off','sm')}
             <b>ไม่พบรายการเงินเข้าที่ตรงกับบิลนี้</b>
             <div style="font-size:11px">เงินอาจยังไม่เข้า (T+1) — กด "ดึงรายการใหม่" หรือรอแล้วค่อยยืนยัน</div></div>`}
      <label class="bp-inline" style="margin-top:8px">
        <input type="checkbox" id="cp-manual" ${_stmtManual?'checked':''}
          onchange="bpToggleManual('${inv.id}', this.checked)">
        <span class="text-muted" style="font-size:12px">ไม่มีในรายการ — กรอกเลข statement เอง</span></label>
      ${_stmtManual ? `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px">
        <div><label class="field-label">เลข ref จาก KBiz</label>
          <input type="text" id="cp-ref" class="form-input" style="width:100%"
            placeholder="KB2607230012" oninput="bpToggleConfirm()"></div>
        <div><label class="field-label">วันที่เงินเข้า</label>
          <input type="date" id="cp-date" class="form-input" style="width:100%" value="${p0(inv)}"></div>
      </div>
      <div class="text-muted" style="font-size:11px;margin-top:4px">
        ${UI.icon('warning','sm')} กรอกเองจะถูกทำเครื่องหมายไว้ว่ายังไม่ได้ตรวจกับ feed — ตรวจซ้ำภายหลังได้</div>` : ''}`;
  }
  const p0 = inv => inv.payslip?.transferDate || today();

  function redrawStmt(invId) {
    const inv = src(invId); const box = document.getElementById('cp-stmt');
    if (box && inv) box.innerHTML = stmtSection(inv);
    bpToggleConfirm();
  }

  window.bpPickStmt   = (invId, sid) => { _stmtPick = sid; _stmtManual = false; bpToggleConfirm(); };
  window.bpSearchStmt = (invId, q)   => { _stmtQ = q; redrawStmt(invId);
    const el = document.querySelector('#cp-stmt input.form-input'); el?.focus(); el?.setSelectionRange(q.length,q.length); };
  window.bpUnlinkStmt = (invId) => { window.Bank?.unmatch(invId); _stmtPick = null; redrawStmt(invId); };
  window.bpToggleManual = (invId, on) => { _stmtManual = on; if (on) _stmtPick = null; redrawStmt(invId); };
  window.bpSyncStmt = function(invId) {
    const n = window.Bank?.sync() || 0;
    redrawStmt(invId);
    showToast(n ? `ดึงรายการใหม่จาก KBiz — พบ ${n} รายการ` : 'ไม่มีรายการใหม่จาก KBiz', n?'success':'info');
  };

  /* ── 4. Confirm Paid — ต้องยืนยันว่าเห็นเงินใน statement แล้ว ── */
  window.billingConfirmPaid = function(id) {
    const inv = src(id); if (!inv) return;
    _stmtPick = null; _stmtManual = false; _stmtQ = '';
    const p   = inv.payslip || {};
    const diff = Number(p.amount||0) - Number(inv.amount||0);
    const enrollN = Object.values(inv.chosenSchedule||{})
      .reduce((n,x)=> n + (Array.isArray(x?.classIds) ? x.classIds.length : 1), 0);

    Modal.create('modal-confirm-paid', `${UI.icon('fact_check')} ยืนยันเงินเข้า · ${inv.id}`,
      `<div style="display:flex;gap:14px;margin-bottom:14px">
         <div style="flex:0 0 180px">
           ${p.dataUrl ? `<img src="${p.dataUrl}" style="width:100%;border-radius:8px;border:1px solid var(--md-outline-variant)">`
             : `<div class="bp-file" style="height:120px">${UI.icon('payments','lg')}<div>เงินสด / ไม่มีสลิป</div></div>`}
         </div>
         <div style="flex:1;font-size:13px">
           <div class="bp-kv"><span>ยอดในบิล</span><b>${Utils.currency(inv.amount)}</b></div>
           <div class="bp-kv"><span>ยอดในสลิป</span><b>${Utils.currency(p.amount||0)}</b></div>
           ${diff ? `<div class="bp-kv text-error"><span>${diff>0?'จ่ายเกิน':'จ่ายขาด'}</span>
             <b>${Utils.currency(Math.abs(diff))}</b></div>` : ''}
           <div class="bp-kv"><span>วันที่โอน</span><span>${esc(p.transferDate||'—')}</span></div>
           <div class="bp-kv"><span>ช่องทาง</span><span>${esc(p.method||inv.method||'—')}</span></div>
         </div>
       </div>

       ${diff ? `<div class="cs-box cs-warn" style="margin-bottom:12px">
         ${UI.icon('warning','sm')} <b>ยอดไม่ตรงกับบิล</b>
         <div style="font-size:11px">ยืนยันได้ แต่จะถูกบันทึกไว้ว่ายอดต่าง ${Utils.currency(Math.abs(diff))}
         — ตกลงกับผู้ปกครองก่อน (คืนเงิน / ใช้เป็นส่วนลดบิลหน้า / โอนเพิ่ม)</div></div>` : ''}

       <div id="cp-stmt">${stmtSection(inv)}</div>

       <div class="cs-box" style="margin-top:12px">
         ${UI.icon('event_available','sm')} <b>เมื่อยืนยันแล้วระบบจะทำให้อัตโนมัติ</b>
         <div style="font-size:11px;margin-top:2px">
           • ส่งนักเรียนเข้า roster ${enrollN||0} คลาส (โผล่ใน Sessions/Calendar ทันที)<br>
           • ตัดสต็อกหนังสือตามบิล · เข้า Revenue · ออกใบเสร็จได้</div>
       </div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-confirm-paid')">Cancel</button>
       <button class="btn btn-primary" id="cp-go" disabled onclick="bpDoConfirm('${id}')">
         ${UI.icon('check_circle','sm')} Confirm Paid → เข้าคลาส</button>`);
  };

  /* ยืนยันได้เมื่อ: จับคู่ statement แล้ว · หรือกรอกเลข ref เอง · หรือเป็นเงินสด */
  function canConfirm() {
    if (_stmtPick === 'CASH') return true;
    if (_stmtManual) return !!document.getElementById('cp-ref')?.value.trim();
    return !!_stmtPick;
  }
  window.bpToggleConfirm = function() {
    const b = document.getElementById('cp-go');
    if (b) b.disabled = !canConfirm();
  };

  window.bpDoConfirm = function(id) {
    const inv = src(id); if (!inv) return;
    if (!canConfirm()) { showToast('ต้องจับคู่ statement ก่อน','error'); return; }

    /* ผูก statement ↔ invoice (2 ทาง) — ตรวจย้อนได้ว่าเงินก้อนไหนคือบิลใบไหน */
    if (_stmtPick === 'CASH') {
      inv.paidRef = 'CASH';
      inv.paidAt  = p0(inv);
      inv.statementId = null; inv.statementManual = false;
    } else if (_stmtManual) {
      inv.paidRef = document.getElementById('cp-ref')?.value.trim() || '';
      inv.paidAt  = document.getElementById('cp-date')?.value || today();
      inv.statementId = null; inv.statementManual = true;      // ยังไม่ได้ตรวจกับ feed
    } else {
      const s = window.Bank?.match(_stmtPick, inv.id);
      if (!s) { showToast('รายการนี้ถูกจับคู่กับบิลอื่นไปแล้ว','error'); redrawStmt(id); return; }
      inv.statementId = s.id;
      inv.paidRef     = s.ref;
      inv.paidAt      = s.date;
      inv.statementManual = false;
    }
    inv.status  = 'paid';
    inv.verifiedBy = who();
    const diff = Number(inv.payslip?.amount||inv.amount) - Number(inv.amount||0);
    if (diff) inv.amountDiff = diff;                    // จ่ายเกิน/ขาด — เก็บไว้เคลียร์ทีหลัง
    log(inv, 'confirmed_paid',
      `${inv.paidAt} · ${inv.paidRef||'—'}${inv.statementManual?' (กรอกเอง — ยังไม่ตรวจกับ feed)':''}`);

    window.Billing?.consumeStock(inv);                  // ตัดสต็อกหนังสือ
    window.Billing?.addBusRoster(inv);                  // เข้า Bus roster ตามวันรับ-ส่ง
    const n = window.Billing?.enroll(inv) || 0;         // ส่งเข้า roster คลาส

    _stmtPick = null; _stmtManual = false; _stmtQ = '';
    Modal.close('modal-confirm-paid');
    refresh();
    showToast(`${inv.id} ยืนยันเงินเข้าแล้ว ✓ (${inv.paidRef})${n?` — เข้า ${n} คลาส`:''}`, 'success');
  };

  /* ── สลิปไม่ถูกต้อง → กลับไปรอสลิปใหม่ ─────────────────── */
  window.billingRejectSlip = function(id) {
    const inv = src(id); if (!inv) return;
    Modal.create('modal-slip-reject', `${UI.icon('undo')} สลิปไม่ถูกต้อง · ${inv.id}`,
      `<label class="field-label">เหตุผล (บังคับ)</label>
       <textarea id="rj-note" class="form-input" rows="3" style="width:100%"
         placeholder="เช่น สลิปเป็นของบิลอื่น / ยอดไม่ตรง / อ่านไม่ออก"></textarea>
       <div class="text-muted" style="font-size:11px;margin-top:6px">
         บิลจะกลับไปสถานะ "รอสลิป" — สลิปเดิมยังเก็บไว้ในประวัติ</div>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-slip-reject')">Cancel</button>
       <button class="btn btn-primary" onclick="bpDoReject('${id}')">ยืนยัน</button>`);
  };
  window.bpDoReject = function(id) {
    const inv = src(id); if (!inv) return;
    const note = document.getElementById('rj-note')?.value.trim();
    if (!note) { showToast('กรอกเหตุผลก่อน','error'); return; }
    (inv.rejectedSlips = inv.rejectedSlips||[]).push({ ...inv.payslip, reason:note });
    inv.payslip = null; inv.status = 'sent';
    log(inv, 'slip_rejected', note);
    Modal.close('modal-slip-reject'); refresh();
    showToast('ตีกลับสลิปแล้ว — รอสลิปใหม่จากผู้ปกครอง','success');
  };

  /* ── VOID — เก็บใบเก่าไว้เสมอ + เหตุผลบังคับ (Nock ยืนยัน) ── */
  window.billingVoid = function(id) {
    const inv = src(id); if (!inv) return;
    Modal.create('modal-void', `${UI.icon('block')} Void ใบนี้ · ${inv.id}`,
      `<div class="cs-box cs-warn" style="margin-bottom:12px">
         ${UI.icon('info','sm')} ใบที่ void <b>ไม่ถูกลบ</b> — ยังอยู่ในระบบเพื่อตรวจย้อน (audit)
       </div>
       <label class="field-label">เหตุผลที่ยกเลิก (บังคับ)</label>
       <select id="vd-reason" class="form-input" style="width:100%;margin-bottom:10px">
         <option value="">— เลือกเหตุผล —</option>
         <option>ออกบิลผิดคน</option>
         <option>ราคา/ส่วนลดผิด</option>
         <option>คอร์ส/ตารางเรียนผิด</option>
         <option>ผู้ปกครองยกเลิกการสมัคร</option>
         <option>อื่นๆ</option>
       </select>
       <label class="field-label">รายละเอียด</label>
       <textarea id="vd-note" class="form-input" rows="2" style="width:100%"
         placeholder="อธิบายเพิ่มเติม"></textarea>
       <label class="bp-inline" style="margin-top:10px">
         <input type="checkbox" id="vd-replace" checked>
         <span>สร้างใบใหม่ทดแทน (คัดลอกรายการเดิมมาแก้)</span></label>`,
      `<button class="btn btn-secondary" onclick="Modal.close('modal-void')">Cancel</button>
       <button class="btn btn-primary" onclick="bpDoVoid('${id}')">
         ${UI.icon('block','sm')} ยืนยัน Void</button>`);
  };

  window.bpDoVoid = function(id) {
    const inv = src(id); if (!inv) return;
    const reason = document.getElementById('vd-reason')?.value;
    const note   = document.getElementById('vd-note')?.value.trim();
    if (!reason) { showToast('เลือกเหตุผลก่อน','error'); return; }
    inv.status     = 'voided';
    inv.voidReason = note ? `${reason} — ${note}` : reason;
    inv.voidedBy   = who();
    inv.voidedAt   = today();
    log(inv, 'voided', inv.voidReason);

    if (document.getElementById('vd-replace')?.checked) {
      const maxNo = (DB.invoices||[]).reduce((m,i)=>{
        const n = parseInt(String(i.id).split('-').pop(),10); return isNaN(n)?m:Math.max(m,n); }, 0);
      const copy = { ...JSON.parse(JSON.stringify(inv)),
        id:`INV-2026-${String(maxNo+1).padStart(4,'0')}`,
        status:'draft', date:today(), payslip:null, paidAt:null, paidRef:null,
        voidReason:null, voidedBy:null, voidedAt:null, replacedBy:null,
        replaces:inv.id, history:[], _enrolled:false, _stockDone:false };
      DB.invoices.unshift(copy);
      inv.replacedBy = copy.id;
      log(copy, 'created_from_void', `แทน ${inv.id}`);
      Modal.close('modal-void'); refresh();
      showToast(`${inv.id} voided — สร้าง ${copy.id} เป็น Draft ทดแทนแล้ว`,'success');
      return;
    }
    Modal.close('modal-void'); refresh();
    showToast(`${inv.id} voided ✓`,'success');
  };

})();
