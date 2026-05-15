/* ============================================================
   settings.js — NockERP Settings Module
   Academy info, branches, teachers, system preferences
   ============================================================ */
(function () {

  /* ── SHELL ────────────────────────────────────────────── */
  document.getElementById('view-settings').innerHTML = `
  <div class="page-header">
    <div>
      <div class="page-title">Settings</div>
      <div class="page-sub">System configuration for NockERP</div>
    </div>
    <button class="btn btn-primary btn-sm" onclick="saveSettings()">💾 Save All</button>
  </div>

  <!-- Tabs -->
  <div class="tabs" style="margin-bottom:16px">
    <div class="tab active" onclick="settingsTab('general',this)">🏫 General</div>
    <div class="tab"        onclick="settingsTab('branches',this)">📍 Branches</div>
    <div class="tab"        onclick="settingsTab('teachers',this)">👩‍🏫 Teachers</div>
    <div class="tab"        onclick="settingsTab('system',this)">⚙️ System</div>
  </div>

  <!-- General -->
  <div id="stab-general">
    <div class="card mb-16">
      <div class="card-header"><div class="card-title">Academy Info</div></div>
      <div class="card-body">
        <div class="settings-row" style="margin-bottom:14px">
          <div class="settings-group">
            <label class="settings-label">Academy Name</label>
            <input class="settings-input" value="Nock Academy">
          </div>
          <div class="settings-group">
            <label class="settings-label">Owner / Admin</label>
            <input class="settings-input" value="Admin Nock">
          </div>
        </div>
        <div class="settings-row" style="margin-bottom:14px">
          <div class="settings-group">
            <label class="settings-label">Phone</label>
            <input class="settings-input" value="02-xxx-xxxx">
          </div>
          <div class="settings-group">
            <label class="settings-label">Email</label>
            <input class="settings-input" type="email" value="admin@nockacademy.com">
          </div>
        </div>
        <div class="settings-group" style="margin-bottom:14px">
          <label class="settings-label">Address</label>
          <input class="settings-input" value="123 Sukhumvit Rd, Bangkok 10110">
        </div>
        <div class="settings-row">
          <div class="settings-group">
            <label class="settings-label">LINE Official Account</label>
            <input class="settings-input" value="@nockacademy">
          </div>
          <div class="settings-group">
            <label class="settings-label">LINE Token (API)</label>
            <input class="settings-input" type="password" value="••••••••••••••••">
          </div>
        </div>
      </div>
    </div>

    <div class="card mb-16">
      <div class="card-header"><div class="card-title">Business Rules</div></div>
      <div class="card-body">
        <div class="settings-row" style="margin-bottom:14px">
          <div class="settings-group">
            <label class="settings-label">Renewal Alert — classes remaining</label>
            <input class="settings-input" type="number" value="2" min="1" max="10">
            <div style="font-size:11px;color:#9ca3af;margin-top:4px">
              Alert triggers when student has ≤ this many classes left
            </div>
          </div>
          <div class="settings-group">
            <label class="settings-label">Urgent Alert threshold</label>
            <input class="settings-input" type="number" value="1" min="1" max="5">
          </div>
        </div>
        <div class="settings-row" style="margin-bottom:14px">
          <div class="settings-group">
            <label class="settings-label">Leave quota per month (no deduction)</label>
            <input class="settings-input" type="number" value="2">
          </div>
          <div class="settings-group">
            <label class="settings-label">Summary deadline after session (hours)</label>
            <input class="settings-input" type="number" value="24">
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-group">
            <label class="settings-label">Class duration (minutes)</label>
            <select class="settings-input">
              <option>90</option><option selected>120</option><option>150</option>
            </select>
          </div>
          <div class="settings-group">
            <label class="settings-label">Break duration (minutes)</label>
            <select class="settings-input">
              <option selected>60</option><option>30</option><option>90</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Branches -->
  <div id="stab-branches" style="display:none">
    ${CONST.BRANCHES.map((branch, bi) => `
    <div class="card mb-16">
      <div class="card-header">
        <div class="card-title">📍 ${branch}</div>
        <span class="badge badge-green">Active</span>
      </div>
      <div class="card-body">
        <div class="settings-row" style="margin-bottom:14px">
          <div class="settings-group">
            <label class="settings-label">Branch Name</label>
            <input class="settings-input" value="${branch}">
          </div>
          <div class="settings-group">
            <label class="settings-label">LINE ID</label>
            <input class="settings-input" value="@nock-${branch.toLowerCase().split(' ')[0]}">
          </div>
        </div>
        <div class="settings-row" style="margin-bottom:14px">
          <div class="settings-group">
            <label class="settings-label">Address</label>
            <input class="settings-input" value="${bi===0?'123 Sukhumvit Rd, BKK':'456 Silom Rd, BKK'}">
          </div>
          <div class="settings-group">
            <label class="settings-label">Phone</label>
            <input class="settings-input" value="${bi===0?'02-111-1111':'02-222-2222'}">
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-group">
            <label class="settings-label">Number of Rooms</label>
            <input class="settings-input" type="number" value="${bi===0?4:3}">
          </div>
          <div class="settings-group">
            <label class="settings-label">Max Students per Room</label>
            <input class="settings-input" type="number" value="8">
          </div>
        </div>
      </div>
    </div>`).join('')}
    <div style="text-align:center;padding:8px">
      <button class="btn btn-secondary" onclick="showToast('Add Branch coming soon','info')">＋ Add Branch</button>
    </div>
  </div>

  <!-- Teachers -->
  <div id="stab-teachers" style="display:none">
    ${DB.staff.map(s => {
      const rm = CONST.ROLE_META?.[s.role] || {};
      return `
    <div class="card mb-16">
      <div class="card-header">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:36px;height:36px;border-radius:50%;background:#ede9fe;color:#6366f1;
                      font-size:14px;font-weight:700;display:flex;align-items:center;justify-content:center">
            ${s.name[0]}
          </div>
          <div>
            <div style="font-size:14px;font-weight:600">${s.name}</div>
            <div style="font-size:11px;color:#9ca3af">${s.role}</div>
          </div>
        </div>
        <span class="badge ${rm.cls||'badge-blue'}">${rm.label||s.role}</span>
      </div>
      <div class="card-body">
        <div class="settings-row" style="margin-bottom:14px">
          <div class="settings-group">
            <label class="settings-label">Full Name</label>
            <input class="settings-input" value="${s.name}">
          </div>
          <div class="settings-group">
            <label class="settings-label">Subject Speciality</label>
            <input class="settings-input" value="${s.subject||'—'}">
          </div>
        </div>
        <div class="settings-row" style="margin-bottom:14px">
          <div class="settings-group">
            <label class="settings-label">Phone</label>
            <input class="settings-input" value="${s.phone||'—'}">
          </div>
          <div class="settings-group">
            <label class="settings-label">LINE ID</label>
            <input class="settings-input" value="${s.line||'—'}">
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-group">
            <label class="settings-label">Branch Assignment</label>
            <select class="settings-input">
              <option>All Branches</option>
              ${CONST.BRANCHES.map(b=>`<option ${s.branch===b?'selected':''}>${b}</option>`).join('')}
            </select>
          </div>
          <div class="settings-group">
            <label class="settings-label">Role</label>
            <select class="settings-input">
              <option ${s.role==='Teacher'?'selected':''}>Teacher</option>
              <option ${s.role==='Admin'?'selected':''}>Admin</option>
              <option ${s.role==='Manager'?'selected':''}>Manager</option>
            </select>
          </div>
        </div>
      </div>
    </div>`;
    }).join('')}
    <div style="text-align:center;padding:8px">
      <button class="btn btn-secondary" onclick="showToast('Add Staff coming soon','info')">＋ Add Staff Member</button>
    </div>
  </div>

  <!-- System -->
  <div id="stab-system" style="display:none">
    <div class="card mb-16">
      <div class="card-header"><div class="card-title">⚙️ System Preferences</div></div>
      <div class="card-body">
        <div class="settings-row" style="margin-bottom:14px">
          <div class="settings-group">
            <label class="settings-label">Language</label>
            <select class="settings-input">
              <option selected>English</option><option>ภาษาไทย</option>
            </select>
          </div>
          <div class="settings-group">
            <label class="settings-label">Timezone</label>
            <select class="settings-input">
              <option selected>Asia/Bangkok (UTC+7)</option>
              <option>Asia/Tokyo (UTC+9)</option>
            </select>
          </div>
        </div>
        <div class="settings-row">
          <div class="settings-group">
            <label class="settings-label">Currency</label>
            <select class="settings-input">
              <option selected>THB (฿)</option><option>USD ($)</option>
            </select>
          </div>
          <div class="settings-group">
            <label class="settings-label">Date Format</label>
            <select class="settings-input">
              <option selected>DD MMM YYYY</option><option>YYYY-MM-DD</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="card mb-16">
      <div class="card-header"><div class="card-title">🔔 Notification Preferences</div></div>
      <div class="card-body">
        ${[
          ['Renewal alert (LINE notify)',       true ],
          ['Summary deadline reminder',         true ],
          ['New lead notification',             true ],
          ['Invoice received (auto-detect)',    false],
          ['Attendance daily digest',           false],
        ].map(([label, on]) => `
        <div style="display:flex;justify-content:space-between;align-items:center;
                    padding:10px 0;border-bottom:1px solid #f3f4f6">
          <span style="font-size:13px;color:#374151">${label}</span>
          <div style="width:40px;height:22px;background:${on?'#6366f1':'#d1d5db'};border-radius:11px;
                      cursor:pointer;position:relative;transition:background .2s;flex-shrink:0"
               onclick="this.style.background=this.dataset.on==='1'?(this.dataset.on='0','#d1d5db'):(this.dataset.on='1','#6366f1')"
               data-on="${on?'1':'0'}">
            <div style="width:18px;height:18px;background:#fff;border-radius:50%;position:absolute;
                        top:2px;transition:left .2s;left:${on?'20px':'2px'}"></div>
          </div>
        </div>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-header"><div class="card-title">🗄️ Data</div></div>
      <div class="card-body">
        <div style="display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn btn-secondary" onclick="showToast('Exporting data…','info')">📤 Export All Data</button>
          <button class="btn btn-secondary" onclick="showToast('Backup created ✓','success')">💾 Create Backup</button>
          <button class="btn btn-secondary" style="color:#ef4444;border-color:#fecaca"
                  onclick="showToast('Contact Nock to reset data','info')">🗑️ Reset Demo Data</button>
        </div>
        <div style="margin-top:14px;padding:10px 12px;background:#f9fafb;border-radius:6px;
                    font-size:11px;color:#9ca3af;border:1px solid #f3f4f6">
          NockERP v0.9 · Prototype · Data is mock/local only · No backend connected
        </div>
      </div>
    </div>
  </div>`;

  /* ── TAB SWITCH ───────────────────────────────────────── */
  window.settingsTab = function (tab, el) {
    ['general','branches','teachers','system'].forEach(t => {
      const p = document.getElementById(`stab-${t}`);
      if (p) p.style.display = t === tab ? '' : 'none';
    });
    document.querySelectorAll('#view-settings .tab').forEach(t=>t.classList.remove('active'));
    el.classList.add('active');
  };

  window.saveSettings = function () {
    showToast('Settings saved ✓', 'success');
  };

})();
