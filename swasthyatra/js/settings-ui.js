/**
 * MediOne — Settings & Profile UI
 * Manages the User Settings, Profile Switching (Family members), and Language preferences.
 */

class SettingsUI {
  constructor(store) {
    this.store = store;
  }

  init(uiController) {
    this.ui = uiController;
    this._patchNavigate();
    this._injectNavItem();
    this._bindGlobalEvents();
  }

  _patchNavigate() {
    const orig = this.ui._navigate.bind(this.ui);
    this.ui._navigate = (page) => {
      if (page === 'settings') {
        this.ui.currentPage = 'settings';
        location.hash = 'settings';
        const main = document.getElementById('page-content');
        main.innerHTML = '';
        this._renderPage();
        this.ui._setActiveNav();
        document.getElementById('topbar-title').textContent = this.ui.lang === 'hi' ? '⚙️ सेटिंग्स' : '⚙️ Settings';
        main.style.animation = 'slideDown 0.22s ease';
      } else {
        orig(page);
      }
    };

    const origTitle = this.ui._pageTitle.bind(this.ui);
    this.ui._pageTitle = () => {
      if (this.ui.currentPage === 'settings') return this.ui.lang === 'hi' ? '⚙️ सेटिंग्स' : '⚙️ Settings';
      return origTitle();
    };
  }

  _injectNavItem() {
    const doInject = () => {
      const navItems = document.querySelector('.nav-items');
      if (!navItems || navItems.querySelector('[data-page="settings"]')) return;
      
      const li = document.createElement('li');
      li.className = 'nav-item';
      li.innerHTML = `<button class="nav-link" data-page="settings">
        <span class="nav-icon">⚙️</span>
        ${this.ui.lang === 'hi' ? 'सेटिंग्स/प्रोफाइल' : 'Settings'}
      </button>`;
      
      navItems.appendChild(li); // add to bottom of list
      this.ui._setActiveNav();
    };
    doInject();
    const sidebar = document.getElementById('sidebar');
    if (sidebar) new MutationObserver(doInject).observe(sidebar, { childList: true, subtree: true });
  }

  _bindGlobalEvents() {
    document.addEventListener('click', e => {
      const switchBtn = e.target.closest('[data-switch-profile]');
      if (switchBtn) {
        this._switchProfile(switchBtn.dataset.switchProfile);
        return;
      }
      const editBtn = e.target.closest('[data-edit-profile]');
      if (editBtn) {
        this._editProfile(editBtn.dataset.editProfile);
        return;
      }
      const langBtn = e.target.closest('[data-lang]');
      if (langBtn) {
        const lang = langBtn.dataset.lang;
        if (this.ui.setLanguage) this.ui.setLanguage(lang);
        this._renderPage();
        return;
      }
    });

    document.addEventListener('change', e => {
      if (e.target.id === 'darkModeToggle') {
        const isDark = e.target.checked;
        localStorage.setItem('swasthyatra_dark_mode', isDark);
        document.body.classList.toggle('dark', isDark);
      }
    });
  }

  _editProfile(profileId) {
    const profiles = this.store.getProfiles();
    const p = profiles.find(x => x.patient_id === profileId);
    if (!p) return;
    const newName = prompt('Enter Profile Name:', p.name);
    if (newName && newName.trim()) {
       p.name = newName.trim();
       const newCity = prompt('Enter City:', p.city || '');
       if (newCity) p.city = newCity.trim();
       this.store.savePatient(p);
       this._renderPage();
       this.ui._toast('success', 'Profile Updated', 'Changes saved successfully.');
    }
  }

  _switchProfile(profileId) {
    // Check if it exists in store
    const profiles = this.store.getProfiles();
    const p = profiles.find(x => x.patient_id === profileId);
    if (!p) return;

    this.store.setActiveProfile(profileId);
    this.ui._toast('success', 'Profile Switched', `Now managing data for: ${p.name}`);
    
    // Reload page to reinitialize agents with new active context
    setTimeout(() => {
      location.reload();
    }, 800);
  }

