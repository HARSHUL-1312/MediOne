/**
 * MediOne — Triage UI (Agent 1)
 * Chat-based conversational symptom triage.
 * Monkey-patches UIController._navigate() for the 'triage' page.
 *
 * Depends on: triage-engine.js, ui-controller.js (UIController)
 */

class TriageUI {
  constructor(triageEngine, healthStore) {
    this.engine      = triageEngine;
    this.healthStore = healthStore;
    this.messages    = [];    // { role: 'agent'|'patient', html, time }
    this.lastResult  = null;  // last assessment for "Log to Records"
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
      if (page === 'triage') {
        this.ui.currentPage = 'triage';
        location.hash = 'triage';
        const main = document.getElementById('page-content');
        main.innerHTML = '';
        this._renderPage();
        this.ui._setActiveNav();
        document.getElementById('topbar-title').textContent =
          this.ui.lang === 'hi' ? '🩺 लक्षण जांच' : '🩺 Symptom Triage';
        main.style.animation = 'slideDown 0.22s ease';
      } else {
        orig(page);
      }
    };
    const origTitle = this.ui._pageTitle.bind(this.ui);
    this.ui._pageTitle = () => {
      if (this.ui.currentPage === 'triage')
        return this.ui.lang === 'hi' ? '🩺 लक्षण जांच' : '🩺 Symptom Triage';
      return origTitle();
    };
  }

  _injectNavItem() {
    const doInject = () => {
      const navItems = document.querySelector('.nav-items');
      if (!navItems || navItems.querySelector('[data-page="triage"]')) return;
      // Insert at the TOP — triage is the first step in the journey
      const li = document.createElement('li');
      li.className = 'nav-item';
      li.innerHTML = `<button class="nav-link" data-page="triage">
        <span class="nav-icon">🩺</span>
        ${this.ui.lang === 'hi' ? 'लक्षण जांच' : 'Symptom Check'}
      </button>`;
      navItems.insertBefore(li, navItems.firstChild);
      this.ui._setActiveNav();
    };
    doInject();
    const sidebar = document.getElementById('sidebar');
    if (sidebar) new MutationObserver(doInject).observe(sidebar, { childList: true, subtree: true });
  }

  _bindGlobalEvents() {
    document.addEventListener('click', e => {
      // Send button
      if (e.target.closest('#triageSendBtn')) { this._handleSend(); return; }
      // Quick symptom chip
      const chip = e.target.closest('[data-symptom]');
      if (chip) { this._submitSymptom(chip.dataset.symptom); return; }
      // Follow-up button
      const fuBtn = e.target.closest('[data-followup]');
      if (fuBtn) { this._submitSymptom(fuBtn.dataset.followup); return; }
      // Log to records
      if (e.target.closest('#triageLogBtn')) { this._logToRecords(); return; }
      // Emergency dismiss
      if (e.target.closest('#emergencyDismiss')) {
        document.getElementById('emergencyOverlay')?.remove();
        return;
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && document.activeElement?.id === 'triageInput') {
        e.preventDefault();
        this._handleSend();
      }
    });
  }

  // ── Page Renderer ─────────────────────────────────────────────────────────
  _renderPage() {
    const isHi    = this.ui.lang === 'hi';
    const patient = this.healthStore.getPatient();
    const chips   = this.engine.getQuickSymptoms();
    const container = document.getElementById('page-content');

    // Seed welcome message if empty
    if (this.messages.length === 0) {
      const name = patient?.name?.split(' ')[0] || (isHi ? 'मित्र' : 'there');
      this._addAgentMsg(isHi
        ? `🙏 नमस्ते ${name}! मैं आपका लक्षण जांच सहायक हूँ।\n\nमुझे बताइए आपको क्या तकलीफ है — मैं यह समझने में मदद करूँगा कि आपको किस तरह की देखभाल की जरूरत है।\n\n⚕️ ध्यान रखें: मैं डॉक्टर नहीं हूँ और निदान नहीं करता। मैं केवल मार्गदर्शन देता हूँ।`
        : `👋 Hello ${name}! I'm your symptom triage assistant.\n\nDescribe what you're feeling — I'll help you understand the urgency and recommend the right type of care.\n\n⚕️ Note: I am NOT a doctor. I do not diagnose. I only guide you toward the right level of care.`
      );
    }

    const chipsHtml = chips.map(c => `
      <button class="symptom-chip" data-symptom="${isHi ? c.hi : c.en}">
        ${c.icon} ${isHi ? c.hi : c.en}
      </button>`).join('');

    const messagesHtml = this.messages.map(m => this._renderBubble(m)).join('');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2>🩺 ${isHi ? 'लक्षण जांच एजेंट' : 'Symptom Triage Agent'}</h2>
          <p class="page-header-sub">${isHi
            ? 'अपने लक्षण बताइए — हम सही देखभाल की दिशा दिखाएंगे'
            : 'Describe your symptoms — we\'ll guide you to the right care'}
          </p>
        </div>
      </div>

      <div class="triage-chat-wrap">
        <div class="triage-chat" id="triageChat">
          ${messagesHtml}
        </div>

        <div style="margin-top:4px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:6px">${isHi ? '⚡ तेज़ विकल्प:' : '⚡ Quick options:'}</div>
          <div class="symptom-chips">${chipsHtml}</div>
        </div>

        <div class="chat-input-bar">
          <input class="chat-input" id="triageInput" type="text"
            placeholder="${isHi ? 'अपने लक्षण यहाँ लिखें... (हिंदी / English)' : 'Describe your symptoms here... (English / हिंदी)'}"
            autocomplete="off" />
          <button class="chat-send-btn" id="triageSendBtn" title="Send">➤</button>
        </div>
      </div>`;

    this._scrollToBottom();
  }

  // ── Bubble Renderer ───────────────────────────────────────────────────────
  _renderBubble(msg) {
    const avatarEmoji = msg.role === 'agent' ? '🩺' : '🧑';
    const avClass     = msg.role === 'agent' ? 'agent-av' : 'patient-av';
    return `
      <div class="chat-row ${msg.role}">
        <div class="chat-avatar ${avClass}">${avatarEmoji}</div>
        <div>
          <div class="chat-bubble">${msg.html}</div>
          <div class="chat-time">${msg.time}</div>
        </div>
      </div>`;
  }

  // ── Message helpers ───────────────────────────────────────────────────────
  _addAgentMsg(text) {
    this.messages.push({
      role: 'agent',
      html: this._nl2br(text),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    });
  }

  _addPatientMsg(text) {
    this.messages.push({
      role: 'patient',
      html: this._escHtml(text),
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    });
  }

  _addRiskCardMsg(result) {
    const isHi = result.lang === 'hi';
    const meta = result.riskMeta;

    const followUpsHtml = result.followUps.length > 0 ? `
      <div class="followup-btns">
        ${result.followUps.map(fu => `
          <button class="followup-btn" data-followup="${isHi ? fu.hi : fu.en}">
            💬 ${isHi ? fu.hi : fu.en}
          </button>`).join('')}
      </div>` : '';

    const triagePayload = encodeURIComponent(JSON.stringify({
      risk: result.risk,
      specialist: result.specialist,
      facility: result.facility,
    }));

    const html = `
      <div class="risk-card" style="--risk-gradient:${meta.gradient};--risk-border:${meta.color}40">
        <div class="risk-badge ${result.risk}">${meta.emoji} ${isHi ? meta.label_hi : meta.label_en}</div>
        <div class="risk-explanation">${result.explanation}</div>
        <div class="risk-action">${result.action}</div>
        <div style="margin-top:8px">
          <span class="risk-specialist">🩺 ${result.specialist}</span>
          <span class="risk-facility">🏥 ${result.facility}</span>
        </div>
        ${result.chronicNote ? `<div class="risk-chronic-note">${result.chronicNote}</div>` : ''}
        ${followUpsHtml}
        <div class="risk-disclaimer">${result.disclaimer}</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
          <button class="risk-log-btn" id="triageLogBtn">📋 ${isHi ? 'रिकॉर्ड में दर्ज करें' : 'Log to Health Records'}</button>
          <button class="risk-log-btn" data-find-hospitals="${triagePayload}" style="background:linear-gradient(135deg,#0084ff,#0066cc)">🏥 ${isHi ? 'अस्पताल खोजें' : 'Find Nearby Hospitals'}</button>
        </div>
      </div>`;

    this.messages.push({
      role: 'agent',
      html,
      time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    });
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  _handleSend() {
    const input = document.getElementById('triageInput');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    this._submitSymptom(text);
  }

  _submitSymptom(text) {
    const isHi = this.engine._isHindi(text);
    
    // Add patient message
    this._addPatientMsg(text);
    const msgObj = this.messages[this.messages.length - 1];
    const chat = document.getElementById('triageChat');
    if (chat) {
      chat.insertAdjacentHTML('beforeend', this._renderBubble(msgObj));
    }
    this._scrollToBottom();

    // Show typing indicator
    if (chat) {
      const typingEl = document.createElement('div');
      typingEl.className = 'chat-row agent';
      typingEl.id = 'typingIndicator';
      typingEl.innerHTML = `
        <div class="chat-avatar agent-av">🩺</div>
        <div class="chat-bubble">
          <div class="typing-indicator">
            <div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>
          </div>
        </div>`;
      chat.appendChild(typingEl);
      this._scrollToBottom();
    }

    // Simulate processing delay
    setTimeout(() => {
      document.getElementById('typingIndicator')?.remove();

      const out = this.engine.processInput(text);

      if (!out) {
        this._addAgentMsg(isHi ? 'कृपया अपने लक्षण बताइए।' : 'Please describe your symptoms.');
        const outMsg = this.messages[this.messages.length - 1];
        chat?.insertAdjacentHTML('beforeend', this._renderBubble(outMsg));
        this._scrollToBottom();
        return;
      }

      if (out.phase !== 'RESULT') {
        // Unknown or Follow-Up phase
        this._addAgentMsg(out.agentMessage);
        
        let fuHtml = '';
        if (out.followUps && out.followUps.length > 0) {
          const btns = out.followUps.map(fu => `
            <button class="followup-btn" data-followup="${isHi ? fu.hi : fu.en}">
              💬 ${isHi ? fu.hi : fu.en}
            </button>`).join('');
          fuHtml = `<div class="followup-btns" style="margin-top:8px">${btns}</div>`;
        }
        
        const lastMsg = this.messages[this.messages.length - 1];
        lastMsg.html += fuHtml;
        
        chat?.insertAdjacentHTML('beforeend', this._renderBubble(lastMsg));
        this._scrollToBottom();
        return;
      }

      // It is RESULT phase
      const result = out.result;
      if (result.risk === 'emergency') {
        this._showEmergencyOverlay(result);
      }

      // Add risk card message
      this.lastResult = result;
      this._addRiskCardMsg(result);
      const riskMsg = this.messages[this.messages.length - 1];
      chat?.insertAdjacentHTML('beforeend', this._renderBubble(riskMsg));
      
      this.engine.state.phase = 'DONE';

      // Record noted message
      const patient = this.healthStore.getPatient();
      if (patient) {
        this._addAgentMsg(isHi
          ? `📋 ${patient.name?.split(' ')[0]}, आपके लक्षण अगली जांच के लिए नोट कर लिए गए हैं।`
          : `📋 ${patient.name?.split(' ')[0]}, your symptoms have been noted for your next visit.`);
        const notedMsg = this.messages[this.messages.length - 1];
        chat?.insertAdjacentHTML('beforeend', this._renderBubble(notedMsg));
      }
      
      // Question for next loop
      this._addAgentMsg(isHi 
          ? "क्या आप किसी और लक्षण की जांच करना चाहेंगे? अपना लक्षण फिर से टाइप करें।"
          : "Would you like to check another symptom? Type your symptom or click a chip below.");
      const loopMsg = this.messages[this.messages.length - 1];
      chat?.insertAdjacentHTML('beforeend', this._renderBubble(loopMsg));

      this._scrollToBottom();

      // Toast
      if (this.ui?._toast) {
        const meta = result.riskMeta;
        const type = result.risk === 'emergency' ? 'danger' :
                     result.risk === 'high' ? 'warning' :
                     result.risk === 'moderate' ? 'info' : 'success';
        this.ui._toast(type,
          `${meta.emoji} ${result.lang === 'hi' ? meta.label_hi : meta.label_en}`,
          result.explanation.slice(0, 80));
      }
    }, 800 + Math.random() * 600);
  }

  _showEmergencyOverlay(result) {
    const isHi = result.lang === 'hi';
    const overlay = document.createElement('div');
    overlay.className = 'emergency-overlay';
    overlay.id = 'emergencyOverlay';
    overlay.innerHTML = `
      <div class="emergency-content">
        <div class="emergency-icon">🚨</div>
        <div class="emergency-title">${isHi ? 'आपातकाल' : 'EMERGENCY'}</div>
        <div class="emergency-msg">${result.explanation}<br><br><strong>${result.action}</strong></div>
        <button class="emergency-call-btn" onclick="window.open('tel:112')">📞 ${isHi ? '112 पर कॉल करें' : 'Call 112 Now'}</button>
        <button class="emergency-dismiss" id="emergencyDismiss">${isHi ? 'बंद करें' : 'Dismiss'}</button>
      </div>`;
    document.body.appendChild(overlay);
  }

  _logToRecords() {
    if (!this.lastResult) return;
    const r = this.lastResult;
    const isHi = r.lang === 'hi';

    // Fire custom event for RecordsEngine to pick up
    document.dispatchEvent(new CustomEvent('triage:log', {
      detail: {
        chief_complaint: r.explanation,
        risk_level: r.risk,
        specialist: r.specialist,
        facility: r.facility,
        timestamp: r.timestamp,
      }
    }));

    // Disable button
    const btn = document.getElementById('triageLogBtn');
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = `✅ ${isHi ? 'रिकॉर्ड में दर्ज हो गया' : 'Logged to Records'}`;
      btn.style.opacity = '0.6';
      btn.style.cursor = 'default';
    }

    if (this.ui?._toast) {
      this.ui._toast('success', '📋 Logged!',
        isHi ? 'लक्षण आपके स्वास्थ्य रिकॉर्ड में दर्ज हो गए।' : 'Symptoms logged to your health records.');
    }
  }

  // ── Utilities ─────────────────────────────────────────────────────────────
  _scrollToBottom() {
    setTimeout(() => {
      const chat = document.getElementById('triageChat');
      if (chat) chat.scrollTop = chat.scrollHeight;
    }, 50);
  }
  _nl2br(s) { return this._escHtml(s).replace(/\n/g, '<br>'); }
  _escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }
}

window.TriageUI = TriageUI;
