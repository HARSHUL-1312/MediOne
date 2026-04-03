/**
 * MediOne — UI Controller
 * Manages routing, rendering all views, forms, modals, and language switching.
 */

class UIController {
  constructor(engine, store) {
    this.engine   = engine;
    this.store    = store;
    this.lang     = 'en';
    this.currentPage = 'dashboard';
    this._toasts  = [];
    this._pendingRxCount = 0;
    this._pendingLabCount = 0;

    this._strings = {
      en: {
        dashboard: 'Dashboard', records: 'Health Records', addVisit: 'Add Visit',
        consent: 'Consent Manager', summary: 'Patient Summary',
        emergency: 'Emergency Card', vitals: 'Vitals', prescriptions: 'Prescriptions',
        labReports: 'Lab Reports', diagnosis: 'Diagnosis', followUp: 'Follow-up',
        doctorNotes: 'Doctor Notes', patientSummary: 'Patient-Friendly Summary',
        addMedicine: '+ Add Medicine', addLab: '+ Add Lab Test',
        submitVisit: 'Save Visit Record', shareDoctor: 'Share with Doctor',
        revokeAccess: 'Revoke', activeTokens: 'Active Consent Tokens',
        noRecords: 'No visits recorded yet.', totalVisits: 'Total Visits',
        lastVisit: 'Last Visit', activeRx: 'Active Prescriptions',
        nextFollowUp: 'Next Follow-up', chronicConditions: 'Chronic Conditions',
        allergies: 'Known Allergies', bloodGroup: 'Blood Group',
        emergencyContact: 'Emergency Contact', currentMeds: 'Current Medications',
        majorDiagnoses: 'Major Diagnoses', generatedAt: 'Generated at',
        expiresAt: 'Expires', issuedAt: 'Issued', facility: 'Facility',
        doctor: 'Doctor', complaint: 'Chief Complaint',
        tokenActive: 'Active', tokenExpired: 'Expired', tokenRevoked: 'Revoked',
        all: 'All', lastThree: 'Last 3 visits',
        print: '🖨️ Print', close: 'Close',
        adherencePing: 'Adherence reminders set up for',
        visitSaved: 'Visit record saved successfully!',
        consentGranted: 'Consent token generated',
        duplicateCheck: 'Duplicate check: ',
      },
      hi: {
        dashboard: 'डैशबोर्ड', records: 'स्वास्थ्य रिकॉर्ड', addVisit: 'नई जांच जोड़ें',
        consent: 'सहमति प्रबंधक', summary: 'रोगी सारांश',
        emergency: 'आपातकाल कार्ड', vitals: 'जांच के आंकड़े', prescriptions: 'दवाइयाँ',
        labReports: 'प्रयोगशाला रिपोर्ट', diagnosis: 'निदान', followUp: 'अनुवर्ती',
        doctorNotes: 'डॉक्टर के नोट्स', patientSummary: 'सरल भाषा में सारांश',
        addMedicine: '+ दवा जोड़ें', addLab: '+ जांच जोड़ें',
        submitVisit: 'रिकॉर्ड सहेजें', shareDoctor: 'डॉक्टर से साझा करें',
        revokeAccess: 'रद्द करें', activeTokens: 'सक्रिय सहमति टोकन',
        noRecords: 'अभी तक कोई दौरा दर्ज नहीं है।', totalVisits: 'कुल दौरे',
        lastVisit: 'अंतिम दौरा', activeRx: 'सक्रिय दवाइयाँ',
        nextFollowUp: 'अगली जांच', chronicConditions: 'पुरानी बीमारियाँ',
        allergies: 'एलर्जी', bloodGroup: 'रक्त समूह',
        emergencyContact: 'आपातकालीन संपर्क', currentMeds: 'वर्तमान दवाइयाँ',
        majorDiagnoses: 'प्रमुख निदान', generatedAt: 'समय',
        expiresAt: 'समाप्ति', issuedAt: 'जारी', facility: 'अस्पताल',
        doctor: 'डॉक्टर', complaint: 'मुख्य शिकायत',
        tokenActive: 'सक्रिय', tokenExpired: 'समाप्त', tokenRevoked: 'रद्द',
        all: 'सभी', lastThree: 'अंतिम 3 दौरे',
        print: '🖨️ प्रिंट', close: 'बंद करें',
        adherencePing: 'दवा रिमाइंडर सेट: ',
        visitSaved: 'दौरे का रिकॉर्ड सहेज लिया गया!',
        consentGranted: 'सहमति टोकन जनरेट हुआ',
        duplicateCheck: 'डुप्लिकेट जांच: ',
      }
    };
  }

  s(key) { return (this._strings[this.lang] || this._strings.en)[key] || key; }

  init() {
    this._renderSidebar();
    this._renderTopbar();
    this._setupListeners();
    this._navigate(location.hash.slice(1) || 'dashboard');
    this._startClock();
    this._handleAdherence();
  }

