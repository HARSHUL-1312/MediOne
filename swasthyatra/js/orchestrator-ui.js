/**
 * MediOne — Orchestrator UI (Agent 0)
 * Smart dashboard that replaces the basic dashboard with:
 *   1. Unified search/chat bar with intent routing
 *   2. Priority attention cards (what needs action NOW)
 *   3. Quick-access agent hub
 *   4. Patient journey timeline
 *
 * Depends on: orchestrator-engine.js, ui-controller.js
 */

class OrchestratorUI {
  constructor(orchEngine, healthStore) {
    this.engine      = orchEngine;
    this.healthStore = healthStore;
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  init(uiController) {
    this.ui = uiController;
    this._patchDashboard();
    this._bindEvents();
  }

  // Replace the default dashboard rendering with the smart hub
  _patchDashboard() {
    const origRenderDashboard = this.ui._renderDashboard.bind(this.ui);
    this.ui._renderDashboard = () => {
      origRenderDashboard(); // render the original first (for Nudge widget observer)
      // Then overlay with orchestrator
      setTimeout(() => this._renderSmartDashboard(), 30);
    };
  }

  _bindEvents() {
    document.addEventListener('click', e => {
      // Search submit
      if (e.target.closest('#orchSearchSubmit')) { this._handleSearch(); return; }
      // Suggestion chips
      const chip = e.target.closest('[data-orch-suggest]');
      if (chip) {
        const input = document.getElementById('orchSearchInput');
        if (input) { input.value = chip.dataset.orchSuggest.replace(/"/g, ''); }
        this._handleSearch();
        return;
      }
      // Priority card click
      const pcard = e.target.closest('[data-orch-route]');
      if (pcard) { this.ui._navigate(pcard.dataset.orchRoute); return; }
      // Agent card click
      const acard = e.target.closest('[data-orch-agent]');
      if (acard) { this.ui._navigate(acard.dataset.orchAgent); return; }
      // Timeline item click
      const titem = e.target.closest('[data-orch-timeline-route]');
      if (titem) { this.ui._navigate(titem.dataset.orchTimelineRoute); return; }
    });

    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.target.id === 'orchSearchInput') {
        this._handleSearch();
      }
    });
  }

  _handleSearch() {
    const input = document.getElementById('orchSearchInput');
    const query = input?.value?.trim();
    if (!query) return;

    const result = this.engine.routeIntent(query);
    if (!result) return;

    const isHi = this.ui.lang === 'hi';

    if (result.isEmergency) {
      // Show emergency alert
      this._showEmergencyAlert(query);
      return;
    }

    // Show routing toast
    const routeLabels = {
      triage: isHi ? '🩺 लक्षण जांच' : '🩺 Symptom Check',
      adherence: isHi ? '💊 दवा प्रबंधन' : '💊 Medicine Manager',
      hospitals: isHi ? '🏥 अस्पताल खोजें' : '🏥 Hospital Finder',
      explainer: isHi ? '📖 रिपोर्ट समझें' : '📖 Report Explainer',
      nudge: isHi ? '🤝 हेल्थ कोच' : '🤝 Health Coach',
      records: isHi ? '📋 स्वास्थ्य रिकॉर्ड' : '📋 Health Records',
    };
    const label = routeLabels[result.route_to] || result.route_to;
    this.ui._toast?.('info', isHi ? '🧠 समझ गया!' : '🧠 Got it!',
      `${isHi ? 'ले जा रहा हूँ:' : 'Routing to:'} ${label}`);

    input.value = '';

    setTimeout(() => this.ui._navigate(result.route_to), 400);
  }

  _showEmergencyAlert(query) {
    const isHi = this.ui.lang === 'hi';
    const container = document.getElementById('page-content');
    const existing = container.querySelector('.orch-emergency-alert');
    if (existing) existing.remove();

    const alert = document.createElement('div');
    alert.className = 'orch-emergency-alert';
    alert.innerHTML = `
      <div class="orch-emergency-title">🚨 ${isHi ? 'आपातकालीन चेतावनी' : 'EMERGENCY ALERT'}</div>
      <div class="orch-emergency-body">
        ${isHi
          ? `<strong>"${query}"</strong> — यह गंभीर हो सकता है।<br><br>
             ⚡ <strong>तुरंत 112 पर कॉल करें</strong> अगर आप या कोई खतरे में है।<br>
             🏥 निकटतम आपातकालीन विभाग तुरंत जाएं।<br>
             💊 कोई भी स्वयं-चिकित्सा न करें।`
          : `<strong>"${query}"</strong> — this could be serious.<br><br>
             ⚡ <strong>Call 112 immediately</strong> if you or someone is in danger.<br>
             🏥 Go to the nearest emergency department now.<br>
             💊 Do not self-medicate.`}
        <div style="margin-top:12px;display:flex;gap:8px">
          <button class="nudge-action-btn primary" onclick="window.open('tel:112')">📞 ${isHi ? '112 पर कॉल करें' : 'Call 112'}</button>
          <button class="nudge-action-btn secondary" data-orch-route="hospitals">🏥 ${isHi ? 'अस्पताल ढूंढें' : 'Find Hospital'}</button>
          <button class="nudge-action-btn secondary" data-orch-route="triage">🩺 ${isHi ? 'लक्षण जांच' : 'Triage Check'}</button>
        </div>
      </div>`;
    const search = container.querySelector('.orch-search-bar');
    if (search?.nextSibling) {
      search.parentElement.insertBefore(alert, search.nextSibling);
    } else {
      container.prepend(alert);
    }
  }

