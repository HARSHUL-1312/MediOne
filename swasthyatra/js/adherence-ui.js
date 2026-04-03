/**
 * MediOne — Adherence UI (Agent 3)
 * Renders the full 5-tab Adherence page and integrates into the existing
 * UIController via monkey-patching — no modification of ui-controller.js needed.
 *
 * Tabs: Today's Schedule | Weekly Report | Reminders | Side Effects | IVR
 */

class AdherenceUI {
  constructor(adhEngine, adhStore, healthStore) {
    this.engine      = adhEngine;
    this.adhStore    = adhStore;
    this.healthStore = healthStore;
    this.activeTab   = 'schedule';
    this._snoozeTimers = {};

    this._langColors = {
      en: '#00c896', hi: '#0084ff', ta: '#ff6b6b', te: '#ffa726', bn: '#ab47bc', mr: '#26c6da'
    };
    this._langLabels = {
      en: '🇬🇧 English', hi: '🇮🇳 हिंदी', ta: '🇮🇳 தமிழ்',
      te: '🇮🇳 తెలుగు',  bn: '🇮🇳 বাংলা', mr: '🇮🇳 मराठी',
    };
    this._channelInfo = {
      app:      { icon: '📱', name: 'App Notification' },
      whatsapp: { icon: '💬', name: 'WhatsApp' },
      sms:      { icon: '📩', name: 'SMS' },
      ivr:      { icon: '📞', name: 'IVR Call (Feature Phone)' },
    };
  }

  // ── Boot: patch UIController + inject nav ──────────────────────────────────
  init(uiController) {
    this.ui = uiController;
    this._patchNavigate();
    this._injectNavItem();
    this._injectGlobalListener();
  }

  _patchNavigate() {
    const originalNavigate = this.ui._navigate.bind(this.ui);
    this.ui._navigate = (page) => {
      if (page === 'adherence') {
        this.ui.currentPage = 'adherence';
        location.hash = 'adherence';
        const main = document.getElementById('page-content');
        main.innerHTML = '';
        this.renderAdherencePage();
        this.ui._setActiveNav();
        document.getElementById('topbar-title').textContent = this.ui.lang === 'hi'
          ? '💊 दवा अनुपालन' : '💊 Medication Adherence';
        main.style.animation = 'slideDown 0.22s ease';
      } else {
        originalNavigate(page);
      }
    };
    // patch _pageTitle too
    const originalTitle = this.ui._pageTitle.bind(this.ui);
    this.ui._pageTitle = () => {
      if (this.ui.currentPage === 'adherence') return this.ui.lang === 'hi' ? '💊 दवा अनुपालन' : '💊 Medication Adherence';
      return originalTitle();
    };
  }