  _renderPage() {
    const isHi = this.ui.lang === 'hi';
    const container = document.getElementById('page-content');
    
    // 1. Profile list
    const profiles = this.store.getProfiles();
    const activeId = this.store.getActiveProfileId();
    
    const profileHtml = profiles.map(p => {
      const isActive = p.patient_id === activeId;
      const initials = (p.name || 'User').split(' ').slice(0,2).map(w=>w[0]).join('');
      return `
        <div class="user-profile-card ${isActive ? 'active-profile' : ''}" style="display:flex;align-items:center;padding:12px;background:var(--surface);border-radius:12px;border:2px solid ${isActive ? 'var(--accent-primary)' : 'var(--border)'};margin-bottom:12px;transition:all 0.2s">
          <div style="width:48px;height:48px;border-radius:50%;background:var(--accent-secondary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:18px;margin-right:16px">${initials}</div>
          <div style="flex:1">
            <div style="font-weight:700;font-size:16px">${p.name} ${isActive ? '<span class="tag tag-primary" style="margin-left:8px">Active</span>' : ''}</div>
            <div style="font-size:12px;color:var(--text-secondary)">ABDM ID: ${p.abdm_health_id || 'N/A'} • ${p.city || 'No City'}</div>
          </div>
          ${isActive ? `<button class="btn btn-secondary btn-sm" data-edit-profile="${p.patient_id}">Edit</button>` : `<button class="btn btn-secondary btn-sm" data-switch-profile="${p.patient_id}">Switch</button>`}
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2>🧑‍👩‍👧‍👦 ${isHi ? 'प्रोफाइल और परिवार' : 'Profiles & Family'}</h2>
          <p class="page-header-sub">${isHi ? 'खाते प्रबंधित करें और भाषा बदलें' : 'Manage family members and app preferences'}</p>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div class="card">
          <div class="card-header">
            <div class="card-title">👨‍👩‍👧 Family Profiles (Multi-Patient)</div>
            <button class="btn btn-primary btn-sm" onclick="alert('Demo restriction: Cannot add more than 3 profiles in this version.')">+ Add Member</button>
          </div>
          <div style="margin-top:16px">
            ${profileHtml}
          </div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:16px;line-height:1.5">
            <strong>Architecture Note:</strong> Switching profiles updates the \`active_profile_id\` in localStorage and reloads the agent environments. All agents (Records, Adherence, Triage) will securely isolate their state to the selected active patient.
          </div>
        </div>

        <div>
          <div class="card mb-16">
            <div class="card-header">
              <div class="card-title">🌐 ${isHi ? 'भाषा' : 'Language'}</div>
            </div>
            <div style="display:flex;gap:12px;margin-top:16px">
              <button class="btn ${!isHi ? 'btn-primary' : 'btn-secondary'}" style="flex:1" data-lang="en">English</button>
              <button class="btn ${isHi ? 'btn-primary' : 'btn-secondary'}" style="flex:1" data-lang="hi">भारतीय भाषाएं</button>
            </div>
          </div>

          <div class="card mb-16">
            <div class="card-header">
              <div class="card-title">📱 App Settings</div>
            </div>
            <div class="form-grid" style="margin-top:16px">
              <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--surface-sunken);border-radius:8px">
                <span style="font-weight:600;font-size:14px">Adherence Reminders / Audio Push</span>
                <label class="switch"><input type="checkbox" checked><span class="slider round"></span></label>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;padding:12px;background:var(--surface-sunken);border-radius:8px">
                <span style="font-weight:600;font-size:14px">Dark Mode</span>
                <label class="switch"><input type="checkbox" id="darkModeToggle" ${document.body.classList.contains('dark') ? 'checked' : ''}><span class="slider round"></span></label>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

window.SettingsUI = SettingsUI;