  // ── Smart Dashboard ───────────────────────────────────────────────────────
  _renderSmartDashboard() {
    const isHi = this.ui.lang === 'hi';
    const container = document.getElementById('page-content');
    const snap = this.engine.getHealthSnapshot();
    const timeline = this.engine.getJourneyTimeline();
    const suggestions = this.engine.getSuggestions(this.ui.lang);
    const patient = snap.patient;
    const firstName = patient?.name?.split(' ')[0] || (isHi ? 'मित्र' : 'there');
    const timeGreet = this._getTimeGreeting(isHi);

    container.innerHTML = `
      <!-- Greeting -->
      <div class="orch-greeting">
        <div class="orch-greeting-text">
          <h2>${timeGreet}, ${isHi ? (patient?.name_hi || firstName) : firstName}! 👋</h2>
          <p>${isHi ? 'आपका स्मार्ट स्वास्थ्य डैशबोर्ड' : 'Your smart health dashboard'} — ${new Date().toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div class="orch-health-score">
          <div class="orch-health-score-value">${snap.adherencePct}%</div>
          <div class="orch-health-score-label">${isHi ? 'अनुपालन स्कोर' : 'Adherence Score'}</div>
        </div>
      </div>

      <!-- Unified Search -->
      <div class="orch-search-bar">
        <span class="orch-search-icon">🧠</span>
        <input type="text" class="orch-search-input" id="orchSearchInput"
          placeholder="${isHi ? 'कुछ भी पूछें — "मुझे सिरदर्द है", "मेरी रिपोर्ट दिखाएं", "अस्पताल ढूंढें"...' : 'Ask me anything — "I have a headache", "show my report", "find a cardiologist"...'}" />
        <button class="orch-search-submit" id="orchSearchSubmit">${isHi ? 'खोजें →' : 'Go →'}</button>
      </div>
      <div class="orch-suggestions">
        ${suggestions.map(s => `
          <button class="orch-suggestion-chip" data-orch-suggest="${s.text}">
            ${s.icon} ${s.text}
          </button>`).join('')}
      </div>

      <div class="orch-grid" style="margin-top:18px">
        <div>
          <!-- Priority Attention -->
          ${snap.priorities.length > 0 ? `
            <div class="orch-section-label">⚡ ${isHi ? 'अभी ध्यान दें' : 'Needs Your Attention'}</div>
            <div class="orch-priorities">
              ${snap.priorities.map(p => `
                <div class="orch-priority-card sev-${p.severity}" data-orch-route="${p.route}">
                  <div class="orch-priority-icon">${p.icon}</div>
                  <div class="orch-priority-text">
                    <div class="orch-priority-title">${isHi ? p.title_hi : p.title_en}</div>
                    ${p.detail ? `<div class="orch-priority-detail">${p.detail}</div>` : ''}
                  </div>
                  <div class="orch-priority-arrow">→</div>
                </div>`).join('')}
            </div>` : ''}

          <!-- Agent Hub -->
          <div class="orch-section-label">🧩 ${isHi ? 'क्विक एक्सेस' : 'Quick Access'}</div>
          <div class="orch-agent-grid">
            <div class="orch-agent-card agent-triage" data-orch-agent="triage">
              <div class="orch-agent-icon">🩺</div>
              <div class="orch-agent-name">${isHi ? 'लक्षण जांच' : 'Symptom Check'}</div>
              <div class="orch-agent-stat">${isHi ? 'क्या गंभीर है? जानें' : 'How serious? Find out'}</div>
            </div>
            <div class="orch-agent-card agent-records" data-orch-agent="records">
              <div class="orch-agent-icon">📋</div>
              <div class="orch-agent-name">${isHi ? 'स्वास्थ्य रिकॉर्ड' : 'Health Records'}</div>
              <div class="orch-agent-stat">${snap.totalVisits} ${isHi ? 'दौरे' : 'visits'}</div>
            </div>
            <div class="orch-agent-card agent-adherence" data-orch-agent="adherence">
              <div class="orch-agent-icon">💊</div>
              <div class="orch-agent-name">${isHi ? 'दवा प्रबंधन' : 'Medicines'}</div>
              <div class="orch-agent-stat">${snap.takenToday.length}/${snap.todaySchedule.length} ${isHi ? 'आज' : 'today'}</div>
            </div>
            <div class="orch-agent-card agent-hospitals" data-orch-agent="hospitals">
              <div class="orch-agent-icon">🏥</div>
              <div class="orch-agent-name">${isHi ? 'अस्पताल खोजें' : 'Find Hospital'}</div>
              <div class="orch-agent-stat">${isHi ? 'पास में ढूंढें' : 'Nearby facilities'}</div>
            </div>
            <div class="orch-agent-card agent-explainer" data-orch-agent="explainer">
              <div class="orch-agent-icon">📖</div>
              <div class="orch-agent-name">${isHi ? 'रिपोर्ट समझें' : 'Explain Reports'}</div>
              <div class="orch-agent-stat">${isHi ? 'सरल भाषा में' : 'In plain language'}</div>
            </div>
            <div class="orch-agent-card agent-nudge" data-orch-agent="nudge">
              <div class="orch-agent-icon">🤝</div>
              <div class="orch-agent-name">${isHi ? 'हेल्थ कोच' : 'Health Coach'}</div>
              <div class="orch-agent-stat">${isHi ? 'प्रेरणा और मदद' : 'Motivation & help'}</div>
            </div>
          </div>

          <!-- Today's Medicines Quick Status -->
          ${snap.todaySchedule.length > 0 ? `
            <div class="orch-section-label">💊 ${isHi ? 'आज की दवाइयाँ' : 'Today\'s Medicines'}</div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:16px">
              ${snap.todaySchedule.map(d => {
                const color = d.status === 'taken' ? 'var(--accent-primary)'
                            : d.status === 'skipped' ? 'var(--accent-danger)'
                            : 'var(--text-muted)';
                const icon = d.status === 'taken' ? '✅' : d.status === 'skipped' ? '❌' : '⏳';
                return `<div style="padding:6px 12px;border-radius:var(--radius-sm);background:var(--bg-card);border:1px solid var(--border);font-size:11px;display:flex;align-items:center;gap:6px">
                  <span>${icon}</span>
                  <span style="font-weight:600;color:var(--text-primary)">${d.medicine_name}</span>
                  <span style="color:${color}">${d.slot}</span>
                </div>`;
              }).join('')}
            </div>` : ''}
        </div>

        <div>
          <!-- Journey Timeline -->
          <div class="orch-section-label">📍 ${isHi ? 'स्वास्थ्य यात्रा' : 'Health Journey'}</div>
          <div class="orch-timeline">
            ${timeline.slice(0, 10).map(ev => `
              <div class="orch-timeline-item" data-orch-timeline-route="${ev.agent === 'records' ? 'records' : ev.agent === 'nudge' ? 'nudge' : ev.agent === 'triage' ? 'triage' : 'records'}">
                <div class="orch-timeline-dot type-${ev.type}"></div>
                <div class="orch-timeline-date">${ev.icon} ${new Date(ev.date).toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                <div class="orch-timeline-title">${ev.title}</div>
                <div class="orch-timeline-detail">${ev.detail || ''}</div>
                ${ev.rxCount ? `<span style="font-size:10px;color:var(--text-muted)">💊 ${ev.rxCount} rx` : ''}
                ${ev.labCount ? ` · 🔬 ${ev.labCount} labs</span>` : ev.rxCount ? `</span>` : ''}
              </div>`).join('')}
          </div>

          <!-- Quick Health Profile -->
          <div class="orch-section-label" style="margin-top:16px">🧬 ${isHi ? 'स्वास्थ्य प्रोफ़ाइल' : 'Health Profile'}</div>
          <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-md);padding:12px 16px">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:11px">
              <div><span style="color:var(--text-muted)">${isHi ? 'रक्त समूह' : 'Blood Group'}:</span> <strong>${patient?.blood_group}</strong></div>
              <div><span style="color:var(--text-muted)">${isHi ? 'आयु' : 'Age'}:</span> <strong>${patient?.age} ${isHi ? 'वर्ष' : 'yrs'}</strong></div>
              <div style="grid-column:span 2"><span style="color:var(--text-muted)">${isHi ? 'पुरानी बीमारियाँ' : 'Chronic'}:</span> <strong>${snap.chronicConditions.join(', ') || '—'}</strong></div>
              <div style="grid-column:span 2"><span style="color:var(--text-muted)">${isHi ? 'एलर्जी' : 'Allergies'}:</span> <strong>${patient?.allergies?.join(', ') || '—'}</strong></div>
              <div style="grid-column:span 2"><span style="color:var(--text-muted)">ABDM:</span> <strong>${patient?.abdm_health_id || '—'}</strong></div>
            </div>
          </div>
        </div>
      </div>`;
  }

  _getTimeGreeting(isHi) {
    const h = new Date().getHours();
    if (h < 12) return isHi ? 'सुप्रभात' : 'Good morning';
    if (h < 17) return isHi ? 'नमस्ते' : 'Good afternoon';
    return isHi ? 'शुभ संध्या' : 'Good evening';
  }
}

window.OrchestratorUI = OrchestratorUI;