  // ── Sidebar ────────────────────────────────────────────────────────────────
  _renderSidebar() {
    const patient = this.store.getPatient();
    const initials = patient?.name.split(' ').slice(0,2).map(w=>w[0]).join('') || 'RK';
    const sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = `
      <div class="sidebar-logo">
        <div class="logo-mark">
          <div class="logo-icon">🩺</div>
          <div>
            <div class="logo-text">MediOne</div>
            <div class="logo-sub">मेडीवन</div>
          </div>
        </div>
      </div>
      <div class="patient-chip">
        <div class="patient-avatar">${initials}</div>
        <div class="patient-info">
          <div class="patient-name">${patient?.name || 'Patient'}</div>
          <div class="patient-abdm">ABDM: ${patient?.abdm_health_id || '—'}</div>
        </div>
      </div>
      <div class="nav-section">Navigation</div>
      <ul class="nav-items">
        <li class="nav-item"><button class="nav-link" data-page="dashboard"><span class="nav-icon">🏠</span>${this.s('dashboard')}</button></li>
        <li class="nav-item"><button class="nav-link" data-page="records"><span class="nav-icon">📋</span>${this.s('records')}</button></li>
        <li class="nav-item"><button class="nav-link" data-page="add-visit"><span class="nav-icon">➕</span>${this.s('addVisit')}</button></li>
        <li class="nav-item"><button class="nav-link" data-page="consent"><span class="nav-icon">🔐</span>${this.s('consent')}</button></li>
        <li class="nav-item"><button class="nav-link" data-page="summary"><span class="nav-icon">📄</span>${this.s('summary')}</button></li>
      </ul>
      <div class="nav-section" style="margin-top:auto">Emergency</div>
      <button class="emergency-btn" id="emergencyBtn">
        <span class="pulse-dot"></span> 🆘 ${this.s('emergency')}
      </button>
      <div class="lang-toggle">
        <button class="lang-btn ${this.lang==='en'?'active':''}" data-lang="en">EN</button>
        <button class="lang-btn ${this.lang==='hi'?'active':''}" data-lang="hi">हिं</button>
      </div>`;
    this._setActiveNav();
  }

  _renderTopbar() {
    const patient = this.store.getPatient();
    document.getElementById('topbar-title').textContent  = this._pageTitle();
    document.getElementById('topbar-sub').textContent    = `ABDM ID: ${patient?.abdm_health_id} • ${patient?.blood_group} • ${patient?.age} yrs`;
  }

  _pageTitle() {
    const map = { dashboard: this.s('dashboard'), records: this.s('records'), 'add-visit': this.s('addVisit'), consent: this.s('consent'), summary: this.s('summary') };
    return map[this.currentPage] || 'MediOne';
  }

