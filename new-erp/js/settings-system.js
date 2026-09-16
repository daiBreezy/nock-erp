/* ============================================================
   settings-system.js — Settings: System Tab
   Depends on settings.js (shell already rendered)
   ============================================================ */
(function () {

  const NOTIFICATIONS = [
    {key:'renewal_alert',     label:'Renewal alert',                    role:'Admin',   channels:['in-app','LINE'], on:true },
    {key:'new_lead',          label:'New lead notification',            role:'Admin',   channels:['in-app','LINE'], on:true },
    {key:'payslip_received',  label:'Payslip received',                 role:'Admin',   channels:['in-app'],        on:true },
    {key:'holiday_conflict',  label:'Holiday conflict warning',         role:'Admin',   channels:['in-app'],        on:true },
    {key:'summary_deadline',  label:'Summary deadline reminder',        role:'Teacher', channels:['in-app','LINE'], on:true },
    {key:'new_student',       label:'New student added to class',       role:'Teacher', channels:['in-app'],        on:true },
    {key:'session_reminder',  label:'Session starting soon (30 min)',   role:'Teacher', channels:['in-app','LINE'], on:false},
    {key:'invoice_sent',      label:'Invoice sent to parent',           role:'Parent',  channels:['LINE'],          on:true },
    {key:'receipt_sent',      label:'Receipt sent to parent',           role:'Parent',  channels:['LINE'],          on:true },
    {key:'summary_sent',      label:'Summary sent to parent',           role:'Parent',  channels:['LINE'],          on:true },
  ];

  window.renderSystemTab = function () {
    const el = document.getElementById('stab-system'); if (!el) return;
    el.innerHTML = [
      renderSysPrefs(),
      renderNotifPrefs(),
      renderData(),
    ].join('');
  };

  /* ── SYSTEM PREFERENCES ───────────────────────────────────── */
  function renderSysPrefs() {
    return `<div class="card mb-16">
      <div class="card-header"><div class="card-title">${UI.icon('tune','sm')} System Preferences</div></div>
      <div class="card-body">
        <div class="settings-row" style="margin-bottom:14px">
          <div class="settings-group">
            <label class="settings-label">Language</label>
            <select class="settings-input">
              <option selected>English</option>
              <option>ภาษาไทย</option>
            </select>
          </div>
          <div class="settings-group">
            <label class="settings-label">Timezone</label>
            <select class="settings-input">
              <option selected>Asia/Bangkok (UTC+7)</option>
              <option>Asia/Tokyo (UTC+9)</option>
              <option>UTC</option>
            </select>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-group">
            <label class="settings-label">Currency</label>
            <select class="settings-input">
              <option selected>THB (฿)</option>
              <option>USD ($)</option>
            </select>
          </div>
          <div class="settings-group">
            <label class="settings-label">Date Format</label>
            <select class="settings-input">
              <option selected>DD MMM YYYY</option>
              <option>YYYY-MM-DD</option>
              <option>MM/DD/YYYY</option>
            </select>
          </div>
        </div>
      </div>
    </div>`;
  }

  /* ── NOTIFICATION PREFERENCES ─────────────────────────────── */
  function renderNotifPrefs() {
    const roles = ['Admin','Teacher','Parent'];
    return `<div class="card mb-16">
      <div class="card-header"><div class="card-title">${UI.icon('notifications','sm')} Notification Preferences</div></div>
      <div class="card-body" style="padding:0">
        <table class="data-table">
          <thead>
            <tr>
              <th>Notification</th>
              <th>Role</th>
              <th>In-App</th>
              <th>LINE Notify</th>
              <th>Active</th>
            </tr>
          </thead>
          <tbody>
            ${roles.map(role=>{
              const items=NOTIFICATIONS.filter(n=>n.role===role);
              return items.map((n,i)=>`
                <tr>
                  ${i===0?`<td rowspan="${items.length}" style="vertical-align:middle;font-weight:600;font-size:12px;
                    background:var(--md-surface-low);color:var(--md-on-surface-variant);width:70px;text-align:center">
                    ${role}</td>`:''}
                  <td style="font-size:13px">${n.label}</td>
                  <td style="text-align:center">
                    ${n.channels.includes('in-app')
                      ? toggle(`notif-inapp-${n.key}`, true)
                      : '<span style="color:var(--md-on-surface-variant);font-size:12px">—</span>'}
                  </td>
                  <td style="text-align:center">
                    ${n.channels.includes('LINE')
                      ? toggle(`notif-line-${n.key}`, true)
                      : '<span style="color:var(--md-on-surface-variant);font-size:12px">—</span>'}
                  </td>
                  <td style="text-align:center">${toggle(`notif-on-${n.key}`, n.on)}</td>
                </tr>`).join('');
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
  }

  function toggle(id, on) {
    return `<div id="${id}" data-on="${on?'1':'0'}"
      style="width:36px;height:20px;background:${on?'var(--md-primary)':'var(--md-outline)'};
        border-radius:10px;cursor:pointer;position:relative;transition:background .2s;display:inline-block;vertical-align:middle"
      onclick="stToggleNotif('${id}',this)">
      <div style="width:16px;height:16px;background:#fff;border-radius:50%;position:absolute;top:2px;
        left:${on?'18px':'2px'};transition:left .2s"></div>
    </div>`;
  }

  window.stToggleNotif = function(id, el) {
    const on = el.dataset.on === '1';
    el.dataset.on = on ? '0' : '1';
    el.style.background = on ? 'var(--md-outline)' : 'var(--md-primary)';
    el.querySelector('div').style.left = on ? '2px' : '18px';
  };

  /* ── DATA ─────────────────────────────────────────────────── */
  function renderData() {
    return `<div class="card">
      <div class="card-header"><div class="card-title">${UI.icon('storage','sm')} Data</div></div>
      <div class="card-body">
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-secondary" onclick="showToast('Exporting data…','info')">
            ${UI.icon('upload','sm')} Export All Data</button>
          <button class="btn btn-secondary" onclick="showToast('Backup created ✓','success')">
            ${UI.icon('save','sm')} Create Backup</button>
          <button class="btn btn-secondary" style="color:var(--md-error);border-color:var(--md-error-container)"
            onclick="showToast('Contact Nock to reset data','info')">
            ${UI.icon('delete','sm')} Reset Demo Data</button>
        </div>
        <div style="margin-top:14px;padding:10px 12px;background:var(--md-surface-mid);
          border-radius:6px;font-size:11px;color:var(--md-on-surface-variant);
          border:1px solid var(--md-outline-variant)">
          NockERP v0.9 · Prototype · Data is mock/local only · No backend connected
        </div>
      </div>
    </div>`;
  }

})();
