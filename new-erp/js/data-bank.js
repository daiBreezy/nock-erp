/* ============================================================
   data-bank.js — window.Bank + DB.bankStatements
   Mock KBiz statement feed · ใช้จับคู่สลิป ↔ เงินเข้าบัญชีจริง

   ทำไมต้องมี: เดิม Admin เปิด KBiz ดูเอง แล้วพิมพ์เลข ref มือ (หรือไม่พิมพ์เลย)
   → ตรวจย้อนไม่ได้ว่าเงินก้อนไหนคือบิลใบไหน · เสี่ยงจับคู่ซ้ำ/จับผิดใบ
   ⭐ ที่นี่จำลอง statement feed จริง แล้วผูก 2 ทาง:
      invoice.statementId ↔ statement.matchedInvoiceId  (1 statement = 1 invoice)

   ⚠️ prototype: ไม่มี API จริง — Bank.sync() จำลองการดึงรายการจาก KBiz
   ============================================================ */
(function () {

  /* บัญชีรับเงินต่อสาขา (ของจริงมาจาก Finance ▸ Settings ▸ Bank Accounts) */
  const ACCOUNTS = {
    'Sukhumvit': { bank:'KBank', no:'059-1-61672-6', name:'Nock Academy Co., Ltd.' },
    'Silom':     { bank:'KBank', no:'059-8-42310-1', name:'Nock Academy Co., Ltd.' },
    'Bang-Na':   { bank:'KBank', no:'059-3-77821-4', name:'Nock Academy Co., Ltd.' },
  };
  const acctFor = b => ACCOUNTS[b] || ACCOUNTS['Sukhumvit'];

  const pad = (n,w) => String(n).padStart(w,'0');
  const d2  = s => String(s||'').replace(/-/g,'').slice(2);      // 2026-07-22 → 260722

  let _seq = 0;
  function makeRef(dateStr) { return `KB${d2(dateStr)}${pad(++_seq, 4)}`; }

  /* ชื่อผู้โอนแบบที่ขึ้นใน statement จริง — ตัวย่อ ไม่ใช่ชื่อเต็มในระบบ */
  function payerFrom(inv) {
    const stu = (DB.students||[]).find(s => s.id === inv.studentId);
    const fam = (DB.families||[]).find(f => f.id === inv.familyId);
    const raw = (fam?.name || stu?.family || stu?.name || 'PARENT').replace(/\s*Family$/i,'');
    const p   = raw.split(/\s+/);
    return (p[p.length-1] || raw).toUpperCase() + ' ' + (p[0]||'X')[0].toUpperCase() + '.';
  }
  const rnd = (seed) => { const x = Math.sin(seed) * 10000; return x - Math.floor(x); };

  /* ── SEED: สร้าง statement จากบิลที่รอเงิน + รายการรบกวน ─── */
  function seed() {
    const out = [];
    const invs = (DB.invoices||[]).filter(i =>
      ['sent','pending','pending_verification','submitted'].includes(i.status));

    invs.forEach((inv, k) => {
      const a = acctFor(inv.branch);
      const day = inv.date || '2026-07-20';
      /* 80% ของบิลที่รอ = เงินเข้าแล้วจริง (ที่เหลือคือ "ยังไม่เข้า" ให้ทดสอบเคสไม่เจอ) */
      if (rnd(k+1) > 0.2) out.push({
        id: 'stm-' + pad(out.length+1, 4),
        ref: makeRef(day),
        date: day,
        time: `${pad(9 + (k*3)%9, 2)}:${pad((k*17)%60, 2)}`,
        amount: inv.amount,
        branch: inv.branch,
        account: `${a.bank} ${a.no}`,
        channel: 'Transfer',
        payerName: payerFrom(inv),
        payerAcct: 'x-' + pad(1000 + (k*137)%8999, 4),
        memo: '',
        matchedInvoiceId: null,
      });
    });

    /* รายการรบกวน — เงินเข้าที่ไม่ตรงบิลไหนเลย (ของจริงมีเสมอ) */
    [['2026-07-21','10:14',3500,'Sukhumvit','CHAIYO S.'],
     ['2026-07-22','16:41',7200,'Silom','WONGSA T.'],
     ['2026-07-23','08:55',900,'Sukhumvit','LERTKUL N.']].forEach(([date,time,amount,branch,payer]) => {
      const a = acctFor(branch);
      out.push({ id:'stm-'+pad(out.length+1,4), ref:makeRef(date), date, time, amount, branch,
        account:`${a.bank} ${a.no}`, channel:'Transfer', payerName:payer,
        payerAcct:'x-'+pad(2000+out.length*13,4), memo:'', matchedInvoiceId:null });
    });

    /* บิลที่ paid ไปแล้วก่อนมีระบบนี้ → mark ว่าจับคู่ย้อนหลังไม่ได้ (ไม่ต้องสร้าง line) */
    return out.sort((a,b) => (b.date+b.time).localeCompare(a.date+a.time));
  }

  DB.bankStatements = seed();

  /* ── MATCHING ────────────────────────────────────────────── */
  const byId    = id => (DB.bankStatements||[]).find(s => s.id === id) || null;
  const byRef   = ref => (DB.bankStatements||[]).find(s => s.ref === ref) || null;
  const forInv  = invId => (DB.bankStatements||[]).find(s => s.matchedInvoiceId === invId) || null;
  const unmatched = () => (DB.bankStatements||[]).filter(s => !s.matchedInvoiceId);

  const dayDiff = (a,b) => Math.round(
    (new Date(a+'T12:00:00') - new Date(b+'T12:00:00')) / 86400000);

  /* รายการที่น่าจะใช่สำหรับบิลใบนี้ — เรียงคะแนนมากไปน้อย
     ยอดตรงเป๊ะ + วันใกล้กัน + สาขาเดียวกัน = คะแนนสูง */
  function candidatesFor(inv, opts = {}) {
    if (!inv) return [];
    const want = Number(inv.payslip?.amount || inv.amount || 0);
    const when = inv.payslip?.transferDate || inv.date || new Date().toISOString().slice(0,10);
    const q    = (opts.q || '').trim().toLowerCase();

    return unmatched()
      .map(s => {
        const dd    = Math.abs(dayDiff(s.date, when));
        const exact = s.amount === want;
        let score = 0;
        if (exact)              score += 100;
        else if (Math.abs(s.amount - want) <= want * 0.05) score += 40;   // ต่างไม่เกิน 5%
        if (s.branch === inv.branch) score += 20;
        score += Math.max(0, 20 - dd * 4);                                 // ยิ่งวันใกล้ยิ่งดี
        return { ...s, _score:score, _exact:exact, _dayDiff:dd, _diff:s.amount - want };
      })
      .filter(s => q
        ? (s.ref + s.payerName + s.amount + s.date).toLowerCase().includes(q)
        : s._score > 0)
      .sort((a,b) => b._score - a._score || (b.date+b.time).localeCompare(a.date+a.time))
      .slice(0, opts.limit || 8);
  }

  function match(stmtId, invId) {
    const s = byId(stmtId); if (!s) return null;
    if (s.matchedInvoiceId && s.matchedInvoiceId !== invId) return null;   // กันจับคู่ซ้ำ
    const prev = forInv(invId);
    if (prev && prev.id !== stmtId) prev.matchedInvoiceId = null;          // ย้ายการจับคู่
    s.matchedInvoiceId = invId;
    return s;
  }
  function unmatch(invId) {
    const s = forInv(invId);
    if (s) s.matchedInvoiceId = null;
    return s;
  }

  /* ── SYNC (mock) — จำลองการดึงรายการใหม่จาก KBiz ─────────
     ของจริง = เรียก API/อ่านไฟล์ statement · ที่นี่สร้าง line ให้บิลที่ยังไม่มีเงินเข้า */
  function sync() {
    const pend = (DB.invoices||[]).filter(i =>
      ['sent','pending','pending_verification','submitted'].includes(i.status) && !forInv(i.id));
    let added = 0;
    pend.forEach(inv => {
      const has = unmatched().some(s => s.amount === Number(inv.payslip?.amount || inv.amount));
      if (has) return;
      const a = acctFor(inv.branch);
      const date = inv.payslip?.transferDate || new Date().toISOString().slice(0,10);
      DB.bankStatements.unshift({
        id:'stm-'+pad(DB.bankStatements.length+1,4), ref:makeRef(date), date,
        time:new Date().toTimeString().slice(0,5),
        amount:Number(inv.payslip?.amount || inv.amount), branch:inv.branch,
        account:`${a.bank} ${a.no}`, channel:'Transfer', payerName:payerFrom(inv),
        payerAcct:'x-'+pad(3000+DB.bankStatements.length*7,4), memo:'', matchedInvoiceId:null,
      });
      added++;
    });
    return added;
  }

  window.Bank = { ACCOUNTS, acctFor, byId, byRef, forInvoice:forInv, unmatched,
                  candidatesFor, match, unmatch, sync };

})();
