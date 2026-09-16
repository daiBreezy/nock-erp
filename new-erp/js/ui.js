/* ============================================================
   js/ui.js — NockERP Shared UI Component Library
   Depends on: app.js (window.Utils)
   Exposes:    window.UI
   All render functions return HTML strings using md3.css classes.
   RULE: Every module MUST use UI.* — no inline style overrides.
   ============================================================ */
(function () {
  'use strict';

  window.UI = {

    /* ── Icons ─────────────────────────────────────────────────
       Usage: UI.icon('home') | UI.icon('edit', 'sm')
       Sizes: sm(16) md(20) lg(24) xl(32) — default md        */
    icon(name, size) {
      const s = (size && size !== 'md') ? ` mdi-${size}` : '';
      return `<span class="mdi${s}">${name}</span>`;
    },

    /* ── Avatar ─────────────────────────────────────────────────
       Usage: UI.avatar('NK') | UI.avatar('NK','lg')
       Sizes: sm md lg xl                                      */
    // color: optional custom bg color (hex/css) — overrides md3 default
    avatar(initials, size, color) {
      const style = color ? ` style="background:${color}"` : '';
      return `<div class="avatar avatar-${size || 'md'}"${style}>${initials}</div>`;
    },

    /* ── Badge ──────────────────────────────────────────────────
       Usage: UI.badge('Active','green') | UI.badge('2 left','red')
       Colors: green yellow red blue purple orange gray teal   */
    badge(text, color) {
      return `<span class="badge badge-${color || 'gray'}">${text}</span>`;
    },

    /* ── Chip list (max N visible, +rest badge) ─────────────────
       chips: string[] | {label, cls}[]
       Delegates to Utils.chipList for backward compat          */
    chipList(chips, max) {
      return Utils.chipList(chips, max);
    },

    /* ── More-menu (primary btn + ⋯ overflow) ───────────────────
       Delegates to Utils.moreMenu for backward compat           */
    moreMenu(id, actions) {
      return Utils.moreMenu(id, actions);
    },

    /* ── Page Header ────────────────────────────────────────────
       UI.pageHeader('Students','24 active', '<button>…</button>')
       Renders .page-header with title, subtitle, action slot   */
    pageHeader(title, sub, actions) {
      return `
      <div class="page-header">
        <div>
          <div class="page-title">${title}</div>
          ${sub ? `<div class="page-sub">${sub}</div>` : ''}
        </div>
        ${actions
          ? `<div style="display:flex;gap:8px;align-items:center">${actions}</div>`
          : ''}
      </div>`;
    },

    /* ── Section Title ──────────────────────────────────────────
       UI.sectionTitle('Invoice History', addBtn)               */
    sectionTitle(text, action) {
      return `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div class="section-title" style="margin-bottom:0">${text}</div>
        ${action || ''}
      </div>`;
    },

    /* ── KPI Grid ───────────────────────────────────────────────
       cards: [{icon, label, value, sub, subColor, color}]
       color (icon bg): '' | 'success' | 'warning' | 'error' | 'tertiary'
       subColor: 'up' | 'down'
       UI.kpiGrid([{icon:'school',label:'Students',value:24,sub:'+2 this week',subColor:'up'}])  */
    kpiGrid(cards) {
      const items = cards.map(c => `
        <div class="kpi-card">
          <div class="kpi-icon ${c.color || ''}">${UI.icon(c.icon)}</div>
          <div class="kpi-label">${c.label}</div>
          <div class="kpi-value">${c.value}</div>
          ${c.sub ? `<div class="kpi-change ${c.subColor || ''}">${c.sub}</div>` : ''}
        </div>`).join('');
      return `<div class="kpi-grid">${items}</div>`;
    },

    /* ── Filter Bar ─────────────────────────────────────────────
       items: chip | search | select objects
       Chip:   {label, active, onclick}
       Search: {type:'search', placeholder, id, oninput}
       Select: {type:'select', options:[{value,label,selected}], onchange}
       UI.filterBar([
         {type:'search', placeholder:'Search…', id:'s-search'},
         {label:'All',   active:true, onclick:"filterStudents('all')"},
         {label:'Active',active:false,onclick:"filterStudents('active')"},
       ])                                                        */
    filterBar(items) {
      const html = items.map(item => {
        if (item.type === 'search') {
          return `<input type="text" class="form-input"
            style="height:32px;font-size:var(--fs-label-md);min-width:180px"
            placeholder="${item.placeholder || 'Search…'}"
            ${item.id ? `id="${item.id}"` : ''}
            ${item.oninput ? `oninput="${item.oninput}"` : ''}>`;
        }
        if (item.type === 'select') {
          const opts = (item.options || []).map(o =>
            `<option value="${o.value}" ${o.selected ? 'selected' : ''}>${o.label}</option>`
          ).join('');
          return `<select class="tc-select" ${item.onchange ? `onchange="${item.onchange}"` : ''}>${opts}</select>`;
        }
        return `<div class="filter-chip ${item.active ? 'active' : ''}"
          ${item.onclick ? `onclick="${item.onclick}"` : ''}>${item.label}</div>`;
      }).join('');
      return `<div class="filter-bar">${html}</div>`;
    },

    /* ── Empty State ────────────────────────────────────────────
       UI.emptyState('search_off','No results','Try adjusting the filter') */
    emptyState(iconName, title, sub) {
      return `
      <div style="text-align:center;padding:48px 24px;color:var(--md-on-surface-variant)">
        <div style="margin-bottom:12px">${UI.icon(iconName, 'xl')}</div>
        <div style="font-size:var(--fs-title-sm);font-weight:600;
          color:var(--md-on-surface);margin-bottom:4px">${title}</div>
        ${sub ? `<div style="font-size:var(--fs-body-sm)">${sub}</div>` : ''}
      </div>`;
    },

    /* ── Card wrapper ────────────────────────────────────────────
       UI.card(innerHtml)
       UI.card(innerHtml,{variant:'outlined'})
       UI.card(innerHtml,{variant:'sm', style:'margin-top:8px'})
       variant: '' | 'filled' | 'outlined' | 'sm'               */
    card(content, opts) {
      opts = opts || {};
      const variant = opts.variant ? ` card-${opts.variant}` : '';
      const style   = opts.style   ? ` style="${opts.style}"`  : '';
      return `<div class="card${variant}"${style}>${content}</div>`;
    },

    /* ── Table ──────────────────────────────────────────────────
       cols: [{label, width?, align?}]
       bodyHtml: raw <tr>…</tr> string (built by caller)
       opts: {emptyMsg?, noPad?}
       Usage:
         const rows = data.map(d => `<tr class="tr-click" onclick="…">
           <td>…</td></tr>`).join('');
         UI.table(cols, rows, {emptyMsg:'No invoices yet'})      */
    table(cols, rows, opts) {
      opts = opts || {};
      const thead = `<thead><tr>${cols.map(c => {
        const w = c.width  ? `width:${c.width};`        : '';
        const a = c.align  ? `text-align:${c.align};`   : '';
        return `<th style="${w}${a}">${c.label}</th>`;
      }).join('')}</tr></thead>`;

      const id = opts.tbodyId ? ` id="${opts.tbodyId}"` : '';
      const tbody = rows
        ? `<tbody${id}>${rows}</tbody>`
        : `<tbody${id}><tr><td colspan="${cols.length}" style="text-align:center;
            padding:32px;color:var(--md-on-surface-variant)">
            ${opts.emptyMsg || 'No data'}</td></tr></tbody>`;

      return `<div class="card">
        <table>${thead}${tbody}</table>
      </div>`;
    },

    /* ── Info Grid (2-col details inside modals) ────────────────
       items: [{label, value}]
       UI.infoGrid([{label:'Branch',value:'Sukhumvit'},{label:'Grade',value:'ป.5'}]) */
    infoGrid(items, cols) {
      cols = cols || 2;
      const cells = items.map(i => `
        <div class="info-item">
          <div class="label">${i.label}</div>
          <div>${i.value || '<span class="text-muted">—</span>'}</div>
        </div>`).join('');
      return `<div class="info-grid" style="grid-template-columns:repeat(${cols},1fr)">${cells}</div>`;
    },

    /* ── Progress bar ────────────────────────────────────────────
       UI.progress(75)            → blue 75%
       UI.progress(75,'success')  → green
       UI.progress(10,'error')    → red                         */
    progress(pct, color) {
      return `<div class="progress">
        <div class="progress-fill${color ? ' ' + color : ''}" style="width:${Math.min(100, pct)}%"></div>
      </div>`;
    },

    /* ── Stat Row (label · value inline) ────────────────────────
       For compact metric rows inside cards/modals              */
    statRow(label, value, valueClass) {
      return `<div style="display:flex;align-items:center;justify-content:space-between;
        padding:6px 0;border-bottom:1px solid var(--md-outline-variant)">
        <span style="font-size:var(--fs-body-sm);color:var(--md-on-surface-variant)">${label}</span>
        <span style="font-size:var(--fs-body-sm);font-weight:600;
          color:var(--md-on-surface)" class="${valueClass || ''}">${value}</span>
      </div>`;
    },

  }; // end window.UI

})();
