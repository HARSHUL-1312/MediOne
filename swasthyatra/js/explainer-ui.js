/**
 * MediOne — Explainer UI (Agent 5)
 * Standalone Explain page + "Explain This" buttons injected into visit details.
 *
 * Depends on: explainer-engine.js, ui-controller.js
 */

class ExplainerUI {
  constructor(explainerEngine, healthStore) {
    this.engine      = explainerEngine;
    this.healthStore = healthStore;
    this._activeTab  = 'paste'; // 'paste' | 'records'
    this._explainResult = null;  // last explanation
  }

  // ── Boot ──────────────────────────────────────────────────────────────────
  init(uiController) {
    this.ui = uiController;
    this._patchNavigate();
    this._injectNavItem();
    this._bindGlobalEvents();
    this._observeRecordDetails();
  }

  _patchNavigate() {
    const orig = this.ui._navigate.bind(this.ui);
    this.ui._navigate = (page) => {
      if (page === 'explainer') {
        this.ui.currentPage = 'explainer';
        location.hash = 'explainer';
        const main = document.getElementById('page-content');
        main.innerHTML = '';
        this._renderPage();
        this.ui._setActiveNav();
        document.getElementById('topbar-title').textContent =
          this.ui.lang === 'hi' ? '📖 दवाई/रिपोर्ट समझें' : '📖 Explain My Reports';
        main.style.animation = 'slideDown 0.22s ease';
      } else {
        orig(page);
      }
    };
    const origTitle = this.ui._pageTitle.bind(this.ui);
    this.ui._pageTitle = () => {
      if (this.ui.currentPage === 'explainer')
        return this.ui.lang === 'hi' ? '📖 दवाई/रिपोर्ट समझें' : '📖 Explain My Reports';
      return origTitle();
    };
  }

  _injectNavItem() {
    const doInject = () => {
      const navItems = document.querySelector('.nav-items');
      if (!navItems || navItems.querySelector('[data-page="explainer"]')) return;
      const li = document.createElement('li');
      li.className = 'nav-item';
      li.innerHTML = `<button class="nav-link" data-page="explainer">
        <span class="nav-icon">📖</span>
        ${this.ui.lang === 'hi' ? 'दवाई/रिपोर्ट समझें' : 'Explain Reports'}
      </button>`;
      // Insert after Hospital Finder
      const hfNav = navItems.querySelector('[data-page="hospitals"]')?.closest('.nav-item');
      if (hfNav?.nextSibling) {
        navItems.insertBefore(li, hfNav.nextSibling);
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
      // Tab switching
      const tab = e.target.closest('[data-explain-tab]');
      if (tab) { this._activeTab = tab.dataset.explainTab; this._renderPage(); return; }
      // Explain button for manual text
      if (e.target.closest('#explainPasteBtn')) { this._handleManualExplain(); return; }
      // "Explain This" for prescriptions in records
      const rxBtn = e.target.closest('[data-explain-rx]');
      if (rxBtn) { this._handleExplainVisitRx(rxBtn.dataset.explainRx); return; }
      // "Explain This" for lab reports in records
      const labBtn = e.target.closest('[data-explain-lab]');
      if (labBtn) { this._handleExplainVisitLab(labBtn.dataset.explainLab); return; }
      // "Explain All" from records page
      const allBtn = e.target.closest('[data-explain-all]');
      if (allBtn) { this._handleExplainVisitAll(allBtn.dataset.explainAll); return; }
    });
  }

  // ── Observe record detail views to inject "Explain This" buttons ──────────
  _observeRecordDetails() {
    const main = document.getElementById('page-content');
    if (!main) return;
    const observer = new MutationObserver(() => { this._tryInjectExplainButtons(); });
    observer.observe(main, { childList: true, subtree: true });
  }

  _tryInjectExplainButtons() {
    // Don't inject on explainer page
    if (this.ui.currentPage === 'explainer') return;
    const isHi = this.ui.lang === 'hi';

    // Find prescription sections
    document.querySelectorAll('.rx-list').forEach(rxList => {
      if (rxList.querySelector('.explain-this-btn')) return;
      // Find the visit_id from the parent
      const visitCard = rxList.closest('[data-visit-id]') || rxList.closest('.page-content');
      const visitId = visitCard?.dataset?.visitId || this._findVisitIdFromDOM();
      if (!visitId) return;
      const btn = document.createElement('button');
      btn.className = 'explain-this-btn';
      btn.setAttribute('data-explain-rx', visitId);
      btn.innerHTML = `📖 ${isHi ? 'दवाइयाँ समझें' : 'Explain Prescriptions'}`;
      rxList.parentElement.appendChild(btn);
    });

    // Find lab report sections
    document.querySelectorAll('.lab-table').forEach(labTable => {
      if (labTable.parentElement.querySelector('.explain-this-btn[data-explain-lab]')) return;
      const visitId = this._findVisitIdFromDOM();
      if (!visitId) return;
      const btn = document.createElement('button');
      btn.className = 'explain-this-btn';
      btn.setAttribute('data-explain-lab', visitId);
      btn.innerHTML = `📖 ${isHi ? 'रिपोर्ट समझें' : 'Explain Lab Reports'}`;
      labTable.parentElement.appendChild(btn);
    });
  }

