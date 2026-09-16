/* ============================================================
   js/fin-side-panel.js — Finance shared Side Panel component
   Used by fin-requests.js + fin-expenses.js so both detail views
   share one visual language (per FINANCE-MODEL.md §15/§16):
     - same slide-over drawer shell (100%-width table underneath,
       click a row → drawer slides in from the right — Nock's
       explicit call: NOT a persistent split-panel)
     - same building blocks: section label, card, field row w/
       copy button, document gallery (thumbnail + label caption),
       and one timeline renderer shared by both the Request
       "Workflow" (fixed steps) and the Expense/Request "Audit"
       (flat historical log) sections — same visual, different data.
   Depends on: ui.js (window.UI)
   Exposes:    window.FinPanel
   ============================================================ */
(function () {
  'use strict';

  /* ── copy-to-clipboard — every payment field gets its own one-click copy.
     Kept as window.frCopy (not FinPanel.copy) so existing onclick="frCopy(...)"
     strings already embedded in fin-requests.js/fin-expenses.js keep working. ── */
  window.frCopy = function (text, label) {
    if (!text) return;
    const done = () => showToast((label ? label + ' ' : '') + 'Copied ✓', 'success');
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done).catch(done);
    else done();
  };

  const sectionLabel = t => `<div class="label" style="font-size:var(--fs-label-sm);color:var(--md-on-surface-variant);margin-bottom:6px">${t}</div>`;
  const card = html => `<div class="card card-sm" style="margin-top:var(--sp-3)">${html}</div>`;
  const copyBtn = (text, label) => text
    ? `<button class="btn btn-secondary btn-sm" onclick="frCopy('${String(text).replace(/'/g, "\\'")}','${label}')" title="Copy ${label}">${UI.icon('content_copy', 'sm')}</button>`
    : '';
  const fieldRow = (label, value, copyText) => `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:10px">
    <div><div class="label" style="font-size:var(--fs-label-sm);color:var(--md-on-surface-variant)">${label}</div>
      <div style="font-weight:600">${value || '<span class="text-muted">—</span>'}</div></div>
    ${copyText ? copyBtn(copyText, label) : ''}
  </div>`;

  /* ── Document tile — one file (or an empty "not attached yet" placeholder
     when {name,dataUrl} are both null but a label is still passed, e.g. a
     Direct Paid stage that hasn't happened yet) + optional label caption. ── */
  function docTile(item) {
    const hasFile = !!(item.dataUrl || item.name);
    let box;
    if (!hasFile) {
      box = `<div style="border:1px dashed var(--md-outline-variant);border-radius:8px;display:flex;align-items:center;justify-content:center;aspect-ratio:1;color:var(--md-on-surface-variant)">${UI.icon('cloud_off')}</div>`;
    } else if (item.dataUrl && (item.type || '').startsWith('image')) {
      box = `<div style="border:1px solid var(--md-outline-variant);border-radius:8px;overflow:hidden;aspect-ratio:1;cursor:pointer" onclick="window.open('${item.dataUrl}','_blank')">
        <img src="${item.dataUrl}" style="width:100%;height:100%;object-fit:cover;display:block"></div>`;
    } else {
      const click = item.dataUrl ? ` style="cursor:pointer" onclick="window.open('${item.dataUrl}','_blank')"` : '';
      box = `<div${click} style="border:1px solid var(--md-outline-variant);border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;aspect-ratio:1;padding:6px;text-align:center;gap:4px">
        ${UI.icon('description')}<div style="font-size:10px;color:var(--md-on-surface-variant);word-break:break-all;line-height:1.2">${item.name || 'file'}</div></div>`;
    }
    return `<div>${box}${item.label ? `<div class="text-muted" style="font-size:10px;text-align:center;margin-top:4px;font-weight:600">${item.label}</div>` : ''}</div>`;
  }
  const docGallery = items => `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">${items.map(docTile).join('')}</div>`;

  /* ── Timeline — one visual renderer shared by 2 different concepts:
     "Workflow" (Request only — fixed named steps, state: done/current/upcoming/bad,
     optionally an inline `extra` control on the current step — e.g. the file-upload
     button for "Transferred"/"Invoice Uploaded") and "Audit" (Request + Expense —
     flat historical log, always state:'done', never has `extra`).
     Same look, different data source — see FINANCE-MODEL.md §16/§18. ── */
  function timeline(items) {
    if (!items.length) return `<div class="text-muted" style="font-size:var(--fs-label-sm)">—</div>`;
    return `<div>${items.map((s, i) => {
      const isLast = i === items.length - 1;
      const color = s.state === 'bad' ? 'var(--md-error)' : s.state === 'done' ? 'var(--md-success)' : s.state === 'current' ? 'var(--md-primary)' : 'var(--md-outline-variant)';
      const icon = s.state === 'bad' ? 'cancel' : s.state === 'done' ? 'check_circle' : 'radio_button_unchecked';
      return `<div style="display:flex;gap:10px">
        <div style="display:flex;flex-direction:column;align-items:center;flex-shrink:0">
          <span style="color:${color}">${UI.icon(icon, 'sm')}</span>
          ${!isLast ? `<div style="width:2px;flex:1;min-height:22px;background:${color};margin:2px 0;opacity:${s.state === 'upcoming' ? 0.4 : 1}"></div>` : ''}
        </div>
        <div style="padding-bottom:${isLast ? '0' : '14px'};flex:1;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:8px">
          <div style="min-width:0">
            <div style="font-weight:600;font-size:var(--fs-label-md);${s.state === 'upcoming' ? 'color:var(--md-on-surface-variant)' : ''}">${s.label}</div>
            ${s.caption ? `<div class="text-muted" style="font-size:var(--fs-label-sm);margin-top:2px">${s.caption}</div>` : ''}
          </div>
          ${s.extra || ''}
        </div>
      </div>`;
    }).join('')}</div>`;
  }
  // Audit log entries ({action,by,at}) → timeline items, all 'done' (plain history, no progress state)
  function auditItems(logs, labelMap) {
    return (logs && logs.length ? logs : []).map(l => ({ label: (labelMap && labelMap[l.action]) || l.action, caption: `${l.by} · ${l.at}`, state: 'done' }));
  }

  /* ── Drawer shell — slide-over panel + backdrop, shared by both pages.
     Nock's explicit direction: table stays 100% width, click a row → this
     drawer slides in (NOT a persistent docked split-panel). ── */
  function drawer(bodyHtml, closeFnName, opts) {
    const width = (opts && opts.width) || 440;
    return `
      <div class="drawer-backdrop" onclick="${closeFnName}()" style="position:fixed;inset:0;background:rgba(0,0,0,.25);z-index:999"></div>
      <div style="position:fixed;top:0;right:0;height:100vh;width:${width}px;max-width:92vw;background:#fff;box-shadow:-4px 0 24px rgba(0,0,0,.15);z-index:1000;display:flex;flex-direction:column">
        ${bodyHtml}
      </div>`;
  }
  function drawerHeader(title, icon, closeFnName) {
    return `<div style="padding:var(--sp-4);border-bottom:1px solid var(--md-outline-variant);display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
      <div style="font-weight:700;display:flex;align-items:center;gap:8px">${UI.icon(icon, 'sm')} ${title}</div>
      <span style="cursor:pointer;color:var(--md-on-surface-variant)" onclick="${closeFnName}()">${UI.icon('close')}</span>
    </div>`;
  }
  function topMeta(leftText, badgesHtml) {
    return `<div style="display:flex;align-items:center;justify-content:space-between;gap:16px;padding-bottom:var(--sp-3);border-bottom:1px solid var(--md-outline-variant);margin-bottom:var(--sp-3)">
      <div class="text-muted" style="font-size:var(--fs-label-md)">${leftText}</div>
      <div style="display:flex;gap:8px;flex-shrink:0">${badgesHtml}</div>
    </div>`;
  }
  // Info/Logs tab strip — same markup both drawers use so switching feels identical.
  function tabStrip(tabs, active, onClickFn) {
    return `<div class="tabs" style="margin:var(--sp-3) var(--sp-4) 0;flex-shrink:0">
      ${tabs.map(t => `<div class="tab ${t.key === active ? 'active' : ''}" onclick="${onClickFn}('${t.key}')">${t.label}</div>`).join('')}
    </div>`;
  }

  window.FinPanel = {
    sectionLabel, card, fieldRow, copyBtn,
    docTile, docGallery,
    timeline, auditItems,
    drawer, drawerHeader, topMeta, tabStrip,
  };

})();
