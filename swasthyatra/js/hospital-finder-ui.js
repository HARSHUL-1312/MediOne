/**
 * MediOne — Hospital Finder UI (Agent 4)
 * Renders facility search page with filter bar, mini-map with pins,
 * facility cards with action buttons, and auto-triggers from triage results.
 *
 * Depends on: hospital-finder-engine.js, ui-controller.js
 */

class HospitalFinderUI {
  constructor(finderEngine, healthStore) {
    this.engine      = finderEngine;
    this.healthStore = healthStore;
    this._lastResults = [];
    this._triageContext = null; // set when navigated from triage
    this._filters = {
      facilityType: '',
      specialist: '',
      urgency: '',
      preference: '',
    };
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  init(uiController) {
    this.ui = uiController;
    this._patchNavigate();
    this._injectNavItem();
    this._bindGlobalEvents();
  }

  _patchNavigate() {
    const orig = this.ui._navigate.bind(this.ui);
    this.ui._navigate = (page) => {
      if (page === 'hospitals') {
        this.ui.currentPage = 'hospitals';
        location.hash = 'hospitals';
        const main = document.getElementById('page-content');
        main.innerHTML = '';
        this._renderPage();
        this.ui._setActiveNav();
        document.getElementById('topbar-title').textContent =
          this.ui.lang === 'hi' ? '🏥 अस्पताल खोजें' : '🏥 Find Hospitals';
        main.style.animation = 'slideDown 0.22s ease';
      } else {
        orig(page);
      }
    };
    const origTitle = this.ui._pageTitle.bind(this.ui);
    this.ui._pageTitle = () => {
      if (this.ui.currentPage === 'hospitals')
        return this.ui.lang === 'hi' ? '🏥 अस्पताल खोजें' : '🏥 Find Hospitals';
      return origTitle();
    };
  }

  _injectNavItem() {
    const doInject = () => {
      const navItems = document.querySelector('.nav-items');
      if (!navItems || navItems.querySelector('[data-page="hospitals"]')) return;
      const li = document.createElement('li');
      li.className = 'nav-item';
      li.innerHTML = `<button class="nav-link" data-page="hospitals">
        <span class="nav-icon">🏥</span>
        ${this.ui.lang === 'hi' ? 'अस्पताल खोजें' : 'Find Hospital'}
      </button>`;
      // Insert after Symptom Check
      const triageNav = navItems.querySelector('[data-page="triage"]')?.closest('.nav-item');
      if (triageNav?.nextSibling) {
        navItems.insertBefore(li, triageNav.nextSibling);
      } else {
        navItems.appendChild(li);
      }
      this.ui._setActiveNav();
    };
    doInject();
    const sidebar = document.getElementById('sidebar');
    if (sidebar) new MutationObserver(doInject).observe(sidebar, { childList: true, subtree: true });
  }

  _bindGlobalEvents() {
    document.addEventListener('click', e => {
      if (e.target.closest('#hfSearchBtn')) { this._handleSearch(); return; }
      // "Find Hospitals" button from triage risk cards
      const findBtn = e.target.closest('[data-find-hospitals]');
      if (findBtn) { this._handleTriageFindClick(findBtn.dataset.findHospitals); return; }
    });
  }

  // ── Called from app.js when triage:log fires ─────────────────────────────
  setTriageContext(triageResult) {
    this._triageContext = triageResult;
  }

  // ── Page Renderer ─────────────────────────────────────────────────────────
  _renderPage() {
    const isHi    = this.ui.lang === 'hi';
    const loc     = this.engine.getLocation();
    const container = document.getElementById('page-content');

    // If we have triage context, auto-search
    if (this._triageContext) {
      this._lastResults = this.engine.searchFromTriage(this._triageContext);
      // Pre-fill filters from context
      this._filters.urgency = this._triageContext.risk === 'emergency' ? 'emergency' : 'today';
    } else if (this._lastResults.length === 0) {
      // Default search — show all nearby
      this._lastResults = this.engine.search({ maxResults: 8 });
    }

    const results = this._lastResults;
    const triageCtx = this._triageContext;

    // Location bar
    const locBar = `
      <div class="hf-location-bar">
        <div class="hf-loc-dot"></div>
        <div class="hf-loc-text">
          📍 ${isHi ? 'स्थान:' : 'Location:'}
          <strong>${loc?.area || 'Central Delhi'}, ${loc?.city || 'New Delhi'}</strong>
        </div>
        <button class="hf-loc-change" onclick="
          window._sw?.hospitals?.engine?.requestGeolocation().then(() => {
            window._sw?.hospitals?.ui?._renderPage();
          });
        ">📍 ${isHi ? 'स्थान अपडेट करें' : 'Update Location'}</button>
      </div>`;

    // Triage context banner
    const triageBanner = triageCtx ? `
      <div class="hf-triage-link">
        <span style="font-size:20px">${triageCtx.risk === 'emergency' ? '🚨' : '🩺'}</span>
        <div>
          <strong>${isHi ? 'ट्राइज से खोज' : 'Searching based on your triage result'}:</strong>
          ${triageCtx.specialist || ''} • ${triageCtx.facility || ''}
          ${triageCtx.risk === 'emergency'
            ? `<div style="color:var(--accent-danger);font-weight:700;margin-top:2px">${isHi ? '🚨 आपातकालीन सुविधाएं पहले दिखाई गई हैं' : '🚨 Emergency facilities shown first'}</div>`
            : ''}
        </div>
      </div>` : '';

    // Emergency banner
    const emergencyBanner = (triageCtx?.risk === 'emergency' || this._filters.urgency === 'emergency') ? `
      <div class="hf-emergency-banner">
        <div class="hf-emergency-icon">🚨</div>
        <div>
          <div class="hf-emergency-title">${isHi ? 'आपातकालीन — निकटतम अस्पताल' : 'EMERGENCY — Nearest Hospitals with 24x7 Emergency'}</div>
          <div class="hf-emergency-sub">${isHi ? 'केवल 24x7 आपातकालीन विभाग वाले अस्पताल दिखाए गए हैं। अभी 112 पर कॉल करें।' : 'Only hospitals with 24x7 emergency departments shown. Call 112 now if needed.'}</div>
        </div>
      </div>` : '';

    // Filter bar
    const filterBar = this._renderFilterBar(isHi);

    // Summary stats
    const govtCount = results.filter(r => r.cost_tier === 'free').length;
    const pvtCount  = results.filter(r => r.cost_tier !== 'free').length;
    const emCount   = results.filter(r => r.emergency_24x7).length;
    const teleCount = results.filter(r => r.telemedicine).length;
    const summary = `
      <div class="hf-summary-stats">
        <div class="hf-stat-chip">📊 ${results.length} ${isHi ? 'परिणाम' : 'results'}</div>
        ${govtCount ? `<div class="hf-stat-chip">🏛️ ${govtCount} ${isHi ? 'सरकारी' : 'Govt'}</div>` : ''}
        ${pvtCount  ? `<div class="hf-stat-chip">🏥 ${pvtCount} ${isHi ? 'निजी' : 'Private'}</div>` : ''}
        ${emCount   ? `<div class="hf-stat-chip">🚨 ${emCount} ${isHi ? 'आपातकालीन' : 'Emergency'}</div>` : ''}
        ${teleCount ? `<div class="hf-stat-chip">📱 ${teleCount} ${isHi ? 'टेलीमेडिसिन' : 'Telemedicine'}</div>` : ''}
      </div>`;

    // Mini map
    const mapHtml = this._renderMiniMap(results);

    // Cards
    const cardsHtml = results.length > 0
      ? `<div class="hf-results-grid">${results.map(f => this._renderFacilityCard(f, isHi)).join('')}</div>`
      : `<div class="hf-no-results"><div class="hf-no-icon">🔍</div><p>${isHi ? 'कोई सुविधा नहीं मिली। फिल्टर बदलें।' : 'No facilities found. Try adjusting filters.'}</p></div>`;

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2>🏥 ${isHi ? 'अस्पताल खोजें' : 'Hospital Finder'}</h2>
          <p class="page-header-sub">${isHi ? 'आपकी ज़रूरत के अनुसार निकटतम सुविधाएं' : 'Find the right facility for your clinical need'}</p>
        </div>
      </div>
      ${locBar}
      ${triageBanner}
      ${emergencyBanner}
      ${filterBar}
      ${mapHtml}
      ${summary}
      ${cardsHtml}`;
  }

  // ── Filter Bar ────────────────────────────────────────────────────────────
  _renderFilterBar(isHi) {
    return `
      <div class="hf-filter-bar">
        <div class="hf-filter-group">
          <div class="hf-filter-label">${isHi ? 'सुविधा प्रकार' : 'Facility Type'}</div>
          <select class="hf-filter-select" id="hfFilterType">
            <option value="">${isHi ? 'सभी' : 'All Types'}</option>
            <option value="emergency"${this._filters.facilityType === 'emergency' ? ' selected' : ''}>🚨 ${isHi ? 'आपातकालीन' : 'Emergency (24x7)'}</option>
            <option value="government hospital"${this._filters.facilityType === 'government hospital' ? ' selected' : ''}>🏛️ ${isHi ? 'सरकारी अस्पताल' : 'Government Hospital'}</option>
            <option value="phc"${this._filters.facilityType === 'phc' ? ' selected' : ''}>🏥 ${isHi ? 'प्राथमिक स्वास्थ्य केंद्र' : 'PHC'}</option>
            <option value="specialist"${this._filters.facilityType === 'specialist' ? ' selected' : ''}>👨‍⚕️ ${isHi ? 'विशेषज्ञ' : 'Specialist'}</option>
            <option value="telemedicine"${this._filters.facilityType === 'telemedicine' ? ' selected' : ''}>📱 ${isHi ? 'टेलीमेडिसिन' : 'Telemedicine'}</option>
          </select>
        </div>
        <div class="hf-filter-group">
          <div class="hf-filter-label">${isHi ? 'विशेषज्ञ' : 'Specialist'}</div>
          <select class="hf-filter-select" id="hfFilterSpec">
            <option value="">${isHi ? 'कोई भी' : 'Any'}</option>
            <option value="general physician">General Physician</option>
            <option value="cardiologist">Cardiologist</option>
            <option value="neurologist">Neurologist</option>
            <option value="orthopedic">Orthopedic</option>
            <option value="endocrinologist">Endocrinologist / Diabetologist</option>
            <option value="pulmonologist">Pulmonologist</option>
            <option value="dermatologist">Dermatologist</option>
            <option value="ent specialist">ENT Specialist</option>
            <option value="ophthalmologist">Ophthalmologist</option>
            <option value="urologist">Urologist</option>
            <option value="gastroenterologist">Gastroenterologist</option>
            <option value="psychiatrist">Psychiatrist</option>
          </select>
        </div>
        <div class="hf-filter-group">
          <div class="hf-filter-label">${isHi ? 'तात्कालिकता' : 'Urgency'}</div>
          <select class="hf-filter-select" id="hfFilterUrgency">
            <option value="">${isHi ? 'कोई भी' : 'Any'}</option>
            <option value="emergency"${this._filters.urgency === 'emergency' ? ' selected' : ''}>🚨 ${isHi ? 'अभी' : 'Right Now'}</option>
            <option value="today"${this._filters.urgency === 'today' ? ' selected' : ''}>📅 ${isHi ? 'आज' : 'Today'}</option>
            <option value="within a week">📆 ${isHi ? 'इस हफ्ते' : 'Within a Week'}</option>
          </select>
        </div>
        <div class="hf-filter-group">
          <div class="hf-filter-label">${isHi ? 'पसंद' : 'Preference'}</div>
          <select class="hf-filter-select" id="hfFilterPref">
            <option value="">${isHi ? 'कोई भी' : 'Any'}</option>
            <option value="government">🏛️ ${isHi ? 'सरकारी (मुफ़्त)' : 'Government (Free)'}</option>
            <option value="private">🏥 ${isHi ? 'निजी' : 'Private'}</option>
          </select>
        </div>
        <button class="hf-search-btn" id="hfSearchBtn">🔍 ${isHi ? 'खोजें' : 'Search'}</button>
      </div>`;
  }

  // ── Mini Map ──────────────────────────────────────────────────────────────
  _renderMiniMap(results) {
    // Simple visual map with positioned pins
    const physicalFacilities = results.filter(f => f.lat && f.lng);
    if (physicalFacilities.length === 0) return '';

    const loc = this.engine.getLocation() || { lat: 28.6139, lng: 77.2090 };
    // Calc bounding box
    const allLats = [loc.lat, ...physicalFacilities.map(f => f.lat)];
    const allLngs = [loc.lng, ...physicalFacilities.map(f => f.lng)];
    const minLat = Math.min(...allLats), maxLat = Math.max(...allLats);
    const minLng = Math.min(...allLngs), maxLng = Math.max(...allLngs);
    const latRange = maxLat - minLat || 0.05;
    const lngRange = maxLng - minLng || 0.05;

    const toX = (lng) => 8 + ((lng - minLng) / lngRange) * 84;
    const toY = (lat) => 8 + ((maxLat - lat) / latRange) * 84;

    const pinHtml = physicalFacilities.map((f, i) => {
      const x = toX(f.lng);
      const y = toY(f.lat);
      const icon = f.emergency_24x7 ? '🏥' : f.cost_tier === 'free' ? '🏛️' : '📍';
      return `<div class="hf-map-pin" style="left:${x}%;top:${y}%" title="${f.name}">
        ${icon}
        <div class="hf-map-pin-tooltip">${f.name.split(',')[0]}</div>
      </div>`;
    }).join('');

    // Patient pin
    const patX = toX(loc.lng);
    const patY = toY(loc.lat);
    const patPin = `<div class="hf-map-pin" style="left:${patX}%;top:${patY}%;font-size:18px;z-index:2">
      📍<div class="hf-map-pin-tooltip" style="display:block;background:var(--accent-primary);color:#001a10">You</div>
    </div>`;

    return `
      <div class="hf-map-container">
        <div class="hf-map-placeholder">
          <div class="hf-map-pins">${patPin}${pinHtml}</div>
        </div>
      </div>`;
  }

  // ── Facility Card ─────────────────────────────────────────────────────────
  _renderFacilityCard(f, isHi) {
    const costInfo = this.engine.getCostTierInfo(f.cost_tier);
    const costBadgeClass = f.cost_tier === 'free' ? 'hf-badge-cost-free' :
                           f.cost_tier === 'low-cost' ? 'hf-badge-cost-low' : 'hf-badge-cost-private';
    const cardAccent  = f.emergency_24x7 ? '#ff4d6d' : f.cost_tier === 'free' ? '#00c896' : '#0084ff';
    const isEmergency = f.emergency_24x7;
    const dirUrl      = this.engine.getDirectionsUrl(f);

    const badges = [];
    if (f.distance_km < 9000) badges.push(`<span class="hf-badge hf-badge-distance">📍 ${f.distance_km} km</span>`);
    if (f.travel_time) badges.push(`<span class="hf-badge hf-badge-travel">🚗 ${f.travel_time}</span>`);
    badges.push(`<span class="hf-badge ${costBadgeClass}">${costInfo.icon} ${isHi ? costInfo.label_hi : costInfo.label_en}</span>`);
    if (isEmergency) badges.push(`<span class="hf-badge hf-badge-emergency">🚨 24x7 ${isHi ? 'आपातकाल' : 'Emergency'}</span>`);
    if (f.pmjay) badges.push(`<span class="hf-badge hf-badge-pmjay">🛡️ PMJAY</span>`);
    if (f.telemedicine) badges.push(`<span class="hf-badge hf-badge-tele">📱 ${isHi ? 'टेलीमेडिसिन' : 'Teleconsult'}</span>`);
    if (f.has_patient_records) badges.push(`<span class="hf-badge hf-badge-records">📋 ${isHi ? 'रिकॉर्ड जुड़े' : 'Records Linked'}</span>`);
    if (f.icu) badges.push(`<span class="hf-badge hf-badge-icu">🛏️ ICU</span>`);

    const actions = [];
    if (dirUrl) {
      actions.push(`<a class="hf-action-btn hf-btn-directions" href="${dirUrl}" target="_blank" rel="noopener">🗺️ ${isHi ? 'रास्ता देखें' : 'Get Directions'}</a>`);
    }
    if (f.phone && f.phone !== '—') {
      actions.push(`<a class="hf-action-btn hf-btn-call" href="tel:${f.phone.replace(/[^0-9+]/g, '')}">📞 ${f.phone}</a>`);
    }
    if (f.telemedicine) {
      actions.push(`<button class="hf-action-btn hf-btn-teleconsult">💻 ${isHi ? 'टेलीकंसल्ट' : 'Start Teleconsult'}${f.tele_next_slot ? ` • ${f.tele_next_slot}` : ''}</button>`);
    }

    return `
      <div class="hf-card${isEmergency ? ' emergency-card-glow' : ''}" style="--card-accent:${cardAccent}">
        <div class="hf-card-header">
          <div>
            <div class="hf-card-name">${f.name}</div>
            <div class="hf-card-type">${f.type}</div>
          </div>
          <div class="hf-card-rating">
            ⭐ ${f.rating || '—'}
            <span class="review-count">(${f.reviews ? f.reviews.toLocaleString() : '—'})</span>
          </div>
        </div>
        <div class="hf-card-address">📍 ${f.address}</div>
        <div class="hf-badges">${badges.join('')}</div>
        <div class="hf-detail-row">
          <div class="hf-detail-item">🕐 <strong>${isHi ? 'OPD:' : 'OPD:'}</strong> ${f.opd_hours}</div>
          ${f.beds ? `<div class="hf-detail-item">🛏️ <strong>${f.beds}</strong> ${isHi ? 'बिस्तर' : 'beds'}</div>` : ''}
        </div>
        <div class="hf-actions">${actions.join('')}</div>
      </div>`;
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  _handleSearch() {
    this._triageContext = null;
    this._filters.facilityType = document.getElementById('hfFilterType')?.value || '';
    this._filters.specialist   = document.getElementById('hfFilterSpec')?.value || '';
    this._filters.urgency      = document.getElementById('hfFilterUrgency')?.value || '';
    this._filters.preference   = document.getElementById('hfFilterPref')?.value || '';

    this._lastResults = this.engine.search({
      facilityType: this._filters.facilityType,
      specialist:   this._filters.specialist,
      urgency:      this._filters.urgency,
      preference:   this._filters.preference,
      maxResults:   10,
    });

    this._renderPage();

    if (this.ui?._toast) {
      this.ui._toast('info', '🔍 Search Complete', `Found ${this._lastResults.length} facilities.`);
    }
  }

  _handleTriageFindClick(triageJson) {
    try {
      const triageResult = JSON.parse(decodeURIComponent(triageJson));
      this._triageContext = triageResult;
      this.ui._navigate('hospitals');
    } catch (e) {
      this.ui._navigate('hospitals');
    }
  }
}

window.HospitalFinderUI = HospitalFinderUI;