  _findVisitIdFromDOM() {
    // Try to find visit ID from URL hash or topbar
    const hash = location.hash;
    const match = hash.match(/visit\/(VST-[^/]+)/);
    if (match) return match[1];
    // Try from breadcrumb text
    const crumb = document.querySelector('.topbar-left h1')?.textContent || '';
    const m2 = crumb.match(/VST-\S+/);
    return m2 ? m2[0] : null;
  }

  // ── Page Renderer ─────────────────────────────────────────────────────────
  _renderPage() {
    const isHi = this.ui.lang === 'hi';
    const container = document.getElementById('page-content');
    const visits = this.healthStore.getVisits().filter(v =>
      (v.prescriptions?.length > 0 || v.lab_reports?.length > 0) &&
      !v.diagnosis?.some(d => d.type === 'triage')
    );

    const tabsHtml = `
      <div class="explain-tabs">
        <button class="explain-tab ${this._activeTab === 'paste' ? 'active' : ''}" data-explain-tab="paste">
          📝 ${isHi ? 'मैन्युअल इनपुट' : 'Paste / Upload'}
        </button>
        <button class="explain-tab ${this._activeTab === 'records' ? 'active' : ''}" data-explain-tab="records">
          📋 ${isHi ? 'मेरे रिकॉर्ड से' : 'From My Records'} (${visits.length})
        </button>
      </div>`;

    let contentHtml = '';
    if (this._activeTab === 'paste') {
      contentHtml = this._renderPasteTab(isHi);
    } else {
      contentHtml = this._renderRecordsTab(isHi, visits);
    }

    // If we have explanation results, show them below
    const resultHtml = this._explainResult ? this._renderExplainResult(isHi) : '';

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2>📖 ${isHi ? 'दवाई / रिपोर्ट समझें' : 'Explain My Reports'}</h2>
          <p class="page-header-sub">${isHi
            ? 'अपनी दवाइयाँ और जांच रिपोर्ट को सरल भाषा में समझें'
            : 'Understand your prescriptions and lab reports in plain language'}</p>
        </div>
      </div>
      ${tabsHtml}
      ${contentHtml}
      ${resultHtml}`;
  }

  _renderPasteTab(isHi) {
    return `
      <div class="explain-input-section">
        <label style="font-size:12px;font-weight:600;color:var(--text-secondary);display:block;margin-bottom:8px">
          ${isHi ? '📝 नीचे अपनी दवाइयाँ लिखें या चिपकाएं:' : '📝 Paste your prescription text below:'}
        </label>
        <textarea class="explain-textarea" id="explainTextarea"
          placeholder="${isHi
            ? 'उदाहरण:\nTab Metformin 500mg - Twice daily - 90 days\nTab Amlodipine 5mg - Once daily - 90 days\nTab Aspirin 75mg - After meals - 90 days'
            : 'Example:\nTab Metformin 500mg - Twice daily - 90 days\nTab Amlodipine 5mg - Once daily - 90 days\nTab Aspirin 75mg - After meals - 90 days'}"
        ></textarea>
        <button class="explain-submit-btn" id="explainPasteBtn">
          📖 ${isHi ? 'समझाइए' : 'Explain This'}
        </button>
        <span style="font-size:11px;color:var(--text-muted);margin-left:12px">
          ${isHi ? 'एक दवा प्रति पंक्ति लिखें' : 'Write one medicine per line'}
        </span>
      </div>`;
  }

  _renderRecordsTab(isHi, visits) {
    if (visits.length === 0) {
      return `<div style="text-align:center;padding:40px;color:var(--text-muted)">
        <div style="font-size:40px;opacity:0.3;margin-bottom:10px">📋</div>
        ${isHi ? 'कोई रिकॉर्ड नहीं मिला।' : 'No records with prescriptions or lab reports found.'}
      </div>`;
    }

    return visits.map(v => {
      const rxCount = v.prescriptions?.length || 0;
      const labCount = v.lab_reports?.length || 0;
      const diag = v.diagnosis?.map(d => d.label || d.label_hi || d.name).join(', ') || '—';
      return `
        <div class="hf-card" style="margin-bottom:10px;--card-accent:var(--accent-secondary)" data-visit-id="${v.visit_id}">
          <div class="hf-card-header">
            <div>
              <div class="hf-card-name">${v.facility_name}</div>
              <div class="hf-card-type">${v.doctor_name} • ${v.date}</div>
            </div>
          </div>
          <div style="font-size:12px;color:var(--text-muted);margin-top:6px">📋 ${diag}</div>
          <div class="hf-badges" style="margin-top:8px">
            ${rxCount ? `<span class="hf-badge hf-badge-cost-free">💊 ${rxCount} ${isHi ? 'दवाइयाँ' : 'medicines'}</span>` : ''}
            ${labCount ? `<span class="hf-badge hf-badge-tele">🧪 ${labCount} ${isHi ? 'जांचें' : 'lab tests'}</span>` : ''}
          </div>
          <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">
            ${rxCount ? `<button class="explain-this-btn" data-explain-rx="${v.visit_id}">📖 ${isHi ? 'दवाइयाँ समझें' : 'Explain Prescriptions'}</button>` : ''}
            ${labCount ? `<button class="explain-this-btn" data-explain-lab="${v.visit_id}">📖 ${isHi ? 'रिपोर्ट समझें' : 'Explain Lab Reports'}</button>` : ''}
            <button class="explain-this-btn" data-explain-all="${v.visit_id}" style="background:linear-gradient(135deg,rgba(0,200,150,0.12),rgba(0,200,150,0.06));border-color:rgba(0,200,150,0.25);color:var(--accent-primary)">📖 ${isHi ? 'सब समझें' : 'Explain Everything'}</button>
          </div>
        </div>`;
    }).join('');
  }

  // ── Explanation Results ────────────────────────────────────────────────────
  _renderExplainResult(isHi) {
    const r = this._explainResult;
    let html = '<div style="margin-top:24px">';

    // Section title
    html += `<div class="section-label" style="font-size:16px;margin-bottom:12px">
      📖 ${isHi ? 'स्पष्टीकरण' : 'Explanation'}
    </div>`;

    // Prescriptions
    if (r.rxResult) {
      html += `<div class="explain-summary rx-summary">💊 ${r.rxResult.summary}</div>`;
      // Interactions
      for (const inter of (r.rxResult.interactions || [])) {
        html += `<div class="interaction-card">
          <div class="interaction-icon">⚠️</div>
          <div><strong>${isHi ? 'दवा इंटरैक्शन:' : 'Drug Interaction:'}</strong> ${inter.drugs.map(d => d.charAt(0).toUpperCase()+d.slice(1)).join(' + ')}
          <br>${inter.note}</div>
        </div>`;
      }
      // Medicine cards
      for (const med of r.rxResult.medicines) {
        html += this._renderMedicineCard(med, isHi);
      }
    }

    // Lab Reports
    if (r.labResult) {
      html += `<div class="explain-summary lab-summary" style="margin-top:20px">🧪 ${r.labResult.overallSummary}</div>`;
      for (const test of r.labResult.tests) {
        html += this._renderLabCard(test, isHi);
      }
    }

    // Disclaimer
    html += `<div class="explain-disclaimer">${this.engine.getDisclaimer(isHi ? 'hi' : 'en')}</div>`;
    html += '</div>';
    return html;
  }

  _renderMedicineCard(med, isHi) {
    const sideEffectsHtml = med.side_effects.length > 0
      ? `<div class="med-side-fx">${med.side_effects.map(s => `<span class="med-sfx-tag">${s}</span>`).join('')}</div>`
      : '';

    const warningsHtml = med.warnings?.length > 0
      ? `<div class="med-warnings"><ul style="margin:0;padding-left:16px">${med.warnings.map(w => `<li>${w}</li>`).join('')}</ul></div>`
      : '';

    return `
      <div class="med-explain-card${med.known ? '' : ' unknown-med'}">
        <div class="med-header">
          <div>
            <div class="med-name">💊 ${med.medicine_name}</div>
            <div class="med-generic">${med.generic || med.medicine_name}${med.brand_examples ? ` (${med.brand_examples.join(', ')})` : ''}</div>
          </div>
          <div class="med-category">${med.category}</div>
        </div>
        <div class="med-purpose">${med.purpose}</div>
        <div class="med-dosage-grid">
          ${med.dosage ? `<div class="med-dosage-item"><div class="med-dosage-label">${isHi ? 'खुराक' : 'Dose'}</div><div class="med-dosage-value">${med.dosage}</div></div>` : ''}
          ${med.frequency ? `<div class="med-dosage-item"><div class="med-dosage-label">${isHi ? 'कब' : 'When'}</div><div class="med-dosage-value">${med.frequency}</div></div>` : ''}
          ${med.duration ? `<div class="med-dosage-item"><div class="med-dosage-label">${isHi ? 'अवधि' : 'Duration'}</div><div class="med-dosage-value">${med.duration}</div></div>` : ''}
          ${med.food ? `<div class="med-dosage-item"><div class="med-dosage-label">${isHi ? 'भोजन' : 'Food'}</div><div class="med-dosage-value">${med.food}</div></div>` : ''}
        </div>
        ${sideEffectsHtml}
        ${warningsHtml}
      </div>`;
  }

  _renderLabCard(test, isHi) {
    return `
      <div class="lab-explain-card">
        <div class="lab-header">
          <div class="lab-test-name">🧪 ${test.test_name}</div>
          <div class="lab-verdict ${test.verdictClass}">${test.verdictLabel}</div>
        </div>
        <div class="lab-what">${test.interpretation}</div>
        <div class="lab-values">
          <div><span class="lab-val-label">${isHi ? 'आपका:' : 'Your result:'}</span> <span class="lab-val-num">${test.result}</span> ${test.unit}</div>
          ${test.reference_range ? `<div><span class="lab-val-label">${isHi ? 'सामान्य:' : 'Normal:'}</span> ${test.reference_range}</div>` : ''}
        </div>
      </div>`;
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  _handleManualExplain() {
    const textarea = document.getElementById('explainTextarea');
    const text = textarea?.value?.trim();
    if (!text) {
      this.ui._toast?.('warning', '📝', this.ui.lang === 'hi' ? 'कृपया कुछ लिखें।' : 'Please enter some text.');
      return;
    }
    const lang = this.ui.lang || 'en';
    const prescriptions = this.engine.parseManualText(text);
    if (prescriptions.length === 0) {
      this.ui._toast?.('warning', '📝', this.ui.lang === 'hi' ? 'कोई दवा नहीं पहचानी गई।' : 'No medicines recognized.');
      return;
    }
    const rxResult = this.engine.explainPrescriptions(prescriptions, lang);
    this._explainResult = { rxResult, labResult: null };
    this._renderPage();
    this.ui._toast?.('success', '📖', `${rxResult.medicines.length} ${lang === 'hi' ? 'दवाइयाँ समझाई गईं' : 'medicines explained'}`);
  }

  _handleExplainVisitRx(visitId) {
    const visit = this.healthStore.getVisitById(visitId);
    if (!visit?.prescriptions?.length) return;
    const lang = this.ui.lang || 'en';
    const rxResult = this.engine.explainPrescriptions(visit.prescriptions, lang);
    this._explainResult = { rxResult, labResult: null };
    this._activeTab = 'records';
    this.ui._navigate('explainer');
    this.ui._toast?.('success', '📖', `${rxResult.medicines.length} ${lang === 'hi' ? 'दवाइयाँ समझाई गईं' : 'medicines explained'}`);
  }

  _handleExplainVisitLab(visitId) {
    const visit = this.healthStore.getVisitById(visitId);
    if (!visit?.lab_reports?.length) return;
    const lang = this.ui.lang || 'en';
    const labResult = this.engine.explainLabReports(visit.lab_reports, lang);
    this._explainResult = { rxResult: null, labResult };
    this._activeTab = 'records';
    this.ui._navigate('explainer');
    this.ui._toast?.('success', '🧪', `${labResult.tests.length} ${lang === 'hi' ? 'जांचें समझाई गईं' : 'lab tests explained'}`);
  }

  _handleExplainVisitAll(visitId) {
    const visit = this.healthStore.getVisitById(visitId);
    if (!visit) return;
    const lang = this.ui.lang || 'en';
    const rxResult = visit.prescriptions?.length ? this.engine.explainPrescriptions(visit.prescriptions, lang) : null;
    const labResult = visit.lab_reports?.length ? this.engine.explainLabReports(visit.lab_reports, lang) : null;
    this._explainResult = { rxResult, labResult };
    this._activeTab = 'records';
    this.ui._navigate('explainer');
    const total = (rxResult?.medicines?.length || 0) + (labResult?.tests?.length || 0);
    this.ui._toast?.('success', '📖', `${total} ${lang === 'hi' ? 'आइटम समझाए गए' : 'items explained'}`);
  }
}

window.ExplainerUI = ExplainerUI;