  _setActiveNav() {
    document.querySelectorAll('.nav-link').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.page === this.currentPage);
    });
  }

  // ── Listeners ─────────────────────────────────────────────────────────────
  _setupListeners() {
    document.addEventListener('click', e => {
      const page = e.target.closest('[data-page]')?.dataset.page;
      if (page) { this._navigate(page); return; }
      const lang = e.target.closest('[data-lang]')?.dataset.lang;
      if (lang) { this._setLang(lang); return; }
      if (e.target.closest('#emergencyBtn')) { this._showEmergencyModal(); return; }
      if (e.target.closest('[data-visit-toggle]')) { this._toggleVisitDetail(e.target.closest('[data-visit-toggle]').dataset.visitToggle); return; }
      if (e.target.closest('[data-revoke]')) { this._revokeToken(e.target.closest('[data-revoke]').dataset.revoke); return; }
    });
    window.addEventListener('hashchange', () => this._navigate(location.hash.slice(1) || 'dashboard'));
  }

  _navigate(page) {
    this.currentPage = page;
    location.hash = page;
    const main = document.getElementById('page-content');
    main.innerHTML = '';
    switch (page) {
      case 'dashboard': this._renderDashboard(); break;
      case 'records':   this._renderRecords(); break;
      case 'add-visit': this._renderAddVisit(); break;
      case 'consent':   this._renderConsent(); break;
      case 'summary':   this._renderSummary(); break;
      default:          this._renderDashboard();
    }
    this._setActiveNav();
    this._renderTopbar();
    document.getElementById('topbar-title').textContent = this._pageTitle();
    main.style.animation = 'pageSlide3D 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards';
  }

  _setLang(lang) {
    this.lang = lang;
    this._renderSidebar();
    this._navigate(this.currentPage);
  }

  // ── Clock ──────────────────────────────────────────────────────────────────
  _startClock() {
    const el = document.getElementById('topbar-time');
    const tick = () => {
      const now = new Date();
      el.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    tick();
    setInterval(tick, 1000);
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────
  _renderDashboard() {
    const { last3, chronic_conditions, active_medications, total_visits } = this.engine.showRecords();
    const patient  = this.store.getPatient();
    const lastVisit = last3[0];
    const nextFU    = last3.find(v => v.follow_up_date)?.follow_up_date || '—';

    const container = document.getElementById('page-content');
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2>👋 ${this.lang==='hi' ? `नमस्ते, ${patient?.name_hi || patient?.name}` : `Hello, ${patient?.name?.split(' ')[0]}`}</h2>
          <p class="page-header-sub">${this.lang==='hi' ? 'आपका स्वास्थ्य डैशबोर्ड' : 'Your complete health overview'} • ${new Date().toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' })}</p>
        </div>
        <button class="btn btn-primary" data-page="add-visit">➕ ${this.s('addVisit')}</button>
      </div>

      <div class="stats-grid">
        <div class="stat-card" style="--accent-color:var(--accent-primary)">
          <div class="stat-card-inner">
            <div class="stat-card-front">
              <div class="stat-icon">🏥</div>
              <div class="stat-value">${total_visits}</div>
              <div class="stat-label">${this.s('totalVisits')}</div>
            </div>
            <div class="stat-card-back">
              <div style="font-size:24px;font-weight:800;color:var(--accent-primary)">Records</div>
              <div style="font-size:12px;opacity:0.8;margin-top:8px">Tracked across multiple facilities</div>
            </div>
          </div>
        </div>
        <div class="stat-card" style="--accent-color:var(--accent-secondary)">
          <div class="stat-card-inner">
            <div class="stat-card-front">
              <div class="stat-icon">📅</div>
              <div class="stat-value">${lastVisit ? new Date(lastVisit.date).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—'}</div>
              <div class="stat-label">${this.s('lastVisit')}</div>
              <div class="stat-sub">${lastVisit?.facility_name || ''}</div>
            </div>
            <div class="stat-card-back">
              <div style="font-size:16px;font-weight:700">${lastVisit?.doctor_name || 'No Data'}</div>
              <div style="font-size:11px;opacity:0.8;margin-top:8px;font-style:italic">"${lastVisit?.chief_complaint || ''}"</div>
            </div>
          </div>
        </div>
        <div class="stat-card" style="--accent-color:var(--accent-warning)">
          <div class="stat-card-inner">
            <div class="stat-card-front">
              <div class="stat-icon">💊</div>
              <div class="stat-value">${active_medications.length}</div>
              <div class="stat-label">${this.s('activeRx')}</div>
            </div>
            <div class="stat-card-back">
              <div style="font-size:20px;font-weight:800;color:var(--accent-warning)">Adherence</div>
              <div style="font-size:12px;opacity:0.8;margin-top:8px">Audio reminders active</div>
            </div>
          </div>
        </div>
        <div class="stat-card" style="--accent-color:var(--accent-info)">
          <div class="stat-card-inner">
            <div class="stat-card-front">
              <div class="stat-icon">🔔</div>
              <div class="stat-value">${nextFU !== '—' ? new Date(nextFU).toLocaleDateString('en-IN',{day:'numeric',month:'short'}) : '—'}</div>
              <div class="stat-label">${this.s('nextFollowUp')}</div>
            </div>
            <div class="stat-card-back">
              <div style="font-size:18px;font-weight:800;color:var(--accent-info)">Upcoming</div>
              <div style="font-size:12px;opacity:0.8;margin-top:8px">Don't miss your checkup!</div>
            </div>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="icon">🧬</span>${this.s('chronicConditions')}</div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px">
            ${chronic_conditions.map(c => `<div class="chronic-pill"><div class="chronic-pill-dot"></div><span class="chronic-pill-text">${c}</span></div>`).join('')}
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <div class="card-title"><span class="icon">⚠️</span>${this.s('allergies')}</div>
          </div>
          <div class="tag-list">
            ${(patient?.allergies||[]).map(a => `<span class="tag tag-danger">🚫 ${a}</span>`).join('')}
          </div>
          <div style="height:16px"></div>
          <div class="card-title" style="font-size:13px"><span class="icon">🩸</span>${this.s('bloodGroup')}</div>
          <div style="font-size:36px;font-weight:900;color:var(--accent-danger);margin-top:4px">${patient?.blood_group}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title"><span class="icon">📋</span>${this.s('lastThree')}</div>
          <button class="btn btn-secondary btn-sm" data-page="records">View All →</button>
        </div>
        ${last3.length === 0 ? `<div class="empty-state"><div class="empty-icon">📭</div><p>${this.s('noRecords')}</p></div>` : last3.map(v => this._visitCardHTML(v)).join('')}
      </div>`;
  }

  // ── Records Page ───────────────────────────────────────────────────────────
  _renderRecords() {
    const visits = this.store.getVisits();
    const container = document.getElementById('page-content');
    
    // SVG Chart for Weight and BP (Systolic)
    let chartHtml = '';
    if (visits.length >= 2) {
      chartHtml = this._generateVitalsChart(visits);
    }

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2>📋 ${this.s('records')}</h2>
          <p class="page-header-sub">${visits.length} total visits recorded</p>
        </div>
        <button class="btn btn-primary" data-page="add-visit">➕ ${this.s('addVisit')}</button>
      </div>
      ${chartHtml}
      ${visits.length === 0
        ? `<div class="empty-state"><div class="empty-icon">📭</div><p>${this.s('noRecords')}</p></div>`
        : visits.map(v => this._visitCardHTML(v, true)).join('')
      }`;
  }

  // ── Smart SVG Charting ─────────────────────────────────────────────────────
  _generateVitalsChart(visits) {
    // Reverse to chronological order
    const chron = [...visits].reverse().filter(v => v.vitals && (v.vitals.weight || v.vitals.bp || v.vitals.blood_sugar_fasting));
    if (chron.length < 2) return '';

    // Extract weights
    const weights = chron.map(v => ({ date: v.date.slice(5), val: parseFloat(v.vitals.weight) })).filter(d => !isNaN(d.val));
    let weightSvg = '';
    
    if (weights.length >= 2) {
      const wWidth = 300, wHeight = 80;
      const wMax = Math.max(...weights.map(w=>w.val)) + 5;
      const wMin = Math.max(0, Math.min(...weights.map(w=>w.val)) - 5);
      
      const pts = weights.map((w, i) => {
        const x = (i / (weights.length - 1)) * (wWidth - 20) + 10;
        const y = wHeight - ((w.val - wMin) / (wMax - wMin)) * (wHeight - 20) - 10;
        return `${x},${y}`;
      }).join(' ');

      const circles = weights.map((w, i) => {
        const x = (i / (weights.length - 1)) * (wWidth - 20) + 10;
        const y = wHeight - ((w.val - wMin) / (wMax - wMin)) * (wHeight - 20) - 10;
        return `<circle cx="${x}" cy="${y}" r="4" fill="var(--accent-primary)"/>`;
      }).join('');

      weightSvg = `
        <div class="chart-box">
          <div style="font-size:12px;font-weight:600;margin-bottom:8px">Weight Trend (kg)</div>
          <svg viewBox="0 0 ${wWidth} ${wHeight}" style="width:100%;height:100%;overflow:visible">
            <polyline points="${pts}" fill="none" stroke="var(--accent-primary)" stroke-width="2" stroke-linejoin="round"/>
            ${circles}
          </svg>
        </div>
      `;
    }

    if (!weightSvg) return '';
    return `<div class="card mb-16" style="background:var(--surface-sunken)">
        <div class="card-title" style="margin-bottom:12px">📈 Vitals Trends</div>
        <div style="display:grid;grid-template-columns:1fr;gap:16px">${weightSvg}</div>
      </div>`;
  }

  // ── Visit Card HTML ────────────────────────────────────────────────────────
  _visitCardHTML(v, showFull = false) {
    const diags  = (v.diagnosis || []).map((d, i) => `<span class="diagnosis-chip ${i===0?'primary':''}">${d.label}</span>`).join('');
    const dateStr = new Date(v.date).toLocaleDateString('en-IN', { day:'numeric', month:'long', year:'numeric' });

    return `
      <div class="visit-card" data-visit-toggle="${v.visit_id}" id="vcard-${v.visit_id}">
        <div class="visit-meta">
          <div style="flex:1;min-width:0">
            <div class="d-flex align-center gap-8" style="flex-wrap:wrap">
              <span class="visit-date-badge">📅 ${dateStr}</span>
              <span class="visit-facility">${v.facility_name}</span>
            </div>
            <div class="visit-doctor">👨‍⚕️ ${v.doctor_name}</div>
            <div class="visit-complaint">"${v.chief_complaint}"</div>
            <div class="diagnosis-chips">${diags}</div>
          </div>
          <span style="color:var(--text-muted);font-size:18px;transition:transform 0.2s" id="chevron-${v.visit_id}">›</span>
        </div>
        <div class="visit-detail" id="vdetail-${v.visit_id}" style="display:none">
          ${this._visitDetailHTML(v)}
        </div>
      </div>`;
  }

  _visitDetailHTML(v) {
    const sections = [];

    // Vitals
    if (v.vitals && Object.keys(v.vitals).length > 0) {
      const vitItems = Object.entries(v.vitals).map(([k,val]) =>
        `<div class="vital-item"><div class="vital-label">${k.replace(/_/g,' ')}</div><div class="vital-value">${val}</div></div>`
      ).join('');
      sections.push(`<div class="section-label">🌡️ ${this.s('vitals')}</div><div class="vitals-grid">${vitItems}</div>`);
    }

    // Prescriptions
    if (v.prescriptions?.length > 0) {
      const rxHtml = v.prescriptions.map(p => `
        <div class="rx-item">
          <span class="rx-icon">💊</span>
          <div>
            <div class="rx-name">${p.medicine_name}</div>
            <div class="rx-dosage">${p.dosage} — ${p.frequency} — ${p.duration}</div>
            ${p.instructions ? `<div class="rx-detail">📌 ${p.instructions}</div>` : ''}
          </div>
        </div>`).join('');
      sections.push(`<div class="section-label">💊 ${this.s('prescriptions')}</div><div class="rx-list">${rxHtml}</div>`);
    }

    // Lab Reports
    if (v.lab_reports?.length > 0) {
      const rows = v.lab_reports.map(l => {
        const isNum = !isNaN(parseFloat(l.result));
        const flagClass = isNum ? (parseFloat(l.result) > parseFloat((l.reference_range||'').split('–').pop()) ? 'abnormal' : 'normal') : 'normal';
        return `<tr>
          <td><span class="lab-flag ${flagClass}"></span>${l.test_name}</td>
          <td class="fw-bold">${l.result}</td>
          <td class="text-muted">${l.unit}</td>
          <td class="text-muted">${l.reference_range}</td>
          <td>${l.file_url && l.file_url !== '#' ? `<a href="${l.file_url}" target="_blank" class="text-info" style="font-size:11px">View</a>` : '<span class="text-muted" style="font-size:11px">—</span>'}</td>
        </tr>`;
      }).join('');
      sections.push(`<div class="section-label">🔬 ${this.s('labReports')}</div>
        <div style="overflow-x:auto"><table class="lab-table">
          <thead><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference</th><th>Report</th></tr></thead>
          <tbody>${rows}</tbody>
        </table></div>`);
    }

    // Follow-up
    if (v.follow_up_date) {
      sections.push(`<div class="section-label">📅 ${this.s('followUp')}</div>
        <span class="tag tag-info">📆 ${new Date(v.follow_up_date).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'})}</span>`);
    }

    // Patient-friendly summary
    if (v.patient_friendly_summary) {
      sections.push(`<div class="friendly-summary">
        <div class="fi-label">🗣️ ${this.s('patientSummary')}</div>
        ${v.patient_friendly_summary}
      </div>`);
    }

    // Doctor notes (raw)
    if (v.doctor_notes) {
      sections.push(`<div class="section-label">🩺 ${this.s('doctorNotes')}</div>
        <div style="font-size:12px;color:var(--text-muted);line-height:1.7;font-family:'Courier New',monospace;background:rgba(255,255,255,0.03);padding:12px;border-radius:var(--radius-md)">${v.doctor_notes}</div>`);
    }

    return sections.join('<div style="height:14px"></div>');
  }

  _toggleVisitDetail(visitId) {
    const detail  = document.getElementById(`vdetail-${visitId}`);
    const chevron = document.getElementById(`chevron-${visitId}`);
    const card    = document.getElementById(`vcard-${visitId}`);
    if (!detail) return;
    const open = detail.style.display !== 'none';
    detail.style.display  = open ? 'none' : 'block';
    chevron.textContent   = open ? '›' : '⌄';
    chevron.style.transform = open ? '' : 'rotate(0deg)';
    card.classList.toggle('expanded', !open);
  }

  // ── Add Visit Form ─────────────────────────────────────────────────────────
  _renderAddVisit() {
    this._pendingRxCount  = 0;
    this._pendingLabCount = 0;
    const container = document.getElementById('page-content');
    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2>➕ ${this.s('addVisit')}</h2>
          <p class="page-header-sub">Add a new medical visit record</p>
        </div>
      </div>
      <div class="card">
        <form id="visitForm">
          <div class="section-label">🏥 Visit Information</div>
          <div class="form-grid mb-16">
            <div class="form-group">
              <label class="form-label">Date *</label>
              <input class="form-control" type="date" name="date" id="f-date" value="${new Date().toISOString().slice(0,10)}" required>
            </div>
            <div class="form-group">
              <label class="form-label">${this.s('facility')} *</label>
              <input class="form-control" type="text" name="facility_name" placeholder="e.g. Apollo Hospitals, Delhi" required>
            </div>
            <div class="form-group">
              <label class="form-label">${this.s('doctor')} *</label>
              <input class="form-control" type="text" name="doctor_name" placeholder="Dr. Name (Specialization)" required>
            </div>
            <div class="form-group">
              <label class="form-label">${this.s('complaint')} *</label>
              <input class="form-control" type="text" name="chief_complaint" placeholder="Main reason for visit" required>
            </div>
          </div>

          <div class="section-label">🔬 ${this.s('diagnosis')}</div>
          <div id="diagnosisSection">
            <div class="sub-card">
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">Diagnosis</label>
                  <input class="form-control" type="text" name="diag_label_0" placeholder="e.g. Type 2 Diabetes">
                </div>
                <div class="form-group">
                  <label class="form-label">ICD Code (optional)</label>
                  <input class="form-control" type="text" name="diag_icd_0" placeholder="e.g. E11.9">
                </div>
              </div>
            </div>
          </div>

          <div class="section-label" style="margin-top:16px">🌡️ ${this.s('vitals')}</div>
          <div class="form-grid mb-16">
            <div class="form-group"><label class="form-label">Blood Pressure</label><input class="form-control" type="text" name="v_bp" placeholder="120/80 mmHg"></div>
            <div class="form-group"><label class="form-label">Pulse</label><input class="form-control" type="text" name="v_pulse" placeholder="72 bpm"></div>
            <div class="form-group"><label class="form-label">Temperature</label><input class="form-control" type="text" name="v_temperature" placeholder="36.8°C"></div>
            <div class="form-group"><label class="form-label">Weight</label><input class="form-control" type="text" name="v_weight" placeholder="70 kg"></div>
            <div class="form-group"><label class="form-label">SpO2</label><input class="form-control" type="text" name="v_spo2" placeholder="98%"></div>
            <div class="form-group"><label class="form-label">Blood Sugar (Fasting)</label><input class="form-control" type="text" name="v_blood_sugar_fasting" placeholder="100 mg/dL"></div>
          </div>

          <div class="section-label">💊 ${this.s('prescriptions')}</div>
          <div id="rxSection"></div>
          <button type="button" class="btn btn-secondary btn-sm" id="addRxBtn">💊 ${this.s('addMedicine')}</button>

          <div class="section-label" style="margin-top:20px">🔬 ${this.s('labReports')}</div>
          <div id="labSection"></div>
          <button type="button" class="btn btn-secondary btn-sm" id="addLabBtn">🧪 ${this.s('addLab')}</button>
          <div id="duplicateWarningZone"></div>

          <div class="section-label" style="margin-top:20px">📝 Notes</div>
          <div class="form-grid">
            <div class="form-group">
              <label class="form-label">${this.s('followUp')} Date</label>
              <input class="form-control" type="date" name="follow_up_date">
            </div>
            <div class="form-group">
              <label class="form-label">${this.s('doctorNotes')}</label>
              <textarea class="form-control" name="doctor_notes" placeholder="Doctor's raw notes..."></textarea>
            </div>
            <div class="form-group">
              <label class="form-label">${this.s('patientSummary')} (Hindi/English)</label>
              <textarea class="form-control" name="patient_friendly_summary" placeholder="Simple explanation for the patient..."></textarea>
            </div>
          </div>

          <div style="display:flex;gap:12px;margin-top:24px">
            <button type="submit" class="btn btn-primary">💾 ${this.s('submitVisit')}</button>
            <button type="button" class="btn btn-secondary" data-page="records">Cancel</button>
          </div>
        </form>
      </div>`;

    // Event listeners for dynamic form
    document.getElementById('addRxBtn').addEventListener('click', () => this._addRxRow());
    document.getElementById('addLabBtn').addEventListener('click', () => {
      this._addLabRow();
    });
    document.getElementById('visitForm').addEventListener('submit', e => { e.preventDefault(); this._submitVisit(e.target); });
    // Auto-add one row each
    this._addRxRow();
    this._addLabRow();
  }

  _addRxRow() {
    const i = this._pendingRxCount++;
    const section = document.getElementById('rxSection');
    const div = document.createElement('div');
    div.className = 'sub-card';
    div.id = `rx-row-${i}`;
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:12px;font-weight:600;color:var(--text-secondary)">Medicine ${i+1}</span>
        <button type="button" class="btn-icon" onclick="this.closest('.sub-card').remove()">✕</button>
      </div>
      <div class="form-grid">
        <div class="form-group"><label class="form-label">Medicine Name *</label><input class="form-control" type="text" name="rx_name_${i}" placeholder="e.g. Metformin"></div>
        <div class="form-group"><label class="form-label">Dosage</label><input class="form-control" type="text" name="rx_dosage_${i}" placeholder="500 mg"></div>
        <div class="form-group"><label class="form-label">Frequency</label>
          <select class="form-control" name="rx_freq_${i}">
            <option>Once daily</option><option>Twice daily</option><option>Three times daily</option>
            <option>Once weekly</option><option>As needed (SOS)</option><option>Once at bedtime</option>
          </select>
        </div>
        <div class="form-group"><label class="form-label">Duration</label><input class="form-control" type="text" name="rx_dur_${i}" placeholder="30 days"></div>
        <div class="form-group" style="grid-column:1/-1"><label class="form-label">Instructions</label><input class="form-control" type="text" name="rx_inst_${i}" placeholder="e.g. Take with meals"></div>
      </div>`;
    section.appendChild(div);
  }

  _addLabRow() {
    const i = this._pendingLabCount++;
    const section = document.getElementById('labSection');
    const div = document.createElement('div');
    div.className = 'sub-card';
    div.id = `lab-row-${i}`;
    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;margin-bottom:8px">
        <span style="font-size:12px;font-weight:600;color:var(--text-secondary)">Lab Test ${i+1}</span>
        <button type="button" class="btn-icon" onclick="this.closest('.sub-card').remove()">✕</button>
      </div>
      <div class="form-grid">
        <div class="form-group"><label class="form-label">Test Name *</label><input class="form-control" type="text" name="lab_test_${i}" placeholder="e.g. HbA1c" id="lab-test-input-${i}"></div>
        <div class="form-group"><label class="form-label">Result</label><input class="form-control" type="text" name="lab_result_${i}" placeholder="e.g. 7.2"></div>
        <div class="form-group"><label class="form-label">Unit</label><input class="form-control" type="text" name="lab_unit_${i}" placeholder="% / mg/dL"></div>
        <div class="form-group"><label class="form-label">Reference Range</label><input class="form-control" type="text" name="lab_ref_${i}" placeholder="e.g. < 7.0"></div>
      </div>`;
    section.appendChild(div);
    // Duplicate check on blur
    const inp = div.querySelector(`#lab-test-input-${i}`);
    inp.addEventListener('blur', () => this._checkDuplicateInline(inp.value));
  }

  _checkDuplicateInline(testName) {
    const zone = document.getElementById('duplicateWarningZone');
    if (!testName?.trim()) { zone.innerHTML = ''; return; }
    const res = this.engine.checkDuplicates(testName);
    if (res.duplicate) {
      zone.innerHTML = `
        <div class="duplicate-warning">
          ${res.warning}<br>
          <strong>Previous:</strong> ${res.test_name} = ${res.previous_result} on ${res.previous_date} at ${res.previous_facility}
        </div>`;
    } else {
      zone.innerHTML = '';
    }
  }

  _submitVisit(form) {
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());

    // Build diagnosis array
    const diagnosis = [];
    for (let i = 0; data[`diag_label_${i}`] !== undefined; i++) {
      if (data[`diag_label_${i}`]) diagnosis.push({ label: data[`diag_label_${i}`], icd_code: data[`diag_icd_${i}`] || '' });
    }

    // Build vitals
    const vitals = {};
    ['bp','pulse','temperature','weight','spo2','blood_sugar_fasting'].forEach(k => {
      if (data[`v_${k}`]) vitals[k] = data[`v_${k}`];
    });

    // Build prescriptions
    const prescriptions = [];
    for (let i = 0; i < this._pendingRxCount; i++) {
      if (data[`rx_name_${i}`]) prescriptions.push({
        medicine_name: data[`rx_name_${i}`],
        dosage: data[`rx_dosage_${i}`] || '',
        frequency: data[`rx_freq_${i}`] || '',
        duration: data[`rx_dur_${i}`] || '',
        instructions: data[`rx_inst_${i}`] || '',
      });
    }

    // Build lab reports
    const lab_reports = [];
    for (let i = 0; i < this._pendingLabCount; i++) {
      if (data[`lab_test_${i}`]) lab_reports.push({
        test_name: data[`lab_test_${i}`],
        result: data[`lab_result_${i}`] || '',
        unit: data[`lab_unit_${i}`] || '',
        reference_range: data[`lab_ref_${i}`] || '',
        file_url: '#',
      });
    }

    const result = this.engine.addVisit({
      date: data.date,
      facility_name: data.facility_name,
      doctor_name: data.doctor_name,
      chief_complaint: data.chief_complaint,
      diagnosis, vitals, prescriptions, lab_reports,
      follow_up_date: data.follow_up_date,
      doctor_notes: data.doctor_notes,
      patient_friendly_summary: data.patient_friendly_summary,
    });

    if (result.success) {
      this._toast('success', '✅ Visit Saved', `${this.s('visitSaved')} ID: ${result.visit_id}`);
      this._navigate('records');
    }
  }

  // ── Consent Manager ────────────────────────────────────────────────────────
  _renderConsent() {
    const tokens = this.store.getConsentTokens();
    const container = document.getElementById('page-content');
    const now = Date.now();

    const tokenRows = tokens.map(t => {
      const expired  = new Date(t.expires_at).getTime() < now;
      const status   = t.revoked ? 'revoked' : (expired ? 'expired' : 'active');
      const labels   = { active: this.s('tokenActive'), expired: this.s('tokenExpired'), revoked: this.s('tokenRevoked') };
      const timeLeft = expired || t.revoked ? '' : `⏱ Expires ${new Date(t.expires_at).toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`;
      return `
        <div class="consent-card">
          <div class="consent-status"><div class="consent-status-dot ${status}"></div></div>
          <div style="flex:1;min-width:0">
            <div class="d-flex align-center gap-8" style="flex-wrap:wrap">
              <span class="token-badge">${t.token_id}</span>
              <span class="tag tag-${status === 'active' ? 'primary' : 'warning'}" style="font-size:10px">${labels[status]}</span>
            </div>
            <div style="font-size:13px;font-weight:600;margin-top:6px">👨‍⚕️ ${t.doctor_name}</div>
            <div style="font-size:12px;color:var(--text-secondary)">🏥 ${t.facility_name || '—'}</div>
            <div style="font-size:11px;color:var(--text-muted);margin-top:4px">
              ${this.s('issuedAt')}: ${new Date(t.issued_at).toLocaleString('en-IN')} &nbsp;•&nbsp; Scope: ${t.scope}
            </div>
            ${timeLeft ? `<div class="consent-timer">⏱ ${timeLeft}</div>` : ''}
          </div>
          ${status === 'active' ? `<button class="btn btn-danger btn-sm" data-revoke="${t.token_id}">🚫 ${this.s('revokeAccess')}</button>` : ''}
        </div>`;
    }).join('');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2>🔐 ${this.s('consent')}</h2>
          <p class="page-header-sub">Manage who can access your health records</p>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div>
          <div class="card">
            <div class="card-header"><div class="card-title"><span class="icon">➕</span>${this.s('shareDoctor')}</div></div>
            <form id="consentForm">
              <div class="form-group mb-16">
                <label class="form-label">Doctor Name *</label>
                <input class="form-control" type="text" name="doctor_name" placeholder="Dr. Asha Kumar" required>
              </div>
              <div class="form-group mb-16">
                <label class="form-label">Doctor / Facility ID</label>
                <input class="form-control" type="text" name="doctor_id" placeholder="e.g. DR-NABL-00123">
              </div>
              <div class="form-group mb-16">
                <label class="form-label">Hospital / Facility</label>
                <input class="form-control" type="text" name="facility_name" placeholder="e.g. Max Hospital, Delhi">
              </div>
              <div class="form-group mb-16">
                <label class="form-label">Access Scope</label>
                <select class="form-control" name="scope">
                  <option value="all">Full Records (All Visits)</option>
                  <option value="last_visit">Last Visit Only</option>
                  <option value="emergency">Emergency Card Only</option>
                  <option value="labs">Lab Reports Only</option>
                </select>
              </div>
              <button type="submit" class="btn btn-primary" style="width:100%">🔑 Generate Consent Token (24h)</button>
            </form>
          </div>
        </div>
        <div>
          <div class="card-title" style="margin-bottom:12px"><span class="icon">📋</span>${this.s('activeTokens')} (${tokens.length})</div>
          ${tokens.length === 0
            ? `<div class="empty-state"><div class="empty-icon">🔒</div><p>No consent tokens yet.</p></div>`
            : tokenRows}
        </div>
      </div>`;

    document.getElementById('consentForm').addEventListener('submit', e => {
      e.preventDefault();
      const fd   = new FormData(e.target);
      const data = Object.fromEntries(fd.entries());
      const res  = this.engine.shareWithDoctor(data.doctor_id || 'EXT-'+Date.now(), data.doctor_name, data.facility_name, data.scope);
      this._toast('success', '🔑 ' + this.s('consentGranted'), `Token: ${res.token_id} • Expires in 24h`);
      e.target.reset();
      this._navigate('consent');
    });
  }

  _revokeToken(tokenId) {
    this.store.revokeConsentToken(tokenId);
    this._toast('warning', '🚫 Access Revoked', `Token ${tokenId} has been revoked.`);
    this._navigate('consent');
  }

  // ── Patient Summary Page ───────────────────────────────────────────────────
  _renderSummary() {
    const sum     = this.engine.generatePatientSummary();
    const patient = sum.patient;
    const container = document.getElementById('page-content');
    const genDate   = new Date(sum.summary_generated_at).toLocaleString('en-IN');

    const diagRows  = sum.known_diagnoses.map(d => `<div class="rx-item"><span class="rx-icon">🔬</span><div><div class="rx-name">${d}</div></div></div>`).join('');
    const medRows   = sum.current_medications.map(m => `<div class="rx-item"><span class="rx-icon">💊</span><div><div class="rx-name">${m.medicine_name} ${m.dosage}</div><div class="rx-dosage">${m.frequency} — ${m.duration}</div>${m.instructions?`<div class="rx-detail">📌 ${m.instructions}</div>`:''}</div></div>`).join('');
    const labRows   = sum.recent_labs.map(l => `<tr><td>${l.test_name}</td><td class="fw-bold">${l.result}</td><td class="text-muted">${l.unit}</td><td class="text-muted">${l.reference_range}</td></tr>`).join('');
    const allerRows = (patient?.allergies||[]).map(a => `<span class="tag tag-danger">🚫 ${a}</span>`).join('');

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2>📄 ${this.s('summary')}</h2>
          <p class="page-header-sub">Structured summary for a new doctor</p>
        </div>
        <button class="btn btn-secondary" onclick="window.print()">🖨️ Print</button>
      </div>

      <div class="summary-card">
        <div class="summary-header">
          <div>
            <div style="font-size:11px;text-transform:uppercase;letter-spacing:1px;color:var(--text-muted)">MediOne Patient Summary</div>
            <div style="font-size:22px;font-weight:800;margin-top:4px">${patient?.name}</div>
            <div style="font-size:12px;color:var(--text-secondary)">ABDM: <span class="font-mono">${patient?.abdm_health_id}</span> • ${patient?.age} yrs • ${patient?.gender}</div>
          </div>
          <div style="text-align:right">
            <div style="font-size:32px;font-weight:900;color:var(--accent-danger)">${patient?.blood_group}</div>
            <div style="font-size:10px;color:var(--text-muted)">Blood Group</div>
            <div style="font-size:10px;color:var(--text-muted);margin-top:4px">Generated: ${genDate}</div>
          </div>
        </div>

        <div class="grid-2" style="margin-bottom:20px">
          <div>
            <div class="section-label">📞 Contact</div>
            <div style="font-size:13px">${patient?.mobile}</div>
            <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${patient?.address}</div>
          </div>
          <div>
            <div class="section-label">🆘 ${this.s('emergencyContact')}</div>
            <div style="font-size:13px;font-weight:600">${patient?.emergency_contact?.name}</div>
            <div style="font-size:13px;color:var(--accent-secondary)">${patient?.emergency_contact?.phone}</div>
          </div>
        </div>

        <div class="section-label">⚠️ ${this.s('allergies')}</div>
        <div class="tag-list mb-16">${allerRows}</div>

        <div class="section-label">🧬 ${this.s('chronicConditions')}</div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-bottom:16px">
          ${(patient?.chronic_conditions||[]).map(c=>`<div class="chronic-pill"><div class="chronic-pill-dot"></div><span class="chronic-pill-text">${c}</span></div>`).join('')}
        </div>

        <div class="section-label">🔬 All Known Diagnoses</div>
        <div class="rx-list mb-16">${diagRows || '<div class="text-muted" style="font-size:12px">None recorded</div>'}</div>

        <div class="section-label">💊 ${this.s('currentMeds')} (Latest Visit)</div>
        <div class="rx-list mb-16">${medRows || '<div class="text-muted" style="font-size:12px">None recorded</div>'}</div>

        ${sum.recent_labs.length > 0 ? `
        <div class="section-label">🔬 Recent Lab Results</div>
        <div style="overflow-x:auto">
          <table class="lab-table">
            <thead><tr><th>Test</th><th>Result</th><th>Unit</th><th>Reference</th></tr></thead>
            <tbody>${labRows}</tbody>
          </table>
        </div>` : ''}

        ${sum.last_visit ? `
        <div style="margin-top:20px;padding:12px;background:rgba(255,255,255,0.03);border-radius:var(--radius-md);border:1px solid var(--border)">
          <div style="font-size:11px;color:var(--text-muted)">Last Visit • ${sum.last_visit.date} • ${sum.last_visit.facility_name}</div>
          <div class="friendly-summary" style="margin-top:8px">
            <div class="fi-label">🗣️ Patient Note</div>
            ${sum.last_visit.patient_friendly_summary || '—'}
          </div>
        </div>` : ''}

        <div style="margin-top:20px;padding:10px 14px;background:rgba(0,200,150,0.06);border-radius:var(--radius-md);border:1px solid rgba(0,200,150,0.15);font-size:11px;color:var(--text-muted)">
          This summary was auto-generated by MediOne Health Records Agent. Total visits on file: ${sum.total_visits}.
          Always consult original reports for clinical decisions. ABDM-compliant PHR.
        </div>
      </div>`;
  }

  // ── Emergency Modal ────────────────────────────────────────────────────────
  _showEmergencyModal() {
    const card = this.engine.getEmergencyCard('EMERGENCY-UI');
    const allergyList = card.allergies.map(a => `<div class="ec-list-item">${a}</div>`).join('');
    const medList     = card.current_medications.map(m => `<div class="ec-list-item">${m}</div>`).join('');
    const diagList    = card.major_diagnoses.map(d => `<div class="ec-list-item">${d}</div>`).join('');
    const chronList   = card.chronic_conditions.map(c => `<div class="ec-list-item">${c}</div>`).join('');

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'emergencyModal';
    overlay.innerHTML = `
      <div class="emergency-card">
        <button class="modal-close" onclick="document.getElementById('emergencyModal').remove()">✕</button>
        <div class="ec-header">
          <div class="ec-icon">🚨</div>
          <div>
            <div class="ec-title">🆘 MEDICAL EMERGENCY CARD</div>
            <div class="ec-name">${card.patient_name}</div>
            <div style="font-size:12px;color:rgba(255,255,255,0.5);margin-top:2px">ABDM: ${card.abdm_health_id} • ${card.age} yrs • ${card.gender}</div>
          </div>
        </div>

        <div class="ec-row">
          <div class="ec-item">
            <div class="ec-item-label">Blood Group</div>
            <div class="ec-item-value ec-blood">${card.blood_group}</div>
          </div>
          <div class="ec-item">
            <div class="ec-item-label">Last Visit</div>
            <div class="ec-item-value" style="font-size:13px">${card.last_visit ? `${card.last_visit.date}<br><span style="font-size:11px;opacity:0.6">${card.last_visit.facility}</span>` : '—'}</div>
          </div>
        </div>

        <div class="ec-section-title">🚫 ALLERGIES</div>
        <div class="ec-list">${allergyList || '<div class="ec-list-item">None known</div>'}</div>

        <div class="ec-section-title">🧬 CHRONIC CONDITIONS</div>
        <div class="ec-list">${chronList || '<div class="ec-list-item">None</div>'}</div>

        <div class="ec-section-title">💊 CURRENT MEDICATIONS</div>
        <div class="ec-list">${medList || '<div class="ec-list-item">None</div>'}</div>

        <div class="ec-section-title">🔬 MAJOR DIAGNOSES</div>
        <div class="ec-list">${diagList || '<div class="ec-list-item">None recorded</div>'}</div>

        <div class="ec-section-title">📞 EMERGENCY CONTACT</div>
        <div class="ec-emergency-contact">
          <div style="font-size:24px">📞</div>
          <div>
            <div style="font-weight:700;font-size:14px;color:#fff">${card.emergency_contact?.name || '—'}</div>
            <div style="font-size:16px;font-weight:800;color:var(--accent-danger);margin-top:2px">${card.emergency_contact?.phone || '—'}</div>
          </div>
        </div>

        <div style="margin-top:16px;font-size:10px;color:rgba(255,255,255,0.3);text-align:center">
          Emergency access logged • ${new Date(card.generated_at).toLocaleString('en-IN')}
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;justify-content:center">
          <button class="btn btn-secondary btn-sm" onclick="window.print()">🖨️ Print</button>
          <button class="btn btn-secondary btn-sm" onclick="document.getElementById('emergencyModal').remove()">Close</button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

  // ── Toast System ───────────────────────────────────────────────────────────
  _toast(type, title, msg, duration = 4000) {
    const icons = { success:'✅', warning:'⚠️', info:'ℹ️', danger:'🚨' };
    const container = document.getElementById('toast-container');
    const id = 'toast-' + Date.now();
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.id = id;
    el.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        <div class="toast-msg">${msg}</div>
      </div>`;
    container.appendChild(el);
    setTimeout(() => {
      el.classList.add('exit');
      setTimeout(() => el.remove(), 300);
    }, duration);
  }

  // ── Adherence Agent Handler ────────────────────────────────────────────────
  _handleAdherence() {
    document.addEventListener('adherence:setup', e => {
      const { prescriptions } = e.detail;
      const names = prescriptions.map(p => p.medicine_name).join(', ');
      this._toast('info', '⏰ Adherence Reminders Set', `${this.s('adherencePing')} ${names}`);
    });
  }
}

window.UIController = UIController;
