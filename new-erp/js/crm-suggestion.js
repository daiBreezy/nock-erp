/* ============================================================
   crm-suggestion.js — Class Suggestion Engine for CRM Forms
   Called from crm-forms.js after modal creation
   ============================================================ */
(function () {

  /* ── GRADE INFERENCE ──────────────────────────────────── */
  function inferGrade(age) {
    if (!age) return '';
    const n = parseInt(age) - 6;              // Thai school: age 7 = ป.1 → offset 6
    if (n >= 1 && n <= 6) return `ป.${n}`;
    if (n >= 7 && n <= 9) return `ม.${n - 6}`;
    return '';
  }

  /* ── SCORING ALGORITHM ────────────────────────────────── */
  function scoreSessions(lead, subjectOverride, gradeOverride) {
    const subject = subjectOverride || lead?.course || '';
    const grade   = gradeOverride   || inferGrade(lead?.age) || '';
    const branch  = 'Sukhumvit';              // leads default to main branch
    const getSlot = id => CONST.TIME_SLOTS.find(s => s.id === id);

    return DB.sessions
      .filter(s => s.state === 'upcoming')
      .map(s => {
        let score = 0;
        const tags = [];

        /* Subject match — highest weight */
        if (s.subject === subject) {
          score += 3;
          tags.push({ ok:true, text:'Subject ✓' });
        } else {
          tags.push({ ok:false, text:s.subject });
        }

        /* Grade match */
        if (grade && s.grade === grade) {
          score += 2;
          tags.push({ ok:true, text:'Grade ✓' });
        } else if (grade) {
          tags.push({ ok:false, text:s.grade||'Grade?' });
        }

        /* Branch match */
        if (s.branch === branch) {
          score += 2;
          tags.push({ ok:true, text:s.branch+' ✓' });
        } else {
          tags.push({ ok:false, text:s.branch });
        }

        /* Available spots */
        const max   = s.maxStudents || 6;
        const spots = max - s.studentNames.length;
        if (spots >= 3)      { score += 2; tags.push({ ok:true,  text:`${spots}/${max} spots` }); }
        else if (spots >= 1) { score += 1; tags.push({ ok:true,  text:`${spots}/${max} spots` }); }
        else                 {             tags.push({ ok:false, text:'Full' }); }

        return { s, score, spots, tags, slot: getSlot(s.slotId) };
      })
      .filter(x => x.spots > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  /* ── RENDER SUGGESTION PANEL ──────────────────────────── */
  window.initSuggestions = function (leadId, subjectOverride, gradeOverride) {
    const panel = document.getElementById('suggest-panel');
    if (!panel) return;
    const lead = DB.leads.find(l => l.id === leadId);
    if (!lead) { panel.innerHTML = ''; return; }

    if (!window._selectedSuggestions) window._selectedSuggestions = {};

    const scored  = scoreSessions(lead, subjectOverride, gradeOverride);
    const grade   = gradeOverride   || inferGrade(lead.age);
    const subject = subjectOverride || lead.course || '—';

    /* Empty state */
    if (!scored.length) {
      panel.innerHTML = `
      <div class="modal-section">
        <div class="modal-section-title">${UI.icon('auto_awesome','sm')} Suggested Classes
          <span class="text-muted" style="font-size:11px;font-weight:400;margin-left:auto">${subject}${grade?' · '+grade:''}</span>
        </div>
        <div style="padding:12px 14px;background:var(--md-surface-low);border-radius:8px;font-size:12px;
                    color:var(--md-on-surface-variant);display:flex;align-items:center;gap:10px">
          ${UI.icon('search_off','sm')} ไม่มีคลาสที่ตรงกัน
          <button class="btn btn-secondary btn-sm" style="margin-left:auto" onclick="Modal.close('modal-send-form');showView('calendar');setTimeout(()=>calOpenCreateClass(),300)">
            ${UI.icon('add','sm')} Create Class
          </button>
        </div>
      </div>`;
      return;
    }

    const RANK = [
      { label:'Best Match', cls:'badge-green'  },
      { label:'Good',       cls:'badge-green'  },
      { label:'Fair',       cls:'badge-yellow' },
      { label:'Other',      cls:'badge-gray'   },
      { label:'Other',      cls:'badge-gray'   },
    ];
    const COL_MAP = {
      green:'var(--md-success)', yellow:'var(--md-warning)',
      orange:'var(--clr-on-science)', blue:'var(--md-primary)',
      purple:'var(--clr-on-grammar)',
    };

    panel.innerHTML = `
    <div class="modal-section">
      <div class="modal-section-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>${UI.icon('auto_awesome','sm')} Suggested Classes</span>
        <span class="text-muted" style="font-size:11px;font-weight:400">${subject}${grade?' · '+grade:''}</span>
      </div>
      <div class="text-muted" style="font-size:11px;margin-bottom:10px">
        ${UI.icon('info','sm')} System ให้คะแนนตาม Subject · Grade · Branch · ที่ว่าง — เลือกที่จะส่งให้ Parent
      </div>
      <div style="display:flex;flex-direction:column;gap:7px" id="suggest-cards">
        ${scored.map((item, i) => _cardHtml(item, i, RANK, COL_MAP)).join('')}
      </div>
      <div style="margin-top:9px;display:flex;justify-content:space-between;align-items:center">
        <span id="suggest-count-label" class="text-muted" style="font-size:11px">ยังไม่ได้เลือก class</span>
        <button class="btn btn-secondary btn-sm"
                onclick="event.stopPropagation();Modal.close('modal-send-form');showView('calendar');setTimeout(()=>calOpenCreateClass(),300)">
          ${UI.icon('add','sm')} Create New Class
        </button>
      </div>
    </div>`;
  };

  /* ── SINGLE CARD HTML ─────────────────────────────────── */
  function _cardHtml(item, i, RANK, COL_MAP) {
    const { s, score, spots, tags, slot } = item;
    const isSel  = !!(window._selectedSuggestions||{})[s.id];
    const color  = COL_MAP[s.color] || 'var(--md-primary)';
    const rank   = RANK[i] || RANK[3];
    const teacher = s.teacher.split(',').map(t=>t.trim().replace('Kru ','')).join(' + ');
    return `<div id="sug-${s.id}"
      style="display:flex;align-items:stretch;
             border:2px solid ${isSel?'var(--md-primary)':'var(--md-outline-variant)'};
             border-radius:10px;overflow:hidden;cursor:pointer;transition:all .15s;
             background:${isSel?'var(--md-primary-container)':'var(--md-surface-lowest)'}"
      onclick="toggleSuggestion('${s.id}')">
      <div style="width:4px;background:${color};flex-shrink:0"></div>
      <div style="flex:1;padding:9px 11px;min-width:0">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;flex-wrap:wrap">
          <span class="badge ${rank.cls}" style="font-size:9px">${rank.label}</span>
          <strong style="font-size:12px;color:var(--md-on-surface)">${Utils.subjectLabel(s)}</strong>
          <span class="text-muted" style="font-size:10px;margin-left:auto">Score ${score}/9</span>
        </div>
        <div style="font-size:11px;color:var(--md-on-surface-variant);margin-bottom:6px">
          ${UI.icon('person','sm')}Kru ${teacher} ·
          ${slot?slot.start+'–'+slot.end:'—'} ·
          ${s.date} · ${s.room} · ${s.branch}
        </div>
        <div style="display:flex;gap:4px;flex-wrap:wrap">
          ${tags.map(t=>`<span style="font-size:10px;padding:1px 7px;border-radius:10px;
            background:${t.ok?'var(--md-success-container)':'var(--md-surface-mid)'};
            color:${t.ok?'var(--md-on-success-container)':'var(--md-on-surface-variant)'}">${t.text}</span>`).join('')}
        </div>
      </div>
      <div style="display:flex;align-items:center;padding:0 12px;flex-shrink:0">
        <div id="sug-chk-${s.id}"
          style="width:20px;height:20px;border-radius:4px;
                 border:2px solid ${isSel?'var(--md-primary)':'var(--md-outline-variant)'};
                 background:${isSel?'var(--md-primary)':'transparent'};
                 display:flex;align-items:center;justify-content:center;
                 color:var(--md-on-primary);font-size:13px;font-weight:700">
          ${isSel?'✓':''}
        </div>
      </div>
    </div>`;
  }

  /* ── TOGGLE SELECTION ─────────────────────────────────── */
  window.toggleSuggestion = function (sessionId) {
    if (!window._selectedSuggestions) window._selectedSuggestions = {};
    window._selectedSuggestions[sessionId] = !window._selectedSuggestions[sessionId];
    const sel = window._selectedSuggestions[sessionId];

    /* Update card style without full re-render */
    const card = document.getElementById(`sug-${sessionId}`);
    if (card) {
      card.style.borderColor = sel ? 'var(--md-primary)' : 'var(--md-outline-variant)';
      card.style.background  = sel ? 'var(--md-primary-container)' : 'var(--md-surface-lowest)';
    }
    const chk = document.getElementById(`sug-chk-${sessionId}`);
    if (chk) {
      chk.style.background  = sel ? 'var(--md-primary)' : 'transparent';
      chk.style.borderColor = sel ? 'var(--md-primary)' : 'var(--md-outline-variant)';
      chk.textContent       = sel ? '✓' : '';
    }

    _refreshSendBtn();
    _refreshCountLabel();
  };

  /* ── HELPERS ──────────────────────────────────────────── */
  function _selectedCount() {
    return Object.values(window._selectedSuggestions||{}).filter(Boolean).length;
  }

  function _refreshCountLabel() {
    const n   = _selectedCount();
    const lbl = document.getElementById('suggest-count-label');
    if (!lbl) return;
    lbl.textContent = n > 0
      ? `${n} class option${n>1?'s':''} selected — Admin จะส่งให้ Parent เลือก`
      : 'ยังไม่ได้เลือก class';
    lbl.style.color = n > 0 ? 'var(--md-primary)' : 'var(--md-on-surface-variant)';
    lbl.style.fontWeight = n > 0 ? '600' : '400';
  }

  function _refreshSendBtn() {
    const n   = _selectedCount();
    const btn = document.querySelector('#modal-send-form .modal-footer .btn-primary');
    if (!btn) return;
    btn.innerHTML = n > 0
      ? `${UI.icon('send','sm')} ส่ง ${n} Class Option${n>1?'s':''} via LINE →`
      : `${UI.icon('send','sm')} Send via LINE →`;
  }

  /* ── EXPOSE INFERGRADE FOR crm-forms.js ──────────────── */
  window._inferLeadGrade = inferGrade;

  /* ── WIZARD SYNC: Subject/Grade dropdowns → re-score ── */
  window.sfUpdateSubjectGrade = function () {
    if (!window._sf) return;
    window._sf.subject = document.getElementById('sf-subject')?.value || '';
    window._sf.grade   = document.getElementById('sf-grade')?.value   || '';
    window.initSuggestions(window._sf.leadId, window._sf.subject, window._sf.grade);
  };

})();
