/**
 * MediOne — Nudge UI (Agent 6)
 * Dashboard weekly check-in widget, standalone nudge page,
 * barrier identification flow, escalation alerts.
 *
 * Depends on: nudge-engine.js, adherence-engine.js, ui-controller.js
 */

class NudgeUI {
  constructor(nudgeEngine, adhEngine, healthStore) {
    this.engine      = nudgeEngine;
    this.adhEngine   = adhEngine;
    this.healthStore = healthStore;
    this._barrierResult = null;
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  init(uiController) {
    this.ui = uiController;
    this._patchNavigate();
    this._injectNavItem();
    this._bindGlobalEvents();
    this._observeDashboard();
  }

  _patchNavigate() {
    const orig = this.ui._navigate.bind(this.ui);
    this.ui._navigate = (page) => {
      if (page === 'nudge') {
        this.ui.currentPage = 'nudge';
        location.hash = 'nudge';
        const main = document.getElementById('page-content');
        main.innerHTML = '';
        this._renderPage();
        this.ui._setActiveNav();
        document.getElementById('topbar-title').textContent =
          this.ui.lang === 'hi' ? '🤝 हेल्थ कोच' : '🤝 Health Coach';
        main.style.animation = 'slideDown 0.22s ease';
      } else {
        orig(page);
      }
    };
    const origTitle = this.ui._pageTitle.bind(this.ui);
    this.ui._pageTitle = () => {
      if (this.ui.currentPage === 'nudge')
        return this.ui.lang === 'hi' ? '🤝 हेल्थ कोच' : '🤝 Health Coach';
      return origTitle();
    };
  }

  _injectNavItem() {
    const doInject = () => {
      const navItems = document.querySelector('.nav-items');
      if (!navItems || navItems.querySelector('[data-page="nudge"]')) return;
      const li = document.createElement('li');
      li.className = 'nav-item';
      li.innerHTML = `<button class="nav-link" data-page="nudge">
        <span class="nav-icon">🤝</span>
        ${this.ui.lang === 'hi' ? 'हेल्थ कोच' : 'Health Coach'}
      </button>`;
      // Insert after Explain Reports
      const expNav = navItems.querySelector('[data-page="explainer"]')?.closest('.nav-item');
      if (expNav?.nextSibling) {
        navItems.insertBefore(li, expNav.nextSibling);
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
      // Barrier buttons
      const barrierBtn = e.target.closest('[data-barrier]');
      if (barrierBtn) { this._handleBarrier(barrierBtn.dataset.barrier); return; }
      // Education nudge buttons
      const eduBtn = e.target.closest('[data-education]');
      if (eduBtn) { this._handleEducation(eduBtn.dataset.education); return; }
      // Dismiss nudge
      if (e.target.closest('[data-dismiss-nudge]')) {
        e.target.closest('.nudge-card')?.remove();
        return;
      }
      // Get back on track
      if (e.target.closest('#nudgeBackOnTrack')) {
        this.ui._navigate('adherence');
        return;
      }
      // Request escalation actions
      if (e.target.closest('[data-escalate-action]')) {
        const action = e.target.closest('[data-escalate-action]').dataset.escalateAction;
        this._handleEscalateAction(action);
        return;
      }
    });
  }

  // ── Dashboard injection ───────────────────────────────────────────────────
  _observeDashboard() {
    const main = document.getElementById('page-content');
    if (!main) return;
    const observer = new MutationObserver(() => this._tryInjectDashboardWidget());
    observer.observe(main, { childList: true, subtree: true });
  }

  _tryInjectDashboardWidget() {
    if (this.ui.currentPage !== 'dashboard') return;
    const main = document.getElementById('page-content');
    if (!main || main.querySelector('.checkin-widget')) return;

    const isHi = this.ui.lang === 'hi';
    const report = this.adhEngine.getWeeklyReport();
    const patient = this.healthStore.getPatient();
    const name = patient?.name?.split(' ')[0] || (isHi ? 'मित्र' : 'there');
    const autoNudge = this.engine.getAutoNudge(this.ui.lang || 'en');

    const totalTaken = report.reports.reduce((a, r) => a + r.taken, 0);
    const totalDoses = report.reports.reduce((a, r) => a + r.total, 0);

    // Build widget
    const widget = document.createElement('div');
    widget.className = 'checkin-widget';

    // Determine score color
    const scoreColor = report.overall_score >= 80 ? 'var(--accent-primary)'
                     : report.overall_score >= 50 ? '#ffa726' : 'var(--accent-danger)';

    widget.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-size:14px;font-weight:700">🤝 ${isHi ? 'साप्ताहिक स्वास्थ्य अपडेट' : 'Weekly Health Check-in'}</div>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px">${isHi ? `नमस्ते ${name}! आपके इस हफ्ते के आंकड़े` : `Hi ${name}! Your stats this week`}</div>
        </div>
        <button class="nudge-action-btn secondary" onclick="window._sw?.ui?._navigate('nudge')" style="font-size:10px">
          ${isHi ? 'विस्तृत →' : 'View Details →'}
        </button>
      </div>

      <div class="checkin-stats">
        <div class="checkin-stat">
          <div class="checkin-stat-value" style="background:${scoreColor};-webkit-background-clip:text;-webkit-text-fill-color:transparent">${report.overall_score}%</div>
          <div class="checkin-stat-label">${isHi ? 'अनुपालन' : 'Adherence'}</div>
        </div>
        <div class="checkin-stat">
          <div class="checkin-stat-value">${totalTaken}/${totalDoses}</div>
          <div class="checkin-stat-label">${isHi ? 'खुराकें' : 'Doses'}</div>
        </div>
        <div class="checkin-stat">
          <div class="checkin-stat-value">🔥 ${report.streak_days}</div>
          <div class="checkin-stat-label">${isHi ? 'लगातार दिन' : 'Streak'}</div>
        </div>
      </div>

      ${report.overall_score >= 80
        ? `<div class="checkin-tip">🎉 ${isHi ? 'शानदार! आप बहुत अच्छा कर रहे हैं — ऐसे ही जारी रखें!' : 'Great job! You\'re doing amazing — keep it up!'}</div>`
        : report.overall_score >= 50
          ? `<div class="checkin-tip">👍 ${isHi ? 'अच्छा प्रयास! अगले हफ्ते और बेहतर करने का लक्ष्य रखें।' : 'Good effort! Let\'s aim higher next week.'}</div>`
          : `<div class="checkin-tip" style="border-color:rgba(255,167,38,0.3);background:rgba(255,167,38,0.06)">💪 ${isHi ? 'हर खुराक मायने रखती है। क्या कोई रुकावट आ रही है?' : 'Every dose counts. Is something getting in the way?'}
              <button class="nudge-action-btn primary" style="margin-left:8px;padding:4px 12px;font-size:10px" onclick="window._sw?.ui?._navigate('nudge')">
                ${isHi ? 'बात करें' : 'Let\'s talk'}
              </button>
            </div>`}

      ${autoNudge ? `
        <div style="margin-top:10px;padding:10px 14px;background:rgba(255,167,38,0.06);border:1px solid rgba(255,167,38,0.2);border-radius:var(--radius-md);font-size:12px;color:var(--text-secondary)">
          <strong>🤝 ${isHi ? 'आपका कोच कहता है:' : 'Your coach says:'}</strong><br>
          ${autoNudge.message.split('\n')[0].slice(0, 120)}${autoNudge.message.length > 120 ? '...' : ''}
          <button class="nudge-action-btn secondary" onclick="window._sw?.ui?._navigate('nudge')" style="margin-top:6px;padding:3px 10px;font-size:9px">
            ${isHi ? 'पूरा पढ़ें' : 'Read more'}
          </button>
        </div>` : ''}`;

    // Insert after first page-header
    const header = main.querySelector('.page-header');
    if (header?.nextSibling) {
      header.parentElement.insertBefore(widget, header.nextSibling);
    } else {
      main.prepend(widget);
    }
  }

  // ── Main Nudge Page ───────────────────────────────────────────────────────
  _renderPage() {
    const isHi = this.ui.lang === 'hi';
    const lang = this.ui.lang || 'en';
    const container = document.getElementById('page-content');
    const report = this.adhEngine.getWeeklyReport();
    const patient = this.healthStore.getPatient();
    const name = patient?.name?.split(' ')[0] || (isHi ? 'मित्र' : 'there');
    const chronic = patient?.chronic_conditions || [];

    // Generate check-in
    const checkin = this.engine.generateWeeklyCheckin(lang);
    // Auto nudge
    const autoNudge = this.engine.getAutoNudge(lang);

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2>🤝 ${isHi ? 'हेल्थ कोच' : 'Health Coach'}</h2>
          <p class="page-header-sub">${isHi
            ? 'आपका सहयोगी स्वास्थ्य शिक्षक — गर्मजोशी, बिना किसी निर्णय के'
            : 'Your supportive health educator — warm, non-judgmental guidance'}</p>
        </div>
      </div>

      <div class="nudge-page-grid">
        <div>
          <!-- Weekly Check-in Card -->
          <div class="nudge-section-label">📊 ${isHi ? 'साप्ताहिक अपडेट' : 'Weekly Check-in'}</div>
          <div class="nudge-card nudge-checkin">
            <div class="nudge-header">
              <div class="nudge-icon">📊</div>
              <div>
                <div class="nudge-title">${isHi ? 'इस हफ्ते का अपडेट' : 'This Week\'s Update'}</div>
                <div class="nudge-time">${new Date().toLocaleDateString(isHi ? 'hi-IN' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</div>
              </div>
            </div>
            <div class="nudge-body">${this._formatNudgeMsg(checkin.message)}</div>
          </div>

          ${autoNudge ? `
          <!-- Auto Nudge -->
          <div class="nudge-section-label">${autoNudge.type === 'escalation' ? '🚨' : '💊'} ${isHi ? 'आपके लिए संदेश' : 'Message for You'}</div>
          <div class="nudge-card nudge-${autoNudge.type === 'escalation' ? 'escalation' : 'gentle'}">
            <div class="nudge-header">
              <div class="nudge-icon">${autoNudge.type === 'escalation' ? '🚨' : '💊'}</div>
              <div>
                <div class="nudge-title">${autoNudge.type === 'escalation'
                  ? (isHi ? 'गंभीर ध्यान ज़रूरी' : 'Attention Needed')
                  : (isHi ? 'कोमल अनुस्मारक' : 'Gentle Reminder')}</div>
              </div>
            </div>
            <div class="nudge-body">${this._formatNudgeMsg(autoNudge.message)}</div>
            <div class="nudge-actions">
              <button class="nudge-action-btn primary" id="nudgeBackOnTrack">💊 ${isHi ? 'आज से शुरू करें' : 'Get Back on Track'}</button>
              ${autoNudge.type === 'escalation' ? `
                <button class="nudge-action-btn secondary" data-escalate-action="flag">📋 ${isHi ? 'डॉक्टर को बताएं' : 'Flag for Doctor'}</button>
                <button class="nudge-action-btn secondary" data-escalate-action="appointment">🏥 ${isHi ? 'अपॉइंटमेंट' : 'Book Appointment'}</button>
              ` : ''}
            </div>
          </div>` : ''}

          <!-- Nudge History -->
          <div class="nudge-section-label" style="margin-top:16px">📜 ${isHi ? 'पिछले संदेश' : 'Nudge History'}</div>
          ${this._renderHistory(isHi)}
        </div>

        <div>
          <!-- Barrier Identification -->
          <div class="nudge-section-label">🧩 ${isHi ? 'क्या कोई रुकावट है?' : 'What\'s Getting in the Way?'}</div>
          <div class="nudge-card nudge-barrier">
            <div class="nudge-header">
              <div class="nudge-icon">🧩</div>
              <div>
                <div class="nudge-title">${isHi ? 'बाधा पहचान' : 'Barrier Identification'}</div>
                <div class="nudge-time">${isHi ? 'अपनी चुनौती बताइए — हम मदद करेंगे' : 'Tell us your challenge — we\'ll help'}</div>
              </div>
            </div>
            <div class="barrier-options">
              <button class="barrier-btn" data-barrier="forget">
                <span class="barrier-emoji">🧠</span>
                <span>${isHi ? 'मैं भूल जाता/ती हूँ' : 'I keep forgetting'}</span>
              </button>
              <button class="barrier-btn" data-barrier="side_effects">
                <span class="barrier-emoji">😣</span>
                <span>${isHi ? 'दुष्प्रभाव हो रहे हैं' : 'I get side effects'}</span>
              </button>
              <button class="barrier-btn" data-barrier="expensive">
                <span class="barrier-emoji">💰</span>
                <span>${isHi ? 'बहुत महंगी हैं' : 'Too expensive'}</span>
              </button>
              <button class="barrier-btn" data-barrier="feel_fine">
                <span class="barrier-emoji">😊</span>
                <span>${isHi ? 'मुझे ठीक लग रहा है' : 'I feel fine now'}</span>
              </button>
            </div>
            ${this._barrierResult ? `
              <div class="barrier-response">${this._formatNudgeMsg(this._barrierResult.message)}</div>
            ` : ''}
          </div>

          <!-- Education Section -->
          <div class="nudge-section-label" style="margin-top:16px">📚 ${isHi ? 'क्यों ज़रूरी है?' : 'Why Does It Matter?'}</div>
          <div class="nudge-card nudge-education">
            <div class="nudge-header">
              <div class="nudge-icon">📚</div>
              <div>
                <div class="nudge-title">${isHi ? 'मुझे यह दवा क्यों लेनी चाहिए?' : 'Why do I need this medicine?'}</div>
                <div class="nudge-time">${isHi ? 'सरल भाषा में समझें' : 'Understand in simple language'}</div>
              </div>
            </div>
            <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:10px">
              ${chronic.some(c => c.toLowerCase().includes('diabet'))
                ? `<button class="nudge-action-btn secondary" data-education="diabetes">🍬 ${isHi ? 'मधुमेह' : 'Diabetes'}</button>` : ''}
              ${chronic.some(c => c.toLowerCase().includes('hypertension') || c.toLowerCase().includes('bp'))
                ? `<button class="nudge-action-btn secondary" data-education="bp">❤️ ${isHi ? 'रक्तचाप' : 'Blood Pressure'}</button>` : ''}
              <button class="nudge-action-btn secondary" data-education="heart">🫀 ${isHi ? 'हृदय' : 'Heart Health'}</button>
              <button class="nudge-action-btn secondary" data-education="diabetes">🍬 ${isHi ? 'मधुमेह' : 'Diabetes'}</button>
              <button class="nudge-action-btn secondary" data-education="bp">❤️ ${isHi ? 'रक्तचाप' : 'Blood Pressure'}</button>
            </div>
            <div id="educationResult"></div>
          </div>
        </div>
      </div>`;
  }

  _formatNudgeMsg(msg) {
    // Convert markdown-like bold to HTML, and newlines to <br>
    return msg
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>');
  }

  _renderHistory(isHi) {
    const log = this.engine.getNudgeLog();
    if (log.length === 0) {
      return `<div style="text-align:center;padding:20px;color:var(--text-muted);font-size:12px">
        ${isHi ? 'अभी तक कोई संदेश नहीं' : 'No nudges yet'}</div>`;
    }
    const typeLabels = {
      gentle_reminder: '💊 Gentle Reminder',
      education: '📚 Education',
      barrier_forget: '🧠 Barrier: Forgetting',
      barrier_side_effects: '😣 Barrier: Side Effects',
      barrier_expensive: '💰 Barrier: Cost',
      barrier_feel_fine: '😊 Barrier: Feeling Fine',
      weekly_checkin: '📊 Weekly Check-in',
      escalation: '🚨 Escalation',
    };
    return log.slice(-8).reverse().map(n => `
      <div class="nudge-history-item">
        <span class="nudge-hist-type">${typeLabels[n.type] || n.type}</span>
        <span style="float:right;font-size:9px">${new Date(n.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
        <div style="margin-top:3px">${n.message_preview}…</div>
      </div>`).join('');
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  _handleBarrier(barrier) {
    const lang = this.ui.lang || 'en';
    const isHi = lang === 'hi';
    this._barrierResult = this.engine.generateBarrierResponse(barrier, lang);
    this._renderPage();
    this.ui._toast?.('info', '🤝',
      isHi ? 'आपकी चिंता दर्ज की गई' : 'Your concern has been noted');
  }

  _handleEducation(condition) {
    const lang = this.ui.lang || 'en';
    const result = this.engine.generateEducationNudge(condition, lang);
    const container = document.getElementById('educationResult');
    if (container) {
      container.innerHTML = `
        <div class="barrier-response" style="background:rgba(0,132,255,0.06);border-color:rgba(0,132,255,0.2);margin-top:10px">
          ${this._formatNudgeMsg(result.message)}
        </div>`;
    }
  }

  _handleEscalateAction(action) {
    const isHi = this.ui.lang === 'hi';
    if (action === 'flag') {
      this.ui._toast?.('success', '📋',
        isHi ? 'आपके डॉक्टर के लिए चिह्नित किया गया' : 'Flagged for your doctor\'s next visit');
    } else if (action === 'appointment') {
      this.ui._navigate?.('hospitals');
    }
  }
}

window.NudgeUI = NudgeUI;
