/**
 * MediOne — App Bootstrap
 * Initializes all agents:
 *   Agent 1: Symptom Triage
 *   Agent 2: Health Records
 *   Agent 3: Medication Adherence
 *   Agent 4: Hospital Finder
 *   Agent 5: Explainer
 */
window.onerror = function(msg, url, lineNo, columnNo, error) {
  console.error('[Global Error]', msg, 'at', url, lineNo, columnNo, error);
  const tc = document.getElementById('toast-container');
  if (tc) {
    const el = document.createElement('div');
    el.className = 'toast toast-error';
    el.innerHTML = `<strong>Error</strong><br>An unexpected error occurred. Please refresh the page. <small style="opacity:0.6;display:block;margin-top:4px">${msg}</small>`;
    tc.appendChild(el);
    setTimeout(() => el.remove(), 5000);
  }
  return false;
};

document.addEventListener('DOMContentLoaded', () => {
  try {
    // ── Agent 2: Health Records & Store Initialization ────────────────────────
    let store, engine, ui;
    try {
      store  = new HealthStore();
      engine = new RecordsEngine(store);
      ui     = new UIController(engine, store);
      ui.init();
    } catch (e) {
      console.error('Failed to init Records/UI:', e);
      document.getElementById('page-content').innerHTML = '<div style="padding:40px;color:red">Failed to initialize core engine. Please clear site data and refresh.</div>';
      return;
    }

    // ── Agent 3: Medication Adherence ───────────────────────────────────────
    let adhStore, adhEngine, adhUi;
    try {
      adhStore  = new AdherenceStore();
      adhEngine = new AdherenceEngine(adhStore, store);
      adhUi     = new AdherenceUI(adhEngine, adhStore, store);
      adhUi.init(ui);
      
      document.addEventListener('adherence:setup', (e) => {
        const { prescriptions, visit_id } = e.detail;
        const results = adhEngine.setupSchedules(prescriptions, visit_id);
        console.info('[Adherence Agent] Schedules set up:', results.map(r => r.medicine));
        results.forEach(r => {
          ui._toast('info', `💊 Reminder Set: ${r.medicine}`,
            `${r.slots.join(' + ')} reminder${r.slots.length > 1 ? 's' : ''} active until ${r.endDate}`);
        });
        if (adhUi._injectNavItem) adhUi._injectNavItem();
      });

      const existingSchedules = adhStore.getActiveSchedules();
      if (existingSchedules.length === 0) {
        const visits = store.getVisits();
        for (const visit of visits) {
          if (visit.prescriptions?.length > 0) {
            adhEngine.setupSchedules(visit.prescriptions, visit.visit_id);
          }
        }
        adhEngine.seedDemoDoseLogs();
      }
    } catch (e) { console.error('Failed to init Adherence Agent:', e); }

    // ── Agent 1: Symptom Triage ─────────────────────────────────────────────
    let triageEngine, triageUi;
    try {
      triageEngine = new TriageEngine(store);
      triageUi     = new TriageUI(triageEngine, store);
      triageUi.init(ui);
    } catch (e) { console.error('Failed to init Triage Agent:', e); }

    // ── Agent 4: Hospital Finder ────────────────────────────────────────────
    let hfEngine, hfUi;
    try {
      hfEngine = new HospitalFinderEngine(store);
      hfUi     = new HospitalFinderUI(hfEngine, store);
      hfUi.init(ui);

      hfEngine.requestGeolocation().then(loc => {
        console.info('[Hospital Finder] Location set:', loc.area, loc.city);
      }).catch(err => console.warn('Geolocation failed:', err));
    } catch (e) { console.error('Failed to init Hospital Finder:', e); }

    // ── Agent 5: Explainer ──────────────────────────────────────────────────
    let explainerEngine, explainerUi;
    try {
      explainerEngine = new ExplainerEngine(store);
      explainerUi     = new ExplainerUI(explainerEngine, store);
      explainerUi.init(ui);
    } catch (e) { console.error('Failed to init Explainer Agent:', e); }

    // ── Agent 6: Nudge (Health Coach) ───────────────────────────────────────
    let nudgeEngine, nudgeUi;
    try {
      nudgeEngine = new NudgeEngine(adhEngine, store);
      nudgeUi     = new NudgeUI(nudgeEngine, adhEngine, store);
      nudgeUi.init(ui);
    } catch (e) { console.error('Failed to init Nudge Agent:', e); }

    // ── Agent 0: Orchestrator (Smart Dashboard) ─────────────────────────────
    let orchEngine, orchUi;
    try {
      orchEngine = new OrchestratorEngine(store, adhEngine, triageEngine, explainerEngine, nudgeEngine, hfEngine);
      orchUi     = new OrchestratorUI(orchEngine, store);
      orchUi.init(ui);
    } catch (e) { console.error('Failed to init Orchestrator Agent:', e); }

    // ── Settings & Profile UI ───────────────────────────────────────────────
    let settingsUi;
    try {
      settingsUi = new SettingsUI(store);
      settingsUi.init(ui);
    } catch (e) { console.error('Failed to init Settings UI:', e); }

    // Wire triage:log event → create visit record + pass context to hospital finder
    document.addEventListener('triage:log', (e) => {
      try {
        const d = e.detail;
        const visit = {
          date: new Date().toISOString().slice(0, 10),
          facility_name: d.facility || 'MediOne Triage',
          doctor_name: 'AI Triage Assistant',
          chief_complaint: d.chief_complaint || '',
          diagnosis: [{ name: `Triage: ${d.risk_level?.toUpperCase()} risk`, type: 'triage' }],
          prescriptions: [],
          vitals: {},
          lab_results: [],
          notes: `Specialist recommended: ${d.specialist}. Facility: ${d.facility}.`,
        };
        engine.addVisit(visit);

        if (hfUi && hfUi.setTriageContext) hfUi.setTriageContext(d);
        console.info('[Triage Agent] Logged to records:', d.risk_level);
      } catch (err) {
        console.error('Failed to log triage data:', err);
      }
    });

    // Expose globally for debugging + inter-agent communication
    window._sw = {
      store, engine, ui, settings: settingsUi,
      adh: { adhStore, engine: adhEngine, ui: adhUi },
      triage: { engine: triageEngine, ui: triageUi },
      hospitals: { engine: hfEngine, ui: hfUi },
      explainer: { engine: explainerEngine, ui: explainerUi },
      nudge: { engine: nudgeEngine, ui: nudgeUi },
      orchestrator: { engine: orchEngine, ui: orchUi },
    };
    console.info('[MediOne] All 7 agents (0-6) & Settings initialized:', store.getPatient()?.name);
  } catch (globalErr) {
    console.error('Fatal initialization error:', globalErr);
  }
});