  _injectNavItem() {
    // Observe sidebar renders and inject nav item after existing items
    const doInject = () => {
      const navItems = document.querySelector('.nav-items');
      if (!navItems) return;
      if (navItems.querySelector('[data-page="adherence"]')) return;
      const li = document.createElement('li');
      li.className = 'nav-item';
      const report = this.engine.getWeeklyReport();
      const badge  = report.escalations.length > 0
        ? `<span class="nav-badge">${report.escalations.length}</span>` : '';
      li.innerHTML = `<button class="nav-link" data-page="adherence">
        <span class="nav-icon">💊</span>
        ${this.ui.lang === 'hi' ? 'दवा समय सारणी' : 'Adherence'}${badge}
      </button>`;
      navItems.appendChild(li);
      this.ui._setActiveNav();
    };
    // Run immediately + on sidebar re-renders via MutationObserver
    doInject();
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      new MutationObserver(doInject).observe(sidebar, { childList: true, subtree: true });
    }
  }

  _injectGlobalListener() {
    document.addEventListener('click', e => {
      // Tab clicks
      const tab = e.target.closest('[data-adh-tab]');
      if (tab) { this.activeTab = tab.dataset.adhTab; this.renderAdherencePage(); return; }
      // Dose action buttons
      const doseBtn = e.target.closest('[data-dose-action]');
      if (doseBtn) { this._handleDoseAction(doseBtn); return; }
      // Side effect submit
      if (e.target.id === 'seSubmitBtn') { this._handleSideEffectSubmit(); return; }
      // Channel select
      const ch = e.target.closest('[data-channel]');
      if (ch) { this._handleChannelSelect(ch.dataset.channel); return; }
      // IVR key press
      const ivrKey = e.target.closest('[data-ivr-key]');
      if (ivrKey) { this._handleIVRKey(ivrKey.dataset.ivrKey, ivrKey.dataset.schedId); return; }
      // Lang selector in reminders
      const langBtn = e.target.closest('[data-reminder-lang]');
      if (langBtn) { this._handleReminderLangChange(langBtn.dataset.reminderLang); return; }
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MAIN PAGE RENDERER
  // ──────────────────────────────────────────────────────────────────────────
  renderAdherencePage() {
    const container = document.getElementById('page-content');
    const report    = this.engine.getWeeklyReport();
    const esc       = this.engine.checkEscalation();
    const isHi      = this.ui.lang === 'hi';

    const tabs = [
      { id: 'schedule',  icon: '📅', label: isHi ? 'आज की दवाइयाँ'   : "Today's Schedule" },
      { id: 'weekly',    icon: '📊', label: isHi ? 'साप्ताहिक रिपोर्ट' : 'Weekly Report' },
      { id: 'reminders', icon: '🔔', label: isHi ? 'रिमाइंडर सेटअप'   : 'Reminder Setup' },
      { id: 'sideeff',   icon: '⚠️', label: isHi ? 'साइड इफेक्ट'       : 'Side Effects' },
      { id: 'ivr',       icon: '📞', label: 'IVR Simulator' },
    ];

    const tabsHtml = `<div class="adh-tabs">
      ${tabs.map(t => `<button class="adh-tab${this.activeTab === t.id ? ' active' : ''}" data-adh-tab="${t.id}">${t.icon} ${t.label}</button>`).join('')}
    </div>`;

    const escBanner = esc.escalations_nudge.length > 0 ? `
      <div class="escalation-banner">
        <div class="escalation-icon">🚨</div>
        <div>
          <div class="escalation-title">${isHi ? 'ध्यान दें! दवा अनुपालन कम है' : 'Attention! Low Adherence Detected'}</div>
          <div class="escalation-msg">${esc.escalations_nudge.map(r => `${r.medicine_name}: ${r.score}% (${isHi ? 'पिछले' : 'last'} 3+ ${isHi ? 'दिन' : 'days'})`).join(' • ')}</div>
          <div class="escalation-msg" style="margin-top:4px;color:var(--accent-warning)">
            ${isHi ? 'कृपया नियमित रूप से दवा लें। गंभीर स्थिति में डॉक्टर को सूचित किया जाएगा।' : 'Please stay consistent. Severe cases will alert your linked doctor/caregiver.'}
          </div>
        </div>
      </div>` : '';

    let content = '';
    switch (this.activeTab) {
      case 'schedule':  content = this._renderScheduleTab(report); break;
      case 'weekly':    content = this._renderWeeklyTab(report); break;
      case 'reminders': content = this._renderRemindersTab(); break;
      case 'sideeff':   content = this._renderSideEffectsTab(); break;
      case 'ivr':       content = this._renderIVRTab(); break;
    }

    container.innerHTML = `
      <div class="page-header">
        <div>
          <h2>💊 ${isHi ? 'दवा अनुपालन एजेंट' : 'Medication Adherence Agent'}</h2>
          <p class="page-header-sub">${isHi ? 'आपकी दवाइयाँ समय पर लें — हम यहाँ हैं!' : 'Stay consistent. We\'ve got your back.'} • ${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div class="d-flex gap-8">
          ${report.streak_days > 1 ? `
          <div class="streak-banner" style="margin-bottom:0;padding:8px 14px">
            <span class="streak-fire">🔥</span>
            <div><span class="streak-count">${report.streak_days}</span><div class="streak-label" style="font-size:10px">${isHi ? 'दिन की लकीर' : 'day streak'}</div></div>
          </div>` : ''}
          <div class="stat-card" style="--accent-color:var(--accent-primary);padding:12px 18px;margin-bottom:0;min-width:100px">
            <div class="stat-value" style="font-size:24px">${report.overall_score}%</div>
            <div class="stat-label" style="font-size:11px">${isHi ? 'साप्ताहिक स्कोर' : 'Weekly Score'}</div>
          </div>
        </div>
      </div>
      ${escBanner}
      ${tabsHtml}
      ${content}`;
  }

  // ── TAB 1: Today's Schedule ────────────────────────────────────────────────
  _renderScheduleTab(report) {
    const doses  = this.engine.getTodaySchedule();
    const isHi   = this.ui.lang === 'hi';
    const slotColors = { morning: '#00c896', afternoon: '#0084ff', evening: '#ffa726', night: '#9c27b0' };
    const slotEmoji  = { morning: '🌅', afternoon: '☀️', evening: '🌆', night: '🌙' };
    const slotLabels = {
      morning:   isHi ? 'सुबह'  : 'Morning',
      afternoon: isHi ? 'दोपहर' : 'Afternoon',
      evening:   isHi ? 'शाम'   : 'Evening',
      night:     isHi ? 'रात'   : 'Night',
    };

    if (doses.length === 0) {
      return `
        <div class="card" style="text-align:center;padding:40px">
          <div style="font-size:48px;margin-bottom:12px">🎉</div>
          <div style="font-size:16px;font-weight:700;color:var(--text-primary)">
            ${isHi ? 'आज कोई दवा निर्धारित नहीं है!' : 'No medicines scheduled today!'}
          </div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:6px">
            ${isHi ? 'नई जांच जोड़ें और दवाइयाँ दर्ज करें।' : 'Add a visit with prescriptions to set up your schedule.'}
          </div>
          <button class="btn btn-primary" data-page="add-visit" style="margin-top:16px">➕ ${isHi ? 'नई जांच जोड़ें' : 'Add Visit'}</button>
        </div>`;
    }

    const slotGroups = {};
    doses.forEach(d => {
      if (!slotGroups[d.slot]) slotGroups[d.slot] = [];
      slotGroups[d.slot].push(d);
    });

    const slotsHtml = Object.entries(slotGroups).map(([slot, items]) => {
      const color  = slotColors[slot] || '#00c896';
      const prefs  = this.adhStore.getPrefs();
      const time   = prefs.reminder_times[slot] || '';

      const cardsHtml = items.map(dose => {
        const statusBadge = dose.status !== 'pending'
          ? `<span class="dose-status-badge ${dose.status}">${
              dose.status === 'taken'   ? (isHi ? '✅ ले ली' : '✅ Taken') :
              dose.status === 'skipped' ? (isHi ? '❌ छोड़ी' : '❌ Skipped') :
                                          (isHi ? '⏰ स्नूज़' : '⏰ Snoozed')
            }</span>` : '';

        const actionBtns = dose.status === 'pending' || dose.status === 'snoozed' ? `
          <div class="dose-actions">
            <button class="dose-btn dose-btn-taken"
              data-dose-action="taken" data-sched-id="${dose.schedule_id}" data-slot="${dose.slot}">
              ✅ ${isHi ? 'ली' : 'Taken'}
            </button>
            <button class="dose-btn dose-btn-snooze"
              data-dose-action="snoozed" data-sched-id="${dose.schedule_id}" data-slot="${dose.slot}">
              ⏰ ${isHi ? '15 मिनट बाद' : 'Snooze 15 min'}
            </button>
            <button class="dose-btn dose-btn-skip"
              data-dose-action="skipped" data-sched-id="${dose.schedule_id}" data-slot="${dose.slot}">
              ❌ ${isHi ? 'छोड़ें' : 'Skip'}
            </button>
          </div>` : '';

        const snoozeMsg = dose.status === 'snoozed' && dose.snoozed_until
          ? `<div class="snooze-countdown">⏱ ${isHi ? 'याद दिलाया जाएगा' : 'Reminder at'} ${new Date(dose.snoozed_until).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>`
          : '';

        return `
          <div class="dose-card ${dose.status}" style="--slot-color:${color};margin-bottom:8px">
            <div class="dose-header">
              <div>
                <div class="dose-name">💊 ${dose.medicine_name}</div>
                <div class="dose-meta">${dose.dosage} &nbsp;•&nbsp; ${dose.frequency}
                  ${dose.instructions ? `&nbsp;•&nbsp; 📌 ${dose.instructions}` : ''}
                </div>
              </div>
              ${statusBadge}
            </div>
            ${snoozeMsg}
            <div id="dose-response-${dose.schedule_id}-${dose.slot}"></div>
            ${actionBtns}
          </div>`;
      }).join('');

      return `
        <div class="schedule-slot">
          <div class="schedule-slot-time">
            <span class="slot-time-label">${slotEmoji[slot]} ${slotLabels[slot]}</span>
            <span class="slot-time-val">${time}</span>
            <div class="slot-line"></div>
          </div>
          <div style="flex:1">${cardsHtml}</div>
        </div>`;
    }).join('');

    const doneCount    = doses.filter(d => d.status === 'taken').length;
    const totalToday   = doses.length;
    const todayPct     = totalToday > 0 ? Math.round((doneCount / totalToday) * 100) : 0;
    const progressBar  = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px">
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px">
            <span style="color:var(--text-secondary)">${isHi ? 'आज का प्रगति' : "Today's Progress"}</span>
            <span style="font-weight:700;color:var(--accent-primary)">${doneCount}/${totalToday} ${isHi ? 'खुराक' : 'doses'}</span>
          </div>
          <div class="adh-bar-track"><div class="adh-bar-fill" style="width:${todayPct}%;--bar-color:var(--accent-primary)"></div></div>
        </div>
        <div style="font-size:22px;font-weight:900;color:var(--accent-primary)">${todayPct}%</div>
      </div>`;

    return progressBar + slotsHtml;
  }

  // ── TAB 2: Weekly Report ────────────────────────────────────────────────────
  _renderWeeklyTab(report) {
    const isHi   = this.ui.lang === 'hi';
    const days7  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const today  = new Date().toISOString().slice(0, 10);

    // Overall ring
    const r = 40, circ = 2 * Math.PI * r;
    const offset = circ - (report.overall_score / 100) * circ;
    const ringColor = report.overall_score >= 80 ? 'var(--accent-primary)' :
                      report.overall_score >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)';

    const overallRing = `
      <div class="adh-overall-ring">
        <svg class="ring-svg" width="100" height="100" viewBox="0 0 100 100">
          <circle class="ring-circle-bg" cx="50" cy="50" r="${r}"/>
          <circle class="ring-circle-fill" cx="50" cy="50" r="${r}"
            stroke="${ringColor}"
            stroke-dasharray="${circ}"
            stroke-dashoffset="${offset}"/>
          <text class="ring-label" x="50" y="46" font-size="16" font-weight="800">${report.overall_score}%</text>
          <text class="ring-label" x="50" y="62" font-size="9" fill="var(--text-muted)">${isHi ? 'कुल' : 'Overall'}</text>
        </svg>
        <div>
          <div style="font-size:18px;font-weight:800">${isHi ? 'स्वास्थ्य अनुपालन' : 'Medication Adherence'}</div>
          <div style="font-size:13px;color:var(--text-secondary);margin-top:4px">${isHi ? 'पिछले 7 दिन • ' : 'Last 7 days • '}${report.reports.length} ${isHi ? 'दवाइयाँ सक्रिय' : 'medicines active'}</div>
          ${report.streak_days > 1 ? `<div class="d-flex align-center gap-8" style="margin-top:8px"><span style="font-size:20px">🔥</span><span style="font-size:13px;color:var(--accent-warning);font-weight:700">${report.streak_days} ${isHi ? 'दिन की लकीर!' : 'day streak!'}</span></div>` : ''}
          <div style="font-size:12px;color:var(--text-secondary);margin-top:8px">
            ${report.overall_score >= 90 ? '🌟 ' + (isHi ? 'उत्कृष्ट! बहुत अच्छा!' : 'Excellent! Keep it up!') :
              report.overall_score >= 70 ? '👍 ' + (isHi ? 'अच्छा! थोड़ा और बेहतर करें।' : 'Good! A little more consistency.') :
              '⚠️ ' + (isHi ? 'ध्यान दें — नियमितता जरूरी है।' : 'Needs attention — stay consistent!')}
          </div>
        </div>
      </div>`;

    const scoreCards = report.reports.map(r => {
      const pctClass = r.score >= 80 ? 'great' : r.score >= 50 ? 'ok' : 'poor';
      const barColor = r.score >= 80 ? 'var(--accent-primary)' : r.score >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)';
      const trendArrow = r.trend === 'up' ? '↑' : r.trend === 'down' ? '↓' : '→';
      const trendLabel = r.trend === 'up'
        ? (isHi ? 'सुधार हो रहा है' : 'Improving')
        : r.trend === 'down'
          ? (isHi ? 'घट रहा है' : 'Declining')
          : (isHi ? 'स्थिर' : 'Stable');

      // Mini bar chart
      const miniChart = `<div class="adh-mini-chart">
        ${r.day_data.map(d => {
          const h = Math.max(4, Math.round((d.pct / 100) * 28));
          const dayDate = d.date;
          const isToday = dayDate === today;
          const dayColor = d.pct >= 80 ? 'var(--accent-primary)' : d.pct >= 50 ? 'var(--accent-warning)' : 'var(--accent-danger)';
          return `<div class="adh-mini-bar${d.pct === 0 ? ' empty' : ''}" style="height:${h}px;--bar-color:${dayColor};${isToday ? 'outline:1px solid var(--accent-primary)' : ''}"></div>`;
        }).join('')}
      </div>`;

      // Week heatmap
      const heatmap = `<div class="week-heatmap">
        ${r.day_data.map((d, i) => {
          const dayLabel = days7[i] || '';
          const isToday  = d.date === today;
          const cls = d.pct >= 80 ? 'taken' : d.pct >= 50 ? 'snoozed' : d.pct > 0 ? 'skipped' : '';
          return `<div class="week-day-cell ${cls}${isToday ? ' today' : ''}" title="${d.date}: ${d.pct}%">${dayLabel[0]}</div>`;
        }).join('')}
      </div>`;

      return `
        <div class="adh-score-card">
          <div class="adh-score-top">
            <div>
              <div class="adh-med-name">${r.medicine_name}</div>
              <div class="adh-med-dose">${r.dosage}</div>
            </div>
            <div class="adh-pct ${pctClass}">${r.score}%</div>
          </div>
          <div class="adh-bar-track"><div class="adh-bar-fill" style="width:${r.score}%;--bar-color:${barColor}"></div></div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            ${miniChart}
            <div class="adh-trend ${r.trend}">
              <span style="font-size:16px">${trendArrow}</span> ${trendLabel}
              ${r.needs_nudge ? `<span class="tag tag-danger" style="font-size:10px;margin-left:6px">⚠️ ${isHi ? 'ध्यान दें' : 'Needs nudge'}</span>` : ''}
            </div>
          </div>
          ${heatmap}
          <div style="font-size:11px;color:var(--text-muted);margin-top:6px">${r.taken}/${r.total} ${isHi ? 'खुराक ली' : 'doses taken'} &nbsp;•&nbsp; ${isHi ? 'पिछले 7 दिन' : 'last 7 days'}</div>
        </div>`;
    }).join('');

    if (report.reports.length === 0) {
      return overallRing + `<div class="empty-state"><div class="empty-icon">📊</div><p>${isHi ? 'अभी तक कोई रिकॉर्ड नहीं। आज की खुराक लें!' : 'No data yet. Start logging doses today!'}</p></div>`;
    }

    return overallRing + `<div class="adh-score-grid">${scoreCards}</div>`;
  }

  // ── TAB 3: Reminder Setup ──────────────────────────────────────────────────
  _renderRemindersTab() {
    const prefs  = this.adhStore.getPrefs();
    const isHi   = this.ui.lang === 'hi';
    const patient = this.healthStore.getPatient();
    const firstName = patient?.name?.split(' ')[0] || 'Patient';

    const channelHtml = Object.entries(this._channelInfo).map(([key, info]) => `
      <div class="channel-card${prefs.channel === key ? ' selected' : ''}" data-channel="${key}">
        <div class="channel-icon">${info.icon}</div>
        <div class="channel-name">${info.name}</div>
      </div>`).join('');

    // Timing form
    const timingHtml = ['morning','afternoon','evening','night'].map(slot => {
      const labels = { morning: isHi ? '🌅 सुबह' : '🌅 Morning', afternoon: isHi ? '☀️ दोपहर' : '☀️ Afternoon', evening: isHi ? '🌆 शाम' : '🌆 Evening', night: isHi ? '🌙 रात' : '🌙 Night' };
      return `
        <div class="form-group">
          <label class="form-label">${labels[slot]}</label>
          <input class="form-control" type="time" id="time-${slot}" value="${prefs.reminder_times[slot] || ''}">
        </div>`;
    }).join('');

    // Multi-language preview — pick first active medicine
    const schedules   = this.adhStore.getActiveSchedules();
    const sampleMed   = schedules[0] ? `${schedules[0].medicine_name} ${schedules[0].dosage}` : 'Metformin 500mg';
    const sampleInstr = schedules[0]?.instructions || 'Take after breakfast';

    const bubbles = Object.keys(this._langLabels).map(lang => {
      const msg   = this.engine.generateReminderMessage(sampleMed, firstName, 'morning', sampleInstr, lang);
      const color = this._langColors[lang];
      return `
        <div class="reminder-bubble" style="--lang-color:${color}">
          <div class="reminder-lang-tag" data-reminder-lang="${lang}" style="cursor:pointer">
            ${this._langLabels[lang]}
            ${prefs.lang === lang ? '<span style="margin-left:auto;font-size:10px;font-weight:700">✓ Active</span>' : ''}
          </div>
          <div class="reminder-text">${msg}</div>
          <div class="reminder-actions-row">
            <span class="reminder-action-chip chip-taken">✅ ${lang === 'hi' ? 'ली' : lang === 'ta' ? 'எடுத்தேன்' : lang === 'te' ? 'తీసుకున్నా' : lang === 'bn' ? 'খেয়েছি' : lang === 'mr' ? 'घेतले' : 'Taken'}</span>
            <span class="reminder-action-chip chip-snooze">⏰ ${lang === 'hi' ? '15 मिनट बाद' : 'Snooze 15'}</span>
          </div>
        </div>`;
    }).join('');

    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div>
          <div class="card">
            <div class="card-header"><div class="card-title"><span class="icon">📡</span>${isHi ? 'अधिसूचना चैनल' : 'Notification Channel'}</div></div>
            <div class="channel-grid" style="grid-template-columns:repeat(2,1fr)">${channelHtml}</div>
            <div style="font-size:12px;color:var(--text-muted);margin-top:4px">
              ${prefs.channel === 'ivr' ? (isHi ? '📞 IVR मोड सक्रिय — "Press 1 / Press 2" प्रारूप' : '📞 IVR mode active — Feature phone call format') : ''}
              ${prefs.channel === 'whatsapp' ? '💬 WhatsApp message will be sent to your registered number.' : ''}
            </div>
            <div class="section-label" style="margin-top:16px">⏰ ${isHi ? 'रिमाइंडर समय' : 'Reminder Timings'}</div>
            <div class="form-grid">${timingHtml}</div>
            <button class="btn btn-primary" style="width:100%;margin-top:16px" id="savePrefsBtn" onclick="
              const p = {};
              ['morning','afternoon','evening','night'].forEach(s => {
                const v = document.getElementById('time-'+s)?.value; if(v) p[s]=v;
              });
              window._sw?.adh?.adhStore?.savePrefs({ reminder_times: p });
              window._sw?.adh?.ui?.renderAdherencePage();
            ">💾 ${isHi ? 'सेटिंग सहेजें' : 'Save Settings'}</button>
          </div>
        </div>
        <div>
          <div class="card-title" style="margin-bottom:12px"><span class="icon">🗣️</span>${isHi ? 'सभी भाषाओं में पूर्वावलोकन' : 'Preview in All Languages'}</div>
          <div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">${isHi ? 'भाषा चुनने के लिए टैप करें:' : 'Tap a language to set it as active:'} <strong>${sampleMed}</strong></div>
          <div class="reminder-preview-grid">${bubbles}</div>
        </div>
      </div>`;
  }

  // ── TAB 4: Side Effects ────────────────────────────────────────────────────
  _renderSideEffectsTab() {
    const isHi      = this.ui.lang === 'hi';
    const schedules = this.adhStore.getActiveSchedules();
    const seList    = this.adhStore.getSideEffects();

    const medOptions = schedules.map((s, i) =>
      `<option value="${s.schedule_id}">${s.medicine_name} ${s.dosage}</option>`
    ).join('');

    const logHtml = seList.length === 0
      ? `<div class="empty-state" style="padding:30px"><div class="empty-icon">🌿</div><p>${isHi ? 'अभी तक कोई दुष्प्रभाव दर्ज नहीं।' : 'No side effects logged yet.'}</p></div>`
      : seList.map(se => `
          <div class="se-item">
            <span style="font-size:18px">⚠️</span>
            <div>
              <div class="se-tag" style="margin-bottom:4px">${se.medicine_name}</div>
              <div style="color:var(--text-primary);font-size:13px">${se.description}</div>
              <div style="color:var(--text-muted);font-size:11px;margin-top:3px">
                ${new Date(se.reported_at).toLocaleString('en-IN')}
              </div>
            </div>
          </div>`).join('');

    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div>
          <div class="card">
            <div class="card-header"><div class="card-title"><span class="icon">🚩</span>${isHi ? 'दुष्प्रभाव दर्ज करें' : 'Flag a Side Effect'}</div></div>
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:14px">
              ${isHi ? 'डॉक्टर को दवा न बदलनी चाहिए। केवल अगली जांच पर बताएं।' : 'Note: Never adjust medication yourself. Flag here and inform your doctor at next visit.'}
            </div>
            <div class="form-group mb-16">
              <label class="form-label">${isHi ? 'दवा चुनें' : 'Select Medicine'}</label>
              <select class="form-control" id="seSelectMed">
                ${medOptions || `<option value="">—</option>`}
              </select>
            </div>
            <div class="form-group mb-16">
              <label class="form-label">${isHi ? 'दुष्प्रभाव विवरण' : 'Describe the Side Effect'}</label>
              <textarea class="form-control" id="seDesc" rows="3"
                placeholder="${isHi ? 'जैसे: मतली, चक्कर, दाने...' : 'e.g., nausea, dizziness, rash...'}"></textarea>
            </div>
            <div id="seResponse"></div>
            <button class="btn btn-primary" style="width:100%" id="seSubmitBtn">
              🚩 ${isHi ? 'डॉक्टर के लिए दर्ज करें' : 'Flag for Doctor'}
            </button>
          </div>
        </div>
        <div>
          <div class="card-title" style="margin-bottom:12px"><span class="icon">📋</span>${isHi ? 'दर्ज किए गए दुष्प्रभाव' : 'Logged Side Effects'} (${seList.length})</div>
          <div class="card">${logHtml}</div>
          <div style="margin-top:12px;padding:10px 14px;background:rgba(156,33,176,0.07);border:1px solid rgba(156,33,176,0.18);border-radius:var(--radius-md);font-size:12px;color:var(--text-secondary)">
            ⚠️ ${isHi ? 'ये सभी दुष्प्रभाव अगली जांच पर डॉक्टर को दिखाए जाएंगे।' : 'All flagged effects will be highlighted in your next Patient Summary for your doctor.'}
          </div>
        </div>
      </div>`;
  }

  // ── TAB 5: IVR Simulator ──────────────────────────────────────────────────
  _renderIVRTab() {
    const isHi     = this.ui.lang === 'hi';
    const schedules = this.adhStore.getActiveSchedules();
    const firstSch  = schedules[0];
    const ivr       = firstSch ? this.engine.simulateIVR(firstSch.schedule_id, 'morning') : null;
    const script    = ivr?.script || [
      'MediOne IVR System', 'No medicines scheduled.',
      'Press 0 to repeat.', '', '', ''
    ];

    const medOptions = schedules.map(s =>
      `<option value="${s.schedule_id}">${s.medicine_name} ${s.dosage}</option>`
    ).join('');

    return `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;align-items:start">
        <div>
          <div class="card">
            <div class="card-header"><div class="card-title"><span class="icon">📞</span>${isHi ? 'IVR सिमुलेटर' : 'IVR Simulator'}</div></div>
            <div style="font-size:12px;color:var(--text-secondary);margin-bottom:14px">
              ${isHi ? 'फीचर फोन उपयोगकर्ताओं के लिए ध्वनि कॉल प्रारूप। Press 1 / Press 2 इंटरफेस।'
                      : 'Voice call format for feature phone users in rural India. Simulates the IVR call experience.'}
            </div>
            ${medOptions ? `
            <div class="form-grid" style="margin-bottom:14px">
              <div class="form-group">
                <label class="form-label">${isHi ? 'दवा चुनें' : 'Select Medicine'}</label>
                <select class="form-control" id="ivrMedSelect">${medOptions}</select>
              </div>
              <div class="form-group">
                <label class="form-label">${isHi ? 'समय स्लॉट' : 'Slot'}</label>
                <select class="form-control" id="ivrSlotSelect">
                  <option value="morning">${isHi ? 'सुबह 🌅' : '🌅 Morning'}</option>
                  <option value="afternoon">${isHi ? 'दोपहर ☀️' : '☀️ Afternoon'}</option>
                  <option value="night">${isHi ? 'रात 🌙' : '🌙 Night'}</option>
                </select>
              </div>
            </div>
            <button class="btn btn-secondary" style="width:100%;margin-bottom:16px" onclick="
              const sid   = document.getElementById('ivrMedSelect')?.value;
              const slot  = document.getElementById('ivrSlotSelect')?.value;
              if(sid) window._sw?.adh?.engine?.simulateIVR(sid,slot);
              window._sw?.adh?.ui?.renderAdherencePage();
            ">📞 ${isHi ? 'कॉल शुरू करें' : 'Simulate Call'}</button>` : ''}
            <div style="font-size:12px;color:var(--text-secondary)">
              ${isHi ? '<strong>IVR चैनल कैसे काम करता है:</strong><br>1. मरीज़ को निर्धारित समय पर कॉल आती है।<br>2. संदेश स्थानीय भाषा में सुनाया जाता है।<br>3. Press 1 — दवा ली, Press 2 — 30 मिनट बाद।<br>4. डॉक्टर को रिपोर्ट उपलब्ध।'
                      : '<strong>How IVR channel works:</strong><br>1. Patient receives a call at scheduled time.<br>2. Message plays in regional language.<br>3. Press 1 — taken, Press 2 — snooze 30 min.<br>4. Response logged for doctor reports.'}
            </div>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:16px">
          <div class="ivr-phone" id="ivr-phone-frame">
            <div class="ivr-screen">
              <div class="ivr-header">📞 ${ivr?.medicine || 'MediOne IVR'}</div>
              ${script.map((line, i) => `<div style="margin-bottom:4px;${i===0?'font-weight:700;color:var(--accent-primary)':i>=2?'color:#7dc1ff':''}">${line}</div>`).join('')}
            </div>
            <div class="ivr-keypad">
              ${['1','2','3','4','5','6','7','8','9','*','0','#'].map(k => {
                let extra = '';
                if (k === '1') extra = 'data-ivr-key="1"' + (firstSch ? ` data-sched-id="${firstSch.schedule_id}"` : '');
                if (k === '2') extra = 'data-ivr-key="2"' + (firstSch ? ` data-sched-id="${firstSch.schedule_id}"` : '');
                const cls = k === '0' ? 'call' : k === '#' ? 'end' : '';
                return `<div class="ivr-key ${cls}" ${extra}>${k}</div>`;
              }).join('')}
            </div>
          </div>
          <div style="font-size:11px;color:var(--text-muted);text-align:center;max-width:280px">
            ${isHi ? 'क्लिक करें 1 = दवा ली | 2 = स्नूज़' : 'Click keys to simulate: 1 = Taken | 2 = Snooze'}
          </div>
        </div>
      </div>`;
  }

  // ── Action Handlers ────────────────────────────────────────────────────────
  _handleDoseAction(btn) {
    const schedId = btn.dataset.schedId;
    const slot    = btn.dataset.slot;
    const action  = btn.dataset.doseAction;
    const result  = this.engine.logDose(schedId, slot, action);
    const zone    = document.getElementById(`dose-response-${schedId}-${slot}`);
    if (zone) {
      zone.innerHTML = action === 'taken'
        ? `<div class="reinforcement-msg">${result.message}</div>`
        : action === 'skipped'
          ? `<div class="skip-msg">${result.message}</div>`
          : `<div class="reinforcement-msg" style="background:rgba(41,182,246,0.08);border-color:rgba(41,182,246,0.2)">${result.message}</div>`;
    }
    if (this.ui?._toast) {
      this.ui._toast(result.type === 'success' ? 'success' : result.type === 'warning' ? 'warning' : 'info',
        action === 'taken' ? '💊 Dose Logged!' : action === 'skipped' ? '⏭️ Dose Skipped' : '⏰ Snoozed',
        result.message.slice(0, 80));
    }
    // Re-render after short delay so user sees the response message
    setTimeout(() => this.renderAdherencePage(), 1500);
  }

  _handleSideEffectSubmit() {
    const schedId = document.getElementById('seSelectMed')?.value;
    const desc    = document.getElementById('seDesc')?.value?.trim();
    if (!desc) return;
    const result  = this.engine.flagSideEffect(schedId || 'unknown', desc);
    const zone    = document.getElementById('seResponse');
    if (zone) zone.innerHTML = `<div class="reinforcement-msg" style="margin-bottom:12px">${result.message}</div>`;
    if (this.ui?._toast) this.ui._toast('warning', '🚩 Side Effect Flagged', result.message.slice(0, 80));
    setTimeout(() => this.renderAdherencePage(), 1800);
  }

  _handleChannelSelect(channel) {
    this.adhStore.savePrefs({ channel });
    if (this.ui?._toast) {
      const info = this._channelInfo[channel];
      this.ui._toast('info', `${info.icon} Channel Updated`, `Reminders will now be sent via ${info.name}.`);
    }
    this.renderAdherencePage();
  }

  _handleIVRKey(key, schedId) {
    const el = event?.target?.closest('.ivr-key');
    if (el) { el.classList.add('active'); setTimeout(() => el.classList.remove('active'), 300); }

    if (key === '1' && schedId) {
      const r = this.engine.logDose(schedId, 'morning', 'taken');
      if (this.ui?._toast) this.ui._toast('success', '✅ IVR: Dose Confirmed', r.message.slice(0, 80));
      setTimeout(() => this.renderAdherencePage(), 1200);
    } else if (key === '2' && schedId) {
      const r = this.engine.logDose(schedId, 'morning', 'snoozed');
      if (this.ui?._toast) this.ui._toast('info', '⏰ IVR: Snoozed', r.message);
    }
  }

  _handleReminderLangChange(lang) {
    this.adhStore.savePrefs({ lang });
    if (this.ui?._toast) this.ui._toast('info', '🌐 Language Updated', `Reminders will now be sent in ${this._langLabels[lang]}.`);
    this.renderAdherencePage();
  }
}

window.AdherenceUI = AdherenceUI;
